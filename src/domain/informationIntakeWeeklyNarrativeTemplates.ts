/**
 * SPE-854 slice 9: derive weekly intake narrative segments from linked case outcome metadata.
 *
 * Uses stage, resolution (status), and topic tags to select corroboration/contradiction narrative
 * tokens deterministically. Falls back to bounded sourceRef segments when metadata is absent.
 */

import type { CaseStatus } from './models'

export type WeeklyIntakeCaseOutcomeMetadata = {
  readonly primaryCaseId: string
  readonly stage: number
  readonly resolution: CaseStatus
  readonly topicTags: readonly string[]
}

export type WeeklyIntakeNarrativeEventKind = 'corroboration' | 'contradiction'

type WeeklyIntakeCaseOutcomeSource = {
  readonly id: string
  readonly stage?: number
  readonly status?: CaseStatus
  readonly tags?: readonly string[]
  readonly requiredTags?: readonly string[]
  readonly preferredTags?: readonly string[]
}

const UNLINKED_CORROBORATION_TRACE_TOKENS = [
  'ambient-signal',
  'community-thread',
  'partner-check',
] as const

const LINKED_CORROBORATION_TRACE_TOKENS_BY_STAGE = {
  early: ['initial-signal', 'emerging-pattern', 'first-contact'],
  mid: ['linked-case', 'coincident-signal', 'field-alignment'],
  late: ['deep-corroboration', 'multi-source-lock', 'escalation-confirm'],
} as const

const UNLINKED_CORROBORATION_CHANNEL_TOKENS = [
  'routing-sync',
  'watchlist-match',
  'pattern-stability',
] as const

const OPEN_CORROBORATION_CHANNEL_TOKENS = [
  'watchlist-match',
  'routing-sync',
  'pattern-stability',
] as const

const IN_PROGRESS_CORROBORATION_CHANNEL_TOKENS = [
  'active-case-sync',
  'field-routing',
  'priority-channel',
] as const

const UNLINKED_CONTRADICTION_DISPUTE_TOKENS = [
  'confidence-drop',
  'signal-gap',
  'unsupported-claim',
] as const

const LINKED_CONTRADICTION_DISPUTE_TOKENS_BY_STAGE = {
  early: ['confidence-drop', 'signal-gap', 'unsupported-claim'],
  mid: ['witness-mismatch', 'timeline-drift', 'conflict-window'],
  late: ['escalation-drift', 'conflict-window', 'witness-mismatch'],
} as const

const OPEN_CONTRADICTION_CUE_TOKENS = ['audit-trace', 'triage-review', 'cross-check'] as const

const IN_PROGRESS_CONTRADICTION_CUE_TOKENS = [
  'cross-check',
  'case-review',
  'field-audit',
] as const

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function stableOrdinalFromId(id: string): number {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash + id.charCodeAt(index) * (index + 1)) % 997
  }

  return hash
}

function normalizeTopicTag(value: string): string | null {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (normalized.length < 4) {
    return null
  }

  return normalized
}

function collectTopicTags(source: WeeklyIntakeCaseOutcomeSource): string[] {
  const tags = new Set<string>()
  const addTag = (value: string) => {
    const normalized = normalizeTopicTag(value)
    if (normalized) {
      tags.add(normalized)
    }
  }

  for (const tag of source.tags ?? []) addTag(tag)
  for (const tag of source.requiredTags ?? []) addTag(tag)
  for (const tag of source.preferredTags ?? []) addTag(tag)

  return [...tags].sort((left, right) => left.localeCompare(right))
}

function normalizeStage(stage: number | undefined): number {
  if (stage === undefined || !Number.isFinite(stage)) {
    return 1
  }

  return Math.max(1, Math.trunc(stage))
}

function normalizeResolution(status: CaseStatus | undefined): CaseStatus {
  if (status === 'in_progress' || status === 'resolved') {
    return status
  }

  return 'open'
}

function stageBand(stage: number): keyof typeof LINKED_CORROBORATION_TRACE_TOKENS_BY_STAGE {
  if (stage <= 2) {
    return 'early'
  }

  if (stage <= 4) {
    return 'mid'
  }

  return 'late'
}

