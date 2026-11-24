/**
 * SPE-3781 — progressive facility dependency degradation and conditional restoration (slice 1).
 *
 * Pure deterministic projection of one authoritative upstream disruption onto dependent services
 * across canonical simulation windows. Demonstrates the representative hub-corruption binding
 * without transferring ownership of graph resolution, maintenance, or live operations.
 */

export const DEGRADATION_WINDOWS = ['immediate', 'window_1', 'window_2'] as const
export type DegradationWindow = (typeof DEGRADATION_WINDOWS)[number]

export interface DisruptionPacket {
  readonly disruptionId: string
  readonly affectedNodeIds: readonly string[]
  readonly severity: 'partial' | 'full'
  readonly window: DegradationWindow
}

export interface DegradationProjection {
  readonly nodeId: string
  readonly availability: 'ready' | 'degraded' | 'unavailable'
  readonly window: DegradationWindow
  readonly blockedRecovery: boolean
  readonly alternativePathAvailable: boolean
}

const BASELINE: Record<string, 'ready' | 'degraded' | 'unavailable'> = {
  hub: 'ready',
  'alert-timing': 'ready',
  'logistics-freshness': 'ready',
  'archive-integrity': 'ready',
}

export function projectProgressiveDegradation(
  disruption: DisruptionPacket,
): readonly DegradationProjection[] {
  return Object.keys(BASELINE).map((nodeId) => {
    const isAffected = disruption.affectedNodeIds.includes(nodeId)
    const availability =
      isAffected && disruption.severity === 'full'
        ? 'unavailable'
        : isAffected && disruption.severity === 'partial'
          ? 'degraded'
          : BASELINE[nodeId]

    const blockedRecovery = isAffected && disruption.window !== 'immediate'
    const alternativePathAvailable = !isAffected || disruption.severity === 'partial'

    return {
      nodeId,
      availability,
      window: disruption.window,
      blockedRecovery,
      alternativePathAvailable,
    }
  })
}

export function accumulateDegradationAcrossWindows(
  baseDisruption: Omit<DisruptionPacket, 'window'>,
): readonly DegradationProjection[] {
  return DEGRADATION_WINDOWS.flatMap((window) =>
    projectProgressiveDegradation({ ...baseDisruption, window }),
  )
}
