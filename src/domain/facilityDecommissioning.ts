/**
 * SPE-3381 — facility phased decommissioning and closure-obligation coordinator (slice 1).
 *
 * Owns intake-stop → drawdown → final-closure assessment/apply. Invokes SPE-3380
 * lifecycle edges for drawdown and terminal closure; never mutates custody, transfer,
 * staffing, or dependency source authorities.
 */

import type { FacilityInstance, GameState } from './models'
import {
  applyFacilityLifecycleTransition,
  resolveFacilityLifecycleTransition,
  type FacilityLifecycleResult,
} from './facilityLifecycle'

export const FACILITY_DECOMMISSION_PHASES = [
  'intake_stopped',
  'drawdown',
  'closed',
] as const
export type FacilityDecommissionPhase = (typeof FACILITY_DECOMMISSION_PHASES)[number]

export const FACILITY_CLOSURE_OBLIGATION_KINDS = [
  'custody',
  'transfer',
  'staffing',
  'dependency',
] as const
export type FacilityClosureObligationKind = (typeof FACILITY_CLOSURE_OBLIGATION_KINDS)[number]

export const FACILITY_CLOSURE_OBLIGATION_DISPOSITIONS = [
  'clear',
  'pending',
  'indeterminate',
  'missing_authority',
] as const
export type FacilityClosureObligationDisposition =
  (typeof FACILITY_CLOSURE_OBLIGATION_DISPOSITIONS)[number]

export const FACILITY_CLOSURE_BLOCKER_REASONS = [
  'custody_pending',
  'custody_indeterminate',
  'custody_missing_authority',
  'transfer_pending',
  'transfer_indeterminate',
  'transfer_missing_authority',
  'staffing_pending',
  'staffing_indeterminate',
  'staffing_missing_authority',
  'dependency_pending',
  'dependency_indeterminate',
  'dependency_missing_authority',
  'malformed_obligation',
  'wrong_phase',
  'lifecycle_rejected',
  'invalid_request',
  'missing_facility',
] as const
export type FacilityClosureBlockerReason = (typeof FACILITY_CLOSURE_BLOCKER_REASONS)[number]

export interface FacilityClosureObligationAttestation {
  readonly kind: FacilityClosureObligationKind
  readonly disposition: FacilityClosureObligationDisposition
  /** Owning issue id or system key (e.g. SPE-3378). */
  readonly authority: string
  readonly sourceRef: string
}

export type FacilityDecommissioningState =
  | {
      readonly version: 1
      readonly phase: FacilityDecommissionPhase
      readonly facilityId: string
      readonly week: number
    }
  | { readonly version: 1; readonly unavailable: true }

export type FacilityDecommissionOutcome = 'applied' | 'unchanged' | 'rejected'

export interface FacilityDecommissionResult {
  readonly outcome: FacilityDecommissionOutcome
  readonly facility: FacilityInstance | undefined
  readonly blockers: readonly FacilityClosureBlockerReason[]
  readonly phase?: FacilityDecommissionPhase
  readonly lifecycle?: FacilityLifecycleResult
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function reference(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.trim() === value &&
    !['__proto__', 'constructor', 'prototype'].includes(value)
  )
}

function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isPhase(value: unknown): value is FacilityDecommissionPhase {
  return FACILITY_DECOMMISSION_PHASES.some((phase) => phase === value)
}

function isObligationKind(value: unknown): value is FacilityClosureObligationKind {
  return FACILITY_CLOSURE_OBLIGATION_KINDS.some((kind) => kind === value)
}

function isDisposition(value: unknown): value is FacilityClosureObligationDisposition {
  return FACILITY_CLOSURE_OBLIGATION_DISPOSITIONS.some((disposition) => disposition === value)
}

/** Invalid present coordinator state must not become a newly usable authority. */
export function normalizeFacilityDecommissioning(
  value: unknown,
  facilityId: string
): FacilityDecommissioningState | undefined {
  if (value === undefined) return undefined
  const unavailable = { version: 1, unavailable: true } as const
  if (!record(value) || value.version !== 1) return unavailable
  if (value.unavailable === true) {
    if (Object.keys(value).length === 2) return unavailable
    return unavailable
  }
  if (
    !isPhase(value.phase) ||
    value.facilityId !== facilityId ||
    !positiveInteger(value.week) ||
    !reference(value.facilityId)
  )
    return unavailable
  return {
    version: 1,
    phase: value.phase,
    facilityId,
    week: value.week,
  }
}

function phaseOf(facility: FacilityInstance | undefined): FacilityDecommissionPhase | undefined {
  if (!facility?.decommissioning || 'unavailable' in facility.decommissioning) return undefined
  return facility.decommissioning.phase
}

function reject(
  facility: FacilityInstance | undefined,
  blockers: readonly FacilityClosureBlockerReason[]
): FacilityDecommissionResult {
  return { outcome: 'rejected', facility, blockers: Object.freeze([...blockers]) }
}

