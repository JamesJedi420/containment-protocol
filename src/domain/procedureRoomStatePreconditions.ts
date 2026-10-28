/**
 * SPE-1896 — procedure room-state preconditions and facility-configuration safety.
 *
 * Pure, deterministic validation before hazardous procedures proceed. Callers
 * supply room-state and facility-configuration snapshots; this module does not
 * simulate facilities or mutate GameState. Composes with SPE-2771 workshop
 * operational safety only by shared patterns, not by owning workshop projection.
 */

import {
  CONTAINMENT_LAYOUT_MODES,
  FACILITY_ROOM_IDS,
  FACILITY_ZONE_IDS,
  isContainmentLayoutMode,
  isFacilityRoomId,
  isFacilityZoneId,
  type ContainmentLayoutMode,
  type FacilityRoomId,
  type FacilityZoneId,
} from './facilityLayoutStrategy'

export const PROCEDURE_ROOM_STATE_PRECONDITIONS_OWNER = 'SPE-1896' as const
export const PROCEDURE_ROOM_STATE_PRECONDITIONS_SCHEMA_VERSION = 'spe-1896.v1' as const

export const ROOM_STATE_CHECK_KINDS = [
  'lighting',
  'locks',
  'staffPositioning',
  'facilityConfiguration',
] as const
export type RoomStateCheckKind = (typeof ROOM_STATE_CHECK_KINDS)[number]

export const ROOM_STATE_LIGHTING_VALUES = ['adequate', 'dim', 'dark'] as const
export type RoomStateLighting = (typeof ROOM_STATE_LIGHTING_VALUES)[number]

export const ROOM_STATE_LOCKS_VALUES = ['secured', 'unlocked', 'compromised'] as const
export type RoomStateLocks = (typeof ROOM_STATE_LOCKS_VALUES)[number]

export const STAFF_POSITIONING_VALUES = ['clear', 'blocked', 'personnel_in_hazard_zone'] as const
export type StaffPositioningState = (typeof STAFF_POSITIONING_VALUES)[number]

export type ProcedureRoomStateSafetyReasonCode =
  | 'malformed_input'
  | 'unknown_procedure_id'
  | 'invalid_requirements'
  | 'room_state_room_mismatch'
  | 'room_not_in_facility_configuration'
  | 'unknown_lighting_state'
  | 'lighting_precondition_unmet'
  | 'unknown_locks_state'
  | 'locks_precondition_unmet'
  | 'unknown_staff_positioning_state'
  | 'staff_positioning_precondition_unmet'
  | 'facility_zone_mismatch'
  | 'facility_containment_mode_mismatch'
  | 'unknown_facility_zone_ref'

export interface RoomStateSnapshot {
  readonly roomId: FacilityRoomId
  readonly lighting: RoomStateLighting | 'unknown'
  readonly locks: RoomStateLocks | 'unknown'
  readonly staffPositioning: StaffPositioningState | 'unknown'
}

export interface FacilityRoomZoneAssignment {
  readonly roomId: FacilityRoomId
  readonly zoneId: FacilityZoneId
}

export interface FacilityConfigurationSnapshot {
  readonly facilityId: string
  readonly activeRoomIds: readonly FacilityRoomId[]
  readonly roomZoneAssignments: readonly FacilityRoomZoneAssignment[]
  readonly containmentLayoutMode: ContainmentLayoutMode | 'unknown'
}

export type ProcedureRoomStateCheckSpec =
  | { readonly kind: 'lighting'; readonly minimum: RoomStateLighting }
  | { readonly kind: 'locks'; readonly required: 'secured' }
  | { readonly kind: 'staffPositioning'; readonly required: 'clear' }
  | {
      readonly kind: 'facilityConfiguration'
      readonly expectedZone: FacilityZoneId
      readonly requiredContainmentMode?: ContainmentLayoutMode
    }

export interface ProcedureSafetyRequirement {
  readonly procedureId: string
  readonly requiredRoomId: FacilityRoomId
  readonly checks: readonly ProcedureRoomStateCheckSpec[]
}

export interface EvaluateProcedureRoomStateSafetyInput {
  readonly procedureId: string
  readonly roomState: RoomStateSnapshot | unknown
  readonly facilityConfiguration: FacilityConfigurationSnapshot | unknown
  readonly requirements?: readonly ProcedureSafetyRequirement[]
}

export type ProcedureRoomStateSafetyResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly reasonCode: ProcedureRoomStateSafetyReasonCode
      readonly failedCheckKind?: RoomStateCheckKind
      readonly procedureId: string
      readonly roomId?: FacilityRoomId
    }

