/**
 * SPE-788 slice 1: authority relationship graph — pure types, validation,
 * alias normalization, and deterministic consequence resolution.
 *
 * Fixture-only contract; no runtime game state, mission runtime, UI, negotiation engine,
 * or ethics/obedience integration in this slice.
 */

// ---------------------------------------------------------------------------
// Unions
// ---------------------------------------------------------------------------

export type AuthorityNodeType =
  | 'agency'
  | 'department'
  | 'faction'
  | 'institution'
  | 'site'
  | 'public_office'
  | 'sponsor_group'
  | 'patron'
  | 'proxy'
  | 'coalition'
  | 'hidden_network'
  | 'symbolic_anchor'
  | 'constituency'
  | 'external_regime'
  | 'media_actor'
  | 'contractor'
  | 'population_group_reference'

export type AuthorityRelationshipKind =
  | 'alliance'
  | 'rivalry'
  | 'subordination'
  | 'dependency'
  | 'hidden_agenda'
  | 'patronage'
  | 'proxy_representation'
  | 'front'
  | 'splinter'
  | 'shared_authority'
  | 'information_gate'
  | 'cell'
  | 'subsidiary'
  | 'precursor'
  | 'successor'
  | 'remnant'
  | 'jurisdiction_claim'
  | 'resource_control'
  | 'media_leverage'
  | 'legal_leverage'
  | 'donor_pressure'
  | 'operational_bottleneck'
  | 'embedded_enforcement'
  | 'narrative_control'

export type AuthorityRelationshipStatus =
  | 'current'
  | 'hidden'
  | 'disputed'
  | 'severed'
  | 'inherited'
  | 'newly_formed'
  | 'outdated'
  | 'contradicted'

export type AuthoritySourceConfidence =
  | 'verified'
  | 'probable'
  | 'rumor'
  | 'hostile_dossier'
  | 'public_cover'
  | 'redacted'
  | 'contradicted'
  | 'unknown'

export type AuthorityPressureChannel =
  | 'mission_access'
  | 'aid'
  | 'hostility'
  | 'permission'
  | 'surveillance'
  | 'information_flow'
  | 'secrecy'
  | 'delay'
  | 'narrative_control'
  | 'resource_release'
  | 'reporting_pressure'
  | 'contradiction_flag'
  | 'local_compliance'

export type AuthorityConsequenceEffect = 'grant' | 'deny' | 'modify' | 'delay' | 'flag'

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface AuthoritySourceProvenance {
  sourceTag: string
  recordedWeek?: number
  recorderId?: string
}

export interface AuthorityNodeAlias {
  aliasId: string
  label: string
  confidence: AuthoritySourceConfidence
}

export interface AuthorityGraphNode {
  id: string
  nodeType: AuthorityNodeType
  label: string
  aliases?: readonly AuthorityNodeAlias[]
  factionClass?: string
  linkedFactionIds?: readonly string[]
  linkedPopulationIds?: readonly string[]
  linkedDepartmentIds?: readonly string[]
  linkedSiteIds?: readonly string[]
  metadata?: Readonly<Record<string, string | number | boolean>>
}

export interface AuthorityGraphEdge {
  id: string
  kind: AuthorityRelationshipKind
  fromNodeId: string
  toNodeId: string
  status: AuthorityRelationshipStatus
  sourceConfidence: AuthoritySourceConfidence
  provenance: AuthoritySourceProvenance
  strength?: number
  volatility?: number
  pressureChannels?: readonly AuthorityPressureChannel[]
  representsNodeId?: string
  hiddenUntilWeek?: number
  notes?: string
}

export interface AuthorityGraph {
  nodes: readonly AuthorityGraphNode[]
  edges: readonly AuthorityGraphEdge[]
}

export interface AuthorityGraphQuery {
  actorNodeId: string
  counterpartyNodeId?: string
  channel: AuthorityPressureChannel
  asOfWeek: number
  viewerConfidenceFloor?: AuthoritySourceConfidence
  includeContradictedClaims?: boolean
}

export interface AuthorityConsequence {
  channel: AuthorityPressureChannel
  effect: AuthorityConsequenceEffect
  magnitude: number
  reasonCode: string
  edgeIds: readonly string[]
  confidenceApplied: AuthoritySourceConfidence
  delayed: boolean
  contradicted: boolean
}

