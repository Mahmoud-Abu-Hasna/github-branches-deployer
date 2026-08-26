import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { BranchRunResult, CherryPickProgressEvent, RepoConfig } from '@shared/types'
import ConflictResolutionStep from './ConflictResolutionStep'
import { useToast, messageOf } from '../../components/useToast'

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
  const { showError } = useToast()

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
    // The progress subscription must be (re-)attached on every effect run —
    // React StrictMode's dev-mode mount/cleanup/mount-again cycle would
    // otherwise leave it unsubscribed after the first cleanup, since the
    // second invocation only ever ran the guarded block below. Only the
    // actual IPC call to start the run is guarded to fire once.
    const unsubscribe = window.api.events.onCherryPickProgress(handleEvent)

    if (!started.current) {
      started.current = true
      window.api.git
        .startCherryPickRun(repo.id, { commitShas, targetBranches })
        .then(({ runId }) => {
          runIdRef.current = runId
        })
        .catch((err: unknown) => {
          pushLine('error', `Failed to start: ${messageOf(err)}`)
          showError(messageOf(err))
        })
    }

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleContinue(): Promise<void> {
    if (!runIdRef.current) return
    try {
      // Only clear the conflict view on success — if continue fails (e.g. a
      // file still has unresolved conflicts), the user needs to see it again.
      await window.api.git.continueCherryPick(runIdRef.current)
      setConflict(null)
    } catch (err) {
      showError(messageOf(err))
    }
  }

  async function handleAbort(): Promise<void> {
    if (!runIdRef.current) return
    try {
      await window.api.git.abortCherryPick(runIdRef.current)
      setConflict(null)
      pushLine('error', 'Aborted by user.')
    } catch (err) {
      showError(messageOf(err))
    }
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
