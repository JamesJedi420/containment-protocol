import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_RUMOR_FORUM_PLATFORM,
  evaluatePlatformReachMultiplier,
  type PlatformReachNode,
} from '../domain/platformReachMultiplier'

function platform(overrides: Partial<PlatformReachNode> = {}): PlatformReachNode {
  return {
    ...EXAMPLE_RUMOR_FORUM_PLATFORM,
    ...overrides,
  }
}

describe('platformReachMultiplier (SPE-2568 / SPE-947 AC row 1)', () => {
  it('scales anomaly reach by configured factor that grows with view count', () => {
    const decision = evaluatePlatformReachMultiplier({
      platform: platform({ reachFactor: 2, viewsPerScaleUnit: 1000 }),
      viewCount: 1000,
      anomalyReach: 10,
    })

    // multiplier = 2 * (1 + 1000/1000) = 4; reachValue = 10 * 4 = 40
    expect(decision.multiplier).toBe(4)
    expect(decision.reachValue).toBe(40)
    expect(decision.viewScale).toBe(1)
    expect(decision.reasonCodes).toEqual(['platform_reach_scaled'])
    expect(decision).toEqual(
      expect.objectContaining({
        platformId: 'platform:rumor-forum',
        platformLabel: 'Local rumor forum',
        viewCount: 1000,
        anomalyReach: 10,
        reachFactor: 2,
        viewsPerScaleUnit: 1000,
      })
    )
  })

  it('applies only the base reach factor when view count is zero', () => {
    const decision = evaluatePlatformReachMultiplier({
      platform: platform({ reachFactor: 1.5, viewsPerScaleUnit: 500 }),
      viewCount: 0,
      anomalyReach: 8,
    })

    // multiplier = 1.5 * (1 + 0) = 1.5; reachValue = 8 * 1.5 = 12
    expect(decision.multiplier).toBe(1.5)
    expect(decision.reachValue).toBe(12)
    expect(decision.viewScale).toBe(0)
    expect(decision.reasonCodes).toEqual(['zero_views_base_factor_only'])
  })

  it('returns byte-stable decisions for the same platform and view count', () => {
    const input = {
      platform: platform(),
      viewCount: 250,
      anomalyReach: 4,
    }

    const first = evaluatePlatformReachMultiplier(input)
    const second = evaluatePlatformReachMultiplier(input)

    expect(second).toEqual(first)
    // multiplier = 1.5 * (1 + 250/1000) = 1.5 * 1.25 = 1.875; reach = 4 * 1.875 = 7.5
    expect(first.reachValue).toBe(7.5)
    expect(first.multiplier).toBe(1.875)
  })

  it('falls back deterministically when platform config is missing', () => {
    const decision = evaluatePlatformReachMultiplier({
      platform: null,
      viewCount: 900,
      anomalyReach: 5,
    })

    expect(decision.multiplier).toBe(1)
    expect(decision.reachValue).toBe(5)
    expect(decision.viewScale).toBe(0)
    expect(decision.platformId).toBe('platform:unknown')
    expect(decision.reasonCodes).toEqual(['missing_platform'])
  })

  it('falls back when reach factor or views-per-scale-unit are invalid', () => {
    const missingFactor = evaluatePlatformReachMultiplier({
      platform: platform({ reachFactor: 0 as number }),
      viewCount: 2000,
      anomalyReach: 3,
    })

    expect(missingFactor.reachFactor).toBe(1)
    expect(missingFactor.viewScale).toBe(2)
    // multiplier = 1 * (1 + 2) = 3; still scales views with fallback factor
    expect(missingFactor.multiplier).toBe(3)
    expect(missingFactor.reachValue).toBe(9)
    expect(missingFactor.reasonCodes).toEqual([
      'missing_or_invalid_reach_factor',
      'platform_config_incomplete',
    ])

    const missingScale = evaluatePlatformReachMultiplier({
      platform: platform({ viewsPerScaleUnit: -10 as number }),
      viewCount: 2000,
      anomalyReach: 3,
    })

    expect(missingScale.reachFactor).toBe(1.5)
    expect(missingScale.viewScale).toBe(0)
    expect(missingScale.multiplier).toBe(1.5)
    expect(missingScale.reachValue).toBe(4.5)
    expect(missingScale.reasonCodes).toEqual([
      'missing_or_invalid_views_per_scale_unit',
      'platform_config_incomplete',
    ])
  })

  it('clamps negative view counts and invalid anomaly reach without throwing', () => {
    const decision = evaluatePlatformReachMultiplier({
      platform: platform({ reachFactor: 2, viewsPerScaleUnit: 100 }),
      viewCount: -50,
      anomalyReach: Number.NaN,
    })

    expect(decision.viewCount).toBe(0)
    expect(decision.anomalyReach).toBe(1)
    expect(decision.multiplier).toBe(2)
    expect(decision.reachValue).toBe(2)
    expect(decision.reasonCodes).toEqual([
      'invalid_anomaly_reach_fallback',
      'negative_view_count_clamped',
      'zero_views_base_factor_only',
    ])
  })

  it('handles undefined input without throwing', () => {
    const decision = evaluatePlatformReachMultiplier(undefined)

    expect(decision.reachValue).toBe(1)
    expect(decision.multiplier).toBe(1)
    expect(decision.reasonCodes).toEqual(['missing_platform', 'missing_view_count'])
  })
})
