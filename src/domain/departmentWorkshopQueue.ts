/**
 * SPE-2745 / SPE-1028: pure department workshop queue and slot kernel.
 *
 * Callers own the work orders and snapshots. This module does not persist,
 * enqueue through GameState, or register a week-close hook.
 */

import {
  DEPARTMENT_TASK_TYPES,
  DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  validateDepartmentCapabilityRegistry,
} from './departmentCapabilities'
import type { AuthorityGraph } from './authorityGraph'
import type { DepartmentCapabilityRegistry, DepartmentTaskType } from './departmentCapabilities'
import type { DepartmentWorkloadSnapshot } from './departmentCoordination'

export interface DepartmentWorkshopWorkOrder {
  readonly id: string
  readonly departmentId: string
  readonly caseId: string
  readonly taskType: DepartmentTaskType
  readonly requiredWork: number
}

export interface DepartmentWorkshopWorkItem {
  readonly workOrderId: string
  readonly completedWork: number
}

export interface DepartmentWorkshopSnapshot {
  readonly departmentId: string
  readonly slotCapacity: number
  readonly queued: readonly DepartmentWorkshopWorkItem[]
  readonly active: readonly DepartmentWorkshopWorkItem[]
  readonly paused: readonly DepartmentWorkshopWorkItem[]
}

export type DepartmentWorkshopWorkOrderRegistry = Record<string, DepartmentWorkshopWorkOrder>
export type DepartmentWorkshopSnapshotRegistry = Record<string, DepartmentWorkshopSnapshot>

export interface DepartmentWorkshopStateSource {
  readonly departmentWorkshopWorkOrders?: unknown
  readonly departmentWorkshopSnapshots?: unknown
  /** Allows one pure write result to feed the next write without a GameState wrapper. */
  readonly workOrders?: unknown
  readonly snapshots?: unknown
}

export interface DepartmentWorkshopState {
  readonly workOrders: DepartmentWorkshopWorkOrderRegistry
  readonly snapshots: DepartmentWorkshopSnapshotRegistry
}

export type DepartmentWorkshopReasonCode =
  | 'invalid-department-registry'
  | 'missing-department-definition'
  | 'invalid-work-orders'
  | 'duplicate-work-order'
  | 'invalid-workshop-snapshot'
  | 'duplicate-work-order-membership'
  | 'missing-work-order'
  | 'work-order-department-mismatch'
  | 'unsupported-department-task'
  | 'invalid-work-progress'
  | 'active-slot-overflow'
  | 'zero-slot-capacity'
  | 'invalid-work-order-id'
  | 'work-order-not-active'
  | 'work-order-not-paused'
  | 'work-order-not-queued'
  | 'no-open-slot'
  | 'duplicate-case-workload'
  | 'missing-workshop-snapshot'

export interface DepartmentWorkshopReason {
  readonly code: DepartmentWorkshopReasonCode
  readonly departmentId: string
  readonly workOrderIds: readonly string[]
}

export interface DepartmentWorkshopAdvanceResult {
  readonly state: 'advanced' | 'blocked'
  readonly snapshot: DepartmentWorkshopSnapshot | null
  readonly startedWorkOrderIds: readonly string[]
  readonly completedWorkOrderIds: readonly string[]
  readonly reasons: readonly DepartmentWorkshopReason[]
}

/**
 * Result of the campaign-owned workshop processing tick. The tick owns only
 * the persisted workshop registries; case queues and all workshop outcomes
 * remain outside this seam.
 */
export interface DepartmentWorkshopProcessingTickResult {
  readonly state: 'advanced' | 'unchanged'
  readonly workshopState: DepartmentWorkshopState
  readonly startedWorkOrderIds: readonly string[]
  readonly completedWorkOrderIds: readonly string[]
  readonly reasons: readonly DepartmentWorkshopReason[]
}

export interface DepartmentWorkshopTransitionResult {
  readonly state: 'updated' | 'blocked'
  readonly snapshot: DepartmentWorkshopSnapshot | null
  readonly reasons: readonly DepartmentWorkshopReason[]
}

export interface DepartmentWorkshopWorkloadProjectionResult {
  readonly state: 'projected' | 'blocked'
  readonly workloadSnapshot: DepartmentWorkloadSnapshot | null
  readonly reasons: readonly DepartmentWorkshopReason[]
}

