/**
 * SPE-2114 slice 1: entity welfare reclassification registry.
 *
 * Pure deterministic registry for moving entities from hostile-threat containment
 * to rights-aware custody when evidence, behavior, or ethics review warrants —
 * distinct from affiliation status wire-up (SPE-1046) and welfare-debt accounting (SPE-1888).
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type EntityWelfareReclassificationId = string

export type ProposedDisposition =
  | 'hostile'
  | 'cooperative'
  | 'medical'
  | 'sapient_remains'
  | 'unknown'

export const PROPOSED_DISPOSITIONS: readonly ProposedDisposition[] = [
  'hostile',
  'cooperative',
  'medical',
  'sapient_remains',
  'unknown',
] as const

export type ReviewGate = 'ethics' | 'veterinary' | 'psych' | 'executive'

export const REVIEW_GATES: readonly ReviewGate[] = [
  'ethics',
  'veterinary',
  'psych',
  'executive',
] as const

export type ReclassificationState = 'pending' | 'approved' | 'denied' | 'reverted'

export const RECLASSIFICATION_STATES: readonly ReclassificationState[] = [
  'pending',
  'approved',
  'denied',
  'reverted',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface ReclassificationTransitionHistoryEntry {
  readonly fromState: ReclassificationState
  readonly toState: ReclassificationState
  readonly week: number
  readonly reviewGate?: ReviewGate
  readonly reviewArtifactRef?: string
  readonly note?: string
}

export interface EntityWelfareReclassificationRecord {
  readonly id: EntityWelfareReclassificationId
  readonly label: string
  readonly summary?: string
  readonly priorThreatLabel: string
  readonly proposedDisposition: ProposedDisposition
  readonly welfareDebtRef?: string
  readonly reviewGate?: ReviewGate
  readonly reviewArtifactRef?: string
  readonly reclassificationState: ReclassificationState
  readonly evidenceBundleRefs?: readonly string[]
  readonly containmentRevisionRefs?: readonly string[]
  readonly transitionHistory?: readonly ReclassificationTransitionHistoryEntry[]
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type EntityWelfareReclassificationValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_prior_threat_label'
  | 'invalid_proposed_disposition'
  | 'invalid_review_gate'
  | 'invalid_reclassification_state'
  | 'invalid_confidence'
  | 'empty_evidence_bundle_ref'
  | 'invalid_transition_history_entry'
  | 'invalid_transition_history_week'
  | 'invalid_transition_history_state'
  | 'terminal_state_without_review_artifact'
  | 'approved_without_evidence_bundles'
  | 'approved_without_containment_revision'
  | 'terminal_state_without_review_gate'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface EntityWelfareReclassificationValidationIssue {
  readonly code: EntityWelfareReclassificationValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface EntityWelfareReclassificationValidationResult {
  readonly valid: boolean
  readonly issues: readonly EntityWelfareReclassificationValidationIssue[]
}

// ---------------------------------------------------------------------------
// Pressure projection
// ---------------------------------------------------------------------------

export interface ReclassificationPressureProjectionPolicy {
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
  readonly liabilityAmplification?: number
}

export interface ReclassificationPressureProjection {
  readonly recordId: EntityWelfareReclassificationId
  readonly label: string
  readonly reclassificationState: ReclassificationState
  readonly staffMoraleForecast: number | null
  readonly liabilityForecast: number | null
  readonly publicRiskForecast: number | null
  readonly welfareDebtLinked: boolean
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const PROPOSED_DISPOSITION_SET = new Set<string>(PROPOSED_DISPOSITIONS)
const REVIEW_GATE_SET = new Set<string>(REVIEW_GATES)
const RECLASSIFICATION_STATE_SET = new Set<string>(RECLASSIFICATION_STATES)

const HOSTILE_PRIOR_LABEL_PATTERN = /\b(hostile|keter|euclid|threat|predator|apex)\b/i
const SOFT_DISPOSITIONS = new Set<ProposedDisposition>(['cooperative', 'medical', 'unknown'])
const TERMINAL_STATES = new Set<ReclassificationState>(['approved', 'denied', 'reverted'])

const REVIEW_GATE_LIABILITY_WEIGHT: Readonly<Record<ReviewGate, number>> = {
  ethics: 0.72,
  veterinary: 0.48,
  psych: 0.56,
  executive: 0.84,
}

const DISPOSITION_PUBLIC_RISK_WEIGHT: Readonly<Record<ProposedDisposition, number>> = {
  hostile: 0.82,
  cooperative: 0.34,
  medical: 0.28,
  sapient_remains: 0.41,
  unknown: 0.55,
}

export const FRANCHISE_TOKEN_PATTERN =
  /\b(scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|goi-|group of interest|broken masquerade|masquerade breach)\b/i

export const BRANDED_OBJECT_NUMBER_PATTERN = /\bSCP[\s-]?\d{3,4}\b/i

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

function asTransitionHistory(value: unknown): readonly ReclassificationTransitionHistoryEntry[] {
  return Array.isArray(value) ? value : []
}

function pushIssue(
  issues: EntityWelfareReclassificationValidationIssue[],
  issue: EntityWelfareReclassificationValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: EntityWelfareReclassificationValidationIssue[]) {
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

function isValidUnitScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function freezeValidationResult(
  issues: EntityWelfareReclassificationValidationIssue[]
): EntityWelfareReclassificationValidationResult {
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

function hasNonEmptyEvidenceBundles(record: EntityWelfareReclassificationRecord): boolean {
  return asStringArray(record.evidenceBundleRefs).some((ref) => normalizeToken(ref).length > 0)
}

function hasReviewArtifact(record: EntityWelfareReclassificationRecord): boolean {
  if (normalizeToken(record.reviewArtifactRef ?? '').length > 0) {
    return true
  }

  return asTransitionHistory(record.transitionHistory).some(
    (entry) => entry && typeof entry === 'object' && normalizeToken(entry.reviewArtifactRef ?? '').length > 0
  )
}

function hasReviewGate(record: EntityWelfareReclassificationRecord): boolean {
  if (record.reviewGate && isReviewGate(record.reviewGate)) {
    return true
  }

  return asTransitionHistory(record.transitionHistory).some(
    (entry) => entry && typeof entry === 'object' && entry.reviewGate !== undefined && isReviewGate(entry.reviewGate)
  )
}

function hasContainmentRevision(record: EntityWelfareReclassificationRecord): boolean {
  return asStringArray(record.containmentRevisionRefs).some((ref) => normalizeToken(ref).length > 0)
}

function isHostilePriorLabel(label: string): boolean {
  return HOSTILE_PRIOR_LABEL_PATTERN.test(normalizeToken(label))
}

function dispositionSoftensFromHostilePosture(record: EntityWelfareReclassificationRecord): boolean {
  return (
    isHostilePriorLabel(record.priorThreatLabel) &&
    SOFT_DISPOSITIONS.has(record.proposedDisposition)
  )
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function roundUnit(value: number): number {
  return Math.round(clampUnit(value) * 1000) / 1000
}

function scanForbiddenTokens(
  issues: EntityWelfareReclassificationValidationIssue[],
  id: string,
  label: string,
  record: EntityWelfareReclassificationRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Entity welfare reclassification record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Entity welfare reclassification record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Entity welfare reclassification record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Entity welfare reclassification record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const stringFields: Array<{ field: string; value: string | undefined }> = [
    { field: 'summary', value: record.summary },
    { field: 'priorThreatLabel', value: record.priorThreatLabel },
    { field: 'welfareDebtRef', value: record.welfareDebtRef },
    { field: 'reviewArtifactRef', value: record.reviewArtifactRef },
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
        detail: `Entity welfare reclassification record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (containsBrandedObjectNumber(token)) {
      pushIssue(issues, {
        code: 'branded_object_number_in_field',
        severity: 'error',
        detail: `Entity welfare reclassification record ${id || '(unknown)'} field ${field} contains a branded object number.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const ref of asStringArray(record.evidenceBundleRefs)) {
    const token = normalizeToken(ref)
    if (token && (containsFranchiseToken(token) || containsBrandedObjectNumber(token))) {
      pushIssue(issues, {
        code: containsFranchiseToken(token) ? 'franchise_token_in_field' : 'branded_object_number_in_field',
        severity: 'error',
        detail: `Entity welfare reclassification record ${id || '(unknown)'} evidenceBundleRefs contains a forbidden token.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const ref of asStringArray(record.containmentRevisionRefs)) {
    const token = normalizeToken(ref)
    if (token && (containsFranchiseToken(token) || containsBrandedObjectNumber(token))) {
      pushIssue(issues, {
        code: containsFranchiseToken(token) ? 'franchise_token_in_field' : 'branded_object_number_in_field',
        severity: 'error',
        detail: `Entity welfare reclassification record ${id || '(unknown)'} containmentRevisionRefs contains a forbidden token.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const entry of asTransitionHistory(record.transitionHistory)) {
    if (!entry || typeof entry !== 'object') {
      continue
    }

    for (const token of [entry.note, entry.reviewArtifactRef]) {
      const normalized = normalizeToken(token ?? '')
      if (!normalized) {
        continue
      }

      if (containsFranchiseToken(normalized)) {
        pushIssue(issues, {
          code: 'franchise_token_in_field',
          severity: 'error',
          detail: `Entity welfare reclassification record ${id || '(unknown)'} transitionHistory contains a franchise or source-literal token.`,
          relatedIds: id ? [id] : undefined,
        })
      }

      if (containsBrandedObjectNumber(normalized)) {
        pushIssue(issues, {
          code: 'branded_object_number_in_field',
          severity: 'error',
          detail: `Entity welfare reclassification record ${id || '(unknown)'} transitionHistory contains a branded object number.`,
          relatedIds: id ? [id] : undefined,
        })
      }
    }
  }
}

function resolveConfidence(
  record: EntityWelfareReclassificationRecord,
  policy: ReclassificationPressureProjectionPolicy
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

function resolveStaffMoraleForecast(record: EntityWelfareReclassificationRecord): number {
  const base =
    record.reclassificationState === 'approved'
      ? 0.58
      : record.reclassificationState === 'pending'
        ? 0.44
        : record.reclassificationState === 'denied'
          ? 0.36
          : 0.4

  const dispositionLift = record.proposedDisposition === 'cooperative' ? 0.12 : 0
  const evidenceLift = hasNonEmptyEvidenceBundles(record) ? 0.06 : -0.08
  const revisionLift = hasContainmentRevision(record) ? 0.05 : 0

  return roundUnit(base + dispositionLift + evidenceLift + revisionLift)
}

function resolveLiabilityForecast(
  record: EntityWelfareReclassificationRecord,
  policy: ReclassificationPressureProjectionPolicy
): number {
  const gateWeight = record.reviewGate ? REVIEW_GATE_LIABILITY_WEIGHT[record.reviewGate] : 0.5
  const debtLift = normalizeToken(record.welfareDebtRef ?? '').length > 0 ? 0.18 : 0
  const hostilePriorLift = isHostilePriorLabel(record.priorThreatLabel) ? 0.14 : 0.04
  const terminalLift = TERMINAL_STATES.has(record.reclassificationState) ? 0.08 : 0
  const amplification = policy.liabilityAmplification ?? 1

  return roundUnit((gateWeight + debtLift + hostilePriorLift + terminalLift) * amplification)
}

function resolvePublicRiskForecast(record: EntityWelfareReclassificationRecord): number {
  const dispositionRisk = DISPOSITION_PUBLIC_RISK_WEIGHT[record.proposedDisposition]
  const pendingUncertainty = record.reclassificationState === 'pending' ? 0.08 : 0
  const deniedBacklash = record.reclassificationState === 'denied' ? 0.1 : 0
  const revisionRelief = hasContainmentRevision(record) ? -0.06 : 0

  return roundUnit(dispositionRisk + pendingUncertainty + deniedBacklash + revisionRelief)
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isProposedDisposition(value: string): value is ProposedDisposition {
  return PROPOSED_DISPOSITION_SET.has(value)
}

export function isReviewGate(value: string): value is ReviewGate {
  return REVIEW_GATE_SET.has(value)
}

export function isReclassificationState(value: string): value is ReclassificationState {
  return RECLASSIFICATION_STATE_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateEntityWelfareReclassificationRecord(
  record: EntityWelfareReclassificationRecord
): EntityWelfareReclassificationValidationResult {
  const issues: EntityWelfareReclassificationValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const priorThreatLabel = normalizeToken(record.priorThreatLabel)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Entity welfare reclassification record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Entity welfare reclassification record is missing label.',
    })
  }

  if (!priorThreatLabel) {
    pushIssue(issues, {
      code: 'missing_prior_threat_label',
      severity: 'error',
      detail: 'Entity welfare reclassification record is missing priorThreatLabel.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isProposedDisposition(record.proposedDisposition)) {
    pushIssue(issues, {
      code: 'invalid_proposed_disposition',
      severity: 'error',
      detail: `Entity welfare reclassification record ${id || '(unknown)'} has invalid proposedDisposition ${String(record.proposedDisposition)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.reviewGate !== undefined && !isReviewGate(record.reviewGate)) {
    pushIssue(issues, {
      code: 'invalid_review_gate',
      severity: 'error',
      detail: `Entity welfare reclassification record ${id || '(unknown)'} has invalid reviewGate ${String(record.reviewGate)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isReclassificationState(record.reclassificationState)) {
    pushIssue(issues, {
      code: 'invalid_reclassification_state',
      severity: 'error',
      detail: `Entity welfare reclassification record ${id || '(unknown)'} has invalid reclassificationState ${String(record.reclassificationState)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Entity welfare reclassification record ${id || '(unknown)'} confidence must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const ref of asStringArray(record.evidenceBundleRefs)) {
    if (!normalizeToken(ref)) {
      pushIssue(issues, {
        code: 'empty_evidence_bundle_ref',
        severity: 'error',
        detail: `Entity welfare reclassification record ${id || '(unknown)'} evidenceBundleRefs contains an empty ref.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const entry of asTransitionHistory(record.transitionHistory)) {
    if (!entry || typeof entry !== 'object') {
      pushIssue(issues, {
        code: 'invalid_transition_history_entry',
        severity: 'error',
        detail: `Entity welfare reclassification record ${id || '(unknown)'} transitionHistory contains invalid entry.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!isReclassificationState(entry.fromState) || !isReclassificationState(entry.toState)) {
      pushIssue(issues, {
        code: 'invalid_transition_history_state',
        severity: 'error',
        detail: `Entity welfare reclassification record ${id || '(unknown)'} transitionHistory contains invalid state.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (!isFiniteWeek(entry.week)) {
      pushIssue(issues, {
        code: 'invalid_transition_history_week',
        severity: 'error',
        detail: `Entity welfare reclassification record ${id || '(unknown)'} transitionHistory contains invalid week.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (entry.reviewGate !== undefined && !isReviewGate(entry.reviewGate)) {
      pushIssue(issues, {
        code: 'invalid_transition_history_entry',
        severity: 'error',
        detail: `Entity welfare reclassification record ${id || '(unknown)'} transitionHistory contains invalid reviewGate.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  scanForbiddenTokens(issues, id, label, record)

  if (TERMINAL_STATES.has(record.reclassificationState) && !hasReviewArtifact(record)) {
    pushIssue(issues, {
      code: 'terminal_state_without_review_artifact',
      severity: 'error',
      detail: `Entity welfare reclassification record ${id || '(unknown)'} in ${record.reclassificationState} requires reviewArtifactRef.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.reclassificationState === 'approved' && !hasNonEmptyEvidenceBundles(record)) {
    pushIssue(issues, {
      code: 'approved_without_evidence_bundles',
      severity: 'error',
      detail: `Entity welfare reclassification record ${id || '(unknown)'} approval requires non-empty evidenceBundleRefs.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.reclassificationState === 'approved' &&
    dispositionSoftensFromHostilePosture(record) &&
    !hasContainmentRevision(record)
  ) {
    pushIssue(issues, {
      code: 'approved_without_containment_revision',
      severity: 'warning',
      detail: `Entity welfare reclassification record ${id || '(unknown)'} approved softening from hostile posture should include containmentRevisionRefs.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (TERMINAL_STATES.has(record.reclassificationState) && !hasReviewGate(record)) {
    pushIssue(issues, {
      code: 'terminal_state_without_review_gate',
      severity: 'warning',
      detail: `Entity welfare reclassification record ${id || '(unknown)'} in ${record.reclassificationState} should declare reviewGate on record or history.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects staff morale, liability, and public-risk pressure from record-derived fields.
 * Does not assert hidden dossier truth or automatic sympathy-based reclassification.
 */
