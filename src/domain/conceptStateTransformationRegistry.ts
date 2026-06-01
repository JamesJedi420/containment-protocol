/**
 * SPE-2118 slice 1: concept-state transformation registry.
 *
 * Pure deterministic registry for anomalies that operate on abstract
 * relationships (inside/outside, membership, category) — distinct from
 * unified cognitive hazard engine wire-up (SPE-1309).
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type ConceptStateOperatorId = string

export type ConceptStateTargetKind = 'object' | 'concept' | 'relation' | 'category'

export const CONCEPT_STATE_TARGET_KINDS: readonly ConceptStateTargetKind[] = [
  'object',
  'concept',
  'relation',
  'category',
] as const

export type ConceptStateOperator = 'relocate' | 'invert' | 'collapse' | 'bind'

export const CONCEPT_STATE_OPERATORS: readonly ConceptStateOperator[] = [
  'relocate',
  'invert',
  'collapse',
  'bind',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface ConceptScopeRule {
  readonly constraint: string
  readonly boundaryRef?: string
}

export interface ConceptStateOperatorRecord {
  readonly id: ConceptStateOperatorId
  readonly label: string
  readonly summary?: string
  readonly targetKind: ConceptStateTargetKind
  readonly operator: ConceptStateOperator
  readonly fromState: string
  readonly toState: string
  readonly scopeRules?: readonly ConceptScopeRule[]
  readonly collateralConceptRefs?: readonly string[]
  readonly detectionDifficulty?: number
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ConceptStateOperatorValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_from_state'
  | 'missing_to_state'
  | 'invalid_target_kind'
  | 'invalid_operator'
  | 'invalid_detection_difficulty'
  | 'invalid_confidence'
  | 'empty_scope_rule_constraint'
  | 'empty_collateral_concept_ref'
  | 'bind_without_scope_rules'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface ConceptStateOperatorValidationIssue {
  readonly code: ConceptStateOperatorValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface ConceptStateOperatorValidationResult {
  readonly valid: boolean
  readonly issues: readonly ConceptStateOperatorValidationIssue[]
}

// ---------------------------------------------------------------------------
// Collateral projection
// ---------------------------------------------------------------------------

export interface ConceptCollateralProjectionPolicy {
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
  readonly suppressHiddenConflictLabels?: boolean
}

export interface ConceptCollateralEntry {
  readonly ref: string
  readonly symptomDescriptor: string
  readonly roleHint: string | null
}

export interface ConceptCollateralProjection {
  readonly recordId: ConceptStateOperatorId
  readonly label: string
  readonly targetKind: ConceptStateTargetKind
  readonly operator: ConceptStateOperator
  readonly fromState: string
  readonly toState: string
  readonly affectedEntries: readonly ConceptCollateralEntry[]
  readonly detectionDifficulty: number | null
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const CONCEPT_STATE_TARGET_KIND_SET = new Set<string>(CONCEPT_STATE_TARGET_KINDS)
const CONCEPT_STATE_OPERATOR_SET = new Set<string>(CONCEPT_STATE_OPERATORS)

export const FRANCHISE_TOKEN_PATTERN =
  /\b(scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|goi-|group of interest|broken masquerade|masquerade breach|wiki\.|wikidot)\b/i

export const BRANDED_OBJECT_NUMBER_PATTERN = /\bSCP[\s-]?\d{3,4}\b/i

const OPERATOR_SYMPTOM_PREFIX: Readonly<Record<ConceptStateOperator, string>> = {
  relocate: 'Boundary drift reported for',
  invert: 'Inverted membership signal for',
  collapse: 'Collapsed category overlap for',
  bind: 'Binding constraint ripple for',
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

function asScopeRules(value: unknown): readonly ConceptScopeRule[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (entry): entry is ConceptScopeRule =>
      typeof entry === 'object' &&
      entry !== null &&
      'constraint' in entry &&
      typeof (entry as ConceptScopeRule).constraint === 'string'
  )
}

function pushIssue(
  issues: ConceptStateOperatorValidationIssue[],
  issue: ConceptStateOperatorValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: ConceptStateOperatorValidationIssue[]) {
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

function freezeValidationResult(
  issues: ConceptStateOperatorValidationIssue[]
): ConceptStateOperatorValidationResult {
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

function hasNonEmptyScopeRules(record: ConceptStateOperatorRecord): boolean {
  return asScopeRules(record.scopeRules).some((rule) => normalizeToken(rule.constraint).length > 0)
}

function scanForbiddenTokens(
  issues: ConceptStateOperatorValidationIssue[],
  id: string,
  label: string,
  record: ConceptStateOperatorRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Concept-state operator record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Concept-state operator record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Concept-state operator record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Concept-state operator record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const stringFields: Array<{ field: string; value: string | undefined }> = [
    { field: 'summary', value: record.summary },
    { field: 'fromState', value: record.fromState },
    { field: 'toState', value: record.toState },
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
        detail: `Concept-state operator record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (containsBrandedObjectNumber(token)) {
      pushIssue(issues, {
        code: 'branded_object_number_in_field',
        severity: 'error',
        detail: `Concept-state operator record ${id || '(unknown)'} field ${field} contains a branded object number.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }
}

function resolveConfidence(
  record: ConceptStateOperatorRecord,
  policy: ConceptCollateralProjectionPolicy
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

function resolveDetectionDifficulty(
  record: ConceptStateOperatorRecord,
  policy: ConceptCollateralProjectionPolicy
): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (redactedFields.has('detectionDifficulty')) {
    return null
  }

  const difficulty = record.detectionDifficulty ?? null
  if (policy.redactUnknown === true && unknownFields.includes('detectionDifficulty')) {
    return null
  }

  return difficulty
}

function resolveRoleHint(
  record: ConceptStateOperatorRecord,
  ref: string,
  policy: ConceptCollateralProjectionPolicy
): string | null {
  if (policy.suppressHiddenConflictLabels === true) {
    return null
  }

  const targetKind = isConceptStateTargetKind(record.targetKind) ? record.targetKind : 'concept'
  return `${targetKind}_collateral`
}

function buildSymptomDescriptor(
  record: ConceptStateOperatorRecord,
  ref: string
): string {
  const operator = isConceptStateOperator(record.operator) ? record.operator : 'relocate'
  const fromState = normalizeToken(record.fromState) || 'unknown_state'
  const toState = normalizeToken(record.toState) || 'unknown_state'
  const refToken = normalizeToken(ref) || 'unknown_ref'

  return `${OPERATOR_SYMPTOM_PREFIX[operator]} ${refToken} (${fromState} -> ${toState})`
}

function buildAffectedEntries(
  record: ConceptStateOperatorRecord,
  policy: ConceptCollateralProjectionPolicy
): readonly ConceptCollateralEntry[] {
  const refs = asStringArray(record.collateralConceptRefs)
    .map((ref) => normalizeToken(ref))
    .filter((ref) => ref.length > 0)
    .sort((left, right) => left.localeCompare(right))

  return Object.freeze(
    refs.map((ref) =>
      Object.freeze({
        ref,
        symptomDescriptor: buildSymptomDescriptor(record, ref),
        roleHint: resolveRoleHint(record, ref, policy),
      })
    )
  )
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isConceptStateTargetKind(value: unknown): value is ConceptStateTargetKind {
  return typeof value === 'string' && CONCEPT_STATE_TARGET_KIND_SET.has(value)
}

export function isConceptStateOperator(value: unknown): value is ConceptStateOperator {
  return typeof value === 'string' && CONCEPT_STATE_OPERATOR_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateConceptStateOperatorRecord(
  record: ConceptStateOperatorRecord
): ConceptStateOperatorValidationResult {
  const issues: ConceptStateOperatorValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const fromState = normalizeToken(record.fromState)
  const toState = normalizeToken(record.toState)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Concept-state operator record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Concept-state operator record is missing label.',
    })
  }

  if (!fromState) {
    pushIssue(issues, {
      code: 'missing_from_state',
      severity: 'error',
      detail: 'Concept-state operator record is missing fromState.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!toState) {
    pushIssue(issues, {
      code: 'missing_to_state',
      severity: 'error',
      detail: 'Concept-state operator record is missing toState.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isConceptStateTargetKind(record.targetKind)) {
    pushIssue(issues, {
      code: 'invalid_target_kind',
      severity: 'error',
      detail: `Concept-state operator record ${id || '(unknown)'} has invalid targetKind ${String(record.targetKind)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isConceptStateOperator(record.operator)) {
    pushIssue(issues, {
      code: 'invalid_operator',
      severity: 'error',
      detail: `Concept-state operator record ${id || '(unknown)'} has invalid operator ${String(record.operator)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.detectionDifficulty !== undefined && !isValidUnitScore(record.detectionDifficulty)) {
    pushIssue(issues, {
      code: 'invalid_detection_difficulty',
      severity: 'error',
      detail: `Concept-state operator record ${id || '(unknown)'} detectionDifficulty must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Concept-state operator record ${id || '(unknown)'} confidence must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const rule of asScopeRules(record.scopeRules)) {
    if (!normalizeToken(rule.constraint)) {
      pushIssue(issues, {
        code: 'empty_scope_rule_constraint',
        severity: 'error',
        detail: `Concept-state operator record ${id || '(unknown)'} scopeRules contains an empty constraint.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const ref of asStringArray(record.collateralConceptRefs)) {
    if (!normalizeToken(ref)) {
      pushIssue(issues, {
        code: 'empty_collateral_concept_ref',
        severity: 'error',
        detail: `Concept-state operator record ${id || '(unknown)'} collateralConceptRefs contains an empty ref.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  scanForbiddenTokens(issues, id, label, record)

  if (record.operator === 'bind' && !hasNonEmptyScopeRules(record)) {
    pushIssue(issues, {
      code: 'bind_without_scope_rules',
      severity: 'warning',
      detail: `Concept-state operator record ${id || '(unknown)'} uses bind without scopeRules.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects symptom-first collateral entries for related concept refs.
 * Does not emit omniscient hidden-conflict labels.
 */
