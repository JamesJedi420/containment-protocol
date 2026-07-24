import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildAgencySummary } from '../domain/agency'
import { getContractOffers, refreshContractBoard } from '../domain/contracts'
import {
  applyRivalPressureToContractScalar,
  applyRivalPressureToRecruitQuality,
  applyTrustFailureDriftScale,
  buildRivalPressure,
  buildRivalPressureFromRankingScore,
} from '../domain/rivalPressure'
import { applyAssetReliabilityDrift, createContractorAsset } from '../domain/externalSupport'
import { buildRecruitmentGenerationState } from '../domain/sim/candidateGenerator'
import type { WeeklyReport } from '../domain/models'

function reportWithFailures(week: number, failures: number, unresolved: number): WeeklyReport {
  return {
    week,
    resolvedCases: [],
    partialCases: [],
    failedCases: Array.from({ length: failures }, (_, index) => `fail-${week}-${index}`),
    unresolvedTriggers: Array.from(
      { length: unresolved },
      (_, index) => `unresolved-${week}-${index}`
    ),
  } as unknown as WeeklyReport
}

function reportWithResolutions(week: number, resolved: number): WeeklyReport {
  return {
    week,
    resolvedCases: Array.from({ length: resolved }, (_, index) => `resolved-${week}-${index}`),
    partialCases: [],
    failedCases: [],
    unresolvedTriggers: [],
  } as unknown as WeeklyReport
}

