/**
 * SPE-470 — belief-lock environmental illusion states (pure, caller-owned).
 *
 * Environment-scale illusions can lock actor belief and block contradictory
 * actions. Forced extraction yields post-removal impairment. Distinct from
 * concealment-only overlays. No dream simulator or GameState.
 */

import { assertNonEmptyId, assertSafeIntegerInRange } from './assertBoundedInteger'

export const BELIEF_LOCK_ILLUSION_OWNER = 'SPE-470' as const

/** Default wisdom at or below which actors accept the false environment. */
export const DEFAULT_BELIEF_LOCK_WISDOM_THRESHOLD = 8 as const

export type IllusionScale = 'cosmetic_concealment' | 'environment_belief_lock'

export type ExtractionImpairment = 'none' | 'collapse' | 'incap'

export type ContradictoryAction =
  'leave_setpiece' | 'attack_illusion_source' | 'report_false_environment'

export interface IllusionActor {
  readonly id: string
  /** Wisdom score 1–20. */
  readonly wisdom: number
  /** Explicit vulnerability (fear, trauma, compromised cognition). */
  readonly vulnerable: boolean
}

export interface EnvironmentalIllusion {
  readonly id: string
  readonly scale: IllusionScale
  /** Wisdom at or below this value belief-locks (1–20). */
  readonly wisdomThreshold: number
}

export interface BeliefLockState {
  readonly illusionId: string
  readonly actorId: string
  readonly scale: IllusionScale
  readonly beliefLocked: boolean
  readonly refusedActions: readonly ContradictoryAction[]
  readonly extractionImpairment: ExtractionImpairment
  readonly extracted: boolean
  readonly owner: typeof BELIEF_LOCK_ILLUSION_OWNER
}

const SCALES = new Set<IllusionScale>(['cosmetic_concealment', 'environment_belief_lock'])
const ACTIONS = new Set<ContradictoryAction>([
  'leave_setpiece',
  'attack_illusion_source',
  'report_false_environment',
])
const IMPAIRMENTS = new Set<ExtractionImpairment>(['none', 'collapse', 'incap'])

const ALL_CONTRADICTORY: readonly ContradictoryAction[] = Object.freeze([
  'leave_setpiece',
  'attack_illusion_source',
  'report_false_environment',
])

export function createIllusionActor(input: IllusionActor): IllusionActor {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('illusion actor is required')
  }
  const id = assertNonEmptyId(input.id, 'id')
  const wisdom = assertSafeIntegerInRange(input.wisdom, 'wisdom', 1, 20)
  if (typeof input.vulnerable !== 'boolean') throw new Error('vulnerable must be boolean')
  return Object.freeze({ id, wisdom, vulnerable: input.vulnerable })
}

export function createEnvironmentalIllusion(input: EnvironmentalIllusion): EnvironmentalIllusion {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('environmental illusion is required')
  }
  const id = assertNonEmptyId(input.id, 'id')
  if (!SCALES.has(input.scale)) throw new Error('illusion scale is invalid')
  const wisdomThreshold = assertSafeIntegerInRange(input.wisdomThreshold, 'wisdomThreshold', 1, 20)
  return Object.freeze({ id, scale: input.scale, wisdomThreshold })
}

function shouldBeliefLock(actor: IllusionActor, illusion: EnvironmentalIllusion): boolean {
  if (illusion.scale !== 'environment_belief_lock') return false
  return actor.vulnerable || actor.wisdom <= illusion.wisdomThreshold
}

/**
 * Enter an environmental illusion. Cosmetic concealment never belief-locks;
 * environment-scale illusions lock low-wisdom or vulnerable actors.
 */
export function enterEnvironmentalIllusion(
  illusionInput: EnvironmentalIllusion,
  actorInput: IllusionActor
): BeliefLockState {
  const illusion = createEnvironmentalIllusion(illusionInput)
  const actor = createIllusionActor(actorInput)
  const beliefLocked = shouldBeliefLock(actor, illusion)
  return Object.freeze({
    illusionId: illusion.id,
    actorId: actor.id,
    scale: illusion.scale,
    beliefLocked,
    refusedActions: beliefLocked ? ALL_CONTRADICTORY : Object.freeze([] as ContradictoryAction[]),
    extractionImpairment: 'none',
    extracted: false,
    owner: BELIEF_LOCK_ILLUSION_OWNER,
  })
}

/** True when the locked actor refuses the contradictory action. */
export function refusesContradictoryAction(
  state: BeliefLockState,
  action: ContradictoryAction
): boolean {
  assertBeliefLockState(state)
  if (!ACTIONS.has(action)) throw new Error('contradictory action is invalid')
  if (state.extracted) throw new Error('actor already extracted from illusion')
  return state.beliefLocked && state.refusedActions.includes(action)
}

/**
 * Forced extraction from a belief-locked environment. Produces collapse (or
 * incap when vulnerable) impairment. Cosmetic / unlocked actors extract clean.
 */
export function forceExtractFromIllusion(
  state: BeliefLockState,
  actorInput: IllusionActor
): BeliefLockState {
  assertBeliefLockState(state)
  if (state.extracted) throw new Error('actor already extracted from illusion')
  const actor = createIllusionActor(actorInput)
  if (actor.id !== state.actorId) throw new Error('extraction actorId mismatch')

  let impairment: ExtractionImpairment = 'none'
  if (state.beliefLocked) {
    impairment = actor.vulnerable ? 'incap' : 'collapse'
  }
  if (!IMPAIRMENTS.has(impairment)) {
    throw new Error('extraction impairment is invalid')
  }

  return Object.freeze({
    ...state,
    extracted: true,
    beliefLocked: false,
    refusedActions: Object.freeze([] as ContradictoryAction[]),
    extractionImpairment: impairment,
  })
}

export function isBeliefLocked(state: BeliefLockState): boolean {
  return state.beliefLocked && !state.extracted
}

function assertBeliefLockState(state: BeliefLockState): void {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) {
    throw new Error('belief lock state is required')
  }
  if (state.owner !== BELIEF_LOCK_ILLUSION_OWNER) {
    throw new Error('belief lock owner mismatch')
  }
}