export function projectConceptCollateral(
  record: ConceptStateOperatorRecord,
  policy: ConceptCollateralProjectionPolicy = {}
): ConceptCollateralProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)
  const confidence = resolveConfidence(record, policy)
  const detectionDifficulty = resolveDetectionDifficulty(record, policy)

  const collateralRedacted =
    redactedFields.has('collateralConceptRefs') ||
    (policy.redactUnknown === true && unknownFields.includes('collateralConceptRefs'))

  const affectedEntries = collateralRedacted ? Object.freeze([]) : buildAffectedEntries(record, policy)

  const redacted =
    collateralRedacted ||
    redactedFields.has('confidence') ||
    (policy.redactUnknown === true && unknownFields.includes('confidence')) ||
    (confidence === null && record.confidence !== undefined && policy.minimumConfidence !== undefined)

  return Object.freeze({
    recordId,
    label: normalizeToken(record.label) || '(unknown)',
    targetKind: isConceptStateTargetKind(record.targetKind) ? record.targetKind : 'concept',
    operator: isConceptStateOperator(record.operator) ? record.operator : 'relocate',
    fromState: normalizeToken(record.fromState) || '(unknown)',
    toState: normalizeToken(record.toState) || '(unknown)',
    affectedEntries,
    detectionDifficulty,
    confidence,
    redacted,
    unknownFields,
  })
}

