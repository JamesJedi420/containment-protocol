import '../../test/setup'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { MissionResult } from '../../domain/models'
import { createDefaultPerformanceMetricSummary } from '../../domain/teamSimulation'
import { MissionResultSummary } from './reportDetailHelpers'

function createMissionResult(overrides: Partial<MissionResult> = {}): MissionResult {
  return {
    caseId: 'case-2',
    caseTitle: 'Ambiguous Target',
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

describe('MissionResultSummary projection mismatch and ambiguous outcome', () => {
  it('shows explainable ambiguous output when confirmation fails', () => {
    render(
      <MissionResultSummary
        missionResult={createMissionResult({
          hiddenState: 'hidden',
          detectionConfidence: 0.5,
          explanationNotes: [
            'Projected route diverged from observed contact; target location could not be confirmed.',
          ],
        })}
      />
    )

    expect(screen.getByText(/hidden state: hidden/i)).toBeInTheDocument()
    expect(screen.getByText(/detection confidence: 50%/i)).toBeInTheDocument()
    expect(
      screen.getByText(
        /projected route diverged from observed contact; target location could not be confirmed\./i
      )
    ).toBeInTheDocument()
  })
})
