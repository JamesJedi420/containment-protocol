import {
  readDepartmentWorkshopState,
  registerDepartmentWorkshopCompletionOutcomes as registerCompletionOutcomes,
  type DepartmentWorkshopCompletionOutcomeResult,
  type DepartmentWorkshopQualityConditions,
  type DepartmentWorkshopSafetyConditions,
  type DepartmentWorkshopStateSource,
} from './departmentWorkshopQueue'
import {
  DEFAULT_DEPARTMENT_WORKSHOP_FACILITY_MAPPINGS,
  deriveDepartmentWorkshopSafetyFromFacilities,
  type DepartmentWorkshopFacilityMapping,
} from './departmentWorkshopFacilityMapping'
import type { GameState } from './models'

export type DepartmentWorkshopLiveFacilitySafetySource = DepartmentWorkshopStateSource &
  Pick<GameState, 'facilityState'>

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

/**
 * Projects current authoritative facility state to exact completed work-order
 * IDs. Missing work orders are ignored; missing department mappings keep the
 * existing all-good fallback owned by the facility projector.
 */
export function deriveDepartmentWorkshopSafetyByWorkOrderIdFromFacilities(
  source: DepartmentWorkshopLiveFacilitySafetySource,
  workOrderIds: readonly string[],
  mappings: readonly DepartmentWorkshopFacilityMapping[] =
    DEFAULT_DEPARTMENT_WORKSHOP_FACILITY_MAPPINGS
): Readonly<Record<string, DepartmentWorkshopSafetyConditions | undefined>> {
  if (!Array.isArray(workOrderIds) || workOrderIds.length === 0) {
    return Object.freeze({})
  }

  const workOrders = readDepartmentWorkshopState(source).workOrders
  const entries = [...new Set(workOrderIds)]
    .filter((workOrderId) => typeof workOrderId === 'string' && workOrderId.length > 0)
    .sort(compareCodeUnits)
    .flatMap((workOrderId) => {
      const workOrder = workOrders[workOrderId]
      if (!workOrder) {
        return []
      }
      return [
        [
          workOrderId,
          deriveDepartmentWorkshopSafetyFromFacilities(
            source as GameState,
            workOrder.departmentId,
            mappings
          ),
        ] as const,
      ]
    })

  return Object.freeze(Object.fromEntries(entries))
}

/**
 * Canonical week-close registration seam for SPE-2772. The existing receipt
 * registrar remains the sole quality/safety grader and idempotency boundary;
 * this wrapper contributes only transient live-facility safety inputs.
 */
export function registerDepartmentWorkshopCompletionOutcomes(
  source: DepartmentWorkshopLiveFacilitySafetySource,
  completedWorkOrderIds: readonly string[],
  completedWeek: number,
  qualityConditionsByWorkOrderId?: Readonly<
    Record<string, DepartmentWorkshopQualityConditions | undefined>
  >
): DepartmentWorkshopCompletionOutcomeResult {
  const safetyConditionsByWorkOrderId =
    deriveDepartmentWorkshopSafetyByWorkOrderIdFromFacilities(source, completedWorkOrderIds)

  return registerCompletionOutcomes(
    source,
    completedWorkOrderIds,
    completedWeek,
    qualityConditionsByWorkOrderId,
    safetyConditionsByWorkOrderId
  )
}