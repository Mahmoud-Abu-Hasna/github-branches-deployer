import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { setupTestRepo, type TestRepoFixture } from './e2e/setup-test-repo'
import { toRepoConfig, createProgressAwaiter } from './testUtils'
import * as gitService from '@main/services/gitService'
import * as cherryPickRunner from '@main/services/cherryPickRunner'
import type { RepoConfig, BranchRunResult } from '@shared/types'

async function shaFor(repo: RepoConfig, branch: string, messageSubstring: string): Promise<string> {
  const log = await gitService.getLog(repo, branch, 0, 20)
  const commit = log.find((c) => c.message.includes(messageSubstring))
  if (!commit) throw new Error(`No commit found matching "${messageSubstring}" on ${branch}`)
  return commit.sha
}

function readWorkFile(fixture: TestRepoFixture, relPath: string): string {
  return readFileSync(join(fixture.workDir, relPath), 'utf-8')
}

describe('cherryPickRunner', () => {
  let fixture: TestRepoFixture
  let repo: RepoConfig

  beforeEach(async () => {
    fixture = await setupTestRepo()
    repo = toRepoConfig(fixture)
  })

  afterEach(() => {
    fixture?.cleanup()
  })

  it('applies a single clean commit onto one branch and pushes it', async () => {
    const sha = await shaFor(repo, 'main', 'clean commit: extend main-only.txt')
    const { onProgress, waitFor } = createProgressAwaiter()

    await cherryPickRunner.startCherryPickRun(
      repo,
      { commitShas: [sha], targetBranches: ['branch-b'] },
      onProgress
    )
    const complete = await waitFor((e) => e.type === 'run-complete')
    if (complete.type !== 'run-complete') throw new Error('unreachable')

    const result = complete.results[0]
    expect(result.branch).toBe('branch-b')
    expect(result.appliedCommits).toEqual([sha])
    expect(result.conflicted).toBe(false)
    expect(result.pushed).toBe(true)
    expect(readWorkFile(fixture, 'main-only.txt')).toBe('main\nsecond line\n')

    const originLog = await gitService.git(repo).raw(['log', '-1', '--pretty=%s', 'origin/branch-b'])
    expect(originLog.trim()).toBe('clean commit: extend main-only.txt')
  })

  it('applies multiple commits sequentially across multiple branches', async () => {
    const g = gitService.git(repo)
    // A second clean-divergence branch, sharing branch-b's non-conflicting base.
    await g.checkoutBranch('branch-c', 'branch-b')
    await g.push(['-u', 'origin', 'branch-c'])
    await g.checkout('main')

    const shaClean = await shaFor(repo, 'main', 'clean commit: extend main-only.txt')
    const shaConflicting = await shaFor(repo, 'main', 'conflicting commit: change shared.txt')
    const { onProgress, waitFor } = createProgressAwaiter()

    await cherryPickRunner.startCherryPickRun(
      repo,
      { commitShas: [shaConflicting, shaClean], targetBranches: ['branch-b', 'branch-c'] },
      onProgress
    )
    const complete = await waitFor((e) => e.type === 'run-complete')
    if (complete.type !== 'run-complete') throw new Error('unreachable')

    expect(complete.results).toHaveLength(2)
    for (const result of complete.results as BranchRunResult[]) {
      // Applied oldest-first regardless of the order they were passed in.
      expect(result.appliedCommits).toEqual([shaClean, shaConflicting])
      expect(result.conflicted).toBe(false)
      expect(result.pushed).toBe(true)
    }
  })

  it('pauses on conflict, applies "theirs", and continues correctly', async () => {
    const sha = await shaFor(repo, 'main', 'conflicting commit: change shared.txt')
    const { onProgress, waitFor } = createProgressAwaiter()

    const runId = await cherryPickRunner.startCherryPickRun(
      repo,
      { commitShas: [sha], targetBranches: ['branch-a'] },
      onProgress
    )
    const conflict = await waitFor((e) => e.type === 'conflict')
    if (conflict.type !== 'conflict') throw new Error('unreachable')
    expect(conflict.files.map((f) => f.path)).toEqual(['shared.txt'])

    await cherryPickRunner.resolveFile(repo, 'shared.txt', 'theirs')
    await cherryPickRunner.continueCherryPick(runId)

    const complete = await waitFor((e) => e.type === 'run-complete')
    if (complete.type !== 'run-complete') throw new Error('unreachable')
    const result = complete.results[0]
    expect(result.conflicted).toBe(true)
    expect(result.appliedCommits).toEqual([sha])
    expect(result.pushed).toBe(true)
    expect(readWorkFile(fixture, 'shared.txt')).toBe('line1\nmain changed this line\n')
  })

  it('pauses on conflict, applies "ours", and continues by skipping the now-empty commit', async () => {
    const sha = await shaFor(repo, 'main', 'conflicting commit: change shared.txt')
    const { onProgress, waitFor } = createProgressAwaiter()

    const runId = await cherryPickRunner.startCherryPickRun(
      repo,
      { commitShas: [sha], targetBranches: ['branch-a'] },
      onProgress
    )
    await waitFor((e) => e.type === 'conflict')

    await cherryPickRunner.resolveFile(repo, 'shared.txt', 'ours')
    await cherryPickRunner.continueCherryPick(runId)

    const complete = await waitFor((e) => e.type === 'run-complete')
    if (complete.type !== 'run-complete') throw new Error('unreachable')
    const result = complete.results[0]
    expect(result.appliedCommits).toEqual([])
    expect(result.skippedCommits).toEqual([sha])
    expect(readWorkFile(fixture, 'shared.txt')).toBe('line1\nbranch-a changed this line differently\n')
  })

  it('aborts cleanly, leaving the branch untouched', async () => {
    const sha = await shaFor(repo, 'main', 'conflicting commit: change shared.txt')
    const { onProgress, waitFor } = createProgressAwaiter()

    const runId = await cherryPickRunner.startCherryPickRun(
      repo,
      { commitShas: [sha], targetBranches: ['branch-a'] },
      onProgress
    )
    await waitFor((e) => e.type === 'conflict')

    await cherryPickRunner.abortCherryPick(runId)

    expect(await gitService.isWorkingTreeClean(repo)).toBe(true)
    expect(readWorkFile(fixture, 'shared.txt')).toBe('line1\nbranch-a changed this line differently\n')

    const status = await gitService.git(repo).raw(['status', '--porcelain=v2', '--branch'])
    expect(status).not.toContain('CHERRY_PICK')
  })
})
