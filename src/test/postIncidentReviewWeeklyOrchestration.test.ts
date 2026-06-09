import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildCaseEscalatedEventDraft,
  buildCaseResolvedEventDraft,
} from '../domain/sim/eventDraftPipeline'
import {
  RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
  POST_INCIDENT_REVIEW_STUB_REGISTRY,
  type PostIncidentReviewRecord,
} from '../domain/postIncidentReviewRegistry'
import {
  RECURRENCE_DAMAGE_LEDGER_FIXTURE,
  type RecurrentCatastropheRecord,
} from '../domain/recurrentCatastropheAmeliorationRegistry'
import {
  applyWeeklyPostIncidentReviewCreationTick,
  buildPostIncidentReviewRecordForRef,
  buildQualifyingIncidentReviewRecordForDraft,
  isRecurrentCatastropheAnchoredThisWeek,
  resolveQualifyingIncidentReviewDraftsFromEventDrafts,
  resolveQualifyingPostIncidentReviewRefs,
  type QualifyingIncidentReviewDraft,
} from '../domain/postIncidentReviewWeeklyOrchestration'

function baseCatastrophe(
  overrides: Partial<RecurrentCatastropheRecord> = {}
): RecurrentCatastropheRecord {
  return {
    id: 'recurrent-catastrophe:test-review-creation',
    label: 'Test review creation catastrophe',
    recurrenceCadence: 'monthly',
    failureMode: 'manifestation',
    preventionCeiling: 'unknown',
    ameliorationTactics: [{ tactic: 'shielding', active: true }],
    recurrenceCount: 2,
    lastOccurrenceWeek: 12,
    postIncidentReviewRefs: ['review:cycle-2-closeout'],
    ...overrides,
  }
}

describe('postIncidentReviewWeeklyOrchestration (SPE-868 slice 4)', () => {
  it('is a no-op for an empty catastrophe map without throwing', () => {
    const reviews = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }

    expect(applyWeeklyPostIncidentReviewCreationTick(reviews, {}, 12)).toBe(reviews)
    expect(applyWeeklyPostIncidentReviewCreationTick(reviews, undefined, 12)).toBe(reviews)
    expect(applyWeeklyPostIncidentReviewCreationTick({}, undefined, 12)).toEqual({})
  })

  it('detects recurrence anchored on the simulation week', () => {
    const anchored = baseCatastrophe()
    const notAnchored = baseCatastrophe({ lastOccurrenceWeek: 11 })

    expect(isRecurrentCatastropheAnchoredThisWeek(anchored, 12)).toBe(true)
    expect(isRecurrentCatastropheAnchoredThisWeek(notAnchored, 12)).toBe(false)
    expect(isRecurrentCatastropheAnchoredThisWeek(baseCatastrophe({ recurrenceCount: 0 }), 12)).toBe(
      false
    )
  })

  it('resolves missing cycle closeout refs only when cycle number matches recurrenceCount', () => {
    const catastrophe = baseCatastrophe({
      recurrenceCount: 4,
      lastOccurrenceWeek: 53,
      postIncidentReviewRefs: [
        'review:cycle-3-closeout',
        'review:cycle-4-closeout',
        'review:cycle-5-closeout',
      ],
    })

    expect(
      resolveQualifyingPostIncidentReviewRefs(catastrophe, POST_INCIDENT_REVIEW_STUB_REGISTRY, 53)
    ).toEqual(['review:cycle-4-closeout'])
  })

  it('builds deterministic cycle closeout records anchored to lastOccurrenceWeek', () => {
    const catastrophe = baseCatastrophe({
      recurrenceCount: 4,
      lastOccurrenceWeek: 53,
    })
    const created = buildPostIncidentReviewRecordForRef(
      'review:cycle-4-closeout',
      catastrophe,
      53
    )

    expect(created).toEqual({
      id: 'review:cycle-4-closeout',
      label: 'Manifestation cascade cycle 4 closeout review',
      summary: 'Structured retrospective after seasonal cascade recurrence recovery.',
      reviewRoute: 'internal_command',
      closureOutcome: 'contained',
      milestoneTimings: {
        discoveryWeek: 49,
        responseWeek: 50,
        containmentWeek: 51,
        recoveryWeek: 52,
        reportingWeek: 53,
      },
      procedureAdherenceScore: 0.71,
      recurrenceObserved: true,
      confidence: 0.74,
      unknownFields: ['orchestration_week:53'],
    })
  })

  it('creates missing qualifying reviews without mutating existing hydrated entries', () => {
    const existing: PostIncidentReviewRecord = {
      ...RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
      confidence: 0.81,
    }
    const reviews = {
      [existing.id]: existing,
    }
    const catastrophe = baseCatastrophe({
      recurrenceCount: 4,
      lastOccurrenceWeek: 53,
      postIncidentReviewRefs: ['review:cycle-3-closeout', 'review:cycle-4-closeout'],
    })

    const next = applyWeeklyPostIncidentReviewCreationTick(reviews, { [catastrophe.id]: catastrophe }, 53)

    expect(next[existing.id]).toBe(existing)
    expect(next['review:cycle-4-closeout']?.label).toBe(
      'Manifestation cascade cycle 4 closeout review'
    )
    expect(next['review:cycle-4-closeout']?.unknownFields).toEqual(['orchestration_week:53'])
  })

  it('is idempotent when re-applied after creation for the same week', () => {
    const catastrophe = baseCatastrophe()
    const map = { [catastrophe.id]: catastrophe }
    const once = applyWeeklyPostIncidentReviewCreationTick({}, map, 12)
    const twice = applyWeeklyPostIncidentReviewCreationTick(once, map, 12)

    expect(twice).toBe(once)
    expect(Object.keys(once)).toEqual(['review:cycle-2-closeout'])
  })

  it('rejects franchise token refs without creating records', () => {
    const catastrophe = baseCatastrophe({
      postIncidentReviewRefs: ['review:foundation-audit'],
    })

    const next = applyWeeklyPostIncidentReviewCreationTick({}, { [catastrophe.id]: catastrophe }, 12)

    expect(next).toEqual({})
  })

  it('creates generic closeout stubs for non-cycle refs', () => {
    const catastrophe = baseCatastrophe({
      postIncidentReviewRefs: ['review:missing-closeout'],
    })

    const next = applyWeeklyPostIncidentReviewCreationTick({}, { [catastrophe.id]: catastrophe }, 12)
    const created = next['review:missing-closeout']

    expect(created?.label).toBe('Pending post-incident closeout review')
    expect(created?.milestoneTimings).toEqual({ reportingWeek: 12 })
    expect(created?.unknownFields).toEqual(['orchestration_week:12'])
  })

  it('materializes cycle-4 closeout when recurrence damage ledger advances at week 53', () => {
    const catastrophe = {
      ...RECURRENCE_DAMAGE_LEDGER_FIXTURE,
      postIncidentReviewRefs: ['review:cycle-3-closeout', 'review:cycle-4-closeout'],
    }
    const advancedCatastrophe = {
      ...catastrophe,
      recurrenceCount: 4,
      lastOccurrenceWeek: 53,
    }

    const next = applyWeeklyPostIncidentReviewCreationTick(
      { [RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]: RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE },
      { [advancedCatastrophe.id]: advancedCatastrophe },
      53
    )

    expect(next['review:cycle-3-closeout']).toBe(RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE)
    expect(next['review:cycle-4-closeout']?.milestoneTimings?.reportingWeek).toBe(53)
  })
})

