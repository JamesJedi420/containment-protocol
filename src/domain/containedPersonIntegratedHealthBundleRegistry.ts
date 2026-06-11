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

export type MedicationConsentStatus =
  | 'voluntary'
  | 'negotiated'
  | 'compelled'
  | 'emergency'
  | 'covert'

export const MEDICATION_CONSENT_STATUSES: readonly MedicationConsentStatus[] = [
  'voluntary',
  'negotiated',
  'compelled',
  'emergency',
  'covert',
] as const

export interface MedicationRegimenLink {
  readonly regimenRef: string
  readonly wiredRef: string
  readonly consentStatus: MedicationConsentStatus
  readonly deliveryVector: string
  readonly interactionRiskScore: number | null
  readonly adverseReactionFlag: boolean
}

export type CustodyStage =
  | 'person_of_interest'
  | 'temporary_holding'
  | 'contained_person'
  | 'medical_hold'
  | 'transfer_pending'

export const CUSTODY_STAGES: readonly CustodyStage[] = [
  'person_of_interest',
  'temporary_holding',
  'contained_person',
  'medical_hold',
  'transfer_pending',
] as const

export interface CustodyStatusLink {
  readonly custodyRef: string
  readonly wiredRef: string
  readonly custodyStage: CustodyStage
  readonly formerRoleCategory: string
  readonly restrictionLevel: string
  readonly rightsReviewPending: boolean
}

export type WelfareDebtSeverityBand = 'low' | 'moderate' | 'high' | 'critical'

export const WELFARE_DEBT_SEVERITY_BANDS: readonly WelfareDebtSeverityBand[] = [
  'low',
  'moderate',
  'high',
  'critical',
] as const

export type WelfareDebtMitigationState =
  | 'unresolved'
  | 'acknowledged'
  | 'mitigated'
  | 'escalated'
  | 'waived'
  | 'denied'

export const WELFARE_DEBT_MITIGATION_STATES: readonly WelfareDebtMitigationState[] = [
  'unresolved',
  'acknowledged',
  'mitigated',
  'escalated',
  'waived',
  'denied',
] as const

export interface WelfareDebtAccountingLink {
  readonly debtRef: string
  readonly wiredRef: string
  readonly severityBand: WelfareDebtSeverityBand
  readonly mitigationState: WelfareDebtMitigationState
  readonly containmentBenefitScore: number | null
}

