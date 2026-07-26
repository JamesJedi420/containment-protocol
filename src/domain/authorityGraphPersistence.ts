/**
 * SPE-2720: persisted authority-graph state and one bounded week-close mutation.
 *
 * The state is deliberately graph-local. It does not project into commerce, missions,
 * operational cover, negotiation, or UI. A graph without an eligible active edge is a no-op.
 */

import {
  resolveAuthorityGraphConsequences,
  validateAuthorityGraph,
  type AuthorityConsequence,
  type AuthorityGraph,
  type AuthorityGraphEdge,
  type AuthorityGraphNode,
  type AuthorityPressureChannel,
  type AuthoritySourceConfidence,
} from './authorityGraph'

export const AUTHORITY_GRAPH_MUTATION_HISTORY_LIMIT = 52
export const AUTHORITY_GRAPH_WEEKLY_STRENGTH_DELTA_LIMIT = 5

export interface AuthorityGraphMutationHistoryEntry {
  id: string
  week: number
  edgeId: string
  priorStrength: number
  nextStrength: number
  channel: AuthorityPressureChannel
  consequenceReasonCode: string
  consequenceMagnitude: number
}

export interface AuthorityGraphState {
  graph: AuthorityGraph
  mutationHistory: readonly AuthorityGraphMutationHistoryEntry[]
  lastMutationWeek?: number
}

const EMPTY_AUTHORITY_GRAPH_STATE: AuthorityGraphState = Object.freeze({
  graph: Object.freeze({ nodes: Object.freeze([]), edges: Object.freeze([]) }),
  mutationHistory: Object.freeze([]),
})

const NODE_TYPES = new Set([
  'agency',
  'department',
  'faction',
  'institution',
  'site',
  'public_office',
  'sponsor_group',
  'patron',
  'proxy',
  'coalition',
  'hidden_network',
  'symbolic_anchor',
  'constituency',
  'external_regime',
  'media_actor',
  'contractor',
  'population_group_reference',
])

const RELATIONSHIP_KINDS = new Set([
  'alliance',
  'rivalry',
  'subordination',
  'dependency',
  'hidden_agenda',
  'patronage',
  'proxy_representation',
  'front',
  'splinter',
  'shared_authority',
  'information_gate',
  'cell',
  'subsidiary',
  'precursor',
  'successor',
  'remnant',
  'jurisdiction_claim',
  'resource_control',
  'media_leverage',
  'legal_leverage',
  'donor_pressure',
  'operational_bottleneck',
  'embedded_enforcement',
  'narrative_control',
])

const RELATIONSHIP_STATUSES = new Set([
  'current',
  'hidden',
  'disputed',
  'severed',
  'inherited',
  'newly_formed',
  'outdated',
  'contradicted',
])

const SOURCE_CONFIDENCES = new Set([
  'verified',
  'probable',
  'rumor',
  'hostile_dossier',
  'public_cover',
  'redacted',
  'contradicted',
  'unknown',
])

const PRESSURE_CHANNELS = new Set<AuthorityPressureChannel>([
  'mission_access',
  'aid',
  'hostility',
  'permission',
  'surveillance',
  'information_flow',
  'secrecy',
  'delay',
  'narrative_control',
  'resource_release',
  'reporting_pressure',
  'contradiction_flag',
  'local_compliance',
])

type PlainRecord = Record<string, unknown>

function isPlainRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
}

function boundedInteger(value: unknown, minimum: number, maximum: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }
  return Math.max(minimum, Math.min(maximum, Math.trunc(value)))
}

function stringList(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }
  return Object.freeze(
    [...new Set(value.filter(nonEmptyString).map((entry) => entry.trim()))].sort(compareCodeUnits)
  )
}

