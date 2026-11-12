/**
 * SPE-3162 — canonical stochastic identity and deterministic replay contract (kernel).
 *
 * Typed decision identity + scoped RNG derivation. Domain consumers remain
 * authoritative for when a roll is taken; this module never mutates GameState.
 *
 * SPE-3163 consumes this kernel for legacy cutover provenance.
 */

import { createSeededRng, normalizeSeed } from './math'

export const STOCHASTIC_IDENTITY_OWNER = 'SPE-3162' as const
export const STOCHASTIC_IDENTITY_SCHEMA_VERSION = 'spe-3162.v1' as const

export interface StochasticDecisionIdentity {
  readonly schemaVersion: typeof STOCHASTIC_IDENTITY_SCHEMA_VERSION
  readonly runSeed: number
  readonly domain: string
  readonly semanticEntityOrEventId: string
  readonly decisionKind: string
  readonly phaseOrAttemptOrIndex: string
  readonly selectorVersion: string
}

export interface DerivedStochasticSelector {
  readonly identity: StochasticDecisionIdentity
  readonly derivedSeed: number
  readonly next: () => number
  readonly getState: () => number
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    throw new Error(`stochastic identity ${field} is required`)
  }
  return trimmed
}

/**
 * Normalize and freeze a decision identity. Rejects empty semantic fields.
 */
export function createStochasticDecisionIdentity(
  input: Omit<StochasticDecisionIdentity, 'schemaVersion'> & {
    readonly schemaVersion?: typeof STOCHASTIC_IDENTITY_SCHEMA_VERSION
  },
): StochasticDecisionIdentity {
  return Object.freeze({
    schemaVersion: STOCHASTIC_IDENTITY_SCHEMA_VERSION,
    runSeed: normalizeSeed(input.runSeed),
    domain: requireNonEmpty(input.domain, 'domain'),
    semanticEntityOrEventId: requireNonEmpty(
      input.semanticEntityOrEventId,
      'semanticEntityOrEventId',
    ),
    decisionKind: requireNonEmpty(input.decisionKind, 'decisionKind'),
    phaseOrAttemptOrIndex: requireNonEmpty(
      input.phaseOrAttemptOrIndex,
      'phaseOrAttemptOrIndex',
    ),
    selectorVersion: requireNonEmpty(input.selectorVersion, 'selectorVersion'),
  })
}

/**
 * Stable string key for hashing / persistence / equality. Field order is fixed.
 */
export function serializeStochasticDecisionIdentity(
  identity: StochasticDecisionIdentity,
): string {
  const normalized = createStochasticDecisionIdentity(identity)
  return [
    normalized.schemaVersion,
    String(normalized.runSeed),
    normalized.domain,
    normalized.semanticEntityOrEventId,
    normalized.decisionKind,
    normalized.phaseOrAttemptOrIndex,
    normalized.selectorVersion,
  ].join('\u001f')
}

/**
 * FNV-1a 32-bit hash over UTF-8 bytes of the serialized identity → derived seed.
 * Isolated from campaign `rngState` stream position. Uses byte encoding so
 * non-BMP code points do not depend on UTF-16 code-unit splitting.
 */
export function deriveStochasticSeed(identity: StochasticDecisionIdentity): number {
  const key = serializeStochasticDecisionIdentity(identity)
  const bytes = new TextEncoder().encode(key)
  let hash = 0x811c9dc5
  for (let i = 0; i < bytes.length; i += 1) {
    hash ^= bytes[i]!
    hash = Math.imul(hash, 0x01000193)
  }
  return normalizeSeed(hash >>> 0)
}

/**
 * Scoped RNG for one semantic decision. Unrelated identities do not share state.
 */
export function createScopedStochasticRng(
  identity: StochasticDecisionIdentity,
): DerivedStochasticSelector {
  const normalized = createStochasticDecisionIdentity(identity)
  const derivedSeed = deriveStochasticSeed(normalized)
  const rng = createSeededRng(derivedSeed)
  return Object.freeze({
    identity: normalized,
    derivedSeed,
    next: rng.next,
    getState: rng.getState,
  })
}

/** Weighted pick; empty weights / all-zero fail closed with null. */
export function pickWeightedIndex(
  rng: () => number,
  weights: readonly number[],
): number | null {
  if (!Array.isArray(weights) || weights.length === 0) return null
  let total = 0
  for (const weight of weights) {
    if (!Number.isFinite(weight) || weight < 0) return null
    total += weight
  }
  if (total <= 0) return null
  const roll = rng() * total
  let cumulative = 0
  for (let i = 0; i < weights.length; i += 1) {
    cumulative += weights[i]!
    if (roll < cumulative) return i
  }
  return weights.length - 1
}

export function compareStochasticDecisionIdentity(
  left: StochasticDecisionIdentity,
  right: StochasticDecisionIdentity,
): number {
  return compareStrings(
    serializeStochasticDecisionIdentity(left),
    serializeStochasticDecisionIdentity(right),
  )
}