function defineRecord(record: ConceptStateOperatorRecord): ConceptStateOperatorRecord {
  return Object.freeze({ ...record })
}

/** Concept relocate operator with collateral concept refs. */
export const CONCEPT_RELOCATE_COLLATERAL_FIXTURE: ConceptStateOperatorRecord = defineRecord({
  id: 'concept-operator:inside-outside-relocate',
  label: 'Inside-outside concept relocate',
  summary: 'Relational inside/outside membership shifts with collateral category drift.',
  targetKind: 'concept',
  operator: 'relocate',
  fromState: 'inside_perimeter',
  toState: 'outside_perimeter',
  collateralConceptRefs: ['concept:membership-queue-a', 'concept:boundary-marker-7'],
  detectionDifficulty: 0.62,
  confidence: 0.71,
})

/** Category bind operator with explicit scope rules. */
export const CATEGORY_BIND_SCOPE_FIXTURE: ConceptStateOperatorRecord = defineRecord({
  id: 'concept-operator:personnel-category-bind',
  label: 'Personnel category bind operator',
  summary: 'Binds personnel category membership under bounded scope rules.',
  targetKind: 'category',
  operator: 'bind',
  fromState: 'unassigned_pool',
  toState: 'restricted_pool',
  scopeRules: [
    { constraint: 'only_when_badge_reader_conflict', boundaryRef: 'boundary:annex-c-reader' },
    { constraint: 'exclude_visitor_pass_holders' },
  ],
  collateralConceptRefs: ['concept:visitor-clearance-tier'],
  detectionDifficulty: 0.48,
  confidence: 0.83,
})
