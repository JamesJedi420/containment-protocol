// Squad leader-dependence degradation profile seam (SPE-1336)
// Domain-only, deterministic, no RNG, no UI/store wiring, no models.ts widening
import type { SquadMetadata } from './squadMetadata'

export type LeaderState = 'present' | 'absent' | 'unqualified' | 'compromised'

export type DegradationLevel = 'full' | 'partial' | 'degraded' | 'none'

export interface SquadLeaderDependenceProfile {
  doctrineQuality: DegradationLevel
  panicResistance: DegradationLevel
  pursuitDiscipline: DegradationLevel
  deploymentReliability: DegradationLevel
}

const LEADER_DEPENDENCE_RULES: Readonly<Record<LeaderState, SquadLeaderDependenceProfile>> = {
  present: {
    doctrineQuality: 'full',
    panicResistance: 'full',
    pursuitDiscipline: 'full',
    deploymentReliability: 'full',
  },
  absent: {
    doctrineQuality: 'degraded',
    panicResistance: 'degraded',
    pursuitDiscipline: 'partial',
    deploymentReliability: 'partial',
  },
  unqualified: {
    doctrineQuality: 'partial',
    panicResistance: 'full',
    pursuitDiscipline: 'degraded',
    deploymentReliability: 'partial',
  },
  compromised: {
    doctrineQuality: 'none',
    panicResistance: 'degraded',
    pursuitDiscipline: 'none',
    deploymentReliability: 'degraded',
  },
}

/**
 * Derives compact squad-level leader-dependence behavior profile.
 *
 * Note: `squad` is intentionally accepted to maintain seam compatibility with
 * existing squad metadata flows and future consumers, but this bounded first
 * slice derives the profile strictly from the provided leader state.
 */
export function deriveLeaderDependenceProfile(
  _squad: SquadMetadata,
  leaderState: LeaderState
): SquadLeaderDependenceProfile {
  return { ...LEADER_DEPENDENCE_RULES[leaderState] }
}
