import { randomUUID } from 'crypto'
import { simpleGit } from 'simple-git'
import * as gitService from '@main/services/gitService'
import type {
  BranchRunResult,
  CherryPickProgressEvent,
  ConflictResolution,
  RepoConfig
} from '@shared/types'

export type ProgressListener = (event: CherryPickProgressEvent) => void

interface RunState {
  repo: RepoConfig
  orderedShas: string[]
  targetBranches: string[]
  branchIndex: number
  commitIndex: number
  results: BranchRunResult[]
  status: 'running' | 'paused-conflict' | 'done' | 'aborted'
  cherryPickStrategy: 'default' | '-x'
  onProgress: ProgressListener
}

const runs = new Map<string, RunState>()

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function isEmptyCherryPickError(err: unknown): boolean {
  const text = message(err)
  return /previous cherry-pick is now empty|nothing to commit/i.test(text)
}

function isMergeCommitError(err: unknown): boolean {
  return /is a merge but no -m option was given/i.test(message(err))
}

function currentResult(state: RunState): BranchRunResult {
  const result = state.results[state.results.length - 1]
  if (!result) throw new Error('Internal error: no active branch result for cherry-pick run.')
  return result
}

export interface StartCherryPickRunOptions {
  commitShas: string[]
  targetBranches: string[]
  cherryPickStrategy?: 'default' | '-x'
}

export async function startCherryPickRun(
  repo: RepoConfig,
  opts: StartCherryPickRunOptions,
  onProgress: ProgressListener
): Promise<string> {
  const orderedShas = await gitService.sortShasChronologically(repo, opts.commitShas)
  const runId = randomUUID()
  const state: RunState = {
    repo,
    orderedShas,
    targetBranches: opts.targetBranches,
    branchIndex: 0,
    commitIndex: 0,
    results: [],
    status: 'running',
    cherryPickStrategy: opts.cherryPickStrategy ?? 'default',
    onProgress
  }
  runs.set(runId, state)
  void runLoop(runId)
  return runId
}

async function startNextBranch(state: RunState): Promise<boolean> {
  const branch = state.targetBranches[state.branchIndex]
  const g = gitService.git(state.repo)
  const result: BranchRunResult = {
    branch,
    appliedCommits: [],
    skippedCommits: [],
    conflicted: false,
    pushed: false
  }
  state.results.push(result)

  state.onProgress({
    type: 'branch-start',
    branch,
    branchIndex: state.branchIndex,
    totalBranches: state.targetBranches.length
  })

  try {
    await g.checkout(branch)
    await g.pull(['--ff-only'])
  } catch (err) {
    result.error = `Could not check out/update "${branch}": ${message(err)}`
    state.onProgress({ type: 'error', branch, message: result.error })
    return false
  }
  return true
}

async function finishBranch(state: RunState): Promise<void> {
  const branch = state.targetBranches[state.branchIndex]
  const result = currentResult(state)
  const g = gitService.git(state.repo)

  // result.conflicted just means this branch hit a conflict at some point in
  // the run, for reporting; it does not mean the conflict is still open by the
  // time we get here (continueCherryPick only calls finishBranch once resolved).
  if (!result.error) {
    try {
      await g.push(['origin', branch])
      result.pushed = true
    } catch (err) {
      result.error = `Push failed: ${message(err)}`
      state.onProgress({ type: 'error', branch, message: result.error })
    }
  }

  state.onProgress({ type: 'branch-done', branch, pushed: result.pushed })
}

/**
 * Applies commits starting at state.commitIndex on the current branch.
 * Returns 'conflict' if it paused on a conflict, otherwise 'continue'.
 */
async function applyCommits(state: RunState): Promise<'conflict' | 'continue'> {
  const branch = state.targetBranches[state.branchIndex]
  const g = gitService.git(state.repo)
  const result = currentResult(state)

  for (; state.commitIndex < state.orderedShas.length; state.commitIndex++) {
    const sha = state.orderedShas[state.commitIndex]
    state.onProgress({
      type: 'commit-start',
      branch,
      sha,
      commitIndex: state.commitIndex,
      totalCommits: state.orderedShas.length
    })

    const baseArgs = ['cherry-pick', '--no-edit']
    if (state.cherryPickStrategy === '-x') baseArgs.push('-x')

    let err: unknown = null
    try {
      await g.raw([...baseArgs, sha])
    } catch (e) {
      err = e
    }

    if (err && isMergeCommitError(err)) {
      // Merge commits need a parent to diff against; retry against parent 1
      // ("mainline") — the same convention GitHub's own cherry-pick button
      // uses for merge commits. This replays the merge's *net* effect
      // relative to that parent, not the individual commits inside it.
      err = null
      try {
        await g.raw([...baseArgs, '-m', '1', sha])
      } catch (e) {
        err = e
      }
    }

    if (!err) {
      result.appliedCommits.push(sha)
      state.onProgress({ type: 'commit-applied', branch, sha })
      continue
    }

    const conflictFiles = await gitService.getConflictFiles(state.repo)
    if (conflictFiles.length > 0) {
      result.conflicted = true
      state.status = 'paused-conflict'
      state.onProgress({ type: 'conflict', branch, sha, files: conflictFiles })
      return 'conflict'
    }
    if (isEmptyCherryPickError(err)) {
      await g.raw(['cherry-pick', '--skip'])
      result.skippedCommits.push(sha)
      continue
    }
    result.error = message(err)
    state.onProgress({ type: 'error', branch, sha, message: result.error })
    break
  }

  return 'continue'
}

