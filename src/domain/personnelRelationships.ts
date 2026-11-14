/** SPE-3103: Agent.relationships remains the sole directional value authority. */
import type { Agent } from './agent/models'
import type { OperationEvent } from './events/types'
import {
  deriveRelationshipState,
  RELATIONSHIP_CHANGED_REASONS,
  reconcileAgentRelationshipChangedFields,
} from './sim/relationshipProjection'

export const PERSONNEL_RELATIONSHIP_TAGS = [
  'trust',
  'strain',
  'loyalty',
  'rivalry',
  'mentorship',
  'dependence',
  'betrayal',
] as const
export type PersonnelRelationshipTag = (typeof PERSONNEL_RELATIONSHIP_TAGS)[number]
export interface PersonnelRelationshipMetadata {
  readonly tags: readonly PersonnelRelationshipTag[]
  readonly sourceRef: string
  readonly reason: string
  readonly week?: number
  readonly eventId?: string
  readonly terminal?: true
}

/** Missing edges are neutral for legacy consumers, but remain distinguishable by query. */
export function getPersonnelRelationshipValue(
  agent: Pick<Agent, 'relationships'>,
  counterpartId: string
) {
  return Object.hasOwn(agent.relationships, counterpartId) ? agent.relationships[counterpartId] : 0
}

export function getPersonnelRelationship(agent: Agent, counterpartId: string) {
  if (!Object.hasOwn(agent.relationships, counterpartId)) return null
  const value = agent.relationships[counterpartId]
  const metadata = agent.relationshipMetadata
  return Object.freeze({
    counterpartId,
    value,
    tier: deriveRelationshipState(value),
    metadata: metadata && Object.hasOwn(metadata, counterpartId) ? metadata[counterpartId] : null,
  })
}

/** Query only the requested actor's adjacency list; never traverse the world graph. */
export function queryPersonnelRelationships(agent: Agent, counterpartIds?: readonly string[]) {
  const ids = counterpartIds ? [...new Set(counterpartIds)] : Object.keys(agent.relationships)
  return ids.sort().flatMap((id) => {
    const edge = getPersonnelRelationship(agent, id)
    return edge ? [edge] : []
  })
}

export function writePersonnelRelationship(
  agent: Agent,
  counterpartId: string,
  value: number,
  metadata: PersonnelRelationshipMetadata
): Agent {
  if (
    !counterpartId.trim() ||
    counterpartId !== counterpartId.trim() ||
    counterpartId === agent.id ||
    !Number.isFinite(value) ||
    value < -2 ||
    value > 2
  ) {
    throw new Error('Invalid directional personnel relationship.')
  }
  const relationshipMetadata = normalizePersonnelRelationshipMetadata(
    { [counterpartId]: metadata },
    { [counterpartId]: value },
    agent.id
  )
  if (!relationshipMetadata[counterpartId]) throw new Error('Relationship provenance is required.')
  const relationships = { ...agent.relationships, [counterpartId]: value }
  return {
    ...agent,
    relationships,
    relationshipMetadata: { ...agent.relationshipMetadata, ...relationshipMetadata },
    ...(agent.history
      ? { history: { ...agent.history, bonds: { ...agent.history.bonds, [counterpartId]: value } } }
      : {}),
  }
}

/** Explicit removal clears current values/metadata; historical operation logs remain history. */
export function removePersonnelRelationship(
  agent: Agent,
  counterpartId: string,
  provenance: Omit<PersonnelRelationshipMetadata, 'tags' | 'reason' | 'terminal'>
): Agent {
  if (
    !counterpartId.trim() ||
    counterpartId !== counterpartId.trim() ||
    counterpartId === agent.id
  ) {
    throw new Error('Invalid directional personnel relationship.')
  }
  if (!Object.hasOwn(agent.relationships, counterpartId)) return agent
  const relationships = { ...agent.relationships }
  const relationshipMetadata = { ...agent.relationshipMetadata }
  delete relationships[counterpartId]
  Object.defineProperty(relationshipMetadata, counterpartId, {
    enumerable: true,
    configurable: true,
    value: {
      ...provenance,
      tags: agent.relationshipMetadata?.[counterpartId]?.tags ?? [],
      reason: 'removed',
      terminal: true,
    },
  })
  const normalized = normalizePersonnelRelationshipMetadata(
    relationshipMetadata,
    relationships,
    agent.id
  )
  if (!normalized[counterpartId]) throw new Error('Removal provenance is required.')
  const bonds = { ...agent.history?.bonds }
  delete bonds[counterpartId]
  return {
    ...agent,
    relationships,
    relationshipMetadata: normalized,
    ...(agent.history ? { history: { ...agent.history, bonds } } : {}),
  }
}

