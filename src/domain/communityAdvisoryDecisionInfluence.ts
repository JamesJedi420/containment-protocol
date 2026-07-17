/**
 * SPE-2620 / SPE-956 slice 1: community advisory body decision influence.
 * Pure deterministic evaluator — returns a frozen proposed-adjustment envelope.
 * Distinct from operational team advisories in `advisory.ts`.
 * No GameState persistence, store, UI, or week-close coupling.
 */

export const COMMUNITY_ADVISORY_DECISION_SCOPES = [
  'response_timing',
  'restriction_level',
  'framing',
  'support_routing',
] as const

export type CommunityAdvisoryDecisionScope = (typeof COMMUNITY_ADVISORY_DECISION_SCOPES)[number]

export const COMMUNITY_ADVISORY_SUPPORT_BANDS = ['low', 'moderate', 'strong', 'unanimous'] as const

export type CommunityAdvisorySupportBand = (typeof COMMUNITY_ADVISORY_SUPPORT_BANDS)[number]

export const COMMUNITY_ADVISORY_URGENCIES = ['routine', 'elevated', 'urgent'] as const

export type CommunityAdvisoryUrgency = (typeof COMMUNITY_ADVISORY_URGENCIES)[number]

export const COMMUNITY_ADVISORY_DISPOSITIONS = [
  'adopted',
  'modified',
  'deferred',
  'rejected',
] as const

export type CommunityAdvisoryDisposition = (typeof COMMUNITY_ADVISORY_DISPOSITIONS)[number]

export const SUPPORT_BAND_WEIGHT: Readonly<Record<CommunityAdvisorySupportBand, number>> =
  Object.freeze({
    low: 0.25,
    moderate: 0.5,
    strong: 0.75,
    unanimous: 1,
  })

export interface CommunityAdvisoryBody {
  readonly id: string
  readonly mission: string
  readonly membershipRule: string
  readonly representedStakeholderClasses: readonly string[]
  readonly authorizedDecisionScopes: readonly CommunityAdvisoryDecisionScope[]
  readonly influenceThreshold: number
  readonly decisionCriteria: string
}

export interface CommunityAdvisoryRecommendation {
  readonly scope: CommunityAdvisoryDecisionScope
  readonly proposedValue: string
}

export interface CommunityAdvisorySignal {
  readonly bodyId: string
  readonly recommendation: CommunityAdvisoryRecommendation
  readonly supportBand: CommunityAdvisorySupportBand
  readonly confidence: number
  readonly urgency: CommunityAdvisoryUrgency
  readonly conditions?: readonly string[]
}

export interface IncidentResponseDecision {
  readonly incidentId: string
  readonly responseTiming: string
  readonly restrictionLevel: string
  readonly framing: string
  readonly supportRouting: string
}

export interface CommunityAdvisoryProposedAdjustment {
  readonly scope: CommunityAdvisoryDecisionScope
  readonly fromValue: string
  readonly toValue: string
}

export interface CommunityAdvisoryInfluenceEvaluationInput {
  readonly body?: CommunityAdvisoryBody | null
  readonly signal?: CommunityAdvisorySignal | null
  readonly baseline?: IncidentResponseDecision | null
}

export interface CommunityAdvisoryInfluenceResult {
  readonly disposition: CommunityAdvisoryDisposition
  readonly bodyId: string | null
  readonly baseline: IncidentResponseDecision
  readonly resolved: IncidentResponseDecision
  readonly proposedAdjustment: CommunityAdvisoryProposedAdjustment | null
  readonly supportScore: number
  readonly influenceThreshold: number
  readonly conditions: readonly string[]
  readonly reasonCodes: readonly string[]
}

const EMPTY_BASELINE: IncidentResponseDecision = Object.freeze({
  incidentId: 'incident:unknown',
  responseTiming: 'unchanged',
  restrictionLevel: 'unchanged',
  framing: 'unchanged',
  supportRouting: 'unchanged',
})

