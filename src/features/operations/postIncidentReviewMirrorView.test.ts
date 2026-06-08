import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE,
  RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
  sanitizePostIncidentReviewRecords,
} from '../../domain/postIncidentReviewRegistry'
import { buildQualifyingIncidentReviewRecordForDraft } from '../../domain/postIncidentReviewWeeklyOrchestration'
import type { QualifyingIncidentReviewDraft } from '../../domain/postIncidentReviewWeeklyOrchestration'
import {
  formatPostIncidentReviewEnumLabel,
  getPostIncidentReviewMirrorView,
} from './postIncidentReviewMirrorView'

describe('postIncidentReviewMirrorView (SPE-868 slice 3)', () => {
  it('returns empty mirror when postIncidentReviewRecords map is empty', () => {
    const game = createStartingState()
    game.postIncidentReviewRecords = {}

    const view = getPostIncidentReviewMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.hasQualifyingIncidentRecords).toBe(false)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.summary.qualifyingCaseCloseoutCount).toBe(0)
    expect(view.summary.stubFixtureCount).toBe(0)
    expect(view.qualifyingIncidentRecords).toEqual([])
    expect(view.records).toEqual([])
  })

  it('mirrors persisted fields and review summary projection', () => {
    const game = createStartingState()
    game.week = 42
    game.postIncidentReviewRecords = {
      [RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]: RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
      [EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE.id]: EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE,
    }

    const view = getPostIncidentReviewMirrorView(game)
    const closeout = view.records.find(
      (record) => record.id === RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id
    )
    const audit = view.records.find(
      (record) => record.id === EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE.id
    )

    expect(view.isEmpty).toBe(false)
    expect(view.summary.totalRecords).toBe(2)
    expect(view.summary.externalAuditRouteCount).toBe(1)
    expect(view.summary.recurrenceObservedCount).toBe(1)
    expect(view.summary.qualifyingCaseCloseoutCount).toBe(0)
    expect(view.summary.stubFixtureCount).toBe(2)
    expect(view.summary.week).toBe(42)
    expect(view.hasQualifyingIncidentRecords).toBe(false)
    expect(closeout?.sourceGroup).toBe('stub_fixture')
    expect(closeout?.sourceLabel).toBe('Stub fixture')
    expect(audit?.sourceGroup).toBe('stub_fixture')
    expect(closeout?.reviewRouteLabel).toBe('Internal Command')
    expect(closeout?.closureOutcomeLabel).toBe('Contained')
    expect(closeout?.milestoneSpanWeeksLabel).toBe('4')
    expect(closeout?.discoveryWeekLabel).toBe('W38')
    expect(closeout?.reportingWeekLabel).toBe('W42')
    expect(closeout?.procedureAdherenceScoreLabel).toBe('0.71')
    expect(closeout?.recurrenceObservedLabel).toBe('Yes')
    expect(closeout?.confidenceLabel).toBe('0.74')
    expect(audit?.reviewRouteLabel).toBe('External Audit')
    expect(audit?.closureOutcomeLabel).toBe('Administratively Cleared')
    expect(audit?.recurrenceObservedLabel).toBe('No')
  })

  it('renders redacted projection fields as legibility gaps', () => {
    const game = createStartingState()
    game.postIncidentReviewRecords = {
      [RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]: {
        ...RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
        redactedFields: ['milestoneTimings', 'procedureAdherenceScore', 'confidence'],
      },
    }

    const view = getPostIncidentReviewMirrorView(game)
    const record = view.records[0]

    expect(record?.milestoneSpanWeeksLabel).toBe('—')
    expect(record?.discoveryWeekLabel).toBe('—')
    expect(record?.responseWeekLabel).toBe('—')
    expect(record?.containmentWeekLabel).toBe('—')
    expect(record?.recoveryWeekLabel).toBe('—')
    expect(record?.reportingWeekLabel).toBe('—')
    expect(record?.procedureAdherenceScoreLabel).toBe('—')
    expect(record?.confidenceLabel).toBe('—')
    expect(record?.redacted).toBe(true)
  })

  it('distinguishes redacted full milestoneTimings from partial missing fields (SPE-868 slice 23)', () => {
    const nearCatastropheDraft: QualifyingIncidentReviewDraft = {
      reviewRef: 'review:near-catastrophe-case-raid',
      caseId: 'case-raid',
      caseTitle: 'Raid conversion',
      trigger: 'near_catastrophe_threshold',
      stage: 4,
      kind: 'raid',
      anchorWeek: 12,
    }
    const partialNearCatastrophe = buildQualifyingIncidentReviewRecordForDraft(
      nearCatastropheDraft,
      12
    )

    const game = createStartingState()
    game.postIncidentReviewRecords = {
      [RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]: {
        ...RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
        redactedFields: ['milestoneTimings'],
      },
      ...(partialNearCatastrophe ? { [partialNearCatastrophe.id]: partialNearCatastrophe } : {}),
    }

    const view = getPostIncidentReviewMirrorView(game)
    const redacted = view.records.find(
      (record) => record.id === RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id
    )
    const partial = view.records.find((record) => record.id === partialNearCatastrophe?.id)

    expect(redacted?.discoveryWeekLabel).toBe('—')
    expect(redacted?.responseWeekLabel).toBe('—')
    expect(redacted?.containmentWeekLabel).toBe('—')
    expect(redacted?.recoveryWeekLabel).toBe('—')
    expect(redacted?.reportingWeekLabel).toBe('—')
    expect(redacted?.milestoneSpanWeeksLabel).toBe('—')
    expect(redacted?.redacted).toBe(true)

    expect(partial?.discoveryWeekLabel).toBe('W10')
    expect(partial?.responseWeekLabel).toBe('W11')
    expect(partial?.containmentWeekLabel).toBe('—')
    expect(partial?.recoveryWeekLabel).toBe('—')
    expect(partial?.reportingWeekLabel).toBe('W12')
    expect(partial?.milestoneSpanWeeksLabel).toBe('2')
    expect(partial?.redacted).toBe(false)
  })

  it('does not surface invalid records dropped on hydrate', () => {
    const game = createStartingState()
    game.postIncidentReviewRecords = sanitizePostIncidentReviewRecords({
      [RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]: RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
      'review:invalid-dropped': {
        id: 'review:invalid-dropped',
        label: 'Foundation command review',
        reviewRoute: 'internal_command',
        closureOutcome: 'contained',
      },
    })

    const view = getPostIncidentReviewMirrorView(game)

    expect(view.summary.totalRecords).toBe(1)
    expect(view.records[0]?.id).toBe(RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id)
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatPostIncidentReviewEnumLabel('external_audit')).toBe('External Audit')
    expect(formatPostIncidentReviewEnumLabel('administratively_cleared')).toBe(
      'Administratively Cleared'
    )
  })

  it('groups orchestration-created qualifying incident reviews separately from stub fixtures', () => {
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
      reviewRef: 'review:near-catastrophe-case-raid',
      caseId: 'case-raid',
      caseTitle: 'Raid conversion',
      trigger: 'near_catastrophe_threshold',
      stage: 4,
      kind: 'raid',
      anchorWeek: 12,
    }
    const caseCloseout = buildQualifyingIncidentReviewRecordForDraft(resolvedDraft, 12)
    const nearCatastrophe = buildQualifyingIncidentReviewRecordForDraft(nearCatastropheDraft, 12)

    const game = createStartingState()
    game.week = 12
    game.postIncidentReviewRecords = {
      [RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]: RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
      ...(caseCloseout ? { [caseCloseout.id]: caseCloseout } : {}),
      ...(nearCatastrophe ? { [nearCatastrophe.id]: nearCatastrophe } : {}),
    }

    const view = getPostIncidentReviewMirrorView(game)
    const qualifyingIds = view.qualifyingIncidentRecords.map((record) => record.id)

    expect(view.hasQualifyingIncidentRecords).toBe(true)
    expect(view.summary.qualifyingCaseCloseoutCount).toBe(1)
    expect(view.summary.qualifyingNearCatastropheCount).toBe(1)
    expect(view.summary.orchestrationCreatedCount).toBe(2)
    expect(view.summary.stubFixtureCount).toBe(1)
    expect(qualifyingIds).toEqual([
      'review:case-case-major-closeout',
      'review:near-catastrophe-case-raid',
    ])
    expect(view.qualifyingIncidentRecords[0]?.sourceLabel).toBe('Qualifying case closeout')
    expect(view.qualifyingIncidentRecords[0]?.linkedCaseIdLabel).toBe('case-major')
    expect(view.qualifyingIncidentRecords[0]?.orchestrationWeekLabel).toBe('W12')
    expect(view.qualifyingIncidentRecords[1]?.sourceLabel).toBe('Near-catastrophe threshold')
    expect(view.qualifyingIncidentRecords[1]?.linkedCaseIdLabel).toBe('case-raid')
  })

  it('does not classify qualifying ref patterns without orchestration week token', () => {
    const game = createStartingState()
    game.postIncidentReviewRecords = {
      'review:case-manual-closeout': {
        id: 'review:case-manual-closeout',
        label: 'Manual case closeout review',
        reviewRoute: 'internal_command',
        closureOutcome: 'contained',
      },
    }

    const view = getPostIncidentReviewMirrorView(game)
    const record = view.records[0]

    expect(view.hasQualifyingIncidentRecords).toBe(false)
    expect(record?.sourceGroup).toBe('other_persisted')
    expect(record?.orchestrationWeekLabel).toBe('—')
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()

    const first = JSON.stringify(getPostIncidentReviewMirrorView(game))
    const second = JSON.stringify(getPostIncidentReviewMirrorView(game))

    expect(first).toBe(second)
  })
})
