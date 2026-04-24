import { SCHEMA_VERSION } from './eventMigration'
import type { GameState } from '../models'
import { appendAgentEventLogs, reconcileAgentHistoryTimelineWithEvents } from '../agent/lifecycle'
import { getTeamMemberIds as getCanonicalTeamMemberIds } from '../teamSimulation'
import {
  type OperationEvent,
  type OperationEventPayloadMap,
  type OperationEventSourceSystemFor,
  type OperationEventType,
} from './types'

const EVENT_CLOCK_START_MS = Date.UTC(2042, 0, 1, 0, 0, 0)
const EVENT_WEEK_MS = 7 * 24 * 60 * 60 * 1000
const EMPTY_FACTION_HISTORY = Object.freeze({
  missionsCompleted: 0,
  missionsFailed: 0,
  successRate: 0,
  interactionLog: [] as GameState['factions'] extends Record<string, infer TFaction>
    ? TFaction extends { history?: infer THistory }
      ? THistory extends { interactionLog: infer TInteractionLog }
        ? TInteractionLog
        : never
      : never
    : never,
})

type RuntimeFaction = NonNullable<GameState['factions']>[string]

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

function getFactionHistory(faction: RuntimeFaction) {
  return faction.history ?? EMPTY_FACTION_HISTORY
}

function getFactionContacts(faction: RuntimeFaction) {
  return faction.contacts ?? []
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
        ...new Set(
          (event.payload.teamIds ?? []).flatMap((teamId) => getTeamMemberIds(state, teamId))
        ),
      ]
    case 'agent.training_started':
    case 'agent.training_completed':
    case 'agent.relationship_changed':
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

