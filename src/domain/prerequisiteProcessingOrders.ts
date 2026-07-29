import type {
  PrerequisiteProcessingPlan,
  PrerequisiteWorkOrderDraft,
} from './prerequisiteProcessing'

export interface PrerequisiteProcessingMaterialQuantity {
  readonly materialId: string
  readonly quantity: number
}

export interface CaseScopedPrerequisiteProcessingOrder {
  readonly workOrderId: string
  readonly caseId: string
  readonly processingRecipeId: string
  readonly inputMaterials: readonly PrerequisiteProcessingMaterialQuantity[]
  readonly outputMaterialId: string
  readonly outputQuantity: number
  readonly prerequisiteWorkOrderIds: readonly string[]
}

export type CaseScopedPrerequisiteProcessingOrderRegistry = Record<
  string,
  CaseScopedPrerequisiteProcessingOrder
>

interface CaseSource {
  readonly cases?: unknown
}

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isSafeId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value === value.trim() &&
    value !== '__proto__' &&
    value !== 'constructor' &&
    value !== 'prototype'
  )
}

function isValueId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim()
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function hasOpenCase(source: CaseSource, caseId: string) {
  if (!isRecord(source?.cases)) return false
  const candidate = source.cases[caseId]
  return isRecord(candidate) && candidate.id === caseId && candidate.status !== 'resolved'
}

function frozenOrder(order: CaseScopedPrerequisiteProcessingOrder) {
  return Object.freeze({
    ...order,
    inputMaterials: Object.freeze(order.inputMaterials.map((input) => Object.freeze({ ...input }))),
    prerequisiteWorkOrderIds: Object.freeze([...order.prerequisiteWorkOrderIds]),
  })
}

function isValidMaterialQuantity(value: unknown): value is PrerequisiteProcessingMaterialQuantity {
  return isRecord(value) && isValueId(value.materialId) && isPositiveSafeInteger(value.quantity)
}

function isValidOrder(
  value: unknown,
  source: CaseSource
): value is CaseScopedPrerequisiteProcessingOrder {
  if (!isRecord(value)) return false
  const order = value as Partial<CaseScopedPrerequisiteProcessingOrder>
  return (
    isSafeId(order.workOrderId) &&
    isSafeId(order.caseId) &&
    hasOpenCase(source, order.caseId) &&
    isValueId(order.processingRecipeId) &&
    Array.isArray(order.inputMaterials) &&
    order.inputMaterials.every(isValidMaterialQuantity) &&
    isValueId(order.outputMaterialId) &&
    isPositiveSafeInteger(order.outputQuantity) &&
    Array.isArray(order.prerequisiteWorkOrderIds) &&
    order.prerequisiteWorkOrderIds.every(isSafeId) &&
    new Set(order.prerequisiteWorkOrderIds).size === order.prerequisiteWorkOrderIds.length
  )
}

function hasPrerequisiteCycle(
  candidates: ReadonlyMap<string, CaseScopedPrerequisiteProcessingOrder>,
  workOrderId: string,
  visiting = new Set<string>(),
  visited = new Set<string>()
): boolean {
  if (visiting.has(workOrderId)) return true
  if (visited.has(workOrderId)) return false
  const order = candidates.get(workOrderId)
  if (!order) return false
  visiting.add(workOrderId)
  const cyclic = order.prerequisiteWorkOrderIds.some((prerequisiteWorkOrderId) =>
    hasPrerequisiteCycle(candidates, prerequisiteWorkOrderId, visiting, visited)
  )
  visiting.delete(workOrderId)
  visited.add(workOrderId)
  return cyclic
}