function pickDeterministicToken(
  tokens: readonly string[],
  reportId: string,
  week: number,
  offset: number
): string {
  if (tokens.length === 0) {
    return 'baseline'
  }

  const index = (stableOrdinalFromId(reportId) + normalizeWeek(week) + offset) % tokens.length
  return tokens[index] ?? 'baseline'
}

/**
 * Builds outcome metadata for the primary linked case (first sorted id) plus merged topic tags.
 */
export function buildWeeklyIntakeCaseOutcomeMetadata(
  linkedCaseIds: readonly string[],
  cases: readonly WeeklyIntakeCaseOutcomeSource[]
): WeeklyIntakeCaseOutcomeMetadata | null {
  if (linkedCaseIds.length === 0) {
    return null
  }

  const casesById = new Map(cases.map((currentCase) => [currentCase.id, currentCase]))
  const sortedLinkedIds = [...linkedCaseIds].sort((left, right) => left.localeCompare(right))
  const primaryCase = casesById.get(sortedLinkedIds[0] ?? '')
  if (!primaryCase) {
    return null
  }

  const mergedTopicTags = new Set<string>()
  for (const caseId of sortedLinkedIds) {
    const linkedCase = casesById.get(caseId)
    if (!linkedCase) {
      continue
    }

    for (const tag of collectTopicTags(linkedCase)) {
      mergedTopicTags.add(tag)
    }
  }

  return {
    primaryCaseId: primaryCase.id,
    stage: normalizeStage(primaryCase.stage),
    resolution: normalizeResolution(primaryCase.status),
    topicTags: [...mergedTopicTags].sort((left, right) => left.localeCompare(right)),
  }
}

function withTopicTagTokens(
  baseTokens: readonly string[],
  topicTags: readonly string[],
  reportId: string,
  week: number
): readonly string[] {
  if (topicTags.length === 0) {
    return baseTokens
  }

  const tagToken = pickDeterministicToken(topicTags, reportId, week, topicTags.length)
  return [...baseTokens, `topic-${tagToken}`]
}

export function selectWeeklyIntakeCorroborationTraceToken(input: {
  metadata: WeeklyIntakeCaseOutcomeMetadata | null
  hasLinkedCases: boolean
  reportId: string
  week: number
  offset: number
}): string {
  const tokens = input.hasLinkedCases
    ? input.metadata
      ? LINKED_CORROBORATION_TRACE_TOKENS_BY_STAGE[stageBand(input.metadata.stage)]
      : (['linked-case', 'coincident-signal', 'field-alignment'] as const)
    : UNLINKED_CORROBORATION_TRACE_TOKENS

  return pickDeterministicToken(tokens, input.reportId, input.week, input.offset)
}

export function selectWeeklyIntakeCorroborationChannelToken(input: {
  metadata: WeeklyIntakeCaseOutcomeMetadata | null
  hasLinkedCases: boolean
  reportId: string
  week: number
  offset: number
}): string {
  let tokens: readonly string[] = UNLINKED_CORROBORATION_CHANNEL_TOKENS

  if (input.hasLinkedCases && input.metadata) {
    tokens =
      input.metadata.resolution === 'in_progress'
        ? IN_PROGRESS_CORROBORATION_CHANNEL_TOKENS
        : OPEN_CORROBORATION_CHANNEL_TOKENS
    tokens = withTopicTagTokens(tokens, input.metadata.topicTags, input.reportId, input.week)
  }

  return pickDeterministicToken(tokens, input.reportId, input.week, input.offset)
}

export function selectWeeklyIntakeContradictionDisputeToken(input: {
  metadata: WeeklyIntakeCaseOutcomeMetadata | null
  hasLinkedCases: boolean
  reportId: string
  week: number
  offset: number
}): string {
  const tokens = input.hasLinkedCases
    ? input.metadata
      ? LINKED_CONTRADICTION_DISPUTE_TOKENS_BY_STAGE[stageBand(input.metadata.stage)]
      : (['conflict-window', 'witness-mismatch', 'timeline-drift'] as const)
    : UNLINKED_CONTRADICTION_DISPUTE_TOKENS

  return pickDeterministicToken(tokens, input.reportId, input.week, input.offset)
}

