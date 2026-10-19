/**
 * SPE-1263 — closed-facility permeability and impossible-access scenes.
 *
 * Pure caller-owned profiles distinguish formal security posture from actual
 * permeability in high-control facilities (wards, detention floors, black sites).
 * Compact packets cover impossible-access reconstruction, breach-path
 * contradictions, custody pressure, emergency-device silence, controlled-tool
 * drift, informal room use, no-staff-entry policy, alert-state progression,
 * temporary secure zones, and sensitive contractors.
 *
 * This module does not persist GameState, run week-close, draw facility UI, or
 * simulate a full prison-operations loop.
 */

/** Representative high-control facility used by acceptance fixtures. */
export const CLOSED_FACILITY_BLACK_SITE_WARD_ID = 'facility:black-site-ward' as const

export const CLOSED_FACILITY_FORMAL_SECURITY_LEVELS = [
  'low',
  'moderate',
  'high',
  'maximum',
] as const
export type ClosedFacilityFormalSecurityLevel =
  (typeof CLOSED_FACILITY_FORMAL_SECURITY_LEVELS)[number]

export const CLOSED_FACILITY_PERMEABILITY_BANDS = [
  'sealed',
  'supervised',
  'leaky',
  'porous',
] as const
export type ClosedFacilityPermeabilityBand =
  (typeof CLOSED_FACILITY_PERMEABILITY_BANDS)[number]

export const CLOSED_FACILITY_LEAK_CHANNELS = [
  'contraband_flow',
  'hidden_route',
  'blind_spot',
  'undocumented_access',
  'staff_corruption',
  'tool_drift',
  'body_movement',
  'rumor_leakage',
] as const
export type ClosedFacilityLeakChannel = (typeof CLOSED_FACILITY_LEAK_CHANNELS)[number]

export const IMPOSSIBLE_ACCESS_EXPLANATIONS = [
  'explained_by_known_controls',
  'unexplained_by_known_controls',
  'explained_by_hidden_permeability',
  'explained_by_staff_complicity',
] as const
export type ImpossibleAccessExplanation = (typeof IMPOSSIBLE_ACCESS_EXPLANATIONS)[number]

export const HOLDING_CELL_CATEGORIES = [
  'detention',
  'isolation',
  'intake',
  'transit',
] as const
export type HoldingCellCategory = (typeof HOLDING_CELL_CATEGORIES)[number]

export const CUSTODY_PRESSURE_KINDS = [
  'riot',
  'hidden_signal',
  'escort_breakdown',
  'false_calm',
  'lock_failure',
] as const
export type CustodyPressureKind = (typeof CUSTODY_PRESSURE_KINDS)[number]

export const EMERGENCY_DEVICE_SILENCE_INFERENCES = [
  'surprise',
  'coercion',
  'incapacitation',
  'trusted_access',
  'system_malfunction',
] as const
export type EmergencyDeviceSilenceInference =
  (typeof EMERGENCY_DEVICE_SILENCE_INFERENCES)[number]

export const CONTROLLED_TOOL_CHANNELS = [
  'work_detail',
  'maintenance_cart',
  'kitchen',
  'med_bay',
] as const
export type ControlledToolChannel = (typeof CONTROLLED_TOOL_CHANNELS)[number]

export const INFORMAL_ROOM_FUNCTIONS = [
  'coercion',
  'assault',
  'disposal',
  'concealment',
  'blind_spot',
] as const
export type InformalRoomFunction = (typeof INFORMAL_ROOM_FUNCTIONS)[number]

export const STAFF_ENTRY_POLICIES = [
  'normal_entry',
  'no_staff_entry',
  'hazardous_interior',
] as const
export type StaffEntryPolicy = (typeof STAFF_ENTRY_POLICIES)[number]

export const STAFF_ENTRY_STUDY_MODES = [
  'default_entry',
  'remote_study',
  'expendable_probe',
  'indirect_interface',
] as const
export type StaffEntryStudyMode = (typeof STAFF_ENTRY_STUDY_MODES)[number]

export const SEALED_FACILITY_ALERT_STATES = [
  'inactive',
  'suspicious',
  'investigating',
  'ambush_ready',
] as const
export type SealedFacilityAlertState = (typeof SEALED_FACILITY_ALERT_STATES)[number]

