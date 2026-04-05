import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildEconomyLoopOverview } from '../domain/economy'
import { getProcurementListings } from '../domain/market'
import { buildMissionRewardBreakdown } from '../domain/missionResults'
import { purchaseMarketInventory, sellMarketInventory } from '../domain/sim/market'

describe('economy', () => {
  it('summarizes deterministic procurement, fabrication edge, and reward flow in one loop view', () => {
    const initial = createStartingState()
    const listing = getProcurementListings(initial).find((entry) => entry.availableBundles > 0)

    expect(listing).toBeDefined()

    const purchased = purchaseMarketInventory(initial, listing!.id, 1)
    const sold = sellMarketInventory(purchased, listing!.id, 1)
    const reward = buildMissionRewardBreakdown(sold.cases['case-003'], 'success', sold.config, sold)

    sold.reports = [
      {
        week: sold.week,
        rngStateBefore: 1,
        rngStateAfter: 2,
        newCases: [],
        progressedCases: [],
        resolvedCases: ['case-003'],
        failedCases: [],
        partialCases: [],
        unresolvedTriggers: [],
        spawnedCases: [],
        maxStage: sold.cases['case-003'].stage,
        avgFatigue: 10,
        teamStatus: [],
        notes: [],
        caseSnapshots: {
          'case-003': {
            caseId: 'case-003',
            title: sold.cases['case-003'].title,
            kind: sold.cases['case-003'].kind,
            mode: sold.cases['case-003'].mode,
            status: sold.cases['case-003'].status,
            stage: sold.cases['case-003'].stage,
            deadlineRemaining: sold.cases['case-003'].deadlineRemaining,
            durationWeeks: sold.cases['case-003'].durationWeeks,
            assignedTeamIds: [],
            rewardBreakdown: reward,
          },
        },
      },
    ]

    const overview = buildEconomyLoopOverview(sold)

    expect(overview.transactionSummary.transactionCount).toBe(2)
    expect(overview.transactionSummary.unitsMoved).toBe(listing!.bundleQuantity * 2)
    expect(overview.rewardFlow.funding).toBe(reward.fundingDelta)
    expect(overview.rewardFlow.materials + overview.rewardFlow.equipment).toBeGreaterThan(0)
    expect(overview.bestRecipeEdges[0]?.savings).toBeGreaterThanOrEqual(0)
    expect(overview.materialPressure.length).toBeGreaterThan(0)
    expect(overview.inventoryLiquidationValue).toBeGreaterThanOrEqual(0)
  })
})
