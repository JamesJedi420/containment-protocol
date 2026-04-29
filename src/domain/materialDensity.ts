/**
 * SPE-1074 slice 1 — Material Density and Weight
 *
 * Pure domain module that makes mass/weight mechanically real through:
 *   - density classification per material
 *   - transport burden computation
 *   - installation floor-load constraints
 *   - handling risk under low crew / bad equipment
 *   - heavy-vs-light tradeoff resolution
 *
 * All functions are pure and config-driven via DENSITY_CALIBRATION.
 * No GameState reads/writes. No room/stockpile/logistics mutation.
 * No models.ts changes. No advanceWeek.ts changes.
 *
 * Consumers (SPE-1027 hauling, SPE-1056 processed units, SPE-245 structural effect)
 * are explicitly deferred to later slices.
 */

import { DENSITY_CALIBRATION } from './sim/calibration'

// ---------------------------------------------------------------------------
// Slice-local types (not promoted to models.ts in this slice)
// ---------------------------------------------------------------------------

export type DensityClass =
  | 'ultralight'  // paper, foam, basic reagents
  | 'light'       // wood, textiles, electronics, small gear
  | 'medium'      // standard stone, mid-grade metal fabrications
  | 'heavy'       // structural metal, lead sheet, dense containment blocks
  | 'extreme'     // dimensional anchors, ritual weight-bearing material

export type HandlingTier =
  | 'minimal'      // one person, no equipment needed
  | 'standard'     // one–two people, basic cart
  | 'assisted'     // small team + reinforced cart / pallet jack
  | 'specialist'   // specialist team + machinery (forklift etc.)
  | 'crane-only'   // crane or equivalent lift equipment mandatory

export interface DensityProfile {
  materialId: string
  densityClass: DensityClass
  /** Abstract mass units; medium = 1.0 baseline. */
  massUnits: number
  handlingTier: HandlingTier
  /** Whether this material is eligible for floor-load failure checks. */
  floorLoadEligible: boolean
  /**
   * Breach resistance index — higher = harder for force-based anomaly to bypass.
   * Derived from massUnits × DENSITY_CALIBRATION.breachResistanceMultiplier.
   */
  breachResistanceIndex: number
}

export interface InstallContext {
  floorRating: 'standard' | 'reinforced' | 'heavy-rated'
  supportEquipmentAvailable: HandlingTier
}

export interface HandlingContext {
  crewSize: number
  equipmentAvailable: HandlingTier
  operationUrgency: 'routine' | 'urgent' | 'emergency'
}

export interface UseContext {
  deploymentSpeedPriority: boolean
  containmentStrengthPriority: boolean
}

export interface TransportBurdenResult {
  laborDelta: number          // extra person-weeks above zero baseline
  equipmentRequired: string[] // e.g. ['forklift', 'reinforced-cart']
  burdenFlag: boolean         // true if the load exceeds one-person carry
  reasons: string[]
}

export interface InstallConstraintResult {
  cleared: boolean
  blockerReason: string        // empty string when cleared without constraint
  delayWeeks: number           // 0 if cleared without friction
  reasons: string[]
}

export interface HandlingRiskResult {
  riskLevel: 'none' | 'low' | 'moderate' | 'severe'
  injuryRiskDelta: number      // additive; 0.0 = no extra risk
  routeBlockageRisk: boolean
  infrastructureDamageRisk: boolean
  reasons: string[]
}

export interface TradeoffSummary {
  breachResistanceDelta: number   // heavy.breachResistanceIndex - light.breachResistanceIndex
  deploymentSpeedDelta: number    // light speed advantage (positive = light is faster)
  laborCostDelta: number          // heavy.laborDelta - light.laborDelta (positive = heavy costs more labor)
  recommendedChoice: 'heavy' | 'light' | 'context-dependent'
  reasons: string[]
}

// ---------------------------------------------------------------------------
// Built-in material density lookup (slice 1 seed — not the full catalog)
// ---------------------------------------------------------------------------

type BuiltInEntry = Pick<DensityProfile, 'densityClass' | 'floorLoadEligible'>

