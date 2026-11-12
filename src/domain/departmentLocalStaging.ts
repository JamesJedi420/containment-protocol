/** SPE-2889 / SPE-1027 persisted department-local staging. Distinct from facilityStockpile. */

import { DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY } from './departmentCapabilities'
import { isDepartmentWorkshopIntegerIndexId } from './departmentWorkshopQueue'
import type {
  DepartmentWorkshopStaging,
  DepartmentWorkshopStagingConditions,
} from './departmentWorkshopQueue'

export type DepartmentLocalStaging = Readonly<Record<string, DepartmentWorkshopStagingConditions>>

const KNOWN_DEPARTMENT_IDS = Object.freeze(
  DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY.departments
    .map((department) => department.id)
    .filter(
      (departmentId) =>
        typeof departmentId === 'string' &&
        departmentId.length > 0 &&
        !isDepartmentWorkshopIntegerIndexId(departmentId)
    )
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDepartmentWorkshopStaging(value: unknown): value is DepartmentWorkshopStaging {
  return value === 'adjacent' || value === 'remote'
}

function parseStagingConditions(value: unknown): DepartmentWorkshopStagingConditions | undefined {
  if (!isRecord(value)) return undefined
  const { inputStaging, outputStaging } = value
  if (!isDepartmentWorkshopStaging(inputStaging) || !isDepartmentWorkshopStaging(outputStaging)) {
    return undefined
  }
  return Object.freeze({ inputStaging, outputStaging })
}

/**
 * Hydrate optional `GameState.departmentLocalStaging`.
 * Omit / non-record / empty after sanitizing → undefined.
 * Unknown, integer-index, prototype-unsafe, and malformed-axis siblings drop independently.
 * Valid siblings insert in deterministic code-unit department-id order.
 */
export function parseDepartmentLocalStaging(value: unknown): DepartmentLocalStaging | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return undefined
  const next: Record<string, DepartmentWorkshopStagingConditions> = {}
  for (const departmentId of KNOWN_DEPARTMENT_IDS) {
    if (!Object.prototype.hasOwnProperty.call(value, departmentId)) continue
    const conditions = parseStagingConditions(value[departmentId])
    if (!conditions) continue
    next[departmentId] = conditions
  }
  return Object.keys(next).length === 0 ? undefined : Object.freeze(next)
}
