/**
 * SPE-1047 slice 1 anchor: faction ethics matrix registry.
 *
 * Pure deterministic schema + projection for faction-specific ethics review routing —
 * no full policy engine, legitimacy drift, or GameState persistence in this anchor.
 */

import {
  BRANDED_OBJECT_NUMBER_PATTERN,
  FRANCHISE_TOKEN_PATTERN,
} from './containedPersonTherapeuticCareRegistry'

export type FactionEthicsMatrixId = string

export type EthicsPermissibilityVerdict =
  | 'permitted'
  | 'restricted'
  | 'forbidden'
  | 'escalation_required'

export const ETHICS_PERMISSIBILITY_VERDICTS: readonly EthicsPermissibilityVerdict[] = [
  'permitted',
  'restricted',
  'forbidden',
  'escalation_required',
] as const

export interface FactionEthicsMatrixRecord {
  readonly id: FactionEthicsMatrixId
  readonly label: string
  readonly summary?: string
  readonly factionId: string
  readonly reviewOwnerLabel: string
  readonly subjectRef?: string
  readonly permissibilityVerdict: EthicsPermissibilityVerdict
  readonly authorizationRequired: boolean
  readonly doctrineRef?: string
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

export type FactionEthicsMatrixValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_faction_id'
  | 'missing_review_owner_label'
  | 'invalid_permissibility_verdict'
  | 'invalid_confidence'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface FactionEthicsMatrixValidationIssue {
  readonly code: FactionEthicsMatrixValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface FactionEthicsMatrixValidationResult {
  readonly valid: boolean
  readonly issues: readonly FactionEthicsMatrixValidationIssue[]
}

export interface FactionEthicsMatrixProjection {
  readonly recordId: FactionEthicsMatrixId
  readonly wiredRef: string
  readonly label: string
  readonly factionId: string
  readonly reviewOwnerLabel: string
  readonly subjectRef: string | null
  readonly permissibilityVerdict: EthicsPermissibilityVerdict
  readonly authorizationRequired: boolean
  readonly confidence: number | null
  readonly redacted: boolean
}

export type FactionEthicsMatrixRecordsMap = Record<FactionEthicsMatrixId, FactionEthicsMatrixRecord>

const PERMISSIBILITY_VERDICT_SET = new Set<string>(ETHICS_PERMISSIBILITY_VERDICTS)

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function slugifyReviewOwnerLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function formatFactionEthicsMatrixWiredRef(recordId: string): string {
  return `faction-ethics:${normalizeToken(recordId)}`
}

function containsFranchiseToken(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && FRANCHISE_TOKEN_PATTERN.test(token)
}

function containsBrandedObjectNumber(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && BRANDED_OBJECT_NUMBER_PATTERN.test(token)
}

function isValidUnitScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function freezeValidationResult(
  issues: FactionEthicsMatrixValidationIssue[]
): FactionEthicsMatrixValidationResult {
  const sortedIssues = [...issues].sort((left, right) => {
    const codeCompare = left.code.localeCompare(right.code)
    if (codeCompare !== 0) {
      return codeCompare
    }

    return left.detail.localeCompare(right.detail)
  })
  const hasError = sortedIssues.some((issue) => issue.severity === 'error')

  return Object.freeze({
    valid: !hasError,
    issues: Object.freeze(sortedIssues),
  })
}

export function validateFactionEthicsMatrixRecord(
  record: FactionEthicsMatrixRecord
): FactionEthicsMatrixValidationResult {
  const issues: FactionEthicsMatrixValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const factionId = normalizeToken(record.factionId)
  const reviewOwnerLabel = normalizeToken(record.reviewOwnerLabel)

  if (!id) {
    issues.push({
      code: 'missing_id',
      severity: 'error',
      detail: 'Faction ethics matrix record is missing id.',
    })
  }

  if (!label) {
    issues.push({
      code: 'missing_label',
      severity: 'error',
      detail: `Faction ethics matrix record ${id || '(unknown)'} is missing label.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!factionId) {
    issues.push({
      code: 'missing_faction_id',
      severity: 'error',
      detail: `Faction ethics matrix record ${id || '(unknown)'} is missing factionId.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!reviewOwnerLabel) {
    issues.push({
      code: 'missing_review_owner_label',
      severity: 'error',
      detail: `Faction ethics matrix record ${id || '(unknown)'} is missing reviewOwnerLabel.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!PERMISSIBILITY_VERDICT_SET.has(record.permissibilityVerdict)) {
    issues.push({
      code: 'invalid_permissibility_verdict',
      severity: 'error',
      detail: `Faction ethics matrix record ${id || '(unknown)'} has invalid permissibilityVerdict.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    issues.push({
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Faction ethics matrix record ${id || '(unknown)'} has invalid confidence.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const [fieldName, value] of [
    ['id', id],
    ['label', label],
    ['reviewOwnerLabel', reviewOwnerLabel],
  ] as const) {
    if (containsFranchiseToken(value)) {
      issues.push({
        code: fieldName === 'id' ? 'franchise_token_in_id' : 'franchise_token_in_label',
        severity: 'error',
        detail: `Faction ethics matrix record ${fieldName} contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (containsBrandedObjectNumber(value)) {
      issues.push({
        code:
          fieldName === 'id' ? 'branded_object_number_in_id' : 'branded_object_number_in_label',
        severity: 'error',
        detail: `Faction ethics matrix record ${fieldName} contains a branded object number.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  return freezeValidationResult(issues)
}

export function projectFactionEthicsMatrixReview(
  record: FactionEthicsMatrixRecord
): FactionEthicsMatrixProjection {
  const subjectRef = normalizeToken(record.subjectRef ?? '') || null
  const redacted = (record.redactedFields?.length ?? 0) > 0

  return Object.freeze({
    recordId: record.id,
    wiredRef: formatFactionEthicsMatrixWiredRef(record.id),
    label: record.label,
    factionId: record.factionId,
    reviewOwnerLabel: record.reviewOwnerLabel,
    subjectRef,
    permissibilityVerdict: record.permissibilityVerdict,
    authorizationRequired: record.authorizationRequired,
    confidence:
      typeof record.confidence === 'number' && Number.isFinite(record.confidence)
        ? record.confidence
        : null,
    redacted,
  })
}

export function listHydratedFactionEthicsMatrixRecordsForReviewOwnerLabel(
  records: FactionEthicsMatrixRecordsMap | undefined,
  reviewOwnerLabel: string
): FactionEthicsMatrixRecord[] {
  const normalizedSlug = slugifyReviewOwnerLabel(reviewOwnerLabel)
  if (!normalizedSlug) {
    return []
  }

  return Object.values(records ?? {})
    .filter(
      (record) =>
        slugifyReviewOwnerLabel(record.reviewOwnerLabel) === normalizedSlug &&
        validateFactionEthicsMatrixRecord(record).valid
    )
    .sort((left, right) => left.id.localeCompare(right.id))
}

export function listHydratedFactionEthicsMatrixRecordsForSubjectRef(
  records: FactionEthicsMatrixRecordsMap | undefined,
  subjectRef: string
): FactionEthicsMatrixRecord[] {
  const normalizedSubjectRef = normalizeToken(subjectRef)
  if (!normalizedSubjectRef) {
    return []
  }

  return Object.values(records ?? {})
    .filter(
      (record) =>
        normalizeToken(record.subjectRef ?? '') === normalizedSubjectRef &&
        validateFactionEthicsMatrixRecord(record).valid
    )
    .sort((left, right) => left.id.localeCompare(right.id))
}

/** Ethics review board routing for coercive welfare-debt review owners. */
export const ETHICS_REVIEW_BOARD_MATRIX_FIXTURE: FactionEthicsMatrixRecord = Object.freeze({
  id: 'faction-ethics:ethics-review-board-routing',
  label: 'Ethics review board routing',
  summary: 'Agency ethics committee review path for coercive welfare-debt escalation.',
  factionId: 'oversight',
  reviewOwnerLabel: 'ethics review board',
  subjectRef: 'subject:contained-person-field-links',
  permissibilityVerdict: 'escalation_required',
  authorizationRequired: true,
  doctrineRef: 'doctrine:public-protection',
  confidence: 0.86,
})

/** Psychiatric review panel routing for coerced medication welfare debt. */
export const PSYCHIATRIC_REVIEW_PANEL_MATRIX_FIXTURE: FactionEthicsMatrixRecord = Object.freeze({
  id: 'faction-ethics:psychiatric-review-panel-routing',
  label: 'Psychiatric review panel routing',
  summary: 'Clinical ethics review path for coerced medication welfare debt.',
  factionId: 'medical',
  reviewOwnerLabel: 'psychiatric review panel',
  subjectRef: 'subject:cooperative-field-asset-22',
  permissibilityVerdict: 'restricted',
  authorizationRequired: true,
  doctrineRef: 'doctrine:evidence-based-care',
  confidence: 0.81,
})
