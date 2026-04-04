import { describe, it, expect, beforeEach } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { GameState, Agent } from '../domain/models'
import {
  applyExternalChemistryEvent,
  createAgentDeathChemistryEvent,
  createAgentPromotionChemistryEvent,
  createFactionConflictChemistryEvent,
  createSharedTraumaChemistryEvent,
  describeChemistryInfluence,
} from '../domain/events/externalChemistryEvents'

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

describe('External Chemistry Events', () => {
  let state: GameState
  let agents: Record<string, Agent>

  beforeEach(() => {
    state = createStartingState()
    agents = {
      'agent-a': makeAgent('agent-a', { relationships: { 'agent-b': 0.5, 'agent-c': 0.3 } }),
      'agent-b': makeAgent('agent-b', { relationships: { 'agent-a': 0.5, 'agent-c': 0.2 } }),
      'agent-c': makeAgent('agent-c', { relationships: { 'agent-a': 0.3, 'agent-b': 0.2 } }),
    }

    state = {
      ...state,
      agents,
    }
  })

  describe('Agent Death Events', () => {
    it('should create agent death chemistry event', () => {
      const event = createAgentDeathChemistryEvent('agent-a', ['agent-a', 'agent-b', 'agent-c'])

      expect(event.eventType).toBe('agent_death')
      expect(event.affectedAgentId).toBe('agent-a')
      expect(event.associatedAgentIds).toContain('agent-b')
      expect(event.associatedAgentIds).toContain('agent-c')
      expect(event.magnitude).toBe(0.7)
    })

    it('should apply death event to strengthen remaining bonds', () => {
      const event = createAgentDeathChemistryEvent('agent-a', ['agent-a', 'agent-b', 'agent-c'])

      const result = applyExternalChemistryEvent(state, event)

      expect(result.relationshipsAffected).toBeGreaterThan(0)
      expect(result.eventDrafts.length).toBeGreaterThan(0)

      const bCRelationship = result.nextState.agents['agent-b'].relationships['agent-c']
      const originalBCRelationship = state.agents['agent-b'].relationships['agent-c']

      expect(bCRelationship).toBeGreaterThan(originalBCRelationship)
    })
  })

  describe('Agent Promotion Events', () => {
    it('should create agent promotion chemistry event', () => {
      const event = createAgentPromotionChemistryEvent('agent-a', ['agent-a', 'agent-b', 'agent-c'])

      expect(event.eventType).toBe('agent_promotion')
      expect(event.affectedAgentId).toBe('agent-a')
      expect(event.magnitude).toBe(0.4)
    })

    it('should apply promotion event to weaken relationships', () => {
      const event = createAgentPromotionChemistryEvent('agent-a', ['agent-a', 'agent-b', 'agent-c'])

      const result = applyExternalChemistryEvent(state, event)

      expect(result.relationshipsAffected).toBeGreaterThan(0)

      const bARelationship = result.nextState.agents['agent-b'].relationships['agent-a']
      const originalBARelationship = state.agents['agent-b'].relationships['agent-a']

      expect(bARelationship).toBeLessThanOrEqual(originalBARelationship)
    })
  })

  describe('Faction Conflict Events', () => {
    it('should create faction conflict chemistry event', () => {
      const event = createFactionConflictChemistryEvent(['agent-a', 'agent-b'])

      expect(event.eventType).toBe('faction_conflict')
      expect(event.associatedAgentIds).toContain('agent-a')
      expect(event.associatedAgentIds).toContain('agent-b')
      expect(event.magnitude).toBe(0.8)
    })

    it('should apply faction conflict to strengthen bonds', () => {
      const event = createFactionConflictChemistryEvent(['agent-a', 'agent-b', 'agent-c'])

      const result = applyExternalChemistryEvent(state, event)

      expect(result.relationshipsAffected).toBeGreaterThan(0)
    })
  })

  describe('Shared Trauma Events', () => {
    it('should create shared trauma chemistry event', () => {
      const event = createSharedTraumaChemistryEvent(['agent-a', 'agent-b'])

      expect(event.eventType).toBe('shared_trauma')
      expect(event.associatedAgentIds).toContain('agent-a')
      expect(event.associatedAgentIds).toContain('agent-b')
      expect(event.magnitude).toBe(0.9)
    })

    it('should apply shared trauma to strongly strengthen bonds', () => {
      const event = createSharedTraumaChemistryEvent(['agent-a', 'agent-b', 'agent-c'])

      const result = applyExternalChemistryEvent(state, event)

      expect(result.relationshipsAffected).toBeGreaterThan(0)

      // Trauma should have strong effect, more than other events
      const bCRelationship = result.nextState.agents['agent-b'].relationships['agent-c']
      const originalBCRelationship = state.agents['agent-b'].relationships['agent-c']
      const traumaDelta = bCRelationship - originalBCRelationship

      // Test with death event for comparison
      const deathEvent = createAgentDeathChemistryEvent('agent-a', [
        'agent-a',
        'agent-b',
        'agent-c',
      ])
      const deathResult = applyExternalChemistryEvent(state, deathEvent)
      const deathBCRelationship = deathResult.nextState.agents['agent-b'].relationships['agent-c']
      const deathDelta = deathBCRelationship - originalBCRelationship

      expect(traumaDelta).toBeGreaterThan(deathDelta)
    })
  })

  describe('Event Descriptions', () => {
    it('should describe death event influence', () => {
      const event = createAgentDeathChemistryEvent('agent-a', ['agent-b', 'agent-c'])
      const description = describeChemistryInfluence(event)

      expect(description).toContain('Death')
      expect(description).toContain('strengthens')
      expect(description).toContain('+')
    })

    it('should describe promotion event influence', () => {
      const event = createAgentPromotionChemistryEvent('agent-a', ['agent-b', 'agent-c'])
      const description = describeChemistryInfluence(event)

      expect(description).toContain('Promotion')
    })

    it('should describe faction conflict influence', () => {
      const event = createFactionConflictChemistryEvent(['agent-a', 'agent-b'])
      const description = describeChemistryInfluence(event)

      expect(description).toContain('Faction conflict')
      expect(description).toContain('solidarity')
    })

    it('should describe shared trauma influence', () => {
      const event = createSharedTraumaChemistryEvent(['agent-a', 'agent-b'])
      const description = describeChemistryInfluence(event)

      expect(description).toContain('Shared traumatic')
    })
  })

  describe('No-op Cases', () => {
    it('should handle empty associated agent list', () => {
      const result = applyExternalChemistryEvent(state, {
        eventType: 'agent_death',
        associatedAgentIds: [],
      })

      expect(result.relationshipsAffected).toBe(0)
      expect(result.eventDrafts).toHaveLength(0)
      expect(result.nextState).toEqual(state)
    })
  })

  describe('Reason Semantics', () => {
    it('emits external_event reason consistently for snapshots and relationship change drafts', () => {
      const event = createFactionConflictChemistryEvent(['agent-a', 'agent-b', 'agent-c'])
      const result = applyExternalChemistryEvent(state, event)

      const relationshipDrafts = result.eventDrafts.filter(
        (draft) => draft.type === 'agent.relationship_changed'
      )
      expect(relationshipDrafts.length).toBeGreaterThan(0)
      expect(
        relationshipDrafts.every(
          (draft) =>
            draft.type === 'agent.relationship_changed' && draft.payload.reason === 'external_event'
        )
      ).toBe(true)

      const relatedSnapshots = (result.nextState.relationshipHistory ?? []).filter(
        (snapshot) => snapshot.reason === 'external_event'
      )
      expect(relatedSnapshots.length).toBe(relationshipDrafts.length)
    })
  })
})
