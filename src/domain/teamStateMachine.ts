import { type CaseStatus, type Id, type TeamState, type TeamStatus } from './models'

export type TeamStateEvent =
  | 'case_assigned'
  | 'case_resolution_started'
  | 'resolution_paused'
  | 'case_released'
  | 'recovery_started'
  | 'recovery_completed'

export interface TeamStateContext {
  currentState?: TeamState
  assignedCaseId: Id | null
  caseStatus?: CaseStatus
  weeksRemaining?: number
  readiness: number
  memberCount: number
}

export const TEAM_RECOVERY_READINESS_THRESHOLD = 45

export const TEAM_STATE_TRANSITIONS: Record<
  TeamState,
  Partial<Record<TeamStateEvent, TeamState>>
> = {
  ready: {
    case_assigned: 'deployed',
    recovery_started: 'recovering',
  },
  deployed: {
    case_resolution_started: 'resolving',
    case_released: 'ready',
    recovery_started: 'recovering',
  },
  resolving: {
    resolution_paused: 'deployed',
    case_released: 'ready',
    recovery_started: 'recovering',
  },
  recovering: {
    case_assigned: 'deployed',
    recovery_completed: 'ready',
  },
}

export function transitionTeamState(state: TeamState, event: TeamStateEvent): TeamState {
  return TEAM_STATE_TRANSITIONS[state][event] ?? state
}

export function deriveTargetTeamState({
  assignedCaseId,
  caseStatus,
  weeksRemaining,
  readiness,
  memberCount,
}: Omit<TeamStateContext, 'currentState'>): TeamState {
  if (assignedCaseId) {
    if (caseStatus === 'in_progress' && weeksRemaining !== undefined) {
      return 'resolving'
    }

    return 'deployed'
  }

  if (memberCount > 0 && readiness < TEAM_RECOVERY_READINESS_THRESHOLD) {
    return 'recovering'
  }

  return 'ready'
}

export function getTeamStateEventSequence(
  currentState: TeamState,
  targetState: TeamState
): TeamStateEvent[] {
  if (currentState === targetState) {
    return []
  }

  if (targetState === 'resolving') {
    if (currentState === 'ready' || currentState === 'recovering') {
      return ['case_assigned', 'case_resolution_started']
    }

    if (currentState === 'deployed') {
      return ['case_resolution_started']
    }
  }

  if (targetState === 'deployed') {
    if (currentState === 'ready' || currentState === 'recovering') {
      return ['case_assigned']
    }

    if (currentState === 'resolving') {
      return ['resolution_paused']
    }
  }

  if (targetState === 'recovering') {
    if (currentState === 'ready' || currentState === 'deployed' || currentState === 'resolving') {
      return ['recovery_started']
    }
  }

  if (targetState === 'ready') {
    if (currentState === 'recovering') {
      return ['recovery_completed']
    }

    if (currentState === 'deployed' || currentState === 'resolving') {
      return ['case_released']
    }
  }

  return []
}

export function resolveTeamStatus(context: TeamStateContext): TeamStatus {
  const currentState = context.currentState ?? (context.assignedCaseId ? 'deployed' : 'ready')
  const targetState = deriveTargetTeamState(context)
  const events = getTeamStateEventSequence(currentState, targetState)
  const state = events.reduce(transitionTeamState, currentState)

  return {
    state,
    assignedCaseId: context.assignedCaseId,
  }
}

export function createDefaultTeamState(assignedCaseId: Id | null = null): TeamState {
  return assignedCaseId ? 'deployed' : 'ready'
}