/** Result of a canonical persisted-workshop write without any processing tick. */
export interface DepartmentWorkshopWriteResult {
  readonly state: 'enqueued' | 'prioritized' | 'blocked'
  readonly workshopState: DepartmentWorkshopState
  readonly reasons: readonly DepartmentWorkshopReason[]
}

interface ValidatedWorkshop {
  readonly snapshot: DepartmentWorkshopSnapshot
  readonly workOrdersById: ReadonlyMap<string, DepartmentWorkshopWorkOrder>
}

type WorkshopValidationResult =
  | { readonly valid: true; readonly value: ValidatedWorkshop }
  | { readonly valid: false; readonly reason: DepartmentWorkshopReason }

const DEPARTMENT_TASK_TYPE_SET = new Set<string>(DEPARTMENT_TASK_TYPES)

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIntegerIndexId(value: string): boolean {
  const numeric = Number(value)
  return (
    Number.isInteger(numeric) &&
    numeric >= 0 &&
    numeric < 4_294_967_295 &&
    String(numeric) === value
  )
}

function isDenseArray(value: readonly unknown[]) {
  for (let index = 0; index < value.length; index += 1) {
    if (!(index in value)) {
      return false
    }
  }
  return true
}

function isNormalizedNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim()
}

function frozenReason(
  code: DepartmentWorkshopReasonCode,
  departmentId: string,
  workOrderIds: readonly string[] = []
): DepartmentWorkshopReason {
  return Object.freeze({
    code,
    departmentId,
    workOrderIds: Object.freeze([...new Set(workOrderIds)].sort(compareCodeUnits)),
  })
}

function frozenItem(item: DepartmentWorkshopWorkItem): DepartmentWorkshopWorkItem {
  return Object.freeze({
    workOrderId: item.workOrderId,
    completedWork: item.completedWork,
  })
}

function frozenSnapshot(snapshot: DepartmentWorkshopSnapshot): DepartmentWorkshopSnapshot {
  return Object.freeze({
    departmentId: snapshot.departmentId,
    slotCapacity: snapshot.slotCapacity,
    queued: Object.freeze(snapshot.queued.map(frozenItem)),
    active: Object.freeze(snapshot.active.map(frozenItem)),
    paused: Object.freeze(snapshot.paused.map(frozenItem)),
  })
}

function frozenWorkOrder(workOrder: DepartmentWorkshopWorkOrder): DepartmentWorkshopWorkOrder {
  return Object.freeze({
    id: workOrder.id,
    departmentId: workOrder.departmentId,
    caseId: workOrder.caseId,
    taskType: workOrder.taskType,
    requiredWork: workOrder.requiredWork,
  })
}

function blockedAdvance(reason: DepartmentWorkshopReason): DepartmentWorkshopAdvanceResult {
  return Object.freeze({
    state: 'blocked',
    snapshot: null,
    startedWorkOrderIds: Object.freeze([]),
    completedWorkOrderIds: Object.freeze([]),
    reasons: Object.freeze([reason]),
  })
}

function blockedAdvanceWithSnapshot(
  snapshot: DepartmentWorkshopSnapshot,
  reason: DepartmentWorkshopReason
): DepartmentWorkshopAdvanceResult {
  return Object.freeze({
    state: 'blocked',
    snapshot: frozenSnapshot(snapshot),
    startedWorkOrderIds: Object.freeze([]),
    completedWorkOrderIds: Object.freeze([]),
    reasons: Object.freeze([reason]),
  })
}

function blockedTransition(
  reason: DepartmentWorkshopReason,
  snapshot: DepartmentWorkshopSnapshot | null = null
): DepartmentWorkshopTransitionResult {
  return Object.freeze({
    state: 'blocked',
    snapshot: snapshot ? frozenSnapshot(snapshot) : null,
    reasons: Object.freeze([reason]),
  })
}

function blockedProjection(
  reason: DepartmentWorkshopReason
): DepartmentWorkshopWorkloadProjectionResult {
  return Object.freeze({
    state: 'blocked',
    workloadSnapshot: null,
    reasons: Object.freeze([reason]),
  })
}

function frozenWorkshopState(
  workOrders: DepartmentWorkshopWorkOrderRegistry,
  snapshots: DepartmentWorkshopSnapshotRegistry
): DepartmentWorkshopState {
  return Object.freeze({
    workOrders: Object.freeze(
      Object.fromEntries(
        Object.entries(workOrders)
          .sort(([left], [right]) => compareCodeUnits(left, right))
          .map(([id, workOrder]) => [id, frozenWorkOrder(workOrder)])
      )
    ),
    snapshots: Object.freeze(
      Object.fromEntries(
        Object.entries(snapshots)
          .sort(([left], [right]) => compareCodeUnits(left, right))
          .map(([id, snapshot]) => [id, frozenSnapshot(snapshot)])
      )
    ),
  })
}

