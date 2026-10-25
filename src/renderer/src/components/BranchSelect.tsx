import { useEffect, useState } from 'react'
import type { BranchInfo, RepoConfig } from '@shared/types'

interface BranchSelectProps {
  repo: RepoConfig
  label: string
  value: string
  onChange: (branch: string) => void
  /** Excludes this branch from the list — e.g. the cherry-pick source branch when picking a target. */
  exclude?: string
  disabled?: boolean
}

function BranchSelect({ repo, label, value, onChange, exclude, disabled }: BranchSelectProps): React.JSX.Element {
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadBranches(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const all = await window.api.git.listBranches(repo.id)
      setBranches(all.filter((b) => !b.isRemote && b.name !== exclude))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBranches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo.id, exclude])

  // The current value might not be in the loaded (or filtered) list yet —
  // e.g. still loading, or it's a branch that was since deleted/renamed.
  // Keep it selectable rather than silently snapping the <select> to
  // whichever option happens to be first.
  const showCurrentValueOption = value.length > 0 && !branches.some((b) => b.name === value)

  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled || loading}>
        {showCurrentValueOption && <option value={value}>{value}</option>}
        {branches.map((b) => (
          <option key={b.name} value={b.name}>
            {b.name}
          </option>
        ))}
      </select>
      {error && <span className="field-hint" style={{ color: 'var(--danger)' }}>{error}</span>}
    </label>
  )
}

export default BranchSelect
