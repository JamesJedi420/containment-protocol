/**
 * SPE-788 slice 2: deterministic negotiation/bargaining outcomes over authority graph
 * consequences. Pure helper — no GameState, mission routing, UI, graph mutation, or
 * command-policy integration.
 */

import type {
  AuthorityConsequence,
  AuthorityConsequenceEffect,
  AuthorityGraph,
  AuthorityGraphEdge,
  AuthorityGraphQuery,
  AuthorityPressureChannel,
  AuthorityRelationshipKind,
  AuthoritySourceConfidence,
} from './authorityGraph'
import { normalizeAuthorityNodeId, resolveAuthorityGraphConsequences } from './authorityGraph'

export type AuthorityBargainingOutcome =
  | 'partial_cooperation'
  | 'symbolic_concession'
  | 'grudging_alignment'
  | 'procedural_block'
  | 'delayed_retaliation'
  | 'agenda_dilution'

export type AuthorityNegotiationStance =
  | 'cooperate'
  | 'stall'
  | 'extract_concession'
  | 'block_procedure'
  | 'symbolic_only'

export interface AuthorityNegotiationRequest {
  actorNodeId: string
  counterpartyNodeId: string
  channel: AuthorityPressureChannel
  asOfWeek: number
  stance: AuthorityNegotiationStance
  offerStrength?: number
  concessionCost?: number
  viewerConfidenceFloor?: AuthoritySourceConfidence
  includeContradictedClaims?: boolean
}

export interface AuthorityNegotiationAdjustment {
  channel: AuthorityPressureChannel
  effect: AuthorityConsequenceEffect
  magnitudeDelta: number
  reasonCode: string
}

export interface AuthorityNegotiationResult {
  outcome: AuthorityBargainingOutcome
  baselineConsequences: readonly AuthorityConsequence[]
  adjustments: readonly AuthorityNegotiationAdjustment[]
  effectiveConsequences: readonly AuthorityConsequence[]
  retaliationDueWeek?: number
  reasonCodes: readonly string[]
  contradicted: boolean
  delayed: boolean
}

const ACTIVE_STATUSES = new Set(['current', 'hidden'])

const AGENDA_CHANNELS: ReadonlySet<AuthorityPressureChannel> = new Set([
  'information_flow',
  'delay',
  'narrative_control',
])

const POSITIVE_RELATIONSHIP_KINDS: ReadonlySet<AuthorityRelationshipKind> = new Set([
  'alliance',
  'dependency',
  'patronage',
])

const ACCESS_CHANNELS: ReadonlySet<AuthorityPressureChannel> = new Set([
  'mission_access',
  'permission',
])

function normalizeToken(value: string) {
  return value.trim()
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.max(min, Math.min(max, Math.trunc(value)))
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  )
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

function edgeInvolvesNode(edge: AuthorityGraphEdge, nodeId: string) {
  if (edge.fromNodeId === nodeId || edge.toNodeId === nodeId) {
    return true
  }

  return edge.kind === 'proxy_representation' && edge.representsNodeId === nodeId
}

function edgeInvolvesPair(edge: AuthorityGraphEdge, actorId: string, counterpartyId: string) {
  return edgeInvolvesNode(edge, actorId) && edgeInvolvesNode(edge, counterpartyId)
}

function edgeAppliesToChannel(edge: AuthorityGraphEdge, channel: AuthorityPressureChannel) {
  if (!edge.pressureChannels || edge.pressureChannels.length === 0) {
    return true
  }

  return edge.pressureChannels.includes(channel)
}

interface PairGraphHints {
  activeKinds: ReadonlySet<AuthorityRelationshipKind>
  maxVolatility: number
}

function collectPairGraphHints(
  graph: AuthorityGraph,
  actorId: string,
  counterpartyId: string,
  asOfWeek: number,
  channel: AuthorityPressureChannel
): PairGraphHints {
  const activeKinds = new Set<AuthorityRelationshipKind>()
  let maxVolatility = 0

  for (const edge of graph.edges) {
    if (
      !edgeInvolvesPair(edge, actorId, counterpartyId) ||
      !edgeIsActive(edge, asOfWeek) ||
      !edgeAppliesToChannel(edge, channel)
    ) {
      continue
    }

    activeKinds.add(edge.kind)
    if (typeof edge.volatility === 'number' && Number.isFinite(edge.volatility)) {
      maxVolatility = Math.max(maxVolatility, clampInteger(edge.volatility, 0, 100))
    }
  }

  return { activeKinds, maxVolatility }
}

interface PressureSignature {
  channelNetMagnitude: number
  channelDenied: boolean
  channelDelayed: boolean
  contradicted: boolean
  delayed: boolean
  reasonCodes: readonly string[]
  positiveGrantOnChannel: boolean
  hostilityPressure: boolean
}

