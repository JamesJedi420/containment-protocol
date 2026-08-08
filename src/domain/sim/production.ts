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
  resolveProductionRecipeGradeOutcome,
} from '../crafting'
import { type FabricatedEquipmentLot, type GameState, type ProductionQueueEntry } from '../models'
import { isEquipmentGradeId } from '../equipmentGrade'
import {
  EQUIPMENT_GRADE_FABRICATION_EXPLANATION_CODES,
  isEquipmentGradeFabricationExplanationCode,
} from '../equipmentGradeFabrication'
import { isCaseScopedWorkshopFinalizationHandoff } from '../prerequisiteProcessingOrders'
import { stripInfiltrationEncounterCoverStanceOnResolvedCase } from '../infiltrationEncounterCoverStanceTick'
import { ensureNormalizedGameState, normalizeGameState } from '../teamSimulation'
import { purchaseMarketInventory as purchaseMarketListingInventory } from './market'
import {
  hasRecipeMaterialStock,
  getProductionRecipe,
  getMarketPressureLabel,
  inventoryItemLabels,
  rollNextMarket,
} from '../../data/production'

const UNSAFE_PRODUCTION_QUEUE_IDS = new Set(['__proto__', 'constructor', 'prototype'])
const INTEGER_INDEX_PATTERN = /^(0|[1-9]\d*)$/

export function isSafeProductionQueueId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value === value.trim() &&
    !INTEGER_INDEX_PATTERN.test(value) &&
    !UNSAFE_PRODUCTION_QUEUE_IDS.has(value)
  )
}

function hasOwn(object: object, key: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function nextQueueId(state: GameState) {
  const reserved = new Set([
    ...state.productionQueue.map((entry) => entry.id),
    ...Object.keys(state.fabricatedEquipmentLots ?? {}),
  ])
  const baseId = `queue-${state.week}-${state.productionQueue.length + 1}-${state.events.length + 1}`
  let candidate = baseId
  let suffix = 2

  while (reserved.has(candidate)) {
    candidate = `${baseId}-${suffix}`
    suffix += 1
  }

  return candidate
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
  outputGradeId?: unknown
  outputGradeVisibility?: unknown
  outputGradeExplanationCodes?: unknown
}) {
  const productionOutput = reconcileProductionEventRecipeOutput(
    payload.recipeId,
    payload.outputId,
    payload.outputName
  )

  const gradeSnapshot = reconcileProductionGradeSnapshot(
    payload.recipeId,
    payload.outputGradeId,
    payload.outputGradeVisibility,
    payload.outputGradeExplanationCodes
  )

  return {
    recipeId: productionOutput.recipeId,
    outputId: productionOutput.outputId,
    outputName: productionOutput.outputName,
    outputQuantity: Math.max(1, Math.trunc(coerceFiniteNumber(payload.outputQuantity, 1))),
    etaWeeks: Math.max(1, Math.trunc(coerceFiniteNumber(payload.etaWeeks, 1))),
    fundingCost: Math.max(0, Math.trunc(coerceFiniteNumber(payload.fundingCost, 0))),
    ...gradeSnapshot,
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
  outputGradeId?: unknown
}) {
  const productionOutput = reconcileProductionEventRecipeOutput(
    payload.recipeId,
    payload.outputId,
    payload.outputName
  )

  const gradeSnapshot = reconcileProductionGradeSnapshot(
    payload.recipeId,
    payload.outputGradeId,
    undefined,
    undefined,
    true
  )

  return {
    recipeId: productionOutput.recipeId,
    outputId: productionOutput.outputId,
    outputName: productionOutput.outputName,
    outputQuantity: Math.max(1, Math.trunc(coerceFiniteNumber(payload.outputQuantity, 1))),
    fundingCost: Math.max(0, Math.trunc(coerceFiniteNumber(payload.fundingCost, 0))),
    outputGradeId: gradeSnapshot?.outputGradeId,
  }
}

export function reconcileProductionGradeSnapshot(
  recipeIdValue: unknown,
  gradeIdValue: unknown,
  visibilityValue: unknown,
  explanationCodesValue: unknown,
  allowGradeOnlySnapshot = false
) {
  const recipe = typeof recipeIdValue === 'string' ? getProductionRecipe(recipeIdValue) : undefined
  if (!recipe) return undefined

  const legacySnapshot =
    gradeIdValue === undefined &&
    visibilityValue === undefined &&
    explanationCodesValue === undefined
  if (legacySnapshot) {
    const resolution = resolveProductionRecipeGradeOutcome(recipe)
    return resolution.valid
      ? {
          outputGradeId: resolution.participation.gradeId,
          outputGradeVisibility: resolution.visibility,
          outputGradeExplanationCodes: [...resolution.explanationCodes],
        }
      : undefined
  }

  if (
    !allowGradeOnlySnapshot &&
    (gradeIdValue === undefined ||
      visibilityValue === undefined ||
      explanationCodesValue === undefined)
  ) {
    return undefined
  }

  if (!isEquipmentGradeId(gradeIdValue)) return undefined
  const outputGradeVisibility =
    visibilityValue === undefined
      ? 'known'
      : visibilityValue === 'known' || visibilityValue === 'hidden'
        ? visibilityValue
        : undefined
  if (!outputGradeVisibility) return undefined

  const outputGradeExplanationCodes =
    explanationCodesValue === undefined
      ? []
      : Array.isArray(explanationCodesValue) &&
          explanationCodesValue.length > 0 &&
          explanationCodesValue.every(isEquipmentGradeFabricationExplanationCode)
        ? EQUIPMENT_GRADE_FABRICATION_EXPLANATION_CODES.filter((code) =>
            explanationCodesValue.includes(code)
          )
        : undefined
  if (!outputGradeExplanationCodes) return undefined

  // A complete, canonical snapshot is historical queue truth. Do not compare it
  // with the current recipe: catalog/rule edits must not rewrite in-flight jobs.
  return { outputGradeId: gradeIdValue, outputGradeVisibility, outputGradeExplanationCodes }
}

