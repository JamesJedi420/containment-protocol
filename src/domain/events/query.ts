import type { OperationEvent, OperationEventSourceSystem, OperationEventType } from '../models'

export interface EventQueryFilter {
  sourceSystem?: OperationEventSourceSystem | 'all'
  type?: OperationEventType | 'all'
  weekMin?: number
  weekMax?: number
  entityId?: string
  query?: string
}

export interface EventQueryIndex {
  all: OperationEvent[]
  byType: Map<OperationEventType, OperationEvent[]>
  bySourceSystem: Map<OperationEventSourceSystem, OperationEvent[]>
  byWeek: Map<number, OperationEvent[]>
  byEntityId: Map<string, OperationEvent[]>
}

const ENTITY_ID_KEYS = [
  'caseId',
  'teamId',
  'agentId',
  'parentCaseId',
  'queueId',
  'candidateId',
  'factionId',
] as const

function indexPush<K>(map: Map<K, OperationEvent[]>, key: K, event: OperationEvent) {
  const current = map.get(key)
  if (current) {
    current.push(event)
    return
  }

  map.set(key, [event])
}

function getEntityIds(event: OperationEvent) {
  const payloadRecord = event.payload as Record<string, unknown>
  const ids = new Set<string>()

  for (const key of ENTITY_ID_KEYS) {
    const value = payloadRecord[key]
    if (typeof value === 'string' && value.length > 0) {
      ids.add(value)
    }
  }

  return [...ids]
}

function collectStringValues(value: unknown, collector: string[]) {
  if (typeof value === 'string') {
    if (value.length > 0) {
      collector.push(value)
    }
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringValues(item, collector)
    }
    return
  }

  if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectStringValues(item, collector)
    }
  }
}

function matchesTextQuery(event: OperationEvent, normalizedQuery: string) {
  if (normalizedQuery.length === 0) {
    return true
  }

  if (event.type.toLowerCase().includes(normalizedQuery)) {
    return true
  }

  if (event.sourceSystem.toLowerCase().includes(normalizedQuery)) {
    return true
  }

  const payloadStrings: string[] = []
  collectStringValues(event.payload, payloadStrings)
  return payloadStrings.some((entry) => entry.toLowerCase().includes(normalizedQuery))
}

export function buildEventQueryIndex(events: OperationEvent[]): EventQueryIndex {
  const all = [...events].sort((left, right) => right.timestamp.localeCompare(left.timestamp))

  const index: EventQueryIndex = {
    all,
    byType: new Map(),
    bySourceSystem: new Map(),
    byWeek: new Map(),
    byEntityId: new Map(),
  }

  for (const event of all) {
    indexPush(index.byType, event.type, event)
    indexPush(index.bySourceSystem, event.sourceSystem, event)
    indexPush(index.byWeek, event.payload.week, event)

    for (const entityId of getEntityIds(event)) {
      indexPush(index.byEntityId, entityId, event)
    }
  }

  return index
}

export function queryEvents(index: EventQueryIndex, filter: EventQueryFilter): OperationEvent[] {
  const normalizedEntityId = filter.entityId?.trim() ?? ''
  const normalizedQuery = filter.query?.trim().toLowerCase() ?? ''

  let base = index.all

  if (filter.type && filter.type !== 'all') {
    base = index.byType.get(filter.type) ?? []
  }

  if (filter.sourceSystem && filter.sourceSystem !== 'all') {
    const sourceEvents = new Set(index.bySourceSystem.get(filter.sourceSystem) ?? [])
    base = base.filter((event) => sourceEvents.has(event))
  }

  if (normalizedEntityId.length > 0) {
    const entityEvents = new Set(index.byEntityId.get(normalizedEntityId) ?? [])
    base = base.filter((event) => entityEvents.has(event))
  }

  if (typeof filter.weekMin === 'number') {
    base = base.filter((event) => event.payload.week >= filter.weekMin!)
  }

  if (typeof filter.weekMax === 'number') {
    base = base.filter((event) => event.payload.week <= filter.weekMax!)
  }

  if (normalizedQuery.length > 0) {
    base = base.filter((event) => matchesTextQuery(event, normalizedQuery))
  }

  return base
}
