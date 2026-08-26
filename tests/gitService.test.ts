import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setupTestRepo, type TestRepoFixture } from './e2e/setup-test-repo'
import * as gitService from '@main/services/gitService'
import type { RepoConfig } from '@shared/types'

function toRepoConfig(fixture: TestRepoFixture, baseBranch = 'main'): RepoConfig {
  return {
    id: 'test',
    name: 'test',
    localPath: fixture.workDir,
    remoteUrl: fixture.originDir,
    baseBranch,
    addedAt: new Date().toISOString()
  }
}

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

  it('isWorkingTreeClean is true on a freshly seeded fixture', async () => {
    const repo = toRepoConfig(fixture)
    expect(await gitService.isWorkingTreeClean(repo)).toBe(true)
  })
})
