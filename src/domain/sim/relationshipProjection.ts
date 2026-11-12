import { clamp } from '../math'
import type { Relationship } from '../models'

export const RELATIONSHIP_VALUE_MIN = -2
export const RELATIONSHIP_VALUE_MAX = 2

export const RELATIONSHIP_CHANGED_REASONS = [
  'mission_success',
  'mission_partial',
  'mission_fail',
  'passive_drift',
  'external_event',
  'reconciliation',
  'spontaneous_event',
  'betrayal',
] as const

export type RelationshipChangedReason = (typeof RELATIONSHIP_CHANGED_REASONS)[number]

export const STATE_HOSTILE_THRESHOLD = -0.5
export const STATE_STRAINED_THRESHOLD = 0
export const STATE_NEUTRAL_THRESHOLD = 0.5
export const STATE_FRIENDLY_THRESHOLD = 1.2

function coerceFiniteNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (trimmed.length > 0) {
      const parsed = Number(trimmed)

      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return fallback
}

function isRelationshipChangedReason(value: unknown): value is RelationshipChangedReason {
  return (
    typeof value === 'string' &&
    (RELATIONSHIP_CHANGED_REASONS as readonly string[]).includes(value)
  )
}

/** Round chemistry delta to two decimal places (producer / hydrate convention). */
export function roundRelationshipDelta(value: number) {
  return Math.round(value * 100) / 100
}

/** Hydration: clamp chemistry values to [-2, 2], recompute finite delta, sanitize reason. */
export function reconcileAgentRelationshipChangedFields(payload: {
  previousValue?: unknown
  nextValue?: unknown
  reason?: unknown
}) {
  const previousValue = clamp(
    coerceFiniteNumber(payload.previousValue, 0),
    RELATIONSHIP_VALUE_MIN,
    RELATIONSHIP_VALUE_MAX
  )
  const nextValue = clamp(
    coerceFiniteNumber(payload.nextValue, 0),
    RELATIONSHIP_VALUE_MIN,
    RELATIONSHIP_VALUE_MAX
  )
  const delta = roundRelationshipDelta(nextValue - previousValue)
  const reason = isRelationshipChangedReason(payload.reason) ? payload.reason : 'passive_drift'

  return { previousValue, nextValue, delta, reason }
}

/**
 * Compute relationship state based on value threshold.
 * States: hostile | strained | neutral | friendly | intimate
 */
export function deriveRelationshipState(value: number): Relationship['state'] {
  if (value <= STATE_HOSTILE_THRESHOLD) return 'hostile'
  if (value < STATE_STRAINED_THRESHOLD) return 'strained'
  if (value < STATE_NEUTRAL_THRESHOLD) return 'neutral'
  if (value < STATE_FRIENDLY_THRESHOLD) return 'friendly'
  return 'intimate'
}

/**
 * Compute stability (0-1) affecting how quickly relationships drift.
 * Higher stability = more resistant to change.
 * Factors: trained coordination, shared history, familiarity.
 */
export function deriveRelationshipStability(
  value: number,
  modifiers: readonly string[] = [],
  familiarity = 0
) {
  let stability = 0.5 // Base stability

  // Trained coordination adds significant stability
  if (modifiers.includes('trained_coordination')) {
    stability += 0.25
  }

  // Shared history provides moderate stability
  if (modifiers.includes('shared_history')) {
    stability += 0.15
  }

  // Strong positive relationships (intimate/friendly) are more stable
  if (value > STATE_FRIENDLY_THRESHOLD) {
    stability += 0.1
  }

  // Familiarity increases stability
  stability += Math.min(familiarity * 0.1, 0.1)

  return clamp(stability, 0.3, 0.9)
}
