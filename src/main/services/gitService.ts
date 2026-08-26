import { simpleGit, type SimpleGit } from 'simple-git'
import type { BranchInfo, CommitInfo, RepoConfig } from '@shared/types'

function git(repo: RepoConfig): SimpleGit {
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

export async function listBranches(repo: RepoConfig): Promise<BranchInfo[]> {
  const g = git(repo)
  const summary = await g.branch(['-a', '-v', '--no-color'])
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
      lastCommitDate: '',
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
    '--pretty=format:%H%x1f%an%x1f%ad%x1f%s',
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
      const [sha, authorName, date, message] = line.split('\x1f')
      return { sha, authorName, date, message }
    })
}
