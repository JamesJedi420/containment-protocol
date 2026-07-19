/**
 * SPE-2628 / SPE-956 slice 1: private hotline / direct-contact channel.
 * Pure deterministic evaluator — returns a frozen proposed-adjustment envelope.
 * Distinct from SPE-2620 community advisory influence and SPE-860 inquiry queues.
 * No GameState persistence, store, UI, or week-close coupling.
 */

export const HOTLINE_CALL_OUTCOMES = ['handled', 'escalated', 'unanswered', 'anger_only'] as const

export type HotlineCallOutcome = (typeof HOTLINE_CALL_OUTCOMES)[number]

export const HOTLINE_ADJUSTMENT_SCOPES = ['guidance', 'support_routing'] as const

export type HotlineAdjustmentScope = (typeof HOTLINE_ADJUSTMENT_SCOPES)[number]

export const HOTLINE_CALLER_MODES = ['inquiry', 'anger', 'pressure'] as const

export type HotlineCallerMode = (typeof HOTLINE_CALLER_MODES)[number]

export const HOTLINE_UNANSWERED_MODES = ['queue_callback', 'mark_unanswered'] as const

export type HotlineUnansweredMode = (typeof HOTLINE_UNANSWERED_MODES)[number]

export const HOTLINE_ANGER_MODES = ['deescalate', 'anger_only'] as const

export type HotlineAngerMode = (typeof HOTLINE_ANGER_MODES)[number]

export interface HotlineChannel {
  readonly id: string
  readonly scriptQuality: number
  readonly staffingCapacity: number
  readonly languageSupport: boolean
  readonly escalationRules: string
  readonly unansweredMode: HotlineUnansweredMode
  readonly angerMode: HotlineAngerMode
  readonly handleThreshold: number
}

export interface HotlineCall {
  readonly callId: string
  readonly channelId: string
  readonly callerMode: HotlineCallerMode
  readonly requiresLanguageSupport: boolean
  readonly proposedScope: HotlineAdjustmentScope
  readonly proposedValue: string
}

export interface HotlineGuidanceBaseline {
  readonly incidentId: string
  readonly guidance: string
  readonly supportRouting: string
}

export interface HotlineProposedAdjustment {
  readonly scope: HotlineAdjustmentScope
  readonly fromValue: string
  readonly toValue: string
}

export interface HotlineCallEvaluationInput {
  readonly channel?: HotlineChannel | null
  readonly call?: HotlineCall | null
  readonly baseline?: HotlineGuidanceBaseline | null
}

export interface HotlineCallEvaluationResult {
  readonly outcome: HotlineCallOutcome
  readonly channelId: string | null
  readonly callId: string | null
  readonly baseline: HotlineGuidanceBaseline
  readonly resolved: HotlineGuidanceBaseline
  readonly proposedAdjustment: HotlineProposedAdjustment | null
  readonly handleScore: number
  readonly handleThreshold: number
  readonly reasonCodes: readonly string[]
}

const EMPTY_BASELINE: HotlineGuidanceBaseline = Object.freeze({
  incidentId: 'incident:unknown',
  guidance: 'unchanged',
  supportRouting: 'unchanged',
})

const SCOPE_SET = new Set<string>(HOTLINE_ADJUSTMENT_SCOPES)
const CALLER_MODE_SET = new Set<string>(HOTLINE_CALLER_MODES)
const UNANSWERED_MODE_SET = new Set<string>(HOTLINE_UNANSWERED_MODES)
const ANGER_MODE_SET = new Set<string>(HOTLINE_ANGER_MODES)

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

function freezeBaseline(decision: HotlineGuidanceBaseline): HotlineGuidanceBaseline {
  return Object.freeze({
    incidentId: decision.incidentId,
    guidance: decision.guidance,
    supportRouting: decision.supportRouting,
  })
}

function cloneBaseline(decision: HotlineGuidanceBaseline): HotlineGuidanceBaseline {
  return freezeBaseline({ ...decision })
}

function freezeAdjustment(adjustment: HotlineProposedAdjustment): HotlineProposedAdjustment {
  return Object.freeze({ ...adjustment })
}

function freezeResult(result: HotlineCallEvaluationResult): HotlineCallEvaluationResult {
  return Object.freeze({
    outcome: result.outcome,
    channelId: result.channelId,
    callId: result.callId,
    baseline: freezeBaseline(result.baseline),
    resolved: freezeBaseline(result.resolved),
    proposedAdjustment: result.proposedAdjustment
      ? freezeAdjustment(result.proposedAdjustment)
      : null,
    handleScore: result.handleScore,
    handleThreshold: result.handleThreshold,
    reasonCodes: uniqueSorted(result.reasonCodes),
  })
}

