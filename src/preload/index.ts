import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IpcChannels } from '@shared/ipcChannels'
import type { AddRepoInput, AppSettings } from '@shared/types'

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
  }
}

// This app always creates its BrowserWindow with contextIsolation: true.
contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
