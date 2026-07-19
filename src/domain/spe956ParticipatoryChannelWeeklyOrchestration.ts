/**
 * SPE-2643 / SPE-956 post-Done follow-on: weekly orchestration for persisted
 * participatory channel maps.
 *
 * Pure deterministic week-close tick:
 * - Apply optional authored weeklyElapsedWeeksDelta to elapsedChannelWeeks
 *   across all five channel map kinds
 *
 * Does not mutate mid-week, invent baselines, reopen SPE-956 AC, or wire UI/store.
 * Pattern: SPE-2624 propagation graph / SPE-2577 SPE-947 evaluator week-close.
 */

import type {
  Spe956AsyncDiscussionSurfaceRecordsMap,
  Spe956CollectiveMemoryChannelRecordsMap,
  Spe956CommunityAdvisoryBodyRecordsMap,
  Spe956HotlineChannelRecordsMap,
  Spe956ParticipatoryChannelWeeklyFields,
  Spe956SurvivorInformalRegistryRecordsMap,
} from './spe956ParticipatoryChannelPersistence'
import {
  extractSpe956AsyncDiscussionSurfaceRecords,
  extractSpe956CollectiveMemoryChannelRecords,
  extractSpe956CommunityAdvisoryBodyRecords,
  extractSpe956HotlineChannelRecords,
  extractSpe956SurvivorInformalRegistryRecords,
} from './spe956ParticipatoryChannelPersistence'

