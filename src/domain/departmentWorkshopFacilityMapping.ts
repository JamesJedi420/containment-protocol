import type { GameState } from './models'
import type {
  DepartmentWorkshopConditionLevel,
  DepartmentWorkshopSafetyConditions,
} from './departmentWorkshopQueue'

export type DepartmentWorkshopSafetyAxis = 'isolation' | 'ventilation' | 'ppe' | 'dualAuth'

export interface DepartmentWorkshopFacilityAxisBinding {
  readonly facilityId: string
  readonly axis: DepartmentWorkshopSafetyAxis
}

export interface DepartmentWorkshopFacilityMapping {
  readonly departmentId: string
  readonly axisBindings: readonly DepartmentWorkshopFacilityAxisBinding[]
}

/** Override to provide authored department → facility → safety axis bindings. Defaults to empty (all departments produce all-good conditions). */
export const DEFAULT_DEPARTMENT_WORKSHOP_FACILITY_MAPPINGS: readonly DepartmentWorkshopFacilityMapping[] =
  Object.freeze([])

const ALL_GOOD_CONDITIONS: DepartmentWorkshopSafetyConditions = Object.freeze({
  isolation: 'good',
  ventilation: 'good',
  ppe: 'good',
  dualAuth: 'good',
})

function facilityAxisLevel(
  source: GameState,
  facilityId: string
): DepartmentWorkshopConditionLevel {
  const facility = source.facilityState?.facilities?.[facilityId]
  return facility?.status === 'active' ? 'good' : 'poor'
}

/**
 * Derives `DepartmentWorkshopSafetyConditions` for one department from
 * live `facilityState`. An absent or non-active facility → `poor` for its
 * bound axis. Missing mapping entry → all `good`.
 */
export function deriveDepartmentWorkshopSafetyFromFacilities(
  source: GameState,
  departmentId: string,
  mappings: readonly DepartmentWorkshopFacilityMapping[] = DEFAULT_DEPARTMENT_WORKSHOP_FACILITY_MAPPINGS
): DepartmentWorkshopSafetyConditions {
  if (typeof departmentId !== 'string' || departmentId.length === 0 || !Array.isArray(mappings)) {
    return ALL_GOOD_CONDITIONS
  }

  const mapping = mappings.find((m) => m.departmentId === departmentId)
  if (!mapping || mapping.axisBindings.length === 0) {
    return ALL_GOOD_CONDITIONS
  }

  let isolation: DepartmentWorkshopConditionLevel = 'good'
  let ventilation: DepartmentWorkshopConditionLevel = 'good'
  let ppe: DepartmentWorkshopConditionLevel = 'good'
  let dualAuth: DepartmentWorkshopConditionLevel = 'good'

  for (const binding of mapping.axisBindings) {
    if (facilityAxisLevel(source, binding.facilityId) === 'poor') {
      if (binding.axis === 'isolation') isolation = 'poor'
      else if (binding.axis === 'ventilation') ventilation = 'poor'
      else if (binding.axis === 'ppe') ppe = 'poor'
      else if (binding.axis === 'dualAuth') dualAuth = 'poor'
    }
  }

  return Object.freeze({ isolation, ventilation, ppe, dualAuth })
}

/**
 * Derives per-department safety conditions for a set of departments.
 * Returns a stable-sorted (code-unit order) record keyed by departmentId.
 */
export function deriveAllDepartmentWorkshopSafetyFromFacilities(
  source: GameState,
  departmentIds: readonly string[],
  mappings: readonly DepartmentWorkshopFacilityMapping[] = DEFAULT_DEPARTMENT_WORKSHOP_FACILITY_MAPPINGS
): Readonly<Record<string, DepartmentWorkshopSafetyConditions>> {
  if (!Array.isArray(departmentIds) || departmentIds.length === 0) {
    return Object.freeze({})
  }

  const sorted = [...departmentIds]
    .filter((id) => typeof id === 'string' && id.length > 0)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

  return Object.freeze(
    Object.fromEntries(
      sorted.map((departmentId) => [
        departmentId,
        deriveDepartmentWorkshopSafetyFromFacilities(source, departmentId, mappings),
      ])
    )
  )
}
