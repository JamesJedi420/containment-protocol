/**
 * SPE-292 — facility zoning, access bands, and lockdown response.
 *
 * Pure caller-owned operational zone packets separate facility functions,
 * access bands, hazard isolation, containment alarms, and lockdown circulation
 * policy. Activity/work policy may restrict without making every excluded
 * location physically impassable. Lockdown changes zone-layer circulation
 * atomically; whole-facility lifecycle and path traversal remain elsewhere.
 *
 * Ownership boundaries:
 * - SPE-292: operational zone / function / access-band / lockdown policy
 * - SPE-2079: proximity-risk vs information clearance (orthogonal gate)
 * - SPE-731: layered ownership / command / power / action authorization
 * - SPE-1095: actual traversal and route-control semantics
 * - SPE-406: entry / access validation grammar
 * - SPE-2081: personnel-class emergency routing
 *
 * This module does not persist GameState, run week-close, simulate pathfinding,
 * or own facility UI.
 */

import {
  FACILITY_ACCESS_BANDS,
  type FacilityAccessBand,
} from './layeredFacilityControl'

/** Representative specialized facility used by acceptance fixtures. */
export const ZONING_FACILITY_ID = 'facility:specialized-ops-wing' as const

export const OPERATIONAL_ZONE_FUNCTIONS = [
  'public_cover',
  'administration',
  'operations',
  'containment',
  'hazard_test',
  'deep_vault',
] as const
export type OperationalZoneFunction = (typeof OPERATIONAL_ZONE_FUNCTIONS)[number]

export const ZONE_RISK_BANDS = ['low', 'elevated', 'high', 'critical'] as const
export type ZoneRiskBand = (typeof ZONE_RISK_BANDS)[number]

export const ZONE_ALARM_STATES = ['quiet', 'containment_alarm', 'lockdown'] as const
export type ZoneAlarmState = (typeof ZONE_ALARM_STATES)[number]

/** Facility-wide posture that rewrites zone circulation policy. */
export const FACILITY_SECURITY_POSTURES = [
  'normal',
  'containment_alarm',
  'lockdown',
] as const
export type FacilitySecurityPosture = (typeof FACILITY_SECURITY_POSTURES)[number]

/**
 * Circulation policy at the zone layer (not pathfinding). Distinct from
 * activity/work policy so a restricted work zone need not be impassable.
 */
export const ZONE_CIRCULATION_MODES = [
  'open',
  'staff_only',
  'emergency_only',
  'sealed',
] as const
export type ZoneCirculationMode = (typeof ZONE_CIRCULATION_MODES)[number]

/** Where work/activity policy applies without asserting physical impassability. */
export const ZONE_ACTIVITY_POLICIES = [
  'unrestricted',
  'function_restricted',
  'suspended',
] as const
export type ZoneActivityPolicy = (typeof ZONE_ACTIVITY_POLICIES)[number]

export const ZONE_ACCESS_DENIAL_REASONS = [
  'none',
  'access_band_insufficient',
  'hazard_isolation_blocks_entry',
  'circulation_sealed',
  'circulation_emergency_only',
  'activity_suspended',
] as const
export type ZoneAccessDenialReason = (typeof ZONE_ACCESS_DENIAL_REASONS)[number]

export { FACILITY_ACCESS_BANDS }
export type { FacilityAccessBand }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

function accessRank(band: FacilityAccessBand): number {
  return FACILITY_ACCESS_BANDS.indexOf(band)
}

function circulationRank(mode: ZoneCirculationMode): number {
  return ZONE_CIRCULATION_MODES.indexOf(mode)
}

function activityRank(policy: ZoneActivityPolicy): number {
  return ZONE_ACTIVITY_POLICIES.indexOf(policy)
}

/** Never loosen a stricter baseline when applying posture. */
function stricterCirculation(
  baseline: ZoneCirculationMode,
  target: ZoneCirculationMode
): ZoneCirculationMode {
  return circulationRank(baseline) >= circulationRank(target) ? baseline : target
}

function stricterActivity(
  baseline: ZoneActivityPolicy,
  target: ZoneActivityPolicy
): ZoneActivityPolicy {
  return activityRank(baseline) >= activityRank(target) ? baseline : target
}

function lockdownCirculationTarget(
  zoneFunction: OperationalZoneFunction
): ZoneCirculationMode {
  if (zoneFunction === 'public_cover') return 'staff_only'
  if (zoneFunction === 'administration' || zoneFunction === 'operations') {
    return 'emergency_only'
  }
  return 'sealed'
}

