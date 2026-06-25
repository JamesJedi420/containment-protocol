/**
 * SPE-1046: durable person-status evidence records. Persistence substrate only;
 * projection composes the existing read-only SPE-1046 evaluators.
 */

import {
  evaluateAffiliationDualLoyaltyRisk,
  AFFILIATION_LOYALTY_ANCHORS,
  type AffiliationDualLoyaltyDecision,
  type AffiliationLoyaltyAnchor,
} from './affiliationDualLoyaltyRisk'
import {
  evaluateAffiliationOnboardingReadiness,
  type AffiliationOnboardingDecision,
  type AffiliationOnboardingStage,
} from './affiliationOnboardingReadiness'
import {
  evaluateAffiliationProtectedStatusAction,
  AFFILIATION_PROTECTED_ACTIONS,
  AFFILIATION_PROTECTED_STATUSES,
  type AffiliationProtectedAction,
  type AffiliationProtectedActionDecision,
  type AffiliationProtectedStatus,
} from './affiliationProtectedStatusActions'
import {
  AFFILIATION_REVOCATION_CAUSES,
  AFFILIATION_REVOCATION_KINDS,
  evaluateAffiliationRevocationOutcome,
  type AffiliationRevocationCause,
  type AffiliationRevocationDecision,
  type AffiliationRevocationKind,
  type AffiliationTrustOutcome,
} from './affiliationRevocationOutcomes'
import {
  evaluateAffiliationSiteClearance,
  type AffiliationSiteClearanceBoundary,
  type AffiliationSiteClearanceDecision,
  type AffiliationSiteLayer,
} from './affiliationSiteClearance'
import {
  evaluateEntityWelfareStatusPermissionSet,
  ENTITY_WELFARE_PERMISSION_SURFACES,
  type EntityWelfarePermissionDecision,
  type EntityWelfarePermissionSurface,
} from './entityWelfareStatusPermissions'
import type {
  EntityWelfareReclassificationRecord,
  EntityWelfareReclassificationRecordsMap,
} from './entityWelfareReclassificationRegistry'
import type { Candidate } from './recruitment'

export type AffiliationPersonStatusRecordId = string

export interface AffiliationPersonStatusRecord {
  readonly id: AffiliationPersonStatusRecordId
  readonly subjectId: string
  readonly subjectLabel: string
  readonly candidateRef?: string
  readonly entityWelfareReclassificationRef?: string
  readonly backgroundCleared?: boolean
  readonly trainingCompleted?: boolean
  readonly oathContractSigned?: boolean
  readonly permissionSurface?: EntityWelfarePermissionSurface
  readonly siteId?: string
  readonly siteLabel?: string
  readonly facilityId?: string
  readonly facilityLabel?: string
  readonly siteBoundary?: AffiliationSiteClearanceBoundary
  readonly siteLayer?: AffiliationSiteLayer
  readonly minimumOnboardingStage?: AffiliationOnboardingStage
  readonly grantedSiteIds?: readonly string[]
  readonly restrictedSiteIds?: readonly string[]
  readonly blockedSiteIds?: readonly string[]
  readonly grantedFacilityIds?: readonly string[]
  readonly restrictedFacilityIds?: readonly string[]
  readonly blockedFacilityIds?: readonly string[]
  readonly primaryLoyaltyAnchor?: AffiliationLoyaltyAnchor
  readonly secondaryLoyaltyAnchors?: readonly AffiliationLoyaltyAnchor[]
  readonly dualLoyaltyEvidenceTags?: readonly string[]
  readonly affiliationRefs?: readonly string[]
  readonly protectedStatus?: AffiliationProtectedStatus
  readonly protectedAction?: AffiliationProtectedAction
  readonly minor?: boolean
  readonly medicalHold?: boolean
  readonly careDutyActive?: boolean
  readonly dueProcessRequired?: boolean
  readonly protectedReviewEvidenceRefs?: readonly string[]
  readonly revocationKind?: AffiliationRevocationKind
  readonly revocationCause?: AffiliationRevocationCause
  readonly revocationAffectedSurfaces?: readonly EntityWelfarePermissionSurface[]
  readonly priorTrustBand?: AffiliationTrustOutcome
  readonly revocationReviewEvidenceRefs?: readonly string[]
}

export type AffiliationPersonStatusRecordsMap = Record<
  AffiliationPersonStatusRecordId,
  AffiliationPersonStatusRecord
>

