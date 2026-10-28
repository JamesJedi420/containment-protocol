/**
 * SPE-2186 — defensive-control staff action model (slice 1).
 *
 * Deterministic schema for staff defensive-control actions (redirect, block,
 * delay, reposition, …) distinct from damage-only attacks. Validation only —
 * no GameState, combat resolution, or action-economy wiring.
 *
 * Local confrontation odds remain SPE-73. Parent SPE-41 owns the broader
 * graded-outcome / action-budget umbrella.
 */

export const DEFENSIVE_CONTROL_STAFF_ACTION_OWNER = 'SPE-2186' as const
export const DEFENSIVE_CONTROL_STAFF_ACTION_SCHEMA_VERSION = 'spe-2186.v1' as const

/** CP-neutral control kinds — not imported tabletop maneuver names. */
export const DEFENSIVE_CONTROL_KINDS = [
  'redirect',
  'block',
  'delay',
  'reposition',
  'defend',
  'brace',
  'cover',
  'intercept',
  'withdraw',
  'guard_objective',
  'prop_obstacles',
  'tactical_withdrawal',
  'posture_persist',
] as const
export type DefensiveControlKind = (typeof DEFENSIVE_CONTROL_KINDS)[number]

/** Geometry descriptors required for spatial control kinds. */
export const TARGET_GEOMETRY_KINDS = [
  'lane',
  'chokepoint',
  'cover_arc',
  'fallback_node',
  'objective_anchor',
  'obstacle_span',
] as const
export type TargetGeometryKind = (typeof TARGET_GEOMETRY_KINDS)[number]

/** Documented collateral-risk bands (not free floats). */
export const COLLATERAL_RISK_BANDS = ['none', 'low', 'moderate', 'high'] as const
export type CollateralRiskBand = (typeof COLLATERAL_RISK_BANDS)[number]

/** Control outcomes distinct from damage application. */
export const DEFENSIVE_CONTROL_OUTCOMES = [
  'avoid',
  'absorb',
  'redirect',
  'delay',
  'expose_flank',
  'preserve_objective',
] as const
export type DefensiveControlOutcome = (typeof DEFENSIVE_CONTROL_OUTCOMES)[number]

/** Visible posture / pressure states produced by defensive control. */
export const DEFENSIVE_VISIBLE_STATES = [
  'guarded',
  'pressured',
  'exposed',
  'delayed',
  'redirected',
  'disrupted',
] as const
export type DefensiveVisibleState = (typeof DEFENSIVE_VISIBLE_STATES)[number]

/** Conditions that can invalidate an active defensive posture. */
export const DEFENSIVE_INVALIDATION_CONDITIONS = [
  'line_of_sight',
  'flank',
  'footing',
  'equipment',
] as const
export type DefensiveInvalidationCondition =
  (typeof DEFENSIVE_INVALIDATION_CONDITIONS)[number]

export const DEFENSIVE_CONTROL_REASON_CODES = [
  'validated',
  'unknown_control_kind',
  'missing_target_geometry',
  'invalid_target_geometry',
  'collateral_risk_out_of_bounds',
  'unknown_outcome',
  'unknown_visible_state',
  'unknown_invalidation',
  'damage_only_mislabel',
  'malformed_input',
] as const
export type DefensiveControlReasonCode =
  (typeof DEFENSIVE_CONTROL_REASON_CODES)[number]

const GEOMETRY_REQUIRED: ReadonlySet<DefensiveControlKind> = new Set([
  'redirect',
  'block',
  'reposition',
  'cover',
  'intercept',
  'guard_objective',
  'prop_obstacles',
  'tactical_withdrawal',
])

/** Explicit damage-only markers that must never validate as defensive control. */
export const DAMAGE_ONLY_ACTION_MARKERS = [
  'strike',
  'shoot',
  'damage',
  'attack',
  'harm',
] as const
export type DamageOnlyActionMarker = (typeof DAMAGE_ONLY_ACTION_MARKERS)[number]

export interface TargetGeometry {
  readonly kind: TargetGeometryKind
  readonly refId: string
}

