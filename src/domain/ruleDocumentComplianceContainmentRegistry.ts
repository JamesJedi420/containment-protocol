/**
 * SPE-2123 slice 1: rule-document compliance containment registry.
 *
 * Pure deterministic registry for anomalies and persons that can follow written
 * codes of conduct, policies, or procedure documents as active containment tools.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type RuleDocumentComplianceId = string

export type BindingStrength = 'voluntary' | 'contractual' | 'compelled'

export const BINDING_STRENGTHS: readonly BindingStrength[] = [
  'voluntary',
  'contractual',
  'compelled',
] as const

export type ComplianceState = 'compliant' | 'drifting' | 'breach' | 'unknown'

export const COMPLIANCE_STATES: readonly ComplianceState[] = [
  'compliant',
  'drifting',
  'breach',
  'unknown',
] as const

export type BreachConsequence = 'recontain' | 'escalate_review' | 'terminate_protocol'

export const BREACH_CONSEQUENCES: readonly BreachConsequence[] = [
  'recontain',
  'escalate_review',
  'terminate_protocol',
] as const

export type ComplianceDecayBand = 'stable' | 'elevated' | 'critical'

export const COMPLIANCE_DECAY_BANDS: readonly ComplianceDecayBand[] = [
  'stable',
  'elevated',
  'critical',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface RuleDocumentComplianceRecord {
  readonly id: RuleDocumentComplianceId
  readonly label: string
  readonly summary?: string
  readonly documentRef: string
  readonly bindingStrength: BindingStrength
  readonly complianceState: ComplianceState
  readonly revisionHistoryRefs?: readonly string[]
  readonly physicalCopyRequired: boolean
  readonly breachConsequence?: BreachConsequence
  readonly auditorAssigneeRefs?: readonly string[]
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type RuleDocumentComplianceValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_document_ref'
  | 'invalid_binding_strength'
  | 'invalid_compliance_state'
  | 'invalid_breach_consequence'
  | 'invalid_physical_copy_required'
  | 'invalid_confidence'
  | 'invalid_revision_history_refs'
  | 'invalid_revision_history_ref'
  | 'empty_revision_history_ref'
  | 'invalid_auditor_assignee_refs'
  | 'invalid_auditor_assignee_ref'
  | 'empty_auditor_assignee_ref'
  | 'breach_without_breach_consequence'
  | 'compelled_binding_without_auditor'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface RuleDocumentComplianceValidationIssue {
  readonly code: RuleDocumentComplianceValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface RuleDocumentComplianceValidationResult {
  readonly valid: boolean
  readonly issues: readonly RuleDocumentComplianceValidationIssue[]
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export interface ComplianceDecayProjectionPolicy {
  readonly currentWeek?: number
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
  readonly suppressHiddenConflictLabels?: boolean
}

export interface RevisionAuditSymptom {
  readonly ref: string
  readonly symptomDescriptor: string
  readonly auditGapHint: string | null
}

export interface ComplianceDecayProjection {
  readonly recordId: RuleDocumentComplianceId
  readonly label: string
  readonly documentRef: string
  readonly bindingStrength: BindingStrength
  readonly complianceState: ComplianceState
  readonly physicalCopyRequired: boolean
  readonly driftProbabilityPerWeek: number | null
  readonly complianceDecayBand: ComplianceDecayBand | null
  readonly revisionAuditSymptoms: readonly RevisionAuditSymptom[]
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const BINDING_STRENGTH_SET = new Set<string>(BINDING_STRENGTHS)
const COMPLIANCE_STATE_SET = new Set<string>(COMPLIANCE_STATES)
const BREACH_CONSEQUENCE_SET = new Set<string>(BREACH_CONSEQUENCES)

export const FRANCHISE_TOKEN_PATTERN =
  /(?:\b(?:scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|group of interest|broken masquerade|masquerade breach|wiki\.|wikidot)\b|goi-)/i

export const BRANDED_OBJECT_NUMBER_PATTERN = /\bSCP[\s-]?\d{3,4}\b/i

const COMPLIANCE_STATE_DRIFT_BASE: Readonly<Record<ComplianceState, number>> = {
  compliant: 0.03,
  drifting: 0.22,
  breach: 1,
  unknown: 0.12,
}

const BINDING_STRENGTH_DRIFT_MODIFIER: Readonly<Record<BindingStrength, number>> = {
  voluntary: 0.08,
  contractual: 0.04,
  compelled: -0.05,
}

const REVISION_AUDIT_SYMPTOM_PREFIX = 'Document revision audit trail observed at'

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
  issues: RuleDocumentComplianceValidationIssue[],
  issue: RuleDocumentComplianceValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: RuleDocumentComplianceValidationIssue[]) {
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

function roundUnit(value: number): number {
  return Math.round(value * 1000) / 1000
}

function freezeValidationResult(
  issues: RuleDocumentComplianceValidationIssue[]
): RuleDocumentComplianceValidationResult {
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

function hasNonEmptyRefArray(value: unknown): boolean {
  return asStringArray(value).some((ref) => normalizeToken(ref).length > 0)
}

function validateOptionalStringRefArray(
  issues: RuleDocumentComplianceValidationIssue[],
  id: string,
  fieldName: string,
  value: unknown,
  invalidArrayCode: RuleDocumentComplianceValidationCode,
  invalidEntryCode: RuleDocumentComplianceValidationCode,
  emptyEntryCode: RuleDocumentComplianceValidationCode
) {
  if (value === undefined) {
    return
  }

  if (!Array.isArray(value)) {
    pushIssue(issues, {
      code: invalidArrayCode,
      severity: 'error',
      detail: `Rule document compliance record ${id || '(unknown)'} ${fieldName} must be an array.`,
      relatedIds: id ? [id] : undefined,
    })
    return
  }

  for (const entry of value) {
    if (typeof entry !== 'string') {
      pushIssue(issues, {
        code: invalidEntryCode,
        severity: 'error',
        detail: `Rule document compliance record ${id || '(unknown)'} ${fieldName} contains a non-string ref.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!normalizeToken(entry)) {
      pushIssue(issues, {
        code: emptyEntryCode,
        severity: 'error',
        detail: `Rule document compliance record ${id || '(unknown)'} ${fieldName} contains an empty ref.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }
}

function scanStringFieldTokens(
  issues: RuleDocumentComplianceValidationIssue[],
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
      detail: `Rule document compliance record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(token)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_field',
      severity: 'error',
      detail: `Rule document compliance record ${id || '(unknown)'} field ${field} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function scanRefArrayTokens(
  issues: RuleDocumentComplianceValidationIssue[],
  id: string,
  field: string,
  refs: readonly string[]
) {
  for (const ref of refs) {
    scanStringFieldTokens(issues, id, field, ref)
  }
}

function scanForbiddenTokens(
  issues: RuleDocumentComplianceValidationIssue[],
  id: string,
  label: string,
  record: RuleDocumentComplianceRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Rule document compliance record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Rule document compliance record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Rule document compliance record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Rule document compliance record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.summary) {
    scanStringFieldTokens(issues, id, 'summary', record.summary)
  }

  scanStringFieldTokens(issues, id, 'documentRef', record.documentRef)
  scanRefArrayTokens(
    issues,
    id,
    'revisionHistoryRefs',
    asStringArray(record.revisionHistoryRefs)
  )
  scanRefArrayTokens(
    issues,
    id,
    'auditorAssigneeRefs',
    asStringArray(record.auditorAssigneeRefs)
  )
}

function resolveConfidence(
  record: RuleDocumentComplianceRecord,
  policy: ComplianceDecayProjectionPolicy
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

function resolveComplianceDecayBand(score: number | null): ComplianceDecayBand | null {
  if (score === null) {
    return null
  }

  if (score < 0.34) {
    return 'stable'
  }

  if (score < 0.67) {
    return 'elevated'
  }

  return 'critical'
}

function masksProjectionInput(
  field: string,
  redactedFields: ReadonlySet<string>,
  unknownFields: readonly string[],
  policy: ComplianceDecayProjectionPolicy
): boolean {
  return (
    redactedFields.has(field) ||
    (policy.redactUnknown === true && unknownFields.includes(field))
  )
}

function resolveDriftProbability(
  record: RuleDocumentComplianceRecord,
  policy: ComplianceDecayProjectionPolicy
): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  const driftFields = [
    'bindingStrength',
    'complianceState',
    'physicalCopyRequired',
    'revisionHistoryRefs',
  ] as const

  if (
    driftFields.some((field) =>
      masksProjectionInput(field, redactedFields, unknownFields, policy)
    )
  ) {
    return null
  }

  const complianceState = isComplianceState(record.complianceState)
    ? record.complianceState
    : 'unknown'
  const bindingStrength = isBindingStrength(record.bindingStrength)
    ? record.bindingStrength
    : 'contractual'

  if (complianceState === 'breach') {
    return 1
  }

  const currentWeek =
    typeof policy.currentWeek === 'number' && Number.isFinite(policy.currentWeek)
      ? Math.max(0, Math.trunc(policy.currentWeek))
      : 0

  const revisionRefs = asStringArray(record.revisionHistoryRefs).filter(
    (ref) => normalizeToken(ref).length > 0
  )
  const revisionStability = Math.min(0.1, revisionRefs.length * 0.02)
  const physicalCopyMitigation = record.physicalCopyRequired === true ? 0.06 : 0
  const weekDrift = currentWeek * 0.002

  const driftScore =
    COMPLIANCE_STATE_DRIFT_BASE[complianceState] +
    BINDING_STRENGTH_DRIFT_MODIFIER[bindingStrength] -
    revisionStability -
    physicalCopyMitigation +
    weekDrift

  return roundUnit(Math.max(0, Math.min(1, driftScore)))
}

function resolveAuditGapHint(
  record: RuleDocumentComplianceRecord,
  ref: string,
  policy: ComplianceDecayProjectionPolicy
): string | null {
  if (policy.suppressHiddenConflictLabels === true) {
    return null
  }

  const complianceState = isComplianceState(record.complianceState)
    ? record.complianceState
    : 'unknown'
  return `audit_gap:${complianceState}:${normalizeToken(ref) || 'unknown_ref'}`
}

function buildRevisionAuditSymptoms(
  record: RuleDocumentComplianceRecord,
  policy: ComplianceDecayProjectionPolicy
): readonly RevisionAuditSymptom[] {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (
    masksProjectionInput('revisionHistoryRefs', redactedFields, unknownFields, policy) ||
    masksProjectionInput('complianceState', redactedFields, unknownFields, policy)
  ) {
    return Object.freeze([])
  }

  const refs = asStringArray(record.revisionHistoryRefs)
    .map((ref) => normalizeToken(ref))
    .filter((ref) => ref.length > 0)
    .sort((left, right) => left.localeCompare(right))

  return Object.freeze(
    refs.map((ref) =>
      Object.freeze({
        ref,
        symptomDescriptor: `${REVISION_AUDIT_SYMPTOM_PREFIX} ${ref}`,
        auditGapHint: resolveAuditGapHint(record, ref, policy),
      })
    )
  )
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isBindingStrength(value: unknown): value is BindingStrength {
  return typeof value === 'string' && BINDING_STRENGTH_SET.has(value)
}

export function isComplianceState(value: unknown): value is ComplianceState {
  return typeof value === 'string' && COMPLIANCE_STATE_SET.has(value)
}

export function isBreachConsequence(value: unknown): value is BreachConsequence {
  return typeof value === 'string' && BREACH_CONSEQUENCE_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateRuleDocumentComplianceRecord(
  record: RuleDocumentComplianceRecord
): RuleDocumentComplianceValidationResult {
  const issues: RuleDocumentComplianceValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const documentRef = normalizeToken(record.documentRef)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Rule document compliance record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Rule document compliance record is missing label.',
    })
  }

  if (!documentRef) {
    pushIssue(issues, {
      code: 'missing_document_ref',
      severity: 'error',
      detail: `Rule document compliance record ${id || '(unknown)'} is missing documentRef.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isBindingStrength(record.bindingStrength)) {
    pushIssue(issues, {
      code: 'invalid_binding_strength',
      severity: 'error',
      detail: `Rule document compliance record ${id || '(unknown)'} has invalid bindingStrength ${String(record.bindingStrength)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isComplianceState(record.complianceState)) {
    pushIssue(issues, {
      code: 'invalid_compliance_state',
      severity: 'error',
      detail: `Rule document compliance record ${id || '(unknown)'} has invalid complianceState ${String(record.complianceState)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.breachConsequence !== undefined && !isBreachConsequence(record.breachConsequence)) {
    pushIssue(issues, {
      code: 'invalid_breach_consequence',
      severity: 'error',
      detail: `Rule document compliance record ${id || '(unknown)'} has invalid breachConsequence ${String(record.breachConsequence)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Rule document compliance record ${id || '(unknown)'} confidence must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (typeof record.physicalCopyRequired !== 'boolean') {
    pushIssue(issues, {
      code: 'invalid_physical_copy_required',
      severity: 'error',
      detail: `Rule document compliance record ${id || '(unknown)'} physicalCopyRequired must be a boolean.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  validateOptionalStringRefArray(
    issues,
    id,
    'revisionHistoryRefs',
    record.revisionHistoryRefs,
    'invalid_revision_history_refs',
    'invalid_revision_history_ref',
    'empty_revision_history_ref'
  )

  validateOptionalStringRefArray(
    issues,
    id,
    'auditorAssigneeRefs',
    record.auditorAssigneeRefs,
    'invalid_auditor_assignee_refs',
    'invalid_auditor_assignee_ref',
    'empty_auditor_assignee_ref'
  )

  scanForbiddenTokens(issues, id, label, record)

  if (record.complianceState === 'breach' && record.breachConsequence === undefined) {
    pushIssue(issues, {
      code: 'breach_without_breach_consequence',
      severity: 'error',
      detail: `Rule document compliance record ${id || '(unknown)'} is in breach state but has no breachConsequence.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.bindingStrength === 'compelled' && !hasNonEmptyRefArray(record.auditorAssigneeRefs)) {
    pushIssue(issues, {
      code: 'compelled_binding_without_auditor',
      severity: 'warning',
      detail: `Rule document compliance record ${id || '(unknown)'} uses compelled binding but declares no auditorAssigneeRefs.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects deterministic compliance decay (drift probability per week).
 * SPE-1310 case lifecycle wire-up remains deferred.
 */
