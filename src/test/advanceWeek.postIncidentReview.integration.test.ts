import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { CaseInstance } from '../domain/models'
import {
  derivePostIncidentMilestoneTimings,
  projectPostIncidentReviewSummary,
  RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
  type PostIncidentMilestoneTimings,
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
import { applyWeeklyPostIncidentReviewCloseoutRewardBranchTick } from '../domain/postIncidentReviewCloseoutRewardBranch'
import { applyWeeklyPostIncidentReviewFollowOnArtifactTick } from '../domain/postIncidentReviewFollowOnArtifact'
import {
  formatPostIncidentReviewEnumLabel,
  getPostIncidentReviewMirrorView,
  type PostIncidentReviewMirrorRecordView,
} from '../features/operations/postIncidentReviewMirrorView'
import { getPostIncidentReviewRecommendationActionMirrorView } from '../features/operations/postIncidentReviewRecommendationActionMirrorView'
import { getPostIncidentReviewRecommendationMirrorView } from '../features/operations/postIncidentReviewRecommendationMirrorView'
import { applyWeeklyRecurrentCatastropheTick } from '../domain/recurrentCatastropheWeeklyOrchestration'
import type { PostIncidentReviewRecordsMap } from '../domain/postIncidentReviewRegistry'
import type { RecurrentCatastropheRecordsMap } from '../domain/recurrentCatastropheAmeliorationRegistry'
import type { QualifyingIncidentReviewDraft } from '../domain/postIncidentReviewWeeklyOrchestration'

function applyDirectPostIncidentReviewTicks(
  priorReviews: PostIncidentReviewRecordsMap | undefined,
  catastrophes: RecurrentCatastropheRecordsMap | undefined,
  week: number,
  qualifyingDrafts: readonly QualifyingIncidentReviewDraft[]
): PostIncidentReviewRecordsMap {
  const created = applyWeeklyPostIncidentReviewCreationTick(
    priorReviews,
    catastrophes,
    week,
    qualifyingDrafts
  )
  const withRewardBranch = applyWeeklyPostIncidentReviewCloseoutRewardBranchTick(
    priorReviews,
    created
  )

  return applyWeeklyPostIncidentReviewFollowOnArtifactTick(priorReviews, withRewardBranch)
}

function formatExpectedMilestoneWeekLabel(week: number | undefined): string {
  if (week === undefined) {
    return '—'
  }

  return `W${week}`
}

function expectMilestoneMirrorLabels(
  record: PostIncidentReviewMirrorRecordView | undefined,
  milestoneTimings: PostIncidentMilestoneTimings,
  milestoneSpanWeeks: number | null
): void {
  expect(record?.discoveryWeekLabel).toBe(
    formatExpectedMilestoneWeekLabel(milestoneTimings.discoveryWeek)
  )
  expect(record?.responseWeekLabel).toBe(
    formatExpectedMilestoneWeekLabel(milestoneTimings.responseWeek)
  )
  expect(record?.containmentWeekLabel).toBe(
    formatExpectedMilestoneWeekLabel(milestoneTimings.containmentWeek)
  )
  expect(record?.recoveryWeekLabel).toBe(
    formatExpectedMilestoneWeekLabel(milestoneTimings.recoveryWeek)
  )
  expect(record?.reportingWeekLabel).toBe(
    formatExpectedMilestoneWeekLabel(milestoneTimings.reportingWeek)
  )
  expect(record?.milestoneSpanWeeksLabel).toBe(
    milestoneSpanWeeks === null ? '—' : String(milestoneSpanWeeks)
  )
}

function expectRedactedMilestoneMirrorLabels(
  record: PostIncidentReviewMirrorRecordView | undefined
): void {
  expect(record?.discoveryWeekLabel).toBe('—')
  expect(record?.responseWeekLabel).toBe('—')
  expect(record?.containmentWeekLabel).toBe('—')
  expect(record?.recoveryWeekLabel).toBe('—')
  expect(record?.reportingWeekLabel).toBe('—')
  expect(record?.milestoneSpanWeeksLabel).toBe('—')
}

function expectRedactedScoreMirrorLabels(
  record: PostIncidentReviewMirrorRecordView | undefined
): void {
  expect(record?.procedureAdherenceScoreLabel).toBe('—')
  expect(record?.confidenceLabel).toBe('—')
}

function expectRecurrenceComplianceMirrorLabels(
  record: PostIncidentReviewMirrorRecordView | undefined,
  expected: {
    reviewRouteLabel: string
    closureOutcomeLabel: string
    recurrenceObservedLabel: string
  }
): void {
  expect(record?.reviewRouteLabel).toBe(expected.reviewRouteLabel)
  expect(record?.closureOutcomeLabel).toBe(expected.closureOutcomeLabel)
  expect(record?.recurrenceObservedLabel).toBe(expected.recurrenceObservedLabel)
}

function expectRedactedRecurrenceObservedMirrorLabel(
  record: PostIncidentReviewMirrorRecordView | undefined
): void {
  expect(record?.recurrenceObservedLabel).toBe('—')
}

function expectRedactedReviewRouteClosureOutcomeMirrorLabels(
  record: PostIncidentReviewMirrorRecordView | undefined
): void {
  expect(record?.reviewRouteLabel).toBe('—')
  expect(record?.closureOutcomeLabel).toBe('—')
}

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

function stateWithFollowOnTrainingEnqueueReady<T extends ReturnType<typeof createStartingState>>(state: T): T {
  return {
    ...state,
    academyTier: 1,
    funding: Math.max(state.funding, 200),
  }
}

function stateWithRecommendationActionReady<T extends ReturnType<typeof createStartingState>>(state: T): T {
  return {
    ...state,
    academyTier: 1,
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
    const state = stateWithFollowOnTrainingEnqueueReady(createStartingState())
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
    expect(created?.milestoneTimings).toEqual(
      derivePostIncidentMilestoneTimings('cycle_closeout', nextState.week)
    )
    expect(created?.unknownFields).toEqual([
      'follow_on:training-ref:threat-assessment',
      'orchestration_week:53',
      'reward_branch:recurrence_softening',
    ])
    expect(nextState.trainingQueue).toHaveLength(1)
    expect(nextState.trainingQueue[0]?.trainingId).toBe('threat-assessment')
    expect(nextState.trainingQueue[0]?.agentId).toBe('a_ava')
    expect(nextState.postIncidentReviewRecommendationRecords).toEqual({})
    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const followOnNotes =
      weeklyReport?.notes.filter((note) => note.content.startsWith('Post-incident follow-on —')) ?? []
    expect(followOnNotes).toHaveLength(1)
    expect(followOnNotes[0]?.type).toBe('post_incident_review.follow_on')
    expect(followOnNotes[0]?.content).toContain('training reference (threat assessment)')
    expect(nextState.postIncidentReviewRecords?.[RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]).toEqual(
      RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE
    )

    const mirrorView = getPostIncidentReviewMirrorView(nextState)
    const cycleMirrorRecord = mirrorView.records.find(
      (record) => record.id === 'review:cycle-4-closeout'
    )

    expectMilestoneMirrorLabels(
      cycleMirrorRecord,
      created!.milestoneTimings!,
      projectPostIncidentReviewSummary(created!).milestoneSpanWeeks
    )
    expectRecurrenceComplianceMirrorLabels(cycleMirrorRecord, {
      reviewRouteLabel: 'Internal Command',
      closureOutcomeLabel: 'Contained',
      recurrenceObservedLabel: 'Yes',
    })
    expect(created?.recurrenceObserved).toBe(true)
    expect(mirrorView.summary.recurrenceObservedCount).toBe(2)
    expect(mirrorView.summary.externalAuditRouteCount).toBe(1)
  })

  it('renders redacted milestoneTimings mirror labels on cycle-4 closeout path (SPE-868 slice 23)', () => {
    const state = stateWithFollowOnTrainingEnqueueReady(createStartingState())
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

    expect(created?.milestoneTimings).toBeDefined()

    nextState.postIncidentReviewRecords = {
      ...nextState.postIncidentReviewRecords,
      'review:cycle-4-closeout': {
        ...created!,
        redactedFields: ['milestoneTimings'],
      },
    }

    const mirrorView = getPostIncidentReviewMirrorView(nextState)
    const cycleMirrorRecord = mirrorView.records.find(
      (record) => record.id === 'review:cycle-4-closeout'
    )

    expectRedactedMilestoneMirrorLabels(cycleMirrorRecord)
    expect(cycleMirrorRecord?.redacted).toBe(true)
    expect(cycleMirrorRecord?.discoveryWeekLabel).not.toBe(
      formatExpectedMilestoneWeekLabel(created!.milestoneTimings!.discoveryWeek)
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
    const directReviewTick = applyDirectPostIncidentReviewTicks(
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
  const state = stateWithFollowOnTrainingEnqueueReady(createStartingState())
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
    expect(created?.milestoneTimings).toEqual(
      derivePostIncidentMilestoneTimings('case_closeout', nextState.week)
    )
    expect(created?.unknownFields).toEqual([
      'follow_on:training-ref:threat-assessment',
      `orchestration_week:${nextState.week}`,
      'reward_branch:containment_priority',
    ])
    expect(nextState.trainingQueue).toHaveLength(1)
    expect(nextState.trainingQueue[0]?.trainingId).toBe('threat-assessment')
    expect(nextState.trainingQueue[0]?.agentId).toBe('a_ava')

    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const followOnNotes =
      weeklyReport?.notes.filter((note) => note.content.startsWith('Post-incident follow-on —')) ?? []
    expect(followOnNotes).toHaveLength(1)
    expect(followOnNotes[0]?.type).toBe('post_incident_review.follow_on')
    expect(followOnNotes[0]?.content).toContain(created?.label ?? '')
    expect(followOnNotes[0]?.content).toContain('training reference (threat assessment)')

    const mirrorView = getPostIncidentReviewMirrorView(nextState)

    expect(mirrorView.hasQualifyingIncidentRecords).toBe(true)
    expect(mirrorView.summary.qualifyingCaseCloseoutCount).toBe(1)
    expect(mirrorView.summary.qualifyingNearCatastropheCount).toBe(0)
    expect(mirrorView.qualifyingIncidentRecords[0]?.id).toBe('review:case-case-001-closeout')
    expect(mirrorView.qualifyingIncidentRecords[0]?.closeoutRewardBranchLabel).toBe(
      'Containment Priority'
    )
    expect(mirrorView.qualifyingIncidentRecords[0]?.sourceLabel).toBe('Qualifying case closeout')
    expect(mirrorView.qualifyingIncidentRecords[0]?.linkedCaseIdLabel).toBe('case-001')
    expect(mirrorView.qualifyingIncidentRecords[0]?.orchestrationWeekLabel).toBe(
      `W${nextState.week}`
    )
    expectMilestoneMirrorLabels(
      mirrorView.qualifyingIncidentRecords[0],
      created!.milestoneTimings!,
      projectPostIncidentReviewSummary(created!).milestoneSpanWeeks
    )
    expectRecurrenceComplianceMirrorLabels(mirrorView.qualifyingIncidentRecords[0], {
      reviewRouteLabel: 'Internal Command',
      closureOutcomeLabel: 'Contained',
      recurrenceObservedLabel: 'No',
    })
    expect(created?.recurrenceObserved).toBe(false)
    expect(mirrorView.summary.recurrenceObservedCount).toBe(1)
    expect(mirrorView.summary.externalAuditRouteCount).toBe(1)
  })

  it('renders redacted milestoneTimings mirror labels on qualifying case closeout path (SPE-868 slice 24)', () => {
    const state = makeQualifyingResolvedCaseState()

    const nextState = advanceWeek(state)
    const created = nextState.postIncidentReviewRecords?.['review:case-case-001-closeout']

    expect(created?.milestoneTimings).toBeDefined()

    nextState.postIncidentReviewRecords = {
      ...nextState.postIncidentReviewRecords,
      'review:case-case-001-closeout': {
        ...created!,
        redactedFields: ['milestoneTimings'],
      },
    }

    const mirrorView = getPostIncidentReviewMirrorView(nextState)
    const mirrorRecord = mirrorView.qualifyingIncidentRecords[0]

    expectRedactedMilestoneMirrorLabels(mirrorRecord)
    expect(mirrorRecord?.redacted).toBe(true)
    expect(mirrorRecord?.discoveryWeekLabel).not.toBe(
      formatExpectedMilestoneWeekLabel(created!.milestoneTimings!.discoveryWeek)
    )
  })

  it('renders redacted score mirror labels on qualifying case closeout path (SPE-868 slice 25)', () => {
    const state = makeQualifyingResolvedCaseState()

    const nextState = advanceWeek(state)
    const created = nextState.postIncidentReviewRecords?.['review:case-case-001-closeout']

    expect(created?.procedureAdherenceScore).toBe(0.68)
    expect(created?.confidence).toBe(0.72)

    const beforeMirror = getPostIncidentReviewMirrorView(nextState)
    const beforeRecord = beforeMirror.qualifyingIncidentRecords[0]

    expect(beforeRecord?.procedureAdherenceScoreLabel).toBe('0.68')
    expect(beforeRecord?.confidenceLabel).toBe('0.72')
    expect(beforeRecord?.redacted).toBe(false)

    nextState.postIncidentReviewRecords = {
      ...nextState.postIncidentReviewRecords,
      'review:case-case-001-closeout': {
        ...created!,
        redactedFields: ['procedureAdherenceScore', 'confidence'],
      },
    }

    const mirrorView = getPostIncidentReviewMirrorView(nextState)
    const mirrorRecord = mirrorView.qualifyingIncidentRecords[0]

    expectRedactedScoreMirrorLabels(mirrorRecord)
    expect(mirrorRecord?.redacted).toBe(true)
    expect(mirrorRecord?.procedureAdherenceScoreLabel).not.toBe('0.68')
    expect(mirrorRecord?.confidenceLabel).not.toBe('0.72')
    expectMilestoneMirrorLabels(
      mirrorRecord,
      created!.milestoneTimings!,
      projectPostIncidentReviewSummary(created!).milestoneSpanWeeks
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

    const onceReport = once.reports[once.reports.length - 1]
    const twiceReport = twice.reports[twice.reports.length - 1]
    const onceFollowOnNotes =
      onceReport?.notes.filter((note) => note.content.startsWith('Post-incident follow-on —')) ?? []
    const twiceFollowOnNotes =
      twiceReport?.notes.filter((note) => note.content.startsWith('Post-incident follow-on —')) ?? []
    expect(onceFollowOnNotes).toHaveLength(1)
    expect(twiceFollowOnNotes).toHaveLength(0)
    expect(once.trainingQueue).toHaveLength(1)
    expect(twice.trainingQueue).toHaveLength(1)
    expect(twice.trainingQueue[0]?.id).toBe(once.trainingQueue[0]?.id)
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

function makeNearCatastropheDeadlineEscalationStateWithRecommendationActionReady() {
  return stateWithRecommendationActionReady(makeNearCatastropheDeadlineEscalationState())
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

function makeDualNearCatastropheDeadlineEscalationStateWithRecommendationActionReady() {
  return stateWithRecommendationActionReady(makeDualNearCatastropheDeadlineEscalationState())
}

function makeDualPathCloseoutAndNearCatastropheState() {
  const state = stateWithFollowOnTrainingEnqueueReady(createStartingState())
  state.rngSeed = 315
  state.rngState = 315
  state.recurrentCatastropheRecords = {}

  for (const currentCase of Object.values(state.cases)) {
    if (currentCase.id !== 'case-001' && currentCase.id !== 'case-002') {
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

  state.cases['case-002'] = suppressCaseSpawns({
    ...state.cases['case-002'],
    status: 'open',
    assignedTeamIds: [],
    stage: 1,
    deadlineRemaining: 1,
  })

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
    expect(created?.milestoneTimings).toEqual(
      derivePostIncidentMilestoneTimings('near_catastrophe', nextState.week)
    )
    expect(created?.unknownFields).toEqual([
      'follow_on:recommendation-stub:near-catastrophe-case-001',
      `orchestration_week:${nextState.week}`,
      'reward_branch:threshold_mitigation',
    ])

    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const followOnNotes =
      weeklyReport?.notes.filter((note) => note.content.startsWith('Post-incident follow-on —')) ?? []
    expect(followOnNotes).toHaveLength(1)
    expect(followOnNotes[0]?.type).toBe('post_incident_review.follow_on')
    expect(followOnNotes[0]?.content).toContain('recommendation stub (near catastrophe case 001)')
    expect(nextState.trainingQueue).toHaveLength(0)
    expect(nextState.postIncidentReviewRecommendationRecords?.['recommendation:near-catastrophe-case-001']).toMatchObject({
      reviewRef: 'review:near-catastrophe-case-001',
      stubSuffix: 'near-catastrophe-case-001',
      followOnToken: 'follow_on:recommendation-stub:near-catastrophe-case-001',
      orchestrationWeek: nextState.week,
    })

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
    expectMilestoneMirrorLabels(
      mirrorView.qualifyingIncidentRecords[0],
      created!.milestoneTimings!,
      projectPostIncidentReviewSummary(created!).milestoneSpanWeeks
    )
    expectRecurrenceComplianceMirrorLabels(mirrorView.qualifyingIncidentRecords[0], {
      reviewRouteLabel: 'External Audit',
      closureOutcomeLabel: 'Administratively Cleared',
      recurrenceObservedLabel: 'No',
    })
    expect(created?.recurrenceObserved).toBe(false)
    expect(mirrorView.summary.recurrenceObservedCount).toBe(1)
    expect(mirrorView.summary.externalAuditRouteCount).toBe(2)
  })

  it('renders redacted milestoneTimings mirror labels on near-catastrophe path (SPE-868 slice 24)', () => {
    const state = makeNearCatastropheDeadlineEscalationState()

    const nextState = advanceWeek(state)
    const created = nextState.postIncidentReviewRecords?.['review:near-catastrophe-case-001']

    expect(created?.milestoneTimings).toBeDefined()

    const beforeMirror = getPostIncidentReviewMirrorView(nextState)
    const beforeRecord = beforeMirror.qualifyingIncidentRecords[0]

    expect(beforeRecord?.discoveryWeekLabel).toBe(
      formatExpectedMilestoneWeekLabel(created!.milestoneTimings!.discoveryWeek)
    )
    expect(beforeRecord?.responseWeekLabel).toBe(
      formatExpectedMilestoneWeekLabel(created!.milestoneTimings!.responseWeek)
    )
    expect(beforeRecord?.containmentWeekLabel).toBe('—')
    expect(beforeRecord?.recoveryWeekLabel).toBe('—')
    expect(beforeRecord?.reportingWeekLabel).toBe(
      formatExpectedMilestoneWeekLabel(created!.milestoneTimings!.reportingWeek)
    )
    expect(beforeRecord?.redacted).toBe(false)

    nextState.postIncidentReviewRecords = {
      ...nextState.postIncidentReviewRecords,
      'review:near-catastrophe-case-001': {
        ...created!,
        redactedFields: ['milestoneTimings'],
      },
    }

    const mirrorView = getPostIncidentReviewMirrorView(nextState)
    const mirrorRecord = mirrorView.qualifyingIncidentRecords[0]

    expectRedactedMilestoneMirrorLabels(mirrorRecord)
    expect(mirrorRecord?.redacted).toBe(true)
    expect(mirrorRecord?.discoveryWeekLabel).not.toBe(
      formatExpectedMilestoneWeekLabel(created!.milestoneTimings!.discoveryWeek)
    )
  })

  it('renders redacted score mirror labels on near-catastrophe path (SPE-868 slice 25)', () => {
    const state = makeNearCatastropheDeadlineEscalationState()

    const nextState = advanceWeek(state)
    const created = nextState.postIncidentReviewRecords?.['review:near-catastrophe-case-001']

    expect(created?.procedureAdherenceScore).toBe(0.55)
    expect(created?.confidence).toBe(0.61)

    const beforeMirror = getPostIncidentReviewMirrorView(nextState)
    const beforeRecord = beforeMirror.qualifyingIncidentRecords[0]

    expect(beforeRecord?.procedureAdherenceScoreLabel).toBe('0.55')
    expect(beforeRecord?.confidenceLabel).toBe('0.61')
    expect(beforeRecord?.redacted).toBe(false)
    expect(beforeRecord?.discoveryWeekLabel).toBe(
      formatExpectedMilestoneWeekLabel(created!.milestoneTimings!.discoveryWeek)
    )
    expect(beforeRecord?.containmentWeekLabel).toBe('—')
    expect(beforeRecord?.recoveryWeekLabel).toBe('—')
    expect(beforeRecord?.reportingWeekLabel).toBe(
      formatExpectedMilestoneWeekLabel(created!.milestoneTimings!.reportingWeek)
    )

    nextState.postIncidentReviewRecords = {
      ...nextState.postIncidentReviewRecords,
      'review:near-catastrophe-case-001': {
        ...created!,
        redactedFields: ['procedureAdherenceScore', 'confidence'],
      },
    }

    const mirrorView = getPostIncidentReviewMirrorView(nextState)
    const mirrorRecord = mirrorView.qualifyingIncidentRecords[0]

    expectRedactedScoreMirrorLabels(mirrorRecord)
    expect(mirrorRecord?.redacted).toBe(true)
    expect(mirrorRecord?.procedureAdherenceScoreLabel).not.toBe('0.55')
    expect(mirrorRecord?.confidenceLabel).not.toBe('0.61')
    expect(mirrorRecord?.discoveryWeekLabel).toBe(beforeRecord?.discoveryWeekLabel)
    expect(mirrorRecord?.responseWeekLabel).toBe(beforeRecord?.responseWeekLabel)
    expect(mirrorRecord?.containmentWeekLabel).toBe('—')
    expect(mirrorRecord?.recoveryWeekLabel).toBe('—')
    expect(mirrorRecord?.reportingWeekLabel).toBe(beforeRecord?.reportingWeekLabel)
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
    expect(twice.postIncidentReviewRecommendationRecords).toEqual(
      once.postIncidentReviewRecommendationRecords
    )
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
    const directReviewTick = applyDirectPostIncidentReviewTicks(
      state.postIncidentReviewRecords,
      state.recurrentCatastropheRecords,
      nextState.week,
      qualifyingDrafts
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

    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const followOnNotes =
      weeklyReport?.notes.filter((note) => note.content.startsWith('Post-incident follow-on —')) ?? []
    expect(followOnNotes).toHaveLength(0)
  })
})

describe('advanceWeek post-incident follow-on training enqueue integration (SPE-868 slice 13)', () => {
  it('enqueues threat assessment when qualifying case closeout materializes', () => {
    const state = makeQualifyingResolvedCaseState()

    const nextState = advanceWeek(state)

    expect(nextState.trainingQueue).toHaveLength(1)
    expect(nextState.trainingQueue[0]?.trainingId).toBe('threat-assessment')
    expect(nextState.trainingQueue[0]?.agentId).toBe('a_ava')
    expect(
      nextState.events.some(
        (event) =>
          event.type === 'agent.training_started' &&
          event.payload.trainingId === 'threat-assessment'
      )
    ).toBe(true)
  })

  it('does not enqueue follow-on training when academy tier blocks the referenced program', () => {
    const state = makeQualifyingResolvedCaseState()
    state.academyTier = 0

    const nextState = advanceWeek(state)

    expect(nextState.postIncidentReviewRecords?.['review:case-case-001-closeout']).toBeDefined()
    expect(nextState.trainingQueue).toHaveLength(0)
    expect(nextState.postIncidentReviewRecommendationRecords).toEqual({})
  })
})

describe('advanceWeek post-incident recommendation registry integration (SPE-868 slice 14)', () => {
  it('leaves recommendation registry empty on a quiet week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.recurrentCatastropheRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.postIncidentReviewRecommendationRecords ?? {}).toEqual({})
  })

  it('persists recommendation stub for near-catastrophe without enqueueing training', () => {
    const state = makeNearCatastropheDeadlineEscalationState()

    const nextState = advanceWeek(state)

    expect(nextState.trainingQueue).toHaveLength(0)
    expect(nextState.postIncidentReviewRecommendationRecords?.['recommendation:near-catastrophe-case-001']).toMatchObject({
      reviewRef: 'review:near-catastrophe-case-001',
      followOnToken: 'follow_on:recommendation-stub:near-catastrophe-case-001',
    })
  })

  it('does not duplicate recommendation records on re-advance', () => {
    const state = makeNearCatastropheDeadlineEscalationState()

    const once = advanceWeek(state)
    const twice = advanceWeek(once)

    expect(twice.postIncidentReviewRecommendationRecords).toEqual(
      once.postIncidentReviewRecommendationRecords
    )
  })
})

describe('advanceWeek post-incident recommendation mirror integration (SPE-868 slice 16)', () => {
  it('returns empty recommendation mirror before qualifying reviews materialize', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.recurrentCatastropheRecords = {}

    const mirrorView = getPostIncidentReviewRecommendationMirrorView(state)

    expect(mirrorView.isEmpty).toBe(true)
    expect(mirrorView.hasLinkedQualifyingReviews).toBe(false)
    expect(mirrorView.summary.totalRecords).toBe(0)
    expect(mirrorView.summary.linkedQualifyingReviewCount).toBe(0)
    expect(mirrorView.linkedQualifyingRecords).toEqual([])
    expect(mirrorView.records).toEqual([])
  })

  it('mirrors linked qualifying rows after near-catastrophe advance', () => {
    const state = makeNearCatastropheDeadlineEscalationState()

    const nextState = advanceWeek(state)
    const mirrorView = getPostIncidentReviewRecommendationMirrorView(nextState)
    const record = mirrorView.records[0]

    expect(nextState.postIncidentReviewRecommendationRecords?.['recommendation:near-catastrophe-case-001']).toMatchObject({
      reviewRef: 'review:near-catastrophe-case-001',
      stubSuffix: 'near-catastrophe-case-001',
      orchestrationWeek: nextState.week,
    })
    expect(mirrorView.isEmpty).toBe(false)
    expect(mirrorView.hasLinkedQualifyingReviews).toBe(true)
    expect(mirrorView.summary.totalRecords).toBe(1)
    expect(mirrorView.summary.linkedQualifyingReviewCount).toBe(1)
    expect(mirrorView.linkedQualifyingRecords).toHaveLength(1)
    expect(record?.id).toBe('recommendation:near-catastrophe-case-001')
    expect(record?.reviewRefLabel).toBe('review:near-catastrophe-case-001')
    expect(record?.stubSuffixLabel).toBe('near-catastrophe-case-001')
    expect(record?.orchestrationWeekLabel).toBe(`W${nextState.week}`)
    expect(record?.linkedQualifyingReview).toMatchObject({
      reviewRef: 'review:near-catastrophe-case-001',
      sourceLabel: 'Near-catastrophe threshold',
      linkedCaseIdLabel: 'case-001',
      orchestrationWeekLabel: `W${nextState.week}`,
    })
  })

  it('only appends recommendation registry on dual-path tick when closeout uses training-ref', () => {
    const state = makeDualPathCloseoutAndNearCatastropheState()

    const nextState = advanceWeek(state)
    const mirrorView = getPostIncidentReviewRecommendationMirrorView(nextState)

    expect(nextState.cases['case-001'].status).toBe('resolved')
    expect(nextState.postIncidentReviewRecords?.['review:case-case-001-closeout']).toBeDefined()
    expect(nextState.postIncidentReviewRecords?.['review:near-catastrophe-case-002']).toBeDefined()
    expect(nextState.trainingQueue).toHaveLength(1)
    expect(nextState.trainingQueue[0]?.trainingId).toBe('threat-assessment')
    expect(Object.keys(nextState.postIncidentReviewRecommendationRecords ?? {})).toEqual([
      'recommendation:near-catastrophe-case-002',
    ])
    expect(
      nextState.postIncidentReviewRecommendationRecords?.['recommendation:case-case-001-closeout']
    ).toBeUndefined()
    expect(mirrorView.summary.totalRecords).toBe(1)
    expect(mirrorView.summary.linkedQualifyingReviewCount).toBe(1)
    expect(mirrorView.records[0]?.linkedQualifyingReview).toMatchObject({
      reviewRef: 'review:near-catastrophe-case-002',
      linkedCaseIdLabel: 'case-002',
      sourceLabel: 'Near-catastrophe threshold',
    })
  })

  it('does not duplicate recommendation mirror rows on re-advance', () => {
    const state = makeNearCatastropheDeadlineEscalationState()

    const once = advanceWeek(state)
    const twice = advanceWeek(once)
    const onceMirror = getPostIncidentReviewRecommendationMirrorView(once)
    const twiceMirror = getPostIncidentReviewRecommendationMirrorView(twice)

    expect(twiceMirror.records).toEqual(onceMirror.records)
    expect(twiceMirror.linkedQualifyingRecords).toEqual(onceMirror.linkedQualifyingRecords)
    expect(twiceMirror.summary.totalRecords).toBe(onceMirror.summary.totalRecords)
    expect(twiceMirror.summary.linkedQualifyingReviewCount).toBe(
      onceMirror.summary.linkedQualifyingReviewCount
    )
    expect(twiceMirror.summary.week).toBe(once.week + 1)
  })

  it('orders recommendation mirror rows by stable record id when multiple qualify', () => {
    const state = makeDualNearCatastropheDeadlineEscalationState()

    const nextState = advanceWeek(state)
    const mirrorView = getPostIncidentReviewRecommendationMirrorView(nextState)
    const recommendationIds = mirrorView.records.map((record) => record.id)

    expect(recommendationIds).toEqual([
      'recommendation:near-catastrophe-case-001',
      'recommendation:near-catastrophe-case-002',
    ])
    expect(recommendationIds).toEqual(
      [...recommendationIds].sort((left, right) => left.localeCompare(right))
    )
    expect(mirrorView.summary.totalRecords).toBe(2)
    expect(mirrorView.summary.linkedQualifyingReviewCount).toBe(2)
    expect(mirrorView.linkedQualifyingRecords).toHaveLength(2)
  })
})

describe('advanceWeek post-incident recommendation action integration (SPE-868 slice 17)', () => {
  it('leaves recommendation action registry empty on a quiet week', () => {
    const state = stateWithRecommendationActionReady(createStartingState())
    freezeCasesForQuietWeek(state)
    state.recurrentCatastropheRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.postIncidentReviewRecommendationActionRecords ?? {}).toEqual({})
  })

  it('materializes action stub linked to recommendation after near-catastrophe advance', () => {
    const state = makeNearCatastropheDeadlineEscalationStateWithRecommendationActionReady()

    const nextState = advanceWeek(state)

    expect(nextState.postIncidentReviewRecommendationRecords?.['recommendation:near-catastrophe-case-001']).toMatchObject({
      reviewRef: 'review:near-catastrophe-case-001',
      stubSuffix: 'near-catastrophe-case-001',
    })
    expect(nextState.postIncidentReviewRecommendationActionRecords?.['action:near-catastrophe-case-001']).toMatchObject({
      recommendationRef: 'recommendation:near-catastrophe-case-001',
      reviewRef: 'review:near-catastrophe-case-001',
      actionToken: 'follow_on:action-stub:near-catastrophe-case-001',
      orchestrationWeek: nextState.week,
    })
    expect(nextState.trainingQueue).toHaveLength(0)
  })

  it('does not materialize recommendation actions when academy tier blocks institutional follow-through', () => {
    const state = makeNearCatastropheDeadlineEscalationState()
    state.academyTier = 0

    const nextState = advanceWeek(state)

    expect(nextState.postIncidentReviewRecommendationRecords?.['recommendation:near-catastrophe-case-001']).toBeDefined()
    expect(nextState.postIncidentReviewRecommendationActionRecords ?? {}).toEqual({})
  })

  it('only appends recommendation action on dual-path tick when closeout uses training-ref', () => {
    const state = makeDualPathCloseoutAndNearCatastropheState()

    const nextState = advanceWeek(state)

    expect(nextState.trainingQueue).toHaveLength(1)
    expect(nextState.trainingQueue[0]?.trainingId).toBe('threat-assessment')
    expect(Object.keys(nextState.postIncidentReviewRecommendationRecords ?? {})).toEqual([
      'recommendation:near-catastrophe-case-002',
    ])
    expect(Object.keys(nextState.postIncidentReviewRecommendationActionRecords ?? {})).toEqual([
      'action:near-catastrophe-case-002',
    ])
    expect(
      nextState.postIncidentReviewRecommendationActionRecords?.['action:case-case-001-closeout']
    ).toBeUndefined()
  })

  it('does not duplicate recommendation action records on re-advance', () => {
    const state = makeNearCatastropheDeadlineEscalationStateWithRecommendationActionReady()

    const once = advanceWeek(state)
    const twice = advanceWeek(once)

    expect(twice.postIncidentReviewRecommendationActionRecords).toBe(
      once.postIncidentReviewRecommendationActionRecords
    )
    expect(Object.keys(twice.postIncidentReviewRecommendationActionRecords ?? {})).toHaveLength(1)
  })

  it('orders recommendation action records by stable id when multiple qualify', () => {
    const state = makeDualNearCatastropheDeadlineEscalationStateWithRecommendationActionReady()

    const nextState = advanceWeek(state)
    const actionIds = Object.keys(nextState.postIncidentReviewRecommendationActionRecords ?? {})

    expect(actionIds).toEqual([
      'action:near-catastrophe-case-001',
      'action:near-catastrophe-case-002',
    ])
    expect(actionIds).toEqual([...actionIds].sort((left, right) => left.localeCompare(right)))
  })
})

describe('advanceWeek post-incident recommendation action mirror integration (SPE-868 slice 19)', () => {
  it('returns empty action mirror before qualifying reviews materialize', () => {
    const state = stateWithRecommendationActionReady(createStartingState())
    freezeCasesForQuietWeek(state)
    state.recurrentCatastropheRecords = {}

    const mirrorView = getPostIncidentReviewRecommendationActionMirrorView(state)

    expect(mirrorView.isEmpty).toBe(true)
    expect(mirrorView.hasLinkedRecommendations).toBe(false)
    expect(mirrorView.hasLinkedQualifyingReviews).toBe(false)
    expect(mirrorView.summary.totalRecords).toBe(0)
    expect(mirrorView.summary.linkedRecommendationCount).toBe(0)
    expect(mirrorView.summary.linkedQualifyingReviewCount).toBe(0)
    expect(mirrorView.linkedQualifyingRecords).toEqual([])
    expect(mirrorView.records).toEqual([])
  })

  it('mirrors linked recommendation and qualifying rows after near-catastrophe advance', () => {
    const state = makeNearCatastropheDeadlineEscalationStateWithRecommendationActionReady()

    const nextState = advanceWeek(state)
    const mirrorView = getPostIncidentReviewRecommendationActionMirrorView(nextState)
    const record = mirrorView.records[0]

    expect(nextState.postIncidentReviewRecommendationActionRecords?.['action:near-catastrophe-case-001']).toMatchObject({
      recommendationRef: 'recommendation:near-catastrophe-case-001',
      reviewRef: 'review:near-catastrophe-case-001',
      stubSuffix: 'near-catastrophe-case-001',
      orchestrationWeek: nextState.week,
    })
    expect(mirrorView.isEmpty).toBe(false)
    expect(mirrorView.hasLinkedRecommendations).toBe(true)
    expect(mirrorView.hasLinkedQualifyingReviews).toBe(true)
    expect(mirrorView.summary.totalRecords).toBe(1)
    expect(mirrorView.summary.linkedRecommendationCount).toBe(1)
    expect(mirrorView.summary.linkedQualifyingReviewCount).toBe(1)
    expect(mirrorView.linkedQualifyingRecords).toHaveLength(1)
    expect(record?.id).toBe('action:near-catastrophe-case-001')
    expect(record?.recommendationRefLabel).toBe('recommendation:near-catastrophe-case-001')
    expect(record?.reviewRefLabel).toBe('review:near-catastrophe-case-001')
    expect(record?.stubSuffixLabel).toBe('near-catastrophe-case-001')
    expect(record?.orchestrationWeekLabel).toBe(`W${nextState.week}`)
    expect(record?.linkedRecommendation).toMatchObject({
      recommendationRef: 'recommendation:near-catastrophe-case-001',
      reviewRefLabel: 'review:near-catastrophe-case-001',
      stubSuffixLabel: 'near-catastrophe-case-001',
      orchestrationWeekLabel: `W${nextState.week}`,
    })
    expect(record?.linkedQualifyingReview).toMatchObject({
      reviewRef: 'review:near-catastrophe-case-001',
      sourceLabel: 'Near-catastrophe threshold',
      linkedCaseIdLabel: 'case-001',
      orchestrationWeekLabel: `W${nextState.week}`,
    })
  })

  it('leaves action mirror empty when academy tier blocks action materialization', () => {
    const state = makeNearCatastropheDeadlineEscalationState()
    state.academyTier = 0

    const nextState = advanceWeek(state)
    const mirrorView = getPostIncidentReviewRecommendationActionMirrorView(nextState)

    expect(nextState.postIncidentReviewRecommendationRecords?.['recommendation:near-catastrophe-case-001']).toBeDefined()
    expect(nextState.postIncidentReviewRecommendationActionRecords ?? {}).toEqual({})
    expect(mirrorView.isEmpty).toBe(true)
    expect(mirrorView.hasLinkedRecommendations).toBe(false)
    expect(mirrorView.hasLinkedQualifyingReviews).toBe(false)
    expect(mirrorView.summary.totalRecords).toBe(0)
    expect(mirrorView.records).toEqual([])
  })

  it('only surfaces action mirror row on dual-path tick when closeout uses training-ref', () => {
    const state = makeDualPathCloseoutAndNearCatastropheState()

    const nextState = advanceWeek(state)
    const mirrorView = getPostIncidentReviewRecommendationActionMirrorView(nextState)

    expect(nextState.cases['case-001'].status).toBe('resolved')
    expect(nextState.postIncidentReviewRecords?.['review:case-case-001-closeout']).toBeDefined()
    expect(nextState.postIncidentReviewRecords?.['review:near-catastrophe-case-002']).toBeDefined()
    expect(nextState.trainingQueue).toHaveLength(1)
    expect(nextState.trainingQueue[0]?.trainingId).toBe('threat-assessment')
    expect(Object.keys(nextState.postIncidentReviewRecommendationActionRecords ?? {})).toEqual([
      'action:near-catastrophe-case-002',
    ])
    expect(
      nextState.postIncidentReviewRecommendationActionRecords?.['action:case-case-001-closeout']
    ).toBeUndefined()
    expect(mirrorView.summary.totalRecords).toBe(1)
    expect(mirrorView.summary.linkedRecommendationCount).toBe(1)
    expect(mirrorView.summary.linkedQualifyingReviewCount).toBe(1)
    expect(mirrorView.records[0]?.linkedRecommendation).toMatchObject({
      recommendationRef: 'recommendation:near-catastrophe-case-002',
      reviewRefLabel: 'review:near-catastrophe-case-002',
      stubSuffixLabel: 'near-catastrophe-case-002',
    })
    expect(mirrorView.records[0]?.linkedQualifyingReview).toMatchObject({
      reviewRef: 'review:near-catastrophe-case-002',
      linkedCaseIdLabel: 'case-002',
      sourceLabel: 'Near-catastrophe threshold',
    })
  })

  it('does not duplicate action mirror rows on re-advance', () => {
    const state = makeNearCatastropheDeadlineEscalationStateWithRecommendationActionReady()

    const once = advanceWeek(state)
    const twice = advanceWeek(once)
    const onceMirror = getPostIncidentReviewRecommendationActionMirrorView(once)
    const twiceMirror = getPostIncidentReviewRecommendationActionMirrorView(twice)

    expect(twiceMirror.records).toEqual(onceMirror.records)
    expect(twiceMirror.linkedQualifyingRecords).toEqual(onceMirror.linkedQualifyingRecords)
    expect(twiceMirror.summary.totalRecords).toBe(onceMirror.summary.totalRecords)
    expect(twiceMirror.summary.linkedRecommendationCount).toBe(onceMirror.summary.linkedRecommendationCount)
    expect(twiceMirror.summary.linkedQualifyingReviewCount).toBe(
      onceMirror.summary.linkedQualifyingReviewCount
    )
    expect(twiceMirror.summary.week).toBe(once.week + 1)
  })

  it('orders action mirror rows by stable record id when multiple qualify', () => {
    const state = makeDualNearCatastropheDeadlineEscalationStateWithRecommendationActionReady()

    const nextState = advanceWeek(state)
    const mirrorView = getPostIncidentReviewRecommendationActionMirrorView(nextState)
    const actionIds = mirrorView.records.map((record) => record.id)

    expect(actionIds).toEqual([
      'action:near-catastrophe-case-001',
      'action:near-catastrophe-case-002',
    ])
    expect(actionIds).toEqual([...actionIds].sort((left, right) => left.localeCompare(right)))
    expect(mirrorView.summary.totalRecords).toBe(2)
    expect(mirrorView.summary.linkedRecommendationCount).toBe(2)
    expect(mirrorView.summary.linkedQualifyingReviewCount).toBe(2)
    expect(mirrorView.linkedQualifyingRecords).toHaveLength(2)
  })

  it('leaves qualifying review linkage null when review row is missing after advance', () => {
    const state = makeNearCatastropheDeadlineEscalationStateWithRecommendationActionReady()

    const nextState = advanceWeek(state)
    delete nextState.postIncidentReviewRecords?.['review:near-catastrophe-case-001']

    const mirrorView = getPostIncidentReviewRecommendationActionMirrorView(nextState)
    const record = mirrorView.records[0]

    expect(mirrorView.summary.linkedRecommendationCount).toBe(1)
    expect(mirrorView.summary.linkedQualifyingReviewCount).toBe(0)
    expect(mirrorView.hasLinkedQualifyingReviews).toBe(false)
    expect(mirrorView.linkedQualifyingRecords).toEqual([])
    expect(record?.linkedRecommendation).toMatchObject({
      recommendationRef: 'recommendation:near-catastrophe-case-001',
      reviewRefLabel: 'review:near-catastrophe-case-001',
    })
    expect(record?.linkedQualifyingReview).toBeNull()
  })
})

describe('advanceWeek post-incident review redacted score mirror integration (SPE-868 slice 25)', () => {
  it('redacts score mirror labels on both qualifying rows in dual-path week without duplicating on re-advance', () => {
    const state = makeDualPathCloseoutAndNearCatastropheState()

    const once = advanceWeek(state)
    const closeout = once.postIncidentReviewRecords?.['review:case-case-001-closeout']
    const nearCatastrophe = once.postIncidentReviewRecords?.['review:near-catastrophe-case-002']

    expect(closeout?.procedureAdherenceScore).toBe(0.68)
    expect(closeout?.confidence).toBe(0.72)
    expect(nearCatastrophe?.procedureAdherenceScore).toBe(0.55)
    expect(nearCatastrophe?.confidence).toBe(0.61)

    const beforeMirror = getPostIncidentReviewMirrorView(once)

    expect(beforeMirror.summary.qualifyingCaseCloseoutCount).toBe(1)
    expect(beforeMirror.summary.qualifyingNearCatastropheCount).toBe(1)
    expect(beforeMirror.qualifyingIncidentRecords).toHaveLength(2)

    const closeoutMirror = beforeMirror.qualifyingIncidentRecords.find(
      (record) => record.id === 'review:case-case-001-closeout'
    )
    const nearMirror = beforeMirror.qualifyingIncidentRecords.find(
      (record) => record.id === 'review:near-catastrophe-case-002'
    )

    expect(closeoutMirror?.procedureAdherenceScoreLabel).toBe('0.68')
    expect(closeoutMirror?.confidenceLabel).toBe('0.72')
    expect(nearMirror?.procedureAdherenceScoreLabel).toBe('0.55')
    expect(nearMirror?.confidenceLabel).toBe('0.61')

    once.postIncidentReviewRecords = {
      ...once.postIncidentReviewRecords,
      'review:case-case-001-closeout': {
        ...closeout!,
        redactedFields: ['procedureAdherenceScore', 'confidence'],
      },
      'review:near-catastrophe-case-002': {
        ...nearCatastrophe!,
        redactedFields: ['procedureAdherenceScore', 'confidence'],
      },
    }

    const redactedMirror = getPostIncidentReviewMirrorView(once)
    const redactedCloseout = redactedMirror.qualifyingIncidentRecords.find(
      (record) => record.id === 'review:case-case-001-closeout'
    )
    const redactedNear = redactedMirror.qualifyingIncidentRecords.find(
      (record) => record.id === 'review:near-catastrophe-case-002'
    )

    expectRedactedScoreMirrorLabels(redactedCloseout)
    expectRedactedScoreMirrorLabels(redactedNear)
    expect(redactedCloseout?.redacted).toBe(true)
    expect(redactedNear?.redacted).toBe(true)
    expectMilestoneMirrorLabels(
      redactedCloseout,
      closeout!.milestoneTimings!,
      projectPostIncidentReviewSummary(closeout!).milestoneSpanWeeks
    )
    expectMilestoneMirrorLabels(
      redactedNear,
      nearCatastrophe!.milestoneTimings!,
      projectPostIncidentReviewSummary(nearCatastrophe!).milestoneSpanWeeks
    )

    const redactedCloseoutRecord =
      once.postIncidentReviewRecords?.['review:case-case-001-closeout']
    const redactedNearRecord =
      once.postIncidentReviewRecords?.['review:near-catastrophe-case-002']

    const twice = advanceWeek(once)

    expect(twice.postIncidentReviewRecords?.['review:case-case-001-closeout']).toBe(
      redactedCloseoutRecord
    )
    expect(twice.postIncidentReviewRecords?.['review:near-catastrophe-case-002']).toBe(
      redactedNearRecord
    )

    const twiceMirror = getPostIncidentReviewMirrorView(twice)

    expect(twiceMirror.qualifyingIncidentRecords).toHaveLength(2)
    expect(twiceMirror.summary.qualifyingCaseCloseoutCount).toBe(1)
    expect(twiceMirror.summary.qualifyingNearCatastropheCount).toBe(1)
  })
})

describe('advanceWeek post-incident review recurrence compliance mirror integration (SPE-868 slice 26)', () => {
  it('renders redacted recurrenceObserved mirror label on cycle-4 closeout path', () => {
    const state = stateWithFollowOnTrainingEnqueueReady(createStartingState())
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

    expect(created?.recurrenceObserved).toBe(true)

    const beforeMirror = getPostIncidentReviewMirrorView(nextState)
    const beforeRecord = beforeMirror.records.find(
      (record) => record.id === 'review:cycle-4-closeout'
    )

    expect(beforeRecord?.recurrenceObservedLabel).toBe('Yes')
    expect(beforeRecord?.redacted).toBe(false)

    nextState.postIncidentReviewRecords = {
      ...nextState.postIncidentReviewRecords,
      'review:cycle-4-closeout': {
        ...created!,
        redactedFields: ['recurrenceObserved'],
      },
    }

    const mirrorView = getPostIncidentReviewMirrorView(nextState)
    const mirrorRecord = mirrorView.records.find((record) => record.id === 'review:cycle-4-closeout')

    expectRedactedRecurrenceObservedMirrorLabel(mirrorRecord)
    expect(mirrorRecord?.redacted).toBe(true)
    expect(mirrorRecord?.recurrenceObservedLabel).not.toBe('Yes')
    expect(mirrorRecord?.reviewRouteLabel).toBe('Internal Command')
    expect(mirrorRecord?.closureOutcomeLabel).toBe('Contained')
    expect(mirrorView.summary.recurrenceObservedCount).toBe(1)
  })

  it('renders redacted recurrenceObserved mirror label on near-catastrophe path', () => {
    const state = makeNearCatastropheDeadlineEscalationState()

    const nextState = advanceWeek(state)
    const created = nextState.postIncidentReviewRecords?.['review:near-catastrophe-case-001']

    expect(created?.recurrenceObserved).toBe(false)

    const beforeMirror = getPostIncidentReviewMirrorView(nextState)
    const beforeRecord = beforeMirror.qualifyingIncidentRecords[0]

    expect(beforeRecord?.recurrenceObservedLabel).toBe('No')
    expect(beforeRecord?.reviewRouteLabel).toBe('External Audit')
    expect(beforeRecord?.closureOutcomeLabel).toBe('Administratively Cleared')
    expect(beforeRecord?.redacted).toBe(false)

    nextState.postIncidentReviewRecords = {
      ...nextState.postIncidentReviewRecords,
      'review:near-catastrophe-case-001': {
        ...created!,
        redactedFields: ['recurrenceObserved'],
      },
    }

    const mirrorView = getPostIncidentReviewMirrorView(nextState)
    const mirrorRecord = mirrorView.qualifyingIncidentRecords[0]

    expectRedactedRecurrenceObservedMirrorLabel(mirrorRecord)
    expect(mirrorRecord?.redacted).toBe(true)
    expect(mirrorRecord?.recurrenceObservedLabel).not.toBe('No')
    expect(mirrorRecord?.reviewRouteLabel).toBe('External Audit')
    expect(mirrorRecord?.closureOutcomeLabel).toBe('Administratively Cleared')
    expect(mirrorView.summary.recurrenceObservedCount).toBe(1)
    expect(mirrorView.summary.externalAuditRouteCount).toBe(2)
  })

  it('mirrors independent recurrence and compliance labels on dual-path week without duplicating on re-advance', () => {
    const state = makeDualPathCloseoutAndNearCatastropheState()

    const once = advanceWeek(state)
    const closeout = once.postIncidentReviewRecords?.['review:case-case-001-closeout']
    const nearCatastrophe = once.postIncidentReviewRecords?.['review:near-catastrophe-case-002']

    expect(closeout?.recurrenceObserved).toBe(false)
    expect(nearCatastrophe?.recurrenceObserved).toBe(false)

    const beforeMirror = getPostIncidentReviewMirrorView(once)

    expect(beforeMirror.summary.qualifyingCaseCloseoutCount).toBe(1)
    expect(beforeMirror.summary.qualifyingNearCatastropheCount).toBe(1)
    expect(beforeMirror.summary.recurrenceObservedCount).toBe(1)
    expect(beforeMirror.summary.externalAuditRouteCount).toBe(2)
    expect(beforeMirror.qualifyingIncidentRecords).toHaveLength(2)

    const closeoutMirror = beforeMirror.qualifyingIncidentRecords.find(
      (record) => record.id === 'review:case-case-001-closeout'
    )
    const nearMirror = beforeMirror.qualifyingIncidentRecords.find(
      (record) => record.id === 'review:near-catastrophe-case-002'
    )

    expectRecurrenceComplianceMirrorLabels(closeoutMirror, {
      reviewRouteLabel: 'Internal Command',
      closureOutcomeLabel: 'Contained',
      recurrenceObservedLabel: 'No',
    })
    expectRecurrenceComplianceMirrorLabels(nearMirror, {
      reviewRouteLabel: 'External Audit',
      closureOutcomeLabel: 'Administratively Cleared',
      recurrenceObservedLabel: 'No',
    })
    expect(formatPostIncidentReviewEnumLabel('external_audit')).toBe('External Audit')

    const twice = advanceWeek(once)

    expect(twice.postIncidentReviewRecords?.['review:case-case-001-closeout']).toBe(closeout)
    expect(twice.postIncidentReviewRecords?.['review:near-catastrophe-case-002']).toBe(
      nearCatastrophe
    )

    const twiceMirror = getPostIncidentReviewMirrorView(twice)

    expect(twiceMirror.qualifyingIncidentRecords).toHaveLength(2)
    expect(twiceMirror.summary.qualifyingCaseCloseoutCount).toBe(1)
    expect(twiceMirror.summary.qualifyingNearCatastropheCount).toBe(1)
    expect(twiceMirror.summary.recurrenceObservedCount).toBe(1)
    expect(twiceMirror.summary.externalAuditRouteCount).toBe(2)
  })
})

describe('advanceWeek post-incident review reviewRoute closureOutcome redaction mirror integration (SPE-868 slice 27)', () => {
  it('renders redacted reviewRoute and closureOutcome mirror labels on qualifying case closeout path', () => {
    const state = makeQualifyingResolvedCaseState()

    const nextState = advanceWeek(state)
    const created = nextState.postIncidentReviewRecords?.['review:case-case-001-closeout']

    expect(created?.reviewRoute).toBe('internal_command')
    expect(created?.closureOutcome).toBe('contained')

    const beforeMirror = getPostIncidentReviewMirrorView(nextState)
    const beforeRecord = beforeMirror.qualifyingIncidentRecords[0]

    expect(beforeRecord?.reviewRouteLabel).toBe('Internal Command')
    expect(beforeRecord?.closureOutcomeLabel).toBe('Contained')
    expect(beforeRecord?.redacted).toBe(false)

    nextState.postIncidentReviewRecords = {
      ...nextState.postIncidentReviewRecords,
      'review:case-case-001-closeout': {
        ...created!,
        redactedFields: ['reviewRoute', 'closureOutcome'],
      },
    }

    const mirrorView = getPostIncidentReviewMirrorView(nextState)
    const mirrorRecord = mirrorView.qualifyingIncidentRecords[0]

    expectRedactedReviewRouteClosureOutcomeMirrorLabels(mirrorRecord)
    expect(mirrorRecord?.redacted).toBe(true)
    expect(mirrorRecord?.reviewRouteLabel).not.toBe('Internal Command')
    expect(mirrorRecord?.closureOutcomeLabel).not.toBe('Contained')
    expect(mirrorRecord?.recurrenceObservedLabel).toBe('No')
    expect(mirrorRecord?.procedureAdherenceScoreLabel).toBe('0.68')
    expect(mirrorRecord?.confidenceLabel).toBe('0.72')
    expect(mirrorView.summary.externalAuditRouteCount).toBe(1)
  })

  it('renders redacted reviewRoute and closureOutcome mirror labels on near-catastrophe path', () => {
    const state = makeNearCatastropheDeadlineEscalationState()

    const nextState = advanceWeek(state)
    const created = nextState.postIncidentReviewRecords?.['review:near-catastrophe-case-001']

    expect(created?.reviewRoute).toBe('external_audit')
    expect(created?.closureOutcome).toBe('administratively_cleared')

    const beforeMirror = getPostIncidentReviewMirrorView(nextState)
    const beforeRecord = beforeMirror.qualifyingIncidentRecords[0]

    expect(beforeRecord?.reviewRouteLabel).toBe('External Audit')
    expect(beforeRecord?.closureOutcomeLabel).toBe('Administratively Cleared')
    expect(beforeRecord?.redacted).toBe(false)
    expect(beforeMirror.summary.externalAuditRouteCount).toBe(2)

    nextState.postIncidentReviewRecords = {
      ...nextState.postIncidentReviewRecords,
      'review:near-catastrophe-case-001': {
        ...created!,
        redactedFields: ['reviewRoute', 'closureOutcome'],
      },
    }

    const mirrorView = getPostIncidentReviewMirrorView(nextState)
    const mirrorRecord = mirrorView.qualifyingIncidentRecords[0]

    expectRedactedReviewRouteClosureOutcomeMirrorLabels(mirrorRecord)
    expect(mirrorRecord?.redacted).toBe(true)
    expect(mirrorRecord?.reviewRouteLabel).not.toBe('External Audit')
    expect(mirrorRecord?.closureOutcomeLabel).not.toBe('Administratively Cleared')
    expect(mirrorRecord?.recurrenceObservedLabel).toBe('No')
    expect(mirrorRecord?.procedureAdherenceScoreLabel).toBe('0.55')
    expect(mirrorRecord?.confidenceLabel).toBe('0.61')
    expect(mirrorView.summary.externalAuditRouteCount).toBe(1)
    expect(mirrorView.summary.recurrenceObservedCount).toBe(1)
  })

  it('mirrors independent reviewRoute and closureOutcome redaction on dual-path week without duplicating on re-advance', () => {
    const state = makeDualPathCloseoutAndNearCatastropheState()

    const once = advanceWeek(state)
    const closeout = once.postIncidentReviewRecords?.['review:case-case-001-closeout']
    const nearCatastrophe = once.postIncidentReviewRecords?.['review:near-catastrophe-case-002']

    expect(closeout?.reviewRoute).toBe('internal_command')
    expect(nearCatastrophe?.reviewRoute).toBe('external_audit')

    const beforeMirror = getPostIncidentReviewMirrorView(once)

    expect(beforeMirror.summary.externalAuditRouteCount).toBe(2)
    expect(beforeMirror.qualifyingIncidentRecords).toHaveLength(2)

    once.postIncidentReviewRecords = {
      ...once.postIncidentReviewRecords,
      'review:case-case-001-closeout': {
        ...closeout!,
        redactedFields: ['reviewRoute', 'closureOutcome'],
      },
      'review:near-catastrophe-case-002': {
        ...nearCatastrophe!,
        redactedFields: ['reviewRoute', 'closureOutcome'],
      },
    }

    const redactedMirror = getPostIncidentReviewMirrorView(once)
    const redactedCloseout = redactedMirror.qualifyingIncidentRecords.find(
      (record) => record.id === 'review:case-case-001-closeout'
    )
    const redactedNear = redactedMirror.qualifyingIncidentRecords.find(
      (record) => record.id === 'review:near-catastrophe-case-002'
    )

    expectRedactedReviewRouteClosureOutcomeMirrorLabels(redactedCloseout)
    expectRedactedReviewRouteClosureOutcomeMirrorLabels(redactedNear)
    expect(redactedCloseout?.recurrenceObservedLabel).toBe('No')
    expect(redactedNear?.recurrenceObservedLabel).toBe('No')
    expect(redactedMirror.summary.externalAuditRouteCount).toBe(1)

    const redactedCloseoutRecord =
      once.postIncidentReviewRecords?.['review:case-case-001-closeout']
    const redactedNearRecord =
      once.postIncidentReviewRecords?.['review:near-catastrophe-case-002']

    const twice = advanceWeek(once)

    expect(twice.postIncidentReviewRecords?.['review:case-case-001-closeout']).toBe(
      redactedCloseoutRecord
    )
    expect(twice.postIncidentReviewRecords?.['review:near-catastrophe-case-002']).toBe(
      redactedNearRecord
    )

    const twiceMirror = getPostIncidentReviewMirrorView(twice)

    expect(twiceMirror.qualifyingIncidentRecords).toHaveLength(2)
    expect(twiceMirror.summary.qualifyingCaseCloseoutCount).toBe(1)
    expect(twiceMirror.summary.qualifyingNearCatastropheCount).toBe(1)
    expect(twiceMirror.summary.externalAuditRouteCount).toBe(1)
  })
})
