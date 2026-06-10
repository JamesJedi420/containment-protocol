/**
 * SPE-848 slice 1: surveillance and capacity intervention tuning registry anchor.
 *
 * Pure deterministic registry separating surveillance signal from meaningful contact
 * and tracking intervention level, collateral strain, and horizon outcomes — distinct
 * from coercive protocol registry (SPE-1882) and integrated health bundles (SPE-1889).
 */

import {
  BRANDED_OBJECT_NUMBER_PATTERN,
  FRANCHISE_TOKEN_PATTERN,
} from './containedPersonTherapeuticCareRegistry'

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type SurveillanceInterventionTuningId = string

export type InterventionLevel = 'relaxed' | 'sustained' | 'escalated' | 'alternative_support'

export const INTERVENTION_LEVELS: readonly InterventionLevel[] = [
  'relaxed',
  'sustained',
  'escalated',
  'alternative_support',
] as const

export type InterventionHorizonOutcome =
  | 'elevated_isolation_pressure'
  | 'compliance_metric_stable'
  | 'legitimacy_erosion_risk'
  | 'collateral_strain_elevated'
  | 'contact_recovery_signal'

export const INTERVENTION_HORIZON_OUTCOMES: readonly InterventionHorizonOutcome[] = [
  'elevated_isolation_pressure',
  'compliance_metric_stable',
  'legitimacy_erosion_risk',
  'collateral_strain_elevated',
  'contact_recovery_signal',
] as const

export type InterventionHorizonBand = 'short' | 'medium' | 'long'

export const INTERVENTION_HORIZON_BANDS: readonly InterventionHorizonBand[] = [
  'short',
  'medium',
  'long',
] as const

