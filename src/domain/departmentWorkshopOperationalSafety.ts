/**
 * SPE-2771 — live operational PPE and dual-authorization projection for
 * department workshop safety. Composes with SPE-2772 facility isolation /
 * ventilation. Consumes SPE-3441 PPE demand packets. Does not grade safety
 * (SPE-2769 / `resolveDepartmentWorkshopCompletionSafety` remains sole grader).
 */

import type { AgentRole, GameState } from './models'
import {
  resolvePersonnelPpeDemand,
  type PpeDeficitReason,
} from './personnelPpeReplacementDemand'
import type { DepartmentWorkshopConditionLevel } from './departmentWorkshopQueue'

export const DEPARTMENT_WORKSHOP_OPERATIONAL_SAFETY_OWNER = 'SPE-2771' as const

/**
 * Agents must carry this tag (plus an authored role) to count as assigned
 * workshop ops staff. Keeps ordinary roster medics from auto-forcing PPE /
 * dualAuth poor on every biohazard completion.
 */
export const WORKSHOP_OPERATIONAL_ASSIGNMENT_TAG = 'workshop_ops' as const

export const DEPARTMENT_WORKSHOP_OPERATIONAL_FALLBACK_REASONS = [
  'ppe_unmapped_department',
  'ppe_no_assigned_staff',
  'dual_auth_unmapped_department',
  'dual_auth_no_assigned_staff',
] as const
export type DepartmentWorkshopOperationalFallbackReason =
  (typeof DEPARTMENT_WORKSHOP_OPERATIONAL_FALLBACK_REASONS)[number]

export interface DepartmentWorkshopOperationalSafetyMapping {
  readonly departmentId: string
  /** SPE-3441 requirement IDs that assigned staff must satisfy for PPE good. */
  readonly ppeRequirementIds: readonly string[]
  /** Active agent roles eligible for workshop ops assignment (with tag). */
  readonly assignedRoles: readonly AgentRole[]
  /** Minimum agency/root clearance for dualAuth good when assigned staff exist. */
  readonly dualAuthMinClearanceLevel: number
}

/**
 * Authored production mapping: biohazard workshop requires medic hazmat PPE
 * and agency clearance ≥ 2 when assigned medics are present.
 */
export const DEFAULT_DEPARTMENT_WORKSHOP_OPERATIONAL_SAFETY_MAPPINGS: readonly DepartmentWorkshopOperationalSafetyMapping[] =
  Object.freeze([
    Object.freeze({
      departmentId: 'department:biohazard-response',
      ppeRequirementIds: Object.freeze(['ppe:medic:armor:hazmat_suit'] as const),
      assignedRoles: Object.freeze(['medic'] as const satisfies readonly AgentRole[]),
      dualAuthMinClearanceLevel: 2,
    }),
  ])

export interface DepartmentWorkshopOperationalSafetyProjection {
  readonly ppe: DepartmentWorkshopConditionLevel
  readonly dualAuth: DepartmentWorkshopConditionLevel
  readonly ownsPpe: boolean
  readonly ownsDualAuth: boolean
  readonly assignedAgentIds: readonly string[]
  readonly fallbackReasons: readonly DepartmentWorkshopOperationalFallbackReason[]
  readonly ppeDeficitReasons: readonly PpeDeficitReason[]
}

const EMPTY_PROJECTION: DepartmentWorkshopOperationalSafetyProjection = Object.freeze({
  ppe: 'good',
  dualAuth: 'good',
  ownsPpe: false,
  ownsDualAuth: false,
  assignedAgentIds: Object.freeze([] as string[]),
  fallbackReasons: Object.freeze([] as DepartmentWorkshopOperationalFallbackReason[]),
  ppeDeficitReasons: Object.freeze([] as PpeDeficitReason[]),
})

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function resolveAgencyClearanceLevel(source: GameState): number {
  const fromAgency = source.agency?.clearanceLevel
  if (typeof fromAgency === 'number' && Number.isFinite(fromAgency)) {
    return Math.max(1, Math.trunc(fromAgency))
  }
  if (typeof source.clearanceLevel === 'number' && Number.isFinite(source.clearanceLevel)) {
    return Math.max(1, Math.trunc(source.clearanceLevel))
  }
  return 1
}