describe('rival comparative pressure (SPE-2699)', () => {
  it('derives deterministic pressure bands and surface deltas from ranking score', () => {
    const empty = buildRivalPressure({ reports: [], events: [] })
    const balanced = buildRivalPressureFromRankingScore(50)
    const weak = buildRivalPressureFromRankingScore(20)
    const strong = buildRivalPressureFromRankingScore(80)

    expect(empty).toEqual(balanced)
    expect(balanced).toEqual(buildRivalPressureFromRankingScore(50))
    expect(balanced.band).toBe('balanced')
    expect(balanced.contractRewardMultiplier).toBe(1)
    expect(balanced.recruitQualityDelta).toBe(0)
    expect(balanced.trustFailureDriftScale).toBe(1)
    expect(Object.is(balanced.recruitQualityDelta, -0)).toBe(false)

    expect(weak.score).toBeGreaterThan(balanced.score)
    expect(weak.band).toBe('severe')
    expect(weak.contractRewardMultiplier).toBeLessThan(balanced.contractRewardMultiplier)
    expect(weak.recruitQualityDelta).toBeLessThan(balanced.recruitQualityDelta)
    expect(weak.trustFailureDriftScale).toBeGreaterThan(balanced.trustFailureDriftScale)

    expect(strong.score).toBeLessThan(balanced.score)
    expect(strong.band).toBe('suppressed')
    expect(strong.contractRewardMultiplier).toBeGreaterThan(balanced.contractRewardMultiplier)
    expect(strong.recruitQualityDelta).toBeGreaterThan(balanced.recruitQualityDelta)
    expect(strong.trustFailureDriftScale).toBeLessThan(balanced.trustFailureDriftScale)

    expect(applyRivalPressureToContractScalar(1, weak)).toBeLessThan(
      applyRivalPressureToContractScalar(1, strong)
    )
    expect(applyRivalPressureToRecruitQuality(50, weak)).toBeLessThan(
      applyRivalPressureToRecruitQuality(50, strong)
    )
    expect(applyTrustFailureDriftScale(-20, weak.trustFailureDriftScale)).toBeLessThan(
      applyTrustFailureDriftScale(-20, strong.trustFailureDriftScale)
    )
    expect(applyTrustFailureDriftScale(12, weak.trustFailureDriftScale)).toBe(12)
    expect(applyTrustFailureDriftScale(12, strong.trustFailureDriftScale)).toBe(12)
  })

  it('softens negative reliability drift under high standing vs low standing', () => {
    const contractor = createContractorAsset('c1', 'Local Contractor', 50)
    const weak = buildRivalPressureFromRankingScore(20)
    const strong = buildRivalPressureFromRankingScore(80)

    const weakDrift = applyAssetReliabilityDrift(contractor, 'support_failed', {
      trustFailureDriftScale: weak.trustFailureDriftScale,
    })
    const strongDrift = applyAssetReliabilityDrift(contractor, 'support_failed', {
      trustFailureDriftScale: strong.trustFailureDriftScale,
    })
    const neutralDrift = applyAssetReliabilityDrift(contractor, 'support_failed')

    expect(strongDrift.asset.reliability).toBeGreaterThan(neutralDrift.asset.reliability)
    expect(weakDrift.asset.reliability).toBeLessThan(neutralDrift.asset.reliability)
    expect(strongDrift.asset.reliability).toBeGreaterThan(weakDrift.asset.reliability)

    const identicalA = applyAssetReliabilityDrift(contractor, 'support_partial', {
      trustFailureDriftScale: weak.trustFailureDriftScale,
    })
    const identicalB = applyAssetReliabilityDrift(contractor, 'support_partial', {
      trustFailureDriftScale: weak.trustFailureDriftScale,
    })
    expect(identicalA.asset.reliability).toBe(identicalB.asset.reliability)
  })

  it('compresses contract payouts under severe rival pressure vs suppressed', () => {
    const baseline = createStartingState()
    const weakState = {
      ...baseline,
      reports: [reportWithFailures(1, 5, 4), reportWithFailures(2, 4, 3)],
      events: [],
    }
    const strongState = {
      ...baseline,
      reports: [reportWithResolutions(1, 8), reportWithResolutions(2, 8)],
      events: [],
    }

    const weakPressure = buildRivalPressure(weakState)
    const strongPressure = buildRivalPressure(strongState)
    expect(weakPressure.score).toBeGreaterThan(strongPressure.score)

    const weakBoard = refreshContractBoard({ ...weakState, week: baseline.week + 1 })
    const strongBoard = refreshContractBoard({ ...strongState, week: baseline.week + 1 })
    const weakOffer = getContractOffers(weakBoard).find(
      (offer) => offer.templateId === 'oversight-lockdown-retainer'
    )
    const strongOffer = getContractOffers(strongBoard).find(
      (offer) => offer.templateId === 'oversight-lockdown-retainer'
    )

    expect(weakOffer).toBeDefined()
    expect(strongOffer).toBeDefined()
    expect(weakOffer!.rewards.funding).toBeLessThan(strongOffer!.rewards.funding)
  })

  it('passes recruit quality deltas through recruitment generation state', () => {
    const baseline = createStartingState()
    const weakState = {
      ...baseline,
      reports: [reportWithFailures(1, 5, 4)],
      events: [],
    }
    const strongState = {
      ...baseline,
      reports: [reportWithResolutions(1, 10)],
      events: [],
    }

    const weakRecruit = buildRecruitmentGenerationState(weakState)
    const strongRecruit = buildRecruitmentGenerationState(strongState)

    expect(weakRecruit.rivalRecruitQualityDelta).toBe(
      buildRivalPressure(weakState).recruitQualityDelta
    )
    expect(strongRecruit.rivalRecruitQualityDelta).toBe(
      buildRivalPressure(strongState).recruitQualityDelta
    )
    expect(weakRecruit.rivalRecruitQualityDelta).toBeLessThan(
      strongRecruit.rivalRecruitQualityDelta
    )
  })

  it('exposes rival pressure on agency summary for player-facing surfaces', () => {
    const game = createStartingState()
    const summary = buildAgencySummary(game)

    expect(summary.rivalPressure).toEqual({
      score: buildRivalPressure(game).score,
      band: buildRivalPressure(game).band,
      summary: buildRivalPressure(game).summary,
      contractRewardMultiplier: buildRivalPressure(game).contractRewardMultiplier,
      recruitQualityDelta: buildRivalPressure(game).recruitQualityDelta,
      trustFailureDriftScale: buildRivalPressure(game).trustFailureDriftScale,
    })
    expect(summary.rivalPressure.summary).toMatch(/Comparative pressure/)
    expect(summary.rivalPressure.summary).toMatch(/external-support failure drift/)
  })
})