export type Spe956ParticipatoryChannelPersistenceMaps = {
  readonly spe956SurvivorInformalRegistryRecords: Spe956SurvivorInformalRegistryRecordsMap
  readonly spe956CollectiveMemoryChannelRecords: Spe956CollectiveMemoryChannelRecordsMap
  readonly spe956HotlineChannelRecords: Spe956HotlineChannelRecordsMap
  readonly spe956AsyncDiscussionSurfaceRecords: Spe956AsyncDiscussionSurfaceRecordsMap
  readonly spe956CommunityAdvisoryBodyRecords: Spe956CommunityAdvisoryBodyRecordsMap
}

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Code-unit order (not localeCompare) so tick order stays deterministic across runtimes. */
function compareIdsByCodeUnit(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

/**
 * Add non-negative counters without producing Infinity/NaN (SPE-2625 safe-counter pattern).
 * Clamps to Number.MAX_VALUE when finite inputs would overflow.
 */
function addNonNegativeCounters(prior: number, delta: number): number {
  const sum = prior + delta
  if (!Number.isFinite(sum)) {
    return Number.MAX_VALUE
  }

  return sum
}

function freezeChannel<T extends Spe956ParticipatoryChannelWeeklyFields>(channel: T): T {
  return Object.freeze({ ...channel })
}

/** True when at least one authored weekly delta field is present. */
export function hasSpe956ParticipatoryChannelWeeklyDelta(
  channel: Pick<Spe956ParticipatoryChannelWeeklyFields, 'weeklyElapsedWeeksDelta'>
): boolean {
  return isNonNegativeFinite(channel.weeklyElapsedWeeksDelta)
}

/**
 * Advances one persisted channel record for the simulation week.
 * Returns the same reference when no delta authored, already ticked this week, or unchanged.
 */
export function advanceSpe956ParticipatoryChannelForWeek<
  T extends Spe956ParticipatoryChannelWeeklyFields,
>(channel: T, week: number): T {
  const normalizedWeek = normalizeWeek(week)
  if (!hasSpe956ParticipatoryChannelWeeklyDelta(channel)) {
    return channel
  }

  if (channel.lastWeeklyTickWeek === normalizedWeek) {
    return channel
  }

  const priorElapsedWeeks = channel.elapsedChannelWeeks ?? 0
  const nextElapsedWeeks = addNonNegativeCounters(
    priorElapsedWeeks,
    channel.weeklyElapsedWeeksDelta!
  )

  const counterUnchanged =
    nextElapsedWeeks === priorElapsedWeeks && channel.elapsedChannelWeeks !== undefined

  return freezeChannel({
    ...channel,
    ...(counterUnchanged ? {} : { elapsedChannelWeeks: nextElapsedWeeks }),
    lastWeeklyTickWeek: normalizedWeek,
  })
}

function applyChannelMapTick<T extends Spe956ParticipatoryChannelWeeklyFields>(
  records: Record<string, T>,
  week: number
): Record<string, T> {
  const channelIds = Object.keys(records)
  if (channelIds.length === 0) {
    return records
  }

  const next = Object.assign(
    Object.create(Object.getPrototypeOf(records)) as Record<string, T>,
    records
  )
  let changed = false

  for (const channelId of channelIds.sort(compareIdsByCodeUnit)) {
    const channel = records[channelId]
    if (!channel) {
      continue
    }

    const advanced = advanceSpe956ParticipatoryChannelForWeek(channel, week)
    if (advanced !== channel) {
      next[channelId] = advanced
      changed = true
    }
  }

  return changed ? next : records
}

/**
 * Applies one weekly orchestration pass over all five participatory channel maps.
 * Empty maps are a no-op. Re-applying after advance is idempotent for the same week.
 * Returns the same map references when no nested field changes.
 */
export function applyWeeklySpe956ParticipatoryChannelTick(
  maps: Spe956ParticipatoryChannelPersistenceMaps | null | undefined,
  week: number
): Spe956ParticipatoryChannelPersistenceMaps {
  const normalizedWeek = normalizeWeek(week)
  const empty: Spe956ParticipatoryChannelPersistenceMaps = {
    spe956SurvivorInformalRegistryRecords: extractSpe956SurvivorInformalRegistryRecords({}),
    spe956CollectiveMemoryChannelRecords: extractSpe956CollectiveMemoryChannelRecords({}),
    spe956HotlineChannelRecords: extractSpe956HotlineChannelRecords({}),
    spe956AsyncDiscussionSurfaceRecords: extractSpe956AsyncDiscussionSurfaceRecords({}),
    spe956CommunityAdvisoryBodyRecords: extractSpe956CommunityAdvisoryBodyRecords({}),
  }

  if (maps == null) {
    return empty
  }

  const nextSurvivor = applyChannelMapTick(
    maps.spe956SurvivorInformalRegistryRecords,
    normalizedWeek
  ) as Spe956SurvivorInformalRegistryRecordsMap
  const nextMemory = applyChannelMapTick(
    maps.spe956CollectiveMemoryChannelRecords,
    normalizedWeek
  ) as Spe956CollectiveMemoryChannelRecordsMap
  const nextHotline = applyChannelMapTick(
    maps.spe956HotlineChannelRecords,
    normalizedWeek
  ) as Spe956HotlineChannelRecordsMap
  const nextAsync = applyChannelMapTick(
    maps.spe956AsyncDiscussionSurfaceRecords,
    normalizedWeek
  ) as Spe956AsyncDiscussionSurfaceRecordsMap
  const nextAdvisory = applyChannelMapTick(
    maps.spe956CommunityAdvisoryBodyRecords,
    normalizedWeek
  ) as Spe956CommunityAdvisoryBodyRecordsMap

  if (
    nextSurvivor === maps.spe956SurvivorInformalRegistryRecords &&
    nextMemory === maps.spe956CollectiveMemoryChannelRecords &&
    nextHotline === maps.spe956HotlineChannelRecords &&
    nextAsync === maps.spe956AsyncDiscussionSurfaceRecords &&
    nextAdvisory === maps.spe956CommunityAdvisoryBodyRecords
  ) {
    return maps
  }

  return {
    spe956SurvivorInformalRegistryRecords: nextSurvivor,
    spe956CollectiveMemoryChannelRecords: nextMemory,
    spe956HotlineChannelRecords: nextHotline,
    spe956AsyncDiscussionSurfaceRecords: nextAsync,
    spe956CommunityAdvisoryBodyRecords: nextAdvisory,
  }
}