export const SEALED_FACILITY_ALERT_TRIGGERS = [
  'noise',
  'route_breach',
  'environmental_disruption',
] as const
export type SealedFacilityAlertTrigger = (typeof SEALED_FACILITY_ALERT_TRIGGERS)[number]

export const TEMPORARY_SECURE_ZONE_KINDS = [
  'vehicle',
  'field_shelter',
  'repurposed_room',
  'emergency_installation',
] as const
export type TemporarySecureZoneKind = (typeof TEMPORARY_SECURE_ZONE_KINDS)[number]

export const SENSITIVE_CONTRACTOR_PAYMENT_MODES = [
  'documented_payroll',
  'cash_paid',
  'no_record',
] as const
export type SensitiveContractorPaymentMode =
  (typeof SENSITIVE_CONTRACTOR_PAYMENT_MODES)[number]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.some((item) => item === value)
}

function freezeStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...values])
}

function formalSecurityRank(level: ClosedFacilityFormalSecurityLevel): number {
  return CLOSED_FACILITY_FORMAL_SECURITY_LEVELS.indexOf(level)
}

function permeabilityRank(band: ClosedFacilityPermeabilityBand): number {
  return CLOSED_FACILITY_PERMEABILITY_BANDS.indexOf(band)
}

/**
 * Invert permeability onto the same orientation as formal security
 * (sealed ≈ maximum, porous ≈ low) before comparing ranks.
 */
function actualSecurityRankFromPermeability(
  band: ClosedFacilityPermeabilityBand
): number {
  return CLOSED_FACILITY_PERMEABILITY_BANDS.length - 1 - permeabilityRank(band)
}

/**
 * Meaningful gap: formal posture is high/maximum while actual band is leaky/porous,
 * or formal security exceeds security implied by actual permeability by at least two
 * authored ranks with at least one leak.
 */
export function isMeaningfulFormalActualPermeabilityGap(
  formalSecurity: ClosedFacilityFormalSecurityLevel,
  actualPermeability: ClosedFacilityPermeabilityBand,
  leakChannels: readonly ClosedFacilityLeakChannel[]
): boolean {
  if (leakChannels.length === 0) return false
  const highFormal = formalSecurity === 'high' || formalSecurity === 'maximum'
  const leakyActual = actualPermeability === 'leaky' || actualPermeability === 'porous'
  if (highFormal && leakyActual) return true
  return (
    formalSecurityRank(formalSecurity) - actualSecurityRankFromPermeability(actualPermeability) >=
    2
  )
}

export interface ClosedFacilityPermeabilityProfileInput {
  readonly facilityId: string
  readonly formalSecurity: ClosedFacilityFormalSecurityLevel
  readonly actualPermeability: ClosedFacilityPermeabilityBand
  readonly leakChannels: readonly ClosedFacilityLeakChannel[]
}

export interface ClosedFacilityPermeabilityProfile {
  readonly facilityId: string
  readonly formalSecurity: ClosedFacilityFormalSecurityLevel
  readonly actualPermeability: ClosedFacilityPermeabilityBand
  readonly leakChannels: readonly ClosedFacilityLeakChannel[]
  readonly gapMeaningful: boolean
}

/** Project formal vs actual permeability for a high-control facility packet. */
export function projectClosedFacilityPermeabilityProfile(
  input: unknown
): ClosedFacilityPermeabilityProfile | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isMember(input.formalSecurity, CLOSED_FACILITY_FORMAL_SECURITY_LEVELS)) return undefined
  if (!isMember(input.actualPermeability, CLOSED_FACILITY_PERMEABILITY_BANDS)) return undefined
  if (!Array.isArray(input.leakChannels)) return undefined
  const leakChannels: ClosedFacilityLeakChannel[] = []
  for (const channel of input.leakChannels) {
    if (!isMember(channel, CLOSED_FACILITY_LEAK_CHANNELS)) return undefined
    if (!leakChannels.includes(channel)) leakChannels.push(channel)
  }
  return Object.freeze({
    facilityId: input.facilityId,
    formalSecurity: input.formalSecurity,
    actualPermeability: input.actualPermeability,
    leakChannels: freezeStrings(leakChannels) as readonly ClosedFacilityLeakChannel[],
    gapMeaningful: isMeaningfulFormalActualPermeabilityGap(
      input.formalSecurity,
      input.actualPermeability,
      leakChannels
    ),
  })
}