function blockedWrite(
  workshopState: DepartmentWorkshopState,
  reason: DepartmentWorkshopReason
): DepartmentWorkshopWriteResult {
  return Object.freeze({
    state: 'blocked',
    workshopState,
    reasons: Object.freeze([reason]),
  })
}

function isValidWorkOrder(value: unknown): value is DepartmentWorkshopWorkOrder {
  if (!value || typeof value !== 'object') {
    return false
  }

  const workOrder = value as Partial<DepartmentWorkshopWorkOrder>
  return (
    isNormalizedNonEmptyString(workOrder.id) &&
    isNormalizedNonEmptyString(workOrder.departmentId) &&
    isNormalizedNonEmptyString(workOrder.caseId) &&
    typeof workOrder.taskType === 'string' &&
    DEPARTMENT_TASK_TYPE_SET.has(workOrder.taskType) &&
    typeof workOrder.requiredWork === 'number' &&
    Number.isSafeInteger(workOrder.requiredWork) &&
    workOrder.requiredWork > 0
  )
}

function isValidWorkItemShape(value: unknown): value is DepartmentWorkshopWorkItem {
  if (!value || typeof value !== 'object') {
    return false
  }

  const item = value as Partial<DepartmentWorkshopWorkItem>
  return (
    isNormalizedNonEmptyString(item.workOrderId) &&
    typeof item.completedWork === 'number' &&
    Number.isSafeInteger(item.completedWork) &&
    item.completedWork >= 0
  )
}

function invalidSnapshotReason(departmentId: string) {
  return frozenReason('invalid-workshop-snapshot', departmentId)
}

function validateWorkshop(
  snapshot: DepartmentWorkshopSnapshot,
  workOrders: readonly DepartmentWorkshopWorkOrder[],
  registry: DepartmentCapabilityRegistry,
  authorityGraph?: AuthorityGraph
): WorkshopValidationResult {
  if (
    !registry ||
    typeof registry !== 'object' ||
    !Array.isArray(registry.departments) ||
    !Array.isArray(registry.fallbackDepartmentRefs) ||
    !validateDepartmentCapabilityRegistry(registry, authorityGraph).valid
  ) {
    return {
      valid: false,
      reason: frozenReason(
        'invalid-department-registry',
        isNormalizedNonEmptyString(snapshot?.departmentId) ? snapshot.departmentId : ''
      ),
    }
  }

  if (
    !snapshot ||
    typeof snapshot !== 'object' ||
    !isNormalizedNonEmptyString(snapshot.departmentId) ||
    !Number.isSafeInteger(snapshot.slotCapacity) ||
    snapshot.slotCapacity < 0 ||
    !Array.isArray(snapshot.queued) ||
    !Array.isArray(snapshot.active) ||
    !Array.isArray(snapshot.paused) ||
    !isDenseArray(snapshot.queued) ||
    !isDenseArray(snapshot.active) ||
    !isDenseArray(snapshot.paused) ||
    !snapshot.queued.every(isValidWorkItemShape) ||
    !snapshot.active.every(isValidWorkItemShape) ||
    !snapshot.paused.every(isValidWorkItemShape)
  ) {
    return {
      valid: false,
      reason: invalidSnapshotReason(
        isNormalizedNonEmptyString(snapshot?.departmentId) ? snapshot.departmentId : ''
      ),
    }
  }

  const department = registry.departments.find(
    (definition) => definition.id === snapshot.departmentId
  )
  if (!department) {
    return {
      valid: false,
      reason: frozenReason('missing-department-definition', snapshot.departmentId),
    }
  }

  if (
    !Array.isArray(workOrders) ||
    !isDenseArray(workOrders) ||
    !workOrders.every(isValidWorkOrder)
  ) {
    return {
      valid: false,
      reason: frozenReason('invalid-work-orders', snapshot.departmentId),
    }
  }

  const workOrdersById = new Map<string, DepartmentWorkshopWorkOrder>()
  const duplicateWorkOrderIds = new Set<string>()
  for (const workOrder of workOrders) {
    if (workOrdersById.has(workOrder.id)) {
      duplicateWorkOrderIds.add(workOrder.id)
      continue
    }
    workOrdersById.set(workOrder.id, workOrder)
  }
  if (duplicateWorkOrderIds.size > 0) {
    return {
      valid: false,
      reason: frozenReason('duplicate-work-order', snapshot.departmentId, [
        ...duplicateWorkOrderIds,
      ]),
    }
  }

  const orderedWorkOrders = [...workOrdersById.values()].sort((left, right) =>
    compareCodeUnits(left.id, right.id)
  )
  for (const workOrder of orderedWorkOrders) {
    if (workOrder.departmentId !== snapshot.departmentId) {
      return {
        valid: false,
        reason: frozenReason('work-order-department-mismatch', snapshot.departmentId, [
          workOrder.id,
        ]),
      }
    }
    if (!department.taskTypes.includes(workOrder.taskType)) {
      return {
        valid: false,
        reason: frozenReason('unsupported-department-task', snapshot.departmentId, [workOrder.id]),
      }
    }
  }

  const allItems = [...snapshot.queued, ...snapshot.active, ...snapshot.paused]
  const membershipIds = allItems.map((item) => item.workOrderId)
  if (new Set(membershipIds).size !== membershipIds.length) {
    const duplicateIds = membershipIds.filter((id, index) => membershipIds.indexOf(id) !== index)
    return {
      valid: false,
      reason: frozenReason('duplicate-work-order-membership', snapshot.departmentId, duplicateIds),
    }
  }

  if (snapshot.active.length > snapshot.slotCapacity) {
    return {
      valid: false,
      reason: frozenReason(
        'active-slot-overflow',
        snapshot.departmentId,
        snapshot.active.map((item) => item.workOrderId)
      ),
    }
  }

  for (const item of allItems) {
    const workOrder = workOrdersById.get(item.workOrderId)
    if (!workOrder) {
      return {
        valid: false,
        reason: frozenReason('missing-work-order', snapshot.departmentId, [item.workOrderId]),
      }
    }
    if (item.completedWork >= workOrder.requiredWork) {
      return {
        valid: false,
        reason: frozenReason('invalid-work-progress', snapshot.departmentId, [item.workOrderId]),
      }
    }
  }

  return {
    valid: true,
    value: Object.freeze({
      snapshot: frozenSnapshot(snapshot),
      workOrdersById,
    }),
  }
}