/** Hydrate metadata only for existing edges; legacy values do not acquire invented history. */
export function normalizePersonnelRelationshipMetadata(
  raw: unknown,
  relationships: Record<string, number>,
  ownerId: string,
  maxWeek = Infinity
): Record<string, PersonnelRelationshipMetadata> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const result: Record<string, PersonnelRelationshipMetadata> = {}
  for (const id of [...new Set([...Object.keys(relationships), ...Object.keys(raw)])].sort()) {
    if (!id.trim() || id !== id.trim() || id === ownerId || !Object.hasOwn(raw, id)) continue
    const entry: unknown = (raw as Record<string, unknown>)[id]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const { tags, sourceRef, reason, week, eventId, terminal } = entry as Record<string, unknown>
    if (
      (!Object.hasOwn(relationships, id) && terminal !== true) ||
      (terminal !== undefined && terminal !== true) ||
      (terminal === true && (Object.hasOwn(relationships, id) || reason !== 'removed')) ||
      (reason === 'removed' && terminal !== true)
    )
      continue
    if (
      typeof sourceRef !== 'string' ||
      !sourceRef.trim() ||
      typeof reason !== 'string' ||
      !reason.trim() ||
      ![...RELATIONSHIP_CHANGED_REASONS, 'legacy', 'removed'].includes(reason) ||
      !Array.isArray(tags) ||
      tags.some((tag) => !PERSONNEL_RELATIONSHIP_TAGS.includes(tag)) ||
      (week !== undefined &&
        (typeof week !== 'number' || !Number.isSafeInteger(week) || week < 0 || week > maxWeek)) ||
      (eventId !== undefined && (typeof eventId !== 'string' || !eventId.trim()))
    )
      continue
    Object.defineProperty(result, id, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: Object.freeze({
        tags: Object.freeze([...new Set(tags)].sort()),
        sourceRef: sourceRef.trim(),
        reason: reason.trim(),
        ...(week === undefined ? {} : { week }),
        ...(eventId === undefined ? {} : { eventId: eventId.trim() }),
      }),
    })
    if (terminal === true) result[id] = Object.freeze({ ...result[id], terminal: true })
  }
  return result
}

/** Existing canonical event delivery stamps durable provenance, not a second value. */
export function applyPersonnelRelationshipEvent(agent: Agent, event: OperationEvent): Agent {
  if (event.type !== 'agent.relationship_changed' || event.payload.agentId !== agent.id)
    return agent
  const { counterpartId, nextValue, reason, week } = event.payload
  if (!Object.hasOwn(agent.relationships, counterpartId)) return agent
  const previousWeek = agent.relationshipMetadata?.[counterpartId]?.week
  if (previousWeek !== undefined && previousWeek > week) return agent
  const reconciled = reconcileAgentRelationshipChangedFields(event.payload)
  if (
    reconciled.previousValue !== event.payload.previousValue ||
    reconciled.nextValue !== nextValue ||
    reconciled.delta !== event.payload.delta ||
    reconciled.reason !== reason
  )
    return agent
  if (
    counterpartId === agent.id ||
    !(RELATIONSHIP_CHANGED_REASONS as readonly string[]).includes(reason) ||
    getPersonnelRelationshipValue(agent, counterpartId) !== nextValue
  )
    return agent
  return writePersonnelRelationship(agent, counterpartId, nextValue, {
    tags: agent.relationshipMetadata?.[counterpartId]?.tags ?? [],
    sourceRef: event.sourceSystem,
    reason,
    week,
    eventId: event.id,
  })
}