function appendAgentLogsFromEvents(state: GameState, events: readonly OperationEvent[]): GameState {
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

function appendFactionLogsFromEvents(state: GameState, events: readonly OperationEvent[]): GameState {
  if (events.length === 0 || Object.keys(state.factions ?? {}).length === 0) {
    return state
  }

  const nextFactions: NonNullable<GameState['factions']> = { ...(state.factions ?? {}) }

  for (const event of events) {
    if (event.type === 'faction.standing_changed') {
      const faction = nextFactions[event.payload.factionId]
      if (!faction) {
        continue
      }

      const eventRef = {
        eventId: event.id,
        type: event.type,
        week: event.payload.week,
      }
      const history = getFactionHistory(faction)
      const contacts = getFactionContacts(faction)
      const missionsCompleted =
        event.payload.reason === 'case.resolved'
          ? history.missionsCompleted + 1
          : history.missionsCompleted
      const missionsFailed =
        event.payload.reason === 'case.failed' || event.payload.reason === 'case.escalated'
          ? history.missionsFailed + 1
          : history.missionsFailed
      const totalMissions = missionsCompleted + missionsFailed

      nextFactions[event.payload.factionId] = {
        ...faction,
        reputation:
          typeof event.payload.reputationAfter === 'number'
            ? event.payload.reputationAfter
            : Math.max(
                -100,
                Math.min(100, (typeof faction.reputation === 'number' ? faction.reputation : 0) + event.payload.delta)
              ),
        history: {
          ...history,
          missionsCompleted,
          missionsFailed,
          successRate: totalMissions > 0 ? (missionsCompleted / totalMissions) * 100 : 0,
          interactionLog: [...history.interactionLog, eventRef],
        },
        contacts: contacts.map((contact) =>
          contact.id === event.payload.contactId
            ? {
                ...contact,
                relationship:
                  typeof event.payload.contactRelationshipAfter === 'number'
                    ? event.payload.contactRelationshipAfter
                    : Math.max(
                        -100,
                        Math.min(100, contact.relationship + (event.payload.contactDelta ?? 0))
                      ),
                status:
                  typeof event.payload.contactRelationshipAfter === 'number'
                    ? event.payload.contactRelationshipAfter <= -40
                      ? 'hostile'
                      : event.payload.contactRelationshipAfter >= 15
                        ? 'active'
                        : contact.status
                    : contact.status,
                history: {
                  interactions: [...contact.history.interactions, eventRef],
                },
              }
            : contact
        ),
      }
      continue
    }

    if (
      (event.type === 'recruitment.scouting_initiated' ||
        event.type === 'recruitment.scouting_refined' ||
        event.type === 'recruitment.intel_confirmed') &&
      event.payload.sourceFactionId
    ) {
      const faction = nextFactions[event.payload.sourceFactionId]
      if (!faction) {
        continue
      }

      const eventRef = {
        eventId: event.id,
        type: event.type,
        week: event.payload.week,
      }
      const history = getFactionHistory(faction)
      const contacts = getFactionContacts(faction)

      nextFactions[event.payload.sourceFactionId] = {
        ...faction,
        history: {
          ...history,
          interactionLog: [...history.interactionLog, eventRef],
        },
        contacts: contacts.map((contact) =>
          contact.id === event.payload.sourceContactId
            ? {
                ...contact,
                history: {
                  interactions: [...contact.history.interactions, eventRef],
                },
              }
            : contact
        ),
      }
      continue
    }

    if (event.type === 'agent.hired' && event.payload.sourceFactionId) {
      const faction = nextFactions[event.payload.sourceFactionId]
      if (!faction) {
        continue
      }

      const eventRef = {
        eventId: event.id,
        type: event.type,
        week: event.payload.week,
      }
      const history = getFactionHistory(faction)
      const contacts = getFactionContacts(faction)

      nextFactions[event.payload.sourceFactionId] = {
        ...faction,
        history: {
          ...history,
          interactionLog: [...history.interactionLog, eventRef],
        },
        contacts: contacts.map((contact) =>
          contact.id === event.payload.sourceContactId
            ? {
                ...contact,
                history: {
                  interactions: [...contact.history.interactions, eventRef],
                },
              }
            : contact
        ),
      }
      continue
    }

    if (event.type === 'faction.unlock_available') {
      const faction = nextFactions[event.payload.factionId]
      if (!faction) {
        continue
      }

      const eventRef = {
        eventId: event.id,
        type: event.type,
        week: event.payload.week,
      }
      const history = getFactionHistory(faction)
      const contacts = getFactionContacts(faction)

      nextFactions[event.payload.factionId] = {
        ...faction,
        history: {
          ...history,
          interactionLog: [...history.interactionLog, eventRef],
        },
        contacts: contacts.map((contact) =>
          contact.id === event.payload.contactId
            ? {
                ...contact,
                history: {
                  interactions: [...contact.history.interactions, eventRef],
                },
              }
            : contact
        ),
      }
    }
  }

  return {
    ...state,
    factions: nextFactions,
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

  return appendFactionLogsFromEvents(
    appendAgentLogsFromEvents(
      {
        ...state,
        events,
      },
      createdEvents
    ),
    createdEvents
  )
}

/**
 * Assignment event factories
 */

export function createAssignmentTeamAssignedDraft(
  payload: OperationEventPayloadMap['assignment.team_assigned']
): OperationEventDraft<'assignment.team_assigned'> {
  return {
    type: 'assignment.team_assigned',
    sourceSystem: 'assignment',
    payload,
  }
}

export function createAssignmentTeamUnassignedDraft(
  payload: OperationEventPayloadMap['assignment.team_unassigned']
): OperationEventDraft<'assignment.team_unassigned'> {
  return {
    type: 'assignment.team_unassigned',
    sourceSystem: 'assignment',
    payload,
  }
}

/**
 * Agent event factories
 */

export function createAgentHiredDraft(
  payload: OperationEventPayloadMap['agent.hired']
): OperationEventDraft<'agent.hired'> {
  return {
    type: 'agent.hired',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentTrainingStartedDraft(
  payload: OperationEventPayloadMap['agent.training_started']
): OperationEventDraft<'agent.training_started'> {
  return {
    type: 'agent.training_started',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentTrainingCompletedDraft(
  payload: OperationEventPayloadMap['agent.training_completed']
): OperationEventDraft<'agent.training_completed'> {
  return {
    type: 'agent.training_completed',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentTrainingCancelledDraft(
  payload: OperationEventPayloadMap['agent.training_cancelled']
): OperationEventDraft<'agent.training_cancelled'> {
  return {
    type: 'agent.training_cancelled',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentRelationshipChangedDraft(
  payload: OperationEventPayloadMap['agent.relationship_changed']
): OperationEventDraft<'agent.relationship_changed'> {
  return {
    type: 'agent.relationship_changed',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentInstructorAssignedDraft(
  payload: OperationEventPayloadMap['agent.instructor_assigned']
): OperationEventDraft<'agent.instructor_assigned'> {
  return {
    type: 'agent.instructor_assigned',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentInstructorUnassignedDraft(
  payload: OperationEventPayloadMap['agent.instructor_unassigned']
): OperationEventDraft<'agent.instructor_unassigned'> {
  return {
    type: 'agent.instructor_unassigned',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentInjuredDraft(
  payload: OperationEventPayloadMap['agent.injured']
): OperationEventDraft<'agent.injured'> {
  return {
    type: 'agent.injured',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentKilledDraft(
  payload: OperationEventPayloadMap['agent.killed']
): OperationEventDraft<'agent.killed'> {
  return {
    type: 'agent.killed',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentBetrayedDraft(
  payload: OperationEventPayloadMap['agent.betrayed']
): OperationEventDraft<'agent.betrayed'> {
  return {
    type: 'agent.betrayed',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentResignedDraft(
  payload: OperationEventPayloadMap['agent.resigned']
): OperationEventDraft<'agent.resigned'> {
  return {
    type: 'agent.resigned',
    sourceSystem: 'agent',
    payload,
  }
}

export function createAgentPromotedDraft(
  payload: OperationEventPayloadMap['agent.promoted']
): OperationEventDraft<'agent.promoted'> {
  return {
    type: 'agent.promoted',
    sourceSystem: 'agent',
    payload,
  }
}

/**
 * Recruitment intel event factories
 */

export function createRecruitmentScoutingInitiatedDraft(
  payload: OperationEventPayloadMap['recruitment.scouting_initiated']
): OperationEventDraft<'recruitment.scouting_initiated'> {
  return {
    type: 'recruitment.scouting_initiated',
    sourceSystem: 'intel',
    payload,
  }
}

export function createRecruitmentScoutingRefinedDraft(
  payload: OperationEventPayloadMap['recruitment.scouting_refined']
): OperationEventDraft<'recruitment.scouting_refined'> {
  return {
    type: 'recruitment.scouting_refined',
    sourceSystem: 'intel',
    payload,
  }
}

export function createRecruitmentIntelConfirmedDraft(
  payload: OperationEventPayloadMap['recruitment.intel_confirmed']
): OperationEventDraft<'recruitment.intel_confirmed'> {
  return {
    type: 'recruitment.intel_confirmed',
    sourceSystem: 'intel',
    payload,
  }
}

/**
 * Progression event factories
 */

export function createProgressionXpGainedDraft(
  payload: OperationEventPayloadMap['progression.xp_gained']
): OperationEventDraft<'progression.xp_gained'> {
  return {
    type: 'progression.xp_gained',
    sourceSystem: 'agent',
    payload,
  }
}

/**
 * Production event factories
 */

export function createProductionQueueStartedDraft(
  payload: OperationEventPayloadMap['production.queue_started']
): OperationEventDraft<'production.queue_started'> {
  return {
    type: 'production.queue_started',
    sourceSystem: 'production',
    payload,
  }
}

export function createProductionQueueCompletedDraft(
  payload: OperationEventPayloadMap['production.queue_completed']
): OperationEventDraft<'production.queue_completed'> {
  return {
    type: 'production.queue_completed',
    sourceSystem: 'production',
    payload,
  }
}

export function createMarketShiftedDraft(
  payload: OperationEventPayloadMap['market.shifted']
): OperationEventDraft<'market.shifted'> {
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

export function createFactionStandingChangedDraft(
  payload: OperationEventPayloadMap['faction.standing_changed']
): OperationEventDraft<'faction.standing_changed'> {
  return {
    type: 'faction.standing_changed',
    sourceSystem: 'faction',
    payload,
  }
}

export function createFactionUnlockAvailableDraft(
  payload: OperationEventPayloadMap['faction.unlock_available']
): OperationEventDraft<'faction.unlock_available'> {
  return {
    type: 'faction.unlock_available',
    sourceSystem: 'faction',
    payload,
  }
}

export function createSystemAcademyUpgradedDraft(
  payload: OperationEventPayloadMap['system.academy_upgraded']
): OperationEventDraft<'system.academy_upgraded'> {
  return {
    type: 'system.academy_upgraded',
    sourceSystem: 'system',
    payload,
  }
}
