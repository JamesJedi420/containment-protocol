/**
 * SPE-2629 / SPE-956 slice 1: async / transcript discussion surface.
 * Pure deterministic evaluator — returns a frozen proposed-adjustment envelope.
 * Distinct from SPE-2620 community advisory influence and SPE-2628 hotline.
 * No GameState persistence, store, UI, or week-close coupling.
 */

export const DISCUSSION_SESSION_OUTCOMES = ['recorded', 'widened', 'deferred', 'rejected'] as const

export type DiscussionSessionOutcome = (typeof DISCUSSION_SESSION_OUTCOMES)[number]

export const TRANSCRIPT_RETENTION_MODES = ['ephemeral', 'session_bound', 'institutional'] as const

export type TranscriptRetentionMode = (typeof TRANSCRIPT_RETENTION_MODES)[number]

export const DISCUSSION_WIDENING_RULES = ['closed', 'invite_extend', 'open_async'] as const

export type DiscussionWideningRule = (typeof DISCUSSION_WIDENING_RULES)[number]

export const DISCUSSION_ADJUSTMENT_SCOPES = ['participation', 'institutional_memory'] as const

export type DiscussionAdjustmentScope = (typeof DISCUSSION_ADJUSTMENT_SCOPES)[number]

export const DISCUSSION_SESSION_INTENTS = ['record', 'widen', 'stabilize_memory'] as const

export type DiscussionSessionIntent = (typeof DISCUSSION_SESSION_INTENTS)[number]

export interface DiscussionParticipationWindow {
  readonly startWeek: number
  readonly endWeek: number
}

export interface DiscussionSurface {
  readonly id: string
  readonly participationWindow: DiscussionParticipationWindow
  readonly transcriptRetentionMode: TranscriptRetentionMode
  readonly wideningRule: DiscussionWideningRule
  readonly memoryStabilization: boolean
}

export interface DiscussionSession {
  readonly sessionId: string
  readonly surfaceId: string
  readonly week: number
  readonly intent: DiscussionSessionIntent
  readonly proposedScope: DiscussionAdjustmentScope
  readonly proposedValue: string
}

export interface DiscussionMemoryBaseline {
  readonly topicId: string
  readonly participation: string
  readonly institutionalMemory: string
}

export interface DiscussionProposedAdjustment {
  readonly scope: DiscussionAdjustmentScope
  readonly fromValue: string
  readonly toValue: string
}

export interface DiscussionSessionEvaluationInput {
  readonly surface?: DiscussionSurface | null
  readonly session?: DiscussionSession | null
  readonly baseline?: DiscussionMemoryBaseline | null
}

export interface DiscussionSessionEvaluationResult {
  readonly outcome: DiscussionSessionOutcome
  readonly surfaceId: string | null
  readonly sessionId: string | null
  readonly baseline: DiscussionMemoryBaseline
  readonly resolved: DiscussionMemoryBaseline
  readonly proposedAdjustment: DiscussionProposedAdjustment | null
  readonly reasonCodes: readonly string[]
}

const EMPTY_BASELINE: DiscussionMemoryBaseline = Object.freeze({
  topicId: 'topic:unknown',
  participation: 'unchanged',
  institutionalMemory: 'unchanged',
})

const RETENTION_SET = new Set<string>(TRANSCRIPT_RETENTION_MODES)
const WIDENING_SET = new Set<string>(DISCUSSION_WIDENING_RULES)
const SCOPE_SET = new Set<string>(DISCUSSION_ADJUSTMENT_SCOPES)
const INTENT_SET = new Set<string>(DISCUSSION_SESSION_INTENTS)

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

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function freezeBaseline(decision: DiscussionMemoryBaseline): DiscussionMemoryBaseline {
  return Object.freeze({
    topicId: decision.topicId,
    participation: decision.participation,
    institutionalMemory: decision.institutionalMemory,
  })
}

