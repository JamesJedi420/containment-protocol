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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.some((item) => item === value)
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
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
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityType)) return undefined
  if (!isPositiveInt(input.totalCount)) return undefined
  if (typeof input.compatible !== 'boolean') return undefined

  if (!input.compatible) {
    return Object.freeze({
      facilityType: input.facilityType,
      totalCount: input.totalCount,
      contributingCount: 1,
      stackBenefitUnits: computeBoundedStackBenefitUnits(1),
      diminishingReturnsApplied: false,
      hardCapApplied: false,
      boundedBenefit: true,
    })
  }

  const contributingCount = Math.min(input.totalCount, DUPLICATE_STACK_HARD_CAP)
  const stackBenefitUnits = computeBoundedStackBenefitUnits(contributingCount)
  const linearWouldBe = contributingCount * 100
  return Object.freeze({
    facilityType: input.facilityType,
    totalCount: input.totalCount,
    contributingCount,
    stackBenefitUnits,
    diminishingReturnsApplied: contributingCount >= 2 && stackBenefitUnits < linearWouldBe,
    hardCapApplied: input.totalCount > DUPLICATE_STACK_HARD_CAP,
    boundedBenefit: true,
  })
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

/** Redundant infrastructure increases staffing/upkeep/spatial/maintenance/vulnerability burden. */
export function projectDuplicateFacilityBurden(
  input: unknown
): DuplicateFacilityBurdenResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityType)) return undefined
  if (!isPositiveInt(input.totalCount)) return undefined
  if (typeof input.compatible !== 'boolean') return undefined

  const effectiveCount = input.compatible ? input.totalCount : 1
  const band = burdenBandForCount(effectiveCount)
  const burdenByKind = Object.freeze({
    staffing: band,
    upkeep: band,
    spatial: band,
    maintenance: band,
    vulnerability: band,
  }) as Readonly<Record<DuplicateBurdenKind, DuplicateBurdenBand>>

  return Object.freeze({
    facilityType: input.facilityType,
    totalCount: input.totalCount,
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
  readonly disabledOrDamagedCount: number
  readonly outputChangedByDisablement: boolean
}

const NON_CONTRIBUTING_STATES: readonly DuplicateFacilityOperationalState[] = [
  'damaged',
  'disabled',
  'seized',
]

/** Damaged/disabled/seized duplicates stop contributing; understaffed/overburdened still count at full. */
export function projectDisabledDuplicateStackEffect(
  input: unknown
): DisabledDuplicateStackEffectResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityType)) return undefined
  if (typeof input.compatible !== 'boolean') return undefined
  if (!Array.isArray(input.units) || input.units.length === 0) return undefined

  const units: DuplicateFacilityUnitInput[] = []
  for (const unit of input.units) {
    if (!isRecord(unit)) return undefined
    if (!isNonEmptyString(unit.unitId)) return undefined
    if (!isMember(unit.state, DUPLICATE_FACILITY_OPERATIONAL_STATES)) return undefined
    units.push({ unitId: unit.unitId, state: unit.state })
  }

  if (!input.compatible) {
    const firstOperational = units.find((u) => !NON_CONTRIBUTING_STATES.includes(u.state))
    const contributing = firstOperational ? 1 : 0
    const allBenefit = computeBoundedStackBenefitUnits(1)
    const effective = computeBoundedStackBenefitUnits(contributing)
    return Object.freeze({
      facilityType: input.facilityType,
      totalUnits: units.length,
      contributingOperationalCount: contributing,
      effectiveStackBenefitUnits: effective,
      disabledOrDamagedCount: units.filter((u) =>
        NON_CONTRIBUTING_STATES.includes(u.state)
      ).length,
      outputChangedByDisablement: effective !== allBenefit,
    })
  }

  const contributingOperationalCount = units.filter(
    (u) => !NON_CONTRIBUTING_STATES.includes(u.state)
  ).length
  const disabledOrDamagedCount = units.filter((u) =>
    NON_CONTRIBUTING_STATES.includes(u.state)
  ).length
  const fullBenefit = computeBoundedStackBenefitUnits(
    Math.min(units.length, DUPLICATE_STACK_HARD_CAP)
  )
  const effectiveStackBenefitUnits = computeBoundedStackBenefitUnits(
    Math.min(contributingOperationalCount, DUPLICATE_STACK_HARD_CAP)
  )

  return Object.freeze({
    facilityType: input.facilityType,
    totalUnits: units.length,
    contributingOperationalCount,
    effectiveStackBenefitUnits,
    disabledOrDamagedCount,
    outputChangedByDisablement: effectiveStackBenefitUnits !== fullBenefit,
  })
}
