import { ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipcChannels'
import * as repoStore from '@main/services/repoStore'
import * as gitService from '@main/services/gitService'
import type { RepoConfig } from '@shared/types'

function requireRepo(id: string): RepoConfig {
  const repo = repoStore.getRepo(id)
  if (!repo) throw new Error(`Repo "${id}" is not managed (it may have been removed).`)
  return repo
}

export function registerGitHandlers(): void {
  ipcMain.handle(IpcChannels.gitFetch, async (_event, repoId: string) => {
    await gitService.fetch(requireRepo(repoId))
  })

  ipcMain.handle(IpcChannels.gitIsWorkingTreeClean, async (_event, repoId: string) => {
    return gitService.isWorkingTreeClean(requireRepo(repoId))
  })

  ipcMain.handle(IpcChannels.gitListBranches, async (_event, repoId: string) => {
    return gitService.listBranches(requireRepo(repoId))
  })

  ipcMain.handle(
    IpcChannels.gitCreateBranch,
    async (
      _event,
      repoId: string,
      opts: { name: string; fromBranch: string; push: boolean }
    ) => {
      await gitService.createBranch(requireRepo(repoId), opts)
    }
  )

  ipcMain.handle(
    IpcChannels.gitGetLog,
    async (
      _event,
      repoId: string,
      opts: { branch: string; skip: number; limit: number; search?: string }
    ) => {
      const repo = requireRepo(repoId)
      return gitService.getLog(repo, opts.branch, opts.skip, opts.limit, opts.search)
    }
  )
}
