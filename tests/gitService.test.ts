import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setupTestRepo, type TestRepoFixture } from './e2e/setup-test-repo'
import { toRepoConfig } from './testUtils'
import * as gitService from '@main/services/gitService'

describe('gitService against the disposable fixture repo', () => {
  let fixture: TestRepoFixture

  beforeEach(async () => {
    fixture = await setupTestRepo()
  })

  afterEach(() => {
    fixture?.cleanup()
  })

  it('getLog returns commits on main, newest first', async () => {
    const repo = toRepoConfig(fixture)
    const log = await gitService.getLog(repo, 'main', 0, 10)
    const messages = log.map((c) => c.message)
    expect(messages).toEqual([
      'conflicting commit: change shared.txt from main',
      'clean commit: extend main-only.txt',
      'initial commit'
    ])
  })

  it('getLog flags merge commits via isMerge (they cannot be cherry-picked without -m)', async () => {
    const repo = toRepoConfig(fixture)
    const g = gitService.git(repo)
    await g.checkoutBranch('to-merge', 'main')
    await g.commit('commit to be merged in', ['--allow-empty'])
    await g.checkout('main')
    await g.merge(['--no-ff', 'to-merge', '-m', 'merge commit: flagged, not excluded'])

    const log = await gitService.getLog(repo, 'main', 0, 10)
    const merge = log.find((c) => c.message === 'merge commit: flagged, not excluded')
    const regular = log.find((c) => c.message === 'commit to be merged in')
    expect(merge?.isMerge).toBe(true)
    expect(regular?.isMerge).toBe(false)
  })

  it('listBranches finds all seeded branches with correct ahead/behind vs main', async () => {
    const repo = toRepoConfig(fixture)
    const branches = await gitService.listBranches(repo)
    const localNames = branches.filter((b) => !b.isRemote).map((b) => b.name)
    expect(localNames.sort()).toEqual(['branch-a', 'branch-b', 'main'])

    const branchA = branches.find((b) => b.name === 'branch-a' && !b.isRemote)
    expect(branchA).toBeDefined()
    // main has 2 commits branch-a lacks; branch-a has 1 commit main lacks.
    expect(branchA?.behind).toBe(2)
    expect(branchA?.ahead).toBe(1)
  })

  it('listBranches reports a real, parseable lastCommitDate per branch', async () => {
    const repo = toRepoConfig(fixture)
    const branches = await gitService.listBranches(repo)
    for (const b of branches) {
      expect(b.lastCommitDate, `${b.name} (${b.isRemote ? 'remote' : 'local'})`).not.toBe('')
      expect(Number.isNaN(new Date(b.lastCommitDate).getTime())).toBe(false)
    }

    const main = branches.find((b) => b.name === 'main' && !b.isRemote)!
    const branchA = branches.find((b) => b.name === 'branch-a' && !b.isRemote)!
    // The fixture commits main's tip, then branch-a's own tip afterwards
    // (>= rather than > since git's 1s timestamp resolution can tie them).
    expect(new Date(branchA.lastCommitDate).getTime()).toBeGreaterThanOrEqual(
      new Date(main.lastCommitDate).getTime()
    )
  })

  it('isWorkingTreeClean is true on a freshly seeded fixture', async () => {
    const repo = toRepoConfig(fixture)
    expect(await gitService.isWorkingTreeClean(repo)).toBe(true)
  })
})