export function queueFabrication(state: GameState, recipeId: string): GameState {
  const recipe = getProductionRecipe(recipeId)

  if (!recipe) {
    return ensureNormalizedGameState(state)
  }

  if (!resolveProductionRecipeGradeOutcome(recipe).valid) {
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
          outputGradeId: queueEntry.outputGradeId,
          outputGradeVisibility: queueEntry.outputGradeVisibility,
          outputGradeExplanationCodes: queueEntry.outputGradeExplanationCodes,
        }),
      ]
    )
  )
}

function compareCaseIds(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

/**
 * SPE-2766: consume each durable workshop finalization handoff into global
 * Fabrication at most once. Stock/funding failures leave the handoff intact.
 */
export function enqueueCaseScopedWorkshopFinalizationFabrication(state: GameState): GameState {
  if (!state.cases) {
    return ensureNormalizedGameState(state)
  }

  let next = state
  let changed = false

  for (const caseId of Object.keys(next.cases).sort(compareCaseIds)) {
    const currentCase = next.cases[caseId]
    if (
      !currentCase ||
      currentCase.id !== caseId ||
      (currentCase.status !== 'open' && currentCase.status !== 'in_progress')
    ) {
      continue
    }

    const handoff = currentCase.departmentWorkshopFinalizationHandoff
    if (!isCaseScopedWorkshopFinalizationHandoff(handoff)) {
      continue
    }

    if (
      typeof currentCase.departmentWorkshopFinalizationFabricationQueueId === 'string' &&
      currentCase.departmentWorkshopFinalizationFabricationQueueId.trim().length > 0
    ) {
      continue
    }

    const beforeIds = new Set(next.productionQueue.map((entry) => entry.id))
    const attempted = queueFabrication(next, handoff.finalRecipeId)
    const newEntry = attempted.productionQueue.find((entry) => !beforeIds.has(entry.id))
    if (!newEntry || newEntry.recipeId !== handoff.finalRecipeId) {
      continue
    }

    const attemptedCase = attempted.cases[caseId]
    if (!attemptedCase) {
      continue
    }

    changed = true
    next = {
      ...attempted,
      cases: {
        ...attempted.cases,
        [caseId]: {
          ...attemptedCase,
          departmentWorkshopFinalizationFabricationQueueId: newEntry.id,
        },
      },
    }
  }

  return changed ? next : state
}

/**
 * SPE-2767: resolve open workshop-finalization cases once durable Fabrication
 * enqueue proof exists. Does not wait for production completion or run mission
 * scoring.
 */
export function resolveCaseScopedWorkshopFinalizationCases(state: GameState): GameState {
  if (!state.cases) {
    return ensureNormalizedGameState(state)
  }

  let cases = state.cases
  let changed = false

  for (const caseId of Object.keys(cases).sort(compareCaseIds)) {
    const currentCase = cases[caseId]
    if (
      !currentCase ||
      currentCase.id !== caseId ||
      (currentCase.status !== 'open' && currentCase.status !== 'in_progress')
    ) {
      continue
    }

    if (
      !isCaseScopedWorkshopFinalizationHandoff(currentCase.departmentWorkshopFinalizationHandoff)
    ) {
      continue
    }

    const queueId = currentCase.departmentWorkshopFinalizationFabricationQueueId
    if (typeof queueId !== 'string' || queueId.trim().length === 0) {
      continue
    }

    if (!changed) {
      cases = { ...state.cases }
      changed = true
    }

    cases[caseId] = stripInfiltrationEncounterCoverStanceOnResolvedCase({
      ...currentCase,
      assignedTeamIds: [],
      status: 'resolved',
      weeksRemaining: 0,
    })
  }

  return changed ? { ...state, cases } : state
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
  const fabricatedEquipmentLots = { ...(state.fabricatedEquipmentLots ?? {}) }

  const nextQueue: ProductionQueueEntry[] = []
  const eventDrafts: AnyOperationEventDraft[] = []

  for (const entry of state.productionQueue) {
    if (!isSafeProductionQueueId(entry.id)) {
      nextQueue.push(entry)
      continue
    }

    const existingLot = hasOwn(fabricatedEquipmentLots, entry.id)
      ? fabricatedEquipmentLots[entry.id]
      : undefined
    if (
      existingLot &&
      existingLot.queueId === entry.id &&
      existingLot.recipeId === entry.recipeId &&
      existingLot.itemId === entry.outputItemId &&
      existingLot.quantity === entry.outputQuantity &&
      existingLot.gradeId === entry.outputGradeId
    ) {
      continue
    }
    if (existingLot) {
      nextQueue.push(entry)
      continue
    }

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
      const lot: FabricatedEquipmentLot = Object.freeze({
        queueId: entry.id,
        recipeId: entry.recipeId,
        itemId: entry.outputItemId,
        quantity: entry.outputQuantity,
        gradeId: entry.outputGradeId,
        completedWeek: state.week,
      })
      fabricatedEquipmentLots[entry.id] = lot
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
          outputGradeId: entry.outputGradeId,
        })
      )
    }
  }

  return {
    state: normalizeGameState({
      ...state,
      inventory: nextInventory,
      productionQueue: nextQueue,
      fabricatedEquipmentLots,
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