const LIGHTING_RANK: Readonly<Record<RoomStateLighting, number>> = Object.freeze({
  dark: 0,
  dim: 1,
  adequate: 2,
})

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRoomStateLighting(value: unknown): value is RoomStateLighting {
  return ROOM_STATE_LIGHTING_VALUES.some((entry) => entry === value)
}

function isRoomStateLocks(value: unknown): value is RoomStateLocks {
  return ROOM_STATE_LOCKS_VALUES.some((entry) => entry === value)
}

function isStaffPositioningState(value: unknown): value is StaffPositioningState {
  return STAFF_POSITIONING_VALUES.some((entry) => entry === value)
}

export function parseRoomStateSnapshot(input: unknown): RoomStateSnapshot | undefined {
  if (!isRecord(input)) return undefined
  if (!isFacilityRoomId(input.roomId)) return undefined

  const lightingRaw = input.lighting
  const locksRaw = input.locks
  const staffRaw = input.staffPositioning

  const lighting: RoomStateSnapshot['lighting'] =
    lightingRaw === 'unknown'
      ? 'unknown'
      : isRoomStateLighting(lightingRaw)
        ? lightingRaw
        : 'unknown'

  const locks: RoomStateSnapshot['locks'] =
    locksRaw === 'unknown'
      ? 'unknown'
      : isRoomStateLocks(locksRaw)
        ? locksRaw
        : 'unknown'

  const staffPositioning: RoomStateSnapshot['staffPositioning'] =
    staffRaw === 'unknown'
      ? 'unknown'
      : isStaffPositioningState(staffRaw)
        ? staffRaw
        : 'unknown'

  return Object.freeze({
    roomId: input.roomId,
    lighting,
    locks,
    staffPositioning,
  })
}

export function parseFacilityConfigurationSnapshot(
  input: unknown
): FacilityConfigurationSnapshot | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined

  const activeRoomIdsRaw = input.activeRoomIds
  if (!Array.isArray(activeRoomIdsRaw)) return undefined
  const activeRoomIds: FacilityRoomId[] = []
  for (const entry of activeRoomIdsRaw) {
    if (!isFacilityRoomId(entry)) return undefined
    if (!activeRoomIds.includes(entry)) activeRoomIds.push(entry)
  }

  const assignmentsRaw = input.roomZoneAssignments
  if (!Array.isArray(assignmentsRaw)) return undefined
  const roomZoneAssignments: FacilityRoomZoneAssignment[] = []
  const zoneByRoom = new Map<FacilityRoomId, FacilityZoneId>()
  for (const entry of assignmentsRaw) {
    if (!isRecord(entry)) return undefined
    if (!isFacilityRoomId(entry.roomId) || !isFacilityZoneId(entry.zoneId)) return undefined
    const prior = zoneByRoom.get(entry.roomId)
    if (prior !== undefined && prior !== entry.zoneId) {
      return undefined
    }
    if (prior === undefined) {
      zoneByRoom.set(entry.roomId, entry.zoneId)
      roomZoneAssignments.push(Object.freeze({ roomId: entry.roomId, zoneId: entry.zoneId }))
    }
  }

  const modeRaw = input.containmentLayoutMode
  const containmentLayoutMode: FacilityConfigurationSnapshot['containmentLayoutMode'] =
    modeRaw === 'unknown'
      ? 'unknown'
      : isContainmentLayoutMode(modeRaw)
        ? modeRaw
        : 'unknown'

  return Object.freeze({
    facilityId: input.facilityId.trim(),
    activeRoomIds: Object.freeze([...activeRoomIds]),
    roomZoneAssignments: Object.freeze([...roomZoneAssignments]),
    containmentLayoutMode,
  })
}

export const DEFAULT_PROCEDURE_SAFETY_REQUIREMENTS: readonly ProcedureSafetyRequirement[] =
  Object.freeze([
    Object.freeze({
      procedureId: 'binding_sigil',
      requiredRoomId: 'containment_cell',
      checks: Object.freeze([
        { kind: 'lighting', minimum: 'adequate' },
        { kind: 'locks', required: 'secured' },
        { kind: 'staffPositioning', required: 'clear' },
        {
          kind: 'facilityConfiguration',
          expectedZone: 'containment',
          requiredContainmentMode: 'secure_clean',
        },
      ] satisfies readonly ProcedureRoomStateCheckSpec[]),
    }),
    Object.freeze({
      procedureId: 'resonance_construct',
      requiredRoomId: 'armory',
      checks: Object.freeze([
        { kind: 'lighting', minimum: 'dim' },
        { kind: 'locks', required: 'secured' },
        { kind: 'staffPositioning', required: 'clear' },
        {
          kind: 'facilityConfiguration',
          expectedZone: 'storage',
        },
      ] satisfies readonly ProcedureRoomStateCheckSpec[]),
    }),
  ])