export interface InterventionHorizonOutcomes {
  readonly short?: InterventionHorizonOutcome
  readonly medium?: InterventionHorizonOutcome
  readonly long?: InterventionHorizonOutcome
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface SurveillanceInterventionTuningRecord {
  readonly id: SurveillanceInterventionTuningId
  readonly label: string
  readonly summary?: string
  readonly subjectRef: string
  readonly currentInterventionLevel: InterventionLevel
  readonly surveillanceSignalScore: number
  readonly meaningfulContactScore: number
  readonly healthcareLoadScore?: number | null
  readonly collateralStrainScore?: number | null
  readonly horizonOutcomes?: InterventionHorizonOutcomes
  readonly tuningRationaleRef?: string
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type SurveillanceInterventionTuningValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_subject_ref'
  | 'invalid_intervention_level'
  | 'invalid_surveillance_signal_score'
  | 'invalid_meaningful_contact_score'
  | 'invalid_healthcare_load_score'
  | 'invalid_collateral_strain_score'
  | 'invalid_confidence'
  | 'invalid_horizon_outcome'
  | 'relaxed_under_high_surveillance_without_rationale'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface SurveillanceInterventionTuningValidationIssue {
  readonly code: SurveillanceInterventionTuningValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface SurveillanceInterventionTuningValidationResult {
  readonly valid: boolean
  readonly issues: readonly SurveillanceInterventionTuningValidationIssue[]
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export interface SurveillanceInterventionTuningProjectionPolicy {
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
  readonly highSurveillanceThreshold?: number
  readonly lowContactThreshold?: number
}

export interface SurveillanceInterventionTuningProjection {
  readonly recordId: SurveillanceInterventionTuningId
  readonly label: string
  readonly subjectRef: string
  readonly currentInterventionLevel: InterventionLevel
  readonly surveillanceSignalScore: number | null
  readonly meaningfulContactScore: number | null
  readonly collateralStrainScore: number | null
  readonly monitoringExceedsContact: boolean
  readonly sustainedUnderCollateralStrain: boolean
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const INTERVENTION_LEVEL_SET = new Set<string>(INTERVENTION_LEVELS)
const HORIZON_OUTCOME_SET = new Set<string>(INTERVENTION_HORIZON_OUTCOMES)

const DEFAULT_HIGH_SURVEILLANCE_THRESHOLD = 0.65
const DEFAULT_LOW_CONTACT_THRESHOLD = 0.25
const DEFAULT_HIGH_COLLATERAL_STRAIN_THRESHOLD = 0.55

const SUSTAINED_INTERVENTION_LEVELS: ReadonlySet<InterventionLevel> = new Set([
  'sustained',
  'escalated',
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
  issues: SurveillanceInterventionTuningValidationIssue[],
  issue: SurveillanceInterventionTuningValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: SurveillanceInterventionTuningValidationIssue[]) {
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
  issues: SurveillanceInterventionTuningValidationIssue[]
): SurveillanceInterventionTuningValidationResult {
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
  issues: SurveillanceInterventionTuningValidationIssue[],
  id: string,
  label: string,
  record: SurveillanceInterventionTuningRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Surveillance intervention tuning record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Surveillance intervention tuning record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Surveillance intervention tuning record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Surveillance intervention tuning record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const stringFields: Array<{ field: string; value: string | undefined }> = [
    { field: 'summary', value: record.summary },
    { field: 'subjectRef', value: record.subjectRef },
    { field: 'tuningRationaleRef', value: record.tuningRationaleRef },
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
        detail: `Surveillance intervention tuning record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (containsBrandedObjectNumber(token)) {
      pushIssue(issues, {
        code: 'branded_object_number_in_field',
        severity: 'error',
        detail: `Surveillance intervention tuning record ${id || '(unknown)'} field ${field} contains a branded object number.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }
}

function resolveOptionalUnitScore(
  record: SurveillanceInterventionTuningRecord,
  field: keyof SurveillanceInterventionTuningRecord,
  policy: SurveillanceInterventionTuningProjectionPolicy
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
  record: SurveillanceInterventionTuningRecord,
  policy: SurveillanceInterventionTuningProjectionPolicy
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

function isInterventionHorizonOutcome(value: unknown): value is InterventionHorizonOutcome {
  return typeof value === 'string' && HORIZON_OUTCOME_SET.has(value)
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isInterventionLevel(value: unknown): value is InterventionLevel {
  return typeof value === 'string' && INTERVENTION_LEVEL_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateSurveillanceInterventionTuningRecord(
  record: SurveillanceInterventionTuningRecord
): SurveillanceInterventionTuningValidationResult {
  const issues: SurveillanceInterventionTuningValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const subjectRef = normalizeToken(record.subjectRef)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Surveillance intervention tuning record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Surveillance intervention tuning record is missing label.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!subjectRef) {
    pushIssue(issues, {
      code: 'missing_subject_ref',
      severity: 'error',
      detail: 'Surveillance intervention tuning record is missing subjectRef.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isInterventionLevel(record.currentInterventionLevel)) {
    pushIssue(issues, {
      code: 'invalid_intervention_level',
      severity: 'error',
      detail: `Surveillance intervention tuning record ${id || '(unknown)'} has invalid currentInterventionLevel.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isValidUnitScore(record.surveillanceSignalScore)) {
    pushIssue(issues, {
      code: 'invalid_surveillance_signal_score',
      severity: 'error',
      detail: `Surveillance intervention tuning record ${id || '(unknown)'} has invalid surveillanceSignalScore.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isValidUnitScore(record.meaningfulContactScore)) {
    pushIssue(issues, {
      code: 'invalid_meaningful_contact_score',
      severity: 'error',
      detail: `Surveillance intervention tuning record ${id || '(unknown)'} has invalid meaningfulContactScore.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.healthcareLoadScore !== undefined &&
    record.healthcareLoadScore !== null &&
    !isValidUnitScore(record.healthcareLoadScore)
  ) {
    pushIssue(issues, {
      code: 'invalid_healthcare_load_score',
      severity: 'error',
      detail: `Surveillance intervention tuning record ${id || '(unknown)'} has invalid healthcareLoadScore.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.collateralStrainScore !== undefined &&
    record.collateralStrainScore !== null &&
    !isValidUnitScore(record.collateralStrainScore)
  ) {
    pushIssue(issues, {
      code: 'invalid_collateral_strain_score',
      severity: 'error',
      detail: `Surveillance intervention tuning record ${id || '(unknown)'} has invalid collateralStrainScore.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Surveillance intervention tuning record ${id || '(unknown)'} has invalid confidence.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const horizonOutcomes = record.horizonOutcomes
  if (horizonOutcomes) {
    for (const band of INTERVENTION_HORIZON_BANDS) {
      const outcome = horizonOutcomes[band]
      if (outcome !== undefined && !isInterventionHorizonOutcome(outcome)) {
        pushIssue(issues, {
          code: 'invalid_horizon_outcome',
          severity: 'error',
          detail: `Surveillance intervention tuning record ${id || '(unknown)'} has invalid ${band} horizon outcome.`,
          relatedIds: id ? [id] : undefined,
        })
      }
    }
  }

  if (
    record.currentInterventionLevel === 'relaxed' &&
    isValidUnitScore(record.surveillanceSignalScore) &&
    record.surveillanceSignalScore >= DEFAULT_HIGH_SURVEILLANCE_THRESHOLD &&
    !normalizeToken(record.tuningRationaleRef ?? '')
  ) {
    pushIssue(issues, {
      code: 'relaxed_under_high_surveillance_without_rationale',
      severity: 'warning',
      detail: `Surveillance intervention tuning record ${id || '(unknown)'} is relaxed under high surveillance signal without tuningRationaleRef.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  scanForbiddenTokens(issues, id, label, record)

  return freezeValidationResult(issues)
}

export function projectSurveillanceInterventionTuningReview(
  record: SurveillanceInterventionTuningRecord,
  policy: SurveillanceInterventionTuningProjectionPolicy = {}
): SurveillanceInterventionTuningProjection {
  const highSurveillanceThreshold =
    typeof policy.highSurveillanceThreshold === 'number' &&
    Number.isFinite(policy.highSurveillanceThreshold)
      ? clampUnit(policy.highSurveillanceThreshold)
      : DEFAULT_HIGH_SURVEILLANCE_THRESHOLD
  const lowContactThreshold =
    typeof policy.lowContactThreshold === 'number' && Number.isFinite(policy.lowContactThreshold)
      ? clampUnit(policy.lowContactThreshold)
      : DEFAULT_LOW_CONTACT_THRESHOLD

  const surveillanceSignalScore = resolveOptionalUnitScore(
    record,
    'surveillanceSignalScore',
    policy
  )
  const meaningfulContactScore = resolveOptionalUnitScore(record, 'meaningfulContactScore', policy)
  const collateralStrainScore = resolveOptionalUnitScore(record, 'collateralStrainScore', policy)

  const monitoringExceedsContact =
    surveillanceSignalScore !== null &&
    meaningfulContactScore !== null &&
    surveillanceSignalScore >= highSurveillanceThreshold &&
    meaningfulContactScore < lowContactThreshold

  const sustainedUnderCollateralStrain =
    SUSTAINED_INTERVENTION_LEVELS.has(record.currentInterventionLevel) &&
    collateralStrainScore !== null &&
    collateralStrainScore >= DEFAULT_HIGH_COLLATERAL_STRAIN_THRESHOLD

  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)

  return Object.freeze({
    recordId: record.id,
    label: record.label,
    subjectRef: record.subjectRef,
    currentInterventionLevel: record.currentInterventionLevel,
    surveillanceSignalScore,
    meaningfulContactScore,
    collateralStrainScore,
    monitoringExceedsContact,
    sustainedUnderCollateralStrain,
    confidence: resolveConfidence(record, policy),
    redacted: redactedFields.size > 0,
    unknownFields,
  })
}

export type SurveillanceInterventionTuningRecordsMap = Record<
  SurveillanceInterventionTuningId,
  SurveillanceInterventionTuningRecord
>

/** Tuning record paired with abusive surveillance-isolation coercive protocol (subject-22). */
export const SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE: SurveillanceInterventionTuningRecord =
  Object.freeze({
    id: 'surveillance-tuning:cooperative-field-asset-22',
    label: 'Subject 22 surveillance intervention tuning',
    summary:
      'Sustained intervention under high surveillance signal and low meaningful contact with elevated collateral strain.',
    subjectRef: 'subject:cooperative-field-asset-22',
    currentInterventionLevel: 'sustained',
    surveillanceSignalScore: 0.88,
    meaningfulContactScore: 0.14,
    healthcareLoadScore: 0.42,
    collateralStrainScore: 0.71,
    horizonOutcomes: Object.freeze({
      short: 'elevated_isolation_pressure',
      medium: 'compliance_metric_stable',
      long: 'legitimacy_erosion_risk',
    }),
    tuningRationaleRef: 'tuning-rationale:surveillance-capacity-review-22',
    confidence: 0.76,
  })
