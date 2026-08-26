import { useState } from 'react'
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

function CherryPickWizard({ repo, onClose }: CherryPickWizardProps): React.JSX.Element {
  const [step, setStep] = useState<Step>('commits')
  const [sourceBranch, setSourceBranch] = useState(repo.baseBranch)
  const [selectedCommits, setSelectedCommits] = useState<Set<string>>(new Set())
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<BranchRunResult[]>([])

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true">
      <div className="dialog wizard-dialog">
        {step === 'commits' && (
          <CommitPickerStep
            repo={repo}
            sourceBranch={sourceBranch}
            onSourceBranchChange={setSourceBranch}
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
    </div>
  )
}

export default CherryPickWizard