function parseObligations(
  value: unknown
):
  | { readonly ok: true; readonly attestations: readonly FacilityClosureObligationAttestation[] }
  | { readonly ok: false; readonly blockers: readonly FacilityClosureBlockerReason[] } {
  if (!Array.isArray(value) || value.length !== FACILITY_CLOSURE_OBLIGATION_KINDS.length) {
    return { ok: false, blockers: Object.freeze(['malformed_obligation']) }
  }
  const seen = new Set<FacilityClosureObligationKind>()
  const attestations: FacilityClosureObligationAttestation[] = []
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      return { ok: false, blockers: Object.freeze(['malformed_obligation']) }
    }
    const entry: unknown = value[index]
    if (
      !record(entry) ||
      !isObligationKind(entry.kind) ||
      !isDisposition(entry.disposition) ||
      !reference(entry.authority) ||
      !reference(entry.sourceRef) ||
      seen.has(entry.kind)
    ) {
      return { ok: false, blockers: Object.freeze(['malformed_obligation']) }
    }
    seen.add(entry.kind)
    attestations.push({
      kind: entry.kind,
      disposition: entry.disposition,
      authority: entry.authority,
      sourceRef: entry.sourceRef,
    })
  }
  for (const kind of FACILITY_CLOSURE_OBLIGATION_KINDS) {
    if (!seen.has(kind)) {
      return { ok: false, blockers: Object.freeze(['malformed_obligation']) }
    }
  }
  return { ok: true, attestations: Object.freeze(attestations) }
}

/**
 * Read-only closure blockers from caller-owned obligation attestations.
 * Does not mutate facility or source authorities.
 */
export function assessFacilityClosureObligations(
  obligations: unknown
): readonly FacilityClosureBlockerReason[] {
  const parsed = parseObligations(obligations)
  if (!parsed.ok) return parsed.blockers
  const blockers: FacilityClosureBlockerReason[] = []
  for (const attestation of parsed.attestations) {
    if (attestation.disposition === 'clear') continue
    if (attestation.disposition === 'pending') {
      blockers.push(`${attestation.kind}_pending` as FacilityClosureBlockerReason)
      continue
    }
    if (attestation.disposition === 'indeterminate') {
      blockers.push(`${attestation.kind}_indeterminate` as FacilityClosureBlockerReason)
      continue
    }
    blockers.push(`${attestation.kind}_missing_authority` as FacilityClosureBlockerReason)
  }
  return Object.freeze(blockers)
}

/**
 * Stop new intake while the facility remains active and responsible for live obligations.
 */
export function stopFacilityIntake(
  facility: FacilityInstance | undefined,
  facilityId: string,
  week: number
): FacilityDecommissionResult {
  if (!reference(facilityId) || !positiveInteger(week)) {
    return reject(facility, ['invalid_request'])
  }
  if (!facility || facility.facilityId !== facilityId) {
    return reject(facility, ['missing_facility'])
  }
  const decommissioning = normalizeFacilityDecommissioning(facility.decommissioning, facilityId)
  if (decommissioning && 'unavailable' in decommissioning) {
    return reject(facility, ['invalid_request'])
  }
  const phase = decommissioning?.phase
  if (phase === 'intake_stopped') {
    return {
      outcome: 'unchanged',
      facility,
      blockers: Object.freeze([]),
      phase: 'intake_stopped',
    }
  }
  if (phase === 'drawdown' || phase === 'closed') {
    return reject(facility, ['wrong_phase'])
  }
  if (facility.status !== 'active') {
    return reject(facility, ['wrong_phase'])
  }
  const next: FacilityInstance = {
    ...facility,
    decommissioning: {
      version: 1,
      phase: 'intake_stopped',
      facilityId,
      week,
    },
  }
  return {
    outcome: 'applied',
    facility: next,
    blockers: Object.freeze([]),
    phase: 'intake_stopped',
  }
}

/**
 * Enter drawdown: invoke SPE-3380 `begin_decommission_drawdown` and advance coordinator phase.
 */
export function enterFacilityDecommissionDrawdown(
  source: GameState,
  facilityId: string,
  transition: number
): FacilityDecommissionResult & { readonly game: GameState } {
  if (!reference(facilityId) || !positiveInteger(transition) || !positiveInteger(source.week)) {
    return { ...reject(undefined, ['invalid_request']), game: source }
  }
  const facility =
    source.facilityState?.facilities && Object.hasOwn(source.facilityState.facilities, facilityId)
      ? source.facilityState.facilities[facilityId]
      : undefined
  if (!facility) {
    return { ...reject(undefined, ['missing_facility']), game: source }
  }
  const decommissioning = normalizeFacilityDecommissioning(facility.decommissioning, facilityId)
  if (decommissioning && 'unavailable' in decommissioning) {
    return { ...reject(facility, ['invalid_request']), game: source }
  }
  if (decommissioning?.phase === 'drawdown' && facility.status === 'locked') {
    return {
      outcome: 'unchanged',
      facility,
      blockers: Object.freeze([]),
      phase: 'drawdown',
      game: source,
    }
  }
  if (phaseOf(facility) !== 'intake_stopped' || facility.status !== 'active') {
    return { ...reject(facility, ['wrong_phase']), game: source }
  }
  const lifecycle = applyFacilityLifecycleTransition(source, {
    facilityId,
    expectedStatus: 'active',
    transition,
    action: 'begin_decommission_drawdown',
  })
  if (lifecycle.outcome !== 'applied' || !lifecycle.facility) {
    return {
      outcome: 'rejected',
      facility,
      blockers: Object.freeze(['lifecycle_rejected']),
      lifecycle,
      game: source,
    }
  }
  const nextFacility: FacilityInstance = {
    ...lifecycle.facility,
    decommissioning: {
      version: 1,
      phase: 'drawdown',
      facilityId,
      week: source.week,
    },
  }
  return {
    outcome: 'applied',
    facility: nextFacility,
    blockers: Object.freeze([]),
    phase: 'drawdown',
    lifecycle,
    game: {
      ...lifecycle.game,
      facilityState: {
        ...lifecycle.game.facilityState,
        facilities: {
          ...lifecycle.game.facilityState?.facilities,
          [facilityId]: nextFacility,
        },
      },
    },
  }
}

