import { describe, expect, it } from 'vitest'
import {
  createTeamInsightsPrioritizationConfig,
  DEFAULT_TEAM_INSIGHTS_PRIORITIZATION,
  sanitizeTeamInsightsPrioritizationConfig,
  TEAM_INSIGHTS_PRIORITIZATION,
} from '../features/teams/teamInsightsConfig'

describe('teamInsightsConfig sanity guard', () => {
  it('keeps valid near-1 outer and inner weights unchanged', () => {
    const config = sanitizeTeamInsightsPrioritizationConfig({
      viabilityWeight: 0.65,
      urgencyWeight: 0.35,
      urgencyStageWeight: 0.6,
      urgencyDeadlineWeight: 0.4,
      maxDeadlineForScoring: 12,
      partialOddsValue: 0.5,
    })

    expect(config.viabilityWeight).toBeCloseTo(0.65, 6)
    expect(config.urgencyWeight).toBeCloseTo(0.35, 6)
    expect(config.urgencyStageWeight).toBeCloseTo(0.6, 6)
    expect(config.urgencyDeadlineWeight).toBeCloseTo(0.4, 6)
  })

  it('normalizes outer and inner weights when sums drift from 1', () => {
    const config = sanitizeTeamInsightsPrioritizationConfig({
      viabilityWeight: 2,
      urgencyWeight: 1,
      urgencyStageWeight: 3,
      urgencyDeadlineWeight: 1,
    })

    expect(config.viabilityWeight + config.urgencyWeight).toBeCloseTo(1, 6)
    expect(config.viabilityWeight).toBeCloseTo(2 / 3, 6)
    expect(config.urgencyWeight).toBeCloseTo(1 / 3, 6)
    expect(config.urgencyStageWeight + config.urgencyDeadlineWeight).toBeCloseTo(1, 6)
    expect(config.urgencyStageWeight).toBeCloseTo(3 / 4, 6)
    expect(config.urgencyDeadlineWeight).toBeCloseTo(1 / 4, 6)
  })

  it('falls back when outer weights are invalid/non-positive and clamps scalar values', () => {
    const config = sanitizeTeamInsightsPrioritizationConfig({
      viabilityWeight: -1,
      urgencyWeight: -1,
      maxDeadlineForScoring: -5,
      partialOddsValue: 5,
    })

    expect(config.viabilityWeight + config.urgencyWeight).toBeCloseTo(1, 6)
    expect(config.maxDeadlineForScoring).toBeGreaterThan(0)
    expect(config.partialOddsValue).toBe(1)
  })

  it('keeps near-1 sums unchanged within epsilon tolerance', () => {
    const config = sanitizeTeamInsightsPrioritizationConfig({
      viabilityWeight: 0.6504,
      urgencyWeight: 0.35,
      urgencyStageWeight: 0.6003,
      urgencyDeadlineWeight: 0.4,
    })

    expect(config.viabilityWeight).toBeCloseTo(0.6504, 6)
    expect(config.urgencyWeight).toBeCloseTo(0.35, 6)
    expect(config.urgencyStageWeight).toBeCloseTo(0.6003, 6)
    expect(config.urgencyDeadlineWeight).toBeCloseTo(0.4, 6)
  })

  it('normalizes deadline rounding and lower partial clamp', () => {
    const config = sanitizeTeamInsightsPrioritizationConfig({
      maxDeadlineForScoring: 4.6,
      partialOddsValue: -9,
    })

    expect(config.maxDeadlineForScoring).toBe(5)
    expect(config.partialOddsValue).toBe(0)
  })

  it('falls back to default max deadline when provided max deadline is non-positive', () => {
    const config = sanitizeTeamInsightsPrioritizationConfig({
      maxDeadlineForScoring: 0,
      viabilityWeight: 0.65,
      urgencyWeight: 0.35,
      urgencyStageWeight: 0.6,
      urgencyDeadlineWeight: 0.4,
    })

    expect(config.maxDeadlineForScoring).toBe(
      DEFAULT_TEAM_INSIGHTS_PRIORITIZATION.maxDeadlineForScoring
    )
    expect(config.viabilityWeight + config.urgencyWeight).toBeCloseTo(1, 6)
    expect(config.urgencyStageWeight + config.urgencyDeadlineWeight).toBeCloseTo(1, 6)
  })

  it('uses the provided fallback when config is undefined', () => {
    const fallback = {
      viabilityWeight: 0.2,
      urgencyWeight: 0.8,
      maxDeadlineForScoring: 9,
      urgencyStageWeight: 0.3,
      urgencyDeadlineWeight: 0.7,
      partialOddsValue: 0.25,
    }

    const config = sanitizeTeamInsightsPrioritizationConfig(undefined, fallback)

    expect(config).toEqual(fallback)
  })

  it('falls back for non-finite scalar and weight inputs', () => {
    const fallback = {
      viabilityWeight: 0.2,
      urgencyWeight: 0.8,
      maxDeadlineForScoring: 9,
      urgencyStageWeight: 0.3,
      urgencyDeadlineWeight: 0.7,
      partialOddsValue: 0.25,
    }

    const config = sanitizeTeamInsightsPrioritizationConfig(
      {
        viabilityWeight: Number.NaN,
        urgencyWeight: Number.POSITIVE_INFINITY,
        maxDeadlineForScoring: Number.NaN,
        urgencyStageWeight: Number.POSITIVE_INFINITY,
        urgencyDeadlineWeight: Number.NaN,
        partialOddsValue: Number.POSITIVE_INFINITY,
      },
      fallback
    )

    expect(config).toEqual(fallback)
  })

  it('restores fallback ratios when outer and inner weight sums collapse to zero', () => {
    const fallback = {
      viabilityWeight: 0.2,
      urgencyWeight: 0.8,
      maxDeadlineForScoring: 9,
      urgencyStageWeight: 0.3,
      urgencyDeadlineWeight: 0.7,
      partialOddsValue: 0.25,
    }

    const config = sanitizeTeamInsightsPrioritizationConfig(
      {
        viabilityWeight: 0,
        urgencyWeight: 0,
        urgencyStageWeight: 0,
        urgencyDeadlineWeight: 0,
      },
      fallback
    )

    expect(config.viabilityWeight).toBe(fallback.viabilityWeight)
    expect(config.urgencyWeight).toBe(fallback.urgencyWeight)
    expect(config.urgencyStageWeight).toBe(fallback.urgencyStageWeight)
    expect(config.urgencyDeadlineWeight).toBe(fallback.urgencyDeadlineWeight)
    expect(config.maxDeadlineForScoring).toBe(fallback.maxDeadlineForScoring)
    expect(config.partialOddsValue).toBe(fallback.partialOddsValue)
  })

  it('creates frozen config snapshots from partial overrides', () => {
    const config = createTeamInsightsPrioritizationConfig({
      viabilityWeight: 0.7,
      urgencyWeight: 0.3,
    })

    expect(config.viabilityWeight + config.urgencyWeight).toBeCloseTo(1, 6)
    expect(Object.isFrozen(config)).toBe(true)
    expect(DEFAULT_TEAM_INSIGHTS_PRIORITIZATION.viabilityWeight).toBe(0.65)
  })

  it('exports a frozen prioritization singleton aligned with default baseline', () => {
    expect(Object.isFrozen(TEAM_INSIGHTS_PRIORITIZATION)).toBe(true)

    expect(TEAM_INSIGHTS_PRIORITIZATION.viabilityWeight).toBe(
      DEFAULT_TEAM_INSIGHTS_PRIORITIZATION.viabilityWeight
    )
    expect(TEAM_INSIGHTS_PRIORITIZATION.urgencyWeight).toBe(
      DEFAULT_TEAM_INSIGHTS_PRIORITIZATION.urgencyWeight
    )
    expect(TEAM_INSIGHTS_PRIORITIZATION.maxDeadlineForScoring).toBe(
      DEFAULT_TEAM_INSIGHTS_PRIORITIZATION.maxDeadlineForScoring
    )
    expect(TEAM_INSIGHTS_PRIORITIZATION.urgencyStageWeight).toBe(
      DEFAULT_TEAM_INSIGHTS_PRIORITIZATION.urgencyStageWeight
    )
    expect(TEAM_INSIGHTS_PRIORITIZATION.urgencyDeadlineWeight).toBe(
      DEFAULT_TEAM_INSIGHTS_PRIORITIZATION.urgencyDeadlineWeight
    )
    expect(TEAM_INSIGHTS_PRIORITIZATION.partialOddsValue).toBe(
      DEFAULT_TEAM_INSIGHTS_PRIORITIZATION.partialOddsValue
    )
  })
})
