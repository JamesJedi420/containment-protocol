import type { AuthorityGraph } from './authorityGraph'
import {
  DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  validateDepartmentCapabilityRegistry,
  type DepartmentCapabilityRegistry,
} from './departmentCapabilities'
import { isConstructionComplete } from './constructionProgress'
import type { GameState } from './models'
import {
  isDepartmentWorkshopIntegerIndexId,
  readDepartmentWorkshopState,
  type DepartmentWorkshopSnapshot,
  type DepartmentWorkshopState,
} from './departmentWorkshopQueue'

export interface DepartmentWorkshopActivationRequest {
  readonly departmentId: string
  readonly constructionCaseId: string
  readonly structuralRouteId: string
  readonly slotCapacity: number
}

export type DepartmentWorkshopActivationReasonCode =
  | 'invalid-activation-request'
  | 'invalid-department-registry'
  | 'missing-department-definition'
  | 'invalid-workshop-state'
  | 'missing-construction-case'
  | 'construction-incomplete'
  | 'missing-map-layer'
  | 'missing-structural-route'
  | 'workshop-already-active'

export interface DepartmentWorkshopActivationReason {
  readonly code: DepartmentWorkshopActivationReasonCode
  readonly departmentId: string
  readonly constructionCaseId: string
  readonly structuralRouteId: string
}

export interface DepartmentWorkshopActivationResult {
  readonly state: 'activated' | 'unchanged' | 'blocked'
  readonly departmentId: string
  readonly constructionCaseId: string
  readonly structuralRouteId: string
  readonly workshopState: DepartmentWorkshopState
  readonly reasons: readonly DepartmentWorkshopActivationReason[]
}

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNormalizedId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim()
}

function safeId(value: unknown): string {
  return isNormalizedId(value) ? value : ''
}

function matchesCanonicalValue(raw: unknown, canonical: unknown): boolean {
  if (Object.is(raw, canonical)) return true
  if (Array.isArray(raw) || Array.isArray(canonical)) {
    if (!Array.isArray(raw) || !Array.isArray(canonical) || raw.length !== canonical.length) {
      return false
    }
    for (let index = 0; index < raw.length; index += 1) {
      if (!(index in raw) || !(index in canonical)) return false
      if (!matchesCanonicalValue(raw[index], canonical[index])) return false
    }
    return true
  }
  if (!isRecord(raw) || !isRecord(canonical)) return false
  const rawKeys = Object.keys(raw).sort(compareCodeUnits)
  const canonicalKeys = Object.keys(canonical).sort(compareCodeUnits)
  if (rawKeys.length !== canonicalKeys.length) return false
  return rawKeys.every(
    (key, index) => key === canonicalKeys[index] && matchesCanonicalValue(raw[key], canonical[key])
  )
}

function matchesCanonicalRegistry(raw: unknown, canonical: unknown) {
  if (!isRecord(raw)) return false
  try {
    return matchesCanonicalValue(raw, canonical)
  } catch {
    return false
  }
}

function frozenReason(
  code: DepartmentWorkshopActivationReasonCode,
  departmentId: string,
  constructionCaseId: string,
  structuralRouteId: string
): DepartmentWorkshopActivationReason {
  return Object.freeze({ code, departmentId, constructionCaseId, structuralRouteId })
}

function reasonFor(
  code: DepartmentWorkshopActivationReasonCode,
  request: {
    readonly departmentId: string
    readonly constructionCaseId: string
    readonly structuralRouteId: string
  }
) {
  return frozenReason(
    code,
    request.departmentId,
    request.constructionCaseId,
    request.structuralRouteId
  )
}

function frozenResult(
  state: DepartmentWorkshopActivationResult['state'],
  request: {
    readonly departmentId: string
    readonly constructionCaseId: string
    readonly structuralRouteId: string
  },
  workshopState: DepartmentWorkshopState,
  reason?: DepartmentWorkshopActivationReason
): DepartmentWorkshopActivationResult {
  return Object.freeze({
    state,
    ...request,
    workshopState,
    reasons: Object.freeze(reason ? [reason] : []),
  })
}

/**
 * Create one empty canonical department workshop after construction and exact
 * structural-route proof. This command never advances construction or resizes
 * an existing workshop.
 */
