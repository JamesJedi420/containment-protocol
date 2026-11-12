/**
 * SPE-2120 slice 1: media-contained event registry.
 *
 * Pure deterministic registry for recordings/files that host active events
 * (loops, branching playback, and divergence) rather than passive archives.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type MediaContainedEventId = string

export type MediaKind = 'digital_recording' | 'broadcast_capture' | 'editorial_sequence'

export const MEDIA_KINDS: readonly MediaKind[] = [
  'digital_recording',
  'broadcast_capture',
  'editorial_sequence',
] as const

export type EventLoopState = 'linear' | 'repeating' | 'branching' | 'frozen'

export const EVENT_LOOP_STATES: readonly EventLoopState[] = [
  'linear',
  'repeating',
  'branching',
  'frozen',
] as const

export type ContainmentSurface = 'airgap' | 'filtered_viewing' | 'no_playback'

export const CONTAINMENT_SURFACES: readonly ContainmentSurface[] = [
  'airgap',
  'filtered_viewing',
  'no_playback',
] as const

export type ExposureRiskBand = 'low' | 'elevated' | 'critical'

export const EXPOSURE_RISK_BANDS: readonly ExposureRiskBand[] = [
  'low',
  'elevated',
  'critical',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface MediaContainedEventRecord {
  readonly id: MediaContainedEventId
  readonly label: string
  readonly summary?: string
  readonly mediaKind: MediaKind
  readonly eventLoopState: EventLoopState
  readonly playbackPosition: number
  readonly historicalDeviationFlag: boolean
  readonly custodyChainRefs: readonly string[]
  readonly publicExposureRisk: number
  readonly containmentSurface: ContainmentSurface
  readonly branchRules?: readonly string[]
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type MediaContainedEventValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'invalid_media_kind'
  | 'invalid_event_loop_state'
  | 'invalid_playback_position'
  | 'invalid_public_exposure_risk'
  | 'invalid_containment_surface'
  | 'invalid_confidence'
  | 'invalid_custody_chain_refs'
  | 'invalid_custody_chain_ref'
  | 'empty_custody_chain_ref'
  | 'invalid_branch_rules'
  | 'invalid_branch_rule'
  | 'empty_branch_rule'
  | 'branching_without_branch_rules'
  | 'no_playback_with_unmitigated_exposure_risk'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface MediaContainedEventValidationIssue {
  readonly code: MediaContainedEventValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface MediaContainedEventValidationResult {
  readonly valid: boolean
  readonly issues: readonly MediaContainedEventValidationIssue[]
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export interface PlaybackExposureRiskProjectionPolicy {
  readonly currentWeek?: number
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
  readonly suppressHiddenConflictLabels?: boolean
}

export interface PlaybackExposureSymptom {
  readonly ref: string
  readonly symptomDescriptor: string
  readonly visualTriggerHook: string | null
}

export interface PlaybackExposureRiskProjection {
  readonly recordId: MediaContainedEventId
  readonly label: string
  readonly mediaKind: MediaKind
  readonly eventLoopState: EventLoopState
  readonly containmentSurface: ContainmentSurface
  readonly projectedExposureRisk: number | null
  readonly riskBand: ExposureRiskBand | null
  readonly playbackStabilityScore: number | null
  readonly custodySymptoms: readonly PlaybackExposureSymptom[]
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const MEDIA_KIND_SET = new Set<string>(MEDIA_KINDS)
const EVENT_LOOP_STATE_SET = new Set<string>(EVENT_LOOP_STATES)
const CONTAINMENT_SURFACE_SET = new Set<string>(CONTAINMENT_SURFACES)

export const FRANCHISE_TOKEN_PATTERN =
  /\b(scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|goi-|group of interest|broken masquerade|masquerade breach|wiki\.|wikidot)(?!\w)/i

export const BRANDED_OBJECT_NUMBER_PATTERN = /\bSCP[\s-]?\d{3,4}\b/i

const LOOP_STATE_PRESSURE: Readonly<Record<EventLoopState, number>> = {
  linear: 0.04,
  repeating: 0.09,
  branching: 0.14,
  frozen: 0.03,
}

const CONTAINMENT_MITIGATION: Readonly<Record<ContainmentSurface, number>> = {
  airgap: 0.18,
  filtered_viewing: 0.12,
  no_playback: 0.22,
}

const SYMPTOM_PREFIX: Readonly<Record<EventLoopState, string>> = {
  linear: 'Linear playback integrity drift observed for',
  repeating: 'Repeating loop recurrence observed for',
  branching: 'Branch divergence anomaly observed for',
  frozen: 'Frozen playback state desync observed for',
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
  issues: MediaContainedEventValidationIssue[],
  issue: MediaContainedEventValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: MediaContainedEventValidationIssue[]) {
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

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value === Math.trunc(value)
  )
}

function roundUnit(value: number): number {
  return Math.round(value * 1000) / 1000
}

function freezeValidationResult(
  issues: MediaContainedEventValidationIssue[]
): MediaContainedEventValidationResult {
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

function hasNonEmptyBranchRules(record: MediaContainedEventRecord): boolean {
  return asStringArray(record.branchRules).some((rule) => normalizeToken(rule).length > 0)
}

function validateStringRefArray(
  issues: MediaContainedEventValidationIssue[],
  id: string,
  fieldName: string,
  value: unknown,
  invalidArrayCode: MediaContainedEventValidationCode,
  invalidEntryCode: MediaContainedEventValidationCode,
  emptyEntryCode: MediaContainedEventValidationCode
) {
  if (!Array.isArray(value)) {
    pushIssue(issues, {
      code: invalidArrayCode,
      severity: 'error',
      detail: `Media-contained event record ${id || '(unknown)'} ${fieldName} must be an array.`,
      relatedIds: id ? [id] : undefined,
    })
    return
  }

  if (value.length === 0) {
    pushIssue(issues, {
      code: invalidArrayCode,
      severity: 'error',
      detail: `Media-contained event record ${id || '(unknown)'} ${fieldName} must contain at least one ref.`,
      relatedIds: id ? [id] : undefined,
    })
    return
  }

  for (const entry of value) {
    if (typeof entry !== 'string') {
      pushIssue(issues, {
        code: invalidEntryCode,
        severity: 'error',
        detail: `Media-contained event record ${id || '(unknown)'} ${fieldName} contains a non-string ref.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!normalizeToken(entry)) {
      pushIssue(issues, {
        code: emptyEntryCode,
        severity: 'error',
        detail: `Media-contained event record ${id || '(unknown)'} ${fieldName} contains an empty ref.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }
}

function scanStringFieldTokens(
  issues: MediaContainedEventValidationIssue[],
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
      detail: `Media-contained event record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(token)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_field',
      severity: 'error',
      detail: `Media-contained event record ${id || '(unknown)'} field ${field} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function scanRefArrayTokens(
  issues: MediaContainedEventValidationIssue[],
  id: string,
  field: string,
  refs: readonly string[]
) {
  for (const ref of refs) {
    scanStringFieldTokens(issues, id, field, ref)
  }
}

function scanForbiddenTokens(
  issues: MediaContainedEventValidationIssue[],
  id: string,
  label: string,
  record: MediaContainedEventRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Media-contained event record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Media-contained event record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Media-contained event record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Media-contained event record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.summary) {
    scanStringFieldTokens(issues, id, 'summary', record.summary)
  }

  scanRefArrayTokens(issues, id, 'custodyChainRefs', asStringArray(record.custodyChainRefs))
  scanRefArrayTokens(issues, id, 'branchRules', asStringArray(record.branchRules))
}

function resolveConfidence(
  record: MediaContainedEventRecord,
  policy: PlaybackExposureRiskProjectionPolicy
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

function resolveProjectedExposureRisk(
  record: MediaContainedEventRecord,
  policy: PlaybackExposureRiskProjectionPolicy
): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (redactedFields.has('publicExposureRisk')) {
    return null
  }

  if (policy.redactUnknown === true && unknownFields.includes('publicExposureRisk')) {
    return null
  }

  if (!isValidUnitScore(record.publicExposureRisk)) {
    return null
  }

  const eventLoopState = isEventLoopState(record.eventLoopState) ? record.eventLoopState : 'linear'
  const containmentSurface = isContainmentSurface(record.containmentSurface)
    ? record.containmentSurface
    : 'airgap'
  const currentWeek =
    typeof policy.currentWeek === 'number' && Number.isFinite(policy.currentWeek)
      ? Math.max(0, Math.trunc(policy.currentWeek))
      : 0

  const drift = currentWeek * LOOP_STATE_PRESSURE[eventLoopState]
  const mitigated = record.publicExposureRisk + drift - CONTAINMENT_MITIGATION[containmentSurface]
  return roundUnit(Math.max(0, Math.min(1, mitigated)))
}

function resolveExposureBand(score: number | null): ExposureRiskBand | null {
  if (score === null) {
    return null
  }

  if (score < 0.34) {
    return 'low'
  }

  if (score < 0.67) {
    return 'elevated'
  }

  return 'critical'
}

function resolvePlaybackStabilityScore(
  record: MediaContainedEventRecord,
  projectedExposureRisk: number | null
): number | null {
  if (!isNonNegativeInteger(record.playbackPosition)) {
    return null
  }
  if (projectedExposureRisk === null) {
    return null
  }

  const positionPenalty = Math.min(0.2, record.playbackPosition * 0.01)
  return roundUnit(Math.max(0, 1 - projectedExposureRisk - positionPenalty))
}

function resolveVisualTriggerHook(
  record: MediaContainedEventRecord,
  _ref: string,
  policy: PlaybackExposureRiskProjectionPolicy
): string | null {
  if (policy.suppressHiddenConflictLabels === true) {
    return null
  }

  const mediaKind = isMediaKind(record.mediaKind) ? record.mediaKind : 'digital_recording'
  return `visual_trigger_crosscheck:${mediaKind}`
}

function buildSymptomDescriptor(record: MediaContainedEventRecord, ref: string): string {
  const eventLoopState = isEventLoopState(record.eventLoopState) ? record.eventLoopState : 'linear'
  const refToken = normalizeToken(ref) || 'unknown_ref'
  return `${SYMPTOM_PREFIX[eventLoopState]} ${refToken}`
}

function buildCustodySymptoms(
  record: MediaContainedEventRecord,
  policy: PlaybackExposureRiskProjectionPolicy
): readonly PlaybackExposureSymptom[] {
  const refs = asStringArray(record.custodyChainRefs)
    .map((ref) => normalizeToken(ref))
    .filter((ref) => ref.length > 0)
    .sort((left, right) => left.localeCompare(right))

  return Object.freeze(
    refs.map((ref) =>
      Object.freeze({
        ref,
        symptomDescriptor: buildSymptomDescriptor(record, ref),
        visualTriggerHook: resolveVisualTriggerHook(record, ref, policy),
      })
    )
  )
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isMediaKind(value: unknown): value is MediaKind {
  return typeof value === 'string' && MEDIA_KIND_SET.has(value)
}

export function isEventLoopState(value: unknown): value is EventLoopState {
  return typeof value === 'string' && EVENT_LOOP_STATE_SET.has(value)
}

export function isContainmentSurface(value: unknown): value is ContainmentSurface {
  return typeof value === 'string' && CONTAINMENT_SURFACE_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateMediaContainedEventRecord(
  record: MediaContainedEventRecord
): MediaContainedEventValidationResult {
  const issues: MediaContainedEventValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Media-contained event record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Media-contained event record is missing label.',
    })
  }

  if (!isMediaKind(record.mediaKind)) {
    pushIssue(issues, {
      code: 'invalid_media_kind',
      severity: 'error',
      detail: `Media-contained event record ${id || '(unknown)'} has invalid mediaKind ${String(record.mediaKind)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isEventLoopState(record.eventLoopState)) {
    pushIssue(issues, {
      code: 'invalid_event_loop_state',
      severity: 'error',
      detail: `Media-contained event record ${id || '(unknown)'} has invalid eventLoopState ${String(record.eventLoopState)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isNonNegativeInteger(record.playbackPosition)) {
    pushIssue(issues, {
      code: 'invalid_playback_position',
      severity: 'error',
      detail: `Media-contained event record ${id || '(unknown)'} playbackPosition must be a non-negative integer.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isValidUnitScore(record.publicExposureRisk)) {
    pushIssue(issues, {
      code: 'invalid_public_exposure_risk',
      severity: 'error',
      detail: `Media-contained event record ${id || '(unknown)'} publicExposureRisk must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isContainmentSurface(record.containmentSurface)) {
    pushIssue(issues, {
      code: 'invalid_containment_surface',
      severity: 'error',
      detail: `Media-contained event record ${id || '(unknown)'} has invalid containmentSurface ${String(record.containmentSurface)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Media-contained event record ${id || '(unknown)'} confidence must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  validateStringRefArray(
    issues,
    id,
    'custodyChainRefs',
    record.custodyChainRefs,
    'invalid_custody_chain_refs',
    'invalid_custody_chain_ref',
    'empty_custody_chain_ref'
  )

  if (record.branchRules !== undefined) {
    validateStringRefArray(
      issues,
      id,
      'branchRules',
      record.branchRules,
      'invalid_branch_rules',
      'invalid_branch_rule',
      'empty_branch_rule'
    )
  }

  scanForbiddenTokens(issues, id, label, record)

  if (record.eventLoopState === 'branching' && !hasNonEmptyBranchRules(record)) {
    pushIssue(issues, {
      code: 'branching_without_branch_rules',
      severity: 'error',
      detail: `Media-contained event record ${id || '(unknown)'} uses branching eventLoopState without branchRules.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.containmentSurface === 'no_playback' &&
    isValidUnitScore(record.publicExposureRisk) &&
    record.publicExposureRisk > 0.4
  ) {
    pushIssue(issues, {
      code: 'no_playback_with_unmitigated_exposure_risk',
      severity: 'warning',
      detail: `Media-contained event record ${id || '(unknown)'} blocks playback but still reports active publicExposureRisk.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects deterministic playback exposure risk for downstream propagation checks.
 * This is a hook-compatible summary; SPE-947 wiring remains deferred.
 */
