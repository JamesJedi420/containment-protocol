/**
 * SPE-104 — capture/secure outcome producer (slice 1: recovery seam).
 *
 * Resolves compact caller-owned capture/restraint attempt facts into a
 * deterministic secured outcome and maps that outcome to the typed
 * CaptureSecureEvidence packet consumed by SPE-3735 confirmCaptureSecure.
 * Does not invent combat, grappling, tether physics, or verified recontainment.
 */

import type { ActorCapabilityFlags, PhysicalityState } from './actorTaxonomy'
import { resolvePhysicalityCompatibility } from './actorTaxonomy'
import type { CaptureSecureEvidence } from './breachOriginRecovery'

export const CAPTURE_SECURE_OUTCOME_OWNER = 'SPE-104' as const
export const CAPTURE_SECURE_OUTCOME_SCHEMA_VERSION = 'spe-104.capture-secure.v1' as const

export const CAPTURE_SECURE_REASON_CODES = [
  'capture_secured',
  'malformed_input',
  'category_mismatch',
  'restraint_incompatible',
  'control_not_committed',
  'restraint_broken',
] as const
export type CaptureSecureReasonCode = (typeof CAPTURE_SECURE_REASON_CODES)[number]

/**
 * Caller-owned attempt facts. Combat/odds resolution stays with SPE-73;
 * this seam only evaluates explicit control/restraint evidence.
 */
export type CaptureSecureAttempt = Readonly<{
  attemptId: string
  subjectRef: string
  /** True when the capture/control action was actually applied. */
  controlCommitted: boolean
  /**
   * Explicit caller claim that the restraint class matches the subject.
   * When false, secure fails closed as restraint_incompatible.
   */
  restraintCompatible: boolean
  /** True when the subject category exceeds the restraint model. */
  categoryMismatch?: boolean
  /** True when the subject broke free after control was applied. */
  escapeBrokeRestraint?: boolean
  /**
   * Optional SPE-1064 taxonomy hint. When present, conventional restraint
   * legality can force restraint_incompatible.
   */
  subjectActor?: Readonly<{
    physicality: PhysicalityState
    capabilities?: Pick<ActorCapabilityFlags, 'canRestrain'>
  }>
}>

export type CaptureSecureOutcome = Readonly<{
  schemaVersion: typeof CAPTURE_SECURE_OUTCOME_SCHEMA_VERSION
  owner: typeof CAPTURE_SECURE_OUTCOME_OWNER
  outcomeId: string
  subjectRef: string
  secured: boolean
  reasonCodes: readonly CaptureSecureReasonCode[]
}>

export type ResolveCaptureSecureOutcomeResult =
  | { readonly ok: true; readonly outcome: CaptureSecureOutcome }
  | {
      readonly ok: false
      readonly reasonCode: 'malformed_input'
      readonly reasonCodes: readonly ['malformed_input']
    }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function freezeOutcome(outcome: CaptureSecureOutcome): CaptureSecureOutcome {
  return Object.freeze({
    ...outcome,
    reasonCodes: Object.freeze([...outcome.reasonCodes]),
  })
}

function buildOutcomeId(attemptId: string): string {
  return `capture:${attemptId.trim()}`
}

function evaluateRestraintCompatibility(
  attempt: CaptureSecureAttempt
): CaptureSecureReasonCode | undefined {
  if (attempt.categoryMismatch === true) {
    return 'category_mismatch'
  }
  if (attempt.restraintCompatible !== true) {
    return 'restraint_incompatible'
  }

  const actor = attempt.subjectActor
  if (actor === undefined) {
    return undefined
  }

  const compatibility = resolvePhysicalityCompatibility({
    physicality: actor.physicality,
  })
  if (!compatibility.allowsConventionalRestraint) {
    return 'restraint_incompatible'
  }

  if (actor.capabilities?.canRestrain === false) {
    return 'restraint_incompatible'
  }

  return undefined
}

/**
 * Resolve a capture/secure attempt into a durable-shaped outcome.
 * Malformed ids reject without evidence. Fail-closed secure=false paths still
 * produce an outcome packet so SPE-3735 can terminal capture_failed.
 */
export function resolveCaptureSecureOutcome(
  attempt: CaptureSecureAttempt | null | undefined
): ResolveCaptureSecureOutcomeResult {
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

  if (typeof attempt.controlCommitted !== 'boolean') {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input']),
    }
  }

  if (typeof attempt.restraintCompatible !== 'boolean') {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      reasonCodes: Object.freeze(['malformed_input']),
    }
  }

  const subjectRef = attempt.subjectRef.trim()
  const outcomeId = buildOutcomeId(attempt.attemptId)
  const base = {
    schemaVersion: CAPTURE_SECURE_OUTCOME_SCHEMA_VERSION,
    owner: CAPTURE_SECURE_OUTCOME_OWNER,
    outcomeId,
    subjectRef,
  } as const

  const compatibilityFailure = evaluateRestraintCompatibility(attempt)
  if (compatibilityFailure !== undefined) {
    return {
      ok: true,
      outcome: freezeOutcome({
        ...base,
        secured: false,
        reasonCodes: [compatibilityFailure],
      }),
    }
  }

  if (attempt.controlCommitted !== true) {
    return {
      ok: true,
      outcome: freezeOutcome({
        ...base,
        secured: false,
        reasonCodes: ['control_not_committed'],
      }),
    }
  }

  if (attempt.escapeBrokeRestraint === true) {
    return {
      ok: true,
      outcome: freezeOutcome({
        ...base,
        secured: false,
        reasonCodes: ['restraint_broken'],
      }),
    }
  }

  return {
    ok: true,
    outcome: freezeOutcome({
      ...base,
      secured: true,
      reasonCodes: ['capture_secured'],
    }),
  }
}

/**
 * Map a resolved SPE-104 outcome to the SPE-3735 CaptureSecureEvidence packet.
 * Does not invent secured truth — only projects already-resolved fields.
 */
export function toCaptureSecureEvidence(outcome: CaptureSecureOutcome): CaptureSecureEvidence {
  return Object.freeze({
    producerOwner: CAPTURE_SECURE_OUTCOME_OWNER,
    outcomeId: outcome.outcomeId,
    subjectRef: outcome.subjectRef,
    secured: outcome.secured,
  })
}