const SCOPE_SET = new Set<string>(COMMUNITY_ADVISORY_DECISION_SCOPES)
const SUPPORT_BAND_SET = new Set<string>(COMMUNITY_ADVISORY_SUPPORT_BANDS)
const URGENCY_SET = new Set<string>(COMMUNITY_ADVISORY_URGENCIES)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
      (left, right) => left.localeCompare(right)
    )
  )
}

function isUnitInterval(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function isPositiveUnitInterval(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1
}

function roundMetric(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  const scaled = value * 1_000_000
  if (!Number.isFinite(scaled)) {
    return value
  }

  return Math.round(scaled) / 1_000_000
}

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function tryNormalizeConditions(
  values: unknown
): { readonly ok: true; readonly conditions: readonly string[] } | { readonly ok: false } {
  if (values === undefined) {
    return { ok: true, conditions: Object.freeze([]) }
  }

  if (!Array.isArray(values)) {
    return { ok: false }
  }

  for (const value of values) {
    if (typeof value !== 'string') {
      return { ok: false }
    }
  }

  return {
    ok: true,
    conditions: uniqueSorted(
      values.map((value) => value.trim()).filter((value) => value.length > 0)
    ),
  }
}

function freezeBaseline(decision: IncidentResponseDecision): IncidentResponseDecision {
  return Object.freeze({
    incidentId: decision.incidentId,
    responseTiming: decision.responseTiming,
    restrictionLevel: decision.restrictionLevel,
    framing: decision.framing,
    supportRouting: decision.supportRouting,
  })
}

function cloneBaseline(decision: IncidentResponseDecision): IncidentResponseDecision {
  return freezeBaseline({ ...decision })
}

function freezeAdjustment(
  adjustment: CommunityAdvisoryProposedAdjustment
): CommunityAdvisoryProposedAdjustment {
  return Object.freeze({ ...adjustment })
}

function freezeResult(result: CommunityAdvisoryInfluenceResult): CommunityAdvisoryInfluenceResult {
  return Object.freeze({
    disposition: result.disposition,
    bodyId: result.bodyId,
    baseline: freezeBaseline(result.baseline),
    resolved: freezeBaseline(result.resolved),
    proposedAdjustment: result.proposedAdjustment
      ? freezeAdjustment(result.proposedAdjustment)
      : null,
    supportScore: result.supportScore,
    influenceThreshold: result.influenceThreshold,
    conditions: Object.freeze([...result.conditions]),
    reasonCodes: uniqueSorted(result.reasonCodes),
  })
}

function emptyDeferredResult(
  reasonCodes: readonly string[],
  baseline: IncidentResponseDecision = EMPTY_BASELINE,
  extras: {
    bodyId?: string | null
    supportScore?: number
    influenceThreshold?: number
    conditions?: readonly string[]
  } = {}
): CommunityAdvisoryInfluenceResult {
  const frozenBaseline = cloneBaseline(baseline)
  return freezeResult({
    disposition: 'deferred',
    bodyId: extras.bodyId ?? null,
    baseline: frozenBaseline,
    resolved: cloneBaseline(frozenBaseline),
    proposedAdjustment: null,
    supportScore: extras.supportScore ?? 0,
    influenceThreshold: extras.influenceThreshold ?? 0,
    conditions: extras.conditions ?? Object.freeze([]),
    reasonCodes,
  })
}

function emptyRejectedResult(
  reasonCodes: readonly string[],
  baseline: IncidentResponseDecision,
  extras: {
    bodyId?: string | null
    supportScore?: number
    influenceThreshold?: number
    conditions?: readonly string[]
  } = {}
): CommunityAdvisoryInfluenceResult {
  const frozenBaseline = cloneBaseline(baseline)
  return freezeResult({
    disposition: 'rejected',
    bodyId: extras.bodyId ?? null,
    baseline: frozenBaseline,
    resolved: cloneBaseline(frozenBaseline),
    proposedAdjustment: null,
    supportScore: extras.supportScore ?? 0,
    influenceThreshold: extras.influenceThreshold ?? 0,
    conditions: extras.conditions ?? Object.freeze([]),
    reasonCodes,
  })
}

function readScopeValue(
  decision: IncidentResponseDecision,
  scope: CommunityAdvisoryDecisionScope
): string {
  switch (scope) {
    case 'response_timing':
      return decision.responseTiming
    case 'restriction_level':
      return decision.restrictionLevel
    case 'framing':
      return decision.framing
    case 'support_routing':
      return decision.supportRouting
    default: {
      const _exhaustive: never = scope
      return _exhaustive
    }
  }
}

function applyAdjustment(
  decision: IncidentResponseDecision,
  scope: CommunityAdvisoryDecisionScope,
  toValue: string
): IncidentResponseDecision {
  switch (scope) {
    case 'response_timing':
      return freezeBaseline({ ...decision, responseTiming: toValue })
    case 'restriction_level':
      return freezeBaseline({ ...decision, restrictionLevel: toValue })
    case 'framing':
      return freezeBaseline({ ...decision, framing: toValue })
    case 'support_routing':
      return freezeBaseline({ ...decision, supportRouting: toValue })
    default: {
      const _exhaustive: never = scope
      return _exhaustive
    }
  }
}

function isDecisionScope(value: unknown): value is CommunityAdvisoryDecisionScope {
  return typeof value === 'string' && SCOPE_SET.has(value)
}

function isSupportBand(value: unknown): value is CommunityAdvisorySupportBand {
  return typeof value === 'string' && SUPPORT_BAND_SET.has(value)
}

function isUrgency(value: unknown): value is CommunityAdvisoryUrgency {
  return typeof value === 'string' && URGENCY_SET.has(value)
}

function tryNormalizeBaseline(value: unknown): IncidentResponseDecision | null {
  if (!isRecord(value)) {
    return null
  }

  const incidentId = normalizeToken(value.incidentId)
  const responseTiming = normalizeToken(value.responseTiming)
  const restrictionLevel = normalizeToken(value.restrictionLevel)
  const framing = normalizeToken(value.framing)
  const supportRouting = normalizeToken(value.supportRouting)

  if (!incidentId || !responseTiming || !restrictionLevel || !framing || !supportRouting) {
    return null
  }

  return freezeBaseline({
    incidentId,
    responseTiming,
    restrictionLevel,
    framing,
    supportRouting,
  })
}

/**
 * Evaluates whether a community advisory signal may adjust an incident response
 * decision. Returns a proposed adjustment / resolved snapshot — never a parallel
 * policy store. Insufficient or missing signals are no-ops.
 */
export function evaluateCommunityAdvisoryDecisionInfluence(
  input: CommunityAdvisoryInfluenceEvaluationInput | null | undefined
): CommunityAdvisoryInfluenceResult {
  if (input === null || input === undefined) {
    return emptyDeferredResult(['missing_evaluation_input'])
  }

  if (!isRecord(input)) {
    return emptyDeferredResult(['invalid_evaluation_input'])
  }

  const rawBaseline = input.baseline
  if (rawBaseline === null || rawBaseline === undefined) {
    return emptyDeferredResult(['missing_incident_baseline'])
  }

  if (!isRecord(rawBaseline)) {
    return emptyDeferredResult(['invalid_incident_baseline'])
  }

  const baseline = tryNormalizeBaseline(rawBaseline)
  if (!baseline) {
    return emptyDeferredResult(['invalid_incident_baseline'])
  }

  const rawBody = input.body
  if (rawBody === null || rawBody === undefined) {
    return emptyDeferredResult(['missing_advisory_body'], baseline)
  }

  if (!isRecord(rawBody)) {
    return emptyDeferredResult(['invalid_advisory_body'], baseline)
  }

  const rawSignal = input.signal
  if (rawSignal === null || rawSignal === undefined) {
    return emptyDeferredResult(['missing_advisory_signal'], baseline, {
      bodyId: normalizeToken((rawBody as CommunityAdvisoryBody).id) || null,
    })
  }

  if (!isRecord(rawSignal)) {
    return emptyDeferredResult(['invalid_advisory_signal'], baseline, {
      bodyId: normalizeToken((rawBody as CommunityAdvisoryBody).id) || null,
    })
  }

  const body = rawBody as CommunityAdvisoryBody
  const signal = rawSignal as CommunityAdvisorySignal
  const bodyId = normalizeToken(body.id) || null
  const signalBodyId = normalizeToken(signal.bodyId)
  const influenceThreshold = isPositiveUnitInterval(body.influenceThreshold)
    ? body.influenceThreshold
    : 0
  const authorizedScopes = Array.isArray(body.authorizedDecisionScopes)
    ? body.authorizedDecisionScopes.filter(isDecisionScope)
    : []
  const mission = normalizeToken(body.mission)
  const membershipRule = normalizeToken(body.membershipRule)
  const decisionCriteria = normalizeToken(body.decisionCriteria)
  const stakeholderClasses = Array.isArray(body.representedStakeholderClasses)
    ? body.representedStakeholderClasses
        .map((value) => normalizeToken(value))
        .filter((value) => value.length > 0)
    : []

  if (!bodyId) {
    return emptyDeferredResult(['missing_advisory_body_id'], baseline)
  }

  if (!mission || !membershipRule || !decisionCriteria || stakeholderClasses.length === 0) {
    return emptyDeferredResult(['incomplete_advisory_body'], baseline, {
      bodyId,
      influenceThreshold,
    })
  }

  if (!isPositiveUnitInterval(body.influenceThreshold)) {
    return emptyDeferredResult(['missing_or_invalid_influence_threshold'], baseline, {
      bodyId,
    })
  }

  if (authorizedScopes.length === 0) {
    return emptyDeferredResult(['missing_authorized_decision_scopes'], baseline, {
      bodyId,
      influenceThreshold,
    })
  }

  const normalizedConditions = tryNormalizeConditions(signal.conditions)
  if (!normalizedConditions.ok) {
    return emptyDeferredResult(['invalid_advisory_conditions'], baseline, {
      bodyId,
      influenceThreshold,
    })
  }
  const conditions = normalizedConditions.conditions

  const recommendation = signal.recommendation
  if (!isRecord(recommendation) || !isDecisionScope(recommendation.scope)) {
    return emptyDeferredResult(['missing_or_invalid_recommendation_scope'], baseline, {
      bodyId,
      influenceThreshold,
      conditions,
    })
  }

  const proposedValue = normalizeToken(recommendation.proposedValue)
  if (!proposedValue) {
    return emptyDeferredResult(['missing_recommendation_value'], baseline, {
      bodyId,
      influenceThreshold,
      conditions,
    })
  }

  if (!isSupportBand(signal.supportBand)) {
    return emptyDeferredResult(['missing_or_invalid_support_band'], baseline, {
      bodyId,
      influenceThreshold,
      conditions,
    })
  }

  if (!isUnitInterval(signal.confidence)) {
    return emptyDeferredResult(['missing_or_invalid_confidence'], baseline, {
      bodyId,
      influenceThreshold,
      conditions,
    })
  }

  if (!isUrgency(signal.urgency)) {
    return emptyDeferredResult(['missing_or_invalid_urgency'], baseline, {
      bodyId,
      influenceThreshold,
      conditions,
    })
  }

  if (!signalBodyId || signalBodyId !== bodyId) {
    return emptyRejectedResult(['advisory_rejected', 'body_signal_mismatch'], baseline, {
      bodyId,
      influenceThreshold,
      conditions,
    })
  }

  if (!authorizedScopes.includes(recommendation.scope)) {
    return emptyRejectedResult(['advisory_rejected', 'recommendation_out_of_scope'], baseline, {
      bodyId,
      influenceThreshold,
      conditions,
    })
  }

  const rawSupportScore = SUPPORT_BAND_WEIGHT[signal.supportBand] * signal.confidence
  const supportScore = roundMetric(rawSupportScore)

  if (rawSupportScore < influenceThreshold) {
    const deferForUrgency = signal.urgency === 'elevated' || signal.urgency === 'urgent'
    if (deferForUrgency) {
      return freezeResult({
        disposition: 'deferred',
        bodyId,
        baseline,
        resolved: cloneBaseline(baseline),
        proposedAdjustment: null,
        supportScore,
        influenceThreshold,
        conditions,
        reasonCodes: ['advisory_deferred', 'below_influence_threshold'],
      })
    }

    return emptyRejectedResult(['advisory_rejected', 'below_influence_threshold'], baseline, {
      bodyId,
      supportScore,
      influenceThreshold,
      conditions,
    })
  }

  const fromValue = readScopeValue(baseline, recommendation.scope)
  const proposedAdjustment = freezeAdjustment({
    scope: recommendation.scope,
    fromValue,
    toValue: proposedValue,
  })
  const resolved = applyAdjustment(baseline, recommendation.scope, proposedValue)

  if (conditions.length > 0) {
    return freezeResult({
      disposition: 'modified',
      bodyId,
      baseline,
      resolved,
      proposedAdjustment,
      supportScore,
      influenceThreshold,
      conditions,
      reasonCodes: ['advisory_modified_with_conditions'],
    })
  }

  return freezeResult({
    disposition: 'adopted',
    bodyId,
    baseline,
    resolved,
    proposedAdjustment,
    supportScore,
    influenceThreshold,
    conditions,
    reasonCodes: ['advisory_adopted'],
  })
}

/** Authored advisory body: riverside stakeholders with bounded incident influence. */
export const EXAMPLE_COMMUNITY_ADVISORY_BODY: CommunityAdvisoryBody = Object.freeze({
  id: 'advisory-body:riverside-stakeholders',
  mission:
    'Represent local residents and survivors when incident response framing, timing, or support routing affects the community.',
  membershipRule:
    'Two resident delegates, one survivor advocate, one municipal liaison; rotating chair by authored roster.',
  representedStakeholderClasses: Object.freeze([
    'local_residents',
    'survivors',
    'municipal_liaison',
  ]),
  authorizedDecisionScopes: Object.freeze([
    'framing',
    'response_timing',
    'support_routing',
  ] as const satisfies readonly CommunityAdvisoryDecisionScope[]),
  influenceThreshold: 0.6,
  decisionCriteria:
    'Adopt when support band × confidence meets the authored influence threshold and the recommendation stays inside authorized scopes; otherwise defer or reject without changing the incident baseline.',
})

/** Authored incident baseline for the riverside advisory fixture. */
export const EXAMPLE_INCIDENT_BASELINE: IncidentResponseDecision = Object.freeze({
  incidentId: 'incident:riverside-site-breach',
  responseTiming: 'immediate_deploy',
  restrictionLevel: 'soft_perimeter',
  framing: 'agency_first_brief',
  supportRouting: 'standard_ops_desk',
})

/** Authored signal that materially changes support routing when adopted. */
export const EXAMPLE_SUPPORT_ROUTING_SIGNAL: CommunityAdvisorySignal = Object.freeze({
  bodyId: 'advisory-body:riverside-stakeholders',
  recommendation: Object.freeze({
    scope: 'support_routing' as const,
    proposedValue: 'community_liaison_first',
  }),
  supportBand: 'strong',
  confidence: 0.9,
  urgency: 'elevated',
})