/** Leaves the working tree on the repo's base branch rather than whatever target branch the run last touched — best-effort, doesn't mask the run's actual result if it fails. */
async function returnToBaseBranch(repo: RepoConfig): Promise<void> {
  try {
    await gitService.git(repo).checkout(repo.baseBranch)
  } catch {
    // Ignored — e.g. the base branch was deleted mid-run. The run's own
    // per-branch results already report what actually happened.
  }
}

async function runLoop(runId: string): Promise<void> {
  const state = runs.get(runId)
  if (!state) return

  for (; state.branchIndex < state.targetBranches.length; state.branchIndex++) {
    state.commitIndex = 0
    const ok = await startNextBranch(state)
    if (ok) {
      const outcome = await applyCommits(state)
      if (outcome === 'conflict') return
      await finishBranch(state)
    }
  }

  await returnToBaseBranch(state.repo)
  state.status = 'done'
  state.onProgress({ type: 'run-complete', results: state.results })
  runs.delete(runId)
}

export async function continueCherryPick(runId: string): Promise<void> {
  const state = runs.get(runId)
  if (!state || state.status !== 'paused-conflict') {
    throw new Error('No paused cherry-pick run to continue.')
  }
  const remaining = await gitService.getConflictFiles(state.repo)
  if (remaining.length > 0) {
    throw new Error(`${remaining.length} file(s) still have unresolved conflicts.`)
  }

  const g = gitService.git(state.repo)
  const branch = state.targetBranches[state.branchIndex]
  const sha = state.orderedShas[state.commitIndex]
  const result = currentResult(state)

  try {
    // We set GIT_EDITOR ourselves to a fixed no-op ("true") so --continue never
    // blocks on an interactive editor prompt; simple-git requires explicitly
    // opting in to that (it otherwise treats EDITOR env overrides as unsafe).
    const noEditorGit = simpleGit(state.repo.localPath, { unsafe: { allowUnsafeEditor: true } })
    await noEditorGit.env({ GIT_EDITOR: 'true' }).raw(['cherry-pick', '--continue', '--no-edit'])
    result.appliedCommits.push(sha)
    state.onProgress({ type: 'commit-applied', branch, sha })
  } catch (err) {
    // Resolving every conflict as "ours" can leave no diff vs HEAD, which git
    // treats as an error on --continue (it wants --skip instead of a commit).
    if (isEmptyCherryPickError(err)) {
      await g.raw(['cherry-pick', '--skip'])
      result.skippedCommits.push(sha)
    } else {
      throw err
    }
  }

  state.commitIndex += 1
  state.status = 'running'

  const outcome = await applyCommits(state)
  if (outcome === 'conflict') return
  await finishBranch(state)
  state.branchIndex += 1
  await runLoop(runId)
}

export async function abortCherryPick(runId: string): Promise<void> {
  const state = runs.get(runId)
  if (!state || state.status !== 'paused-conflict') {
    throw new Error('No paused cherry-pick run to abort.')
  }
  const g = gitService.git(state.repo)
  await g.raw(['cherry-pick', '--abort'])
  currentResult(state).error = 'Aborted by user after conflict.'
  state.status = 'aborted'
  await returnToBaseBranch(state.repo)
  state.onProgress({ type: 'run-complete', results: state.results })
  runs.delete(runId)
}

export async function resolveFile(
  repo: RepoConfig,
  filePath: string,
  resolution: ConflictResolution
): Promise<void> {
  const g = gitService.git(repo)
  // -f: a conflicted path is always already tracked (that's the only way it
  // can conflict), but git still refuses to `add` it without -f if it
  // matches a .gitignore pattern added after the fact (e.g. a since-ignored
  // uploads directory) — "advice.addIgnoredFile". We're deliberately
  // re-staging a path we know is tracked, not accidentally adding new junk.
  if (resolution === 'ours') {
    await g.raw(['checkout', '--ours', '--', filePath])
    await g.raw(['add', '-f', '--', filePath])
  } else if (resolution === 'theirs') {
    await g.raw(['checkout', '--theirs', '--', filePath])
    await g.raw(['add', '-f', '--', filePath])
  } else {
    const fs = await import('fs/promises')
    const content = await fs.readFile(`${repo.localPath}/${filePath}`, 'utf-8')
    if (/^(<{7}|={7}|>{7})/m.test(content)) {
      throw new Error(
        `"${filePath}" still contains conflict markers. Resolve them before marking as done.`
      )
    }
    await g.raw(['add', '-f', '--', filePath])
  }
}