export type AuthorityGraphValidationIssueCode =
  | 'duplicate_node_id'
  | 'duplicate_edge_id'
  | 'unknown_from_node'
  | 'unknown_to_node'
  | 'missing_proxy_represents_node'
  | 'unknown_represents_node'
  | 'self_loop_edge'
  | 'missing_provenance_source_tag'
  | 'population_faction_collapse'
  | 'contradictory_current_claims'
  | 'perfect_dossier_unlikely'
  | 'unmapped_relationship_kind'
  | 'proxy_representation_cycle'

export interface AuthorityGraphValidationIssue {
  code: AuthorityGraphValidationIssueCode
  detail: string
  severity: 'error' | 'warning'
  relatedIds?: readonly string[]
}

export interface AuthorityGraphValidationResult {
  valid: boolean
  issues: readonly AuthorityGraphValidationIssue[]
}

// ---------------------------------------------------------------------------
// Slice-1 resolver coverage
// ---------------------------------------------------------------------------

const SLICE1_RESOLVER_KINDS: ReadonlySet<AuthorityRelationshipKind> = new Set([
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
])

const CONFIDENCE_WEIGHT: Readonly<Record<AuthoritySourceConfidence, number>> = {
  verified: 100,
  probable: 80,
  rumor: 50,
  hostile_dossier: 40,
  public_cover: 60,
  redacted: 30,
  contradicted: 0,
  unknown: 20,
}

const CONFIDENCE_FLOOR_ORDER: readonly AuthoritySourceConfidence[] = [
  'contradicted',
  'unknown',
  'redacted',
  'hostile_dossier',
  'rumor',
  'public_cover',
  'probable',
  'verified',
]

const FRANCHISE_TOKEN_PATTERN =
  /\b(scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|goi-|group of interest)\b/i

const ACTIVE_STATUSES: ReadonlySet<AuthorityRelationshipStatus> = new Set(['current', 'hidden'])

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  )
}

function normalizeToken(value: string) {
  return value.trim()
}

function confidenceRank(confidence: AuthoritySourceConfidence) {
  return CONFIDENCE_FLOOR_ORDER.indexOf(confidence)
}

function meetsConfidenceFloor(
  edgeConfidence: AuthoritySourceConfidence,
  floor: AuthoritySourceConfidence | undefined
) {
  if (!floor) {
    return edgeConfidence !== 'contradicted'
  }

  return confidenceRank(edgeConfidence) >= confidenceRank(floor)
}

function scaleMagnitude(base: number, confidence: AuthoritySourceConfidence) {
  return Math.trunc((base * CONFIDENCE_WEIGHT[confidence]) / 100)
}

function edgeIsActive(edge: AuthorityGraphEdge, asOfWeek: number) {
  if (edge.status === 'severed' || edge.status === 'outdated' || edge.status === 'contradicted') {
    return false
  }

  if (edge.status === 'hidden') {
    const hiddenUntil = edge.hiddenUntilWeek ?? Number.POSITIVE_INFINITY
    return asOfWeek >= hiddenUntil
  }

  return ACTIVE_STATUSES.has(edge.status)
}

function edgeIsDelayed(edge: AuthorityGraphEdge, asOfWeek: number) {
  if (edge.status !== 'hidden') {
    return false
  }

  const hiddenUntil = edge.hiddenUntilWeek ?? Number.POSITIVE_INFINITY
  return asOfWeek < hiddenUntil
}

function buildNodeIndex(graph: AuthorityGraph) {
  const byId = new Map<string, AuthorityGraphNode>()
  for (const node of graph.nodes) {
    byId.set(node.id, node)
  }
  return byId
}

function buildAliasIndex(graph: AuthorityGraph) {
  const aliasToNodeId = new Map<string, string>()

  for (const node of graph.nodes) {
    const aliases = [...(node.aliases ?? [])].sort((left, right) =>
      left.aliasId.localeCompare(right.aliasId)
    )

    for (const alias of aliases) {
      const keys = uniqueSorted([alias.aliasId, alias.label])
      for (const key of keys) {
        if (!aliasToNodeId.has(key)) {
          aliasToNodeId.set(key, node.id)
        }
      }
    }
  }

  return aliasToNodeId
}

