/**
 * SPE-1015 — hostile facility-actuator system.
 *
 * Pure caller-owned packets weaponize ordinary facility infrastructure (doors,
 * drains, restraints, seals, utilities) as coordinated hostile surfaces during
 * anomaly events. Vertical/drowning hazards expose contested rescue windows;
 * emergency utility controls affect outcomes; geometry manipulates routing;
 * rescue branches across multiple response families without requiring a visible
 * in-room attacker.
 *
 * This module does not persist GameState, run week-close, or simulate full BMS.
 */

export const HOSTILE_ACTUATOR_FACILITY_ID = 'facility:hostile-actuator-wing' as const

export const FACILITY_ACTUATOR_KINDS = [
  'bed_strap',
  'window',
  'faucet',
  'drain',
  'valve',
  'door',
  'room_seal',
] as const
export type FacilityActuatorKind = (typeof FACILITY_ACTUATOR_KINDS)[number]

export const UTILITY_CONTROL_STATES = [
  'accessible',
  'unknown',
  'stuck',
  'locked',
  'broken',
] as const
export type UtilityControlState = (typeof UTILITY_CONTROL_STATES)[number]

export const HAZARD_KINDS = [
  'rising_water',
  'vertical_fall',
  'sealed_room',
  'routing_trap',
] as const
export type HazardKind = (typeof HAZARD_KINDS)[number]

export const RESCUE_ROUTE_FAMILIES = [
  'breach',
  'utility_disablement',
  'conduit_treatment',
  'purge_response',
  'direct_physical',
] as const
export type RescueRouteFamily = (typeof RESCUE_ROUTE_FAMILIES)[number]

export const PURGE_RESPONSE_KINDS = [
  'holy_water_mist',
  'silver_spray',
  'uv_flood',
  'blackout',
  'suppressant_gas',
  'pressure_shift',
] as const
export type PurgeResponseKind = (typeof PURGE_RESPONSE_KINDS)[number]

export const INGRESS_VECTORS = [
  'drain',
  'hvac',
  'telecom',
  'mirror',
  'archive',
  'dreamspace',
  'staff_memory',
  'corridor',
] as const
export type IngressVector = (typeof INGRESS_VECTORS)[number]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

export interface HostileActuatorEventInput {
  readonly facilityId: string
  readonly roomId: string
  readonly actuators: readonly FacilityActuatorKind[]
  readonly hazardKind: HazardKind
  readonly visibleAttackerPresent: boolean
  readonly coordinatedPlumbingAssault: boolean
}

export interface HostileActuatorEventResult {
  readonly facilityId: string
  readonly roomId: string
  readonly weaponizedThroughInfrastructure: boolean
  readonly requiresVisibleAttacker: false
  readonly hazardKind: HazardKind
  readonly actuatorCount: number
  readonly coordinatedEvent: boolean
}

/** Ordinary infrastructure becomes a hostile surface without a visible attacker. */
export function projectHostileActuatorEvent(
  input: unknown
): HostileActuatorEventResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.roomId)) return undefined
  if (!isMember(input.hazardKind, HAZARD_KINDS)) return undefined
  if (typeof input.visibleAttackerPresent !== 'boolean') return undefined
  if (typeof input.coordinatedPlumbingAssault !== 'boolean') return undefined
  if (!Array.isArray(input.actuators) || input.actuators.length === 0) return undefined

  const actuators: FacilityActuatorKind[] = []
  const seen = new Set<string>()
  for (const item of input.actuators) {
    if (!isMember(item, FACILITY_ACTUATOR_KINDS)) return undefined
    if (seen.has(item)) continue
    seen.add(item)
    actuators.push(item)
  }

  return Object.freeze({
    facilityId: input.facilityId,
    roomId: input.roomId,
    weaponizedThroughInfrastructure: true,
    requiresVisibleAttacker: false as const,
    hazardKind: input.hazardKind,
    actuatorCount: actuators.length,
    coordinatedEvent: input.coordinatedPlumbingAssault && actuators.length >= 2,
  })
}

export interface ContestedRescueWindowInput {
  readonly facilityId: string
  readonly roomId: string
  readonly hazardKind: 'rising_water' | 'vertical_fall'
  readonly gripLost: boolean
  readonly rescueWindowOpen: boolean
  readonly contested: boolean
}

export interface ContestedRescueWindowResult {
  readonly facilityId: string
  readonly roomId: string
  readonly hazardKind: 'rising_water' | 'vertical_fall'
  readonly meaningfulRescueWindow: boolean
  readonly gripLost: boolean
  readonly contested: boolean
}

/** Vertical/drowning hazards expose a contested rescue window. */
export function projectContestedRescueWindow(
  input: unknown
): ContestedRescueWindowResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.roomId)) return undefined
  if (!isMember(input.hazardKind, ['rising_water', 'vertical_fall'] as const)) {
    return undefined
  }
  if (typeof input.gripLost !== 'boolean') return undefined
  if (typeof input.rescueWindowOpen !== 'boolean') return undefined
  if (typeof input.contested !== 'boolean') return undefined

  return Object.freeze({
    facilityId: input.facilityId,
    roomId: input.roomId,
    hazardKind: input.hazardKind,
    meaningfulRescueWindow: input.rescueWindowOpen && input.contested,
    gripLost: input.gripLost,
    contested: input.contested,
  })
}