function containmentAlarmCirculationTarget(
  zoneFunction: OperationalZoneFunction
): ZoneCirculationMode | undefined {
  if (zoneFunction === 'hazard_test' || zoneFunction === 'deep_vault') return 'sealed'
  if (zoneFunction === 'containment') return 'emergency_only'
  if (zoneFunction === 'public_cover') return 'staff_only'
  return undefined
}

function lockdownActivityTarget(
  zoneFunction: OperationalZoneFunction
): ZoneActivityPolicy | undefined {
  if (zoneFunction === 'hazard_test' || zoneFunction === 'deep_vault') return 'suspended'
  if (zoneFunction === 'containment') return 'function_restricted'
  return undefined
}

function defaultMinimumAccess(fn: OperationalZoneFunction): FacilityAccessBand {
  switch (fn) {
    case 'public_cover':
      return 'enter'
    case 'administration':
      return 'enter'
    case 'operations':
      return 'operate'
    case 'containment':
      return 'operate'
    case 'hazard_test':
      return 'operate'
    case 'deep_vault':
      return 'command'
  }
}

function defaultRisk(fn: OperationalZoneFunction): ZoneRiskBand {
  switch (fn) {
    case 'public_cover':
      return 'low'
    case 'administration':
      return 'low'
    case 'operations':
      return 'elevated'
    case 'containment':
      return 'high'
    case 'hazard_test':
      return 'critical'
    case 'deep_vault':
      return 'critical'
  }
}

function defaultCirculation(fn: OperationalZoneFunction): ZoneCirculationMode {
  switch (fn) {
    case 'public_cover':
      return 'open'
    case 'administration':
      return 'staff_only'
    case 'operations':
      return 'staff_only'
    case 'containment':
      return 'staff_only'
    case 'hazard_test':
      return 'emergency_only'
    case 'deep_vault':
      return 'sealed'
  }
}

function defaultActivity(fn: OperationalZoneFunction): ZoneActivityPolicy {
  switch (fn) {
    case 'public_cover':
      return 'unrestricted'
    case 'administration':
      return 'function_restricted'
    case 'operations':
      return 'function_restricted'
    case 'containment':
      return 'function_restricted'
    case 'hazard_test':
      return 'function_restricted'
    case 'deep_vault':
      return 'function_restricted'
  }
}

/** Apply facility posture onto baseline circulation without inventing path edges. */
export function resolveCirculationUnderPosture(
  baseline: ZoneCirculationMode,
  posture: FacilitySecurityPosture,
  zoneFunction: OperationalZoneFunction
): ZoneCirculationMode {
  if (posture === 'normal') return baseline
  if (posture === 'lockdown') {
    return stricterCirculation(baseline, lockdownCirculationTarget(zoneFunction))
  }
  const alarmTarget = containmentAlarmCirculationTarget(zoneFunction)
  return alarmTarget === undefined ? baseline : stricterCirculation(baseline, alarmTarget)
}

function resolveAlarmForPosture(posture: FacilitySecurityPosture): ZoneAlarmState {
  switch (posture) {
    case 'normal':
      return 'quiet'
    case 'containment_alarm':
      return 'containment_alarm'
    case 'lockdown':
      return 'lockdown'
  }
}

function resolveActivityUnderPosture(
  baseline: ZoneActivityPolicy,
  posture: FacilitySecurityPosture,
  zoneFunction: OperationalZoneFunction
): ZoneActivityPolicy {
  if (posture === 'lockdown') {
    const target = lockdownActivityTarget(zoneFunction)
    return target === undefined ? baseline : stricterActivity(baseline, target)
  }
  if (posture === 'containment_alarm' && zoneFunction === 'hazard_test') {
    return stricterActivity(baseline, 'suspended')
  }
  return baseline
}

export interface OperationalZonePacketInput {
  readonly zoneId: string
  readonly zoneFunction: OperationalZoneFunction
  readonly minimumAccessBand?: FacilityAccessBand
  readonly riskBand?: ZoneRiskBand
  readonly hazardIsolated?: boolean
  readonly baselineCirculation?: ZoneCirculationMode
  readonly baselineActivityPolicy?: ZoneActivityPolicy
  /** Non-contiguous zone sets are allowed; caller supplies membership labels. */
  readonly contiguousGroupId?: string
}

