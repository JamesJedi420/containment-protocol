/**
 * SPE-1615 slice 1: psychological resilience depletion registry anchor.
 *
 * Pure deterministic registry for operator psychological resilience under repeated
 * exposure to impossible evidence, cognitohazard contact, and containment failure —
 * distinct from multi-axis fatigue channels (SPE-130) and responder energy budget.
 */

import {
  BRANDED_OBJECT_NUMBER_PATTERN,
  FRANCHISE_TOKEN_PATTERN,
} from './containedPersonTherapeuticCareRegistry'

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type PsychologicalResilienceId = string

export type ResilienceDepletionBand = 'stable' | 'strained' | 'depleted' | 'compromised' | 'breakdown'

export const RESILIENCE_DEPLETION_BANDS: readonly ResilienceDepletionBand[] = [
  'stable',
  'strained',
  'depleted',
  'compromised',
  'breakdown',
] as const

export type ResilienceExposureSource =
  | 'impossible_evidence'
  | 'cognitohazard_contact'
  | 'forbidden_knowledge'
  | 'containment_failure_witness'

export const RESILIENCE_EXPOSURE_SOURCES: readonly ResilienceExposureSource[] = [
  'impossible_evidence',
  'cognitohazard_contact',
  'forbidden_knowledge',
  'containment_failure_witness',
] as const

export type ResilienceComplication =
  | 'hypervigilance'
  | 'memory_gaps'
  | 'communication_strain'
  | 'fixation'
  | 'avoidance'

export const RESILIENCE_COMPLICATIONS: readonly ResilienceComplication[] = [
  'hypervigilance',
  'memory_gaps',
  'communication_strain',
  'fixation',
  'avoidance',
] as const

export type ResilienceRecoveryChannel =
  | 'rest_recoverable'
  | 'counseling_recommended'
  | 'treatment_required'
  | 'long_horizon_harm'