/** Authored acceptance fixture: maximum formal security, porous actual posture. */
export function authoredBlackSiteWardPermeabilityProfile(): ClosedFacilityPermeabilityProfile {
  return projectClosedFacilityPermeabilityProfile({
    facilityId: CLOSED_FACILITY_BLACK_SITE_WARD_ID,
    formalSecurity: 'maximum',
    actualPermeability: 'porous',
    leakChannels: ['hidden_route', 'tool_drift', 'staff_corruption', 'blind_spot'],
  })!
}

export interface ImpossibleAccessSceneInput {
  readonly sceneId: string
  readonly knownLockIds: readonly string[]
  readonly watchCoverageIds: readonly string[]
  readonly knownRouteIds: readonly string[]
  readonly observedAccessRouteId: string
  readonly hiddenPermeabilityChannel?: ClosedFacilityLeakChannel
  readonly staffComplicityRef?: string
}

export interface ImpossibleAccessSceneResult {
  readonly sceneId: string
  readonly explanation: ImpossibleAccessExplanation
  readonly observedAccessRouteId: string
  readonly knownControlsExplainAccess: boolean
  readonly hiddenPermeabilityChannel?: ClosedFacilityLeakChannel
  readonly staffComplicityRef?: string
}

/**
 * Reconstruct whether known locks/watch/routes explain observed access.
 * Hidden permeability or staff complicity can resolve an otherwise impossible scene.
 * Compact packet: known controls explain access only when the observed route is listed
 * and both lock and watch inventories are authored (non-empty).
 */
export function reconstructImpossibleAccessScene(
  input: unknown
): ImpossibleAccessSceneResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.sceneId)) return undefined
  if (!isNonEmptyString(input.observedAccessRouteId)) return undefined
  if (!Array.isArray(input.knownLockIds) || !input.knownLockIds.every(isNonEmptyString)) {
    return undefined
  }
  if (
    !Array.isArray(input.watchCoverageIds) ||
    !input.watchCoverageIds.every(isNonEmptyString)
  ) {
    return undefined
  }
  if (!Array.isArray(input.knownRouteIds) || !input.knownRouteIds.every(isNonEmptyString)) {
    return undefined
  }
  if (
    input.hiddenPermeabilityChannel !== undefined &&
    !isMember(input.hiddenPermeabilityChannel, CLOSED_FACILITY_LEAK_CHANNELS)
  ) {
    return undefined
  }
  if (input.staffComplicityRef !== undefined && !isNonEmptyString(input.staffComplicityRef)) {
    return undefined
  }

  const knownControlsExplainAccess =
    input.knownRouteIds.includes(input.observedAccessRouteId) &&
    input.knownLockIds.length > 0 &&
    input.watchCoverageIds.length > 0

  const evidence = Object.freeze({
    ...(input.hiddenPermeabilityChannel !== undefined
      ? { hiddenPermeabilityChannel: input.hiddenPermeabilityChannel }
      : {}),
    ...(isNonEmptyString(input.staffComplicityRef)
      ? { staffComplicityRef: input.staffComplicityRef }
      : {}),
  })

  if (knownControlsExplainAccess) {
    return Object.freeze({
      sceneId: input.sceneId,
      explanation: 'explained_by_known_controls' as const,
      observedAccessRouteId: input.observedAccessRouteId,
      knownControlsExplainAccess: true,
      ...evidence,
    })
  }

  let explanation: ImpossibleAccessExplanation
  if (isNonEmptyString(input.staffComplicityRef)) {
    explanation = 'explained_by_staff_complicity'
  } else if (input.hiddenPermeabilityChannel !== undefined) {
    explanation = 'explained_by_hidden_permeability'
  } else {
    explanation = 'unexplained_by_known_controls'
  }

  return Object.freeze({
    sceneId: input.sceneId,
    explanation,
    observedAccessRouteId: input.observedAccessRouteId,
    knownControlsExplainAccess: false,
    ...evidence,
  })
}

export interface BreachPathContradictionInput {
  readonly pathId: string
  readonly asDesignedRouteIds: readonly string[]
  readonly asFoundRouteIds: readonly string[]
  readonly impossibleAccessObservedRouteId: string
}