export interface AffiliationPersonStatusProjectionInput {
  readonly record: AffiliationPersonStatusRecord
  readonly candidates?: readonly Candidate[] | Record<string, Candidate> | null
  readonly entityWelfareReclassificationRecords?: EntityWelfareReclassificationRecordsMap | null
}

export interface AffiliationPersonStatusSnapshot {
  readonly recordId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly candidateRef?: string
  readonly entityWelfareReclassificationRef?: string
  readonly permissionDecisions: readonly EntityWelfarePermissionDecision[]
  readonly onboardingDecision?: AffiliationOnboardingDecision
  readonly siteClearanceDecision: AffiliationSiteClearanceDecision
  readonly dualLoyaltyDecision: AffiliationDualLoyaltyDecision
  readonly protectedActionDecision: AffiliationProtectedActionDecision
  readonly revocationDecision: AffiliationRevocationDecision
  readonly reasonCodes: readonly string[]
}

const SITE_BOUNDARIES: readonly AffiliationSiteClearanceBoundary[] = [
  'site',
  'facility',
  'safehouse',
  'archive',
  'vault',
] as const

const SITE_LAYERS: readonly AffiliationSiteLayer[] = ['exterior', 'transition', 'interior'] as const

const ONBOARDING_STAGES: readonly AffiliationOnboardingStage[] = [
  'prospect',
  'contacted',
  'screening',
  'provisional',
  'cleared',
  'lost',
] as const

const TRUST_OUTCOMES: readonly AffiliationTrustOutcome[] = [
  'trusted',
  'watch',
  'restricted',
  'probation',
  'suspended',
  'revoked',
  'blocked',
] as const

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  )
}

function parseStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return uniqueSorted(value.map((entry) => normalizeToken(entry)))
}

function parseEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined
}

function parseEnumList<T extends string>(value: unknown, allowed: readonly T[]) {
  if (!Array.isArray(value)) {
    return []
  }

  return [...new Set(value.filter((entry): entry is T => allowed.includes(entry as T)))].sort(
    (left, right) => left.localeCompare(right)
  )
}

