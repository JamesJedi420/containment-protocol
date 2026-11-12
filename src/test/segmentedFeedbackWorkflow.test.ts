import { describe, expect, it } from 'vitest'

import {
  BORDERLINE_FEEDBACK_CHANNEL_BATCH_FIXTURE,
  CANONICAL_FEEDBACK_CHANNEL_BATCH_FIXTURE,
  evaluateSegmentedFeedbackWorkflow,
  INVALID_FEEDBACK_CHANNEL_BATCH_FIXTURE,
  INVALID_FEEDBACK_WEIGHT_POLICY_FIXTURE,
  validateFeedbackChannelBatch,
} from '../domain/segmentedFeedbackWorkflow'

describe('segmentedFeedbackWorkflow (SPE-2476 slice 1)', () => {
  it('ranks the canonical feedback batch fixture with stable channel weights and ordering', () => {
    const decision = evaluateSegmentedFeedbackWorkflow(CANONICAL_FEEDBACK_CHANNEL_BATCH_FIXTURE)

    expect(decision.status).toBe('ranked')
    expect(decision.groupingPolicy).toBe('by_channel')
    expect(decision.validationIssues).toEqual([])
    expect(decision.reasonCodes).toEqual([])
    expect(decision.remediationNotes).toEqual([])
    expect(decision.rankedEntries).toHaveLength(3)
    expect(decision.rankedEntries[0]).toEqual({
      feedbackId: 'feedback:security-disclosure-canonical',
      channelType: 'security',
      channelWeight: 1,
      confidenceScore: 0.92,
      weightedScore: 0.92,
      groupKey: 'channel:security',
      rank: 1,
      summary:
        'Deterministic privilege-escalation path in intake validation when malformed payloads bypass channel checks.',
      reporterRef: 'tester:security-auditor',
      relatedSubsystemRef: 'subsystem:contribution-intake',
    })
    expect(decision.rankedEntries[1]?.feedbackId).toBe('feedback:bug-repro-canonical')
    expect(decision.rankedEntries[1]?.weightedScore).toBe(0.624)
    expect(decision.rankedEntries[2]?.feedbackId).toBe('feedback:rfc-design-canonical')
    expect(decision.rankedEntries[2]?.weightedScore).toBe(0.26)
  })

  it('rejects invalid channel types and channel weights with deterministic reason codes', () => {
    const invalidChannelDecision = evaluateSegmentedFeedbackWorkflow(
      INVALID_FEEDBACK_CHANNEL_BATCH_FIXTURE
    )

    expect(invalidChannelDecision.status).toBe('rejected')
    expect(invalidChannelDecision.rankedEntries).toEqual([])
    expect(invalidChannelDecision.reasonCodes).toEqual([
      'invalid_channel_type',
      'invalid_confidence_score',
      'missing_channel_type',
      'missing_feedback_id',
      'summary_too_short',
    ])
    expect(invalidChannelDecision.validationIssues.map((issue) => issue.code)).toEqual(
      invalidChannelDecision.reasonCodes
    )

    const invalidWeightDecision = evaluateSegmentedFeedbackWorkflow(
      CANONICAL_FEEDBACK_CHANNEL_BATCH_FIXTURE,
      INVALID_FEEDBACK_WEIGHT_POLICY_FIXTURE
    )

    expect(invalidWeightDecision.status).toBe('rejected')
    expect(invalidWeightDecision.reasonCodes).toEqual(['invalid_channel_weight'])
    expect(invalidWeightDecision.validationIssues).toHaveLength(2)
  })

  it('returns needs_revision for the borderline confidence fixture with bounded remediation notes', () => {
    const decision = evaluateSegmentedFeedbackWorkflow(BORDERLINE_FEEDBACK_CHANNEL_BATCH_FIXTURE)

    expect(decision.status).toBe('needs_revision')
    expect(decision.validationIssues).toEqual([])
    expect(decision.reasonCodes).toEqual(['confidence_borderline'])
    expect(decision.remediationNotes).toHaveLength(1)
    expect(decision.remediationNotes[0]?.code).toBe('confidence_borderline')
    expect(decision.rankedEntries).toHaveLength(1)
    expect(decision.rankedEntries[0]?.feedbackId).toBe('feedback:borderline-confidence')
    expect(decision.rankedEntries[0]?.weightedScore).toBe(0.24)
  })

  it('safe-fails malformed payloads without throw', () => {
    const validation = validateFeedbackChannelBatch(null as unknown as never)
    const decision = evaluateSegmentedFeedbackWorkflow(undefined as unknown as never)

    expect(validation.valid).toBe(false)
    expect(validation.issues[0]?.code).toBe('invalid_payload')
    expect(decision.status).toBe('rejected')
    expect(decision.reasonCodes).toEqual(['invalid_payload'])
  })

  it('returns byte-stable output on repeated evaluation calls', () => {
    const batches = [
      CANONICAL_FEEDBACK_CHANNEL_BATCH_FIXTURE,
      INVALID_FEEDBACK_CHANNEL_BATCH_FIXTURE,
      BORDERLINE_FEEDBACK_CHANNEL_BATCH_FIXTURE,
    ] as const

    for (const batch of batches) {
      const first = evaluateSegmentedFeedbackWorkflow(batch)
      const second = evaluateSegmentedFeedbackWorkflow(batch)

      expect(first).toEqual(second)
    }
  })
})
