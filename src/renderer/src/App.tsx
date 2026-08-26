import { useState } from 'react'
import type { RepoConfig } from '@shared/types'
import RepoListPage from './pages/RepoListPage'
import RepoDashboardPage from './pages/RepoDashboardPage'
import SettingsPage from './pages/SettingsPage'

type View = { name: 'repos' } | { name: 'dashboard'; repo: RepoConfig } | { name: 'settings' }

function App(): React.JSX.Element {
  const [view, setView] = useState<View>({ name: 'repos' })

  return (
    <div className="app">
      <nav className="row nav-row">
        <button type="button" onClick={() => setView({ name: 'repos' })}>
          Repos
        </button>
        <button type="button" onClick={() => setView({ name: 'settings' })}>
          Settings
        </button>
      </nav>

      {view.name === 'repos' && (
        <RepoListPage onOpenRepo={(repo) => setView({ name: 'dashboard', repo })} />
      )}
      {view.name === 'dashboard' && (
        <RepoDashboardPage repo={view.repo} onBack={() => setView({ name: 'repos' })} />
      )}
      {view.name === 'settings' && <SettingsPage />}
    </div>
  )
}

export default App
