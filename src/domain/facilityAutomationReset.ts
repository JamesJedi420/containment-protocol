/**
 * SPE-1021 — facility automation and countermeasure reset layer.
 *
 * Pure caller-owned packets model trigger-linked containment devices that take
 * explicit state commands, carry reset/maintenance burdens, degrade quietly,
 * discriminate traffic imperfectly, and refuse some anomaly classes until a
 * prerequisite condition is met. Manual control is slower but more selective;
 * automatic response is faster but more error-prone under ambiguous traffic.
 *
 * This module does not persist GameState, run week-close, simulate a full BMS,
 * or assume a universal perfect containment cell.
 */

export const AUTOMATION_FACILITY_ID = 'facility:automation-wing' as const

export const DEVICE_STATE_COMMANDS = [
  'open',
  'close',
  'seal',
  'isolate',
  'purge',
  'drain',
  'reset',
  'vent',
] as const
export type DeviceStateCommand = (typeof DEVICE_STATE_COMMANDS)[number]

export const CONTROL_MODES = ['manual', 'automatic'] as const
export type ControlMode = (typeof CONTROL_MODES)[number]

export const RESET_PROFILES = [
  'single_use',
  'reusable',
  'jam_prone',
  'consumable_fed',
  'staff_reset',
  'auto_reset',
] as const
export type ResetProfile = (typeof RESET_PROFILES)[number]

export const DEGRADATION_FAULTS = [
  'residue_buildup',
  'warped_hinge',
  'dead_battery',
  'cracked_sigil',
  'corrupted_targeting',
] as const
export type DegradationFault = (typeof DEGRADATION_FAULTS)[number]

export const PREREQUISITE_DEBUFFS = [
  'reveal',
  'binding',
  'exhaustion',
  'naming',
  'anchoring',
] as const
export type PrerequisiteDebuff = (typeof PREREQUISITE_DEBUFFS)[number]

export const TRAFFIC_KINDS = [
  'staff',
  'familiar',
  'illusion',
  'disguised_entity',
  'supply_cart',
  'ambulance',
  'contractor',
] as const
export type TrafficKind = (typeof TRAFFIC_KINDS)[number]

export const LURE_KINDS = [
  'synthetic_blood',
  'psychic_beacon',
  'false_host',
  'staged_signature',
  'relic_bait',
] as const
export type LureKind = (typeof LURE_KINDS)[number]

function asPacket(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function requireTrimmedId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined
}

function requireBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function parseCommandChain(
  value: unknown
): readonly DeviceStateCommand[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined
  const commands: DeviceStateCommand[] = []
  for (const item of value) {
    const command = requireEnum(item, DEVICE_STATE_COMMANDS)
    if (!command) return undefined
    commands.push(command)
  }
  return commands
}

export interface CountermeasureStateCommandChainInput {
  readonly facilityId: string
  readonly deviceId: string
  readonly triggerSourceId: string
  readonly commands: readonly DeviceStateCommand[]
}

export interface CountermeasureStateCommandChainResult {
  readonly facilityId: string
  readonly deviceId: string
  readonly triggerSourceId: string
  readonly commands: readonly DeviceStateCommand[]
  readonly usesExplicitStateCommands: true
  readonly genericActivation: false
  readonly commandCount: number
}

/**
 * Trigger-linked devices accept an ordered explicit state-command chain
 * (open/close/seal/purge/…) rather than a generic activate flag.
 */
export function projectCountermeasureStateCommandChain(
  input: unknown
): CountermeasureStateCommandChainResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const facilityId = requireTrimmedId(packet.facilityId)
  const deviceId = requireTrimmedId(packet.deviceId)
  const triggerSourceId = requireTrimmedId(packet.triggerSourceId)
  const commands = parseCommandChain(packet.commands)
  if (!facilityId || !deviceId || !triggerSourceId || !commands) return undefined

  return {
    facilityId,
    deviceId,
    triggerSourceId,
    commands,
    usesExplicitStateCommands: true,
    genericActivation: false,
    commandCount: commands.length,
  }
}

