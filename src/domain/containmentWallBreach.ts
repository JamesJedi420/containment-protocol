/**
 * SPE-471 — catastrophic containment-wall breach states (pure, caller-owned).
 *
 * Barriers hold real external media and, when punctured, spread into adjacent
 * zones on a short timer with optional flow/power-loss coupling and physical
 * actuation handoff. Distinct from ordinary trap discharge. Does not own
 * SPE-2101 automation registry metadata.
 */

import { assertNonEmptyId, assertSafeIntegerInRange } from './assertBoundedInteger'

export const CONTAINMENT_WALL_BREACH_OWNER = 'SPE-471' as const

export type ExternalHazardMedium = 'water' | 'vacuum' | 'pressure' | 'toxic_atmosphere'

export type BreachSpreadMode = 'flood' | 'vent' | 'inundate'

export type BreachCouplingTrigger = 'flow_loss' | 'power_loss' | 'none'

export type BreachActuationKind = 'seal' | 'vent' | 'lockdown'

export type BreachEventKind = 'catastrophic_wall_breach' | 'ordinary_trap_discharge'

export interface ContainmentWallBarrier {
  readonly id: string
  readonly heldMedium: ExternalHazardMedium
  readonly intact: boolean
  /** True for submerged / pressure shells that couple loss triggers on breach. */
  readonly pressureBoundary: boolean
}

export interface ContainmentWallBreachPlan {
  readonly barrierId: string
  readonly eventKind: BreachEventKind
  readonly spreadMode: BreachSpreadMode
  readonly adjacentZoneIds: readonly string[]
  /** Ticks until spread reaches adjacent zones (1–10). */
  readonly spreadDelayTicks: number
  readonly actuation: BreachActuationKind
}

export interface ContainmentWallBreachState {
  readonly barrierId: string
  readonly eventKind: BreachEventKind
  readonly medium: ExternalHazardMedium
  readonly spreadMode: BreachSpreadMode
  /** Planned adjacent zones captured at initiation (authoritative flood set). */
  readonly plannedZoneIds: readonly string[]
  readonly floodedZoneIds: readonly string[]
  readonly ticksRemaining: number
  readonly complete: boolean
  readonly coupling: BreachCouplingTrigger
  readonly actuationHandoff: BreachActuationKind | null
  readonly catastrophic: boolean
  readonly owner: typeof CONTAINMENT_WALL_BREACH_OWNER
}

const MEDIA = new Set<ExternalHazardMedium>(['water', 'vacuum', 'pressure', 'toxic_atmosphere'])
const SPREAD = new Set<BreachSpreadMode>(['flood', 'vent', 'inundate'])
const ACTUATION = new Set<BreachActuationKind>(['seal', 'vent', 'lockdown'])
const EVENTS = new Set<BreachEventKind>(['catastrophic_wall_breach', 'ordinary_trap_discharge'])

function assertUniqueZoneIds(ids: readonly string[]): readonly string[] {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('adjacentZoneIds must be a non-empty array')
  }
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of ids) {
    const id = assertNonEmptyId(raw, 'adjacentZoneId')
    if (seen.has(id)) throw new Error('adjacentZoneIds must be unique')
    seen.add(id)
    out.push(id)
  }
  return Object.freeze(out)
}

export function createContainmentWallBarrier(
  input: ContainmentWallBarrier
): ContainmentWallBarrier {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('containment wall barrier is required')
  }
  const id = assertNonEmptyId(input.id, 'id')
  if (!MEDIA.has(input.heldMedium)) throw new Error('heldMedium is invalid')
  if (typeof input.intact !== 'boolean') throw new Error('intact must be boolean')
  if (typeof input.pressureBoundary !== 'boolean') {
    throw new Error('pressureBoundary must be boolean')
  }
  return Object.freeze({
    id,
    heldMedium: input.heldMedium,
    intact: input.intact,
    pressureBoundary: input.pressureBoundary,
  })
}

