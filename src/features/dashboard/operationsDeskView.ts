import {
  getMarketPressureLabel,
  getProductionRecipe,
  getRecipeFundingCost,
  inventoryItemLabels,
  productionCatalog,
} from '../../data/production'
import { type GameState } from '../../domain/models'
import { getTeamMemberIds } from '../../domain/teamSimulation'
import {
  getFieldStatusViews,
  getOperationsDeskAdvisories,
  getOperationsDeskPerformance,
} from './dashboardView'

type BaseFieldStatusView = ReturnType<typeof getFieldStatusViews>[number]

export interface FieldStatusPanelView extends BaseFieldStatusView {
  agentNames: string[]
}

export interface FabricationQueuePanelView {
  id: string
  recipeName: string
  outputLabel: string
  timingLabel: string
  remainingLabel: string
}

export interface FabricationRecipePanelView {
  recipeId: string
  name: string
  outputLabel: string
  fundingCost: number
  affordable: boolean
}

export interface OperationsDeskPanelsView {
  fieldStatusViews: FieldStatusPanelView[]
  advisories: ReturnType<typeof getOperationsDeskAdvisories>
  fabricationQueue: FabricationQueuePanelView[]
  fabricationRecipes: FabricationRecipePanelView[]
  market: {
    featuredRecipeName: string
    supplyPressureLabel: string
    costMultiplierLabel: string
  }
  performance: ReturnType<typeof getOperationsDeskPerformance>
  inventoryRows: Array<{ itemId: string; label: string; quantity: number }>
}

export function getOperationsDeskPanelsView(game: GameState): OperationsDeskPanelsView {
  return {
    fieldStatusViews: getFieldStatusViews(game).map((view) => ({
      ...view,
      agentNames:
        getTeamMemberIds(view.team)
          .map((agentId) => game.agents[agentId]?.name)
          .filter((agentName): agentName is string => Boolean(agentName)) ?? [],
    })),
    advisories: getOperationsDeskAdvisories(game),
    fabricationQueue: game.productionQueue.map((entry) => ({
      id: entry.id,
      recipeName: entry.recipeName,
      outputLabel: `${entry.outputQuantity}x ${entry.outputItemName}`,
      timingLabel: `Started week ${entry.startedWeek} / ${entry.durationWeeks}w duration`,
      remainingLabel: `${entry.remainingWeeks}w remaining`,
    })),
    fabricationRecipes: productionCatalog.map((recipe) => {
      const fundingCost = getRecipeFundingCost(recipe, game.market)

      return {
        recipeId: recipe.recipeId,
        name: recipe.name,
        outputLabel: `${recipe.outputQuantity}x ${recipe.outputItemName} / ${recipe.durationWeeks}w / $${fundingCost}`,
        fundingCost,
        affordable: game.funding >= fundingCost,
      }
    }),
    market: {
      featuredRecipeName:
        getProductionRecipe(game.market.featuredRecipeId)?.name ?? game.market.featuredRecipeId,
      supplyPressureLabel: getMarketPressureLabel(game.market.pressure),
      costMultiplierLabel: `${game.market.costMultiplier.toFixed(2)}x`,
    },
    performance: getOperationsDeskPerformance(game),
    inventoryRows: Object.entries(game.inventory)
      .map(([itemId, quantity]) => ({
        itemId,
        label: inventoryItemLabels[itemId] ?? itemId,
        quantity,
      }))
      .sort((left, right) => left.label.localeCompare(right.label) || left.itemId.localeCompare(right.itemId)),
  }
}