export interface OperationalZonePacket {
  readonly zoneId: string
  readonly zoneFunction: OperationalZoneFunction
  readonly minimumAccessBand: FacilityAccessBand
  readonly riskBand: ZoneRiskBand
  readonly hazardIsolated: boolean
  readonly baselineCirculation: ZoneCirculationMode
  readonly baselineActivityPolicy: ZoneActivityPolicy
  readonly contiguousGroupId: string | undefined
}

function optionalEnumOrDefault<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T | undefined {
  if (value === undefined) return fallback
  return isMember(value, allowed) ? value : undefined
}

function optionalTrimmedId(value: unknown): string | undefined | 'invalid' {
  if (value === undefined) return undefined
  return isNonEmptyString(value) ? value.trim() : 'invalid'
}

function defaultHazardIsolated(zoneFunction: OperationalZoneFunction): boolean {
  return zoneFunction === 'hazard_test' || zoneFunction === 'deep_vault'
}

/** Normalize one reusable operational zone packet. Malformed input → undefined. */
export function projectOperationalZonePacket(
  input: unknown
): OperationalZonePacket | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.zoneId)) return undefined
  if (!isMember(input.zoneFunction, OPERATIONAL_ZONE_FUNCTIONS)) return undefined

  const minimumAccessBand = optionalEnumOrDefault(
    input.minimumAccessBand,
    FACILITY_ACCESS_BANDS,
    defaultMinimumAccess(input.zoneFunction)
  )
  const riskBand = optionalEnumOrDefault(
    input.riskBand,
    ZONE_RISK_BANDS,
    defaultRisk(input.zoneFunction)
  )
  const baselineCirculation = optionalEnumOrDefault(
    input.baselineCirculation,
    ZONE_CIRCULATION_MODES,
    defaultCirculation(input.zoneFunction)
  )
  const baselineActivityPolicy = optionalEnumOrDefault(
    input.baselineActivityPolicy,
    ZONE_ACTIVITY_POLICIES,
    defaultActivity(input.zoneFunction)
  )
  if (
    minimumAccessBand === undefined ||
    riskBand === undefined ||
    baselineCirculation === undefined ||
    baselineActivityPolicy === undefined
  ) {
    return undefined
  }

  if (input.hazardIsolated !== undefined && typeof input.hazardIsolated !== 'boolean') {
    return undefined
  }
  const hazardIsolated =
    input.hazardIsolated === undefined
      ? defaultHazardIsolated(input.zoneFunction)
      : input.hazardIsolated

  const contiguousGroupId = optionalTrimmedId(input.contiguousGroupId)
  if (contiguousGroupId === 'invalid') return undefined

  return Object.freeze({
    zoneId: input.zoneId.trim(),
    zoneFunction: input.zoneFunction,
    minimumAccessBand,
    riskBand,
    hazardIsolated,
    baselineCirculation,
    baselineActivityPolicy,
    contiguousGroupId,
  })
}

export interface EffectiveZoneState {
  readonly zoneId: string
  readonly zoneFunction: OperationalZoneFunction
  readonly minimumAccessBand: FacilityAccessBand
  readonly riskBand: ZoneRiskBand
  readonly hazardIsolated: boolean
  readonly alarmState: ZoneAlarmState
  readonly circulationMode: ZoneCirculationMode
  readonly activityPolicy: ZoneActivityPolicy
  readonly contiguousGroupId: string | undefined
  readonly circulationChangedFromBaseline: boolean
  readonly activityRestrictsWithoutImpassability: true
}

export interface FacilityZoningModelInput {
  readonly facilityId: string
  readonly posture: FacilitySecurityPosture
  readonly zones: readonly unknown[]
}

export interface FacilityZoningModel {
  readonly facilityId: string
  readonly posture: FacilitySecurityPosture
  readonly alarmState: ZoneAlarmState
  readonly zones: readonly EffectiveZoneState[]
  readonly distinctFunctions: readonly OperationalZoneFunction[]
  readonly usesDistinctRiskAndAccessRules: boolean
}

/**
 * Project a facility zoning model: distinct operational zones under one
 * reusable posture that can rewrite circulation and activity policy.
 */
