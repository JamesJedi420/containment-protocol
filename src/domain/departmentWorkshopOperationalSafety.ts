/**
 * SPE-2771 — live operational PPE and dual-authorization projection for
 * department workshop safety. Composes with SPE-2772 facility isolation /
 * ventilation. Mirrors the SPE-3441 medic hazmat PPE requirement by stable
 * requirement id + slot/definition facts without importing the PPE-demand or
 * equipment catalog modules (those sit on a production↔equipment init cycle
 * that must stay off the week-close live-safety import graph).
 * Does not grade safety (`resolveDepartmentWorkshopCompletionSafety` remains
 * the sole grader).
 */

import type { Agent, AgentRole, GameState } from './models'
import type { DepartmentWorkshopConditionLevel } from './departmentWorkshopQueue'

export const DEPARTMENT_WORKSHOP_OPERATIONAL_SAFETY_OWNER = 'SPE-2771' as const

/**
 * Agents must carry this tag (plus an authored role) to count as assigned
 * workshop ops staff. Keeps ordinary roster medics from auto-forcing PPE /
 * dualAuth poor on every biohazard completion.
 */
export const WORKSHOP_OPERATIONAL_ASSIGNMENT_TAG = 'workshop_ops' as const

/** Stable SPE-3441 fixture id mirrored for workshop PPE projection. */
export const BIOHAZARD_WORKSHOP_PPE_REQUIREMENT_ID = 'ppe:medic:armor:hazmat_suit' as const
const BIOHAZARD_WORKSHOP_PPE_SLOT = 'armor' as const
const BIOHAZARD_WORKSHOP_PPE_DEFINITION_ID = 'hazmat_suit' as const

export const DEPARTMENT_WORKSHOP_OPERATIONAL_FALLBACK_REASONS = [
  'ppe_unmapped_department',
  'ppe_no_assigned_staff',
  'dual_auth_unmapped_department',
  'dual_auth_no_assigned_staff',
] as const
export type DepartmentWorkshopOperationalFallbackReason =
  (typeof DEPARTMENT_WORKSHOP_OPERATIONAL_FALLBACK_REASONS)[number]

export const DEPARTMENT_WORKSHOP_PPE_DEFICIT_REASONS = [
  'missing_assignment',
  'unserviceable',
  'wrong_definition',
] as const
export type DepartmentWorkshopPpeDeficitReason =
  (typeof DEPARTMENT_WORKSHOP_PPE_DEFICIT_REASONS)[number]

export interface DepartmentWorkshopOperationalSafetyMapping {
  readonly departmentId: string
  /** SPE-3441-aligned requirement IDs that assigned staff must satisfy for PPE good. */
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
      ppeRequirementIds: Object.freeze([BIOHAZARD_WORKSHOP_PPE_REQUIREMENT_ID] as const),
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
  readonly ppeDeficitReasons: readonly DepartmentWorkshopPpeDeficitReason[]
}

const EMPTY_PROJECTION: DepartmentWorkshopOperationalSafetyProjection = Object.freeze({
  ppe: 'good',
  dualAuth: 'good',
  ownsPpe: false,
  ownsDualAuth: false,
  assignedAgentIds: Object.freeze([] as string[]),
  fallbackReasons: Object.freeze([] as DepartmentWorkshopOperationalFallbackReason[]),
  ppeDeficitReasons: Object.freeze([] as DepartmentWorkshopPpeDeficitReason[]),
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

function readArmorDefinitionId(agent: Agent): string | undefined {
  const slots = agent.equipmentSlots as Record<string, unknown> | undefined
  if (!slots) {
    return undefined
  }
  const aliases = [BIOHAZARD_WORKSHOP_PPE_SLOT, 'protectiveGear'] as const
  for (const alias of aliases) {
    const value = slots[alias]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }
  return undefined
}

function isEquippedArmorDamaged(source: GameState, agentId: string): boolean {
  const instances = source.equipmentInstances
  if (!instances || typeof instances !== 'object') {
    return false
  }
  for (const instance of Object.values(instances)) {
    if (!instance || typeof instance !== 'object') {
      continue
    }
    const location = (instance as { location?: unknown }).location
    if (!location || typeof location !== 'object') {
      continue
    }
    const loc = location as { state?: unknown; agentId?: unknown; slot?: unknown }
    if (
      loc.state === 'equipped' &&
      loc.agentId === agentId &&
      loc.slot === BIOHAZARD_WORKSHOP_PPE_SLOT &&
      (instance as { condition?: unknown }).condition === 'damaged'
    ) {
      return true
    }
  }
  return false
}

/**
 * Resolve PPE deficit reasons for one agent against a mirrored SPE-3441
 * requirement id. Unknown requirement ids yield no deficit (caller skip).
 */
function resolveMirroredPpeDeficit(
  source: GameState,
  agent: Agent,
  requirementId: string
): readonly DepartmentWorkshopPpeDeficitReason[] | undefined {
  if (requirementId !== BIOHAZARD_WORKSHOP_PPE_REQUIREMENT_ID) {
    return undefined
  }
  if (agent.role !== 'medic') {
    return undefined
  }

  const reasons: DepartmentWorkshopPpeDeficitReason[] = []
  const definitionId = readArmorDefinitionId(agent)
  if (!definitionId) {
    reasons.push('missing_assignment')
  } else {
    if (isEquippedArmorDamaged(source, agent.id)) {
      reasons.push('unserviceable')
    }
    if (definitionId !== BIOHAZARD_WORKSHOP_PPE_DEFINITION_ID) {
      reasons.push('wrong_definition')
    }
  }
  return Object.freeze(reasons)
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
  const ppeDeficitReasons: DepartmentWorkshopPpeDeficitReason[] = []

  let ppe: DepartmentWorkshopConditionLevel = 'good'
  if (assignedAgentIds.length === 0) {
    fallbackReasons.push('ppe_no_assigned_staff')
  } else {
    for (const agentId of assignedAgentIds) {
      const agent = source.agents?.[agentId]
      if (!agent) {
        continue
      }
      for (const requirementId of mapping.ppeRequirementIds) {
        const deficit = resolveMirroredPpeDeficit(source, agent, requirementId)
        if (!deficit) {
          continue
        }
        if (deficit.length > 0) {
          ppe = 'poor'
          ppeDeficitReasons.push(...deficit)
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
