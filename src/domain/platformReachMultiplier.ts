/**
 * SPE-2568 / SPE-947 AC row 1: pure platform reach-multiplier evaluator.
 * Compact platform node + view count → configured reach multiplier / value.
 * No GameState persistence, weekly mutation, store, or UI coupling.
 */

export interface PlatformReachNode {
  readonly id: string
  readonly label: string
  /**
   * Configured base amplification factor applied to anomaly reach.
   * Must be a finite number > 0 when valid.
   */
  readonly reachFactor: number
  /**
   * View count that contributes +1.0 to the view-scale term.
   * Linear: viewScale = viewCount / viewsPerScaleUnit.
   * Must be a finite number > 0 when valid.
   */
  readonly viewsPerScaleUnit: number
}

export interface PlatformReachEvaluationInput {
  readonly platform?: PlatformReachNode | null
  readonly viewCount?: number
  /** Base anomaly reach before platform amplification. Defaults to 1. */
  readonly anomalyReach?: number
}

export interface PlatformReachDecision {
  readonly platformId: string
  readonly platformLabel: string
  readonly viewCount: number
  readonly anomalyReach: number
  readonly reachFactor: number
  readonly viewsPerScaleUnit: number
  readonly viewScale: number
  readonly multiplier: number
  readonly reachValue: number
  readonly reasonCodes: readonly string[]
}

const DEFAULT_ANOMALY_REACH = 1
const FALLBACK_REACH_FACTOR = 1
const FALLBACK_VIEWS_PER_SCALE_UNIT = 0

type PlatformLike = Partial<PlatformReachNode> & Record<string, unknown>

function isRecord(value: unknown): value is PlatformLike {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
      (left, right) => left.localeCompare(right)
    )
  )
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function normalizeId(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function normalizeLabel(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function normalizeViewCount(value: unknown): { viewCount: number; reasonCodes: string[] } {
  if (value === undefined || value === null) {
    return { viewCount: 0, reasonCodes: ['missing_view_count'] }
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { viewCount: 0, reasonCodes: ['invalid_view_count'] }
  }

  if (value < 0) {
    return { viewCount: 0, reasonCodes: ['negative_view_count_clamped'] }
  }

  return { viewCount: value, reasonCodes: [] }
}

function normalizeAnomalyReach(value: unknown): { anomalyReach: number; reasonCodes: string[] } {
  if (value === undefined || value === null) {
    return { anomalyReach: DEFAULT_ANOMALY_REACH, reasonCodes: [] }
  }

  if (!isPositiveFinite(value)) {
    return {
      anomalyReach: DEFAULT_ANOMALY_REACH,
      reasonCodes: ['invalid_anomaly_reach_fallback'],
    }
  }

  return { anomalyReach: value, reasonCodes: [] }
}

function roundReachMetric(value: number): number {
  // Stable decimal for test assertions without floating-point thrash.
  return Math.round(value * 1_000_000) / 1_000_000
}

/**
 * Multiplies anomaly reach by a configured platform factor that scales with
 * view count:
 *
 *   viewScale  = viewCount / viewsPerScaleUnit
 *   multiplier = reachFactor * (1 + viewScale)
 *   reachValue = anomalyReach * multiplier
 *
 * Missing platform falls back to multiplier 1 (no throw). Incomplete config
 * keeps any valid factor/scale terms and adds reason codes instead of throwing.
 */
export function evaluatePlatformReachMultiplier(
  input: PlatformReachEvaluationInput | null | undefined
): PlatformReachDecision {
  const reasonCodes: string[] = []
  const platform = input?.platform

  const viewNorm = normalizeViewCount(input?.viewCount)
  reasonCodes.push(...viewNorm.reasonCodes)

  const anomalyNorm = normalizeAnomalyReach(input?.anomalyReach)
  reasonCodes.push(...anomalyNorm.reasonCodes)

  if (platform === null || platform === undefined) {
    reasonCodes.push('missing_platform')
    return Object.freeze({
      platformId: 'platform:unknown',
      platformLabel: 'Unknown Platform',
      viewCount: viewNorm.viewCount,
      anomalyReach: anomalyNorm.anomalyReach,
      reachFactor: FALLBACK_REACH_FACTOR,
      viewsPerScaleUnit: FALLBACK_VIEWS_PER_SCALE_UNIT,
      viewScale: 0,
      multiplier: FALLBACK_REACH_FACTOR,
      reachValue: roundReachMetric(anomalyNorm.anomalyReach * FALLBACK_REACH_FACTOR),
      reasonCodes: uniqueSorted(reasonCodes),
    })
  }

  if (!isRecord(platform)) {
    reasonCodes.push('invalid_platform')
    return Object.freeze({
      platformId: 'platform:invalid',
      platformLabel: 'Invalid Platform',
      viewCount: viewNorm.viewCount,
      anomalyReach: anomalyNorm.anomalyReach,
      reachFactor: FALLBACK_REACH_FACTOR,
      viewsPerScaleUnit: FALLBACK_VIEWS_PER_SCALE_UNIT,
      viewScale: 0,
      multiplier: FALLBACK_REACH_FACTOR,
      reachValue: roundReachMetric(anomalyNorm.anomalyReach * FALLBACK_REACH_FACTOR),
      reasonCodes: uniqueSorted(reasonCodes),
    })
  }

  const platformId = normalizeId(platform.id, 'platform:unknown')
  const platformLabel = normalizeLabel(platform.label, platformId)

  let reachFactor = FALLBACK_REACH_FACTOR
  const hasReachFactor = isPositiveFinite(platform.reachFactor)
  if (!hasReachFactor) {
    reasonCodes.push('missing_or_invalid_reach_factor')
  } else {
    reachFactor = platform.reachFactor
  }

  let viewsPerScaleUnit = FALLBACK_VIEWS_PER_SCALE_UNIT
  let viewScale = 0
  const hasViewsPerScaleUnit = isPositiveFinite(platform.viewsPerScaleUnit)
  if (!hasViewsPerScaleUnit) {
    reasonCodes.push('missing_or_invalid_views_per_scale_unit')
  } else {
    viewsPerScaleUnit = platform.viewsPerScaleUnit
    viewScale = viewNorm.viewCount / viewsPerScaleUnit
  }

  const multiplier = roundReachMetric(reachFactor * (1 + viewScale))
  const reachValue = roundReachMetric(anomalyNorm.anomalyReach * multiplier)

  if (!hasReachFactor || !hasViewsPerScaleUnit) {
    // Invalid scale config still applies a valid reachFactor when present;
    // invalid factor already fell back to 1.
    reasonCodes.push('platform_config_incomplete')
  } else if (viewNorm.viewCount === 0) {
    reasonCodes.push('zero_views_base_factor_only')
  } else {
    reasonCodes.push('platform_reach_scaled')
  }

  return Object.freeze({
    platformId,
    platformLabel,
    viewCount: viewNorm.viewCount,
    anomalyReach: anomalyNorm.anomalyReach,
    reachFactor,
    viewsPerScaleUnit,
    viewScale: roundReachMetric(viewScale),
    multiplier,
    reachValue,
    reasonCodes: uniqueSorted(reasonCodes),
  })
}

/** Compact fixture for tests and planning mirrors later. */
export const EXAMPLE_RUMOR_FORUM_PLATFORM: PlatformReachNode = Object.freeze({
  id: 'platform:rumor-forum',
  label: 'Local rumor forum',
  reachFactor: 1.5,
  viewsPerScaleUnit: 1000,
})
