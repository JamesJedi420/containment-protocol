/**
 * SPE-3055 — operational personnel claim outcome producer (slice 1: recovery seam).
 *
 * Resolves compact caller-owned claim attempt facts into a deterministic claim
 * outcome and maps that outcome to the typed AssignmentClaimEvidence packet
 * consumed by SPE-3735 assignBreachRecovery. Does not invent duty/readiness,
 * squad availability, patrol/coverage, or deployment engines. A claim is a
 * pre-deployment commitment only — it does not deploy personnel.
 */

import type { AssignmentClaimEvidence } from './breachOriginRecovery'

export const OPERATIONAL_PERSONNEL_CLAIM_OWNER = 'SPE-3055' as const
export const OPERATIONAL_PERSONNEL_CLAIM_SCHEMA_VERSION =
  'spe-3055.operational-personnel-claim.v1' as const

export const OPERATIONAL_PERSONNEL_CLAIM_REASON_CODES = [
  'claim_held',
  'malformed_input',
  'claim_not_committed',
  'requirement_set_unsatisfied',
  'higher_priority_commitment',
] as const
export type OperationalPersonnelClaimReasonCode =
  (typeof OPERATIONAL_PERSONNEL_CLAIM_REASON_CODES)[number]

/**
 * Caller-owned attempt facts. Duty/readiness (SPE-1024) and squad availability
 * (SPE-1311) stay with their owners; this seam only evaluates explicit claim
 * commit and requirement-set evidence.
 */
export type OperationalPersonnelClaimAttempt = Readonly<{
  attemptId: string
  /** Pending response / recovery operation that intends to hold the claim. */
  operationRef: string
  /** Stable personnel/team requirement identifiers (caller-owned). */
  requirementRefs: readonly string[]
  /** True when the pre-deployment claim commitment was actually established. */
  claimCommitted: boolean
  /**
   * Explicit caller claim that the full required set can satisfy the claim.
   * When false, the claim fails closed as requirement_set_unsatisfied.
   */
  requirementSetSatisfied?: boolean
  /**
   * True when an existing higher-priority or irreversible commitment blocks
   * this claim. Preserved rather than silently stolen.
   */
  blockedByHigherPriorityCommitment?: boolean
}>

export type OperationalPersonnelClaimOutcome = Readonly<{
  schemaVersion: typeof OPERATIONAL_PERSONNEL_CLAIM_SCHEMA_VERSION
  owner: typeof OPERATIONAL_PERSONNEL_CLAIM_OWNER
  claimId: string
  operationRef: string
  claimed: boolean
  reasonCodes: readonly OperationalPersonnelClaimReasonCode[]
}>

export type ResolveOperationalPersonnelClaimOutcomeResult =
  | { readonly ok: true; readonly outcome: OperationalPersonnelClaimOutcome }
  | {
      readonly ok: false
      readonly reasonCode: 'malformed_input'
      readonly reasonCodes: readonly ['malformed_input']
    }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function freezeOutcome(
  outcome: OperationalPersonnelClaimOutcome
): OperationalPersonnelClaimOutcome {
  return Object.freeze({
    ...outcome,
    reasonCodes: Object.freeze([...outcome.reasonCodes]),
  })
}

function buildClaimId(attemptId: string): string {
  return `claim:${attemptId.trim()}`
}

function parseRequirementRefs(
  refs: readonly string[] | null | undefined
): readonly string[] | undefined {
  if (!Array.isArray(refs) || refs.length === 0) return undefined
  const trimmed: string[] = []
  for (const ref of refs) {
    if (!isNonEmptyString(ref)) return undefined
    trimmed.push(ref.trim())
  }
  return Object.freeze(trimmed)
}

function failClosedOutcome(
  base: {
    readonly schemaVersion: typeof OPERATIONAL_PERSONNEL_CLAIM_SCHEMA_VERSION
    readonly owner: typeof OPERATIONAL_PERSONNEL_CLAIM_OWNER
    readonly claimId: string
    readonly operationRef: string
  },
  reasonCode: Exclude<
    OperationalPersonnelClaimReasonCode,
    'claim_held' | 'malformed_input'
  >
): ResolveOperationalPersonnelClaimOutcomeResult {
  return {
    ok: true,
    outcome: freezeOutcome({
      ...base,
      claimed: false,
      reasonCodes: [reasonCode],
    }),
  }
}

/**
 * Resolve an operational personnel claim attempt into a durable-shaped outcome.
 * Malformed ids / empty requirements / non-boolean flags reject without evidence.
 * Fail-closed unclaimed paths still produce an outcome packet so SPE-3735 can
 * reject with assignment_claim_not_held.
 */
export function resolveOperationalPersonnelClaimOutcome(
  attempt: OperationalPersonnelClaimAttempt | null | undefined
): ResolveOperationalPersonnelClaimOutcomeResult {
  if (attempt == null) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input']),
    }
  }

  if (!isNonEmptyString(attempt.attemptId) || !isNonEmptyString(attempt.operationRef)) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input']),
    }
  }

  const requirementRefs = parseRequirementRefs(attempt.requirementRefs)
  if (requirementRefs === undefined) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input']),
    }
  }

  if (typeof attempt.claimCommitted !== 'boolean') {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input']),
    }
  }

  if (
    (attempt.requirementSetSatisfied !== undefined &&
      typeof attempt.requirementSetSatisfied !== 'boolean') ||
    (attempt.blockedByHigherPriorityCommitment !== undefined &&
      typeof attempt.blockedByHigherPriorityCommitment !== 'boolean')
  ) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input']),
    }
  }

  const operationRef = attempt.operationRef.trim()
  const claimId = buildClaimId(attempt.attemptId)
  const base = {
    schemaVersion: OPERATIONAL_PERSONNEL_CLAIM_SCHEMA_VERSION,
    owner: OPERATIONAL_PERSONNEL_CLAIM_OWNER,
    claimId,
    operationRef,
  } as const

  if (attempt.blockedByHigherPriorityCommitment === true) {
    return failClosedOutcome(base, 'higher_priority_commitment')
  }

  if (attempt.requirementSetSatisfied === false) {
    return failClosedOutcome(base, 'requirement_set_unsatisfied')
  }

  if (attempt.claimCommitted !== true) {
    return failClosedOutcome(base, 'claim_not_committed')
  }

  return {
    ok: true,
    outcome: freezeOutcome({
      ...base,
      claimed: true,
      reasonCodes: ['claim_held'],
    }),
  }
}

/**
 * Map a resolved SPE-3055 outcome to the SPE-3735 AssignmentClaimEvidence packet.
 * Does not invent claim truth — only projects already-resolved fields.
 */
export function toAssignmentClaimEvidence(
  outcome: OperationalPersonnelClaimOutcome
): AssignmentClaimEvidence {
  return Object.freeze({
    producerOwner: OPERATIONAL_PERSONNEL_CLAIM_OWNER,
    claimId: outcome.claimId,
    operationRef: outcome.operationRef,
    claimed: outcome.claimed,
  })
}
