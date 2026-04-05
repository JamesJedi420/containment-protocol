import {
  appendOperationEventDrafts,
  type AnyOperationEventDraft,
  createProductionQueueStartedDraft,
  createProductionQueueCompletedDraft,
  createMarketShiftedDraft,
} from '../events'
import {
  buildProductionJobSnapshot,
  buildProductionQueueEntry,
  formatProductionMaterialSummary,
  formatProductionOutputLabel,
} from '../crafting'
import { type GameState, type ProductionQueueEntry } from '../models'
import { ensureNormalizedGameState, normalizeGameState } from '../teamSimulation'
import { purchaseMarketInventory as purchaseMarketListingInventory } from './market'
import {
  hasRecipeMaterialStock,
  getProductionRecipe,
  getMarketPressureLabel,
  rollNextMarket,
} from '../../data/production'

function nextQueueId(state: GameState) {
  return `queue-${state.week}-${state.productionQueue.length + 1}-${state.events.length + 1}`
}

export function queueFabrication(state: GameState, recipeId: string): GameState {
  const recipe = getProductionRecipe(recipeId)

  if (!recipe) {
    return ensureNormalizedGameState(state)
  }

  const snapshot = buildProductionJobSnapshot(recipe, state.market)
  const fundingCost = snapshot.fundingCost

  if (state.funding < fundingCost) {
    return ensureNormalizedGameState(state)
  }

  if (!hasRecipeMaterialStock(recipe, state.inventory)) {
    return ensureNormalizedGameState(state)
  }

  const queueEntry: ProductionQueueEntry = buildProductionQueueEntry(
    nextQueueId(state),
    state.week,
    snapshot
  )

  const nextInventory = { ...state.inventory }

  for (const [materialId, quantity] of Object.entries(recipe.inputMaterials)) {
    nextInventory[materialId] = Math.max(0, (state.inventory[materialId] ?? 0) - quantity)
  }

  return normalizeGameState(
    appendOperationEventDrafts(
      {
        ...state,
        funding: state.funding - fundingCost,
        inventory: nextInventory,
        productionQueue: [...state.productionQueue, queueEntry],
      },
      [
        createProductionQueueStartedDraft({
          week: state.week,
          queueId: queueEntry.id,
          queueName: queueEntry.recipeName,
          recipeId: queueEntry.recipeId,
          outputId: queueEntry.outputItemId,
          outputName: queueEntry.outputItemName,
          outputQuantity: queueEntry.outputQuantity,
          etaWeeks: queueEntry.durationWeeks,
          fundingCost,
          inputMaterials: queueEntry.inputMaterials ?? [],
        }),
      ]
    )
  )
}

export function purchaseMarketInventory(
  state: GameState,
  recipeId: string,
  bundles = 1
): GameState {
  return purchaseMarketListingInventory(state, recipeId, bundles)
}

export function advanceProductionQueues(state: GameState) {
  if (state.productionQueue.length === 0) {
    return {
      state: ensureNormalizedGameState(state),
      completed: [] as ProductionQueueEntry[],
      notes: [] as string[],
      eventDrafts: [] as AnyOperationEventDraft[],
    }
  }

  const nextQueue: ProductionQueueEntry[] = []
  const completed: ProductionQueueEntry[] = []
  const nextInventory = { ...state.inventory }
  const notes: string[] = []
  const eventDrafts: AnyOperationEventDraft[] = []

  for (const entry of state.productionQueue) {
    const remainingWeeks = Math.max(entry.remainingWeeks - 1, 0)

    if (remainingWeeks > 0) {
      nextQueue.push({
        ...entry,
        remainingWeeks,
      })
      continue
    }

    completed.push(entry)
    nextInventory[entry.outputItemId] =
      (nextInventory[entry.outputItemId] ?? 0) + entry.outputQuantity
    notes.push(
      `${entry.recipeName}: fabrication completed. Produced ${formatProductionOutputLabel(entry.outputQuantity, entry.outputItemName)} from ${formatProductionMaterialSummary(entry.inputMaterials)}.`
    )
    eventDrafts.push(
      createProductionQueueCompletedDraft({
        week: state.week,
        queueId: entry.id,
        queueName: entry.recipeName,
        recipeId: entry.recipeId,
        outputId: entry.outputItemId,
        outputName: entry.outputItemName,
        outputQuantity: entry.outputQuantity,
        fundingCost: entry.fundingCost,
        inputMaterials: entry.inputMaterials ?? [],
      })
    )
  }

  return {
    state: normalizeGameState({
      ...state,
      inventory: nextInventory,
      productionQueue: nextQueue,
    }),
    completed,
    notes,
    eventDrafts,
  }
}

export function advanceMarketState(state: GameState, rng: () => number) {
  const nextMarket = rollNextMarket(state.week, rng)
  const featuredRecipe = getProductionRecipe(nextMarket.featuredRecipeId)

  return {
    state: normalizeGameState({
      ...state,
      market: nextMarket,
    }),
    eventDrafts: [
      createMarketShiftedDraft({
        week: nextMarket.week,
        featuredRecipeId: nextMarket.featuredRecipeId,
        featuredRecipeName: featuredRecipe?.name ?? nextMarket.featuredRecipeId,
        pressure: nextMarket.pressure,
        costMultiplier: nextMarket.costMultiplier,
      }),
    ],
    notes: [
      `Market shift: ${getMarketPressureLabel(nextMarket.pressure)} conditions. Featured fabrication ${featuredRecipe?.name ?? nextMarket.featuredRecipeId}.`,
    ],
  }
}