function sanitizeRecordEntry(
  value: unknown,
  expectedKey?: string
): AffiliationPersonStatusRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const subjectId = normalizeToken(value.subjectId)
  const subjectLabel = normalizeToken(value.subjectLabel)

  if (!id || !subjectId || !subjectLabel || (expectedKey !== undefined && expectedKey !== id)) {
    return null
  }

  const candidateRef = normalizeToken(value.candidateRef) || undefined
  const entityWelfareReclassificationRef =
    normalizeToken(value.entityWelfareReclassificationRef) || undefined
  const permissionSurface = parseEnum(value.permissionSurface, ENTITY_WELFARE_PERMISSION_SURFACES)
  const siteBoundary = parseEnum(value.siteBoundary, SITE_BOUNDARIES)
  const siteLayer = parseEnum(value.siteLayer, SITE_LAYERS)
  const minimumOnboardingStage = parseEnum(value.minimumOnboardingStage, ONBOARDING_STAGES)
  const primaryLoyaltyAnchor = parseEnum(value.primaryLoyaltyAnchor, AFFILIATION_LOYALTY_ANCHORS)
  const secondaryLoyaltyAnchors = parseEnumList(
    value.secondaryLoyaltyAnchors,
    AFFILIATION_LOYALTY_ANCHORS
  )
  const protectedStatus = parseEnum(value.protectedStatus, AFFILIATION_PROTECTED_STATUSES)
  const protectedAction = parseEnum(value.protectedAction, AFFILIATION_PROTECTED_ACTIONS)
  const revocationKind = parseEnum(value.revocationKind, AFFILIATION_REVOCATION_KINDS)
  const revocationCause = parseEnum(value.revocationCause, AFFILIATION_REVOCATION_CAUSES)
  const revocationAffectedSurfaces = parseEnumList(
    value.revocationAffectedSurfaces,
    ENTITY_WELFARE_PERMISSION_SURFACES
  )
  const priorTrustBand = parseEnum(value.priorTrustBand, TRUST_OUTCOMES)

  return {
    id,
    subjectId,
    subjectLabel,
    ...(candidateRef ? { candidateRef } : {}),
    ...(entityWelfareReclassificationRef ? { entityWelfareReclassificationRef } : {}),
    ...(normalizeBoolean(value.backgroundCleared) !== undefined
      ? { backgroundCleared: normalizeBoolean(value.backgroundCleared) }
      : {}),
    ...(normalizeBoolean(value.trainingCompleted) !== undefined
      ? { trainingCompleted: normalizeBoolean(value.trainingCompleted) }
      : {}),
    ...(normalizeBoolean(value.oathContractSigned) !== undefined
      ? { oathContractSigned: normalizeBoolean(value.oathContractSigned) }
      : {}),
    ...(permissionSurface ? { permissionSurface } : {}),
    ...(normalizeToken(value.siteId) ? { siteId: normalizeToken(value.siteId) } : {}),
    ...(normalizeToken(value.siteLabel) ? { siteLabel: normalizeToken(value.siteLabel) } : {}),
    ...(normalizeToken(value.facilityId) ? { facilityId: normalizeToken(value.facilityId) } : {}),
    ...(normalizeToken(value.facilityLabel)
      ? { facilityLabel: normalizeToken(value.facilityLabel) }
      : {}),
    ...(siteBoundary ? { siteBoundary } : {}),
    ...(siteLayer ? { siteLayer } : {}),
    ...(minimumOnboardingStage ? { minimumOnboardingStage } : {}),
    ...withStringList('grantedSiteIds', parseStringList(value.grantedSiteIds)),
    ...withStringList('restrictedSiteIds', parseStringList(value.restrictedSiteIds)),
    ...withStringList('blockedSiteIds', parseStringList(value.blockedSiteIds)),
    ...withStringList('grantedFacilityIds', parseStringList(value.grantedFacilityIds)),
    ...withStringList('restrictedFacilityIds', parseStringList(value.restrictedFacilityIds)),
    ...withStringList('blockedFacilityIds', parseStringList(value.blockedFacilityIds)),
    ...(primaryLoyaltyAnchor ? { primaryLoyaltyAnchor } : {}),
    ...(secondaryLoyaltyAnchors.length > 0 ? { secondaryLoyaltyAnchors } : {}),
    ...withStringList('dualLoyaltyEvidenceTags', parseStringList(value.dualLoyaltyEvidenceTags)),
    ...withStringList('affiliationRefs', parseStringList(value.affiliationRefs)),
    ...(protectedStatus ? { protectedStatus } : {}),
    ...(protectedAction ? { protectedAction } : {}),
    ...(normalizeBoolean(value.minor) !== undefined
      ? { minor: normalizeBoolean(value.minor) }
      : {}),
    ...(normalizeBoolean(value.medicalHold) !== undefined
      ? { medicalHold: normalizeBoolean(value.medicalHold) }
      : {}),
    ...(normalizeBoolean(value.careDutyActive) !== undefined
      ? { careDutyActive: normalizeBoolean(value.careDutyActive) }
      : {}),
    ...(normalizeBoolean(value.dueProcessRequired) !== undefined
      ? { dueProcessRequired: normalizeBoolean(value.dueProcessRequired) }
      : {}),
    ...withStringList(
      'protectedReviewEvidenceRefs',
      parseStringList(value.protectedReviewEvidenceRefs)
    ),
    ...(revocationKind ? { revocationKind } : {}),
    ...(revocationCause ? { revocationCause } : {}),
    ...(revocationAffectedSurfaces.length > 0 ? { revocationAffectedSurfaces } : {}),
    ...(priorTrustBand ? { priorTrustBand } : {}),
    ...withStringList(
      'revocationReviewEvidenceRefs',
      parseStringList(value.revocationReviewEvidenceRefs)
    ),
  }
}

function withStringList<K extends keyof AffiliationPersonStatusRecord>(
  key: K,
  values: readonly string[]
) {
  return values.length > 0 ? { [key]: values } : {}
}

