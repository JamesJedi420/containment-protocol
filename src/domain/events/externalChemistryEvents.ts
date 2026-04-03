/**
 * External Event Chemistry Influence Handler
 *
 * Applies relationship changes when major story events occur:
 * - Agent death: teammates' bonds strengthen (shared grief)
 * - Agent promotion: creates mixed feelings (pride vs envy)
 * - Faction conflict: shared enemy experience strengthens bonds
 * - Shared trauma: major incident strengthens relationships
 */

import type { GameState } from '../models'
import {
  applyExternalEventToRelationships,
  calculateExternalEventInfluence,
  recordRelationshipSnapshot,
} from '../sim/chemistryPolish'
import { deriveRelationshipState, deriveRelationshipStability } from '../sim/relationshipProjection'
import { createAgentRelationshipChangedDraft } from './eventBus'
import type { AnyOperationEventDraft } from './eventBus'

export interface ExternalChemistryEventInput {
  eventType: 'agent_death' | 'agent_promotion' | 'faction_conflict' | 'shared_trauma'
  affectedAgentId?: string
  associatedAgentIds?: string[]
  magnitude?: number
  teamId?: string
}

export interface ExternalChemistryEventOutput {
  nextState: GameState
  eventDrafts: AnyOperationEventDraft[]
  relationshipsAffected: number
}

/**
 * Apply external event influence to relationships in the game state.
 *
 * Returns updated state, event drafts for history, and count of affected relationships.
 */
export function applyExternalChemistryEvent(
  originalState: GameState,
  input: ExternalChemistryEventInput
): ExternalChemistryEventOutput {
  const eventDrafts: AnyOperationEventDraft[] = []
  const associatedIds = input.associatedAgentIds ?? []

  if (associatedIds.length === 0) {
    return {
      nextState: originalState,
      eventDrafts: [],
      relationshipsAffected: 0,
    }
  }

  // Apply the external influence
  let nextState = applyExternalEventToRelationships(originalState, input)

  // Record snapshots and emit events for changed relationships
  let relationshipsAffected = 0

  for (const agentId of associatedIds) {
    const agent = nextState.agents[agentId]
    if (!agent) continue

    for (const counterpartId of associatedIds) {
      if (agentId === counterpartId) continue
      if (agentId > counterpartId) continue // Avoid duplicates

      const counterpart = nextState.agents[counterpartId]
      if (!counterpart) continue

      const sourcePrevious = originalState.agents[agentId]?.relationships[counterpartId] ?? 0
      const sourceNext = nextState.agents[agentId]?.relationships[counterpartId] ?? 0

      if (Math.abs(sourceNext - sourcePrevious) > 0.01) {
        relationshipsAffected++

        // Record snapshot
        nextState = recordRelationshipSnapshot(
          nextState,
          {
            agentAId: agentId,
            agentBId: counterpartId,
            value: sourceNext,
            modifiers: [],
            state: deriveRelationshipState(sourceNext),
            stability: deriveRelationshipStability(sourceNext),
          },
          'external_event'
        )

        // Emit event with explicit external_event reason for downstream analytics/feeds.
        const delta = sourceNext - sourcePrevious
        eventDrafts.push(
          createAgentRelationshipChangedDraft({
            week: originalState.week,
            agentId,
            agentName: agent.name,
            counterpartId,
            counterpartName: counterpart.name,
            previousValue: sourcePrevious,
            nextValue: sourceNext,
            delta: Math.round(delta * 100) / 100,
            reason: 'external_event',
          })
        )
      }
    }
  }

  return {
    nextState,
    eventDrafts,
    relationshipsAffected,
  }
}

/**
 * Create external chemistry event for agent death.
 *
 * When an agent dies, their former teammates' relationships strengthen
 * (shared grief and loss).
 */
export function createAgentDeathChemistryEvent(
  deadAgentId: string,
  teamMembers: string[]
): ExternalChemistryEventInput {
  return {
    eventType: 'agent_death',
    affectedAgentId: deadAgentId,
    associatedAgentIds: teamMembers.filter((id) => id !== deadAgentId),
    magnitude: 0.7, // Strong effect
  }
}

/**
 * Create external chemistry event for agent promotion.
 *
 * Promotions can create asymmetric feelings in relationships:
 * - Some teammates feel inspired (positive boost)
 * - Others might feel envious (negative shift)
 * - Net effect is slightly negative
 */
export function createAgentPromotionChemistryEvent(
  promotedAgentId: string,
  teamMembers: string[]
): ExternalChemistryEventInput {
  return {
    eventType: 'agent_promotion',
    affectedAgentId: promotedAgentId,
    associatedAgentIds: teamMembers.filter((id) => id !== promotedAgentId),
    magnitude: 0.4, // Moderate effect (mixed feelings)
  }
}

/**
 * Create external chemistry event for faction conflict.
 *
 * When the agency faces hostile action from a faction,
 * team members who were involved strengthen their bonds.
 */
export function createFactionConflictChemistryEvent(involvedAgentIds: string[]): ExternalChemistryEventInput {
  return {
    eventType: 'faction_conflict',
    associatedAgentIds: involvedAgentIds,
    magnitude: 0.8, // Strong effect (survival bonding)
  }
}

/**
 * Create external chemistry event for shared trauma.
 *
 * Major incidents (catastrophic failures, close calls, etc.)
 * strengthen relationships between those who experienced them together.
 */
export function createSharedTraumaChemistryEvent(
  traumatizedAgentIds: string[]
): ExternalChemistryEventInput {
  return {
    eventType: 'shared_trauma',
    associatedAgentIds: traumatizedAgentIds,
    magnitude: 0.9, // Very strong effect
  }
}

/**
 * Describe an external chemistry event in human-readable terms.
 */
export function describeChemistryInfluence(input: ExternalChemistryEventInput): string {
  const { eventType, magnitude = 0.5 } = input
  const influence = calculateExternalEventInfluence(input)

  const eventDescriptions: Record<string, string> = {
    agent_death: `Death of a teammate strengthens remaining bonds (shared grief, magnitude ${magnitude.toFixed(1)})`,
    agent_promotion: `Promotion creates mixed feelings in relationships (magnitude ${magnitude.toFixed(1)})`,
    faction_conflict: `Faction conflict creates solidarity among involved agents (magnitude ${magnitude.toFixed(1)})`,
    shared_trauma: `Shared traumatic experience deeply strengthens bonds (magnitude ${magnitude.toFixed(1)})`,
  }

  return `${eventDescriptions[eventType]} → relationship delta: ${influence > 0 ? '+' : ''}${influence.toFixed(3)}`
}
