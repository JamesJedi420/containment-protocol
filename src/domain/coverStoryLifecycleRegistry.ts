/**
 * SPE-1347 slice 1: cover-story lifecycle registry.
 *
 * Pure deterministic registry for cover stories through creation, maintenance,
 * contradiction buildup, collapse, and repair — distinct from public disclosure
 * progression (SPE-2109) and truth-layer claim/doctrine/verification slots (SPE-1343).
 */

import { FRANCHISE_TOKEN_PATTERN } from './truthLayerRecordRegistry'

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type CoverStoryRecordId = string

export type CoverStoryLifecyclePhase =
  | 'drafted'
  | 'maintained'
  | 'stressed'
  | 'collapsed'
  | 'repairing'
  | 'abandoned'
  | 'replaced'

export const COVER_STORY_LIFECYCLE_PHASES: readonly CoverStoryLifecyclePhase[] = [
  'drafted',
  'maintained',
  'stressed',
  'collapsed',
  'repairing',
  'abandoned',
  'replaced',
] as const

export const DEFAULT_COVER_STORY_LIFECYCLE_PHASE: CoverStoryLifecyclePhase = 'drafted'

export type CoverStoryLifecycleEvent =
  | 'cover_deployed'
  | 'maintenance_reinforced'
  | 'contradiction_accumulated'
  | 'cover_collapsed'
  | 'repair_initiated'
  | 'repair_stabilized'
  | 'repair_failed'
  | 'cover_abandoned'
  | 'cover_replaced'

export type CoverStorySubjectKind =
  | 'actor'
  | 'site'
  | 'event'
  | 'institution'
  | 'relationship'

export const COVER_STORY_SUBJECT_KINDS: readonly CoverStorySubjectKind[] = [
  'actor',
  'site',
  'event',
  'institution',
  'relationship',
] as const

export type CoverStoryMotivation =
  | 'shame'
  | 'reputation_protection'
  | 'institutional_face_saving'
  | 'social_anxiety'
  | 'tactical_secrecy'

export const COVER_STORY_MOTIVATIONS: readonly CoverStoryMotivation[] = [
  'shame',
  'reputation_protection',
  'institutional_face_saving',
  'social_anxiety',
  'tactical_secrecy',
] as const

export type CoverStoryExposureKind =
  | 'paranormal'
  | 'social'
  | 'political'
  | 'personal'
  | 'institutional'

export const COVER_STORY_EXPOSURE_KINDS: readonly CoverStoryExposureKind[] = [
  'paranormal',
  'social',
  'political',
  'personal',
  'institutional',
] as const

export type CoverStoryContradictionChannelKind =
  | 'witness_testimony'
  | 'institutional_records'
  | 'digital_traces'
  | 'family_suspicion'
  | 'active_surveillance'

export const COVER_STORY_CONTRADICTION_CHANNEL_KINDS: readonly CoverStoryContradictionChannelKind[] =
  [
    'witness_testimony',
    'institutional_records',
    'digital_traces',
    'family_suspicion',
    'active_surveillance',
  ] as const

export type CoverStoryStagedResponse =
  | 'reinforcement'
  | 'revision'
  | 'suppression'
  | 'replacement'
  | 'abandonment'

export const COVER_STORY_STAGED_RESPONSES: readonly CoverStoryStagedResponse[] = [
  'reinforcement',
  'revision',
  'suppression',
  'replacement',
  'abandonment',
] as const

export type CoverStoryRepairAction = CoverStoryStagedResponse

export type CoverStoryRepairOutcome = 'stabilized' | 'worsened' | 'pending'

