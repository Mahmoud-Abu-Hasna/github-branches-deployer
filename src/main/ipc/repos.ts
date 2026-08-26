import { ipcMain, dialog, BrowserWindow } from 'electron'
import { existsSync, statSync } from 'fs'
import { join } from 'path'
import { simpleGit } from 'simple-git'
import { IpcChannels } from '@shared/ipcChannels'
import * as repoStore from '@main/services/repoStore'
import type { AddRepoInput } from '@shared/types'

function isGitRepo(localPath: string): boolean {
  const gitDir = join(localPath, '.git')
  return existsSync(gitDir) && statSync(gitDir).isDirectory()
}

export function registerRepoHandlers(): void {
  ipcMain.handle(IpcChannels.repoList, () => {
    return repoStore.getRepos()
  })

  ipcMain.handle(IpcChannels.repoAdd, async (_event, input: AddRepoInput) => {
    if (!isGitRepo(input.localPath)) {
      throw new Error(`"${input.localPath}" is not a git repository (no .git folder found).`)
    }
    if (repoStore.getRepos().some((r) => r.localPath === input.localPath)) {
      throw new Error('This repo is already managed.')
    }
    let remoteUrl = input.remoteUrl
    if (!remoteUrl) {
      try {
        const remotes = await simpleGit(input.localPath).getRemotes(true)
        remoteUrl = remotes.find((r) => r.name === 'origin')?.refs.fetch ?? ''
      } catch {
        remoteUrl = ''
      }
    }
    return repoStore.addRepo({ ...input, remoteUrl })
  })

  ipcMain.handle(IpcChannels.repoRemove, (_event, id: string) => {
    repoStore.removeRepo(id)
  })

  ipcMain.handle(IpcChannels.repoPickLocalFolder, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = window
      ? await dialog.showOpenDialog(window, { properties: ['openDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IpcChannels.settingsGet, () => {
    return repoStore.getSettings()
  })

  ipcMain.handle(IpcChannels.settingsUpdate, (_event, patch) => {
    return repoStore.updateSettings(patch)
  })
}
