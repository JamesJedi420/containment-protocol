import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildEconomyLoopOverview } from '../domain/economy'
import {
  assessFundingPressure,
  computeWeeklyInventoryHoldingCost,
  computeWeeklyOperatingCost,
} from '../domain/funding'
import { getProcurementListings } from '../domain/market'
import { buildMissionRewardBreakdown } from '../domain/missionResults'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { purchaseMarketInventory, sellMarketInventory } from '../domain/sim/market'

describe('economy', () => {
  it('summarizes deterministic procurement, fabrication edge, and reward flow in one loop view', () => {
    const initial = createStartingState()
    const listing = getProcurementListings(initial).find(
      (entry) => entry.accessAvailable && entry.availableBundles > 0
    )

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

  it('applies weekly inventory holding cost on advanceWeek so high stock tightens procurement headroom', () => {
    const initial = createStartingState()
    const listing = getProcurementListings(initial).find(
      (entry) =>
        entry.accessAvailable &&
        entry.resourceStatuses.every((status) => status.purchaseAvailable) &&
        entry.buyPrice >= 20
    )

    expect(listing).toBeDefined()

    const closedWeek = initial.week
    const stockedGame = {
      ...initial,
      inventory: {
        ...initial.inventory,
        medkits: 40,
      },
    }
    const operatingCost = computeWeeklyOperatingCost(stockedGame, closedWeek)
    const holdingCost = computeWeeklyInventoryHoldingCost(stockedGame, closedWeek)
    const preWeekFunding = listing!.buyPrice + operatingCost + holdingCost - 1

    const preWeek = {
      ...stockedGame,
      funding: preWeekFunding,
      agency: {
        ...stockedGame.agency!,
        funding: preWeekFunding,
      },
      config: {
        ...stockedGame.config,
        fundingBasePerWeek: 0,
        fundingPerResolution: 0,
        fundingPenaltyPerFail: 0,
        fundingPenaltyPerUnresolved: 0,
      },
    }

    expect(preWeek.funding).toBeGreaterThanOrEqual(listing!.buyPrice)

    const afterWeek = advanceWeek(preWeek)

    expect(afterWeek.funding).toBeLessThan(listing!.buyPrice)
    expect(assessFundingPressure(afterWeek).reasonCodes).toContain('weekly-inventory-holding-cost')
  })

  it('applies weekly operating cost on advanceWeek so a previously affordable listing becomes budget-blocked', () => {
    const initial = createStartingState()
    const listing = getProcurementListings(initial).find(
      (entry) =>
        entry.accessAvailable &&
        entry.resourceStatuses.every((status) => status.purchaseAvailable) &&
        entry.buyPrice >= 20
    )

    expect(listing).toBeDefined()

    const closedWeek = initial.week
    const operatingCost = computeWeeklyOperatingCost(initial, closedWeek)
    const preWeekFunding = listing!.buyPrice + operatingCost - 1

    const preWeek = {
      ...initial,
      funding: preWeekFunding,
      agency: {
        ...initial.agency!,
        funding: preWeekFunding,
      },
      config: {
        ...initial.config,
        fundingBasePerWeek: 0,
        fundingPerResolution: 0,
        fundingPenaltyPerFail: 0,
        fundingPenaltyPerUnresolved: 0,
      },
    }

    expect(preWeek.funding).toBeGreaterThanOrEqual(listing!.buyPrice)

    const afterWeek = advanceWeek(preWeek)

    expect(afterWeek.funding).toBeLessThan(listing!.buyPrice)
    expect(assessFundingPressure(afterWeek).reasonCodes).toContain('weekly-operating-cost')
    expect(
      getProcurementListings(afterWeek).find((entry) => entry.id === listing!.id)?.buyPrice
    ).toBe(listing!.buyPrice)
  })
})
