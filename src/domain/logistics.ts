import {
  getMarketPressureLabel,
  getRecipeFundingCost,
  getRecipeMarketBuyCost,
  productionCatalog,
  type ProductionRecipe,
} from '../data/production'
import type { GameState, MarketState } from './models'

export interface RecipeEconomyBreakdown {
  recipeId: string
  recipeName: string
  outputName: string
  outputQuantity: number
  durationWeeks: number
  fabricationCost: number
  marketCost: number
  featured: boolean
  pressureLabel: string
  markup: number
  costPerUnitFabrication: number
  costPerUnitMarket: number
}

export interface LogisticsOverview {
  totalStock: number
  queuedOrders: number
  featuredRecipeId: string
  pressureLabel: string
  recipeBreakdowns: RecipeEconomyBreakdown[]
}

export function buildRecipeEconomyBreakdown(
  recipe: ProductionRecipe,
  market: MarketState
): RecipeEconomyBreakdown {
  const fabricationCost = getRecipeFundingCost(recipe, market)
  const marketCost = getRecipeMarketBuyCost(recipe, market)

  return {
    recipeId: recipe.recipeId,
    recipeName: recipe.name,
    outputName: recipe.outputItemName,
    outputQuantity: recipe.outputQuantity,
    durationWeeks: recipe.durationWeeks,
    fabricationCost,
    marketCost,
    featured: market.featuredRecipeId === recipe.recipeId,
    pressureLabel: getMarketPressureLabel(market.pressure),
    markup: Number((marketCost / Math.max(1, fabricationCost)).toFixed(2)),
    costPerUnitFabrication: Number((fabricationCost / recipe.outputQuantity).toFixed(2)),
    costPerUnitMarket: Number((marketCost / recipe.outputQuantity).toFixed(2)),
  }
}

export function buildLogisticsOverview(game: GameState): LogisticsOverview {
  return {
    totalStock: Object.values(game.inventory).reduce((sum, quantity) => sum + quantity, 0),
    queuedOrders: game.productionQueue.length,
    featuredRecipeId: game.market.featuredRecipeId,
    pressureLabel: getMarketPressureLabel(game.market.pressure),
    recipeBreakdowns: productionCatalog.map((recipe) =>
      buildRecipeEconomyBreakdown(recipe, game.market)
    ),
  }
}