export function lookupProcedureSafetyRequirement(
  procedureId: string,
  requirements: readonly ProcedureSafetyRequirement[] = DEFAULT_PROCEDURE_SAFETY_REQUIREMENTS
): ProcedureSafetyRequirement | undefined {
  const normalized = procedureId.trim()
  if (!normalized) return undefined
  return requirements.find((entry) => entry.procedureId === normalized)
}

function parseCheckSpec(raw: unknown): ProcedureRoomStateCheckSpec | undefined {
  if (!isRecord(raw) || typeof raw.kind !== 'string') return undefined
  switch (raw.kind) {
    case 'lighting': {
      if (!isRoomStateLighting(raw.minimum)) return undefined
      return Object.freeze({ kind: 'lighting', minimum: raw.minimum })
    }
    case 'locks': {
      if (raw.required !== 'secured') return undefined
      return Object.freeze({ kind: 'locks', required: 'secured' as const })
    }
    case 'staffPositioning': {
      if (raw.required !== 'clear') return undefined
      return Object.freeze({ kind: 'staffPositioning', required: 'clear' as const })
    }
    case 'facilityConfiguration': {
      if (!isFacilityZoneId(raw.expectedZone)) return undefined
      if (
        raw.requiredContainmentMode !== undefined &&
        !isContainmentLayoutMode(raw.requiredContainmentMode)
      ) {
        return undefined
      }
      return Object.freeze({
        kind: 'facilityConfiguration',
        expectedZone: raw.expectedZone,
        ...(raw.requiredContainmentMode !== undefined
          ? { requiredContainmentMode: raw.requiredContainmentMode }
          : {}),
      })
    }
    default:
      return undefined
  }
}

/** Fail-closed parse of caller-supplied requirement catalogs. */
export function parseProcedureSafetyRequirements(
  input: unknown
): readonly ProcedureSafetyRequirement[] | undefined {
  if (!Array.isArray(input) || input.length === 0) return undefined
  const out: ProcedureSafetyRequirement[] = []
  const seen = new Set<string>()
  for (const entry of input) {
    if (!isRecord(entry)) return undefined
    if (!isNonEmptyString(entry.procedureId) || !isFacilityRoomId(entry.requiredRoomId)) {
      return undefined
    }
    const procedureId = entry.procedureId.trim()
    if (seen.has(procedureId)) return undefined
    seen.add(procedureId)
    if (!Array.isArray(entry.checks) || entry.checks.length === 0) return undefined
    const checks: ProcedureRoomStateCheckSpec[] = []
    for (const checkRaw of entry.checks) {
      const check = parseCheckSpec(checkRaw)
      if (!check) return undefined
      checks.push(check)
    }
    out.push(
      Object.freeze({
        procedureId,
        requiredRoomId: entry.requiredRoomId,
        checks: Object.freeze(checks),
      })
    )
  }
  return Object.freeze(out)
}

function block(
  reasonCode: ProcedureRoomStateSafetyReasonCode,
  procedureId: string,
  failedCheckKind?: RoomStateCheckKind,
  roomId?: FacilityRoomId
): ProcedureRoomStateSafetyResult {
  return Object.freeze({
    ok: false,
    reasonCode,
    failedCheckKind,
    procedureId,
    roomId,
  })
}

function resolveRoomZone(
  roomId: FacilityRoomId,
  facility: FacilityConfigurationSnapshot
): FacilityZoneId | undefined {
  return facility.roomZoneAssignments.find((entry) => entry.roomId === roomId)?.zoneId
}