export interface ManualVsAutomaticResponseInput {
  readonly facilityId: string
  readonly deviceId: string
  readonly controlMode: ControlMode
  readonly trafficAmbiguous: boolean
}

export interface ManualVsAutomaticResponseResult {
  readonly facilityId: string
  readonly deviceId: string
  readonly controlMode: ControlMode
  readonly responseFaster: boolean
  readonly responseMoreSelective: boolean
  readonly errorProneUnderAmbiguousTraffic: boolean
  readonly automationStrictlySafer: false
}

/**
 * Manual lockdown is slower but more selective; automatic response is faster
 * but more error-prone when traffic is ambiguous. Automation is never strictly safer.
 */
export function evaluateManualVsAutomaticResponse(
  input: unknown
): ManualVsAutomaticResponseResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const facilityId = requireTrimmedId(packet.facilityId)
  const deviceId = requireTrimmedId(packet.deviceId)
  const controlMode = requireEnum(packet.controlMode, CONTROL_MODES)
  const trafficAmbiguous = requireBoolean(packet.trafficAmbiguous)
  if (!facilityId || !deviceId || !controlMode || trafficAmbiguous === undefined) {
    return undefined
  }

  const automatic = controlMode === 'automatic'
  return {
    facilityId,
    deviceId,
    controlMode,
    responseFaster: automatic,
    responseMoreSelective: !automatic,
    errorProneUnderAmbiguousTraffic: automatic && trafficAmbiguous,
    automationStrictlySafer: false,
  }
}

export interface CountermeasureResetBurdenInput {
  readonly facilityId: string
  readonly deviceId: string
  readonly resetProfile: ResetProfile
  readonly alreadyFired: boolean
  readonly consumableAvailable: boolean
  readonly staffResetAvailable: boolean
}

export interface CountermeasureResetBurdenResult {
  readonly facilityId: string
  readonly deviceId: string
  readonly resetProfile: ResetProfile
  readonly readyToFireAgain: boolean
  readonly resetBurdenRequired: boolean
  readonly freeImmediateRefire: false
}

/**
 * Every countermeasure carries a reset/maintenance profile. A fired device is
 * never free to refire without accounting for that burden.
 */
export function projectCountermeasureResetBurden(
  input: unknown
): CountermeasureResetBurdenResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const facilityId = requireTrimmedId(packet.facilityId)
  const deviceId = requireTrimmedId(packet.deviceId)
  const resetProfile = requireEnum(packet.resetProfile, RESET_PROFILES)
  const alreadyFired = requireBoolean(packet.alreadyFired)
  const consumableAvailable = requireBoolean(packet.consumableAvailable)
  const staffResetAvailable = requireBoolean(packet.staffResetAvailable)
  if (
    !facilityId ||
    !deviceId ||
    !resetProfile ||
    alreadyFired === undefined ||
    consumableAvailable === undefined ||
    staffResetAvailable === undefined
  ) {
    return undefined
  }

  if (!alreadyFired) {
    return {
      facilityId,
      deviceId,
      resetProfile,
      readyToFireAgain: true,
      resetBurdenRequired: false,
      freeImmediateRefire: false,
    }
  }

  let readyToFireAgain = false
  switch (resetProfile) {
    case 'single_use':
      readyToFireAgain = false
      break
    case 'reusable':
    case 'auto_reset':
      readyToFireAgain = true
      break
    case 'jam_prone':
      readyToFireAgain = false
      break
    case 'consumable_fed':
      readyToFireAgain = consumableAvailable
      break
    case 'staff_reset':
      readyToFireAgain = staffResetAvailable
      break
  }

  return {
    facilityId,
    deviceId,
    resetProfile,
    readyToFireAgain,
    resetBurdenRequired: true,
    freeImmediateRefire: false,
  }
}

