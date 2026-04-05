import { describe, it, expect, beforeEach } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { GameState, Agent, Relationship } from '../domain/models'
import {
  recordRelationshipSnapshot,
  getRelationshipHistoryForPair,
  calculateModifierAmplification,
  predictChemistryWithRosterChange,
  applyExternalEventToRelationships,
  calculateExternalEventInfluence,
  getRelationshipTrend,
  analyzeModifierComplementarity,
} from '../domain/sim/chemistryPolish'

function makeAgent(id: string, overrides: Partial<Agent> = {}): Agent {
  const template = createStartingState().agents.a_ava

  return {
    ...template,
    id,
    name: `Agent ${id}`,
    relationships: {},
    ...overrides,
  }
}

function deriveRelationshipState(value: number): Relationship['state'] {
  if (value <= -0.5) return 'hostile'
  if (value < 0) return 'strained'
  if (value < 0.5) return 'neutral'
  if (value < 1.2) return 'friendly'
  return 'intimate'
}

function makeRelationship(
  agentAId: string,
  agentBId: string,
  value: number,
  modifiers: string[] = []
): Relationship {
  return {
    agentAId,
    agentBId,
    value,
    modifiers,
    state: deriveRelationshipState(value),
    stability: Math.max(0.3, Math.min(0.9, 0.5 + Math.max(0, value) * 0.1)),
  }
}

