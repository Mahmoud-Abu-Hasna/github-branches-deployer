import { useEffect, useState } from 'react'
import { AlertTriangle, Search } from 'lucide-react'
import type { CommitInfo, RepoConfig } from '@shared/types'

interface CommitPickerStepProps {
  repo: RepoConfig
  sourceBranch: string
  onSourceBranchChange: (branch: string) => void
  selected: Set<string>
  onSelectedChange: (selected: Set<string>) => void
  onNext: () => void
  onCancel: () => void
}

const PAGE_SIZE = 30

function CommitPickerStep({
  repo,
  sourceBranch,
  onSourceBranchChange,
  selected,
  onSelectedChange,
  onNext,
  onCancel
}: CommitPickerStepProps): React.JSX.Element {
  const [commits, setCommits] = useState<CommitInfo[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadCommits(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      setCommits(
        await window.api.git.getLog(repo.id, {
          branch: sourceBranch,
          skip: 0,
          limit: PAGE_SIZE,
          search: search || undefined
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => void loadCommits(), 200)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo.id, sourceBranch, search])

  function toggle(sha: string): void {
    const next = new Set(selected)
    if (next.has(sha)) next.delete(sha)
    else next.add(sha)
    onSelectedChange(next)
  }

  function toggleAll(): void {
    const allSelected = commits.every((c) => selected.has(c.sha))
    const next = new Set(selected)
    if (allSelected) {
      commits.forEach((c) => next.delete(c.sha))
    } else {
      commits.forEach((c) => next.add(c.sha))
    }
    onSelectedChange(next)
  }

  return (
    <div className="stack" style={{ flex: 1, minHeight: 0 }}>
      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <label style={{ width: 200 }}>
          Source branch
          <input
            type="text"
            value={sourceBranch}
            onChange={(e) => onSourceBranchChange(e.target.value)}
          />
        </label>

        <label style={{ flex: 1 }}>
          Search
          <div className="row" style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: 10, color: 'var(--text-tertiary)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by commit message"
              style={{ paddingLeft: 32, width: '100%' }}
            />
          </div>
        </label>
      </div>

      {error && (
        <p className="callout">
          <AlertTriangle size={14} />
          {error}
        </p>
      )}

      {loading && (
        <div className="stack">
          <div className="skeleton-row" style={{ height: 34 }} />
          <div className="skeleton-row" style={{ height: 34 }} />
          <div className="skeleton-row" style={{ height: 34 }} />
        </div>
      )}

      {!loading && (
        <>
          <label className="select-all-row row" style={{ flexDirection: 'row' }}>
            <input
              type="checkbox"
              checked={commits.length > 0 && commits.every((c) => selected.has(c.sha))}
              onChange={toggleAll}
            />
            Select all
            <span className="badge">{selected.size} selected</span>
          </label>

          <ul className="commit-list" style={{ flex: 1 }}>
            {commits.map((c) => (
              <li key={c.sha} className="commit-row">
                <label className="row">
                  <input type="checkbox" checked={selected.has(c.sha)} onChange={() => toggle(c.sha)} />
                  <span className="commit-sha">{c.sha.slice(0, 7)}</span>
                  <span className="commit-message">{c.message}</span>
                  <span className="muted">{c.authorName}</span>
                </label>
              </li>
            ))}
            {commits.length === 0 && (
              <li className="empty-state">
                <p>No commits found.</p>
              </li>
            )}
          </ul>
        </>
      )}

      <div className="row dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext} disabled={selected.size === 0}>
          Next
        </button>
      </div>
    </div>
  )
}

export default CommitPickerStep
