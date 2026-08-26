import { useEffect, useState } from 'react'
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

  async function loadCommits(): Promise<void> {
    setLoading(true)
    try {
      setCommits(
        await window.api.git.getLog(repo.id, {
          branch: sourceBranch,
          skip: 0,
          limit: PAGE_SIZE,
          search: search || undefined
        })
      )
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
    <section>
      <h2>1. Pick commits</h2>

      <label>
        Source branch
        <input
          type="text"
          value={sourceBranch}
          onChange={(e) => onSourceBranchChange(e.target.value)}
        />
      </label>

      <label>
        Search
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by commit message"
        />
      </label>

      {loading && <p>Loading commits…</p>}

      {!loading && (
        <>
          <div className="row" style={{ margin: '8px 0' }}>
            <label className="row">
              <input
                type="checkbox"
                checked={commits.length > 0 && commits.every((c) => selected.has(c.sha))}
                onChange={toggleAll}
              />
              Select all ({selected.size} selected)
            </label>
          </div>

          <ul className="commit-list">
            {commits.map((c) => (
              <li key={c.sha} className="commit-row">
                <label className="row">
                  <input
                    type="checkbox"
                    checked={selected.has(c.sha)}
                    onChange={() => toggle(c.sha)}
                  />
                  <span className="commit-sha">{c.sha.slice(0, 7)}</span>
                  <span className="commit-message">{c.message}</span>
                  <span className="muted">{c.authorName}</span>
                </label>
              </li>
            ))}
          </ul>
          {commits.length === 0 && <p className="empty-state">No commits found.</p>}
        </>
      )}

      <div className="row dialog-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" onClick={onNext} disabled={selected.size === 0}>
          Next
        </button>
      </div>
    </section>
  )
}

export default CommitPickerStep
