import type {
  PrerequisiteProcessingPlan,
  PrerequisiteWorkOrderDraft,
} from './prerequisiteProcessing'
import {
  enqueueDepartmentWorkshopWorkOrder,
  readDepartmentWorkshopState,
  sanitizeDepartmentWorkshopCompletionOutcomes,
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

export interface CaseScopedWorkshopFinalizationRequest {
  readonly finalRecipeId: string
  readonly requiredWorkOrderIds: readonly string[]
}

export interface CaseScopedWorkshopFinalizationHandoff {
  readonly finalRecipeId: string
  readonly outputItemId: string
  readonly outputQuantity: number
  readonly sourceWorkOrderIds: readonly string[]
  readonly handoffWeek: number
}

export interface CaseScopedWorkshopFinalizationRecipeContract {
  readonly recipeId: string
  readonly outputItemId: string
  readonly outputQuantity: number
  readonly inputMaterials: Readonly<Record<string, number>>
}

export interface CaseScopedWorkshopFinalizationResult {
  readonly cases: Record<string, unknown>
  readonly handedOffCaseIds: readonly string[]
}
export type CaseScopedPrerequisiteProcessingReservationRegistry = Record<
  string,
  CaseScopedPrerequisiteProcessingReservation
>

export type CaseScopedPrerequisiteProcessingTerminalReason = 'failed' | 'cancelled'

export interface CaseScopedPrerequisiteProcessingTerminalSignal {
  readonly workOrderId: string
  readonly caseId: string
  readonly departmentId: string
  readonly taskType: string
  readonly terminalWeek: number
  readonly reason: CaseScopedPrerequisiteProcessingTerminalReason
}

export type CaseScopedPrerequisiteProcessingTerminalSignalRegistry = Record<
  string,
  CaseScopedPrerequisiteProcessingTerminalSignal
>

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
    value !== 'prototype' &&
    !/^(0|[1-9]\d*)$/.test(value)
  )
}

function isValueId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim()
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
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

/**
 * Preserve the planner-authored final recipe and its exact terminal
 * prerequisite IDs without creating workshop work or starting Fabrication.
 */
