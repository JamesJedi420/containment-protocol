/**
 * SPE-2115 slice 1: contained-person therapeutic care schedule registry.
 *
 * Pure deterministic registry for cooperative human subjects and person-like
 * entities requiring ongoing psychological or medical mediation as containment
 * infrastructure — distinct from integrated health bundle wire-up (SPE-1889).
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type TherapeuticCareScheduleId = string

export type CareMode = 'psych_screening' | 'mediated_audio' | 'visitation_ban' | 'cooperative_checkin'

export const CARE_MODES: readonly CareMode[] = [
  'psych_screening',
  'mediated_audio',
  'visitation_ban',
  'cooperative_checkin',
] as const

export type CareCadence = 'weekly' | 'biweekly'

export const CARE_CADENCES: readonly CareCadence[] = ['weekly', 'biweekly'] as const

export type ChannelState = 'active' | 'degraded' | 'suspended'

export const CHANNEL_STATES: readonly ChannelState[] = ['active', 'degraded', 'suspended'] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface TherapeuticCareScheduleRecord {
  readonly id: TherapeuticCareScheduleId
  readonly label: string
  readonly summary?: string
  readonly subjectRef: string
  readonly careMode: CareMode
  readonly cadence: CareCadence
  readonly channelState: ChannelState
  readonly missedSessionStreak: number
  readonly staffAssigneeRefs?: readonly string[]
  readonly containmentDependency?: boolean
  readonly suspensionCauseRef?: string
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type TherapeuticCareScheduleValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_subject_ref'
  | 'invalid_care_mode'
  | 'invalid_cadence'
  | 'invalid_channel_state'
  | 'invalid_missed_session_streak'
  | 'invalid_confidence'
  | 'empty_staff_assignee_ref'
  | 'suspended_without_documented_cause'
  | 'active_channel_with_operational_inconsistency'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface TherapeuticCareScheduleValidationIssue {
  readonly code: TherapeuticCareScheduleValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface TherapeuticCareScheduleValidationResult {
  readonly valid: boolean
  readonly issues: readonly TherapeuticCareScheduleValidationIssue[]
}

// ---------------------------------------------------------------------------
// Compliance projection
// ---------------------------------------------------------------------------

export interface CareComplianceRiskProjectionPolicy {
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
  readonly lockdownAmplification?: number
}

export interface CareComplianceRiskProjection {
  readonly recordId: TherapeuticCareScheduleId
  readonly label: string
  readonly careMode: CareMode
  readonly channelState: ChannelState
  readonly complianceRiskScore: number | null
  readonly lockdownEscalationLikely: boolean
  readonly missedSessionStreak: number
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const CARE_MODE_SET = new Set<string>(CARE_MODES)
const CARE_CADENCE_SET = new Set<string>(CARE_CADENCES)
const CHANNEL_STATE_SET = new Set<string>(CHANNEL_STATES)

const HIGH_MISSED_STREAK_THRESHOLD = 2

export const FRANCHISE_TOKEN_PATTERN =
  /(?:\b(?:scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|group of interest|broken masquerade|masquerade breach)\b|goi-)/i

export const BRANDED_OBJECT_NUMBER_PATTERN = /\bSCP[\s-]?\d{3,4}\b/i

const CHANNEL_STATE_RISK_BUMP: Readonly<Record<ChannelState, number>> = {
  active: 0,
  degraded: 0.12,
  suspended: 0.04,
}

const CARE_MODE_RISK_WEIGHT: Readonly<Record<CareMode, number>> = {
  psych_screening: 0.08,
  mediated_audio: 0.06,
  visitation_ban: 0.1,
  cooperative_checkin: 0.05,
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
  issues: TherapeuticCareScheduleValidationIssue[],
  issue: TherapeuticCareScheduleValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: TherapeuticCareScheduleValidationIssue[]) {
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
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
}

function freezeValidationResult(
  issues: TherapeuticCareScheduleValidationIssue[]
): TherapeuticCareScheduleValidationResult {
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

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function roundUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.round(clampUnit(value) * 1000) / 1000
}

function hasDocumentedSuspensionCause(record: TherapeuticCareScheduleRecord): boolean {
  return normalizeToken(record.suspensionCauseRef ?? '').length > 0
}

function scanForbiddenTokens(
  issues: TherapeuticCareScheduleValidationIssue[],
  id: string,
  label: string,
  record: TherapeuticCareScheduleRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Therapeutic care schedule record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Therapeutic care schedule record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Therapeutic care schedule record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Therapeutic care schedule record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const stringFields: Array<{ field: string; value: string | undefined }> = [
    { field: 'summary', value: record.summary },
    { field: 'subjectRef', value: record.subjectRef },
    { field: 'suspensionCauseRef', value: record.suspensionCauseRef },
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
        detail: `Therapeutic care schedule record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (containsBrandedObjectNumber(token)) {
      pushIssue(issues, {
        code: 'branded_object_number_in_field',
        severity: 'error',
        detail: `Therapeutic care schedule record ${id || '(unknown)'} field ${field} contains a branded object number.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const ref of asStringArray(record.staffAssigneeRefs)) {
    const token = normalizeToken(ref)
    if (token && (containsFranchiseToken(token) || containsBrandedObjectNumber(token))) {
      pushIssue(issues, {
        code: containsFranchiseToken(token) ? 'franchise_token_in_field' : 'branded_object_number_in_field',
        severity: 'error',
        detail: `Therapeutic care schedule record ${id || '(unknown)'} staffAssigneeRefs contains a forbidden token.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }
}

function resolveConfidence(
  record: TherapeuticCareScheduleRecord,
  policy: CareComplianceRiskProjectionPolicy
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

function resolveComplianceRiskScore(
  record: TherapeuticCareScheduleRecord,
  policy: CareComplianceRiskProjectionPolicy
): number {
  const streak = isNonNegativeInteger(record.missedSessionStreak) ? record.missedSessionStreak : 0
  const channelState = isChannelState(record.channelState) ? record.channelState : 'active'
  const careMode = isCareMode(record.careMode) ? record.careMode : 'cooperative_checkin'

  let score = Math.min(1, streak * 0.18)
  score += CHANNEL_STATE_RISK_BUMP[channelState]
  score += CARE_MODE_RISK_WEIGHT[careMode]

  if (channelState === 'suspended' && !hasDocumentedSuspensionCause(record)) {
    score += 0.08
  }

  if (record.containmentDependency === true) {
    const amplification =
      typeof policy.lockdownAmplification === 'number' &&
      Number.isFinite(policy.lockdownAmplification)
        ? policy.lockdownAmplification
        : 1.15
    score *= amplification
  }

  return roundUnit(score)
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isCareMode(value: unknown): value is CareMode {
  return typeof value === 'string' && CARE_MODE_SET.has(value)
}

export function isCareCadence(value: unknown): value is CareCadence {
  return typeof value === 'string' && CARE_CADENCE_SET.has(value)
}

export function isChannelState(value: unknown): value is ChannelState {
  return typeof value === 'string' && CHANNEL_STATE_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateTherapeuticCareScheduleRecord(
  record: TherapeuticCareScheduleRecord
): TherapeuticCareScheduleValidationResult {
  const issues: TherapeuticCareScheduleValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const subjectRef = normalizeToken(record.subjectRef)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Therapeutic care schedule record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Therapeutic care schedule record is missing label.',
    })
  }

  if (!subjectRef) {
    pushIssue(issues, {
      code: 'missing_subject_ref',
      severity: 'error',
      detail: 'Therapeutic care schedule record is missing subjectRef.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isCareMode(record.careMode)) {
    pushIssue(issues, {
      code: 'invalid_care_mode',
      severity: 'error',
      detail: `Therapeutic care schedule record ${id || '(unknown)'} has invalid careMode ${String(record.careMode)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isCareCadence(record.cadence)) {
    pushIssue(issues, {
      code: 'invalid_cadence',
      severity: 'error',
      detail: `Therapeutic care schedule record ${id || '(unknown)'} has invalid cadence ${String(record.cadence)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isChannelState(record.channelState)) {
    pushIssue(issues, {
      code: 'invalid_channel_state',
      severity: 'error',
      detail: `Therapeutic care schedule record ${id || '(unknown)'} has invalid channelState ${String(record.channelState)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isNonNegativeInteger(record.missedSessionStreak)) {
    pushIssue(issues, {
      code: 'invalid_missed_session_streak',
      severity: 'error',
      detail: `Therapeutic care schedule record ${id || '(unknown)'} missedSessionStreak must be a non-negative integer.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Therapeutic care schedule record ${id || '(unknown)'} confidence must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const ref of asStringArray(record.staffAssigneeRefs)) {
    if (!normalizeToken(ref)) {
      pushIssue(issues, {
        code: 'empty_staff_assignee_ref',
        severity: 'error',
        detail: `Therapeutic care schedule record ${id || '(unknown)'} staffAssigneeRefs contains an empty ref.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  scanForbiddenTokens(issues, id, label, record)

  if (record.channelState === 'suspended' && !hasDocumentedSuspensionCause(record)) {
    pushIssue(issues, {
      code: 'suspended_without_documented_cause',
      severity: 'warning',
      detail: `Therapeutic care schedule record ${id || '(unknown)'} is suspended without suspensionCauseRef.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.channelState === 'active' &&
    isNonNegativeInteger(record.missedSessionStreak) &&
    record.missedSessionStreak >= HIGH_MISSED_STREAK_THRESHOLD
  ) {
    pushIssue(issues, {
      code: 'active_channel_with_operational_inconsistency',
      severity: 'warning',
      detail: `Therapeutic care schedule record ${id || '(unknown)'} reports active channel with elevated missedSessionStreak.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects care-compliance breach risk from record-derived fields.
 * Does not assert hidden dossier truth or automatic lockdown escalation.
 */
