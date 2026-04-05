import { appendOperationEventDrafts, createAgentRelationshipChangedDraft } from '../events'
import { appendAgentHistoryEntry, createAgentHistoryEntry } from '../agent/lifecycle'
import { clamp } from '../math'
import { ensureNormalizedGameState, normalizeGameState } from '../teamSimulation'
import type { GameState, Id } from '../models'
import { recoverTrustDamageForPair } from './betrayal'

export const RECONCILIATION_COST = 12
export const RECONCILIATION_DELTA_NEGATIVE = 0.45
export const RECONCILIATION_DELTA_NON_NEGATIVE = 0.15

function toPairKey(leftId: Id, rightId: Id) {
  return [leftId, rightId].sort().join('::')
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100
}

function getReconciliationDelta(previous: number) {
  return previous < 0 ? RECONCILIATION_DELTA_NEGATIVE : RECONCILIATION_DELTA_NON_NEGATIVE
}

function canReconcileAgent(agent: GameState['agents'][string] | undefined) {
  if (!agent) {
    return false
  }

  return (
    (agent.status === 'active' || agent.status === 'recovering') &&
    agent.assignment?.state !== 'assigned'
  )
}

export function hasPairReconciledThisWeek(state: GameState, leftId: Id, rightId: Id) {
  const pairKey = toPairKey(leftId, rightId)

  return state.events.some((event) => {
    if (event.type !== 'agent.relationship_changed') {
      return false
    }

    if (event.payload.week !== state.week || event.payload.reason !== 'reconciliation') {
      return false
    }

    return toPairKey(event.payload.agentId, event.payload.counterpartId) === pairKey
  })
}

export function reconcileAgents(state: GameState, leftId: Id, rightId: Id): GameState {
  if (leftId === rightId) {
    return ensureNormalizedGameState(state)
  }

  const leftAgent = state.agents[leftId]
  const rightAgent = state.agents[rightId]

  if (!canReconcileAgent(leftAgent) || !canReconcileAgent(rightAgent)) {
    return ensureNormalizedGameState(state)
  }

  if (hasPairReconciledThisWeek(state, leftId, rightId)) {
    return ensureNormalizedGameState(state)
  }

  if (state.funding < RECONCILIATION_COST) {
    return ensureNormalizedGameState(state)
  }

  const leftPrevious = leftAgent.relationships[rightId] ?? 0
  const rightPrevious = rightAgent.relationships[leftId] ?? 0

  const leftNext = roundToTwo(clamp(leftPrevious + getReconciliationDelta(leftPrevious), -2, 2))
  const rightNext = roundToTwo(clamp(rightPrevious + getReconciliationDelta(rightPrevious), -2, 2))

  if (leftNext === leftPrevious && rightNext === rightPrevious) {
    return ensureNormalizedGameState(state)
  }

  const nextState = normalizeGameState({
    ...state,
    funding: state.funding - RECONCILIATION_COST,
    agents: recoverTrustDamageForPair(
      {
        ...state.agents,
        [leftId]: appendAgentHistoryEntry(
          {
            ...leftAgent,
            relationships: {
              ...leftAgent.relationships,
              [rightId]: leftNext,
            },
          },
          createAgentHistoryEntry(
            state.week,
            'simulation.weekly_tick',
            `Reconciliation session with ${rightAgent.name}.`
          )
        ),
        [rightId]: appendAgentHistoryEntry(
          {
            ...rightAgent,
            relationships: {
              ...rightAgent.relationships,
              [leftId]: rightNext,
            },
          },
          createAgentHistoryEntry(
            state.week,
            'simulation.weekly_tick',
            `Reconciliation session with ${leftAgent.name}.`
          )
        ),
      },
      leftId,
      rightId
    ),
  })

  return appendOperationEventDrafts(nextState, [
    createAgentRelationshipChangedDraft({
      week: nextState.week,
      agentId: leftId,
      agentName: leftAgent.name,
      counterpartId: rightId,
      counterpartName: rightAgent.name,
      previousValue: leftPrevious,
      nextValue: leftNext,
      delta: roundToTwo(leftNext - leftPrevious),
      reason: 'reconciliation',
    }),
    createAgentRelationshipChangedDraft({
      week: nextState.week,
      agentId: rightId,
      agentName: rightAgent.name,
      counterpartId: leftId,
      counterpartName: leftAgent.name,
      previousValue: rightPrevious,
      nextValue: rightNext,
      delta: roundToTwo(rightNext - rightPrevious),
      reason: 'reconciliation',
    }),
  ])
}