export function projectComplianceDecay(
  record: RuleDocumentComplianceRecord,
  policy: ComplianceDecayProjectionPolicy = {}
): ComplianceDecayProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)
  const confidence = resolveConfidence(record, policy)
  const driftProbabilityPerWeek = resolveDriftProbability(record, policy)

  const revisionRedacted =
    redactedFields.has('revisionHistoryRefs') ||
    (policy.redactUnknown === true && unknownFields.includes('revisionHistoryRefs'))

  const revisionAuditSymptoms = revisionRedacted
    ? Object.freeze([])
    : buildRevisionAuditSymptoms(record, policy)

  const driftRedacted =
    redactedFields.has('bindingStrength') ||
    redactedFields.has('complianceState') ||
    redactedFields.has('physicalCopyRequired') ||
    (policy.redactUnknown === true &&
      (unknownFields.includes('bindingStrength') ||
        unknownFields.includes('complianceState') ||
        unknownFields.includes('physicalCopyRequired')))

  const redacted =
    revisionRedacted ||
    driftRedacted ||
    redactedFields.has('confidence') ||
    (policy.redactUnknown === true && unknownFields.includes('confidence')) ||
    (confidence === null &&
      record.confidence !== undefined &&
      policy.minimumConfidence !== undefined)

  return Object.freeze({
    recordId,
    label: normalizeToken(record.label) || '(unknown)',
    documentRef: normalizeToken(record.documentRef) || '(unknown)',
    bindingStrength: isBindingStrength(record.bindingStrength)
      ? record.bindingStrength
      : 'contractual',
    complianceState: isComplianceState(record.complianceState)
      ? record.complianceState
      : 'unknown',
    physicalCopyRequired: record.physicalCopyRequired === true,
    driftProbabilityPerWeek,
    complianceDecayBand: resolveComplianceDecayBand(driftProbabilityPerWeek),
    revisionAuditSymptoms,
    confidence,
    redacted,
    unknownFields,
  })
}

