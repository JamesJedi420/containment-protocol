import '../../test/setup'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from '../../app/store/gameStore'
import { dispatchInputAction } from '../../app/inputRuntime'
import { buildAgentCandidate } from '../../test/recruitment/fixtures'
import { createStartingState } from '../../data/startingState'
import { createOperationEvent } from '../../domain/events/eventBus'
import * as hubState from '../../domain/hub/hubState'
import { getCanonicalFundingState, placeProcurementOrder } from '../../domain/funding'
import { getProcurementListings } from '../../domain/market'
import { openCourierShellFront } from '../../domain/sim/frontBusiness'
import { normalizeGameState } from '../../domain/teamSimulation'
import { assignTeam } from '../../domain/sim/assign'
import { selectAgencyEstablishmentFirstDossier } from '../../domain/agencyEstablishmentProjection'
import { buildReportCaseSnapshot } from '../../domain/sim/reportCaseSnapshot'
import { MISSION_TRIAGE_DISPOSITION_LABELS } from '../../data/copy'
import CasesPage from '../cases/CasesPage'
import FrontDeskPage from './FrontDeskPage'
import {
  buildStrategicActionBudgetOpportunityCard,
  buildTagConflictValueStreamOpportunityCard,
} from './frontDeskView'
import { withPaidCourierAndFunding } from '../../test/fixtures/withPaidCourierAndFunding'
import type { CaseInstance, GameState, OperationEvent } from '../../domain/models'

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
        <Route path="/factions" element={<p>Factions home</p>} />
        <Route path="/cases" element={<CasesPage />} />
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

function cloneCaseForRegion(
  template: CaseInstance,
  id: string,
  regionTag: string,
  tags: string[],
  status: CaseInstance['status'] = 'open'
): CaseInstance {
  return {
    ...template,
    id,
    status,
    regionTag,
    tags: [...new Set([...template.tags, ...tags])],
  }
}

function withRankedMultiRegionTagConflictCases(game: GameState): GameState {
  const normalized = normalizeGameState({ ...game })
  const template = normalized.cases['case-001']
  if (!template) {
    throw new Error('Expected case-001 in starting state for multi-region tag conflict fixture.')
  }

  return normalizeGameState({
    ...normalized,
    cases: {
      ...normalized.cases,
      'case-rank-alpha-a': cloneCaseForRegion(template, 'case-rank-alpha-a', 'district:alpha-ward', [
        'authority',
        'public',
      ]),
      'case-rank-alpha-b': cloneCaseForRegion(
        template,
        'case-rank-alpha-b',
        'district:alpha-ward',
        ['criminal', 'smuggling'],
        'in_progress'
      ),
      'case-rank-beta-a': cloneCaseForRegion(template, 'case-rank-beta-a', 'district:beta-ward', [
        'authority',
        'public',
      ]),
      'case-rank-beta-b': cloneCaseForRegion(
        template,
        'case-rank-beta-b',
        'district:beta-ward',
        ['criminal', 'smuggling', 'occult', 'ritual'],
        'in_progress'
      ),
      'case-rank-gamma-a': cloneCaseForRegion(template, 'case-rank-gamma-a', 'district:gamma-ward', [
        'authority',
        'public',
      ]),
      'case-rank-gamma-b': cloneCaseForRegion(
        template,
        'case-rank-gamma-b',
        'district:gamma-ward',
        ['criminal', 'smuggling'],
        'in_progress'
      ),
      'case-rank-gamma-c': cloneCaseForRegion(
        template,
        'case-rank-gamma-c',
        'district:gamma-ward',
        ['civilian', 'witness'],
        'open'
      ),
    },
  })
}

