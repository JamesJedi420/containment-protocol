/**
 * SPE-1072 slice 1 — Wood material family
 *
 * Pure domain functions proving wood is mechanically distinct from stone/metal.
 * No GameState reads or writes. No advanceWeek.ts changes. No models.ts changes.
 * All behavior is config-driven via WOOD_CALIBRATION.
 *
 * Deferred to later slices:
 * - FacilityEffect / advanceWeek wiring
 * - Treatment upgrade chain
 * - Pest/mold/maintenance gating
 * - Weekly morale integration
 * - Production-recipe enforcement
 * - Provenance archive subsystem
 */

import { WOOD_CALIBRATION } from './sim/calibration'

// ── Types ─────────────────────────────────────────────────────────────────────

export type WoodTreatmentState =
  | 'raw'
  | 'dried'
  | 'treated'
  | 'warded'
  | 'relic'

export type WoodVulnerabilityState =
  | 'intact'
  | 'fire-damaged'
  | 'rot-damaged'
  | 'compromised'

export type WoodVulnerabilityTrigger = 'fire' | 'rot' | 'moisture' | 'curse'

/**
 * The room or use category where the wood object is installed.
 * Drives gate checks and comfort bonus eligibility.
 */
export type WoodRoomCategory =
  | 'housing'
  | 'lounge'
  | 'chapel'
  | 'therapy'
  | 'office'
  | 'storage'
  | 'containment_low'
  | 'containment_high'
  | string  // open for future categories; gate functions reject unknowns by default

/**
 * Minimum typed descriptor for a wood object or structure.
 * Slice 1 only — no wiring to FacilityInstance yet.
 */
export interface WoodObjectProfile {
  /** Discriminant. Non-wood inputs are rejected. */
  materialFamily: string
  treatmentState: WoodTreatmentState
  vulnerabilityState: WoodVulnerabilityState
  /**
   * Optional provenance tag.
   * Examples: 'provenance:memory-bearing', 'provenance:gallows-timber', 'provenance:fresh'
   * Absence → treated as fresh (zero modifier).
   */
  provenanceTag?: string
  /** Additional tags for domain/ritual use (e.g. 'domain:burial', 'domain:hearth'). */
  tags: string[]
}

// ── Result types ──────────────────────────────────────────────────────────────

export interface WoodBuildCostResult {
  /** Negative = cheaper than stone/metal baseline (0). */
  costDelta: number
  /** Negative = faster than stone/metal baseline (0 weeks delta). */
  durationDelta: number
  reasons: string[]
}

export interface WoodComfortResult {
  /** Additive recovery throughput delta. Zero for non-wood or ineligible categories. */
  recoveryDelta: number
  /** Additive morale delta. Zero for non-wood or ineligible categories. */
  moraleDelta: number
  reasons: string[]
}

export interface WoodVulnerabilityResult {
  nextState: WoodVulnerabilityState
  transitioned: boolean
  reason: string
}

export interface WoodProvenanceResult {
  /** Additive investigation / ritual modifier. Zero for fresh or absent provenance. */
  modifier: number
  triggered: boolean
  reason: string
}

export interface WoodMaterialGateResult {
  accepted: boolean
  reason: string
}

// ── Pure functions ────────────────────────────────────────────────────────────

/**
 * Returns the build-cost and build-time advantage of wood over the stone/metal
 * baseline (which is implicitly 0 delta).
 *
 * Non-wood material families return zero delta (they ARE the baseline).
 * The room category is accepted as a string so callers need not cast.
 */
export function evaluateWoodBuildCostDelta(
  materialFamily: string,
  _roomCategory: WoodRoomCategory,
): WoodBuildCostResult {
  if (materialFamily !== 'wood') {
    return {
      costDelta: 0,
      durationDelta: 0,
      reasons: ['non-wood material: no delta from baseline'],
    }
  }
  return {
    costDelta: WOOD_CALIBRATION.buildCostDelta,
    durationDelta: WOOD_CALIBRATION.buildDurationDelta,
    reasons: [
      `wood build cost advantage: ${WOOD_CALIBRATION.buildCostDelta}`,
      `wood build duration advantage: ${WOOD_CALIBRATION.buildDurationDelta} week(s)`,
    ],
  }
}

