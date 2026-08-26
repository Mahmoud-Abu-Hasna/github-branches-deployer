import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IpcChannels } from '@shared/ipcChannels'
import type {
  AddRepoInput,
  AppSettings,
  BranchInfo,
  CherryPickProgressEvent,
  CommitInfo,
  ConflictFileInfo,
  ConflictResolution
} from '@shared/types'

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
    ): Promise<void> => ipcRenderer.invoke(IpcChannels.gitCreateBranch, repoId, opts),
    startCherryPickRun: (
      repoId: string,
      opts: { commitShas: string[]; targetBranches: string[] }
    ): Promise<{ runId: string }> =>
      ipcRenderer.invoke(IpcChannels.gitStartCherryPickRun, repoId, opts),
    getConflictFiles: (repoId: string): Promise<ConflictFileInfo[]> =>
      ipcRenderer.invoke(IpcChannels.gitGetConflictFiles, repoId),
    getFileVersions: (
      repoId: string,
      filePath: string
    ): Promise<{ ours: string; theirs: string }> =>
      ipcRenderer.invoke(IpcChannels.gitGetFileVersions, repoId, filePath),
    resolveFile: (
      repoId: string,
      filePath: string,
      resolution: ConflictResolution
    ): Promise<void> => ipcRenderer.invoke(IpcChannels.gitResolveFile, repoId, filePath, resolution),
    openInExternalEditor: (repoId: string, filePath: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.gitOpenInExternalEditor, repoId, filePath),
    continueCherryPick: (runId: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.gitContinueCherryPick, runId),
    abortCherryPick: (runId: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.gitAbortCherryPick, runId),
    push: (repoId: string, branch: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.gitPush, repoId, branch)
  },
  events: {
    onCherryPickProgress: (cb: (event: CherryPickProgressEvent) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: CherryPickProgressEvent): void =>
        cb(payload)
      ipcRenderer.on(IpcChannels.cherryPickProgressEvent, listener)
      return () => ipcRenderer.removeListener(IpcChannels.cherryPickProgressEvent, listener)
    }
  }
}

// This app always creates its BrowserWindow with contextIsolation: true.
contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
