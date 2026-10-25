import { simpleGit, type SimpleGit } from 'simple-git'
import type { BranchInfo, CommitInfo, ConflictFileInfo, RepoConfig } from '@shared/types'

const CONFLICT_STATUS_CODES = new Set(['UU', 'AA', 'DD', 'AU', 'UA', 'DU', 'UD'])

export function git(repo: RepoConfig): SimpleGit {
  return simpleGit(repo.localPath)
}

export async function fetch(repo: RepoConfig): Promise<void> {
  await git(repo).fetch(['--all', '--prune'])
}

export async function isWorkingTreeClean(repo: RepoConfig): Promise<boolean> {
  const status = await git(repo).status()
  return status.isClean()
}

async function aheadBehind(repo: RepoConfig, branch: string, baseBranch: string): Promise<{ ahead: number; behind: number }> {
  try {
    const raw = await git(repo).raw([
      'rev-list',
      '--left-right',
      '--count',
      `${baseBranch}...${branch}`
    ])
    const [behind, ahead] = raw.trim().split(/\s+/).map((n) => parseInt(n, 10))
    return { ahead: ahead || 0, behind: behind || 0 }
  } catch {
    return { ahead: 0, behind: 0 }
  }
}

/** refname (short, remote-prefix stripped like listBranches' own shortName) -> ISO commit date, in one call instead of one `git log` per branch. */
async function getLastCommitDates(repo: RepoConfig): Promise<Map<string, string>> {
  const raw = await git(repo).raw([
    'for-each-ref',
    '--format=%(refname)%09%(committerdate:iso-strict)',
    'refs/heads',
    'refs/remotes'
  ])
  const dates = new Map<string, string>()
  for (const line of raw.split('\n')) {
    const [refname, date] = line.split('\t')
    if (!refname || !date) continue
    const isLocal = refname.startsWith('refs/heads/')
    const shortName = refname.replace(/^refs\/heads\//, '').replace(/^refs\/remotes\/[^/]+\//, '')
    // A local branch's date wins over a same-named remote's, matching
    // listBranches' own dedup-by-shortName (local entries are kept there).
    if (isLocal || !dates.has(shortName)) dates.set(shortName, date)
  }
  return dates
}

export async function listBranches(repo: RepoConfig): Promise<BranchInfo[]> {
  const g = git(repo)
  const [summary, lastCommitDates] = await Promise.all([
    g.branch(['-a', '-v', '--no-color']),
    getLastCommitDates(repo)
  ])
  const baseBranch = repo.baseBranch

  const seen = new Set<string>()
  const branches: BranchInfo[] = []

  for (const name of Object.keys(summary.branches)) {
    const info = summary.branches[name]
    const isRemote = name.startsWith('remotes/')
    const shortName = isRemote ? name.replace(/^remotes\/[^/]+\//, '') : name
    if (shortName === 'HEAD' || seen.has(shortName)) continue
    seen.add(shortName)

    const { ahead, behind } =
      shortName === baseBranch
        ? { ahead: 0, behind: 0 }
        : await aheadBehind(repo, isRemote ? name : shortName, baseBranch)

    branches.push({
      name: shortName,
      isRemote,
      ahead,
      behind,
      lastCommitDate: lastCommitDates.get(shortName) ?? '',
      lastCommitMessage: info.label ?? ''
    })
  }

  return branches.sort((a, b) => a.name.localeCompare(b.name))
}

// eslint-disable-next-line no-control-regex -- excludes control chars, which git ref names disallow
const VALID_REF_NAME = /^(?!\/|.*\/\/|.*\.\.|.*[\s~^:?*[\\]|.*\.lock$|.*\/$)[^\x00-\x1f]+$/

export function isValidBranchName(name: string): boolean {
  return name.length > 0 && !name.startsWith('-') && VALID_REF_NAME.test(name)
}

export interface CreateBranchOptions {
  name: string
  fromBranch: string
  push: boolean
}

export async function createBranch(repo: RepoConfig, opts: CreateBranchOptions): Promise<void> {
  if (!isValidBranchName(opts.name)) {
    throw new Error(`"${opts.name}" is not a valid git branch name.`)
  }
  if (!(await isWorkingTreeClean(repo))) {
    throw new Error('Working tree has uncommitted changes. Commit or stash them first.')
  }

  const g = git(repo)
  const local = await g.branchLocal()
  if (local.all.includes(opts.name)) {
    throw new Error(`Branch "${opts.name}" already exists locally.`)
  }

  const remotes = await g.branch(['-r', '--no-color'])
  const startPoint = remotes.all.includes(`origin/${opts.fromBranch}`)
    ? `origin/${opts.fromBranch}`
    : opts.fromBranch

  await g.checkoutBranch(opts.name, startPoint)

  if (opts.push) {
    await g.push(['-u', 'origin', opts.name])
  }
}

export async function getConflictFiles(repo: RepoConfig): Promise<ConflictFileInfo[]> {
  const raw = await git(repo).raw(['status', '--porcelain=v1'])
  const files: ConflictFileInfo[] = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    const status = line.slice(0, 2)
    if (CONFLICT_STATUS_CODES.has(status)) {
      files.push({ path: line.slice(3).trim(), status })
    }
  }
  return files
}

export async function getFileVersions(
  repo: RepoConfig,
  filePath: string
): Promise<{ ours: string; theirs: string }> {
  const g = git(repo)
  const [ours, theirs] = await Promise.all([
    g.show([`:2:${filePath}`]).catch(() => ''),
    g.show([`:3:${filePath}`]).catch(() => '')
  ])
  return { ours, theirs }
}

/** Returns the given commit SHAs ordered oldest-first, as they'd need to be applied. */
export async function sortShasChronologically(repo: RepoConfig, shas: string[]): Promise<string[]> {
  if (shas.length === 0) return []
  const raw = await git(repo).raw(['log', '--no-walk', '--reverse', '--pretty=format:%H', ...shas])
  return raw.split('\n').filter(Boolean)
}

export async function getLog(
  repo: RepoConfig,
  branch: string,
  skip: number,
  limit: number,
  search?: string
): Promise<CommitInfo[]> {
  const g = git(repo)
  const args = [
    'log',
    branch,
    `--skip=${skip}`,
    `-n`,
    `${limit}`,
    // %P (parent hashes) lets us flag merge commits (>1 parent) so the UI
    // can show-but-disable them: they can't be cherry-picked without
    // choosing a parent (`error: commit <sha> is a merge but no -m option
    // was given`), and letting one into a run aborts every commit after it
    // (cherryPickRunner treats it as a fatal, non-conflict error).
    '--pretty=format:%H%x1f%an%x1f%ad%x1f%s%x1f%P',
    '--date=iso-strict'
  ]
  if (search) {
    args.push(`--grep=${search}`, '-i')
  }
  const raw = await g.raw(args)
  if (!raw.trim()) return []
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [sha, authorName, date, message, parents] = line.split('\x1f')
      return { sha, authorName, date, message, isMerge: parents.trim().split(' ').length > 1 }
    })
}