/**
 * Normalize persisted work orders by embedded ID. Static department definitions
 * remain owned by SPE-2083 and are deliberately not copied into save state.
 */
export function sanitizeDepartmentWorkshopWorkOrders(
  value: unknown,
  registry: DepartmentCapabilityRegistry = DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  authorityGraph?: AuthorityGraph
): DepartmentWorkshopWorkOrderRegistry {
  if (!isRecord(value) || !validateDepartmentCapabilityRegistry(registry, authorityGraph).valid) {
    return Object.freeze({})
  }

  const departments = new Map(registry.departments.map((department) => [department.id, department]))
  const entries: [string, DepartmentWorkshopWorkOrder][] = []
  for (const [registryId, rawWorkOrder] of Object.entries(value)) {
    if (
      isIntegerIndexId(registryId) ||
      !isValidWorkOrder(rawWorkOrder) ||
      registryId !== rawWorkOrder.id
    ) {
      continue
    }
    const department = departments.get(rawWorkOrder.departmentId)
    if (!department?.taskTypes.includes(rawWorkOrder.taskType)) {
      continue
    }
    entries.push([registryId, frozenWorkOrder(rawWorkOrder)])
  }
  entries.sort(([left], [right]) => compareCodeUnits(left, right))
  return Object.freeze(Object.fromEntries(entries))
}

/**
 * Normalize persisted department snapshots independently in department-ID
 * order. A malformed sibling or a later cross-department duplicate is dropped
 * without contaminating valid snapshots.
 */
