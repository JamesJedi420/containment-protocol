// Squad shift schedule assignment and availability derivation seam (SPE-1311)
// Domain-only, deterministic, no RNG, no models.ts widening, no UI, no store
import type { SquadMetadata } from './squadMetadata'

// ── Duty states ──────────────────────────────────────────────────────────────

export type SquadDutyState =
  | 'normal_ops'
  | 'patrol'
  | 'training'
  | 'standby'
  | 'transfer_escort'
  | 'lockdown'
  | 'breach_response'

const VALID_DUTY_STATES = new Set<SquadDutyState>([
  'normal_ops',
  'patrol',
  'training',
  'standby',
  'transfer_escort',
  'lockdown',
  'breach_response',
])

// ── Stored shift record ───────────────────────────────────────────────────────

export interface SquadShiftRecord {
  squadId: string
  dutyState: SquadDutyState
}

// ── assignSquadShift ──────────────────────────────────────────────────────────

export type SquadShiftAssignFailure = 'missing_squad_id' | 'invalid_duty_state'

export type SquadShiftAssignResult =
  | { ok: true; record: SquadShiftRecord }
  | { ok: false; code: SquadShiftAssignFailure }

export function assignSquadShift(
  squadId: string | undefined | null,
  dutyState: string | undefined | null
): SquadShiftAssignResult {
  if (!squadId || typeof squadId !== 'string' || squadId.trim().length === 0) {
    return { ok: false, code: 'missing_squad_id' }
  }
  if (!dutyState || !VALID_DUTY_STATES.has(dutyState as SquadDutyState)) {
    return { ok: false, code: 'invalid_duty_state' }
  }
  return {
    ok: true,
    record: { squadId: squadId.trim(), dutyState: dutyState as SquadDutyState },
  }
}

// ── Availability tier + capacity rules ───────────────────────────────────────

export type SquadAvailabilityTier = 'full' | 'reduced' | 'unavailable'

/**
 * Compact rule set — one source of truth for how each duty state maps to capacity.
 * full      → effectiveCapacityRatio = 1.0  (all slots deployable)
 * reduced   → effectiveCapacityRatio = 0.5  (half of slots deployable, floor)
 * unavailable → effectiveCapacityRatio = 0  (no slots deployable)
 */
const DUTY_STATE_TIER: Record<SquadDutyState, SquadAvailabilityTier> = {
  normal_ops: 'full',
  standby: 'full',
  patrol: 'reduced',
  training: 'reduced',
  transfer_escort: 'reduced',
  lockdown: 'unavailable',
  breach_response: 'unavailable',
}

const TIER_CAPACITY_RATIO: Record<SquadAvailabilityTier, number> = {
  full: 1.0,
  reduced: 0.5,
  unavailable: 0.0,
}

// ── SquadAvailabilitySummary ──────────────────────────────────────────────────

export interface SquadAvailabilitySummary {
  squadId: string
  dutyState: SquadDutyState
  availabilityTier: SquadAvailabilityTier
  /** Slots that may be assigned to a deployment. */
  deployableSlots: number
  /** Slots withheld by the current duty state. */
  unavailableSlots: number
  /** Fraction of total capacity currently deployable (0–1). */
  effectiveCapacityRatio: number
}

// ── deriveSquadAvailability ───────────────────────────────────────────────────

/**
 * Derives availability state layered on top of the existing roster.
 *
 * @param squad        - The squad whose availability is being derived.
 * @param dutyState    - The duty state currently assigned to the squad.
 * @param totalSlots   - Total number of roster slots in the squad (default 4).
 *
 * The roster itself is never mutated; this is pure derived state.
 */
export function deriveSquadAvailability(
  squad: SquadMetadata,
  dutyState: SquadDutyState,
  totalSlots = 4
): SquadAvailabilitySummary {
  const tier = DUTY_STATE_TIER[dutyState]
  const ratio = TIER_CAPACITY_RATIO[tier]
  const deployableSlots = Math.floor(totalSlots * ratio)
  const unavailableSlots = totalSlots - deployableSlots

  return {
    squadId: squad.squadId,
    dutyState,
    availabilityTier: tier,
    deployableSlots,
    unavailableSlots,
    effectiveCapacityRatio: ratio,
  }
}
