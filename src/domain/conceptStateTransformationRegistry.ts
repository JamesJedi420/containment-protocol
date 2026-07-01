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
  | 'invalid_scope_rules'
  | 'invalid_scope_rule'
  | 'empty_scope_rule_constraint'
  | 'invalid_collateral_concept_refs'
  | 'invalid_collateral_concept_ref'
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
  if (!Array.isArray(record.scopeRules)) {
    return false
  }

  return record.scopeRules.some(
    (rule) =>
      typeof rule === 'object' &&
      rule !== null &&
      typeof rule.constraint === 'string' &&
      normalizeToken(rule.constraint).length > 0
  )
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

  if (Array.isArray(record.scopeRules)) {
    for (const rule of record.scopeRules) {
      if (typeof rule !== 'object' || rule === null) {
        continue
      }

      const scopeFields: Array<{ field: string; value: string | undefined }> = [
        { field: 'scopeRules.constraint', value: rule.constraint },
        { field: 'scopeRules.boundaryRef', value: rule.boundaryRef },
      ]

      for (const { field, value } of scopeFields) {
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
  }

  for (const ref of asStringArray(record.collateralConceptRefs)) {
    const token = normalizeToken(ref)
    if (!token) {
      continue
    }

    if (containsFranchiseToken(token)) {
      pushIssue(issues, {
        code: 'franchise_token_in_field',
        severity: 'error',
        detail: `Concept-state operator record ${id || '(unknown)'} field collateralConceptRefs contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (containsBrandedObjectNumber(token)) {
      pushIssue(issues, {
        code: 'branded_object_number_in_field',
        severity: 'error',
        detail: `Concept-state operator record ${id || '(unknown)'} field collateralConceptRefs contains a branded object number.`,
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
  _ref: string,
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

  if (record.scopeRules !== undefined && !Array.isArray(record.scopeRules)) {
    pushIssue(issues, {
      code: 'invalid_scope_rules',
      severity: 'error',
      detail: `Concept-state operator record ${id || '(unknown)'} scopeRules must be an array when provided.`,
      relatedIds: id ? [id] : undefined,
    })
  } else if (Array.isArray(record.scopeRules)) {
    for (const entry of record.scopeRules) {
      if (typeof entry !== 'object' || entry === null) {
        pushIssue(issues, {
          code: 'invalid_scope_rule',
          severity: 'error',
          detail: `Concept-state operator record ${id || '(unknown)'} scopeRules contains a non-object entry.`,
          relatedIds: id ? [id] : undefined,
        })
        continue
      }

      if (typeof entry.constraint !== 'string' || !normalizeToken(entry.constraint)) {
        pushIssue(issues, {
          code: 'empty_scope_rule_constraint',
          severity: 'error',
          detail: `Concept-state operator record ${id || '(unknown)'} scopeRules contains an empty constraint.`,
          relatedIds: id ? [id] : undefined,
        })
      }
    }
  }

  if (record.collateralConceptRefs !== undefined && !Array.isArray(record.collateralConceptRefs)) {
    pushIssue(issues, {
      code: 'invalid_collateral_concept_refs',
      severity: 'error',
      detail: `Concept-state operator record ${id || '(unknown)'} collateralConceptRefs must be an array when provided.`,
      relatedIds: id ? [id] : undefined,
    })
  } else {
    for (const ref of record.collateralConceptRefs ?? []) {
      if (typeof ref !== 'string') {
        pushIssue(issues, {
          code: 'invalid_collateral_concept_ref',
          severity: 'error',
          detail: `Concept-state operator record ${id || '(unknown)'} collateralConceptRefs contains a non-string ref.`,
          relatedIds: id ? [id] : undefined,
        })
        continue
      }

      if (!normalizeToken(ref)) {
        pushIssue(issues, {
          code: 'empty_collateral_concept_ref',
          severity: 'error',
          detail: `Concept-state operator record ${id || '(unknown)'} collateralConceptRefs contains an empty ref.`,
          relatedIds: id ? [id] : undefined,
        })
      }
    }
  }

  // bind and collapse operators should have scope rules; warn if absent
  if (
    isConceptStateOperator(record.operator) &&
    (record.operator === 'bind' || record.operator === 'collapse') &&
    !hasNonEmptyScopeRules(record)
  ) {
    pushIssue(issues, {
      code: 'bind_without_scope_rules',
      severity: 'warning',
      detail: `Concept-state operator record ${id || '(unknown)'} with operator ${record.operator} declares no non-empty scopeRules.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  scanForbiddenTokens(issues, id, label, record)

  return freezeValidationResult(issues)
}

/**
 * Project affected concept refs with symptom descriptors and role hints.
 * Deterministic mapping: operator + state transition → collateral symptoms.
 * Does not assert objective truth or omniscient classification.
 */
export function projectConceptCollateral(
  record: ConceptStateOperatorRecord,
  policy: ConceptCollateralProjectionPolicy = {}
): ConceptCollateralProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const label = normalizeToken(record.label) || '(unknown)'
  const fromState = normalizeToken(record.fromState) || 'unknown_state'
  const toState = normalizeToken(record.toState) || 'unknown_state'
  const stateTransition = `${fromState} → ${toState}`

  const confidence = resolveConfidence(record, policy)
  const detectionDifficulty = resolveDetectionDifficulty(record, policy)
  const redacted =
    (confidence === null && record.confidence !== undefined) ||
    (detectionDifficulty === null && record.detectionDifficulty !== undefined)
  const unknownFields = sortedStringArray(record.unknownFields)

  return Object.freeze({
    recordId,
    label,
    targetKind: isConceptStateTargetKind(record.targetKind)
      ? record.targetKind
      : 'concept',
    operator: isConceptStateOperator(record.operator) ? record.operator : 'relocate',
    fromState,
    toState,
    affectedEntries: buildAffectedEntries(record, policy),
    detectionDifficulty,
    confidence,
    redacted,
    unknownFields,
  })
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function defineRecord(record: ConceptStateOperatorRecord): ConceptStateOperatorRecord {
  return Object.freeze({ ...record })
}

/** Concept relocate with collateralConceptRefs. */
export const CONCEPT_RELOCATE_COLLATERAL_FIXTURE: ConceptStateOperatorRecord = defineRecord({
  id: 'op:concept-inside-outside-flip',
  label: 'Inside-outside distinction collapse',
  summary: 'Anomaly relocates objective inside-outside boundary for named concept.',
  targetKind: 'concept',
  operator: 'relocate',
  fromState: 'inside_perimeter',
  toState: 'outside_perimeter',
  collateralConceptRefs: ['concept:perimeter', 'concept:jurisdiction'],
  detectionDifficulty: 0.6,
  confidence: 0.71,
})

/** Category bind with scopeRules. */
export const CATEGORY_BIND_SCOPE_FIXTURE: ConceptStateOperatorRecord = defineRecord({
  id: 'op:category-membership-bind',
  label: 'Membership binding under pressure',
  summary: 'Anomaly forces category membership bond on normally voluntary affiliations.',
  targetKind: 'category',
  operator: 'bind',
  fromState: 'voluntary_association',
  toState: 'compulsory_membership',
  scopeRules: [
    { constraint: 'within_site_perimeter', boundaryRef: 'spatial_boundary' },
    { constraint: 'active_anomaly_field', boundaryRef: 'effect_radius' },
  ],
  collateralConceptRefs: ['concept:agency_affiliation', 'concept:staff_loyalty'],
  detectionDifficulty: 0.45,
  confidence: 0.58,
})

/** Relation invert with minimal collateral refs (no scopeRules required). */
export const RELATION_INVERT_FIXTURE: ConceptStateOperatorRecord = defineRecord({
  id: 'op:relation-invert-temporal',
  label: 'Temporal causality inversion',
  summary: 'Effect and cause reversed for specific event pairs.',
  targetKind: 'relation',
  operator: 'invert',
  fromState: 'cause_before_effect',
  toState: 'effect_precedes_cause',
  collateralConceptRefs: ['concept:timeline', 'concept:causality_chain'],
  confidence: 0.39,
})

/** Object collapse with minimal data. */
export const OBJECT_COLLAPSE_FIXTURE: ConceptStateOperatorRecord = defineRecord({
  id: 'op:object-state-boundary-collapse',
  label: 'Object state distinction loss',
  targetKind: 'object',
  operator: 'collapse',
  fromState: 'distinct_states',
  toState: 'superposition_indistinguishable',
})


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

  const difficultyRedacted =
    redactedFields.has('detectionDifficulty') ||
    (policy.redactUnknown === true && unknownFields.includes('detectionDifficulty'))

  const redacted =
    collateralRedacted ||
    redactedFields.has('confidence') ||
    difficultyRedacted ||
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