export function sanitizeDepartmentWorkshopSnapshots(
  value: unknown,
  workOrders: DepartmentWorkshopWorkOrderRegistry,
  registry: DepartmentCapabilityRegistry = DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  authorityGraph?: AuthorityGraph
): DepartmentWorkshopSnapshotRegistry {
  if (
    !isRecord(value) ||
    !isRecord(workOrders) ||
    !validateDepartmentCapabilityRegistry(registry, authorityGraph).valid
  ) {
    return Object.freeze({})
  }

  const entries: [string, DepartmentWorkshopSnapshot][] = []
  const claimedWorkOrderIds = new Set<string>()
  const orderedEntries = Object.entries(value).sort(([left], [right]) =>
    compareCodeUnits(left, right)
  )
  for (const [registryId, rawSnapshot] of orderedEntries) {
    if (
      isIntegerIndexId(registryId) ||
      !isRecord(rawSnapshot) ||
      rawSnapshot.departmentId !== registryId
    ) {
      continue
    }

    const departmentWorkOrders = Object.values(workOrders).filter(
      (workOrder) => workOrder.departmentId === registryId
    )
    const validation = validateWorkshop(
      rawSnapshot as unknown as DepartmentWorkshopSnapshot,
      departmentWorkOrders,
      registry,
      authorityGraph
    )
    if (!validation.valid) {
      continue
    }

    const membershipIds = [
      ...validation.value.snapshot.queued,
      ...validation.value.snapshot.active,
      ...validation.value.snapshot.paused,
    ].map((item) => item.workOrderId)
    if (membershipIds.some((workOrderId) => claimedWorkOrderIds.has(workOrderId))) {
      continue
    }
    membershipIds.forEach((workOrderId) => claimedWorkOrderIds.add(workOrderId))
    entries.push([registryId, validation.value.snapshot])
  }

  return Object.freeze(Object.fromEntries(entries))
}

/** Pure GameState-shaped read seam for persistence and SPE-2084 projections. */
export function readDepartmentWorkshopState(
  source: DepartmentWorkshopStateSource,
  registry: DepartmentCapabilityRegistry = DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  authorityGraph?: AuthorityGraph
): DepartmentWorkshopState {
  const workOrders = sanitizeDepartmentWorkshopWorkOrders(
    source?.departmentWorkshopWorkOrders ?? source?.workOrders,
    registry,
    authorityGraph
  )
  const snapshots = sanitizeDepartmentWorkshopSnapshots(
    source?.departmentWorkshopSnapshots ?? source?.snapshots,
    workOrders,
    registry,
    authorityGraph
  )
  return Object.freeze({ workOrders, snapshots })
}

/**
 * Add one validated order to an existing department's canonical queued lane.
 * This deliberately does not fill a slot or advance any work.
 */
export function enqueueDepartmentWorkshopWorkOrder(
  source: DepartmentWorkshopStateSource,
  workOrder: unknown,
  registry: DepartmentCapabilityRegistry = DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  authorityGraph?: AuthorityGraph
): DepartmentWorkshopWriteResult {
  const workshopState = readDepartmentWorkshopState(source, registry, authorityGraph)
  const departmentId =
    workOrder &&
    typeof workOrder === 'object' &&
    isNormalizedNonEmptyString((workOrder as Partial<DepartmentWorkshopWorkOrder>).departmentId)
      ? (workOrder as DepartmentWorkshopWorkOrder).departmentId
      : ''

  if (!isValidWorkOrder(workOrder) || isIntegerIndexId(workOrder.id)) {
    return blockedWrite(workshopState, frozenReason('invalid-work-orders', departmentId))
  }
  if (!validateDepartmentCapabilityRegistry(registry, authorityGraph).valid) {
    return blockedWrite(
      workshopState,
      frozenReason('invalid-department-registry', workOrder.departmentId)
    )
  }
  const department = registry.departments.find(
    (candidate) => candidate.id === workOrder.departmentId
  )
  if (!department) {
    return blockedWrite(
      workshopState,
      frozenReason('missing-department-definition', workOrder.departmentId)
    )
  }
  if (!department.taskTypes.includes(workOrder.taskType)) {
    return blockedWrite(
      workshopState,
      frozenReason('unsupported-department-task', workOrder.departmentId, [workOrder.id])
    )
  }
  if (workshopState.workOrders[workOrder.id]) {
    return blockedWrite(
      workshopState,
      frozenReason('duplicate-work-order', workOrder.departmentId, [workOrder.id])
    )
  }
  if (
    Object.values(workshopState.workOrders).some((existing) => existing.caseId === workOrder.caseId)
  ) {
    return blockedWrite(
      workshopState,
      frozenReason('duplicate-case-workload', workOrder.departmentId, [workOrder.id])
    )
  }

  const snapshot = workshopState.snapshots[workOrder.departmentId]
  if (!snapshot) {
    return blockedWrite(
      workshopState,
      frozenReason('missing-workshop-snapshot', workOrder.departmentId, [workOrder.id])
    )
  }

  const nextState = frozenWorkshopState(
    { ...workshopState.workOrders, [workOrder.id]: workOrder },
    {
      ...workshopState.snapshots,
      [snapshot.departmentId]: {
        ...snapshot,
        queued: [...snapshot.queued, { workOrderId: workOrder.id, completedWork: 0 }],
      },
    }
  )
  return Object.freeze({ state: 'enqueued', workshopState: nextState, reasons: Object.freeze([]) })
}