function cloneBaseline(decision: DiscussionMemoryBaseline): DiscussionMemoryBaseline {
  return freezeBaseline({ ...decision })
}

function freezeAdjustment(adjustment: DiscussionProposedAdjustment): DiscussionProposedAdjustment {
  return Object.freeze({ ...adjustment })
}

function freezeResult(
  result: DiscussionSessionEvaluationResult
): DiscussionSessionEvaluationResult {
  return Object.freeze({
    outcome: result.outcome,
    surfaceId: result.surfaceId,
    sessionId: result.sessionId,
    baseline: freezeBaseline(result.baseline),
    resolved: freezeBaseline(result.resolved),
    proposedAdjustment: result.proposedAdjustment
      ? freezeAdjustment(result.proposedAdjustment)
      : null,
    reasonCodes: uniqueSorted(result.reasonCodes),
  })
}

function deferredResult(
  reasonCodes: readonly string[],
  baseline: DiscussionMemoryBaseline = EMPTY_BASELINE,
  extras: {
    surfaceId?: string | null
    sessionId?: string | null
  } = {}
): DiscussionSessionEvaluationResult {
  const frozenBaseline = cloneBaseline(baseline)
  return freezeResult({
    outcome: 'deferred',
    surfaceId: extras.surfaceId ?? null,
    sessionId: extras.sessionId ?? null,
    baseline: frozenBaseline,
    resolved: cloneBaseline(frozenBaseline),
    proposedAdjustment: null,
    reasonCodes,
  })
}

function rejectedResult(
  reasonCodes: readonly string[],
  baseline: DiscussionMemoryBaseline,
  extras: {
    surfaceId?: string | null
    sessionId?: string | null
  } = {}
): DiscussionSessionEvaluationResult {
  const frozenBaseline = cloneBaseline(baseline)
  return freezeResult({
    outcome: 'rejected',
    surfaceId: extras.surfaceId ?? null,
    sessionId: extras.sessionId ?? null,
    baseline: frozenBaseline,
    resolved: cloneBaseline(frozenBaseline),
    proposedAdjustment: null,
    reasonCodes,
  })
}

function readScopeValue(
  decision: DiscussionMemoryBaseline,
  scope: DiscussionAdjustmentScope
): string {
  switch (scope) {
    case 'participation':
      return decision.participation
    case 'institutional_memory':
      return decision.institutionalMemory
    default: {
      const _exhaustive: never = scope
      return _exhaustive
    }
  }
}

function applyAdjustment(
  decision: DiscussionMemoryBaseline,
  scope: DiscussionAdjustmentScope,
  toValue: string
): DiscussionMemoryBaseline {
  switch (scope) {
    case 'participation':
      return freezeBaseline({ ...decision, participation: toValue })
    case 'institutional_memory':
      return freezeBaseline({ ...decision, institutionalMemory: toValue })
    default: {
      const _exhaustive: never = scope
      return _exhaustive
    }
  }
}

function isRetentionMode(value: unknown): value is TranscriptRetentionMode {
  return typeof value === 'string' && RETENTION_SET.has(value)
}

function isWideningRule(value: unknown): value is DiscussionWideningRule {
  return typeof value === 'string' && WIDENING_SET.has(value)
}

function isAdjustmentScope(value: unknown): value is DiscussionAdjustmentScope {
  return typeof value === 'string' && SCOPE_SET.has(value)
}

function isSessionIntent(value: unknown): value is DiscussionSessionIntent {
  return typeof value === 'string' && INTENT_SET.has(value)
}

function tryNormalizeBaseline(value: unknown): DiscussionMemoryBaseline | null {
  if (!isRecord(value)) {
    return null
  }

  const topicId = normalizeToken(value.topicId)
  const participation = normalizeToken(value.participation)
  const institutionalMemory = normalizeToken(value.institutionalMemory)

  if (!topicId || !participation || !institutionalMemory) {
    return null
  }

  return freezeBaseline({
    topicId,
    participation,
    institutionalMemory,
  })
}

