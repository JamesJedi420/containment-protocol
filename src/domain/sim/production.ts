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
  inventoryItemLabels,
  rollNextMarket,
} from '../../data/production'

function nextQueueId(state: GameState) {
  return `queue-${state.week}-${state.productionQueue.length + 1}-${state.events.length + 1}`
}

function coerceFiniteNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (trimmed.length > 0) {
      const parsed = Number(trimmed)

      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return fallback
}

/** Hydration: resolve recipeId/output against catalog (id match, else preserve legacy ids/names). */
export function reconcileProductionEventRecipeOutput(
  recipeIdValue: unknown,
  outputIdValue: unknown,
  outputNameValue: unknown
): { recipeId: string; outputId: string; outputName: string } {
  const recipeById =
    typeof recipeIdValue === 'string' && getProductionRecipe(recipeIdValue)
      ? getProductionRecipe(recipeIdValue)
      : undefined
  const recipe = recipeById ?? undefined

  if (!recipe) {
    const fallbackOutputId = typeof outputIdValue === 'string' ? outputIdValue : 'output-1'
    const fallbackOutputName =
      typeof outputNameValue === 'string' && outputNameValue.trim().length > 0
        ? outputNameValue.trim()
        : (inventoryItemLabels[fallbackOutputId] ?? 'Output 1')

    return {
      recipeId: typeof recipeIdValue === 'string' ? recipeIdValue : 'recipe-1',
      outputId: fallbackOutputId,
      outputName: fallbackOutputName,
    }
  }

  return {
    recipeId: recipe.recipeId,
    outputId: recipe.outputItemId,
    outputName: recipe.outputItemName,
  }
}

/**
 * Hydration: catalog recipe output + finite positive etaWeeks/outputQuantity + nonnegative fundingCost.
 * Does not rewrite fundingCost to catalog/market bands (scaled costs must survive).
 */
export function reconcileProductionQueueStartedFields(payload: {
  recipeId?: unknown
  outputId?: unknown
  outputName?: unknown
  outputQuantity?: unknown
  etaWeeks?: unknown
  fundingCost?: unknown
}) {
  const productionOutput = reconcileProductionEventRecipeOutput(
    payload.recipeId,
    payload.outputId,
    payload.outputName
  )

  return {
    recipeId: productionOutput.recipeId,
    outputId: productionOutput.outputId,
    outputName: productionOutput.outputName,
    outputQuantity: Math.max(1, Math.trunc(coerceFiniteNumber(payload.outputQuantity, 1))),
    etaWeeks: Math.max(1, Math.trunc(coerceFiniteNumber(payload.etaWeeks, 1))),
    fundingCost: Math.max(0, Math.trunc(coerceFiniteNumber(payload.fundingCost, 0))),
  }
}

/**
 * Hydration: catalog recipe output + finite positive outputQuantity + nonnegative fundingCost.
 * Does not rewrite fundingCost to catalog/market bands (scaled costs must survive).
 */
export function reconcileProductionQueueCompletedFields(payload: {
  recipeId?: unknown
  outputId?: unknown
  outputName?: unknown
  outputQuantity?: unknown
  fundingCost?: unknown
}) {
  const productionOutput = reconcileProductionEventRecipeOutput(
    payload.recipeId,
    payload.outputId,
    payload.outputName
  )

  return {
    recipeId: productionOutput.recipeId,
    outputId: productionOutput.outputId,
    outputName: productionOutput.outputName,
    outputQuantity: Math.max(1, Math.trunc(coerceFiniteNumber(payload.outputQuantity, 1))),
    fundingCost: Math.max(0, Math.trunc(coerceFiniteNumber(payload.fundingCost, 0))),
  }
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
      completed: [],
      notes: [],
      eventDrafts: [],
    }
  }

  const completed: ProductionQueueEntry[] = []
  const notes: string[] = []
  const nextInventory = { ...state.inventory }

  const nextQueue: ProductionQueueEntry[] = []
  const eventDrafts: AnyOperationEventDraft[] = []

  for (const entry of state.productionQueue) {
    const remainingWeeks = Math.max(entry.remainingWeeks - 1, 0)
    if (remainingWeeks > 0) {
      nextQueue.push({
        ...entry,
        remainingWeeks,
      })
    } else {
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
  const market: typeof nextMarket = {
    ...nextMarket,
    licensedHandlingAttestationWeek: state.market.licensedHandlingAttestationWeek,
  }

  return {
    state: normalizeGameState({
      ...state,
      market,
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