function withTiedTagConflictRegionCases(game: GameState): GameState {
  const normalized = normalizeGameState({ ...game })
  const template = normalized.cases['case-001']
  if (!template) {
    throw new Error('Expected case-001 in starting state for tied tag conflict fixture.')
  }

  return normalizeGameState({
    ...normalized,
    cases: {
      ...normalized.cases,
      'case-tie-alpha-a': cloneCaseForRegion(template, 'case-tie-alpha-a', 'district:alpha-ward', [
        'authority',
        'public',
      ]),
      'case-tie-alpha-b': cloneCaseForRegion(
        template,
        'case-tie-alpha-b',
        'district:alpha-ward',
        ['criminal', 'smuggling'],
        'in_progress'
      ),
      'case-tie-beta-a': cloneCaseForRegion(template, 'case-tie-beta-a', 'district:beta-ward', [
        'authority',
        'public',
      ]),
      'case-tie-beta-b': cloneCaseForRegion(
        template,
        'case-tie-beta-b',
        'district:beta-ward',
        ['criminal', 'smuggling'],
        'in_progress'
      ),
    },
  })
}

function makeStandingEvent(
  sequence: number,
  factionId: 'oversight' | 'black_budget',
  delta: number
): OperationEvent {
  const factionName = factionId === 'oversight' ? 'Oversight Bureau' : 'Black Budget Programs'

  return createOperationEvent(sequence, {
    type: 'faction.standing_changed',
    sourceSystem: 'faction',
    payload: {
      week: 1,
      factionId,
      factionName,
      delta,
      standingBefore: 0,
      standingAfter: delta,
      reason: 'case.resolved',
    },
  })
}

function withConstrainedActionBudget(game: GameState): GameState {
  let state = normalizeGameState({
    ...game,
    agency: {
      ...game.agency!,
      supportAvailable: 1,
    },
  })

  for (const caseId of ['case-001', 'case-002'] as const) {
    const teamId = caseId === 'case-001' ? 't_nightwatch' : 't_greentape'
    state = assignTeam(state, caseId, teamId)
    state = normalizeGameState({
      ...state,
      cases: {
        ...state.cases,
        [caseId]: {
          ...state.cases[caseId]!,
          status: 'in_progress',
          weeksRemaining: 1,
          tags:
            caseId === 'case-001'
              ? [...state.cases[caseId]!.tags, 'intel', 'evidence']
              : [...state.cases[caseId]!.tags, 'recon', 'survey'],
        },
      },
    })
  }

  return state
}

function withRankedHubFactionSignals(game: GameState): GameState {
  return normalizeGameState({
    ...game,
    events: [makeStandingEvent(1, 'oversight', 10), makeStandingEvent(2, 'black_budget', 8)],
  })
}

