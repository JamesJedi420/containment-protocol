/**
 * SPE-3422 — actor observable-cue projection (pure, caller-owned).
 *
 * Projects already-owned internal stress/appraisal/context into outward
 * observable cues for downstream sensing and observer-local inference.
 * Never infers what an observer actually saw; does not own emotion,
 * sensing, perception, or targeting state.
 */

import { assertNonEmptyId, assertSafeIntegerInRange } from './assertBoundedInteger'

export const ACTOR_OBSERVABLE_CUE_OWNER = 'SPE-3422' as const

export type CueFamily = 'posture' | 'expression' | 'vocal' | 'movement' | 'absent'

export type CueQuality = 'masked' | 'suppressed' | 'inverted' | 'ordinary' | 'confounded'

export interface ActorInternalState {
  readonly actorId: string
  readonly stress: number
  readonly appraisal: string
}

export interface CueContext {
  readonly contextId: string
  readonly seed: number
  readonly masking: boolean
  readonly suppression: boolean
}

export interface ObservableCueRecord {
  readonly actorId: string
  readonly cueFamily: CueFamily
  readonly intensity: number
  readonly quality: CueQuality
  readonly contextId: string
  readonly seed: number
  readonly trace: string
  readonly owner: typeof ACTOR_OBSERVABLE_CUE_OWNER
}

export interface ActorObservableCueProjectionInput {
  readonly internal: ActorInternalState
  readonly context: CueContext
}

function validateInternal(input: ActorInternalState): ActorInternalState {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('internal state is required')
  }
  return Object.freeze({
    actorId: assertNonEmptyId(input.actorId, 'internal.actorId'),
    stress: assertSafeIntegerInRange(input.stress, 'internal.stress', 0, 100),
    appraisal: assertNonEmptyId(input.appraisal, 'internal.appraisal'),
  })
}

function validateContext(input: CueContext): CueContext {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('cue context is required')
  }
  return Object.freeze({
    contextId: assertNonEmptyId(input.contextId, 'context.contextId'),
    seed: assertSafeIntegerInRange(input.seed, 'context.seed', 0, 999999),
    masking: Boolean(input.masking),
    suppression: Boolean(input.suppression),
  })
}

function deriveCueFamily(stress: number, seed: number, masking: boolean): CueFamily {
  if (masking && stress > 70) return 'expression'
  const band = (stress + seed) % 5
  if (band === 0) return 'posture'
  if (band === 1) return 'expression'
  if (band === 2) return 'vocal'
  if (band === 3) return 'movement'
  return 'absent'
}

function deriveQuality(stress: number, masking: boolean, suppression: boolean): CueQuality {
  if (suppression) return 'suppressed'
  if (masking) return stress > 50 ? 'masked' : 'inverted'
  if (stress < 20) return 'confounded'
  return 'ordinary'
}

function deriveIntensity(stress: number, quality: CueQuality, seed: number): number {
  if (quality === 'suppressed' || quality === 'absent') return 0
  const base = Math.min(100, stress + (seed % 11))
  if (quality === 'masked') return Math.floor(base * 0.4)
  if (quality === 'inverted') return Math.max(0, 100 - base)
  return base
}

/** Project one observable cue record. Deterministic; no mutation of inputs. */
export function projectActorObservableCue(
  input: ActorObservableCueProjectionInput
): ObservableCueRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('observable cue projection input is required')
  }
  const internal = validateInternal(input.internal)
  const context = validateContext(input.context)

  const cueFamily = deriveCueFamily(internal.stress, context.seed, context.masking)
  const quality = deriveQuality(internal.stress, context.masking, context.suppression)
  const intensity = deriveIntensity(internal.stress, quality, context.seed)

  const trace = `SPE-3422|${internal.actorId}|${context.contextId}|${context.seed}|stress=${internal.stress}|appraisal=${internal.appraisal}`

  return Object.freeze({
    actorId: internal.actorId,
    cueFamily,
    intensity,
    quality,
    contextId: context.contextId,
    seed: context.seed,
    trace,
    owner: ACTOR_OBSERVABLE_CUE_OWNER,
  })
}