export function normalizeAuthorityNodeId(graph: AuthorityGraph, ref: string): string | undefined {
  const token = normalizeToken(ref)
  if (!token) {
    return undefined
  }

  const byId = buildNodeIndex(graph)
  if (byId.has(token)) {
    return token
  }

  return buildAliasIndex(graph).get(token)
}

function pushIssue(
  issues: AuthorityGraphValidationIssue[],
  issue: AuthorityGraphValidationIssue
) {
  issues.push(issue)
}

function edgeTripleKey(edge: Pick<AuthorityGraphEdge, 'fromNodeId' | 'toNodeId' | 'kind'>) {
  return `${edge.fromNodeId}::${edge.toNodeId}::${edge.kind}`
}

function detectContradictoryCurrentClaims(
  edges: readonly AuthorityGraphEdge[]
): Array<{ edgeIds: string[]; detail: string }> {
  const contradictions: Array<{ edgeIds: string[]; detail: string }> = []
  const currentByTriple = new Map<string, AuthorityGraphEdge[]>()
  const subordinationByChild = new Map<string, AuthorityGraphEdge[]>()

  for (const edge of edges) {
    if (edge.status !== 'current') {
      continue
    }

    const triple = edgeTripleKey(edge)
    const group = currentByTriple.get(triple) ?? []
    group.push(edge)
    currentByTriple.set(triple, group)

    if (edge.kind === 'subordination') {
      const childGroup = subordinationByChild.get(edge.fromNodeId) ?? []
      childGroup.push(edge)
      subordinationByChild.set(edge.fromNodeId, childGroup)
    }
  }

  for (const [triple, group] of currentByTriple) {
    if (group.length < 2) {
      continue
    }

    const confidences = new Set(group.map((edge) => edge.sourceConfidence))
    if (confidences.size > 1) {
      contradictions.push({
        edgeIds: uniqueSorted(group.map((edge) => edge.id)),
        detail: `Conflicting current claims for ${triple}.`,
      })
    }
  }

  for (const [childId, group] of subordinationByChild) {
    const superiors = new Set(group.map((edge) => edge.toNodeId))
    if (superiors.size > 1) {
      contradictions.push({
        edgeIds: uniqueSorted(group.map((edge) => edge.id)),
        detail: `Node ${childId} has competing subordination parents.`,
      })
    }
  }

  for (const edge of edges) {
    if (edge.status !== 'current') {
      continue
    }

    if (edge.kind === 'front' || edge.kind === 'alliance') {
      const counterpart =
        edge.kind === 'front'
          ? edges.find(
              (candidate) =>
                candidate.status === 'current' &&
                candidate.kind === 'alliance' &&
                candidate.fromNodeId === edge.fromNodeId &&
                candidate.toNodeId === edge.toNodeId
            )
          : edges.find(
              (candidate) =>
                candidate.status === 'current' &&
                candidate.kind === 'front' &&
                candidate.fromNodeId === edge.fromNodeId &&
                candidate.toNodeId === edge.toNodeId
            )

      if (counterpart) {
        contradictions.push({
          edgeIds: uniqueSorted([edge.id, counterpart.id]),
          detail: `Front and alliance both current between ${edge.fromNodeId} and ${edge.toNodeId}.`,
        })
      }
    }
  }

  return contradictions
}