export interface UtilityControlRescueInput {
  readonly facilityId: string
  readonly controlId: string
  readonly controlState: UtilityControlState
  readonly rescueWindowOpen: boolean
}

export interface UtilityControlRescueResult {
  readonly facilityId: string
  readonly controlId: string
  readonly controlState: UtilityControlState
  readonly controlUsable: boolean
  readonly rescueTimingImproved: boolean
  readonly rescueOutcomeBoosted: boolean
}

/** Emergency utility controls materially affect rescue timing/outcome. */
export function projectUtilityControlRescueEffect(
  input: unknown
): UtilityControlRescueResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.controlId)) return undefined
  if (!isMember(input.controlState, UTILITY_CONTROL_STATES)) return undefined
  if (typeof input.rescueWindowOpen !== 'boolean') return undefined

  const controlUsable = input.controlState === 'accessible'
  const rescueTimingImproved = controlUsable && input.rescueWindowOpen
  return Object.freeze({
    facilityId: input.facilityId,
    controlId: input.controlId,
    controlState: input.controlState,
    controlUsable,
    rescueTimingImproved,
    rescueOutcomeBoosted: rescueTimingImproved,
  })
}

export interface GeometryRoutingHazardInput {
  readonly facilityId: string
  readonly corridorId: string
  readonly forcedDetour: boolean
  readonly ingressVector: IngressVector
  readonly decoyCorridor: boolean
}

export interface GeometryRoutingHazardResult {
  readonly facilityId: string
  readonly corridorId: string
  readonly manipulatesRouting: boolean
  readonly beyondSingleRoomTrap: true
  readonly ingressVector: IngressVector
}

/** Geometry-driven routing/ingress manipulation beyond a single room trap. */
export function projectGeometryRoutingHazard(
  input: unknown
): GeometryRoutingHazardResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.corridorId)) return undefined
  if (typeof input.forcedDetour !== 'boolean') return undefined
  if (!isMember(input.ingressVector, INGRESS_VECTORS)) return undefined
  if (typeof input.decoyCorridor !== 'boolean') return undefined

  return Object.freeze({
    facilityId: input.facilityId,
    corridorId: input.corridorId,
    manipulatesRouting: input.forcedDetour || input.decoyCorridor,
    beyondSingleRoomTrap: true as const,
    ingressVector: input.ingressVector,
  })
}

export interface RescueRouteChoiceInput {
  readonly facilityId: string
  readonly roomId: string
  readonly availableRoutes: readonly RescueRouteFamily[]
  readonly chosenRoute: RescueRouteFamily
  readonly purgeKind?: PurgeResponseKind
  readonly utilityControlUsable: boolean
  readonly physicalReachPossible: boolean
}

export interface RescueRouteChoiceResult {
  readonly facilityId: string
  readonly roomId: string
  readonly chosenRoute: RescueRouteFamily
  readonly routeValid: boolean
  readonly outcomeDependsOnRouteChoice: true
  readonly success: boolean
}

/** Rescue outcome depends on choosing among multiple valid response families. */
export function evaluateRescueRouteChoice(
  input: unknown
): RescueRouteChoiceResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.facilityId)) return undefined
  if (!isNonEmptyString(input.roomId)) return undefined
  if (!isMember(input.chosenRoute, RESCUE_ROUTE_FAMILIES)) return undefined
  if (typeof input.utilityControlUsable !== 'boolean') return undefined
  if (typeof input.physicalReachPossible !== 'boolean') return undefined
  if (!Array.isArray(input.availableRoutes) || input.availableRoutes.length < 2) {
    return undefined
  }

  const available: RescueRouteFamily[] = []
  const seen = new Set<string>()
  for (const route of input.availableRoutes) {
    if (!isMember(route, RESCUE_ROUTE_FAMILIES)) return undefined
    if (seen.has(route)) continue
    seen.add(route)
    available.push(route)
  }
  if (available.length < 2) return undefined

  const routeValid = available.includes(input.chosenRoute)
  if (!routeValid) {
    return Object.freeze({
      facilityId: input.facilityId,
      roomId: input.roomId,
      chosenRoute: input.chosenRoute,
      routeValid: false,
      outcomeDependsOnRouteChoice: true as const,
      success: false,
    })
  }

  let success = false
  switch (input.chosenRoute) {
    case 'direct_physical':
      success = input.physicalReachPossible
      break
    case 'utility_disablement':
      success = input.utilityControlUsable
      break
    case 'purge_response':
      success =
        input.purgeKind !== undefined &&
        isMember(input.purgeKind, PURGE_RESPONSE_KINDS)
      break
    case 'breach':
    case 'conduit_treatment':
      success = true
      break
  }

  return Object.freeze({
    facilityId: input.facilityId,
    roomId: input.roomId,
    chosenRoute: input.chosenRoute,
    routeValid: true,
    outcomeDependsOnRouteChoice: true as const,
    success,
  })
}
