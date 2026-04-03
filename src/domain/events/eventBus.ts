import { SCHEMA_VERSION } from './eventMigration'
import type { GameState } from '../models'
import {
  appendAgentEventLogs,
  reconcileAgentHistoryTimelineWithEvents,
} from '../agent/lifecycle'
import { getTeamMemberIds as getCanonicalTeamMemberIds } from '../teamSimulation'
import {
  type OperationEvent,
  type OperationEventPayloadMap,
  type OperationEventSourceSystemFor,
  type OperationEventType,
} from './types'

const EVENT_CLOCK_START_MS = Date.UTC(2042, 0, 1, 0, 0, 0)
const EVENT_WEEK_MS = 7 * 24 * 60 * 60 * 1000

export type OperationEventDraft<TType extends OperationEventType = OperationEventType> = {
  type: TType
  sourceSystem: OperationEventSourceSystemFor<TType>
  payload: OperationEventPayloadMap[TType]
}

export type AnyOperationEventDraft = {
  [TType in OperationEventType]: OperationEventDraft<TType>
}[OperationEventType]

export function buildOperationEventTimestamp(week: number, sequence: number) {
  const safeWeek = Math.max(week - 1, 0)
  return new Date(EVENT_CLOCK_START_MS + safeWeek * EVENT_WEEK_MS + sequence).toISOString()
}

export function createOperationEvent<TType extends OperationEventType>(
  sequence: number,
  draft: OperationEventDraft<TType>
): OperationEvent<TType> {
  const eventWeek = typeof draft.payload.week === 'number' ? draft.payload.week : 0
  return Object.freeze({
    id: `evt-${String(sequence).padStart(6, '0')}`,
    schemaVersion: SCHEMA_VERSION,
    type: draft.type,
    sourceSystem: draft.sourceSystem,
    payload: draft.payload,
    timestamp: buildOperationEventTimestamp(eventWeek, sequence),
  }) as unknown as OperationEvent<TType>
}

function getTeamMemberIds(state: GameState, teamId: string) {
  const team = state.teams[teamId]
  if (!team) {
    return []
  }

  return [...new Set(getCanonicalTeamMemberIds(team))]
}

function getAffectedAgentIds(state: GameState, event: OperationEvent) {
  switch (event.type) {
    case 'assignment.team_assigned':
    case 'assignment.team_unassigned':
      return getTeamMemberIds(state, event.payload.teamId)
    case 'case.resolved':
    case 'case.partially_resolved':
    case 'case.failed':
      return [
        ...new Set((event.payload.teamIds ?? []).flatMap((teamId) => getTeamMemberIds(state, teamId))),
      ]
    case 'agent.training_started':
    case 'agent.training_completed':
      case 'agent.instructor_assigned':
      case 'agent.instructor_unassigned':
    case 'agent.injured':
    case 'agent.promoted':
    case 'agent.hired':
    case 'progression.xp_gained':
      return [event.payload.agentId]
    case 'agent.betrayed':
      return [event.payload.betrayerId, event.payload.betrayedId]
    case 'agent.resigned':
      return [event.payload.agentId]
    default:
      return []
  }
}

function appendAgentLogsFromEvents(
  state: GameState,
  events: readonly OperationEvent[]
): GameState {
  if (events.length === 0) {
    return state
  }

  const nextAgents = { ...state.agents }

  for (const event of events) {
    const affectedAgentIds = getAffectedAgentIds(state, event)

    for (const agentId of affectedAgentIds) {
      const agent = nextAgents[agentId]
      if (!agent) {
        continue
      }

      nextAgents[agentId] = reconcileAgentHistoryTimelineWithEvents(
        appendAgentEventLogs(agent, [event]),
        [event]
      )
    }
  }

  return {
    ...state,
    agents: nextAgents,
  }
}

export function appendOperationEventDrafts(
  state: GameState,
  drafts: AnyOperationEventDraft[]
): GameState {
  if (drafts.length === 0) {
    return state
  }

  const events = [...state.events]
  const createdEvents: OperationEvent[] = []

  for (const draft of drafts) {
    const createdEvent = createOperationEvent(events.length + 1, draft)
    events.push(createdEvent)
    createdEvents.push(createdEvent)
  }

  return appendAgentLogsFromEvents({
    ...state,
    events,
  }, createdEvents)
}

/**
 * Assignment event factories
 */

export function createAssignmentTeamAssignedDraft(payload: OperationEventPayloadMap['assignment.team_assigned']): OperationEventDraft<'assignment.team_assigned'> {
  return {
    type: 'assignment.team_assigned',
    sourceSystem: 'assignment',
    payload,
  }
}

