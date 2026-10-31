/**
 * SPE-953 — persistent scent tracking and masking countermeasures (pure).
 *
 * Durable scent-lock pursuit with bounded masking windows, pre-encounter prep,
 * and contamination/reacquisition risk. Distinct from nearby smell checks.
 * No universal smell simulator or GameState.
 */

import { assertNonEmptyId, assertSafeIntegerInRange } from './assertBoundedInteger'

export const PERSISTENT_SCENT_TRACKING_OWNER = 'SPE-953' as const

export type ScentAcquisitionSource = 'target_contact' | 'object' | 'prior_contact_event'

export type MaskingAgentKind = 'herbs' | 'smoke' | 'ash' | 'oils'

export type PrepSurface = 'clothing' | 'vehicle' | 'gear' | 'route'

export type ContaminationTrigger =
  'injury' | 'close_contact' | 'fresh_clothing' | 'weather_shift' | 'environmental_reset'

export type PursuitChannel = 'durable_scent_lock' | 'nearby_smell_check' | 'one_use_directional'

export interface ScentLock {
  readonly id: string
  readonly hostileId: string
  readonly targetId: string
  readonly source: ScentAcquisitionSource
  readonly channel: PursuitChannel
  /** Remaining ticks the lock persists across locations (0–100). */
  readonly persistenceTicks: number
  readonly active: boolean
  readonly owner: typeof PERSISTENT_SCENT_TRACKING_OWNER
}

export interface MaskingPreparation {
  readonly id: string
  readonly agent: MaskingAgentKind
  readonly surface: PrepSurface
  /** Masking quality 1–10; higher = more pursuit reduction. */
  readonly quality: number
  /** Remaining effective ticks (1–20). */
  readonly durationTicks: number
}

export interface ScentPursuitState {
  readonly lock: ScentLock
  readonly masking: MaskingPreparation | null
  /** Extra reliability from contamination (preserved across masking ticks). */
  readonly contaminationBonus: number
  /** Pursuit reliability 0–100 after masking/contamination. */
  readonly pursuitReliability: number
  readonly reacquisitionRisk: boolean
  readonly planChangeRequired: boolean
  readonly planChangeReason: string | null
  readonly preEncounterPrepApplied: boolean
  readonly owner: typeof PERSISTENT_SCENT_TRACKING_OWNER
}

const SOURCES = new Set<ScentAcquisitionSource>(['target_contact', 'object', 'prior_contact_event'])
const AGENTS = new Set<MaskingAgentKind>(['herbs', 'smoke', 'ash', 'oils'])
const SURFACES = new Set<PrepSurface>(['clothing', 'vehicle', 'gear', 'route'])
const CONTAMINATION = new Set<ContaminationTrigger>([
  'injury',
  'close_contact',
  'fresh_clothing',
  'weather_shift',
  'environmental_reset',
])
const CHANNELS = new Set<PursuitChannel>([
  'durable_scent_lock',
  'nearby_smell_check',
  'one_use_directional',
])

const BASE_DURABLE_RELIABILITY = 80 as const
const CONTAMINATION_RELIABILITY_BUMP = 15 as const

export function acquireDurableScentLock(input: {
  readonly id: string
  readonly hostileId: string
  readonly targetId: string
  readonly source: ScentAcquisitionSource
  readonly persistenceTicks: number
}): ScentLock {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('scent lock input is required')
  }
  const id = assertNonEmptyId(input.id, 'id')
  const hostileId = assertNonEmptyId(input.hostileId, 'hostileId')
  const targetId = assertNonEmptyId(input.targetId, 'targetId')
  if (!SOURCES.has(input.source)) throw new Error('scent acquisition source is invalid')
  const persistenceTicks = assertSafeIntegerInRange(
    input.persistenceTicks,
    'persistenceTicks',
    1,
    100
  )
  return Object.freeze({
    id,
    hostileId,
    targetId,
    source: input.source,
    channel: 'durable_scent_lock' as const,
    persistenceTicks,
    active: true,
    owner: PERSISTENT_SCENT_TRACKING_OWNER,
  })
}

export function createMaskingPreparation(input: MaskingPreparation): MaskingPreparation {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('masking preparation is required')
  }
  const id = assertNonEmptyId(input.id, 'id')
  if (!AGENTS.has(input.agent)) throw new Error('masking agent is invalid')
  if (!SURFACES.has(input.surface)) throw new Error('prep surface is invalid')
  const quality = assertSafeIntegerInRange(input.quality, 'quality', 1, 10)
  const durationTicks = assertSafeIntegerInRange(input.durationTicks, 'durationTicks', 1, 20)
  return Object.freeze({ id, agent: input.agent, surface: input.surface, quality, durationTicks })
}

