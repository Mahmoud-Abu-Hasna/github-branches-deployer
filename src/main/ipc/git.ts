import { ipcMain, shell } from 'electron'
import { spawn } from 'child_process'
import { join } from 'path'
import { IpcChannels } from '@shared/ipcChannels'
import * as repoStore from '@main/services/repoStore'
import * as gitService from '@main/services/gitService'
import * as cherryPickRunner from '@main/services/cherryPickRunner'
import type { ConflictResolution, RepoConfig } from '@shared/types'

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
    async (_event, repoId: string, opts: { name: string; fromBranch: string; push: boolean }) => {
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

  ipcMain.handle(
    IpcChannels.gitStartCherryPickRun,
    async (
      event,
      repoId: string,
      opts: { commitShas: string[]; targetBranches: string[] }
    ) => {
      const repo = requireRepo(repoId)
      const settings = repoStore.getSettings()
      const sender = event.sender
      const runId = await cherryPickRunner.startCherryPickRun(
        repo,
        { ...opts, cherryPickStrategy: settings.cherryPickStrategy },
        (progressEvent) => {
          if (!sender.isDestroyed()) {
            sender.send(IpcChannels.cherryPickProgressEvent, progressEvent)
          }
        }
      )
      return { runId }
    }
  )

  ipcMain.handle(IpcChannels.gitGetConflictFiles, async (_event, repoId: string) => {
    return gitService.getConflictFiles(requireRepo(repoId))
  })

  ipcMain.handle(
    IpcChannels.gitGetFileVersions,
    async (_event, repoId: string, filePath: string) => {
      return gitService.getFileVersions(requireRepo(repoId), filePath)
    }
  )

  ipcMain.handle(
    IpcChannels.gitResolveFile,
    async (_event, repoId: string, filePath: string, resolution: ConflictResolution) => {
      await cherryPickRunner.resolveFile(requireRepo(repoId), filePath, resolution)
    }
  )

  ipcMain.handle(
    IpcChannels.gitOpenInExternalEditor,
    async (_event, repoId: string, filePath: string) => {
      const repo = requireRepo(repoId)
      const fullPath = join(repo.localPath, filePath)
      const settings = repoStore.getSettings()
      if (settings.externalEditorCommand) {
        spawn(settings.externalEditorCommand, [fullPath], { detached: true, stdio: 'ignore' }).unref()
      } else {
        await shell.openPath(fullPath)
      }
    }
  )

  ipcMain.handle(IpcChannels.gitContinueCherryPick, async (_event, runId: string) => {
    await cherryPickRunner.continueCherryPick(runId)
  })

  ipcMain.handle(IpcChannels.gitAbortCherryPick, async (_event, runId: string) => {
    await cherryPickRunner.abortCherryPick(runId)
  })

  ipcMain.handle(IpcChannels.gitPush, async (_event, repoId: string, branch: string) => {
    await gitService.git(requireRepo(repoId)).push(['origin', branch])
  })
}
