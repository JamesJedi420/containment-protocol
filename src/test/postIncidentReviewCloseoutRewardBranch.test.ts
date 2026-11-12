import { describe, expect, it } from 'vitest'
import {
  applyWeeklyPostIncidentReviewCloseoutRewardBranchTick,
  buildCloseoutRewardBranchToken,
  derivePostIncidentCloseoutRewardBranch,
  parseCloseoutRewardBranchToken,
} from '../domain/postIncidentReviewCloseoutRewardBranch'
import { POST_INCIDENT_REVIEW_STUB_REGISTRY } from '../domain/postIncidentReviewRegistry'
import type { RecurrentCatastropheRecord } from '../domain/recurrentCatastropheAmeliorationRegistry'
import {
  applyWeeklyPostIncidentReviewCreationTick,
  buildQualifyingIncidentReviewRecordForDraft,
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

describe('postIncidentReviewCloseoutRewardBranch (SPE-868 slice 28)', () => {
  const caseCloseoutDraft: QualifyingIncidentReviewDraft = {
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
    kind: 'raid',
    anchorWeek: 12,
  }

  it('derives containment_priority for high-adherence qualifying case closeout', () => {
    const record = buildQualifyingIncidentReviewRecordForDraft(caseCloseoutDraft, 12)

    expect(derivePostIncidentCloseoutRewardBranch(record!)).toBe('containment_priority')
  })

  it('derives contested_containment when procedure adherence is below threshold', () => {
    const record = buildQualifyingIncidentReviewRecordForDraft(caseCloseoutDraft, 12)
    const contested = {
      ...record!,
      procedureAdherenceScore: 0.5,
    }

    expect(derivePostIncidentCloseoutRewardBranch(contested)).toBe('contested_containment')
  })

  it('derives threshold_mitigation for near-catastrophe closeout path', () => {
    const record = buildQualifyingIncidentReviewRecordForDraft(nearCatastropheDraft, 12)

    expect(derivePostIncidentCloseoutRewardBranch(record!)).toBe('threshold_mitigation')
  })

  it('derives recurrence_softening for cycle closeout with recurrence observed', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const catastrophes = {
      [baseCatastrophe().id]: baseCatastrophe({
        recurrenceCount: 4,
        lastOccurrenceWeek: 53,
        postIncidentReviewRefs: ['review:cycle-4-closeout'],
      }),
    }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, catastrophes, 53)
    const record = created['review:cycle-4-closeout']

    expect(derivePostIncidentCloseoutRewardBranch(record!)).toBe('recurrence_softening')
  })

  it('returns undefined for stub registry fixtures without orchestration week token', () => {
    const stub = POST_INCIDENT_REVIEW_STUB_REGISTRY['review:cycle-3-closeout']

    expect(derivePostIncidentCloseoutRewardBranch(stub)).toBeUndefined()
  })

  it('builds and parses reward branch tokens', () => {
    const token = buildCloseoutRewardBranchToken('containment_priority')

    expect(token).toBe('reward_branch:containment_priority')
    expect(parseCloseoutRewardBranchToken(token)).toBe('containment_priority')
    expect(parseCloseoutRewardBranchToken('follow_on:training-ref:threat-assessment')).toBeUndefined()
  })

  it('appends one reward branch token when a qualifying review materializes', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [caseCloseoutDraft])
    const next = applyWeeklyPostIncidentReviewCloseoutRewardBranchTick(prior, created)
    const record = next['review:case-case-major-closeout']

    expect(record?.unknownFields).toEqual([
      'orchestration_week:12',
      'reward_branch:containment_priority',
    ])
  })

  it('is idempotent when re-run for the same materialized review', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [caseCloseoutDraft])
    const once = applyWeeklyPostIncidentReviewCloseoutRewardBranchTick(prior, created)
    const twice = applyWeeklyPostIncidentReviewCloseoutRewardBranchTick(once, once)

    expect(twice).toBe(once)
    expect(twice['review:case-case-major-closeout']?.unknownFields).toEqual([
      'orchestration_week:12',
      'reward_branch:containment_priority',
    ])
  })

  it('derives the same branch deterministically across repeated calls', () => {
    const record = buildQualifyingIncidentReviewRecordForDraft(caseCloseoutDraft, 12)
    const first = derivePostIncidentCloseoutRewardBranch(record!)
    const second = derivePostIncidentCloseoutRewardBranch(record!)

    expect(first).toBe(second)
    expect(first).toBe('containment_priority')
  })
})
