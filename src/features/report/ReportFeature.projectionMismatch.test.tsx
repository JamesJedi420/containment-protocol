import '../../test/setup'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import {
  observeSettlementReport,
  reloadSettlementReport,
} from '../../test/helpers/majorIncidentSettlementReportFixture'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { MissionResult } from '../../domain/models'
import { createDefaultPerformanceMetricSummary } from '../../domain/teamSimulation'
import { MissionResultSummary, ReportCaseGroup } from './reportDetailHelpers'

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

describe('SPE-3076 rendered final settlement report', () => {
  it.each([4, 5])('renders the final receipt with %i concurrent operations', (activeCount) => {
    const { mission, receipt } = observeSettlementReport(activeCount)
    const html = renderToStaticMarkup(
      createElement(MissionResultSummary, { missionResult: mission })
    )
    expect(html).toContain(receipt.reportableOutcome.summary)
    expect(html).not.toContain(activeCount === 5 ? 'settled as success' : 'settled as partial')
  })

  it.each([4, 5])(
    'renders immutable report history after save/load and valid relaunch with %i operations',
    (activeCount) => {
      const observation = observeSettlementReport(activeCount)
      const { current, historical } = reloadSettlementReport(observation, activeCount === 5)
      if (activeCount === 5) {
        expect(current.cases.c0.status).toBe('in_progress')
        expect(current.cases.c0.majorIncident!.settlementReceipt).toBeUndefined()
      }
      const groupHtml = renderToStaticMarkup(
        createElement(
          MemoryRouter,
          null,
          createElement(ReportCaseGroup, {
            title: 'Settled cases',
            emptyLabel: 'None',
            caseIds: activeCount === 5 ? historical.partialCases : historical.resolvedCases,
            existingCaseIds: new Set(Object.keys(current.cases)),
            currentCases: current.cases,
            snapshots: historical.caseSnapshots,
          })
        )
      )
      expect(groupHtml).toContain(observation.receipt.reportableOutcome.summary)
      expect(groupHtml).not.toContain(
        activeCount === 5 ? 'settled as success' : 'settled as partial'
      )
    }
  )
})
