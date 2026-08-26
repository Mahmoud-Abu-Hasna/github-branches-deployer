import type { RepoConfig } from '@shared/types'

interface RepoDashboardPageProps {
  repo: RepoConfig
  onBack: () => void
}

function RepoDashboardPage({ repo, onBack }: RepoDashboardPageProps): React.JSX.Element {
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
      <p>Branch list, Fetch, New Branch, and Cherry-Pick arrive in Phase 2/3.</p>
    </section>
  )
}

export default RepoDashboardPage