function scalarMetadata(
  value: unknown
): Readonly<Record<string, string | number | boolean>> | undefined {
  if (!isPlainRecord(value)) {
    return undefined
  }

  const entries = Object.entries(value)
    .filter(
      (entry): entry is [string, string | number | boolean] =>
        nonEmptyString(entry[0]) &&
        (typeof entry[1] === 'string' ||
          typeof entry[1] === 'boolean' ||
          (typeof entry[1] === 'number' && Number.isFinite(entry[1])))
    )
    .sort(([left], [right]) => compareCodeUnits(left, right))
  return entries.length > 0 ? Object.freeze(Object.fromEntries(entries)) : undefined
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function sanitizeNode(value: unknown): AuthorityGraphNode | null {
  if (
    !isPlainRecord(value) ||
    !nonEmptyString(value.id) ||
    !nonEmptyString(value.label) ||
    !NODE_TYPES.has(value.nodeType)
  ) {
    return null
  }

  const aliases = Array.isArray(value.aliases)
    ? value.aliases
        .filter(
          (entry): entry is PlainRecord =>
            isPlainRecord(entry) &&
            nonEmptyString(entry.aliasId) &&
            nonEmptyString(entry.label) &&
            SOURCE_CONFIDENCES.has(entry.confidence)
        )
        .map((entry) =>
          Object.freeze({
            aliasId: (entry.aliasId as string).trim(),
            label: (entry.label as string).trim(),
            confidence: entry.confidence as AuthoritySourceConfidence,
          })
        )
    : undefined
  const linkedFactionIds = stringList(value.linkedFactionIds)
  const linkedPopulationIds = stringList(value.linkedPopulationIds)
  const linkedDepartmentIds = stringList(value.linkedDepartmentIds)
  const linkedSiteIds = stringList(value.linkedSiteIds)
  const metadata = scalarMetadata(value.metadata)

  return Object.freeze({
    id: value.id.trim(),
    nodeType: value.nodeType as AuthorityGraphNode['nodeType'],
    label: value.label.trim(),
    ...(aliases && aliases.length > 0 ? { aliases: Object.freeze(aliases) } : {}),
    ...(nonEmptyString(value.factionClass) ? { factionClass: value.factionClass.trim() } : {}),
    ...(linkedFactionIds ? { linkedFactionIds } : {}),
    ...(linkedPopulationIds ? { linkedPopulationIds } : {}),
    ...(linkedDepartmentIds ? { linkedDepartmentIds } : {}),
    ...(linkedSiteIds ? { linkedSiteIds } : {}),
    ...(metadata ? { metadata } : {}),
  })
}

function sanitizeEdge(value: unknown): AuthorityGraphEdge | null {
  if (
    !isPlainRecord(value) ||
    !nonEmptyString(value.id) ||
    !RELATIONSHIP_KINDS.has(value.kind) ||
    !nonEmptyString(value.fromNodeId) ||
    !nonEmptyString(value.toNodeId) ||
    !RELATIONSHIP_STATUSES.has(value.status) ||
    !SOURCE_CONFIDENCES.has(value.sourceConfidence) ||
    !isPlainRecord(value.provenance) ||
    !nonEmptyString(value.provenance.sourceTag)
  ) {
    return null
  }

  const pressureChannels = Array.isArray(value.pressureChannels)
    ? [
        ...new Set(
          value.pressureChannels.filter((entry): entry is AuthorityPressureChannel =>
            PRESSURE_CHANNELS.has(entry as AuthorityPressureChannel)
          )
        ),
      ].sort(compareCodeUnits)
    : undefined
  const strength = boundedInteger(value.strength, 0, 100)
  const volatility = boundedInteger(value.volatility, 0, 100)
  const recordedWeek = positiveInteger(value.provenance.recordedWeek)
    ? value.provenance.recordedWeek
    : undefined
  const hiddenUntilWeek = positiveInteger(value.hiddenUntilWeek) ? value.hiddenUntilWeek : undefined

  return Object.freeze({
    id: value.id.trim(),
    kind: value.kind as AuthorityGraphEdge['kind'],
    fromNodeId: value.fromNodeId.trim(),
    toNodeId: value.toNodeId.trim(),
    status: value.status as AuthorityGraphEdge['status'],
    sourceConfidence: value.sourceConfidence as AuthorityGraphEdge['sourceConfidence'],
    provenance: Object.freeze({
      sourceTag: value.provenance.sourceTag.trim(),
      ...(recordedWeek !== undefined ? { recordedWeek } : {}),
      ...(nonEmptyString(value.provenance.recorderId)
        ? { recorderId: value.provenance.recorderId.trim() }
        : {}),
    }),
    ...(strength !== undefined ? { strength } : {}),
    ...(volatility !== undefined ? { volatility } : {}),
    ...(pressureChannels && pressureChannels.length > 0
      ? { pressureChannels: Object.freeze(pressureChannels) }
      : {}),
    ...(nonEmptyString(value.representsNodeId)
      ? { representsNodeId: value.representsNodeId.trim() }
      : {}),
    ...(hiddenUntilWeek !== undefined ? { hiddenUntilWeek } : {}),
    ...(nonEmptyString(value.notes) ? { notes: value.notes.trim() } : {}),
  })
}

function sanitizeGraph(value: unknown): AuthorityGraph {
  if (!isPlainRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return EMPTY_AUTHORITY_GRAPH_STATE.graph
  }

  const nodeById = new Map<string, AuthorityGraphNode>()
  for (const rawNode of value.nodes) {
    const node = sanitizeNode(rawNode)
    if (node && !nodeById.has(node.id)) {
      nodeById.set(node.id, node)
    }
  }

  const nodes = [...nodeById.values()].sort((left, right) => compareCodeUnits(left.id, right.id))
  const edges: AuthorityGraphEdge[] = []
  const seenEdgeIds = new Set<string>()
  const candidates = value.edges
    .map(sanitizeEdge)
    .filter((entry): entry is AuthorityGraphEdge => !!entry)
    .sort((left, right) => compareCodeUnits(left.id, right.id))

  for (const edge of candidates) {
    if (seenEdgeIds.has(edge.id)) {
      continue
    }

    const candidateGraph: AuthorityGraph = { nodes, edges: [...edges, edge] }
    if (validateAuthorityGraph(candidateGraph).valid) {
      seenEdgeIds.add(edge.id)
      edges.push(edge)
    }
  }

  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  })
}

