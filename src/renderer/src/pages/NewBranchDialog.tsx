import { useState } from 'react'
import type { RepoConfig } from '@shared/types'

interface NewBranchDialogProps {
  repo: RepoConfig
  onClose: () => void
  onCreated: () => void
}

function NewBranchDialog({ repo, onClose, onCreated }: NewBranchDialogProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [fromBranch, setFromBranch] = useState(repo.baseBranch)
  const [push, setPush] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Please enter a branch name.')
      return
    }
    setSubmitting(true)
    try {
      await window.api.git.createBranch(repo.id, {
        name: name.trim(),
        fromBranch: fromBranch.trim(),
        push
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true">
      <form className="dialog" onSubmit={handleSubmit}>
        <h2>New Branch (New Copy)</h2>

        <label>
          Branch name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. new-client-name"
            autoFocus
          />
        </label>

        <label>
          Base branch
          <input type="text" value={fromBranch} onChange={(e) => setFromBranch(e.target.value)} />
        </label>

        <label className="row">
          <input type="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} />
          Push to origin
        </label>

        {error && <p className="error">{error}</p>}

        <div className="row dialog-actions">
          <button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Branch'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default NewBranchDialog