function unansweredResult(
  reasonCodes: readonly string[],
  baseline: HotlineGuidanceBaseline = EMPTY_BASELINE,
  extras: {
    channelId?: string | null
    callId?: string | null
    handleScore?: number
    handleThreshold?: number
  } = {}
): HotlineCallEvaluationResult {
  const frozenBaseline = cloneBaseline(baseline)
  return freezeResult({
    outcome: 'unanswered',
    channelId: extras.channelId ?? null,
    callId: extras.callId ?? null,
    baseline: frozenBaseline,
    resolved: cloneBaseline(frozenBaseline),
    proposedAdjustment: null,
    handleScore: extras.handleScore ?? 0,
    handleThreshold: extras.handleThreshold ?? 0,
    reasonCodes,
  })
}

function readScopeValue(decision: HotlineGuidanceBaseline, scope: HotlineAdjustmentScope): string {
  switch (scope) {
    case 'guidance':
      return decision.guidance
    case 'support_routing':
      return decision.supportRouting
    default: {
      const _exhaustive: never = scope
      return _exhaustive
    }
  }
}

function applyAdjustment(
  decision: HotlineGuidanceBaseline,
  scope: HotlineAdjustmentScope,
  toValue: string
): HotlineGuidanceBaseline {
  switch (scope) {
    case 'guidance':
      return freezeBaseline({ ...decision, guidance: toValue })
    case 'support_routing':
      return freezeBaseline({ ...decision, supportRouting: toValue })
    default: {
      const _exhaustive: never = scope
      return _exhaustive
    }
  }
}

function isAdjustmentScope(value: unknown): value is HotlineAdjustmentScope {
  return typeof value === 'string' && SCOPE_SET.has(value)
}

function isCallerMode(value: unknown): value is HotlineCallerMode {
  return typeof value === 'string' && CALLER_MODE_SET.has(value)
}

function isUnansweredMode(value: unknown): value is HotlineUnansweredMode {
  return typeof value === 'string' && UNANSWERED_MODE_SET.has(value)
}

function isAngerMode(value: unknown): value is HotlineAngerMode {
  return typeof value === 'string' && ANGER_MODE_SET.has(value)
}

export function tryNormalizeHotlineGuidanceBaseline(
  value: unknown
): HotlineGuidanceBaseline | null {
  if (!isRecord(value)) {
    return null
  }

  const incidentId = normalizeToken(value.incidentId)
  const guidance = normalizeToken(value.guidance)
  const supportRouting = normalizeToken(value.supportRouting)

  if (!incidentId || !guidance || !supportRouting) {
    return null
  }

  return freezeBaseline({
    incidentId,
    guidance,
    supportRouting,
  })
}

/**
 * Evaluates whether a hotline call may adjust guidance or support routing.
 * Returns a proposed adjustment / resolved snapshot — never a parallel queue
 * or call-center dialogue store. Insufficient or missing inputs are no-ops.
 */
