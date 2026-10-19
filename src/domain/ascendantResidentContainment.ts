/**
 * SPE-791 — ascendant-resident containment facility.
 *
 * Pure caller-owned packets house high-potential residents under supervised
 * care without collapsing containment, care, cooperation, and movement into one
 * flag. Residents follow distinct manifestation/escalation paths; ally, threat,
 * and manipulated-asset postures depend on state; breach links an external
 * incident; low physical-risk beneficial residents can still create strategic
 * demand/secrecy pressure.
 *
 * This module does not persist GameState, run week-close, or simulate full
 * psychiatry or detention systems.
 */

export const ASCENDANT_FACILITY_ID = 'facility:ascendant-residence' as const

export const RESIDENT_MANIFESTATION_PATHS = [
  'latent',
  'partial',
  'emergent',
  'stabilized',
] as const
export type ResidentManifestationPath = (typeof RESIDENT_MANIFESTATION_PATHS)[number]

export const RESIDENT_ESCALATION_PATHS = [
  'slow_build',
  'volatile_spike',
  'strategic_pressure',
  'contained_plateau',
] as const
export type ResidentEscalationPath = (typeof RESIDENT_ESCALATION_PATHS)[number]

export const RESIDENT_POSTURES = ['ally', 'threat', 'manipulated_asset', 'neutral'] as const
export type ResidentPosture = (typeof RESIDENT_POSTURES)[number]

export const CONTAINMENT_STATUSES = [
  'secured',
  'conditional',
  'breached',
  'escaped',
] as const
export type ContainmentStatus = (typeof CONTAINMENT_STATUSES)[number]

export const CARE_STATUSES = [
  'routine',
  'elevated_welfare',
  'restricted_care',
  'crisis',
] as const
export type CareStatus = (typeof CARE_STATUSES)[number]

export const COOPERATION_BANDS = ['resistant', 'guarded', 'cooperative'] as const
export type CooperationBand = (typeof COOPERATION_BANDS)[number]

export const MOVEMENT_PERMISSIONS = [
  'cell_only',
  'escorted_shared',
  'escorted_public',
  'denied',
] as const
export type MovementPermission = (typeof MOVEMENT_PERMISSIONS)[number]

export const STRATEGIC_PRESSURE_KINDS = [
  'none',
  'theft_demand',
  'secrecy_burden',
  'misuse_temptation',
] as const
export type StrategicPressureKind = (typeof STRATEGIC_PRESSURE_KINDS)[number]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

export interface AscendantResidentProfileInput {
  readonly facilityId: string
  readonly residentId: string
  readonly manifestationPath: ResidentManifestationPath
  readonly escalationPath: ResidentEscalationPath
  readonly containmentStatus: ContainmentStatus
  readonly careStatus: CareStatus
  readonly cooperation: CooperationBand
  readonly movementPermission: MovementPermission
  readonly physicalRiskLow: boolean
  readonly beneficialAnomaly: boolean
  readonly externalPressureActive: boolean
}

export interface AscendantResidentProfileResult {
  readonly facilityId: string
  readonly residentId: string
  readonly manifestationPath: ResidentManifestationPath
  readonly escalationPath: ResidentEscalationPath
  readonly containmentStatus: ContainmentStatus
  readonly careStatus: CareStatus
  readonly cooperation: CooperationBand
  readonly movementPermission: MovementPermission
  readonly posture: ResidentPosture
  readonly statesSeparated: true
  readonly strategicPressure: StrategicPressureKind
}

function derivePosture(
  input: AscendantResidentProfileInput
): ResidentPosture {
  if (input.containmentStatus === 'breached' || input.containmentStatus === 'escaped') {
    return input.externalPressureActive ? 'manipulated_asset' : 'threat'
  }
  if (input.cooperation === 'cooperative' && input.careStatus !== 'crisis') {
    return 'ally'
  }
  if (input.cooperation === 'resistant' || input.escalationPath === 'volatile_spike') {
    return 'threat'
  }
  if (input.externalPressureActive && input.cooperation === 'guarded') {
    return 'manipulated_asset'
  }
  return 'neutral'
}

function deriveStrategicPressure(
  input: AscendantResidentProfileInput
): StrategicPressureKind {
  if (!input.beneficialAnomaly || !input.physicalRiskLow) return 'none'
  if (input.escalationPath === 'strategic_pressure') return 'theft_demand'
  if (input.cooperation === 'guarded') return 'secrecy_burden'
  return 'misuse_temptation'
}

/** Load one resident with separated operational states and derived posture. */
export function projectAscendantResidentProfile(
  input: unknown
): AscendantResidentProfileResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.residentId)) return undefined
  if (!isMember(input.manifestationPath, RESIDENT_MANIFESTATION_PATHS)) return undefined
  if (!isMember(input.escalationPath, RESIDENT_ESCALATION_PATHS)) return undefined
  if (!isMember(input.containmentStatus, CONTAINMENT_STATUSES)) return undefined
  if (!isMember(input.careStatus, CARE_STATUSES)) return undefined
  if (!isMember(input.cooperation, COOPERATION_BANDS)) return undefined
  if (!isMember(input.movementPermission, MOVEMENT_PERMISSIONS)) return undefined
  if (typeof input.physicalRiskLow !== 'boolean') return undefined
  if (typeof input.beneficialAnomaly !== 'boolean') return undefined
  if (typeof input.externalPressureActive !== 'boolean') return undefined

  const typed = input as AscendantResidentProfileInput
  return Object.freeze({
    facilityId: typed.facilityId,
    residentId: typed.residentId,
    manifestationPath: typed.manifestationPath,
    escalationPath: typed.escalationPath,
    containmentStatus: typed.containmentStatus,
    careStatus: typed.careStatus,
    cooperation: typed.cooperation,
    movementPermission: typed.movementPermission,
    posture: derivePosture(typed),
    statesSeparated: true as const,
    strategicPressure: deriveStrategicPressure(typed),
  })
}