/**
 * Finalize closure only when all caller-owned obligations are clear; invokes SPE-3380
 * `finalize_closure`. Failed attempts retain the exact GameState.
 */
export function finalizeFacilityClosure(
  source: GameState,
  facilityId: string,
  transition: number,
  obligations: unknown
): FacilityDecommissionResult & { readonly game: GameState } {
  if (!reference(facilityId) || !positiveInteger(transition) || !positiveInteger(source.week)) {
    return { ...reject(undefined, ['invalid_request']), game: source }
  }
  const facility =
    source.facilityState?.facilities && Object.hasOwn(source.facilityState.facilities, facilityId)
      ? source.facilityState.facilities[facilityId]
      : undefined
  if (!facility) {
    return { ...reject(undefined, ['missing_facility']), game: source }
  }
  const decommissioning = normalizeFacilityDecommissioning(facility.decommissioning, facilityId)
  if (decommissioning && 'unavailable' in decommissioning) {
    return { ...reject(facility, ['invalid_request']), game: source }
  }
  if (decommissioning?.phase === 'closed' && facility.status === 'inactive') {
    return {
      outcome: 'unchanged',
      facility,
      blockers: Object.freeze([]),
      phase: 'closed',
      game: source,
    }
  }
  if (phaseOf(facility) !== 'drawdown' || facility.status !== 'locked') {
    return { ...reject(facility, ['wrong_phase']), game: source }
  }
  const blockers = assessFacilityClosureObligations(obligations)
  if (blockers.length > 0) {
    return { ...reject(facility, blockers), game: source }
  }
  const lifecycle = applyFacilityLifecycleTransition(source, {
    facilityId,
    expectedStatus: 'locked',
    transition,
    action: 'finalize_closure',
  })
  if (lifecycle.outcome !== 'applied' || !lifecycle.facility) {
    return {
      outcome: 'rejected',
      facility,
      blockers: Object.freeze(['lifecycle_rejected']),
      lifecycle,
      game: source,
    }
  }
  const nextFacility: FacilityInstance = {
    ...lifecycle.facility,
    decommissioning: {
      version: 1,
      phase: 'closed',
      facilityId,
      week: source.week,
    },
  }
  return {
    outcome: 'applied',
    facility: nextFacility,
    blockers: Object.freeze([]),
    phase: 'closed',
    lifecycle,
    game: {
      ...lifecycle.game,
      facilityState: {
        ...lifecycle.game.facilityState,
        facilities: {
          ...lifecycle.game.facilityState?.facilities,
          [facilityId]: nextFacility,
        },
      },
    },
  }
}

/** Pure proposal for drawdown without GameState mutation (tests / consumers). */
export function resolveFacilityDecommissionDrawdown(
  facility: FacilityInstance | undefined,
  facilityId: string,
  transition: number,
  campaignWeek: number
): FacilityDecommissionResult {
  if (!reference(facilityId) || !positiveInteger(transition) || !positiveInteger(campaignWeek)) {
    return reject(facility, ['invalid_request'])
  }
  if (!facility || facility.facilityId !== facilityId) {
    return reject(facility, ['missing_facility'])
  }
  if (phaseOf(facility) !== 'intake_stopped' || facility.status !== 'active') {
    return reject(facility, ['wrong_phase'])
  }
  const lifecycle = resolveFacilityLifecycleTransition(
    facility,
    {
      facilityId,
      expectedStatus: 'active',
      transition,
      action: 'begin_decommission_drawdown',
    },
    campaignWeek
  )
  if (lifecycle.outcome !== 'applied' || !lifecycle.facility) {
    return {
      outcome: 'rejected',
      facility,
      blockers: Object.freeze(['lifecycle_rejected']),
      lifecycle,
    }
  }
  return {
    outcome: 'applied',
    facility: {
      ...lifecycle.facility,
      decommissioning: {
        version: 1,
        phase: 'drawdown',
        facilityId,
        week: campaignWeek,
      },
    },
    blockers: Object.freeze([]),
    phase: 'drawdown',
    lifecycle,
  }
}
