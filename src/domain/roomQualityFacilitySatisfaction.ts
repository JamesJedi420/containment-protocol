/**
 * SPE-1060 — room quality, zone value, and facility satisfaction.
 *
 * Pure caller-owned packets score rooms on distinct comfort, technical
 * suitability, prestige, and symbolic-fit dimensions. Physical condition stays
 * separate from contextual valuation. Recovery, work reliability, shared-space
 * pressure, expectation legitimacy, and task quality gates consume those scores.
 *
 * Ownership boundaries:
 * - SPE-1060: room/zone quality baseline and contextual valuation
 * - SPE-1066: actor-specific preference modifiers (optional caller input only)
 * - SPE-3406: managed cultivation viability/contribution (optional caller input)
 * - SPE-1058: specialist labor upkeep for cultivation (not owned here)
 * - SPE-780 / SPE-3361: effect stacking / duplicate facility output
 *
 * No GameState, week-close, interior-design simulator, or facility UI.
 */

export const ROOM_USE_CONTEXTS = [
  'clinical',
  'domestic',
  'public_facing',
  'industrial',
  'recovery',
  'exterior',
  'ritual',
  'research',
] as const
export type RoomUseContext = (typeof ROOM_USE_CONTEXTS)[number]

export const ROOM_QUALITY_DIMENSIONS = [
  'comfort',
  'technicalSuitability',
  'prestige',
  'symbolicFit',
] as const
export type RoomQualityDimension = (typeof ROOM_QUALITY_DIMENSIONS)[number]

export const TASK_QUALITY_OUTCOMES = [
  'allowed',
  'downgraded',
  'unsafe',
  'blocked',
] as const
export type TaskQualityOutcome = (typeof TASK_QUALITY_OUTCOMES)[number]

export const LEGITIMACY_OUTCOMES = [
  'meets_expectation',
  'below_expectation',
  'above_expectation_suspicion',
] as const
export type LegitimacyOutcome = (typeof LEGITIMACY_OUTCOMES)[number]

export const CULTIVATION_VIABILITY = [
  'viable',
  'degraded',
  'nonviable',
] as const
export type CultivationViability = (typeof CULTIVATION_VIABILITY)[number]

const SCORE_MIN = 0
const SCORE_MAX = 100

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return SCORE_MIN
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(value)))
}

function parseUnitScore(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  if (value < 0 || value > 1) return undefined
  return value
}

export interface RoomPhysicalConditionInput {
  readonly cleanliness: number
  readonly clutter: number
  readonly contamination: number
  readonly damage: number
  readonly lighting: number
  readonly noise: number
  readonly privacy: number
  readonly crowding: number
}

export interface RoomPhysicalCondition {
  readonly cleanliness: number
  readonly clutter: number
  readonly contamination: number
  readonly damage: number
  readonly lighting: number
  readonly noise: number
  readonly privacy: number
  readonly crowding: number
}

/** Normalize authoritative physical condition (0–1 unit scores). */
export function projectRoomPhysicalCondition(
  input: unknown
): RoomPhysicalCondition | undefined {
  if (!isRecord(input)) return undefined
  const cleanliness = parseUnitScore(input.cleanliness)
  const clutter = parseUnitScore(input.clutter)
  const contamination = parseUnitScore(input.contamination)
  const damage = parseUnitScore(input.damage)
  const lighting = parseUnitScore(input.lighting)
  const noise = parseUnitScore(input.noise)
  const privacy = parseUnitScore(input.privacy)
  const crowding = parseUnitScore(input.crowding)
  if (
    cleanliness === undefined ||
    clutter === undefined ||
    contamination === undefined ||
    damage === undefined ||
    lighting === undefined ||
    noise === undefined ||
    privacy === undefined ||
    crowding === undefined
  ) {
    return undefined
  }
  return Object.freeze({
    cleanliness,
    clutter,
    contamination,
    damage,
    lighting,
    noise,
    privacy,
    crowding,
  })
}

export interface CultivationContributionInput {
  readonly contributionId: string
  readonly viability: CultivationViability
  readonly comfortBonus: number
  readonly prestigeBonus: number
  readonly symbolicFitBonus: number
  readonly localScopeOnly: true
}

