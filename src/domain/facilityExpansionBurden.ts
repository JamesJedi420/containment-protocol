/**
 * SPE-2262 — pure facility expansion burden projector (slice 1).
 *
 * Callers own room-count (layout delta). This module maps integer room counts
 * onto authored burden bands with travel/upkeep/staffing/patrol/maintenance
 * outputs and a named capability grant. It does not persist GameState, run
 * week-close, pathfind, or consume labor/collapse systems.
 */

export const EXPANSION_BURDEN_BANDS = ['baseline', 'expanded', 'sprawling'] as const
export type ExpansionBurdenBand = (typeof EXPANSION_BURDEN_BANDS)[number]

export const EXPANSION_CAPABILITY_IDS = [
  'core_footprint',
  'annex_capacity',
  'wing_capacity',
] as const
export type ExpansionCapabilityId = (typeof EXPANSION_CAPABILITY_IDS)[number]

export interface ExpansionBurdenInput {
  readonly roomCount: number
  /** Optional prior count for caller delta checks; ignored by projection. */
  readonly priorRoomCount?: number
}

export interface ExpansionBurdenRecord {
  readonly band: ExpansionBurdenBand
  readonly roomCount: number
  readonly roomCountMin: number
  readonly roomCountMax: number | null
  readonly travelTimeMultiplier: number
  readonly upkeepLoad: number
  readonly staffingMinimum: number
  readonly patrolCoverageGapRisk: number
  readonly maintenanceDebtAccrual: number
  readonly grantedCapabilityId: ExpansionCapabilityId
}

interface BandDefinition {
  readonly band: ExpansionBurdenBand
  readonly roomCountMin: number
  readonly roomCountMax: number | null
  readonly travelTimeMultiplier: number
  readonly upkeepLoad: number
  readonly staffingMinimum: number
  readonly patrolCoverageGapRisk: number
  readonly maintenanceDebtAccrual: number
  readonly grantedCapabilityId: ExpansionCapabilityId
}

/**
 * Authored bands (inclusive mins; max null means unbounded).
 * Each higher band strictly increases every burden metric and upgrades capability.
 */
const BAND_DEFINITIONS: readonly BandDefinition[] = Object.freeze([
  Object.freeze({
    band: 'baseline' as const,
    roomCountMin: 0,
    roomCountMax: 3,
    travelTimeMultiplier: 1,
    upkeepLoad: 10,
    staffingMinimum: 2,
    patrolCoverageGapRisk: 5,
    maintenanceDebtAccrual: 0,
    grantedCapabilityId: 'core_footprint' as const,
  }),
  Object.freeze({
    band: 'expanded' as const,
    roomCountMin: 4,
    roomCountMax: 7,
    travelTimeMultiplier: 1.25,
    upkeepLoad: 25,
    staffingMinimum: 5,
    patrolCoverageGapRisk: 20,
    maintenanceDebtAccrual: 8,
    grantedCapabilityId: 'annex_capacity' as const,
  }),
  Object.freeze({
    band: 'sprawling' as const,
    roomCountMin: 8,
    roomCountMax: null,
    travelTimeMultiplier: 1.6,
    upkeepLoad: 45,
    staffingMinimum: 9,
    patrolCoverageGapRisk: 40,
    maintenanceDebtAccrual: 18,
    grantedCapabilityId: 'wing_capacity' as const,
  }),
])

function isNonNegativeFiniteInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
  )
}

export function isExpansionBurdenBand(value: unknown): value is ExpansionBurdenBand {
  return EXPANSION_BURDEN_BANDS.some((band) => band === value)
}

export function isExpansionCapabilityId(value: unknown): value is ExpansionCapabilityId {
  return EXPANSION_CAPABILITY_IDS.some((id) => id === value)
}

function resolveBandDefinition(roomCount: number): BandDefinition {
  for (const definition of BAND_DEFINITIONS) {
    const withinMax =
      definition.roomCountMax === null || roomCount <= definition.roomCountMax
    if (roomCount >= definition.roomCountMin && withinMax) {
      return definition
    }
  }
  // Unreachable for non-negative integers; kept fail-closed for exhaustiveness.
  return BAND_DEFINITIONS[BAND_DEFINITIONS.length - 1]!
}

/**
 * Project caller-owned room count into an immutable expansion-burden record.
 * Non-integer, negative, non-finite, or missing roomCount fail closed to undefined.
 */
export function projectFacilityExpansionBurden(
  input: ExpansionBurdenInput | null | undefined
): ExpansionBurdenRecord | undefined {
  if (input == null || typeof input !== 'object') return undefined
  if (!isNonNegativeFiniteInteger(input.roomCount)) return undefined
  if (
    input.priorRoomCount !== undefined &&
    !isNonNegativeFiniteInteger(input.priorRoomCount)
  ) {
    return undefined
  }

  const definition = resolveBandDefinition(input.roomCount)
  return Object.freeze({
    band: definition.band,
    roomCount: input.roomCount,
    roomCountMin: definition.roomCountMin,
    roomCountMax: definition.roomCountMax,
    travelTimeMultiplier: definition.travelTimeMultiplier,
    upkeepLoad: definition.upkeepLoad,
    staffingMinimum: definition.staffingMinimum,
    patrolCoverageGapRisk: definition.patrolCoverageGapRisk,
    maintenanceDebtAccrual: definition.maintenanceDebtAccrual,
    grantedCapabilityId: definition.grantedCapabilityId,
  })
}

/**
 * Compare two room counts for expansion tradeoff assertions.
 * Returns undefined when either side fails closed.
 */
export function compareFacilityExpansionBurden(
  leftRoomCount: unknown,
  rightRoomCount: unknown
):
  | {
      left: ExpansionBurdenRecord
      right: ExpansionBurdenRecord
      travelTimeMultiplierDelta: number
      upkeepLoadDelta: number
      staffingMinimumDelta: number
      patrolCoverageGapRiskDelta: number
      maintenanceDebtAccrualDelta: number
      capabilityChanged: boolean
    }
  | undefined {
  if (!isNonNegativeFiniteInteger(leftRoomCount) || !isNonNegativeFiniteInteger(rightRoomCount)) {
    return undefined
  }
  const left = projectFacilityExpansionBurden({ roomCount: leftRoomCount })
  const right = projectFacilityExpansionBurden({ roomCount: rightRoomCount })
  if (!left || !right) return undefined
  return Object.freeze({
    left,
    right,
    travelTimeMultiplierDelta: left.travelTimeMultiplier - right.travelTimeMultiplier,
    upkeepLoadDelta: left.upkeepLoad - right.upkeepLoad,
    staffingMinimumDelta: left.staffingMinimum - right.staffingMinimum,
    patrolCoverageGapRiskDelta: left.patrolCoverageGapRisk - right.patrolCoverageGapRisk,
    maintenanceDebtAccrualDelta: left.maintenanceDebtAccrual - right.maintenanceDebtAccrual,
    capabilityChanged: left.grantedCapabilityId !== right.grantedCapabilityId,
  })
}