function buildPressureSignature(
  baseline: readonly AuthorityConsequence[],
  channel: AuthorityPressureChannel
): PressureSignature {
  let channelNetMagnitude = 0
  let channelDenied = false
  let channelDelayed = false
  let positiveGrantOnChannel = false
  let hostilityPressure = false
  let contradicted = false
  let delayed = false
  const reasonCodeSet = new Set<string>()

  for (const consequence of baseline) {
    reasonCodeSet.add(consequence.reasonCode)
    contradicted = contradicted || consequence.contradicted
    delayed = delayed || consequence.delayed

    if (consequence.channel === 'hostility') {
      hostilityPressure = hostilityPressure || consequence.magnitude > 0
    }

    if (consequence.channel !== channel) {
      continue
    }

    channelNetMagnitude += consequence.magnitude
    channelDenied = channelDenied || consequence.effect === 'deny'
    channelDelayed = channelDelayed || consequence.effect === 'delay' || consequence.delayed
    positiveGrantOnChannel =
      positiveGrantOnChannel ||
      ((consequence.effect === 'grant' || consequence.effect === 'modify') && consequence.magnitude > 0)
  }

  return {
    channelNetMagnitude,
    channelDenied,
    channelDelayed,
    contradicted,
    delayed,
    reasonCodes: uniqueSorted([...reasonCodeSet]),
    positiveGrantOnChannel,
    hostilityPressure,
  }
}

function baselineDeniesAccess(baseline: readonly AuthorityConsequence[]) {
  return baseline.some(
    (consequence) =>
      ACCESS_CHANNELS.has(consequence.channel) &&
      (consequence.effect === 'deny' || consequence.effect === 'delay')
  )
}

function hasPositiveRelationshipBaseline(
  baseline: readonly AuthorityConsequence[],
  hints: PairGraphHints
) {
  if (
    [...POSITIVE_RELATIONSHIP_KINDS].some((kind) => hints.activeKinds.has(kind))
  ) {
    return true
  }

  return baseline.some(
    (consequence) =>
      (consequence.channel === 'aid' ||
        consequence.channel === 'permission' ||
        consequence.channel === 'resource_release') &&
      (consequence.effect === 'grant' || consequence.effect === 'modify') &&
      consequence.magnitude > 0
  )
}

