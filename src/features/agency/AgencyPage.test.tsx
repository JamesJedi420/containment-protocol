import '../../test/setup'
import { fireEvent, render, screen } from '@testing-library/react'
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
  it('purchases a package and refreshes funding/budget without repairing debt', () => {
    useGameStore.setState({
      game: {
        ...makeMinimalGameState(),
        funding: 200,
        facilityMaintenanceState: { maintenanceDebt: 18, lastProcessedWeek: 0 },
        facilityMaintenanceRecoveryResources: undefined,
      },
    })
    renderAgencyPage()
    const purchase = screen.getByRole('button', { name: 'Buy maintenance package' })
    expect(purchase).toBeEnabled()
    expect(purchase).toHaveAccessibleDescription(
      'Buy one maintenance package. Recovery requires a separate order.'
    )
    expect(
      screen.getByText(
        /Maintenance package: 10 hours \/ 6 parts · Price: 100 funding · Available funding: 200/
      )
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Order facility recovery' })).toBeDisabled()
    fireEvent.click(purchase)
    expect(screen.getByText('Recovery budget: 10 hours / 6 parts')).toBeInTheDocument()
    expect(screen.getByText(/Available funding: 100/)).toBeInTheDocument()
    expect(screen.getByText(/Maintenance debt: 18/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Order facility recovery' })).toBeEnabled()
    fireEvent.click(purchase)
    expect(screen.getByText('Recovery budget: 20 hours / 12 parts')).toBeInTheDocument()
    expect(screen.getByText(/Available funding: 0/)).toBeInTheDocument()
    expect(purchase).toBeDisabled()
    expect(purchase).toHaveAccessibleDescription('Insufficient funding for a maintenance package.')
  })

  it.each(['insufficient', 'malformed', 'overflow'])(
    'explains a blocked package purchase: %s',
    (scenario) => {
      const game = makeMinimalGameState()
      if (scenario === 'insufficient') game.funding = 99
      else
        game.facilityMaintenanceRecoveryResources = {
          maintenanceHours: scenario === 'overflow' ? Number.MAX_SAFE_INTEGER : -1,
          partsReserve: 0,
        }
      useGameStore.setState({ game })
      renderAgencyPage()
      const purchase = screen.getByRole('button', { name: 'Buy maintenance package' })
      expect(purchase).toBeDisabled()
      expect(purchase).toHaveAccessibleDescription(
        scenario === 'insufficient'
          ? 'Insufficient funding for a maintenance package.'
          : 'Purchase unavailable: funding or maintenance budget is invalid, or the budget would overflow.'
      )
    }
  )

  it('orders facility recovery and refreshes debt, budget, and eligibility', () => {
    useGameStore.setState({
      game: {
        ...makeMinimalGameState(),
        facilityMaintenanceState: { maintenanceDebt: 18, lastProcessedWeek: 0 },
      },
    })
    renderAgencyPage()
    const order = screen.getByRole('button', { name: 'Order facility recovery' })
    expect(order).toBeEnabled()
    expect(screen.getByText('Recovery cost: 10 hours / 6 parts')).toBeInTheDocument()
    fireEvent.click(order)
    expect(screen.getByText('Recovery budget: 0 hours / 0 parts')).toBeInTheDocument()
    expect(screen.getByText(/Maintenance debt: 0/)).toBeInTheDocument()
    expect(screen.getByText('No facility recovery is required.')).toBeInTheDocument()
    expect(order).toBeDisabled()
  })

  it.each(['missing', 'insufficient', 'not_required', 'malformed'])(
    'explains blocked recovery: %s',
    (scenario) => {
      const game = makeMinimalGameState()
      if (scenario !== 'missing')
        game.facilityMaintenanceState = {
          maintenanceDebt: scenario === 'not_required' ? 7 : scenario === 'malformed' ? -1 : 30,
          lastProcessedWeek: 0,
        }
      useGameStore.setState({ game })
      renderAgencyPage()
      const order = screen.getByRole('button', { name: 'Order facility recovery' })
      expect(order).toBeDisabled()
      expect(order).toHaveAccessibleDescription(
        scenario === 'insufficient'
          ? 'Insufficient maintenance hours or parts for facility recovery.'
          : scenario === 'not_required'
            ? 'No facility recovery is required.'
            : 'Recovery unavailable: maintenance state or recovery budget is missing or invalid.'
      )
    }
  )

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

  it('renders institutional legitimacy and operational cover as separate posture metrics', () => {
    const game = createStartingState()
    game.legitimacy = {
      sanctionLevel: 'sanctioned',
      operationalCoverLevel: 'deniable',
    }
    useGameStore.setState({ game })

    renderAgencyPage()

    expect(screen.getByText('Institutional legitimacy')).toBeInTheDocument()
    expect(screen.getByText('Operational cover')).toBeInTheDocument()
    expect(
      screen.getByText('Institutional legitimacy: sanctioned; operational cover: deniable.')
    ).toBeInTheDocument()
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
      screen.getByText(
        `Outcomes: ${formatOutcomeCountSummary(buildAgencyOverview(game).summary.report)}`
      )
    ).toBeInTheDocument()
  })
})
