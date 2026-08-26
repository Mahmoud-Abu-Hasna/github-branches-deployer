import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { BranchRunResult, CherryPickProgressEvent, RepoConfig } from '@shared/types'
import ConflictResolutionStep from './ConflictResolutionStep'

interface RunProgressStepProps {
  repo: RepoConfig
  commitShas: string[]
  targetBranches: string[]
  onComplete: (results: BranchRunResult[]) => void
}

type ConflictInfo = Extract<CherryPickProgressEvent, { type: 'conflict' }>
type LogKind = 'info' | 'applied' | 'conflict' | 'error' | 'done'
interface LogLine {
  kind: LogKind
  text: string
}

function RunProgressStep({
  repo,
  commitShas,
  targetBranches,
  onComplete
}: RunProgressStepProps): React.JSX.Element {
  const [log, setLog] = useState<LogLine[]>([])
  const [conflict, setConflict] = useState<ConflictInfo | null>(null)
  const runIdRef = useRef<string | null>(null)
  const started = useRef(false)

  function pushLine(kind: LogKind, text: string): void {
    setLog((prev) => [...prev, { kind, text }])
  }

  function handleEvent(event: CherryPickProgressEvent): void {
    switch (event.type) {
      case 'branch-start':
        pushLine('info', `→ ${event.branch}: starting…`)
        break
      case 'commit-start':
        pushLine(
          'info',
          `  ${event.branch}: applying ${event.sha.slice(0, 7)} (${event.commitIndex + 1}/${event.totalCommits})`
        )
        break
      case 'commit-applied':
        pushLine('applied', `  ${event.branch}: applied ${event.sha.slice(0, 7)}`)
        break
      case 'conflict':
        pushLine('conflict', `  ${event.branch}: conflict on ${event.sha.slice(0, 7)}`)
        setConflict(event)
        break
      case 'branch-done':
        pushLine(
          'done',
          `✓ ${event.branch}: done (${event.pushed ? 'pushed' : 'not pushed'})`
        )
        break
      case 'error':
        pushLine('error', `✗ ${event.branch ?? ''}: ${event.message}`)
        break
      case 'run-complete':
        pushLine('done', 'Run complete.')
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
    pushLine('error', 'Aborted by user.')
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
    <div className="stack" style={{ flex: 1, minHeight: 0 }}>
      <div className="row muted">
        <Loader2 size={14} className="spin" />
        Running…
      </div>
      <pre className="run-log">
        {log.map((line, i) => (
          <div key={i} className={line.kind !== 'info' ? `log-line-${line.kind}` : undefined}>
            {line.text}
          </div>
        ))}
      </pre>
    </div>
  )
}

export default RunProgressStep
