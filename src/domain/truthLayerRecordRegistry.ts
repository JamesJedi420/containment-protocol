/**
 * SPE-1343 slice 1: truth-layer record registry.
 *
 * Pure deterministic registry for simultaneous claim, doctrine, and verification
 * layers per actor, site, or event — distinct from public disclosure progression
 * (SPE-2109) and without extending PublicDisclosureRecord.
 */

import type { AuthoritySourceConfidence } from './authorityGraph'
import type { KnowledgeTier } from './knowledge'

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type TruthLayerRecordId = string

export type TruthLayerSubjectKind = 'actor' | 'site' | 'event'

export const TRUTH_LAYER_SUBJECT_KINDS: readonly TruthLayerSubjectKind[] = [
  'actor',
  'site',
  'event',
] as const

export type CompetingLayerRole =
  | 'claim'
  | 'doctrine'
  | 'verification'
  | 'cover_narrative'
  | 'public_myth'
  | 'operational_record'

export const COMPETING_LAYER_ROLES: readonly CompetingLayerRole[] = [
  'claim',
  'doctrine',
  'verification',
  'cover_narrative',
  'public_myth',
  'operational_record',
] as const

// Re-export for slice 2+ wire-up to authority graph and knowledge state.
export type TruthLayerSourceConfidence = AuthoritySourceConfidence
export type TruthLayerKnowledgeTier = KnowledgeTier

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface TruthLayerSlot {
  readonly narrative: string
  readonly summary?: string
  readonly sourceConfidence?: TruthLayerSourceConfidence
  readonly knowledgeTier?: TruthLayerKnowledgeTier
  readonly lastUpdatedWeek?: number
  readonly evidenceRef?: string
}

export interface CompetingTruthLayerRef {
  readonly recordRef: string
  readonly layerRole: CompetingLayerRole
  readonly note?: string
}