function defineRecord(record: RuleDocumentComplianceRecord): RuleDocumentComplianceRecord {
  return Object.freeze({ ...record })
}

/** Voluntary compliant binding with physical copy on file. */
export const VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE: RuleDocumentComplianceRecord =
  defineRecord({
    id: 'rule-document-compliance:voluntary-cooperative-subject-a',
    label: 'Voluntary conduct agreement — cooperative subject',
    summary: 'Voluntary written conduct binding with physical copy retained on file.',
    documentRef: 'document:conduct-agreement-cooperative-a',
    bindingStrength: 'voluntary',
    complianceState: 'compliant',
    revisionHistoryRefs: ['revision:conduct-agreement-v3'],
    physicalCopyRequired: true,
    auditorAssigneeRefs: ['staff:compliance-monitor-2'],
    confidence: 0.86,
  })

/** Drifting compliance that escalated to breach with review consequence. */
export const DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE: RuleDocumentComplianceRecord =
  defineRecord({
    id: 'rule-document-compliance:drift-to-breach-review',
    label: 'Drifting conduct binding — breach escalation',
    summary:
      'Subject drifted from compliant monitoring into breach; consequence routes to review escalation.',
    documentRef: 'document:procedure-binding-subject-b',
    bindingStrength: 'contractual',
    complianceState: 'breach',
    revisionHistoryRefs: [
      'revision:procedure-binding-v2',
      'audit:drift-signal-week-14',
      'audit:breach-declaration-week-16',
    ],
    physicalCopyRequired: true,
    breachConsequence: 'escalate_review',
    auditorAssigneeRefs: ['staff:compliance-auditor-5'],
    confidence: 0.78,
  })
