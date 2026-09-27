/**
 * SPE-3110 — week-close wire of specialist labor workshop-consume adapter.
 *
 * Composes SPE-1058 `projectSpecialistLaborGate` → SPE-3109
 * `mapSpecialistLaborGateToWorkshopConsume` into the existing department
 * workshop tick + completion-registration path. Callers own gate inputs;
 * this module does not persist a specialist roster, change registry/adapter
 * semantics, or add an `advanceWeek` argument.
 */

import {
  registerDepartmentWorkshopCompletionOutcomes,
  type DepartmentWorkshopLiveFacilitySafetySource,
} from './departmentWorkshopLiveFacilitySafety'
import {
  processDepartmentWorkshopTick,
  type DepartmentWorkshopCompletionOutcomeResult,
  type DepartmentWorkshopProcessingTickResult,
  type DepartmentWorkshopQualityConditions,
  type DepartmentWorkshopSpecialistLaborGateInputsByWorkOrderId,
  type DepartmentWorkshopStagingConditionsByDepartment,
} from './departmentWorkshopQueue'
import { projectSpecialistLaborGate } from './specialistLaborRegistry'
import { mapSpecialistLaborGateToWorkshopConsume } from './specialistLaborWorkshopConsume'

export interface DepartmentWorkshopSpecialistLaborWeekCloseResult {
  readonly tick: DepartmentWorkshopProcessingTickResult
  readonly completionOutcomes: DepartmentWorkshopCompletionOutcomeResult
}

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

/**
 * Build SPE-2768 quality conditions that set only `specialistCondition` for
 * completed work orders whose present gate entry allowed consume. Absent map
 * / absent keys contribute nothing (today's facility / nominal path).
 */
export function deriveSpecialistLaborQualityConditionsByWorkOrderId(
  completedWorkOrderIds: readonly string[],
  gateInputsByWorkOrderId?: DepartmentWorkshopSpecialistLaborGateInputsByWorkOrderId
): Readonly<Record<string, DepartmentWorkshopQualityConditions | undefined>> {
  if (
    gateInputsByWorkOrderId == null ||
    typeof gateInputsByWorkOrderId !== 'object' ||
    Array.isArray(gateInputsByWorkOrderId) ||
    !Array.isArray(completedWorkOrderIds) ||
    completedWorkOrderIds.length === 0
  ) {
    return Object.freeze({})
  }

  const entries = [...new Set(completedWorkOrderIds)]
    .filter((workOrderId) => typeof workOrderId === 'string' && workOrderId.length > 0)
    .sort(compareCodeUnits)
    .flatMap((workOrderId) => {
      if (!Object.hasOwn(gateInputsByWorkOrderId, workOrderId)) {
        return []
      }
      const projection = projectSpecialistLaborGate(gateInputsByWorkOrderId[workOrderId])
      const view = mapSpecialistLaborGateToWorkshopConsume(projection)
      if (!view.consumeAllowed || view.specialistCondition == null) {
        return []
      }
      const conditions: DepartmentWorkshopQualityConditions = Object.freeze({
        inputQuality: 'good' as const,
        specialistCondition: view.specialistCondition,
        roomContamination: 'good' as const,
      })
      return [[workOrderId, conditions] as const]
    })

  return Object.freeze(Object.fromEntries(entries))
}

/**
 * One week-close workshop tick + completion registration with optional
 * specialist labor gate inputs. Omit the gate map for today's default path
 * (campaign `advanceWeek` omits it). Staging remains the topology projection
 * feed when supplied by the caller.
 */
export function runDepartmentWorkshopSpecialistLaborWeekClose(
  source: DepartmentWorkshopLiveFacilitySafetySource,
  completedWeek: number,
  stagingConditionsByDepartment?: DepartmentWorkshopStagingConditionsByDepartment,
  gateInputsByWorkOrderId?: DepartmentWorkshopSpecialistLaborGateInputsByWorkOrderId
): DepartmentWorkshopSpecialistLaborWeekCloseResult {
  const tick = processDepartmentWorkshopTick(
    source,
    undefined,
    undefined,
    stagingConditionsByDepartment,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    gateInputsByWorkOrderId
  )

  const registrationSource: DepartmentWorkshopLiveFacilitySafetySource =
    tick.state === 'advanced'
      ? {
          ...source,
          departmentWorkshopWorkOrders: tick.workshopState.workOrders,
          departmentWorkshopSnapshots: tick.workshopState.snapshots,
        }
      : source

  const qualityConditionsByWorkOrderId = deriveSpecialistLaborQualityConditionsByWorkOrderId(
    tick.completedWorkOrderIds,
    gateInputsByWorkOrderId
  )

  const completionOutcomes = registerDepartmentWorkshopCompletionOutcomes(
    registrationSource,
    tick.completedWorkOrderIds,
    completedWeek,
    qualityConditionsByWorkOrderId
  )

  return Object.freeze({
    tick,
    completionOutcomes,
  })
}
