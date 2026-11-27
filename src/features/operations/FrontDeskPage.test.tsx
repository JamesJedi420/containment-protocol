import '../../test/setup'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from '../../app/store/gameStore'
import { hydrateGame, stripGameTemplates } from '../../app/store/runTransfer'
import { dispatchInputAction } from '../../app/inputRuntime'
import { buildAgentCandidate } from '../../test/recruitment/fixtures'
import { createStartingState } from '../../data/startingState'
import { createOperationEvent } from '../../domain/events/eventBus'
import { previewCandidate } from '../../domain/recruitment'
import * as hubState from '../../domain/hub/hubState'
import { getCanonicalFundingState, placeProcurementOrder } from '../../domain/funding'
import { getProcurementListings } from '../../domain/market'
import { openCourierShellFront } from '../../domain/sim/frontBusiness'
import { normalizeGameState } from '../../domain/teamSimulation'
import { assignTeam } from '../../domain/sim/assign'
import { selectAgencyEstablishmentFirstDossier } from '../../domain/agencyEstablishmentProjection'
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
  it('shows distinct directed changes and skips hidden, passive, stale and no-op records', () => {
    useGameStore.setState({ game: createStartingState() })
    useGameStore.getState().advanceWeek()
    const game = useGameStore.getState().game
    const [left, right, third] = Object.values(game.agents)
    const week = game.reports[0]!.week
    const change = (
      sequence: number,
      patch: Partial<
        Extract<
          OperationEvent,
          {
            type: 'agent.relationship_changed'
          }
        >['payload']
      > = {}
    ) =>
      createOperationEvent(sequence, {
        type: 'agent.relationship_changed',
        sourceSystem: 'agent',
        payload: {
          week,
          agentId: left!.id,
          agentName: 'Historical name',
          counterpartId: right!.id,
          counterpartName: 'Historical counterpart',
          previousValue: -0.6,
          nextValue: -0.4,
          delta: 0.2,
          reason: 'reconciliation',
          ...patch,
        },
      })
    const close = game.events.find(
      (event) => event.type === 'intel.report_generated' && event.payload.week === week
    )!
    const forward = change(902)
    const reverse = change(903, {
      agentId: right!.id,
      counterpartId: left!.id,
      previousValue: 0.1,
      nextValue: 0.2,
      delta: 0.1,
    })
    const namesake = change(904, { counterpartId: third!.id })
    useGameStore.setState({
      game: {
        ...game,
        agents: { ...game.agents, [third!.id]: { ...third!, name: right!.name } },
        events: [
          change(900, { week: week - 1 }),
          change(901, { previousValue: -0.8, nextValue: -0.6 }),
          forward,
          reverse,
          namesake,
          change(905, { counterpartId: 'unknown', counterpartName: 'Hidden actor' }),
          change(906, { reason: 'passive_drift' }),
          change(907, { nextValue: -0.6, delta: 0 }),
          close,
          change(908, { week: week + 1 }),
          change(909, { previousValue: 1.7, nextValue: 1.9 }),
        ],
      },
    })

    renderFrontDesk()
    const digest = within(screen.getByRole('list', { name: 'Relationship changes' }))
    expect(digest.getAllByText(`${left!.name} toward ${right!.name}`)).toHaveLength(2)
    expect(digest.getByText(`${right!.name} toward ${left!.name}`)).toBeVisible()
    expect(digest.getByText(`-0.60 → -0.40 · reconciliation · Record ${forward.id}`)).toBeVisible()
    expect(digest.getByText(`0.10 → 0.20 · reconciliation · Record ${reverse.id}`)).toBeVisible()
    expect(digest.getAllByRole('listitem')).toHaveLength(3)
    expect(digest.queryByText(/Historical|Hidden|passive drift|-0.80/)).toBeNull()
  })

  it.each(['pressure', 'steady', 'empty', 'current week'] as const)(
    'shows week-close team fatigue with %s records',
    (scenario) => {
      useGameStore.setState({ game: createStartingState() })
      useGameStore.getState().advanceWeek()
      useGameStore.getState().advanceWeek()
      const game = useGameStore.getState().game
      const [previous, closed] = game.reports
      const team = { teamId: 't_nightwatch', teamName: 'Recorded Night Watch' }
      useGameStore.setState({
        game: {
          ...game,
          reports: [
            { ...previous!, teamStatus: [{ ...team, avgFatigue: 27, fatigueBand: 'strained' }] },
            {
              ...closed!,
              week: scenario === 'current week' ? game.week : closed!.week,
              teamStatus:
                scenario === 'empty'
                  ? []
                  : [
                      {
                        ...team,
                        avgFatigue: scenario === 'steady' ? 19 : 50,
                        fatigueBand: scenario === 'steady' ? 'steady' : 'critical',
                      },
                      ...(scenario === 'pressure'
                        ? [
                            {
                              teamId: 'z-overflow',
                              teamName: 'Fourth squad',
                              avgFatigue: 35,
                              fatigueBand: 'strained' as const,
                            },
                            {
                              teamId: 'a-third',
                              teamName: 'Third squad',
                              avgFatigue: 35,
                              fatigueBand: 'strained' as const,
                            },
                            {
                              teamId: 'removed',
                              teamName: 'Former squad',
                              avgFatigue: 41,
                              fatigueBand: 'strained' as const,
                            },
                          ]
                        : []),
                    ],
            },
          ],
        },
      })

      renderFrontDesk()
      const cue = within(screen.getByRole('region', { name: 'Week-close team fatigue' }))
      if (scenario === 'pressure') {
        expect(cue.getByText('Week 1: 27 → Week 2: 50 average fatigue · critical')).toBeVisible()
        expect(cue.getByText('Week 2: 41 average fatigue · strained')).toBeVisible()
        expect(cue.getByRole('link', { name: 'Review current teams' })).toHaveAttribute(
          'href',
          '/teams'
        )
        expect(
          cue.getByRole('link', { name: 'Check current roster for Recorded Night Watch' })
        ).toHaveAttribute('href', '/teams/t_nightwatch')
        expect(
          cue.getAllByRole('listitem').map((row) => row.querySelector('p')?.textContent)
        ).toEqual(['Recorded Night Watch', 'Former squad', 'Third squad'])
        expect(cue.queryByText('Fourth squad')).toBeNull()
        expect(
          cue.getByRole('link', { name: 'See all 4 affected teams in the report' })
        ).toHaveAttribute('href', '/report/2')
      } else {
        expect(cue.queryByRole('list')).toBeNull()
        expect(
          cue.getByText(
            scenario === 'steady'
              ? 'No strained or critical teams were recorded at week close.'
              : 'Week-close team fatigue is unavailable for this report.'
          )
        ).toBeVisible()
      }
    }
  )

  it('keeps report history separate when a new squad reuses an old ID and name', () => {
    const initial = createStartingState()
    initial.agents.a_juno!.fatigue = 100
    initial.agents.a_eli!.fatigue = 100
    useGameStore.setState({ game: initial })
    const { createTeam, advanceWeek, moveAgentBetweenTeams, deleteEmptyTeam } =
      useGameStore.getState()
    createTeam('Echo', 'a_juno')
    const teamId = Object.values(useGameStore.getState().game.teams).find(
      (team) => team.name === 'Echo'
    )!.id
    advanceWeek()
    moveAgentBetweenTeams('a_juno', null)
    deleteEmptyTeam(teamId)
    createTeam('Echo', 'a_eli')
    expect(useGameStore.getState().game.teams[teamId]?.agentIds).toEqual(['a_eli'])

    renderFrontDesk()
    const cue = within(screen.getByRole('region', { name: 'Week-close team fatigue' }))
    expect(cue.getByText('Echo')).toBeVisible()
    expect(cue.queryByRole('link', { name: 'Check current roster for Echo' })).toBeNull()
    expect(cue.getByRole('link', { name: 'Review current teams' })).toHaveAttribute(
      'href',
      '/teams'
    )

    act(() => advanceWeek())
    const record = useGameStore
      .getState()
      .game.reports.at(-1)
      ?.teamStatus.find((entry) => entry.teamId === teamId)
    expect(record?.fatigueBand).toBe('critical')
    expect(
      cue.getByText(`Week 2: ${record?.avgFatigue} average fatigue · critical`, { exact: true })
    ).toBeVisible()
  })

  it.each(['movement', 'capped', 'funding only', 'missing previous', 'missing current'] as const)(
    'shows the realized containment result with %s evidence',
    (scenario) => {
      useGameStore.setState({ game: createStartingState() })
      useGameStore.getState().advanceWeek()
      useGameStore.getState().advanceWeek()
      const closed = useGameStore.getState().game
      const previousClose = closed.events.findIndex(
        (event) => event.type === 'intel.report_generated' && event.payload.week === 1
      )
      const currentClose = closed.events.findIndex(
        (event) => event.type === 'intel.report_generated' && event.payload.week === 2
      )
      const update = closed.events.find(
        (event) => event.type === 'agency.containment_updated' && event.payload.week === 2
      )
      if (update?.type !== 'agency.containment_updated') throw new Error('Expected Week 2 update.')
      const { containmentRatingBefore: before, containmentRatingAfter: after } = update.payload
      expect(previousClose).toBeGreaterThanOrEqual(0)
      expect(closed.events.indexOf(update)).toBeGreaterThan(previousClose)
      expect(closed.events.indexOf(update)).toBeLessThan(currentClose)
      expect(after).not.toBe(before)
      const events = closed.events
        .filter(
          (_, index) =>
            !(scenario === 'missing previous' && index === previousClose) &&
            !(scenario === 'missing current' && index === currentClose)
        )
        .map((event) => {
          if (event !== update || (scenario !== 'capped' && scenario !== 'funding only')) {
            return event
          }
          return {
            ...update,
            payload: {
              ...update.payload,
              containmentRatingBefore: 100,
              containmentRatingAfter: 100,
              containmentDelta: scenario === 'capped' ? 5 : 0,
            },
          }
        })
      const outsideReport = (sequence: number) =>
        createOperationEvent(sequence, {
          type: 'agency.containment_updated',
          sourceSystem: 'system',
          payload: { ...update.payload, containmentRatingBefore: 11, containmentRatingAfter: 99 },
        })
      events.splice(previousClose, 0, outsideReport(closed.events.length + 99))
      events.push(outsideReport(closed.events.length + 100))
      useGameStore.setState({ game: { ...closed, events } })
      renderFrontDesk()

      const digest = within(screen.getByRole('region', { name: 'Containment rating' }))
      expect(digest.queryByText('11% → 99%')).toBeNull()
      if (scenario === 'movement') {
        expect(digest.getByText(`${before}% → ${after}%`)).toBeVisible()
        expect(digest.getByText(`Week-close agency update · Record ${update.id}`)).toBeVisible()
        expect(digest.getByText(/standing when generating future candidate pools/)).toBeVisible()
        expect(digest.getByRole('link', { name: 'Review recruitment options' })).toHaveAttribute(
          'href',
          '/recruitment'
        )
      } else {
        expect(
          digest.getByText(
            scenario === 'capped' || scenario === 'funding only'
              ? 'No containment rating change recorded for this week.'
              : 'Containment rating history is incomplete for this week.'
          )
        ).toBeVisible()
        expect(digest.queryByRole('link')).toBeNull()
      }

      if (scenario === 'capped') {
        const reloaded = hydrateGame(stripGameTemplates(useGameStore.getState().game))
        act(() => useGameStore.setState({ game: reloaded }))
        expect(digest.getByText('No containment rating change recorded for this week.')).toBeVisible()
        expect(digest.queryByRole('link')).toBeNull()
      }
    }
  )

  it.each([
    'changed',
    'unchanged',
    'missing previous marker',
    'missing current marker',
    'missing snapshot',
    'invalid endpoint',
  ] as const)('shows week-close funding with %s evidence', (scenario) => {
    useGameStore.setState({ game: createStartingState() })
    useGameStore.getState().advanceWeek()
    useGameStore.getState().advanceWeek()
    const closed = useGameStore.getState().game
    const update = closed.events.find(
      (event) => event.type === 'agency.containment_updated' && event.payload.week === 2
    )
    if (update?.type !== 'agency.containment_updated') throw new Error('Expected Week 2 update.')
    const { fundingBefore: before, fundingAfter: after } = update.payload
    expect(before).not.toBe(after)
    const events = closed.events
      .filter((event) => {
        if (event === update && scenario === 'missing snapshot') return false
        if (event.type !== 'intel.report_generated') return true
        return !(
          (scenario === 'missing previous marker' && event.payload.week === 1) ||
          (scenario === 'missing current marker' && event.payload.week === 2)
        )
      })
      .map((event) => {
        if (event !== update) return event
        if (scenario === 'unchanged') {
          return { ...update, payload: { ...update.payload, fundingBefore: 0, fundingAfter: 0 } }
        }
        if (scenario === 'invalid endpoint') {
          return { ...update, payload: { ...update.payload, fundingAfter: NaN } }
        }
        return event
      })
    events.push(
      createOperationEvent(closed.events.length + 100, {
        type: 'agency.containment_updated',
        sourceSystem: 'system',
        payload: { ...update.payload, fundingBefore: 990, fundingAfter: 991 },
      })
    )
    useGameStore.setState({ game: { ...closed, events } })
    renderFrontDesk()

    const report = within(screen.getByRole('region', { name: 'Latest report' }))
    const digest = within(report.getByRole('region', { name: 'Week-close funding' }))
    expect(digest.queryByText(/990|991/)).toBeNull()
    if (scenario === 'changed') {
      expect(digest.getByText(`${before} → ${after} funding`)).toBeVisible()
      expect(digest.getByText(`Funding source · Record ${update.id}`)).toBeVisible()
      expect(digest.getByRole('link', { name: 'Check procurement affordability' })).toHaveAttribute(
        'href',
        '/markets-suppliers'
      )
    } else {
      expect(
        digest.getByText(
          scenario === 'unchanged'
            ? 'Funding held steady in the recorded closing update.'
            : 'The funding comparison is unavailable for this report.'
        )
      ).toBeVisible()
      expect(digest.queryByRole('link')).toBeNull()
    }
  })

  it('labels funding history that may contain reconstructed imported balances', () => {
    useGameStore.setState({ game: createStartingState() })
    useGameStore.getState().advanceWeek()
    const closed = useGameStore.getState().game
    const imported = hydrateGame({
      ...stripGameTemplates(closed),
      events: closed.events.map((event) =>
        event.type === 'agency.containment_updated'
          ? { ...event, payload: { ...event.payload, fundingAfter: undefined } }
          : event
      ),
    })
    useGameStore.setState({ game: imported })
    renderFrontDesk()

    const digest = within(screen.getByRole('region', { name: 'Week-close funding' }))
    expect(digest.getByText('110 → 93 funding', { exact: true })).toBeVisible()
    expect(digest.getByText('Imported history can include reconstructed balances.')).toBeVisible()
  })

  it.each(['verified', 'quiet', 'missing previous', 'missing current', 'legacy', 'mixed'] as const)(
    'shows field-agent hiring with %s evidence',
    (scenario) => {
      useGameStore.setState({ game: createStartingState() })
      useGameStore.getState().advanceWeek()
      const open = useGameStore.getState().game
      const candidate = open.candidates.find(
        (entry) => entry.category === 'agent' && previewCandidate(entry, open).canHire
      )
      if (!candidate) throw new Error('Expected a hireable field agent in Week 2.')
      useGameStore.getState().hireCandidate(candidate.id)
      useGameStore.getState().advanceWeek()
      const closed = useGameStore.getState().game
      const hire = closed.events.find((event) => event.type === 'agent.hired')
      if (hire?.type !== 'agent.hired') throw new Error('Expected a field-agent hire record.')
      const isMarker = (event: (typeof closed.events)[number], week: number) =>
        event.type === 'intel.report_generated' && event.payload.week === week
      const start = closed.events.findIndex((event) => isMarker(event, 1))
      const end = closed.events.findIndex((event) => isMarker(event, 2))
      expect(closed.events.indexOf(hire)).toBeGreaterThan(start)
      expect(closed.events.indexOf(hire)).toBeLessThan(end)
      const nonFieldHire = (sequence: number, recruitCategory: 'staff' | 'instructor') =>
        createOperationEvent(sequence, {
          type: 'agent.hired',
          sourceSystem: 'agent',
          payload: { ...hire.payload, recruitCategory },
        })
      const events = [
        ...closed.events.slice(0, start),
        ...(scenario === 'quiet' ? [hire] : []),
        ...closed.events
          .slice(start, end)
          .filter(
            (event) =>
              !(scenario === 'missing previous' && isMarker(event, 1)) &&
              !(event === hire && (scenario === 'quiet' || scenario === 'legacy'))
          ),
        nonFieldHire(closed.events.length + 99, 'staff'),
        nonFieldHire(closed.events.length + 100, 'instructor'),
        ...(scenario === 'missing current' ? [] : closed.events.slice(end)),
        ...(scenario === 'quiet' ? [hire] : []),
      ]
      let game = { ...closed, events }
      if (scenario === 'legacy' || scenario === 'mixed') {
        const legacyHire = {
          ...hire,
          id: 'evt-unverified-legacy-hire',
          payload: {
            week: 2,
            candidateId: candidate.id,
            agentId: candidate.id,
            agentName: candidate.name,
          },
        }
        const currentMarker = events.findIndex((event) => isMarker(event, 2))
        expect(currentMarker).toBeGreaterThan(0)
        game = hydrateGame(
          {
            ...stripGameTemplates(closed),
            events: [...events.slice(0, currentMarker), legacyHire, ...events.slice(currentMarker)],
          },
          createStartingState(),
          { allowLegacySyntheticRepair: true }
        )
        expect(game.events).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: legacyHire.id,
              payload: expect.objectContaining({ recruitCategory: 'agent' }),
            }),
          ])
        )
      }
      useGameStore.setState({ game })
      renderFrontDesk()

      const digest = within(screen.getByRole('region', { name: 'Field-agent hiring' }))
      if (scenario === 'verified' || scenario === 'mixed') {
        expect(digest.getAllByRole('listitem')).toHaveLength(1)
        expect(digest.getByText(`${candidate.name} joined the field roster`)).toBeVisible()
        expect(digest.getByText(`Hire record ${hire.id}`)).toBeVisible()
        expect(digest.getByText(/review their readiness before assigning duties/i)).toBeVisible()
        expect(
          digest.getByRole('link', { name: `Review ${candidate.name} in Roster` })
        ).toHaveAttribute('href', `/agents/${encodeURIComponent(candidate.id)}`)
        if (scenario === 'mixed') {
          expect(
            digest.getByText('Field-agent hire history is incomplete for this week.')
          ).toBeVisible()
        } else {
          expect(digest.queryByText(/history is incomplete/)).toBeNull()
        }
      } else {
        expect(digest.queryByRole('link')).toBeNull()
        expect(
          digest.getByText(
            scenario === 'quiet'
              ? 'No field-agent hires recorded for this week.'
              : 'Field-agent hire history is incomplete for this week.'
          )
        ).toBeVisible()
      }
    }
  )

  it.each(['complete', 'missing previous', 'missing current'] as const)(
    'attributes individual training to the closing report with %s marker history',
    (history) => {
      const game = createStartingState()
      const team = Object.values(game.teams).find((entry) => entry.name === 'Night Watch')!
      const agent = Object.values(game.agents).find(
        (entry) => entry.status === 'active' && !(team.memberIds ?? team.agentIds).includes(entry.id)
      )!
      useGameStore.setState({ game })
      useGameStore.getState().queueTraining(agent.id, 'analysis-lab')
      useGameStore.getState().queueTeamTraining(team.id, 'coordination-drill')
      useGameStore.getState().advanceWeek()
      useGameStore.getState().advanceWeek()
      const closed = useGameStore.getState().game
      const completion = closed.events
        .filter((event) => event.type === 'agent.training_completed')
        .find((event) => event.payload.trainingId === 'analysis-lab')
      const drillCompletion = closed.events.findIndex(
        (event) =>
          event.type === 'agent.training_completed' &&
          event.payload.trainingId === 'coordination-drill'
      )
      const previousClose = closed.events.findIndex(
        (event) => event.type === 'intel.report_generated' && event.payload.week === 1
      )
      const currentClose = closed.events.findIndex(
        (event) => event.type === 'intel.report_generated' && event.payload.week === 2
      )
      expect(completion?.payload.week).toBe(3)
      expect(previousClose).toBeGreaterThanOrEqual(0)
      expect(closed.events.indexOf(completion!)).toBeGreaterThan(previousClose)
      expect(currentClose).toBeGreaterThan(closed.events.indexOf(completion!))
      expect(drillCompletion).toBeGreaterThan(previousClose)
      expect(drillCompletion).toBeLessThan(currentClose)

      const events = closed.events.filter(
        (_, index) =>
          !(history === 'missing previous' && index === previousClose) &&
          !(history === 'missing current' && index === currentClose)
      )
      // Adjacent closes can stamp the incoming week. Neither neighboring interval belongs here.
      events.splice(
        previousClose,
        0,
        createOperationEvent(events.length + 99, {
          type: 'agent.training_completed',
          sourceSystem: 'agent',
          payload: {
            ...completion!.payload,
            week: 2,
            queueId: 'earlier',
            trainingName: 'Earlier course',
          },
        })
      )
      events.push(
        createOperationEvent(events.length + 100, {
          type: 'agent.training_completed',
          sourceSystem: 'agent',
          payload: { ...completion!.payload, queueId: 'later', trainingName: 'Later course' },
        })
      )
      useGameStore.setState({ game: { ...closed, events } })
      renderFrontDesk()

      const report = within(screen.getByRole('region', { name: 'Latest report' }))
      expect(report.queryByText(/Earlier course|Later course/)).toBeNull()
      if (history === 'complete') {
        const staff = within(report.getByRole('list', { name: 'Staff training completions' }))
        expect(staff.getAllByRole('listitem')).toHaveLength(1)
        expect(staff.getByText(`${agent.name} completed Analysis Lab`)).toBeVisible()
        expect(staff.getByText(`Training record ${completion!.id}`)).toBeVisible()
        expect(
          staff.getByRole('link', { name: `Review ${agent.name} before assigning duties` })
        ).toHaveAttribute('href', `/agents/${agent.id}`)
      } else {
        expect(report.getByText('Training history is incomplete for this week.')).toBeVisible()
        expect(report.queryByRole('list', { name: 'Staff training completions' })).toBeNull()
      }
    }
  )

  it.each(['recorded', 'quiet', 'incomplete'] as const)(
    'shows staff injuries with %s report history',
    async (history) => {
      useGameStore.setState({ game: createStartingState() })
      useGameStore.getState().advanceWeek()
      useGameStore.getState().advanceWeek()
      const closed = useGameStore.getState().game
      const agent = closed.agents.a_ava!
      const previousClose = closed.events.findIndex(
        (event) => event.type === 'intel.report_generated' && event.payload.week === 1
      )
      const currentClose = closed.events.findIndex(
        (event) => event.type === 'intel.report_generated' && event.payload.week === 2
      )
      expect(previousClose).toBeGreaterThanOrEqual(0)
      expect(currentClose).toBeGreaterThan(previousClose)

      const injury = (sequence: number, agentId: string, agentName: string, week = 2) =>
        createOperationEvent(sequence, {
          type: 'agent.injured',
          sourceSystem: 'agent',
          payload: { week, agentId, agentName, severity: 'moderate' },
        })
      const recorded = injury(9901, agent.id, agent.name)
      const events = [
        ...closed.events.slice(0, previousClose),
        injury(9902, 'earlier', 'Earlier record'),
        ...closed.events.slice(previousClose, currentClose),
        injury(9903, 'wrong-week', 'Wrong-week record', 3),
        ...(history === 'quiet'
          ? []
          : [
              recorded,
              recorded,
              injury(9904, 'archived', 'Archived agent'),
              injury(9906, 'second', 'Second injury'),
              injury(9907, 'third', 'Third injury'),
            ]),
        ...(history === 'incomplete' ? [] : closed.events.slice(currentClose)),
        injury(9905, 'later', 'Later record'),
      ]
      useGameStore.setState({ game: { ...closed, events } })
      renderFrontDesk()

      const digest = within(screen.getByRole('region', { name: 'Staff injuries' }))
      expect(digest.queryByText(/Earlier record|Wrong-week record|Later record/)).toBeNull()
      if (history === 'recorded') {
        const preview = within(digest.getByRole('list', { name: 'Recorded injuries' }))
        expect(preview.getAllByRole('listitem')).toHaveLength(3)
        expect(preview.getByText('Archived agent was injured')).toBeVisible()
        expect(preview.queryByRole('link')).toBeNull()
        const summary = digest.getByText('More recorded injuries (1)')
        expect(summary.closest('details')).not.toHaveAttribute('open')
        await userEvent.click(summary)
        expect(summary.closest('details')).toHaveAttribute('open')
        const additional = within(digest.getByRole('list', { name: 'Additional recorded injuries' }))
        expect(additional.getAllByRole('listitem')).toHaveLength(1)
        expect(
          additional.getByText(`Recorded severity: moderate · Injury record ${recorded.id}`)
        ).toBeVisible()
        expect(
          additional.getByRole('link', { name: `Check current readiness for ${agent.name}` })
        ).toHaveAttribute('href', `/agents/${agent.id}`)
        expect(preview.getAllByText('Current roster record unavailable.')).toHaveLength(3)
      } else {
        expect(digest.queryByRole('list')).toBeNull()
        expect(
          digest.getByText(
            history === 'quiet'
              ? 'No staff injuries recorded for this week.'
              : 'Staff injury history is unavailable for this week.'
          )
        ).toBeVisible()
      }
    }
  )

  it.each(['bounded', 'quiet', 'incomplete'] as const)(
    'shows coaching assignments with %s report history',
    (history) => {
      useGameStore.setState({ game: createStartingState() })
      const store = useGameStore.getState()
      store.advanceWeek()
      store.advanceWeek()
      const closed = useGameStore.getState().game
      const currentClose = closed.events.findIndex(
        (event) => event.type === 'intel.report_generated' && event.payload.week === 2
      )
      expect(currentClose).toBeGreaterThan(0)

      const coachingRecord = (sequence: number, staffId: string, agentName: string) =>
        createOperationEvent(closed.events.length + sequence, {
          type: 'agent.instructor_assigned',
          sourceSystem: 'agent',
          payload: {
            week: 2,
            staffId,
            instructorName: staffId,
            agentId: 'trainee',
            agentName,
            instructorSpecialty: 'investigation',
            bonus: 1,
          },
        })

      const newest = coachingRecord(6, 'Coach One', 'Latest trainee')
      const events = [
        coachingRecord(1, 'Earlier coach', 'Earlier trainee'),
        ...closed.events.slice(0, currentClose),
        ...(history === 'quiet'
          ? []
          : [
              coachingRecord(2, 'Coach One', 'Previous trainee'),
              coachingRecord(3, 'Coach Two', 'Second trainee'),
              coachingRecord(4, 'Coach Three', 'Third trainee'),
              coachingRecord(5, 'Coach Four', 'Fourth trainee'),
              newest,
            ]),
        ...closed.events.slice(currentClose),
        coachingRecord(7, 'Later coach', 'Later trainee'),
      ].filter(
        (event) =>
          history !== 'incomplete' ||
          event.type !== 'intel.report_generated' ||
          event.payload.week !== 1
      )
      useGameStore.setState({ game: { ...closed, events } })
      renderFrontDesk()

      const digest = within(screen.getByRole('region', { name: 'Coaching assignments' }))
      expect(
        digest.queryByText(/Earlier trainee|Later trainee|Previous trainee|Second trainee/)
      ).toBeNull()
      if (history === 'bounded') {
        expect(digest.getAllByRole('listitem')).toHaveLength(3)
        expect(digest.getByText('Coach One was assigned to coach Latest trainee')).toBeVisible()
        expect(digest.getByText(`Coaching record ${newest.id}`)).toBeVisible()
        expect(digest.getByText('Showing 3 of 4 instructors assigned this week.')).toBeVisible()
        expect(
          digest.getByRole('link', { name: 'Check current coaching assignments' })
        ).toHaveAttribute('href', '/training-division?advanced=1')
      } else {
        expect(digest.queryByRole('list')).toBeNull()
        expect(
          digest.getByText(
            history === 'quiet'
              ? 'No coaching assignments recorded for this week.'
              : 'Coaching assignment history is incomplete for this week.'
          )
        ).toBeVisible()
      }
    }
  )

  it.each([true, false])(
    'shows a drill completed during close with prior history available (%s)',
    (hasPriorClose) => {
      const game = createStartingState()
      const team = Object.values(game.teams).find((entry) => entry.name === 'Night Watch')!
      useGameStore.setState({ game })
      useGameStore.getState().queueTeamTraining(team.id, 'coordination-drill')
      useGameStore.getState().advanceWeek()
      useGameStore.getState().advanceWeek()
      const closed = useGameStore.getState().game
      const trainingEvents = closed.events
        .filter((event) => event.type === 'agent.relationship_changed')
        .filter((event) => event.payload.reason === 'training')
      expect(trainingEvents.length).toBeGreaterThan(0)
      expect(trainingEvents.every((event) => event.payload.week === closed.week)).toBe(true)

      if (!hasPriorClose) {
        useGameStore.setState({
          game: {
            ...closed,
            events: closed.events.filter(
              (event) =>
                event.type !== 'intel.report_generated' || event.payload.week !== closed.week - 2
            ),
          },
        })
      }
      renderFrontDesk()
      const report = within(screen.getByRole('region', { name: 'Latest report' }))
      expect(report.getByRole('link', { name: `Week ${closed.week - 1}` })).toBeVisible()
      const digest = within(report.getByRole('list', { name: 'Relationship changes' }))
      const row = digest.getAllByText(/· training · Record /)[0]!
      expect(trainingEvents.some((event) => row.textContent?.endsWith(event.id))).toBe(true)
      expect(Boolean(report.queryByText('Earlier relationship history is incomplete.'))).toBe(
        !hasPriorClose
      )
    }
  )

  it.each([
    [true, 'No qualifying staff relationship changes recorded for this week.'],
    [false, 'Relationship comparison unavailable for this week.'],
  ])('distinguishes a quiet close from missing event history (%s)', (hasHistory, copy) => {
    useGameStore.setState({ game: createStartingState() })
    useGameStore.getState().advanceWeek()
    const game = useGameStore.getState().game
    useGameStore.setState({
      game: {
        ...game,
        events: hasHistory
          ? game.events.filter((event) => event.type !== 'agent.relationship_changed')
          : [],
      },
    })
    renderFrontDesk()
    expect(
      within(screen.getByRole('region', { name: 'Latest report' })).getByText(copy)
    ).toBeVisible()
    expect(screen.queryByRole('list', { name: 'Relationship changes' })).toBeNull()
  })

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
      const closed = report.caseSnapshots?.[openCase.id]
      if (!closed) throw new Error('Expected the production report to include the open case.')
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
              caseSnapshots: { [openCase.id]: { ...previous, stage: closed.stage + 2 } },
            },
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
      expect(carryover.queryByText(/Stage \d+ →/)).toBeNull()
      expect(carryover.queryByText(/Historical-only case|Hidden historical intel/)).toBeNull()
      await userEvent.click(
        carryover.getByRole('link', { name: `Review triage: ${openCase.title}` })
      )
      expect(
        screen.getByRole('region', { name: `Case triage detail: ${openCase.title}` })
      ).toBeVisible()
    }
  )

  it.each([
    [
      2,
      1,
      'in_progress',
      1,
      7,
      'Since the previous report: Operation time remaining 2 weeks → 1 week.',
    ],
    [undefined, 1, 'in_progress', 1, 1, 'Still unresolved. No reported change'],
    [2, undefined, 'in_progress', 1, undefined, 'Still unresolved. No reported change'],
    [2, 2, 'in_progress', 1, 0, 'Still unresolved. No reported change'],
    [2, 1, 'open', 1, 1, 'Since the previous report: Open → Active.'],
    [2, 7, 'in_progress', 0, 7, 'Still unresolved. No reported change'],
  ] as const)(
    'compares operation time (%s → %s, previous status %s, latest report age %s)',
    (before, after, previousStatus, reportAge, liveWeeks, copy) => {
      useGameStore.setState({ game: createStartingState() })
      useGameStore.getState().advanceWeek()
      const game = useGameStore.getState().game
      const report = game.reports[0]!
      const snapshot = Object.values(report.caseSnapshots ?? {})[0]!
      const caseId = snapshot.caseId
      const activeCase = {
        ...game.cases[caseId]!,
        status: 'in_progress' as const,
        weeksRemaining: liveWeeks,
      }

      useGameStore.setState({
        game: {
          ...game,
          week: report.week + 1 + reportAge,
          cases: { [caseId]: activeCase },
          reports: [
            {
              ...report,
              caseSnapshots: {
                [caseId]: { ...snapshot, status: previousStatus, weeksRemaining: before },
              },
            },
            {
              ...report,
              week: report.week + 1,
              newCases: [],
              resolvedCases: [],
              caseSnapshots: {
                [caseId]: { ...snapshot, status: 'in_progress', weeksRemaining: after },
              },
            },
          ],
        },
      })

      renderFrontDesk()
      const carryover = within(screen.getByRole('list', { name: 'Unresolved cases' }))
      expect(carryover.getByText(copy, { exact: false })).toBeVisible()
      if (liveWeeks === undefined) {
        expect(carryover.queryByText(/Current operation:/)).toBeNull()
      } else {
        expect(
          carryover.getByText(
            `Active · Current operation: ${liveWeeks} ${liveWeeks === 1 ? 'week' : 'weeks'} remaining`
          )
        ).toBeVisible()
      }
      expect(carryover.queryByText(/remaining to act/)).toBeNull()
      if (!copy.includes('Operation time remaining')) {
        expect(carryover.queryByText(/Operation time remaining/)).toBeNull()
      }
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

  it('preserves the outcome recorded by a legacy report without snapshots', () => {
    useGameStore.setState({ game: createStartingState() })
    useGameStore.getState().advanceWeek()
    const game = useGameStore.getState().game
    const openCase = Object.values(game.cases).find((entry) => entry.status === 'open')!
    useGameStore.setState({
      game: {
        ...game,
        cases: { [openCase.id]: openCase },
        reports: [
          {
            ...game.reports[0]!,
            newCases: [],
            unresolvedTriggers: [openCase.id],
            caseSnapshots: undefined,
          },
        ],
      },
    })

    renderFrontDesk()
    const carryover = within(screen.getByRole('list', { name: 'Unresolved cases' }))
    expect(
      carryover.getByText('Listed as unresolved in this report. Snapshot details unavailable.')
    ).toBeVisible()
    expect(carryover.getByRole('link', { name: `Review triage: ${openCase.title}` })).toBeVisible()
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