export function projectReclassificationPressure(
  record: EntityWelfareReclassificationRecord,
  policy: ReclassificationPressureProjectionPolicy = {}
): ReclassificationPressureProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)
  const confidence = resolveConfidence(record, policy)

  const moraleRedacted =
    redactedFields.has('staffMoraleForecast') ||
    (policy.redactUnknown === true && unknownFields.includes('staffMoraleForecast'))
  const liabilityRedacted =
    redactedFields.has('liabilityForecast') ||
    (policy.redactUnknown === true && unknownFields.includes('liabilityForecast'))
  const publicRiskRedacted =
    redactedFields.has('publicRiskForecast') ||
    (policy.redactUnknown === true && unknownFields.includes('publicRiskForecast'))

  const staffMoraleForecast = moraleRedacted ? null : resolveStaffMoraleForecast(record)
  const liabilityForecast = liabilityRedacted ? null : resolveLiabilityForecast(record, policy)
  const publicRiskForecast = publicRiskRedacted ? null : resolvePublicRiskForecast(record)

  const welfareDebtLinked = normalizeToken(record.welfareDebtRef ?? '').length > 0
  const redacted =
    moraleRedacted &&
    liabilityRedacted &&
    publicRiskRedacted &&
    (confidence === null || redactedFields.has('confidence'))

  return Object.freeze({
    recordId,
    label: normalizeToken(record.label) || '(unknown)',
    reclassificationState: isReclassificationState(record.reclassificationState)
      ? record.reclassificationState
      : 'pending',
    staffMoraleForecast,
    liabilityForecast,
    publicRiskForecast,
    welfareDebtLinked,
    confidence,
    redacted,
    unknownFields,
  })
}

