import type { BranchRunResult } from '@shared/types'

interface SummaryStepProps {
  results: BranchRunResult[]
  onDone: () => void
}

function SummaryStep({ results, onDone }: SummaryStepProps): React.JSX.Element {
  return (
    <section>
      <h2>Cherry-Pick Summary</h2>

      <table className="branch-table">
        <thead>
          <tr>
            <th>Branch</th>
            <th>Applied</th>
            <th>Skipped</th>
            <th>Conflicted</th>
            <th>Pushed</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.branch}>
              <td>{r.branch}</td>
              <td>{r.appliedCommits.length}</td>
              <td>{r.skippedCommits.length}</td>
              <td>{r.conflicted ? 'yes' : 'no'}</td>
              <td>{r.pushed ? 'yes' : 'no'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {results.some((r) => r.error) && (
        <ul>
          {results
            .filter((r) => r.error)
            .map((r) => (
              <li key={r.branch} className="error">
                {r.branch}: {r.error}
              </li>
            ))}
        </ul>
      )}

      <div className="row dialog-actions">
        <button type="button" onClick={onDone}>
          Done
        </button>
      </div>
    </section>
  )
}

export default SummaryStep