export interface PreferenceModifierInput {
  readonly preferenceOwner: 'SPE-1066'
  readonly comfortDelta: number
  readonly technicalSuitabilityDelta: number
}

export interface RoomQualityScoreInput {
  readonly roomId: string
  readonly useContext: RoomUseContext
  readonly physical: RoomPhysicalConditionInput
  readonly materialsPrestige?: number
  readonly domainMatch?: number
  readonly cultivation?: CultivationContributionInput
  readonly preferenceModifier?: PreferenceModifierInput
}

export interface RoomQualityScores {
  readonly roomId: string
  readonly useContext: RoomUseContext
  readonly physical: RoomPhysicalCondition
  readonly comfort: number
  readonly technicalSuitability: number
  readonly prestige: number
  readonly symbolicFit: number
  readonly dimensionsSeparated: true
  readonly physicalUnchangedByContext: true
  readonly reasonCodes: readonly string[]
  readonly cultivationApplied: boolean
  readonly preferenceApplied: boolean
}

function cultivationBonuses(
  cultivation: CultivationContributionInput | undefined,
  useContext: RoomUseContext
): {
  readonly comfort: number
  readonly prestige: number
  readonly symbolicFit: number
  readonly applied: boolean
  readonly reasons: readonly string[]
} {
  if (!cultivation) {
    return { comfort: 0, prestige: 0, symbolicFit: 0, applied: false, reasons: [] }
  }
  if (cultivation.viability === 'nonviable') {
    return {
      comfort: 0,
      prestige: 0,
      symbolicFit: 0,
      applied: false,
      reasons: ['cultivation_nonviable'],
    }
  }
  const scale = cultivation.viability === 'degraded' ? 0.4 : 1
  const comfortRelevant =
    useContext === 'domestic' ||
    useContext === 'recovery' ||
    useContext === 'public_facing'
  const prestigeRelevant =
    useContext === 'public_facing' || useContext === 'ritual' || useContext === 'domestic'
  const symbolicRelevant = useContext === 'ritual' || useContext === 'public_facing'
  return {
    comfort: comfortRelevant ? cultivation.comfortBonus * scale : 0,
    prestige: prestigeRelevant ? cultivation.prestigeBonus * scale : 0,
    symbolicFit: symbolicRelevant ? cultivation.symbolicFitBonus * scale : 0,
    applied: true,
    reasons: [`cultivation_${cultivation.viability}`],
  }
}

function contextWeights(useContext: RoomUseContext): {
  readonly comfortClean: number
  readonly comfortPrivacy: number
  readonly comfortNoise: number
  readonly technicalClean: number
  readonly technicalDamage: number
  readonly technicalContamination: number
  readonly technicalLighting: number
} {
  switch (useContext) {
    case 'clinical':
      return {
        comfortClean: 10,
        comfortPrivacy: 15,
        comfortNoise: 10,
        technicalClean: 40,
        technicalDamage: 20,
        technicalContamination: 30,
        technicalLighting: 15,
      }
    case 'recovery':
    case 'domestic':
      return {
        comfortClean: 20,
        comfortPrivacy: 30,
        comfortNoise: 25,
        technicalClean: 15,
        technicalDamage: 15,
        technicalContamination: 10,
        technicalLighting: 10,
      }
    case 'public_facing':
      return {
        comfortClean: 25,
        comfortPrivacy: 10,
        comfortNoise: 10,
        technicalClean: 20,
        technicalDamage: 15,
        technicalContamination: 15,
        technicalLighting: 15,
      }
    case 'industrial':
      return {
        comfortClean: 5,
        comfortPrivacy: 5,
        comfortNoise: 5,
        technicalClean: 20,
        technicalDamage: 30,
        technicalContamination: 20,
        technicalLighting: 20,
      }
    case 'research':
      return {
        comfortClean: 10,
        comfortPrivacy: 10,
        comfortNoise: 15,
        technicalClean: 25,
        technicalDamage: 20,
        technicalContamination: 25,
        technicalLighting: 25,
      }
    case 'ritual':
      return {
        comfortClean: 10,
        comfortPrivacy: 20,
        comfortNoise: 25,
        technicalClean: 15,
        technicalDamage: 10,
        technicalContamination: 15,
        technicalLighting: 10,
      }
    case 'exterior':
      return {
        comfortClean: 5,
        comfortPrivacy: 5,
        comfortNoise: 5,
        technicalClean: 10,
        technicalDamage: 25,
        technicalContamination: 15,
        technicalLighting: 10,
      }
  }
}

