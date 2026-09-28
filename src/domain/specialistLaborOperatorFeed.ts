/**
 * SPE-3112 — live specialist operator feed for workshop week-close.
 *
 * Projects an authored operator-slot list into the SPE-3110 work-order gate
 * map. One explicit pair: department task `records_review` → specialist task
 * `archive_classification`. Other task types omit their keys. `undefined`
 * slots omit the map. A present list, including `[]`, is copied onto every
 * valid `records_review` work order. This module does not persist GameState,
 * map agents or staff onto role families, or change SPE-1058 / SPE-3109 /
 * SPE-3110 gate semantics.
 */

import type { DepartmentWorkshopSpecialistLaborGateInputsByWorkOrderId } from './departmentWorkshopQueue'
import type { SpecialistOperatorSlot } from './specialistLaborRegistry'

const RECORDS_REVIEW_TASK = 'records_review'
const ARCHIVE_CLASSIFICATION_TASK = 'archive_classification'

/**
 * Campaign week-close roster. `competent` + `fit` is operable, so existing
 * `records_review` completions stay on the nominal path. Tests inject other
 * lists; do not retune this constant to stall or degrade campaign ticks.
 */
export const PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS: readonly SpecialistOperatorSlot[] =
  Object.freeze([
    Object.freeze({
      roleFamily: 'archive_analyst' as const,
      skillBand: 'competent' as const,
      availabilityBand: 'fit' as const,
    }),
  ])

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRecordsReviewWorkOrder(
  value: unknown
): value is { readonly id: string; readonly taskType: typeof RECORDS_REVIEW_TASK } {
  if (!isRecord(value)) return false
  const id = value.id
  return (
    value.taskType === RECORDS_REVIEW_TASK &&
    typeof id === 'string' &&
    id.length > 0 &&
    id === id.trim()
  )
}

/**
 * Build a SPE-3110 gate-input map from caller-owned operator slots.
 * `undefined` slots return `undefined` (omit the map). Present slots emit
 * keys only for valid `records_review` work orders. Zero matching orders
 * also return `undefined`.
 */
export function projectSpecialistLaborGateInputsByWorkOrderId(
  workOrders: unknown,
  operators: readonly SpecialistOperatorSlot[] | undefined
): DepartmentWorkshopSpecialistLaborGateInputsByWorkOrderId | undefined {
  if (operators === undefined) return undefined

  const slots = Object.freeze(
    (Array.isArray(operators) ? operators : []).map((slot) => Object.freeze({ ...slot }))
  )

  if (!isRecord(workOrders)) return undefined

  const ids = Object.values(workOrders)
    .filter(isRecordsReviewWorkOrder)
    .map((workOrder) => workOrder.id)
    .filter((id, index, all) => all.indexOf(id) === index)
    .sort(compareCodeUnits)

  if (ids.length === 0) return undefined

  return Object.freeze(
    Object.fromEntries(
      ids.map((workOrderId) => [
        workOrderId,
        Object.freeze({
          taskId: ARCHIVE_CLASSIFICATION_TASK,
          operators: slots,
        }),
      ])
    )
  )
}
