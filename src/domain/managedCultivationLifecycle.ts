/**
 * SPE-3406 — managed cultivation lifecycle and environmental viability.
 *
 * Pure domain profiles, instances, viability, SPE-3384 growth, SPE-1058 labor
 * demand declaration, harvest handoff, and SPE-1060 ornamental contribution.
 * Does not own ecology (SPE-118/SPE-182), storage (SPE-1027), production-chain
 * orchestration (SPE-3360), or facility-register UI (SPE-3359).
 */

import {
  ELAPSED_TIME_RATE_SCALE,
  applyElapsedTimeUpdate,
  applyRateAcrossCadence,
} from './elapsedTimeInvariantUpdate'
import type {
  CultivationContributionInput,
  CultivationViability,
} from './roomQualityFacilitySatisfaction'
import {
  projectSpecialistLaborGate,
  type SpecialistLaborGateInput,
  type SpecialistLaborGateProjection,
  type SpecialistOperatorSlot,
  type SpecialistRoleFamily,
  type SpecialistSkillBand,
  type SpecialistTaskId,
} from './specialistLaborRegistry'

export const MANAGED_CULTIVATION_OWNER = 'SPE-3406' as const

/** Progress is 0..PROGRESS_MAX inclusive; maturity at PROGRESS_MAX. */
export const CULTIVATION_PROGRESS_MAX = 1000 as const

export const CULTIVATION_MEDIUMS = [
  'soil_bed',
  'hydroponic_tray',
  'sealed_planter',
  'ritual_substrate',
] as const
export type CultivationMedium = (typeof CULTIVATION_MEDIUMS)[number]

export const CULTIVATION_LIGHT_BANDS = ['dim', 'standard', 'bright', 'artificial'] as const
export type CultivationLightBand = (typeof CULTIVATION_LIGHT_BANDS)[number]

export const CULTIVATION_CONTAMINATION_BANDS = ['clean', 'elevated', 'critical'] as const
export type CultivationContaminationBand = (typeof CULTIVATION_CONTAMINATION_BANDS)[number]

export const CULTIVATION_LIFECYCLE_STATES = [
  'blocked',
  'degraded',
  'viable',
  'growing',
  'mature',
  'harvested',
  'expired',
] as const
export type CultivationLifecycleState = (typeof CULTIVATION_LIFECYCLE_STATES)[number]

export const CULTIVATION_REASON_CODES = [
  'medium_incompatible',
  'light_insufficient',
  'contamination_intolerant',
  'labor_stalled',
  'labor_degraded',
  'growing',
  'mature',
  'harvested',
  'expired',
  'ornamental_only',
  'propagation_ready',
] as const
export type CultivationReasonCode = (typeof CULTIVATION_REASON_CODES)[number]

export interface CultivationLaborDemand {
  readonly taskId: SpecialistTaskId
  readonly requiredRoleFamily: SpecialistRoleFamily
  readonly minimumSkillBand: SpecialistSkillBand
  readonly effortUnits: number
}

export interface CultivationOrnamentalContribution {
  readonly comfortBonus: number
  readonly prestigeBonus: number
  readonly symbolicFitBonus: number
}

export interface CultivationHarvestOutput {
  readonly materialId: string
  readonly quantity: number
  readonly perishabilityWeeks?: number
}

export interface CultivationPropagationSpec {
  readonly propaguleMaterialId: string
  readonly quantityPerHarvest: number
}

export interface ManagedCultivationProfile {
  readonly profileId: string
  readonly displayLabel: string
  readonly eligibleMediums: readonly CultivationMedium[]
  readonly minimumLightBand: CultivationLightBand
  /** Profiles that tolerate elevated contamination; others require clean. */
  readonly toleratesElevatedContamination: boolean
  /**
   * Whole progress units per elapsed time unit. Converted to SPE-3384
   * milli-rate as `growthProgressPerUnit * ELAPSED_TIME_RATE_SCALE`.
   */
  readonly growthProgressPerUnit: number
  readonly harvestOutput: CultivationHarvestOutput | null
  readonly propagation?: CultivationPropagationSpec
  readonly laborDemand: CultivationLaborDemand
  readonly ornamental?: CultivationOrnamentalContribution
  /** Optional authored lifespan in elapsed units after maturity; omit = none. */
  readonly lifespanElapsedUnitsAfterMaturity?: number
}