export interface DefensiveControlStaffActionInput {
  readonly actionId: string
  readonly controlKind: string
  readonly targetGeometry?: TargetGeometry | null
  readonly collateralRisk: string
  readonly intendedOutcomes: readonly string[]
  readonly visibleStates: readonly string[]
  readonly invalidationConditions?: readonly string[]
  /** When set, marks an explicit damage-only payload mislabeled as control. */
  readonly damageOnlyMarker?: string | null
  readonly posturePersistsWhileGuarded?: boolean
}

export interface DefensiveControlStaffAction {
  readonly schemaVersion: typeof DEFENSIVE_CONTROL_STAFF_ACTION_SCHEMA_VERSION
  readonly owner: typeof DEFENSIVE_CONTROL_STAFF_ACTION_OWNER
  readonly actionId: string
  readonly controlKind: DefensiveControlKind
  readonly targetGeometry: TargetGeometry | null
  readonly collateralRisk: CollateralRiskBand
  readonly intendedOutcomes: readonly DefensiveControlOutcome[]
  readonly visibleStates: readonly DefensiveVisibleState[]
  readonly invalidationConditions: readonly DefensiveInvalidationCondition[]
  readonly posturePersistsWhileGuarded: boolean
  readonly collapsesToExposed: boolean
}

export type ValidateDefensiveControlStaffActionResult =
  | {
      readonly ok: true
      readonly action: DefensiveControlStaffAction
      readonly reasonCode: 'validated'
    }
  | {
      readonly ok: false
      readonly reasonCode: Exclude<DefensiveControlReasonCode, 'validated'>
      readonly detail: string
    }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isDefensiveControlKind(value: unknown): value is DefensiveControlKind {
  return (
    typeof value === 'string' &&
    (DEFENSIVE_CONTROL_KINDS as readonly string[]).includes(value)
  )
}

function isTargetGeometryKind(value: unknown): value is TargetGeometryKind {
  return (
    typeof value === 'string' &&
    (TARGET_GEOMETRY_KINDS as readonly string[]).includes(value)
  )
}

function isCollateralRiskBand(value: unknown): value is CollateralRiskBand {
  return (
    typeof value === 'string' &&
    (COLLATERAL_RISK_BANDS as readonly string[]).includes(value)
  )
}

function isDefensiveControlOutcome(
  value: unknown
): value is DefensiveControlOutcome {
  return (
    typeof value === 'string' &&
    (DEFENSIVE_CONTROL_OUTCOMES as readonly string[]).includes(value)
  )
}

function isDefensiveVisibleState(value: unknown): value is DefensiveVisibleState {
  return (
    typeof value === 'string' &&
    (DEFENSIVE_VISIBLE_STATES as readonly string[]).includes(value)
  )
}

function isDefensiveInvalidationCondition(
  value: unknown
): value is DefensiveInvalidationCondition {
  return (
    typeof value === 'string' &&
    (DEFENSIVE_INVALIDATION_CONDITIONS as readonly string[]).includes(value)
  )
}

function freezeGeometry(geometry: TargetGeometry): TargetGeometry {
  return Object.freeze({
    kind: geometry.kind,
    refId: geometry.refId.trim(),
  })
}

/**
 * Validate a defensive-control staff action definition.
 * Fail-closed: unknown kinds, missing required geometry, out-of-bounds risk,
 * and damage-only mislabels are rejected without inventing combat results.
 */