export interface BreachPathContradictionResult {
  readonly pathId: string
  readonly hasMapContradiction: boolean
  readonly reconstructionChanged: boolean
  readonly asFoundExplainsAccess: boolean
  readonly asDesignedExplainsAccess: boolean
  readonly undocumentedShortcutIds: readonly string[]
}

/** As-designed vs as-found route contradiction that can change impossible-access reconstruction. */
export function resolveBreachPathContradiction(
  input: unknown
): BreachPathContradictionResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.pathId)) return undefined
  if (!isNonEmptyString(input.impossibleAccessObservedRouteId)) return undefined
  if (
    !Array.isArray(input.asDesignedRouteIds) ||
    !input.asDesignedRouteIds.every(isNonEmptyString)
  ) {
    return undefined
  }
  if (!Array.isArray(input.asFoundRouteIds) || !input.asFoundRouteIds.every(isNonEmptyString)) {
    return undefined
  }

  const asDesignedExplainsAccess = input.asDesignedRouteIds.includes(
    input.impossibleAccessObservedRouteId
  )
  const asFoundExplainsAccess = input.asFoundRouteIds.includes(
    input.impossibleAccessObservedRouteId
  )
  const undocumentedShortcutIds = input.asFoundRouteIds.filter(
    (routeId) => !input.asDesignedRouteIds.includes(routeId)
  )
  const removedDesignedRouteIds = input.asDesignedRouteIds.filter(
    (routeId) => !input.asFoundRouteIds.includes(routeId)
  )
  const hasMapContradiction =
    undocumentedShortcutIds.length > 0 || removedDesignedRouteIds.length > 0
  const reconstructionChanged = asFoundExplainsAccess !== asDesignedExplainsAccess

  return Object.freeze({
    pathId: input.pathId,
    hasMapContradiction,
    reconstructionChanged,
    asFoundExplainsAccess,
    asDesignedExplainsAccess,
    undocumentedShortcutIds: freezeStrings(undocumentedShortcutIds),
  })
}

export interface CustodyIncidentInput {
  readonly incidentId: string
  readonly cellCategory: HoldingCellCategory
  readonly pressureKind: CustodyPressureKind
}

export interface CustodyIncidentResult {
  readonly incidentId: string
  readonly cellCategory: HoldingCellCategory
  readonly pressureKind: CustodyPressureKind
  readonly distinctFromOrdinaryLockFailure: boolean
  readonly masksActiveBreachPressure: boolean
}

/** Holding-cell custody pressure distinct from ordinary lock failure (except lock_failure itself). */
export function projectCustodyIncidentPressure(
  input: unknown
): CustodyIncidentResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.incidentId)) return undefined
  if (!isMember(input.cellCategory, HOLDING_CELL_CATEGORIES)) return undefined
  if (!isMember(input.pressureKind, CUSTODY_PRESSURE_KINDS)) return undefined

  const distinctFromOrdinaryLockFailure = input.pressureKind !== 'lock_failure'
  const masksActiveBreachPressure = input.pressureKind === 'false_calm'

  return Object.freeze({
    incidentId: input.incidentId,
    cellCategory: input.cellCategory,
    pressureKind: input.pressureKind,
    distinctFromOrdinaryLockFailure,
    masksActiveBreachPressure,
  })
}

export interface EmergencyDeviceSilenceInput {
  readonly deviceId: string
  readonly triggered: boolean
  readonly inferenceHint?: EmergencyDeviceSilenceInference
}

export interface EmergencyDeviceSilenceResult {
  readonly deviceId: string
  readonly triggered: boolean
  readonly inference: EmergencyDeviceSilenceInference | 'triggered_null'
  readonly materiallyChangesInterpretation: boolean
}

/**
 * Untriggered emergency devices are evidence, not a null fact.
 * Callers supply an authored inference hint; omit/malformed fail closed.
 */
export function inferEmergencyDeviceSilence(
  input: unknown
): EmergencyDeviceSilenceResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.deviceId)) return undefined
  if (typeof input.triggered !== 'boolean') return undefined
  if (input.triggered) {
    return Object.freeze({
      deviceId: input.deviceId,
      triggered: true,
      inference: 'triggered_null',
      materiallyChangesInterpretation: false,
    })
  }
  if (!isMember(input.inferenceHint, EMERGENCY_DEVICE_SILENCE_INFERENCES)) return undefined
  return Object.freeze({
    deviceId: input.deviceId,
    triggered: false,
    inference: input.inferenceHint,
    materiallyChangesInterpretation: true,
  })
}

