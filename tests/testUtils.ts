import type { RepoConfig, CherryPickProgressEvent } from '@shared/types'
import type { TestRepoFixture } from './e2e/setup-test-repo'

export function toRepoConfig(fixture: TestRepoFixture, baseBranch = 'main'): RepoConfig {
  return {
    id: 'test',
    name: 'test',
    localPath: fixture.workDir,
    remoteUrl: fixture.originDir,
    baseBranch,
    addedAt: new Date().toISOString()
  }
}

export function createProgressAwaiter(): {
  events: CherryPickProgressEvent[]
  onProgress: (event: CherryPickProgressEvent) => void
  waitFor: (pred: (event: CherryPickProgressEvent) => boolean) => Promise<CherryPickProgressEvent>
} {
  const events: CherryPickProgressEvent[] = []
  const waiters: {
    pred: (event: CherryPickProgressEvent) => boolean
    resolve: (event: CherryPickProgressEvent) => void
  }[] = []

  function onProgress(event: CherryPickProgressEvent): void {
    events.push(event)
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (waiters[i].pred(event)) {
        waiters[i].resolve(event)
        waiters.splice(i, 1)
      }
    }
  }

  let seen = 0

  function waitFor(
    pred: (event: CherryPickProgressEvent) => boolean
  ): Promise<CherryPickProgressEvent> {
    // Only match events not already claimed by a previous waitFor call —
    // otherwise a second waitFor with an overlapping predicate (e.g. two
    // waits for type === 'conflict' in the same test) immediately resolves
    // with the already-consumed first match instead of waiting for the next.
    const already = events.slice(seen).find(pred)
    if (already) {
      seen = events.indexOf(already) + 1
      return Promise.resolve(already)
    }
    return new Promise((resolve) => {
      waiters.push({
        pred: (event) => {
          if (!pred(event)) return false
          seen = events.length
          return true
        },
        resolve
      })
    })
  }

  return { events, onProgress, waitFor }
}