function sanitizeHistoryEntry(
  value: unknown,
  knownEdgeIds: ReadonlySet<string>
): AuthorityGraphMutationHistoryEntry | null {
  if (
    !isPlainRecord(value) ||
    !nonEmptyString(value.id) ||
    !positiveInteger(value.week) ||
    !nonEmptyString(value.edgeId) ||
    !knownEdgeIds.has(value.edgeId.trim()) ||
    !PRESSURE_CHANNELS.has(value.channel as AuthorityPressureChannel) ||
    !nonEmptyString(value.consequenceReasonCode)
  ) {
    return null
  }

  const priorStrength = boundedInteger(value.priorStrength, 0, 100)
  const nextStrength = boundedInteger(value.nextStrength, 0, 100)
  const consequenceMagnitude = boundedInteger(value.consequenceMagnitude, -100, 100)
  if (
    priorStrength === undefined ||
    nextStrength === undefined ||
    consequenceMagnitude === undefined
  ) {
    return null
  }

  return Object.freeze({
    id: value.id.trim(),
    week: value.week,
    edgeId: value.edgeId.trim(),
    priorStrength,
    nextStrength,
    channel: value.channel as AuthorityPressureChannel,
    consequenceReasonCode: value.consequenceReasonCode.trim(),
    consequenceMagnitude,
  })
}