/** Move an already queued order to the front without changing any other lane. */
export function prioritizeDepartmentWorkshopWorkOrder(
  source: DepartmentWorkshopStateSource,
  departmentId: unknown,
  workOrderId: unknown,
  registry: DepartmentCapabilityRegistry = DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  authorityGraph?: AuthorityGraph
): DepartmentWorkshopWriteResult {
  const workshopState = readDepartmentWorkshopState(source, registry, authorityGraph)
  if (!isNormalizedNonEmptyString(departmentId) || !isNormalizedNonEmptyString(workOrderId)) {
    return blockedWrite(workshopState, frozenReason('invalid-work-orders', ''))
  }
  if (!validateDepartmentCapabilityRegistry(registry, authorityGraph).valid) {
    return blockedWrite(workshopState, frozenReason('invalid-department-registry', departmentId))
  }
  const snapshot = workshopState.snapshots[departmentId]
  if (!snapshot) {
    return blockedWrite(
      workshopState,
      frozenReason('missing-workshop-snapshot', departmentId, [workOrderId])
    )
  }
  const workOrder = workshopState.workOrders[workOrderId]
  if (!workOrder) {
    return blockedWrite(
      workshopState,
      frozenReason('missing-work-order', departmentId, [workOrderId])
    )
  }
  if (workOrder.departmentId !== departmentId) {
    return blockedWrite(
      workshopState,
      frozenReason('work-order-department-mismatch', departmentId, [workOrderId])
    )
  }
  const queuedIndex = snapshot.queued.findIndex((item) => item.workOrderId === workOrderId)
  if (queuedIndex < 0) {
    return blockedWrite(
      workshopState,
      frozenReason('work-order-not-queued', departmentId, [workOrderId])
    )
  }

  const nextState = frozenWorkshopState(workshopState.workOrders, {
    ...workshopState.snapshots,
    [departmentId]: {
      ...snapshot,
      queued: [
        snapshot.queued[queuedIndex],
        ...snapshot.queued.filter((_, index) => index !== queuedIndex),
      ],
    },
  })
  return Object.freeze({
    state: 'prioritized',
    workshopState: nextState,
    reasons: Object.freeze([]),
  })
}

function fillOpenSlots(
  queued: DepartmentWorkshopWorkItem[],
  active: DepartmentWorkshopWorkItem[],
  slotCapacity: number,
  startedWorkOrderIds: string[]
) {
  while (active.length < slotCapacity && queued.length > 0) {
    const next = queued.shift()
    if (!next) {
      break
    }
    active.push(next)
    startedWorkOrderIds.push(next.workOrderId)
  }
}

/**
 * Advance a single deterministic processing tick.
 *
 * `workOrders` is the caller-owned definition list for this snapshot's single
 * department; foreign-department entries fail closed.
 *
 * Open slots are filled from queue order before active work advances. Work that
 * completes this tick frees slots, which are backfilled without advancing the
 * newly started replacement until the next tick.
 */