export function projectFacilityZoningModel(
  input: unknown
): FacilityZoningModel | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isMember(input.posture, FACILITY_SECURITY_POSTURES)) return undefined
  if (!Array.isArray(input.zones) || input.zones.length === 0) return undefined

  const packets: OperationalZonePacket[] = []
  const seenIds = new Set<string>()
  for (const raw of input.zones) {
    const packet = projectOperationalZonePacket(raw)
    if (!packet) return undefined
    if (seenIds.has(packet.zoneId)) return undefined
    seenIds.add(packet.zoneId)
    packets.push(packet)
  }

  const alarmState = resolveAlarmForPosture(input.posture)
  const zones = packets.map((packet) => {
    const circulationMode = resolveCirculationUnderPosture(
      packet.baselineCirculation,
      input.posture,
      packet.zoneFunction
    )
    const activityPolicy = resolveActivityUnderPosture(
      packet.baselineActivityPolicy,
      input.posture,
      packet.zoneFunction
    )
    return Object.freeze({
      zoneId: packet.zoneId,
      zoneFunction: packet.zoneFunction,
      minimumAccessBand: packet.minimumAccessBand,
      riskBand: packet.riskBand,
      hazardIsolated: packet.hazardIsolated,
      alarmState,
      circulationMode,
      activityPolicy,
      contiguousGroupId: packet.contiguousGroupId,
      circulationChangedFromBaseline: circulationMode !== packet.baselineCirculation,
      activityRestrictsWithoutImpassability: true as const,
    })
  })

  const distinctFunctions = Object.freeze(
    [...new Set(zones.map((zone) => zone.zoneFunction))].sort((left, right) =>
      left.localeCompare(right)
    )
  ) as readonly OperationalZoneFunction[]

  const accessBands = new Set(zones.map((zone) => zone.minimumAccessBand))
  const riskBands = new Set(zones.map((zone) => zone.riskBand))
  const usesDistinctRiskAndAccessRules =
    distinctFunctions.length >= 2 && (accessBands.size >= 2 || riskBands.size >= 2)

  return Object.freeze({
    facilityId: input.facilityId.trim(),
    posture: input.posture,
    alarmState,
    zones: Object.freeze(zones),
    distinctFunctions,
    usesDistinctRiskAndAccessRules,
  })
}

function circulationDenialForMode(
  mode: ZoneCirculationMode,
  actorRank: number
): { readonly reason: ZoneAccessDenialReason; readonly codes: readonly string[] } | undefined {
  if (mode === 'sealed') {
    return { reason: 'circulation_sealed', codes: ['circulation_sealed'] }
  }
  if (mode === 'emergency_only' && actorRank < accessRank('command')) {
    return { reason: 'circulation_emergency_only', codes: ['circulation_emergency_only'] }
  }
  if (mode === 'staff_only' && actorRank < accessRank('enter')) {
    return {
      reason: 'access_band_insufficient',
      codes: ['staff_only_requires_enter'],
    }
  }
  return undefined
}

export interface ZoneAccessEvaluationInput {
  readonly facilityId: string
  readonly actorId: string
  readonly actorAccessBand: FacilityAccessBand
  readonly zone: EffectiveZoneState
  /** When true, evaluate physical circulation; activity policy alone does not seal. */
  readonly evaluateCirculation?: boolean
  /** When true, suspended activity blocks work even if circulation allows passage. */
  readonly evaluateActivity?: boolean
}

export interface ZoneAccessEvaluation {
  readonly facilityId: string
  readonly actorId: string
  readonly zoneId: string
  readonly accessAllowed: boolean
  readonly denialReason: ZoneAccessDenialReason
  readonly reasonCodes: readonly string[]
  readonly alarmState: ZoneAlarmState
  readonly circulationMode: ZoneCirculationMode
  readonly activityPolicy: ZoneActivityPolicy
  readonly hazardIsolated: boolean
}

function parseEffectiveZoneInput(zone: unknown): EffectiveZoneState | undefined {
  if (!isRecord(zone)) return undefined
  if (!isNonEmptyString(zone.zoneId)) return undefined
  if (!isMember(zone.zoneFunction, OPERATIONAL_ZONE_FUNCTIONS)) return undefined
  if (!isMember(zone.minimumAccessBand, FACILITY_ACCESS_BANDS)) return undefined
  if (!isMember(zone.riskBand, ZONE_RISK_BANDS)) return undefined
  if (typeof zone.hazardIsolated !== 'boolean') return undefined
  if (!isMember(zone.alarmState, ZONE_ALARM_STATES)) return undefined
  if (!isMember(zone.circulationMode, ZONE_CIRCULATION_MODES)) return undefined
  if (!isMember(zone.activityPolicy, ZONE_ACTIVITY_POLICIES)) return undefined
  return zone as EffectiveZoneState
}