/** Hydration normalization for missing, legacy, or malformed graph state. */
export function sanitizeAuthorityGraphState(value: unknown): AuthorityGraphState {
  if (!isPlainRecord(value)) {
    return EMPTY_AUTHORITY_GRAPH_STATE
  }

  const graph = sanitizeGraph(value.graph)
  const knownEdgeIds = new Set(graph.edges.map((edge) => edge.id))
  const historyByWeek = new Map<number, AuthorityGraphMutationHistoryEntry>()
  if (Array.isArray(value.mutationHistory)) {
    for (const rawEntry of value.mutationHistory) {
      const entry = sanitizeHistoryEntry(rawEntry, knownEdgeIds)
      if (entry) {
        historyByWeek.set(entry.week, entry)
      }
    }
  }

  const mutationHistory = [...historyByWeek.values()]
    .sort((left, right) => left.week - right.week || compareCodeUnits(left.id, right.id))
    .slice(-AUTHORITY_GRAPH_MUTATION_HISTORY_LIMIT)
  const latestHistoryWeek = mutationHistory.at(-1)?.week
  const lastMutationWeek =
    positiveInteger(value.lastMutationWeek) && value.lastMutationWeek === latestHistoryWeek
      ? value.lastMutationWeek
      : latestHistoryWeek

  return Object.freeze({
    graph,
    mutationHistory: Object.freeze(mutationHistory),
    ...(lastMutationWeek !== undefined ? { lastMutationWeek } : {}),
  })
}

function chooseMutation(
  graph: AuthorityGraph,
  week: number
): {
  edge: AuthorityGraphEdge
  channel: AuthorityPressureChannel
  consequence: AuthorityConsequence
} | null {
  const edges = [...graph.edges].sort((left, right) => compareCodeUnits(left.id, right.id))
  for (const edge of edges) {
    const channels = [...(edge.pressureChannels ?? [])].sort(compareCodeUnits)
    for (const channel of channels) {
      const consequence = resolveAuthorityGraphConsequences(graph, {
        actorNodeId: edge.fromNodeId,
        counterpartyNodeId: edge.toNodeId,
        channel,
        asOfWeek: week,
      }).find((entry) => entry.edgeIds.includes(edge.id) && entry.magnitude !== 0)
      if (
        consequence &&
        Math.max(0, Math.min(100, (edge.strength ?? 50) + signedBoundedDelta(consequence))) !==
          (edge.strength ?? 50)
      ) {
        return { edge, channel, consequence }
      }
    }
  }
  return null
}

function signedBoundedDelta(consequence: AuthorityConsequence): number {
  const direction = consequence.magnitude < 0 || consequence.effect === 'deny' ? -1 : 1
  return (
    direction *
    Math.min(
      AUTHORITY_GRAPH_WEEKLY_STRENGTH_DELTA_LIMIT,
      Math.max(1, Math.abs(consequence.magnitude))
    )
  )
}

/** Pure, deterministic, same-week-idempotent authority graph week-close mutation. */
export function applyAuthorityGraphWeekClose(
  state: AuthorityGraphState | null | undefined,
  week: number
): AuthorityGraphState {
  const normalized = sanitizeAuthorityGraphState(state)
  const normalizedWeek = positiveInteger(week) ? week : 1
  if (
    (normalized.lastMutationWeek !== undefined && normalized.lastMutationWeek >= normalizedWeek) ||
    normalized.mutationHistory.some((entry) => entry.week === normalizedWeek)
  ) {
    return normalized
  }

  const selected = chooseMutation(normalized.graph, normalizedWeek)
  if (!selected) {
    return normalized
  }

  const priorStrength = selected.edge.strength ?? 50
  const nextStrength = Math.max(
    0,
    Math.min(100, priorStrength + signedBoundedDelta(selected.consequence))
  )
  const nextEdge = Object.freeze({ ...selected.edge, strength: nextStrength })
  const graph = Object.freeze({
    nodes: normalized.graph.nodes,
    edges: Object.freeze(
      normalized.graph.edges.map((edge) => (edge.id === selected.edge.id ? nextEdge : edge))
    ),
  })
  const entry = Object.freeze({
    id: `authority-graph-mutation:${normalizedWeek}:${selected.edge.id}`,
    week: normalizedWeek,
    edgeId: selected.edge.id,
    priorStrength,
    nextStrength,
    channel: selected.channel,
    consequenceReasonCode: selected.consequence.reasonCode,
    consequenceMagnitude: selected.consequence.magnitude,
  })

  return Object.freeze({
    graph,
    mutationHistory: Object.freeze(
      [...normalized.mutationHistory, entry].slice(-AUTHORITY_GRAPH_MUTATION_HISTORY_LIMIT)
    ),
    lastMutationWeek: normalizedWeek,
  })
}
