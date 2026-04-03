import { clamp } from '../math'
import type { AnyOperationEventDraft } from '../events'
import type { GameState } from '../models'
import { getTeamMemberIds } from '../teamSimulation'
import { recordRelationshipSnapshot } from './chemistryPolish'
import { deriveRelationshipState, deriveRelationshipStability } from './relationshipProjection'

export const SPONTANEOUS_CHEMISTRY_EVENT_CHANCE = 0.2
export const SPONTANEOUS_CHEMISTRY_BONDING_DELTA = 0.12
export const SPONTANEOUS_CHEMISTRY_FRICTION_DELTA = -0.1

interface SpontaneousChemistryOptions {
  rng: () => number
  week: number
  activeTeamIds?: Set<string>
  eventChance?: number
}

interface SpontaneousChemistryResult {
  state: GameState
  eventDrafts: AnyOperationEventDraft[]
  applied: boolean
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100
}


function getOffMissionAgentIds(state: GameState, activeTeamIds: Set<string>) {
  const teamByAgentId = new Map<string, string>()

  for (const team of Object.values(state.teams)) {
    for (const agentId of getTeamMemberIds(team)) {
      teamByAgentId.set(agentId, team.id)
    }
  }

  return Object.values(state.agents)
    .filter((agent) => agent.status === 'active')
    .filter((agent) => agent.assignment?.state !== 'assigned' && agent.assignment?.state !== 'training')
    .filter((agent) => {
      const teamId = teamByAgentId.get(agent.id)
      return !teamId || !activeTeamIds.has(teamId)
    })
    .map((agent) => agent.id)
}

export function applySpontaneousChemistryEvent(
  state: GameState,
  options: SpontaneousChemistryOptions
): SpontaneousChemistryResult {
  const activeTeamIds = options.activeTeamIds ?? new Set<string>()
  const eventChance = clamp(options.eventChance ?? SPONTANEOUS_CHEMISTRY_EVENT_CHANCE, 0, 1)
  const eligibleAgentIds = getOffMissionAgentIds(state, activeTeamIds)

  if (eligibleAgentIds.length < 2 || options.rng() >= eventChance) {
    return {
      state,
      eventDrafts: [],
      applied: false,
    }
  }

  const pairs: Array<{ leftId: string; rightId: string }> = []

  for (let i = 0; i < eligibleAgentIds.length; i++) {
    for (let j = i + 1; j < eligibleAgentIds.length; j++) {
      pairs.push({ leftId: eligibleAgentIds[i]!, rightId: eligibleAgentIds[j]! })
    }
  }

  if (pairs.length === 0) {
    return {
      state,
      eventDrafts: [],
      applied: false,
    }
  }

  const selectedPair = pairs[Math.floor(options.rng() * pairs.length)]!
  const leftAgent = state.agents[selectedPair.leftId]
  const rightAgent = state.agents[selectedPair.rightId]

  if (!leftAgent || !rightAgent) {
    return {
      state,
      eventDrafts: [],
      applied: false,
    }
  }

  const leftPrevious = leftAgent.relationships[selectedPair.rightId] ?? 0
  const rightPrevious = rightAgent.relationships[selectedPair.leftId] ?? 0
  const average = (leftPrevious + rightPrevious) / 2
  const averageFatigue = (leftAgent.fatigue + rightAgent.fatigue) / 2

  const bondingChance = clamp(
    0.55 + average * 0.1 - Math.max(0, averageFatigue - 40) / 200,
    0.2,
    0.8
  )
  const isBonding = options.rng() < bondingChance
  const delta = isBonding
    ? average <= -1
      ? SPONTANEOUS_CHEMISTRY_BONDING_DELTA + 0.04
      : SPONTANEOUS_CHEMISTRY_BONDING_DELTA
    : SPONTANEOUS_CHEMISTRY_FRICTION_DELTA

  const leftNext = roundToTwo(clamp(leftPrevious + delta, -2, 2))
  const rightNext = roundToTwo(clamp(rightPrevious + delta, -2, 2))

  if (leftNext === leftPrevious && rightNext === rightPrevious) {
    return {
      state,
      eventDrafts: [],
      applied: false,
    }
  }

  const nextAgents = {
    ...state.agents,
    [selectedPair.leftId]: {
      ...leftAgent,
      relationships: {
        ...leftAgent.relationships,
        [selectedPair.rightId]: leftNext,
      },
      ...(leftAgent.history
        ? {
            history: {
              ...leftAgent.history,
              bonds: {
                ...leftAgent.history.bonds,
                [selectedPair.rightId]: leftNext,
              },
            },
          }
        : {}),
    },
    [selectedPair.rightId]: {
      ...rightAgent,
      relationships: {
        ...rightAgent.relationships,
        [selectedPair.leftId]: rightNext,
      },
      ...(rightAgent.history
        ? {
            history: {
              ...rightAgent.history,
              bonds: {
                ...rightAgent.history.bonds,
                [selectedPair.leftId]: rightNext,
              },
            },
          }
        : {}),
    },
  }

  const eventDrafts: AnyOperationEventDraft[] = [
    {
      type: 'agent.relationship_changed',
      sourceSystem: 'agent',
      payload: {
        week: options.week,
        agentId: selectedPair.leftId,
        agentName: leftAgent.name,
        counterpartId: selectedPair.rightId,
        counterpartName: rightAgent.name,
        previousValue: leftPrevious,
        nextValue: leftNext,
        delta: roundToTwo(leftNext - leftPrevious),
        reason: 'spontaneous_event',
      },
    },
    {
      type: 'agent.relationship_changed',
      sourceSystem: 'agent',
      payload: {
        week: options.week,
        agentId: selectedPair.rightId,
        agentName: rightAgent.name,
        counterpartId: selectedPair.leftId,
        counterpartName: leftAgent.name,
        previousValue: rightPrevious,
        nextValue: rightNext,
        delta: roundToTwo(rightNext - rightPrevious),
        reason: 'spontaneous_event',
      },
    },
  ]

  const stateWithEvents = {
    ...state,
    agents: nextAgents,
  }

  const snapshotValue = (leftNext + rightNext) / 2
  const snapshotSeed = {
    agentAId: selectedPair.leftId,
    agentBId: selectedPair.rightId,
    value: snapshotValue,
    modifiers: [] as string[],
    state: deriveRelationshipState(snapshotValue),
    stability: deriveRelationshipStability(snapshotValue),
  }

  const nextState = recordRelationshipSnapshot(stateWithEvents, snapshotSeed, 'spontaneous_event')

  return {
    state: nextState,
    eventDrafts,
    applied: true,
  }
}
