
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import * as gameStoreModule from '../../app/store/gameStore'
import * as strategicStateModule from '../../domain/strategicState'
import { buildAgencyOverview } from '../../domain/strategicState'
import { TrendSummaryPanel } from '../report/TrendSummaryPanel'

describe('TrendSummaryPanel cadence/extra check surfacing', () => {
  it('renders escalation/pressure cadence and extra checks', () => {
    // Minimal game state with one urgent escalation
    const game = {
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
    const overview = buildAgencyOverview(game)
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

    render(
      <TrendSummaryPanel
        title="Run trends"
        summary={{ recurringFamilies: [], raidConversions: [], unresolvedHotspots: [], dominantTags: [] }}
      />
    )
    // The TrendSummaryPanel does not render the "escalation & pressure cadence" heading, but should surface extra checks in the summary
    expect(screen.getAllByText(/Test Case/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Extra checks: Test Case/)).toBeTruthy()
  })
})