export function projectCareComplianceRisk(
  record: TherapeuticCareScheduleRecord,
  policy: CareComplianceRiskProjectionPolicy = {}
): CareComplianceRiskProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)
  const confidence = resolveConfidence(record, policy)

  const complianceRedacted =
    redactedFields.has('complianceRiskScore') ||
    (policy.redactUnknown === true && unknownFields.includes('complianceRiskScore'))

  const streak = isNonNegativeInteger(record.missedSessionStreak) ? record.missedSessionStreak : 0
  const complianceRiskScore = complianceRedacted ? null : resolveComplianceRiskScore(record, policy)
  const lockdownEscalationLikely =
    record.containmentDependency === true &&
    streak >= HIGH_MISSED_STREAK_THRESHOLD &&
    (record.channelState === 'degraded' || record.channelState === 'suspended')

  const redacted =
    complianceRedacted ||
    redactedFields.has('confidence') ||
    (confidence === null && record.confidence !== undefined && policy.minimumConfidence !== undefined)

  return Object.freeze({
    recordId,
    label: normalizeToken(record.label) || '(unknown)',
    careMode: isCareMode(record.careMode) ? record.careMode : 'cooperative_checkin',
    channelState: isChannelState(record.channelState) ? record.channelState : 'active',
    complianceRiskScore,
    lockdownEscalationLikely,
    missedSessionStreak: streak,
    confidence,
    redacted,
    unknownFields,
  })
}

