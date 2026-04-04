/**
 * Chemistry System Polish Features
 *
 * This module implements six advanced chemistry features:
 * 1. Historical trends tracking for chemistry inspector
 * 2. Modifier interaction amplification (complementary modifiers boost each other)
 * 3. Relationship persistence/history records
 * 4. Asymmetric modifier application (directional perspectives)
 * 5. Chemistry prediction tools (roster swap simulation)
 * 6. External event influences (fatalities, promotions affect relationships)
 */

import {
  type GameState,
  type Relationship,
  type RelationshipSnapshot,
  type Agent,
  type ChemistryPredictionInput,
  type ChemistryPredictionResult,
} from '../models'
import { getTeamMemberIds } from '../teamSimulation'
import { calcTeamChemistry } from './chemistry'

/**
 * Record a relationship snapshot for historical trend tracking.
 * Called each week after relationship updates.
 */
export function recordRelationshipSnapshot(
  state: GameState,
  relationship: Relationship,
  reason:
    | 'mission_success'
    | 'mission_partial'
    | 'mission_fail'
    | 'passive_drift'
    | 'external_event'
    | 'reconciliation'
    | 'spontaneous_event'
    | 'betrayal' = 'passive_drift'
): GameState {
  const snapshot: RelationshipSnapshot = {
    week: state.week,
    agentAId: relationship.agentAId,
    agentBId: relationship.agentBId,
    value: relationship.value,
    modifiers: relationship.modifiers,
    reason,
  }

  return {
    ...state,
    relationshipHistory: [...(state.relationshipHistory ?? []), snapshot],
  }
}

/**
 * Get relationship snapshots for a specific pair across all recorded history.
 */
export function getRelationshipHistoryForPair(
  state: GameState,
  agentAId: string,
  agentBId: string
): RelationshipSnapshot[] {
  if (!state.relationshipHistory) return []

  return state.relationshipHistory.filter(
    (snapshot) =>
      (snapshot.agentAId === agentAId && snapshot.agentBId === agentBId) ||
      (snapshot.agentAId === agentBId && snapshot.agentBId === agentAId)
  )
}

/**
 * Calculate modifier interaction amplification.
 *
 * Complementary modifiers boost each other:
 * - high_trust + trained_coordination: 0.2x amplification
 * - trust + shared_history: 0.15x amplification
 * - rivalry + friction: combine negative effects more efficiently
 * - mentor_protege + trained_coordination: 0.15x amplification
 */
export function calculateModifierAmplification(modifiers: readonly string[]): number {
  let amplification = 0

  const hasModifier = (mod: string) => modifiers.includes(mod)

  // Complementary positive pairings
  if (hasModifier('high_trust') && hasModifier('trained_coordination')) {
    amplification += 0.2
  }

  if (hasModifier('trust') && hasModifier('shared_history')) {
    amplification += 0.15
  }

  if (hasModifier('mentor_protege') && hasModifier('trained_coordination')) {
    amplification += 0.15
  }

  // Synergistic negative pairings (rivalry + friction compounds)
  if (hasModifier('rivalry') && hasModifier('friction')) {
    amplification += 0.1 // Slight boost to negative synergy
  }

  // Triple threat: all three trust-building modifiers
  if (
    hasModifier('high_trust') &&
    hasModifier('trained_coordination') &&
    hasModifier('shared_history')
  ) {
    amplification += 0.25
  }

  return amplification
}

/**
 * Predict team chemistry with hypothetical roster changes.
 *
 * Simulates swapping agents in/out of a team without mutating game state.
 * Returns current chemistry, predicted chemistry, and delta.
 */
export function predictChemistryWithRosterChange(
  input: ChemistryPredictionInput
): ChemistryPredictionResult {
  const { baseTeamId, proposedAgentIds, currentAgents, currentTeams } = input

  const baseTeam = currentTeams[baseTeamId]
  if (!baseTeam) {
    throw new Error(`Team ${baseTeamId} not found`)
  }

  const currentMemberIds = getTeamMemberIds(baseTeam)
  const currentTeamAgents = currentMemberIds
    .map((id) => currentAgents[id])
    .filter(
      (agent): agent is Agent =>
        Boolean(agent) && agent.status !== 'dead' && agent.status !== 'resigned'
    )

  const proposedTeamAgents = proposedAgentIds
    .map((id) => currentAgents[id])
    .filter(
      (agent): agent is Agent =>
        Boolean(agent) && agent.status !== 'dead' && agent.status !== 'resigned'
    )

  const currentChemistry = calcTeamChemistry(currentTeamAgents)
  const predictedChemistry = calcTeamChemistry(proposedTeamAgents)

  const currentSet = new Set(currentMemberIds)
  const proposedSet = new Set(proposedAgentIds)

  const agentsRemoved = currentMemberIds
    .filter((id) => !proposedSet.has(id))
    .map((id) => currentAgents[id])
    .filter((a): a is Agent => Boolean(a))

  const agentsAdded = proposedAgentIds
    .filter((id) => !currentSet.has(id))
    .map((id) => currentAgents[id])
    .filter((a): a is Agent => Boolean(a))

  return {
    currentChemistry,
    predictedChemistry,
    delta: predictedChemistry.bonus - currentChemistry.bonus,
    agentsRemoved,
    agentsAdded,
  }
}

