import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { CaseInstance } from '../domain/models'
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
import { applyWeeklyPostIncidentReviewFollowOnArtifactTick } from '../domain/postIncidentReviewFollowOnArtifact'
import { getPostIncidentReviewMirrorView } from '../features/operations/postIncidentReviewMirrorView'
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
    expect(created?.unknownFields).toEqual([
      'follow_on:training-ref:threat-assessment',
      'orchestration_week:53',
    ])
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
        .filter(
          (event) =>
            'week' in event.payload &&
            typeof event.payload.week === 'number' &&
            event.payload.week === state.week
        )
        .map((event) => ({
          type: event.type,
          sourceSystem: event.sourceSystem,
          payload: event.payload,
        })),
      state.cases,
      nextState.week
    )
    const directReviewTick = applyWeeklyPostIncidentReviewFollowOnArtifactTick(
      state.postIncidentReviewRecords,
      applyWeeklyPostIncidentReviewCreationTick(
        state.postIncidentReviewRecords,
        directRecurrenceTick,
        nextState.week,
        qualifyingDrafts
      )
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
    expect(created?.unknownFields).toEqual([
      'follow_on:training-ref:threat-assessment',
      `orchestration_week:${nextState.week}`,
    ])

    const mirrorView = getPostIncidentReviewMirrorView(nextState)

    expect(mirrorView.hasQualifyingIncidentRecords).toBe(true)
    expect(mirrorView.summary.qualifyingCaseCloseoutCount).toBe(1)
    expect(mirrorView.summary.qualifyingNearCatastropheCount).toBe(0)
    expect(mirrorView.qualifyingIncidentRecords[0]?.id).toBe('review:case-case-001-closeout')
    expect(mirrorView.qualifyingIncidentRecords[0]?.sourceLabel).toBe('Qualifying case closeout')
    expect(mirrorView.qualifyingIncidentRecords[0]?.linkedCaseIdLabel).toBe('case-001')
    expect(mirrorView.qualifyingIncidentRecords[0]?.orchestrationWeekLabel).toBe(
      `W${nextState.week}`
    )
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

function suppressCaseSpawns(caseInstance: CaseInstance): CaseInstance {
  return {
    ...caseInstance,
    onFail: {
      ...caseInstance.onFail,
      spawnCount: { min: 0, max: 0 },
      spawnTemplateIds: [],
    },
    onUnresolved: {
      ...caseInstance.onUnresolved,
      spawnCount: { min: 0, max: 0 },
      spawnTemplateIds: [],
    },
  }
}

function makeNearCatastropheDeadlineEscalationState() {
  const state = createStartingState()
  state.rngSeed = 313
  state.rngState = 313
  state.recurrentCatastropheRecords = {}
  freezeCasesForQuietWeek(state)

  state.cases['case-001'] = suppressCaseSpawns({
    ...state.cases['case-001'],
    status: 'open',
    assignedTeamIds: [],
    stage: 1,
    deadlineRemaining: 1,
  })

  return state
}

function makeNonQualifyingDeadlineEscalationState() {
  const state = createStartingState()
  state.recurrentCatastropheRecords = {}
  freezeCasesForQuietWeek(state)

  state.cases['case-001'] = suppressCaseSpawns({
    ...state.cases['case-001'],
    status: 'open',
    assignedTeamIds: [],
    stage: 1,
    deadlineRemaining: 1,
    onUnresolved: {
      ...state.cases['case-001'].onUnresolved,
      stageDelta: 1,
      deadlineResetWeeks: 4,
      spawnCount: { min: 0, max: 0 },
      spawnTemplateIds: [],
    },
  })

  return state
}

function makeDualNearCatastropheDeadlineEscalationState() {
  const state = createStartingState()
  state.rngSeed = 314
  state.rngState = 314
  state.recurrentCatastropheRecords = {}
  freezeCasesForQuietWeek(state)

  for (const caseId of ['case-001', 'case-002'] as const) {
    state.cases[caseId] = suppressCaseSpawns({
      ...state.cases[caseId],
      status: 'open',
      assignedTeamIds: [],
      stage: 1,
      deadlineRemaining: 1,
    })
  }

  return state
}

describe('advanceWeek near-catastrophe review integration (SPE-868 slice 9)', () => {
  it('creates a near-catastrophe review when deadline escalation crosses the threshold', () => {
    const state = makeNearCatastropheDeadlineEscalationState()

    const nextState = advanceWeek(state)
    const created = nextState.postIncidentReviewRecords?.['review:near-catastrophe-case-001']

    expect(nextState.cases['case-001'].kind).toBe('raid')
    expect(nextState.cases['case-001'].stage).toBeGreaterThanOrEqual(3)
    expect(
      nextState.events.some(
        (event) => event.type === 'case.escalated' && event.payload.caseId === 'case-001'
      )
    ).toBe(true)
    expect(
      nextState.events.some(
        (event) => event.type === 'case.raid_converted' && event.payload.caseId === 'case-001'
      )
    ).toBe(true)
    expect(created?.label).toBe(
      'Near-catastrophe threshold review — ' + state.cases['case-001'].title
    )
    expect(created?.reviewRoute).toBe('external_audit')
    expect(created?.closureOutcome).toBe('administratively_cleared')
    expect(created?.milestoneTimings?.reportingWeek).toBe(nextState.week)
    expect(created?.unknownFields).toEqual([
      'follow_on:recommendation-stub:near-catastrophe-case-001',
      `orchestration_week:${nextState.week}`,
    ])

    const mirrorView = getPostIncidentReviewMirrorView(nextState)

    expect(mirrorView.hasQualifyingIncidentRecords).toBe(true)
    expect(mirrorView.summary.qualifyingNearCatastropheCount).toBe(1)
    expect(mirrorView.summary.qualifyingCaseCloseoutCount).toBe(0)
    expect(mirrorView.qualifyingIncidentRecords[0]?.id).toBe('review:near-catastrophe-case-001')
    expect(mirrorView.qualifyingIncidentRecords[0]?.sourceLabel).toBe('Near-catastrophe threshold')
    expect(mirrorView.qualifyingIncidentRecords[0]?.linkedCaseIdLabel).toBe('case-001')
    expect(mirrorView.qualifyingIncidentRecords[0]?.orchestrationWeekLabel).toBe(
      `W${nextState.week}`
    )
  })

  it('does not create a near-catastrophe review when escalation stays below the threshold', () => {
    const state = makeNonQualifyingDeadlineEscalationState()

    const nextState = advanceWeek(state)

    expect(nextState.cases['case-001'].stage).toBe(2)
    expect(nextState.postIncidentReviewRecords?.['review:near-catastrophe-case-001']).toBeUndefined()

    const mirrorView = getPostIncidentReviewMirrorView(nextState)

    expect(mirrorView.summary.qualifyingNearCatastropheCount).toBe(0)
    expect(mirrorView.summary.qualifyingCaseCloseoutCount).toBe(0)
  })

  it('does not duplicate near-catastrophe reviews on re-advance', () => {
    const state = makeNearCatastropheDeadlineEscalationState()

    const once = advanceWeek(state)
    const twice = advanceWeek(once)
    const created = once.postIncidentReviewRecords?.['review:near-catastrophe-case-001']

    expect(created).toBeDefined()
    expect(twice.postIncidentReviewRecords?.['review:near-catastrophe-case-001']).toBe(created)
  })

  it('orders qualifying near-catastrophe mirror rows by stable record id', () => {
    const state = makeDualNearCatastropheDeadlineEscalationState()

    const nextState = advanceWeek(state)
    const mirrorView = getPostIncidentReviewMirrorView(nextState)
    const qualifyingIds = mirrorView.qualifyingIncidentRecords.map((record) => record.id)

    expect(qualifyingIds).toEqual([
      'review:near-catastrophe-case-001',
      'review:near-catastrophe-case-002',
    ])
    expect(qualifyingIds).toEqual([...qualifyingIds].sort((left, right) => left.localeCompare(right)))
    expect(mirrorView.summary.qualifyingNearCatastropheCount).toBe(2)
  })

  it('matches direct review creation for near-catastrophe escalation week', () => {
    const state = makeNearCatastropheDeadlineEscalationState()

    const nextState = advanceWeek(state)
    const qualifyingDrafts = resolveQualifyingIncidentReviewDraftsFromEventDrafts(
      nextState.events
        .filter(
          (event) =>
            'week' in event.payload &&
            typeof event.payload.week === 'number' &&
            event.payload.week === state.week
        )
        .map((event) => ({
          type: event.type,
          sourceSystem: event.sourceSystem,
          payload: event.payload,
        })),
      state.cases,
      nextState.week
    )
    const directReviewTick = applyWeeklyPostIncidentReviewFollowOnArtifactTick(
      state.postIncidentReviewRecords,
      applyWeeklyPostIncidentReviewCreationTick(
        state.postIncidentReviewRecords,
        state.recurrentCatastropheRecords,
        nextState.week,
        qualifyingDrafts
      )
    )

    expect(nextState.postIncidentReviewRecords?.['review:near-catastrophe-case-001']).toEqual(
      directReviewTick['review:near-catastrophe-case-001']
    )
  })
})

describe('advanceWeek post-incident review follow-on artifact integration (SPE-868 slice 10)', () => {
  it('leaves stub registry reviews without follow-on artifacts on a quiet week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.recurrentCatastropheRecords = {}

    const nextState = advanceWeek(state)

    expect(
      nextState.postIncidentReviewRecords?.[RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]?.unknownFields
    ).toBeUndefined()
  })

  it('does not append follow-on artifacts when no qualifying review materializes', () => {
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

    expect(nextState.postIncidentReviewRecords?.['review:case-case-001-closeout']).toBeUndefined()
  })
})
