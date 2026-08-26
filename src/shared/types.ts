export interface RepoConfig {
  id: string
  name: string
  localPath: string
  remoteUrl: string
  baseBranch: string
  addedAt: string
  lastUsedAt?: string
}

export interface AppSettings {
  externalEditorCommand?: string
  cherryPickStrategy: 'default' | '-x'
}

export interface BranchInfo {
  name: string
  isRemote: boolean
  ahead: number
  behind: number
  lastCommitDate: string
  lastCommitMessage: string
}

export interface CommitInfo {
  sha: string
  authorName: string
  date: string
  message: string
}

export interface ConflictFileInfo {
  path: string
  status: string
}

export type ConflictResolution = 'ours' | 'theirs' | 'manual'

export interface BranchRunResult {
  branch: string
  appliedCommits: string[]
  skippedCommits: string[]
  conflicted: boolean
  pushed: boolean
  error?: string
}

export type CherryPickProgressEvent =
  | { type: 'branch-start'; branch: string; branchIndex: number; totalBranches: number }
  | { type: 'commit-start'; branch: string; sha: string; commitIndex: number; totalCommits: number }
  | { type: 'commit-applied'; branch: string; sha: string }
  | { type: 'conflict'; branch: string; sha: string; files: ConflictFileInfo[] }
  | { type: 'branch-done'; branch: string; pushed: boolean }
  | { type: 'run-complete'; results: BranchRunResult[] }
  | { type: 'error'; branch?: string; sha?: string; message: string }