describe('Chemistry Polish Features', () => {
  let state: GameState
  let agents: Record<string, Agent>

  beforeEach(() => {
    state = createStartingState()
    agents = {
      'agent-a': makeAgent('agent-a'),
      'agent-b': makeAgent('agent-b'),
      'agent-c': makeAgent('agent-c'),
    }
  })

  describe('Historical Chemistry Trends', () => {
    it('should record relationship snapshots', () => {
      const relationship: Relationship = makeRelationship('agent-a', 'agent-b', 1.5, ['high_trust'])

      const stateWithSnapshot = recordRelationshipSnapshot(state, relationship, 'passive_drift')

      expect(stateWithSnapshot.relationshipHistory).toBeDefined()
      expect(stateWithSnapshot.relationshipHistory!.length).toBe(1)
      expect(stateWithSnapshot.relationshipHistory![0].agentAId).toBe('agent-a')
      expect(stateWithSnapshot.relationshipHistory![0].value).toBe(1.5)
      expect(stateWithSnapshot.relationshipHistory![0].reason).toBe('passive_drift')
    })

    it('should retrieve relationship history for a pair', () => {
      let stateWithHistory = state

      stateWithHistory = recordRelationshipSnapshot(
        stateWithHistory,
        makeRelationship('agent-a', 'agent-b', 0.5),
        'passive_drift'
      )

      stateWithHistory = recordRelationshipSnapshot(
        stateWithHistory,
        makeRelationship('agent-a', 'agent-b', 1.0),
        'passive_drift'
      )

      const history = getRelationshipHistoryForPair(stateWithHistory, 'agent-a', 'agent-b')

      expect(history).toHaveLength(2)
      expect(history[0].value).toBe(0.5)
      expect(history[1].value).toBe(1.0)
    })

    it('should get relationship trends as chart data', () => {
      let stateWithHistory = state

      for (let week = 0; week < 5; week++) {
        stateWithHistory = {
          ...stateWithHistory,
          week,
        }
        stateWithHistory = recordRelationshipSnapshot(
          stateWithHistory,
          makeRelationship('agent-a', 'agent-b', week * 0.3),
          'passive_drift'
        )
      }

      const trend = getRelationshipTrend(stateWithHistory, 'agent-a', 'agent-b')

      expect(trend).toHaveLength(5)
      expect(trend[0]).toEqual({ week: 0, value: 0 })
      expect(trend[4]).toEqual({ week: 4, value: 1.2 })
    })
  })

  describe('Modifier Interaction Amplification', () => {
    it('should recognize high_trust + trained_coordination synergy', () => {
      const modifiers = ['high_trust', 'trained_coordination']
      const amplification = calculateModifierAmplification(modifiers)

      expect(amplification).toBe(0.2)
    })

    it('should recognize trust + shared_history synergy', () => {
      const modifiers = ['trust', 'shared_history']
      const amplification = calculateModifierAmplification(modifiers)

      expect(amplification).toBe(0.15)
    })

    it('should recognize mentor_protege + trained_coordination synergy', () => {
      const modifiers = ['mentor_protege', 'trained_coordination']
      const amplification = calculateModifierAmplification(modifiers)

      expect(amplification).toBe(0.15)
    })

    it('should add amplification for triple synergy', () => {
      const modifiers = ['high_trust', 'trained_coordination', 'shared_history']
      const amplification = calculateModifierAmplification(modifiers)

      expect(amplification).toBeGreaterThan(0.2)
    })

    it('should return 0 for non-complementary modifiers', () => {
      const modifiers = ['high_trust', 'rivalry']
      const amplification = calculateModifierAmplification(modifiers)

      expect(amplification).toBe(0)
    })

    it('should analyze modifier complementarity', () => {
      const modifiers = ['high_trust', 'trained_coordination', 'shared_history']
      const analysis = analyzeModifierComplementarity(modifiers)

      expect(analysis.modifiers).toHaveLength(3)
      expect(analysis.pairings.length).toBeGreaterThan(0)
      expect(analysis.totalAmplification).toBeGreaterThan(0)
    })
  })

  describe('Chemistry Prediction Tools', () => {
    beforeEach(() => {
      agents['agent-a'] = makeAgent('agent-a', {
        baseStats: { combat: 70, investigation: 70, utility: 70, social: 70 },
      })
      agents['agent-b'] = makeAgent('agent-b', {
        baseStats: { combat: 70, investigation: 70, utility: 70, social: 70 },
      })
      agents['agent-c'] = makeAgent('agent-c', {
        baseStats: { combat: 70, investigation: 70, utility: 70, social: 70 },
      })

      agents['agent-a'].relationships = { 'agent-b': 1.0 }
      agents['agent-b'].relationships = { 'agent-a': 1.0, 'agent-c': 0.5 }
      agents['agent-c'].relationships = { 'agent-b': 0.5 }

      state = {
        ...state,
        teams: {
          'team-1': {
            ...state.teams['team-1']!,
            memberIds: ['agent-a', 'agent-b'],
          },
        },
        agents,
      }
    })

    it('should predict chemistry for roster swap', () => {
      const result = predictChemistryWithRosterChange({
        baseTeamId: 'team-1',
        proposedAgentIds: ['agent-a', 'agent-c'],
        currentAgents: agents,
        currentTeams: state.teams,
      })

      expect(result.currentChemistry.pairs).toBe(1) // A-B pair
      expect(result.predictedChemistry.pairs).toBe(1) // A-C pair
      expect(result.agentsRemoved).toHaveLength(1)
      expect(result.agentsAdded).toHaveLength(1)
    })

    it('should calculate chemistry delta', () => {
      const result = predictChemistryWithRosterChange({
        baseTeamId: 'team-1',
        proposedAgentIds: ['agent-a', 'agent-b', 'agent-c'],
        currentAgents: agents,
        currentTeams: state.teams,
      })

      expect(typeof result.delta).toBe('number')
    })
  })

  describe('External Event Influences', () => {
    it('should apply agent death influence with appropriate delta', () => {
      state = {
        ...state,
        agents: {
          'agent-a': makeAgent('agent-a', { relationships: { 'agent-b': 0.5 } }),
          'agent-b': makeAgent('agent-b', { relationships: { 'agent-a': 0.5, 'agent-c': -0.5 } }),
          'agent-c': makeAgent('agent-c', { relationships: { 'agent-a': 0.2, 'agent-b': -0.5 } }),
        },
      }

      const nextState = applyExternalEventToRelationships(state, {
        eventType: 'agent_death',
        affectedAgentId: 'agent-a',
        associatedAgentIds: ['agent-b', 'agent-c'],
      })

      // Check that B-C relationship changed (improved from shared grief)
      const bRelWithC = nextState.agents['agent-b']?.relationships['agent-c'] ?? 0
      const originalBRelWithC = state.agents['agent-b'].relationships['agent-c']
      expect(bRelWithC).toBeGreaterThan(originalBRelWithC)
    })

    it('should apply promotion influence with negative effect', () => {
      state = {
        ...state,
        agents: {
          'agent-a': makeAgent('agent-a', { relationships: { 'agent-b': 0.8 } }),
          'agent-b': makeAgent('agent-b', { relationships: { 'agent-a': 0.8 } }),
        },
      }

      const nextState = applyExternalEventToRelationships(state, {
        eventType: 'agent_promotion',
        affectedAgentId: 'agent-a',
        associatedAgentIds: ['agent-b'],
      })

      const bARelationship = nextState.agents['agent-b']?.relationships['agent-a'] ?? 0
      const originalBARelationship = state.agents['agent-b'].relationships['agent-a']

      // Promotion should make the relationship worse (envy)
      expect(bARelationship).toBeLessThanOrEqual(originalBARelationship)
    })

    it('should calculate influence delta for death event', () => {
      const influence = calculateExternalEventInfluence({
        eventType: 'agent_death',
        magnitude: 0.7,
      })

      expect(influence).toBeGreaterThan(0)
    })

    it('should calculate influence delta for promotion event', () => {
      const influence = calculateExternalEventInfluence({
        eventType: 'agent_promotion',
        magnitude: 0.4,
      })

      expect(influence).toBeLessThan(0)
    })

    it('should calculate influence delta for faction conflict', () => {
      const influence = calculateExternalEventInfluence({
        eventType: 'faction_conflict',
        magnitude: 0.8,
      })

      expect(influence).toBeGreaterThan(0)
    })

    it('should calculate influence delta for shared trauma', () => {
      const influence = calculateExternalEventInfluence({
        eventType: 'shared_trauma',
        magnitude: 0.9,
      })

      expect(influence).toBeGreaterThan(0)
    })
  })

  describe('Integration Tests', () => {
    it('should track and trend relationships through multiple snapshots', () => {
      const driftPattern = [0.5, 0.4, 0.3, 0.2, 0.1, 0]

      let stateWithHistory = state

      for (let week = 0; week < driftPattern.length; week++) {
        stateWithHistory = {
          ...stateWithHistory,
          week,
        }
        stateWithHistory = recordRelationshipSnapshot(
          stateWithHistory,
          makeRelationship('agent-a', 'agent-b', driftPattern[week]),
          'passive_drift'
        )
      }

      const trend = getRelationshipTrend(stateWithHistory, 'agent-a', 'agent-b')
      expect(trend).toHaveLength(driftPattern.length)
      expect(trend.map((t) => t.value)).toEqual(driftPattern)
    })
  })
})
