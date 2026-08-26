import { GitBranch, Plus, Settings } from 'lucide-react'
import type { RepoConfig } from '@shared/types'

interface SidebarProps {
  repos: RepoConfig[]
  activeRepoId: string | null
  onSelectRepo: (repo: RepoConfig) => void
  onAddRepo: () => void
  onOpenHome: () => void
  onOpenSettings: () => void
  settingsActive: boolean
}

function Sidebar({
  repos,
  activeRepoId,
  onSelectRepo,
  onAddRepo,
  onOpenHome,
  onOpenSettings,
  settingsActive
}: SidebarProps): React.JSX.Element {
  return (
    <aside className="sidebar">
      <button type="button" className="sidebar-brand" onClick={onOpenHome} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
        <span className="sidebar-brand-mark">
          <GitBranch size={14} strokeWidth={2.5} />
        </span>
        Branch Deployer
      </button>

      <div className="sidebar-add-repo">
        <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={onAddRepo}>
          <Plus size={14} />
          Add Repo
        </button>
      </div>

      <p className="sidebar-section-label">Repositories</p>
      <ul className="sidebar-repo-list">
        {repos.map((repo) => (
          <li key={repo.id}>
            <button
              type="button"
              className={`sidebar-item${repo.id === activeRepoId && !settingsActive ? ' active' : ''}`}
              onClick={() => onSelectRepo(repo)}
              title={repo.localPath}
            >
              <GitBranch size={14} />
              <span>{repo.name}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <button
          type="button"
          className={`sidebar-item${settingsActive ? ' active' : ''}`}
          onClick={onOpenSettings}
        >
          <Settings size={14} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
