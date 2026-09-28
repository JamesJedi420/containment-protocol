/**
 * SPE-3112 / SPE-3113 / SPE-3115 / SPE-3116 / SPE-3117 — live specialist
 * operator feed for workshop week-close.
 *
 * Projects an authored or persisted operator-slot list into the SPE-3110
 * work-order gate map. Two explicit pairs: department task `records_review` →
 * specialist task `archive_classification`, and `containment_response` →
 * `containment_cell_repair`. Other task types omit their keys. `undefined`
 * slots omit the map. A present list, including `[]`, is copied onto every
 * valid paired work order.
 *
 * SPE-3113 adds optional `GameState.specialistOperatorSlots`. Absent or
 * malformed payloads fail-close to the campaign week-close roster. A present
 * empty list is kept and stalls both gated tasks.
 *
 * SPE-3115 adds one explicit AgentRole → archive_analyst binding
 * (`investigator`). SPE-3116 adds one explicit staff specialty →
 * archive_analyst binding (`analysis`). Both write slots only when a match is
 * present and the field is still absent. Compose agent-then-staff. Unmapped
 * roles/specialties and empty rosters leave the field absent so week-close
 * keeps the campaign roster. Never writes `[]` for “no match.” Stat-to-band
 * formulas stay out of scope. Does not change SPE-1058 / SPE-3109 / SPE-3110
 * gate semantics.
 *
 * SPE-3117 adds the containment_response pair and a separate two-slot campaign
 * roster for absent/malformed saves. Personnel helpers still return only the
 * one-slot archive_analyst production list.
 */

import type { DepartmentWorkshopSpecialistLaborGateInputsByWorkOrderId } from './departmentWorkshopQueue'
import {
  isSpecialistAvailabilityBand,
  isSpecialistRoleFamily,
  isSpecialistSkillBand,
  type SpecialistOperatorSlot,
  type SpecialistTaskId,
} from './specialistLaborRegistry'

const RECORDS_REVIEW_TASK = 'records_review'
const ARCHIVE_CLASSIFICATION_TASK = 'archive_classification'
const CONTAINMENT_RESPONSE_TASK = 'containment_response'
const CONTAINMENT_CELL_REPAIR_TASK = 'containment_cell_repair'

type PairedDepartmentTask = typeof RECORDS_REVIEW_TASK | typeof CONTAINMENT_RESPONSE_TASK

const PAIRED_SPECIALIST_TASK_BY_DEPARTMENT: Readonly<
  Record<PairedDepartmentTask, SpecialistTaskId>
> = Object.freeze({
  [RECORDS_REVIEW_TASK]: ARCHIVE_CLASSIFICATION_TASK,
  [CONTAINMENT_RESPONSE_TASK]: CONTAINMENT_CELL_REPAIR_TASK,
})

/**
 * SPE-3115: one authored `AgentRole` that materializes an `archive_analyst`
 * slot. Not an identity map onto `SpecialistRoleFamily`.
 */
export const ARCHIVE_ANALYST_MAPPED_AGENT_ROLE = 'investigator' as const

/**
 * SPE-3116: one authored staff specialty that materializes an `archive_analyst`
 * slot. Not an identity map onto `SpecialistRoleFamily`. Instructors are not a
 * match (they lack `specialty`).
 */
export const ARCHIVE_ANALYST_MAPPED_STAFF_SPECIALTY = 'analysis' as const

/**
 * One-slot archive_analyst list reused by SPE-3115 / SPE-3116 personnel
 * materialization. `competent` + `fit` is operable for `records_review`.
 * Tests inject other lists; do not retune this constant to stall or degrade
 * campaign ticks. SPE-3117 campaign week-close uses
 * `CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS` instead.
 */
export const PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS: readonly SpecialistOperatorSlot[] =
  Object.freeze([
    Object.freeze({
      roleFamily: 'archive_analyst' as const,
      skillBand: 'competent' as const,
      availabilityBand: 'fit' as const,
    }),
  ])

/**
 * SPE-3117 — campaign week-close roster when `GameState.specialistOperatorSlots`
 * is absent or malformed. Includes the production archive_analyst slot plus one
 * `containment_engineer` / `competent` / `fit` slot so both gated pairs stay
 * operable. Used only by `resolveCampaignSpecialistLaborOperatorSlots`.
 * Personnel helpers must not return this list.
 */
