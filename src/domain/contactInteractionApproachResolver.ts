/**
 * SPE-3111 — contact interaction approach resolver (pure, caller-owned).
 *
 * Determines eligible approaches from player-known state, evaluates staff suitability,
 * supports exploratory fallback, and returns typed outcomes with downstream handoff
 * identifiers. Does not mutate relationship, favor, coercion, or other owned state.
 */

import { assertNonEmptyId } from './assertBoundedInteger'

export const CONTACT_INTERACTION_APPROACH_OWNER = 'SPE-3111' as const

export type ApproachClass =
  | 'contextual_familiarity'
  | 'need_response'
  | 'authority_leverage'
  | 'negotiated_incentive'
  | 'exploratory'

export interface KnownSocialState {
  readonly knownObjectives?: readonly string[]
  readonly knownNeeds?: readonly string[]
  readonly knownAuthority?: boolean
  readonly knownRelationshipStrength?: number
  readonly hasFavorRecord?: boolean
  readonly accessPermitted?: boolean
  readonly hostilityLevel?: number
  readonly consentPlausible?: boolean
}

export interface StaffCapability {
  readonly staffId: string
  readonly socialCompetency: number
  readonly contextualKnowledge?: readonly string[]
}

export interface ContactInteractionInput {
  readonly interactionId: string
  readonly contactId: string
  readonly knownState: KnownSocialState
  readonly staff?: StaffCapability
  readonly selectedApproach?: ApproachClass
}

export interface ApproachEligibility {
  readonly approach: ApproachClass
  readonly eligible: boolean
  readonly reason: string
}

export interface SuitabilityResult {
  readonly staffId: string
  readonly approach: ApproachClass
  readonly suitability: 'strong' | 'weak' | 'unavailable'
  readonly reason: string
}

export interface DownstreamHandoff {
  readonly owner: string
  readonly effectId: string
  readonly idempotentKey: string
}

export interface ContactInteractionOutcome {
  readonly interactionId: string
  readonly contactId: string
  readonly approachUsed: ApproachClass
  readonly outcomeKind: 'cooperation_change' | 'disclosure' | 'refusal' | 'friction' | 'delay' | 'failure'
  readonly reason: string
  readonly handoffs: readonly DownstreamHandoff[]
  readonly owner: typeof CONTACT_INTERACTION_APPROACH_OWNER
}

function validateKnownState(state: KnownSocialState): KnownSocialState {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) {
    throw new Error('known social state is required')
  }
  return Object.freeze({ ...state })
}

/** Return eligible approaches based solely on player-known state. Hidden state is never consulted. */
export function listEligibleApproaches(knownState: KnownSocialState): ApproachEligibility[] {
  const state = validateKnownState(knownState)
  const results: ApproachEligibility[] = []

  const hasContext = (state.knownObjectives?.length ?? 0) > 0 || (state.knownNeeds?.length ?? 0) > 0
  results.push({
    approach: 'contextual_familiarity',
    eligible: hasContext,
    reason: hasContext ? 'known_objective_or_need' : 'no_known_context',
  })

  results.push({
    approach: 'need_response',
    eligible: (state.knownNeeds?.length ?? 0) > 0,
    reason: (state.knownNeeds?.length ?? 0) > 0 ? 'known_need' : 'need_unknown',
  })

  results.push({
    approach: 'authority_leverage',
    eligible: state.knownAuthority === true,
    reason: state.knownAuthority === true ? 'known_authority' : 'authority_unknown',
  })

  results.push({
    approach: 'negotiated_incentive',
    eligible: state.hasFavorRecord === true || (state.knownRelationshipStrength ?? 0) > 50,
    reason:
      state.hasFavorRecord === true
        ? 'favor_record_present'
        : (state.knownRelationshipStrength ?? 0) > 50
          ? 'strong_known_relationship'
          : 'no_incentive_basis',
  })

  // Exploratory is always available as fallback
  results.push({
    approach: 'exploratory',
    eligible: true,
    reason: 'always_available_fallback',
  })

  return results
}

export function evaluateStaffSuitability(
  staff: StaffCapability,
  approach: ApproachClass,
  knownState: KnownSocialState
): SuitabilityResult {
  const competency = staff.socialCompetency
  const hasMatchingContext =
    staff.contextualKnowledge?.some((k) =>
      (knownState.knownObjectives ?? []).concat(knownState.knownNeeds ?? []).includes(k)
    ) ?? false

  if (approach === 'exploratory') {
    return {
      staffId: staff.staffId,
      approach,
      suitability: competency >= 30 ? 'strong' : 'weak',
      reason: competency >= 30 ? 'adequate_generalist' : 'limited_generalist',
    }
  }

  if (!hasMatchingContext && approach !== 'authority_leverage') {
    return {
      staffId: staff.staffId,
      approach,
      suitability: 'unavailable',
      reason: 'missing_contextual_knowledge',
    }
  }

  return {
    staffId: staff.staffId,
    approach,
    suitability: competency >= 60 ? 'strong' : competency >= 30 ? 'weak' : 'unavailable',
    reason: competency >= 60 ? 'high_competency' : competency >= 30 ? 'marginal_competency' : 'insufficient_competency',
  }
}

/** Resolve one interaction to a typed outcome. Downstream handoffs are identifiers only. */
export function resolveContactInteraction(input: ContactInteractionInput): ContactInteractionOutcome {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('contact interaction input is required')
  }
  const interactionId = assertNonEmptyId(input.interactionId, 'interactionId')
  const contactId = assertNonEmptyId(input.contactId, 'contactId')
  const knownState = validateKnownState(input.knownState)

  const eligibles = listEligibleApproaches(knownState)
  const chosen =
    input.selectedApproach && eligibles.find((e) => e.approach === input.selectedApproach && e.eligible)
      ? input.selectedApproach
      : eligibles.find((e) => e.eligible)?.approach ?? 'exploratory'

  // Consume bounded-influence constraints without reimplementing them
  const accessBlocked = knownState.accessPermitted === false
  const highHostility = (knownState.hostilityLevel ?? 0) > 70
  const consentBlocked = knownState.consentPlausible === false

  let outcomeKind: ContactInteractionOutcome['outcomeKind'] = 'cooperation_change'
  let reason = 'standard_resolution'
  const handoffs: DownstreamHandoff[] = []

  if (accessBlocked || consentBlocked) {
    outcomeKind = 'refusal'
    reason = accessBlocked ? 'access_denied' : 'consent_not_plausible'
  } else if (highHostility) {
    outcomeKind = 'friction'
    reason = 'elevated_hostility'
  } else if (chosen === 'exploratory') {
    outcomeKind = 'disclosure'
    reason = 'exploratory_fallback_limited_info'
  } else if (chosen === 'need_response' && (knownState.knownNeeds?.length ?? 0) > 0) {
    outcomeKind = 'cooperation_change'
    reason = 'need_addressed'
    handoffs.push({
      owner: 'SPE-208',
      effectId: 'relationship_cooperation_delta',
      idempotentKey: `${interactionId}:relationship`,
    })
  } else {
    outcomeKind = 'delay'
    reason = 'partial_alignment'
  }

  return Object.freeze({
    interactionId,
    contactId,
    approachUsed: chosen,
    outcomeKind,
    reason,
    handoffs: Object.freeze(handoffs),
    owner: CONTACT_INTERACTION_APPROACH_OWNER,
  })
}