function parseCultivation(
  value: unknown
): CultivationContributionInput | undefined | 'invalid' {
  if (value === undefined) return undefined
  if (!isRecord(value)) return 'invalid'
  if (!isNonEmptyString(value.contributionId)) return 'invalid'
  if (!isMember(value.viability, CULTIVATION_VIABILITY)) return 'invalid'
  if (value.localScopeOnly !== true) return 'invalid'
  const comfortBonus = parseUnitScore(value.comfortBonus)
  const prestigeBonus = parseUnitScore(value.prestigeBonus)
  const symbolicFitBonus = parseUnitScore(value.symbolicFitBonus)
  if (
    comfortBonus === undefined ||
    prestigeBonus === undefined ||
    symbolicFitBonus === undefined
  ) {
    return 'invalid'
  }
  return Object.freeze({
    contributionId: value.contributionId.trim(),
    viability: value.viability,
    comfortBonus,
    prestigeBonus,
    symbolicFitBonus,
    localScopeOnly: true as const,
  })
}

function parsePreference(
  value: unknown
): PreferenceModifierInput | undefined | 'invalid' {
  if (value === undefined) return undefined
  if (!isRecord(value)) return 'invalid'
  if (value.preferenceOwner !== 'SPE-1066') return 'invalid'
  if (typeof value.comfortDelta !== 'number' || !Number.isFinite(value.comfortDelta)) {
    return 'invalid'
  }
  if (
    typeof value.technicalSuitabilityDelta !== 'number' ||
    !Number.isFinite(value.technicalSuitabilityDelta)
  ) {
    return 'invalid'
  }
  return Object.freeze({
    preferenceOwner: 'SPE-1066' as const,
    comfortDelta: value.comfortDelta,
    technicalSuitabilityDelta: value.technicalSuitabilityDelta,
  })
}

/** Score distinct quality dimensions from physical condition + use context. */
export function projectRoomQualityScores(
  input: unknown
): RoomQualityScores | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.roomId)) return undefined
  if (!isMember(input.useContext, ROOM_USE_CONTEXTS)) return undefined

  const physical = projectRoomPhysicalCondition(input.physical)
  if (!physical) return undefined

  const materialsPrestige =
    input.materialsPrestige === undefined ? 0.5 : parseUnitScore(input.materialsPrestige)
  const domainMatch =
    input.domainMatch === undefined ? 0.5 : parseUnitScore(input.domainMatch)
  if (materialsPrestige === undefined || domainMatch === undefined) return undefined

  const cultivation = parseCultivation(input.cultivation)
  if (cultivation === 'invalid') return undefined
  const preferenceModifier = parsePreference(input.preferenceModifier)
  if (preferenceModifier === 'invalid') return undefined

  const weights = contextWeights(input.useContext)
  const reasons: string[] = [`context:${input.useContext}`]

  const comfortBase =
    40 +
    physical.cleanliness * weights.comfortClean +
    physical.privacy * weights.comfortPrivacy +
    (1 - physical.noise) * weights.comfortNoise -
    physical.crowding * 20 -
    physical.clutter * 10

  const technicalBase =
    35 +
    physical.cleanliness * weights.technicalClean +
    (1 - physical.damage) * weights.technicalDamage +
    (1 - physical.contamination) * weights.technicalContamination +
    physical.lighting * weights.technicalLighting -
    physical.clutter * 8

  const prestigeBase =
    30 + materialsPrestige * 40 + physical.cleanliness * 15 - physical.damage * 20

  const symbolicBase =
    30 + domainMatch * 45 + physical.privacy * 10 - physical.noise * 10

  const cult = cultivationBonuses(cultivation, input.useContext)
  reasons.push(...cult.reasons)

  let comfort = comfortBase + cult.comfort * 20
  let technicalSuitability = technicalBase
  let prestige = prestigeBase + cult.prestige * 15
  let symbolicFit = symbolicBase + cult.symbolicFit * 20

  let preferenceApplied = false
  if (preferenceModifier) {
    comfort += preferenceModifier.comfortDelta
    technicalSuitability += preferenceModifier.technicalSuitabilityDelta
    preferenceApplied = true
    reasons.push('preference_SPE-1066')
  }

  // Luxury/prestige must not auto-lift technical suitability.
  if (prestige > technicalSuitability) {
    reasons.push('prestige_does_not_imply_technical')
  }

  return Object.freeze({
    roomId: input.roomId.trim(),
    useContext: input.useContext,
    physical,
    comfort: clampScore(comfort),
    technicalSuitability: clampScore(technicalSuitability),
    prestige: clampScore(prestige),
    symbolicFit: clampScore(symbolicFit),
    dimensionsSeparated: true as const,
    physicalUnchangedByContext: true as const,
    reasonCodes: Object.freeze([...reasons]),
    cultivationApplied: cult.applied,
    preferenceApplied,
  })
}