export interface ControlledToolAccountabilityInput {
  readonly toolId: string
  readonly channel: ControlledToolChannel
  readonly expectedPresent: boolean
  readonly observedPresent: boolean
  readonly improvised: boolean
}

export interface ControlledToolAccountabilityResult {
  readonly toolId: string
  readonly channel: ControlledToolChannel
  readonly accountabilityDrift: boolean
  readonly evidenceSurface: boolean
  readonly riskSurface: boolean
}

/** Missing, unexpected, or improvised controlled tools become both evidence and risk. */
export function projectControlledToolAccountability(
  input: unknown
): ControlledToolAccountabilityResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.toolId)) return undefined
  if (!isMember(input.channel, CONTROLLED_TOOL_CHANNELS)) return undefined
  if (typeof input.expectedPresent !== 'boolean') return undefined
  if (typeof input.observedPresent !== 'boolean') return undefined
  if (typeof input.improvised !== 'boolean') return undefined

  const inventoryMismatch = input.expectedPresent !== input.observedPresent
  const accountabilityDrift = inventoryMismatch || input.improvised
  return Object.freeze({
    toolId: input.toolId,
    channel: input.channel,
    accountabilityDrift,
    evidenceSurface: accountabilityDrift,
    riskSurface: accountabilityDrift,
  })
}

export interface InformalRoomUseInput {
  readonly roomId: string
  readonly officialLabel: string
  readonly discoveredFunction: InformalRoomFunction
}

export interface InformalRoomUseResult {
  readonly roomId: string
  readonly officialLabel: string
  readonly discoveredFunction: InformalRoomFunction
  readonly informalFunctionDiscovered: boolean
}

/** Officially labeled rooms can acquire informal coercion/assault/concealment functions. */
export function discoverInformalRoomUse(input: unknown): InformalRoomUseResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.roomId)) return undefined
  if (!isNonEmptyString(input.officialLabel)) return undefined
  if (!isMember(input.discoveredFunction, INFORMAL_ROOM_FUNCTIONS)) return undefined
  return Object.freeze({
    roomId: input.roomId,
    officialLabel: input.officialLabel,
    discoveredFunction: input.discoveredFunction,
    informalFunctionDiscovered: true,
  })
}

const RESTRICTED_STAFF_ENTRY_STUDY_MODES = [
  'remote_study',
  'expendable_probe',
  'indirect_interface',
] as const

export interface StaffEntryPolicyInput {
  readonly siteId: string
  readonly policy: StaffEntryPolicy
  /** Optional restricted study mode; only valid when policy forces indirect study. */
  readonly studyMode?: StaffEntryStudyMode
}

export interface StaffEntryPolicyResult {
  readonly siteId: string
  readonly policy: StaffEntryPolicy
  readonly studyMode: StaffEntryStudyMode
  readonly forcesIndirectStudy: boolean
}

/** No-staff-entry / hazardous-interior sites force remote, expendable, or indirect study. */
export function classifyStaffEntryPolicy(input: unknown): StaffEntryPolicyResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.siteId)) return undefined
  if (!isMember(input.policy, STAFF_ENTRY_POLICIES)) return undefined
  if (input.studyMode !== undefined && !isMember(input.studyMode, STAFF_ENTRY_STUDY_MODES)) {
    return undefined
  }

  if (input.policy === 'normal_entry') {
    if (input.studyMode !== undefined && input.studyMode !== 'default_entry') return undefined
    return Object.freeze({
      siteId: input.siteId,
      policy: input.policy,
      studyMode: 'default_entry' as const,
      forcesIndirectStudy: false,
    })
  }

  if (
    input.studyMode !== undefined &&
    !isMember(input.studyMode, RESTRICTED_STAFF_ENTRY_STUDY_MODES)
  ) {
    return undefined
  }

  const studyMode: StaffEntryStudyMode =
    input.studyMode ??
    (input.policy === 'no_staff_entry' ? 'remote_study' : 'expendable_probe')

  return Object.freeze({
    siteId: input.siteId,
    policy: input.policy,
    studyMode,
    forcesIndirectStudy: true,
  })
}