export function evaluateHotlineCall(
  input: HotlineCallEvaluationInput | null | undefined
): HotlineCallEvaluationResult {
  if (input === null || input === undefined) {
    return unansweredResult(['missing_evaluation_input'])
  }

  if (!isRecord(input)) {
    return unansweredResult(['invalid_evaluation_input'])
  }

  const rawBaseline = input.baseline
  if (rawBaseline === null || rawBaseline === undefined) {
    return unansweredResult(['missing_guidance_baseline'])
  }

  if (!isRecord(rawBaseline)) {
    return unansweredResult(['invalid_guidance_baseline'])
  }

  const baseline = tryNormalizeHotlineGuidanceBaseline(rawBaseline)
  if (!baseline) {
    return unansweredResult(['invalid_guidance_baseline'])
  }

  const rawChannel = input.channel
  if (rawChannel === null || rawChannel === undefined) {
    return unansweredResult(['missing_hotline_channel'], baseline)
  }

  if (!isRecord(rawChannel)) {
    return unansweredResult(['invalid_hotline_channel'], baseline)
  }

  const rawCall = input.call
  if (rawCall === null || rawCall === undefined) {
    return unansweredResult(['missing_hotline_call'], baseline, {
      channelId: normalizeToken((rawChannel as HotlineChannel).id) || null,
    })
  }

  if (!isRecord(rawCall)) {
    return unansweredResult(['invalid_hotline_call'], baseline, {
      channelId: normalizeToken((rawChannel as HotlineChannel).id) || null,
    })
  }

  const channel = rawChannel as HotlineChannel
  const call = rawCall as HotlineCall
  const channelId = normalizeToken(channel.id) || null
  const callId = normalizeToken(call.callId) || null
  const callChannelId = normalizeToken(call.channelId)
  const handleThreshold = isUnitInterval(channel.handleThreshold) ? channel.handleThreshold : 0
  const escalationRules = normalizeToken(channel.escalationRules)

  if (!channelId) {
    return unansweredResult(['missing_hotline_channel_id'], baseline)
  }

  if (!isUnitInterval(channel.scriptQuality) || !isUnitInterval(channel.staffingCapacity)) {
    return unansweredResult(['incomplete_hotline_channel'], baseline, {
      channelId,
      callId,
      handleThreshold,
    })
  }

  if (
    !escalationRules ||
    !isUnansweredMode(channel.unansweredMode) ||
    !isAngerMode(channel.angerMode) ||
    !isUnitInterval(channel.handleThreshold) ||
    typeof channel.languageSupport !== 'boolean'
  ) {
    return unansweredResult(['incomplete_hotline_channel'], baseline, {
      channelId,
      callId,
      handleThreshold,
    })
  }

  if (!callId) {
    return unansweredResult(['missing_hotline_call_id'], baseline, {
      channelId,
      handleThreshold,
    })
  }

  if (!isCallerMode(call.callerMode)) {
    return unansweredResult(['missing_or_invalid_caller_mode'], baseline, {
      channelId,
      callId,
      handleThreshold,
    })
  }

  if (typeof call.requiresLanguageSupport !== 'boolean') {
    return unansweredResult(['missing_or_invalid_language_flag'], baseline, {
      channelId,
      callId,
      handleThreshold,
    })
  }

  if (!isAdjustmentScope(call.proposedScope)) {
    return unansweredResult(['missing_or_invalid_proposed_scope'], baseline, {
      channelId,
      callId,
      handleThreshold,
    })
  }

  const proposedValue = normalizeToken(call.proposedValue)
  if (!proposedValue) {
    return unansweredResult(['missing_proposed_value'], baseline, {
      channelId,
      callId,
      handleThreshold,
    })
  }

  if (!callChannelId || callChannelId !== channelId) {
    return unansweredResult(['channel_call_mismatch', 'hotline_unanswered'], baseline, {
      channelId,
      callId,
      handleThreshold,
    })
  }

  const rawHandleScore = channel.scriptQuality * channel.staffingCapacity
  const handleScore = roundMetric(rawHandleScore)

  if (call.callerMode === 'anger' && channel.angerMode === 'anger_only') {
    return freezeResult({
      outcome: 'anger_only',
      channelId,
      callId,
      baseline,
      resolved: cloneBaseline(baseline),
      proposedAdjustment: null,
      handleScore,
      handleThreshold,
      reasonCodes: ['anger_only_mode'],
    })
  }

  if (call.requiresLanguageSupport && !channel.languageSupport) {
    return freezeResult({
      outcome: 'escalated',
      channelId,
      callId,
      baseline,
      resolved: cloneBaseline(baseline),
      proposedAdjustment: null,
      handleScore,
      handleThreshold,
      reasonCodes: ['hotline_escalated', 'language_unsupported'],
    })
  }

  if (rawHandleScore < channel.handleThreshold) {
    if (channel.unansweredMode === 'mark_unanswered') {
      return freezeResult({
        outcome: 'unanswered',
        channelId,
        callId,
        baseline,
        resolved: cloneBaseline(baseline),
        proposedAdjustment: null,
        handleScore,
        handleThreshold,
        reasonCodes: ['below_handle_threshold', 'hotline_unanswered'],
      })
    }

    return freezeResult({
      outcome: 'escalated',
      channelId,
      callId,
      baseline,
      resolved: cloneBaseline(baseline),
      proposedAdjustment: null,
      handleScore,
      handleThreshold,
      reasonCodes: ['below_handle_threshold', 'hotline_escalated'],
    })
  }

  const fromValue = readScopeValue(baseline, call.proposedScope)
  const proposedAdjustment = freezeAdjustment({
    scope: call.proposedScope,
    fromValue,
    toValue: proposedValue,
  })
  const resolved = applyAdjustment(baseline, call.proposedScope, proposedValue)

  return freezeResult({
    outcome: 'handled',
    channelId,
    callId,
    baseline,
    resolved,
    proposedAdjustment,
    handleScore,
    handleThreshold,
    reasonCodes: ['hotline_handled'],
  })
}

/** Authored riverside direct-contact hotline with script, staffing, and handling modes. */
export const EXAMPLE_HOTLINE_CHANNEL: HotlineChannel = Object.freeze({
  id: 'hotline:riverside-direct',
  scriptQuality: 0.85,
  staffingCapacity: 0.8,
  languageSupport: true,
  escalationRules:
    'Escalate language gaps and below-threshold staffing/script scores to the municipal liaison desk; queue callbacks only when unansweredMode is queue_callback.',
  unansweredMode: 'queue_callback',
  angerMode: 'anger_only',
  handleThreshold: 0.5,
})

/** Authored incident baseline for the riverside hotline fixture. */
export const EXAMPLE_HOTLINE_GUIDANCE_BASELINE: HotlineGuidanceBaseline = Object.freeze({
  incidentId: 'incident:riverside-site-breach',
  guidance: 'broadcast_hold_message',
  supportRouting: 'standard_ops_desk',
})

/** Authored inquiry call that materially changes support routing when handled. */
export const EXAMPLE_HOTLINE_CALL: HotlineCall = Object.freeze({
  callId: 'call:riverside-support-routing',
  channelId: 'hotline:riverside-direct',
  callerMode: 'inquiry',
  requiresLanguageSupport: false,
  proposedScope: 'support_routing',
  proposedValue: 'hotline_priority_callback',
})
