import { useEffect, useState } from 'react'
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
    <section>
      <h2>2. Pick target branches</h2>

      {loading && <p>Loading branches…</p>}

      {!loading && (
        <>
          <div className="row" style={{ margin: '8px 0' }}>
            <label className="row">
              <input
                type="checkbox"
                checked={branches.length > 0 && branches.every((b) => selected.has(b.name))}
                onChange={toggleAll}
              />
              Select all ({selected.size} selected)
            </label>
          </div>

          <ul className="commit-list">
            {branches.map((b) => (
              <li key={b.name} className="commit-row">
                <label className="row">
                  <input
                    type="checkbox"
                    checked={selected.has(b.name)}
                    onChange={() => toggle(b.name)}
                  />
                  <span className="commit-message">{b.name}</span>
                  <span className="muted">
                    +{b.ahead} / -{b.behind}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {branches.length === 0 && <p className="empty-state">No other local branches found.</p>}
        </>
      )}

      <div className="row dialog-actions">
        <button type="button" onClick={onBack}>
          Back
        </button>
        <button type="button" onClick={onNext} disabled={selected.size === 0}>
          Start Cherry-Pick
        </button>
      </div>
    </section>
  )
}

export default TargetBranchPickerStep