export function projectPlaybackExposureRisk(
  record: MediaContainedEventRecord,
  policy: PlaybackExposureRiskProjectionPolicy = {}
): PlaybackExposureRiskProjection {
  const recordId = normalizeToken(record.id) || '(unknown)'
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)
  const confidence = resolveConfidence(record, policy)
  const projectedExposureRisk = resolveProjectedExposureRisk(record, policy)

  const custodyRedacted =
    redactedFields.has('custodyChainRefs') ||
    (policy.redactUnknown === true && unknownFields.includes('custodyChainRefs'))

  const custodySymptoms = custodyRedacted ? Object.freeze([]) : buildCustodySymptoms(record, policy)

  const riskRedacted =
    redactedFields.has('publicExposureRisk') ||
    (policy.redactUnknown === true && unknownFields.includes('publicExposureRisk'))

  const redacted =
    custodyRedacted ||
    riskRedacted ||
    redactedFields.has('confidence') ||
    (policy.redactUnknown === true && unknownFields.includes('confidence')) ||
    (confidence === null && record.confidence !== undefined && policy.minimumConfidence !== undefined)

  return Object.freeze({
    recordId,
    label: normalizeToken(record.label) || '(unknown)',
    mediaKind: isMediaKind(record.mediaKind) ? record.mediaKind : 'digital_recording',
    eventLoopState: isEventLoopState(record.eventLoopState) ? record.eventLoopState : 'linear',
    containmentSurface: isContainmentSurface(record.containmentSurface)
      ? record.containmentSurface
      : 'airgap',
    projectedExposureRisk,
    riskBand: resolveExposureBand(projectedExposureRisk),
    playbackStabilityScore: resolvePlaybackStabilityScore(record, projectedExposureRisk),
    custodySymptoms,
    confidence,
    redacted,
    unknownFields,
  })
}