describe('FrontDeskPage', () => {
  it.each([
    [1, /Since the previous report: Time left/],
    [0, /Still unresolved\. No reported change/],
    [null, /Earlier report comparison unavailable/],
  ])(
    'carries a live case forward with deadline comparison %s',
    async (deadlineChange, copy) => {
      const starting = createStartingState()
      useGameStore.setState({ game: starting })
      useGameStore.getState().advanceWeek()
      const afterClose = useGameStore.getState().game
      const report = afterClose.reports[0]!
      const openCase = Object.values(afterClose.cases).find((entry) => entry.status === 'open')!
      const closed = buildReportCaseSnapshot(openCase)
      const previous = {
        ...closed,
        deadlineRemaining: closed.deadlineRemaining + (deadlineChange ?? 0),
        revealExplanation: 'Hidden historical intel',
      }
      const archived = { ...closed, caseId: 'historical-only', title: 'Historical-only case' }
      useGameStore.setState({
        game: {
          ...afterClose,
          week: report.week + 2,
          cases: { [openCase.id]: openCase },
          reports: [
            {
              ...report,
              caseSnapshots: deadlineChange === null ? undefined : { [openCase.id]: previous },
            },
            {
              ...report,
              week: report.week + 1,
              newCases: [],
              caseSnapshots: { [openCase.id]: closed, [archived.caseId]: archived },
            },
          ],
        },
      })
      renderFrontDesk()
      const carryover = within(screen.getByRole('list', { name: 'Unresolved cases' }))
      expect(carryover.getByText(copy)).toBeVisible()
      expect(carryover.queryByText(/Historical-only case|Hidden historical intel/)).toBeNull()
      await userEvent.click(
        carryover.getByRole('link', { name: `Review triage: ${openCase.title}` })
      )
      expect(
        screen.getByRole('region', { name: `Case triage detail: ${openCase.title}` })
      ).toBeVisible()
    }
  )

  it('shows the honest empty state when only resolved cases remain after a report', () => {
    const starting = createStartingState()
    useGameStore.setState({ game: starting })
    useGameStore.getState().advanceWeek()
    const afterClose = useGameStore.getState().game
    const cases = Object.fromEntries(
      Object.values(afterClose.cases).map((entry) => [
        entry.id,
        { ...entry, status: 'resolved' as const },
      ])
    )
    useGameStore.setState({ game: { ...afterClose, cases } })
    renderFrontDesk()
    const latest = within(screen.getByRole('region', { name: 'Latest report' }))
    expect(latest.getByText('No unresolved cases on the Cases board.')).toBeVisible()
    expect(latest.queryByRole('list', { name: 'Unresolved cases' })).toBeNull()
  })
  it('keeps departure notices in the feed through acknowledgement and automatic reload', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    const candidates = ['Avery Holt', 'Morgan Vale'].map((name, index) =>
      buildAgentCandidate({
        id: `cand-expiring-${index}`,
        name,
        expiryWeek: game.week,
        scoutReport: { stage: 1, projectedTier: 'B', exactKnown: false, confidence: 'low' },
      })
    )
    useGameStore.setState({ game: { ...game, candidates, recruitmentPool: candidates } })
    useGameStore.getState().advanceWeek()

    const before = useGameStore.getState().game
    const departureEvents = before.events.filter(
      (event) => event.type === 'recruitment.candidate_departed'
    )
    expect(departureEvents).toHaveLength(2)
    expect(before.operationNoticeStates).toEqual(
      Object.fromEntries(departureEvents.map((event) => [event.id, 'unread']))
    )

    const desk = renderFrontDesk()
    const showFeed = screen.getByRole('button', { name: 'Show departure notices' })
    act(() => {
      expect(dispatchInputAction('filters.next')).toBe(true)
    })
    expect(showFeed).toHaveFocus()
    act(() => {
      expect(dispatchInputAction('filters.activate')).toBe(true)
    })
    expect(screen.getByRole('button', { name: 'Hide departure notices' })).toHaveFocus()
    const visibleFeed = screen.getByRole('region', { name: 'Departure notices' })
    expect(within(visibleFeed).getAllByRole('listitem')).toHaveLength(2)
    const search = within(visibleFeed).getByRole('searchbox', { name: 'Search departure notices' })
    await user.type(search, 'Avery Holt')
    expect(search).toHaveValue('Avery Holt')
    expect(within(visibleFeed).getAllByRole('listitem')).toHaveLength(1)
    screen.getByRole('button', { name: 'Hide departure notices' }).focus()
    act(() => {
      expect(dispatchInputAction('filters.next')).toBe(true)
      expect(dispatchInputAction('filters.next')).toBe(true)
    })
    const markRead = screen.getByRole('button', { name: /mark as read: avery holt/i })
    expect(markRead).toHaveFocus()
    await user.keyboard('{Enter}')
    const acknowledge = screen.getByRole('button', { name: /acknowledge: avery holt/i })
    expect(acknowledge).toHaveFocus()
    const notice = acknowledge.closest('li')!
    expect(within(notice).getByRole('status')).toHaveTextContent(/^Read$/)

    const firstEvent = departureEvents.find(
      (event) => event.payload.candidateName === 'Avery Holt'
    )!
    act(() => useGameStore.getState().setOperationNoticeStatus(firstEvent.id, 'read'))
    expect(within(notice).getByRole('status')).toHaveTextContent(/^Read$/)
    act(() => {
      expect(dispatchInputAction('filters.activate')).toBe(true)
    })
    expect(within(notice).getByRole('status')).toHaveTextContent(/^Acknowledged$/)
    expect(acknowledge).toHaveFocus()
    expect(dispatchInputAction('filters.activate')).toBe(false)
    await user.clear(search)
    expect(screen.getByRole('button', { name: /mark as read: morgan vale/i })).toBeEnabled()
    expect(useGameStore.getState().game.events).toBe(before.events)

    const store = useGameStore.getState()
    store.setOperationNoticeStatus(firstEvent.id, 'acknowledged')
    store.setOperationNoticeStatus('missing-event', 'read')
    expect(useGameStore.getState().game).toBe(store.game)
    desk.unmount()

    await useGameStore.persist.rehydrate()
    const reloaded = useGameStore.getState().game
    expect(reloaded.operationNoticeStates).toEqual(store.game.operationNoticeStates)
    expect(
      reloaded.events.filter((event) => event.type === 'recruitment.candidate_departed')
    ).toEqual(departureEvents)
    renderFrontDesk()
    await user.click(screen.getByRole('button', { name: 'Show departure notices' }))
    expect(screen.getByRole('button', { name: /acknowledge: avery holt/i })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    expect(screen.getByRole('button', { name: /mark as read: morgan vale/i })).toBeEnabled()
    const feed = screen.getByRole('region', { name: 'Departure notices' })
    expect(within(feed).getByRole('link', { name: /avery holt is no longer available/i })).toBeVisible()
  })

  beforeEach(() => {
    vi.restoreAllMocks()
    useGameStore.persist.clearStorage()
    useGameStore.setState({ game: createStartingState() })
  })

  it('orders imported departure notices by instant and preserves the order of ties', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    const departures = [
      { name: 'Older notice', timestamp: '2042-01-02T10:00:00+02:00' },
      { name: 'First at nine', timestamp: '2042-01-02T09:00:00Z' },
      { name: 'Second at nine', timestamp: '2042-01-02T10:00:00+01:00' },
      { name: 'Legacy notice', timestamp: 'invalid' },
    ].map(({ name, timestamp }, index) => ({
      ...createOperationEvent(index + 1, {
        type: 'recruitment.candidate_departed',
        sourceSystem: 'system',
        payload: {
          week: game.week,
          candidateId: `candidate-${index}`,
          candidateName: name,
          reason: 'unknown_departure',
        },
      }),
      timestamp,
    }))
    useGameStore.setState({ game: { ...game, events: departures } })
    await useGameStore.persist.rehydrate()
    expect(useGameStore.getState().game.events.map((event) => event.timestamp)).toEqual([
      ...departures.slice(0, 3).map((event) => event.timestamp),
      '2042-01-01T00:00:00.004Z',
    ])

    renderFrontDesk()
    await user.click(screen.getByRole('button', { name: 'Show departure notices' }))
    const feed = screen.getByRole('region', { name: 'Departure notices' })
    expect(
      within(feed)
        .getAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual(
      ['First at nine', 'Second at nine', 'Older notice', 'Legacy notice'].map(
        (name) => `${name} is no longer available`
      )
    )
  })

  it('offers an optional guide during the first campaign week', async () => {
    const user = userEvent.setup()
    renderFrontDesk()

    const summary = screen.getByText('How the first week works')
    const guide = summary.closest('details')!
    const dossier = screen.getByRole('link', { name: 'Review dossier and triage' })
    expect(dossier).toBeVisible()
    expect(guide).not.toHaveAttribute('open')
    const before = useGameStore.getState().game

    await user.click(summary)
    expect(guide).toHaveAttribute('open')
    expect(within(guide).getByText(/You run the containment agency/)).toBeVisible()
    expect(within(guide).getAllByRole('listitem')).toHaveLength(9)
    expect(within(guide).getByText('Train, recover, and prepare.')).toBeVisible()
    expect(within(guide).getByText(/A stabilizing week.*A degraded week/)).toBeVisible()
    expect(dossier).toBeVisible()
    expect(useGameStore.getState().game).toBe(before)

    await user.click(screen.getByRole('button', { name: /^advance week\s*→$/i }))
    expect(useGameStore.getState().game.week).toBe(2)
    expect(summary).not.toBeInTheDocument()
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
    expect(screen.getByRole('heading', { name: 'Needs Attention' })).toBeInTheDocument()
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

  it('opens real starting-campaign triage and lets the Cases command defer the dossier', async () => {
    const user = userEvent.setup()
    const dossier = selectAgencyEstablishmentFirstDossier(useGameStore.getState().game)!
    renderFrontDesk()

    const attention = screen.getByRole('region', { name: 'Needs Attention' })
    expect(within(attention).getByRole('heading', { name: dossier.title })).toBeInTheDocument()
    expect(within(attention).getByText(dossier.routingExplanation.summary)).toBeInTheDocument()
    await user.click(within(attention).getByRole('link', { name: 'Review dossier and triage' }))
    const triage = screen.getByRole('region', { name: `Case triage detail: ${dossier.title}` })
    expect(
      useGameStore.getState().game.missionRouting?.missions[dossier.caseId]?.routingState
    ).not.toBe('deferred')
    await user.click(
      within(triage).getByRole('button', { name: MISSION_TRIAGE_DISPOSITION_LABELS.defer })
    )
    expect(
      useGameStore.getState().game.missionRouting?.missions[dossier.caseId]?.routingState
    ).toBe('deferred')
  })

  it('preserves the quiet state when there is no dossier or readiness exception', () => {
    useGameStore.setState({ game: { ...createStartingState(), cases: {}, teams: {} } })
    renderFrontDesk()

    const attention = within(screen.getByRole('region', { name: 'Needs Attention' }))
    expect(attention.queryByRole('link', { name: 'Review dossier and triage' })).toBeNull()
    expect(attention.getByText(/No anomalous dossier is available/i)).toBeInTheDocument()
    expect(attention.queryByRole('region', { name: 'Staffing readiness opportunity' })).toBeNull()
    expect(
      attention.getByText('No immediate intervention items are currently escalated.')
    ).toBeInTheDocument()
  })

  it('renders staffing readiness inside Needs Attention and links to teams', async () => {
    const user = userEvent.setup()
    const game = withLostAgents(createStartingState(), 2)
    act(() => {
      useGameStore.setState({ game })
    })
    renderFrontDesk()

    const attention = screen.getByRole('region', { name: 'Needs Attention' })
    const opportunity = within(attention).getByRole('region', {
      name: 'Staffing readiness opportunity',
    })
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

  it('ranks the highest-priority region conflict when multiple regions qualify', () => {
    const game = withRankedMultiRegionTagConflictCases(createStartingState())
    const card = buildTagConflictValueStreamOpportunityCard(game)

    expect(card).not.toBeNull()
    expect(card?.summary).toContain('district:beta-ward')
    expect(card?.tone).toBe('danger')
    expect(card?.conflictLabel).toMatch(/authority vs criminal/i)
  })

  it('breaks equal region conflict scores with a stable region-tag tie-break', () => {
    const game = withTiedTagConflictRegionCases(createStartingState())
    const card = buildTagConflictValueStreamOpportunityCard(game)

    expect(card).not.toBeNull()
    expect(card?.summary).toContain('district:alpha-ward')
  })

  it('renders the ranked tag-conflict region on the Front Desk surface', () => {
    const game = withRankedMultiRegionTagConflictCases(createStartingState())
    act(() => {
      useGameStore.setState({ game })
    })
    renderFrontDesk()

    const opportunity = screen.getByRole('region', { name: /tag conflict value stream opportunity/i })
    expect(within(opportunity).getByText(/district:beta-ward carries a deterministic/i)).toBeInTheDocument()
  })

  it('renders hub opportunity and rumor leads when hub simulation output is present', async () => {
    const user = userEvent.setup()
    const game = withRankedHubFactionSignals(createStartingState())
    act(() => {
      useGameStore.setState({ game })
    })
    renderFrontDesk()

    const opportunity = screen.getByRole('region', { name: /hub simulation opportunity lead/i })
    expect(within(opportunity).getByText(/% confidence/i)).toBeInTheDocument()
    expect(within(opportunity).getByText(/access: blocked/i)).toBeInTheDocument()

    const rumor = screen.getByRole('region', { name: /hub simulation rumor lead/i })
    expect(within(rumor).getByText(/% confidence/i)).toBeInTheDocument()

    await user.click(within(opportunity).getByRole('link', { name: /open factions/i }))
    expect(screen.getByText(/factions home/i)).toBeInTheDocument()
  })

  it('hides hub opportunity lead when hub simulation returns no opportunities', () => {
    vi.spyOn(hubState, 'generateHubState').mockReturnValue({
      districtKey: 'central_hub',
      factionPresence: {},
      opportunities: [],
      rumors: [
        {
          id: 'rumor-test',
          label: 'Test rumor',
          detail: 'Rumor detail',
          confidence: 0.5,
        },
      ],
    })

    renderFrontDesk()
    expect(
      screen.queryByRole('region', { name: /hub simulation opportunity lead/i })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: /hub simulation rumor lead/i })).toBeInTheDocument()
  })

  it('hides hub rumor lead when hub simulation returns no rumors', () => {
    vi.spyOn(hubState, 'generateHubState').mockReturnValue({
      districtKey: 'central_hub',
      factionPresence: {},
      opportunities: [
        {
          id: 'opportunity-test',
          label: 'Test opportunity',
          detail: 'Opportunity detail',
          factionId: 'oversight',
          confidence: 0.8,
        },
      ],
      rumors: [],
    })

    renderFrontDesk()
    expect(screen.getByRole('region', { name: /hub simulation opportunity lead/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: /hub simulation rumor lead/i })
    ).not.toBeInTheDocument()
  })

  it('renders strategic action budget opportunity when support pool is constrained', async () => {
    const user = userEvent.setup()
    const game = withConstrainedActionBudget(createStartingState())
    const card = buildStrategicActionBudgetOpportunityCard(game)

    expect(card).not.toBeNull()
    expect(card?.pressureLaneLabel).toBe('Exploration')

    act(() => {
      useGameStore.setState({ game })
    })
    renderFrontDesk()

    const opportunity = screen.getByRole('region', { name: /strategic action budget opportunity/i })
    expect(within(opportunity).getByText(/strategic action budget is constrained/i)).toBeInTheDocument()
    expect(within(opportunity).getByText(/lead lane: exploration/i)).toBeInTheDocument()
    expect(within(opportunity).getByText(/support pool 1/i)).toBeInTheDocument()

    await user.click(within(opportunity).getByRole('link', { name: /open agency/i }))
    expect(screen.getByText(/agency home/i)).toBeInTheDocument()
  })

  it('hides strategic action budget opportunity when support pool covers deployments', () => {
    renderFrontDesk()
    expect(
      screen.queryByRole('region', { name: /strategic action budget opportunity/i })
    ).not.toBeInTheDocument()
    expect(buildStrategicActionBudgetOpportunityCard(createStartingState())).toBeNull()
  })

  it('keeps procurement opportunity behavior unchanged when action budget card is present', () => {
    const game = withProcurementBacklog(withConstrainedActionBudget(createStartingState()), 1)
    act(() => {
      useGameStore.setState({ game })
    })
    renderFrontDesk()

    expect(screen.getByRole('region', { name: /strategic action budget opportunity/i })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /procurement pressure opportunity/i })).toBeInTheDocument()
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