const BUILT_IN_DENSITY_TABLE: Record<string, BuiltInEntry> = {
  wood_plank:         { densityClass: 'light',      floorLoadEligible: false },
  wood_beam:          { densityClass: 'light',      floorLoadEligible: true  },
  stone_block:        { densityClass: 'medium',     floorLoadEligible: true  },
  lead_sheet:         { densityClass: 'heavy',      floorLoadEligible: true  },
  steel_rod:          { densityClass: 'heavy',      floorLoadEligible: true  },
  steel_plate:        { densityClass: 'heavy',      floorLoadEligible: true  },
  occult_reagent:     { densityClass: 'ultralight', floorLoadEligible: false },
  basic_textile:      { densityClass: 'ultralight', floorLoadEligible: false },
  electronic_parts:   { densityClass: 'light',      floorLoadEligible: false },
  dimensional_anchor: { densityClass: 'extreme',    floorLoadEligible: true  },
  ritual_anchor:      { densityClass: 'extreme',    floorLoadEligible: true  },
}

const DEFAULT_DENSITY_ENTRY: BuiltInEntry = {
  densityClass: 'medium',
  floorLoadEligible: false,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIER_ORDER: HandlingTier[] = [
  'minimal',
  'standard',
  'assisted',
  'specialist',
  'crane-only',
]

function tierIndex(tier: HandlingTier): number {
  return TIER_ORDER.indexOf(tier)
}

/**
 * Derive the correct HandlingTier for a given massUnits value.
 * The highest threshold whose value does not exceed massUnits is used.
 */
function deriveHandlingTier(massUnits: number): HandlingTier {
  const thresholds = DENSITY_CALIBRATION.handlingTierThresholds
  let result: HandlingTier = 'minimal'
  for (const tier of TIER_ORDER) {
    if (massUnits >= thresholds[tier]) {
      result = tier
    }
  }
  return result
}

/**
 * Compute the equipment list required for a given handling tier.
 * Returns [] for minimal/standard (human-only), named equipment for assisted and above.
 */
function equipmentForTier(tier: HandlingTier): string[] {
  switch (tier) {
    case 'minimal':    return []
    case 'standard':   return []
    case 'assisted':   return ['reinforced-cart']
    case 'specialist': return ['forklift', 'reinforced-cart']
    case 'crane-only': return ['crane', 'forklift', 'reinforced-cart']
  }
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Classify a material by density, returning a full DensityProfile.
 * Falls back to medium/default for unknown materialIds.
 */
export function classifyMaterialDensity(materialId: string): DensityProfile {
  const entry = BUILT_IN_DENSITY_TABLE[materialId] ?? DEFAULT_DENSITY_ENTRY
  const massUnits = DENSITY_CALIBRATION.massUnitsByClass[entry.densityClass]
  const handlingTier = deriveHandlingTier(massUnits)
  const breachResistanceIndex =
    Math.round(massUnits * DENSITY_CALIBRATION.breachResistanceMultiplier)
  return {
    materialId,
    densityClass: entry.densityClass,
    massUnits,
    handlingTier,
    floorLoadEligible: entry.floorLoadEligible,
    breachResistanceIndex,
  }
}

/**
 * Compute transport burden for moving `quantity` units of a material.
 * Labor delta is zero for masses at or below the medium baseline.
 */
export function evaluateTransportBurden(
  profile: DensityProfile,
  quantity: number,
): TransportBurdenResult {
  const reasons: string[] = []
  const totalMass = profile.massUnits * quantity
  const medium = DENSITY_CALIBRATION.massUnitsByClass.medium

  // Labor accrues only on mass above the medium baseline
  const excessMass = Math.max(0, totalMass - medium * quantity)
  const laborDelta =
    excessMass > 0
      ? parseFloat(
          (excessMass * DENSITY_CALIBRATION.laborPerExcessMassUnit).toFixed(2),
        )
      : 0

  const burdenFlag = profile.handlingTier !== 'minimal'
  const equipmentRequired = equipmentForTier(profile.handlingTier)

  if (laborDelta > 0) {
    reasons.push(
      `${profile.densityClass} material (${profile.massUnits} mass units × ${quantity}) exceeds medium baseline; +${laborDelta} person-weeks labor`,
    )
  }
  if (burdenFlag) {
    reasons.push(
      `handling tier '${profile.handlingTier}' exceeds one-person carry threshold`,
    )
  }
  if (equipmentRequired.length > 0) {
    reasons.push(`equipment required: ${equipmentRequired.join(', ')}`)
  }

  return { laborDelta, equipmentRequired, burdenFlag, reasons }
}

/**
 * Evaluate whether a material can be installed given the room's floor rating
 * and available support equipment.
 *
 * Cleared = floor can support the mass.
 * delayWeeks > 0 when clearance requires specialist support that slows installation.
 */
export function evaluateInstallationConstraint(
  profile: DensityProfile,
  ctx: InstallContext,
): InstallConstraintResult {
  const reasons: string[] = []
  const floorCap = DENSITY_CALIBRATION.floorRatingCapacity[ctx.floorRating]

  if (!profile.floorLoadEligible) {
    // Material is lightweight / doesn't impose floor-load risk
    reasons.push(`material '${profile.materialId}' is not floor-load eligible; constraint does not apply`)
    return { cleared: true, blockerReason: '', delayWeeks: 0, reasons }
  }

  if (profile.massUnits > floorCap) {
    const msg = `material mass (${profile.massUnits}) exceeds floor rating '${ctx.floorRating}' capacity (${floorCap})`
    reasons.push(msg)
    return {
      cleared: false,
      blockerReason: msg,
      delayWeeks: 0,
      reasons,
    }
  }

  // Cleared — but does handling support add friction?
  const requiredTierIdx = tierIndex(profile.handlingTier)
  const availableTierIdx = tierIndex(ctx.supportEquipmentAvailable)
  let delayWeeks = 0

  if (availableTierIdx < requiredTierIdx) {
    // Support equipment is below what the material needs — installation proceeds
    // with friction (improvised lift methods) rather than being blocked
    delayWeeks = DENSITY_CALIBRATION.frictionDelayWeeks
    reasons.push(
      `support equipment '${ctx.supportEquipmentAvailable}' is below required tier '${profile.handlingTier}'; +${delayWeeks} week installation delay`,
    )
  } else {
    reasons.push(
      `floor rating '${ctx.floorRating}' and equipment '${ctx.supportEquipmentAvailable}' satisfy material requirements; no delay`,
    )
  }

  return { cleared: true, blockerReason: '', delayWeeks, reasons }
}

/**
 * Evaluate the risk profile of handling a heavy material with the given crew
 * and equipment. Returns injury/blockage/damage flags and a risk level.
 *
 * Risk escalates when crew size is too small or equipment is below required tier.
 */
export function evaluateHandlingRisk(
  profile: DensityProfile,
  ctx: HandlingContext,
): HandlingRiskResult {
  const reasons: string[] = []
  const requiredTierIdx = tierIndex(profile.handlingTier)
  const availableTierIdx = tierIndex(ctx.equipmentAvailable)
  const tierGap = Math.max(0, requiredTierIdx - availableTierIdx)

  // Base injury risk from tier gap
  const injuryRiskDelta = parseFloat(
    (tierGap * DENSITY_CALIBRATION.injuryRiskDeltaPerTierGap).toFixed(2),
  )

  // Crew adequacy: heavy/extreme materials need at least 2 crew for specialist+ jobs
  const crewDeficient =
    profile.densityClass === 'extreme' && ctx.crewSize < 3
      ? true
      : profile.densityClass === 'heavy' && ctx.crewSize < 2
        ? true
        : false

  const routeBlockageRisk =
    tierGap >= DENSITY_CALIBRATION.routeBlockageRiskTierGap || crewDeficient
  const infrastructureDamageRisk =
    tierGap >= DENSITY_CALIBRATION.infrastructureDamageRiskTierGap

  // Urgency modifier: emergency operations tolerate shortcuts, raising risk
  const urgencyMultiplier =
    ctx.operationUrgency === 'emergency'
      ? 1.5
      : ctx.operationUrgency === 'urgent'
        ? 1.2
        : 1.0

  const effectiveInjuryDelta = parseFloat(
    (injuryRiskDelta * urgencyMultiplier).toFixed(2),
  )

  // Derive risk level
  let riskLevel: HandlingRiskResult['riskLevel'] = 'none'
  if (effectiveInjuryDelta > 0.35 || (routeBlockageRisk && infrastructureDamageRisk)) {
    riskLevel = 'severe'
  } else if (effectiveInjuryDelta > 0.2 || routeBlockageRisk) {
    riskLevel = 'moderate'
  } else if (effectiveInjuryDelta > 0) {
    riskLevel = 'low'
  }

  if (tierGap > 0) {
    reasons.push(
      `equipment tier '${ctx.equipmentAvailable}' is ${tierGap} tier(s) below required '${TIER_ORDER[requiredTierIdx]}'; injury risk +${effectiveInjuryDelta}`,
    )
  }
  if (crewDeficient) {
    reasons.push(
      `crew size ${ctx.crewSize} is insufficient for ${profile.densityClass} material handling`,
    )
  }
  if (routeBlockageRisk) reasons.push('route blockage risk active')
  if (infrastructureDamageRisk) reasons.push('infrastructure damage risk active')
  if (ctx.operationUrgency !== 'routine') {
    reasons.push(`operation urgency '${ctx.operationUrgency}' amplifies risk by ×${urgencyMultiplier}`)
  }

  return {
    riskLevel,
    injuryRiskDelta: effectiveInjuryDelta,
    routeBlockageRisk,
    infrastructureDamageRisk,
    reasons,
  }
}

/**
 * Compare two materials (heavy vs light alternative) across three axes:
 *   1. breach resistance (heavy advantage)
 *   2. deployment speed (light advantage)
 *   3. labor cost (heavy disadvantage)
 *
 * Recommends heavy when containmentStrengthPriority is true and deployment speed is not.
 * Recommends light when deploymentSpeedPriority is true and containment is not.
 * Returns 'context-dependent' when both or neither priority is set.
 */
export function evaluateHeavyLightTradeoff(
  heavy: DensityProfile,
  light: DensityProfile,
  ctx: UseContext,
): TradeoffSummary {
  const reasons: string[] = []

  const breachResistanceDelta = heavy.breachResistanceIndex - light.breachResistanceIndex
  reasons.push(
    `breach resistance: heavy=${heavy.breachResistanceIndex} light=${light.breachResistanceIndex} delta=+${breachResistanceDelta} (heavy advantage)`,
  )

  // Deployment speed: light is faster; delta = light speed advantage
  const heavySpeedPenalty =
    (heavy.massUnits - light.massUnits) *
    DENSITY_CALIBRATION.deploymentSpeedPenaltyPerMassUnit
  const deploymentSpeedDelta = parseFloat(heavySpeedPenalty.toFixed(2))
  reasons.push(
    `deployment speed: light is +${deploymentSpeedDelta} units faster than heavy (light advantage)`,
  )

  // Labor cost: compute transport burden for a single unit of each to get per-unit deltas
  const mediumMass = DENSITY_CALIBRATION.massUnitsByClass.medium
  const heavyExcess = Math.max(0, heavy.massUnits - mediumMass)
  const lightExcess = Math.max(0, light.massUnits - mediumMass)
  const laborCostDelta = parseFloat(
    (
      (heavyExcess - lightExcess) *
      DENSITY_CALIBRATION.laborPerExcessMassUnit
    ).toFixed(2),
  )
  reasons.push(
    `labor cost: heavy is +${laborCostDelta} person-weeks per unit above light (heavy disadvantage)`,
  )

  // Recommendation
  const { containmentStrengthPriority, deploymentSpeedPriority } = ctx
  let recommendedChoice: TradeoffSummary['recommendedChoice']
  if (containmentStrengthPriority && !deploymentSpeedPriority) {
    recommendedChoice = 'heavy'
    reasons.push('containment strength priority → recommend heavy')
  } else if (deploymentSpeedPriority && !containmentStrengthPriority) {
    recommendedChoice = 'light'
    reasons.push('deployment speed priority → recommend light')
  } else {
    recommendedChoice = 'context-dependent'
    reasons.push('both or neither priority set → context-dependent')
  }

  return {
    breachResistanceDelta,
    deploymentSpeedDelta,
    laborCostDelta,
    recommendedChoice,
    reasons,
  }
}
