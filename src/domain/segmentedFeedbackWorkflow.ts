/**
 * SPE-75 follow-up slice 1: segmented/weighted feedback workflow.
 *
 * Pure deterministic feedback channel scoring and ranking that accepts
 * structured channel payloads and emits bounded ranking decisions —
 * no UI, persistence writes, or publish actions.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type FeedbackChannelType = 'bug' | 'balance' | 'security' | 'rfc'

export const FEEDBACK_CHANNEL_TYPES: readonly FeedbackChannelType[] = [
  'bug',
  'balance',
  'security',
  'rfc',
] as const

export type FeedbackGroupingPolicy = 'by_channel' | 'flat'

export const FEEDBACK_GROUPING_POLICIES: readonly FeedbackGroupingPolicy[] = [
  'by_channel',
  'flat',
] as const

export type FeedbackWorkflowStatus = 'ranked' | 'needs_revision' | 'rejected'

export const FEEDBACK_WORKFLOW_STATUSES: readonly FeedbackWorkflowStatus[] = [
  'ranked',
  'needs_revision',
  'rejected',
] as const

export type FeedbackValidationCode =
  | 'invalid_payload'
  | 'missing_entries'
  | 'missing_feedback_id'
  | 'missing_channel_type'
  | 'invalid_channel_type'
  | 'missing_summary'
  | 'summary_too_short'
  | 'invalid_confidence_score'
  | 'invalid_channel_weight'

export type FeedbackRemediationCode = 'confidence_borderline' | 'channel_weight_partial'

export type FeedbackReasonCode = FeedbackValidationCode | FeedbackRemediationCode

// ---------------------------------------------------------------------------
// Payload, policy, and envelopes
// ---------------------------------------------------------------------------

export interface FeedbackChannelPayload {
  readonly feedbackId?: string
  readonly channelType?: string
  readonly reporterRef?: string
  readonly summary?: string
  readonly confidenceScore?: number
  readonly relatedSubsystemRef?: string
}

export interface FeedbackChannelBatch {
  readonly entries?: readonly FeedbackChannelPayload[]
}

export interface FeedbackChannelWeights {
  readonly bug?: number
  readonly balance?: number
  readonly security?: number
  readonly rfc?: number
}

export interface FeedbackWeightPolicy {
  readonly channelWeights?: FeedbackChannelWeights
  readonly minimumConfidence?: number
  readonly borderlineConfidence?: number
  readonly minimumSummaryLength?: number
  readonly groupingPolicy?: FeedbackGroupingPolicy
}

export interface FeedbackValidationIssue {
  readonly code: FeedbackValidationCode
  readonly severity: 'error'
  readonly detail: string
}

export interface FeedbackRemediationNote {
  readonly code: FeedbackRemediationCode
  readonly note: string
}

export interface FeedbackRankingEntry {
  readonly feedbackId: string
  readonly channelType: FeedbackChannelType
  readonly channelWeight: number
  readonly confidenceScore: number
  readonly weightedScore: number
  readonly groupKey: string
  readonly rank: number
  readonly summary: string
  readonly reporterRef: string
  readonly relatedSubsystemRef: string
}

export interface FeedbackRankingDecision {
  readonly status: FeedbackWorkflowStatus
  readonly groupingPolicy: FeedbackGroupingPolicy
  readonly rankedEntries: readonly FeedbackRankingEntry[]
  readonly validationIssues: readonly FeedbackValidationIssue[]
  readonly reasonCodes: readonly FeedbackReasonCode[]
  readonly remediationNotes: readonly FeedbackRemediationNote[]
}

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

const CHANNEL_TYPE_SET = new Set<string>(FEEDBACK_CHANNEL_TYPES)

const DEFAULT_CHANNEL_WEIGHTS: Record<FeedbackChannelType, number> = {
  security: 1,
  bug: 0.8,
  balance: 0.5,
  rfc: 0.4,
}

const DEFAULT_POLICY: Required<
  Omit<FeedbackWeightPolicy, 'channelWeights'> & { channelWeights: FeedbackChannelWeights }
> = {
  channelWeights: Object.freeze({ ...DEFAULT_CHANNEL_WEIGHTS }),
  minimumConfidence: 0.4,
  borderlineConfidence: 0.55,
  minimumSummaryLength: 16,
  groupingPolicy: 'by_channel',
}

const WEIGHT_PRECISION = 4

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const CANONICAL_FEEDBACK_CHANNEL_BATCH_FIXTURE: FeedbackChannelBatch = Object.freeze({
  entries: Object.freeze([
    Object.freeze({
      feedbackId: 'feedback:security-disclosure-canonical',
      channelType: 'security',
      reporterRef: 'tester:security-auditor',
      summary:
        'Deterministic privilege-escalation path in intake validation when malformed payloads bypass channel checks.',
      confidenceScore: 0.92,
      relatedSubsystemRef: 'subsystem:contribution-intake',
    }),
    Object.freeze({
      feedbackId: 'feedback:bug-repro-canonical',
      channelType: 'bug',
      reporterRef: 'tester:qa-maintainer',
      summary:
        'Release packaging rejects valid manifests when saveFormatVersion is omitted on docs-only artifacts.',
      confidenceScore: 0.78,
      relatedSubsystemRef: 'subsystem:release-packaging',
    }),
    Object.freeze({
      feedbackId: 'feedback:rfc-design-canonical',
      channelType: 'rfc',
      reporterRef: 'tester:design-contributor',
      summary:
        'Proposal to segment weighted feedback channels before roadmap prioritization consumes tester input.',
      confidenceScore: 0.65,
      relatedSubsystemRef: 'subsystem:roadmap-input',
    }),
  ]),
})

export const INVALID_FEEDBACK_CHANNEL_BATCH_FIXTURE: FeedbackChannelBatch = Object.freeze({
  entries: Object.freeze([
    Object.freeze({
      feedbackId: '',
      channelType: 'unknown_channel',
      reporterRef: 'tester:anonymous',
      summary: 'too short',
      confidenceScore: 1.5,
    }),
    Object.freeze({
      feedbackId: 'feedback:missing-channel',
      channelType: '',
      reporterRef: 'tester:anonymous',
      summary: 'Missing channel type should fail validation deterministically.',
      confidenceScore: 0.7,
    }),
  ]),
})

export const BORDERLINE_FEEDBACK_CHANNEL_BATCH_FIXTURE: FeedbackChannelBatch = Object.freeze({
  entries: Object.freeze([
    Object.freeze({
      feedbackId: 'feedback:borderline-confidence',
      channelType: 'balance',
      reporterRef: 'tester:balance-cohort',
      summary:
        'Encounter pacing feels uneven in week-three infiltration templates but evidence is anecdotal.',
      confidenceScore: 0.48,
      relatedSubsystemRef: 'subsystem:encounter-pacing',
    }),
  ]),
})

export const INVALID_FEEDBACK_WEIGHT_POLICY_FIXTURE: FeedbackWeightPolicy = Object.freeze({
  channelWeights: Object.freeze({
    bug: -0.2,
    security: 1.5,
  }),
})

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isFeedbackChannelType(value: string): value is FeedbackChannelType {
  return CHANNEL_TYPE_SET.has(value)
}

export function isFeedbackGroupingPolicy(value: string): value is FeedbackGroupingPolicy {
  return FEEDBACK_GROUPING_POLICIES.includes(value as FeedbackGroupingPolicy)
}

export function isFeedbackWorkflowStatus(value: string): value is FeedbackWorkflowStatus {
  return FEEDBACK_WORKFLOW_STATUSES.includes(value as FeedbackWorkflowStatus)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function roundWeight(value: number): number {
  const factor = 10 ** WEIGHT_PRECISION
  return Math.round(value * factor) / factor
}

function resolvePolicy(policy?: FeedbackWeightPolicy): Required<
  Omit<FeedbackWeightPolicy, 'channelWeights'> & { channelWeights: Record<FeedbackChannelType, number> }
> {
  const customWeights = policy?.channelWeights ?? {}

  return {
    channelWeights: {
      bug: customWeights.bug ?? DEFAULT_CHANNEL_WEIGHTS.bug,
      balance: customWeights.balance ?? DEFAULT_CHANNEL_WEIGHTS.balance,
      security: customWeights.security ?? DEFAULT_CHANNEL_WEIGHTS.security,
      rfc: customWeights.rfc ?? DEFAULT_CHANNEL_WEIGHTS.rfc,
    },
    minimumConfidence: policy?.minimumConfidence ?? DEFAULT_POLICY.minimumConfidence,
    borderlineConfidence: policy?.borderlineConfidence ?? DEFAULT_POLICY.borderlineConfidence,
    minimumSummaryLength: policy?.minimumSummaryLength ?? DEFAULT_POLICY.minimumSummaryLength,
    groupingPolicy: policy?.groupingPolicy ?? DEFAULT_POLICY.groupingPolicy,
  }
}

function sortValidationIssues(issues: FeedbackValidationIssue[]): FeedbackValidationIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code)
    if (codeOrder !== 0) {
      return codeOrder
    }

    return left.detail.localeCompare(right.detail)
  })
}

function sortRemediationNotes(notes: FeedbackRemediationNote[]): FeedbackRemediationNote[] {
  return [...notes].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code)
    if (codeOrder !== 0) {
      return codeOrder
    }

    return left.note.localeCompare(right.note)
  })
}

function sortRankedEntries(entries: FeedbackRankingEntry[]): FeedbackRankingEntry[] {
  return [...entries].sort((left, right) => {
    const scoreOrder = right.weightedScore - left.weightedScore
    if (scoreOrder !== 0) {
      return scoreOrder
    }

    return left.feedbackId.localeCompare(right.feedbackId)
  })
}

function freezeValidationResult(
  issues: FeedbackValidationIssue[]
): { readonly valid: boolean; readonly issues: readonly FeedbackValidationIssue[] } {
  const sortedIssues = sortValidationIssues(issues)

  return Object.freeze({
    valid: sortedIssues.length === 0,
    issues: Object.freeze(sortedIssues.map((issue) => Object.freeze({ ...issue }))),
  })
}

function freezeDecision(decision: FeedbackRankingDecision): FeedbackRankingDecision {
  return Object.freeze({
    status: decision.status,
    groupingPolicy: decision.groupingPolicy,
    rankedEntries: Object.freeze(
      decision.rankedEntries.map((entry) => Object.freeze({ ...entry }))
    ),
    validationIssues: Object.freeze(decision.validationIssues),
    reasonCodes: Object.freeze([...decision.reasonCodes]),
    remediationNotes: Object.freeze(decision.remediationNotes),
  })
}

function resolveGroupKey(
  channelType: FeedbackChannelType,
  groupingPolicy: FeedbackGroupingPolicy
): string {
  switch (groupingPolicy) {
    case 'by_channel':
      return `channel:${channelType}`
    case 'flat':
      return 'group:all'
    default: {
      const _exhaustive: never = groupingPolicy
      return _exhaustive
    }
  }
}

function computeWeightedScore(channelWeight: number, confidenceScore: number): number {
  return roundWeight(channelWeight * confidenceScore)
}

function validateChannelWeights(
  policy: Required<
    Omit<FeedbackWeightPolicy, 'channelWeights'> & { channelWeights: Record<FeedbackChannelType, number> }
  >
): FeedbackValidationIssue[] {
  const issues: FeedbackValidationIssue[] = []

  for (const channelType of FEEDBACK_CHANNEL_TYPES) {
    const weight = policy.channelWeights[channelType]
    if (weight < 0 || weight > 1) {
      issues.push({
        code: 'invalid_channel_weight',
        severity: 'error',
        detail: `Feedback channel weight for "${channelType}" must be between 0 and 1; received ${weight}.`,
      })
    }
  }

  return issues
}

function collectEntryValidationIssues(
  entry: FeedbackChannelPayload,
  index: number,
  policy: Required<
    Omit<FeedbackWeightPolicy, 'channelWeights'> & { channelWeights: Record<FeedbackChannelType, number> }
  >
): FeedbackValidationIssue[] {
  const issues: FeedbackValidationIssue[] = []
  const feedbackId = normalizeToken(entry.feedbackId)
  const channelTypeToken = normalizeToken(entry.channelType)
  const summary = normalizeToken(entry.summary)
  const confidenceScore = entry.confidenceScore
  const entryLabel = feedbackId || `entries[${index}]`

  if (!feedbackId) {
    issues.push({
      code: 'missing_feedback_id',
      severity: 'error',
      detail: `Feedback entry ${entryLabel} is missing feedbackId.`,
    })
  }

  if (!channelTypeToken) {
    issues.push({
      code: 'missing_channel_type',
      severity: 'error',
      detail: `Feedback entry ${entryLabel} is missing channelType.`,
    })
  } else if (!isFeedbackChannelType(channelTypeToken)) {
    issues.push({
      code: 'invalid_channel_type',
      severity: 'error',
      detail: `Feedback entry ${entryLabel} has invalid channelType "${channelTypeToken}".`,
    })
  }

  if (!summary) {
    issues.push({
      code: 'missing_summary',
      severity: 'error',
      detail: `Feedback entry ${entryLabel} is missing summary.`,
    })
  } else if (summary.length < policy.minimumSummaryLength) {
    issues.push({
      code: 'summary_too_short',
      severity: 'error',
      detail: `Feedback entry ${entryLabel} summary must be at least ${policy.minimumSummaryLength} characters.`,
    })
  }

  if (typeof confidenceScore !== 'number' || Number.isNaN(confidenceScore)) {
    issues.push({
      code: 'invalid_confidence_score',
      severity: 'error',
      detail: `Feedback entry ${entryLabel} requires a numeric confidenceScore.`,
    })
  } else if (confidenceScore < 0 || confidenceScore > 1) {
    issues.push({
      code: 'invalid_confidence_score',
      severity: 'error',
      detail: `Feedback entry ${entryLabel} confidenceScore must be between 0 and 1.`,
    })
  }

  return issues
}

function collectRemediationNotes(
  entries: readonly FeedbackChannelPayload[],
  policy: Required<
    Omit<FeedbackWeightPolicy, 'channelWeights'> & { channelWeights: Record<FeedbackChannelType, number> }
  >,
  customWeightPolicy?: FeedbackWeightPolicy
): FeedbackRemediationNote[] {
  const notes: FeedbackRemediationNote[] = []

  for (const entry of entries) {
    const confidenceScore = entry.confidenceScore
    const feedbackId = normalizeToken(entry.feedbackId)

    if (
      typeof confidenceScore === 'number' &&
      !Number.isNaN(confidenceScore) &&
      confidenceScore >= policy.minimumConfidence &&
      confidenceScore < policy.borderlineConfidence
    ) {
      notes.push({
        code: 'confidence_borderline',
        note: `Feedback entry "${feedbackId}" confidence ${confidenceScore} is borderline; gather reproduction evidence before roadmap prioritization.`,
      })
    }
  }

  if (customWeightPolicy?.channelWeights) {
    const providedChannels = Object.keys(customWeightPolicy.channelWeights).filter(
      (key) => customWeightPolicy.channelWeights![key as keyof FeedbackChannelWeights] !== undefined
    )
    if (providedChannels.length > 0 && providedChannels.length < FEEDBACK_CHANNEL_TYPES.length) {
      notes.push({
        code: 'channel_weight_partial',
        note: 'Channel weight policy specifies only a subset of channel types; unspecified channels use default weights.',
      })
    }
  }

  return sortRemediationNotes(notes)
}

function buildRankingEntries(
  entries: readonly FeedbackChannelPayload[],
  policy: Required<
    Omit<FeedbackWeightPolicy, 'channelWeights'> & { channelWeights: Record<FeedbackChannelType, number> }
  >
): FeedbackRankingEntry[] {
  const rankingEntries: FeedbackRankingEntry[] = []

  for (const entry of entries) {
    const feedbackId = normalizeToken(entry.feedbackId)
    const channelType = normalizeToken(entry.channelType) as FeedbackChannelType
    const summary = normalizeToken(entry.summary)
    const reporterRef = normalizeToken(entry.reporterRef)
    const relatedSubsystemRef = normalizeToken(entry.relatedSubsystemRef)
    const confidenceScore = roundWeight(entry.confidenceScore!)
    const channelWeight = roundWeight(policy.channelWeights[channelType])
    const weightedScore = computeWeightedScore(channelWeight, confidenceScore)

    rankingEntries.push(
      Object.freeze({
        feedbackId,
        channelType,
        channelWeight,
        confidenceScore,
        weightedScore,
        groupKey: resolveGroupKey(channelType, policy.groupingPolicy),
        rank: 0,
        summary,
        reporterRef,
        relatedSubsystemRef,
      })
    )
  }

  const sorted = sortRankedEntries(rankingEntries)

  return sorted.map((entry, index) =>
    Object.freeze({
      ...entry,
      rank: index + 1,
    })
  )
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateFeedbackChannelBatch(
  batch?: FeedbackChannelBatch,
  policy?: FeedbackWeightPolicy
): { readonly valid: boolean; readonly issues: readonly FeedbackValidationIssue[] } {
  const resolvedPolicy = resolvePolicy(policy)

  if (!batch || typeof batch !== 'object') {
    return freezeValidationResult([
      {
        code: 'invalid_payload',
        severity: 'error',
        detail: 'Feedback channel batch must be an object.',
      },
    ])
  }

  const weightIssues = validateChannelWeights(resolvedPolicy)
  if (weightIssues.length > 0) {
    return freezeValidationResult(weightIssues)
  }

  const entries = batch.entries
  if (!Array.isArray(entries) || entries.length === 0) {
    return freezeValidationResult([
      {
        code: 'missing_entries',
        severity: 'error',
        detail: 'Feedback channel batch must include at least one entry.',
      },
    ])
  }

  const issues: FeedbackValidationIssue[] = []
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]
    if (!entry || typeof entry !== 'object') {
      issues.push({
        code: 'invalid_payload',
        severity: 'error',
        detail: `Feedback entry entries[${index}] must be an object.`,
      })
      continue
    }

    issues.push(...collectEntryValidationIssues(entry, index, resolvedPolicy))
  }

  return freezeValidationResult(issues)
}

/**
 * SPE-75 follow-up baseline: deterministic segmented feedback scoring and ranking
 * with channel weights and grouping policy — no persistence or publish side effects.
 */
