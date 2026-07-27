/**
 * SPE-2577 / SPE-947: weekly orchestration for persisted SPE-947 evaluator maps.
 *
 * Pure deterministic week-close tick:
 * - Advance elapsedPropagationWeeks on eligible counter-memetic plans
 * - Apply optional authored platform weeklyViewDelta / weeklyUptimeState
 *
 * Does not invent an internet graph, mutate mid-week, or wire UI/store.
 */

import type { CounterMemeticPlan } from './counterMemeticUptakeGate'
import type { PlatformUptimeState } from './platformOperationDegrade'
import type {
  Spe947CounterMemeticPlanRecordsMap,
  Spe947EvaluatorPersistenceMaps,
  Spe947PersistedCounterMemeticPlan,
  Spe947PersistedPlatform,
  Spe947PlatformRecordsMap,
} from './spe947EvaluatorPersistence'
import { extractSpe947EvaluatorPersistenceMaps } from './spe947EvaluatorPersistence'

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function freezePlatform(platform: Spe947PersistedPlatform): Spe947PersistedPlatform {
  return Object.freeze({ ...platform })
}

function freezePlan(plan: Spe947PersistedCounterMemeticPlan): Spe947PersistedCounterMemeticPlan {
  return Object.freeze({ ...plan })
}

/** Eligible when lore is crafted and a distributor is chosen. */
export function isSpe947CounterMemeticPlanEligibleForWeeklyTick(
  plan: Pick<CounterMemeticPlan, 'loreState' | 'distributorId'>
): boolean {
  return (
    plan.loreState === 'crafted' &&
    typeof plan.distributorId === 'string' &&
    plan.distributorId.trim().length > 0
  )
}

/** True when at least one authored platform weekly delta field is present. */
export function hasSpe947PlatformWeeklyDelta(
  platform: Pick<Spe947PersistedPlatform, 'weeklyViewDelta' | 'weeklyUptimeState'>
): boolean {
  return isNonNegativeFinite(platform.weeklyViewDelta) || platform.weeklyUptimeState !== undefined
}

/**
 * Advances one counter-memetic plan for the simulation week.
 * Returns the same reference when ineligible, already ticked this week, or unchanged.
 */
export function advanceSpe947CounterMemeticPlanForWeek(
  plan: Spe947PersistedCounterMemeticPlan,
  week: number
): Spe947PersistedCounterMemeticPlan {
  const normalizedWeek = normalizeWeek(week)
  if (!isSpe947CounterMemeticPlanEligibleForWeeklyTick(plan)) {
    return plan
  }

  if (plan.lastWeeklyTickWeek === normalizedWeek) {
    return plan
  }

  return freezePlan({
    ...plan,
    elapsedPropagationWeeks: plan.elapsedPropagationWeeks + 1,
    lastWeeklyTickWeek: normalizedWeek,
  })
}

/**
 * Applies authored platform view/uptime deltas for the simulation week.
 * Returns the same reference when no deltas authored, already ticked this week, or unchanged.
 */
export function advanceSpe947PlatformForWeek(
  platform: Spe947PersistedPlatform,
  week: number
): Spe947PersistedPlatform {
  const normalizedWeek = normalizeWeek(week)
  if (!hasSpe947PlatformWeeklyDelta(platform)) {
    return platform
  }

  if (platform.lastWeeklyTickWeek === normalizedWeek) {
    return platform
  }

  const nextViewCount = isNonNegativeFinite(platform.weeklyViewDelta)
    ? (platform.viewCount ?? 0) + platform.weeklyViewDelta
    : platform.viewCount

  const nextUptimeState: PlatformUptimeState | undefined =
    platform.weeklyUptimeState !== undefined ? platform.weeklyUptimeState : platform.uptimeState

  const viewUnchanged = nextViewCount === platform.viewCount
  const uptimeUnchanged = nextUptimeState === platform.uptimeState
  if (viewUnchanged && uptimeUnchanged) {
    return freezePlatform({
      ...platform,
      lastWeeklyTickWeek: normalizedWeek,
    })
  }

  return freezePlatform({
    ...platform,
    ...(nextViewCount !== undefined ? { viewCount: nextViewCount } : {}),
    ...(nextUptimeState !== undefined ? { uptimeState: nextUptimeState } : {}),
    lastWeeklyTickWeek: normalizedWeek,
  })
}

function applyPlanMapTick(
  plans: Spe947CounterMemeticPlanRecordsMap,
  week: number
): Spe947CounterMemeticPlanRecordsMap {
  const planIds = Object.keys(plans)
  if (planIds.length === 0) {
    return plans
  }

  const next: Spe947CounterMemeticPlanRecordsMap = { ...plans }
  let changed = false

  for (const planId of planIds.sort((left, right) => left.localeCompare(right))) {
    const plan = plans[planId]
    if (!plan) {
      continue
    }

    const advanced = advanceSpe947CounterMemeticPlanForWeek(plan, week)
    if (advanced !== plan) {
      next[planId] = advanced
      changed = true
    }
  }

  return changed ? next : plans
}

function applyPlatformMapTick(
  platforms: Spe947PlatformRecordsMap,
  week: number
): Spe947PlatformRecordsMap {
  const platformIds = Object.keys(platforms)
  if (platformIds.length === 0) {
    return platforms
  }

  const next: Spe947PlatformRecordsMap = { ...platforms }
  let changed = false

  for (const platformId of platformIds.sort((left, right) => left.localeCompare(right))) {
    const platform = platforms[platformId]
    if (!platform) {
      continue
    }

    const advanced = advanceSpe947PlatformForWeek(platform, week)
    if (advanced !== platform) {
      next[platformId] = advanced
      changed = true
    }
  }

  return changed ? next : platforms
}

/**
 * Applies one weekly orchestration pass over persisted SPE-947 evaluator maps.
 * Empty maps are a no-op. Re-applying after advance is idempotent for the same week.
 * Only platforms and counter-memetic plans mutate; other maps keep identity.
 * Returns the same maps reference when no nested field changes.
 */
export function applyWeeklySpe947EvaluatorTick(
  maps: Spe947EvaluatorPersistenceMaps | null | undefined,
  week: number
): Spe947EvaluatorPersistenceMaps {
  if (maps == null) {
    return extractSpe947EvaluatorPersistenceMaps({})
  }

  const normalizedWeek = normalizeWeek(week)
  const platforms = maps.spe947PlatformRecords ?? {}
  const plans = maps.spe947CounterMemeticPlans ?? {}
  const nextPlatforms = applyPlatformMapTick(platforms, normalizedWeek)
  const nextPlans = applyPlanMapTick(plans, normalizedWeek)

  if (nextPlatforms === platforms && nextPlans === plans) {
    return maps
  }

  return {
    ...maps,
    spe947PlatformRecords: nextPlatforms,
    spe947CounterMemeticPlans: nextPlans,
  }
}