function defineRecord(record: TherapeuticCareScheduleRecord): TherapeuticCareScheduleRecord {
  return Object.freeze({ ...record })
}

/** Weekly psych screening with two-way mediated channel active. */
export const WEEKLY_PSYCH_SCREENING_FIXTURE: TherapeuticCareScheduleRecord = defineRecord({
  id: 'care-schedule:cooperative-subject-psych-weekly',
  label: 'Cooperative subject weekly psych screening',
  summary: 'Two-way mediated psych screening channel for cooperative contained subject.',
  subjectRef: 'subject:cooperative-field-asset-17',
  careMode: 'psych_screening',
  cadence: 'weekly',
  channelState: 'active',
  missedSessionStreak: 0,
  staffAssigneeRefs: ['staff:psych-mediator-4', 'staff:custody-liaison-2'],
  containmentDependency: false,
  confidence: 0.88,
})

/** Missed sessions with degraded channel and containment dependency. */
export const MISSED_STREAK_ELEVATED_RISK_FIXTURE: TherapeuticCareScheduleRecord = defineRecord({
  id: 'care-schedule:cooperative-checkin-compliance-drift',
  label: 'Cooperative check-in compliance drift',
  summary: 'Repeated missed cooperative check-ins with degraded mediated channel.',
  subjectRef: 'subject:cooperative-field-asset-22',
  careMode: 'cooperative_checkin',
  cadence: 'biweekly',
  channelState: 'degraded',
  missedSessionStreak: 3,
  staffAssigneeRefs: ['staff:custody-liaison-7'],
  containmentDependency: true,
  confidence: 0.71,
})