export function activateDepartmentWorkshopFromConstruction(
  source: GameState,
  request: DepartmentWorkshopActivationRequest,
  registry: DepartmentCapabilityRegistry = DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  authorityGraph?: AuthorityGraph
): DepartmentWorkshopActivationResult {
  const requestIds = {
    departmentId: safeId(request?.departmentId),
    constructionCaseId: safeId(request?.constructionCaseId),
    structuralRouteId: safeId(request?.structuralRouteId),
  }
  const workshopState = readDepartmentWorkshopState(source, registry, authorityGraph)

  if (
    !isNormalizedId(request?.departmentId) ||
    isDepartmentWorkshopIntegerIndexId(request?.departmentId ?? '') ||
    !isNormalizedId(request?.constructionCaseId) ||
    !isNormalizedId(request?.structuralRouteId) ||
    !Number.isSafeInteger(request?.slotCapacity) ||
    request.slotCapacity <= 0
  ) {
    return frozenResult(
      'blocked',
      requestIds,
      workshopState,
      reasonFor('invalid-activation-request', requestIds)
    )
  }

  if (!validateDepartmentCapabilityRegistry(registry, authorityGraph).valid) {
    return frozenResult(
      'blocked',
      requestIds,
      workshopState,
      reasonFor('invalid-department-registry', requestIds)
    )
  }
  if (!registry.departments.some((department) => department.id === request.departmentId)) {
    return frozenResult(
      'blocked',
      requestIds,
      workshopState,
      reasonFor('missing-department-definition', requestIds)
    )
  }

  if (
    !matchesCanonicalRegistry(
      source.departmentWorkshopWorkOrders === undefined ? {} : source.departmentWorkshopWorkOrders,
      workshopState.workOrders
    ) ||
    !matchesCanonicalRegistry(
      source.departmentWorkshopSnapshots === undefined ? {} : source.departmentWorkshopSnapshots,
      workshopState.snapshots
    )
  ) {
    return frozenResult(
      'blocked',
      requestIds,
      workshopState,
      reasonFor('invalid-workshop-state', requestIds)
    )
  }

  const constructionCase = source.cases[request.constructionCaseId]
  if (!constructionCase) {
    return frozenResult(
      'blocked',
      requestIds,
      workshopState,
      reasonFor('missing-construction-case', requestIds)
    )
  }
  if (!isConstructionComplete(source, request.constructionCaseId)) {
    return frozenResult(
      'blocked',
      requestIds,
      workshopState,
      reasonFor('construction-incomplete', requestIds)
    )
  }

  if (!constructionCase.mapLayer || !Array.isArray(constructionCase.mapLayer.routes)) {
    return frozenResult(
      'blocked',
      requestIds,
      workshopState,
      reasonFor('missing-map-layer', requestIds)
    )
  }
  if (
    !constructionCase.mapLayer.routes.some(
      (route) => isRecord(route) && route.id === request.structuralRouteId
    )
  ) {
    return frozenResult(
      'blocked',
      requestIds,
      workshopState,
      reasonFor('missing-structural-route', requestIds)
    )
  }

  const existing = workshopState.snapshots[request.departmentId]
  if (existing) {
    const isIdenticalEmptyWorkshop =
      existing.slotCapacity === request.slotCapacity &&
      existing.queued.length === 0 &&
      existing.active.length === 0 &&
      existing.paused.length === 0
    if (isIdenticalEmptyWorkshop) {
      return frozenResult('unchanged', requestIds, workshopState)
    }
    return frozenResult(
      'blocked',
      requestIds,
      workshopState,
      reasonFor('workshop-already-active', requestIds)
    )
  }

  const snapshot: DepartmentWorkshopSnapshot = Object.freeze({
    departmentId: request.departmentId,
    slotCapacity: request.slotCapacity,
    queued: Object.freeze([]),
    active: Object.freeze([]),
    paused: Object.freeze([]),
  })
  const snapshots = Object.freeze(
    Object.fromEntries(
      [...Object.entries(workshopState.snapshots), [request.departmentId, snapshot]].sort(
        ([left], [right]) => compareCodeUnits(left, right)
      )
    )
  )
  return frozenResult(
    'activated',
    requestIds,
    Object.freeze({ workOrders: workshopState.workOrders, snapshots })
  )
}