export interface RecoveryModifierResult {
  readonly roomId: string
  readonly recoveryDelta: number
  readonly burnoutRiskDelta: number
  readonly fatigueReliefDelta: number
  readonly reasonCodes: readonly string[]
}

/** Recovery spaces improve or worsen stress/fatigue relief from comfort. */
export function evaluateRecoveryModifier(
  scores: RoomQualityScores
): RecoveryModifierResult | undefined {
  if (scores.useContext !== 'recovery' && scores.useContext !== 'domestic') {
    return Object.freeze({
      roomId: scores.roomId,
      recoveryDelta: 0,
      burnoutRiskDelta: 0,
      fatigueReliefDelta: 0,
      reasonCodes: Object.freeze(['not_recovery_context'] as const),
    })
  }
  const recoveryDelta = clampScore(scores.comfort) - 50
  return Object.freeze({
    roomId: scores.roomId,
    recoveryDelta,
    burnoutRiskDelta: -Math.round(recoveryDelta / 2),
    fatigueReliefDelta: Math.round(recoveryDelta / 2),
    reasonCodes: Object.freeze(['recovery_from_comfort'] as const),
  })
}

export interface WorkPerformanceModifierResult {
  readonly roomId: string
  readonly speedDelta: number
  readonly errorResistanceDelta: number
  readonly safetyDelta: number
  readonly reasonCodes: readonly string[]
}

/** Task rooms improve or degrade work reliability from technical suitability. */
export function evaluateWorkPerformanceModifier(
  scores: RoomQualityScores
): WorkPerformanceModifierResult {
  const technical = scores.technicalSuitability - 50
  return Object.freeze({
    roomId: scores.roomId,
    speedDelta: Math.round(technical / 5),
    errorResistanceDelta: Math.round(technical / 4),
    safetyDelta: Math.round(technical / 3),
    reasonCodes: Object.freeze(['work_from_technical'] as const),
  })
}

export interface SharedSpacePressureResult {
  readonly roomId: string
  readonly cohesionDelta: number
  readonly irritationDelta: number
  readonly trustDelta: number
  readonly conflictRiskDelta: number
  readonly reasonCodes: readonly string[]
}

/** Shared lived-in spaces convert comfort/privacy/crowding into social pressure. */
export function evaluateSharedSpacePressure(
  scores: RoomQualityScores
): SharedSpacePressureResult {
  const crowding = scores.physical.crowding
  const privacy = scores.physical.privacy
  const comfort = scores.comfort
  const cohesionDelta = Math.round((comfort - 50) / 5 + privacy * 10 - crowding * 15)
  const irritationDelta = Math.round(crowding * 25 - privacy * 10 - (comfort - 50) / 5)
  const trustDelta = Math.round(privacy * 15 + (comfort - 50) / 6 - crowding * 10)
  const conflictRiskDelta = Math.round(crowding * 20 + irritationDelta / 2 - trustDelta / 3)
  return Object.freeze({
    roomId: scores.roomId,
    cohesionDelta,
    irritationDelta,
    trustDelta,
    conflictRiskDelta,
    reasonCodes: Object.freeze(['shared_space_pressure'] as const),
  })
}

export interface ExpectationLegitimacyInput {
  readonly scores: RoomQualityScores
  readonly expectedPrestige: number
  readonly audience: 'inspector' | 'faction' | 'public_cover'
}

