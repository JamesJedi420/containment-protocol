/**
 * SPE-874 — lifecycle operating procedures and permit controls.
 *
 * Pure caller-owned phase procedures, deviation handling, safe-work permits,
 * and procedure-set attestation freshness. Distinct from hazard analysis
 * (SPE-873), change control (SPE-878), and pre-activation readiness (SPE-876).
 * Does not mutate GameState or the shipped market licensed-handling attestation.
 */

export const LIFECYCLE_OPERATING_PROCEDURES_OWNER = 'SPE-874' as const

export type LifecyclePhase =
  | 'startup'
  | 'normal_operation'
  | 'temporary_operation'
  | 'emergency_operation'
  | 'emergency_shutdown'
  | 'normal_shutdown'
  | 'restart_after_outage'

export type SafeWorkPermitKind =
  | 'ignition_risk'
  | 'lockout_tagout'
  | 'confined_access'
  | 'open_hazardous_equipment'

export type AttestationFreshness = 'current' | 'stale'

export interface ProcedureDeviation {
  readonly deviationId: string
  readonly trigger: string
  readonly correctionStep: string
  readonly avoidanceStep: string
}

export interface PhaseProcedure {
  readonly phase: LifecyclePhase
  readonly procedureId: string
  readonly primaryStep: string
  readonly inventoryGuard: string
  readonly materialQualityGuard: string
  readonly deviations: readonly ProcedureDeviation[]
}

export interface SafeWorkPermit {
  readonly permitId: string
  readonly kind: SafeWorkPermitKind
  readonly assetId: string
  readonly windowStartWeek: number
  readonly windowEndWeek: number
  readonly preconditions: readonly string[]
  readonly authorized: boolean
}

export interface ProcedureSetAttestation {
  readonly procedureSetId: string
  readonly lastAttestedWeek: number
  readonly attestationIntervalWeeks: number
}

export interface LifecycleProcedureEvaluation {
  readonly systemId: string
  readonly phase: LifecyclePhase
  readonly procedureId: string
  readonly primaryStep: string
  readonly inventoryGuard: string
  readonly materialQualityGuard: string
  readonly activeDeviations: readonly ProcedureDeviation[]
}

export interface SafeWorkPermitGateState {
  readonly permitId: string
  readonly allowed: boolean
  readonly blockingReasons: readonly string[]
}

export interface ProcedureAttestationState {
  readonly procedureSetId: string
  readonly freshness: AttestationFreshness
  readonly weeksSinceAttestation: number
  readonly stale: boolean
}

const LIFECYCLE_PHASES: readonly LifecyclePhase[] = [
  'startup',
  'normal_operation',
  'temporary_operation',
  'emergency_operation',
  'emergency_shutdown',
  'normal_shutdown',
  'restart_after_outage',
]

const PERMIT_KINDS: readonly SafeWorkPermitKind[] = [
  'ignition_risk',
  'lockout_tagout',
  'confined_access',
  'open_hazardous_equipment',
]

function requireNonEmpty(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`lifecycle procedure ${label} is required`)
  return trimmed
}

function compareAscii(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function requireFiniteNonNegativeInt(value: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(`lifecycle procedure ${label} must be a non-negative integer`)
  }
  return value
}

function requirePositiveInt(value: number, label: string): number {
  const n = requireFiniteNonNegativeInt(value, label)
  if (n < 1) throw new Error(`lifecycle procedure ${label} must be >= 1`)
  return n
}

function requireLifecyclePhase(value: string): LifecyclePhase {
  if ((LIFECYCLE_PHASES as readonly string[]).includes(value)) return value as LifecyclePhase
  throw new Error('lifecycle procedure phase is invalid')
}

function requirePermitKind(value: string): SafeWorkPermitKind {
  if ((PERMIT_KINDS as readonly string[]).includes(value)) return value as SafeWorkPermitKind
  throw new Error('lifecycle procedure permit kind is invalid')
}

/**
 * Fail-closed create for one phase procedure with deviation handling.
 */
export function createPhaseProcedure(input: PhaseProcedure): PhaseProcedure {
  const phase = requireLifecyclePhase(input.phase)
  const procedureId = requireNonEmpty(input.procedureId, 'procedureId')
  const primaryStep = requireNonEmpty(input.primaryStep, 'primaryStep')
  const inventoryGuard = requireNonEmpty(input.inventoryGuard, 'inventoryGuard')
  const materialQualityGuard = requireNonEmpty(input.materialQualityGuard, 'materialQualityGuard')
  const deviations = (input.deviations ?? []).map((entry) =>
    Object.freeze({
      deviationId: requireNonEmpty(entry.deviationId, 'deviationId'),
      trigger: requireNonEmpty(entry.trigger, 'deviation.trigger'),
      correctionStep: requireNonEmpty(entry.correctionStep, 'deviation.correctionStep'),
      avoidanceStep: requireNonEmpty(entry.avoidanceStep, 'deviation.avoidanceStep'),
    }),
  )
  if (deviations.length === 0) {
    throw new Error('lifecycle procedure requires at least one deviation path')
  }
  return Object.freeze({
    phase,
    procedureId,
    primaryStep,
    inventoryGuard,
    materialQualityGuard,
    deviations: Object.freeze(deviations),
  })
}