export interface SupervisedAccessInput {
  readonly facilityId: string
  readonly residentId: string
  readonly containmentStatus: ContainmentStatus
  readonly movementPermission: MovementPermission
  readonly requestedZone: 'cell' | 'shared' | 'recreation' | 'public'
  readonly escortPresent: boolean
}

export interface SupervisedAccessResult {
  readonly facilityId: string
  readonly residentId: string
  readonly accessGranted: boolean
  readonly denialReason:
    | 'none'
    | 'containment_blocks_movement'
    | 'movement_denied'
    | 'escort_required'
    | 'zone_not_permitted'
}

/** Zone-specific supervised movement under escort and containment constraints. */
export function evaluateSupervisedResidentAccess(
  input: unknown
): SupervisedAccessResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.residentId)) return undefined
  if (!isMember(input.containmentStatus, CONTAINMENT_STATUSES)) return undefined
  if (!isMember(input.movementPermission, MOVEMENT_PERMISSIONS)) return undefined
  if (!isMember(input.requestedZone, ['cell', 'shared', 'recreation', 'public'] as const)) {
    return undefined
  }
  if (typeof input.escortPresent !== 'boolean') return undefined

  const deny = (
    denialReason: SupervisedAccessResult['denialReason']
  ): SupervisedAccessResult =>
    Object.freeze({
      facilityId: input.facilityId as string,
      residentId: input.residentId as string,
      accessGranted: false,
      denialReason,
    })

  if (
    input.containmentStatus === 'breached' ||
    input.containmentStatus === 'escaped'
  ) {
    return deny('containment_blocks_movement')
  }
  if (input.movementPermission === 'denied') {
    return deny('movement_denied')
  }
  if (input.requestedZone === 'cell') {
    return Object.freeze({
      facilityId: input.facilityId,
      residentId: input.residentId,
      accessGranted: true,
      denialReason: 'none' as const,
    })
  }
  if (input.movementPermission === 'cell_only') {
    return deny('zone_not_permitted')
  }
  if (!input.escortPresent) {
    return deny('escort_required')
  }
  if (
    input.requestedZone === 'public' &&
    input.movementPermission !== 'escorted_public'
  ) {
    return deny('zone_not_permitted')
  }

  return Object.freeze({
    facilityId: input.facilityId,
    residentId: input.residentId,
    accessGranted: true,
    denialReason: 'none' as const,
  })
}

export interface ResidentBreachInput {
  readonly facilityId: string
  readonly residentId: string
  readonly containmentStatus: ContainmentStatus
  readonly externalCaseId: string
  readonly manipulated: boolean
}

export interface ResidentBreachResult {
  readonly facilityId: string
  readonly residentId: string
  readonly breachActive: boolean
  readonly externalIncidentLinked: boolean
  readonly externalCaseId: string
  readonly localOnlyEscape: false
  readonly posture: 'threat' | 'manipulated_asset'
}

/** Breach/escape links an external case rather than remaining local-only. */
export function projectResidentBreachEscalation(
  input: unknown
): ResidentBreachResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.residentId)) return undefined
  if (!isMember(input.containmentStatus, CONTAINMENT_STATUSES)) return undefined
  if (!isNonEmptyString(input.externalCaseId)) return undefined
  if (typeof input.manipulated !== 'boolean') return undefined

  if (
    input.containmentStatus !== 'breached' &&
    input.containmentStatus !== 'escaped'
  ) {
    return undefined
  }

  return Object.freeze({
    facilityId: input.facilityId,
    residentId: input.residentId,
    breachActive: true,
    externalIncidentLinked: true,
    externalCaseId: input.externalCaseId,
    localOnlyEscape: false as const,
    posture: input.manipulated ? ('manipulated_asset' as const) : ('threat' as const),
  })
}

export interface FacilityResidentRosterInput {
  readonly facilityId: string
  readonly residents: readonly AscendantResidentProfileInput[]
}

export interface FacilityResidentRosterResult {
  readonly facilityId: string
  readonly residentCount: number
  readonly distinctManifestationPaths: number
  readonly distinctEscalationPaths: number
  readonly hostsMultipleDivergentResidents: boolean
}

/** Confirm a facility can host multiple residents with divergent paths. */
export function projectFacilityResidentRoster(
  input: unknown
): FacilityResidentRosterResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!Array.isArray(input.residents) || input.residents.length === 0) return undefined

  const projected = []
  for (const resident of input.residents) {
    const profile = projectAscendantResidentProfile({
      ...(isRecord(resident) ? resident : {}),
      facilityId: input.facilityId,
    })
    if (!profile) return undefined
    projected.push(profile)
  }

  const manifestations = new Set(projected.map((r) => r.manifestationPath))
  const escalations = new Set(projected.map((r) => r.escalationPath))
  return Object.freeze({
    facilityId: input.facilityId,
    residentCount: projected.length,
    distinctManifestationPaths: manifestations.size,
    distinctEscalationPaths: escalations.size,
    hostsMultipleDivergentResidents:
      projected.length >= 2 &&
      (manifestations.size >= 2 || escalations.size >= 2),
  })
}