/** Hydration: canonical person-status map keyed by record id; drops invalid entries. */
export function sanitizeAffiliationPersonStatusRecords(
  value: unknown,
  fallback: AffiliationPersonStatusRecordsMap = {}
): AffiliationPersonStatusRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: AffiliationPersonStatusRecordsMap = {}
  const seenIds = new Set<string>()

  for (const [key, entry] of Object.entries(value)) {
    const record = sanitizeRecordEntry(entry, key)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

function listCandidates(candidates: AffiliationPersonStatusProjectionInput['candidates']) {
  if (Array.isArray(candidates)) {
    return candidates
  }

  if (isPlainRecord(candidates)) {
    return Object.values(candidates).filter((candidate): candidate is Candidate =>
      isPlainRecord(candidate)
    )
  }

  return []
}

function findCandidate(
  candidates: AffiliationPersonStatusProjectionInput['candidates'],
  candidateRef: string | undefined
) {
  if (!candidateRef) {
    return undefined
  }

  return listCandidates(candidates).find((candidate) => candidate.id === candidateRef)
}

function findWelfareRecord(
  records: EntityWelfareReclassificationRecordsMap | null | undefined,
  recordRef: string | undefined
): EntityWelfareReclassificationRecord | undefined {
  if (!recordRef) {
    return undefined
  }

  return records?.[recordRef]
}

function onboardingContext(record: AffiliationPersonStatusRecord) {
  const candidateId = record.candidateRef

  return {
    ...(candidateId && record.backgroundCleared === true
      ? { backgroundClearedCandidateIds: [candidateId] }
      : {}),
    ...(candidateId && record.trainingCompleted === true
      ? { trainingCompletedCandidateIds: [candidateId] }
      : {}),
    ...(candidateId && record.oathContractSigned === true
      ? { oathContractCandidateIds: [candidateId] }
      : {}),
  }
}

function firstPermissionDecision(
  decisions: readonly EntityWelfarePermissionDecision[],
  surface: EntityWelfarePermissionSurface
) {
  return decisions.find((decision) => decision.surface === surface)
}

export function projectAffiliationPersonStatusSnapshot(
  input: AffiliationPersonStatusProjectionInput
): AffiliationPersonStatusSnapshot {
  const { record } = input
  const candidate = findCandidate(input.candidates, record.candidateRef)
  const welfareRecord = findWelfareRecord(
    input.entityWelfareReclassificationRecords,
    record.entityWelfareReclassificationRef
  )
  const reasonCodes: string[] = []

  if (record.candidateRef && !candidate) {
    reasonCodes.push('missing_candidate_ref')
  }

  if (record.entityWelfareReclassificationRef && !welfareRecord) {
    reasonCodes.push('missing_entity_welfare_reclassification_ref')
  }

  const permissionDecisions = welfareRecord
    ? evaluateEntityWelfareStatusPermissionSet(welfareRecord)
    : Object.freeze([] as EntityWelfarePermissionDecision[])
  const permissionSurface = record.permissionSurface ?? 'mission'
  const permissionDecision = firstPermissionDecision(permissionDecisions, permissionSurface)
  const onboardingDecision = candidate
    ? evaluateAffiliationOnboardingReadiness(candidate, onboardingContext(record))
    : undefined
  const siteClearanceDecision = evaluateAffiliationSiteClearance({
    subjectId: record.subjectId,
    subjectLabel: record.subjectLabel,
    surface: permissionSurface,
    context: {
      boundary: record.siteBoundary,
      siteId: record.siteId,
      siteLabel: record.siteLabel,
      facilityId: record.facilityId,
      facilityLabel: record.facilityLabel,
      siteLayer: record.siteLayer,
      grantedSiteIds: record.grantedSiteIds,
      restrictedSiteIds: record.restrictedSiteIds,
      blockedSiteIds: record.blockedSiteIds,
      grantedFacilityIds: record.grantedFacilityIds,
      restrictedFacilityIds: record.restrictedFacilityIds,
      blockedFacilityIds: record.blockedFacilityIds,
      minimumOnboardingStage: record.minimumOnboardingStage,
    },
    onboardingDecision,
    basePermissionDecision: permissionDecision,
  })
  const dualLoyaltyDecision = evaluateAffiliationDualLoyaltyRisk({
    subjectId: record.subjectId,
    subjectLabel: record.subjectLabel,
    primaryAnchor: record.primaryLoyaltyAnchor,
    secondaryAnchors: record.secondaryLoyaltyAnchors,
    onboardingDecision,
    siteClearanceDecision,
    evidenceTags: record.dualLoyaltyEvidenceTags,
    affiliationRefs: record.affiliationRefs,
  })
  const protectedActionDecision = evaluateAffiliationProtectedStatusAction({
    subjectId: record.subjectId,
    subjectLabel: record.subjectLabel,
    protectedStatus: record.protectedStatus,
    action: record.protectedAction,
    minor: record.minor,
    medicalHold: record.medicalHold,
    careDutyActive: record.careDutyActive,
    dueProcessRequired: record.dueProcessRequired,
    reviewEvidenceRefs: record.protectedReviewEvidenceRefs,
    permissionDecision,
    onboardingDecision,
    siteClearanceDecision,
    dualLoyaltyDecision,
  })
  const revocationDecision = evaluateAffiliationRevocationOutcome({
    subjectId: record.subjectId,
    subjectLabel: record.subjectLabel,
    kind: record.revocationKind,
    cause: record.revocationCause,
    affectedSurfaces: record.revocationAffectedSurfaces,
    priorTrustBand: record.priorTrustBand,
    reviewEvidenceRefs: record.revocationReviewEvidenceRefs,
    permissionDecision,
    onboardingDecision,
    siteClearanceDecision,
    dualLoyaltyDecision,
    protectedActionDecision,
  })

  return Object.freeze({
    recordId: record.id,
    subjectId: record.subjectId,
    subjectLabel: record.subjectLabel,
    ...(record.candidateRef ? { candidateRef: record.candidateRef } : {}),
    ...(record.entityWelfareReclassificationRef
      ? { entityWelfareReclassificationRef: record.entityWelfareReclassificationRef }
      : {}),
    permissionDecisions,
    ...(onboardingDecision ? { onboardingDecision } : {}),
    siteClearanceDecision,
    dualLoyaltyDecision,
    protectedActionDecision,
    revocationDecision,
    reasonCodes: Object.freeze(
      uniqueSorted([
        ...reasonCodes,
        ...siteClearanceDecision.reasonCodes,
        ...dualLoyaltyDecision.reasonCodes,
        ...protectedActionDecision.reasonCodes,
        ...revocationDecision.reasonCodes,
      ])
    ),
  })
}

export function projectAffiliationPersonStatusSnapshots(input: {
  readonly records: AffiliationPersonStatusRecordsMap | null | undefined
  readonly candidates?: readonly Candidate[] | Record<string, Candidate> | null
  readonly entityWelfareReclassificationRecords?: EntityWelfareReclassificationRecordsMap | null
}): readonly AffiliationPersonStatusSnapshot[] {
  const records = input.records ?? {}

  return Object.freeze(
    Object.keys(records)
      .sort((left, right) => left.localeCompare(right))
      .map((recordId) =>
        projectAffiliationPersonStatusSnapshot({
          record: records[recordId],
          candidates: input.candidates,
          entityWelfareReclassificationRecords: input.entityWelfareReclassificationRecords,
        })
      )
  )
}

function defineRecord(record: AffiliationPersonStatusRecord): AffiliationPersonStatusRecord {
  return Object.freeze({ ...record })
}

export const COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE: AffiliationPersonStatusRecord =
  defineRecord({
    id: 'person-status:cooperative-contractor-cleared',
    subjectId: 'subject:cooperative-contractor',
    subjectLabel: 'Cooperative Contractor',
    candidateRef: 'candidate:cooperative-contractor',
    entityWelfareReclassificationRef: 'reclass:field-observation-custody-shift',
    backgroundCleared: true,
    trainingCompleted: true,
    oathContractSigned: true,
    permissionSurface: 'mission',
    siteId: 'site:annex-7',
    siteLabel: 'Annex 7',
    facilityId: 'facility:briefing-room',
    facilityLabel: 'Briefing Room',
    siteBoundary: 'facility',
    siteLayer: 'interior',
    grantedSiteIds: ['site:annex-7'],
    grantedFacilityIds: ['facility:briefing-room'],
    primaryLoyaltyAnchor: 'agency',
    secondaryLoyaltyAnchors: ['academic'],
    protectedStatus: 'contractor',
    protectedAction: 'assign_mission',
    revocationKind: 'probation',
    revocationCause: 'policy_violation',
    revocationAffectedSurfaces: ['mission'],
    priorTrustBand: 'watch',
    revocationReviewEvidenceRefs: ['review:probation-briefing'],
  })

export const RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE: AffiliationPersonStatusRecord =
  defineRecord({
    id: 'person-status:rival-patron-risk',
    subjectId: 'subject:rival-patron-risk',
    subjectLabel: 'Rival Patron Risk',
    entityWelfareReclassificationRef: 'reclass:apex-threat-behavior-reassessment',
    permissionSurface: 'mission',
    primaryLoyaltyAnchor: 'agency',
    secondaryLoyaltyAnchors: ['patron', 'rival_containment'],
    dualLoyaltyEvidenceTags: ['dual_loyalty:restricted'],
    protectedStatus: 'compromised_person',
    protectedAction: 'assign_mission',
    revocationKind: 'clearance_review',
    revocationCause: 'dual_loyalty',
    revocationAffectedSurfaces: ['file', 'gear', 'mission'],
    priorTrustBand: 'restricted',
  })