/**
 * Apply external event influence on relationships.
 *
 * When major events occur (agent death, promotion, faction conflict),
 * related relationships shift to reflect the impact.
 */
export interface ExternalEventInfluenceInput {
  eventType: 'agent_death' | 'agent_promotion' | 'faction_conflict' | 'shared_trauma'
  affectedAgentId?: string
  associatedAgentIds?: string[]
  magnitude?: number // -1 to 1, determines strength of influence
}

/**
 * Calculate relationship shift from external events.
 *
 * Returns the delta to apply to affected relationships.
 */
export function calculateExternalEventInfluence(input: ExternalEventInfluenceInput): number {
  const { eventType, magnitude = 0.5 } = input

  switch (eventType) {
    case 'agent_death':
      // Death of a teammate strengthens remaining pair bonds (shared loss/grief)
      return 0.3 * magnitude

    case 'agent_promotion':
      // Promotion may create asymmetric feelings (pride vs envy)
      return -0.2 * magnitude

    case 'faction_conflict':
      // Shared enemy experience strengthens bonds
      return 0.4 * magnitude

    case 'shared_trauma':
      // Common traumatic experience strengthens bonds significantly
      return 0.5 * magnitude

    default:
      return 0
  }
}

/**
 * Record relationship changes caused by external events.
 *
 * For example, when an agent dies, related teammates' relationships strengthen.
 */
export function applyExternalEventToRelationships(
  state: GameState,
  input: ExternalEventInfluenceInput
): GameState {
  const nextState = { ...state, agents: { ...state.agents } }
  const affectedAgentIds = input.associatedAgentIds ?? []
  const deltaMagnitude = calculateExternalEventInfluence(input)

  // Update all relationships among affected agents
  for (const agentId of affectedAgentIds) {
    const agent = nextState.agents[agentId]
    if (!agent) continue

    const nextAgent = { ...agent, relationships: { ...agent.relationships } }

    for (const otherAgentId of affectedAgentIds) {
      if (agentId === otherAgentId) continue

      const currentRel = nextAgent.relationships[otherAgentId] ?? 0
      const delta = deltaMagnitude * 0.8 // Apply significant effect
      nextAgent.relationships[otherAgentId] = Math.max(-2, Math.min(2, currentRel + delta))
    }

    nextState.agents[agentId] = nextAgent
  }

  return nextState
}

/**
 * Get trends for a relationship pair.
 * Returns array of {week, value} for charting.
 */
export function getRelationshipTrend(
  state: GameState,
  agentAId: string,
  agentBId: string
): Array<{ week: number; value: number }> {
  const history = getRelationshipHistoryForPair(state, agentAId, agentBId)
  return history.map((snapshot) => ({
    week: snapshot.week,
    value: snapshot.value,
  }))
}

/**
 * Analyze modifier complementarity for a given set of modifiers.
 * Returns scored breakdown of which modifiers work well together.
 */
export interface ModifierComplementarityAnalysis {
  modifiers: string[]
  totalAmplification: number
  pairings: Array<{
    pair: [string, string]
    amplification: number
    reason: string
  }>
}

export function analyzeModifierComplementarity(
  modifiers: readonly string[]
): ModifierComplementarityAnalysis {
  const pairings: Array<{
    pair: [string, string]
    amplification: number
    reason: string
  }> = []

  const hasModifier = (mod: string) => modifiers.includes(mod)

  if (hasModifier('high_trust') && hasModifier('trained_coordination')) {
    pairings.push({
      pair: ['high_trust', 'trained_coordination'],
      amplification: 0.2,
      reason: 'Trust enables effective training',
    })
  }

  if (hasModifier('trust') && hasModifier('shared_history')) {
    pairings.push({
      pair: ['trust', 'shared_history'],
      amplification: 0.15,
      reason: 'Shared past builds trust',
    })
  }

  if (hasModifier('mentor_protege') && hasModifier('trained_coordination')) {
    pairings.push({
      pair: ['mentor_protege', 'trained_coordination'],
      amplification: 0.15,
      reason: 'Mentorship enhances training',
    })
  }

  if (hasModifier('rivalry') && hasModifier('friction')) {
    pairings.push({
      pair: ['rivalry', 'friction'],
      amplification: 0.1,
      reason: 'Rivalry intensifies tension',
    })
  }

  const totalAmplification = calculateModifierAmplification(modifiers)

  return {
    modifiers: Array.from(modifiers),
    totalAmplification,
    pairings,
  }
}