export function validateAuthorityGraph(graph: AuthorityGraph): AuthorityGraphValidationResult {
  const issues: AuthorityGraphValidationIssue[] = []
  const nodeIds = new Set<string>()
  const edgeIds = new Set<string>()
  const nodeById = buildNodeIndex(graph)

  for (const node of graph.nodes) {
    const id = normalizeToken(node.id)
    if (!id) {
      pushIssue(issues, {
        code: 'duplicate_node_id',
        severity: 'error',
        detail: 'Node is missing id.',
      })
      continue
    }

    if (nodeIds.has(id)) {
      pushIssue(issues, {
        code: 'duplicate_node_id',
        severity: 'error',
        detail: `Duplicate node id ${id}.`,
        relatedIds: [id],
      })
    } else {
      nodeIds.add(id)
    }

    if (node.nodeType === 'population_group_reference') {
      const hasFactionLink = (node.linkedFactionIds?.length ?? 0) > 0
      const hasPoliticalEdge = graph.edges.some(
        (edge) =>
          edge.status === 'current' &&
          SLICE1_RESOLVER_KINDS.has(edge.kind) &&
          (edge.fromNodeId === id || edge.toNodeId === id) &&
          edge.kind !== 'proxy_representation'
      )

      if (!hasFactionLink && hasPoliticalEdge) {
        pushIssue(issues, {
          code: 'population_faction_collapse',
          severity: 'warning',
          detail: `Population reference ${id} acts as political faction without linkedFactionIds.`,
          relatedIds: [id],
        })
      }
    }
  }

  const verifiedEdgeCount = graph.edges.filter(
    (edge) => edge.sourceConfidence === 'verified' && edge.status === 'current'
  ).length

  if (graph.edges.length > 0 && verifiedEdgeCount === graph.edges.length) {
    pushIssue(issues, {
      code: 'perfect_dossier_unlikely',
      severity: 'warning',
      detail: 'All edges are verified and current; dossier may be unrealistically complete.',
    })
  }

  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) {
      pushIssue(issues, {
        code: 'duplicate_edge_id',
        severity: 'error',
        detail: `Duplicate edge id ${edge.id}.`,
        relatedIds: [edge.id],
      })
    } else {
      edgeIds.add(edge.id)
    }

    if (!normalizeToken(edge.provenance?.sourceTag ?? '')) {
      pushIssue(issues, {
        code: 'missing_provenance_source_tag',
        severity: 'error',
        detail: `Edge ${edge.id} is missing provenance.sourceTag.`,
        relatedIds: [edge.id],
      })
    }

    if (!nodeById.has(edge.fromNodeId)) {
      pushIssue(issues, {
        code: 'unknown_from_node',
        severity: 'error',
        detail: `Edge ${edge.id} references unknown fromNodeId ${edge.fromNodeId}.`,
        relatedIds: [edge.id, edge.fromNodeId],
      })
    }

    if (!nodeById.has(edge.toNodeId)) {
      pushIssue(issues, {
        code: 'unknown_to_node',
        severity: 'error',
        detail: `Edge ${edge.id} references unknown toNodeId ${edge.toNodeId}.`,
        relatedIds: [edge.id, edge.toNodeId],
      })
    }

    if (edge.fromNodeId === edge.toNodeId) {
      const nodeType = nodeById.get(edge.fromNodeId)?.nodeType
      if (nodeType !== 'symbolic_anchor') {
        pushIssue(issues, {
          code: 'self_loop_edge',
          severity: 'warning',
          detail: `Edge ${edge.id} is a self-loop.`,
          relatedIds: [edge.id],
        })
      }
    }

    if (edge.kind === 'proxy_representation') {
      if (!edge.representsNodeId) {
        pushIssue(issues, {
          code: 'missing_proxy_represents_node',
          severity: 'error',
          detail: `Edge ${edge.id} requires representsNodeId.`,
          relatedIds: [edge.id],
        })
      } else if (!nodeById.has(edge.representsNodeId)) {
        pushIssue(issues, {
          code: 'unknown_represents_node',
          severity: 'error',
          detail: `Edge ${edge.id} references unknown representsNodeId ${edge.representsNodeId}.`,
          relatedIds: [edge.id, edge.representsNodeId],
        })
      }
    }

    if (edge.status === 'current' && !SLICE1_RESOLVER_KINDS.has(edge.kind)) {
      pushIssue(issues, {
        code: 'unmapped_relationship_kind',
        severity: 'warning',
        detail: `Edge ${edge.id} uses deferred kind ${edge.kind} with status current.`,
        relatedIds: [edge.id],
      })
    }
  }

  const proxyCycles = new Set<string>()
  for (const edge of graph.edges) {
    if (edge.kind !== 'proxy_representation' || !edge.representsNodeId) {
      continue
    }

    const visited = new Set<string>([edge.fromNodeId])
    let cursor: string | undefined = edge.representsNodeId

    while (cursor) {
      if (visited.has(cursor)) {
        proxyCycles.add(edge.id)
        break
      }

      visited.add(cursor)
      const next = graph.edges.find(
        (candidate) =>
          candidate.kind === 'proxy_representation' &&
          candidate.fromNodeId === cursor &&
          candidate.representsNodeId
      )

      cursor = next?.representsNodeId
    }
  }

  for (const edgeId of proxyCycles) {
    pushIssue(issues, {
      code: 'proxy_representation_cycle',
      severity: 'error',
      detail: `Proxy representation cycle detected at edge ${edgeId}.`,
      relatedIds: [edgeId],
    })
  }

  for (const contradiction of detectContradictoryCurrentClaims(graph.edges)) {
    pushIssue(issues, {
      code: 'contradictory_current_claims',
      severity: 'warning',
      detail: contradiction.detail,
      relatedIds: contradiction.edgeIds,
    })
  }

  const hasError = issues.some((issue) => issue.severity === 'error')

  return {
    valid: !hasError,
    issues: Object.freeze(
      [...issues].sort((left, right) => {
        const codeCompare = left.code.localeCompare(right.code)
        if (codeCompare !== 0) {
          return codeCompare
        }

        return left.detail.localeCompare(right.detail)
      })
    ),
  }
}