function defineRecord(record: EntityWelfareReclassificationRecord): EntityWelfareReclassificationRecord {
  return Object.freeze({ ...record })
}

/** Pending → approved with ethics review ref and containment revision. */
export const PENDING_TO_APPROVED_FIXTURE: EntityWelfareReclassificationRecord = defineRecord({
  id: 'reclass:field-observation-custody-shift',
  label: 'Field observation custody shift',
  summary: 'Behavioral evidence supports cooperative custody after hostile initial classification.',
  priorThreatLabel: 'hostile-predator',
  proposedDisposition: 'cooperative',
  welfareDebtRef: 'welfare-debt:coercive-restraint-ledger-12',
  reviewGate: 'ethics',
  reviewArtifactRef: 'review:ethics-board-packet-44',
  reclassificationState: 'approved',
  evidenceBundleRefs: [
    'evidence:behavioral-observation-week-9',
    'evidence:veterinary-vitals-week-10',
  ],
  containmentRevisionRefs: ['revision:reduce-force-containment-tier-2'],
  transitionHistory: [
    {
      fromState: 'pending',
      toState: 'approved',
      week: 11,
      reviewGate: 'ethics',
      reviewArtifactRef: 'review:ethics-board-packet-44',
      note: 'Ethics board approves cooperative custody with revised containment posture.',
    },
  ],
  confidence: 0.67,
})

/** Hostile threat label drift toward cooperative disposition with welfare debt hook. */
export const HOSTILE_TO_COOPERATIVE_FIXTURE: EntityWelfareReclassificationRecord = defineRecord({
  id: 'reclass:apex-threat-behavior-reassessment',
  label: 'Apex threat behavior reassessment',
  summary: 'Repeated non-aggressive contact pattern triggers disposition review and debt accounting hook.',
  priorThreatLabel: 'hostile-apex-threat',
  proposedDisposition: 'cooperative',
  welfareDebtRef: 'welfare-debt:forced-sedation-cycle-3',
  reviewGate: 'psych',
  reviewArtifactRef: 'review:psych-panel-summary-19',
  reclassificationState: 'approved',
  evidenceBundleRefs: ['evidence:contact-log-week-14', 'evidence:stress-marker-trend-week-15'],
  containmentRevisionRefs: ['revision:social-enrichment-pilot'],
  transitionHistory: [
    {
      fromState: 'pending',
      toState: 'approved',
      week: 16,
      reviewGate: 'psych',
      reviewArtifactRef: 'review:psych-panel-summary-19',
      note: 'Psych panel confirms cooperative disposition with accumulated welfare debt noted.',
    },
  ],
  confidence: 0.61,
})
