/** Frozen SPE-113 runtime: blast-door and pressure-seal integrity-labor stations. Not the full station catalog. */

export const BLAST_DOOR_INTEGRITY_LABOR_STATION_ID = 'blast_door_integrity_bench' as const
export type BlastDoorIntegrityLaborStationId = typeof BLAST_DOOR_INTEGRITY_LABOR_STATION_ID

export const PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID = 'pressure_seal_integrity_bench' as const
export type PressureSealIntegrityLaborStationId = typeof PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID

export const INTEGRITY_LABOR_STATION_IDS = [
  BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
  PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID,
] as const
export type IntegrityLaborStationId = (typeof INTEGRITY_LABOR_STATION_IDS)[number]

export const INTEGRITY_LABOR_CYCLE_DELTA = 1 as const

export interface EquipmentInstanceStationMutation {
  stationId: IntegrityLaborStationId
  appliedWeek: number
}

export type IntegrityLaborFailureCode =
  'invalid_class' | 'already_applied' | 'invalid_week' | 'malformed_mutation'

export type IntegrityLaborResolveResult =
  | {
      ok: true
      stationId: IntegrityLaborStationId
      cycleDelta: typeof INTEGRITY_LABOR_CYCLE_DELTA
      mutation: EquipmentInstanceStationMutation
    }
  | { ok: false; code: IntegrityLaborFailureCode }

export type StationMutationParseResult =
  | { ok: true; mutation: EquipmentInstanceStationMutation }
  | { ok: false; code: 'malformed_mutation' }

const STATION_MUTATION_KEYS = ['stationId', 'appliedWeek'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key))
}

export function isIntegrityLaborStationId(value: unknown): value is IntegrityLaborStationId {
  return (
    value === BLAST_DOOR_INTEGRITY_LABOR_STATION_ID ||
    value === PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID
  )
}

export function eligibleClassIdForIntegrityLaborStation(
  stationId: IntegrityLaborStationId
): 'blast_door' | 'pressure_seal' {
  switch (stationId) {
    case BLAST_DOOR_INTEGRITY_LABOR_STATION_ID:
      return 'blast_door'
    case PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID:
      return 'pressure_seal'
    default: {
      const exhaustive: never = stationId
      return exhaustive
    }
  }
}

export function parseEquipmentInstanceStationMutation(value: unknown): StationMutationParseResult {
  if (!isRecord(value) || !hasOnlyKeys(value, STATION_MUTATION_KEYS)) {
    return { ok: false, code: 'malformed_mutation' }
  }
  if (!isIntegrityLaborStationId(value.stationId)) {
    return { ok: false, code: 'malformed_mutation' }
  }
  if (!Number.isSafeInteger(value.appliedWeek) || (value.appliedWeek as number) < 1) {
    return { ok: false, code: 'malformed_mutation' }
  }
  return {
    ok: true,
    mutation: {
      stationId: value.stationId,
      appliedWeek: value.appliedWeek as number,
    },
  }
}

export function snapshotEquipmentInstanceStationMutation(
  mutation: EquipmentInstanceStationMutation
): EquipmentInstanceStationMutation {
  return {
    stationId: mutation.stationId,
    appliedWeek: mutation.appliedWeek,
  }
}

export function stationMutationsEqual(
  left: EquipmentInstanceStationMutation | undefined,
  right: EquipmentInstanceStationMutation | undefined
) {
  if (left === right) return true
  if (!left || !right) return false
  return left.stationId === right.stationId && left.appliedWeek === right.appliedWeek
}

function resolveIntegrityLabor(input: {
  expectedClassId: 'blast_door' | 'pressure_seal'
  stationId: IntegrityLaborStationId
  classId: unknown
  existingMutation: unknown
  currentWeek: unknown
}): IntegrityLaborResolveResult {
  if (input.classId !== input.expectedClassId) {
    return { ok: false, code: 'invalid_class' }
  }
  if (!Number.isSafeInteger(input.currentWeek) || (input.currentWeek as number) < 1) {
    return { ok: false, code: 'invalid_week' }
  }
  if (input.existingMutation !== undefined) {
    const parsed = parseEquipmentInstanceStationMutation(input.existingMutation)
    if (!parsed.ok || parsed.mutation.stationId !== input.stationId) {
      return { ok: false, code: 'malformed_mutation' }
    }
    return { ok: false, code: 'already_applied' }
  }
  return {
    ok: true,
    stationId: input.stationId,
    cycleDelta: INTEGRITY_LABOR_CYCLE_DELTA,
    mutation: {
      stationId: input.stationId,
      appliedWeek: input.currentWeek as number,
    },
  }
}

/**
 * Authored blast-door integrity-labor eligibility. Discriminated result; no throw, no default apply.
 * Does not read or write SPE-2851 `condition` or SPE-2862 deficiency.
 */
export function resolveBlastDoorIntegrityLabor(input: {
  classId: unknown
  existingMutation: unknown
  currentWeek: unknown
}): IntegrityLaborResolveResult {
  return resolveIntegrityLabor({
    expectedClassId: 'blast_door',
    stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
    classId: input.classId,
    existingMutation: input.existingMutation,
    currentWeek: input.currentWeek,
  })
}

/**
 * Authored pressure-seal integrity-labor eligibility. Discriminated result; no throw, no default apply.
 * Does not read or write SPE-2851 `condition` or SPE-2862 deficiency.
 */
export function resolvePressureSealIntegrityLabor(input: {
  classId: unknown
  existingMutation: unknown
  currentWeek: unknown
}): IntegrityLaborResolveResult {
  return resolveIntegrityLabor({
    expectedClassId: 'pressure_seal',
    stationId: PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID,
    classId: input.classId,
    existingMutation: input.existingMutation,
    currentWeek: input.currentWeek,
  })
}
