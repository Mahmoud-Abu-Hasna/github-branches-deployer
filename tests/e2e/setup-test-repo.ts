import { mkdtempSync, mkdirSync, rmSync, writeFileSync, appendFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { simpleGit } from 'simple-git'

export interface TestRepoFixture {
  /** Working clone that behaves like a repo the app would manage. */
  workDir: string
  /** Bare repo standing in for "origin". */
  originDir: string
  cleanup: () => void
}

/**
 * Creates a disposable working repo + bare "origin", seeded with a few commits
 * on `main`, two branches (`branch-a`, `branch-b`) diverging from an earlier
 * point, and a deliberately conflicting commit so cherry-pick conflict paths
 * can be exercised deterministically.
 */
export async function setupTestRepo(): Promise<TestRepoFixture> {
  const root = mkdtempSync(join(tmpdir(), 'branch-deployer-fixture-'))
  const originDir = join(root, 'origin.git')
  const workDir = join(root, 'work')

  await simpleGit().init(true, [originDir])

  mkdirSync(workDir, { recursive: true })
  const git = simpleGit(workDir)
  await git.init(false)
  await git.addConfig('user.email', 'fixture@example.com')
  await git.addConfig('user.name', 'Fixture')
  await git.addConfig('core.autocrlf', 'false')
  await git.addRemote('origin', originDir)

  writeFileSync(join(workDir, 'shared.txt'), 'line1\n')
  writeFileSync(join(workDir, 'main-only.txt'), 'main\n')
  await git.add('.')
  await git.commit('initial commit')
  await git.branch(['-M', 'main'])

  // Divergence point for branch-a/branch-b
  await git.push(['-u', 'origin', 'main'])
  await git.checkoutBranch('branch-a', 'main')
  await git.checkoutBranch('branch-b', 'main')
  await git.push(['-u', 'origin', 'branch-b'])
  await git.checkout('branch-a')
  await git.push(['-u', 'origin', 'branch-a'])

  // Commits on main after the branch point: one clean, one that will conflict on branch-a.
  await git.checkout('main')
  appendFileSync(join(workDir, 'main-only.txt'), 'second line\n')
  await git.add('.')
  await git.commit('clean commit: extend main-only.txt')

  writeFileSync(join(workDir, 'shared.txt'), 'line1\nmain changed this line\n')
  await git.add('.')
  await git.commit('conflicting commit: change shared.txt from main')
  await git.push(['origin', 'main'])

  // Make branch-a diverge on the same line so the above commit conflicts when cherry-picked.
  await git.checkout('branch-a')
  writeFileSync(join(workDir, 'shared.txt'), 'line1\nbranch-a changed this line differently\n')
  await git.add('.')
  await git.commit('branch-a: change shared.txt independently')
  await git.push(['origin', 'branch-a'])

  await git.checkout('main')

  return {
    workDir,
    originDir,
    cleanup: () => rmSync(root, { recursive: true, force: true })
  }
}
