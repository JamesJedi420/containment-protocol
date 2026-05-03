/**
 * SPE-27 Bounded Domain Seam: Capability Dissemination & Teaching
 * 
 * Models the transfer of a capability (skill, protocol, knowledge, etc.) from a source owner to a recipient.
 * - Pure domain logic, no side effects, no UI/store coupling.
 * - Explicit transfer result: transferable, blocked (non-transferable), or requires teaching/study time.
 * - No research graph, staffing sim, or cognitive overload logic.
 */

import type { Id } from './models'

/**
 * The type of capability being transferred (could be skill, protocol, etc.).
 */
export type CapabilityDisseminationKind = 'skill' | 'protocol' | 'knowledge' | 'other'

/**
 * Input for a capability dissemination attempt.
 */
export interface CapabilityDisseminationInput {
  capabilityId: Id
  kind: CapabilityDisseminationKind
  sourceOwnerId: Id
  recipientId: Id
  /** Optional: path or context for organization-level dissemination. */
  recipientOrgPath?: string
  /** Optional: true if the source is willing/able to teach, not just transfer. */
  teachingOffered?: boolean
  /** Optional: true if the recipient is eligible for direct transfer (e.g., meets prerequisites). */
  recipientEligible?: boolean
  /** Optional: true if the capability is inherently transferable (e.g., not secret/locked). */
  transferable?: boolean
}

/**
 * Result of a capability dissemination attempt.
 */
export type CapabilityDisseminationResultKind =
  | 'transferable'      // Can be transferred directly
  | 'blocked'           // Blocked: non-transferable (e.g., secret, locked, or recipient ineligible)
  | 'requires_teaching' // Can be taught, but not directly transferred

export interface CapabilityDisseminationResult {
  kind: CapabilityDisseminationResultKind
  reason: string
  /** Optional: estimated weeks required if teaching/study is needed. */
  teachingWeeks?: number
}

/**
 * Pure domain seam: determines the result of a capability dissemination attempt.
 *
 * - If not transferable, returns 'blocked'.
 * - If transferable and recipient eligible, returns 'transferable'.
 * - If teaching is offered/possible, returns 'requires_teaching' with duration.
 * - No side effects, no state mutation.
 */
export function evaluateCapabilityDissemination(input: CapabilityDisseminationInput): CapabilityDisseminationResult {
  if (input.transferable === false) {
    return {
      kind: 'blocked',
      reason: 'Capability is non-transferable (locked, secret, or restricted).',
    }
  }
  if (input.recipientEligible === true) {
    return {
      kind: 'transferable',
      reason: 'Recipient is eligible and capability is transferable.',
    }
  }
  if (input.teachingOffered) {
    // Default teaching duration: 4 weeks, can be parameterized later
    return {
      kind: 'requires_teaching',
      reason: 'Recipient requires teaching/study time to acquire capability.',
      teachingWeeks: 4,
    }
  }
  return {
    kind: 'blocked',
    reason: 'Recipient is not eligible for direct transfer and teaching is not offered.',
  }
}