/** Hydration boundary for case-owned prerequisite processing envelopes. */
export function sanitizeCaseScopedPrerequisiteProcessingOrders(
  value: unknown,
  source: CaseSource
): CaseScopedPrerequisiteProcessingOrderRegistry {
  if (!isRecord(value)) return Object.freeze({})
  const candidates = new Map<string, CaseScopedPrerequisiteProcessingOrder>()
  for (const [key, rawOrder] of Object.entries(value)) {
    if (!isSafeId(key) || !isValidOrder(rawOrder, source) || rawOrder.workOrderId !== key) continue
    candidates.set(key, frozenOrder(rawOrder))
  }
  let removed = true
  while (removed) {
    removed = false
    for (const [workOrderId, order] of candidates) {
      if (
        order.prerequisiteWorkOrderIds.includes(workOrderId) ||
        order.prerequisiteWorkOrderIds.some(
          (prerequisiteWorkOrderId) =>
            !candidates.has(prerequisiteWorkOrderId) ||
            candidates.get(prerequisiteWorkOrderId)?.caseId !== order.caseId
        ) ||
        hasPrerequisiteCycle(candidates, workOrderId)
      ) {
        candidates.delete(workOrderId)
        removed = true
      }
    }
  }
  const entries = [...candidates.entries()]
  entries.sort(([left], [right]) => compareCodeUnits(left, right))
  return Object.freeze(Object.fromEntries(entries))
}

function toCaseScopedWorkOrderId(caseId: string, draftWorkOrderId: string) {
  return `processing:${caseId.length}:${caseId}:${draftWorkOrderId}`
}

/** Pure read seam for the durable prerequisite-processing envelope registry. */
export function readCaseScopedPrerequisiteProcessingOrders(
  source: CaseSource & {
    readonly caseScopedPrerequisiteProcessingOrders?: unknown
  }
): CaseScopedPrerequisiteProcessingOrderRegistry {
  return sanitizeCaseScopedPrerequisiteProcessingOrders(
    source?.caseScopedPrerequisiteProcessingOrders,
    source
  )
}

function buildOrder(
  draft: PrerequisiteWorkOrderDraft,
  caseId: string,
  workOrderId: string,
  prerequisiteWorkOrderIds: readonly string[]
): CaseScopedPrerequisiteProcessingOrder {
  return frozenOrder({
    workOrderId,
    caseId,
    processingRecipeId: draft.recipeId,
    inputMaterials: Object.freeze(draft.inputMaterials.map((input) => Object.freeze({ ...input }))),
    outputMaterialId: draft.outputMaterialId,
    outputQuantity: draft.outputQuantity,
    prerequisiteWorkOrderIds: Object.freeze([...prerequisiteWorkOrderIds]),
  })
}

/**
 * Adapt a successful planner result into case-owned envelopes only. No workshop
 * order, inventory reservation, queue, or completion output is created here.
 */
export function createCaseScopedPrerequisiteProcessingOrders(
  plan: PrerequisiteProcessingPlan,
  caseId: string,
  source: CaseSource
): CaseScopedPrerequisiteProcessingOrderRegistry {
  if (plan?.state !== 'planned' || !isSafeId(caseId) || !hasOpenCase(source, caseId)) {
    return Object.freeze({})
  }
  const workOrderIds = new Map(
    plan.prerequisiteWorkOrders.map((draft) => [draft.id, toCaseScopedWorkOrderId(caseId, draft.id)])
  )
  if (workOrderIds.size !== plan.prerequisiteWorkOrders.length) return Object.freeze({})
  const entries = plan.prerequisiteWorkOrders
    .map((draft) => {
      const prerequisiteWorkOrderIds = draft.dependsOnWorkOrderIds.map((prerequisiteWorkOrderId) =>
        workOrderIds.get(prerequisiteWorkOrderId)
      )
      if (prerequisiteWorkOrderIds.some((prerequisiteWorkOrderId) => !prerequisiteWorkOrderId)) {
        return undefined
      }
      return buildOrder(
        draft,
        caseId,
        workOrderIds.get(draft.id)!,
        prerequisiteWorkOrderIds as string[]
      )
    })
    .filter((order): order is CaseScopedPrerequisiteProcessingOrder => Boolean(order))
    .filter((order) => isValidOrder(order, source))
    .map((order) => [order.workOrderId, order] as const)
    .sort(([left], [right]) => compareCodeUnits(left, right))
  if (new Set(entries.map(([workOrderId]) => workOrderId)).size !== entries.length) {
    return Object.freeze({})
  }
  return Object.freeze(Object.fromEntries(entries))
}