/**
 * Fail-closed create for one safe-work permit.
 */
export function createSafeWorkPermit(input: SafeWorkPermit): SafeWorkPermit {
  const windowStartWeek = requireFiniteNonNegativeInt(input.windowStartWeek, 'windowStartWeek')
  const windowEndWeek = requireFiniteNonNegativeInt(input.windowEndWeek, 'windowEndWeek')
  if (windowEndWeek < windowStartWeek) {
    throw new Error('lifecycle procedure permit windowEndWeek must be >= windowStartWeek')
  }
  const preconditions = [
    ...new Set(
      (input.preconditions ?? [])
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  ].sort(compareAscii)
  if (preconditions.length === 0) {
    throw new Error('lifecycle procedure permit requires at least one precondition')
  }
  return Object.freeze({
    permitId: requireNonEmpty(input.permitId, 'permitId'),
    kind: requirePermitKind(input.kind),
    assetId: requireNonEmpty(input.assetId, 'assetId'),
    windowStartWeek,
    windowEndWeek,
    preconditions: Object.freeze(preconditions),
    authorized: Boolean(input.authorized),
  })
}

/**
 * Select the phase procedure for a system. Different phases yield different
 * primary steps / guards when the catalog contains them.
 */
export function evaluateLifecycleProcedure(args: {
  readonly systemId: string
  readonly phase: LifecyclePhase
  readonly catalog: readonly PhaseProcedure[]
}): LifecycleProcedureEvaluation {
  const systemId = requireNonEmpty(args.systemId, 'systemId')
  const phase = requireLifecyclePhase(args.phase)
  const match = args.catalog.find((entry) => entry.phase === phase)
  if (!match) {
    throw new Error(`lifecycle procedure missing for phase ${phase}`)
  }
  const procedure = createPhaseProcedure(match)
  return Object.freeze({
    systemId,
    phase: procedure.phase,
    procedureId: procedure.procedureId,
    primaryStep: procedure.primaryStep,
    inventoryGuard: procedure.inventoryGuard,
    materialQualityGuard: procedure.materialQualityGuard,
    activeDeviations: procedure.deviations,
  })
}

/**
 * Gate a high-risk task against a permit keyed to asset, week window, and
 * satisfied preconditions.
 */
export function evaluateSafeWorkPermitGate(args: {
  readonly permit: SafeWorkPermit
  readonly assetId: string
  readonly currentWeek: number
  readonly satisfiedPreconditions: readonly string[]
}): SafeWorkPermitGateState {
  const permit = createSafeWorkPermit(args.permit)
  const assetId = requireNonEmpty(args.assetId, 'assetId')
  const currentWeek = requireFiniteNonNegativeInt(args.currentWeek, 'currentWeek')
  const satisfied = new Set(
    (args.satisfiedPreconditions ?? []).map((entry) => entry.trim()).filter(Boolean),
  )
  const blocking: string[] = []

  if (permit.assetId !== assetId) blocking.push('asset-mismatch')
  if (currentWeek < permit.windowStartWeek || currentWeek > permit.windowEndWeek) {
    blocking.push('outside-window')
  }
  if (!permit.authorized) blocking.push('not-authorized')
  for (const precondition of permit.preconditions) {
    if (!satisfied.has(precondition)) blocking.push(`precondition:${precondition}`)
  }

  return Object.freeze({
    permitId: permit.permitId,
    allowed: blocking.length === 0,
    blockingReasons: Object.freeze([...blocking].sort(compareAscii)),
  })
}

/**
 * Annual-style attestation freshness for a procedure set.
 * Stale when weeks since last attestation exceed the interval.
 */
export function evaluateProcedureAttestation(args: {
  readonly attestation: ProcedureSetAttestation
  readonly currentWeek: number
}): ProcedureAttestationState {
  const procedureSetId = requireNonEmpty(args.attestation.procedureSetId, 'procedureSetId')
  const lastAttestedWeek = requireFiniteNonNegativeInt(
    args.attestation.lastAttestedWeek,
    'lastAttestedWeek',
  )
  const attestationIntervalWeeks = requirePositiveInt(
    args.attestation.attestationIntervalWeeks,
    'attestationIntervalWeeks',
  )
  const currentWeek = requireFiniteNonNegativeInt(args.currentWeek, 'currentWeek')
  if (currentWeek < lastAttestedWeek) {
    throw new Error('lifecycle procedure currentWeek must be >= lastAttestedWeek')
  }
  const weeksSinceAttestation = currentWeek - lastAttestedWeek
  const stale = weeksSinceAttestation > attestationIntervalWeeks
  return Object.freeze({
    procedureSetId,
    freshness: stale ? 'stale' : 'current',
    weeksSinceAttestation,
    stale,
  })
}