export function advanceDepartmentWorkshopQueue(
  snapshot: DepartmentWorkshopSnapshot,
  workOrders: readonly DepartmentWorkshopWorkOrder[],
  registry: DepartmentCapabilityRegistry = DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  authorityGraph?: AuthorityGraph
): DepartmentWorkshopAdvanceResult {
  const validation = validateWorkshop(snapshot, workOrders, registry, authorityGraph)
  if (!validation.valid) {
    return blockedAdvance(validation.reason)
  }

  const validated = validation.value
  if (validated.snapshot.slotCapacity === 0) {
    return blockedAdvanceWithSnapshot(
      validated.snapshot,
      frozenReason('zero-slot-capacity', validated.snapshot.departmentId)
    )
  }

  const queued = validated.snapshot.queued.map((item) => ({ ...item }))
  const active = validated.snapshot.active.map((item) => ({ ...item }))
  const paused = validated.snapshot.paused.map((item) => ({ ...item }))
  const startedWorkOrderIds: string[] = []
  const completedWorkOrderIds: string[] = []

  fillOpenSlots(queued, active, validated.snapshot.slotCapacity, startedWorkOrderIds)

  const remainingActive: DepartmentWorkshopWorkItem[] = []
  for (const item of active) {
    const workOrder = validated.workOrdersById.get(item.workOrderId)
    if (!workOrder) {
      return blockedAdvance(
        frozenReason('missing-work-order', validated.snapshot.departmentId, [item.workOrderId])
      )
    }
    const completedWork = item.completedWork + 1
    if (completedWork >= workOrder.requiredWork) {
      completedWorkOrderIds.push(item.workOrderId)
    } else {
      remainingActive.push({ workOrderId: item.workOrderId, completedWork })
    }
  }

  fillOpenSlots(queued, remainingActive, validated.snapshot.slotCapacity, startedWorkOrderIds)

  return Object.freeze({
    state: 'advanced',
    snapshot: frozenSnapshot({
      departmentId: validated.snapshot.departmentId,
      slotCapacity: validated.snapshot.slotCapacity,
      queued,
      active: remainingActive,
      paused,
    }),
    startedWorkOrderIds: Object.freeze([...startedWorkOrderIds]),
    completedWorkOrderIds: Object.freeze([...completedWorkOrderIds]),
    reasons: Object.freeze([]),
  })
}

/**
 * Advance every persisted department snapshot once in stable department-ID
 * order. `advanceWeek` owns when this runs; this pure seam owns neither
 * GameState nor any non-workshop queue.
 */
export function processDepartmentWorkshopTick(
  source: DepartmentWorkshopStateSource,
  registry: DepartmentCapabilityRegistry = DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  authorityGraph?: AuthorityGraph
): DepartmentWorkshopProcessingTickResult {
  const workshopState = readDepartmentWorkshopState(source, registry, authorityGraph)
  let snapshots = workshopState.snapshots
  let changed = false
  const startedWorkOrderIds: string[] = []
  const completedWorkOrderIds: string[] = []
  const reasons: DepartmentWorkshopReason[] = []

  for (const [departmentId, snapshot] of Object.entries(workshopState.snapshots).sort(
    ([left], [right]) => compareCodeUnits(left, right)
  )) {
    const workOrders = Object.values(workshopState.workOrders).filter(
      (workOrder) => workOrder.departmentId === departmentId
    )
    const advanceResult = advanceDepartmentWorkshopQueue(
      snapshot,
      workOrders,
      registry,
      authorityGraph
    )
    reasons.push(...advanceResult.reasons)

    if (advanceResult.state !== 'advanced' || !advanceResult.snapshot) {
      continue
    }

    const didAdvance =
      advanceResult.startedWorkOrderIds.length > 0 ||
      advanceResult.completedWorkOrderIds.length > 0 ||
      snapshot.active.length > 0
    if (!didAdvance) {
      continue
    }

    if (!changed) {
      snapshots = { ...snapshots }
      changed = true
    }
    snapshots[departmentId] = advanceResult.snapshot
    startedWorkOrderIds.push(...advanceResult.startedWorkOrderIds)
    completedWorkOrderIds.push(...advanceResult.completedWorkOrderIds)
  }

  return Object.freeze({
    state: changed ? 'advanced' : 'unchanged',
    workshopState: changed
      ? frozenWorkshopState(workshopState.workOrders, snapshots)
      : workshopState,
    startedWorkOrderIds: Object.freeze(startedWorkOrderIds),
    completedWorkOrderIds: Object.freeze(completedWorkOrderIds),
    reasons: Object.freeze(reasons),
  })
}

