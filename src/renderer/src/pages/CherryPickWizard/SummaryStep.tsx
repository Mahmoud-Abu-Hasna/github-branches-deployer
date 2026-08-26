import { AlertTriangle, Check, GitBranch, Minus, X } from 'lucide-react'
import type { BranchRunResult } from '@shared/types'

interface SummaryStepProps {
  results: BranchRunResult[]
  onDone: () => void
}

function StatusIcon({ ok }: { ok: boolean }): React.JSX.Element {
  return ok ? (
    <Check size={14} style={{ color: 'var(--success)' }} />
  ) : (
    <Minus size={14} style={{ color: 'var(--text-tertiary)' }} />
  )
}

function SummaryStep({ results, onDone }: SummaryStepProps): React.JSX.Element {
  const failedResults = results.filter((r) => r.error)

  return (
    <div className="stack" style={{ flex: 1, minHeight: 0 }}>
      <div className="summary-table-wrap">
        <table className="data-table">
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
                <td>
                  <span className="row">
                    <GitBranch size={13} style={{ color: 'var(--text-tertiary)' }} />
                    {r.branch}
                  </span>
                </td>
                <td className="num">{r.appliedCommits.length}</td>
                <td className="num">{r.skippedCommits.length}</td>
                <td>{r.conflicted ? <AlertTriangle size={14} style={{ color: 'var(--warning)' }} /> : <StatusIcon ok={false} />}</td>
                <td>
                  {r.pushed ? (
                    <StatusIcon ok />
                  ) : (
                    <X size={14} style={{ color: 'var(--text-tertiary)' }} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {failedResults.length > 0 && (
        <div className="stack">
          {failedResults.map((r) => (
            <p key={r.branch} className="callout">
              <AlertTriangle size={14} />
              <strong>{r.branch}:</strong> {r.error}
            </p>
          ))}
        </div>
      )}

      <div className="row dialog-actions">
        <button type="button" className="btn btn-primary" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  )
}

export default SummaryStep
