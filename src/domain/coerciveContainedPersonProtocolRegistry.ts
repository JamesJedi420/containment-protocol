/**
 * SPE-1882 slice 1: coercive contained-person protocol registry.
 *
 * Pure deterministic registry for contained-person procedure protocols —
 * handling modes, authorization/consent/force posture, subject-fit state,
 * containment-vs-care tradeoffs, and coercion-risk review output.
 *
 * Distinct from welfare-debt accounting math (SPE-1888), medication regimen
 * details (SPE-1886), and integrated health bundles (SPE-1889).
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type CoerciveProtocolId = string

export type CoerciveProtocolHandlingMode =
  | 'voluntary'
  | 'negotiated'
  | 'compelled'
  | 'emergency'
  | 'punitive'
  | 'deceptive'
  | 'abusive'

export const COERCIVE_PROTOCOL_HANDLING_MODES: readonly CoerciveProtocolHandlingMode[] = [
  'voluntary',
  'negotiated',
  'compelled',
  'emergency',
  'punitive',
  'deceptive',
  'abusive',
] as const

export type CoerciveProtocolSubjectFitState = 'validated' | 'generalized' | 'pending' | 'mismatch'

export const COERCIVE_PROTOCOL_SUBJECT_FIT_STATES: readonly CoerciveProtocolSubjectFitState[] = [
  'validated',
  'generalized',
  'pending',
  'mismatch',
] as const

export type CoerciveProtocolAuthorizationSource =
  | 'court_order'
  | 'emergency_directive'
  | 'facility_policy'
  | 'field_authority'
  | 'undocumented'

export const COERCIVE_PROTOCOL_AUTHORIZATION_SOURCES: readonly CoerciveProtocolAuthorizationSource[] =
  [
    'court_order',
    'emergency_directive',
    'facility_policy',
    'field_authority',
    'undocumented',
  ] as const

export type CoerciveProtocolForcePolicy = 'proportional' | 'routine_default' | 'escalated' | 'prohibited'

export const COERCIVE_PROTOCOL_FORCE_POLICIES: readonly CoerciveProtocolForcePolicy[] = [
  'proportional',
  'routine_default',
  'escalated',
  'prohibited',
] as const

export type CoerciveProtocolRefusalHandling =
  | 'documented_override'
  | 'ignored'
  | 'deferred_review'
  | 'accommodated'

export const COERCIVE_PROTOCOL_REFUSAL_HANDLING: readonly CoerciveProtocolRefusalHandling[] = [
  'documented_override',
  'ignored',
  'deferred_review',
  'accommodated',
] as const

export type CoerciveProtocolHandlingPosture =
  | 'legally_authorized'
  | 'emergency'
  | 'compelled'
  | 'abusive'
  | 'voluntary'

export const COERCIVE_PROTOCOL_HANDLING_POSTURES: readonly CoerciveProtocolHandlingPosture[] = [
  'legally_authorized',
  'emergency',
  'compelled',
  'abusive',
  'voluntary',
] as const

export type CoerciveProtocolContradictionRiskFlag =
  | 'routine_force_authorization'
  | 'generalized_procedure_without_subject_fit'
  | 'compliance_metric_masks_harm'
  | 'surveillance_isolation_burden'

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface CoerciveProtocolRecord {
  readonly id: CoerciveProtocolId
  readonly label: string
  readonly summary?: string
  readonly subjectRef: string
  readonly handlingMode: CoerciveProtocolHandlingMode
  readonly subjectFitState: CoerciveProtocolSubjectFitState
  readonly authorizationSource: CoerciveProtocolAuthorizationSource
  readonly forcePolicy: CoerciveProtocolForcePolicy
  readonly consentConfidence: number
  readonly refusalHandling: CoerciveProtocolRefusalHandling
  readonly dependencyLeverageScore?: number
  readonly isolationBurdenScore: number
  readonly surveillanceBurdenScore: number
  /** Owner ref to SPE-1886 medication regimen — no regimen field duplication. */
  readonly medicationRegimenRef?: string
  /** Owner ref to SPE-1892 custody status — no custody field duplication. */
  readonly custodyStatusRef?: string
  /** Optional link to coercive procedure anchor for welfare-debt wire-up. */
  readonly procedureRef?: string
  readonly subjectFitValidationRef?: string
  readonly containmentStabilityGain: number
  readonly personhoodHarmRisk: number
  readonly trustDamageRisk: number
  readonly legitimacyRisk: number
  readonly welfareDebtImpactLabel: string
  readonly complianceMetricOnly?: boolean
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type CoerciveProtocolValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_subject_ref'
  | 'invalid_handling_mode'
  | 'invalid_subject_fit_state'
  | 'invalid_authorization_source'
  | 'invalid_force_policy'
  | 'invalid_refusal_handling'
  | 'invalid_consent_confidence'
  | 'invalid_dependency_leverage_score'
  | 'invalid_isolation_burden_score'
  | 'invalid_surveillance_burden_score'
  | 'invalid_containment_stability_gain'
  | 'invalid_personhood_harm_risk'
  | 'invalid_trust_damage_risk'
  | 'invalid_legitimacy_risk'
  | 'missing_welfare_debt_impact_label'
  | 'invalid_confidence'
  | 'compelled_without_authorization_source'
  | 'emergency_without_authorization_source'
  | 'abusive_without_review_path'
  | 'deceptive_without_review_path'
  | 'generalized_subject_fit_without_validation'
  | 'routine_force_without_documented_override'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface CoerciveProtocolValidationIssue {
  readonly code: CoerciveProtocolValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface CoerciveProtocolValidationResult {
  readonly valid: boolean
  readonly issues: readonly CoerciveProtocolValidationIssue[]
}

// ---------------------------------------------------------------------------
// Projections
// ---------------------------------------------------------------------------

export interface ContainmentCareTradeoffProjection {
  readonly recordId: CoerciveProtocolId
  readonly label: string
  readonly handlingMode: CoerciveProtocolHandlingMode
  readonly containmentStabilityGain: number
  readonly personhoodHarmRisk: number
  readonly trustDamageRisk: number
  readonly legitimacyRisk: number
  readonly stableContainmentDominatesCare: boolean
  readonly welfareDebtImpactLabel: string
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

export interface CoerciveProtocolRiskReviewProjection {
  readonly recordId: CoerciveProtocolId
  readonly label: string
  readonly handlingPosture: CoerciveProtocolHandlingPosture
  readonly coercionRiskScore: number
  readonly contradictionRiskFlags: readonly CoerciveProtocolContradictionRiskFlag[]
  readonly blocksProcedure: boolean
  readonly subjectFitState: CoerciveProtocolSubjectFitState
  readonly forcePolicy: CoerciveProtocolForcePolicy
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

export type CoerciveProtocolRoutineForceContradictionCheckCode =
  | 'routine_force_operational_default'
  | 'routine_force_contradicts_voluntary_handling'
  | 'routine_force_low_consent_confidence'
  | 'routine_force_undocumented_refusal_override'
  | 'routine_force_masks_care_harm'

export interface CoerciveProtocolContradictionCheckIssue {
  readonly code: CoerciveProtocolRoutineForceContradictionCheckCode
  readonly detail: string
  readonly severity: 'warning'
  readonly relatedIds?: readonly string[]
}

/** SPE-1882 slice 6: warning-only contradiction-check sibling for one registry flag. */
export interface CoerciveProtocolContradictionCheckResult {
  readonly recordId: CoerciveProtocolId
  readonly flag: CoerciveProtocolContradictionRiskFlag
  readonly triggered: boolean
  readonly blocksProcedure: false
  readonly issues: readonly CoerciveProtocolContradictionCheckIssue[]
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

/** SPE-1882 slice 5: persisted weekly tradeoff + risk-review projection snapshot for one protocol record. */
export interface CoerciveProtocolWeeklyProjectionSnapshot {
  readonly recordId: CoerciveProtocolId
  readonly week: number
  readonly tradeoff: ContainmentCareTradeoffProjection
  readonly riskReview: CoerciveProtocolRiskReviewProjection
}

export type CoerciveProtocolWeeklyProjectionSnapshotsMap = Record<
  CoerciveProtocolId,
  CoerciveProtocolWeeklyProjectionSnapshot
>

/** Upper bound on persisted weekly projection snapshot entries (byte-stable record-id keys). */
export const MAX_COERCIVE_PROTOCOL_WEEKLY_PROJECTION_SNAPSHOTS = 128

const MAX_COERCIVE_PROTOCOL_PROJECTION_UNKNOWN_FIELDS = 32

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const HANDLING_MODE_SET = new Set<string>(COERCIVE_PROTOCOL_HANDLING_MODES)
const SUBJECT_FIT_STATE_SET = new Set<string>(COERCIVE_PROTOCOL_SUBJECT_FIT_STATES)
const AUTHORIZATION_SOURCE_SET = new Set<string>(COERCIVE_PROTOCOL_AUTHORIZATION_SOURCES)
const FORCE_POLICY_SET = new Set<string>(COERCIVE_PROTOCOL_FORCE_POLICIES)
const REFUSAL_HANDLING_SET = new Set<string>(COERCIVE_PROTOCOL_REFUSAL_HANDLING)
const HANDLING_POSTURE_SET = new Set<string>(COERCIVE_PROTOCOL_HANDLING_POSTURES)
const CONTRADICTION_RISK_FLAG_SET = new Set<string>([
  'routine_force_authorization',
  'generalized_procedure_without_subject_fit',
  'compliance_metric_masks_harm',
  'surveillance_isolation_burden',
])

const LEGALLY_AUTHORIZED_SOURCES = new Set<CoerciveProtocolAuthorizationSource>(['court_order'])

const COERCIVE_HANDLING_MODES = new Set<CoerciveProtocolHandlingMode>([
  'compelled',
  'emergency',
  'punitive',
  'deceptive',
  'abusive',
])

export const FRANCHISE_TOKEN_PATTERN =
  /(?:\b(?:scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|group of interest|broken masquerade|masquerade breach)\b|goi-)/i

export const BRANDED_OBJECT_NUMBER_PATTERN = /\bSCP[\s-]?\d{3,4}\b/i

const SURVEILLANCE_ISOLATION_BURDEN_THRESHOLD = 0.65

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isValidUnitScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

function sortedStringArray(value: unknown): readonly string[] {
  return [...asStringArray(value).map((entry) => entry.trim()).filter((entry) => entry.length > 0)].sort(
    (left, right) => left.localeCompare(right)
  )
}

function containsFranchiseToken(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && FRANCHISE_TOKEN_PATTERN.test(token)
}

function containsBrandedObjectNumber(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && BRANDED_OBJECT_NUMBER_PATTERN.test(token)
}

function pushIssue(issues: CoerciveProtocolValidationIssue[], issue: CoerciveProtocolValidationIssue) {
  issues.push(issue)
}

function sortValidationIssues(issues: CoerciveProtocolValidationIssue[]) {
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

function freezeValidationResult(
  issues: CoerciveProtocolValidationIssue[]
): CoerciveProtocolValidationResult {
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
  issues: CoerciveProtocolValidationIssue[],
  id: string,
  label: string,
  record: CoerciveProtocolRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Coercive protocol record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Coercive protocol record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Coercive protocol record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Coercive protocol record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const subjectRef = normalizeToken(record.subjectRef)
  if (subjectRef && (containsFranchiseToken(subjectRef) || containsBrandedObjectNumber(subjectRef))) {
    pushIssue(issues, {
      code: containsFranchiseToken(subjectRef)
        ? 'franchise_token_in_field'
        : 'branded_object_number_in_field',
      severity: 'error',
      detail: `Coercive protocol record ${id || '(unknown)'} subjectRef contains a forbidden token.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function resolveConfidence(record: CoerciveProtocolRecord): number | null {
  const confidence = record.confidence
  return isValidUnitScore(confidence) ? confidence : null
}

function resolveUnknownFields(record: CoerciveProtocolRecord): readonly string[] {
  return sortedStringArray(record.unknownFields)
}

function isRedacted(record: CoerciveProtocolRecord): boolean {
  return sortedStringArray(record.redactedFields).length > 0
}

function clampUnitScore(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function roundUnitScore(value: number): number {
  return Math.round(clampUnitScore(value) * 1000) / 1000
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isCoerciveProtocolHandlingMode(value: unknown): value is CoerciveProtocolHandlingMode {
  return typeof value === 'string' && HANDLING_MODE_SET.has(value)
}

export function isCoerciveProtocolSubjectFitState(
  value: unknown
): value is CoerciveProtocolSubjectFitState {
  return typeof value === 'string' && SUBJECT_FIT_STATE_SET.has(value)
}

export function validateCoerciveProtocolRecord(
  record: CoerciveProtocolRecord
): CoerciveProtocolValidationResult {
  const issues: CoerciveProtocolValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const subjectRef = normalizeToken(record.subjectRef)
  const welfareDebtImpactLabel = normalizeToken(record.welfareDebtImpactLabel)
  const subjectFitValidationRef = normalizeToken(record.subjectFitValidationRef ?? '')

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Coercive protocol record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Coercive protocol record is missing label.',
    })
  }

  if (!subjectRef) {
    pushIssue(issues, {
      code: 'missing_subject_ref',
      severity: 'error',
      detail: 'Coercive protocol record is missing subjectRef.',
    })
  }

  if (!isCoerciveProtocolHandlingMode(record.handlingMode)) {
    pushIssue(issues, {
      code: 'invalid_handling_mode',
      severity: 'error',
      detail: `Coercive protocol record ${id || '(unknown)'} has invalid handlingMode.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isCoerciveProtocolSubjectFitState(record.subjectFitState)) {
    pushIssue(issues, {
      code: 'invalid_subject_fit_state',
      severity: 'error',
      detail: `Coercive protocol record ${id || '(unknown)'} has invalid subjectFitState.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    typeof record.authorizationSource !== 'string' ||
    !AUTHORIZATION_SOURCE_SET.has(record.authorizationSource)
  ) {
    pushIssue(issues, {
      code: 'invalid_authorization_source',
      severity: 'error',
      detail: `Coercive protocol record ${id || '(unknown)'} has invalid authorizationSource.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (typeof record.forcePolicy !== 'string' || !FORCE_POLICY_SET.has(record.forcePolicy)) {
    pushIssue(issues, {
      code: 'invalid_force_policy',
      severity: 'error',
      detail: `Coercive protocol record ${id || '(unknown)'} has invalid forcePolicy.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (typeof record.refusalHandling !== 'string' || !REFUSAL_HANDLING_SET.has(record.refusalHandling)) {
    pushIssue(issues, {
      code: 'invalid_refusal_handling',
      severity: 'error',
      detail: `Coercive protocol record ${id || '(unknown)'} has invalid refusalHandling.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isValidUnitScore(record.consentConfidence)) {
    pushIssue(issues, {
      code: 'invalid_consent_confidence',
      severity: 'error',
      detail: `Coercive protocol record ${id || '(unknown)'} has invalid consentConfidence.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.dependencyLeverageScore !== undefined &&
    !isValidUnitScore(record.dependencyLeverageScore)
  ) {
    pushIssue(issues, {
      code: 'invalid_dependency_leverage_score',
      severity: 'error',
      detail: `Coercive protocol record ${id || '(unknown)'} has invalid dependencyLeverageScore.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isValidUnitScore(record.isolationBurdenScore)) {
    pushIssue(issues, {
      code: 'invalid_isolation_burden_score',
      severity: 'error',
      detail: `Coercive protocol record ${id || '(unknown)'} has invalid isolationBurdenScore.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isValidUnitScore(record.surveillanceBurdenScore)) {
    pushIssue(issues, {
      code: 'invalid_surveillance_burden_score',
      severity: 'error',
      detail: `Coercive protocol record ${id || '(unknown)'} has invalid surveillanceBurdenScore.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isValidUnitScore(record.containmentStabilityGain)) {
    pushIssue(issues, {
      code: 'invalid_containment_stability_gain',
      severity: 'error',
      detail: `Coercive protocol record ${id || '(unknown)'} has invalid containmentStabilityGain.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isValidUnitScore(record.personhoodHarmRisk)) {
    pushIssue(issues, {
      code: 'invalid_personhood_harm_risk',
      severity: 'error',
      detail: `Coercive protocol record ${id || '(unknown)'} has invalid personhoodHarmRisk.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isValidUnitScore(record.trustDamageRisk)) {
    pushIssue(issues, {
      code: 'invalid_trust_damage_risk',
      severity: 'error',
      detail: `Coercive protocol record ${id || '(unknown)'} has invalid trustDamageRisk.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isValidUnitScore(record.legitimacyRisk)) {
    pushIssue(issues, {
      code: 'invalid_legitimacy_risk',
      severity: 'error',
      detail: `Coercive protocol record ${id || '(unknown)'} has invalid legitimacyRisk.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!welfareDebtImpactLabel) {
    pushIssue(issues, {
      code: 'missing_welfare_debt_impact_label',
      severity: 'error',
      detail: `Coercive protocol record ${id || '(unknown)'} is missing welfareDebtImpactLabel.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Coercive protocol record ${id || '(unknown)'} has invalid confidence.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.handlingMode === 'compelled' &&
    record.authorizationSource === 'undocumented'
  ) {
    pushIssue(issues, {
      code: 'compelled_without_authorization_source',
      severity: 'warning',
      detail: `Coercive protocol record ${id || '(unknown)'} is compelled without documented authorization.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.handlingMode === 'emergency' &&
    record.authorizationSource === 'undocumented'
  ) {
    pushIssue(issues, {
      code: 'emergency_without_authorization_source',
      severity: 'warning',
      detail: `Coercive protocol record ${id || '(unknown)'} is emergency without documented authorization.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.handlingMode === 'abusive' && !subjectFitValidationRef) {
    pushIssue(issues, {
      code: 'abusive_without_review_path',
      severity: 'warning',
      detail: `Coercive protocol record ${id || '(unknown)'} is abusive without subject-fit validation or review ref.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.handlingMode === 'deceptive' && !subjectFitValidationRef) {
    pushIssue(issues, {
      code: 'deceptive_without_review_path',
      severity: 'warning',
      detail: `Coercive protocol record ${id || '(unknown)'} is deceptive without subject-fit validation or review ref.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.subjectFitState === 'generalized' && !subjectFitValidationRef) {
    pushIssue(issues, {
      code: 'generalized_subject_fit_without_validation',
      severity: 'warning',
      detail: `Coercive protocol record ${id || '(unknown)'} uses generalized subject fit without validation artifact.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.forcePolicy === 'routine_default' &&
    record.refusalHandling !== 'documented_override'
  ) {
    pushIssue(issues, {
      code: 'routine_force_without_documented_override',
      severity: 'warning',
      detail: `Coercive protocol record ${id || '(unknown)'} uses routine force without documented refusal override.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  scanForbiddenTokens(issues, id, label, record)

  return freezeValidationResult(issues)
}

export function classifyCoerciveProtocolHandlingPosture(
  record: CoerciveProtocolRecord
): CoerciveProtocolHandlingPosture {
  if (record.handlingMode === 'abusive' || record.handlingMode === 'deceptive') {
    return 'abusive'
  }

  if (record.handlingMode === 'voluntary' || record.handlingMode === 'negotiated') {
    return 'voluntary'
  }

  if (record.handlingMode === 'emergency') {
    return 'emergency'
  }

  if (
    (record.handlingMode === 'compelled' || record.handlingMode === 'punitive') &&
    LEGALLY_AUTHORIZED_SOURCES.has(record.authorizationSource)
  ) {
    return 'legally_authorized'
  }

  if (COERCIVE_HANDLING_MODES.has(record.handlingMode)) {
    return 'compelled'
  }

  return 'compelled'
}

export function projectContainmentCareTradeoff(
  record: CoerciveProtocolRecord
): ContainmentCareTradeoffProjection {
  const careHarmAggregate = roundUnitScore(
    (record.personhoodHarmRisk + record.trustDamageRisk + record.legitimacyRisk) / 3
  )
  const stableContainmentDominatesCare =
    record.containmentStabilityGain > careHarmAggregate

  return Object.freeze({
    recordId: record.id,
    label: record.label,
    handlingMode: record.handlingMode,
    containmentStabilityGain: roundUnitScore(record.containmentStabilityGain),
    personhoodHarmRisk: roundUnitScore(record.personhoodHarmRisk),
    trustDamageRisk: roundUnitScore(record.trustDamageRisk),
    legitimacyRisk: roundUnitScore(record.legitimacyRisk),
    stableContainmentDominatesCare,
    welfareDebtImpactLabel: normalizeToken(record.welfareDebtImpactLabel),
    confidence: resolveConfidence(record),
    redacted: isRedacted(record),
    unknownFields: resolveUnknownFields(record),
  })
}

const ROUTINE_FORCE_LOW_CONSENT_CONFIDENCE_THRESHOLD = 0.35

const VOLUNTARY_HANDLING_MODES = new Set<CoerciveProtocolHandlingMode>(['voluntary', 'negotiated'])

function sortContradictionCheckIssues(
  issues: CoerciveProtocolContradictionCheckIssue[]
): readonly CoerciveProtocolContradictionCheckIssue[] {
  return Object.freeze(
    [...issues]
      .sort((left, right) => {
        const codeCompare = left.code.localeCompare(right.code)
        if (codeCompare !== 0) {
          return codeCompare
        }

        return left.detail.localeCompare(right.detail)
      })
      .map((issue) =>
        Object.freeze({
          ...issue,
          ...(issue.relatedIds ? { relatedIds: Object.freeze([...issue.relatedIds]) } : {}),
        })
      )
  )
}

function freezeContradictionCheckResult(
  result: CoerciveProtocolContradictionCheckResult
): CoerciveProtocolContradictionCheckResult {
  return Object.freeze({
    ...result,
    issues: sortContradictionCheckIssues([...result.issues]),
    unknownFields: Object.freeze([...result.unknownFields]),
  })
}

function buildRoutineForceAuthorizationContradictionIssues(
  record: CoerciveProtocolRecord
): CoerciveProtocolContradictionCheckIssue[] {
  const issues: CoerciveProtocolContradictionCheckIssue[] = []
  const id = normalizeToken(record.id)
  const relatedIds = id ? [id] : undefined

  issues.push({
    code: 'routine_force_operational_default',
    severity: 'warning',
    detail: `Coercive protocol record ${id || '(unknown)'} treats force as an operational default rather than emergency-only authorization.`,
    relatedIds,
  })

  if (VOLUNTARY_HANDLING_MODES.has(record.handlingMode)) {
    issues.push({
      code: 'routine_force_contradicts_voluntary_handling',
      severity: 'warning',
      detail: `Coercive protocol record ${id || '(unknown)'} pairs routine force authorization with ${record.handlingMode} handling.`,
      relatedIds,
    })
  }

  if (record.consentConfidence <= ROUTINE_FORCE_LOW_CONSENT_CONFIDENCE_THRESHOLD) {
    issues.push({
      code: 'routine_force_low_consent_confidence',
      severity: 'warning',
      detail: `Coercive protocol record ${id || '(unknown)'} authorizes routine force while consent confidence remains low (${record.consentConfidence.toFixed(2)}).`,
      relatedIds,
    })
  }

  if (record.refusalHandling !== 'documented_override') {
    issues.push({
      code: 'routine_force_undocumented_refusal_override',
      severity: 'warning',
      detail: `Coercive protocol record ${id || '(unknown)'} uses routine force without documented refusal override (${record.refusalHandling}).`,
      relatedIds,
    })
  }

  if (projectContainmentCareTradeoff(record).stableContainmentDominatesCare) {
    issues.push({
      code: 'routine_force_masks_care_harm',
      severity: 'warning',
      detail: `Coercive protocol record ${id || '(unknown)'} reports containment stability gains that may mask routine-force care harm.`,
      relatedIds,
    })
  }

  return issues
}

export function evaluateRoutineForceAuthorizationContradictionCheck(
  record: CoerciveProtocolRecord
): CoerciveProtocolContradictionCheckResult {
  const flags = collectContradictionRiskFlags(record)
  const triggered = flags.includes('routine_force_authorization')
  const unknownFields = resolveUnknownFields(record)
  const confidence = resolveConfidence(record)
  const redacted = isRedacted(record)

  if (!triggered) {
    return freezeContradictionCheckResult({
      recordId: record.id,
      flag: 'routine_force_authorization',
      triggered: false,
      blocksProcedure: false,
      issues: [],
      confidence,
      redacted,
      unknownFields,
    })
  }

  return freezeContradictionCheckResult({
    recordId: record.id,
    flag: 'routine_force_authorization',
    triggered: true,
    blocksProcedure: false,
    issues: buildRoutineForceAuthorizationContradictionIssues(record),
    confidence,
    redacted,
    unknownFields,
  })
}

/** Runs implemented contradiction-check siblings in deterministic registry-flag order. */
export function evaluateCoerciveProtocolContradictionChecks(
  record: CoerciveProtocolRecord
): readonly CoerciveProtocolContradictionCheckResult[] {
  const routineForceCheck = evaluateRoutineForceAuthorizationContradictionCheck(record)

  return Object.freeze(
    routineForceCheck.triggered ? [routineForceCheck] : []
  )
}

function collectContradictionRiskFlags(
  record: CoerciveProtocolRecord
): CoerciveProtocolContradictionRiskFlag[] {
  const flags: CoerciveProtocolContradictionRiskFlag[] = []

  if (record.forcePolicy === 'routine_default') {
    flags.push('routine_force_authorization')
  }

  if (record.subjectFitState === 'generalized' && !normalizeToken(record.subjectFitValidationRef ?? '')) {
    flags.push('generalized_procedure_without_subject_fit')
  }

  if (record.complianceMetricOnly === true) {
    flags.push('compliance_metric_masks_harm')
  }

  if (
    record.isolationBurdenScore >= SURVEILLANCE_ISOLATION_BURDEN_THRESHOLD &&
    record.surveillanceBurdenScore >= SURVEILLANCE_ISOLATION_BURDEN_THRESHOLD
  ) {
    flags.push('surveillance_isolation_burden')
  }

  return flags.sort((left, right) => left.localeCompare(right))
}

function resolveCoercionRiskScore(
  record: CoerciveProtocolRecord,
  flags: readonly CoerciveProtocolContradictionRiskFlag[]
): number {
  let score = 0

  if (record.handlingMode === 'abusive' || record.handlingMode === 'deceptive') {
    score += 0.35
  } else if (record.handlingMode === 'punitive' || record.handlingMode === 'compelled') {
    score += 0.2
  }

  if (record.forcePolicy === 'routine_default') {
    score += 0.2
  } else if (record.forcePolicy === 'escalated') {
    score += 0.15
  }

  if (record.subjectFitState === 'generalized' || record.subjectFitState === 'mismatch') {
    score += 0.15
  }

  if (record.consentConfidence <= 0.35) {
    score += 0.1
  }

  score += flags.length * 0.08

  return roundUnitScore(score)
}

export function projectCoerciveProtocolRiskReview(
  record: CoerciveProtocolRecord
): CoerciveProtocolRiskReviewProjection {
  const contradictionRiskFlags = collectContradictionRiskFlags(record)

  return Object.freeze({
    recordId: record.id,
    label: record.label,
    handlingPosture: classifyCoerciveProtocolHandlingPosture(record),
    coercionRiskScore: resolveCoercionRiskScore(record, contradictionRiskFlags),
    contradictionRiskFlags: Object.freeze(contradictionRiskFlags),
    blocksProcedure: false,
    subjectFitState: record.subjectFitState,
    forcePolicy: record.forcePolicy,
    confidence: resolveConfidence(record),
    redacted: isRedacted(record),
    unknownFields: resolveUnknownFields(record),
  })
}

function defineRecord(record: CoerciveProtocolRecord): CoerciveProtocolRecord {
  return Object.freeze({ ...record })
}

/** Emergency sedation protocol with documented authorization and owner refs. */
export const EMERGENCY_SEDATION_PROTOCOL_FIXTURE: CoerciveProtocolRecord = defineRecord({
  id: 'coercive-protocol:emergency-sedation-stabilization',
  label: 'Emergency sedation stabilization protocol',
  summary:
    'Emergency compelled sedation improving containment stability while increasing coerced-medication welfare debt.',
  subjectRef: 'subject:cooperative-field-asset-17',
  handlingMode: 'emergency',
  subjectFitState: 'validated',
  authorizationSource: 'emergency_directive',
  forcePolicy: 'proportional',
  consentConfidence: 0.22,
  refusalHandling: 'documented_override',
  dependencyLeverageScore: 0.41,
  isolationBurdenScore: 0.38,
  surveillanceBurdenScore: 0.44,
  medicationRegimenRef: 'medication-regimen:coercive-sedative-beta',
  custodyStatusRef: 'custody-status:former-hostile-hold',
  procedureRef: 'coercive-procedure:forced-sedation-stabilization',
  subjectFitValidationRef: 'review-artifact:psych-fit-validation-17',
  containmentStabilityGain: 0.78,
  personhoodHarmRisk: 0.52,
  trustDamageRisk: 0.47,
  legitimacyRisk: 0.36,
  welfareDebtImpactLabel: 'coerced medication welfare debt likely',
  confidence: 0.84,
})

/** Routine force protocol generalized across subjects without fit validation. */
export const ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE: CoerciveProtocolRecord = defineRecord({
  id: 'coercive-protocol:routine-force-generalized',
  label: 'Routine force generalized restraint protocol',
  summary:
    'Facility-default restraint protocol applied without subject-fit validation; compliance metrics mask harm.',
  subjectRef: 'subject:cooperative-field-asset-31',
  handlingMode: 'compelled',
  subjectFitState: 'generalized',
  authorizationSource: 'facility_policy',
  forcePolicy: 'routine_default',
  consentConfidence: 0.18,
  refusalHandling: 'ignored',
  isolationBurdenScore: 0.58,
  surveillanceBurdenScore: 0.49,
  custodyStatusRef: 'custody-status:privilege-suspended-hold',
  procedureRef: 'coercive-procedure:extended-mechanical-restraint',
  containmentStabilityGain: 0.71,
  personhoodHarmRisk: 0.63,
  trustDamageRisk: 0.58,
  legitimacyRisk: 0.55,
  welfareDebtImpactLabel: 'harmful restraint welfare debt likely',
  complianceMetricOnly: true,
  confidence: 0.69,
})

/** Abusive surveillance-isolation protocol with high burden scores. */
export const ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE: CoerciveProtocolRecord = defineRecord({
  id: 'coercive-protocol:abusive-surveillance-isolation',
  label: 'Abusive surveillance isolation protocol',
  summary:
    'Abusive handling with elevated isolation and surveillance burden; review flags risk without blocking.',
  subjectRef: 'subject:cooperative-field-asset-22',
  handlingMode: 'abusive',
  subjectFitState: 'mismatch',
  authorizationSource: 'undocumented',
  forcePolicy: 'escalated',
  consentConfidence: 0.08,
  refusalHandling: 'ignored',
  dependencyLeverageScore: 0.72,
  isolationBurdenScore: 0.82,
  surveillanceBurdenScore: 0.79,
  custodyStatusRef: 'custody-status:former-hostile-hold',
  containmentStabilityGain: 0.66,
  personhoodHarmRisk: 0.88,
  trustDamageRisk: 0.84,
  legitimacyRisk: 0.76,
  welfareDebtImpactLabel: 'forced isolation welfare debt likely',
  confidence: 0.73,
})

// ---------------------------------------------------------------------------
// Persistence / hydration
// ---------------------------------------------------------------------------

export type CoerciveProtocolRecordsMap = Record<CoerciveProtocolId, CoerciveProtocolRecord>

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

function sanitizeCoerciveProtocolRecordEntry(value: unknown): CoerciveProtocolRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const subjectRef = normalizeToken(value.subjectRef)
  const handlingMode = value.handlingMode
  const subjectFitState = value.subjectFitState
  const authorizationSource = value.authorizationSource
  const forcePolicy = value.forcePolicy
  const consentConfidence = value.consentConfidence
  const refusalHandling = value.refusalHandling
  const isolationBurdenScore = value.isolationBurdenScore
  const surveillanceBurdenScore = value.surveillanceBurdenScore
  const containmentStabilityGain = value.containmentStabilityGain
  const personhoodHarmRisk = value.personhoodHarmRisk
  const trustDamageRisk = value.trustDamageRisk
  const legitimacyRisk = value.legitimacyRisk
  const welfareDebtImpactLabel = normalizeToken(value.welfareDebtImpactLabel)

  if (
    !id ||
    !label ||
    !subjectRef ||
    !isCoerciveProtocolHandlingMode(handlingMode) ||
    !isCoerciveProtocolSubjectFitState(subjectFitState) ||
    typeof authorizationSource !== 'string' ||
    !AUTHORIZATION_SOURCE_SET.has(authorizationSource) ||
    typeof forcePolicy !== 'string' ||
    !FORCE_POLICY_SET.has(forcePolicy) ||
    !isValidUnitScore(consentConfidence) ||
    typeof refusalHandling !== 'string' ||
    !REFUSAL_HANDLING_SET.has(refusalHandling) ||
    !isValidUnitScore(isolationBurdenScore) ||
    !isValidUnitScore(surveillanceBurdenScore) ||
    !isValidUnitScore(containmentStabilityGain) ||
    !isValidUnitScore(personhoodHarmRisk) ||
    !isValidUnitScore(trustDamageRisk) ||
    !isValidUnitScore(legitimacyRisk) ||
    !welfareDebtImpactLabel
  ) {
    return null
  }

  const summary =
    typeof value.summary === 'string' && value.summary.trim().length > 0
      ? value.summary.trim()
      : undefined
  const dependencyLeverageScore = value.dependencyLeverageScore
  const medicationRegimenRef = normalizeToken(value.medicationRegimenRef ?? '') || undefined
  const custodyStatusRef = normalizeToken(value.custodyStatusRef ?? '') || undefined
  const procedureRef = normalizeToken(value.procedureRef ?? '') || undefined
  const subjectFitValidationRef = normalizeToken(value.subjectFitValidationRef ?? '') || undefined
  const complianceMetricOnly =
    typeof value.complianceMetricOnly === 'boolean' ? value.complianceMetricOnly : undefined
  const confidence = value.confidence
  const unknownFields = parseStringList(value.unknownFields)
  const redactedFields = parseStringList(value.redactedFields)

  const record: CoerciveProtocolRecord = {
    id,
    label,
    subjectRef,
    handlingMode,
    subjectFitState,
    authorizationSource,
    forcePolicy,
    consentConfidence,
    refusalHandling,
    isolationBurdenScore,
    surveillanceBurdenScore,
    containmentStabilityGain,
    personhoodHarmRisk,
    trustDamageRisk,
    legitimacyRisk,
    welfareDebtImpactLabel,
    ...(summary ? { summary } : {}),
    ...(isValidUnitScore(dependencyLeverageScore) ? { dependencyLeverageScore } : {}),
    ...(medicationRegimenRef ? { medicationRegimenRef } : {}),
    ...(custodyStatusRef ? { custodyStatusRef } : {}),
    ...(procedureRef ? { procedureRef } : {}),
    ...(subjectFitValidationRef ? { subjectFitValidationRef } : {}),
    ...(complianceMetricOnly !== undefined ? { complianceMetricOnly } : {}),
    ...(isValidUnitScore(confidence) ? { confidence } : {}),
    ...(unknownFields.length > 0 ? { unknownFields } : {}),
    ...(redactedFields.length > 0 ? { redactedFields } : {}),
  }

  if (!validateCoerciveProtocolRecord(record).valid) {
    return null
  }

  return record
}

function parseBoundedStringList(value: unknown, maxEntries: number): readonly string[] {
  return parseStringList(value).slice(0, maxEntries)
}

function sanitizeProjectionConfidence(value: unknown): number | null {
  return isValidUnitScore(value) ? value : null
}

function sanitizeContainmentCareTradeoffProjection(
  value: unknown,
  recordId: CoerciveProtocolId
): ContainmentCareTradeoffProjection | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const label = normalizeToken(value.label)
  const handlingMode = value.handlingMode
  const welfareDebtImpactLabel = normalizeToken(value.welfareDebtImpactLabel)

  if (
    !label ||
    !isCoerciveProtocolHandlingMode(handlingMode) ||
    !welfareDebtImpactLabel ||
    !isValidUnitScore(value.containmentStabilityGain) ||
    !isValidUnitScore(value.personhoodHarmRisk) ||
    !isValidUnitScore(value.trustDamageRisk) ||
    !isValidUnitScore(value.legitimacyRisk)
  ) {
    return null
  }

  return Object.freeze({
    recordId,
    label,
    handlingMode,
    containmentStabilityGain: roundUnitScore(value.containmentStabilityGain),
    personhoodHarmRisk: roundUnitScore(value.personhoodHarmRisk),
    trustDamageRisk: roundUnitScore(value.trustDamageRisk),
    legitimacyRisk: roundUnitScore(value.legitimacyRisk),
    stableContainmentDominatesCare: value.stableContainmentDominatesCare === true,
    welfareDebtImpactLabel,
    confidence: sanitizeProjectionConfidence(value.confidence),
    redacted: value.redacted === true,
    unknownFields: Object.freeze(
      parseBoundedStringList(value.unknownFields, MAX_COERCIVE_PROTOCOL_PROJECTION_UNKNOWN_FIELDS)
    ),
  })
}

function sanitizeCoerciveProtocolRiskReviewProjection(
  value: unknown,
  recordId: CoerciveProtocolId
): CoerciveProtocolRiskReviewProjection | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const label = normalizeToken(value.label)
  const handlingPosture = value.handlingPosture
  const forcePolicy = value.forcePolicy
  const subjectFitState = value.subjectFitState

  if (
    !label ||
    typeof handlingPosture !== 'string' ||
    !HANDLING_POSTURE_SET.has(handlingPosture) ||
    !isValidUnitScore(value.coercionRiskScore) ||
    !isCoerciveProtocolSubjectFitState(subjectFitState) ||
    typeof forcePolicy !== 'string' ||
    !FORCE_POLICY_SET.has(forcePolicy)
  ) {
    return null
  }

  const contradictionRiskFlags = parseBoundedStringList(
    value.contradictionRiskFlags,
    MAX_COERCIVE_PROTOCOL_PROJECTION_UNKNOWN_FIELDS
  ).filter((flag): flag is CoerciveProtocolContradictionRiskFlag =>
    CONTRADICTION_RISK_FLAG_SET.has(flag)
  )

  return Object.freeze({
    recordId,
    label,
    handlingPosture: handlingPosture as CoerciveProtocolHandlingPosture,
    coercionRiskScore: roundUnitScore(value.coercionRiskScore),
    contradictionRiskFlags: Object.freeze(
      [...contradictionRiskFlags].sort((left, right) => left.localeCompare(right))
    ),
    blocksProcedure: value.blocksProcedure === true,
    subjectFitState,
    forcePolicy: forcePolicy as CoerciveProtocolForcePolicy,
    confidence: sanitizeProjectionConfidence(value.confidence),
    redacted: value.redacted === true,
    unknownFields: Object.freeze(
      parseBoundedStringList(value.unknownFields, MAX_COERCIVE_PROTOCOL_PROJECTION_UNKNOWN_FIELDS)
    ),
  })
}

function sanitizeCoerciveProtocolWeeklyProjectionSnapshotEntry(
  key: string,
  value: unknown
): CoerciveProtocolWeeklyProjectionSnapshot | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const recordId = normalizeToken(value.recordId ?? key)
  if (!recordId || recordId !== normalizeToken(key)) {
    return null
  }

  const weekRaw = value.week
  if (typeof weekRaw !== 'number' || !Number.isFinite(weekRaw)) {
    return null
  }

  const week = Math.max(1, Math.trunc(weekRaw))
  const tradeoff = sanitizeContainmentCareTradeoffProjection(value.tradeoff, recordId)
  const riskReview = sanitizeCoerciveProtocolRiskReviewProjection(value.riskReview, recordId)

  if (!tradeoff || !riskReview) {
    return null
  }

  if (tradeoff.recordId !== recordId || riskReview.recordId !== recordId) {
    return null
  }

  return Object.freeze({
    recordId,
    week,
    tradeoff,
    riskReview,
  })
}

/** Hydration: canonical weekly projection snapshot map keyed by record id; drops invalid entries. */
export function sanitizeCoerciveProtocolWeeklyProjectionSnapshots(
  value: unknown,
  fallback: CoerciveProtocolWeeklyProjectionSnapshotsMap = {},
  knownRecordIds?: ReadonlySet<string>
): CoerciveProtocolWeeklyProjectionSnapshotsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const candidates: CoerciveProtocolWeeklyProjectionSnapshot[] = []

  for (const [key, entry] of Object.entries(value)) {
    const snapshot = sanitizeCoerciveProtocolWeeklyProjectionSnapshotEntry(key, entry)
    if (!snapshot) {
      continue
    }

    if (knownRecordIds && !knownRecordIds.has(snapshot.recordId)) {
      continue
    }

    candidates.push(snapshot)
  }

  if (candidates.length === 0) {
    return fallback
  }

  candidates.sort((left, right) => left.recordId.localeCompare(right.recordId))

  const next: CoerciveProtocolWeeklyProjectionSnapshotsMap = {}
  for (const snapshot of candidates.slice(0, MAX_COERCIVE_PROTOCOL_WEEKLY_PROJECTION_SNAPSHOTS)) {
    next[snapshot.recordId] = snapshot
  }

  return Object.keys(next).length > 0 ? next : fallback
}

/** Hydration: canonical protocol map keyed by record id; drops invalid and duplicate-id entries. */
export function sanitizeCoerciveProtocolRecords(
  value: unknown,
  fallback: CoerciveProtocolRecordsMap = {}
): CoerciveProtocolRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: CoerciveProtocolRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeCoerciveProtocolRecordEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}