export function createContainmentWallBreachPlan(
  input: ContainmentWallBreachPlan
): ContainmentWallBreachPlan {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('containment wall breach plan is required')
  }
  const barrierId = assertNonEmptyId(input.barrierId, 'barrierId')
  if (!EVENTS.has(input.eventKind)) throw new Error('eventKind is invalid')
  if (!SPREAD.has(input.spreadMode)) throw new Error('spreadMode is invalid')
  if (!ACTUATION.has(input.actuation)) throw new Error('actuation is invalid')
  const spreadDelayTicks = assertSafeIntegerInRange(
    input.spreadDelayTicks,
    'spreadDelayTicks',
    1,
    10
  )
  const adjacentZoneIds = assertUniqueZoneIds(input.adjacentZoneIds)
  return Object.freeze({
    barrierId,
    eventKind: input.eventKind,
    spreadMode: input.spreadMode,
    adjacentZoneIds,
    spreadDelayTicks,
    actuation: input.actuation,
  })
}

function couplingForBarrier(barrier: ContainmentWallBarrier): BreachCouplingTrigger {
  if (!barrier.pressureBoundary) return 'none'
  switch (barrier.heldMedium) {
    case 'water':
    case 'pressure':
    case 'toxic_atmosphere':
      return 'flow_loss'
    case 'vacuum':
      return 'power_loss'
    default: {
      const _exhaustive: never = barrier.heldMedium
      throw new Error(`unhandled heldMedium in couplingForBarrier: ${_exhaustive}`)
    }
  }
}

/**
 * Puncture an intact barrier. Ordinary trap discharge does not become a
 * catastrophic multi-zone wall breach.
 */
export function initiateContainmentWallBreach(
  barrierInput: ContainmentWallBarrier,
  planInput: ContainmentWallBreachPlan
): ContainmentWallBreachState {
  const barrier = createContainmentWallBarrier(barrierInput)
  const plan = createContainmentWallBreachPlan(planInput)
  if (plan.barrierId !== barrier.id) throw new Error('breach plan barrierId mismatch')
  if (!barrier.intact) throw new Error('barrier is already breached')

  if (plan.eventKind === 'ordinary_trap_discharge') {
    return Object.freeze({
      barrierId: barrier.id,
      eventKind: 'ordinary_trap_discharge',
      medium: barrier.heldMedium,
      spreadMode: plan.spreadMode,
      plannedZoneIds: plan.adjacentZoneIds,
      floodedZoneIds: Object.freeze([] as string[]),
      ticksRemaining: 0,
      complete: true,
      coupling: 'none',
      actuationHandoff: null,
      catastrophic: false,
      owner: CONTAINMENT_WALL_BREACH_OWNER,
    })
  }

  return Object.freeze({
    barrierId: barrier.id,
    eventKind: 'catastrophic_wall_breach',
    medium: barrier.heldMedium,
    spreadMode: plan.spreadMode,
    plannedZoneIds: plan.adjacentZoneIds,
    floodedZoneIds: Object.freeze([] as string[]),
    ticksRemaining: plan.spreadDelayTicks,
    complete: false,
    coupling: couplingForBarrier(barrier),
    actuationHandoff: plan.actuation,
    catastrophic: true,
    owner: CONTAINMENT_WALL_BREACH_OWNER,
  })
}

/** Advance the breach timer; on zero, flood all planned adjacent zones. */
export function advanceContainmentWallBreach(
  state: ContainmentWallBreachState,
  ticks: number = 1
): ContainmentWallBreachState {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) {
    throw new Error('containment wall breach state is required')
  }
  if (state.owner !== CONTAINMENT_WALL_BREACH_OWNER) {
    throw new Error('containment wall breach owner mismatch')
  }
  if (!state.catastrophic) {
    throw new Error('ordinary trap discharge has no breach timer')
  }
  if (state.complete) throw new Error('breach spread already complete')
  const tickCount = assertSafeIntegerInRange(ticks, 'ticks', 1, 10)
  const ticksRemaining = Math.max(0, state.ticksRemaining - tickCount)
  if (ticksRemaining > 0) {
    return Object.freeze({ ...state, ticksRemaining })
  }
  return Object.freeze({
    ...state,
    ticksRemaining: 0,
    complete: true,
    floodedZoneIds: state.plannedZoneIds,
  })
}

export function isCatastrophicWallBreach(state: ContainmentWallBreachState): boolean {
  return state.catastrophic && state.eventKind === 'catastrophic_wall_breach'
}