export function selectWeeklyIntakeContradictionCueToken(input: {
  metadata: WeeklyIntakeCaseOutcomeMetadata | null
  hasLinkedCases: boolean
  reportId: string
  week: number
  offset: number
}): string {
  let tokens: readonly string[] = OPEN_CONTRADICTION_CUE_TOKENS

  if (input.hasLinkedCases && input.metadata?.resolution === 'in_progress') {
    tokens = IN_PROGRESS_CONTRADICTION_CUE_TOKENS
  }

  if (input.hasLinkedCases && input.metadata && input.metadata.topicTags.length > 0) {
    tokens = withTopicTagTokens(tokens, input.metadata.topicTags, input.reportId, input.week)
  }

  return pickDeterministicToken(tokens, input.reportId, input.week, input.offset)
}

export type WeeklyIntakeNarrativeSegments = {
  readonly trace?: string
  readonly channel?: string
  readonly dispute?: string
  readonly cue?: string
}

const NARRATIVE_SEGMENT_PATTERNS = {
  trace: /:trace-([^:]+)/,
  channel: /:channel-([^:]+)/,
  dispute: /:dispute-([^:]+)/,
  cue: /:cue-([^:]+)/,
} as const

export function extractWeeklyIntakeNarrativeSegmentsFromSourceRef(
  sourceRef: string
): WeeklyIntakeNarrativeSegments {
  const trace = sourceRef.match(NARRATIVE_SEGMENT_PATTERNS.trace)?.[1]
  const channel = sourceRef.match(NARRATIVE_SEGMENT_PATTERNS.channel)?.[1]
  const dispute = sourceRef.match(NARRATIVE_SEGMENT_PATTERNS.dispute)?.[1]
  const cue = sourceRef.match(NARRATIVE_SEGMENT_PATTERNS.cue)?.[1]

  return {
    ...(trace ? { trace } : {}),
    ...(channel ? { channel } : {}),
    ...(dispute ? { dispute } : {}),
    ...(cue ? { cue } : {}),
  }
}

/**
 * Derives narrative segment labels from case outcome metadata, falling back to sourceRef tokens.
 */
export function deriveWeeklyIntakeNarrativeSegments(input: {
  sourceRef: string
  eventKind: WeeklyIntakeNarrativeEventKind
  metadata: WeeklyIntakeCaseOutcomeMetadata | null
  hasLinkedCases: boolean
  reportId: string
  week: number
  topicRef?: string
}): WeeklyIntakeNarrativeSegments {
  const fromSourceRef = extractWeeklyIntakeNarrativeSegmentsFromSourceRef(input.sourceRef)
  const topicRefLength = input.topicRef?.length ?? 0

  if (input.eventKind === 'corroboration') {
    return {
      trace:
        fromSourceRef.trace ??
        selectWeeklyIntakeCorroborationTraceToken({
          metadata: input.metadata,
          hasLinkedCases: input.hasLinkedCases,
          reportId: input.reportId,
          week: input.week,
          offset: 1,
        }),
      channel:
        fromSourceRef.channel ??
        selectWeeklyIntakeCorroborationChannelToken({
          metadata: input.metadata,
          hasLinkedCases: input.hasLinkedCases,
          reportId: input.reportId,
          week: input.week,
          offset: topicRefLength + 1,
        }),
    }
  }

  return {
    dispute:
      fromSourceRef.dispute ??
      selectWeeklyIntakeContradictionDisputeToken({
        metadata: input.metadata,
        hasLinkedCases: input.hasLinkedCases,
        reportId: input.reportId,
        week: input.week,
        offset: 0,
      }),
    cue:
      fromSourceRef.cue ??
      selectWeeklyIntakeContradictionCueToken({
        metadata: input.metadata,
        hasLinkedCases: input.hasLinkedCases,
        reportId: input.reportId,
        week: input.week,
        offset: topicRefLength,
      }),
  }
}