function sortConsequences(consequences: AuthorityConsequence[]) {
  consequences.sort((left, right) => {
    const channelCompare = left.channel.localeCompare(right.channel)
    if (channelCompare !== 0) {
      return channelCompare
    }

    const reasonCompare = left.reasonCode.localeCompare(right.reasonCode)
    if (reasonCompare !== 0) {
      return reasonCompare
    }

    const edgeCompare = (left.edgeIds[0] ?? '').localeCompare(right.edgeIds[0] ?? '')
    if (edgeCompare !== 0) {
      return edgeCompare
    }

    return left.magnitude - right.magnitude
  })
}

function addConsequence(
  consequences: AuthorityConsequence[],
  input: Omit<AuthorityConsequence, 'edgeIds'> & { edgeIds: readonly string[] }
) {
  const existing = consequences.find(
    (consequence) =>
      consequence.channel === input.channel &&
      consequence.reasonCode === input.reasonCode &&
      consequence.effect === input.effect
  )

  if (existing) {
    existing.magnitude = Math.trunc(existing.magnitude + input.magnitude)
    return
  }

  consequences.push({
    channel: input.channel,
    effect: input.effect,
    magnitude: input.magnitude,
    reasonCode: input.reasonCode,
    edgeIds: [...input.edgeIds],
    confidenceApplied: input.confidenceApplied,
    delayed: input.delayed,
    contradicted: input.contradicted,
  })
}

function resolveProxyTargetNodeId(
  graph: AuthorityGraph,
  edge: AuthorityGraphEdge,
  nodeById: Map<string, AuthorityGraphNode>
) {
  if (edge.kind !== 'proxy_representation') {
    return edge.toNodeId
  }

  const represents = edge.representsNodeId
  if (represents && nodeById.has(represents)) {
    return represents
  }

  return edge.toNodeId
}

function edgeAppliesToQuery(
  edge: AuthorityGraphEdge,
  query: AuthorityGraphQuery,
  actorId: string,
  counterpartyId: string | undefined
) {
  const involvesActor = edge.fromNodeId === actorId || edge.toNodeId === actorId
  if (!involvesActor) {
    return false
  }

  if (counterpartyId) {
    const involvesCounterparty =
      edge.fromNodeId === counterpartyId || edge.toNodeId === counterpartyId

    if (!involvesCounterparty) {
      const proxyTarget = edge.representsNodeId
      if (proxyTarget !== counterpartyId) {
        return false
      }
    }
  }

  if (edge.pressureChannels && edge.pressureChannels.length > 0) {
    if (!edge.pressureChannels.includes(query.channel)) {
      return false
    }
  }

  return true
}