export interface ContainedPersonIntegratedHealthBundle {
  readonly id: ContainedPersonIntegratedHealthBundleId
  readonly label: string
  readonly subjectRef: string
  readonly therapeuticCareScheduleLinks?: readonly TherapeuticCareScheduleLink[]
  readonly medicationRegimenLinks?: readonly MedicationRegimenLink[]
  readonly custodyStatusLinks?: readonly CustodyStatusLink[]
  readonly welfareDebtAccountingLinks?: readonly WelfareDebtAccountingLink[]
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
  | 'invalid_medication_regimen_link'
  | 'duplicate_medication_regimen_ref'
  | 'invalid_custody_status_link'
  | 'duplicate_custody_status_ref'
  | 'invalid_welfare_debt_accounting_link'
  | 'duplicate_welfare_debt_ref'
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
const MEDICATION_CONSENT_STATUS_SET = new Set<string>(MEDICATION_CONSENT_STATUSES)
const CUSTODY_STAGE_SET = new Set<string>(CUSTODY_STAGES)
const WELFARE_DEBT_SEVERITY_BAND_SET = new Set<string>(WELFARE_DEBT_SEVERITY_BANDS)
const WELFARE_DEBT_MITIGATION_STATE_SET = new Set<string>(WELFARE_DEBT_MITIGATION_STATES)

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

export function isMedicationConsentStatus(value: unknown): value is MedicationConsentStatus {
  return typeof value === 'string' && MEDICATION_CONSENT_STATUS_SET.has(value)
}

export function isCustodyStage(value: unknown): value is CustodyStage {
  return typeof value === 'string' && CUSTODY_STAGE_SET.has(value)
}

export function isWelfareDebtSeverityBand(value: unknown): value is WelfareDebtSeverityBand {
  return typeof value === 'string' && WELFARE_DEBT_SEVERITY_BAND_SET.has(value)
}

export function isWelfareDebtMitigationState(value: unknown): value is WelfareDebtMitigationState {
  return typeof value === 'string' && WELFARE_DEBT_MITIGATION_STATE_SET.has(value)
}

function validateMedicationRegimenLinks(
  issues: ContainedPersonIntegratedHealthBundleValidationIssue[],
  id: string,
  links: readonly MedicationRegimenLink[] | undefined
) {
  const seenRegimenRefs = new Set<string>()

  for (const link of links ?? []) {
    const regimenRef = normalizeToken(link.regimenRef)
    const wiredRef = normalizeToken(link.wiredRef)
    const deliveryVector = normalizeToken(link.deliveryVector)

    if (
      !regimenRef ||
      !wiredRef ||
      !isMedicationConsentStatus(link.consentStatus) ||
      !deliveryVector ||
      typeof link.adverseReactionFlag !== 'boolean' ||
      (link.interactionRiskScore !== null && !isValidUnitScore(link.interactionRiskScore))
    ) {
      pushIssue(issues, {
        code: 'invalid_medication_regimen_link',
        severity: 'error',
        detail: `Integrated health bundle ${id || '(unknown)'} has invalid medication regimen link.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (seenRegimenRefs.has(regimenRef)) {
      pushIssue(issues, {
        code: 'duplicate_medication_regimen_ref',
        severity: 'error',
        detail: `Integrated health bundle ${id || '(unknown)'} has duplicate medication regimen ref ${regimenRef}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    seenRegimenRefs.add(regimenRef)
  }
}

function validateCustodyStatusLinks(
  issues: ContainedPersonIntegratedHealthBundleValidationIssue[],
  id: string,
  links: readonly CustodyStatusLink[] | undefined
) {
  const seenCustodyRefs = new Set<string>()

  for (const link of links ?? []) {
    const custodyRef = normalizeToken(link.custodyRef)
    const wiredRef = normalizeToken(link.wiredRef)
    const formerRoleCategory = normalizeToken(link.formerRoleCategory)
    const restrictionLevel = normalizeToken(link.restrictionLevel)

    if (
      !custodyRef ||
      !wiredRef ||
      !isCustodyStage(link.custodyStage) ||
      !formerRoleCategory ||
      !restrictionLevel ||
      typeof link.rightsReviewPending !== 'boolean'
    ) {
      pushIssue(issues, {
        code: 'invalid_custody_status_link',
        severity: 'error',
        detail: `Integrated health bundle ${id || '(unknown)'} has invalid custody status link.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (seenCustodyRefs.has(custodyRef)) {
      pushIssue(issues, {
        code: 'duplicate_custody_status_ref',
        severity: 'error',
        detail: `Integrated health bundle ${id || '(unknown)'} has duplicate custody status ref ${custodyRef}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    seenCustodyRefs.add(custodyRef)
  }
}

function validateWelfareDebtAccountingLinks(
  issues: ContainedPersonIntegratedHealthBundleValidationIssue[],
  id: string,
  links: readonly WelfareDebtAccountingLink[] | undefined
) {
  const seenDebtRefs = new Set<string>()

  for (const link of links ?? []) {
    const debtRef = normalizeToken(link.debtRef)
    const wiredRef = normalizeToken(link.wiredRef)

    if (
      !debtRef ||
      !wiredRef ||
      !isWelfareDebtSeverityBand(link.severityBand) ||
      !isWelfareDebtMitigationState(link.mitigationState) ||
      (link.containmentBenefitScore !== null && !isValidUnitScore(link.containmentBenefitScore))
    ) {
      pushIssue(issues, {
        code: 'invalid_welfare_debt_accounting_link',
        severity: 'error',
        detail: `Integrated health bundle ${id || '(unknown)'} has invalid welfare-debt accounting link.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (seenDebtRefs.has(debtRef)) {
      pushIssue(issues, {
        code: 'duplicate_welfare_debt_ref',
        severity: 'error',
        detail: `Integrated health bundle ${id || '(unknown)'} has duplicate welfare-debt ref ${debtRef}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    seenDebtRefs.add(debtRef)
  }
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

  validateMedicationRegimenLinks(issues, id, bundle.medicationRegimenLinks)
  validateCustodyStatusLinks(issues, id, bundle.custodyStatusLinks)
  validateWelfareDebtAccountingLinks(issues, id, bundle.welfareDebtAccountingLinks)

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

function sanitizeMedicationRegimenLinkEntry(value: unknown): MedicationRegimenLink | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const regimenRef = normalizeToken(value.regimenRef)
  const wiredRef = normalizeToken(value.wiredRef)
  const consentStatus = value.consentStatus
  const deliveryVector = normalizeToken(value.deliveryVector)
  const interactionRiskScore = value.interactionRiskScore
  const adverseReactionFlag = value.adverseReactionFlag

  if (
    !regimenRef ||
    !wiredRef ||
    typeof consentStatus !== 'string' ||
    !isMedicationConsentStatus(consentStatus) ||
    !deliveryVector ||
    typeof adverseReactionFlag !== 'boolean'
  ) {
    return null
  }

  const resolvedInteractionRiskScore =
    interactionRiskScore === null
      ? null
      : isValidUnitScore(interactionRiskScore)
        ? interactionRiskScore
        : null

  return Object.freeze({
    regimenRef,
    wiredRef,
    consentStatus,
    deliveryVector,
    interactionRiskScore: resolvedInteractionRiskScore,
    adverseReactionFlag,
  })
}

function sanitizeCustodyStatusLinkEntry(value: unknown): CustodyStatusLink | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const custodyRef = normalizeToken(value.custodyRef)
  const wiredRef = normalizeToken(value.wiredRef)
  const custodyStage = value.custodyStage
  const formerRoleCategory = normalizeToken(value.formerRoleCategory)
  const restrictionLevel = normalizeToken(value.restrictionLevel)
  const rightsReviewPending = value.rightsReviewPending

  if (
    !custodyRef ||
    !wiredRef ||
    typeof custodyStage !== 'string' ||
    !isCustodyStage(custodyStage) ||
    !formerRoleCategory ||
    !restrictionLevel ||
    typeof rightsReviewPending !== 'boolean'
  ) {
    return null
  }

  return Object.freeze({
    custodyRef,
    wiredRef,
    custodyStage,
    formerRoleCategory,
    restrictionLevel,
    rightsReviewPending,
  })
}

function sanitizeWelfareDebtAccountingLinkEntry(value: unknown): WelfareDebtAccountingLink | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const debtRef = normalizeToken(value.debtRef)
  const wiredRef = normalizeToken(value.wiredRef)
  const severityBand = value.severityBand
  const mitigationState = value.mitigationState
  const containmentBenefitScore = value.containmentBenefitScore

  if (
    !debtRef ||
    !wiredRef ||
    typeof severityBand !== 'string' ||
    !isWelfareDebtSeverityBand(severityBand) ||
    typeof mitigationState !== 'string' ||
    !isWelfareDebtMitigationState(mitigationState)
  ) {
    return null
  }

  const resolvedContainmentBenefitScore =
    containmentBenefitScore === null
      ? null
      : isValidUnitScore(containmentBenefitScore)
        ? containmentBenefitScore
        : null

  return Object.freeze({
    debtRef,
    wiredRef,
    severityBand,
    mitigationState,
    containmentBenefitScore: resolvedContainmentBenefitScore,
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

  const medicationLinks = (Array.isArray(value.medicationRegimenLinks)
    ? value.medicationRegimenLinks
    : []
  )
    .map((entry) => sanitizeMedicationRegimenLinkEntry(entry))
    .filter((entry): entry is MedicationRegimenLink => entry !== null)

  const custodyLinks = (Array.isArray(value.custodyStatusLinks) ? value.custodyStatusLinks : [])
    .map((entry) => sanitizeCustodyStatusLinkEntry(entry))
    .filter((entry): entry is CustodyStatusLink => entry !== null)

  const welfareDebtLinks = (Array.isArray(value.welfareDebtAccountingLinks)
    ? value.welfareDebtAccountingLinks
    : []
  )
    .map((entry) => sanitizeWelfareDebtAccountingLinkEntry(entry))
    .filter((entry): entry is WelfareDebtAccountingLink => entry !== null)

  const humaneCareRiskScore = value.humaneCareRiskScore
  const confidence = value.confidence
  const unknownFields = parseStringList(value.unknownFields)
  const redactedFields = parseStringList(value.redactedFields)

  const bundle: ContainedPersonIntegratedHealthBundle = {
    id,
    label,
    subjectRef,
    ...(links.length > 0 ? { therapeuticCareScheduleLinks: Object.freeze(links) } : {}),
    ...(medicationLinks.length > 0 ? { medicationRegimenLinks: Object.freeze(medicationLinks) } : {}),
    ...(custodyLinks.length > 0 ? { custodyStatusLinks: Object.freeze(custodyLinks) } : {}),
    ...(welfareDebtLinks.length > 0
      ? { welfareDebtAccountingLinks: Object.freeze(welfareDebtLinks) }
      : {}),
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

// ---------------------------------------------------------------------------
// Fixtures (tests / planning mirror)
// ---------------------------------------------------------------------------

/** Bundle paired with staff-exclusion support-duty coercive protocol (subject-09). */
export const INTEGRATED_HEALTH_BUNDLE_STAFF_EXCLUSION_TENSION_FIXTURE: ContainedPersonIntegratedHealthBundle =
  Object.freeze({
    id: 'subject:contained-support-personnel-09',
    label: 'Contained support personnel 09 integrated health bundle',
    subjectRef: 'subject:contained-support-personnel-09',
    mentalStateBand: 'strained',
    humaneCareRiskScore: 0.41,
    therapeuticCareScheduleLinks: Object.freeze([
      Object.freeze({
        scheduleRef: 'care-schedule:support-personnel-peer-contact-suspended',
        wiredRef: 'therapeutic-care:care-schedule:support-personnel-peer-contact-suspended',
        careMode: 'cooperative_checkin',
        channelState: 'suspended',
        missedSessionStreak: 2,
        complianceRiskScore: 0.47,
        lockdownEscalationLikely: false,
      }),
    ]),
    custodyStatusLinks: Object.freeze([
      Object.freeze({
        custodyRef: 'custody-status:privilege-suspended-hold',
        wiredRef: 'custody-status:privilege-suspended-hold',
        custodyStage: 'contained_person',
        formerRoleCategory: 'support_personnel',
        restrictionLevel: 'elevated',
        rightsReviewPending: true,
      }),
    ]),
  })

/** Bundle paired with abusive surveillance-isolation coercive protocol (subject-22). */
export const INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE: ContainedPersonIntegratedHealthBundle =
  Object.freeze({
    id: 'subject:cooperative-field-asset-22',
    label: 'Cooperative field asset 22 integrated health bundle',
    subjectRef: 'subject:cooperative-field-asset-22',
    mentalStateBand: 'stable',
    humaneCareRiskScore: 0.12,
    therapeuticCareScheduleLinks: Object.freeze([
      Object.freeze({
        scheduleRef: 'care-schedule:cooperative-checkin-compliance-drift',
        wiredRef: 'therapeutic-care:care-schedule:cooperative-checkin-compliance-drift',
        careMode: 'cooperative_checkin',
        channelState: 'degraded',
        missedSessionStreak: 3,
        complianceRiskScore: 0.58,
        lockdownEscalationLikely: true,
      }),
    ]),
    custodyStatusLinks: Object.freeze([
      Object.freeze({
        custodyRef: 'custody-status:former-hostile-hold',
        wiredRef: 'custody-status:former-hostile-hold',
        custodyStage: 'contained_person',
        formerRoleCategory: 'hostile_actor',
        restrictionLevel: 'elevated',
        rightsReviewPending: true,
      }),
    ]),
  })

export const INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE: ContainedPersonIntegratedHealthBundle =
  Object.freeze({
    id: 'subject:contained-person-field-links',
    label: 'Contained person with medication, custody, and welfare-debt links',
    subjectRef: 'subject:contained-person-field-links',
    mentalStateBand: 'strained',
    humaneCareRiskScore: 0.35,
    medicationRegimenLinks: Object.freeze([
      Object.freeze({
        regimenRef: 'medication-regimen:stabilizer-alpha',
        wiredRef: 'medication-regimen:stabilizer-alpha',
        consentStatus: 'compelled',
        deliveryVector: 'oral',
        interactionRiskScore: 0.42,
        adverseReactionFlag: false,
      }),
    ]),
    custodyStatusLinks: Object.freeze([
      Object.freeze({
        custodyRef: 'custody-status:former-hostile-hold',
        wiredRef: 'custody-status:former-hostile-hold',
        custodyStage: 'contained_person',
        formerRoleCategory: 'hostile_actor',
        restrictionLevel: 'elevated',
        rightsReviewPending: true,
      }),
    ]),
    welfareDebtAccountingLinks: Object.freeze([
      Object.freeze({
        debtRef: 'welfare-debt:coercive-restraint-ledger-12',
        wiredRef: 'welfare-debt:coercive-restraint-ledger-12',
        severityBand: 'high',
        mitigationState: 'unresolved',
        containmentBenefitScore: 0.71,
      }),
    ]),
  })
