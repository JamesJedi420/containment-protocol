import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
} from '../domain/postIncidentReviewRegistry'
import {
  RECURRENCE_DAMAGE_LEDGER_FIXTURE,
} from '../domain/recurrentCatastropheAmeliorationRegistry'
import { assignTeam } from '../domain/sim/assign'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  applyWeeklyPostIncidentReviewCreationTick,
  resolveQualifyingIncidentReviewDraftsFromEventDrafts,
} from '../domain/postIncidentReviewWeeklyOrchestration'
import { applyWeeklyRecurrentCatastropheTick } from '../domain/recurrentCatastropheWeeklyOrchestration'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
    currentCase.stage = 1
    currentCase.deadlineRemaining = Math.max(currentCase.deadlineWeeks, 4)
  }
}

describe('advanceWeek post-incident review integration (SPE-868 slice 4)', () => {
  it('is a no-op for an empty recurrent catastrophe map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.recurrentCatastropheRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.postIncidentReviewRecords).toEqual(state.postIncidentReviewRecords)
  })

  it('does not duplicate existing stub reviews before recurrence is due', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 51
    state.recurrentCatastropheRecords = {
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: RECURRENCE_DAMAGE_LEDGER_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.week).toBe(52)
    expect(nextState.postIncidentReviewRecords?.[RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]).toEqual(
      RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE
    )
    expect(nextState.postIncidentReviewRecords?.['review:cycle-4-closeout']).toBeUndefined()
  })

  it('creates cycle-4 closeout review when advanceWeek reaches recurrence due week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 52
    state.recurrentCatastropheRecords = {
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: {
        ...RECURRENCE_DAMAGE_LEDGER_FIXTURE,
        postIncidentReviewRefs: ['review:cycle-3-closeout', 'review:cycle-4-closeout'],
      },
    }

    const nextState = advanceWeek(state)
    const created = nextState.postIncidentReviewRecords?.['review:cycle-4-closeout']
    const catastrophe =
      nextState.recurrentCatastropheRecords?.[RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]

    expect(nextState.week).toBe(53)
    expect(catastrophe?.recurrenceCount).toBe(4)
    expect(catastrophe?.lastOccurrenceWeek).toBe(53)
    expect(created?.label).toBe('Manifestation cascade cycle 4 closeout review')
    expect(created?.milestoneTimings?.reportingWeek).toBe(53)
    expect(created?.unknownFields).toEqual(['orchestration_week:53'])
    expect(nextState.postIncidentReviewRecords?.[RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]).toEqual(
      RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE
    )
  })

  it('matches direct recurrence tick plus review creation for the post-advance week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 52
    state.recurrentCatastropheRecords = {
      [RECURRENCE_DAMAGE_LEDGER_FIXTURE.id]: {
        ...RECURRENCE_DAMAGE_LEDGER_FIXTURE,
        postIncidentReviewRefs: ['review:cycle-3-closeout', 'review:cycle-4-closeout'],
      },
    }

    const nextState = advanceWeek(state)
    const directRecurrenceTick = applyWeeklyRecurrentCatastropheTick(
      state.recurrentCatastropheRecords,
      nextState.week
    )
    const qualifyingDrafts = resolveQualifyingIncidentReviewDraftsFromEventDrafts(
      nextState.events
        .filter((event) => event.week === state.week)
        .map((event) => ({
          type: event.type,
          sourceSystem: event.sourceSystem,
          payload: event.payload,
        })),
      state.cases,
      nextState.week
    )
    const directReviewTick = applyWeeklyPostIncidentReviewCreationTick(
      state.postIncidentReviewRecords,
      directRecurrenceTick,
      nextState.week,
      qualifyingDrafts
    )

    expect(nextState.recurrentCatastropheRecords).toEqual(directRecurrenceTick)
    expect(nextState.postIncidentReviewRecords).toEqual(directReviewTick)
  })
})

function makeQualifyingResolvedCaseState() {
  const state = createStartingState()
  state.rngSeed = 211
  state.rngState = 211
  state.recurrentCatastropheRecords = {}

  for (const currentCase of Object.values(state.cases)) {
    if (currentCase.id !== 'case-001') {
      currentCase.status = 'open'
      currentCase.assignedTeamIds = []
      currentCase.stage = 1
      currentCase.deadlineRemaining = Math.max(currentCase.deadlineWeeks, 4)
    }
  }

  state.cases['case-001'] = {
    ...state.cases['case-001'],
    status: 'in_progress',
    stage: 4,
    weeksRemaining: 1,
    difficulty: { combat: 1, investigation: 0, utility: 0, social: 0 },
    weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
  }

  const assigned = assignTeam(state, 'case-001', 't_nightwatch')
  assigned.teams['t_nightwatch'] = {
    ...assigned.teams['t_nightwatch'],
    status: {
      ...(assigned.teams['t_nightwatch'].status ?? { state: 'deployed', assignedCaseId: null }),
      assignedCaseId: 'case-001',
    },
  }

  return assigned
}

describe('advanceWeek qualifying incident review integration (SPE-868 slice 7)', () => {
  it('creates a qualifying case closeout review when a major incident resolves', () => {
    const state = makeQualifyingResolvedCaseState()

    const nextState = advanceWeek(state)
    const created = nextState.postIncidentReviewRecords?.['review:case-case-001-closeout']

    expect(nextState.cases['case-001'].status).toBe('resolved')
    expect(created?.label).toBe(
      'Qualifying incident closeout review — ' + state.cases['case-001'].title
    )
    expect(created?.milestoneTimings?.reportingWeek).toBe(nextState.week)
    expect(created?.unknownFields).toEqual([`orchestration_week:${nextState.week}`])
  })

  it('does not create a review when a non-qualifying case resolves', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.recurrentCatastropheRecords = {}
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      status: 'in_progress',
      stage: 1,
      weeksRemaining: 1,
      difficulty: { combat: 1, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
    }
    const assigned = assignTeam(state, 'case-001', 't_nightwatch')
    assigned.teams['t_nightwatch'] = {
      ...assigned.teams['t_nightwatch'],
      status: {
        ...(assigned.teams['t_nightwatch'].status ?? { state: 'deployed', assignedCaseId: null }),
        assignedCaseId: 'case-001',
      },
    }

    const nextState = advanceWeek(assigned)

    expect(nextState.cases['case-001'].status).toBe('resolved')
    expect(nextState.postIncidentReviewRecords?.['review:case-case-001-closeout']).toBeUndefined()
  })

  it('does not duplicate qualifying case closeout reviews on re-advance', () => {
    const state = makeQualifyingResolvedCaseState()

    const once = advanceWeek(state)
    const twice = advanceWeek(once)
    const created = once.postIncidentReviewRecords?.['review:case-case-001-closeout']

    expect(created).toBeDefined()
    expect(twice.postIncidentReviewRecords?.['review:case-case-001-closeout']).toBe(created)
  })
})
