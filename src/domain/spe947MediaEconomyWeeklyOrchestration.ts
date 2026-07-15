/**
 * SPE-2615 / SPE-947: week-close orchestration over SPE-2613/2614 media-economy aggregate.
 *
 * Pure deterministic week-close compose (SPE-2577 pattern peer):
 * - Read/orchestrate cross-path aggregate over authored actors + SPE-2610 maps
 * - Do not invent media-economy truth mid-week
 * - Do not mutate shared economy maps unless an authored weekly delta exists
 * - Slice 1: SPE-2610 weight/binding sanitize unchanged — no weekly delta fields → maps keep identity
 * - Idempotent when lastWeeklyTickWeek === week
 *
 * Optional advanceWeek wire may call this; empty actors/maps are a no-op (no false AC).
 * No full internet simulator, no SPE-956 graph, no SPE-2609 status rewrite.
 */

import type { Spe947MediaEconomyContinuityMaps } from './spe947MediaEconomyContinuity'
import {
  composeSpe947CommercializationEconomyCrossPathAggregate,
  type Spe947MediaEconomyCommercializationActor,
  type Spe947MediaEconomyCrossPathAggregateReading,
} from './spe947MediaEconomySimulator'

export type Spe947MediaEconomyWeeklyOrchestrationStatus =
  | 'empty_actors'
  | 'empty_maps'
  | 'already_ticked'
  | 'orchestrated'

export interface Spe947MediaEconomyWeeklyOrchestrationResult {
  readonly aggregate: Spe947MediaEconomyCrossPathAggregateReading
  readonly maps: Spe947MediaEconomyContinuityMaps
  readonly week: number
  /** Stamp after a successful orchestrated week-close; unchanged on empty / already-ticked. */
  readonly lastWeeklyTickWeek: number | undefined
  readonly status: Spe947MediaEconomyWeeklyOrchestrationStatus
  /** True only when an authored weekly delta mutated maps (slice 1: always false). */
  readonly mapsMutated: boolean
}

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function emptyMaps(): Spe947MediaEconomyContinuityMaps {
  return Object.freeze({
    spe947MediaEconomyWeights: Object.freeze({}),
    spe947MediaEconomyContinuityBindings: Object.freeze({}),
  })
}

/**
 * True when maps carry an authored weekly delta that should mutate shared economy state.
 * Slice 1: SPE-2610 sanitize unchanged — no weekly delta fields exist → always false (no invent).
 */
export function hasSpe947MediaEconomyWeeklyDelta(
  maps: Spe947MediaEconomyContinuityMaps | null | undefined
): boolean {
  void maps
  return false
}

/**
 * Applies one week-close orchestration pass over the SPE-2613/2614 cross-path aggregate.
 * Empty actors / empty maps are a no-op without false AC. Same-week re-tick is idempotent.
 * Shared maps keep identity unless an authored weekly delta exists (none in slice 1).
 */
export function applyWeeklySpe947MediaEconomyTick(input: {
  actors: readonly Spe947MediaEconomyCommercializationActor[]
  maps: Spe947MediaEconomyContinuityMaps | null | undefined
  week: number
  lastWeeklyTickWeek?: number
}): Spe947MediaEconomyWeeklyOrchestrationResult {
  const normalizedWeek = normalizeWeek(input.week)
  const maps = input.maps ?? emptyMaps()
  const priorTickWeek = input.lastWeeklyTickWeek

  const aggregate = composeSpe947CommercializationEconomyCrossPathAggregate({
    actors: input.actors,
    maps,
  })

  switch (aggregate.status) {
    case 'empty_actors':
      return Object.freeze({
        aggregate,
        maps,
        week: normalizedWeek,
        lastWeeklyTickWeek: priorTickWeek,
        status: 'empty_actors',
        mapsMutated: false,
      })
    case 'empty_maps':
      return Object.freeze({
        aggregate,
        maps,
        week: normalizedWeek,
        lastWeeklyTickWeek: priorTickWeek,
        status: 'empty_maps',
        mapsMutated: false,
      })
    case 'cross_path_aggregate': {
      if (priorTickWeek === normalizedWeek) {
        return Object.freeze({
          aggregate,
          maps,
          week: normalizedWeek,
          lastWeeklyTickWeek: priorTickWeek,
          status: 'already_ticked',
          mapsMutated: false,
        })
      }

                  // Authored weekly deltas would mutate maps here; slice 1 has none (no invent).
      const mapsMutated = hasSpe947MediaEconomyWeeklyDelta(maps)

      return Object.freeze({
        aggregate,
        maps,
        week: normalizedWeek,
        lastWeeklyTickWeek: normalizedWeek,
        status: 'orchestrated',
        mapsMutated,
      })
    }
    default: {
      const _exhaustive: never = aggregate.status
      return _exhaustive
    }
  }
}
