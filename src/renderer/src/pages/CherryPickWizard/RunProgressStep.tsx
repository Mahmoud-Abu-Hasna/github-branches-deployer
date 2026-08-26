import { useEffect, useRef, useState } from 'react'
import type { BranchRunResult, CherryPickProgressEvent, RepoConfig } from '@shared/types'
import ConflictResolutionStep from './ConflictResolutionStep'

interface RunProgressStepProps {
  repo: RepoConfig
  commitShas: string[]
  targetBranches: string[]
  onComplete: (results: BranchRunResult[]) => void
}

type ConflictInfo = Extract<CherryPickProgressEvent, { type: 'conflict' }>

function RunProgressStep({
  repo,
  commitShas,
  targetBranches,
  onComplete
}: RunProgressStepProps): React.JSX.Element {
  const [log, setLog] = useState<string[]>([])
  const [conflict, setConflict] = useState<ConflictInfo | null>(null)
  const runIdRef = useRef<string | null>(null)
  const started = useRef(false)

  function handleEvent(event: CherryPickProgressEvent): void {
    switch (event.type) {
      case 'branch-start':
        setLog((prev) => [...prev, `→ ${event.branch}: starting…`])
        break
      case 'commit-start':
        setLog((prev) => [
          ...prev,
          `  ${event.branch}: applying ${event.sha.slice(0, 7)} (${event.commitIndex + 1}/${event.totalCommits})`
        ])
        break
      case 'commit-applied':
        setLog((prev) => [...prev, `  ${event.branch}: applied ${event.sha.slice(0, 7)}`])
        break
      case 'conflict':
        setLog((prev) => [...prev, `  ${event.branch}: conflict on ${event.sha.slice(0, 7)}`])
        setConflict(event)
        break
      case 'branch-done':
        setLog((prev) => [
          ...prev,
          `✓ ${event.branch}: done (${event.pushed ? 'pushed' : 'not pushed'})`
        ])
        break
      case 'error':
        setLog((prev) => [...prev, `✗ ${event.branch ?? ''}: ${event.message}`])
        break
      case 'run-complete':
        setLog((prev) => [...prev, 'Run complete.'])
        onComplete(event.results)
        break
    }
  }

  useEffect(() => {
    if (started.current) return
    started.current = true

    const unsubscribe = window.api.events.onCherryPickProgress(handleEvent)

    window.api.git
      .startCherryPickRun(repo.id, { commitShas, targetBranches })
      .then(({ runId }) => {
        runIdRef.current = runId
      })

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleContinue(): Promise<void> {
    if (!runIdRef.current) return
    setConflict(null)
    await window.api.git.continueCherryPick(runIdRef.current)
  }

  async function handleAbort(): Promise<void> {
    if (!runIdRef.current) return
    await window.api.git.abortCherryPick(runIdRef.current)
    setConflict(null)
    setLog((prev) => [...prev, 'Aborted by user.'])
  }

  if (conflict) {
    return (
      <ConflictResolutionStep
        repo={repo}
        branch={conflict.branch}
        sha={conflict.sha}
        files={conflict.files}
        onContinue={handleContinue}
        onAbort={handleAbort}
      />
    )
  }

  return (
    <section>
      <h2>Running Cherry-Pick…</h2>
      <pre className="run-log">{log.join('\n')}</pre>
    </section>
  )
}

export default RunProgressStep