function assertScentLock(lock: ScentLock): ScentLock {
  if (typeof lock !== 'object' || lock === null || Array.isArray(lock)) {
    throw new Error('scent lock is required')
  }
  if (lock.owner !== PERSISTENT_SCENT_TRACKING_OWNER) throw new Error('scent lock owner mismatch')
  if (!CHANNELS.has(lock.channel)) throw new Error('pursuit channel is invalid')
  if (lock.channel !== 'durable_scent_lock') {
    throw new Error('only durable scent locks enter pursuit state')
  }
  if (!lock.active) throw new Error('scent lock is inactive')
  return lock
}

function reliabilityFromParts(
  masking: MaskingPreparation | null,
  contaminationBonus: number
): number {
  const masked =
    !masking || masking.durationTicks < 1
      ? BASE_DURABLE_RELIABILITY
      : Math.max(0, BASE_DURABLE_RELIABILITY - masking.quality * 6)
  return Math.min(100, masked + contaminationBonus)
}

/**
 * Open pursuit state from a durable lock, optionally with pre-encounter prep.
 */
export function openScentPursuit(
  lockInput: ScentLock,
  maskingInput: MaskingPreparation | null = null
): ScentPursuitState {
  const lock = assertScentLock(lockInput)
  const masking = maskingInput === null ? null : createMaskingPreparation(maskingInput)
  return Object.freeze({
    lock,
    masking,
    contaminationBonus: 0,
    pursuitReliability: reliabilityFromParts(masking, 0),
    reacquisitionRisk: false,
    planChangeRequired: false,
    planChangeReason: null,
    preEncounterPrepApplied: masking !== null,
    owner: PERSISTENT_SCENT_TRACKING_OWNER,
  })
}

/**
 * Advance masking duration and lock persistence together. Contamination bonus
 * is preserved when reliability is recomputed.
 */
export function advanceScentMasking(
  state: ScentPursuitState,
  ticks: number = 1
): ScentPursuitState {
  assertPursuitState(state)
  if (!state.lock.active) throw new Error('scent lock is inactive')
  const tickCount = assertSafeIntegerInRange(ticks, 'ticks', 1, 20)

  const persistenceRemaining = Math.max(0, state.lock.persistenceTicks - tickCount)
  const lock = Object.freeze({
    ...state.lock,
    persistenceTicks: persistenceRemaining,
    active: persistenceRemaining > 0,
  })

  let masking = state.masking
  if (masking) {
    const remaining = Math.max(0, masking.durationTicks - tickCount)
    masking = remaining === 0 ? null : Object.freeze({ ...masking, durationTicks: remaining })
  }

  return Object.freeze({
    ...state,
    lock,
    masking,
    pursuitReliability: lock.active ? reliabilityFromParts(masking, state.contaminationBonus) : 0,
  })
}

/**
 * Apply contamination / reacquisition. Raises risk and requires a plan change
 * when a durable lock is still active. Bonus persists across masking advances.
 */
export function applyScentContamination(
  state: ScentPursuitState,
  trigger: ContaminationTrigger
): ScentPursuitState {
  assertPursuitState(state)
  if (!state.lock.active) throw new Error('scent lock is inactive')
  if (!CONTAMINATION.has(trigger)) throw new Error('contamination trigger is invalid')
  const contaminationBonus = Math.min(
    100,
    state.contaminationBonus + CONTAMINATION_RELIABILITY_BUMP
  )
  const reason = `scent reacquisition risk from ${trigger}`
  return Object.freeze({
    ...state,
    contaminationBonus,
    reacquisitionRisk: true,
    planChangeRequired: true,
    planChangeReason: reason,
    pursuitReliability: reliabilityFromParts(state.masking, contaminationBonus),
  })
}

export function isDurableScentLock(lock: ScentLock): boolean {
  return lock.channel === 'durable_scent_lock' && lock.active
}

function assertPursuitState(state: ScentPursuitState): void {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) {
    throw new Error('scent pursuit state is required')
  }
  if (state.owner !== PERSISTENT_SCENT_TRACKING_OWNER) {
    throw new Error('scent pursuit owner mismatch')
  }
}