function evaluateCheck(
  check: ProcedureRoomStateCheckSpec,
  roomState: RoomStateSnapshot,
  facility: FacilityConfigurationSnapshot,
  procedureId: string
): ProcedureRoomStateSafetyResult | undefined {
  switch (check.kind) {
    case 'lighting': {
      if (roomState.lighting === 'unknown') {
        return block('unknown_lighting_state', procedureId, 'lighting', roomState.roomId)
      }
      if (LIGHTING_RANK[roomState.lighting] < LIGHTING_RANK[check.minimum]) {
        return block('lighting_precondition_unmet', procedureId, 'lighting', roomState.roomId)
      }
      return undefined
    }
    case 'locks': {
      if (roomState.locks === 'unknown') {
        return block('unknown_locks_state', procedureId, 'locks', roomState.roomId)
      }
      if (roomState.locks !== check.required) {
        return block('locks_precondition_unmet', procedureId, 'locks', roomState.roomId)
      }
      return undefined
    }
    case 'staffPositioning': {
      if (roomState.staffPositioning === 'unknown') {
        return block(
          'unknown_staff_positioning_state',
          procedureId,
          'staffPositioning',
          roomState.roomId
        )
      }
      if (roomState.staffPositioning !== check.required) {
        return block(
          'staff_positioning_precondition_unmet',
          procedureId,
          'staffPositioning',
          roomState.roomId
        )
      }
      return undefined
    }
    case 'facilityConfiguration': {
      if (!facility.activeRoomIds.includes(roomState.roomId)) {
        return block(
          'room_not_in_facility_configuration',
          procedureId,
          'facilityConfiguration',
          roomState.roomId
        )
      }
      const zone = resolveRoomZone(roomState.roomId, facility)
      if (zone === undefined) {
        return block(
          'unknown_facility_zone_ref',
          procedureId,
          'facilityConfiguration',
          roomState.roomId
        )
      }
      if (zone !== check.expectedZone) {
        return block('facility_zone_mismatch', procedureId, 'facilityConfiguration', roomState.roomId)
      }
      if (check.requiredContainmentMode !== undefined) {
        if (facility.containmentLayoutMode === 'unknown') {
          return block(
            'facility_containment_mode_mismatch',
            procedureId,
            'facilityConfiguration',
            roomState.roomId
          )
        }
        if (facility.containmentLayoutMode !== check.requiredContainmentMode) {
          return block(
            'facility_containment_mode_mismatch',
            procedureId,
            'facilityConfiguration',
            roomState.roomId
          )
        }
      }
      return undefined
    }
    default: {
      const _exhaustive: never = check
      throw new Error(
        `evaluateProcedureRoomStateSafety: unhandled check kind ${String(_exhaustive)}`
      )
    }
  }
}

/**
 * Deterministic fail-closed gate before a procedure interaction proceeds.
 */
export function evaluateProcedureRoomStateSafety(
  input: EvaluateProcedureRoomStateSafetyInput
): ProcedureRoomStateSafetyResult {
  if (!isRecord(input)) {
    return block('malformed_input', '')
  }

  const procedureId = typeof input.procedureId === 'string' ? input.procedureId.trim() : ''
  if (!procedureId) {
    return block('malformed_input', '')
  }

  const roomState = parseRoomStateSnapshot(input.roomState)
  const facility = parseFacilityConfigurationSnapshot(input.facilityConfiguration)
  if (!roomState || !facility) {
    return block('malformed_input', procedureId)
  }

  let requirements: readonly ProcedureSafetyRequirement[]
  if (input.requirements === undefined) {
    requirements = DEFAULT_PROCEDURE_SAFETY_REQUIREMENTS
  } else {
    const parsed = parseProcedureSafetyRequirements(input.requirements)
    if (!parsed) {
      return block('invalid_requirements', procedureId)
    }
    requirements = parsed
  }

  const requirement = lookupProcedureSafetyRequirement(procedureId, requirements)
  if (!requirement) {
    return block('unknown_procedure_id', procedureId)
  }

  if (roomState.roomId !== requirement.requiredRoomId) {
    return block('room_state_room_mismatch', procedureId, undefined, roomState.roomId)
  }

  for (const check of requirement.checks) {
    const failure = evaluateCheck(check, roomState, facility, procedureId)
    if (failure) return failure
  }

  return Object.freeze({ ok: true })
}

/** Exported for tests and authoring review — canonical facility room ids this slice references. */
export const REFERENCED_FACILITY_ROOM_IDS: readonly FacilityRoomId[] = Object.freeze([
  ...FACILITY_ROOM_IDS.filter(
    (roomId) => roomId === 'containment_cell' || roomId === 'armory'
  ),
])

/** Exported for tests — zone ids referenced by default requirements. */
export const REFERENCED_FACILITY_ZONE_IDS: readonly FacilityZoneId[] = Object.freeze([
  ...FACILITY_ZONE_IDS.filter((zoneId) => zoneId === 'containment' || zoneId === 'storage'),
])

/** Exported for tests — containment modes referenced by default requirements. */
export const REFERENCED_CONTAINMENT_LAYOUT_MODES: readonly ContainmentLayoutMode[] =
  Object.freeze([...CONTAINMENT_LAYOUT_MODES])