export function evaluateSegmentedFeedbackWorkflow(
  batch?: FeedbackChannelBatch,
  policy?: FeedbackWeightPolicy
): FeedbackRankingDecision {
  const resolvedPolicy = resolvePolicy(policy)
  const validation = validateFeedbackChannelBatch(batch, policy)

  if (!validation.valid) {
    const reasonCodes = [...new Set(validation.issues.map((issue) => issue.code))].sort((left, right) =>
      left.localeCompare(right)
    )

    return freezeDecision({
      status: 'rejected',
      groupingPolicy: resolvedPolicy.groupingPolicy,
      rankedEntries: Object.freeze([]),
      validationIssues: validation.issues,
      reasonCodes,
      remediationNotes: Object.freeze([]),
    })
  }

  const entries = batch!.entries!
  const remediationNotes = sortRemediationNotes(
    collectRemediationNotes(entries, resolvedPolicy, policy)
  )

  if (remediationNotes.length > 0) {
    const reasonCodes = remediationNotes
      .map((note) => note.code)
      .sort((left, right) => left.localeCompare(right))

    return freezeDecision({
      status: 'needs_revision',
      groupingPolicy: resolvedPolicy.groupingPolicy,
      rankedEntries: Object.freeze(buildRankingEntries(entries, resolvedPolicy)),
      validationIssues: Object.freeze([]),
      reasonCodes,
      remediationNotes: Object.freeze(remediationNotes.map((note) => Object.freeze({ ...note }))),
    })
  }

  return freezeDecision({
    status: 'ranked',
    groupingPolicy: resolvedPolicy.groupingPolicy,
    rankedEntries: Object.freeze(buildRankingEntries(entries, resolvedPolicy)),
    validationIssues: Object.freeze([]),
    reasonCodes: Object.freeze([]),
    remediationNotes: Object.freeze([]),
  })
}
