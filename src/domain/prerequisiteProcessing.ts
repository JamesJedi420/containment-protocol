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
    !!recipe.inputMaterials &&
    typeof recipe.inputMaterials === 'object' &&
    !Array.isArray(recipe.inputMaterials) &&
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
  if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) {
    return freezePlan(
      'blocked',
      finalRecipe.recipeId,
      {},
      [],
      [],
      [frozenReason('invalid-inventory', '')]
    )
  }
  const inventoryEntries = Object.entries(inventory as Record<string, unknown>)
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

  const remainingInventory = Object.fromEntries(inventoryEntries) as Record<string, number>
  const inventoryAllocations: Record<string, number> = {}
  const drafts: PrerequisiteWorkOrderDraft[] = []
  const reasons: PrerequisitePlanningReason[] = []
  const stack: string[] = []

  function fulfill(materialId: string, quantity: number): readonly string[] | null {
    const fromInventory = Math.min(remainingInventory[materialId] ?? 0, quantity)
    if (fromInventory > 0) {
      remainingInventory[materialId] = (remainingInventory[materialId] ?? 0) - fromInventory
      inventoryAllocations[materialId] = (inventoryAllocations[materialId] ?? 0) + fromInventory
    }
    const missingQuantity = quantity - fromInventory
    if (missingQuantity === 0) {
      return []
    }
    if (stack.includes(materialId)) {
      reasons.push(frozenReason('cyclic-processing-dependency', materialId, stack))
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
    stack.push(materialId)
    const dependencyIds: string[] = []
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
    drafts.push(
      Object.freeze({
        id,
        recipeId: recipe.recipeId,
        outputMaterialId: recipe.outputMaterialId,
        outputQuantity: recipe.outputQuantity * batches,
        batchCount: batches,
        departmentId: recipe.departmentId,
        taskType: recipe.taskType,
        requiredWork: recipe.requiredWork * batches,
        dependsOnWorkOrderIds: Object.freeze([...new Set(dependencyIds)].sort(compareCodeUnits)),
      })
    )
    return [id]
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
    inventoryAllocations,
    drafts,
    finalDependencies
  )
}