/**
 * Returns the comfort/recovery bonus for a wood-furnished room in an eligible
 * use category. Stone, metal, and ineligible room types return zero deltas.
 */
export function evaluateWoodComfortBonus(
  materialFamily: string,
  roomCategory: WoodRoomCategory,
): WoodComfortResult {
  if (materialFamily !== 'wood') {
    return {
      recoveryDelta: 0,
      moraleDelta: 0,
      reasons: ['non-wood material: no comfort bonus'],
    }
  }
  const eligible = (WOOD_CALIBRATION.comfortEligibleCategories as readonly string[]).includes(
    roomCategory,
  )
  if (!eligible) {
    return {
      recoveryDelta: 0,
      moraleDelta: 0,
      reasons: [`room category '${roomCategory}' is not comfort-eligible for wood`],
    }
  }
  return {
    recoveryDelta: WOOD_CALIBRATION.comfortRecoveryDelta,
    moraleDelta: WOOD_CALIBRATION.comfortMoraleDelta,
    reasons: [
      `wood comfort bonus in '${roomCategory}': recovery +${WOOD_CALIBRATION.comfortRecoveryDelta}, morale +${WOOD_CALIBRATION.comfortMoraleDelta}`,
    ],
  }
}

/**
 * Applies a vulnerability trigger to a wood object and returns the next state.
 * Non-wood inputs return `transitioned: false` and the unchanged state.
 *
 * Transition table:
 *   intact + fire → fire-damaged
 *   intact + rot/moisture → rot-damaged
 *   fire-damaged + rot/moisture → compromised
 *   rot-damaged + fire → compromised
 *   compromised + any → compromised (already at maximum degradation)
 *   intact + curse → fire-damaged (spiritually scorched; same mechanical effect)
 */
export function applyWoodVulnerabilityTrigger(
  profile: Pick<WoodObjectProfile, 'materialFamily' | 'vulnerabilityState'>,
  trigger: WoodVulnerabilityTrigger,
): WoodVulnerabilityResult {
  if (profile.materialFamily !== 'wood') {
    return {
      nextState: profile.vulnerabilityState as WoodVulnerabilityState,
      transitioned: false,
      reason: 'non-wood material: vulnerability transition does not apply',
    }
  }

  const current = profile.vulnerabilityState

  if (current === 'compromised') {
    return {
      nextState: 'compromised',
      transitioned: false,
      reason: 'already compromised: no further degradation from this trigger',
    }
  }

  const isFireTrigger = trigger === 'fire' || trigger === 'curse'
  const isRotTrigger = trigger === 'rot' || trigger === 'moisture'

  if (current === 'intact') {
    if (isFireTrigger) {
      return {
        nextState: WOOD_CALIBRATION.fireDamagedState,
        transitioned: true,
        reason: `wood exposed to '${trigger}': intact → fire-damaged`,
      }
    }
    if (isRotTrigger) {
      return {
        nextState: WOOD_CALIBRATION.rotDamagedState,
        transitioned: true,
        reason: `wood exposed to '${trigger}': intact → rot-damaged`,
      }
    }
  }

  if (current === 'fire-damaged' && isRotTrigger) {
    return {
      nextState: WOOD_CALIBRATION.compromisedState,
      transitioned: true,
      reason: `wood already fire-damaged then exposed to '${trigger}': → compromised`,
    }
  }

  if (current === 'rot-damaged' && isFireTrigger) {
    return {
      nextState: WOOD_CALIBRATION.compromisedState,
      transitioned: true,
      reason: `wood already rot-damaged then exposed to '${trigger}': → compromised`,
    }
  }

  // Same-type re-exposure on already-damaged state: no additional transition
  return {
    nextState: current,
    transitioned: false,
    reason: `wood '${current}' re-exposed to '${trigger}': no additional transition`,
  }
}

