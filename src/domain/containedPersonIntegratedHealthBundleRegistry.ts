/**
 * SPE-1889 slice 5: contained-person integrated health bundle registry.
 *
 * Minimal deterministic bundle schema for long-term custody condition tracking.
 * Therapeutic-care schedule links are wired from SPE-2115 records; medication,
 * custody, and welfare-debt fields are deferred to sibling SPE-1889 children.
 */

import {
  FRANCHISE_TOKEN_PATTERN,
  BRANDED_OBJECT_NUMBER_PATTERN,
  isCareMode,
  isChannelState,
  type CareMode,
  type ChannelState,
} from './containedPersonTherapeuticCareRegistry'

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type ContainedPersonIntegratedHealthBundleId = string

export type MentalStateBand = 'stable' | 'strained' | 'distressed' | 'critical'

export const MENTAL_STATE_BANDS: readonly MentalStateBand[] = [
  'stable',
  'strained',
  'distressed',
  'critical',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface TherapeuticCareScheduleLink {
  readonly scheduleRef: string
  readonly wiredRef: string
  readonly careMode: CareMode
  readonly channelState: ChannelState
  readonly missedSessionStreak: number
  readonly complianceRiskScore: number | null
  readonly lockdownEscalationLikely: boolean
}

export interface ContainedPersonIntegratedHealthBundle {
  readonly id: ContainedPersonIntegratedHealthBundleId
  readonly label: string
  readonly subjectRef: string
  readonly therapeuticCareScheduleLinks?: readonly TherapeuticCareScheduleLink[]
  readonly mentalStateBand?: MentalStateBand
  readonly humaneCareRiskScore?: number | null
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ContainedPersonIntegratedHealthBundleValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_subject_ref'
  | 'id_subject_ref_mismatch'
  | 'invalid_mental_state_band'
  | 'invalid_humane_care_risk_score'
  | 'invalid_confidence'
  | 'invalid_therapeutic_care_link'
  | 'duplicate_therapeutic_care_schedule_ref'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface ContainedPersonIntegratedHealthBundleValidationIssue {
  readonly code: ContainedPersonIntegratedHealthBundleValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface ContainedPersonIntegratedHealthBundleValidationResult {
  readonly valid: boolean
  readonly issues: readonly ContainedPersonIntegratedHealthBundleValidationIssue[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const MENTAL_STATE_BAND_SET = new Set<string>(MENTAL_STATE_BANDS)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isValidUnitScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
}

function containsFranchiseToken(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && FRANCHISE_TOKEN_PATTERN.test(token)
}

function containsBrandedObjectNumber(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && BRANDED_OBJECT_NUMBER_PATTERN.test(token)
}

function pushIssue(
  issues: ContainedPersonIntegratedHealthBundleValidationIssue[],
  issue: ContainedPersonIntegratedHealthBundleValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: ContainedPersonIntegratedHealthBundleValidationIssue[]) {
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
  issues: ContainedPersonIntegratedHealthBundleValidationIssue[]
): ContainedPersonIntegratedHealthBundleValidationResult {
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
  issues: ContainedPersonIntegratedHealthBundleValidationIssue[],
  id: string,
  label: string,
  bundle: ContainedPersonIntegratedHealthBundle
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Integrated health bundle id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Integrated health bundle id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Integrated health bundle label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Integrated health bundle label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const subjectRef = normalizeToken(bundle.subjectRef)
  if (subjectRef && (containsFranchiseToken(subjectRef) || containsBrandedObjectNumber(subjectRef))) {
    pushIssue(issues, {
      code: containsFranchiseToken(subjectRef)
        ? 'franchise_token_in_field'
        : 'branded_object_number_in_field',
      severity: 'error',
      detail: `Integrated health bundle ${id || '(unknown)'} subjectRef contains a forbidden token.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

export function isMentalStateBand(value: unknown): value is MentalStateBand {
  return typeof value === 'string' && MENTAL_STATE_BAND_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateContainedPersonIntegratedHealthBundle(
  bundle: ContainedPersonIntegratedHealthBundle
): ContainedPersonIntegratedHealthBundleValidationResult {
  const issues: ContainedPersonIntegratedHealthBundleValidationIssue[] = []
  const id = normalizeToken(bundle.id)
  const label = normalizeToken(bundle.label)
  const subjectRef = normalizeToken(bundle.subjectRef)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Integrated health bundle is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Integrated health bundle is missing label.',
    })
  }

  if (!subjectRef) {
    pushIssue(issues, {
      code: 'missing_subject_ref',
      severity: 'error',
      detail: 'Integrated health bundle is missing subjectRef.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (id && subjectRef && id !== subjectRef) {
    pushIssue(issues, {
      code: 'id_subject_ref_mismatch',
      severity: 'error',
      detail: `Integrated health bundle ${id} id must match subjectRef.`,
      relatedIds: [id],
    })
  }

  if (bundle.mentalStateBand !== undefined && !isMentalStateBand(bundle.mentalStateBand)) {
    pushIssue(issues, {
      code: 'invalid_mental_state_band',
      severity: 'error',
      detail: `Integrated health bundle ${id || '(unknown)'} has invalid mentalStateBand ${String(bundle.mentalStateBand)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    bundle.humaneCareRiskScore !== undefined &&
    bundle.humaneCareRiskScore !== null &&
    !isValidUnitScore(bundle.humaneCareRiskScore)
  ) {
    pushIssue(issues, {
      code: 'invalid_humane_care_risk_score',
      severity: 'error',
      detail: `Integrated health bundle ${id || '(unknown)'} humaneCareRiskScore must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (bundle.confidence !== undefined && !isValidUnitScore(bundle.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Integrated health bundle ${id || '(unknown)'} confidence must be between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const seenScheduleRefs = new Set<string>()
  for (const link of bundle.therapeuticCareScheduleLinks ?? []) {
    const scheduleRef = normalizeToken(link.scheduleRef)
    const wiredRef = normalizeToken(link.wiredRef)

    if (
      !scheduleRef ||
      !wiredRef ||
      !isCareMode(link.careMode) ||
      !isChannelState(link.channelState) ||
      !isNonNegativeInteger(link.missedSessionStreak) ||
      typeof link.lockdownEscalationLikely !== 'boolean' ||
      (link.complianceRiskScore !== null && !isValidUnitScore(link.complianceRiskScore))
    ) {
      pushIssue(issues, {
        code: 'invalid_therapeutic_care_link',
        severity: 'error',
        detail: `Integrated health bundle ${id || '(unknown)'} has invalid therapeutic care schedule link.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (seenScheduleRefs.has(scheduleRef)) {
      pushIssue(issues, {
        code: 'duplicate_therapeutic_care_schedule_ref',
        severity: 'error',
        detail: `Integrated health bundle ${id || '(unknown)'} has duplicate therapeutic care schedule ref ${scheduleRef}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    seenScheduleRefs.add(scheduleRef)
  }

  scanForbiddenTokens(issues, id, label, bundle)

  return freezeValidationResult(issues)
}

// ---------------------------------------------------------------------------
// Persistence / hydration
// ---------------------------------------------------------------------------

export type ContainedPersonIntegratedHealthBundleRecordsMap = Record<
  ContainedPersonIntegratedHealthBundleId,
  ContainedPersonIntegratedHealthBundle
>

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

function sanitizeTherapeuticCareScheduleLinkEntry(
  value: unknown
): TherapeuticCareScheduleLink | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const scheduleRef = normalizeToken(value.scheduleRef)
  const wiredRef = normalizeToken(value.wiredRef)
  const careMode = value.careMode
  const channelState = value.channelState
  const missedSessionStreak = value.missedSessionStreak
  const complianceRiskScore = value.complianceRiskScore
  const lockdownEscalationLikely = value.lockdownEscalationLikely

  if (
    !scheduleRef ||
    !wiredRef ||
    typeof careMode !== 'string' ||
    !isCareMode(careMode) ||
    typeof channelState !== 'string' ||
    !isChannelState(channelState) ||
    !isNonNegativeInteger(missedSessionStreak) ||
    typeof lockdownEscalationLikely !== 'boolean'
  ) {
    return null
  }

  const resolvedComplianceRiskScore =
    complianceRiskScore === null
      ? null
      : isValidUnitScore(complianceRiskScore)
        ? complianceRiskScore
        : null

  return Object.freeze({
    scheduleRef,
    wiredRef,
    careMode,
    channelState,
    missedSessionStreak,
    complianceRiskScore: resolvedComplianceRiskScore,
    lockdownEscalationLikely,
  })
}

function sanitizeIntegratedHealthBundleEntry(
  value: unknown
): ContainedPersonIntegratedHealthBundle | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const subjectRef = normalizeToken(value.subjectRef)
  const mentalStateBand = value.mentalStateBand

  if (!id || !label || !subjectRef) {
    return null
  }

  if (mentalStateBand !== undefined && !isMentalStateBand(mentalStateBand)) {
    return null
  }

  const links = (Array.isArray(value.therapeuticCareScheduleLinks)
    ? value.therapeuticCareScheduleLinks
    : []
  )
    .map((entry) => sanitizeTherapeuticCareScheduleLinkEntry(entry))
    .filter((entry): entry is TherapeuticCareScheduleLink => entry !== null)

  const humaneCareRiskScore = value.humaneCareRiskScore
  const confidence = value.confidence
  const unknownFields = parseStringList(value.unknownFields)
  const redactedFields = parseStringList(value.redactedFields)

  const bundle: ContainedPersonIntegratedHealthBundle = {
    id,
    label,
    subjectRef,
    ...(links.length > 0 ? { therapeuticCareScheduleLinks: Object.freeze(links) } : {}),
    ...(mentalStateBand !== undefined ? { mentalStateBand } : {}),
    ...(humaneCareRiskScore !== undefined ? { humaneCareRiskScore } : {}),
    ...(isValidUnitScore(confidence) ? { confidence } : {}),
    ...(unknownFields.length > 0 ? { unknownFields } : {}),
    ...(redactedFields.length > 0 ? { redactedFields } : {}),
  }

  if (!validateContainedPersonIntegratedHealthBundle(bundle).valid) {
    return null
  }

  return bundle
}

/** Hydration: canonical bundle map keyed by subject ref; drops invalid and duplicate-id entries. */
export function sanitizeContainedPersonIntegratedHealthBundles(
  value: unknown,
  fallback: ContainedPersonIntegratedHealthBundleRecordsMap = {}
): ContainedPersonIntegratedHealthBundleRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: ContainedPersonIntegratedHealthBundleRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const bundle = sanitizeIntegratedHealthBundleEntry(entry)
    if (!bundle || seenIds.has(bundle.id)) {
      continue
    }

    seenIds.add(bundle.id)
    next[bundle.id] = bundle
  }

  return Object.keys(next).length > 0 ? next : fallback
}