export const RESILIENCE_RECOVERY_CHANNELS: readonly ResilienceRecoveryChannel[] = [
  'rest_recoverable',
  'counseling_recommended',
  'treatment_required',
  'long_horizon_harm',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface PsychologicalResilienceRecord {
  readonly id: PsychologicalResilienceId
  readonly label: string
  readonly summary?: string
  readonly operatorRef: string
  readonly depletionBand: ResilienceDepletionBand
  readonly exposureScore: number
  readonly exposureEventCount: number
  readonly exposureSources?: readonly ResilienceExposureSource[]
  readonly activeComplications?: readonly ResilienceComplication[]
  readonly recoveryChannel: ResilienceRecoveryChannel
  readonly treatmentRequired: boolean
  readonly restRecoverable: boolean
  readonly counselingRef?: string
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type PsychologicalResilienceValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_operator_ref'
  | 'invalid_depletion_band'
  | 'invalid_exposure_score'
  | 'invalid_exposure_event_count'
  | 'invalid_recovery_channel'
  | 'invalid_complication'
  | 'invalid_exposure_source'
  | 'invalid_confidence'
  | 'breakdown_without_treatment_gate'
  | 'breakdown_marked_rest_recoverable'
  | 'treatment_channel_without_treatment_flag'
  | 'long_horizon_harm_marked_rest_recoverable'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface PsychologicalResilienceValidationIssue {
  readonly code: PsychologicalResilienceValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface PsychologicalResilienceValidationResult {
  readonly valid: boolean
  readonly issues: readonly PsychologicalResilienceValidationIssue[]
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export interface PsychologicalResilienceProjectionPolicy {
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
  readonly highExposureThreshold?: number
}

export interface PsychologicalResilienceProjection {
  readonly recordId: PsychologicalResilienceId
  readonly label: string
  readonly operatorRef: string
  readonly depletionBand: ResilienceDepletionBand
  readonly exposureScore: number | null
  readonly exposureEventCount: number
  readonly exposureElevated: boolean
  readonly depletionAdvanced: boolean
  readonly complicationActive: boolean
  readonly minorComplicationBeforeBreakdown: boolean
  readonly treatmentGated: boolean
  readonly restRecoveryEligible: boolean
  readonly dutyReliabilityDegraded: boolean
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const DEPLETION_BAND_SET = new Set<string>(RESILIENCE_DEPLETION_BANDS)
const EXPOSURE_SOURCE_SET = new Set<string>(RESILIENCE_EXPOSURE_SOURCES)
const COMPLICATION_SET = new Set<string>(RESILIENCE_COMPLICATIONS)
const RECOVERY_CHANNEL_SET = new Set<string>(RESILIENCE_RECOVERY_CHANNELS)

const DEFAULT_HIGH_EXPOSURE_THRESHOLD = 0.6

const ADVANCED_DEPLETION_BANDS: ReadonlySet<ResilienceDepletionBand> = new Set([
  'depleted',
  'compromised',
  'breakdown',
])

const DEGRADED_DUTY_BANDS: ReadonlySet<ResilienceDepletionBand> = new Set([
  'compromised',
  'breakdown',
])

const TREATMENT_GATED_CHANNELS: ReadonlySet<ResilienceRecoveryChannel> = new Set([
  'treatment_required',
  'long_horizon_harm',
])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown): string {
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
  issues: PsychologicalResilienceValidationIssue[],
  issue: PsychologicalResilienceValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: PsychologicalResilienceValidationIssue[]) {
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
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function roundUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.round(clampUnit(value) * 1000) / 1000
}

function containsFranchiseToken(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && FRANCHISE_TOKEN_PATTERN.test(token)
}

function containsBrandedObjectNumber(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && BRANDED_OBJECT_NUMBER_PATTERN.test(token)
}

function freezeValidationResult(
  issues: PsychologicalResilienceValidationIssue[]
): PsychologicalResilienceValidationResult {
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

function scanForbiddenTokens(
  issues: PsychologicalResilienceValidationIssue[],
  id: string,
  label: string,
  record: PsychologicalResilienceRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Psychological resilience record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Psychological resilience record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Psychological resilience record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Psychological resilience record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const stringFields: Array<{ field: string; value: string | undefined }> = [
    { field: 'summary', value: record.summary },
    { field: 'operatorRef', value: record.operatorRef },
    { field: 'counselingRef', value: record.counselingRef },
  ]

  for (const { field, value } of stringFields) {
    const token = normalizeToken(value ?? '')
    if (!token) {
      continue
    }

    if (containsFranchiseToken(token)) {
      pushIssue(issues, {
        code: 'franchise_token_in_field',
        severity: 'error',
        detail: `Psychological resilience record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (containsBrandedObjectNumber(token)) {
      pushIssue(issues, {
        code: 'branded_object_number_in_field',
        severity: 'error',
        detail: `Psychological resilience record ${id || '(unknown)'} field ${field} contains a branded object number.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }
}

function resolveOptionalUnitScore(
  record: PsychologicalResilienceRecord,
  field: keyof PsychologicalResilienceRecord,
  policy: PsychologicalResilienceProjectionPolicy
): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (redactedFields.has(field)) {
    return null
  }

  if (policy.redactUnknown === true && unknownFields.includes(field)) {
    return null
  }

  const value = record[field]
  if (value === undefined || value === null) {
    return null
  }

  return isValidUnitScore(value) ? roundUnit(value) : null
}

function resolveConfidence(
  record: PsychologicalResilienceRecord,
  policy: PsychologicalResilienceProjectionPolicy
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

  return confidence !== null && isValidUnitScore(confidence) ? roundUnit(confidence) : null
}

function sortedComplications(
  value: readonly ResilienceComplication[] | undefined
): readonly ResilienceComplication[] {
  if (!value || value.length === 0) {
    return Object.freeze([])
  }

  return Object.freeze([...value].sort((left, right) => left.localeCompare(right)))
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isResilienceDepletionBand(value: unknown): value is ResilienceDepletionBand {
  return typeof value === 'string' && DEPLETION_BAND_SET.has(value)
}

export function isResilienceRecoveryChannel(value: unknown): value is ResilienceRecoveryChannel {
  return typeof value === 'string' && RECOVERY_CHANNEL_SET.has(value)
}

export function isResilienceComplication(value: unknown): value is ResilienceComplication {
  return typeof value === 'string' && COMPLICATION_SET.has(value)
}

export function isResilienceExposureSource(value: unknown): value is ResilienceExposureSource {
  return typeof value === 'string' && EXPOSURE_SOURCE_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validatePsychologicalResilienceRecord(
  record: PsychologicalResilienceRecord
): PsychologicalResilienceValidationResult {
  const issues: PsychologicalResilienceValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const operatorRef = normalizeToken(record.operatorRef)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Psychological resilience record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Psychological resilience record is missing label.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!operatorRef) {
    pushIssue(issues, {
      code: 'missing_operator_ref',
      severity: 'error',
      detail: 'Psychological resilience record is missing operatorRef.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isResilienceDepletionBand(record.depletionBand)) {
    pushIssue(issues, {
      code: 'invalid_depletion_band',
      severity: 'error',
      detail: `Psychological resilience record ${id || '(unknown)'} has invalid depletionBand.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isValidUnitScore(record.exposureScore)) {
    pushIssue(issues, {
      code: 'invalid_exposure_score',
      severity: 'error',
      detail: `Psychological resilience record ${id || '(unknown)'} has invalid exposureScore.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isNonNegativeInteger(record.exposureEventCount)) {
    pushIssue(issues, {
      code: 'invalid_exposure_event_count',
      severity: 'error',
      detail: `Psychological resilience record ${id || '(unknown)'} has invalid exposureEventCount.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isResilienceRecoveryChannel(record.recoveryChannel)) {
    pushIssue(issues, {
      code: 'invalid_recovery_channel',
      severity: 'error',
      detail: `Psychological resilience record ${id || '(unknown)'} has invalid recoveryChannel.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Psychological resilience record ${id || '(unknown)'} has invalid confidence.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const complication of asStringArray(record.activeComplications)) {
    if (!isResilienceComplication(complication)) {
      pushIssue(issues, {
        code: 'invalid_complication',
        severity: 'error',
        detail: `Psychological resilience record ${id || '(unknown)'} has invalid complication ${complication}.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const source of asStringArray(record.exposureSources)) {
    if (!isResilienceExposureSource(source)) {
      pushIssue(issues, {
        code: 'invalid_exposure_source',
        severity: 'error',
        detail: `Psychological resilience record ${id || '(unknown)'} has invalid exposure source ${source}.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (record.depletionBand === 'breakdown' && !record.treatmentRequired) {
    pushIssue(issues, {
      code: 'breakdown_without_treatment_gate',
      severity: 'warning',
      detail: `Psychological resilience record ${id || '(unknown)'} is in breakdown without treatmentRequired.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.depletionBand === 'breakdown' && record.restRecoverable) {
    pushIssue(issues, {
      code: 'breakdown_marked_rest_recoverable',
      severity: 'warning',
      detail: `Psychological resilience record ${id || '(unknown)'} is in breakdown but marked restRecoverable.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    TREATMENT_GATED_CHANNELS.has(record.recoveryChannel) &&
    !record.treatmentRequired
  ) {
    pushIssue(issues, {
      code: 'treatment_channel_without_treatment_flag',
      severity: 'warning',
      detail: `Psychological resilience record ${id || '(unknown)'} uses treatment-gated recovery channel without treatmentRequired.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.recoveryChannel === 'long_horizon_harm' && record.restRecoverable) {
    pushIssue(issues, {
      code: 'long_horizon_harm_marked_rest_recoverable',
      severity: 'warning',
      detail: `Psychological resilience record ${id || '(unknown)'} has long-horizon harm but is marked restRecoverable.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  scanForbiddenTokens(issues, id, label, record)

  return freezeValidationResult(issues)
}

export function projectPsychologicalResilienceReview(
  record: PsychologicalResilienceRecord,
  policy: PsychologicalResilienceProjectionPolicy = {}
): PsychologicalResilienceProjection {
  const highExposureThreshold =
    typeof policy.highExposureThreshold === 'number' &&
    Number.isFinite(policy.highExposureThreshold)
      ? clampUnit(policy.highExposureThreshold)
      : DEFAULT_HIGH_EXPOSURE_THRESHOLD

  const exposureScore = resolveOptionalUnitScore(record, 'exposureScore', policy)
  const activeComplications = sortedComplications(record.activeComplications)
  const complicationActive = activeComplications.length > 0
  const minorComplicationBeforeBreakdown =
    complicationActive && record.depletionBand !== 'breakdown'
  const treatmentGated =
    record.treatmentRequired || TREATMENT_GATED_CHANNELS.has(record.recoveryChannel)
  const restRecoveryEligible =
    record.restRecoverable && record.depletionBand !== 'breakdown' && !treatmentGated

  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)

  return Object.freeze({
    recordId: record.id,
    label: record.label,
    operatorRef: record.operatorRef,
    depletionBand: record.depletionBand,
    exposureScore,
    exposureEventCount: record.exposureEventCount,
    exposureElevated:
      exposureScore !== null && exposureScore >= highExposureThreshold,
    depletionAdvanced: ADVANCED_DEPLETION_BANDS.has(record.depletionBand),
    complicationActive,
    minorComplicationBeforeBreakdown,
    treatmentGated,
    restRecoveryEligible,
    dutyReliabilityDegraded:
      DEGRADED_DUTY_BANDS.has(record.depletionBand) || complicationActive,
    confidence: resolveConfidence(record, policy),
    redacted: redactedFields.size > 0,
    unknownFields,
  })
}

export type PsychologicalResilienceRecordsMap = Record<
  PsychologicalResilienceId,
  PsychologicalResilienceRecord
>

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseStringList(value: unknown): readonly string[] {
  return sortedStringArray(value)
}

function sanitizeComplicationList(value: unknown): readonly ResilienceComplication[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const next = value.filter((entry): entry is ResilienceComplication =>
    isResilienceComplication(entry)
  )

  return next.length > 0 ? Object.freeze([...next].sort((left, right) => left.localeCompare(right))) : undefined
}

function sanitizeExposureSourceList(
  value: unknown
): readonly ResilienceExposureSource[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const next = value.filter((entry): entry is ResilienceExposureSource =>
    isResilienceExposureSource(entry)
  )

  return next.length > 0 ? Object.freeze([...next].sort((left, right) => left.localeCompare(right))) : undefined
}

function sanitizePsychologicalResilienceRecordEntry(
  value: unknown
): PsychologicalResilienceRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const operatorRef = normalizeToken(value.operatorRef)
  const depletionBand = value.depletionBand
  const exposureScore = value.exposureScore
  const exposureEventCount = value.exposureEventCount
  const recoveryChannel = value.recoveryChannel

  if (
    !id ||
    !label ||
    !operatorRef ||
    !isResilienceDepletionBand(depletionBand) ||
    !isValidUnitScore(exposureScore) ||
    !isNonNegativeInteger(exposureEventCount) ||
    !isResilienceRecoveryChannel(recoveryChannel) ||
    typeof value.treatmentRequired !== 'boolean' ||
    typeof value.restRecoverable !== 'boolean'
  ) {
    return null
  }

  const summary =
    typeof value.summary === 'string' && value.summary.trim().length > 0
      ? value.summary.trim()
      : undefined
  const exposureSources = sanitizeExposureSourceList(value.exposureSources)
  const activeComplications = sanitizeComplicationList(value.activeComplications)
  const counselingRef = normalizeToken(value.counselingRef ?? '') || undefined
  const confidence = value.confidence
  const unknownFields = parseStringList(value.unknownFields)
  const redactedFields = parseStringList(value.redactedFields)

  const record: PsychologicalResilienceRecord = {
    id,
    label,
    operatorRef,
    depletionBand,
    exposureScore,
    exposureEventCount,
    recoveryChannel,
    treatmentRequired: value.treatmentRequired,
    restRecoverable: value.restRecoverable,
    ...(summary ? { summary } : {}),
    ...(exposureSources ? { exposureSources } : {}),
    ...(activeComplications ? { activeComplications } : {}),
    ...(counselingRef ? { counselingRef } : {}),
    ...(isValidUnitScore(confidence) ? { confidence } : {}),
    ...(unknownFields.length > 0 ? { unknownFields } : {}),
    ...(redactedFields.length > 0 ? { redactedFields } : {}),
  }

  if (!validatePsychologicalResilienceRecord(record).valid) {
    return null
  }

  return record
}

/** Hydration: canonical resilience map keyed by record id; drops invalid and duplicate-id entries. */
export function sanitizePsychologicalResilienceRecords(
  value: unknown,
  fallback: PsychologicalResilienceRecordsMap = {}
): PsychologicalResilienceRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: PsychologicalResilienceRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizePsychologicalResilienceRecordEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

function defineRecord(record: PsychologicalResilienceRecord): PsychologicalResilienceRecord {
  return Object.freeze({ ...record })
}

/** Field operator with stable resilience under routine exposure. */
export const PSYCHOLOGICAL_RESILIENCE_STABLE_OPERATOR_FIXTURE: PsychologicalResilienceRecord =
  defineRecord({
    id: 'psych-resilience:field-operator-stable',
    label: 'Field operator stable resilience profile',
    summary: 'Routine containment exposure with no active complications.',
    operatorRef: 'agent:field-operator-12',
    depletionBand: 'stable',
    exposureScore: 0.18,
    exposureEventCount: 2,
    exposureSources: ['impossible_evidence'],
    recoveryChannel: 'rest_recoverable',
    treatmentRequired: false,
    restRecoverable: true,
    confidence: 0.84,
  })

/** Staged depletion with minor complications before breakdown; rest-recoverable. */
export const PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE: PsychologicalResilienceRecord =
  defineRecord({
    id: 'psych-resilience:witness-operator-staged-depletion',
    label: 'Witness operator staged depletion with complications',
    summary:
      'Repeated cognitohazard and containment-failure exposure with hypervigilance and communication strain.',
    operatorRef: 'agent:witness-operator-7',
    depletionBand: 'depleted',
    exposureScore: 0.72,
    exposureEventCount: 5,
    exposureSources: ['cognitohazard_contact', 'containment_failure_witness'],
    activeComplications: ['communication_strain', 'hypervigilance'],
    recoveryChannel: 'counseling_recommended',
    treatmentRequired: false,
    restRecoverable: true,
    counselingRef: 'counseling:post-incident-review-7',
    confidence: 0.79,
  })

/** Severe breakdown requiring explicit treatment; not rest-recoverable. */
export const PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE: PsychologicalResilienceRecord =
  defineRecord({
    id: 'psych-resilience:analyst-operator-breakdown',
    label: 'Analyst operator severe breakdown',
    summary:
      'Forbidden-knowledge exposure with fixation and memory gaps; duty removal and treatment required.',
    operatorRef: 'agent:analyst-operator-3',
    depletionBand: 'breakdown',
    exposureScore: 0.91,
    exposureEventCount: 8,
    exposureSources: ['forbidden_knowledge', 'impossible_evidence'],
    activeComplications: ['fixation', 'memory_gaps'],
    recoveryChannel: 'treatment_required',
    treatmentRequired: true,
    restRecoverable: false,
    counselingRef: 'counseling:mandatory-treatment-3',
    confidence: 0.88,
  })