/**
 * Active agents whose role is authored for the department and who carry the
 * workshop-ops assignment tag, sorted by id.
 */
export function listAssignedWorkshopOperationalAgents(
  source: GameState,
  mapping: DepartmentWorkshopOperationalSafetyMapping
): readonly string[] {
  const roleSet = new Set(mapping.assignedRoles)
  return Object.values(source.agents ?? {})
    .filter(
      (agent) =>
        agent?.status === 'active' &&
        roleSet.has(agent.role) &&
        Array.isArray(agent.tags) &&
        agent.tags.includes(WORKSHOP_OPERATIONAL_ASSIGNMENT_TAG)
    )
    .map((agent) => agent.id)
    .sort(compareCodeUnits)
}

/**
 * Projects PPE + dualAuth for one department from live staff loadout and
 * agency clearance. Unmapped departments return owns* false so callers keep
 * facility/legacy axes. Missing assigned staff defaults safely to good with
 * inspectable fallback reasons.
 */
export function projectDepartmentWorkshopOperationalSafety(
  source: GameState,
  departmentId: string,
  mappings: readonly DepartmentWorkshopOperationalSafetyMapping[] = DEFAULT_DEPARTMENT_WORKSHOP_OPERATIONAL_SAFETY_MAPPINGS
): DepartmentWorkshopOperationalSafetyProjection {
  if (typeof departmentId !== 'string' || departmentId.length === 0 || !Array.isArray(mappings)) {
    return EMPTY_PROJECTION
  }

  const mapping = mappings.find((row) => row.departmentId === departmentId)
  if (!mapping) {
    return Object.freeze({
      ...EMPTY_PROJECTION,
      fallbackReasons: Object.freeze([
        'ppe_unmapped_department',
        'dual_auth_unmapped_department',
      ] as const),
    })
  }

  const assignedAgentIds = listAssignedWorkshopOperationalAgents(source, mapping)
  const fallbackReasons: DepartmentWorkshopOperationalFallbackReason[] = []
  const ppeDeficitReasons: PpeDeficitReason[] = []

  let ppe: DepartmentWorkshopConditionLevel = 'good'
  if (assignedAgentIds.length === 0) {
    fallbackReasons.push('ppe_no_assigned_staff')
  } else {
    for (const agentId of assignedAgentIds) {
      for (const requirementId of mapping.ppeRequirementIds) {
        const demand = resolvePersonnelPpeDemand(source, { agentId, requirementId })
        if (!demand) {
          continue
        }
        if (demand.unmet) {
          ppe = 'poor'
          for (const reason of demand.reasons) {
            if (
              reason === 'missing_assignment' ||
              reason === 'unserviceable' ||
              reason === 'wrong_definition' ||
              reason === 'insufficient_capability'
            ) {
              ppeDeficitReasons.push(reason)
            }
          }
        }
      }
    }
  }

  let dualAuth: DepartmentWorkshopConditionLevel = 'good'
  if (assignedAgentIds.length === 0) {
    fallbackReasons.push('dual_auth_no_assigned_staff')
  } else {
    const clearance = resolveAgencyClearanceLevel(source)
    if (clearance < mapping.dualAuthMinClearanceLevel) {
      dualAuth = 'poor'
    }
  }

  return Object.freeze({
    ppe,
    dualAuth,
    ownsPpe: true,
    ownsDualAuth: true,
    assignedAgentIds: Object.freeze([...assignedAgentIds]),
    fallbackReasons: Object.freeze([...fallbackReasons]),
    ppeDeficitReasons: Object.freeze([...new Set(ppeDeficitReasons)]),
  })
}