export interface QuietDegradationInput {
  readonly facilityId: string
  readonly deviceId: string
  readonly fault: DegradationFault
  readonly crisisActive: boolean
  readonly inspectionCompleted: boolean
}

export interface QuietDegradationResult {
  readonly facilityId: string
  readonly deviceId: string
  readonly fault: DegradationFault
  readonly quietDegradation: true
  readonly hiddenUntilCrisisOrInspection: boolean
  readonly recoverableViaInspection: boolean
  readonly catastrophicReveal: boolean
}

/**
 * Quiet faults hide until crisis or inspection. Inspection recovers the device
 * before catastrophic failure; an uninspected live crisis reveals the fault.
 */
export function projectQuietDegradation(
  input: unknown
): QuietDegradationResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const facilityId = requireTrimmedId(packet.facilityId)
  const deviceId = requireTrimmedId(packet.deviceId)
  const fault = requireEnum(packet.fault, DEGRADATION_FAULTS)
  const crisisActive = requireBoolean(packet.crisisActive)
  const inspectionCompleted = requireBoolean(packet.inspectionCompleted)
  if (
    !facilityId ||
    !deviceId ||
    !fault ||
    crisisActive === undefined ||
    inspectionCompleted === undefined
  ) {
    return undefined
  }

  const recoverableViaInspection = inspectionCompleted
  const catastrophicReveal = crisisActive && !inspectionCompleted
  return {
    facilityId,
    deviceId,
    fault,
    quietDegradation: true,
    hiddenUntilCrisisOrInspection: !inspectionCompleted && !crisisActive,
    recoverableViaInspection,
    catastrophicReveal,
  }
}

export interface AnomalyContainmentCompatibilityInput {
  readonly facilityId: string
  readonly deviceId: string
  readonly anomalyClassId: string
  readonly requiredDebuff: PrerequisiteDebuff
  readonly activeDebuffs: readonly PrerequisiteDebuff[]
}

export interface AnomalyContainmentCompatibilityResult {
  readonly facilityId: string
  readonly deviceId: string
  readonly anomalyClassId: string
  readonly requiredDebuff: PrerequisiteDebuff
  readonly containmentHolds: boolean
  readonly resistsUntilPrerequisite: boolean
  readonly universalCellAssumed: false
}

/**
 * Some anomaly classes resist automation until a prerequisite debuff/reveal is
 * present. No universal perfect cell is assumed.
 */
export function evaluateAnomalyContainmentCompatibility(
  input: unknown
): AnomalyContainmentCompatibilityResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const facilityId = requireTrimmedId(packet.facilityId)
  const deviceId = requireTrimmedId(packet.deviceId)
  const anomalyClassId = requireTrimmedId(packet.anomalyClassId)
  const requiredDebuff = requireEnum(packet.requiredDebuff, PREREQUISITE_DEBUFFS)
  if (!facilityId || !deviceId || !anomalyClassId || !requiredDebuff) {
    return undefined
  }
  if (!Array.isArray(packet.activeDebuffs)) return undefined

  const activeDebuffs: PrerequisiteDebuff[] = []
  for (const item of packet.activeDebuffs) {
    const debuff = requireEnum(item, PREREQUISITE_DEBUFFS)
    if (!debuff) return undefined
    activeDebuffs.push(debuff)
  }

  const containmentHolds = activeDebuffs.includes(requiredDebuff)
  return {
    facilityId,
    deviceId,
    anomalyClassId,
    requiredDebuff,
    containmentHolds,
    resistsUntilPrerequisite: !containmentHolds,
    universalCellAssumed: false,
  }
}

export interface TrafficDiscriminationInput {
  readonly facilityId: string
  readonly deviceId: string
  readonly controlMode: ControlMode
  readonly trafficKind: TrafficKind
  readonly discriminationQuality: 'high' | 'poor'
  readonly safePathRoutingEnabled: boolean
  readonly badgeOrAttunementPresent: boolean
}