export function createAssignmentTeamUnassignedDraft(payload: OperationEventPayloadMap['assignment.team_unassigned']): OperationEventDraft<'assignment.team_unassigned'> {
  return {
    type: 'assignment.team_unassigned',
    sourceSystem: 'assignment',
    payload,
  }
}

/**
 * Agent event factories
 */

export function createAgentHiredDraft(payload: OperationEventPayloadMap['agent.hired']): OperationEventDraft<'agent.hired'> {
  return {
    type: 'agent.hired',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentTrainingStartedDraft(payload: OperationEventPayloadMap['agent.training_started']): OperationEventDraft<'agent.training_started'> {
  return {
    type: 'agent.training_started',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentTrainingCompletedDraft(payload: OperationEventPayloadMap['agent.training_completed']): OperationEventDraft<'agent.training_completed'> {
  return {
    type: 'agent.training_completed',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentTrainingCancelledDraft(payload: OperationEventPayloadMap['agent.training_cancelled']): OperationEventDraft<'agent.training_cancelled'> {
  return {
    type: 'agent.training_cancelled',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentRelationshipChangedDraft(payload: OperationEventPayloadMap['agent.relationship_changed']): OperationEventDraft<'agent.relationship_changed'> {
  return {
    type: 'agent.relationship_changed',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentInstructorAssignedDraft(payload: OperationEventPayloadMap['agent.instructor_assigned']): OperationEventDraft<'agent.instructor_assigned'> {
  return {
    type: 'agent.instructor_assigned',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentInstructorUnassignedDraft(payload: OperationEventPayloadMap['agent.instructor_unassigned']): OperationEventDraft<'agent.instructor_unassigned'> {
  return {
    type: 'agent.instructor_unassigned',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentInjuredDraft(payload: OperationEventPayloadMap['agent.injured']): OperationEventDraft<'agent.injured'> {
  return {
    type: 'agent.injured',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentBetrayedDraft(payload: OperationEventPayloadMap['agent.betrayed']): OperationEventDraft<'agent.betrayed'> {
  return {
    type: 'agent.betrayed',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentResignedDraft(payload: OperationEventPayloadMap['agent.resigned']): OperationEventDraft<'agent.resigned'> {
  return {
    type: 'agent.resigned',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentPromotedDraft(payload: OperationEventPayloadMap['agent.promoted']): OperationEventDraft<'agent.promoted'> {
  return {
    type: 'agent.promoted',
    sourceSystem: 'agent',
    payload,
  }
}

/**
 * Progression event factories
 */

export function createProgressionXpGainedDraft(payload: OperationEventPayloadMap['progression.xp_gained']): OperationEventDraft<'progression.xp_gained'> {
  return {
    type: 'progression.xp_gained',
    sourceSystem: 'agent',
    payload,
  }
}

/**
 * Production event factories
 */

export function createProductionQueueStartedDraft(payload: OperationEventPayloadMap['production.queue_started']): OperationEventDraft<'production.queue_started'> {
  return {
    type: 'production.queue_started',
    sourceSystem: 'production',
    payload,
  }
}

export function createProductionQueueCompletedDraft(payload: OperationEventPayloadMap['production.queue_completed']): OperationEventDraft<'production.queue_completed'> {
  return {
    type: 'production.queue_completed',
    sourceSystem: 'production',
    payload,
  }
}

export function createMarketShiftedDraft(payload: OperationEventPayloadMap['market.shifted']): OperationEventDraft<'market.shifted'> {
  return {
    type: 'market.shifted',
    sourceSystem: 'production',
    payload,
  }
}

export function createMarketTransactionRecordedDraft(
  payload: OperationEventPayloadMap['market.transaction_recorded']
): OperationEventDraft<'market.transaction_recorded'> {
  return {
    type: 'market.transaction_recorded',
    sourceSystem: 'production',
    payload,
  }
}

/**
 * Faction event factories
 */

export function createFactionStandingChangedDraft(payload: OperationEventPayloadMap['faction.standing_changed']): OperationEventDraft<'faction.standing_changed'> {
  return {
    type: 'faction.standing_changed',
    sourceSystem: 'faction',
    payload,
  }
}

export function createSystemAcademyUpgradedDraft(payload: OperationEventPayloadMap['system.academy_upgraded']): OperationEventDraft<'system.academy_upgraded'> {
  return {
    type: 'system.academy_upgraded',
    sourceSystem: 'system',
    payload,
  }
}