export const COVER_STORY_REPAIR_OUTCOMES: readonly CoverStoryRepairOutcome[] = [
  'stabilized',
  'worsened',
  'pending',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface CoverStoryContradictionChannel {
  readonly channel: CoverStoryContradictionChannelKind
  readonly accumulationScore: number
  readonly lastUpdatedWeek?: number
  readonly sourceRef?: string
}

export interface CoverStoryRepairActionEntry {
  readonly action: CoverStoryRepairAction
  readonly week: number
  readonly note?: string
  readonly outcome?: CoverStoryRepairOutcome
}

export interface CoverStoryTransitionHistoryEntry {
  readonly fromPhase: CoverStoryLifecyclePhase
  readonly toPhase: CoverStoryLifecyclePhase
  readonly week: number
  readonly note?: string
  readonly event?: CoverStoryLifecycleEvent
}

export interface CoverStoryRecord {
  readonly id: CoverStoryRecordId
  readonly label: string
  readonly summary?: string
  readonly lifecyclePhase: CoverStoryLifecyclePhase
  readonly subjectRef: string
  readonly subjectKind: CoverStorySubjectKind
  readonly coverMotivation?: CoverStoryMotivation
  readonly exposureKind?: CoverStoryExposureKind
  readonly linkedTruthLayerRef?: string
  readonly linkedDisclosureRef?: string
  readonly parentCaseRef?: string
  readonly contradictionChannels?: readonly CoverStoryContradictionChannel[]
  readonly repairActionHistory?: readonly CoverStoryRepairActionEntry[]
  readonly transitionHistory?: readonly CoverStoryTransitionHistoryEntry[]
  readonly activeStagedResponse?: CoverStoryStagedResponse
  readonly contradictionPressure?: number
  readonly coverCapacityScore?: number
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type CoverStoryValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_subject_ref'
  | 'invalid_lifecycle_phase'
  | 'invalid_subject_kind'
  | 'invalid_cover_motivation'
  | 'invalid_exposure_kind'
  | 'invalid_contradiction_channel_kind'
  | 'invalid_contradiction_accumulation_score'
  | 'invalid_contradiction_last_updated_week'
  | 'invalid_repair_action'
  | 'invalid_repair_outcome'
  | 'invalid_repair_action_week'
  | 'repair_action_out_of_order'
  | 'invalid_transition_history_entry'
  | 'invalid_transition_history_week'
  | 'invalid_lifecycle_transition'
  | 'lifecycle_phase_history_mismatch'
  | 'invalid_staged_response'
  | 'invalid_contradiction_pressure'
  | 'invalid_cover_capacity_score'
  | 'invalid_confidence'
  | 'collapsed_without_prior_stressed_phase'
  | 'repair_while_abandoned'
  | 'repair_after_abandonment_in_history'
  | 'collapse_with_pending_repair'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'

export interface CoverStoryValidationIssue {
  readonly code: CoverStoryValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface CoverStoryValidationResult {
  readonly valid: boolean
  readonly issues: readonly CoverStoryValidationIssue[]
}

// ---------------------------------------------------------------------------
// Lifecycle transition graph
// ---------------------------------------------------------------------------

export const COVER_STORY_LIFECYCLE_TRANSITIONS: Record<
  CoverStoryLifecyclePhase,
  Partial<Record<CoverStoryLifecycleEvent, CoverStoryLifecyclePhase>>
> = {
  drafted: {
    cover_deployed: 'maintained',
    cover_abandoned: 'abandoned',
  },
  maintained: {
    maintenance_reinforced: 'maintained',
    contradiction_accumulated: 'stressed',
    cover_collapsed: 'collapsed',
    cover_abandoned: 'abandoned',
    cover_replaced: 'replaced',
  },
  stressed: {
    maintenance_reinforced: 'maintained',
    cover_collapsed: 'collapsed',
    cover_abandoned: 'abandoned',
    cover_replaced: 'replaced',
  },
  collapsed: {
    repair_initiated: 'repairing',
    cover_abandoned: 'abandoned',
    cover_replaced: 'replaced',
  },
  repairing: {
    repair_stabilized: 'maintained',
    repair_failed: 'collapsed',
    cover_abandoned: 'abandoned',
  },
  abandoned: {},
  replaced: {},
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export interface CoverStoryLifecycleProjectionPolicy {
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
  readonly stressThreshold?: number
}

export interface CoverStoryLifecycleProjection {
  readonly recordId: CoverStoryRecordId
  readonly label: string
  readonly summary: string | null
  readonly lifecyclePhase: CoverStoryLifecyclePhase
  readonly subjectRef: string
  readonly subjectKind: CoverStorySubjectKind
  readonly coverMotivation: CoverStoryMotivation | null
  readonly exposureKind: CoverStoryExposureKind | null
  readonly contradictionPressure: number | null
  readonly coverCapacityScore: number | null
  readonly activeContradictionChannelCount: number
  readonly contradictionChannelHints: readonly CoverStoryContradictionChannelKind[]
  readonly latestRepairAction: CoverStoryRepairAction | null
  readonly coverStressActive: boolean
  readonly coverCollapsed: boolean
  readonly repairInProgress: boolean
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

export type CoverStoryRecordsMap = Record<CoverStoryRecordId, CoverStoryRecord>

/** Upper bound on persisted cover-story record entries (byte-stable record-id keys). */
export const MAX_COVER_STORY_RECORDS = 128

const DEFAULT_COVER_STRESS_THRESHOLD = 0.45

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const LIFECYCLE_PHASE_SET = new Set<string>(COVER_STORY_LIFECYCLE_PHASES)
const SUBJECT_KIND_SET = new Set<string>(COVER_STORY_SUBJECT_KINDS)
const MOTIVATION_SET = new Set<string>(COVER_STORY_MOTIVATIONS)
const EXPOSURE_KIND_SET = new Set<string>(COVER_STORY_EXPOSURE_KINDS)
const CONTRADICTION_CHANNEL_SET = new Set<string>(COVER_STORY_CONTRADICTION_CHANNEL_KINDS)
const STAGED_RESPONSE_SET = new Set<string>(COVER_STORY_STAGED_RESPONSES)
const REPAIR_OUTCOME_SET = new Set<string>(COVER_STORY_REPAIR_OUTCOMES)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function sortedStringArray(value: unknown): readonly string[] {
  return Object.freeze(
    [...asStringArray(value)].sort((left, right) => left.localeCompare(right))
  )
}

function pushIssue(issues: CoverStoryValidationIssue[], issue: CoverStoryValidationIssue) {
  issues.push(issue)
}

function sortValidationIssues(issues: CoverStoryValidationIssue[]) {
  return [...issues].sort((left, right) => {
    const codeCompare = left.code.localeCompare(right.code)
    if (codeCompare !== 0) {
      return codeCompare
    }

    const severityCompare = left.severity.localeCompare(right.severity)
    if (severityCompare !== 0) {
      return severityCompare
    }

    return left.detail.localeCompare(right.detail)
  })
}

function freezeValidationResult(issues: CoverStoryValidationIssue[]): CoverStoryValidationResult {
  const sortedIssues = sortValidationIssues(issues)
  const hasError = sortedIssues.some((issue) => issue.severity === 'error')

  return Object.freeze({
    valid: !hasError,
    issues: Object.freeze(
      sortedIssues.map((issue) =>
        Object.freeze({
          ...issue,
          ...(issue.relatedIds ? { relatedIds: Object.freeze([...issue.relatedIds]) } : {}),
        })
      )
    ),
  })
}

function isFiniteWeek(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
}

function isValidUnitScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function containsFranchiseToken(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && FRANCHISE_TOKEN_PATTERN.test(token)
}

function isLifecyclePhase(value: string): value is CoverStoryLifecyclePhase {
  return LIFECYCLE_PHASE_SET.has(value)
}

function isSubjectKind(value: string): value is CoverStorySubjectKind {
  return SUBJECT_KIND_SET.has(value)
}

function isCoverMotivation(value: string): value is CoverStoryMotivation {
  return MOTIVATION_SET.has(value)
}

function isExposureKind(value: string): value is CoverStoryExposureKind {
  return EXPOSURE_KIND_SET.has(value)
}

function isContradictionChannelKind(value: string): value is CoverStoryContradictionChannelKind {
  return CONTRADICTION_CHANNEL_SET.has(value)
}

function isStagedResponse(value: string): value is CoverStoryStagedResponse {
  return STAGED_RESPONSE_SET.has(value)
}

function isRepairOutcome(value: string): value is CoverStoryRepairOutcome {
  return REPAIR_OUTCOME_SET.has(value)
}

function resolveTransitionTarget(
  fromPhase: CoverStoryLifecyclePhase,
  event: CoverStoryLifecycleEvent
): CoverStoryLifecyclePhase | undefined {
  return COVER_STORY_LIFECYCLE_TRANSITIONS[fromPhase][event]
}

function isDirectLifecycleTransition(
  fromPhase: CoverStoryLifecyclePhase,
  toPhase: CoverStoryLifecyclePhase
): boolean {
  if (fromPhase === toPhase) {
    return fromPhase === 'maintained'
  }

  for (const transitions of Object.values(COVER_STORY_LIFECYCLE_TRANSITIONS[fromPhase])) {
    if (transitions === toPhase) {
      return true
    }
  }

  return false
}

function scanFranchiseTokens(
  issues: CoverStoryValidationIssue[],
  id: string,
  label: string,
  record: CoverStoryRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Cover-story record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Cover-story record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const stringFields: Array<{ field: string; value: string | undefined }> = [
    { field: 'summary', value: record.summary },
    { field: 'subjectRef', value: record.subjectRef },
    { field: 'linkedTruthLayerRef', value: record.linkedTruthLayerRef },
    { field: 'linkedDisclosureRef', value: record.linkedDisclosureRef },
    { field: 'parentCaseRef', value: record.parentCaseRef },
  ]

  for (const { field, value } of stringFields) {
    const token = normalizeToken(value ?? '')
    if (token && containsFranchiseToken(token)) {
      pushIssue(issues, {
        code: 'franchise_token_in_field',
        severity: 'error',
        detail: `Cover-story record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const channel of record.contradictionChannels ?? []) {
    if (!channel || typeof channel !== 'object') {
      continue
    }

    const sourceRef = normalizeToken(channel.sourceRef ?? '')
    if (sourceRef && containsFranchiseToken(sourceRef)) {
      pushIssue(issues, {
        code: 'franchise_token_in_field',
        severity: 'error',
        detail: `Cover-story record ${id || '(unknown)'} contradictionChannels contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }
}

function deriveContradictionPressure(record: CoverStoryRecord): number | null {
  if (record.contradictionPressure !== undefined) {
    return record.contradictionPressure
  }

  const channels = record.contradictionChannels ?? []
  if (channels.length === 0) {
    return null
  }

  const scores = channels
    .map((channel) => channel.accumulationScore)
    .filter((score) => isValidUnitScore(score))

  if (scores.length === 0) {
    return null
  }

  const total = scores.reduce((sum, score) => sum + score, 0)
  return Math.min(1, total / scores.length)
}

function defineRecord(record: CoverStoryRecord): CoverStoryRecord {
  return Object.freeze({ ...record })
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isCoverStoryLifecyclePhase(value: string): value is CoverStoryLifecyclePhase {
  return isLifecyclePhase(value)
}

export function isCoverStorySubjectKind(value: string): value is CoverStorySubjectKind {
  return isSubjectKind(value)
}

export function isValidCoverStoryLifecycleTransition(
  fromPhase: CoverStoryLifecyclePhase,
  event: CoverStoryLifecycleEvent
): boolean {
  return resolveTransitionTarget(fromPhase, event) !== undefined
}

export function transitionCoverStoryLifecyclePhase(
  phase: CoverStoryLifecyclePhase,
  event: CoverStoryLifecycleEvent
): CoverStoryLifecyclePhase {
  return resolveTransitionTarget(phase, event) ?? phase
}

// ---------------------------------------------------------------------------
// Public API — validation
// ---------------------------------------------------------------------------

export function validateCoverStoryRecord(record: CoverStoryRecord): CoverStoryValidationResult {
  const issues: CoverStoryValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const subjectRef = normalizeToken(record.subjectRef)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Cover-story record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Cover-story record is missing label.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!subjectRef) {
    pushIssue(issues, {
      code: 'missing_subject_ref',
      severity: 'error',
      detail: 'Cover-story record is missing subjectRef.',
      relatedIds: id ? [id] : undefined,
    })
  }

  scanFranchiseTokens(issues, id, label, record)

  if (!isLifecyclePhase(record.lifecyclePhase)) {
    pushIssue(issues, {
      code: 'invalid_lifecycle_phase',
      severity: 'error',
      detail: `Cover-story record ${id || '(unknown)'} has invalid lifecyclePhase ${String(record.lifecyclePhase)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isSubjectKind(record.subjectKind)) {
    pushIssue(issues, {
      code: 'invalid_subject_kind',
      severity: 'error',
      detail: `Cover-story record ${id || '(unknown)'} has invalid subjectKind ${String(record.subjectKind)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.coverMotivation !== undefined && !isCoverMotivation(record.coverMotivation)) {
    pushIssue(issues, {
      code: 'invalid_cover_motivation',
      severity: 'error',
      detail: `Cover-story record ${id || '(unknown)'} has invalid coverMotivation ${String(record.coverMotivation)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.exposureKind !== undefined && !isExposureKind(record.exposureKind)) {
    pushIssue(issues, {
      code: 'invalid_exposure_kind',
      severity: 'error',
      detail: `Cover-story record ${id || '(unknown)'} has invalid exposureKind ${String(record.exposureKind)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.activeStagedResponse !== undefined && !isStagedResponse(record.activeStagedResponse)) {
    pushIssue(issues, {
      code: 'invalid_staged_response',
      severity: 'error',
      detail: `Cover-story record ${id || '(unknown)'} has invalid activeStagedResponse ${String(record.activeStagedResponse)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.contradictionPressure !== undefined && !isValidUnitScore(record.contradictionPressure)) {
    pushIssue(issues, {
      code: 'invalid_contradiction_pressure',
      severity: 'error',
      detail: `Cover-story record ${id || '(unknown)'} contradictionPressure must be a finite number between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.coverCapacityScore !== undefined && !isValidUnitScore(record.coverCapacityScore)) {
    pushIssue(issues, {
      code: 'invalid_cover_capacity_score',
      severity: 'error',
      detail: `Cover-story record ${id || '(unknown)'} coverCapacityScore must be a finite number between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Cover-story record ${id || '(unknown)'} confidence must be a finite number between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const channel of record.contradictionChannels ?? []) {
    if (!channel || typeof channel !== 'object') {
      pushIssue(issues, {
        code: 'invalid_contradiction_channel_kind',
        severity: 'error',
        detail: `Cover-story record ${id || '(unknown)'} contradictionChannels contains invalid entry.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!isContradictionChannelKind(channel.channel)) {
      pushIssue(issues, {
        code: 'invalid_contradiction_channel_kind',
        severity: 'error',
        detail: `Cover-story record ${id || '(unknown)'} has invalid contradiction channel ${String(channel.channel)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (!isValidUnitScore(channel.accumulationScore)) {
      pushIssue(issues, {
        code: 'invalid_contradiction_accumulation_score',
        severity: 'error',
        detail: `Cover-story record ${id || '(unknown)'} contradiction channel accumulationScore must be between 0 and 1.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (channel.lastUpdatedWeek !== undefined && !isFiniteWeek(channel.lastUpdatedWeek)) {
      pushIssue(issues, {
        code: 'invalid_contradiction_last_updated_week',
        severity: 'error',
        detail: `Cover-story record ${id || '(unknown)'} contradiction channel lastUpdatedWeek is invalid.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  let priorRepairWeek = -1
  let abandonmentWeek: number | null = null

  for (const entry of record.repairActionHistory ?? []) {
    if (!entry || typeof entry !== 'object') {
      pushIssue(issues, {
        code: 'invalid_repair_action',
        severity: 'error',
        detail: `Cover-story record ${id || '(unknown)'} repairActionHistory contains invalid entry.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!isStagedResponse(entry.action)) {
      pushIssue(issues, {
        code: 'invalid_repair_action',
        severity: 'error',
        detail: `Cover-story record ${id || '(unknown)'} has invalid repair action ${String(entry.action)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (!isFiniteWeek(entry.week)) {
      pushIssue(issues, {
        code: 'invalid_repair_action_week',
        severity: 'error',
        detail: `Cover-story record ${id || '(unknown)'} repairActionHistory week is invalid.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (entry.week < priorRepairWeek) {
      pushIssue(issues, {
        code: 'repair_action_out_of_order',
        severity: 'error',
        detail: `Cover-story record ${id || '(unknown)'} repairActionHistory weeks must be non-decreasing.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    priorRepairWeek = entry.week

    if (entry.outcome !== undefined && !isRepairOutcome(entry.outcome)) {
      pushIssue(issues, {
        code: 'invalid_repair_outcome',
        severity: 'error',
        detail: `Cover-story record ${id || '(unknown)'} has invalid repair outcome ${String(entry.outcome)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (entry.action === 'abandonment') {
      abandonmentWeek = entry.week
    }
  }

  if (record.lifecyclePhase === 'abandoned' && (record.repairActionHistory?.length ?? 0) > 0) {
    const nonAbandonmentRepairs = (record.repairActionHistory ?? []).filter(
      (entry) => entry.action !== 'abandonment'
    )
    if (nonAbandonmentRepairs.length > 0) {
      pushIssue(issues, {
        code: 'repair_while_abandoned',
        severity: 'warning',
        detail: `Cover-story record ${id || '(unknown)'} is abandoned but retains non-abandonment repair history.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (abandonmentWeek !== null) {
    const repairAfterAbandonment = (record.repairActionHistory ?? []).some(
      (entry) => entry.action !== 'abandonment' && entry.week > abandonmentWeek!
    )
    if (repairAfterAbandonment) {
      pushIssue(issues, {
        code: 'repair_after_abandonment_in_history',
        severity: 'warning',
        detail: `Cover-story record ${id || '(unknown)'} records repair actions after abandonment.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  let historyPhase: CoverStoryLifecyclePhase | null = null
  const history = record.transitionHistory ?? []

  for (const entry of history) {
    if (!entry || typeof entry !== 'object') {
      pushIssue(issues, {
        code: 'invalid_transition_history_entry',
        severity: 'error',
        detail: `Cover-story record ${id || '(unknown)'} transitionHistory contains invalid entry.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!isLifecyclePhase(entry.fromPhase) || !isLifecyclePhase(entry.toPhase)) {
      pushIssue(issues, {
        code: 'invalid_transition_history_entry',
        severity: 'error',
        detail: `Cover-story record ${id || '(unknown)'} transitionHistory has invalid phase values.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!isFiniteWeek(entry.week)) {
      pushIssue(issues, {
        code: 'invalid_transition_history_week',
        severity: 'error',
        detail: `Cover-story record ${id || '(unknown)'} transitionHistory week is invalid.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!isDirectLifecycleTransition(entry.fromPhase, entry.toPhase)) {
      pushIssue(issues, {
        code: 'invalid_lifecycle_transition',
        severity: 'error',
        detail: `Cover-story record ${id || '(unknown)'} transitionHistory contains invalid phase transition ${entry.fromPhase} → ${entry.toPhase}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    historyPhase = entry.toPhase
  }

  if (
    history.length > 0 &&
    isLifecyclePhase(record.lifecyclePhase) &&
    historyPhase !== null &&
    historyPhase !== record.lifecyclePhase
  ) {
    pushIssue(issues, {
      code: 'lifecycle_phase_history_mismatch',
      severity: 'error',
      detail: `Cover-story record ${id || '(unknown)'} lifecyclePhase ${record.lifecyclePhase} does not match transitionHistory terminal phase ${historyPhase}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.lifecyclePhase === 'collapsed' || record.lifecyclePhase === 'repairing') {
    const stressedInHistory = history.some((entry) => entry.toPhase === 'stressed')
    const currentlyStressed = record.lifecyclePhase === 'stressed'
    if (!stressedInHistory && !currentlyStressed && record.lifecyclePhase === 'collapsed') {
      pushIssue(issues, {
        code: 'collapsed_without_prior_stressed_phase',
        severity: 'warning',
        detail: `Cover-story record ${id || '(unknown)'} collapsed without a prior stressed phase in transitionHistory.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  const pendingRepair = (record.repairActionHistory ?? []).some(
    (entry) => entry.outcome === 'pending'
  )
  if (record.lifecyclePhase === 'collapsed' && pendingRepair) {
    pushIssue(issues, {
      code: 'collapse_with_pending_repair',
      severity: 'warning',
      detail: `Cover-story record ${id || '(unknown)'} is collapsed while a repair action remains pending.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects cover-story lifecycle review signals without revealing hidden operational truth.
 * Contradiction accumulation surfaces channel kinds and aggregate pressure only.
 */
export function projectCoverStoryLifecycleView(
  record: CoverStoryRecord,
  policy: CoverStoryLifecycleProjectionPolicy = {}
): CoverStoryLifecycleProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)
  const stressThreshold = policy.stressThreshold ?? DEFAULT_COVER_STRESS_THRESHOLD

  const summaryRedacted = redactedFields.has('summary')
  const summary = summaryRedacted ? null : normalizeToken(record.summary ?? '') || null

  const contradictionRedacted =
    redactedFields.has('contradictionPressure') ||
    (policy.redactUnknown === true && unknownFields.includes('contradictionPressure'))

  const capacityRedacted =
    redactedFields.has('coverCapacityScore') ||
    (policy.redactUnknown === true && unknownFields.includes('coverCapacityScore'))

  const motivationRedacted =
    redactedFields.has('coverMotivation') ||
    (policy.redactUnknown === true && unknownFields.includes('coverMotivation'))

  const exposureRedacted =
    redactedFields.has('exposureKind') ||
    (policy.redactUnknown === true && unknownFields.includes('exposureKind'))

  const derivedPressure = deriveContradictionPressure(record)
  const contradictionPressure =
    contradictionRedacted || derivedPressure === null ? null : derivedPressure

  const coverCapacityScore =
    capacityRedacted || record.coverCapacityScore === undefined
      ? null
      : record.coverCapacityScore

  const channels = (record.contradictionChannels ?? []).filter(
    (channel) => channel && typeof channel === 'object' && isContradictionChannelKind(channel.channel)
  )

  const channelHints = Object.freeze(
    [...new Set(channels.map((channel) => channel.channel))].sort((left, right) =>
      left.localeCompare(right)
    )
  )

  const repairHistory = record.repairActionHistory ?? []
  const latestRepairAction =
    repairHistory.length > 0 ? repairHistory[repairHistory.length - 1]?.action ?? null : null

  let confidence: number | null = record.confidence ?? null
  if (redactedFields.has('confidence')) {
    confidence = null
  } else if (
    confidence !== null &&
    policy.minimumConfidence !== undefined &&
    confidence < policy.minimumConfidence
  ) {
    confidence = null
  } else if (policy.redactUnknown === true && unknownFields.includes('confidence')) {
    confidence = null
  }

  const lifecyclePhase = isLifecyclePhase(record.lifecyclePhase)
    ? record.lifecyclePhase
    : DEFAULT_COVER_STORY_LIFECYCLE_PHASE

  const coverStressActive =
    lifecyclePhase === 'stressed' ||
    (contradictionPressure !== null && contradictionPressure >= stressThreshold)

  const redacted =
    summaryRedacted ||
    contradictionRedacted ||
    capacityRedacted ||
    motivationRedacted ||
    exposureRedacted ||
    redactedFields.has('confidence') ||
    (confidence === null &&
      record.confidence !== undefined &&
      policy.minimumConfidence !== undefined)

  return Object.freeze({
    recordId,
    label: normalizeToken(record.label) || '(unknown)',
    summary,
    lifecyclePhase,
    subjectRef: normalizeToken(record.subjectRef) || '(unknown)',
    subjectKind: isSubjectKind(record.subjectKind) ? record.subjectKind : 'event',
    coverMotivation:
      motivationRedacted || record.coverMotivation === undefined
        ? null
        : record.coverMotivation,
    exposureKind:
      exposureRedacted || record.exposureKind === undefined ? null : record.exposureKind,
    contradictionPressure,
    coverCapacityScore,
    activeContradictionChannelCount: channels.length,
    contradictionChannelHints: channelHints,
    latestRepairAction,
    coverStressActive,
    coverCollapsed: lifecyclePhase === 'collapsed',
    repairInProgress: lifecyclePhase === 'repairing',
    confidence,
    redacted,
    unknownFields,
  })
}

// ---------------------------------------------------------------------------
// Persistence sanitize
// ---------------------------------------------------------------------------

function parseStringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function parseContradictionChannels(value: unknown): readonly CoverStoryContradictionChannel[] {
  if (!Array.isArray(value)) {
    return []
  }

  const channels: CoverStoryContradictionChannel[] = []

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue
    }

    const channel = entry.channel
    const accumulationScore = entry.accumulationScore
    if (
      typeof channel !== 'string' ||
      !isContradictionChannelKind(channel) ||
      !isValidUnitScore(accumulationScore)
    ) {
      continue
    }

    const lastUpdatedWeek = isFiniteWeek(entry.lastUpdatedWeek) ? entry.lastUpdatedWeek : undefined
    const sourceRef = normalizeToken(entry.sourceRef ?? '') || undefined

    channels.push({
      channel,
      accumulationScore,
      ...(lastUpdatedWeek !== undefined ? { lastUpdatedWeek } : {}),
      ...(sourceRef ? { sourceRef } : {}),
    })
  }

  return channels
}

function parseRepairActionHistory(value: unknown): readonly CoverStoryRepairActionEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  const entries: CoverStoryRepairActionEntry[] = []

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue
    }

    const action = entry.action
    const week = entry.week
    if (typeof action !== 'string' || !isStagedResponse(action) || !isFiniteWeek(week)) {
      continue
    }

    const note =
      typeof entry.note === 'string' && entry.note.trim().length > 0 ? entry.note.trim() : undefined
    const outcome =
      typeof entry.outcome === 'string' && isRepairOutcome(entry.outcome)
        ? entry.outcome
        : undefined

    entries.push({
      action,
      week,
      ...(note ? { note } : {}),
      ...(outcome ? { outcome } : {}),
    })
  }

  return entries
}

function parseTransitionHistory(value: unknown): readonly CoverStoryTransitionHistoryEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  const entries: CoverStoryTransitionHistoryEntry[] = []

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue
    }

    const fromPhase = entry.fromPhase
    const toPhase = entry.toPhase
    const week = entry.week
    if (
      typeof fromPhase !== 'string' ||
      !isLifecyclePhase(fromPhase) ||
      typeof toPhase !== 'string' ||
      !isLifecyclePhase(toPhase) ||
      !isFiniteWeek(week) ||
      !isDirectLifecycleTransition(fromPhase, toPhase)
    ) {
      continue
    }

    const note =
      typeof entry.note === 'string' && entry.note.trim().length > 0 ? entry.note.trim() : undefined
    const eventRaw = entry.event
    const event =
      typeof eventRaw === 'string' &&
      (eventRaw as CoverStoryLifecycleEvent) in
        (COVER_STORY_LIFECYCLE_TRANSITIONS[fromPhase] as Record<string, CoverStoryLifecyclePhase>)
        ? (eventRaw as CoverStoryLifecycleEvent)
        : undefined

    entries.push({
      fromPhase,
      toPhase,
      week,
      ...(note ? { note } : {}),
      ...(event ? { event } : {}),
    })
  }

  return entries
}

function sanitizeCoverStoryRecordEntry(value: unknown): CoverStoryRecord | null {
  if (!isRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const subjectRef = normalizeToken(value.subjectRef)
  const lifecyclePhase = value.lifecyclePhase
  const subjectKind = value.subjectKind

  if (
    !id ||
    !label ||
    !subjectRef ||
    typeof lifecyclePhase !== 'string' ||
    !isLifecyclePhase(lifecyclePhase) ||
    typeof subjectKind !== 'string' ||
    !isSubjectKind(subjectKind)
  ) {
    return null
  }

  const coverMotivation =
    typeof value.coverMotivation === 'string' && isCoverMotivation(value.coverMotivation)
      ? value.coverMotivation
      : undefined
  const exposureKind =
    typeof value.exposureKind === 'string' && isExposureKind(value.exposureKind)
      ? value.exposureKind
      : undefined
  const activeStagedResponse =
    typeof value.activeStagedResponse === 'string' && isStagedResponse(value.activeStagedResponse)
      ? value.activeStagedResponse
      : undefined

  const contradictionChannels = parseContradictionChannels(value.contradictionChannels)
  const repairActionHistory = parseRepairActionHistory(value.repairActionHistory)
  const transitionHistory = parseTransitionHistory(value.transitionHistory)
  const unknownFields = parseStringList(value.unknownFields)
  const redactedFields = parseStringList(value.redactedFields)

  const summary =
    typeof value.summary === 'string' && value.summary.trim().length > 0
      ? value.summary.trim()
      : undefined
  const linkedTruthLayerRef = normalizeToken(value.linkedTruthLayerRef ?? '') || undefined
  const linkedDisclosureRef = normalizeToken(value.linkedDisclosureRef ?? '') || undefined
  const parentCaseRef = normalizeToken(value.parentCaseRef ?? '') || undefined
  const contradictionPressure = value.contradictionPressure
  const coverCapacityScore = value.coverCapacityScore
  const confidence = value.confidence

  const record: CoverStoryRecord = {
    id,
    label,
    lifecyclePhase,
    subjectRef,
    subjectKind,
    ...(summary ? { summary } : {}),
    ...(coverMotivation ? { coverMotivation } : {}),
    ...(exposureKind ? { exposureKind } : {}),
    ...(linkedTruthLayerRef ? { linkedTruthLayerRef } : {}),
    ...(linkedDisclosureRef ? { linkedDisclosureRef } : {}),
    ...(parentCaseRef ? { parentCaseRef } : {}),
    ...(contradictionChannels.length > 0 ? { contradictionChannels } : {}),
    ...(repairActionHistory.length > 0 ? { repairActionHistory } : {}),
    ...(transitionHistory.length > 0 ? { transitionHistory } : {}),
    ...(activeStagedResponse ? { activeStagedResponse } : {}),
    ...(isValidUnitScore(contradictionPressure) ? { contradictionPressure } : {}),
    ...(isValidUnitScore(coverCapacityScore) ? { coverCapacityScore } : {}),
    ...(isValidUnitScore(confidence) ? { confidence } : {}),
    ...(unknownFields.length > 0 ? { unknownFields } : {}),
    ...(redactedFields.length > 0 ? { redactedFields } : {}),
  }

  if (!validateCoverStoryRecord(record).valid) {
    return null
  }

  return record
}

/** Hydration: canonical record map keyed by record id; drops invalid and duplicate-id entries. */
export function sanitizeCoverStoryRecords(
  value: unknown,
  fallback: CoverStoryRecordsMap = {}
): CoverStoryRecordsMap {
  if (!isRecord(value)) {
    return fallback
  }

  const candidates: CoverStoryRecord[] = []

  for (const entry of Object.values(value)) {
    const record = sanitizeCoverStoryRecordEntry(entry)
    if (!record) {
      continue
    }

    candidates.push(record)
  }

  if (candidates.length === 0) {
    return fallback
  }

  candidates.sort((left, right) => left.id.localeCompare(right.id))

  const next: CoverStoryRecordsMap = {}
  const seenIds = new Set<string>()

  for (const record of candidates.slice(0, MAX_COVER_STORY_RECORDS)) {
    if (seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Coastal campus solvent-spill cover in active maintenance linked to truth-layer cover narrative. */
export const COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE: CoverStoryRecord = defineRecord({
  id: 'cover:coastal-research-campus-solvent-spill',
  label: 'Coastal campus solvent spill cover story',
  summary: 'Regional press cover narrative for precautionary campus evacuation.',
  lifecyclePhase: 'maintained',
  subjectRef: 'site:coastal-research-campus',
  subjectKind: 'site',
  coverMotivation: 'institutional_face_saving',
  exposureKind: 'paranormal',
  linkedTruthLayerRef: 'truth:regional-press-cover-24',
  linkedDisclosureRef: 'disclosure:coastal-research-campus',
  parentCaseRef: 'case:containment-response-24',
  coverCapacityScore: 0.72,
  contradictionPressure: 0.18,
  confidence: 0.61,
  transitionHistory: [
    {
      fromPhase: 'drafted',
      toPhase: 'maintained',
      week: 22,
      event: 'cover_deployed',
      note: 'Press liaison distributes solvent spill framing.',
    },
  ],
})

/** Institutional face-saving cover protecting non-paranormal political exposure. */
export const INSTITUTIONAL_FACE_SAVING_COVER_FIXTURE: CoverStoryRecord = defineRecord({
  id: 'cover:regional-oversight-hearing-delay',
  label: 'Regional oversight hearing scheduling delay cover',
  summary: 'Public scheduling conflict narrative masking liaison briefing backlog.',
  lifecyclePhase: 'maintained',
  subjectRef: 'institution:regional-oversight-board',
  subjectKind: 'institution',
  coverMotivation: 'shame',
  exposureKind: 'political',
  parentCaseRef: 'case:oversight-hearing-11',
  coverCapacityScore: 0.58,
  contradictionPressure: 0.24,
  confidence: 0.49,
  transitionHistory: [
    {
      fromPhase: 'drafted',
      toPhase: 'maintained',
      week: 29,
      event: 'cover_deployed',
      note: 'Staff circulate calendar conflict excuse to press office.',
    },
  ],
})

/** Cover story under contradiction pressure from witness and digital trace channels. */
export const COVER_STORY_STRESSED_FIXTURE: CoverStoryRecord = defineRecord({
  id: 'cover:contractor-forum-leak-response',
  label: 'Contractor forum leak response cover',
  summary: 'Routine maintenance narrative stressed by witness timelines and forum metadata.',
  lifecyclePhase: 'stressed',
  subjectRef: 'site:coastal-research-campus',
  subjectKind: 'site',
  coverMotivation: 'reputation_protection',
  exposureKind: 'institutional',
  linkedTruthLayerRef: 'truth:regional-press-cover-24',
  linkedDisclosureRef: 'disclosure:coastal-research-campus',
  parentCaseRef: 'case:containment-response-24',
  activeStagedResponse: 'reinforcement',
  coverCapacityScore: 0.41,
  contradictionPressure: 0.67,
  contradictionChannels: [
    {
      channel: 'witness_testimony',
      accumulationScore: 0.71,
      lastUpdatedWeek: 23,
      sourceRef: 'witness:contractor-shift-log',
    },
    {
      channel: 'digital_traces',
      accumulationScore: 0.63,
      lastUpdatedWeek: 23,
      sourceRef: 'trace:forum-post-metadata',
    },
  ],
  repairActionHistory: [
    {
      action: 'reinforcement',
      week: 23,
      note: 'Press office reissues solvent spill talking points.',
      outcome: 'pending',
    },
  ],
  confidence: 0.44,
  transitionHistory: [
    {
      fromPhase: 'drafted',
      toPhase: 'maintained',
      week: 22,
      event: 'cover_deployed',
    },
    {
      fromPhase: 'maintained',
      toPhase: 'stressed',
      week: 23,
      event: 'contradiction_accumulated',
      note: 'Witness timelines diverge from cover narrative.',
    },
  ],
})

/** Collapsed cover with failed repair attempt after contradiction buildup. */
export const COVER_STORY_COLLAPSED_FIXTURE: CoverStoryRecord = defineRecord({
  id: 'cover:coastal-campus-cover-collapse',
  label: 'Coastal campus cover collapse — solvent spill narrative',
  summary: 'Public cover collapsed after repair revision failed to reconcile witness evidence.',
  lifecyclePhase: 'collapsed',
  subjectRef: 'site:coastal-research-campus',
  subjectKind: 'site',
  coverMotivation: 'social_anxiety',
  exposureKind: 'social',
  linkedTruthLayerRef: 'truth:regional-press-cover-24',
  linkedDisclosureRef: 'disclosure:coastal-research-campus',
  parentCaseRef: 'case:containment-response-24',
  coverCapacityScore: 0.12,
  contradictionPressure: 0.91,
  contradictionChannels: [
    {
      channel: 'witness_testimony',
      accumulationScore: 0.88,
      lastUpdatedWeek: 24,
      sourceRef: 'witness:regional-press-corroboration',
    },
    {
      channel: 'institutional_records',
      accumulationScore: 0.79,
      lastUpdatedWeek: 24,
      sourceRef: 'record:seal-inspection-summary',
    },
    {
      channel: 'active_surveillance',
      accumulationScore: 0.74,
      lastUpdatedWeek: 24,
      sourceRef: 'surveillance:perimeter-sensor-log',
    },
  ],
  repairActionHistory: [
    {
      action: 'revision',
      week: 24,
      note: 'Comms cell attempts revised spill timeline.',
      outcome: 'worsened',
    },
  ],
  confidence: 0.36,
  transitionHistory: [
    {
      fromPhase: 'drafted',
      toPhase: 'maintained',
      week: 22,
      event: 'cover_deployed',
    },
    {
      fromPhase: 'maintained',
      toPhase: 'stressed',
      week: 23,
      event: 'contradiction_accumulated',
    },
    {
      fromPhase: 'stressed',
      toPhase: 'collapsed',
      week: 24,
      event: 'cover_collapsed',
      note: 'Regional press publishes corroborating witness account.',
    },
  ],
})

/** Coastal campus cover-story fixtures keyed by record id. */
export const COASTAL_CAMPUS_COVER_STORY_FIXTURES: CoverStoryRecordsMap = Object.freeze({
  [COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id]: COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
  [COVER_STORY_STRESSED_FIXTURE.id]: COVER_STORY_STRESSED_FIXTURE,
  [COVER_STORY_COLLAPSED_FIXTURE.id]: COVER_STORY_COLLAPSED_FIXTURE,
})