export interface CultivationEnvironmentInput {
  readonly medium: CultivationMedium
  readonly lightBand: CultivationLightBand
  readonly contaminationBand: CultivationContaminationBand
  /** When true, artificial light satisfies bright-minimum profiles. */
  readonly artificialSupportAvailable?: boolean
}

export interface ManagedCultivationInstance {
  readonly instanceId: string
  readonly profileId: string
  readonly lifecycleState: CultivationLifecycleState
  readonly viability: CultivationViability
  readonly progress: number
  readonly remainderMilli: number
  readonly reasonCodes: readonly CultivationReasonCode[]
  readonly elapsedSinceMaturity: number
  readonly harvestedOutput: CultivationHarvestOutput | null
  readonly propagationOutput: CultivationPropagationSpec | null
}

export interface ManagedCultivationRegistry {
  readonly version: 1
  readonly instances: readonly ManagedCultivationInstance[]
}

const LIGHT_RANK: Record<CultivationLightBand, number> = {
  dim: 0,
  standard: 1,
  bright: 2,
  artificial: 2,
}

const SKILL_RANK: Record<SpecialistSkillBand, number> = {
  novice: 0,
  competent: 1,
  expert: 2,
  master: 3,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

function freezeInstance(instance: ManagedCultivationInstance): ManagedCultivationInstance {
  return Object.freeze({
    ...instance,
    reasonCodes: Object.freeze([...instance.reasonCodes]),
    harvestedOutput: instance.harvestedOutput
      ? Object.freeze({ ...instance.harvestedOutput })
      : null,
    propagationOutput: instance.propagationOutput
      ? Object.freeze({ ...instance.propagationOutput })
      : null,
  })
}

/**
 * Representative authored fixtures. Categories are content, not engine enums.
 */
export const REPRESENTATIVE_CULTIVATION_PROFILES: readonly ManagedCultivationProfile[] =
  Object.freeze([
    Object.freeze({
      profileId: 'cultivation:fast-herb',
      displayLabel: 'Fast low-yield herb',
      eligibleMediums: Object.freeze(['soil_bed', 'hydroponic_tray'] as const),
      minimumLightBand: 'standard' as const,
      toleratesElevatedContamination: false,
      growthProgressPerUnit: 500,
      harvestOutput: Object.freeze({
        materialId: 'material:cultivated_herb',
        quantity: 2,
        perishabilityWeeks: 4,
      }),
      propagation: Object.freeze({
        propaguleMaterialId: 'material:herb_seed',
        quantityPerHarvest: 1,
      }),
      laborDemand: Object.freeze({
        taskId: 'material_refinement' as const,
        requiredRoleFamily: 'refinement_technician' as const,
        minimumSkillBand: 'novice' as const,
        effortUnits: 1,
      }),
    }),
    Object.freeze({
      profileId: 'cultivation:slow-grain',
      displayLabel: 'Slow high-yield grain',
      eligibleMediums: Object.freeze(['soil_bed'] as const),
      minimumLightBand: 'bright' as const,
      toleratesElevatedContamination: false,
      growthProgressPerUnit: 100,
      harvestOutput: Object.freeze({
        materialId: 'material:cultivated_grain',
        quantity: 12,
        perishabilityWeeks: 26,
      }),
      laborDemand: Object.freeze({
        taskId: 'material_refinement' as const,
        requiredRoleFamily: 'refinement_technician' as const,
        minimumSkillBand: 'competent' as const,
        effortUnits: 2,
      }),
    }),
    Object.freeze({
      profileId: 'cultivation:hardy-moss',
      displayLabel: 'Poor-environment hardy moss',
      eligibleMediums: Object.freeze(['soil_bed', 'sealed_planter'] as const),
      minimumLightBand: 'dim' as const,
      toleratesElevatedContamination: true,
      growthProgressPerUnit: 200,
      harvestOutput: Object.freeze({
        materialId: 'material:cultivated_moss',
        quantity: 4,
      }),
      laborDemand: Object.freeze({
        taskId: 'ward_seal_maintenance' as const,
        requiredRoleFamily: 'ward_technician' as const,
        minimumSkillBand: 'novice' as const,
        effortUnits: 1,
      }),
    }),
    Object.freeze({
      profileId: 'cultivation:ritual-bloom',
      displayLabel: 'Restricted-medium ritual bloom',
      eligibleMediums: Object.freeze(['ritual_substrate'] as const),
      minimumLightBand: 'bright' as const,
      toleratesElevatedContamination: false,
      growthProgressPerUnit: 150,
      harvestOutput: Object.freeze({
        materialId: 'material:ritual_petal',
        quantity: 3,
        perishabilityWeeks: 2,
      }),
      laborDemand: Object.freeze({
        taskId: 'ritual_frame_activation' as const,
        requiredRoleFamily: 'ritual_operator' as const,
        minimumSkillBand: 'competent' as const,
        effortUnits: 2,
      }),
      ornamental: Object.freeze({
        comfortBonus: 0,
        prestigeBonus: 0.35,
        symbolicFitBonus: 0.5,
      }),
    }),
    Object.freeze({
      profileId: 'cultivation:ornamental-fern',
      displayLabel: 'Ornamental fern (non-harvest-first)',
      eligibleMediums: Object.freeze(['sealed_planter', 'soil_bed'] as const),
      minimumLightBand: 'standard' as const,
      toleratesElevatedContamination: false,
      growthProgressPerUnit: 250,
      harvestOutput: null,
      laborDemand: Object.freeze({
        taskId: 'ward_seal_maintenance' as const,
        requiredRoleFamily: 'ward_technician' as const,
        minimumSkillBand: 'novice' as const,
        effortUnits: 1,
      }),
      ornamental: Object.freeze({
        comfortBonus: 0.4,
        prestigeBonus: 0.2,
        symbolicFitBonus: 0.1,
      }),
      lifespanElapsedUnitsAfterMaturity: 20,
    }),
    Object.freeze({
      profileId: 'cultivation:ornamental-lantern',
      displayLabel: 'Condition-sensitive lantern vine',
      eligibleMediums: Object.freeze(['hydroponic_tray'] as const),
      minimumLightBand: 'bright' as const,
      toleratesElevatedContamination: false,
      growthProgressPerUnit: 180,
      harvestOutput: null,
      laborDemand: Object.freeze({
        taskId: 'material_refinement' as const,
        requiredRoleFamily: 'refinement_technician' as const,
        minimumSkillBand: 'expert' as const,
        effortUnits: 3,
      }),
      ornamental: Object.freeze({
        comfortBonus: 0.15,
        prestigeBonus: 0.55,
        symbolicFitBonus: 0.25,
      }),
      lifespanElapsedUnitsAfterMaturity: 8,
    }),
  ])

const PROFILE_BY_ID: ReadonlyMap<string, ManagedCultivationProfile> = new Map(
  REPRESENTATIVE_CULTIVATION_PROFILES.map((profile) => [profile.profileId, profile]),
)

export function getCultivationProfile(
  profileId: string,
): ManagedCultivationProfile | undefined {
  return PROFILE_BY_ID.get(profileId)
}

function effectiveLightBand(environment: CultivationEnvironmentInput): CultivationLightBand {
  if (
    environment.artificialSupportAvailable === true &&
    (environment.lightBand === 'dim' || environment.lightBand === 'standard')
  ) {
    return 'artificial'
  }
  return environment.lightBand
}

export function evaluateCultivationViability(
  profile: ManagedCultivationProfile,
  environment: CultivationEnvironmentInput,
): {
  readonly viability: CultivationViability
  readonly reasonCodes: readonly CultivationReasonCode[]
} {
  const reasons: CultivationReasonCode[] = []
  if (!profile.eligibleMediums.includes(environment.medium)) {
    reasons.push('medium_incompatible')
  }
  const light = effectiveLightBand(environment)
  if (LIGHT_RANK[light] < LIGHT_RANK[profile.minimumLightBand]) {
    reasons.push('light_insufficient')
  }
  if (
    environment.contaminationBand === 'critical' ||
    (environment.contaminationBand === 'elevated' && !profile.toleratesElevatedContamination)
  ) {
    reasons.push('contamination_intolerant')
  }
  if (reasons.includes('medium_incompatible') || reasons.includes('contamination_intolerant')) {
    return { viability: 'nonviable', reasonCodes: Object.freeze(reasons) }
  }
  if (reasons.includes('light_insufficient')) {
    return { viability: 'degraded', reasonCodes: Object.freeze(reasons) }
  }
  return { viability: 'viable', reasonCodes: Object.freeze(reasons) }
}

export function buildCultivationLaborGateInput(
  profile: ManagedCultivationProfile,
  operators: readonly SpecialistOperatorSlot[],
): SpecialistLaborGateInput {
  return {
    taskId: profile.laborDemand.taskId,
    operators,
    infrastructurePresent: true,
  }
}

export function projectCultivationLaborGate(
  profile: ManagedCultivationProfile,
  operators: readonly SpecialistOperatorSlot[],
): SpecialistLaborGateProjection {
  const projection = projectSpecialistLaborGate(
    buildCultivationLaborGateInput(profile, operators),
  )
  const matched = projection.matchedOperator
  if (
    matched &&
    SKILL_RANK[matched.skillBand] < SKILL_RANK[profile.laborDemand.minimumSkillBand] &&
    projection.gateOutcome === 'operable'
  ) {
    return Object.freeze({
      ...projection,
      gateOutcome: 'degraded' as const,
      stallReason: null,
    })
  }
  return projection
}

function laborReason(
  projection: SpecialistLaborGateProjection,
): CultivationReasonCode | null {
  if (projection.gateOutcome === 'stalled') return 'labor_stalled'
  if (projection.gateOutcome === 'degraded') return 'labor_degraded'
  return null
}

export function createCultivationInstance(input: {
  readonly instanceId: string
  readonly profileId: string
  readonly environment: CultivationEnvironmentInput
  readonly operators?: readonly SpecialistOperatorSlot[]
}): ManagedCultivationInstance | undefined {
  const profile = getCultivationProfile(input.profileId)
  if (!profile) return undefined
  if (typeof input.instanceId !== 'string' || input.instanceId.trim().length === 0) {
    return undefined
  }
  const viabilityResult = evaluateCultivationViability(profile, input.environment)
  const labor = projectCultivationLaborGate(profile, input.operators ?? [])
  const reasons = [...viabilityResult.reasonCodes]
  const laborCode = laborReason(labor)
  if (laborCode) reasons.push(laborCode)
  if (profile.harvestOutput === null && profile.ornamental) {
    reasons.push('ornamental_only')
  }

  let lifecycleState: CultivationLifecycleState
  let viability = viabilityResult.viability
  if (viability === 'nonviable' || labor.gateOutcome === 'stalled') {
    lifecycleState = 'blocked'
    viability = viability === 'nonviable' ? 'nonviable' : 'degraded'
  } else if (viability === 'degraded' || labor.gateOutcome === 'degraded') {
    lifecycleState = 'degraded'
    viability = 'degraded'
  } else {
    lifecycleState = 'viable'
  }

  return freezeInstance({
    instanceId: input.instanceId.trim(),
    profileId: profile.profileId,
    lifecycleState,
    viability,
    progress: 0,
    remainderMilli: 0,
    reasonCodes: Object.freeze(reasons),
    elapsedSinceMaturity: 0,
    harvestedOutput: null,
    propagationOutput: null,
  })
}

function growthRateMilliForViability(
  profile: ManagedCultivationProfile,
  viability: CultivationViability,
  labor: SpecialistLaborGateProjection,
): number {
  if (viability === 'nonviable' || labor.gateOutcome === 'stalled') return 0
  let progressPerUnit = profile.growthProgressPerUnit
  if (viability === 'degraded' || labor.gateOutcome === 'degraded') {
    progressPerUnit = Math.floor(progressPerUnit / 2)
  }
  return progressPerUnit * ELAPSED_TIME_RATE_SCALE
}

export function advanceCultivationGrowth(input: {
  readonly instance: ManagedCultivationInstance
  readonly environment: CultivationEnvironmentInput
  readonly elapsedUnits: number
  readonly operators?: readonly SpecialistOperatorSlot[]
}): ManagedCultivationInstance | undefined {
  const profile = getCultivationProfile(input.instance.profileId)
  if (!profile) return undefined
  if (
    input.instance.lifecycleState === 'harvested' ||
    input.instance.lifecycleState === 'expired'
  ) {
    return freezeInstance(input.instance)
  }

  const viabilityResult = evaluateCultivationViability(profile, input.environment)
  const labor = projectCultivationLaborGate(profile, input.operators ?? [])
  const reasons: CultivationReasonCode[] = [...viabilityResult.reasonCodes]
  const laborCode = laborReason(labor)
  if (laborCode) reasons.push(laborCode)

  if (
    input.instance.lifecycleState === 'mature' ||
    input.instance.progress >= CULTIVATION_PROGRESS_MAX
  ) {
    const elapsed =
      (Number.isFinite(input.elapsedUnits) && input.elapsedUnits > 0
        ? Math.floor(input.elapsedUnits)
        : 0) + input.instance.elapsedSinceMaturity
    const lifespan = profile.lifespanElapsedUnitsAfterMaturity
    if (lifespan !== undefined && elapsed >= lifespan) {
      reasons.push('expired')
      return freezeInstance({
        ...input.instance,
        lifecycleState: 'expired',
        viability: 'nonviable',
        elapsedSinceMaturity: elapsed,
        reasonCodes: Object.freeze(reasons),
        // Ornamental contribution stops after expiry.
      })
    }
    reasons.push('mature')
    return freezeInstance({
      ...input.instance,
      lifecycleState: 'mature',
      viability: viabilityResult.viability,
      elapsedSinceMaturity: elapsed,
      reasonCodes: Object.freeze(reasons),
    })
  }

  if (
    viabilityResult.viability === 'nonviable' ||
    labor.gateOutcome === 'stalled'
  ) {
    return freezeInstance({
      ...input.instance,
      lifecycleState: 'blocked',
      viability: viabilityResult.viability === 'nonviable' ? 'nonviable' : 'degraded',
      reasonCodes: Object.freeze(reasons),
    })
  }

  const rate = growthRateMilliForViability(profile, viabilityResult.viability, labor)
  const update = applyElapsedTimeUpdate({
    kind: 'rate',
    elapsedUnits:
      Number.isFinite(input.elapsedUnits) && input.elapsedUnits > 0
        ? Math.floor(input.elapsedUnits)
        : 0,
    rateMilliPerUnit: rate,
    value: input.instance.progress,
    remainderMilli: input.instance.remainderMilli,
    minValue: 0,
    maxValue: CULTIVATION_PROGRESS_MAX,
  })

  let lifecycleState: CultivationLifecycleState
  let viability = viabilityResult.viability
  if (update.value >= CULTIVATION_PROGRESS_MAX) {
    lifecycleState = 'mature'
    reasons.push('mature')
  } else if (update.value > 0) {
    lifecycleState = 'growing'
    reasons.push('growing')
  } else if (viability === 'degraded' || labor.gateOutcome === 'degraded') {
    lifecycleState = 'degraded'
    viability = 'degraded'
  } else {
    lifecycleState = 'viable'
  }

  return freezeInstance({
    ...input.instance,
    lifecycleState,
    viability,
    progress: update.value,
    remainderMilli: update.remainderMilli,
    reasonCodes: Object.freeze(reasons),
    elapsedSinceMaturity: 0,
  })
}

/**
 * Prove SPE-3384 fine vs coarse cadence equivalence for a cultivation profile.
 */
export function cultivationGrowthCadencesEquivalent(
  profile: ManagedCultivationProfile,
  totalElapsed: number,
  fineSteps: number,
): boolean {
  const rate = profile.growthProgressPerUnit * ELAPSED_TIME_RATE_SCALE
  const steps = Math.max(1, Math.floor(fineSteps))
  const base = Math.floor(totalElapsed / steps)
  const rem = totalElapsed - base * steps
  const fineSlices = Array.from({ length: steps }, (_, i) =>
    i < rem ? base + 1 : base,
  )
  const fine = applyRateAcrossCadence({
    totalElapsed,
    sliceElapsedUnits: fineSlices,
    rateMilliPerUnit: rate,
    value: 0,
    remainderMilli: 0,
    minValue: 0,
    maxValue: CULTIVATION_PROGRESS_MAX,
  })
  const coarse = applyRateAcrossCadence({
    totalElapsed,
    sliceElapsedUnits: [totalElapsed],
    rateMilliPerUnit: rate,
    value: 0,
    remainderMilli: 0,
    minValue: 0,
    maxValue: CULTIVATION_PROGRESS_MAX,
  })
  return fine.value === coarse.value && fine.remainderMilli === coarse.remainderMilli
}

export function harvestCultivation(input: {
  readonly instance: ManagedCultivationInstance
}): ManagedCultivationInstance | undefined {
  const profile = getCultivationProfile(input.instance.profileId)
  if (!profile) return undefined
  if (input.instance.lifecycleState !== 'mature') return undefined
  if (profile.harvestOutput === null) {
    return freezeInstance({
      ...input.instance,
      lifecycleState: 'harvested',
      reasonCodes: Object.freeze(['harvested', 'ornamental_only'] as CultivationReasonCode[]),
      harvestedOutput: null,
      propagationOutput: null,
    })
  }
  const reasons: CultivationReasonCode[] = ['harvested']
  if (profile.propagation) reasons.push('propagation_ready')
  return freezeInstance({
    ...input.instance,
    lifecycleState: 'harvested',
    reasonCodes: Object.freeze(reasons),
    harvestedOutput: Object.freeze({ ...profile.harvestOutput }),
    propagationOutput: profile.propagation
      ? Object.freeze({ ...profile.propagation })
      : null,
  })
}

/**
 * Handoff envelope for SPE-1027 / SPE-3360 consumers — does not mutate storage.
 */
export function projectCultivationHarvestHandoff(
  instance: ManagedCultivationInstance,
): {
  readonly ownerIssueId: typeof MANAGED_CULTIVATION_OWNER
  readonly instanceId: string
  readonly materialId: string
  readonly quantity: number
  readonly perishabilityWeeks?: number
  readonly propagation?: CultivationPropagationSpec
} | undefined {
  if (instance.lifecycleState !== 'harvested' || !instance.harvestedOutput) {
    return undefined
  }
  return Object.freeze({
    ownerIssueId: MANAGED_CULTIVATION_OWNER,
    instanceId: instance.instanceId,
    materialId: instance.harvestedOutput.materialId,
    quantity: instance.harvestedOutput.quantity,
    ...(instance.harvestedOutput.perishabilityWeeks !== undefined
      ? { perishabilityWeeks: instance.harvestedOutput.perishabilityWeeks }
      : {}),
    ...(instance.propagationOutput
      ? { propagation: Object.freeze({ ...instance.propagationOutput }) }
      : {}),
  })
}

export function projectCultivationRoomContribution(
  instance: ManagedCultivationInstance,
): CultivationContributionInput | undefined {
  const profile = getCultivationProfile(instance.profileId)
  if (!profile?.ornamental) return undefined
  if (
    instance.lifecycleState === 'blocked' ||
    instance.lifecycleState === 'expired' ||
    instance.lifecycleState === 'harvested' ||
    instance.viability === 'nonviable'
  ) {
    return Object.freeze({
      contributionId: instance.instanceId,
      viability: 'nonviable' as const,
      comfortBonus: profile.ornamental.comfortBonus,
      prestigeBonus: profile.ornamental.prestigeBonus,
      symbolicFitBonus: profile.ornamental.symbolicFitBonus,
      localScopeOnly: true as const,
    })
  }
  return Object.freeze({
    contributionId: instance.instanceId,
    viability: instance.viability,
    comfortBonus: profile.ornamental.comfortBonus,
    prestigeBonus: profile.ornamental.prestigeBonus,
    symbolicFitBonus: profile.ornamental.symbolicFitBonus,
    localScopeOnly: true as const,
  })
}

function sanitizeHarvestOutput(value: unknown): CultivationHarvestOutput | null | undefined {
  if (value === null) return null
  if (!isRecord(value)) return undefined
  if (typeof value.materialId !== 'string' || value.materialId.trim().length === 0) {
    return undefined
  }
  if (
    typeof value.quantity !== 'number' ||
    !Number.isInteger(value.quantity) ||
    value.quantity < 0
  ) {
    return undefined
  }
  if (
    value.perishabilityWeeks !== undefined &&
    (typeof value.perishabilityWeeks !== 'number' ||
      !Number.isInteger(value.perishabilityWeeks) ||
      value.perishabilityWeeks < 0)
  ) {
    return undefined
  }
  return Object.freeze({
    materialId: value.materialId.trim(),
    quantity: value.quantity,
    ...(value.perishabilityWeeks !== undefined
      ? { perishabilityWeeks: value.perishabilityWeeks }
      : {}),
  })
}

function sanitizePropagation(value: unknown): CultivationPropagationSpec | null | undefined {
  if (value === null || value === undefined) return null
  if (!isRecord(value)) return undefined
  if (
    typeof value.propaguleMaterialId !== 'string' ||
    value.propaguleMaterialId.trim().length === 0
  ) {
    return undefined
  }
  if (
    typeof value.quantityPerHarvest !== 'number' ||
    !Number.isInteger(value.quantityPerHarvest) ||
    value.quantityPerHarvest < 0
  ) {
    return undefined
  }
  return Object.freeze({
    propaguleMaterialId: value.propaguleMaterialId.trim(),
    quantityPerHarvest: value.quantityPerHarvest,
  })
}

function sanitizeInstance(value: unknown): ManagedCultivationInstance | undefined {
  if (!isRecord(value)) return undefined
  if (typeof value.instanceId !== 'string' || value.instanceId.trim().length === 0) {
    return undefined
  }
  if (typeof value.profileId !== 'string' || !PROFILE_BY_ID.has(value.profileId)) {
    return undefined
  }
  if (!isMember(value.lifecycleState, CULTIVATION_LIFECYCLE_STATES)) return undefined
  if (!isMember(value.viability, ['viable', 'degraded', 'nonviable'] as const)) {
    return undefined
  }
  if (
    typeof value.progress !== 'number' ||
    !Number.isInteger(value.progress) ||
    value.progress < 0 ||
    value.progress > CULTIVATION_PROGRESS_MAX
  ) {
    return undefined
  }
  if (typeof value.remainderMilli !== 'number' || !Number.isInteger(value.remainderMilli)) {
    return undefined
  }
  if (
    typeof value.elapsedSinceMaturity !== 'number' ||
    !Number.isInteger(value.elapsedSinceMaturity) ||
    value.elapsedSinceMaturity < 0
  ) {
    return undefined
  }
  if (!Array.isArray(value.reasonCodes)) return undefined
  const reasons: CultivationReasonCode[] = []
  for (const code of value.reasonCodes) {
    if (!isMember(code, CULTIVATION_REASON_CODES)) return undefined
    reasons.push(code)
  }
  const harvested = sanitizeHarvestOutput(value.harvestedOutput)
  if (harvested === undefined) return undefined
  const propagation = sanitizePropagation(value.propagationOutput)
  if (propagation === undefined) return undefined

  return freezeInstance({
    instanceId: value.instanceId.trim(),
    profileId: value.profileId,
    lifecycleState: value.lifecycleState,
    viability: value.viability,
    progress: value.progress,
    remainderMilli: value.remainderMilli,
    reasonCodes: Object.freeze(reasons),
    elapsedSinceMaturity: value.elapsedSinceMaturity,
    harvestedOutput: harvested,
    propagationOutput: propagation,
  })
}

/** Fail-closed sanitize of a versioned cultivation registry for save/load. */
export function sanitizeManagedCultivationRegistry(
  value: unknown,
): ManagedCultivationRegistry | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined
  if (value.version !== 1) return undefined
  if (!Array.isArray(value.instances)) return undefined
  if (value.instances.length > 64) return undefined
  const instances: ManagedCultivationInstance[] = []
  const seen = new Set<string>()
  for (const raw of value.instances) {
    const instance = sanitizeInstance(raw)
    if (!instance) return undefined
    if (seen.has(instance.instanceId)) return undefined
    seen.add(instance.instanceId)
    instances.push(instance)
  }
  instances.sort((a, b) => (a.instanceId < b.instanceId ? -1 : a.instanceId > b.instanceId ? 1 : 0))
  return Object.freeze({
    version: 1 as const,
    instances: Object.freeze(instances),
  })
}

export function createEmptyCultivationRegistry(): ManagedCultivationRegistry {
  return Object.freeze({ version: 1 as const, instances: Object.freeze([]) })
}
