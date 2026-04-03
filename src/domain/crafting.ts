import {
  getRecipeFundingCost,
  getRecipeInputMaterials,
  type ProductionRecipe,
} from '../data/production'
import type { MarketState, ProductionMaterialRequirement, ProductionQueueEntry } from './models'

export interface ProductionJobSnapshot {
  recipeId: string
  recipeName: string
  recipeDescription: string
  outputItemId: string
  outputItemName: string
  outputQuantity: number
  inputMaterials: ProductionMaterialRequirement[]
  durationWeeks: number
  fundingCost: number
}

export function buildProductionJobSnapshot(
  recipe: ProductionRecipe,
  market: MarketState
): ProductionJobSnapshot {
  return {
    recipeId: recipe.recipeId,
    recipeName: recipe.name,
    recipeDescription: recipe.description,
    outputItemId: recipe.outputItemId,
    outputItemName: recipe.outputItemName,
    outputQuantity: recipe.outputQuantity,
    inputMaterials: getRecipeInputMaterials(recipe),
    durationWeeks: recipe.durationWeeks,
    fundingCost: getRecipeFundingCost(recipe, market),
  }
}

export function buildProductionQueueEntry(
  id: string,
  startedWeek: number,
  snapshot: ProductionJobSnapshot
): ProductionQueueEntry {
  return {
    id,
    recipeId: snapshot.recipeId,
    recipeName: snapshot.recipeName,
    recipeDescription: snapshot.recipeDescription,
    outputItemId: snapshot.outputItemId,
    outputItemName: snapshot.outputItemName,
    outputQuantity: snapshot.outputQuantity,
    inputMaterials: snapshot.inputMaterials.map((material) => ({ ...material })),
    startedWeek,
    durationWeeks: snapshot.durationWeeks,
    remainingWeeks: snapshot.durationWeeks,
    fundingCost: snapshot.fundingCost,
  }
}

export function formatProductionMaterialSummary(
  materials: readonly ProductionMaterialRequirement[] | undefined
) {
  if (!materials || materials.length === 0) {
    return 'No input materials'
  }

  return materials
    .map((material) => `${material.materialName} x${material.quantity}`)
    .join(', ')
}

export function formatProductionOutputLabel(quantity: number, outputName: string) {
  return `${quantity}x ${outputName}`
}
