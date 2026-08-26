import Store from 'electron-store'
import { randomUUID } from 'crypto'
import type { AddRepoInput, AppSettings, RepoConfig } from '@shared/types'

interface StoreSchema {
  repos: RepoConfig[]
  settings: AppSettings
}

const store = new Store<StoreSchema>({
  defaults: {
    repos: [],
    settings: { cherryPickStrategy: 'default' }
  }
})

export function getRepos(): RepoConfig[] {
  return store.get('repos')
}

export function getRepo(id: string): RepoConfig | undefined {
  return getRepos().find((r) => r.id === id)
}

export function addRepo(input: AddRepoInput): RepoConfig {
  const repo: RepoConfig = {
    id: randomUUID(),
    name: input.name,
    localPath: input.localPath,
    remoteUrl: input.remoteUrl,
    baseBranch: input.baseBranch,
    addedAt: new Date().toISOString()
  }
  store.set('repos', [...getRepos(), repo])
  return repo
}

export function removeRepo(id: string): void {
  store.set(
    'repos',
    getRepos().filter((r) => r.id !== id)
  )
}

export function touchRepo(id: string): void {
  store.set(
    'repos',
    getRepos().map((r) => (r.id === id ? { ...r, lastUsedAt: new Date().toISOString() } : r))
  )
}

export function getSettings(): AppSettings {
  return store.get('settings')
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...patch }
  store.set('settings', next)
  return next
}
