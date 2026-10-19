/**
 * SPE-3361 — duplicate facility stacking rules.
 *
 * Pure caller-owned packets project bounded stacking benefits, diminishing
 * returns / caps, upkeep burdens, and disabled-duplicate output changes for
 * redundant facilities of the same compatible type. Distinct from generic
 * effect stacking or equipment modifiers.
 *
 * This module does not persist GameState, run week-close, or draw facility UI.
 */

/** Representative facility type used by acceptance fixtures. */
export const DUPLICATE_STACK_FACILITY_TYPE = 'lab_annex' as const

export const DUPLICATE_FACILITY_OPERATIONAL_STATES = [
  'operational',
  'damaged',
  'disabled',
  'understaffed',
  'overburdened',
  'seized',
] as const
export type DuplicateFacilityOperationalState =
  (typeof DUPLICATE_FACILITY_OPERATIONAL_STATES)[number]

export const DUPLICATE_BURDEN_KINDS = [
  'staffing',
  'upkeep',
  'spatial',
  'maintenance',
  'vulnerability',
] as const
export type DuplicateBurdenKind = (typeof DUPLICATE_BURDEN_KINDS)[number]

export const DUPLICATE_BURDEN_BANDS = ['none', 'moderate', 'severe'] as const
export type DuplicateBurdenBand = (typeof DUPLICATE_BURDEN_BANDS)[number]

/** Hard cap on counted duplicates contributing to stack benefit. */
export const DUPLICATE_STACK_HARD_CAP = 4 as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseFacilityStackBasics(
  input: unknown
): { facilityType: string; totalCount: number; compatible: boolean } | undefined {
  if (!isRecord(input)) return undefined
  const facilityType = input.facilityType
  const totalCount = input.totalCount
  const compatible = input.compatible
  if (typeof facilityType !== 'string' || facilityType.trim().length === 0) return undefined
  if (typeof totalCount !== 'number' || !Number.isInteger(totalCount) || totalCount < 0) {
    return undefined
  }
  if (typeof compatible !== 'boolean') return undefined
  return { facilityType, totalCount, compatible }
}

/**
 * Diminishing stacking benefit: unit 1 → 100, then +50, +25, +12 (floored),
 * capped at DUPLICATE_STACK_HARD_CAP contributing units.
 */
export function computeBoundedStackBenefitUnits(contributingCount: number): number {
  const counted = Math.min(Math.max(contributingCount, 0), DUPLICATE_STACK_HARD_CAP)
  if (counted === 0) return 0
  let benefit = 100
  let increment = 50
  for (let i = 2; i <= counted; i += 1) {
    benefit += increment
    increment = Math.max(1, Math.floor(increment / 2))
  }
  return benefit
}

function freezeStackResult(
  facilityType: string,
  totalCount: number,
  contributingCount: number
): DuplicateFacilityStackResult {
  const stackBenefitUnits = computeBoundedStackBenefitUnits(contributingCount)
  const hardCapApplied = totalCount > DUPLICATE_STACK_HARD_CAP
  const diminishingReturnsApplied =
    contributingCount >= 2 && stackBenefitUnits < totalCount * 100
  return Object.freeze({
    facilityType,
    totalCount,
    contributingCount,
    stackBenefitUnits,
    diminishingReturnsApplied,
    hardCapApplied,
    boundedBenefit: true as const,
  })
}

export interface DuplicateFacilityStackInput {
  readonly facilityType: string
  readonly totalCount: number
  readonly compatible: boolean
}

export interface DuplicateFacilityStackResult {
  readonly facilityType: string
  readonly totalCount: number
  readonly contributingCount: number
  readonly stackBenefitUnits: number
  readonly diminishingReturnsApplied: boolean
  readonly hardCapApplied: boolean
  readonly boundedBenefit: boolean
}

/** Project bounded stacking benefit for duplicate/compatible facilities. */
export function projectDuplicateFacilityStack(
  input: unknown
): DuplicateFacilityStackResult | undefined {
  const basics = parseFacilityStackBasics(input)
  if (!basics) return undefined
  const { facilityType, totalCount, compatible } = basics
  if (totalCount === 0) return freezeStackResult(facilityType, 0, 0)
  if (!compatible) return freezeStackResult(facilityType, totalCount, 1)
  return freezeStackResult(
    facilityType,
    totalCount,
    Math.min(totalCount, DUPLICATE_STACK_HARD_CAP)
  )
}

export interface DuplicateFacilityBurdenInput {
  readonly facilityType: string
  readonly totalCount: number
  readonly compatible: boolean
}

export interface DuplicateFacilityBurdenResult {
  readonly facilityType: string
  readonly totalCount: number
  readonly burdenByKind: Readonly<Record<DuplicateBurdenKind, DuplicateBurdenBand>>
  readonly burdenIncreased: boolean
}