/**
 * Resolves the investigation/ritual modifier for a wood object's provenance tag.
 * Fresh or absent provenance returns zero. Memory-bearing and gallows-timber
 * provenance return configured non-zero modifiers.
 *
 * Non-wood inputs always return zero (provenance system is wood-specific).
 */
export function resolveWoodProvenanceModifier(
  profile: Pick<WoodObjectProfile, 'materialFamily' | 'provenanceTag'>,
): WoodProvenanceResult {
  if (profile.materialFamily !== 'wood') {
    return {
      modifier: 0,
      triggered: false,
      reason: 'non-wood material: provenance system does not apply',
    }
  }

  const tag = profile.provenanceTag ?? ''

  if (tag === 'provenance:memory-bearing') {
    return {
      modifier: WOOD_CALIBRATION.provenanceMemoryBearingModifier,
      triggered: true,
      reason: `memory-bearing provenance: +${WOOD_CALIBRATION.provenanceMemoryBearingModifier} investigation/ritual modifier`,
    }
  }

  if (tag === 'provenance:gallows-timber') {
    return {
      modifier: WOOD_CALIBRATION.provenanceGallowsTimberModifier,
      triggered: true,
      reason: `gallows-timber provenance: +${WOOD_CALIBRATION.provenanceGallowsTimberModifier} investigation/ritual modifier`,
    }
  }

  // Fresh wood or explicit 'provenance:fresh' — zero modifier
  return {
    modifier: WOOD_CALIBRATION.provenanceFreshModifier,
    triggered: false,
    reason: tag ? `provenance tag '${tag}' has no configured modifier: treated as fresh` : 'no provenance tag: fresh wood, zero modifier',
  }
}

/**
 * Gates whether a given material family is accepted for a room/use category.
 *
 * - Wood is accepted for all low-risk and comfort categories.
 * - Wood is rejected for containment_high (safety risk).
 * - Stone/metal are rejected for ritual/domain-aligned categories (chapel, therapy)
 *   when an explicit ritual tag check is needed.
 * - Non-configured categories default to accepted (open expansion path).
 */
export function checkWoodMaterialGate(
  materialTag: string,
  roomCategory: WoodRoomCategory,
): WoodMaterialGateResult {
  const isWood = materialTag === 'material:wood' || materialTag === 'wood'

  // High-risk containment rejects wood explicitly
  if (
    isWood &&
    (WOOD_CALIBRATION.woodRejectedCategories as readonly string[]).includes(roomCategory)
  ) {
    return {
      accepted: false,
      reason: `wood rejected for '${roomCategory}': high-risk containment requires stone or metal`,
    }
  }

  // Wood is accepted for all explicitly allowed categories
  if (
    isWood &&
    (WOOD_CALIBRATION.woodAcceptedCategories as readonly string[]).includes(roomCategory)
  ) {
    return {
      accepted: true,
      reason: `wood accepted for '${roomCategory}'`,
    }
  }

  // Ritual/domain categories (chapel, therapy) require wood — reject stone/metal
  const ritualCategories: readonly string[] = ['chapel', 'therapy']
  const isNonWood = !isWood && (materialTag === 'material:stone' || materialTag === 'material:metal' || materialTag === 'stone' || materialTag === 'metal')
  if (isNonWood && ritualCategories.includes(roomCategory)) {
    return {
      accepted: false,
      reason: `${materialTag} rejected for ritual category '${roomCategory}': wood is required`,
    }
  }

  // Non-wood, non-ritual categories: accepted (stone/metal are fine for most rooms)
  if (isNonWood) {
    return {
      accepted: true,
      reason: `${materialTag} accepted for '${roomCategory}'`,
    }
  }

  // Wood in unknown category: accepted (open expansion)
  if (isWood) {
    return {
      accepted: true,
      reason: `wood accepted for unknown category '${roomCategory}' (open expansion default)`,
    }
  }

  return {
    accepted: true,
    reason: `unknown material '${materialTag}' in category '${roomCategory}': accepted by default`,
  }
}