export interface SealedFacilityAlertAdvanceInput {
  readonly groupId: string
  readonly currentState: SealedFacilityAlertState
  readonly trigger?: SealedFacilityAlertTrigger
}

export interface SealedFacilityAlertAdvanceResult {
  readonly groupId: string
  readonly previousState: SealedFacilityAlertState
  readonly nextState: SealedFacilityAlertState
  readonly readinessIncreased: boolean
}

const ALERT_STATE_INDEX: Readonly<Record<SealedFacilityAlertState, number>> = Object.freeze({
  inactive: 0,
  suspicious: 1,
  investigating: 2,
  ambush_ready: 3,
})

/** Advance dormant/sleeping hostile groups through alert states on authored triggers. */
export function advanceSealedFacilityAlertState(
  input: unknown
): SealedFacilityAlertAdvanceResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.groupId)) return undefined
  if (!isMember(input.currentState, SEALED_FACILITY_ALERT_STATES)) return undefined
  if (input.trigger !== undefined && !isMember(input.trigger, SEALED_FACILITY_ALERT_TRIGGERS)) {
    return undefined
  }

  const currentIndex = ALERT_STATE_INDEX[input.currentState]
  let nextState = input.currentState
  if (input.trigger !== undefined && currentIndex < SEALED_FACILITY_ALERT_STATES.length - 1) {
    nextState = SEALED_FACILITY_ALERT_STATES[currentIndex + 1]!
  }

  return Object.freeze({
    groupId: input.groupId,
    previousState: input.currentState,
    nextState,
    readinessIncreased: ALERT_STATE_INDEX[nextState] > currentIndex,
  })
}

export interface TemporarySecureZoneInput {
  readonly zoneId: string
  readonly kind: TemporarySecureZoneKind
  readonly formalSecurity: ClosedFacilityFormalSecurityLevel
  readonly actualPermeability: ClosedFacilityPermeabilityBand
}

export interface TemporarySecureZoneResult {
  readonly zoneId: string
  readonly kind: TemporarySecureZoneKind
  readonly formalSecurity: ClosedFacilityFormalSecurityLevel
  readonly actualPermeability: ClosedFacilityPermeabilityBand
  readonly outsidePermanentTopology: boolean
  readonly reducedPermeabilityPreserved: boolean
}

/** Temporary/deployable secure zones preserve reduced permeability outside permanent topology. */
export function projectTemporarySecureZone(
  input: unknown
): TemporarySecureZoneResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.zoneId)) return undefined
  if (!isMember(input.kind, TEMPORARY_SECURE_ZONE_KINDS)) return undefined
  if (!isMember(input.formalSecurity, CLOSED_FACILITY_FORMAL_SECURITY_LEVELS)) return undefined
  if (!isMember(input.actualPermeability, CLOSED_FACILITY_PERMEABILITY_BANDS)) return undefined

  const reducedPermeabilityPreserved =
    input.actualPermeability === 'sealed' || input.actualPermeability === 'supervised'

  return Object.freeze({
    zoneId: input.zoneId,
    kind: input.kind,
    formalSecurity: input.formalSecurity,
    actualPermeability: input.actualPermeability,
    outsidePermanentTopology: true,
    reducedPermeabilityPreserved,
  })
}

export interface SensitiveContractorInput {
  readonly contractorId: string
  readonly paymentMode: SensitiveContractorPaymentMode
  readonly functionProtectedBySecrecy: boolean
}

export interface SensitiveContractorResult {
  readonly contractorId: string
  readonly paymentMode: SensitiveContractorPaymentMode
  readonly secrecyProtection: boolean
  readonly auditProtectionFailure: boolean
}

/** Cash-paid / no-record contractors protect secrecy while weakening audit and protection. */
export function projectSensitiveContractorExposure(
  input: unknown
): SensitiveContractorResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.contractorId)) return undefined
  if (!isMember(input.paymentMode, SENSITIVE_CONTRACTOR_PAYMENT_MODES)) return undefined
  if (typeof input.functionProtectedBySecrecy !== 'boolean') return undefined

  const undocumented =
    input.paymentMode === 'cash_paid' || input.paymentMode === 'no_record'

  return Object.freeze({
    contractorId: input.contractorId,
    paymentMode: input.paymentMode,
    secrecyProtection: undocumented && input.functionProtectedBySecrecy,
    auditProtectionFailure: undocumented,
  })
}