// ---------------------------------------------------------------------------
// Persistence / hydration
// ---------------------------------------------------------------------------

export type TherapeuticCareScheduleRecordsMap = Record<
  TherapeuticCareScheduleId,
  TherapeuticCareScheduleRecord
>

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseStringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function sanitizeTherapeuticCareScheduleRecordEntry(
  value: unknown
): TherapeuticCareScheduleRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const subjectRef = normalizeToken(value.subjectRef)
  const careMode = value.careMode
  const cadence = value.cadence
  const channelState = value.channelState
  const missedSessionStreak = value.missedSessionStreak

  if (
    !id ||
    !label ||
    !subjectRef ||
    typeof careMode !== 'string' ||
    !isCareMode(careMode) ||
    typeof cadence !== 'string' ||
    !isCareCadence(cadence) ||
    typeof channelState !== 'string' ||
    !isChannelState(channelState) ||
    !isNonNegativeInteger(missedSessionStreak)
  ) {
    return null
  }

  const staffAssigneeRefs = parseStringList(value.staffAssigneeRefs)
  const unknownFields = parseStringList(value.unknownFields)
  const redactedFields = parseStringList(value.redactedFields)
  const summary =
    typeof value.summary === 'string' && value.summary.trim().length > 0
      ? value.summary.trim()
      : undefined
  const suspensionCauseRef = normalizeToken(value.suspensionCauseRef ?? '') || undefined
  const confidence = value.confidence
  const containmentDependency =
    typeof value.containmentDependency === 'boolean' ? value.containmentDependency : undefined

  const record: TherapeuticCareScheduleRecord = {
    id,
    label,
    subjectRef,
    careMode,
    cadence,
    channelState,
    missedSessionStreak,
    ...(summary ? { summary } : {}),
    ...(staffAssigneeRefs.length > 0 ? { staffAssigneeRefs } : {}),
    ...(containmentDependency !== undefined ? { containmentDependency } : {}),
    ...(suspensionCauseRef ? { suspensionCauseRef } : {}),
    ...(isValidUnitScore(confidence) ? { confidence } : {}),
    ...(unknownFields.length > 0 ? { unknownFields } : {}),
    ...(redactedFields.length > 0 ? { redactedFields } : {}),
  }

  if (!validateTherapeuticCareScheduleRecord(record).valid) {
    return null
  }

  return record
}

/** Hydration: canonical record map keyed by record id; drops invalid and duplicate-id entries. */
export function sanitizeTherapeuticCareScheduleRecords(
  value: unknown,
  fallback: TherapeuticCareScheduleRecordsMap = {}
): TherapeuticCareScheduleRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: TherapeuticCareScheduleRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeTherapeuticCareScheduleRecordEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}