export interface TrafficDiscriminationResult {
  readonly facilityId: string
  readonly deviceId: string
  readonly trafficKind: TrafficKind
  readonly falsePositive: boolean
  readonly catchesLegitimateTraffic: boolean
  readonly trafficSafe: boolean
  readonly delayedOrConflicted: boolean
}

const LEGITIMATE_TRAFFIC: ReadonlySet<TrafficKind> = new Set([
  'staff',
  'supply_cart',
  'ambulance',
  'contractor',
])

/**
 * Poor discrimination or automatic mode without badges/safe-path routing can
 * false-trigger on legitimate traffic. High discrimination with protections stays safe.
 */
export function evaluateTrafficDiscrimination(
  input: unknown
): TrafficDiscriminationResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const facilityId = requireTrimmedId(packet.facilityId)
  const deviceId = requireTrimmedId(packet.deviceId)
  const controlMode = requireEnum(packet.controlMode, CONTROL_MODES)
  const trafficKind = requireEnum(packet.trafficKind, TRAFFIC_KINDS)
  const discriminationQuality = requireEnum(packet.discriminationQuality, [
    'high',
    'poor',
  ] as const)
  const safePathRoutingEnabled = requireBoolean(packet.safePathRoutingEnabled)
  const badgeOrAttunementPresent = requireBoolean(packet.badgeOrAttunementPresent)
  if (
    !facilityId ||
    !deviceId ||
    !controlMode ||
    !trafficKind ||
    !discriminationQuality ||
    safePathRoutingEnabled === undefined ||
    badgeOrAttunementPresent === undefined
  ) {
    return undefined
  }

  const legitimate = LEGITIMATE_TRAFFIC.has(trafficKind)
  const protectedByRouting =
    safePathRoutingEnabled && badgeOrAttunementPresent && legitimate
  const falsePositive =
    legitimate &&
    !protectedByRouting &&
    (discriminationQuality === 'poor' || controlMode === 'automatic')

  return {
    facilityId,
    deviceId,
    trafficKind,
    falsePositive,
    catchesLegitimateTraffic: falsePositive,
    trafficSafe: !falsePositive,
    delayedOrConflicted: falsePositive && controlMode === 'automatic',
  }
}

export interface LureRoutingInput {
  readonly facilityId: string
  readonly lureKind: LureKind
  readonly targetAnomalyClassId: string
  readonly captureZoneId: string
  readonly cruelHarmIntent: boolean
}

export interface LureRoutingResult {
  readonly facilityId: string
  readonly lureKind: LureKind
  readonly targetAnomalyClassId: string
  readonly captureZoneId: string
  readonly pullsIntoCaptureZone: boolean
  readonly nonCruel: true
}

/**
 * Non-cruel lure routing pulls a targeted anomaly class into a capture zone.
 * Cruel-harm intent packets fail closed.
 */
export function projectLureRouting(
  input: unknown
): LureRoutingResult | undefined {
  const packet = asPacket(input)
  if (!packet) return undefined

  const facilityId = requireTrimmedId(packet.facilityId)
  const lureKind = requireEnum(packet.lureKind, LURE_KINDS)
  const targetAnomalyClassId = requireTrimmedId(packet.targetAnomalyClassId)
  const captureZoneId = requireTrimmedId(packet.captureZoneId)
  const cruelHarmIntent = requireBoolean(packet.cruelHarmIntent)
  if (
    !facilityId ||
    !lureKind ||
    !targetAnomalyClassId ||
    !captureZoneId ||
    cruelHarmIntent === undefined
  ) {
    return undefined
  }
  if (cruelHarmIntent) return undefined

  return {
    facilityId,
    lureKind,
    targetAnomalyClassId,
    captureZoneId,
    pullsIntoCaptureZone: true,
    nonCruel: true,
  }
}
