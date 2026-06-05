/**
 * SPE-2108 slice 1: self-censoring information registry.
 *
 * Pure deterministic registry for information that resists institutional memory
 * through forgetting, aversion, record decay, or cognition failure — distinct
 * from tactical concealment activation (SPE-70 / SPE-2107).
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type SelfCensoringInformationId = string

export type PropagationResistanceTag =
  | 'forgetting'
  | 'aversion'
  | 'record_decay'
  | 'cognition_fail'
  | 'transmission_block'
  | 'retrieval_block'

export const PROPAGATION_RESISTANCE_TAGS: readonly PropagationResistanceTag[] = [
  'forgetting',
  'aversion',
  'record_decay',
  'cognition_fail',
  'transmission_block',
  'retrieval_block',
] as const

export type InformationFailureMode =
  | 'record_ok_cognition_fail'
  | 'record_fail'
  | 'transmission_fail'
  | 'retrieval_fail'
  | 'interpretation_fail'

export const INFORMATION_FAILURE_MODES: readonly InformationFailureMode[] = [
  'record_ok_cognition_fail',
  'record_fail',
  'transmission_fail',
  'retrieval_fail',
  'interpretation_fail',
] as const

export type UsableArchiveState = 'stored' | 'unusable' | 'study_blocked'

export const USABLE_ARCHIVE_STATES: readonly UsableArchiveState[] = [
  'stored',
  'unusable',
  'study_blocked',
] as const

export type AbsenceSignalKind =
  | 'missing_roster'
  | 'empty_budget_line'
  | 'unclaimed_room'
  | 'orphaned_equipment'
  | 'silent_comm_channel'

export const ABSENCE_SIGNAL_KINDS: readonly AbsenceSignalKind[] = [
  'missing_roster',
  'empty_budget_line',
  'unclaimed_room',
  'orphaned_equipment',
  'silent_comm_channel',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface NegativeFactPredicate {
  readonly predicate: string
  readonly scope?: string
}

export interface RediscoveryLoop {
  readonly loopCount: number
  readonly lastAlarmWeek?: number
  readonly forgottenWarningRefs?: readonly string[]
}

export interface AbsenceSignal {
  readonly kind: AbsenceSignalKind
  readonly descriptor: string
}

export interface SelfCensoringInformationRecord {
  readonly id: SelfCensoringInformationId
  readonly label: string
  readonly summary?: string
  readonly propagationResistance?: readonly PropagationResistanceTag[]
  readonly negativeFacts?: readonly NegativeFactPredicate[]
  readonly parentCaseRef?: string
  readonly retentionDecayTimer?: number
  readonly rediscoveryLoop?: RediscoveryLoop
  readonly informationFailureMode?: InformationFailureMode
  readonly usableArchiveState?: UsableArchiveState
  readonly mediumIntegrityNotes?: string
  readonly absenceSignals?: readonly AbsenceSignal[]
  readonly cognitionResistanceStaffTrait?: string
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type SelfCensoringInformationValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'invalid_propagation_resistance_tag'
  | 'invalid_negative_fact_predicate'
  | 'negative_facts_without_parent_case_ref'
  | 'invalid_retention_decay_timer'
  | 'rediscovery_loop_missing_loop_count'
  | 'invalid_rediscovery_loop_count'
  | 'invalid_rediscovery_last_alarm_week'
  | 'empty_forgotten_warning_ref'
  | 'rediscovery_loop_zero_with_alarm_ref'
  | 'invalid_information_failure_mode'
  | 'invalid_usable_archive_state'
  | 'study_blocked_without_medium_integrity_notes'
  | 'invalid_absence_signal_kind'
  | 'empty_absence_signal_descriptor'
  | 'invalid_confidence'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'

export interface SelfCensoringInformationValidationIssue {
  readonly code: SelfCensoringInformationValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface SelfCensoringInformationValidationResult {
  readonly valid: boolean
  readonly issues: readonly SelfCensoringInformationValidationIssue[]
}

// ---------------------------------------------------------------------------
// Dossier projection
// ---------------------------------------------------------------------------

export interface AntimemeticCaseViewProjectionPolicy {
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
  readonly suppressRedactedSummary?: boolean
}

export interface AntimemeticCaseViewProjection {
  readonly recordId: SelfCensoringInformationId
  readonly label: string
  readonly summary: string | null
  readonly contradictionSignals: readonly string[]
  readonly absenceSignals: readonly AbsenceSignal[]
  readonly archiveUsabilityHint: UsableArchiveState | null
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const PROPAGATION_RESISTANCE_TAG_SET = new Set<string>(PROPAGATION_RESISTANCE_TAGS)
const INFORMATION_FAILURE_MODE_SET = new Set<string>(INFORMATION_FAILURE_MODES)
const USABLE_ARCHIVE_STATE_SET = new Set<string>(USABLE_ARCHIVE_STATES)
const ABSENCE_SIGNAL_KIND_SET = new Set<string>(ABSENCE_SIGNAL_KINDS)

export const FRANCHISE_TOKEN_PATTERN =
  /\b(scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|goi-|group of interest|antimemetic division)\b/i

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value : []
}

function asNegativeFacts(value: unknown): readonly NegativeFactPredicate[] {
  return Array.isArray(value) ? value : []
}

function asAbsenceSignals(value: unknown): readonly AbsenceSignal[] {
  return Array.isArray(value) ? value : []
}

function pushIssue(
  issues: SelfCensoringInformationValidationIssue[],
  issue: SelfCensoringInformationValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: SelfCensoringInformationValidationIssue[]) {
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

function isFiniteWeek(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
}

function isValidConfidence(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function isValidLoopCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
}

function freezeValidationResult(
  issues: SelfCensoringInformationValidationIssue[]
): SelfCensoringInformationValidationResult {
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

function scanFranchiseTokens(
  issues: SelfCensoringInformationValidationIssue[],
  id: string,
  label: string,
  record: SelfCensoringInformationRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Self-censoring information record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Self-censoring information record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const stringFields: Array<{ field: string; value: string | undefined }> = [
    { field: 'summary', value: record.summary },
    { field: 'parentCaseRef', value: record.parentCaseRef },
    { field: 'mediumIntegrityNotes', value: record.mediumIntegrityNotes },
    { field: 'cognitionResistanceStaffTrait', value: record.cognitionResistanceStaffTrait },
  ]

  for (const { field, value } of stringFields) {
    const token = normalizeToken(value ?? '')
    if (token && containsFranchiseToken(token)) {
      pushIssue(issues, {
        code: 'franchise_token_in_field',
        severity: 'error',
        detail: `Self-censoring information record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const fact of asNegativeFacts(record.negativeFacts)) {
    if (!fact || typeof fact !== 'object') {
      continue
    }

    for (const token of [fact.predicate, fact.scope]) {
      const normalized = normalizeToken(token ?? '')
      if (normalized && containsFranchiseToken(normalized)) {
        pushIssue(issues, {
          code: 'franchise_token_in_field',
          severity: 'error',
          detail: `Self-censoring information record ${id || '(unknown)'} negativeFacts contains a franchise or source-literal token.`,
          relatedIds: id ? [id] : undefined,
        })
      }
    }
  }

  for (const signal of asAbsenceSignals(record.absenceSignals)) {
    if (!signal || typeof signal !== 'object') {
      continue
    }

    const descriptor = normalizeToken(signal.descriptor ?? '')
    if (descriptor && containsFranchiseToken(descriptor)) {
      pushIssue(issues, {
        code: 'franchise_token_in_field',
        severity: 'error',
        detail: `Self-censoring information record ${id || '(unknown)'} absenceSignals contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const ref of asStringArray(record.rediscoveryLoop?.forgottenWarningRefs)) {
    const normalized = normalizeToken(ref)
    if (normalized && containsFranchiseToken(normalized)) {
      pushIssue(issues, {
        code: 'franchise_token_in_field',
        severity: 'error',
        detail: `Self-censoring information record ${id || '(unknown)'} forgottenWarningRefs contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }
}

function buildContradictionSignals(record: SelfCensoringInformationRecord): readonly string[] {
  const signals: string[] = []

  for (const fact of asNegativeFacts(record.negativeFacts)) {
    if (!fact || typeof fact !== 'object') {
      continue
    }

    const predicate = normalizeToken(fact.predicate)
    if (!predicate) {
      continue
    }

    const scope = normalizeToken(fact.scope ?? '')
    signals.push(scope ? `Unverified absence: ${predicate} (${scope})` : `Unverified absence: ${predicate}`)
  }

  for (const signal of asAbsenceSignals(record.absenceSignals)) {
    if (!signal || typeof signal !== 'object') {
      continue
    }

    const descriptor = normalizeToken(signal.descriptor)
    if (!descriptor) {
      continue
    }

    signals.push(`Observed gap (${signal.kind}): ${descriptor}`)
  }

  if (record.informationFailureMode === 'record_ok_cognition_fail') {
    signals.push('Archive intact; staff recall inconsistent.')
  } else if (record.informationFailureMode === 'record_fail') {
    signals.push('Archive entries incomplete or missing expected fields.')
  } else if (record.informationFailureMode === 'transmission_fail') {
    signals.push('Briefings fail to propagate expected detail.')
  } else if (record.informationFailureMode === 'retrieval_fail') {
    signals.push('Indexed records present but retrieval returns empty context.')
  } else if (record.informationFailureMode === 'interpretation_fail') {
    signals.push('Records readable but interpreted as unrelated routine noise.')
  }

  if (record.retentionDecayTimer !== undefined) {
    signals.push(`Retention decay timer active (${record.retentionDecayTimer} weeks).`)
  }

  const loop = record.rediscoveryLoop
  if (loop && loop.loopCount > 0) {
    signals.push(`Rediscovery loop count ${loop.loopCount}; prior warnings may resurface.`)
  }

  return Object.freeze([...signals].sort((left, right) => left.localeCompare(right)))
}

function resolveConfidence(
  record: SelfCensoringInformationRecord,
  policy: AntimemeticCaseViewProjectionPolicy
): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (redactedFields.has('confidence')) {
    return null
  }

  const confidence = record.confidence ?? null
  if (confidence !== null && policy.minimumConfidence !== undefined && confidence < policy.minimumConfidence) {
    return null
  }

  if (policy.redactUnknown === true && unknownFields.includes('confidence')) {
    return null
  }

  return confidence
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isPropagationResistanceTag(value: string): value is PropagationResistanceTag {
  return PROPAGATION_RESISTANCE_TAG_SET.has(value)
}

export function isInformationFailureMode(value: string): value is InformationFailureMode {
  return INFORMATION_FAILURE_MODE_SET.has(value)
}

export function isUsableArchiveState(value: string): value is UsableArchiveState {
  return USABLE_ARCHIVE_STATE_SET.has(value)
}

export function isAbsenceSignalKind(value: string): value is AbsenceSignalKind {
  return ABSENCE_SIGNAL_KIND_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateSelfCensoringInformationRecord(
  record: SelfCensoringInformationRecord
): SelfCensoringInformationValidationResult {
  const issues: SelfCensoringInformationValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Self-censoring information record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Self-censoring information record is missing label.',
      relatedIds: id ? [id] : undefined,
    })
  }

  scanFranchiseTokens(issues, id, label, record)

  for (const tag of asStringArray(record.propagationResistance)) {
    if (typeof tag !== 'string' || !isPropagationResistanceTag(tag)) {
      pushIssue(issues, {
        code: 'invalid_propagation_resistance_tag',
        severity: 'error',
        detail: `Self-censoring information record ${id || '(unknown)'} has invalid propagationResistance tag ${String(tag)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  const negativeFacts = asNegativeFacts(record.negativeFacts)
  for (const fact of negativeFacts) {
    if (!fact || typeof fact !== 'object' || !normalizeToken(fact.predicate)) {
      pushIssue(issues, {
        code: 'invalid_negative_fact_predicate',
        severity: 'error',
        detail: `Self-censoring information record ${id || '(unknown)'} negativeFacts requires predicate.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (negativeFacts.length > 0 && !normalizeToken(record.parentCaseRef ?? '')) {
    pushIssue(issues, {
      code: 'negative_facts_without_parent_case_ref',
      severity: 'warning',
      detail: `Self-censoring information record ${id || '(unknown)'} declares negativeFacts without parentCaseRef.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.retentionDecayTimer !== undefined && !isFiniteWeek(record.retentionDecayTimer)) {
    pushIssue(issues, {
      code: 'invalid_retention_decay_timer',
      severity: 'error',
      detail: `Self-censoring information record ${id || '(unknown)'} has invalid retentionDecayTimer.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const loop = record.rediscoveryLoop
  if (loop !== undefined) {
    const forgottenWarningRefs = asStringArray(
      loop !== null && typeof loop === 'object' ? loop.forgottenWarningRefs : undefined
    )

    if (loop === null || typeof loop !== 'object' || !Object.prototype.hasOwnProperty.call(loop, 'loopCount')) {
      pushIssue(issues, {
        code: 'rediscovery_loop_missing_loop_count',
        severity: 'error',
        detail: `Self-censoring information record ${id || '(unknown)'} rediscoveryLoop requires loopCount.`,
        relatedIds: id ? [id] : undefined,
      })
    } else if (!isValidLoopCount(loop.loopCount)) {
      pushIssue(issues, {
        code: 'invalid_rediscovery_loop_count',
        severity: 'error',
        detail: `Self-censoring information record ${id || '(unknown)'} rediscoveryLoop loopCount must be a non-negative integer.`,
        relatedIds: id ? [id] : undefined,
      })
    } else if (
      loop.loopCount === 0 &&
      (isFiniteWeek(loop.lastAlarmWeek) || forgottenWarningRefs.some((ref) => normalizeToken(ref)))
    ) {
      pushIssue(issues, {
        code: 'rediscovery_loop_zero_with_alarm_ref',
        severity: 'error',
        detail: `Self-censoring information record ${id || '(unknown)'} rediscoveryLoop loopCount 0 conflicts with alarm or warning refs.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (
      loop !== null &&
      typeof loop === 'object' &&
      loop.lastAlarmWeek !== undefined &&
      !isFiniteWeek(loop.lastAlarmWeek)
    ) {
      pushIssue(issues, {
        code: 'invalid_rediscovery_last_alarm_week',
        severity: 'error',
        detail: `Self-censoring information record ${id || '(unknown)'} rediscoveryLoop lastAlarmWeek is invalid.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    for (const ref of forgottenWarningRefs) {
      if (!normalizeToken(ref)) {
        pushIssue(issues, {
          code: 'empty_forgotten_warning_ref',
          severity: 'error',
          detail: `Self-censoring information record ${id || '(unknown)'} rediscoveryLoop declares empty forgottenWarningRef.`,
          relatedIds: id ? [id] : undefined,
        })
      }
    }
  }

  if (
    record.informationFailureMode !== undefined &&
    !isInformationFailureMode(record.informationFailureMode)
  ) {
    pushIssue(issues, {
      code: 'invalid_information_failure_mode',
      severity: 'error',
      detail: `Self-censoring information record ${id || '(unknown)'} has invalid informationFailureMode ${String(record.informationFailureMode)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.usableArchiveState !== undefined && !isUsableArchiveState(record.usableArchiveState)) {
    pushIssue(issues, {
      code: 'invalid_usable_archive_state',
      severity: 'error',
      detail: `Self-censoring information record ${id || '(unknown)'} has invalid usableArchiveState ${String(record.usableArchiveState)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.usableArchiveState === 'study_blocked' &&
    !normalizeToken(record.mediumIntegrityNotes ?? '')
  ) {
    pushIssue(issues, {
      code: 'study_blocked_without_medium_integrity_notes',
      severity: 'warning',
      detail: `Self-censoring information record ${id || '(unknown)'} with study_blocked archive requires mediumIntegrityNotes.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const signal of asAbsenceSignals(record.absenceSignals)) {
    if (!signal || typeof signal !== 'object') {
      pushIssue(issues, {
        code: 'invalid_absence_signal_kind',
        severity: 'error',
        detail: `Self-censoring information record ${id || '(unknown)'} absenceSignals contains invalid entry.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!isAbsenceSignalKind(signal.kind)) {
      pushIssue(issues, {
        code: 'invalid_absence_signal_kind',
        severity: 'error',
        detail: `Self-censoring information record ${id || '(unknown)'} has invalid absenceSignal kind ${String(signal.kind)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (!normalizeToken(signal.descriptor)) {
      pushIssue(issues, {
        code: 'empty_absence_signal_descriptor',
        severity: 'error',
        detail: `Self-censoring information record ${id || '(unknown)'} absenceSignals requires descriptor.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (record.confidence !== undefined && !isValidConfidence(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Self-censoring information record ${id || '(unknown)'} confidence must be a finite number between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

// ---------------------------------------------------------------------------
// Persistence (SPE-2108 slice 2)
// ---------------------------------------------------------------------------

export type SelfCensoringInformationRecordsMap = Record<
  SelfCensoringInformationId,
  SelfCensoringInformationRecord
>

function isRecord(value: unknown): value is Record<string, unknown> {
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

function parsePropagationResistanceTags(value: unknown): readonly PropagationResistanceTag[] {
  const tags: PropagationResistanceTag[] = []

  for (const entry of asStringArray(value)) {
    if (typeof entry === 'string' && isPropagationResistanceTag(entry)) {
      tags.push(entry)
    }
  }

  return tags
}

function parseNegativeFacts(value: unknown): readonly NegativeFactPredicate[] {
  if (!Array.isArray(value)) {
    return []
  }

  const facts: NegativeFactPredicate[] = []

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue
    }

    const predicate = normalizeToken(entry.predicate)
    if (!predicate) {
      continue
    }

    const scope = normalizeToken(entry.scope ?? '') || undefined
    facts.push(scope ? { predicate, scope } : { predicate })
  }

  return facts
}

function parseRediscoveryLoop(value: unknown): RediscoveryLoop | undefined {
  if (!isRecord(value) || !Object.prototype.hasOwnProperty.call(value, 'loopCount')) {
    return undefined
  }

  if (!isValidLoopCount(value.loopCount)) {
    return undefined
  }

  const loopCount = value.loopCount
  const lastAlarmWeek = value.lastAlarmWeek
  const forgottenWarningRefs = parseStringList(value.forgottenWarningRefs)

  return {
    loopCount,
    ...(isFiniteWeek(lastAlarmWeek) ? { lastAlarmWeek } : {}),
    ...(forgottenWarningRefs.length > 0 ? { forgottenWarningRefs } : {}),
  }
}

function parseAbsenceSignals(value: unknown): readonly AbsenceSignal[] {
  if (!Array.isArray(value)) {
    return []
  }

  const signals: AbsenceSignal[] = []

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue
    }

    const kind = entry.kind
    const descriptor = normalizeToken(entry.descriptor)
    if (typeof kind !== 'string' || !isAbsenceSignalKind(kind) || !descriptor) {
      continue
    }

    signals.push({ kind, descriptor })
  }

  return signals
}

function sanitizeSelfCensoringInformationRecordEntry(
  value: unknown
): SelfCensoringInformationRecord | null {
  if (!isRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  if (!id || !label) {
    return null
  }

  const propagationResistance = parsePropagationResistanceTags(value.propagationResistance)
  const negativeFacts = parseNegativeFacts(value.negativeFacts)
  const rediscoveryLoop = parseRediscoveryLoop(value.rediscoveryLoop)
  const absenceSignals = parseAbsenceSignals(value.absenceSignals)
  const unknownFields = parseStringList(value.unknownFields)
  const redactedFields = parseStringList(value.redactedFields)

  const summary =
    typeof value.summary === 'string' && value.summary.trim().length > 0
      ? value.summary.trim()
      : undefined
  const parentCaseRef = normalizeToken(value.parentCaseRef ?? '') || undefined
  const retentionDecayTimer = value.retentionDecayTimer
  const informationFailureMode =
    typeof value.informationFailureMode === 'string' ? value.informationFailureMode : undefined
  const usableArchiveState =
    typeof value.usableArchiveState === 'string' ? value.usableArchiveState : undefined
  const mediumIntegrityNotes =
    typeof value.mediumIntegrityNotes === 'string' && value.mediumIntegrityNotes.trim().length > 0
      ? value.mediumIntegrityNotes.trim()
      : undefined
  const cognitionResistanceStaffTrait =
    normalizeToken(value.cognitionResistanceStaffTrait ?? '') || undefined
  const confidence = value.confidence

  const record: SelfCensoringInformationRecord = {
    id,
    label,
    ...(summary ? { summary } : {}),
    ...(propagationResistance.length > 0 ? { propagationResistance } : {}),
    ...(negativeFacts.length > 0 ? { negativeFacts } : {}),
    ...(parentCaseRef ? { parentCaseRef } : {}),
    ...(isFiniteWeek(retentionDecayTimer) ? { retentionDecayTimer } : {}),
    ...(rediscoveryLoop ? { rediscoveryLoop } : {}),
    ...(informationFailureMode && isInformationFailureMode(informationFailureMode)
      ? { informationFailureMode }
      : {}),
    ...(usableArchiveState && isUsableArchiveState(usableArchiveState)
      ? { usableArchiveState }
      : {}),
    ...(mediumIntegrityNotes ? { mediumIntegrityNotes } : {}),
    ...(absenceSignals.length > 0 ? { absenceSignals } : {}),
    ...(cognitionResistanceStaffTrait ? { cognitionResistanceStaffTrait } : {}),
    ...(isValidConfidence(confidence) ? { confidence } : {}),
    ...(unknownFields.length > 0 ? { unknownFields } : {}),
    ...(redactedFields.length > 0 ? { redactedFields } : {}),
  }

  if (!validateSelfCensoringInformationRecord(record).valid) {
    return null
  }

  return record
}

/** Hydration: canonical record map keyed by record id; drops invalid and duplicate-id entries. */
export function sanitizeSelfCensoringInformationRecords(
  value: unknown,
  fallback: SelfCensoringInformationRecordsMap = {}
): SelfCensoringInformationRecordsMap {
  if (!isRecord(value)) {
    return fallback
  }

  const next: SelfCensoringInformationRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeSelfCensoringInformationRecordEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

/**
 * Projects a fallible dossier view from record-derived contradiction signals.
 * Does not assert objective truth or omniscient hazard classification.
 */
export function projectAntimemeticCaseView(
  record: SelfCensoringInformationRecord,
  policy: AntimemeticCaseViewProjectionPolicy = {}
): AntimemeticCaseViewProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = Object.freeze(
    [...asStringArray(record.unknownFields)].sort((left, right) => left.localeCompare(right))
  )

  const summaryRedacted = redactedFields.has('summary')
  const summary = summaryRedacted ? null : normalizeToken(record.summary ?? '') || null

  const absenceSignals = Object.freeze(
    asAbsenceSignals(record.absenceSignals)
      .filter((signal) => signal && typeof signal === 'object')
      .map((signal) =>
        Object.freeze({
          kind: signal.kind,
          descriptor: normalizeToken(signal.descriptor),
        })
      )
  )

  const confidence = resolveConfidence(record, policy)
  const redacted =
    summaryRedacted ||
    redactedFields.has('confidence') ||
    (confidence === null && record.confidence !== undefined && policy.minimumConfidence !== undefined)

  return Object.freeze({
    recordId,
    label: normalizeToken(record.label) || '(unknown)',
    summary,
    contradictionSignals: buildContradictionSignals(record),
    absenceSignals,
    archiveUsabilityHint: record.usableArchiveState ?? null,
    confidence,
    redacted,
    unknownFields,
  })
}