function accessDenialForActor(
  actorBand: FacilityAccessBand,
  zone: EffectiveZoneState
): { readonly reason: ZoneAccessDenialReason; readonly codes: readonly string[] } | undefined {
  const actorRank = accessRank(actorBand)
  if (zone.hazardIsolated && actorRank < accessRank('operate')) {
    return {
      reason: 'hazard_isolation_blocks_entry',
      codes: ['hazard_isolation_blocks_entry'],
    }
  }
  if (actorRank < accessRank(zone.minimumAccessBand)) {
    return {
      reason: 'access_band_insufficient',
      codes: ['access_band_insufficient', `required:${zone.minimumAccessBand}`],
    }
  }
  return undefined
}

/** Evaluate zone access bands, optional circulation, and optional activity policy. */
export function evaluateZoneAccess(input: unknown): ZoneAccessEvaluation | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.actorId)) return undefined
  if (!isMember(input.actorAccessBand, FACILITY_ACCESS_BANDS)) return undefined
  if (
    input.evaluateCirculation !== undefined &&
    typeof input.evaluateCirculation !== 'boolean'
  ) {
    return undefined
  }
  if (input.evaluateActivity !== undefined && typeof input.evaluateActivity !== 'boolean') {
    return undefined
  }

  const zone = parseEffectiveZoneInput(input.zone)
  if (!zone) return undefined

  const evaluateCirculation = input.evaluateCirculation !== false
  const evaluateActivity = input.evaluateActivity === true
  const reasonCodes: string[] = []
  let denialReason: ZoneAccessDenialReason = 'none'
  let accessAllowed = true

  const accessDenial = accessDenialForActor(input.actorAccessBand, zone)
  if (accessDenial) {
    accessAllowed = false
    denialReason = accessDenial.reason
    reasonCodes.push(...accessDenial.codes)
  }

  if (accessAllowed && evaluateCirculation) {
    const circulationDenial = circulationDenialForMode(
      zone.circulationMode,
      accessRank(input.actorAccessBand)
    )
    if (circulationDenial) {
      accessAllowed = false
      denialReason = circulationDenial.reason
      reasonCodes.push(...circulationDenial.codes)
    }
  }

  if (accessAllowed && evaluateActivity && zone.activityPolicy === 'suspended') {
    accessAllowed = false
    denialReason = 'activity_suspended'
    reasonCodes.push('activity_suspended')
  }

  return Object.freeze({
    facilityId: input.facilityId.trim(),
    actorId: input.actorId.trim(),
    zoneId: zone.zoneId.trim(),
    accessAllowed,
    denialReason,
    reasonCodes: Object.freeze([...reasonCodes]),
    alarmState: zone.alarmState,
    circulationMode: zone.circulationMode,
    activityPolicy: zone.activityPolicy,
    hazardIsolated: zone.hazardIsolated,
  })
}

export interface ZoningDebugSummary {
  readonly facilityId: string
  readonly posture: FacilitySecurityPosture
  readonly alarmState: ZoneAlarmState
  readonly lines: readonly string[]
  readonly circulationChanges: readonly string[]
}

/** Compact debug / player-legible projection of zoning + lockdown state. */
export function projectZoningDebugSummary(
  model: FacilityZoningModel
): ZoningDebugSummary {
  const lines = model.zones.map((zone) => {
    const isolation = zone.hazardIsolated ? 'hazard-isolated' : 'open-floor'
    return `${zone.zoneId} [${zone.zoneFunction}] risk=${zone.riskBand} access≥${zone.minimumAccessBand} circ=${zone.circulationMode} activity=${zone.activityPolicy} (${isolation})`
  })
  const circulationChanges = model.zones
    .filter((zone) => zone.circulationChangedFromBaseline)
    .map(
      (zone) =>
        `${zone.zoneId}: circulation→${zone.circulationMode} under ${model.posture}`
    )

  return Object.freeze({
    facilityId: model.facilityId,
    posture: model.posture,
    alarmState: model.alarmState,
    lines: Object.freeze(lines),
    circulationChanges: Object.freeze(circulationChanges),
  })
}
