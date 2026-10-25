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
  const [conflictActionPending, setConflictActionPending] = useState(false)
  const runIdRef = useRef<string | null>(null)
  const started = useRef(false)
  // Guards against double-firing continue/abort (e.g. a fast double-click):
  // `conflictActionPending` state alone isn't enough since a second click can
  // land before React re-renders with the disabled button.
  const conflictActionInFlight = useRef(false)
  const { showError } = useToast()

  function pushLine(kind: LogKind, text: string): void {
    setLog((prev) => [...prev, { kind, text }])
  }

  function handleEvent(event: CherryPickProgressEvent): void {
    // `conflict` is derived purely from the event stream, not from whether
    // continueCherryPick's own call resolved without throwing — that call
    // resolves successfully both when the run moves past the conflict AND
    // when it immediately pauses again on the *next* one (applyCommits just
    // emits another 'conflict' event and returns, it doesn't throw). Clearing
    // conflict from handleContinue after a successful await raced with, and
    // could wipe out, the state this case just set for that next conflict.
    if (event.type !== 'conflict') {
      setConflict(null)
    }
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
    if (!runIdRef.current || conflictActionInFlight.current) return
    conflictActionInFlight.current = true
    setConflictActionPending(true)
    try {
      // Don't clear `conflict` here — handleEvent does it, driven by
      // whatever event actually comes next (see the comment there). If
      // continue fails (e.g. a file still has unresolved conflicts), no
      // event fires at all, so the current conflict view is correctly left
      // showing.
      await window.api.git.continueCherryPick(runIdRef.current)
    } catch (err) {
      showError(messageOf(err))
    } finally {
      conflictActionInFlight.current = false
      setConflictActionPending(false)
    }
  }

  async function handleAbort(): Promise<void> {
    if (!runIdRef.current || conflictActionInFlight.current) return
    conflictActionInFlight.current = true
    setConflictActionPending(true)
    try {
      // abortCherryPick always ends the run with a 'run-complete' event,
      // which clears `conflict` the same way as any other non-conflict
      // event — see the comment in handleEvent.
      await window.api.git.abortCherryPick(runIdRef.current)
      pushLine('error', 'Aborted by user.')
    } catch (err) {
      showError(messageOf(err))
    } finally {
      conflictActionInFlight.current = false
      setConflictActionPending(false)
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
        actionPending={conflictActionPending}
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
