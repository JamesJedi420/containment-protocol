import { render, screen } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import * as gameStoreModule from '../../app/store/gameStore'
import { createStartingState } from '../../data/startingState'
import * as strategicStateModule from '../../domain/strategicState'
import { buildAgencyOverview } from '../../domain/strategicState'
import { TrendSummaryPanel } from '../../components/TrendSummaryPanel'

describe('TrendSummaryPanel cadence/extra check surfacing', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders escalation/pressure cadence and extra checks', () => {
    const game = createStartingState()
    game.cases = {}
    game.reports = []
    game.events = []
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
        summary={{
          recurringFamilies: [],
          raidConversions: [],
          unresolvedHotspots: [],
          dominantTags: [],
        }}
      />
    )
    // The TrendSummaryPanel does not render the "escalation & pressure cadence" heading, but should surface extra checks in the summary
    expect(screen.getAllByText(/Test Case/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Extra checks: Test Case/)).toBeTruthy()
  })

  it('preserves live case links, historical text, and intel links in family and tag buckets', () => {
    const game = createStartingState()
    const overview = buildAgencyOverview(game)
    overview.encounterStructure.urgentEscalations = []
    vi.spyOn(strategicStateModule, 'buildAgencyOverview').mockReturnValue(overview)
    vi.spyOn(gameStoreModule, 'useGameStore').mockReturnValue({ game })
    const caseRefs = [
      { caseId: 'live-case', title: 'Live case', isLive: true },
      { caseId: 'old-case', title: 'Historical case', isLive: false },
    ]
    const references = { caseRefs, templateIds: ['template-alpha'] }

    render(
      <MemoryRouter>
        <TrendSummaryPanel
          title="Run trends"
          summary={{
            recurringFamilies: [{ family: 'alpha', count: 2, ...references }],
            raidConversions: [],
            unresolvedHotspots: [],
            dominantTags: [
              { tag: 'signal', score: 3, requiredCount: 2, preferredCount: 1, ...references },
            ],
          }}
        />
      </MemoryRouter>
    )

    const liveLinks = screen.getAllByRole('link', { name: 'Live case' })
    expect(liveLinks).toHaveLength(2)
    for (const link of liveLinks) expect(link).toHaveAttribute('href', '/cases/live-case')
    const intelLinks = screen.getAllByRole('link', { name: 'intel template-alpha' })
    expect(intelLinks).toHaveLength(2)
    for (const link of intelLinks) expect(link).toHaveAttribute('href', '/intel/template-alpha')
    expect(screen.getAllByText('Historical case')).toHaveLength(2)
    expect(screen.queryByRole('link', { name: 'Historical case' })).not.toBeInTheDocument()
  })
})
