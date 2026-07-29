/**
 * SPE-2703: pure, deterministic prerequisite-processing planner.
 *
 * This module plans work only. Callers remain responsible for inventory
 * reservation, authorization, enqueueing, persistence, and lifecycle updates.
 */

export interface PrerequisiteMaterialRequirement {
  readonly materialId: string
  readonly quantity: number
}

export interface PrerequisiteProcessingRecipe {
  readonly recipeId: string
  readonly outputMaterialId: string
  readonly outputQuantity: number
  readonly inputMaterials: readonly PrerequisiteMaterialRequirement[]
  readonly departmentId: string
  readonly taskType: string
  readonly requiredWork: number
}

export interface PrerequisiteFinalRecipe {
  readonly recipeId: string
  readonly inputMaterials: Readonly<Record<string, number>>
}

export interface PrerequisiteWorkOrderDraft {
  readonly id: string
  readonly recipeId: string
  readonly outputMaterialId: string
  readonly outputQuantity: number
  readonly inputMaterials: readonly PrerequisiteMaterialRequirement[]
  readonly batchCount: number
  readonly departmentId: string
  readonly taskType: string
  readonly requiredWork: number
  readonly dependsOnWorkOrderIds: readonly string[]
}

export type PrerequisitePlanningReasonCode =
  | 'invalid-final-recipe'
  | 'invalid-inventory'
  | 'invalid-processing-recipes'
  | 'unrepresentable-processing-quantity'
  | 'missing-processing-recipe'
  | 'ambiguous-processing-recipe'
  | 'cyclic-processing-dependency'

export interface PrerequisitePlanningReason {
  readonly code: PrerequisitePlanningReasonCode
  readonly materialId: string
  readonly recipeIds: readonly string[]
}

export interface PrerequisiteProcessingPlan {
  readonly state: 'planned' | 'blocked'
  readonly finalRecipeId: string | null
  readonly inventoryAllocations: Readonly<Record<string, number>>
  readonly prerequisiteWorkOrders: readonly PrerequisiteWorkOrderDraft[]
  readonly finalDependsOnWorkOrderIds: readonly string[]
  readonly reasons: readonly PrerequisitePlanningReason[]
}

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function isNormalizedNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function frozenReason(
  code: PrerequisitePlanningReasonCode,
  materialId: string,
  recipeIds: readonly string[] = []
): PrerequisitePlanningReason {
  return Object.freeze({
    code,
    materialId,
    recipeIds: Object.freeze([...new Set(recipeIds)].sort(compareCodeUnits)),
  })
}

function isValidRequirement(value: unknown): value is PrerequisiteMaterialRequirement {
  if (!value || typeof value !== 'object') {
    return false
  }
  const requirement = value as Partial<PrerequisiteMaterialRequirement>
  return (
    isNormalizedNonEmptyString(requirement.materialId) &&
    isPositiveSafeInteger(requirement.quantity)
  )
}

function isValidFinalRecipe(value: unknown): value is PrerequisiteFinalRecipe {
  if (!value || typeof value !== 'object') {
    return false
  }
  const recipe = value as Partial<PrerequisiteFinalRecipe>
  return (
    isNormalizedNonEmptyString(recipe.recipeId) &&
    isRecord(recipe.inputMaterials) &&
    Object.entries(recipe.inputMaterials).every(
      ([materialId, quantity]) =>
        isNormalizedNonEmptyString(materialId) && isPositiveSafeInteger(quantity)
    )
  )
}

function isValidProcessingRecipe(value: unknown): value is PrerequisiteProcessingRecipe {
  if (!value || typeof value !== 'object') {
    return false
  }
  const recipe = value as Partial<PrerequisiteProcessingRecipe>
  return (
    isNormalizedNonEmptyString(recipe.recipeId) &&
    isNormalizedNonEmptyString(recipe.outputMaterialId) &&
    isPositiveSafeInteger(recipe.outputQuantity) &&
    Array.isArray(recipe.inputMaterials) &&
    recipe.inputMaterials.every(isValidRequirement) &&
    isNormalizedNonEmptyString(recipe.departmentId) &&
    isNormalizedNonEmptyString(recipe.taskType) &&
    isPositiveSafeInteger(recipe.requiredWork)
  )
}

