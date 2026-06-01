/**
 * SPE-2119 slice 1: anti-narrative record-collapse registry.
 *
 * Pure deterministic registry for hazards that attack story coherence,
 * causality chains, report structure, and institutional memory — distinct
 * from unified cognitive hazard engine wire-up (SPE-1309).
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type AntiNarrativeCollapseId = string

export type AntiNarrativeCollapseMode =
  | 'causality_gap'
  | 'character_erasure'
  | 'plot_hole'
  | 'report_unwrite'

export const ANTI_NARRATIVE_COLLAPSE_MODES: readonly AntiNarrativeCollapseMode[] = [
  'causality_gap',
  'character_erasure',
  'plot_hole',
  'report_unwrite',
] as const

export type AntiNarrativeCountermeasureState =
  | 'none'
  | 'patch_narrative'
  | 'quarantine_corpus'
  | 'failed'

export const ANTI_NARRATIVE_COUNTERMEASURE_STATES: readonly AntiNarrativeCountermeasureState[] = [
  'none',
  'patch_narrative',
  'quarantine_corpus',
  'failed',
] as const

export type RecordDegradationBand = 'stable' | 'eroding' | 'critical'

export const RECORD_DEGRADATION_BANDS: readonly RecordDegradationBand[] = [
  'stable',
  'eroding',
  'critical',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface AntiNarrativeCollapseRecord {
  readonly id: AntiNarrativeCollapseId
  readonly label: string
  readonly summary?: string
  readonly collapseMode: AntiNarrativeCollapseMode
  readonly affectedMediaRefs: readonly string[]
  readonly coherenceScore: number
  readonly detectionLagWeeks: number
  readonly countermeasureState: AntiNarrativeCountermeasureState
  readonly countermeasureAttemptRefs?: readonly string[]
  readonly institutionalBlindSpotRefs?: readonly string[]
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type AntiNarrativeCollapseValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'invalid_collapse_mode'
  | 'invalid_countermeasure_state'
  | 'invalid_coherence_score'
  | 'invalid_detection_lag_weeks'
  | 'invalid_confidence'
  | 'invalid_affected_media_refs'
  | 'invalid_affected_media_ref'
  | 'empty_affected_media_ref'
  | 'invalid_countermeasure_attempt_refs'
  | 'invalid_countermeasure_attempt_ref'
  | 'empty_countermeasure_attempt_ref'
  | 'invalid_institutional_blind_spot_refs'
  | 'invalid_institutional_blind_spot_ref'
  | 'empty_institutional_blind_spot_ref'
  | 'failed_countermeasure_without_documented_attempt'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface AntiNarrativeCollapseValidationIssue {
  readonly code: AntiNarrativeCollapseValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface AntiNarrativeCollapseValidationResult {
  readonly valid: boolean
  readonly issues: readonly AntiNarrativeCollapseValidationIssue[]
}

// ---------------------------------------------------------------------------
// Integrity-loss projection
// ---------------------------------------------------------------------------

export interface RecordIntegrityLossProjectionPolicy {
  readonly currentWeek?: number
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
  readonly suppressHiddenConflictLabels?: boolean
}

export interface RecordIntegrityMediaSymptom {
  readonly ref: string
  readonly symptomDescriptor: string
  readonly surfaceHint: string | null
}

export interface RecordIntegrityLossProjection {
  readonly recordId: AntiNarrativeCollapseId
  readonly label: string
  readonly collapseMode: AntiNarrativeCollapseMode
  readonly countermeasureState: AntiNarrativeCountermeasureState
  readonly projectedCoherenceScore: number | null
  readonly degradationBand: RecordDegradationBand | null
  readonly mediaSymptoms: readonly RecordIntegrityMediaSymptom[]
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const ANTI_NARRATIVE_COLLAPSE_MODE_SET = new Set<string>(ANTI_NARRATIVE_COLLAPSE_MODES)
const ANTI_NARRATIVE_COUNTERMEASURE_STATE_SET = new Set<string>(ANTI_NARRATIVE_COUNTERMEASURE_STATES)

export const FRANCHISE_TOKEN_PATTERN =
  /\b(scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|goi-|group of interest|broken masquerade|masquerade breach|wiki\.|wikidot)(?!\w)/i

export const BRANDED_OBJECT_NUMBER_PATTERN = /\bSCP[\s-]?\d{3,4}\b/i

const COLLAPSE_MODE_DECAY_RATE: Readonly<Record<AntiNarrativeCollapseMode, number>> = {
  causality_gap: 0.04,
  character_erasure: 0.05,
  plot_hole: 0.06,
  report_unwrite: 0.07,
}

const COUNTERMEASURE_DECAY_FACTOR: Readonly<Record<AntiNarrativeCountermeasureState, number>> = {
  none: 1,
  patch_narrative: 0.55,
  quarantine_corpus: 0.25,
  failed: 1.35,
}

const MODE_SYMPTOM_PREFIX: Readonly<Record<AntiNarrativeCollapseMode, string>> = {
  causality_gap: 'Causality cross-reference drift reported for',
  character_erasure: 'Personnel roster inconsistency reported for',
  plot_hole: 'Timeline gap symptom reported for',
  report_unwrite: 'Report section legibility loss reported for',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
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

function pushIssue(
  issues: AntiNarrativeCollapseValidationIssue[],
  issue: AntiNarrativeCollapseValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: AntiNarrativeCollapseValidationIssue[]) {
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

function isValidUnitScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value === Math.trunc(value)
  )
}

function roundUnit(value: number): number {
  return Math.round(value * 1000) / 1000
}

function freezeValidationResult(
  issues: AntiNarrativeCollapseValidationIssue[]
): AntiNarrativeCollapseValidationResult {
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

function containsFranchiseToken(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && FRANCHISE_TOKEN_PATTERN.test(token)
}

function containsBrandedObjectNumber(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && BRANDED_OBJECT_NUMBER_PATTERN.test(token)
}

function scanStringFieldTokens(
  issues: AntiNarrativeCollapseValidationIssue[],
  id: string,
  field: string,
  value: string
) {
  const token = normalizeToken(value)
  if (!token) {
    return
  }

  if (containsFranchiseToken(token)) {
    pushIssue(issues, {
      code: 'franchise_token_in_field',
      severity: 'error',
      detail: `Anti-narrative collapse record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(token)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_field',
      severity: 'error',
      detail: `Anti-narrative collapse record ${id || '(unknown)'} field ${field} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function scanRefArrayTokens(
  issues: AntiNarrativeCollapseValidationIssue[],
  id: string,
  field: string,
  refs: readonly string[]
) {
  for (const ref of refs) {
    scanStringFieldTokens(issues, id, field, ref)
  }
}

function scanForbiddenTokens(
  issues: AntiNarrativeCollapseValidationIssue[],
  id: string,
  label: string,
  record: AntiNarrativeCollapseRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Anti-narrative collapse record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Anti-narrative collapse record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Anti-narrative collapse record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Anti-narrative collapse record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.summary) {
    scanStringFieldTokens(issues, id, 'summary', record.summary)
  }

  scanRefArrayTokens(issues, id, 'affectedMediaRefs', asStringArray(record.affectedMediaRefs))
  scanRefArrayTokens(
    issues,
    id,
    'countermeasureAttemptRefs',
    asStringArray(record.countermeasureAttemptRefs)
  )
  scanRefArrayTokens(
    issues,
    id,
    'institutionalBlindSpotRefs',
    asStringArray(record.institutionalBlindSpotRefs)
  )
}

function validateStringRefArray(
  issues: AntiNarrativeCollapseValidationIssue[],
  id: string,
  fieldName: string,
  value: unknown,
  invalidArrayCode: AntiNarrativeCollapseValidationCode,
  invalidEntryCode: AntiNarrativeCollapseValidationCode,
  emptyEntryCode: AntiNarrativeCollapseValidationCode,
  required: boolean
) {
  if (value === undefined) {
    if (required) {
      pushIssue(issues, {
        code: invalidArrayCode,
        severity: 'error',
        detail: `Anti-narrative collapse record ${id || '(unknown)'} ${fieldName} is required.`,
        relatedIds: id ? [id] : undefined,
      })
    }
    return
  }

  if (!Array.isArray(value)) {
    pushIssue(issues, {
      code: invalidArrayCode,
      severity: 'error',
      detail: `Anti-narrative collapse record ${id || '(unknown)'} ${fieldName} must be an array.`,
      relatedIds: id ? [id] : undefined,
    })
    return
  }

  if (required && value.length === 0) {
    pushIssue(issues, {
      code: invalidArrayCode,
      severity: 'error',
      detail: `Anti-narrative collapse record ${id || '(unknown)'} ${fieldName} must contain at least one ref.`,
      relatedIds: id ? [id] : undefined,
    })
    return
  }

  for (const entry of value) {
    if (typeof entry !== 'string') {
      pushIssue(issues, {
        code: invalidEntryCode,
        severity: 'error',
        detail: `Anti-narrative collapse record ${id || '(unknown)'} ${fieldName} contains a non-string ref.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!normalizeToken(entry)) {
      pushIssue(issues, {
        code: emptyEntryCode,
        severity: 'error',
        detail: `Anti-narrative collapse record ${id || '(unknown)'} ${fieldName} contains an empty ref.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }
}

function hasDocumentedCountermeasureAttempt(record: AntiNarrativeCollapseRecord): boolean {
  return asStringArray(record.countermeasureAttemptRefs).some((ref) => normalizeToken(ref).length > 0)
}

function resolveConfidence(
  record: AntiNarrativeCollapseRecord,
  policy: RecordIntegrityLossProjectionPolicy
): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (redactedFields.has('confidence')) {
    return null
  }

  const confidence = record.confidence ?? null
  if (
    confidence !== null &&
    policy.minimumConfidence !== undefined &&
    confidence < policy.minimumConfidence
  ) {
    return null
  }

  if (policy.redactUnknown === true && unknownFields.includes('confidence')) {
    return null
  }

  return confidence
}

function resolveProjectedCoherenceScore(
  record: AntiNarrativeCollapseRecord,
  policy: RecordIntegrityLossProjectionPolicy
): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (redactedFields.has('coherenceScore')) {
    return null
  }

  if (policy.redactUnknown === true && unknownFields.includes('coherenceScore')) {
    return null
  }

  if (!isValidUnitScore(record.coherenceScore)) {
    return null
  }

  const collapseMode = isAntiNarrativeCollapseMode(record.collapseMode)
    ? record.collapseMode
    : 'causality_gap'
  const countermeasureState = isAntiNarrativeCountermeasureState(record.countermeasureState)
    ? record.countermeasureState
    : 'none'
  const lagWeeks = isNonNegativeInteger(record.detectionLagWeeks) ? record.detectionLagWeeks : 0
  const currentWeek =
    typeof policy.currentWeek === 'number' && Number.isFinite(policy.currentWeek)
      ? Math.max(0, Math.trunc(policy.currentWeek))
      : 0

  const decayWeeks = Math.max(0, currentWeek - lagWeeks)
  const decayAmount =
    decayWeeks *
    COLLAPSE_MODE_DECAY_RATE[collapseMode] *
    COUNTERMEASURE_DECAY_FACTOR[countermeasureState]

  return roundUnit(Math.max(0, record.coherenceScore - decayAmount))
}

function resolveDegradationBand(score: number | null): RecordDegradationBand | null {
  if (score === null) {
    return null
  }

  if (score >= 0.7) {
    return 'stable'
  }

  if (score >= 0.4) {
    return 'eroding'
  }

  return 'critical'
}

function resolveSurfaceHint(
  record: AntiNarrativeCollapseRecord,
  _ref: string,
  policy: RecordIntegrityLossProjectionPolicy
): string | null {
  if (policy.suppressHiddenConflictLabels === true) {
    return null
  }

  const collapseMode = isAntiNarrativeCollapseMode(record.collapseMode)
    ? record.collapseMode
    : 'causality_gap'
  return `${collapseMode}_surface`
}

function buildSymptomDescriptor(record: AntiNarrativeCollapseRecord, ref: string): string {
  const collapseMode = isAntiNarrativeCollapseMode(record.collapseMode)
    ? record.collapseMode
    : 'causality_gap'
  const refToken = normalizeToken(ref) || 'unknown_ref'

  return `${MODE_SYMPTOM_PREFIX[collapseMode]} ${refToken}`
}

function buildMediaSymptoms(
  record: AntiNarrativeCollapseRecord,
  policy: RecordIntegrityLossProjectionPolicy
): readonly RecordIntegrityMediaSymptom[] {
  const refs = asStringArray(record.affectedMediaRefs)
    .map((ref) => normalizeToken(ref))
    .filter((ref) => ref.length > 0)
    .sort((left, right) => left.localeCompare(right))

  return Object.freeze(
    refs.map((ref) =>
      Object.freeze({
        ref,
        symptomDescriptor: buildSymptomDescriptor(record, ref),
        surfaceHint: resolveSurfaceHint(record, ref, policy),
      })
    )
  )
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isAntiNarrativeCollapseMode(value: unknown): value is AntiNarrativeCollapseMode {
  return typeof value === 'string' && ANTI_NARRATIVE_COLLAPSE_MODE_SET.has(value)
}

export function isAntiNarrativeCountermeasureState(
  value: unknown
): value is AntiNarrativeCountermeasureState {
  return typeof value === 'string' && ANTI_NARRATIVE_COUNTERMEASURE_STATE_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateAntiNarrativeCollapseRecord(
  record: AntiNarrativeCollapseRecord
): AntiNarrativeCollapseValidationResult {
  const issues: AntiNarrativeCollapseValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Anti-narrative collapse record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Anti-narrative collapse record is missing label.',
    })
  }

  if (!isAntiNarrativeCollapseMode(record.collapseMode)) {
    pushIssue(issues, {
      code: 'invalid_collapse_mode',
      severity: 'error',
      detail: `Anti-narrative collapse record ${id || '(unknown)'} has invalid collapseMode ${String(record.collapseMode)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isAntiNarrativeCountermeasureState(record.countermeasureState)) {
    pushIssue(issues, {
      code: 'invalid_countermeasure_state',
      severity: 'error',
      detail: `Anti-narrative collapse record ${id || '(unknown)'} has invalid countermeasureState ${String(record.countermeasureState)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isValidUnitScore(record.coherenceScore)) {
    pushIssue(issues, {
      code: 'invalid_coherence_score',
      severity: 'error',
      detail: `Anti-narrative collapse record ${id || '(unknown)'} coherenceScore must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isNonNegativeInteger(record.detectionLagWeeks)) {
    pushIssue(issues, {
      code: 'invalid_detection_lag_weeks',
      severity: 'error',
      detail: `Anti-narrative collapse record ${id || '(unknown)'} detectionLagWeeks must be a non-negative integer.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Anti-narrative collapse record ${id || '(unknown)'} confidence must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  validateStringRefArray(
    issues,
    id,
    'affectedMediaRefs',
    record.affectedMediaRefs,
    'invalid_affected_media_refs',
    'invalid_affected_media_ref',
    'empty_affected_media_ref',
    true
  )

  validateStringRefArray(
    issues,
    id,
    'countermeasureAttemptRefs',
    record.countermeasureAttemptRefs,
    'invalid_countermeasure_attempt_refs',
    'invalid_countermeasure_attempt_ref',
    'empty_countermeasure_attempt_ref',
    false
  )

  validateStringRefArray(
    issues,
    id,
    'institutionalBlindSpotRefs',
    record.institutionalBlindSpotRefs,
    'invalid_institutional_blind_spot_refs',
    'invalid_institutional_blind_spot_ref',
    'empty_institutional_blind_spot_ref',
    false
  )

  scanForbiddenTokens(issues, id, label, record)

  if (record.countermeasureState === 'failed' && !hasDocumentedCountermeasureAttempt(record)) {
    pushIssue(issues, {
      code: 'failed_countermeasure_without_documented_attempt',
      severity: 'warning',
      detail: `Anti-narrative collapse record ${id || '(unknown)'} reports failed countermeasure without documented attempt refs.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects briefing/dossier integrity loss with lag-aware coherence decay.
 * Does not emit omniscient hidden-attack labels.
 */
