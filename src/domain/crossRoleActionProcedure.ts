import type { AgentRole } from './agent/models'

export type CrossRoleActionId = 'scan'

export interface CrossRoleActionLaneDefinition {
  readonly laneId: string
  readonly allowedRoles: readonly AgentRole[]
  readonly minAgents: number
}

export interface CrossRoleActionProcedure {
  readonly id: string
  readonly actionId: CrossRoleActionId
  readonly lanes: readonly CrossRoleActionLaneDefinition[]
  readonly prerequisiteTags: readonly string[]
}

export type CrossRoleActionProcedureValidationError =
  | 'invalid_id'
  | 'invalid_action_id'
  | 'invalid_lanes'
  | 'duplicate_lane_id'
  | 'invalid_lane_id'
  | 'invalid_lane_min_agents'
  | 'invalid_lane_allowed_roles'
  | 'empty_prerequisite_tags'

export type CrossRoleActionProcedureValidationResult =
  | { ok: true; procedure: CrossRoleActionProcedure }
  | { ok: false; error: CrossRoleActionProcedureValidationError }

export interface CrossRoleLaneAssignment {
  readonly laneId: string
  readonly agentRoles: readonly AgentRole[]
}

export interface ResolveCrossRoleActionInput {
  readonly procedure: CrossRoleActionProcedure
  readonly laneAssignments: readonly CrossRoleLaneAssignment[]
  readonly availablePrerequisiteTags: readonly string[]
}

export type ResolveCrossRoleActionFailureCode =
  | 'invalid_procedure'
  | 'lane_unassigned'
  | 'lane_understaffed'
  | 'lane_role_mismatch'
  | 'unmet_prerequisite'

export type ResolveCrossRoleActionResult =
  | {
      ok: true
      outcome: {
        actionId: CrossRoleActionId
        participatingLaneIds: readonly string[]
        matchedPrerequisiteTags: readonly string[]
      }
    }
  | {
      ok: false
      error: ResolveCrossRoleActionFailureCode
      detail: string
    }

function normalizeText(value: string | undefined | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeTagList(values: readonly string[] | undefined | null): string[] {
  return Array.from(
    new Set((values ?? []).map((value) => normalizeText(value)).filter((value) => value.length > 0))
  )
}

function normalizeRoleList(values: readonly AgentRole[] | undefined | null): AgentRole[] {
  return Array.from(new Set((values ?? []).filter((value) => normalizeText(value).length > 0)))
}

export function createCrossRoleActionProcedure(input: {
  id: string
  actionId: CrossRoleActionId
  lanes: readonly {
    laneId: string
    allowedRoles: readonly AgentRole[]
    minAgents: number
  }[]
  prerequisiteTags: readonly string[]
}): CrossRoleActionProcedureValidationResult {
  const id = normalizeText(input.id)
  if (id.length === 0) {
    return { ok: false, error: 'invalid_id' }
  }

  if (input.actionId !== 'scan') {
    return { ok: false, error: 'invalid_action_id' }
  }

  if (!Array.isArray(input.lanes) || input.lanes.length < 2) {
    return { ok: false, error: 'invalid_lanes' }
  }

  const normalizedLanes: CrossRoleActionLaneDefinition[] = []
  const laneIds = new Set<string>()
  for (const lane of input.lanes) {
    const laneId = normalizeText(lane.laneId)
    if (laneId.length === 0) {
      return { ok: false, error: 'invalid_lane_id' }
    }

    if (laneIds.has(laneId)) {
      return { ok: false, error: 'duplicate_lane_id' }
    }
    laneIds.add(laneId)

    const allowedRoles = normalizeRoleList(lane.allowedRoles)
    if (allowedRoles.length === 0) {
      return { ok: false, error: 'invalid_lane_allowed_roles' }
    }

    if (!Number.isInteger(lane.minAgents) || lane.minAgents < 1) {
      return { ok: false, error: 'invalid_lane_min_agents' }
    }

    normalizedLanes.push({
      laneId,
      allowedRoles: [...allowedRoles],
      minAgents: lane.minAgents,
    })
  }

  const prerequisiteTags = normalizeTagList(input.prerequisiteTags)
  if (prerequisiteTags.length === 0) {
    return { ok: false, error: 'empty_prerequisite_tags' }
  }

  return {
    ok: true,
    procedure: {
      id,
      actionId: input.actionId,
      lanes: normalizedLanes,
      prerequisiteTags: [...prerequisiteTags],
    },
  }
}

export function resolveCrossRoleAction(input: ResolveCrossRoleActionInput): ResolveCrossRoleActionResult {
  const validatedProcedure = createCrossRoleActionProcedure({
    id: input.procedure.id,
    actionId: input.procedure.actionId,
    lanes: input.procedure.lanes,
    prerequisiteTags: input.procedure.prerequisiteTags,
  })
  if (!validatedProcedure.ok) {
    return {
      ok: false,
      error: 'invalid_procedure',
      detail: validatedProcedure.error,
    }
  }

  const assignmentByLane = new Map(
    input.laneAssignments.map((lane) => [normalizeText(lane.laneId), [...(lane.agentRoles ?? [])]])
  )

  for (const lane of validatedProcedure.procedure.lanes) {
    const assignedRoles = assignmentByLane.get(lane.laneId)
    if (!assignedRoles || assignedRoles.length === 0) {
      return {
        ok: false,
        error: 'lane_unassigned',
        detail: lane.laneId,
      }
    }

    if (assignedRoles.length < lane.minAgents) {
      return {
        ok: false,
        error: 'lane_understaffed',
        detail: lane.laneId,
      }
    }

    const allowedRoles = new Set(lane.allowedRoles)
    const hasMismatch = assignedRoles.some((role) => !allowedRoles.has(role))
    if (hasMismatch) {
      return {
        ok: false,
        error: 'lane_role_mismatch',
        detail: lane.laneId,
      }
    }
  }

  const availableTags = new Set(normalizeTagList(input.availablePrerequisiteTags))
  const missingTag = validatedProcedure.procedure.prerequisiteTags.find((tag) => !availableTags.has(tag))
  if (missingTag) {
    return {
      ok: false,
      error: 'unmet_prerequisite',
      detail: missingTag,
    }
  }

  return {
    ok: true,
    outcome: {
      actionId: validatedProcedure.procedure.actionId,
      participatingLaneIds: validatedProcedure.procedure.lanes.map((lane) => lane.laneId),
      matchedPrerequisiteTags: [...validatedProcedure.procedure.prerequisiteTags],
    },
  }
}
