import type {
  PrerequisiteProcessingPlan,
  PrerequisiteWorkOrderDraft,
} from './prerequisiteProcessing'
import {
  enqueueDepartmentWorkshopWorkOrder,
  type DepartmentWorkshopWorkOrder,
} from './departmentWorkshopQueue'

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
  readonly departmentId: string
  readonly taskType: string
  readonly requiredWork: number
  readonly prerequisiteWorkOrderIds: readonly string[]
}

export interface CaseScopedPrerequisiteProcessingReservation {
  readonly workOrderId: string
  readonly caseId: string
  readonly inputMaterials: readonly PrerequisiteProcessingMaterialQuantity[]
}
export type CaseScopedPrerequisiteProcessingReservationRegistry = Record<string, CaseScopedPrerequisiteProcessingReservation>

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
    && !/^(0|[1-9]\d*)$/.test(value)
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
  return (
    isRecord(candidate) &&
    candidate.id === caseId &&
    (candidate.status === 'open' || candidate.status === 'in_progress')
  )
}

function frozenOrder(order: CaseScopedPrerequisiteProcessingOrder) {
  return Object.freeze({
    workOrderId: order.workOrderId,
    caseId: order.caseId,
    processingRecipeId: order.processingRecipeId,
    inputMaterials: Object.freeze(order.inputMaterials.map((input) => Object.freeze({ ...input }))),
    prerequisiteWorkOrderIds: Object.freeze([...order.prerequisiteWorkOrderIds]),
    outputMaterialId: order.outputMaterialId,
    outputQuantity: order.outputQuantity,
    departmentId: order.departmentId,
    taskType: order.taskType,
    requiredWork: order.requiredWork,
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
    order.inputMaterials.length === Object.keys(order.inputMaterials).length &&
    order.inputMaterials.every(isValidMaterialQuantity) &&
    isValueId(order.outputMaterialId) &&
    isPositiveSafeInteger(order.outputQuantity) &&
    isValueId(order.departmentId) &&
    isValueId(order.taskType) &&
    isPositiveSafeInteger(order.requiredWork) &&
    Array.isArray(order.prerequisiteWorkOrderIds) &&
    order.prerequisiteWorkOrderIds.length === Object.keys(order.prerequisiteWorkOrderIds).length &&
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
    departmentId: draft.departmentId,
    taskType: draft.taskType,
    requiredWork: draft.requiredWork,
    prerequisiteWorkOrderIds: Object.freeze([...prerequisiteWorkOrderIds]),
  })
}

export function sanitizeCaseScopedPrerequisiteProcessingReservations(value: unknown, source: CaseSource): CaseScopedPrerequisiteProcessingReservationRegistry {
  if (!isRecord(value)) return Object.freeze({})
  const entries = Object.entries(value).flatMap(([key, raw]) => {
    if (!isSafeId(key) || !isRecord(raw) || raw.workOrderId !== key || !isSafeId(raw.caseId) || !hasOpenCase(source, raw.caseId) || !Array.isArray(raw.inputMaterials) || raw.inputMaterials.length !== Object.keys(raw.inputMaterials).length || !raw.inputMaterials.every(isValidMaterialQuantity)) return []
    return [[key, Object.freeze({ workOrderId: key, caseId: raw.caseId, inputMaterials: Object.freeze(raw.inputMaterials.map((input) => Object.freeze({ ...input }))) })] as const]
  }).sort(([a], [b]) => compareCodeUnits(a, b))
  return Object.freeze(Object.fromEntries(entries))
}

export type CaseScopedPrerequisiteReservationResult =
  | { readonly state: 'reserved-and-enqueued'; readonly inventory: Record<string, number>; readonly reservations: CaseScopedPrerequisiteProcessingReservationRegistry; readonly workshopWorkOrders: unknown; readonly workshopSnapshots: unknown; readonly reasons: readonly string[] }
  | { readonly state: 'blocked'; readonly reasons: readonly string[] }

export function reserveAndEnqueueCaseScopedPrerequisiteProcessingOrder(source: CaseSource & { readonly caseScopedPrerequisiteProcessingOrders?: unknown; readonly caseScopedPrerequisiteProcessingReservations?: unknown; readonly inventory?: unknown; readonly departmentWorkshopWorkOrders?: unknown; readonly departmentWorkshopSnapshots?: unknown }, workOrderId: unknown): CaseScopedPrerequisiteReservationResult {
  const orders = readCaseScopedPrerequisiteProcessingOrders(source)
  const reservations = sanitizeCaseScopedPrerequisiteProcessingReservations(source.caseScopedPrerequisiteProcessingReservations, source)
  if (!isSafeId(workOrderId) || !orders[workOrderId]) return Object.freeze({ state: 'blocked', reasons: Object.freeze(['missing-processing-order']) })
  const order = orders[workOrderId]
  if (order.prerequisiteWorkOrderIds.length > 0) return Object.freeze({ state: 'blocked', reasons: Object.freeze(['prerequisites-not-complete']) })
  if (reservations[workOrderId]) return Object.freeze({ state: 'blocked', reasons: Object.freeze(['already-reserved']) })
  if (!isRecord(source.inventory)) return Object.freeze({ state: 'blocked', reasons: Object.freeze(['invalid-inventory']) })
  const inventory = { ...source.inventory } as Record<string, number>
  for (const input of order.inputMaterials) if (!isPositiveSafeInteger(inventory[input.materialId]) || inventory[input.materialId] < input.quantity) return Object.freeze({ state: 'blocked', reasons: Object.freeze(['insufficient-inventory']) })
  const workshop = enqueueDepartmentWorkshopWorkOrder(source, { id: order.workOrderId, departmentId: order.departmentId, caseId: order.caseId, taskType: order.taskType, requiredWork: order.requiredWork } as DepartmentWorkshopWorkOrder)
  if (workshop.state === 'blocked') return Object.freeze({ state: 'blocked', reasons: Object.freeze(workshop.reasons.map((reason) => reason.code)) })
  for (const input of order.inputMaterials) inventory[input.materialId] -= input.quantity
  const nextReservations = Object.freeze(Object.fromEntries([...Object.entries(reservations), [workOrderId, Object.freeze({ workOrderId, caseId: order.caseId, inputMaterials: Object.freeze(order.inputMaterials.map((input) => Object.freeze({ ...input }))) })]].sort(([a], [b]) => compareCodeUnits(a, b)))) as CaseScopedPrerequisiteProcessingReservationRegistry
  return Object.freeze({ state: 'reserved-and-enqueued', inventory: Object.freeze(inventory), reservations: nextReservations, workshopWorkOrders: workshop.workshopState.workOrders, workshopSnapshots: workshop.workshopState.snapshots, reasons: Object.freeze([]) })
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