function classifyOutcome(
  request: AuthorityNegotiationRequest,
  baseline: readonly AuthorityConsequence[],
  signature: PressureSignature,
  hints: PairGraphHints,
  offerStrength: number,
  concessionCost: number
): { outcome: AuthorityBargainingOutcome; retaliationDueWeek?: number; reasonCodes: string[] } {
  const reasonCodes: string[] = []

  if (
    request.stance === 'block_procedure' ||
    baselineDeniesAccess(baseline) ||
    (ACCESS_CHANNELS.has(request.channel) && signature.channelDenied) ||
    offerStrength < 25
  ) {
    if (request.stance === 'block_procedure') {
      reasonCodes.push('negotiation_block_procedure_stance')
    }
    if (offerStrength < 25) {
      reasonCodes.push('negotiation_weak_offer')
    }
    if (signature.channelDenied || baselineDeniesAccess(baseline)) {
      reasonCodes.push('negotiation_access_denied')
    }
    return { outcome: 'procedural_block', reasonCodes: uniqueSorted(reasonCodes) }
  }

  const hasHostilityPressure =
    signature.hostilityPressure || hints.activeKinds.has('rivalry')

  if (
    request.stance === 'extract_concession' &&
    hasHostilityPressure &&
    concessionCost < 40
  ) {
    const offset = clampInteger(hints.maxVolatility > 0 ? Math.trunc(hints.maxVolatility / 15) + 2 : 4, 2, 8)
    reasonCodes.push('negotiation_extract_under_paid')
    return {
      outcome: 'delayed_retaliation',
      retaliationDueWeek: request.asOfWeek + offset,
      reasonCodes: uniqueSorted(reasonCodes),
    }
  }

  const agendaContext =
    hints.activeKinds.has('hidden_agenda') ||
    hints.activeKinds.has('information_gate') ||
    (AGENDA_CHANNELS.has(request.channel) && signature.channelDelayed) ||
    baseline.some(
      (consequence) =>
        AGENDA_CHANNELS.has(consequence.channel) &&
        (consequence.effect === 'delay' || consequence.delayed)
    )

  if (agendaContext || request.stance === 'stall') {
    reasonCodes.push(
      request.stance === 'stall' ? 'negotiation_stall_posture' : 'negotiation_agenda_pressure'
    )
    return { outcome: 'agenda_dilution', reasonCodes: uniqueSorted(reasonCodes) }
  }

  if (
    hints.activeKinds.has('shared_authority') ||
    signature.contradicted ||
    (hints.activeKinds.has('subordination') && offerStrength < 40)
  ) {
    if (signature.contradicted) {
      reasonCodes.push('negotiation_contradicted_baseline')
    }
    if (hints.activeKinds.has('shared_authority')) {
      reasonCodes.push('negotiation_shared_authority')
    }
    if (hints.activeKinds.has('subordination') && offerStrength < 40) {
      reasonCodes.push('negotiation_subordination_low_offer')
    }
    return { outcome: 'grudging_alignment', reasonCodes: uniqueSorted(reasonCodes) }
  }

  const weakBaseline =
    Math.abs(signature.channelNetMagnitude) < 30 &&
    !signature.positiveGrantOnChannel &&
    !signature.channelDenied

  if (request.stance === 'symbolic_only' || (offerStrength >= 50 && weakBaseline)) {
    reasonCodes.push(
      request.stance === 'symbolic_only'
        ? 'negotiation_symbolic_stance'
        : 'negotiation_high_offer_weak_baseline'
    )
    return { outcome: 'symbolic_concession', reasonCodes: uniqueSorted(reasonCodes) }
  }

  if (
    request.stance === 'cooperate' &&
    offerStrength >= 40 &&
    hasPositiveRelationshipBaseline(baseline, hints)
  ) {
    reasonCodes.push('negotiation_cooperative_positive_ties')
    return { outcome: 'partial_cooperation', reasonCodes: uniqueSorted(reasonCodes) }
  }

  reasonCodes.push('negotiation_default_block')
  return { outcome: 'procedural_block', reasonCodes: uniqueSorted(reasonCodes) }
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

function cloneConsequence(consequence: AuthorityConsequence): AuthorityConsequence {
  return {
    ...consequence,
    edgeIds: [...consequence.edgeIds],
  }
}

function buildAdjustments(
  outcome: AuthorityBargainingOutcome,
  request: AuthorityNegotiationRequest,
  baseline: readonly AuthorityConsequence[]
): AuthorityNegotiationAdjustment[] {
  const channel = request.channel
  const adjustments: AuthorityNegotiationAdjustment[] = []

  switch (outcome) {
    case 'partial_cooperation':
      adjustments.push({
        channel,
        effect: 'modify',
        magnitudeDelta: 25,
        reasonCode: 'negotiation_partial_cooperation_boost',
      })
      break

    case 'symbolic_concession':
      adjustments.push({
        channel: channel === 'aid' || channel === 'resource_release' ? channel : 'aid',
        effect: 'grant',
        magnitudeDelta: 12,
        reasonCode: 'negotiation_symbolic_grant',
      })
      break

    case 'grudging_alignment':
      adjustments.push({
        channel,
        effect: 'modify',
        magnitudeDelta: 15,
        reasonCode: 'negotiation_grudging_modify',
      })
      break

    case 'procedural_block':
      adjustments.push({
        channel,
        effect: 'deny',
        magnitudeDelta: -40,
        reasonCode: 'negotiation_procedural_block',
      })
      break

    case 'delayed_retaliation':
      adjustments.push({
        channel,
        effect: 'delay',
        magnitudeDelta: 20,
        reasonCode: 'negotiation_delayed_retaliation',
      })
      break

    case 'agenda_dilution':
      adjustments.push({
        channel: AGENDA_CHANNELS.has(channel) ? channel : 'information_flow',
        effect: 'delay',
        magnitudeDelta: 25,
        reasonCode: 'negotiation_agenda_dilution',
      })
      if (
        baseline.some(
          (consequence) =>
            consequence.channel === 'aid' && consequence.effect === 'grant' && consequence.magnitude > 0
        )
      ) {
        adjustments.push({
          channel: 'aid',
          effect: 'grant',
          magnitudeDelta: -15,
          reasonCode: 'negotiation_agenda_aid_trim',
        })
      } else if (channel === 'aid') {
        adjustments.push({
          channel: 'aid',
          effect: 'modify',
          magnitudeDelta: -15,
          reasonCode: 'negotiation_agenda_aid_trim',
        })
      }
      break

    default:
      break
  }

  return adjustments
}

function applyAdjustments(
  baseline: readonly AuthorityConsequence[],
  adjustments: readonly AuthorityNegotiationAdjustment[],
  signature: PressureSignature
): AuthorityConsequence[] {
  const effective = baseline.map(cloneConsequence)

  for (const adjustment of adjustments) {
    const match = effective.find(
      (consequence) =>
        consequence.channel === adjustment.channel && consequence.effect === adjustment.effect
    )

    if (match) {
      match.magnitude = clampInteger(match.magnitude + adjustment.magnitudeDelta, -100, 100)
      if (!match.reasonCode.startsWith('negotiation_')) {
        match.reasonCode = adjustment.reasonCode
      }
      continue
    }

    const template = baseline[0]
    effective.push({
      channel: adjustment.channel,
      effect: adjustment.effect,
      magnitude: clampInteger(adjustment.magnitudeDelta, -100, 100),
      reasonCode: adjustment.reasonCode,
      edgeIds: template ? [...template.edgeIds] : [],
      confidenceApplied: template?.confidenceApplied ?? 'probable',
      delayed: signature.delayed || adjustment.effect === 'delay',
      contradicted: signature.contradicted,
    })
  }

  sortConsequences(effective)
  return effective
}

function freezeConsequences(consequences: readonly AuthorityConsequence[]) {
  return Object.freeze(
    consequences.map((consequence) =>
      Object.freeze({
        ...consequence,
        edgeIds: Object.freeze([...consequence.edgeIds]),
      })
    )
  )
}

function buildGraphQuery(request: AuthorityNegotiationRequest): AuthorityGraphQuery {
  return {
    actorNodeId: request.actorNodeId,
    counterpartyNodeId: request.counterpartyNodeId,
    channel: request.channel,
    asOfWeek: request.asOfWeek,
    viewerConfidenceFloor: request.viewerConfidenceFloor,
    includeContradictedClaims: request.includeContradictedClaims,
  }
}

function emptyNegotiationResult(
  request: AuthorityNegotiationRequest,
  reasonCodes: readonly string[]
): AuthorityNegotiationResult {
  return Object.freeze({
    outcome: 'procedural_block',
    baselineConsequences: Object.freeze([]),
    adjustments: Object.freeze([
      Object.freeze({
        channel: request.channel,
        effect: 'deny',
        magnitudeDelta: -40,
        reasonCode: 'negotiation_procedural_block',
      }),
    ]),
    effectiveConsequences: Object.freeze([
      Object.freeze({
        channel: request.channel,
        effect: 'deny',
        magnitude: -40,
        reasonCode: 'negotiation_procedural_block',
        edgeIds: Object.freeze([]),
        confidenceApplied: 'probable',
        delayed: false,
        contradicted: false,
      }),
    ]),
    reasonCodes: Object.freeze([...reasonCodes]),
    contradicted: false,
    delayed: false,
  })
}

export function resolveAuthorityNegotiation(
  graph: AuthorityGraph,
  request: AuthorityNegotiationRequest
): AuthorityNegotiationResult {
  const actorId = normalizeAuthorityNodeId(graph, normalizeToken(request.actorNodeId))
  const counterpartyId = normalizeAuthorityNodeId(graph, normalizeToken(request.counterpartyNodeId))

  if (!actorId) {
    return emptyNegotiationResult(request, ['negotiation_unresolved_actor'])
  }

  if (!counterpartyId) {
    return emptyNegotiationResult(request, ['negotiation_unresolved_counterparty'])
  }

  const offerStrength = clampInteger(request.offerStrength ?? 50, 0, 100)
  const concessionCost = clampInteger(request.concessionCost ?? 40, 0, 100)

  const baseline = resolveAuthorityGraphConsequences(graph, buildGraphQuery(request))
  const hints = collectPairGraphHints(
    graph,
    actorId,
    counterpartyId,
    request.asOfWeek,
    request.channel
  )
  const signature = buildPressureSignature(baseline, request.channel)

  const classification = classifyOutcome(
    request,
    baseline,
    signature,
    hints,
    offerStrength,
    concessionCost
  )

  const adjustments = buildAdjustments(classification.outcome, request, baseline)
  const effective = applyAdjustments(baseline, adjustments, signature)
  const effectiveDelayed = effective.some(
    (consequence) => consequence.delayed || consequence.effect === 'delay'
  )
  const adjustmentDelayed = adjustments.some((adjustment) => adjustment.effect === 'delay')

  const resultReasonCodes = uniqueSorted([
    ...classification.reasonCodes,
    ...adjustments.map((adjustment) => adjustment.reasonCode),
  ])

  return Object.freeze({
    outcome: classification.outcome,
    baselineConsequences: freezeConsequences(baseline),
    adjustments: Object.freeze(adjustments.map((adjustment) => Object.freeze({ ...adjustment }))),
    effectiveConsequences: freezeConsequences(effective),
    retaliationDueWeek: classification.retaliationDueWeek,
    reasonCodes: Object.freeze(resultReasonCodes),
    contradicted: signature.contradicted,
    delayed:
      signature.delayed ||
      classification.outcome === 'delayed_retaliation' ||
      effectiveDelayed ||
      adjustmentDelayed,
  })
}
