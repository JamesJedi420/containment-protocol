/**
 * SPE-2130 slice 1: efficacious instruction-text registry.
 *
 * Pure deterministic registry for instruction-bearing media that produce
 * material behavioral or anomalous effects and require benefit-risk review.
 * Does not implement a media execution or behavioral-effect engine.
 */

export type EfficaciousInstructionTextId = string

export type EfficacyBand = 'low' | 'moderate' | 'high' | 'unknown'

export const EFFICACY_BANDS: readonly EfficacyBand[] = [
  'low',
  'moderate',
  'high',
  'unknown',
] as const

export type BenefitRiskReviewState =
  | 'unreviewed'
  | 'benefit_dominant'
  | 'balanced'
  | 'risk_dominant'
  | 'prohibited'

export const BENEFIT_RISK_REVIEW_STATES: readonly BenefitRiskReviewState[] = [
  'unreviewed',
  'benefit_dominant',
  'balanced',
  'risk_dominant',
  'prohibited',
] as const

export interface EfficaciousInstructionTextRecord {
  readonly id: EfficaciousInstructionTextId
  readonly label: string
  readonly efficacyBand: EfficacyBand
  readonly benefitRiskReviewState: BenefitRiskReviewState
  readonly subjectOutcomeRefs: readonly string[]
  readonly summary?: string
}

export type EfficaciousInstructionTextValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'invalid_efficacy_band'
  | 'invalid_benefit_risk_review_state'
  | 'invalid_subject_outcome_refs'
  | 'empty_subject_outcome_ref'

export interface EfficaciousInstructionTextValidationIssue {
  readonly code: EfficaciousInstructionTextValidationCode
  readonly detail: string
}

export function validateEfficaciousInstructionText(
  record: EfficaciousInstructionTextRecord,
): readonly EfficaciousInstructionTextValidationIssue[] {
  const issues: EfficaciousInstructionTextValidationIssue[] = []

  if (!record.id || record.id.trim().length === 0) {
    issues.push({ code: 'missing_id', detail: 'id is required' })
  }
  if (!record.label || record.label.trim().length === 0) {
    issues.push({ code: 'missing_label', detail: 'label is required' })
  }
  if (!EFFICACY_BANDS.includes(record.efficacyBand)) {
    issues.push({
      code: 'invalid_efficacy_band',
      detail: `efficacyBand must be one of ${EFFICACY_BANDS.join(', ')}`,
    })
  }
  if (!BENEFIT_RISK_REVIEW_STATES.includes(record.benefitRiskReviewState)) {
    issues.push({
      code: 'invalid_benefit_risk_review_state',
      detail: `benefitRiskReviewState must be one of ${BENEFIT_RISK_REVIEW_STATES.join(', ')}`,
    })
  }
  if (!Array.isArray(record.subjectOutcomeRefs)) {
    issues.push({
      code: 'invalid_subject_outcome_refs',
      detail: 'subjectOutcomeRefs must be an array',
    })
  } else {
    for (const ref of record.subjectOutcomeRefs) {
      if (typeof ref !== 'string' || ref.trim().length === 0) {
        issues.push({
          code: 'empty_subject_outcome_ref',
          detail: 'subjectOutcomeRefs must not contain empty strings',
        })
      }
    }
  }

  return issues
}

export class EfficaciousInstructionTextRegistry {
  private readonly records = new Map<EfficaciousInstructionTextId, EfficaciousInstructionTextRecord>()

  register(record: EfficaciousInstructionTextRecord): void {
    const issues = validateEfficaciousInstructionText(record)
    if (issues.length > 0) {
      throw new Error(
        `Invalid efficacious instruction text record: ${issues.map((i) => i.code).join(', ')}`,
      )
    }
    if (this.records.has(record.id)) {
      throw new Error(`Duplicate efficacious instruction text id: ${record.id}`)
    }
    this.records.set(record.id, { ...record })
  }

  get(id: EfficaciousInstructionTextId): EfficaciousInstructionTextRecord | undefined {
    return this.records.get(id)
  }

  has(id: EfficaciousInstructionTextId): boolean {
    return this.records.has(id)
  }

  list(): readonly EfficaciousInstructionTextRecord[] {
    return Array.from(this.records.values())
  }
}