describe('postIncidentReviewWeeklyOrchestration (SPE-868 slice 7)', () => {
  const rewardBreakdown = {
    outcome: 'success',
    caseType: 'general',
    caseTypeLabel: 'General incident',
    operationValue: 10,
    factors: [],
    fundingDelta: 5,
    containmentDelta: 2,
    strategicValueDelta: 3,
    reputationDelta: 1,
    inventoryRewards: [],
    factionStanding: [],
    label: 'Success',
    reasons: [],
  } as const

  const startingState = createStartingState()
  const priorCases = {
    ...startingState.cases,
    'case-major': {
      ...startingState.cases['case-001'],
      id: 'case-major',
      kind: 'standard' as const,
      stage: 3,
      deadlineRemaining: 2,
    },
    'case-routine': {
      ...startingState.cases['case-001'],
      id: 'case-routine',
      kind: 'standard' as const,
      stage: 1,
      deadlineRemaining: 3,
    },
  }

  it('derives a case closeout draft when a qualifying case resolves', () => {
    const drafts = resolveQualifyingIncidentReviewDraftsFromEventDrafts(
      [
        buildCaseResolvedEventDraft({
          week: 12,
          caseData: {
            id: 'case-major',
            title: 'District breach',
            mode: 'threshold',
            kind: 'standard',
            stage: 4,
          },
          teamIds: ['t_nightwatch'],
          rewardBreakdown,
        }),
      ],
      priorCases,
      12
    )

    expect(drafts).toEqual([
      {
        reviewRef: 'review:case-case-major-closeout',
        caseId: 'case-major',
        caseTitle: 'District breach',
        trigger: 'case_resolved',
        stage: 4,
        kind: 'standard',
        anchorWeek: 12,
      },
    ])
  })

  it('derives a near-catastrophe draft when escalation crosses the threshold', () => {
    const drafts = resolveQualifyingIncidentReviewDraftsFromEventDrafts(
      [
        buildCaseEscalatedEventDraft({
          week: 12,
          caseData: {
            id: 'case-major',
            title: 'District breach',
            stage: 3,
          },
          toStage: 4,
          rewardBreakdown,
          trigger: 'deadline',
          deadlineRemaining: 2,
          convertedToRaid: false,
        }),
      ],
      priorCases,
      12
    )

    expect(drafts).toEqual([
      {
        reviewRef: 'review:near-catastrophe-case-major',
        caseId: 'case-major',
        caseTitle: 'District breach',
        trigger: 'near_catastrophe_threshold',
        stage: 4,
        kind: 'standard',
        anchorWeek: 12,
      },
    ])
  })

  it('prefers resolved closeout over near-catastrophe for the same caseId', () => {
    const drafts = resolveQualifyingIncidentReviewDraftsFromEventDrafts(
      [
        buildCaseResolvedEventDraft({
          week: 12,
          caseData: {
            id: 'case-major',
            title: 'District breach',
            mode: 'threshold',
            kind: 'standard',
            stage: 4,
          },
          teamIds: ['t_nightwatch'],
          rewardBreakdown,
        }),
        buildCaseEscalatedEventDraft({
          week: 12,
          caseData: {
            id: 'case-major',
            title: 'District breach',
            stage: 3,
          },
          toStage: 4,
          rewardBreakdown,
          trigger: 'deadline',
          deadlineRemaining: 2,
          convertedToRaid: false,
        }),
      ],
      priorCases,
      12
    )

    expect(drafts.map((draft) => draft.reviewRef)).toEqual(['review:case-case-major-closeout'])
  })

  it('ignores non-qualifying case resolution drafts', () => {
    const drafts = resolveQualifyingIncidentReviewDraftsFromEventDrafts(
      [
        buildCaseResolvedEventDraft({
          week: 12,
          caseData: {
            id: 'case-routine',
            title: 'Routine audit',
            mode: 'threshold',
            kind: 'standard',
            stage: 1,
          },
          teamIds: ['t_nightwatch'],
          rewardBreakdown,
        }),
      ],
      priorCases,
      12
    )

    expect(drafts).toEqual([])
  })

  it('builds deterministic qualifying incident review records', () => {
    const resolvedDraft: QualifyingIncidentReviewDraft = {
      reviewRef: 'review:case-case-major-closeout',
      caseId: 'case-major',
      caseTitle: 'District breach',
      trigger: 'case_resolved',
      stage: 4,
      kind: 'standard',
      anchorWeek: 12,
    }
    const nearCatastropheDraft: QualifyingIncidentReviewDraft = {
      reviewRef: 'review:near-catastrophe-case-major',
      caseId: 'case-major',
      caseTitle: 'District breach',
      trigger: 'near_catastrophe_threshold',
      stage: 4,
      kind: 'standard',
      anchorWeek: 12,
    }

    expect(buildQualifyingIncidentReviewRecordForDraft(resolvedDraft, 12)).toEqual({
      id: 'review:case-case-major-closeout',
      label: 'Qualifying incident closeout review — District breach',
      summary: 'Structured retrospective after qualifying incident resolution.',
      reviewRoute: 'internal_command',
      closureOutcome: 'contained',
      milestoneTimings: {
        discoveryWeek: 9,
        responseWeek: 10,
        containmentWeek: 11,
        reportingWeek: 12,
      },
      procedureAdherenceScore: 0.68,
      recurrenceObserved: false,
      confidence: 0.72,
      unknownFields: ['orchestration_week:12'],
    })
    expect(buildQualifyingIncidentReviewRecordForDraft(nearCatastropheDraft, 12)).toEqual({
      id: 'review:near-catastrophe-case-major',
      label: 'Near-catastrophe threshold review — District breach',
      summary: 'Structured retrospective triggered by near-catastrophe escalation threshold.',
      reviewRoute: 'external_audit',
      closureOutcome: 'administratively_cleared',
      milestoneTimings: {
        discoveryWeek: 10,
        responseWeek: 11,
        reportingWeek: 12,
      },
      procedureAdherenceScore: 0.55,
      recurrenceObserved: false,
      confidence: 0.61,
      unknownFields: ['orchestration_week:12'],
    })
  })

  it('creates qualifying incident reviews without a catastrophe map', () => {
    const draft: QualifyingIncidentReviewDraft = {
      reviewRef: 'review:case-case-major-closeout',
      caseId: 'case-major',
      caseTitle: 'District breach',
      trigger: 'case_resolved',
      stage: 4,
      kind: 'standard',
      anchorWeek: 12,
    }

    const once = applyWeeklyPostIncidentReviewCreationTick({}, {}, 12, [draft])
    const twice = applyWeeklyPostIncidentReviewCreationTick(once, {}, 12, [draft])

    expect(twice).toBe(once)
    expect(Object.keys(once)).toEqual(['review:case-case-major-closeout'])
  })
})
