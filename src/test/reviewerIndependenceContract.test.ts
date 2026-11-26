import { describe, expect, it } from 'vitest'
import {
  REVIEWER_INDEPENDENCE_SCHEMA_VERSION,
  evaluateReviewerIndependence,
  type ReviewerIndependenceInput,
} from '../domain/reviewerIndependenceContract'

const baseInput = (
  overrides: Partial<ReviewerIndependenceInput> = {},
): ReviewerIndependenceInput => ({
  schemaVersion: REVIEWER_INDEPENDENCE_SCHEMA_VERSION,
  reviewInstanceId: 'rev-1',
  requiresIndependence: true,
  proposedReviewerId: 'actor-a',
  participants: [],
  authorityCandidates: [],
  emergencyActionPermitted: false,
  currentAuthorityLevel: 1,
  existingDebtResolved: false,
  ...overrides,
})

describe('evaluateReviewerIndependence (SPE-3731 slice 1)', () => {
  it('returns eligible when no conflict and independence required', () => {
    const result = evaluateReviewerIndependence(baseInput())
    expect(result.outcome).toBe('eligible')
    expect(result.unresolvedIndependenceDebt).toBe(false)
    expect(result.conflictBasis).toEqual([])
  })

  it('detects requester conflict and records recusal with substitute', () => {
    const result = evaluateReviewerIndependence(
      baseInput({
        participants: [{ actorId: 'actor-a', roles: ['requester'] }],
        authorityCandidates: [
          { actorId: 'actor-a', authorityLevel: 1, eligibleForIndependentReview: true },
          { actorId: 'actor-b', authorityLevel: 1, eligibleForIndependentReview: true },
        ],
      }),
    )
    expect(result.outcome).toBe('substitute_review_required')
    expect(result.conflictBasis).toEqual(['requester'])
    expect(result.recusedActorId).toBe('actor-a')
    expect(result.substituteReviewerId).toBe('actor-b')
    expect(result.unresolvedIndependenceDebt).toBe(false)
  })

  it('escalates when only higher-level substitute is available', () => {
    const result = evaluateReviewerIndependence(
      baseInput({
        participants: [{ actorId: 'actor-a', roles: ['original_approver'] }],
        authorityCandidates: [
          { actorId: 'actor-c', authorityLevel: 2, eligibleForIndependentReview: true },
        ],
      }),
    )
    expect(result.outcome).toBe('escalated')
    expect(result.escalatedToLevel).toBe(2)
    expect(result.substituteReviewerId).toBe('actor-c')
  })

  it('records unresolved independence debt when no independent reviewer is available', () => {
    const result = evaluateReviewerIndependence(
      baseInput({
        participants: [{ actorId: 'actor-a', roles: ['investigator'] }],
        authorityCandidates: [
          { actorId: 'actor-a', authorityLevel: 1, eligibleForIndependentReview: true },
        ],
        emergencyActionPermitted: true,
      }),
    )
    expect(result.outcome).toBe('independent_review_unavailable')
    expect(result.unresolvedIndependenceDebt).toBe(true)
    expect(result.recusedActorId).toBe('actor-a')
  })

  it('does not treat non-independence review as conflicted', () => {
    const result = evaluateReviewerIndependence(
      baseInput({
        requiresIndependence: false,
        participants: [{ actorId: 'actor-a', roles: ['beneficiary'] }],
      }),
    )
    expect(result.outcome).toBe('eligible')
    expect(result.conflictBasis).toEqual([])
  })

  it('resolves prior debt when existingDebtResolved is true and no new conflict', () => {
    const result = evaluateReviewerIndependence(
      baseInput({ existingDebtResolved: true, participants: [] }),
    )
    expect(result.outcome).toBe('independently_reviewed')
  })

  it('is deterministic on identical inputs', () => {
    const input = baseInput({
      participants: [{ actorId: 'actor-a', roles: ['subject', 'requester'] }],
      authorityCandidates: [
        { actorId: 'actor-z', authorityLevel: 1, eligibleForIndependentReview: true },
        { actorId: 'actor-b', authorityLevel: 1, eligibleForIndependentReview: true },
      ],
    })
    const r1 = evaluateReviewerIndependence(input)
    const r2 = evaluateReviewerIndependence(input)
    expect(r1).toEqual(r2)
    expect(r1.substituteReviewerId).toBe('actor-b') // sorted by id
  })
})