export interface ExpectationLegitimacyResult {
  readonly roomId: string
  readonly audience: 'inspector' | 'faction' | 'public_cover'
  readonly outcome: LegitimacyOutcome
  readonly prestigeGap: number
  readonly reasonCodes: readonly string[]
}

/** Inspector/faction/public-cover reactions to visible prestige vs expectation. */
export function evaluateExpectationLegitimacy(
  input: unknown
): ExpectationLegitimacyResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isRecord(input.scores)) return undefined
  if (!isMember(input.audience, ['inspector', 'faction', 'public_cover'] as const)) {
    return undefined
  }
  const expectedPrestige = parseUnitScore(input.expectedPrestige)
  if (expectedPrestige === undefined) return undefined
  const scores = input.scores as RoomQualityScores
  if (typeof scores.prestige !== 'number' || !isNonEmptyString(scores.roomId)) {
    return undefined
  }

  const expected = clampScore(expectedPrestige * 100)
  const gap = scores.prestige - expected
  let outcome: LegitimacyOutcome = 'meets_expectation'
  const reasons: string[] = [`audience:${input.audience}`]
  if (gap < -15) {
    outcome = 'below_expectation'
    reasons.push('prestige_below_expectation')
  } else if (gap > 25 && input.audience === 'public_cover') {
    outcome = 'above_expectation_suspicion'
    reasons.push('over_fortified_or_lavish_cover')
  }

  return Object.freeze({
    roomId: scores.roomId,
    audience: input.audience,
    outcome,
    prestigeGap: gap,
    reasonCodes: Object.freeze(reasons),
  })
}

export interface TaskQualityGateInput {
  readonly scores: RoomQualityScores
  readonly taskId: string
  readonly requiredTechnical: number
  readonly requiredComfort?: number
}

export interface TaskQualityGateResult {
  readonly roomId: string
  readonly taskId: string
  readonly outcome: TaskQualityOutcome
  readonly reasonCodes: readonly string[]
}

/** Block, downgrade, or mark unsafe when room fails minimum quality thresholds. */
export function evaluateTaskQualityGate(
  input: unknown
): TaskQualityGateResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.taskId)) return undefined
  if (!isRecord(input.scores)) return undefined
  const requiredTechnical = parseUnitScore(input.requiredTechnical)
  if (requiredTechnical === undefined) return undefined
  const requiredComfort =
    input.requiredComfort === undefined
      ? undefined
      : parseUnitScore(input.requiredComfort)
  if (input.requiredComfort !== undefined && requiredComfort === undefined) {
    return undefined
  }

  const scores = input.scores as RoomQualityScores
  if (typeof scores.technicalSuitability !== 'number' || !isNonEmptyString(scores.roomId)) {
    return undefined
  }

  const technicalNeed = clampScore(requiredTechnical * 100)
  const comfortNeed =
    requiredComfort === undefined ? undefined : clampScore(requiredComfort * 100)
  const reasons: string[] = []

  if (scores.technicalSuitability < technicalNeed - 20) {
    reasons.push('technical_far_below_minimum')
    return Object.freeze({
      roomId: scores.roomId,
      taskId: input.taskId.trim(),
      outcome: 'blocked' as const,
      reasonCodes: Object.freeze(reasons),
    })
  }
  if (scores.technicalSuitability < technicalNeed) {
    reasons.push('technical_below_minimum')
    const outcome: TaskQualityOutcome =
      scores.physical.contamination > 0.5 || scores.physical.damage > 0.5
        ? 'unsafe'
        : 'downgraded'
    if (outcome === 'unsafe') reasons.push('hazardous_physical_condition')
    return Object.freeze({
      roomId: scores.roomId,
      taskId: input.taskId.trim(),
      outcome,
      reasonCodes: Object.freeze(reasons),
    })
  }
  if (comfortNeed !== undefined && scores.comfort < comfortNeed) {
    reasons.push('comfort_below_minimum')
    return Object.freeze({
      roomId: scores.roomId,
      taskId: input.taskId.trim(),
      outcome: 'downgraded' as const,
      reasonCodes: Object.freeze(reasons),
    })
  }

  return Object.freeze({
    roomId: scores.roomId,
    taskId: input.taskId.trim(),
    outcome: 'allowed' as const,
    reasonCodes: Object.freeze(['quality_gate_passed'] as const),
  })
}