export function projectRecordIntegrityLoss(
  record: AntiNarrativeCollapseRecord,
  policy: RecordIntegrityLossProjectionPolicy = {}
): RecordIntegrityLossProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)
  const confidence = resolveConfidence(record, policy)
  const projectedCoherenceScore = resolveProjectedCoherenceScore(record, policy)

  const mediaRedacted =
    redactedFields.has('affectedMediaRefs') ||
    (policy.redactUnknown === true && unknownFields.includes('affectedMediaRefs'))

  const mediaSymptoms = mediaRedacted ? Object.freeze([]) : buildMediaSymptoms(record, policy)

  const coherenceRedacted =
    redactedFields.has('coherenceScore') ||
    (policy.redactUnknown === true && unknownFields.includes('coherenceScore'))

  const redacted =
    mediaRedacted ||
    coherenceRedacted ||
    redactedFields.has('confidence') ||
    (policy.redactUnknown === true && unknownFields.includes('confidence')) ||
    (confidence === null && record.confidence !== undefined && policy.minimumConfidence !== undefined)

  return Object.freeze({
    recordId,
    label: normalizeToken(record.label) || '(unknown)',
    collapseMode: isAntiNarrativeCollapseMode(record.collapseMode)
      ? record.collapseMode
      : 'causality_gap',
    countermeasureState: isAntiNarrativeCountermeasureState(record.countermeasureState)
      ? record.countermeasureState
      : 'none',
    projectedCoherenceScore,
    degradationBand: resolveDegradationBand(projectedCoherenceScore),
    mediaSymptoms,
    confidence,
    redacted,
    unknownFields,
  })
}

