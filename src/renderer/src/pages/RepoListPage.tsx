import { useEffect, useState } from 'react'
import type { RepoConfig } from '@shared/types'
import AddRepoDialog from './AddRepoDialog'

interface RepoListPageProps {
  onOpenRepo: (repo: RepoConfig) => void
}

function RepoListPage({ onOpenRepo }: RepoListPageProps): React.JSX.Element {
  const [repos, setRepos] = useState<RepoConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh(): Promise<void> {
    setLoading(true)
    setRepos(await window.api.repos.list())
    setLoading(false)
  }

  async function handleRemove(id: string): Promise<void> {
    await window.api.repos.remove(id)
    await refresh()
  }

  return (
    <section>
      <div className="row header-row">
        <h1>Repos</h1>
        <button type="button" onClick={() => setShowAddDialog(true)}>
          Add Repo
        </button>
      </div>

      {loading && <p>Loading…</p>}

      {!loading && repos.length === 0 && (
        <p className="empty-state">
          No repos managed yet. Click "Add Repo" to point at a local git clone.
        </p>
      )}

      <ul className="repo-list">
        {repos.map((repo) => (
          <li key={repo.id} className="repo-card">
            <button type="button" className="repo-card-main" onClick={() => onOpenRepo(repo)}>
              <strong>{repo.name}</strong>
              <span className="muted">{repo.localPath}</span>
              <span className="muted">base: {repo.baseBranch}</span>
            </button>
            <button type="button" onClick={() => handleRemove(repo.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>

      {showAddDialog && (
        <AddRepoDialog
          onClose={() => setShowAddDialog(false)}
          onAdded={() => {
            setShowAddDialog(false)
            void refresh()
          }}
        />
      )}
    </section>
  )
}

export default RepoListPage
