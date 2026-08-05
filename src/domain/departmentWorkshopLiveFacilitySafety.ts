import {
  readDepartmentWorkshopState,
  registerDepartmentWorkshopCompletionOutcomes as registerCompletionOutcomes,
  type DepartmentWorkshopCompletionOutcomeResult,
  type DepartmentWorkshopConditionLevel,
  type DepartmentWorkshopQualityConditions,
  type DepartmentWorkshopSafetyConditions,
  type DepartmentWorkshopStateSource,
} from './departmentWorkshopQueue'
import {
  DEFAULT_DEPARTMENT_WORKSHOP_FACILITY_MAPPINGS,
  deriveDepartmentWorkshopSafetyFromFacilities,
  type DepartmentWorkshopFacilityMapping,
} from './departmentWorkshopFacilityMapping'
import {
  DEFAULT_DEPARTMENT_WORKSHOP_ROOM_QUALITY_MAPPINGS,
  deriveDepartmentWorkshopRoomContaminationFromFacilities,
  type DepartmentWorkshopRoomQualityFacilityMapping,
} from './departmentWorkshopFacilityQualityMapping'
import type { GameState } from './models'

export type DepartmentWorkshopLiveFacilitySafetySource = DepartmentWorkshopStateSource &
  Pick<GameState, 'facilityState'>

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function freezeQualityConditions(
  conditions: DepartmentWorkshopQualityConditions
): DepartmentWorkshopQualityConditions {
  return Object.freeze({
    inputQuality: conditions.inputQuality,
    specialistCondition: conditions.specialistCondition,
    roomContamination: conditions.roomContamination,
    ...(conditions.dependencyCondition !== undefined
      ? { dependencyCondition: conditions.dependencyCondition }
      : {}),
    ...(conditions.equipmentCondition !== undefined
      ? { equipmentCondition: conditions.equipmentCondition }
      : {}),
    ...(conditions.reagentGrade !== undefined ? { reagentGrade: conditions.reagentGrade } : {}),
  })
}

/**
 * Composes one authoritative room-contamination condition into the existing
 * completion-quality contract. The live projection owns only the room axis;
 * caller-owned input, specialist, dependency, equipment, and reagent axes are
 * preserved. Missing caller conditions use neutral-good required axes.
 */
export function composeDepartmentWorkshopQualityConditionsWithRoomContamination(
  roomContamination: DepartmentWorkshopConditionLevel,
  callerConditions?: DepartmentWorkshopQualityConditions
): DepartmentWorkshopQualityConditions {
  return freezeQualityConditions({
    inputQuality: callerConditions?.inputQuality ?? 'good',
    specialistCondition: callerConditions?.specialistCondition ?? 'good',
    roomContamination,
    ...(callerConditions?.dependencyCondition !== undefined
      ? { dependencyCondition: callerConditions.dependencyCondition }
      : {}),
    ...(callerConditions?.equipmentCondition !== undefined
      ? { equipmentCondition: callerConditions.equipmentCondition }
      : {}),
    ...(callerConditions?.reagentGrade !== undefined
      ? { reagentGrade: callerConditions.reagentGrade }
      : {}),
  })
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
 * Projects the authored live room condition to exact completed work-order IDs
 * and composes it with caller-owned quality conditions. Unmapped work orders
 * retain caller-owned conditions when supplied and otherwise retain the
 * registrar's neutral nominal baseline.
 */
export function deriveDepartmentWorkshopQualityByWorkOrderIdFromFacilities(
  source: DepartmentWorkshopLiveFacilitySafetySource,
  workOrderIds: readonly string[],
  qualityConditionsByWorkOrderId?: Readonly<
    Record<string, DepartmentWorkshopQualityConditions | undefined>
  >,
  mappings: readonly DepartmentWorkshopRoomQualityFacilityMapping[] =
    DEFAULT_DEPARTMENT_WORKSHOP_ROOM_QUALITY_MAPPINGS
): Readonly<Record<string, DepartmentWorkshopQualityConditions | undefined>> {
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

      const callerConditions = qualityConditionsByWorkOrderId?.[workOrderId]
      const roomContamination = deriveDepartmentWorkshopRoomContaminationFromFacilities(
        source as GameState,
        workOrder.departmentId,
        mappings
      )

      if (roomContamination === undefined) {
        return callerConditions
          ? ([[workOrderId, freezeQualityConditions(callerConditions)]] as const)
          : []
      }

      return [
        [
          workOrderId,
          composeDepartmentWorkshopQualityConditionsWithRoomContamination(
            roomContamination,
            callerConditions
          ),
        ] as const,
      ]
    })

  return Object.freeze(Object.fromEntries(entries))
}

/**
 * Canonical week-close registration seam for live facility quality and safety.
 * The existing receipt registrar remains the sole quality/safety grader and
 * idempotency boundary; this wrapper contributes only transient authoritative
 * facility inputs.
 */
export function registerDepartmentWorkshopCompletionOutcomes(
  source: DepartmentWorkshopLiveFacilitySafetySource,
  completedWorkOrderIds: readonly string[],
  completedWeek: number,
  qualityConditionsByWorkOrderId?: Readonly<
    Record<string, DepartmentWorkshopQualityConditions | undefined>
  >
): DepartmentWorkshopCompletionOutcomeResult {
  const composedQualityConditionsByWorkOrderId =
    deriveDepartmentWorkshopQualityByWorkOrderIdFromFacilities(
      source,
      completedWorkOrderIds,
      qualityConditionsByWorkOrderId
    )
  const safetyConditionsByWorkOrderId =
    deriveDepartmentWorkshopSafetyByWorkOrderIdFromFacilities(source, completedWorkOrderIds)

  return registerCompletionOutcomes(
    source,
    completedWorkOrderIds,
    completedWeek,
    composedQualityConditionsByWorkOrderId,
    safetyConditionsByWorkOrderId
  )
}
