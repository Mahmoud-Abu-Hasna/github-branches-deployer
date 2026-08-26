import { useEffect, useState } from 'react'
import type { RepoConfig } from '@shared/types'
import Sidebar from './components/Sidebar'
import RepoListPage from './pages/RepoListPage'
import RepoDashboardPage from './pages/RepoDashboardPage'
import SettingsPage from './pages/SettingsPage'
import AddRepoDialog from './pages/AddRepoDialog'

type View = { name: 'home' } | { name: 'dashboard'; repo: RepoConfig } | { name: 'settings' }

function App(): React.JSX.Element {
  const [view, setView] = useState<View>({ name: 'home' })
  const [repos, setRepos] = useState<RepoConfig[]>([])
  const [loadingRepos, setLoadingRepos] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)

  useEffect(() => {
    void refreshRepos()
  }, [])

  async function refreshRepos(): Promise<void> {
    setLoadingRepos(true)
    try {
      setRepos(await window.api.repos.list())
    } finally {
      setLoadingRepos(false)
    }
  }

  function openRepo(repo: RepoConfig): void {
    setView({ name: 'dashboard', repo })
  }

  return (
    <div className="app-shell">
      <Sidebar
        repos={repos}
        activeRepoId={view.name === 'dashboard' ? view.repo.id : null}
        onSelectRepo={openRepo}
        onAddRepo={() => setShowAddDialog(true)}
        onOpenHome={() => setView({ name: 'home' })}
        onOpenSettings={() => setView({ name: 'settings' })}
        settingsActive={view.name === 'settings'}
      />

      <main className="main-content">
        {view.name === 'home' && (
          <RepoListPage
            repos={repos}
            loading={loadingRepos}
            onOpenRepo={openRepo}
            onReposChanged={refreshRepos}
            onAddRepoClick={() => setShowAddDialog(true)}
          />
        )}
        {view.name === 'dashboard' && <RepoDashboardPage repo={view.repo} />}
        {view.name === 'settings' && <SettingsPage />}
      </main>

      {showAddDialog && (
        <AddRepoDialog
          onClose={() => setShowAddDialog(false)}
          onAdded={() => {
            setShowAddDialog(false)
            void refreshRepos()
          }}
        />
      )}
    </div>
  )
}

export default App