export interface TruthLayerRecord {
  readonly id: TruthLayerRecordId
  readonly label: string
  readonly summary?: string
  readonly subjectRef: string
  readonly subjectKind: TruthLayerSubjectKind
  readonly parentCaseRef?: string
  readonly claim: TruthLayerSlot
  readonly doctrine: TruthLayerSlot
  readonly verification: TruthLayerSlot
  readonly competingLayers?: readonly CompetingTruthLayerRef[]
  readonly correctionPressure?: number
  readonly mythInfrastructureWeight?: number
  readonly linkedDisclosureRef?: string
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type TruthLayerValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_subject_ref'
  | 'invalid_subject_kind'
  | 'empty_claim_narrative'
  | 'empty_doctrine_narrative'
  | 'empty_verification_narrative'
  | 'invalid_source_confidence'
  | 'invalid_knowledge_tier'
  | 'invalid_last_updated_week'
  | 'invalid_correction_pressure'
  | 'invalid_myth_infrastructure_weight'
  | 'invalid_confidence'
  | 'invalid_competing_layer_role'
  | 'empty_competing_record_ref'
  | 'verified_without_evidence_ref'
  | 'collapsed_claim_and_verification'
  | 'myth_weight_with_verified_mechanism'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'

export interface TruthLayerValidationIssue {
  readonly code: TruthLayerValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface TruthLayerValidationResult {
  readonly valid: boolean
  readonly issues: readonly TruthLayerValidationIssue[]
}

// ---------------------------------------------------------------------------
// Review projection
// ---------------------------------------------------------------------------

export interface TruthLayerReviewProjectionPolicy {
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
  readonly mythInfrastructureThreshold?: number
}

export interface TruthLayerSlotProjection {
  readonly narrative: string | null
  readonly summary: string | null
  readonly sourceConfidence: TruthLayerSourceConfidence | null
  readonly knowledgeTier: TruthLayerKnowledgeTier | null
  readonly redacted: boolean
}

export interface TruthLayerReviewProjection {
  readonly recordId: TruthLayerRecordId
  readonly label: string
  readonly summary: string | null
  readonly subjectRef: string
  readonly subjectKind: TruthLayerSubjectKind
  readonly claim: TruthLayerSlotProjection
  readonly doctrine: TruthLayerSlotProjection
  readonly verification: TruthLayerSlotProjection
  readonly layerDivergence: boolean
  readonly competingLayerCount: number
  readonly correctionPressure: number | null
  readonly mythInfrastructureActive: boolean
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

/** SPE-1343 slice 3: ops-facing projection — myth infrastructure and correction pressure without collapsing layers. */
export interface TruthLayerOpsProjection {
  readonly recordId: TruthLayerRecordId
  readonly subjectRef: string
  readonly subjectKind: TruthLayerSubjectKind
  readonly mythInfrastructureActive: boolean
  readonly correctionPressure: number | null
  readonly layerDivergence: boolean
  readonly mythDrivesOpsWithoutVerification: boolean
  readonly claimSourceConfidence: TruthLayerSourceConfidence | null
  readonly verificationSourceConfidence: TruthLayerSourceConfidence | null
  readonly redacted: boolean
}

/** SPE-1343 slice 3: persisted weekly ops projection snapshot for one truth-layer record. */
export interface TruthLayerWeeklyProjectionSnapshot {
  readonly recordId: TruthLayerRecordId
  readonly week: number
  readonly ops: TruthLayerOpsProjection
}

export type TruthLayerWeeklyProjectionSnapshotsMap = Record<
  TruthLayerRecordId,
  TruthLayerWeeklyProjectionSnapshot
>

/** Upper bound on persisted weekly projection snapshot entries (byte-stable record-id keys). */
export const MAX_TRUTH_LAYER_WEEKLY_PROJECTION_SNAPSHOTS = 128

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const SUBJECT_KIND_SET = new Set<string>(TRUTH_LAYER_SUBJECT_KINDS)
const COMPETING_LAYER_ROLE_SET = new Set<string>(COMPETING_LAYER_ROLES)

const SOURCE_CONFIDENCE_SET = new Set<string>([
  'verified',
  'probable',
  'rumor',
  'hostile_dossier',
  'public_cover',
  'redacted',
  'contradicted',
  'unknown',
])

const KNOWLEDGE_TIER_SET = new Set<string>([
  'unknown',
  'partial',
  'relayed',
  'pending-relay',
  'suspected',
  'observed',
  'confirmed',
  'operationalized',
  'institutionalized',
])

export const FRANCHISE_TOKEN_PATTERN =
  /\b(scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|goi-|group of interest|broken masquerade|masquerade breach)\b/i

const DEFAULT_MYTH_INFRASTRUCTURE_THRESHOLD = 0.35

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

function asCompetingLayers(value: unknown): readonly CompetingTruthLayerRef[] {
  return Array.isArray(value) ? value : []
}

function pushIssue(issues: TruthLayerValidationIssue[], issue: TruthLayerValidationIssue) {
  issues.push(issue)
}

function sortValidationIssues(issues: TruthLayerValidationIssue[]) {
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

function freezeValidationResult(issues: TruthLayerValidationIssue[]): TruthLayerValidationResult {
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

function isSourceConfidence(value: string): value is TruthLayerSourceConfidence {
  return SOURCE_CONFIDENCE_SET.has(value)
}

function isKnowledgeTier(value: string): value is TruthLayerKnowledgeTier {
  return KNOWLEDGE_TIER_SET.has(value)
}

function isSubjectKind(value: string): value is TruthLayerSubjectKind {
  return SUBJECT_KIND_SET.has(value)
}

function isCompetingLayerRoleValue(value: string): value is CompetingLayerRole {
  return COMPETING_LAYER_ROLE_SET.has(value)
}

function scanFranchiseTokens(
  issues: TruthLayerValidationIssue[],
  id: string,
  label: string,
  record: TruthLayerRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Truth-layer record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Truth-layer record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const stringFields: Array<{ field: string; value: string | undefined }> = [
    { field: 'summary', value: record.summary },
    { field: 'subjectRef', value: record.subjectRef },
    { field: 'parentCaseRef', value: record.parentCaseRef },
    { field: 'linkedDisclosureRef', value: record.linkedDisclosureRef },
  ]

  for (const { field, value } of stringFields) {
    const token = normalizeToken(value ?? '')
    if (token && containsFranchiseToken(token)) {
      pushIssue(issues, {
        code: 'franchise_token_in_field',
        severity: 'error',
        detail: `Truth-layer record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const slotName of ['claim', 'doctrine', 'verification'] as const) {
    const slot = record[slotName]
    if (!slot || typeof slot !== 'object') {
      continue
    }

    for (const token of [slot.narrative, slot.summary, slot.evidenceRef]) {
      const normalized = normalizeToken(token ?? '')
      if (normalized && containsFranchiseToken(normalized)) {
        pushIssue(issues, {
          code: 'franchise_token_in_field',
          severity: 'error',
          detail: `Truth-layer record ${id || '(unknown)'} ${slotName} contains a franchise or source-literal token.`,
          relatedIds: id ? [id] : undefined,
        })
      }
    }
  }

  for (const entry of asCompetingLayers(record.competingLayers)) {
    if (!entry || typeof entry !== 'object') {
      continue
    }

    for (const token of [entry.recordRef, entry.note]) {
      const normalized = normalizeToken(token ?? '')
      if (normalized && containsFranchiseToken(normalized)) {
        pushIssue(issues, {
          code: 'franchise_token_in_field',
          severity: 'error',
          detail: `Truth-layer record ${id || '(unknown)'} competingLayers contains a franchise or source-literal token.`,
          relatedIds: id ? [id] : undefined,
        })
      }
    }
  }
}

function validateTruthLayerSlot(
  issues: TruthLayerValidationIssue[],
  id: string,
  slotName: 'claim' | 'doctrine' | 'verification',
  slot: TruthLayerSlot | undefined,
  emptyCode: TruthLayerValidationCode
) {
  if (!slot || typeof slot !== 'object') {
    pushIssue(issues, {
      code: emptyCode,
      severity: 'error',
      detail: `Truth-layer record ${id || '(unknown)'} requires ${slotName}.narrative.`,
      relatedIds: id ? [id] : undefined,
    })
    return
  }

  if (!normalizeToken(slot.narrative)) {
    pushIssue(issues, {
      code: emptyCode,
      severity: 'error',
      detail: `Truth-layer record ${id || '(unknown)'} requires ${slotName}.narrative.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    slot.sourceConfidence !== undefined &&
    !isSourceConfidence(slot.sourceConfidence)
  ) {
    pushIssue(issues, {
      code: 'invalid_source_confidence',
      severity: 'error',
      detail: `Truth-layer record ${id || '(unknown)'} ${slotName} has invalid sourceConfidence ${String(slot.sourceConfidence)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (slot.knowledgeTier !== undefined && !isKnowledgeTier(slot.knowledgeTier)) {
    pushIssue(issues, {
      code: 'invalid_knowledge_tier',
      severity: 'error',
      detail: `Truth-layer record ${id || '(unknown)'} ${slotName} has invalid knowledgeTier ${String(slot.knowledgeTier)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (slot.lastUpdatedWeek !== undefined && !isFiniteWeek(slot.lastUpdatedWeek)) {
    pushIssue(issues, {
      code: 'invalid_last_updated_week',
      severity: 'error',
      detail: `Truth-layer record ${id || '(unknown)'} ${slotName} lastUpdatedWeek is invalid.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    slotName === 'verification' &&
    slot.sourceConfidence === 'verified' &&
    !normalizeToken(slot.evidenceRef ?? '')
  ) {
    pushIssue(issues, {
      code: 'verified_without_evidence_ref',
      severity: 'warning',
      detail: `Truth-layer record ${id || '(unknown)'} verification marked verified without evidenceRef.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function resolveSlotProjection(
  slot: TruthLayerSlot,
  slotKey: 'claim' | 'doctrine' | 'verification',
  record: TruthLayerRecord,
  policy: TruthLayerReviewProjectionPolicy
): TruthLayerSlotProjection {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)
  const narrativeRedacted =
    redactedFields.has(slotKey) ||
    redactedFields.has(`${slotKey}.narrative`) ||
    (policy.redactUnknown === true && unknownFields.includes(`${slotKey}.narrative`))

  const summaryRedacted =
    redactedFields.has(`${slotKey}.summary`) ||
    (policy.redactUnknown === true && unknownFields.includes(`${slotKey}.summary`))

  const confidenceRedacted =
    redactedFields.has(`${slotKey}.sourceConfidence`) ||
    (policy.redactUnknown === true && unknownFields.includes(`${slotKey}.sourceConfidence`))

  const tierRedacted =
    redactedFields.has(`${slotKey}.knowledgeTier`) ||
    (policy.redactUnknown === true && unknownFields.includes(`${slotKey}.knowledgeTier`))

  return Object.freeze({
    narrative: narrativeRedacted ? null : normalizeToken(slot.narrative) || null,
    summary: summaryRedacted ? null : normalizeToken(slot.summary ?? '') || null,
    sourceConfidence:
      confidenceRedacted || slot.sourceConfidence === undefined
        ? null
        : slot.sourceConfidence,
    knowledgeTier:
      tierRedacted || slot.knowledgeTier === undefined ? null : slot.knowledgeTier,
    redacted: narrativeRedacted || summaryRedacted || confidenceRedacted || tierRedacted,
  })
}

function resolveConfidence(
  record: TruthLayerRecord,
  policy: TruthLayerReviewProjectionPolicy
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

function narrativesDiverge(record: TruthLayerRecord): boolean {
  const claim = normalizeToken(record.claim?.narrative ?? '')
  const doctrine = normalizeToken(record.doctrine?.narrative ?? '')
  const verification = normalizeToken(record.verification?.narrative ?? '')

  if (!claim || !doctrine || !verification) {
    return false
  }

  return claim !== doctrine || doctrine !== verification || claim !== verification
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isTruthLayerSubjectKind(value: string): value is TruthLayerSubjectKind {
  return isSubjectKind(value)
}

export function isCompetingLayerRole(value: string): value is CompetingLayerRole {
  return COMPETING_LAYER_ROLE_SET.has(value)
}

export function isTruthLayerSourceConfidence(value: string): value is TruthLayerSourceConfidence {
  return isSourceConfidence(value)
}

export function isTruthLayerKnowledgeTier(value: string): value is TruthLayerKnowledgeTier {
  return isKnowledgeTier(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateTruthLayerRecord(record: TruthLayerRecord): TruthLayerValidationResult {
  const issues: TruthLayerValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const subjectRef = normalizeToken(record.subjectRef)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Truth-layer record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Truth-layer record is missing label.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!subjectRef) {
    pushIssue(issues, {
      code: 'missing_subject_ref',
      severity: 'error',
      detail: 'Truth-layer record is missing subjectRef.',
      relatedIds: id ? [id] : undefined,
    })
  }

  scanFranchiseTokens(issues, id, label, record)

  if (!isSubjectKind(record.subjectKind)) {
    pushIssue(issues, {
      code: 'invalid_subject_kind',
      severity: 'error',
      detail: `Truth-layer record ${id || '(unknown)'} has invalid subjectKind ${String(record.subjectKind)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  validateTruthLayerSlot(issues, id, 'claim', record.claim, 'empty_claim_narrative')
  validateTruthLayerSlot(issues, id, 'doctrine', record.doctrine, 'empty_doctrine_narrative')
  validateTruthLayerSlot(
    issues,
    id,
    'verification',
    record.verification,
    'empty_verification_narrative'
  )

  if (record.correctionPressure !== undefined && !isValidUnitScore(record.correctionPressure)) {
    pushIssue(issues, {
      code: 'invalid_correction_pressure',
      severity: 'error',
      detail: `Truth-layer record ${id || '(unknown)'} correctionPressure must be a finite number between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.mythInfrastructureWeight !== undefined &&
    !isValidUnitScore(record.mythInfrastructureWeight)
  ) {
    pushIssue(issues, {
      code: 'invalid_myth_infrastructure_weight',
      severity: 'error',
      detail: `Truth-layer record ${id || '(unknown)'} mythInfrastructureWeight must be a finite number between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Truth-layer record ${id || '(unknown)'} confidence must be a finite number between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const entry of asCompetingLayers(record.competingLayers)) {
    if (!entry || typeof entry !== 'object') {
      pushIssue(issues, {
        code: 'empty_competing_record_ref',
        severity: 'error',
        detail: `Truth-layer record ${id || '(unknown)'} competingLayers contains invalid entry.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!normalizeToken(entry.recordRef)) {
      pushIssue(issues, {
        code: 'empty_competing_record_ref',
        severity: 'error',
        detail: `Truth-layer record ${id || '(unknown)'} competingLayers requires recordRef.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (!isCompetingLayerRoleValue(entry.layerRole)) {
      pushIssue(issues, {
        code: 'invalid_competing_layer_role',
        severity: 'error',
        detail: `Truth-layer record ${id || '(unknown)'} has invalid competing layer role ${String(entry.layerRole)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  const claimNarrative = normalizeToken(record.claim?.narrative ?? '')
  const verificationNarrative = normalizeToken(record.verification?.narrative ?? '')
  if (claimNarrative && verificationNarrative && claimNarrative === verificationNarrative) {
    pushIssue(issues, {
      code: 'collapsed_claim_and_verification',
      severity: 'warning',
      detail: `Truth-layer record ${id || '(unknown)'} claim and verification narratives are identical.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const mythWeight = record.mythInfrastructureWeight ?? 0
  const verificationConfidence = record.verification?.sourceConfidence
  if (
    mythWeight > 0 &&
    verificationConfidence === 'verified' &&
    claimNarrative &&
    verificationNarrative &&
    claimNarrative === verificationNarrative
  ) {
    pushIssue(issues, {
      code: 'myth_weight_with_verified_mechanism',
      severity: 'warning',
      detail: `Truth-layer record ${id || '(unknown)'} mythInfrastructureWeight is set while public claim is treated as verified mechanism.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects separate claim, doctrine, and verification review surfaces.
 * Does not collapse layers into a single objective truth.
 */
export function projectTruthLayerReviewView(
  record: TruthLayerRecord,
  policy: TruthLayerReviewProjectionPolicy = {}
): TruthLayerReviewProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)
  const mythThreshold = policy.mythInfrastructureThreshold ?? DEFAULT_MYTH_INFRASTRUCTURE_THRESHOLD

  const summaryRedacted = redactedFields.has('summary')
  const summary = summaryRedacted ? null : normalizeToken(record.summary ?? '') || null

  const claim = resolveSlotProjection(record.claim, 'claim', record, policy)
  const doctrine = resolveSlotProjection(record.doctrine, 'doctrine', record, policy)
  const verification = resolveSlotProjection(record.verification, 'verification', record, policy)

  const correctionRedacted =
    redactedFields.has('correctionPressure') ||
    (policy.redactUnknown === true && unknownFields.includes('correctionPressure'))

  const correctionPressure =
    correctionRedacted || record.correctionPressure === undefined
      ? null
      : record.correctionPressure

  const mythWeight = record.mythInfrastructureWeight ?? 0
  const mythInfrastructureActive = mythWeight >= mythThreshold

  const confidence = resolveConfidence(record, policy)
  const redacted =
    summaryRedacted ||
    claim.redacted ||
    doctrine.redacted ||
    verification.redacted ||
    correctionRedacted ||
    redactedFields.has('confidence') ||
    (confidence === null &&
      record.confidence !== undefined &&
      policy.minimumConfidence !== undefined)

  return Object.freeze({
    recordId,
    label: normalizeToken(record.label) || '(unknown)',
    summary,
    subjectRef: normalizeToken(record.subjectRef) || '(unknown)',
    subjectKind: isSubjectKind(record.subjectKind) ? record.subjectKind : 'event',
    claim,
    doctrine,
    verification,
    layerDivergence: narrativesDiverge(record),
    competingLayerCount: asCompetingLayers(record.competingLayers).filter(
      (entry) => entry && typeof entry === 'object' && normalizeToken(entry.recordRef)
    ).length,
    correctionPressure,
    mythInfrastructureActive,
    confidence,
    redacted,
    unknownFields,
  })
}

/**
 * Projects myth-as-infrastructure ops signals from separate truth layers.
 * Public myth may drive ops without treating the claim as a verified mechanism.
 */
export function projectTruthLayerOpsView(
  record: TruthLayerRecord,
  policy: TruthLayerReviewProjectionPolicy = {}
): TruthLayerOpsProjection {
  const review = projectTruthLayerReviewView(record, policy)
  const verificationConfidence = review.verification.sourceConfidence
  const mythDrivesOpsWithoutVerification =
    review.mythInfrastructureActive &&
    (review.layerDivergence || verificationConfidence !== 'verified')

  return Object.freeze({
    recordId: review.recordId,
    subjectRef: review.subjectRef,
    subjectKind: review.subjectKind,
    mythInfrastructureActive: review.mythInfrastructureActive,
    correctionPressure: review.correctionPressure,
    layerDivergence: review.layerDivergence,
    mythDrivesOpsWithoutVerification,
    claimSourceConfidence: review.claim.sourceConfidence,
    verificationSourceConfidence: verificationConfidence,
    redacted: review.redacted,
  })
}

function defineRecord(record: TruthLayerRecord): TruthLayerRecord {
  return Object.freeze({ ...record })
}

/** Site event with competing public myth, institutional doctrine, and ops verification layers. */
export const COMPETING_TRUTH_LAYERS_FIXTURE: TruthLayerRecord = defineRecord({
  id: 'truth:coastal-research-campus-incident',
  label: 'Coastal research campus containment divergence',
  summary: 'Public cover narrative, institutional doctrine, and field verification diverge on the same site event.',
  subjectRef: 'site:coastal-research-campus',
  subjectKind: 'site',
  parentCaseRef: 'case:containment-response-24',
  claim: {
    narrative: 'Industrial solvent leak prompted precautionary campus evacuation.',
    summary: 'Public-facing cover narrative distributed through regional press offices.',
    sourceConfidence: 'public_cover',
    knowledgeTier: 'partial',
    lastUpdatedWeek: 22,
  },
  doctrine: {
    narrative: 'Containment breach contained to sub-basement wing; civilian exposure within modeled tolerance.',
    summary: 'Institutional doctrine record for oversight briefing.',
    sourceConfidence: 'probable',
    knowledgeTier: 'observed',
    lastUpdatedWeek: 23,
    evidenceRef: 'briefing:doctrine-summary-24',
  },
  verification: {
    narrative: 'Anomalous residue breached secondary seal; two contractors exposed beyond modeled tolerance.',
    summary: 'Field verification from response team after seal inspection.',
    sourceConfidence: 'verified',
    knowledgeTier: 'confirmed',
    lastUpdatedWeek: 24,
    evidenceRef: 'report:field-verification-24',
  },
  competingLayers: [
    {
      recordRef: 'truth:regional-press-cover-24',
      layerRole: 'cover_narrative',
      note: 'Parallel public cover record maintained by comms cell.',
    },
    {
      recordRef: 'truth:agency-operational-log-24',
      layerRole: 'operational_record',
      note: 'Agency operational record with seal breach metrics.',
    },
  ],
  correctionPressure: 0.62,
  mythInfrastructureWeight: 0.48,
  linkedDisclosureRef: 'disclosure:coastal-research-campus',
  confidence: 0.55,
})

// ---------------------------------------------------------------------------
// Persistence (SPE-1343 slice 2)
// ---------------------------------------------------------------------------

export type TruthLayerRecordsMap = Record<TruthLayerRecordId, TruthLayerRecord>

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

function parseTruthLayerSlot(value: unknown): TruthLayerSlot | null {
  if (!isRecord(value)) {
    return null
  }

  const narrative = normalizeToken(value.narrative)
  if (!narrative) {
    return null
  }

  const summary =
    typeof value.summary === 'string' && value.summary.trim().length > 0
      ? value.summary.trim()
      : undefined
  const sourceConfidence =
    typeof value.sourceConfidence === 'string' && isSourceConfidence(value.sourceConfidence)
      ? value.sourceConfidence
      : undefined
  const knowledgeTier =
    typeof value.knowledgeTier === 'string' && isKnowledgeTier(value.knowledgeTier)
      ? value.knowledgeTier
      : undefined
  const lastUpdatedWeek = isFiniteWeek(value.lastUpdatedWeek) ? value.lastUpdatedWeek : undefined
  const evidenceRef = normalizeToken(value.evidenceRef ?? '') || undefined

  return {
    narrative,
    ...(summary ? { summary } : {}),
    ...(sourceConfidence ? { sourceConfidence } : {}),
    ...(knowledgeTier ? { knowledgeTier } : {}),
    ...(lastUpdatedWeek !== undefined ? { lastUpdatedWeek } : {}),
    ...(evidenceRef ? { evidenceRef } : {}),
  }
}

function parseCompetingLayers(value: unknown): readonly CompetingTruthLayerRef[] {
  if (!Array.isArray(value)) {
    return []
  }

  const layers: CompetingTruthLayerRef[] = []

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue
    }

    const recordRef = normalizeToken(entry.recordRef)
    const layerRole = entry.layerRole
    if (
      !recordRef ||
      typeof layerRole !== 'string' ||
      !isCompetingLayerRoleValue(layerRole)
    ) {
      continue
    }

    const note =
      typeof entry.note === 'string' && entry.note.trim().length > 0
        ? entry.note.trim()
        : undefined

    layers.push(note ? { recordRef, layerRole, note } : { recordRef, layerRole })
  }

  return layers
}

function sanitizeTruthLayerRecordEntry(value: unknown): TruthLayerRecord | null {
  if (!isRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const subjectRef = normalizeToken(value.subjectRef)
  const subjectKind = value.subjectKind
  const claim = parseTruthLayerSlot(value.claim)
  const doctrine = parseTruthLayerSlot(value.doctrine)
  const verification = parseTruthLayerSlot(value.verification)

  if (
    !id ||
    !label ||
    !subjectRef ||
    typeof subjectKind !== 'string' ||
    !isSubjectKind(subjectKind) ||
    !claim ||
    !doctrine ||
    !verification
  ) {
    return null
  }

  const competingLayers = parseCompetingLayers(value.competingLayers)
  const unknownFields = parseStringList(value.unknownFields)
  const redactedFields = parseStringList(value.redactedFields)

  const summary =
    typeof value.summary === 'string' && value.summary.trim().length > 0
      ? value.summary.trim()
      : undefined
  const parentCaseRef = normalizeToken(value.parentCaseRef ?? '') || undefined
  const linkedDisclosureRef = normalizeToken(value.linkedDisclosureRef ?? '') || undefined
  const correctionPressure = value.correctionPressure
  const mythInfrastructureWeight = value.mythInfrastructureWeight
  const confidence = value.confidence

  const record: TruthLayerRecord = {
    id,
    label,
    subjectRef,
    subjectKind,
    claim,
    doctrine,
    verification,
    ...(summary ? { summary } : {}),
    ...(parentCaseRef ? { parentCaseRef } : {}),
    ...(competingLayers.length > 0 ? { competingLayers } : {}),
    ...(isValidUnitScore(correctionPressure) ? { correctionPressure } : {}),
    ...(isValidUnitScore(mythInfrastructureWeight) ? { mythInfrastructureWeight } : {}),
    ...(linkedDisclosureRef ? { linkedDisclosureRef } : {}),
    ...(isValidUnitScore(confidence) ? { confidence } : {}),
    ...(unknownFields.length > 0 ? { unknownFields } : {}),
    ...(redactedFields.length > 0 ? { redactedFields } : {}),
  }

  if (!validateTruthLayerRecord(record).valid) {
    return null
  }

  return record
}

/** Hydration: canonical record map keyed by record id; drops invalid and duplicate-id entries. */
export function sanitizeTruthLayerRecords(
  value: unknown,
  fallback: TruthLayerRecordsMap = {}
): TruthLayerRecordsMap {
  if (!isRecord(value)) {
    return fallback
  }

  const next: TruthLayerRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeTruthLayerRecordEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

function sanitizeTruthLayerOpsProjection(
  value: unknown,
  recordId: string
): TruthLayerOpsProjection | null {
  if (!isRecord(value)) {
    return null
  }

  const normalizedRecordId = normalizeToken(value.recordId ?? recordId)
  if (!normalizedRecordId || normalizedRecordId !== normalizeToken(recordId)) {
    return null
  }

  const subjectRef = normalizeToken(value.subjectRef)
  if (!subjectRef) {
    return null
  }

  const subjectKindRaw = value.subjectKind
  if (typeof subjectKindRaw !== 'string' || !isSubjectKind(subjectKindRaw)) {
    return null
  }

  const correctionPressure =
    value.correctionPressure === null || value.correctionPressure === undefined
      ? null
      : isValidUnitScore(value.correctionPressure)
        ? value.correctionPressure
        : null

  const claimSourceConfidence =
    typeof value.claimSourceConfidence === 'string' &&
    isSourceConfidence(value.claimSourceConfidence)
      ? value.claimSourceConfidence
      : null

  const verificationSourceConfidence =
    typeof value.verificationSourceConfidence === 'string' &&
    isSourceConfidence(value.verificationSourceConfidence)
      ? value.verificationSourceConfidence
      : null

  return Object.freeze({
    recordId: normalizedRecordId,
    subjectRef,
    subjectKind: subjectKindRaw,
    mythInfrastructureActive: value.mythInfrastructureActive === true,
    correctionPressure,
    layerDivergence: value.layerDivergence === true,
    mythDrivesOpsWithoutVerification: value.mythDrivesOpsWithoutVerification === true,
    claimSourceConfidence,
    verificationSourceConfidence,
    redacted: value.redacted === true,
  })
}

function sanitizeTruthLayerWeeklyProjectionSnapshotEntry(
  key: string,
  value: unknown
): TruthLayerWeeklyProjectionSnapshot | null {
  if (!isRecord(value)) {
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
  const ops = sanitizeTruthLayerOpsProjection(value.ops, recordId)
  if (!ops || ops.recordId !== recordId) {
    return null
  }

  return Object.freeze({
    recordId,
    week,
    ops,
  })
}

/** Hydration: canonical weekly projection snapshot map keyed by record id; drops invalid entries. */
export function sanitizeTruthLayerWeeklyProjectionSnapshots(
  value: unknown,
  fallback: TruthLayerWeeklyProjectionSnapshotsMap = {},
  knownRecordIds?: ReadonlySet<string>
): TruthLayerWeeklyProjectionSnapshotsMap {
  if (!isRecord(value)) {
    return fallback
  }

  const candidates: TruthLayerWeeklyProjectionSnapshot[] = []

  for (const [key, entry] of Object.entries(value)) {
    const snapshot = sanitizeTruthLayerWeeklyProjectionSnapshotEntry(key, entry)
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

  const next: TruthLayerWeeklyProjectionSnapshotsMap = {}
  for (const snapshot of candidates.slice(0, MAX_TRUTH_LAYER_WEEKLY_PROJECTION_SNAPSHOTS)) {
    next[snapshot.recordId] = snapshot
  }

  return Object.keys(next).length > 0 ? next : fallback
}

/** Actor subject with separate claim/doctrine/verification slots for round-trip checks. */
export const ACTOR_TRUTH_LAYER_FIXTURE: TruthLayerRecord = defineRecord({
  id: 'truth:regional-oversight-commissioner',
  label: 'Regional oversight commissioner testimony layers',
  subjectRef: 'actor:regional-oversight-commissioner',
  subjectKind: 'actor',
  parentCaseRef: 'case:oversight-hearing-11',
  claim: {
    narrative: 'Commissioner asserts routine industrial oversight with no anomalous findings.',
    sourceConfidence: 'public_cover',
    knowledgeTier: 'suspected',
    lastUpdatedWeek: 30,
  },
  doctrine: {
    narrative: 'Commission staff record notes elevated containment liaison requests.',
    sourceConfidence: 'probable',
    knowledgeTier: 'observed',
    lastUpdatedWeek: 31,
    evidenceRef: 'memo:liaison-request-11',
  },
  verification: {
    narrative: 'Liaison logs confirm commissioner received sealed briefing materials.',
    sourceConfidence: 'verified',
    knowledgeTier: 'confirmed',
    lastUpdatedWeek: 32,
    evidenceRef: 'log:briefing-delivery-11',
  },
  correctionPressure: 0.28,
  confidence: 0.61,
})
