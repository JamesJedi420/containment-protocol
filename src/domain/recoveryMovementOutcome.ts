/**
 * SPE-1095 — recovery movement outcome producer (slice 1: recovery seam).
 *
 * Resolves compact caller-owned movement attempt facts into a deterministic
 * movement outcome and maps that outcome to the typed RecoveryMovementEvidence
 * packet consumed by SPE-3735 confirmRecoveryMovement. Does not invent
 * pathfinding, route classes, capacity, congestion, or verified recontainment.
 */

import type { RecoveryMovementEvidence } from './breachOriginRecovery'

export const RECOVERY_MOVEMENT_OUTCOME_OWNER = 'SPE-1095' as const
export const RECOVERY_MOVEMENT_OUTCOME_SCHEMA_VERSION = 'spe-1095.recovery-movement.v1' as const

export const RECOVERY_MOVEMENT_REASON_CODES = [
  'movement_in_transit',
  'movement_arrived',
  'malformed_input',
  'route_ineligible',
  'transit_interrupted',
  'movement_not_committed',
] as const
export type RecoveryMovementReasonCode = (typeof RECOVERY_MOVEMENT_REASON_CODES)[number]

/**
 * Caller-owned attempt facts. Route geometry / path selection stays with the
 * full SPE-1095 thoroughfare owners; this seam only evaluates explicit commit
 * and arrival evidence.
 */
export type RecoveryMovementAttempt = Readonly<{
  attemptId: string
  subjectRef: string
  /** True when the movement action was actually applied on a canonical channel. */
  movementCommitted: boolean
  /** True when the subject has arrived at the recovery destination. */
  arrivedAtDestination: boolean
  /**
   * Explicit caller claim that the chosen route is eligible for this subject.
   * When false, movement fails closed as route_ineligible.
   */
  routeEligible?: boolean
  /** True when transit was interrupted after a commit was attempted. */
  transitInterrupted?: boolean
}>

export type RecoveryMovementOutcome = Readonly<{
  schemaVersion: typeof RECOVERY_MOVEMENT_OUTCOME_SCHEMA_VERSION
  owner: typeof RECOVERY_MOVEMENT_OUTCOME_OWNER
  movementId: string
  subjectRef: string
  movementCommitted: boolean
  arrivedAtDestination: boolean
  reasonCodes: readonly RecoveryMovementReasonCode[]
}>

export type ResolveRecoveryMovementOutcomeResult =
  | { readonly ok: true; readonly outcome: RecoveryMovementOutcome }
  | {
      readonly ok: false
      readonly reasonCode: 'malformed_input'
      readonly reasonCodes: readonly ['malformed_input']
    }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function freezeOutcome(outcome: RecoveryMovementOutcome): RecoveryMovementOutcome {
  return Object.freeze({
    ...outcome,
    reasonCodes: Object.freeze([...outcome.reasonCodes]),
  })
}

function buildMovementId(attemptId: string): string {
  return `move:${attemptId.trim()}`
}

function failClosedOutcome(
  base: {
    readonly schemaVersion: typeof RECOVERY_MOVEMENT_OUTCOME_SCHEMA_VERSION
    readonly owner: typeof RECOVERY_MOVEMENT_OUTCOME_OWNER
    readonly movementId: string
    readonly subjectRef: string
  },
  reasonCode: Exclude<
    RecoveryMovementReasonCode,
    'movement_in_transit' | 'movement_arrived' | 'malformed_input'
  >
): ResolveRecoveryMovementOutcomeResult {
  return {
    ok: true,
    outcome: freezeOutcome({
      ...base,
      movementCommitted: false,
      arrivedAtDestination: false,
      reasonCodes: [reasonCode],
    }),
  }
}

/**
 * Resolve a recovery-movement attempt into a durable-shaped outcome.
 * Malformed ids / non-boolean flags reject without evidence. Fail-closed
 * uncommitted paths still produce an outcome packet so SPE-3735 can reject
 * with movement_not_committed.
 */
export function resolveRecoveryMovementOutcome(
  attempt: RecoveryMovementAttempt | null | undefined
): ResolveRecoveryMovementOutcomeResult {
  if (attempt == null) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input']),
    }
  }

  if (!isNonEmptyString(attempt.attemptId) || !isNonEmptyString(attempt.subjectRef)) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input']),
    }
  }

  if (typeof attempt.movementCommitted !== 'boolean') {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input']),
    }
  }

  if (typeof attempt.arrivedAtDestination !== 'boolean') {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input']),
    }
  }

  const subjectRef = attempt.subjectRef.trim()
  const movementId = buildMovementId(attempt.attemptId)
  const base = {
    schemaVersion: RECOVERY_MOVEMENT_OUTCOME_SCHEMA_VERSION,
    owner: RECOVERY_MOVEMENT_OUTCOME_OWNER,
    movementId,
    subjectRef,
  } as const

  if (attempt.routeEligible === false) {
    return failClosedOutcome(base, 'route_ineligible')
  }

  if (attempt.transitInterrupted === true) {
    return failClosedOutcome(base, 'transit_interrupted')
  }

  if (attempt.movementCommitted !== true) {
    // Arrived-without-commit claims fail closed as uncommitted (no fabricated arrival).
    return failClosedOutcome(base, 'movement_not_committed')
  }

  if (attempt.arrivedAtDestination !== true) {
    return {
      ok: true,
      outcome: freezeOutcome({
        ...base,
        movementCommitted: true,
        arrivedAtDestination: false,
        reasonCodes: ['movement_in_transit'],
      }),
    }
  }

  return {
    ok: true,
    outcome: freezeOutcome({
      ...base,
      movementCommitted: true,
      arrivedAtDestination: true,
      reasonCodes: ['movement_arrived'],
    }),
  }
}

/**
 * Map a resolved SPE-1095 outcome to the SPE-3735 RecoveryMovementEvidence packet.
 * Does not invent movement truth — only projects already-resolved fields.
 */
export function toRecoveryMovementEvidence(
  outcome: RecoveryMovementOutcome
): RecoveryMovementEvidence {
  return Object.freeze({
    producerOwner: RECOVERY_MOVEMENT_OUTCOME_OWNER,
    movementId: outcome.movementId,
    subjectRef: outcome.subjectRef,
    movementCommitted: outcome.movementCommitted,
    arrivedAtDestination: outcome.arrivedAtDestination,
  })
}