function freezePlan(
  state: 'planned' | 'blocked',
  finalRecipeId: string | null,
  inventoryAllocations: Record<string, number> = {},
  prerequisiteWorkOrders: readonly PrerequisiteWorkOrderDraft[] = [],
  finalDependsOnWorkOrderIds: readonly string[] = [],
  reasons: readonly PrerequisitePlanningReason[] = []
): PrerequisiteProcessingPlan {
  return Object.freeze({
    state,
    finalRecipeId,
    inventoryAllocations: Object.freeze(
      Object.fromEntries(
        Object.entries(inventoryAllocations).sort(([left], [right]) =>
          compareCodeUnits(left, right)
        )
      )
    ),
    prerequisiteWorkOrders: Object.freeze(
      prerequisiteWorkOrders.map((order) =>
        Object.freeze({
          ...order,
          inputMaterials: Object.freeze(
            order.inputMaterials.map((input) => Object.freeze({ ...input }))
          ),
          dependsOnWorkOrderIds: Object.freeze([...order.dependsOnWorkOrderIds]),
        })
      )
    ),
    finalDependsOnWorkOrderIds: Object.freeze(
      [...new Set(finalDependsOnWorkOrderIds)].sort(compareCodeUnits)
    ),
    reasons: Object.freeze(
      reasons.map((reason) => frozenReason(reason.code, reason.materialId, reason.recipeIds))
    ),
  })
}

/**
 * Plan prerequisite processing in post-order so each draft follows every work
 * order it depends on. Existing inventory is allocated before any draft is
 * generated. Invalid or ambiguous definitions fail closed.
 */
