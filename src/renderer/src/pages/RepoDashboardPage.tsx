import { useEffect, useState } from 'react'
import { AlertTriangle, GitBranch, GitPullRequestArrow, Plus, RefreshCw } from 'lucide-react'
import type { BranchInfo, RepoConfig } from '@shared/types'
import NewBranchDialog from './NewBranchDialog'
import CherryPickWizard from './CherryPickWizard/CherryPickWizard'
import { formatAbsoluteDateTime, formatRelativeDate } from '../utils/formatDate'

interface RepoDashboardPageProps {
  repo: RepoConfig
}

function RepoDashboardPage({ repo }: RepoDashboardPageProps): React.JSX.Element {
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewBranch, setShowNewBranch] = useState(false)
  const [cherryPicking, setCherryPicking] = useState(false)

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

  if (cherryPicking) {
    return (
      // Override .page's 860px reading-width cap (fine for text-heavy pages,
      // but the Run/conflict steps show real diffs and a live log, which
      // need the window's actual width, not a narrow text column).
      <div className="page" style={{ maxWidth: 'none', height: '100%' }}>
        <CherryPickWizard
          repo={repo}
          onClose={() => {
            setCherryPicking(false)
            void loadBranches()
          }}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{repo.name}</h1>
          <p className="subtitle mono">{repo.localPath}</p>
        </div>
        <div className="toolbar">
          <button type="button" className="btn btn-secondary" onClick={handleFetch} disabled={fetching}>
            <RefreshCw size={14} className={fetching ? 'spin' : undefined} />
            {fetching ? 'Fetching…' : 'Fetch'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setShowNewBranch(true)}>
            <Plus size={14} />
            New Branch
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setCherryPicking(true)}>
            <GitPullRequestArrow size={14} />
            Cherry-Pick
          </button>
        </div>
      </div>

      {error && (
        <p className="callout">
          <AlertTriangle size={14} />
          {error}
        </p>
      )}

      {loading && (
        <div className="stack">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      )}

      {!loading && branches.length === 0 && !error && (
        <div className="empty-state panel">
          <GitBranch size={32} strokeWidth={1.5} />
          <h3>No branches found</h3>
          <p>This repo has no local branches yet, or they haven't loaded. Try Fetch.</p>
        </div>
      )}

      {!loading && branches.length > 0 && (
        <div className="panel" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Type</th>
                <th>Ahead</th>
                <th>Behind</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={`${b.isRemote ? 'r' : 'l'}-${b.name}`}>
                  <td>
                    <span className="row">
                      <GitBranch size={13} style={{ color: 'var(--text-tertiary)' }} />
                      {b.name === repo.baseBranch ? (
                        <>
                          {b.name}
                          <span className="badge badge-accent">base</span>
                        </>
                      ) : (
                        b.name
                      )}
                    </span>
                  </td>
                  <td>
                    <span className="badge">{b.isRemote ? 'remote' : 'local'}</span>
                  </td>
                  <td className="num">{b.ahead > 0 ? `+${b.ahead}` : '—'}</td>
                  <td className="num">{b.behind > 0 ? `-${b.behind}` : '—'}</td>
                  <td className="muted" title={formatAbsoluteDateTime(b.lastCommitDate)}>
                    {formatRelativeDate(b.lastCommitDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </div>
  )
}

export default RepoDashboardPage
