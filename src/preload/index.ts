import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IpcChannels } from '@shared/ipcChannels'
import type { AddRepoInput, AppSettings, BranchInfo, CommitInfo } from '@shared/types'

const api = {
  repos: {
    list: () => ipcRenderer.invoke(IpcChannels.repoList),
    add: (input: AddRepoInput) => ipcRenderer.invoke(IpcChannels.repoAdd, input),
    remove: (id: string) => ipcRenderer.invoke(IpcChannels.repoRemove, id),
    pickLocalFolder: (): Promise<string | null> =>
      ipcRenderer.invoke(IpcChannels.repoPickLocalFolder)
  },
  settings: {
    get: () => ipcRenderer.invoke(IpcChannels.settingsGet),
    update: (patch: Partial<AppSettings>) => ipcRenderer.invoke(IpcChannels.settingsUpdate, patch)
  },
  git: {
    fetch: (repoId: string): Promise<void> => ipcRenderer.invoke(IpcChannels.gitFetch, repoId),
    isWorkingTreeClean: (repoId: string): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.gitIsWorkingTreeClean, repoId),
    listBranches: (repoId: string): Promise<BranchInfo[]> =>
      ipcRenderer.invoke(IpcChannels.gitListBranches, repoId),
    getLog: (
      repoId: string,
      opts: { branch: string; skip: number; limit: number; search?: string }
    ): Promise<CommitInfo[]> => ipcRenderer.invoke(IpcChannels.gitGetLog, repoId, opts),
    createBranch: (
      repoId: string,
      opts: { name: string; fromBranch: string; push: boolean }
    ): Promise<void> => ipcRenderer.invoke(IpcChannels.gitCreateBranch, repoId, opts)
  }
}

// This app always creates its BrowserWindow with contextIsolation: true.
contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