export function createCaseScopedWorkshopFinalizationRequest(
  plan: PrerequisiteProcessingPlan,
  caseId: string,
  source: CaseSource
): CaseScopedWorkshopFinalizationRequest | undefined {
  if (
    plan?.state !== 'planned' ||
    !isSafeId(caseId) ||
    !hasOpenCase(source, caseId) ||
    !isValueId(plan.finalRecipeId) ||
    plan.finalDependsOnWorkOrderIds.length === 0
  ) {
    return undefined
  }
  const draftIds = new Set(plan.prerequisiteWorkOrders.map((draft) => draft.id))
  if (
    plan.finalDependsOnWorkOrderIds.some(
      (draftWorkOrderId) => !isSafeId(draftWorkOrderId) || !draftIds.has(draftWorkOrderId)
    )
  ) {
    return undefined
  }
  const requiredWorkOrderIds = [
    ...new Set(
      plan.finalDependsOnWorkOrderIds.map((draftWorkOrderId) =>
        toCaseScopedWorkOrderId(caseId, draftWorkOrderId)
      )
    ),
  ].sort(compareCodeUnits)
  if (requiredWorkOrderIds.length !== plan.finalDependsOnWorkOrderIds.length) {
    return undefined
  }
  return Object.freeze({
    finalRecipeId: plan.finalRecipeId,
    requiredWorkOrderIds: Object.freeze(requiredWorkOrderIds),
  })
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

export function sanitizeCaseScopedPrerequisiteProcessingReservations(
  value: unknown,
  source: CaseSource
): CaseScopedPrerequisiteProcessingReservationRegistry {
  if (!isRecord(value)) return Object.freeze({})
  const entries = Object.entries(value)
    .flatMap(([key, raw]) => {
      if (
        !isSafeId(key) ||
        !isRecord(raw) ||
        raw.workOrderId !== key ||
        !isSafeId(raw.caseId) ||
        !hasOpenCase(source, raw.caseId) ||
        !Array.isArray(raw.inputMaterials) ||
        raw.inputMaterials.length !== Object.keys(raw.inputMaterials).length ||
        !raw.inputMaterials.every(isValidMaterialQuantity)
      )
        return []
      return [
        [
          key,
          Object.freeze({
            workOrderId: key,
            caseId: raw.caseId,
            inputMaterials: Object.freeze(
              raw.inputMaterials.map((input) => Object.freeze({ ...input }))
            ),
          }),
        ] as const,
      ]
    })
    .sort(([a], [b]) => compareCodeUnits(a, b))
  return Object.freeze(Object.fromEntries(entries))
}

/** Hydration boundary for explicit failed/cancelled prerequisite lifecycle proof. */
export function sanitizeCaseScopedPrerequisiteProcessingTerminalSignals(
  value: unknown,
  source?: { readonly week?: unknown }
): CaseScopedPrerequisiteProcessingTerminalSignalRegistry {
  if (!isRecord(value)) return Object.freeze({})
  const campaignWeek =
    isPositiveSafeInteger(source?.week) && source.week >= 1 ? source.week : undefined
  const entries = Object.entries(value)
    .flatMap(([key, raw]) => {
      if (
        !isSafeId(key) ||
        !isRecord(raw) ||
        raw.workOrderId !== key ||
        !isSafeId(raw.caseId) ||
        !isValueId(raw.departmentId) ||
        !isValueId(raw.taskType) ||
        !isPositiveSafeInteger(raw.terminalWeek) ||
        (campaignWeek !== undefined && raw.terminalWeek > campaignWeek) ||
        (raw.reason !== 'failed' && raw.reason !== 'cancelled')
      )
        return []
      return [
        [
          key,
          Object.freeze({
            workOrderId: key,
            caseId: raw.caseId,
            departmentId: raw.departmentId,
            taskType: raw.taskType,
            terminalWeek: raw.terminalWeek,
            reason: raw.reason,
          }),
        ] as const,
      ]
    })
    .sort(([a], [b]) => compareCodeUnits(a, b))
  return Object.freeze(Object.fromEntries(entries))
}

export type CaseScopedPrerequisiteReservationResult =
  | {
      readonly state: 'reserved-and-enqueued'
      readonly inventory: Record<string, number>
      readonly reservations: CaseScopedPrerequisiteProcessingReservationRegistry
      readonly workshopWorkOrders: unknown
      readonly workshopSnapshots: unknown
      readonly reasons: readonly string[]
    }
  | { readonly state: 'blocked'; readonly reasons: readonly string[] }

export interface CaseScopedPrerequisiteCompletionResult {
  readonly inventory: Record<string, number>
  readonly reservations: CaseScopedPrerequisiteProcessingReservationRegistry
  readonly completedWorkOrderIds: readonly string[]
}

export interface CaseScopedPrerequisiteAutomaticActivationResult {
  readonly activatedWorkOrderIds: readonly string[]
  readonly inventory?: Record<string, number>
  readonly reservations?: CaseScopedPrerequisiteProcessingReservationRegistry
  readonly workshopWorkOrders?: unknown
  readonly workshopSnapshots?: unknown
}

export interface CaseScopedPrerequisiteTerminalSignalRegistrationResult {
  readonly signals: CaseScopedPrerequisiteProcessingTerminalSignalRegistry
  readonly registeredWorkOrderIds: readonly string[]
  readonly reasons: readonly string[]
}

export interface CaseScopedPrerequisiteReservationReleaseResult {
  readonly inventory: Record<string, number>
  readonly reservations: CaseScopedPrerequisiteProcessingReservationRegistry
  readonly releasedWorkOrderIds: readonly string[]
}

function materialQuantitiesMatch(
  left: readonly PrerequisiteProcessingMaterialQuantity[],
  right: readonly PrerequisiteProcessingMaterialQuantity[]
) {
  return (
    left.length === right.length &&
    left.every(
      (material, index) =>
        material.materialId === right[index]?.materialId &&
        material.quantity === right[index]?.quantity
    )
  )
}

function hasCanonicalCompletionProof(
  source: {
    readonly departmentWorkshopCompletionOutcomes?: unknown
    readonly departmentWorkshopWorkOrders?: unknown
  },
  order: CaseScopedPrerequisiteProcessingOrder
) {
  const outcome = sanitizeDepartmentWorkshopCompletionOutcomes(
    source.departmentWorkshopCompletionOutcomes
  )[order.workOrderId]
  const workshopOrder = readDepartmentWorkshopState(source).workOrders[order.workOrderId]
  return Boolean(
    outcome &&
    workshopOrder &&
    outcome.caseId === order.caseId &&
    outcome.departmentId === order.departmentId &&
    outcome.taskType === order.taskType &&
    workshopOrder.caseId === order.caseId &&
    workshopOrder.departmentId === order.departmentId &&
    workshopOrder.taskType === order.taskType &&
    workshopOrder.requiredWork === order.requiredWork
  )
}

function isValidFinalizationRecipeContract(
  value: unknown
): value is CaseScopedWorkshopFinalizationRecipeContract {
  if (!isRecord(value)) return false
  return (
    isValueId(value.recipeId) &&
    isValueId(value.outputItemId) &&
    isPositiveSafeInteger(value.outputQuantity) &&
    isRecord(value.inputMaterials) &&
    Object.entries(value.inputMaterials).every(
      ([materialId, quantity]) => isValueId(materialId) && isPositiveSafeInteger(quantity)
    )
  )
}

function readFinalizationRecipeContracts(
  value: unknown
): ReadonlyMap<string, CaseScopedWorkshopFinalizationRecipeContract> {
  if (!Array.isArray(value)) return new Map()
  const candidates = new Map<string, CaseScopedWorkshopFinalizationRecipeContract>()
  const duplicates = new Set<string>()
  for (const rawRecipe of value) {
    if (!isValidFinalizationRecipeContract(rawRecipe)) continue
    if (candidates.has(rawRecipe.recipeId)) {
      duplicates.add(rawRecipe.recipeId)
      continue
    }
    candidates.set(rawRecipe.recipeId, rawRecipe)
  }
  for (const duplicateId of duplicates) candidates.delete(duplicateId)
  return candidates
}

function isFinalizationRequest(value: unknown): value is CaseScopedWorkshopFinalizationRequest {
  return (
    isRecord(value) &&
    isValueId(value.finalRecipeId) &&
    Array.isArray(value.requiredWorkOrderIds) &&
    value.requiredWorkOrderIds.length > 0 &&
    value.requiredWorkOrderIds.length === Object.keys(value.requiredWorkOrderIds).length &&
    value.requiredWorkOrderIds.every(isSafeId) &&
    new Set(value.requiredWorkOrderIds).size === value.requiredWorkOrderIds.length
  )
}

/**
 * Convert exact case-owned workshop completion provenance into one immutable
 * final-recipe readiness handoff. This never reserves inputs, credits the final
 * output, starts Fabrication, or changes case lifecycle.
 */
export function reconcileCaseScopedWorkshopFinalizationHandoffs(
  source: CaseSource & {
    readonly caseScopedPrerequisiteProcessingOrders?: unknown
    readonly departmentWorkshopCompletionOutcomes?: unknown
    readonly departmentWorkshopWorkOrders?: unknown
  },
  recipeContracts: unknown
): CaseScopedWorkshopFinalizationResult {
  if (!isRecord(source?.cases)) {
    return Object.freeze({ cases: Object.freeze({}), handedOffCaseIds: Object.freeze([]) })
  }
  const recipes = readFinalizationRecipeContracts(recipeContracts)
  const orders = readCaseScopedPrerequisiteProcessingOrders(source)
  const outcomes = sanitizeDepartmentWorkshopCompletionOutcomes(
    source.departmentWorkshopCompletionOutcomes
  )
  const workshopOrders = readDepartmentWorkshopState(source).workOrders
  let cases = source.cases
  let changed = false
  const handedOffCaseIds: string[] = []

  for (const caseId of Object.keys(source.cases).sort(compareCodeUnits)) {
    const currentCase = source.cases[caseId]
    if (
      !isRecord(currentCase) ||
      currentCase.id !== caseId ||
      (currentCase.status !== 'open' && currentCase.status !== 'in_progress') ||
      currentCase.departmentWorkshopFinalizationHandoff !== undefined ||
      !isFinalizationRequest(currentCase.departmentWorkshopFinalizationRequest) ||
      !Array.isArray(currentCase.departmentWorkshopCompletionWorkOrderIds)
    ) {
      continue
    }
    const request = currentCase.departmentWorkshopFinalizationRequest
    const recipe = recipes.get(request.finalRecipeId)
    if (!recipe) continue
    const completionLedger = new Set(
      currentCase.departmentWorkshopCompletionWorkOrderIds.filter(isSafeId)
    )
    let handoffWeek = 0
    let valid = true
    for (const workOrderId of [...request.requiredWorkOrderIds].sort(compareCodeUnits)) {
      const order = orders[workOrderId]
      const outcome = outcomes[workOrderId]
      const workshopOrder = workshopOrders[workOrderId]
      if (
        !order ||
        order.caseId !== caseId ||
        !completionLedger.has(workOrderId) ||
        !outcome ||
        !workshopOrder ||
        !Object.hasOwn(recipe.inputMaterials, order.outputMaterialId) ||
        outcome.caseId !== caseId ||
        outcome.departmentId !== order.departmentId ||
        outcome.taskType !== order.taskType ||
        workshopOrder.caseId !== caseId ||
        workshopOrder.departmentId !== order.departmentId ||
        workshopOrder.taskType !== order.taskType ||
        workshopOrder.requiredWork !== order.requiredWork
      ) {
        valid = false
        break
      }
      handoffWeek = Math.max(handoffWeek, outcome.completedWeek)
    }
    if (!valid || !isPositiveSafeInteger(handoffWeek)) continue

    if (!changed) {
      cases = { ...source.cases }
      changed = true
    }
    cases[caseId] = {
      ...currentCase,
      departmentWorkshopFinalizationHandoff: Object.freeze({
        finalRecipeId: recipe.recipeId,
        outputItemId: recipe.outputItemId,
        outputQuantity: recipe.outputQuantity,
        sourceWorkOrderIds: Object.freeze([...request.requiredWorkOrderIds].sort(compareCodeUnits)),
        handoffWeek,
      }),
    }
    handedOffCaseIds.push(caseId)
  }

  return Object.freeze({
    cases: changed ? Object.freeze(cases) : source.cases,
    handedOffCaseIds: Object.freeze(handedOffCaseIds),
  })
}

function hasCanonicalTerminalSignal(
  source: {
    readonly week?: unknown
    readonly caseScopedPrerequisiteProcessingTerminalSignals?: unknown
    readonly departmentWorkshopCompletionOutcomes?: unknown
    readonly departmentWorkshopWorkOrders?: unknown
  },
  order: CaseScopedPrerequisiteProcessingOrder
) {
  const signal = sanitizeCaseScopedPrerequisiteProcessingTerminalSignals(
    source.caseScopedPrerequisiteProcessingTerminalSignals,
    source
  )[order.workOrderId]
  const workshopOrder = readDepartmentWorkshopState(source).workOrders[order.workOrderId]
  return Boolean(
    signal &&
    workshopOrder &&
    Number.isInteger(source.week) &&
    signal.terminalWeek <= (source.week as number) &&
    signal.caseId === order.caseId &&
    signal.departmentId === order.departmentId &&
    signal.taskType === order.taskType &&
    workshopOrder.caseId === order.caseId &&
    workshopOrder.departmentId === order.departmentId &&
    workshopOrder.taskType === order.taskType &&
    workshopOrder.requiredWork === order.requiredWork &&
    !hasCanonicalCompletionProof(source, order)
  )
}

/**
 * List terminally proven prerequisite work orders independently of reservation
 * state so later reconcilers can repair already-released persisted saves.
 */
export function listCanonicalTerminalPrerequisiteProcessingWorkOrderIds(
  source: CaseSource & {
    readonly week?: unknown
    readonly caseScopedPrerequisiteProcessingOrders?: unknown
    readonly caseScopedPrerequisiteProcessingTerminalSignals?: unknown
    readonly departmentWorkshopCompletionOutcomes?: unknown
    readonly departmentWorkshopWorkOrders?: unknown
  }
): readonly string[] {
  const orders = readCaseScopedPrerequisiteProcessingOrders(source)
  return Object.freeze(
    Object.keys(orders)
      .sort(compareCodeUnits)
      .filter((workOrderId) => hasCanonicalTerminalSignal(source, orders[workOrderId]))
  )
}

/**
 * Record explicit work-order terminal proof from canonical authored provenance.
 * This does not infer lifecycle state or mutate inventory, queues, or cases.
 */
export function registerCaseScopedPrerequisiteProcessingTerminalSignal(
  source: CaseSource & {
    readonly week?: unknown
    readonly caseScopedPrerequisiteProcessingOrders?: unknown
    readonly caseScopedPrerequisiteProcessingReservations?: unknown
    readonly caseScopedPrerequisiteProcessingTerminalSignals?: unknown
    readonly departmentWorkshopCompletionOutcomes?: unknown
    readonly departmentWorkshopWorkOrders?: unknown
  },
  workOrderId: unknown,
  reason: unknown,
  terminalWeek: unknown
): CaseScopedPrerequisiteTerminalSignalRegistrationResult {
  const existing = sanitizeCaseScopedPrerequisiteProcessingTerminalSignals(
    source.caseScopedPrerequisiteProcessingTerminalSignals,
    source
  )
  const orders = readCaseScopedPrerequisiteProcessingOrders(source)
  const reservations = sanitizeCaseScopedPrerequisiteProcessingReservations(
    source.caseScopedPrerequisiteProcessingReservations,
    source
  )
  const order = isSafeId(workOrderId) ? orders[workOrderId] : undefined
  const reservation = isSafeId(workOrderId) ? reservations[workOrderId] : undefined
  const workshopOrder = isSafeId(workOrderId)
    ? readDepartmentWorkshopState(source).workOrders[workOrderId]
    : undefined
  const blocked = (blockedReason: string) =>
    Object.freeze({
      signals: existing,
      registeredWorkOrderIds: Object.freeze([]),
      reasons: Object.freeze([blockedReason]),
    })
  if (!order || !reservation || !workshopOrder) return blocked('missing-terminal-provenance')
  if (reason !== 'failed' && reason !== 'cancelled') return blocked('invalid-terminal-reason')
  if (
    !isPositiveSafeInteger(terminalWeek) ||
    !isPositiveSafeInteger(source.week) ||
    terminalWeek > source.week
  )
    return blocked('invalid-terminal-week')
  if (
    reservation.caseId !== order.caseId ||
    !materialQuantitiesMatch(reservation.inputMaterials, order.inputMaterials) ||
    workshopOrder.caseId !== order.caseId ||
    workshopOrder.departmentId !== order.departmentId ||
    workshopOrder.taskType !== order.taskType ||
    workshopOrder.requiredWork !== order.requiredWork
  )
    return blocked('mismatched-terminal-provenance')
  if (hasCanonicalCompletionProof(source, order)) return blocked('already-completed')
  const signal: CaseScopedPrerequisiteProcessingTerminalSignal = Object.freeze({
    workOrderId: order.workOrderId,
    caseId: order.caseId,
    departmentId: order.departmentId,
    taskType: order.taskType,
    terminalWeek,
    reason,
  })
  const priorSignal = existing[order.workOrderId]
  if (priorSignal) {
    if (
      priorSignal.caseId === signal.caseId &&
      priorSignal.departmentId === signal.departmentId &&
      priorSignal.taskType === signal.taskType &&
      priorSignal.terminalWeek === signal.terminalWeek &&
      priorSignal.reason === signal.reason
    )
      return Object.freeze({
        signals: existing,
        registeredWorkOrderIds: Object.freeze([]),
        reasons: Object.freeze([]),
      })
    return blocked('already-terminal')
  }
  const signalEntries: [string, CaseScopedPrerequisiteProcessingTerminalSignal][] = [
    ...Object.entries(existing),
    [order.workOrderId, signal],
  ]
  signalEntries.sort(([a], [b]) => compareCodeUnits(a, b))
  const signals = Object.freeze(
    Object.fromEntries(signalEntries)
  ) as CaseScopedPrerequisiteProcessingTerminalSignalRegistry
  return Object.freeze({
    signals,
    registeredWorkOrderIds: Object.freeze([order.workOrderId]),
    reasons: Object.freeze([]),
  })
}

/** Credits only completed, provenance-matched reserved prerequisite orders. */
export function reconcileCaseScopedPrerequisiteProcessingCompletions(
  source: CaseSource & {
    readonly caseScopedPrerequisiteProcessingOrders?: unknown
    readonly caseScopedPrerequisiteProcessingReservations?: unknown
    readonly departmentWorkshopCompletionOutcomes?: unknown
    readonly departmentWorkshopWorkOrders?: unknown
    readonly inventory?: unknown
  }
): CaseScopedPrerequisiteCompletionResult {
  const orders = readCaseScopedPrerequisiteProcessingOrders(source)
  const reservations = sanitizeCaseScopedPrerequisiteProcessingReservations(
    source.caseScopedPrerequisiteProcessingReservations,
    source
  )
  if (!isRecord(source.inventory) || !isRecord(source.departmentWorkshopCompletionOutcomes))
    return Object.freeze({
      inventory: Object.freeze(
        (isRecord(source.inventory) ? { ...source.inventory } : {}) as Record<string, number>
      ),
      reservations,
      completedWorkOrderIds: Object.freeze([]),
    })
  const inventory = { ...source.inventory } as Record<string, number>
  const remaining = new Map(Object.entries(reservations))
  const completed: string[] = []
  for (const workOrderId of Object.keys(reservations).sort(compareCodeUnits)) {
    const reservation = reservations[workOrderId]
    const order = orders[workOrderId]
    const outcome = source.departmentWorkshopCompletionOutcomes[workOrderId]
    const workshopOrder = isRecord(source.departmentWorkshopWorkOrders)
      ? source.departmentWorkshopWorkOrders[workOrderId]
      : undefined
    if (
      !order ||
      !isRecord(outcome) ||
      !isRecord(workshopOrder) ||
      outcome.outcome !== 'completed' ||
      outcome.workOrderId !== workOrderId ||
      outcome.caseId !== reservation.caseId ||
      outcome.caseId !== order.caseId ||
      outcome.departmentId !== order.departmentId ||
      outcome.taskType !== order.taskType ||
      workshopOrder.caseId !== order.caseId ||
      workshopOrder.departmentId !== order.departmentId ||
      workshopOrder.taskType !== order.taskType
    )
      continue
    const prior = inventory[order.outputMaterialId]
    if (prior !== undefined && (!Number.isSafeInteger(prior) || prior < 0)) continue
    const nextQuantity = (prior ?? 0) + order.outputQuantity
    if (!Number.isSafeInteger(nextQuantity)) continue
    inventory[order.outputMaterialId] = nextQuantity
    remaining.delete(workOrderId)
    completed.push(workOrderId)
  }
  return Object.freeze({
    inventory: Object.freeze(inventory),
    reservations: Object.freeze(
      Object.fromEntries([...remaining.entries()].sort(([a], [b]) => compareCodeUnits(a, b)))
    ),
    completedWorkOrderIds: Object.freeze(completed),
  })
}

/** Refund exact unconsumed inputs once for canonically terminalled work orders. */
export function reconcileCaseScopedPrerequisiteProcessingReservationReleases(
  source: CaseSource & {
    readonly week?: unknown
    readonly caseScopedPrerequisiteProcessingOrders?: unknown
    readonly caseScopedPrerequisiteProcessingReservations?: unknown
    readonly caseScopedPrerequisiteProcessingTerminalSignals?: unknown
    readonly departmentWorkshopCompletionOutcomes?: unknown
    readonly departmentWorkshopWorkOrders?: unknown
    readonly inventory?: unknown
  }
): CaseScopedPrerequisiteReservationReleaseResult {
  const orders = readCaseScopedPrerequisiteProcessingOrders(source)
  const reservations = sanitizeCaseScopedPrerequisiteProcessingReservations(
    source.caseScopedPrerequisiteProcessingReservations,
    source
  )
  if (!isRecord(source.inventory))
    return Object.freeze({
      inventory: Object.freeze({}),
      reservations,
      releasedWorkOrderIds: Object.freeze([]),
    })
  const inventory = { ...source.inventory } as Record<string, number>
  const remaining = new Map(Object.entries(reservations))
  const released: string[] = []

  reservationLoop: for (const workOrderId of Object.keys(reservations).sort(compareCodeUnits)) {
    const reservation = reservations[workOrderId]
    const order = orders[workOrderId]
    if (
      !order ||
      reservation.caseId !== order.caseId ||
      !materialQuantitiesMatch(reservation.inputMaterials, order.inputMaterials) ||
      !hasCanonicalTerminalSignal(source, order)
    )
      continue

    const pending = new Map<string, number>()
    for (const input of reservation.inputMaterials) {
      const prior = pending.has(input.materialId)
        ? pending.get(input.materialId)
        : inventory[input.materialId]
      if (prior !== undefined && !isNonNegativeSafeInteger(prior)) continue reservationLoop
      const nextQuantity = (prior ?? 0) + input.quantity
      if (!Number.isSafeInteger(nextQuantity)) continue reservationLoop
      pending.set(input.materialId, nextQuantity)
    }
    for (const [materialId, quantity] of pending) inventory[materialId] = quantity
    remaining.delete(workOrderId)
    released.push(workOrderId)
  }

  return Object.freeze({
    inventory: Object.freeze(inventory),
    reservations: Object.freeze(
      Object.fromEntries([...remaining.entries()].sort(([a], [b]) => compareCodeUnits(a, b)))
    ),
    releasedWorkOrderIds: Object.freeze(released),
  })
}

export function reserveAndEnqueueCaseScopedPrerequisiteProcessingOrder(
  source: CaseSource & {
    readonly week?: unknown
    readonly caseScopedPrerequisiteProcessingOrders?: unknown
    readonly caseScopedPrerequisiteProcessingReservations?: unknown
    readonly caseScopedPrerequisiteProcessingTerminalSignals?: unknown
    readonly departmentWorkshopCompletionOutcomes?: unknown
    readonly inventory?: unknown
    readonly departmentWorkshopWorkOrders?: unknown
    readonly departmentWorkshopSnapshots?: unknown
  },
  workOrderId: unknown
): CaseScopedPrerequisiteReservationResult {
  const orders = readCaseScopedPrerequisiteProcessingOrders(source)
  const reservations = sanitizeCaseScopedPrerequisiteProcessingReservations(
    source.caseScopedPrerequisiteProcessingReservations,
    source
  )
  if (!isSafeId(workOrderId) || !orders[workOrderId])
    return Object.freeze({ state: 'blocked', reasons: Object.freeze(['missing-processing-order']) })
  const order = orders[workOrderId]
  if (hasCanonicalTerminalSignal(source, order))
    return Object.freeze({
      state: 'blocked',
      reasons: Object.freeze(['terminal-processing-order']),
    })
  if (order.prerequisiteWorkOrderIds.length > 0)
    return Object.freeze({
      state: 'blocked',
      reasons: Object.freeze(['prerequisites-not-complete']),
    })
  if (reservations[workOrderId])
    return Object.freeze({ state: 'blocked', reasons: Object.freeze(['already-reserved']) })
  if (!isRecord(source.inventory))
    return Object.freeze({ state: 'blocked', reasons: Object.freeze(['invalid-inventory']) })
  const inventory = { ...source.inventory } as Record<string, number>
  for (const input of order.inputMaterials)
    if (
      !isPositiveSafeInteger(inventory[input.materialId]) ||
      inventory[input.materialId] < input.quantity
    )
      return Object.freeze({ state: 'blocked', reasons: Object.freeze(['insufficient-inventory']) })
  const workshop = enqueueDepartmentWorkshopWorkOrder(source, {
    id: order.workOrderId,
    departmentId: order.departmentId,
    caseId: order.caseId,
    taskType: order.taskType,
    requiredWork: order.requiredWork,
  } as DepartmentWorkshopWorkOrder)
  if (workshop.state === 'blocked')
    return Object.freeze({
      state: 'blocked',
      reasons: Object.freeze(workshop.reasons.map((reason) => reason.code)),
    })
  for (const input of order.inputMaterials) inventory[input.materialId] -= input.quantity
  const nextReservation: CaseScopedPrerequisiteProcessingReservation = Object.freeze({
    workOrderId: order.workOrderId,
    caseId: order.caseId,
    inputMaterials: Object.freeze(order.inputMaterials.map((input) => Object.freeze({ ...input }))),
  })
  const reservationEntries: [string, CaseScopedPrerequisiteProcessingReservation][] = [
    ...Object.entries(reservations),
    [order.workOrderId, nextReservation],
  ]
  reservationEntries.sort(([a], [b]) => compareCodeUnits(a, b))
  const nextReservations = Object.freeze(
    Object.fromEntries(reservationEntries)
  ) as CaseScopedPrerequisiteProcessingReservationRegistry
  return Object.freeze({
    state: 'reserved-and-enqueued',
    inventory: Object.freeze(inventory),
    reservations: nextReservations,
    workshopWorkOrders: workshop.workshopState.workOrders,
    workshopSnapshots: workshop.workshopState.snapshots,
    reasons: Object.freeze([]),
  })
}

/** Explicitly activate a completed-dependency successor through the canonical reservation write. */
function hasCanonicalCompletedPrerequisites(
  source: CaseSource & {
    readonly week?: unknown
    readonly departmentWorkshopCompletionOutcomes?: unknown
    readonly departmentWorkshopWorkOrders?: unknown
  },
  orders: CaseScopedPrerequisiteProcessingOrderRegistry,
  order: CaseScopedPrerequisiteProcessingOrder
) {
  const outcomes = sanitizeDepartmentWorkshopCompletionOutcomes(
    source.departmentWorkshopCompletionOutcomes
  )
  const workshopWorkOrders = readDepartmentWorkshopState(source).workOrders
  for (const prerequisiteId of order.prerequisiteWorkOrderIds) {
    const prerequisite = orders[prerequisiteId]
    const outcome = outcomes[prerequisiteId]
    const workshop = workshopWorkOrders[prerequisiteId]
    if (
      !prerequisite ||
      prerequisite.caseId !== order.caseId ||
      !outcome ||
      !Number.isInteger(source.week) ||
      outcome.completedWeek > (source.week as number) ||
      !workshop ||
      outcome.caseId !== order.caseId ||
      outcome.departmentId !== prerequisite.departmentId ||
      outcome.taskType !== prerequisite.taskType ||
      workshop.id !== prerequisiteId ||
      workshop.caseId !== order.caseId ||
      workshop.departmentId !== prerequisite.departmentId ||
      workshop.taskType !== prerequisite.taskType ||
      workshop.requiredWork !== prerequisite.requiredWork
    )
      return false
  }
  return true
}

export function activateCaseScopedPrerequisiteProcessingOrder(
  source: CaseSource & {
    readonly week?: unknown
    readonly caseScopedPrerequisiteProcessingOrders?: unknown
    readonly caseScopedPrerequisiteProcessingReservations?: unknown
    readonly caseScopedPrerequisiteProcessingTerminalSignals?: unknown
    readonly departmentWorkshopCompletionOutcomes?: unknown
    readonly departmentWorkshopWorkOrders?: unknown
    readonly departmentWorkshopSnapshots?: unknown
    readonly inventory?: unknown
  },
  workOrderId: unknown
): CaseScopedPrerequisiteReservationResult {
  const orders = readCaseScopedPrerequisiteProcessingOrders(source)
  if (!isSafeId(workOrderId) || !orders[workOrderId])
    return Object.freeze({ state: 'blocked', reasons: Object.freeze(['missing-processing-order']) })
  const order = orders[workOrderId]
  if (order.prerequisiteWorkOrderIds.length === 0)
    return Object.freeze({ state: 'blocked', reasons: Object.freeze(['no-prerequisites']) })
  if (!hasCanonicalCompletedPrerequisites(source, orders, order))
    return Object.freeze({
      state: 'blocked',
      reasons: Object.freeze(['prerequisites-not-complete']),
    })
  const activatedOrders = Object.freeze({
    ...orders,
    [workOrderId]: Object.freeze({ ...order, prerequisiteWorkOrderIds: Object.freeze([]) }),
  })
  return reserveAndEnqueueCaseScopedPrerequisiteProcessingOrder(
    { ...source, caseScopedPrerequisiteProcessingOrders: activatedOrders },
    workOrderId
  )
}

/**
 * At week close, select one stable dependency-ready successor per case and
 * delegate the actual write to the canonical activation/reservation seam.
 */
export function reconcileCaseScopedPrerequisiteProcessingSuccessors(
  source: CaseSource & {
    readonly week?: unknown
    readonly caseScopedPrerequisiteProcessingOrders?: unknown
    readonly caseScopedPrerequisiteProcessingReservations?: unknown
    readonly caseScopedPrerequisiteProcessingTerminalSignals?: unknown
    readonly departmentWorkshopCompletionOutcomes?: unknown
    readonly departmentWorkshopWorkOrders?: unknown
    readonly departmentWorkshopSnapshots?: unknown
    readonly inventory?: unknown
  }
): CaseScopedPrerequisiteAutomaticActivationResult {
  const orders = readCaseScopedPrerequisiteProcessingOrders(source)
  const reservations = sanitizeCaseScopedPrerequisiteProcessingReservations(
    source.caseScopedPrerequisiteProcessingReservations,
    source
  )
  const outcomes = sanitizeDepartmentWorkshopCompletionOutcomes(
    source.departmentWorkshopCompletionOutcomes
  )
  const candidatesByCase = new Map<string, string>()
  for (const order of Object.values(orders).sort(
    (left, right) =>
      compareCodeUnits(left.caseId, right.caseId) ||
      compareCodeUnits(left.workOrderId, right.workOrderId)
  )) {
    if (
      order.prerequisiteWorkOrderIds.length === 0 ||
      reservations[order.workOrderId] ||
      outcomes[order.workOrderId] ||
      hasCanonicalTerminalSignal(source, order) ||
      !hasCanonicalCompletedPrerequisites(source, orders, order) ||
      candidatesByCase.has(order.caseId)
    )
      continue
    candidatesByCase.set(order.caseId, order.workOrderId)
  }

  let current = source
  let lastSuccessful:
    | Extract<CaseScopedPrerequisiteReservationResult, { readonly state: 'reserved-and-enqueued' }>
    | undefined
  const activatedWorkOrderIds: string[] = []
  for (const workOrderId of [...candidatesByCase.entries()]
    .sort(([left], [right]) => compareCodeUnits(left, right))
    .map(([, id]) => id)) {
    const result = activateCaseScopedPrerequisiteProcessingOrder(current, workOrderId)
    if (result.state !== 'reserved-and-enqueued') continue
    activatedWorkOrderIds.push(workOrderId)
    lastSuccessful = result
    current = {
      ...current,
      inventory: result.inventory,
      caseScopedPrerequisiteProcessingReservations: result.reservations,
      departmentWorkshopWorkOrders: result.workshopWorkOrders,
      departmentWorkshopSnapshots: result.workshopSnapshots,
    }
  }
  return Object.freeze({
    activatedWorkOrderIds: Object.freeze(activatedWorkOrderIds),
    ...(lastSuccessful && {
      inventory: lastSuccessful.inventory,
      reservations: lastSuccessful.reservations,
      workshopWorkOrders: lastSuccessful.workshopWorkOrders,
      workshopSnapshots: lastSuccessful.workshopSnapshots,
    }),
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
    plan.prerequisiteWorkOrders.map((draft) => [
      draft.id,
      toCaseScopedWorkOrderId(caseId, draft.id),
    ])
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