function mapEdgeToConsequences(
  graph: AuthorityGraph,
  edge: AuthorityGraphEdge,
  query: AuthorityGraphQuery,
  actorId: string,
  nodeById: Map<string, AuthorityGraphNode>,
  consequences: AuthorityConsequence[],
  contradictionEdgeIds: ReadonlySet<string>
) {
  if (!SLICE1_RESOLVER_KINDS.has(edge.kind)) {
    return
  }

  const delayed = edgeIsDelayed(edge, query.asOfWeek)
  if (!edgeIsActive(edge, query.asOfWeek) && !delayed) {
    return
  }

  const includeContradicted = query.includeContradictedClaims === true
  if (edge.sourceConfidence === 'contradicted' && !includeContradicted) {
    return
  }

  if (!meetsConfidenceFloor(edge.sourceConfidence, query.viewerConfidenceFloor)) {
    return
  }

  const contradicted =
    contradictionEdgeIds.has(edge.id) || edge.sourceConfidence === 'contradicted'
  const effectiveTargetId = resolveProxyTargetNodeId(graph, edge, nodeById)
  const peerId =
    edge.fromNodeId === actorId
      ? effectiveTargetId
      : edge.fromNodeId === effectiveTargetId
        ? actorId
        : edge.toNodeId

  const baseStrength = clampStrength(edge.strength ?? 50)
  const weighted = scaleMagnitude(baseStrength, edge.sourceConfidence)

  const emit = (
    channel: AuthorityPressureChannel,
    effect: AuthorityConsequenceEffect,
    magnitude: number,
    reasonCode: string
  ) => {
    if (query.channel !== channel) {
      return
    }

    addConsequence(consequences, {
      channel,
      effect,
      magnitude,
      reasonCode,
      edgeIds: [edge.id],
      confidenceApplied: edge.sourceConfidence,
      delayed,
      contradicted,
    })
  }

  switch (edge.kind) {
    case 'dependency': {
      if (query.channel === 'mission_access') {
        emit(
          'mission_access',
          delayed || weighted < 40 ? 'delay' : weighted < 60 ? 'deny' : 'grant',
          delayed ? 30 : weighted < 60 ? -weighted : weighted,
          delayed ? 'dependency_hidden_delay' : 'dependency_access'
        )
      }

      if (query.channel === 'permission') {
        emit(
          'permission',
          weighted < 50 ? 'deny' : 'modify',
          weighted < 50 ? -weighted : Math.trunc(weighted / 2),
          'dependency_permission'
        )
      }
      break
    }

    case 'rivalry': {
      if (query.channel === 'hostility') {
        emit('hostility', 'modify', weighted, 'rivalry_hostility')
      }

      if (query.channel === 'aid') {
        emit('aid', 'deny', -Math.max(weighted, 20), 'rivalry_blocks_aid')
      }
      break
    }

    case 'alliance': {
      if (query.channel === 'aid') {
        emit('aid', weighted >= 40 ? 'grant' : 'modify', weighted, 'alliance_aid')
      }

      if (query.channel === 'hostility') {
        emit('hostility', 'modify', -Math.trunc(weighted / 2), 'alliance_reduces_hostility')
      }
      break
    }

    case 'hidden_agenda': {
      if (query.channel === 'information_flow') {
        emit(
          'information_flow',
          delayed ? 'delay' : 'modify',
          delayed ? 25 : -Math.trunc(weighted * 0.6),
          delayed ? 'hidden_agenda_delayed' : 'hidden_agenda_filters_intel'
        )
      }

      if (query.channel === 'delay') {
        emit('delay', 'delay', delayed ? 40 : 20, 'hidden_agenda_delay_channel')
      }
      break
    }

    case 'proxy_representation': {
      const represented = nodeById.get(effectiveTargetId)
      if (query.channel === 'permission' || query.channel === 'aid') {
        emit(
          query.channel,
          'modify',
          Math.trunc(weighted * 0.7),
          represented
            ? `proxy_routes_${represented.nodeType}`
            : 'proxy_routes_represented_bloc'
        )
      }
      break
    }

    case 'shared_authority': {
      if (query.channel === 'permission') {
        emit('permission', 'modify', Math.trunc(weighted / 2), 'shared_authority_permission')
      }

      if (query.channel === 'secrecy') {
        emit('secrecy', 'modify', Math.trunc(weighted / 3), 'shared_authority_secrecy')
      }

      if (query.channel === 'local_compliance') {
        emit('local_compliance', 'modify', Math.trunc(weighted / 2), 'shared_authority_compliance')
      }
      break
    }

    case 'splinter':
    case 'front': {
      if (query.channel === 'permission') {
        emit('permission', 'flag', 15, `${edge.kind}_nonmonolithic_permission`)
      }

      if (query.channel === 'contradiction_flag') {
        emit('contradiction_flag', 'flag', 10, `${edge.kind}_internal_division`)
      }
      break
    }

    case 'subordination': {
      if (query.channel === 'permission') {
        const superiorIsPeer = peerId === edge.toNodeId
        emit(
          'permission',
          superiorIsPeer ? 'grant' : 'modify',
          superiorIsPeer ? weighted : Math.trunc(weighted / 3),
          'subordination_permission'
        )
      }
      break
    }

    case 'patronage': {
      if (query.channel === 'aid') {
        emit('aid', 'grant', weighted, 'patronage_aid')
      }

      if (query.channel === 'resource_release') {
        emit('resource_release', 'grant', Math.trunc(weighted / 2), 'patronage_resource_release')
      }
      break
    }

    case 'information_gate': {
      if (query.channel === 'information_flow') {
        emit(
          'information_flow',
          weighted >= 50 ? 'deny' : 'modify',
          weighted >= 50 ? -weighted : -Math.trunc(weighted / 2),
          'information_gate'
        )
      }
      break
    }

    default:
      break
  }
}