/** Pause active work while preserving progress and freeing its slot. */
export function pauseDepartmentWorkshopWork(
  snapshot: DepartmentWorkshopSnapshot,
  workOrderId: string,
  workOrders: readonly DepartmentWorkshopWorkOrder[],
  registry: DepartmentCapabilityRegistry = DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  authorityGraph?: AuthorityGraph
): DepartmentWorkshopTransitionResult {
  const validation = validateWorkshop(snapshot, workOrders, registry, authorityGraph)
  if (!validation.valid) {
    return blockedTransition(validation.reason)
  }
  if (!isNormalizedNonEmptyString(workOrderId)) {
    return blockedTransition(
      frozenReason('invalid-work-order-id', validation.value.snapshot.departmentId),
      validation.value.snapshot
    )
  }

  const activeIndex = validation.value.snapshot.active.findIndex(
    (item) => item.workOrderId === workOrderId
  )
  if (activeIndex < 0) {
    return blockedTransition(
      frozenReason('work-order-not-active', validation.value.snapshot.departmentId, [workOrderId]),
      validation.value.snapshot
    )
  }

  const active = validation.value.snapshot.active.map((item) => ({ ...item }))
  const [pausedItem] = active.splice(activeIndex, 1)
  return Object.freeze({
    state: 'updated',
    snapshot: frozenSnapshot({
      ...validation.value.snapshot,
      active,
      paused: [...validation.value.snapshot.paused, pausedItem],
    }),
    reasons: Object.freeze([]),
  })
}

/** Resume paused work only when a slot is currently open. */
export function resumeDepartmentWorkshopWork(
  snapshot: DepartmentWorkshopSnapshot,
  workOrderId: string,
  workOrders: readonly DepartmentWorkshopWorkOrder[],
  registry: DepartmentCapabilityRegistry = DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  authorityGraph?: AuthorityGraph
): DepartmentWorkshopTransitionResult {
  const validation = validateWorkshop(snapshot, workOrders, registry, authorityGraph)
  if (!validation.valid) {
    return blockedTransition(validation.reason)
  }
  if (!isNormalizedNonEmptyString(workOrderId)) {
    return blockedTransition(
      frozenReason('invalid-work-order-id', validation.value.snapshot.departmentId),
      validation.value.snapshot
    )
  }

  const validated = validation.value.snapshot
  const pausedIndex = validated.paused.findIndex((item) => item.workOrderId === workOrderId)
  if (pausedIndex < 0) {
    return blockedTransition(
      frozenReason('work-order-not-paused', validated.departmentId, [workOrderId]),
      validated
    )
  }
  if (validated.slotCapacity === 0) {
    return blockedTransition(
      frozenReason('zero-slot-capacity', validated.departmentId, [workOrderId]),
      validated
    )
  }
  if (validated.active.length >= validated.slotCapacity) {
    return blockedTransition(
      frozenReason('no-open-slot', validated.departmentId, [workOrderId]),
      validated
    )
  }

  const paused = validated.paused.map((item) => ({ ...item }))
  const [resumedItem] = paused.splice(pausedIndex, 1)
  return Object.freeze({
    state: 'updated',
    snapshot: frozenSnapshot({
      ...validated,
      active: [...validated.active, resumedItem],
      paused,
    }),
    reasons: Object.freeze([]),
  })
}

/**
 * Project active slot occupancy followed by queued work into SPE-2084's
 * ordered workload view. Paused work is intentionally excluded because it does
 * not consume capacity. Duplicate case IDs fail closed rather than undercounting
 * queue delay.
 */
export function projectDepartmentWorkshopWorkload(
  snapshot: DepartmentWorkshopSnapshot,
  workOrders: readonly DepartmentWorkshopWorkOrder[],
  registry: DepartmentCapabilityRegistry = DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  authorityGraph?: AuthorityGraph
): DepartmentWorkshopWorkloadProjectionResult {
  const validation = validateWorkshop(snapshot, workOrders, registry, authorityGraph)
  if (!validation.valid) {
    return blockedProjection(validation.reason)
  }

  const validated = validation.value
  const workloadItems = [...validated.snapshot.active, ...validated.snapshot.queued]
  const queuedCaseIds = workloadItems.map(
    (item) => validated.workOrdersById.get(item.workOrderId)?.caseId ?? ''
  )
  if (new Set(queuedCaseIds).size !== queuedCaseIds.length) {
    const duplicateWorkOrderIds = workloadItems
      .filter((item, index) => queuedCaseIds.indexOf(queuedCaseIds[index]) !== index)
      .map((item) => item.workOrderId)
    return blockedProjection(
      frozenReason(
        'duplicate-case-workload',
        validated.snapshot.departmentId,
        duplicateWorkOrderIds
      )
    )
  }

  return Object.freeze({
    state: 'projected',
    workloadSnapshot: Object.freeze({
      departmentId: validated.snapshot.departmentId,
      queuedCaseIds: Object.freeze(queuedCaseIds),
      weeklyCapacity: validated.snapshot.slotCapacity,
    }),
    reasons: Object.freeze([]),
  })
}
