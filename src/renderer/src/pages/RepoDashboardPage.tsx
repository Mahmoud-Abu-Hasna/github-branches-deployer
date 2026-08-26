import { useEffect, useState } from 'react'
import type { BranchInfo, RepoConfig } from '@shared/types'
import NewBranchDialog from './NewBranchDialog'
import CherryPickWizard from './CherryPickWizard/CherryPickWizard'

interface RepoDashboardPageProps {
  repo: RepoConfig
  onBack: () => void
}

function RepoDashboardPage({ repo, onBack }: RepoDashboardPageProps): React.JSX.Element {
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewBranch, setShowNewBranch] = useState(false)
  const [showCherryPick, setShowCherryPick] = useState(false)

  useEffect(() => {
    void loadBranches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo.id])

  async function loadBranches(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      setBranches(await window.api.git.listBranches(repo.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleFetch(): Promise<void> {
    setFetching(true)
    setError(null)
    try {
      await window.api.git.fetch(repo.id)
      await loadBranches()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setFetching(false)
    }
  }

  return (
    <section>
      <div className="row header-row">
        <h1>{repo.name}</h1>
        <button type="button" onClick={onBack}>
          ← Back to Repos
        </button>
      </div>
      <p className="muted">{repo.localPath}</p>
      <p className="muted">base branch: {repo.baseBranch}</p>

      <div className="row" style={{ margin: '12px 0' }}>
        <button type="button" onClick={handleFetch} disabled={fetching}>
          {fetching ? 'Fetching…' : 'Fetch'}
        </button>
        <button type="button" onClick={() => setShowNewBranch(true)}>
          New Branch
        </button>
        <button type="button" onClick={() => setShowCherryPick(true)}>
          Cherry-Pick
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading branches…</p>}

      {!loading && branches.length > 0 && (
        <table className="branch-table">
          <thead>
            <tr>
              <th>Branch</th>
              <th>Type</th>
              <th>Ahead</th>
              <th>Behind</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={`${b.isRemote ? 'r' : 'l'}-${b.name}`}>
                <td>{b.name}</td>
                <td>{b.isRemote ? 'remote' : 'local'}</td>
                <td>{b.ahead}</td>
                <td>{b.behind}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showNewBranch && (
        <NewBranchDialog
          repo={repo}
          onClose={() => setShowNewBranch(false)}
          onCreated={() => {
            setShowNewBranch(false)
            void loadBranches()
          }}
        />
      )}

      {showCherryPick && (
        <CherryPickWizard
          repo={repo}
          onClose={() => {
            setShowCherryPick(false)
            void loadBranches()
          }}
        />
      )}
    </section>
  )
}

export default RepoDashboardPage
