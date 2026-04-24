import '../../test/setup'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { MissionResult } from '../../domain/models'
import { createDefaultPerformanceMetricSummary } from '../../domain/teamSimulation'
import { MissionResultSummary } from './reportDetailHelpers'

function createMissionResult(overrides: Partial<MissionResult> = {}): MissionResult {
  return {
    caseId: 'case-1',
    caseTitle: 'Test Case',
    teamsUsed: [],
    outcome: 'partial',
    performanceSummary: createDefaultPerformanceMetricSummary(),
    rewards: {
      outcome: 'partial',
      caseType: 'case',
      caseTypeLabel: 'Case',
      operationValue: 0,
      factors: [],
      fundingDelta: 0,
      containmentDelta: 0,
      strategicValueDelta: 0,
      reputationDelta: 0,
      inventoryRewards: [],
      factionStanding: [],
      label: 'No reward',
      reasons: [],
    },
    penalties: {
      fundingLoss: 0,
      containmentLoss: 0,
      reputationLoss: 0,
      strategicLoss: 0,
    },
    fatigueChanges: [],
    injuries: [],
    spawnedConsequences: [],
    explanationNotes: [],
    ...overrides,
  }
}

describe('MissionResultSummary hidden-state UI', () => {
  it('renders all hidden-state fields when present', () => {
    render(
      <MissionResultSummary
        missionResult={createMissionResult({
          hiddenState: 'displaced',
          detectionConfidence: 0.42,
          counterDetection: true,
          displacementTarget: 'target-42',
        })}
      />
    )

    expect(screen.getByText(/hidden state: displaced/i)).toBeInTheDocument()
    expect(screen.getByText(/detection confidence: 42%/i)).toBeInTheDocument()
    expect(screen.getByText(/counter-detection: active/i)).toBeInTheDocument()
    expect(screen.getByText(/displacement target: target-42/i)).toBeInTheDocument()
  })

  it('omits hidden-state fields when not present', () => {
    const { container } = render(<MissionResultSummary missionResult={createMissionResult()} />)

    expect(screen.queryByText(/hidden state:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/detection confidence:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/counter-detection:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/displacement target:/i)).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })
})
