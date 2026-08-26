import { FolderGit2, Plus, Trash2 } from 'lucide-react'
import type { RepoConfig } from '@shared/types'
import { useToast, messageOf } from '../components/useToast'

interface RepoListPageProps {
  repos: RepoConfig[]
  loading: boolean
  onOpenRepo: (repo: RepoConfig) => void
  onReposChanged: () => void
  onAddRepoClick: () => void
}

function RepoListPage({
  repos,
  loading,
  onOpenRepo,
  onReposChanged,
  onAddRepoClick
}: RepoListPageProps): React.JSX.Element {
  const { showError } = useToast()

  async function handleRemove(id: string): Promise<void> {
    try {
      await window.api.repos.remove(id)
      onReposChanged()
    } catch (err) {
      showError(messageOf(err))
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Repositories</h1>
          <p className="subtitle">
            Repos this app can create client branches in and cherry-pick commits across.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => onAddRepoClick()}>
          <Plus size={14} />
          Add Repo
        </button>
      </div>

      {loading && (
        <div className="stack">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      )}

      {!loading && repos.length === 0 && (
        <div className="empty-state panel">
          <FolderGit2 size={32} strokeWidth={1.5} />
          <h3>No repos yet</h3>
          <p>
            Add a local clone of any git repo. This app never touches the remote until you tell it
            to — it just needs a folder with a <code className="mono">.git</code> directory.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => onAddRepoClick()}>
            <Plus size={14} />
            Add your first repo
          </button>
        </div>
      )}

      {!loading && repos.length > 0 && (
        <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {repos.map((repo) => (
            <li key={repo.id} className="panel row" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
              <span
                className="sidebar-brand-mark"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                <FolderGit2 size={14} />
              </span>
              <button
                type="button"
                onClick={() => onOpenRepo(repo)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 2,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: 0
                }}
              >
                <strong style={{ fontSize: 'var(--text-md)' }}>{repo.name}</strong>
                <span className="muted mono">{repo.localPath}</span>
              </button>
              <span className="badge">{repo.baseBranch}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenRepo(repo)}
              >
                Open
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => handleRemove(repo.id)}
                title="Remove from managed repos"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default RepoListPage