export function planPrerequisiteProcessing(
  finalRecipe: unknown,
  inventory: unknown,
  processingRecipes: unknown
): PrerequisiteProcessingPlan {
  if (!isValidFinalRecipe(finalRecipe)) {
    return freezePlan('blocked', null, {}, [], [], [frozenReason('invalid-final-recipe', '')])
  }
  if (!isRecord(inventory)) {
    return freezePlan(
      'blocked',
      finalRecipe.recipeId,
      {},
      [],
      [],
      [frozenReason('invalid-inventory', '')]
    )
  }
  const inventoryEntries = Object.entries(inventory)
  if (
    !inventoryEntries.every(
      ([materialId, quantity]) =>
        isNormalizedNonEmptyString(materialId) &&
        typeof quantity === 'number' &&
        Number.isSafeInteger(quantity) &&
        quantity >= 0
    )
  ) {
    return freezePlan(
      'blocked',
      finalRecipe.recipeId,
      {},
      [],
      [],
      [frozenReason('invalid-inventory', '')]
    )
  }
  if (!Array.isArray(processingRecipes) || !processingRecipes.every(isValidProcessingRecipe)) {
    return freezePlan(
      'blocked',
      finalRecipe.recipeId,
      {},
      [],
      [],
      [frozenReason('invalid-processing-recipes', '')]
    )
  }

  const recipesByOutput = new Map<string, PrerequisiteProcessingRecipe[]>()
  for (const recipe of processingRecipes) {
    const existing = recipesByOutput.get(recipe.outputMaterialId) ?? []
    recipesByOutput.set(
      recipe.outputMaterialId,
      [...existing, recipe].sort((left, right) => compareCodeUnits(left.recipeId, right.recipeId))
    )
  }
  if (
    new Set(processingRecipes.map((recipe) => recipe.recipeId)).size !== processingRecipes.length
  ) {
    return freezePlan(
      'blocked',
      finalRecipe.recipeId,
      {},
      [],
      [],
      [frozenReason('invalid-processing-recipes', '')]
    )
  }

  const remainingInventory = new Map(inventoryEntries as [string, number][])
  const inventoryAllocations = new Map<string, number>()
  const plannedOutputCredits = new Map<
    string,
    Array<{ readonly producerId: string; quantity: number }>
  >()
  const drafts: PrerequisiteWorkOrderDraft[] = []
  const reasons: PrerequisitePlanningReason[] = []
  const stack: Array<{ readonly materialId: string; readonly recipeId: string }> = []

  function fulfill(materialId: string, quantity: number): readonly string[] | null {
    const directProducerIds: string[] = []
    const fromInventory = Math.min(remainingInventory.get(materialId) ?? 0, quantity)
    if (fromInventory > 0) {
      remainingInventory.set(materialId, (remainingInventory.get(materialId) ?? 0) - fromInventory)
      inventoryAllocations.set(
        materialId,
        (inventoryAllocations.get(materialId) ?? 0) + fromInventory
      )
    }
    let missingQuantity = quantity - fromInventory
    const credits = plannedOutputCredits.get(materialId) ?? []
    for (const credit of credits) {
      if (missingQuantity === 0) {
        break
      }
      const consumed = Math.min(credit.quantity, missingQuantity)
      if (consumed === 0) {
        continue
      }
      credit.quantity -= consumed
      missingQuantity -= consumed
      directProducerIds.push(credit.producerId)
    }
    if (missingQuantity === 0) {
      return Object.freeze([...new Set(directProducerIds)].sort(compareCodeUnits))
    }
    if (stack.some((entry) => entry.materialId === materialId)) {
      reasons.push(
        frozenReason(
          'cyclic-processing-dependency',
          materialId,
          stack.map((entry) => entry.recipeId)
        )
      )
      return null
    }
    const candidates = recipesByOutput.get(materialId) ?? []
    if (candidates.length === 0) {
      reasons.push(frozenReason('missing-processing-recipe', materialId))
      return null
    }
    if (candidates.length > 1) {
      reasons.push(
        frozenReason(
          'ambiguous-processing-recipe',
          materialId,
          candidates.map((recipe) => recipe.recipeId)
        )
      )
      return null
    }

    const recipe = candidates[0]
    stack.push(Object.freeze({ materialId, recipeId: recipe.recipeId }))
    const dependencyIds = [...directProducerIds]
    const batches = Math.ceil(missingQuantity / recipe.outputQuantity)
    if (
      !Number.isSafeInteger(batches) ||
      !Number.isSafeInteger(recipe.outputQuantity * batches) ||
      !Number.isSafeInteger(recipe.requiredWork * batches)
    ) {
      stack.pop()
      reasons.push(
        frozenReason('unrepresentable-processing-quantity', materialId, [recipe.recipeId])
      )
      return null
    }
    for (const input of [...recipe.inputMaterials].sort((left, right) =>
      compareCodeUnits(left.materialId, right.materialId)
    )) {
      const requiredInputQuantity = input.quantity * batches
      if (!Number.isSafeInteger(requiredInputQuantity)) {
        stack.pop()
        reasons.push(
          frozenReason('unrepresentable-processing-quantity', materialId, [recipe.recipeId])
        )
        return null
      }
      const dependencies = fulfill(input.materialId, requiredInputQuantity)
      if (!dependencies) {
        stack.pop()
        return null
      }
      dependencyIds.push(...dependencies)
    }
    stack.pop()

    const id = `${finalRecipe.recipeId}:prerequisite:${recipe.recipeId}:${drafts.length + 1}`
    const outputQuantity = recipe.outputQuantity * batches
    drafts.push(
      Object.freeze({
        id,
        recipeId: recipe.recipeId,
        outputMaterialId: recipe.outputMaterialId,
        outputQuantity,
        inputMaterials: Object.freeze(
          recipe.inputMaterials
            .map((input) =>
              Object.freeze({ materialId: input.materialId, quantity: input.quantity * batches })
            )
            .sort((left, right) => compareCodeUnits(left.materialId, right.materialId))
        ),
        batchCount: batches,
        departmentId: recipe.departmentId,
        taskType: recipe.taskType,
        requiredWork: recipe.requiredWork * batches,
        dependsOnWorkOrderIds: Object.freeze([...new Set(dependencyIds)].sort(compareCodeUnits)),
      })
    )
    const surplus = outputQuantity - missingQuantity
    if (surplus > 0) {
      const outputCredits = plannedOutputCredits.get(materialId) ?? []
      outputCredits.push({ producerId: id, quantity: surplus })
      plannedOutputCredits.set(materialId, outputCredits)
    }
    return Object.freeze([...new Set([...directProducerIds, id])].sort(compareCodeUnits))
  }

  const finalDependencies: string[] = []
  for (const [materialId, quantity] of Object.entries(finalRecipe.inputMaterials).sort(
    ([left], [right]) => compareCodeUnits(left, right)
  )) {
    const dependencies = fulfill(materialId, quantity)
    if (!dependencies) {
      return freezePlan('blocked', finalRecipe.recipeId, {}, [], [], reasons)
    }
    finalDependencies.push(...dependencies)
  }
  return freezePlan(
    'planned',
    finalRecipe.recipeId,
    Object.fromEntries(inventoryAllocations),
    drafts,
    finalDependencies
  )
}
