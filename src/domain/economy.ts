import { productionCatalog, productionMaterialCatalog } from '../data/production'
import { getCurrentMarketTransactions } from './market'
import { buildLogisticsOverview } from './logistics'
import { buildItemizationOverview } from './itemization'
import type { GameState } from './models'

export interface EconomyLoopRecipeEdge {
  recipeId: string
  recipeName: string
  outputName: string
  featured: boolean
  fabricationCost: number
  marketCost: number
  savings: number
  markup: number
}

export interface EconomyLoopMaterialPressure {
  materialId: string
  label: string
  stock: number
  queuedDemand: number
  blockingRecipeCount: number
}

export interface EconomyRewardFlowSummary {
  funding: number
  materials: number
  equipment: number
  factionStandingNet: number
}

export interface EconomyTransactionSummary {
  purchases: number
  sales: number
  netFunding: number
  unitsMoved: number
  transactionCount: number
}

export interface EconomyLoopOverview {
  funding: number
  marketWeek: number
  pressureLabel: string
  totalStock: number
  inventoryLiquidationValue: number
  queuedOrders: number
  queuedOutputUnits: number
  transactionSummary: EconomyTransactionSummary
  rewardFlow: EconomyRewardFlowSummary
  bestRecipeEdges: EconomyLoopRecipeEdge[]
  materialPressure: EconomyLoopMaterialPressure[]
}

function buildTransactionSummary(game: GameState): EconomyTransactionSummary {
  const transactions = getCurrentMarketTransactions(game)

  return transactions.reduce<EconomyTransactionSummary>(
    (summary, transaction) => {
      if (transaction.action === 'buy') {
        summary.purchases += transaction.totalPrice
        summary.netFunding -= transaction.totalPrice
      } else {
        summary.sales += transaction.totalPrice
        summary.netFunding += transaction.totalPrice
      }

      summary.unitsMoved += transaction.quantity
      summary.transactionCount += 1
      return summary
    },
    {
      purchases: 0,
      sales: 0,
      netFunding: 0,
      unitsMoved: 0,
      transactionCount: 0,
    }
  )
}

function buildRewardFlowSummary(game: GameState): EconomyRewardFlowSummary {
  const latestReport = game.reports.at(-1)

  if (!latestReport?.caseSnapshots) {
    return {
      funding: 0,
      materials: 0,
      equipment: 0,
      factionStandingNet: 0,
    }
  }

  return Object.values(latestReport.caseSnapshots).reduce<EconomyRewardFlowSummary>(
    (summary, snapshot) => {
      const reward = snapshot.rewardBreakdown

      if (!reward) {
        return summary
      }

      summary.funding += reward.fundingDelta
      summary.materials += reward.inventoryRewards
        .filter((entry) => entry.kind === 'material')
        .reduce((sum, entry) => sum + entry.quantity, 0)
      summary.equipment += reward.inventoryRewards
        .filter((entry) => entry.kind === 'equipment')
        .reduce((sum, entry) => sum + entry.quantity, 0)
      summary.factionStandingNet += reward.factionStanding.reduce(
        (sum, entry) => sum + entry.delta,
        0
      )

      return summary
    },
    {
      funding: 0,
      materials: 0,
      equipment: 0,
      factionStandingNet: 0,
    }
  )
}

function buildMaterialPressure(game: GameState): EconomyLoopMaterialPressure[] {
  const queuedDemand = new Map<string, number>()

  for (const entry of game.productionQueue) {
    const recipe = productionCatalog.find((candidate) => candidate.recipeId === entry.recipeId)
    if (!recipe) {
      continue
    }

    for (const [materialId, quantity] of Object.entries(recipe.inputMaterials)) {
      queuedDemand.set(materialId, (queuedDemand.get(materialId) ?? 0) + quantity)
    }
  }

  return productionMaterialCatalog
    .map((material) => {
      const stock = Math.max(0, Math.trunc(game.inventory[material.materialId] ?? 0))
      const blockingRecipeCount = productionCatalog.filter(
        (recipe) =>
          Object.prototype.hasOwnProperty.call(recipe.inputMaterials, material.materialId) &&
          stock < recipe.inputMaterials[material.materialId]!
      ).length

      return {
        materialId: material.materialId,
        label: material.name,
        stock,
        queuedDemand: queuedDemand.get(material.materialId) ?? 0,
        blockingRecipeCount,
      } satisfies EconomyLoopMaterialPressure
    })
    .sort(
      (left, right) =>
        right.blockingRecipeCount - left.blockingRecipeCount ||
        right.queuedDemand - left.queuedDemand ||
        left.stock - right.stock ||
        left.label.localeCompare(right.label)
    )
    .slice(0, 5)
}

export function buildEconomyLoopOverview(game: GameState): EconomyLoopOverview {
  const logistics = buildLogisticsOverview(game)
  const itemization = buildItemizationOverview(game)
  const inventoryLiquidationValue = Math.round(
    itemization.entries.reduce(
      (sum, entry) => sum + entry.stock * (entry.bestUnitSellPrice ?? 0),
      0
    )
  )

  return {
    funding: game.funding,
    marketWeek: game.market.week,
    pressureLabel: logistics.pressureLabel,
    totalStock: itemization.totalStock,
    inventoryLiquidationValue,
    queuedOrders: game.productionQueue.length,
    queuedOutputUnits: itemization.queuedOutputUnits,
    transactionSummary: buildTransactionSummary(game),
    rewardFlow: buildRewardFlowSummary(game),
    bestRecipeEdges: logistics.recipeBreakdowns
      .map((recipe) => ({
        recipeId: recipe.recipeId,
        recipeName: recipe.recipeName,
        outputName: recipe.outputName,
        featured: recipe.featured,
        fabricationCost: recipe.fabricationCost,
        marketCost: recipe.marketCost,
        savings: Math.max(0, recipe.marketCost - recipe.fabricationCost),
        markup: recipe.markup,
      }))
      .sort(
        (left, right) =>
          right.savings - left.savings || left.recipeName.localeCompare(right.recipeName)
      )
      .slice(0, 4),
    materialPressure: buildMaterialPressure(game),
  }
}
