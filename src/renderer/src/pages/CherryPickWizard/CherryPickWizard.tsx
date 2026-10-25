import { useState } from 'react'
import { Check } from 'lucide-react'
import type { BranchRunResult, RepoConfig } from '@shared/types'
import CommitPickerStep from './CommitPickerStep'
import TargetBranchPickerStep from './TargetBranchPickerStep'
import RunProgressStep from './RunProgressStep'
import SummaryStep from './SummaryStep'

interface CherryPickWizardProps {
  repo: RepoConfig
  onClose: () => void
}

type Step = 'commits' | 'branches' | 'running' | 'summary'

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: 'commits', label: 'Commits' },
  { key: 'branches', label: 'Branches' },
  { key: 'running', label: 'Run' },
  { key: 'summary', label: 'Summary' }
]

function StepIndicator({ current }: { current: Step }): React.JSX.Element {
  const currentIndex = STEP_LABELS.findIndex((s) => s.key === current)
  return (
    <div className="wizard-steps">
      {STEP_LABELS.map((s, i) => (
        <div key={s.key} className="row" style={{ gap: 8 }}>
          {i > 0 && <div className="wizard-step-divider" />}
          <div
            className={`wizard-step${i === currentIndex ? ' active' : ''}${i < currentIndex ? ' done' : ''}`}
          >
            <span className="wizard-step-index">
              {i < currentIndex ? <Check size={12} /> : i + 1}
            </span>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}

function CherryPickWizard({ repo, onClose }: CherryPickWizardProps): React.JSX.Element {
  const [step, setStep] = useState<Step>('commits')
  const [sourceBranch, setSourceBranch] = useState(repo.baseBranch)
  const [selectedCommits, setSelectedCommits] = useState<Set<string>>(new Set())
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<BranchRunResult[]>([])

  // Commits are only meaningful relative to the branch they were selected
  // from — switching source branches without clearing this would silently
  // carry stale shas from the old branch into the run.
  function handleSourceBranchChange(branch: string): void {
    setSourceBranch(branch)
    setSelectedCommits(new Set())
  }

  return (
    <div className="wizard">
      <div className="page-header">
        <div>
          <h1>Cherry-Pick</h1>
          <p className="subtitle">{repo.name}</p>
        </div>
        <StepIndicator current={step} />
      </div>

      {step === 'commits' && (
        <CommitPickerStep
          repo={repo}
          sourceBranch={sourceBranch}
          onSourceBranchChange={handleSourceBranchChange}
          selected={selectedCommits}
          onSelectedChange={setSelectedCommits}
          onCancel={onClose}
          onNext={() => setStep('branches')}
        />
      )}

      {step === 'branches' && (
        <TargetBranchPickerStep
          repo={repo}
          sourceBranch={sourceBranch}
          selected={selectedBranches}
          onSelectedChange={setSelectedBranches}
          onBack={() => setStep('commits')}
          onNext={() => setStep('running')}
        />
      )}

      {step === 'running' && (
        <RunProgressStep
          repo={repo}
          commitShas={[...selectedCommits]}
          targetBranches={[...selectedBranches]}
          onComplete={(r) => {
            setResults(r)
            setStep('summary')
          }}
        />
      )}

      {step === 'summary' && <SummaryStep results={results} onDone={onClose} />}
    </div>
  )
}

export default CherryPickWizard
