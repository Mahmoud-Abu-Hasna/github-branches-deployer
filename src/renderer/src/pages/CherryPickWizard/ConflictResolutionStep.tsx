import { useState } from 'react'
import type { ConflictFileInfo, ConflictResolution, RepoConfig } from '@shared/types'

interface ConflictResolutionStepProps {
  repo: RepoConfig
  branch: string
  sha: string
  files: ConflictFileInfo[]
  onContinue: () => void
  onAbort: () => void
}

interface FileVersions {
  ours: string
  theirs: string
}

function ConflictResolutionStep({
  repo,
  branch,
  sha,
  files,
  onContinue,
  onAbort
}: ConflictResolutionStepProps): React.JSX.Element {
  const [versions, setVersions] = useState<Record<string, FileVersions>>({})
  const [resolved, setResolved] = useState<Record<string, ConflictResolution>>({})
  const [expanded, setExpanded] = useState<string | null>(files[0]?.path ?? null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function loadVersions(path: string): Promise<void> {
    if (versions[path]) return
    const v = await window.api.git.getFileVersions(repo.id, path)
    setVersions((prev) => ({ ...prev, [path]: v }))
  }

  function toggleExpand(path: string): void {
    const next = expanded === path ? null : path
    setExpanded(next)
    if (next) void loadVersions(next)
  }

  async function applyResolution(path: string, resolution: ConflictResolution): Promise<void> {
    setError(null)
    setBusy(true)
    try {
      await window.api.git.resolveFile(repo.id, path, resolution)
      setResolved((prev) => ({ ...prev, [path]: resolution }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleOpenInEditor(path: string): Promise<void> {
    await window.api.git.openInExternalEditor(repo.id, path)
  }

  const allResolved = files.every((f) => resolved[f.path])

  return (
    <section>
      <h2>Conflict on {branch}</h2>
      <p className="muted">
        Cherry-picking <code>{sha.slice(0, 7)}</code> conflicts in {files.length} file
        {files.length === 1 ? '' : 's'}. Choose which version to keep for each.
      </p>

      {error && <p className="error">{error}</p>}

      <ul className="conflict-file-list">
        {files.map((f) => (
          <li key={f.path} className="conflict-file">
            <div className="row conflict-file-header" onClick={() => toggleExpand(f.path)}>
              <strong>{f.path}</strong>
              {resolved[f.path] ? (
                <span className="muted">resolved: {resolved[f.path]}</span>
              ) : (
                <span className="error">unresolved</span>
              )}
            </div>

            {expanded === f.path && (
              <div className="conflict-file-body">
                <div className="conflict-panes">
                  <div>
                    <h4>Ours ({branch})</h4>
                    <pre className="conflict-pane">{versions[f.path]?.ours ?? 'Loading…'}</pre>
                  </div>
                  <div>
                    <h4>Theirs (incoming commit)</h4>
                    <pre className="conflict-pane">{versions[f.path]?.theirs ?? 'Loading…'}</pre>
                  </div>
                </div>

                <div className="row" style={{ marginTop: 8 }}>
                  <button type="button" disabled={busy} onClick={() => applyResolution(f.path, 'ours')}>
                    Keep Ours
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => applyResolution(f.path, 'theirs')}
                  >
                    Keep Theirs
                  </button>
                  <button type="button" disabled={busy} onClick={() => handleOpenInEditor(f.path)}>
                    Open in Editor
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => applyResolution(f.path, 'manual')}
                  >
                    Mark Resolved Manually
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="row dialog-actions">
        <button type="button" onClick={onAbort} disabled={busy}>
          Abort Run
        </button>
        <button type="button" onClick={onContinue} disabled={!allResolved || busy}>
          Continue Cherry-Pick
        </button>
      </div>
    </section>
  )
}

export default ConflictResolutionStep
