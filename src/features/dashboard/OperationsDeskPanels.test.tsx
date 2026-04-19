
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import * as gameStoreModule from '../../app/store/gameStore'
import * as strategicStateModule from '../../domain/strategicState'
import { buildAgencyOverview } from '../../domain/strategicState'
import { OperationsDeskPanels } from './OperationsDeskPanels'

function makeGameWithUrgentEscalation() {
  // Minimal game state with one urgent escalation
  return {
    week: 1,
    agents: {},
    teams: {},
    cases: {},
    reports: [],
    events: [],
    inventory: {},
    productionQueue: [],
    trainingQueue: [],
    market: { pressure: 'stable', week: 1, featuredRecipeId: '', costMultiplier: 1 },
    config: { maxActiveCases: 3 },
    funding: 100,
    containmentRating: 10,
    clearanceLevel: 1,
    templates: {},
    staff: {},
  }
}

describe('OperationsDeskPanels cadence/extra check surfacing', () => {
  it('renders escalation/pressure cadence and extra checks', () => {
    // Set up store with a game state that will produce an urgent escalation
    const game = makeGameWithUrgentEscalation()
    const overview = buildAgencyOverview(game)
    // Patch the overview to have a fake urgent escalation
    overview.encounterStructure.urgentEscalations = [
      {
        caseId: 'c1',
        caseTitle: 'Test Case',
        encounterTypeLabel: 'Incident',
        originLabel: 'Test Origin',
        stage: 2,
        deadlineRemaining: 1,
        nextStage: 3,
        convertsToRaid: false,
        followUpCount: 0,
      },
    ]

    vi.spyOn(strategicStateModule, 'buildAgencyOverview').mockReturnValue(overview)
    vi.spyOn(gameStoreModule, 'useGameStore').mockReturnValue({ game })

    render(<OperationsDeskPanels />)
    expect(screen.getByText(/escalation & pressure cadence/i)).toBeTruthy()
    expect(screen.getByText(/Test Case/)).toBeTruthy()
    expect(screen.getByText(/Extra checks: Test Case/)).toBeTruthy()
  })
})