export const CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS: readonly SpecialistOperatorSlot[] =
  Object.freeze([
    PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS[0]!,
    Object.freeze({
      roleFamily: 'containment_engineer' as const,
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

function isSpecialistOperatorSlot(value: unknown): value is SpecialistOperatorSlot {
  if (!isRecord(value)) return false
  return (
    isSpecialistRoleFamily(value.roleFamily) &&
    isSpecialistSkillBand(value.skillBand) &&
    isSpecialistAvailabilityBand(value.availabilityBand)
  )
}

/**
 * Hydrate optional `GameState.specialistOperatorSlots`.
 * - `undefined` / omit → `undefined` (campaign week-close keeps the campaign roster)
 * - valid array, including `[]` → frozen own-key copies in input order
 * - non-array or any malformed slot → `undefined` (fail-close entire payload; do not become `[]`)
 */
export function parseSpecialistOperatorSlots(
  value: unknown
): readonly SpecialistOperatorSlot[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return undefined

  const next: SpecialistOperatorSlot[] = []
  for (const entry of value) {
    if (!isSpecialistOperatorSlot(entry)) return undefined
    next.push(
      Object.freeze({
        roleFamily: entry.roleFamily,
        skillBand: entry.skillBand,
        availabilityBand: entry.availabilityBand,
      })
    )
  }
  return Object.freeze(next)
}

/**
 * Resolve the operator list for campaign `advanceWeek`.
 * Valid saved lists (including empty) replace the campaign roster.
 * Absent or malformed payloads keep the campaign roster.
 */
export function resolveCampaignSpecialistLaborOperatorSlots(
  value: unknown
): readonly SpecialistOperatorSlot[] {
  const parsed = parseSpecialistOperatorSlots(value)
  return parsed !== undefined ? parsed : CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS
}

function isMappedAgentRecord(value: unknown): value is { readonly role: string } {
  return isRecord(value) && typeof value.role === 'string'
}

/**
 * SPE-3115 — derive one `archive_analyst` slot from a mapped agent role.
 *
 * Writes only when `specialistOperatorSlots` is still absent and at least one
 * agent has `role === 'investigator'`. Returns the production fixture slot
 * list (one `competent` / `fit` archive_analyst). Never returns `[]`.
 * A present field (including `[]`) or no matching agent returns `undefined`
 * so callers leave the persisted field untouched.
 */
export function deriveArchiveAnalystSlotsFromMappedAgents(
  agents: unknown,
  specialistOperatorSlots: unknown
): readonly SpecialistOperatorSlot[] | undefined {
  if (specialistOperatorSlots !== undefined) return undefined
  if (!isRecord(agents)) return undefined

  for (const agent of Object.values(agents)) {
    if (isMappedAgentRecord(agent) && agent.role === ARCHIVE_ANALYST_MAPPED_AGENT_ROLE) {
      return PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS
    }
  }
  return undefined
}

function isMappedStaffRecord(value: unknown): value is { readonly specialty: string } {
  return isRecord(value) && typeof value.specialty === 'string'
}

/**
 * SPE-3116 — derive one `archive_analyst` slot from a mapped staff specialty.
 *
 * Writes only when `specialistOperatorSlots` is still absent and at least one
 * staff record has `specialty === 'analysis'`. Returns the production fixture
 * slot list (one `competent` / `fit` archive_analyst). Never returns `[]`.
 * A present field (including `[]`) or no matching staff returns `undefined`
 * so callers leave the persisted field untouched. Instructors (no specialty)
 * and other specialties are not matches.
 */
export function deriveArchiveAnalystSlotsFromMappedStaff(
  staff: unknown,
  specialistOperatorSlots: unknown
): readonly SpecialistOperatorSlot[] | undefined {
  if (specialistOperatorSlots !== undefined) return undefined
  if (!isRecord(staff)) return undefined

  for (const member of Object.values(staff)) {
    if (
      isMappedStaffRecord(member) &&
      member.specialty === ARCHIVE_ANALYST_MAPPED_STAFF_SPECIALTY
    ) {
      return PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS
    }
  }
  return undefined
}

/**
 * SPE-3116 — compose SPE-3115 agent map then SPE-3116 staff map.
 *
 * Order is explicit and deterministic: agent-then-staff. Either source writes
 * the same production fixture when it matches and the field is absent. A
 * present field short-circuits both helpers (never overwrite).
 */
export function deriveArchiveAnalystSlotsFromMappedPersonnel(
  agents: unknown,
  staff: unknown,
  specialistOperatorSlots: unknown
): readonly SpecialistOperatorSlot[] | undefined {
  return (
    deriveArchiveAnalystSlotsFromMappedAgents(agents, specialistOperatorSlots) ??
    deriveArchiveAnalystSlotsFromMappedStaff(staff, specialistOperatorSlots)
  )
}

function isPairedWorkOrder(
  value: unknown
): value is { readonly id: string; readonly taskType: PairedDepartmentTask } {
  if (!isRecord(value)) return false
  const id = value.id
  const taskType = value.taskType
  return (
    (taskType === RECORDS_REVIEW_TASK || taskType === CONTAINMENT_RESPONSE_TASK) &&
    typeof id === 'string' &&
    id.length > 0 &&
    id === id.trim()
  )
}

/**
 * Build a SPE-3110 gate-input map from caller-owned operator slots.
 * `undefined` slots return `undefined` (omit the map). Present slots emit
 * keys only for valid `records_review` and `containment_response` work
 * orders. Zero matching orders also return `undefined`. The same operator
 * list is copied onto each keyed work order.
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

  const paired = Object.values(workOrders)
    .filter(isPairedWorkOrder)
    .filter((workOrder, index, all) => all.findIndex((entry) => entry.id === workOrder.id) === index)
    .sort((left, right) => compareCodeUnits(left.id, right.id))

  if (paired.length === 0) return undefined

  return Object.freeze(
    Object.fromEntries(
      paired.map((workOrder) => [
        workOrder.id,
        Object.freeze({
          taskId: PAIRED_SPECIALIST_TASK_BY_DEPARTMENT[workOrder.taskType],
          operators: slots,
        }),
      ])
    )
  )
}
