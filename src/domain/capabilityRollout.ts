/**
 * SPE-1417 Bounded Domain Seam: Capability Rollout Breadth & Progressive Expansion
 *
 * Models the organizational breadth of a capability family — separate from whether
 * that capability has been learned or is operationally ready. Breadth starts narrow
 * and expands only through explicit staged expansion conditions.
 *
 * - Pure domain logic, no side effects, no UI/store coupling.
 * - Three breadth tiers: narrow → unit → organization.
 * - Learned acquisition does NOT imply broader organizational availability.
 * - No research graph rewrite, no responder cognition, no models.ts widening.
 */

import type { Id } from './models'

/**
 * The three organizational breadth tiers a capability family can occupy.
 * - 'narrow': known only to the original acquiring operative/small cell
 * - 'unit': available across a unit or squad but not org-wide
 * - 'organization': fully unlocked across the organization
 */
export type RolloutBreadthTier = 'narrow' | 'unit' | 'organization'

/**
 * Compact snapshot of a capability family's rollout state.
 */
export interface CapabilityRolloutState {
  capabilityId: Id
  /** The tier at which this capability entered the organization. Always 'narrow' for new acquisitions. */
  initialTier: RolloutBreadthTier
  /** The current organizational breadth tier. */
  currentTier: RolloutBreadthTier
  /** True once the capability has reached full organizational access (currentTier === 'organization'). */
  orgAccessUnlocked: boolean
}

/**
 * Conditions that, if met, allow expansion to the next breadth tier.
 * Any single condition being true is sufficient to trigger expansion (OR logic).
 */
export interface RolloutExpansionConditions {
  /** A completed teaching pass has occurred (instructor delivered capability to another unit or cohort). */
  teachingPassComplete?: boolean
  /** Required supporting infrastructure (lab, facility, training centre) is present and active. */
  requiredInfrastructurePresent?: boolean
  /** Propagation progress across the org has crossed the threshold needed for broader rollout. */
  propagationProgressSufficient?: boolean
}

/**
 * Input for a rollout breadth evaluation.
 * Note: learned acquisition state is intentionally absent — breadth is a separate concern.
 */
export interface CapabilityRolloutInput {
  state: CapabilityRolloutState
  conditions: RolloutExpansionConditions
}

/**
 * The result kind from evaluating a rollout expansion.
 * - 'can_expand': at least one condition is met; capability can advance to the next tier
 * - 'at_max_breadth': already at 'organization' tier; no further expansion possible
 * - 'blocked': not at max breadth, but no expansion conditions are met
 */
export type RolloutEvaluationKind = 'can_expand' | 'at_max_breadth' | 'blocked'

export interface CapabilityRolloutResult {
  kind: RolloutEvaluationKind
  reason: string
  /** The tier this capability would advance to if expansion proceeds. Only present when kind === 'can_expand'. */
  nextTier?: RolloutBreadthTier
  /** True when nextTier would be 'organization', indicating org-wide access would be unlocked. */
  orgAccessUnlocked?: boolean
}

/**
 * Returns true if at least one expansion condition is met.
 */
function anyConditionMet(conditions: RolloutExpansionConditions): boolean {
  return (
    conditions.teachingPassComplete === true ||
    conditions.requiredInfrastructurePresent === true ||
    conditions.propagationProgressSufficient === true
  )
}

/**
 * Pure domain seam: evaluates whether a capability family's organizational breadth
 * can expand to the next tier based on its current state and expansion conditions.
 *
 * - If already at 'organization' tier → at_max_breadth.
 * - If no conditions are met → blocked.
 * - If at 'narrow' and any condition is met → can_expand to 'unit'.
 * - If at 'unit' and any condition is met → can_expand to 'organization', orgAccessUnlocked: true.
 *
 * Does not mutate state. Caller is responsible for applying the result.
 */
export function evaluateCapabilityRollout(
  input: CapabilityRolloutInput,
): CapabilityRolloutResult {
  const { state, conditions } = input

  if (state.currentTier === 'organization') {
    return {
      kind: 'at_max_breadth',
      reason: 'Capability has already reached full organizational breadth.',
    }
  }

  if (!anyConditionMet(conditions)) {
    return {
      kind: 'blocked',
      reason:
        'No expansion conditions are met. Requires a completed teaching pass, required infrastructure, or sufficient propagation progress.',
    }
  }

  if (state.currentTier === 'narrow') {
    return {
      kind: 'can_expand',
      reason: 'Expansion conditions met. Capability breadth can advance from narrow to unit.',
      nextTier: 'unit',
    }
  }

  // currentTier === 'unit'
  return {
    kind: 'can_expand',
    reason:
      'Expansion conditions met. Capability breadth can advance from unit to organization, unlocking org-wide access.',
    nextTier: 'organization',
    orgAccessUnlocked: true,
  }
}
