import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import { formatOutcomeCountSummary } from '../../domain/reportNotes'
import { buildAgencyOverview, formatCadenceSummary } from '../../domain/strategicState'
import AgencyPage from './AgencyPage'

function makeMinimalGameState(overrides = {}) {
  return {
    ...createStartingState(),
    cases: {},
    reports: [],
    events: [], // Needed for buildFactionStandingMap
    ...overrides,
  }
}

function renderAgencyPage() {
  return render(
    <MemoryRouter initialEntries={['/agency']}>
      <AgencyPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('AgencyPage escalation/pressure cadence surfacing', () => {
  it('shows correct cadence for empty state', () => {
    const overview = buildAgencyOverview(makeMinimalGameState())
    const lines = formatCadenceSummary(overview)
    expect(lines[0]).toMatch(/Pressure: 0/)
    expect(lines[1]).toMatch(/Major incidents: 0/)
    expect(lines[2]).toMatch(/Unresolved momentum: 0/)
    expect(lines[4]).toMatch(/Extra checks: None/)
  })

  it('shows extra checks for urgent escalations', () => {
    const game = makeMinimalGameState({
      cases: {
        c1: {
          id: 'c1',
          title: 'Test Case',
          kind: 'case',
          mode: 'threshold',
          status: 'active',
          stage: 2,
          deadlineRemaining: 1,
          assignedTeamIds: [],
          tags: [],
          raid: undefined,
          onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
          onUnresolved: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
          difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
          weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
          requiredTags: [],
          preferredTags: [],
          durationWeeks: 2,
          weeksRemaining: 2,
          deadlineWeeks: 2,
        },
      },
    })
    const overview = buildAgencyOverview(game)
    const lines = formatCadenceSummary(overview)
    expect(lines[4]).toMatch(/Extra checks: Test Case/)
  })
})

describe('AgencyPage', () => {
  it('renders the agency strategic overview and recommendation sections', () => {
    renderAgencyPage()

    expect(screen.getByRole('heading', { name: /agency command/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /command posture/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /academy and logistics posture/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /strategic threat picture/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /academy recommendations/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /external faction actors/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /latest operations summary/i })).toBeInTheDocument()
    expect(screen.getByText(/containment protocol/i)).toBeInTheDocument()
  })

  it('renders the canonical outcome-band summary from the shared report formatter', () => {
    const game = createStartingState()
    game.reports = [
      {
        week: 3,
        rngStateBefore: 301,
        rngStateAfter: 302,
        newCases: [],
        progressedCases: [],
        resolvedCases: ['case-001'],
        failedCases: ['case-002'],
        partialCases: ['case-003'],
        unresolvedTriggers: ['case-004'],
        spawnedCases: [],
        maxStage: 3,
        avgFatigue: 10,
        teamStatus: [],
        notes: [],
      },
    ]

    useGameStore.setState({ game })
    renderAgencyPage()

    expect(
      screen.getByText(`Outcomes: ${formatOutcomeCountSummary(buildAgencyOverview(game).summary.report)}`)
    ).toBeInTheDocument()
  })
})