function isValidWindow(window: unknown): window is DiscussionParticipationWindow {
  if (!isRecord(window)) {
    return false
  }

  if (!isNonNegativeInt(window.startWeek) || !isNonNegativeInt(window.endWeek)) {
    return false
  }

  return window.startWeek <= window.endWeek
}

/**
 * Evaluates whether an async discussion session may widen participation or
 * preserve institutional memory. Returns a proposed adjustment / resolved
 * snapshot — never a forum or elections store. Insufficient or missing inputs
 * are no-ops.
 */
export function evaluateAsyncDiscussionSession(
  input: DiscussionSessionEvaluationInput | null | undefined
): DiscussionSessionEvaluationResult {
  if (input === null || input === undefined) {
    return deferredResult(['missing_evaluation_input'])
  }

  if (!isRecord(input)) {
    return deferredResult(['invalid_evaluation_input'])
  }

  const rawBaseline = input.baseline
  if (rawBaseline === null || rawBaseline === undefined) {
    return deferredResult(['missing_discussion_baseline'])
  }

  if (!isRecord(rawBaseline)) {
    return deferredResult(['invalid_discussion_baseline'])
  }

  const baseline = tryNormalizeBaseline(rawBaseline)
  if (!baseline) {
    return deferredResult(['invalid_discussion_baseline'])
  }

  const rawSurface = input.surface
  if (rawSurface === null || rawSurface === undefined) {
    return deferredResult(['missing_discussion_surface'], baseline)
  }

  if (!isRecord(rawSurface)) {
    return deferredResult(['invalid_discussion_surface'], baseline)
  }

  const rawSession = input.session
  if (rawSession === null || rawSession === undefined) {
    return deferredResult(['missing_discussion_session'], baseline, {
      surfaceId: normalizeToken((rawSurface as DiscussionSurface).id) || null,
    })
  }

  if (!isRecord(rawSession)) {
    return deferredResult(['invalid_discussion_session'], baseline, {
      surfaceId: normalizeToken((rawSurface as DiscussionSurface).id) || null,
    })
  }

  const surface = rawSurface as DiscussionSurface
  const session = rawSession as DiscussionSession
  const surfaceId = normalizeToken(surface.id) || null
  const sessionId = normalizeToken(session.sessionId) || null
  const sessionSurfaceId = normalizeToken(session.surfaceId)

  if (!surfaceId) {
    return deferredResult(['missing_discussion_surface_id'], baseline)
  }

  if (
    !isValidWindow(surface.participationWindow) ||
    !isRetentionMode(surface.transcriptRetentionMode) ||
    !isWideningRule(surface.wideningRule) ||
    typeof surface.memoryStabilization !== 'boolean'
  ) {
    return deferredResult(['incomplete_discussion_surface'], baseline, {
      surfaceId,
      sessionId,
    })
  }

  if (!sessionId) {
    return deferredResult(['missing_discussion_session_id'], baseline, {
      surfaceId,
    })
  }

  if (!isSessionIntent(session.intent)) {
    return deferredResult(['missing_or_invalid_session_intent'], baseline, {
      surfaceId,
      sessionId,
    })
  }

  if (!isNonNegativeInt(session.week)) {
    return deferredResult(['missing_or_invalid_session_week'], baseline, {
      surfaceId,
      sessionId,
    })
  }

  if (!isAdjustmentScope(session.proposedScope)) {
    return deferredResult(['missing_or_invalid_proposed_scope'], baseline, {
      surfaceId,
      sessionId,
    })
  }

  const proposedValue = normalizeToken(session.proposedValue)
  if (!proposedValue) {
    return deferredResult(['missing_proposed_value'], baseline, {
      surfaceId,
      sessionId,
    })
  }

  if (
    session.week < surface.participationWindow.startWeek ||
    session.week > surface.participationWindow.endWeek
  ) {
    return deferredResult(['outside_participation_window'], baseline, {
      surfaceId,
      sessionId,
    })
  }

  if (!sessionSurfaceId || sessionSurfaceId !== surfaceId) {
    return rejectedResult(['discussion_rejected', 'surface_session_mismatch'], baseline, {
      surfaceId,
      sessionId,
    })
  }

  if (session.intent === 'widen' && session.proposedScope !== 'participation') {
    return rejectedResult(['discussion_rejected', 'intent_scope_mismatch'], baseline, {
      surfaceId,
      sessionId,
    })
  }

  if (session.intent === 'stabilize_memory' && session.proposedScope !== 'institutional_memory') {
    return rejectedResult(['discussion_rejected', 'intent_scope_mismatch'], baseline, {
      surfaceId,
      sessionId,
    })
  }

  if (session.intent === 'widen' && surface.wideningRule === 'closed') {
    return rejectedResult(['discussion_rejected', 'widening_not_allowed'], baseline, {
      surfaceId,
      sessionId,
    })
  }

  if (session.intent === 'stabilize_memory') {
    if (!surface.memoryStabilization) {
      return rejectedResult(['discussion_rejected', 'memory_stabilization_disabled'], baseline, {
        surfaceId,
        sessionId,
      })
    }

    if (surface.transcriptRetentionMode !== 'institutional') {
      return deferredResult(['incomplete_transcript_retention'], baseline, {
        surfaceId,
        sessionId,
      })
    }
  }

  if (session.intent === 'record' && surface.transcriptRetentionMode === 'ephemeral') {
    return deferredResult(['incomplete_transcript_retention'], baseline, {
      surfaceId,
      sessionId,
    })
  }

  const fromValue = readScopeValue(baseline, session.proposedScope)
  const proposedAdjustment = freezeAdjustment({
    scope: session.proposedScope,
    fromValue,
    toValue: proposedValue,
  })
  const resolved = applyAdjustment(baseline, session.proposedScope, proposedValue)

  if (session.intent === 'widen') {
    return freezeResult({
      outcome: 'widened',
      surfaceId,
      sessionId,
      baseline,
      resolved,
      proposedAdjustment,
      reasonCodes: ['discussion_widened'],
    })
  }

  if (session.intent === 'stabilize_memory') {
    return freezeResult({
      outcome: 'recorded',
      surfaceId,
      sessionId,
      baseline,
      resolved,
      proposedAdjustment,
      reasonCodes: ['discussion_recorded', 'memory_stabilized'],
    })
  }

  return freezeResult({
    outcome: 'recorded',
    surfaceId,
    sessionId,
    baseline,
    resolved,
    proposedAdjustment,
    reasonCodes: ['discussion_recorded'],
  })
}

/** Authored riverside async board with participation window and widening rules. */
export const EXAMPLE_DISCUSSION_SURFACE: DiscussionSurface = Object.freeze({
  id: 'discussion:riverside-async-board',
  participationWindow: Object.freeze({
    startWeek: 1,
    endWeek: 12,
  }),
  transcriptRetentionMode: 'session_bound',
  wideningRule: 'open_async',
  memoryStabilization: false,
})

/** Authored topic baseline for the riverside async discussion fixture. */
export const EXAMPLE_DISCUSSION_BASELINE: DiscussionMemoryBaseline = Object.freeze({
  topicId: 'topic:riverside-evac-brief',
  participation: 'live_meeting_only',
  institutionalMemory: 'meeting_minutes_volatile',
})

/** Authored widen session that extends participation beyond a single live meeting. */
export const EXAMPLE_DISCUSSION_SESSION: DiscussionSession = Object.freeze({
  sessionId: 'session:riverside-widen-async',
  surfaceId: 'discussion:riverside-async-board',
  week: 4,
  intent: 'widen',
  proposedScope: 'participation',
  proposedValue: 'async_resident_thread',
})