function defineRecord(record: MediaContainedEventRecord): MediaContainedEventRecord {
  return Object.freeze({ ...record })
}

/** Repeating loop event contained to filtered viewing. */
export const REPEATING_FILTERED_VIEWING_FIXTURE: MediaContainedEventRecord = defineRecord({
  id: 'media-contained:repeating-loop-observation-file',
  label: 'Repeating loop observation file',
  summary: 'Repeating playback anomaly constrained to filtered viewing channels.',
  mediaKind: 'digital_recording',
  eventLoopState: 'repeating',
  playbackPosition: 6,
  historicalDeviationFlag: false,
  custodyChainRefs: ['custody:forensics-lab-a', 'custody:observation-room-2'],
  publicExposureRisk: 0.36,
  containmentSurface: 'filtered_viewing',
  confidence: 0.79,
})

/** Historical deviation event with explicit custody chain and airgapped containment. */
export const HISTORICAL_DEVIATION_CUSTODY_FIXTURE: MediaContainedEventRecord = defineRecord({
  id: 'media-contained:historical-deviation-broadcast-capture',
  label: 'Historical deviation broadcast capture',
  summary: 'Archived capture diverges from original timeline references with tracked custody.',
  mediaKind: 'broadcast_capture',
  eventLoopState: 'linear',
  playbackPosition: 11,
  historicalDeviationFlag: true,
  custodyChainRefs: ['custody:archive-vault-3', 'custody:evidence-review-cell-b'],
  publicExposureRisk: 0.42,
  containmentSurface: 'airgap',
  confidence: 0.68,
})