function burdenBandForCount(count: number): DuplicateBurdenBand {
  if (count <= 1) return 'none'
  if (count === 2) return 'moderate'
  return 'severe'
}

/**
 * Physical facility count drives burden even when units are incompatible for
 * stacking benefit (redundant footprint still costs staffing/upkeep/space).
 */
export function projectDuplicateFacilityBurden(
  input: unknown
): DuplicateFacilityBurdenResult | undefined {
  const basics = parseFacilityStackBasics(input)
  if (!basics) return undefined
  const band = burdenBandForCount(basics.totalCount)
  const burdenByKind = Object.freeze(
    Object.fromEntries(DUPLICATE_BURDEN_KINDS.map((kind) => [kind, band]))
  ) as Readonly<Record<DuplicateBurdenKind, DuplicateBurdenBand>>
  return Object.freeze({
    facilityType: basics.facilityType,
    totalCount: basics.totalCount,
    burdenByKind,
    burdenIncreased: band !== 'none',
  })
}

export interface DuplicateFacilityUnitInput {
  readonly unitId: string
  readonly state: DuplicateFacilityOperationalState
}

export interface DisabledDuplicateStackEffectInput {
  readonly facilityType: string
  readonly units: readonly DuplicateFacilityUnitInput[]
  readonly compatible: boolean
}

export interface DisabledDuplicateStackEffectResult {
  readonly facilityType: string
  readonly totalUnits: number
  readonly contributingOperationalCount: number
  readonly effectiveStackBenefitUnits: number
  readonly nonContributingCount: number
  readonly damagedCount: number
  readonly disabledCount: number
  readonly seizedCount: number
  readonly outputChangedByDisablement: boolean
}

function parseUnits(
  unitsRaw: unknown
): readonly DuplicateFacilityUnitInput[] | undefined {
  if (!Array.isArray(unitsRaw) || unitsRaw.length === 0) return undefined
  const units: DuplicateFacilityUnitInput[] = []
  const seenIds = new Set<string>()
  for (const unit of unitsRaw) {
    if (!isRecord(unit)) return undefined
    if (typeof unit.unitId !== 'string' || unit.unitId.trim().length === 0) return undefined
    if (seenIds.has(unit.unitId)) return undefined
    seenIds.add(unit.unitId)
    if (
      typeof unit.state !== 'string' ||
      !DUPLICATE_FACILITY_OPERATIONAL_STATES.some((s) => s === unit.state)
    ) {
      return undefined
    }
    units.push({ unitId: unit.unitId, state: unit.state })
  }
  return units
}

function countByState(
  units: readonly DuplicateFacilityUnitInput[],
  state: DuplicateFacilityOperationalState
): number {
  return units.reduce((n, u) => n + (u.state === state ? 1 : 0), 0)
}

/** Damaged/disabled/seized duplicates stop contributing; understaffed/overburdened still count at full. */
export function projectDisabledDuplicateStackEffect(
  input: unknown
): DisabledDuplicateStackEffectResult | undefined {
  if (!isRecord(input)) return undefined
  if (typeof input.facilityType !== 'string' || input.facilityType.trim().length === 0) {
    return undefined
  }
  if (typeof input.compatible !== 'boolean') return undefined
  const units = parseUnits(input.units)
  if (!units) return undefined

  const damagedCount = countByState(units, 'damaged')
  const disabledCount = countByState(units, 'disabled')
  const seizedCount = countByState(units, 'seized')
  const nonContributingCount = damagedCount + disabledCount + seizedCount
  const contributingOperationalCount = units.length - nonContributingCount

  const cappedContributing = input.compatible
    ? Math.min(contributingOperationalCount, DUPLICATE_STACK_HARD_CAP)
    : contributingOperationalCount > 0
      ? 1
      : 0
  const cappedFull = input.compatible
    ? Math.min(units.length, DUPLICATE_STACK_HARD_CAP)
    : units.length > 0
      ? 1
      : 0

  const effectiveStackBenefitUnits = computeBoundedStackBenefitUnits(cappedContributing)
  const fullBenefit = computeBoundedStackBenefitUnits(cappedFull)

  return Object.freeze({
    facilityType: input.facilityType,
    totalUnits: units.length,
    contributingOperationalCount: input.compatible
      ? contributingOperationalCount
      : cappedContributing,
    effectiveStackBenefitUnits,
    nonContributingCount,
    damagedCount,
    disabledCount,
    seizedCount,
    outputChangedByDisablement:
      effectiveStackBenefitUnits !== fullBenefit ||
      (!input.compatible && contributingOperationalCount === 0),
  })
}
