import type { CaseInstance, CaseTemplate, GameState, Id } from './models'
import {
  readDepartmentWorkshopState,
  sanitizeDepartmentWorkshopCompletionOutcomes,
} from './departmentWorkshopQueue'
import { createSeededRng, normalizeSeed } from './math'
import { normalizeSpawnRule } from './spawnRules'
import { instantiateFromTemplate, type SpawnedCaseRecord } from './sim/spawn'

/** Work-order keyed map of spawned secondary-incident case IDs (first write wins). */
export type DepartmentWorkshopUnsafeSecondaryIncidentRegistry = Readonly<Record<string, Id>>

export interface DepartmentWorkshopUnsafeSecondaryIncidentResult {
  readonly state: GameState
  readonly spawnedWorkOrderIds: readonly string[]
  readonly spawnedCases: readonly SpawnedCaseRecord[]
}

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

function isNormalizedNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim()
}

function seedFromWorkOrder(week: number, workOrderId: string): number {
  let hash = normalizeSeed(week)
  for (let index = 0; index < workOrderId.length; index += 1) {
    hash = (Math.imul(hash, 31) + workOrderId.charCodeAt(index)) >>> 0
  }
  return normalizeSeed(hash) || 1
}

/**
 * Hydration boundary for unsafe→secondary-incident consume markers.
 * Legacy omit / malformed entries become an empty registry; valid siblings keep
 * work-order → spawned-case id pairs in code-unit key order.
 */
export function sanitizeDepartmentWorkshopUnsafeSecondaryIncidents(
  value: unknown
): DepartmentWorkshopUnsafeSecondaryIncidentRegistry {
  if (!isRecord(value)) {
    return Object.freeze({})
  }

  const entries: [string, Id][] = []
  for (const [key, entry] of Object.entries(value)) {
    if (isIntegerIndexId(key) || !isNormalizedNonEmptyString(key)) {
      continue
    }
    if (!isNormalizedNonEmptyString(entry) || isIntegerIndexId(entry)) {
      continue
    }
    entries.push([key, entry])
  }

  entries.sort(([left], [right]) => compareCodeUnits(left, right))
  return Object.freeze(Object.fromEntries(entries))
}

function resolveFollowUpTemplate(
  parent: CaseInstance,
  templates: Record<string, CaseTemplate>
): CaseTemplate | undefined {
  const unresolvedIds = normalizeSpawnRule(parent.onUnresolved).spawnTemplateIds
  const failIds = normalizeSpawnRule(parent.onFail).spawnTemplateIds
  for (const templateId of [...unresolvedIds, ...failIds]) {
    const template = templates[templateId]
    if (template) {
      return template
    }
  }
  return undefined
}

/**
 * Consume durable `safety: 'unsafe'` completion receipts into one parent-linked
 * follow-up case each via `instantiateFromTemplate`. Quality grades, SPE-2762
 * terminals, and pressure/major-incident producers are out of scope.
 */
export function reconcileDepartmentWorkshopUnsafeSecondaryIncidents(
  state: GameState
): DepartmentWorkshopUnsafeSecondaryIncidentResult {
  const outcomes = sanitizeDepartmentWorkshopCompletionOutcomes(
    state.departmentWorkshopCompletionOutcomes
  )
  const existingMarkers = sanitizeDepartmentWorkshopUnsafeSecondaryIncidents(
    state.departmentWorkshopUnsafeSecondaryIncidents
  )
  const workOrders = readDepartmentWorkshopState(state).workOrders
  const week = Number.isInteger(state.week) && state.week >= 1 ? state.week : 1

  const candidateIds = Object.keys(outcomes)
    .filter((workOrderId) => outcomes[workOrderId]?.safety === 'unsafe')
    .sort(compareCodeUnits)

  let cases = state.cases
  const markers: Record<string, Id> = { ...existingMarkers }
  let casesChanged = false
  const spawnedWorkOrderIds: string[] = []
  const spawnedCases: SpawnedCaseRecord[] = []
  const usedIds = new Set(Object.keys(cases))

  for (const workOrderId of candidateIds) {
    if (Object.hasOwn(markers, workOrderId)) {
      continue
    }

    const receipt = outcomes[workOrderId]
    if (!receipt) {
      continue
    }

    const workOrder = workOrders[workOrderId]
    if (
      !workOrder ||
      workOrder.caseId !== receipt.caseId ||
      workOrder.departmentId !== receipt.departmentId ||
      workOrder.taskType !== receipt.taskType
    ) {
      continue
    }

    const parent = cases[receipt.caseId]
    if (!parent) {
      continue
    }

    const template = resolveFollowUpTemplate(parent, state.templates)
    if (!template) {
      continue
    }

    const rng = createSeededRng(seedFromWorkOrder(week, workOrderId))
    const spawnedCase = instantiateFromTemplate(template, rng.next, usedIds, week)
    if (!casesChanged) {
      cases = { ...cases }
      casesChanged = true
    }
    cases[spawnedCase.id] = spawnedCase
    markers[workOrderId] = spawnedCase.id
    spawnedWorkOrderIds.push(workOrderId)
    spawnedCases.push({
      caseId: spawnedCase.id,
      parentCaseId: receipt.caseId,
      trigger: 'workshop_unsafe',
      sourceReason: receipt.safetyReason,
    })
  }

  if (!casesChanged) {
    return Object.freeze({
      state,
      spawnedWorkOrderIds: Object.freeze([]),
      spawnedCases: Object.freeze([]),
    })
  }

  const nextMarkers = Object.freeze(
    Object.fromEntries(
      Object.entries(markers).sort(([left], [right]) => compareCodeUnits(left, right))
    )
  ) as DepartmentWorkshopUnsafeSecondaryIncidentRegistry

  return Object.freeze({
    state: {
      ...state,
      cases,
      departmentWorkshopUnsafeSecondaryIncidents: nextMarkers,
    },
    spawnedWorkOrderIds: Object.freeze(spawnedWorkOrderIds),
    spawnedCases: Object.freeze(spawnedCases),
  })
}
