/**
 * SPE-1339 Bounded Domain Seam: Learned-vs-Operationally-Ready Separation
 *
 * Models the separation between having learned a capability and being operationally ready to use it.
 * - Pure domain logic, no side effects, no UI/store coupling.
 * - Explicit readiness result: operationally_ready, learned_but_not_ready, or blocked.
 * - No research graph, staffing sim, or cognitive overload logic.
 */

import type { Id } from './models'

/**
 * The type of capability being evaluated for readiness.
 */
export type CapabilityReadinessKind = 'skill' | 'protocol' | 'knowledge' | 'other'

/**
 * Input for a capability readiness evaluation.
 */
export interface CapabilityReadinessInput {
  capabilityId: Id
  kind: CapabilityReadinessKind
  ownerId: Id
  /** True if the capability has been learned/acquired. */
  learned: boolean
  /** Optional: true if operational readiness conditions are met (e.g., training complete, infrastructure ready). */
  readinessConditionsMet?: boolean
  /** Optional: true if the capability is inherently ready (e.g., no additional prep needed). */
  inherentlyReady?: boolean
}

/**
 * Result of a capability readiness evaluation.
 */
export type CapabilityReadinessResultKind =
  | 'operationally_ready'     // Ready for operational use
  | 'learned_but_not_ready'   // Learned but not yet operationally ready
  | 'blocked'                 // Blocked: not learned or other issues

export interface CapabilityReadinessResult {
  kind: CapabilityReadinessResultKind
  reason: string
  /** Optional: estimated weeks required to become operationally ready. */
  readinessWeeks?: number
}

/**
 * Pure domain seam: determines the operational readiness of a capability.
 *
 * - If not learned, returns 'blocked'.
 * - If learned and readiness conditions met or inherently ready, returns 'operationally_ready'.
 * - If learned but not ready, returns 'learned_but_not_ready' with duration.
 * - No side effects, no state mutation.
 */
export function evaluateCapabilityReadiness(input: CapabilityReadinessInput): CapabilityReadinessResult {
  if (!input.learned) {
    return {
      kind: 'blocked',
      reason: 'Capability has not been learned/acquired.',
    }
  }
  if (input.readinessConditionsMet === true || input.inherentlyReady === true) {
    return {
      kind: 'operationally_ready',
      reason: 'Capability is learned and operational readiness conditions are met.',
    }
  }
  // Learned but not ready: default readiness duration: 2 weeks, can be parameterized later
  return {
    kind: 'learned_but_not_ready',
    reason: 'Capability is learned but operational readiness conditions are not met.',
    readinessWeeks: 2,
  }
}