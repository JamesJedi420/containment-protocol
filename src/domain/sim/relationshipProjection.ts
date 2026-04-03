import { clamp } from '../math'
import type { Relationship } from '../models'

export const STATE_HOSTILE_THRESHOLD = -0.5
export const STATE_STRAINED_THRESHOLD = 0
export const STATE_NEUTRAL_THRESHOLD = 0.5
export const STATE_FRIENDLY_THRESHOLD = 1.2

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
