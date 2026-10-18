/**
 * SPE-1481 — facility output / productive-readiness thresholds.
 *
 * Caller-owned readiness facts decide whether a representative site may emit
 * intel, containment capacity, service output, or revenue. Lifecycle status,
 * ownership, construction progress, and installed effect fields are not
 * productive proof. This module does not read GameState, grant pools, or
 * mutate week-close.
 */

export const FACILITY_OUTPUT_SITE_ID = 'site:biohazard-response-lab' as const

export const FACILITY_OUTPUT_PHASES = [
  'under_construction',
  'initial_activation',
  'stable_operation',
] as const
export type FacilityOutputPhase = (typeof FACILITY_OUTPUT_PHASES)[number]

export const FACILITY_OUTPUT_READINESS_AXES = [
  'security',
  'staffing',
  'power',
  'storage',
  'communications',
] as const
export type FacilityOutputReadinessAxis = (typeof FACILITY_OUTPUT_READINESS_AXES)[number]

export const FACILITY_OUTPUT_AXIS_STATES = ['met', 'unmet'] as const
export type FacilityOutputAxisState = (typeof FACILITY_OUTPUT_AXIS_STATES)[number]

export const FACILITY_OUTPUT_BLOCK_REASONS = [
  'malformed_readiness',
  'phase_nonproductive',
  'insufficient_staffing',
  'weak_security',
  'absent_power',
  'missing_storage',
  'broken_comms',
] as const
export type FacilityOutputBlockReason = (typeof FACILITY_OUTPUT_BLOCK_REASONS)[number]

export interface FacilityOutputBundle {
  readonly intel: number
  readonly containmentCapacity: number
  readonly serviceOutput: number
  readonly revenue: number
}

export type FacilityOutputReadiness = Readonly<
  Record<FacilityOutputReadinessAxis, FacilityOutputAxisState>
>

export interface FacilityOutputThresholdRequest {
  readonly siteId: string
  readonly phase: FacilityOutputPhase
  readonly readiness: FacilityOutputReadiness
}

export interface FacilityOutputThresholdResult {
  readonly siteId: typeof FACILITY_OUTPUT_SITE_ID
  readonly phase: FacilityOutputPhase
  readonly productive: boolean
  readonly bundle: FacilityOutputBundle
  readonly blockedReasons: readonly FacilityOutputBlockReason[]
}

const ZERO_BUNDLE: FacilityOutputBundle = Object.freeze({
  intel: 0,
  containmentCapacity: 0,
  serviceOutput: 0,
  revenue: 0,
})

const INITIAL_ACTIVATION_BUNDLE: FacilityOutputBundle = Object.freeze({
  intel: 1,
  containmentCapacity: 1,
  serviceOutput: 1,
  revenue: 0,
})

const STABLE_OPERATION_BUNDLE: FacilityOutputBundle = Object.freeze({
  intel: 2,
  containmentCapacity: 2,
  serviceOutput: 2,
  revenue: 1,
})

const AXIS_BLOCK_REASON: Readonly<Record<FacilityOutputReadinessAxis, FacilityOutputBlockReason>> =
  Object.freeze({
    security: 'weak_security',
    staffing: 'insufficient_staffing',
    power: 'absent_power',
    storage: 'missing_storage',
    communications: 'broken_comms',
  })

const PHASE_BUNDLE: Readonly<Record<FacilityOutputPhase, FacilityOutputBundle>> = Object.freeze({
  under_construction: ZERO_BUNDLE,
  initial_activation: INITIAL_ACTIVATION_BUNDLE,
  stable_operation: STABLE_OPERATION_BUNDLE,
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPhase(value: unknown): value is FacilityOutputPhase {
  return FACILITY_OUTPUT_PHASES.some((phase) => phase === value)
}

function isAxisState(value: unknown): value is FacilityOutputAxisState {
  return FACILITY_OUTPUT_AXIS_STATES.some((state) => state === value)
}

function freezeBundle(bundle: FacilityOutputBundle): FacilityOutputBundle {
  return Object.freeze({
    intel: bundle.intel,
    containmentCapacity: bundle.containmentCapacity,
    serviceOutput: bundle.serviceOutput,
    revenue: bundle.revenue,
  })
}

function freezeResult(result: FacilityOutputThresholdResult): FacilityOutputThresholdResult {
  return Object.freeze({
    siteId: result.siteId,
    phase: result.phase,
    productive: result.productive,
    bundle: freezeBundle(result.bundle),
    blockedReasons: Object.freeze([...result.blockedReasons]),
  })
}

function malformed(phase: FacilityOutputPhase | undefined): FacilityOutputThresholdResult {
  return freezeResult({
    siteId: FACILITY_OUTPUT_SITE_ID,
    phase: phase ?? 'under_construction',
    productive: false,
    bundle: ZERO_BUNDLE,
    blockedReasons: ['malformed_readiness'],
  })
}

function collectUnmetReasons(readiness: FacilityOutputReadiness): FacilityOutputBlockReason[] {
  const reasons: FacilityOutputBlockReason[] = []
  for (const axis of FACILITY_OUTPUT_READINESS_AXES) {
    if (readiness[axis] === 'unmet') {
      reasons.push(AXIS_BLOCK_REASON[axis])
    }
  }
  return reasons
}

function parseReadiness(value: unknown): FacilityOutputReadiness | undefined {
  if (!isRecord(value)) return undefined
  const keys = Object.keys(value)
  if (keys.length !== FACILITY_OUTPUT_READINESS_AXES.length) return undefined
  const readiness = {} as Record<FacilityOutputReadinessAxis, FacilityOutputAxisState>
  for (const axis of FACILITY_OUTPUT_READINESS_AXES) {
    if (!Object.prototype.hasOwnProperty.call(value, axis)) return undefined
    if (!isAxisState(value[axis])) return undefined
    readiness[axis] = value[axis]
  }
  return readiness as FacilityOutputReadiness
}

/**
 * Evaluate whether the representative site may produce output for the given
 * phase. Fail closed on malformed packets. Construction never produces.
 * Activation and stable operation require every readiness axis to be `met`.
 */
export function evaluateFacilityOutputThresholds(request: unknown): FacilityOutputThresholdResult {
  if (!isRecord(request)) return malformed(undefined)
  if (request.siteId !== FACILITY_OUTPUT_SITE_ID) return malformed(undefined)
  if (!isPhase(request.phase)) return malformed(undefined)
  const readiness = parseReadiness(request.readiness)
  if (!readiness) return malformed(request.phase)

  if (request.phase === 'under_construction') {
    return freezeResult({
      siteId: FACILITY_OUTPUT_SITE_ID,
      phase: request.phase,
      productive: false,
      bundle: PHASE_BUNDLE.under_construction,
      blockedReasons: ['phase_nonproductive'],
    })
  }

  const unmet = collectUnmetReasons(readiness)
  if (unmet.length > 0) {
    return freezeResult({
      siteId: FACILITY_OUTPUT_SITE_ID,
      phase: request.phase,
      productive: false,
      bundle: ZERO_BUNDLE,
      blockedReasons: unmet,
    })
  }

  return freezeResult({
    siteId: FACILITY_OUTPUT_SITE_ID,
    phase: request.phase,
    productive: true,
    bundle: PHASE_BUNDLE[request.phase],
    blockedReasons: [],
  })
}

/** All-met readiness packet for tests and callers that already verified axes. */
export function metFacilityOutputReadiness(): FacilityOutputReadiness {
  return Object.freeze({
    security: 'met',
    staffing: 'met',
    power: 'met',
    storage: 'met',
    communications: 'met',
  }) as FacilityOutputReadiness
}
