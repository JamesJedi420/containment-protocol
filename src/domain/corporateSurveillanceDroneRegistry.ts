/**
 * SPE-2245 — corporate surveillance drone registry (slice 1, pure).
 *
 * Deterministic registry for small corporate security drones as external
 * surveillance assets. No GameState, no source-canon import, no UI.
 */

export type CorporateSurveillanceDroneId = string

export const DRONE_MORPHOLOGIES = ['aerial', 'crawler'] as const
export type DroneMorphology = (typeof DRONE_MORPHOLOGIES)[number]

export const DRONE_ENVIRONMENT_FIT = ['indoor', 'outdoor', 'mixed', 'confined'] as const
export type DroneEnvironmentFit = (typeof DRONE_ENVIRONMENT_FIT)[number]

export const DRONE_CONTROL_MODES = [
  'autonomous_protocol',
  'operator_piloted',
  'hybrid_analysis_pending',
] as const
export type DroneControlMode = (typeof DRONE_CONTROL_MODES)[number]

export const DRONE_BATTERY_BANDS = ['full', 'nominal', 'low', 'critical', 'depleted'] as const
export type DroneBatteryBand = (typeof DRONE_BATTERY_BANDS)[number]

export const DRONE_SENSOR_CHANNELS = [
  'visual',
  'low_light',
  'touch_avoidance',
  'contamination_detection',
] as const
export type DroneSensorChannel = (typeof DRONE_SENSOR_CHANNELS)[number]

export const DRONE_ACTION_TYPES = ['detect', 'track', 'classify', 'weapon_fire'] as const
export type DroneActionType = (typeof DRONE_ACTION_TYPES)[number]

export const DRONE_STATES = ['operational', 'disabled', 'returning', 'jammed'] as const
export type DroneState = (typeof DRONE_STATES)[number]

export interface AuthorizationPolicy {
  readonly requiredFor: readonly DroneActionType[]
  readonly permitsAutonomousFire: boolean
}

export interface CorporateSurveillanceDroneRecord {
  readonly id: CorporateSurveillanceDroneId
  readonly morphology: DroneMorphology
  readonly environmentFit: readonly DroneEnvironmentFit[]
  readonly controlMode: DroneControlMode
  readonly enduranceHours: number
  readonly batteryBand: DroneBatteryBand
  readonly swapPolicy: string
  readonly sensorChannels: readonly DroneSensorChannel[]
  readonly authorizationPolicy: AuthorizationPolicy
  readonly localPatrolWaypoints?: readonly string[]
  readonly analysisDelayTicks?: number
}

export type DroneValidationSeverity = 'error' | 'warning'

export interface DroneValidationIssue {
  readonly code: string
  readonly severity: DroneValidationSeverity
  readonly field: string
}

export interface DroneValidationResult {
  readonly valid: boolean
  readonly issues: readonly DroneValidationIssue[]
}

const SOURCE_SPECIFIC_PREFIXES = ['scp-', 'gundam-', 'terminator-', 'starwars-'] as const

function isValidId(id: string): boolean {
  if (!id || id.length < 3 || id.length > 64) return false
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) return false
  const lower = id.toLowerCase()
  return !SOURCE_SPECIFIC_PREFIXES.some((p) => lower.startsWith(p))
}

export function validateCorporateSurveillanceDrone(
  record: CorporateSurveillanceDroneRecord
): DroneValidationResult {
  const issues: DroneValidationIssue[] = []

  if (!isValidId(record.id)) {
    issues.push({ code: 'invalid_id', severity: 'error', field: 'id' })
  }
  if (!DRONE_MORPHOLOGIES.includes(record.morphology)) {
    issues.push({ code: 'invalid_morphology', severity: 'error', field: 'morphology' })
  }
  if (record.environmentFit.length === 0) {
    issues.push({ code: 'empty_environment_fit', severity: 'error', field: 'environmentFit' })
  }
  if (!DRONE_CONTROL_MODES.includes(record.controlMode)) {
    issues.push({ code: 'invalid_control_mode', severity: 'error', field: 'controlMode' })
  }
  if (record.enduranceHours <= 0 || !Number.isFinite(record.enduranceHours)) {
    issues.push({ code: 'invalid_endurance', severity: 'error', field: 'enduranceHours' })
  }
  if (!DRONE_BATTERY_BANDS.includes(record.batteryBand)) {
    issues.push({ code: 'invalid_battery_band', severity: 'error', field: 'batteryBand' })
  }
  if (!record.swapPolicy || record.swapPolicy.trim().length === 0) {
    issues.push({ code: 'missing_swap_policy', severity: 'error', field: 'swapPolicy' })
  }
  if (record.sensorChannels.length === 0) {
    issues.push({ code: 'empty_sensors', severity: 'error', field: 'sensorChannels' })
  }
  for (const ch of record.sensorChannels) {
    if (!DRONE_SENSOR_CHANNELS.includes(ch)) {
      issues.push({ code: 'invalid_sensor', severity: 'error', field: 'sensorChannels' })
      break
    }
  }

  return { valid: issues.length === 0, issues }
}

export interface ControlModeEffect {
  readonly analysisDelayTicks: number
  readonly immediateFeed: boolean
  readonly oversightRisk: boolean
}

export function resolveControlModeEffect(mode: DroneControlMode): ControlModeEffect {
  switch (mode) {
    case 'autonomous_protocol':
      return { analysisDelayTicks: 2, immediateFeed: false, oversightRisk: false }
    case 'operator_piloted':
      return { analysisDelayTicks: 0, immediateFeed: true, oversightRisk: true }
    case 'hybrid_analysis_pending':
      return { analysisDelayTicks: 1, immediateFeed: false, oversightRisk: true }
  }
}

export interface JammingEffect {
  readonly operatorLinkSevered: boolean
  readonly retainsLocalPatrol: boolean
}

export function resolveJammingEffect(record: CorporateSurveillanceDroneRecord): JammingEffect {
  const retains =
    record.morphology === 'crawler' &&
    Array.isArray(record.localPatrolWaypoints) &&
    record.localPatrolWaypoints.length > 0
  return { operatorLinkSevered: true, retainsLocalPatrol: retains }
}

export function isWeaponFireAuthorized(
  record: CorporateSurveillanceDroneRecord,
  hasExplicitAuthorization: boolean
): boolean {
  if (hasExplicitAuthorization) return true
  return record.authorizationPolicy.permitsAutonomousFire
}

export function applyEmpExposure(record: CorporateSurveillanceDroneRecord): DroneState {
  // Deterministic: any operational drone becomes disabled under EMP.
  return 'disabled'
}

export function getBatteryReturnBehavior(
  band: DroneBatteryBand
): 'continue' | 'return_to_base' | 'disabled' {
  switch (band) {
    case 'full':
    case 'nominal':
      return 'continue'
    case 'low':
      return 'return_to_base'
    case 'critical':
    case 'depleted':
      return 'disabled'
  }
}