function defineRecord(record: AntiNarrativeCollapseRecord): AntiNarrativeCollapseRecord {
  return Object.freeze({ ...record })
}

/** Causality-gap collapse with quarantined corpus countermeasure. */
export const CAUSALITY_GAP_QUARANTINE_FIXTURE: AntiNarrativeCollapseRecord = defineRecord({
  id: 'anti-narrative:causality-gap-quarantine',
  label: 'Causality gap with corpus quarantine',
  summary: 'Cross-report causality breaks contained via corpus quarantine countermeasure.',
  collapseMode: 'causality_gap',
  affectedMediaRefs: ['media:incident-briefing-14', 'media:dossier-chain-3'],
  coherenceScore: 0.78,
  detectionLagWeeks: 2,
  countermeasureState: 'quarantine_corpus',
  countermeasureAttemptRefs: ['countermeasure:corpus-quarantine-attempt-2'],
  institutionalBlindSpotRefs: ['blindspot:review-board-template-gap'],
  confidence: 0.74,
})

/** Plot-hole collapse with lagged coherence decay (no active countermeasure). */
export const COHERENCE_DECAY_LAG_FIXTURE: AntiNarrativeCollapseRecord = defineRecord({
  id: 'anti-narrative:plot-hole-lagged-decay',
  label: 'Plot-hole collapse with detection lag',
  summary: 'Coherence erosion delayed by detection lag before observable dossier degradation.',
  collapseMode: 'plot_hole',
  affectedMediaRefs: ['media:weekly-status-report-22'],
  coherenceScore: 0.85,
  detectionLagWeeks: 4,
  countermeasureState: 'none',
  confidence: 0.69,
})