function defineRecord(record: SelfCensoringInformationRecord): SelfCensoringInformationRecord {
  return Object.freeze({ ...record })
}

/** Record with negative facts, retention decay, and rediscovery loop count 2. */
export const REDISCOVERY_LOOP_RECORD_FIXTURE: SelfCensoringInformationRecord = defineRecord({
  id: 'info:unclaimed-lab-wing',
  label: 'Unclaimed lab wing roster gap',
  summary: 'Staff rosters omit a wing that still appears on maintenance tickets.',
  propagationResistance: ['forgetting', 'record_decay', 'cognition_fail'],
  negativeFacts: [
    { predicate: 'assigned_supervisor_present', scope: 'wing-c-east' },
    { predicate: 'budget_line_allocated', scope: 'wing-c-east' },
  ],
  parentCaseRef: 'case:facility-roster-audit-12',
  retentionDecayTimer: 8,
  rediscoveryLoop: {
    loopCount: 2,
    lastAlarmWeek: 41,
    forgottenWarningRefs: ['warning:wing-c-roster-gap-38', 'warning:wing-c-roster-gap-40'],
  },
  informationFailureMode: 'record_ok_cognition_fail',
  usableArchiveState: 'stored',
  mediumIntegrityNotes: 'Physical binders intact; recall interviews diverge.',
  absenceSignals: [
    { kind: 'missing_roster', descriptor: 'No named supervisor on weekly duty roster' },
    { kind: 'unclaimed_room', descriptor: 'Badge reader logs activity without assigned occupant' },
  ],
  cognitionResistanceStaffTrait: 'trait:institutional-normalization',
  confidence: 0.47,
})

/** Study-blocked archive requiring medium integrity notes. */
export const STUDY_BLOCKED_ARCHIVE_FIXTURE: SelfCensoringInformationRecord = defineRecord({
  id: 'info:sealed-briefing-corpus',
  label: 'Sealed briefing corpus',
  summary: 'Cross-department briefings lose participant lists between sessions.',
  propagationResistance: ['transmission_block', 'retrieval_block'],
  usableArchiveState: 'study_blocked',
  mediumIntegrityNotes: 'Optical scans complete; direct study triggers recall interference.',
  informationFailureMode: 'record_ok_cognition_fail',
  confidence: 0.52,
})
