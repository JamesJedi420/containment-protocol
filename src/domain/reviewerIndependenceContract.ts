/**
 * SPE-3731 — reviewer independence, recusal, and substitute-review routing (slice 1).
 *
 * Pure deterministic contract for detecting material reviewer conflicts,
 * recusal, substitution, escalation, and unresolved independence debt.
 * Consumes authoritative participation references; does not own command,
 * emergency, belief-screening, automation, investigation, or post-incident
 * lifecycle.
 */

export const REVIEWER_INDEPENDENCE_SCHEMA_VERSION = 'spe-3731.v1' as const
export type ReviewerIndependenceSchemaVersion = typeof REVIEWER_INDEPENDENCE_SCHEMA_VERSION

export type ActorId = string
export type ReviewInstanceId = string

export type MaterialInterestRole =
  | 'requester'
  | 'beneficiary'
  | 'subject'
  | 'causal_contributor'
  | 'investigator'
  | 'original_approver'
  | 'configured_interested_party'

export interface ParticipationRecord {
  readonly actorId: ActorId
  readonly roles: readonly MaterialInterestRole[]
}

export interface AuthorityCandidate {
  readonly actorId: ActorId
  readonly authorityLevel: number
  readonly eligibleForIndependentReview: boolean
}

export interface ReviewerIndependenceInput {
  readonly schemaVersion: ReviewerIndependenceSchemaVersion
  readonly reviewInstanceId: ReviewInstanceId
  readonly requiresIndependence: boolean
  readonly proposedReviewerId: ActorId
  readonly participants: readonly ParticipationRecord[]
  readonly authorityCandidates: readonly AuthorityCandidate[]
  readonly emergencyActionPermitted: boolean
  readonly currentAuthorityLevel: number
  readonly existingDebtResolved: boolean
}

export type IndependenceOutcome =
  | 'eligible'
  | 'eligible_with_controls'
  | 'recused'
  | 'substitute_review_required'
  | 'escalated'
  | 'independent_review_unavailable'
  | 'independently_reviewed'

export interface ReviewerIndependenceResult {
  readonly schemaVersion: ReviewerIndependenceSchemaVersion
  readonly reviewInstanceId: ReviewInstanceId
  readonly outcome: IndependenceOutcome
  readonly conflictBasis: readonly MaterialInterestRole[]
  readonly recusedActorId?: ActorId
  readonly substituteReviewerId?: ActorId
  readonly escalatedToLevel?: number
  readonly unresolvedIndependenceDebt: boolean
  readonly provenance: {
    readonly originalProposedReviewerId: ActorId
    readonly detectedAt: 'evaluation'
  }
}

function findConflicts(
  proposedReviewerId: ActorId,
  participants: readonly ParticipationRecord[],
): MaterialInterestRole[] {
  const roles: MaterialInterestRole[] = []
  for (const p of participants) {
    if (p.actorId === proposedReviewerId) {
      roles.push(...p.roles)
    }
  }
  return [...new Set(roles)].sort()
}

function selectSubstitute(
  candidates: readonly AuthorityCandidate[],
  excludedId: ActorId,
  currentLevel: number,
): AuthorityCandidate | undefined {
  const eligible = candidates
    .filter(
      (c) =>
        c.actorId !== excludedId &&
        c.eligibleForIndependentReview &&
        c.authorityLevel >= currentLevel,
    )
    .sort((a, b) => {
      if (a.authorityLevel !== b.authorityLevel) return a.authorityLevel - b.authorityLevel
      return a.actorId.localeCompare(b.actorId)
    })
  return eligible[0]
}

export function evaluateReviewerIndependence(
  input: ReviewerIndependenceInput,
): ReviewerIndependenceResult {
  if (input.schemaVersion !== REVIEWER_INDEPENDENCE_SCHEMA_VERSION) {
    throw new Error('unsupported schema version')
  }

  const conflictBasis = findConflicts(input.proposedReviewerId, input.participants)
  const hasConflict = conflictBasis.length > 0 && input.requiresIndependence

  if (!input.requiresIndependence || !hasConflict) {
    return {
      schemaVersion: input.schemaVersion,
      reviewInstanceId: input.reviewInstanceId,
      outcome: input.existingDebtResolved ? 'independently_reviewed' : 'eligible',
      conflictBasis: [],
      unresolvedIndependenceDebt: false,
      provenance: { originalProposedReviewerId: input.proposedReviewerId, detectedAt: 'evaluation' },
    }
  }

  // Conflicted: attempt substitute
  const substitute = selectSubstitute(
    input.authorityCandidates,
    input.proposedReviewerId,
    input.currentAuthorityLevel,
  )

  if (substitute && substitute.authorityLevel === input.currentAuthorityLevel) {
    return {
      schemaVersion: input.schemaVersion,
      reviewInstanceId: input.reviewInstanceId,
      outcome: 'substitute_review_required',
      conflictBasis,
      recusedActorId: input.proposedReviewerId,
      substituteReviewerId: substitute.actorId,
      unresolvedIndependenceDebt: false,
      provenance: { originalProposedReviewerId: input.proposedReviewerId, detectedAt: 'evaluation' },
    }
  }

  if (substitute && substitute.authorityLevel > input.currentAuthorityLevel) {
    return {
      schemaVersion: input.schemaVersion,
      reviewInstanceId: input.reviewInstanceId,
      outcome: 'escalated',
      conflictBasis,
      recusedActorId: input.proposedReviewerId,
      substituteReviewerId: substitute.actorId,
      escalatedToLevel: substitute.authorityLevel,
      unresolvedIndependenceDebt: false,
      provenance: { originalProposedReviewerId: input.proposedReviewerId, detectedAt: 'evaluation' },
    }
  }

  // No substitute: unresolved debt (even if emergency permitted)
  return {
    schemaVersion: input.schemaVersion,
    reviewInstanceId: input.reviewInstanceId,
    outcome: input.emergencyActionPermitted
      ? 'independent_review_unavailable'
      : 'independent_review_unavailable',
    conflictBasis,
    recusedActorId: input.proposedReviewerId,
    unresolvedIndependenceDebt: true,
    provenance: { originalProposedReviewerId: input.proposedReviewerId, detectedAt: 'evaluation' },
  }
}
