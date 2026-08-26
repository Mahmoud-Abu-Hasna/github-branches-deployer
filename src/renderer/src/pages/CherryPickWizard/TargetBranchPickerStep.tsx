import { useEffect, useState } from 'react'
import { GitBranch } from 'lucide-react'
import type { BranchInfo, RepoConfig } from '@shared/types'

interface TargetBranchPickerStepProps {
  repo: RepoConfig
  sourceBranch: string
  selected: Set<string>
  onSelectedChange: (selected: Set<string>) => void
  onBack: () => void
  onNext: () => void
}

function TargetBranchPickerStep({
  repo,
  sourceBranch,
  selected,
  onSelectedChange,
  onBack,
  onNext
}: TargetBranchPickerStepProps): React.JSX.Element {
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.git
      .listBranches(repo.id)
      .then((all) => {
        const localOnly = all.filter((b) => !b.isRemote && b.name !== sourceBranch)
        setBranches(localOnly)
      })
      .finally(() => setLoading(false))
  }, [repo.id, sourceBranch])

  function toggle(name: string): void {
    const next = new Set(selected)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    onSelectedChange(next)
  }

  function toggleAll(): void {
    const allSelected = branches.every((b) => selected.has(b.name))
    const next = new Set(selected)
    if (allSelected) {
      branches.forEach((b) => next.delete(b.name))
    } else {
      branches.forEach((b) => next.add(b.name))
    }
    onSelectedChange(next)
  }

  return (
    <div className="stack" style={{ flex: 1, minHeight: 0 }}>
      {loading && (
        <div className="stack">
          <div className="skeleton-row" style={{ height: 34 }} />
          <div className="skeleton-row" style={{ height: 34 }} />
        </div>
      )}

      {!loading && (
        <>
          <label className="select-all-row row" style={{ flexDirection: 'row' }}>
            <input
              type="checkbox"
              checked={branches.length > 0 && branches.every((b) => selected.has(b.name))}
              onChange={toggleAll}
            />
            Select all
            <span className="badge">{selected.size} selected</span>
          </label>

          <ul className="commit-list" style={{ flex: 1 }}>
            {branches.map((b) => (
              <li key={b.name} className="commit-row">
                <label className="row">
                  <input type="checkbox" checked={selected.has(b.name)} onChange={() => toggle(b.name)} />
                  <GitBranch size={13} style={{ color: 'var(--text-tertiary)' }} />
                  <span className="commit-message">{b.name}</span>
                  <span className="muted num">
                    {b.ahead > 0 && `+${b.ahead}`} {b.behind > 0 && `-${b.behind}`}
                  </span>
                </label>
              </li>
            ))}
            {branches.length === 0 && (
              <li className="empty-state">
                <p>No other local branches found.</p>
              </li>
            )}
          </ul>
        </>
      )}

      <div className="row dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onNext}
          disabled={selected.size === 0}
        >
          Start Cherry-Pick
        </button>
      </div>
    </div>
  )
}

export default TargetBranchPickerStep
