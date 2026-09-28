/**
 * SPE-1051 — pure incident state-change success resolution (slice 2).
 *
 * Callers own a configured incident resolution naming one allowed state-change
 * kind (environmental, political, ritual, logistical, institutional,
 * containment, evacuation, evidence, or stabilization). When configured, this
 * module projects a success resolution that is a state change, including a
 * path that succeeds without entity elimination.
 *
 * It does not invent combat win/loss, true-defeat, silent game-over, UI,
 * week-close, GameState persistence, SPE-868 after-action narrative, or
 * rewrite the SPE-1051 scar registry / SPE-2261 / SPE-2262 registries.
 */

export const INCIDENT_STATE_CHANGE_KINDS = [
  'environmental',
  'political',
  'ritual',
  'logistical',
  'institutional',
  'containment',
  'evacuation',
  'evidence',
  'stabilization',
] as const
export type IncidentStateChangeKind = (typeof INCIDENT_STATE_CHANGE_KINDS)[number]

/**
 * Outcome kinds for slice 2. Combat win/loss, defeat, and game-over are
 * intentionally omitted — this projector only emits state_change_success.
 */
export const INCIDENT_STATE_CHANGE_RESOLUTION_KINDS = ['state_change_success'] as const
export type IncidentStateChangeResolutionKind =
  (typeof INCIDENT_STATE_CHANGE_RESOLUTION_KINDS)[number]

/** Default operating-condition delta when the caller omits the field. */
export const INCIDENT_STATE_CHANGE_DEFAULT_CONDITION_DELTA = 1

export interface IncidentStateChangeResolutionInput {
  /** Required: which state-change path resolves the incident. */
  readonly stateChangeKind: IncidentStateChangeKind
  /** Optional caller-owned incident id (non-empty string when present). */
  readonly incidentId?: string
  /**
   * When true, caller requests entity-elimination success — contradictory for
   * this projector. Fail closed (do not invent combat win).
   * When false or omitted, success is without entity elimination.
   */
  readonly requireEntityElimination?: boolean
  /**
   * Optional non-negative finite operating-condition delta encoding how much
   * the operating condition changed. Defaults to
   * INCIDENT_STATE_CHANGE_DEFAULT_CONDITION_DELTA when omitted.
   */
  readonly operatingConditionDelta?: number
}

export interface IncidentStateChangeProjection {
  readonly resolutionKind: 'state_change_success'
  readonly stateChangeKind: IncidentStateChangeKind
  readonly incidentId: string | null
  /** Always false — this projector never eliminates entities. */
  readonly entityEliminated: false
  readonly successWithoutEntityElimination: true
  readonly operatingConditionDelta: number
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function isIncidentStateChangeKind(value: unknown): value is IncidentStateChangeKind {
  return INCIDENT_STATE_CHANGE_KINDS.some((kind) => kind === value)
}

export function isIncidentStateChangeResolutionKind(
  value: unknown
): value is IncidentStateChangeResolutionKind {
  return INCIDENT_STATE_CHANGE_RESOLUTION_KINDS.some((kind) => kind === value)
}

/**
 * Validate caller-owned inputs. stateChangeKind is required and must be a
 * known kind. Present optional fields must be well-typed.
 * requireEntityElimination: true is contradictory and fails closed.
 */
export function validateIncidentStateChangeResolutionInput(
  input: unknown
): input is IncidentStateChangeResolutionInput {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return false
  }
  const record = input as Record<string, unknown>

  if (!('stateChangeKind' in record) || !isIncidentStateChangeKind(record.stateChangeKind)) {
    return false
  }

  if ('incidentId' in record) {
    const incidentId = record.incidentId
    if (typeof incidentId !== 'string' || incidentId.length === 0) return false
  }

  if ('requireEntityElimination' in record) {
    if (typeof record.requireEntityElimination !== 'boolean') return false
    // Contradictory: this projector never resolves via entity elimination.
    if (record.requireEntityElimination === true) return false
  }

  if ('operatingConditionDelta' in record) {
    if (!isNonNegativeFiniteNumber(record.operatingConditionDelta)) return false
  }

  return true
}

/**
 * Project a configured incident resolution into an immutable state-change
 * success projection. Omit / null / undefined / malformed inputs fail closed
 * to undefined. Never invents combat win, defeat, game-over, or entity
 * elimination.
 */
export function projectIncidentStateChangeResolution(
  input: IncidentStateChangeResolutionInput | null | undefined
): IncidentStateChangeProjection | undefined {
  if (!validateIncidentStateChangeResolutionInput(input)) return undefined

  const operatingConditionDelta =
    input.operatingConditionDelta === undefined
      ? INCIDENT_STATE_CHANGE_DEFAULT_CONDITION_DELTA
      : input.operatingConditionDelta

  return Object.freeze({
    resolutionKind: 'state_change_success' as const,
    stateChangeKind: input.stateChangeKind,
    incidentId: input.incidentId === undefined ? null : input.incidentId,
    entityEliminated: false as const,
    successWithoutEntityElimination: true as const,
    operatingConditionDelta,
  })
}

export function listIncidentStateChangeKinds(): readonly IncidentStateChangeKind[] {
  return INCIDENT_STATE_CHANGE_KINDS
}