function clampStrength(value: number) {
  if (!Number.isFinite(value)) {
    return 50
  }

  return Math.max(0, Math.min(100, Math.trunc(value)))
}

function collectContradictionEdgeIds(graph: AuthorityGraph) {
  const ids = new Set<string>()
  for (const contradiction of detectContradictoryCurrentClaims(graph.edges)) {
    for (const edgeId of contradiction.edgeIds) {
      ids.add(edgeId)
    }
  }
  return ids
}

export function resolveAuthorityGraphConsequences(
  graph: AuthorityGraph,
  query: AuthorityGraphQuery
): readonly AuthorityConsequence[] {
  const actorId = normalizeAuthorityNodeId(graph, query.actorNodeId)
  if (!actorId) {
    return Object.freeze([])
  }

  const counterpartyId = query.counterpartyNodeId
    ? normalizeAuthorityNodeId(graph, query.counterpartyNodeId)
    : undefined

  const nodeById = buildNodeIndex(graph)
  const consequences: AuthorityConsequence[] = []
  const contradictionEdgeIds = collectContradictionEdgeIds(graph)

  if (query.channel === 'contradiction_flag' && contradictionEdgeIds.size > 0) {
    for (const edgeId of uniqueSorted([...contradictionEdgeIds])) {
      addConsequence(consequences, {
        channel: 'contradiction_flag',
        effect: 'flag',
        magnitude: 50,
        reasonCode: 'conflicting_current_claims',
        edgeIds: [edgeId],
        confidenceApplied: 'probable',
        delayed: false,
        contradicted: true,
      })
    }
  }

  for (const edge of graph.edges) {
    if (!edgeAppliesToQuery(edge, query, actorId, counterpartyId)) {
      continue
    }

    mapEdgeToConsequences(
      graph,
      edge,
      query,
      actorId,
      nodeById,
      consequences,
      contradictionEdgeIds
    )
  }

  if (
    query.channel !== 'contradiction_flag' &&
    contradictionEdgeIds.size > 0 &&
    consequences.every((consequence) => consequence.channel !== 'contradiction_flag')
  ) {
    addConsequence(consequences, {
      channel: 'contradiction_flag',
      effect: 'flag',
      magnitude: 25,
      reasonCode: 'conflicting_current_claims',
      edgeIds: uniqueSorted([...contradictionEdgeIds]),
      confidenceApplied: 'probable',
      delayed: false,
      contradicted: true,
    })
  }

  sortConsequences(consequences)

  return Object.freeze(
    consequences.map((consequence) =>
      Object.freeze({
        ...consequence,
        edgeIds: Object.freeze([...consequence.edgeIds]),
      })
    )
  )
}

export function collectAuthorityGraphTokens(graph: AuthorityGraph): readonly string[] {
  const tokens: string[] = []

  for (const node of graph.nodes) {
    tokens.push(node.id, node.label, node.nodeType)
    if (node.factionClass) {
      tokens.push(node.factionClass)
    }

    for (const alias of node.aliases ?? []) {
      tokens.push(alias.aliasId, alias.label)
    }

    for (const value of Object.values(node.metadata ?? {})) {
      if (typeof value === 'string') {
        tokens.push(value)
      }
    }
  }

  for (const edge of graph.edges) {
    tokens.push(edge.id, edge.kind, edge.fromNodeId, edge.toNodeId, edge.provenance.sourceTag)
    if (edge.notes) {
      tokens.push(edge.notes)
    }
  }

  return uniqueSorted(tokens)
}

export function authorityGraphTokensContainFranchiseReferences(tokens: readonly string[]) {
  return tokens.some((token) => FRANCHISE_TOKEN_PATTERN.test(token))
}
