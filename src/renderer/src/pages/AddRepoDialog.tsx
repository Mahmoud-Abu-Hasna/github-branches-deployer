import { useState } from 'react'
import { AlertTriangle, FolderOpen } from 'lucide-react'
import type { RepoConfig } from '@shared/types'

interface AddRepoDialogProps {
  onClose: () => void
  onAdded: (repo: RepoConfig) => void
}

function AddRepoDialog({ onClose, onAdded }: AddRepoDialogProps): React.JSX.Element {
  const [localPath, setLocalPath] = useState('')
  const [name, setName] = useState('')
  const [baseBranch, setBaseBranch] = useState('main')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handlePickFolder(): Promise<void> {
    const picked = await window.api.repos.pickLocalFolder()
    if (!picked) return
    setLocalPath(picked)
    if (!name) {
      const parts = picked.split(/[\\/]/).filter(Boolean)
      setName(parts[parts.length - 1] ?? '')
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (!localPath || !name.trim() || !baseBranch.trim()) {
      setError('Please choose a folder and fill in all fields.')
      return
    }
    setSubmitting(true)
    try {
      const repo = await window.api.repos.add({
        name: name.trim(),
        localPath,
        remoteUrl: '',
        baseBranch: baseBranch.trim()
      })
      onAdded(repo)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true">
      <form className="dialog" onSubmit={handleSubmit}>
        <h2>Add Repo</h2>

        <label>
          Local folder
          <div className="row">
            <input type="text" value={localPath} readOnly placeholder="No folder selected" style={{ flex: 1 }} />
            <button type="button" className="btn btn-secondary" onClick={handlePickFolder}>
              <FolderOpen size={14} />
              Browse…
            </button>
          </div>
        </label>

        <label>
          Display name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label>
          Base branch
          <input type="text" value={baseBranch} onChange={(e) => setBaseBranch(e.target.value)} />
          <span className="field-hint">The shared branch new client branches and cherry-picks come from.</span>
        </label>

        {error && (
          <p className="callout">
            <AlertTriangle size={14} />
            {error}
          </p>
        )}

        <div className="row dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add Repo'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddRepoDialog
