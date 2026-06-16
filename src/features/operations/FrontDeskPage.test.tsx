import '../../test/setup'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store/gameStore'
import { createStartingState } from '../../data/startingState'
import { getCanonicalFundingState, placeProcurementOrder } from '../../domain/funding'
import { getProcurementListings } from '../../domain/market'
import { openCourierShellFront } from '../../domain/sim/frontBusiness'
import { normalizeGameState } from '../../domain/teamSimulation'
import FrontDeskPage from './FrontDeskPage'
import { withPaidCourierAndFunding } from '../../test/fixtures/withPaidCourierAndFunding'
import type { GameState, OperationEvent } from '../../domain/models'

function renderFrontDesk() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<FrontDeskPage />} />
        <Route path="/report" element={<p>Reports home</p>} />
        <Route path="/recruitment" element={<p>Recruitment home</p>} />
        <Route path="/teams" element={<p>Teams home</p>} />
        <Route path="/markets-suppliers" element={<p>Markets home</p>} />
        <Route path="/agency" element={<p>Agency home</p>} />
      </Routes>
    </MemoryRouter>
  )
}

function withProcurementBacklog(game: GameState, requestedWeek: number): GameState {
  const listing = getProcurementListings(game).find((candidate) => candidate.accessAvailable)
  if (!listing) {
    throw new Error('Expected at least one accessible procurement listing.')
  }

  const fundingState = placeProcurementOrder(getCanonicalFundingState(game), {
    requestId: `test-procurement-${requestedWeek}`,
    itemId: listing.itemId,
    quantity: listing.bundleQuantity,
    requestedWeek,
    cost: 1,
  })

  return normalizeGameState({
    ...game,
    agency: {
      ...game.agency!,
      fundingState,
    },
  })
}

function withLostAgents(game: GameState, count: number): GameState {
  const agents = { ...game.agents }
  for (const agentId of Object.keys(agents).slice(0, count)) {
    agents[agentId] = {
      ...agents[agentId]!,
      attritionState: {
        attritionStatus: 'lost',
        lossReasonCodes: ['test-loss'],
        replacementPriority: 1,
        retentionPressure: 0,
      },
    }
  }

  return normalizeGameState({
    ...game,
    agents,
  })
}

function withTagConflictRegionCases(game: GameState): GameState {
  const normalized = normalizeGameState({ ...game })
  const caseIds = Object.keys(normalized.cases).slice(0, 2)
  if (caseIds.length < 2) {
    throw new Error('Expected at least two cases in starting state for tag conflict fixture.')
  }
  const first = caseIds[0]!
  const second = caseIds[1]!
  return normalizeGameState({
    ...normalized,
    cases: {
      ...normalized.cases,
      [first]: {
        ...normalized.cases[first]!,
        status: 'open',
        regionTag: 'district:river-ward',
        tags: [...new Set([...(normalized.cases[first]!.tags ?? []), 'authority', 'public'])],
      },
      [second]: {
        ...normalized.cases[second]!,
        status: 'in_progress',
        regionTag: 'district:river-ward',
        tags: [...new Set([...(normalized.cases[second]!.tags ?? []), 'criminal', 'smuggling'])],
      },
    },
  })
}

describe('FrontDeskPage', () => {
  beforeEach(() => {
    useGameStore.persist.clearStorage()
    useGameStore.setState({ game: createStartingState() })
  })

  it('renders the bounded operations hub sections and supports drill-ins', async () => {
    const user = userEvent.setup()
    renderFrontDesk()

    expect(screen.getByRole('region', { name: /operations hub overview/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /operations \/ assignments \/ queues/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /current campaign state/i })).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: /campaign profile and rules ledger/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /active pressures/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /recent reports \/ events/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /immediate attention/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /teams \/ field status/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /procurement snapshot/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /agency standing/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /latest report/i })).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: /courier network capacity opportunity/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /core loop prompt: finish triage and prep, then advance week to publish the next report\./i
      )
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /weekly reports/i }))
    expect(screen.getByText(/reports home/i)).toBeInTheDocument()
  })

  it('reflects live canonical state and degrades cleanly when optional data is missing', async () => {
    renderFrontDesk()

    expect(
      screen.getByText(/no reports yet\. advance a week to begin the run\./i)
    ).toBeInTheDocument()
    expect(screen.getByText(/no recent reports or events are available yet\./i)).toBeInTheDocument()

    const next = createStartingState()
    next.trainingQueue = [
      {
        id: 'training-test',
        agentId: 'agent-001',
        agentName: 'Ava Brooks',
        trainingId: 'training-001',
        trainingName: 'Containment Drills',
        remainingWeeks: 2,
      } as never,
    ]
    next.reports = [
      {
        week: 1,
        rngStateBefore: 100,
        rngStateAfter: 101,
        newCases: [],
        progressedCases: [],
        resolvedCases: ['case-001'],
        failedCases: [],
        partialCases: [],
        unresolvedTriggers: [],
        spawnedCases: [],
        maxStage: 2,
        avgFatigue: 5,
        teamStatus: [],
        notes: [],
      },
    ]

    act(() => {
      useGameStore.setState({ game: next })
    })

    await waitFor(() => {
      expect(screen.getByText(/1 program in the academy queue\./i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /^week 1$/i })).toBeInTheDocument()
      expect(
        screen.getByText(/1 resolved, 0 unresolved triggers, 0 spawned cases/i)
      ).toBeInTheDocument()
    })
  })

  it('hides the courier logistics opportunity card when the capacity gap is resolved', () => {
    renderFrontDesk()
    const cleared = openCourierShellFront(withPaidCourierAndFunding(createStartingState(), 12000))
    act(() => {
      useGameStore.setState({ game: cleared })
    })
    expect(
      screen.queryByRole('region', { name: /courier network capacity opportunity/i })
    ).not.toBeInTheDocument()
  })

  it('links logistics opportunity drill-ins to markets and agency routes', async () => {
    const user = userEvent.setup()
    renderFrontDesk()

    await user.click(screen.getByRole('link', { name: /review procurement backlog/i }))
    expect(screen.getByText(/markets home/i)).toBeInTheDocument()
  })

  it('renders procurement pressure opportunity and links to markets', async () => {
    const user = userEvent.setup()
    const game = withProcurementBacklog({ ...createStartingState(), week: 99 }, 1)
    act(() => {
      useGameStore.setState({ game })
    })
    renderFrontDesk()

    const opportunity = screen.getByRole('region', { name: /procurement pressure opportunity/i })
    expect(
      within(opportunity).getByText(/procurement backlog needs attention/i)
    ).toBeInTheDocument()
    expect(within(opportunity).getByText(/stale backlog/i)).toBeInTheDocument()

    await user.click(within(opportunity).getByRole('link', { name: /open procurement/i }))
    expect(screen.getByText(/markets home/i)).toBeInTheDocument()
  })

  it('renders staffing readiness opportunity and links to teams', async () => {
    const user = userEvent.setup()
    const game = withLostAgents(createStartingState(), 2)
    act(() => {
      useGameStore.setState({ game })
    })
    renderFrontDesk()

    const opportunity = screen.getByRole('region', { name: /staffing readiness opportunity/i })
    expect(
      within(opportunity).getByText(/staffing gap is pressuring readiness/i)
    ).toBeInTheDocument()
    expect(within(opportunity).getByText(/2 staffing gaps/i)).toBeInTheDocument()

    await user.click(within(opportunity).getByRole('link', { name: /open teams/i }))
    expect(screen.getByText(/teams home/i)).toBeInTheDocument()
  })

  it('renders tag-conflict value-stream opportunity when region-tag conflict signals are present', () => {
    const game = withTagConflictRegionCases(createStartingState())
    act(() => {
      useGameStore.setState({ game })
    })
    renderFrontDesk()

    const opportunity = screen.getByRole('region', { name: /tag conflict value stream opportunity/i })
    expect(within(opportunity).getByText(/town-tag conflict lead requires routing/i)).toBeInTheDocument()
    expect(within(opportunity).getByText(/^value stream:/i)).toBeInTheDocument()
    expect(within(opportunity).getByRole('link', { name: /open cases/i })).toBeInTheDocument()
    expect(within(opportunity).getByRole('link', { name: /open report/i })).toBeInTheDocument()
  })

  it('hides tag-conflict value-stream opportunity when no shared region-tag conflict exists', () => {
    renderFrontDesk()
    expect(
      screen.queryByRole('region', { name: /tag conflict value stream opportunity/i })
    ).not.toBeInTheDocument()
  })

  it('logs the selected front-desk routes once per route signature', async () => {
    const { rerender } = renderFrontDesk()

    await waitFor(() => {
      const entries = useGameStore.getState().game.runtimeState?.ui.debug.eventLog ?? []
      expect(entries.some((entry) => entry.type === 'route.selected')).toBe(true)
    })

    const initialRouteLogCount = (
      useGameStore.getState().game.runtimeState?.ui.debug.eventLog ?? []
    ).filter((entry) => entry.type === 'route.selected').length

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<FrontDeskPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      const entries = useGameStore.getState().game.runtimeState?.ui.debug.eventLog ?? []
      expect(entries.filter((entry) => entry.type === 'route.selected')).toHaveLength(
        initialRouteLogCount
      )
    })
  })

  it('renders human-readable tone chip labels in recent operational events', async () => {
    const game = createStartingState()
    game.events = [
      {
        id: 'event-resolved',
        schemaVersion: 1,
        type: 'case.resolved',
        sourceSystem: 'incident',
        timestamp: '2026-01-01T00:00:00.000Z',
        payload: {
          week: 1,
          caseId: 'case-001',
          caseTitle: 'Resolved Case',
          mode: 'threshold',
          kind: 'case',
          stage: 2,
          teamIds: [],
        },
      } as OperationEvent<'case.resolved'>,
      {
        id: 'event-failed',
        schemaVersion: 1,
        type: 'case.failed',
        sourceSystem: 'incident',
        timestamp: '2026-01-01T00:00:01.000Z',
        payload: {
          week: 1,
          caseId: 'case-002',
          caseTitle: 'Failed Case',
          mode: 'threshold',
          kind: 'case',
          fromStage: 2,
          toStage: 3,
          teamIds: [],
        },
      } as OperationEvent<'case.failed'>,
    ]

    act(() => {
      useGameStore.setState({ game })
    })

    renderFrontDesk()

    const recentSection = screen.getByRole('region', { name: /recent reports and events/i })
    expect(within(recentSection).getByText('Success')).toBeInTheDocument()
    expect(within(recentSection).getByText('Alert')).toBeInTheDocument()
  })
})