export function validateDefensiveControlStaffAction(
  input: DefensiveControlStaffActionInput | null | undefined
): ValidateDefensiveControlStaffActionResult {
  if (input == null) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      detail: 'input required',
    }
  }

  if (!isNonEmptyString(input.actionId)) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      detail: 'actionId required',
    }
  }

  if (input.damageOnlyMarker != null && String(input.damageOnlyMarker).trim() !== '') {
    // Any present damage-only marker fails closed — known or unrecognized.
    return {
      ok: false,
      reasonCode: 'damage_only_mislabel',
      detail: `damage-only marker ${String(input.damageOnlyMarker).trim()} cannot validate as defensive control`,
    }
  }

  if (!isDefensiveControlKind(input.controlKind)) {
    return {
      ok: false,
      reasonCode: 'unknown_control_kind',
      detail: String(input.controlKind),
    }
  }

  const controlKind = input.controlKind
  const geometryRequired = GEOMETRY_REQUIRED.has(controlKind)
  let targetGeometry: TargetGeometry | null = null

  if (geometryRequired) {
    if (input.targetGeometry == null) {
      return {
        ok: false,
        reasonCode: 'missing_target_geometry',
        detail: `controlKind ${controlKind} requires targetGeometry`,
      }
    }
    if (
      !isTargetGeometryKind(input.targetGeometry.kind) ||
      !isNonEmptyString(input.targetGeometry.refId)
    ) {
      return {
        ok: false,
        reasonCode: 'invalid_target_geometry',
        detail: `invalid geometry for ${controlKind}`,
      }
    }
    targetGeometry = freezeGeometry(input.targetGeometry)
  } else if (input.targetGeometry != null) {
    if (
      !isTargetGeometryKind(input.targetGeometry.kind) ||
      !isNonEmptyString(input.targetGeometry.refId)
    ) {
      return {
        ok: false,
        reasonCode: 'invalid_target_geometry',
        detail: `invalid optional geometry for ${controlKind}`,
      }
    }
    targetGeometry = freezeGeometry(input.targetGeometry)
  }

  if (!isCollateralRiskBand(input.collateralRisk)) {
    return {
      ok: false,
      reasonCode: 'collateral_risk_out_of_bounds',
      detail: String(input.collateralRisk),
    }
  }

  if (!Array.isArray(input.intendedOutcomes) || input.intendedOutcomes.length === 0) {
    return {
      ok: false,
      reasonCode: 'unknown_outcome',
      detail: 'intendedOutcomes required',
    }
  }
  const intendedOutcomes: DefensiveControlOutcome[] = []
  for (const outcome of input.intendedOutcomes) {
    if (!isDefensiveControlOutcome(outcome)) {
      return {
        ok: false,
        reasonCode: 'unknown_outcome',
        detail: String(outcome),
      }
    }
    intendedOutcomes.push(outcome)
  }

  if (!Array.isArray(input.visibleStates) || input.visibleStates.length === 0) {
    return {
      ok: false,
      reasonCode: 'unknown_visible_state',
      detail: 'visibleStates required',
    }
  }
  const visibleStates: DefensiveVisibleState[] = []
  for (const state of input.visibleStates) {
    if (!isDefensiveVisibleState(state)) {
      return {
        ok: false,
        reasonCode: 'unknown_visible_state',
        detail: String(state),
      }
    }
    visibleStates.push(state)
  }

  const invalidationConditions: DefensiveInvalidationCondition[] = []
  for (const condition of input.invalidationConditions ?? []) {
    if (!isDefensiveInvalidationCondition(condition)) {
      return {
        ok: false,
        reasonCode: 'unknown_invalidation',
        detail: String(condition),
      }
    }
    invalidationConditions.push(condition)
  }

  if (typeof input.posturePersistsWhileGuarded !== 'boolean') {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      detail: 'posturePersistsWhileGuarded must be an explicit boolean',
    }
  }
  const posturePersistsWhileGuarded = input.posturePersistsWhileGuarded
  const collapsesToExposed =
    invalidationConditions.length > 0 || visibleStates.includes('exposed')

  return {
    ok: true,
    reasonCode: 'validated',
    action: Object.freeze({
      schemaVersion: DEFENSIVE_CONTROL_STAFF_ACTION_SCHEMA_VERSION,
      owner: DEFENSIVE_CONTROL_STAFF_ACTION_OWNER,
      actionId: input.actionId.trim(),
      controlKind,
      targetGeometry,
      collateralRisk: input.collateralRisk,
      intendedOutcomes: Object.freeze([...intendedOutcomes]),
      visibleStates: Object.freeze([...visibleStates]),
      invalidationConditions: Object.freeze([...invalidationConditions]),
      posturePersistsWhileGuarded,
      collapsesToExposed,
    }),
  }
}

/** True when personnel stay operational under a guarded posture. */
export function remainsOperationalWhileGuarded(
  action: Pick<DefensiveControlStaffAction, 'posturePersistsWhileGuarded' | 'visibleStates'>
): boolean {
  return (
    action.posturePersistsWhileGuarded && action.visibleStates.includes('guarded')
  )
}

/** True when posture collapse yields exposed/vulnerable rather than damage-only. */
export function collapsesToExposedOrVulnerable(
  action: Pick<DefensiveControlStaffAction, 'collapsesToExposed'>
): boolean {
  return action.collapsesToExposed
}
