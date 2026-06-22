/**
 * SPE-1046: pure site/facility clearance substrate over onboarding readiness
 * and status-class permission decisions. Read-only helper only; no GameState
 * persistence, weekly mutation, UI surfacing, or enforcement wiring.
 */

import type {
  AffiliationOnboardingDecision,
  AffiliationOnboardingStage,
} from './affiliationOnboardingReadiness'
import {
  ENTITY_WELFARE_PERMISSION_SURFACES,
  type EntityWelfarePermissionDecision,
  type EntityWelfarePermissionOutcome,
  type EntityWelfarePermissionSurface,
} from './entityWelfareStatusPermissions'

export type AffiliationSiteClearanceBoundary =
  | 'site'
  | 'facility'
  | 'safehouse'
  | 'archive'
  | 'vault'

export type AffiliationSiteLayer = 'exterior' | 'transition' | 'interior'

export interface AffiliationSiteClearanceContext {
  readonly boundary?: AffiliationSiteClearanceBoundary
  readonly siteId?: string
  readonly siteLabel?: string
  readonly facilityId?: string
  readonly facilityLabel?: string
  readonly siteLayer?: AffiliationSiteLayer
  readonly grantedSiteIds?: readonly string[]
  readonly restrictedSiteIds?: readonly string[]
  readonly blockedSiteIds?: readonly string[]
  readonly grantedFacilityIds?: readonly string[]
  readonly restrictedFacilityIds?: readonly string[]
  readonly blockedFacilityIds?: readonly string[]
  readonly minimumOnboardingStage?: AffiliationOnboardingStage
}

export interface AffiliationSiteClearanceInput {
  readonly subjectId?: string
  readonly subjectLabel?: string
  readonly surface: EntityWelfarePermissionSurface
  readonly context?: AffiliationSiteClearanceContext
  readonly onboardingDecision?: AffiliationOnboardingDecision
  readonly basePermissionDecision?: EntityWelfarePermissionDecision
}

export interface AffiliationSiteClearanceDecision {
  readonly subjectId: string
  readonly subjectLabel: string
  readonly surface: EntityWelfarePermissionSurface
  readonly surfaceLabel: string
  readonly outcome: EntityWelfarePermissionOutcome
  readonly outcomeLabel: string
  readonly decisionLabel: string
  readonly boundary: AffiliationSiteClearanceBoundary
  readonly boundaryLabel: string
  readonly siteId: string
  readonly siteLabel: string
  readonly facilityId: string
  readonly facilityLabel: string
  readonly siteLayer: AffiliationSiteLayer
  readonly siteLayerLabel: string
  readonly siteSpecific: boolean
  readonly reasonCodes: readonly string[]
}

type SiteClearanceInputLike = Partial<AffiliationSiteClearanceInput> & Record<string, unknown>

const AFFILIATION_SITE_CLEARANCE_BOUNDARIES: readonly AffiliationSiteClearanceBoundary[] = [
  'site',
  'facility',
  'safehouse',
  'archive',
  'vault',
] as const

const AFFILIATION_SITE_LAYERS: readonly AffiliationSiteLayer[] = [
  'exterior',
  'transition',
  'interior',
] as const

const ONBOARDING_STAGE_RANK: Readonly<Record<AffiliationOnboardingStage, number>> = {
  prospect: 0,
  contacted: 1,
  screening: 2,
  provisional: 3,
  cleared: 4,
  lost: -1,
} as const

function isRecord(value: unknown): value is SiteClearanceInputLike {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  )
}

function formatEnumLabel(value: string) {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? `${part[0]?.toUpperCase()}${part.slice(1)}` : part))
    .join(' ')
}

function toIdSet(values: readonly string[] | undefined) {
  return new Set((values ?? []).map((value) => value.trim()).filter((value) => value.length > 0))
}

function coerceSurface(surface: unknown): EntityWelfarePermissionSurface {
  return ENTITY_WELFARE_PERMISSION_SURFACES.includes(surface as EntityWelfarePermissionSurface)
    ? (surface as EntityWelfarePermissionSurface)
    : 'mission'
}

function coerceBoundary(boundary: unknown): AffiliationSiteClearanceBoundary {
  return AFFILIATION_SITE_CLEARANCE_BOUNDARIES.includes(
    boundary as AffiliationSiteClearanceBoundary
  )
    ? (boundary as AffiliationSiteClearanceBoundary)
    : 'site'
}

function coerceSiteLayer(siteLayer: unknown): AffiliationSiteLayer {
  return AFFILIATION_SITE_LAYERS.includes(siteLayer as AffiliationSiteLayer)
    ? (siteLayer as AffiliationSiteLayer)
    : 'transition'
}

function coerceMinimumStage(stage: unknown): AffiliationOnboardingStage {
  if (typeof stage !== 'string' || !(stage in ONBOARDING_STAGE_RANK) || stage === 'lost') {
    return 'cleared'
  }

  return stage as AffiliationOnboardingStage
}

function normalizeSubjectId(input: SiteClearanceInputLike | null) {
  const subjectId = normalizeToken(input?.subjectId)
  return subjectId.length > 0 ? subjectId : 'subject:unknown'
}

function normalizeSubjectLabel(input: SiteClearanceInputLike | null, subjectId: string) {
  const subjectLabel = normalizeToken(input?.subjectLabel)
  return subjectLabel.length > 0 ? subjectLabel : subjectId
}

function normalizeScopedId(value: unknown, fallback: string) {
  const token = normalizeToken(value)
  return token.length > 0 ? token : fallback
}

function normalizeScopedLabel(value: unknown, fallback: string) {
  const label = normalizeToken(value)
  return label.length > 0 ? label : fallback
}

function getValidationReasonCodes(
  input: SiteClearanceInputLike | null,
  surface: EntityWelfarePermissionSurface,
  boundary: AffiliationSiteClearanceBoundary,
  siteLayer: AffiliationSiteLayer
) {
  const reasonCodes: string[] = []

  if (!input) {
    return ['invalid_site_clearance_input']
  }

  if (!normalizeToken(input.subjectId)) {
    reasonCodes.push('missing_subject_id')
  }

  if (
    !ENTITY_WELFARE_PERMISSION_SURFACES.includes(input.surface as EntityWelfarePermissionSurface)
  ) {
    reasonCodes.push('invalid_permission_surface')
  }

  if (input.context?.boundary !== undefined && input.context.boundary !== boundary) {
    reasonCodes.push('invalid_site_clearance_boundary')
  }

  if (input.context?.siteLayer !== undefined && input.context.siteLayer !== siteLayer) {
    reasonCodes.push('invalid_site_layer')
  }

  return uniqueSorted(reasonCodes)
}

function hasMinimumOnboardingStage(
  decision: AffiliationOnboardingDecision | undefined,
  minimumStage: AffiliationOnboardingStage
) {
  if (!decision) {
    return false
  }

  if (decision.stage === 'lost') {
    return false
  }

  if (minimumStage === 'cleared') {
    return decision.stage === 'cleared' && decision.fullAccessEligible
  }

  return ONBOARDING_STAGE_RANK[decision.stage] >= ONBOARDING_STAGE_RANK[minimumStage]
}

function evaluateOutcome(
  input: SiteClearanceInputLike | null,
  subjectId: string,
  siteId: string,
  facilityId: string,
  siteLayer: AffiliationSiteLayer,
  minimumStage: AffiliationOnboardingStage
) {
  const context = input?.context ?? {}
  const reasonCodes: string[] = []
  const hasSiteScope = siteId !== 'site:unknown'
  const hasFacilityScope = facilityId !== 'facility:unknown'
  const siteSpecific = hasSiteScope || hasFacilityScope

  const blockedSiteIds = toIdSet(context.blockedSiteIds)
  const blockedFacilityIds = toIdSet(context.blockedFacilityIds)
  const restrictedSiteIds = toIdSet(context.restrictedSiteIds)
  const restrictedFacilityIds = toIdSet(context.restrictedFacilityIds)
  const grantedSiteIds = toIdSet(context.grantedSiteIds)
  const grantedFacilityIds = toIdSet(context.grantedFacilityIds)

  const siteBlocked = hasSiteScope && blockedSiteIds.has(siteId)
  const facilityBlocked = hasFacilityScope && blockedFacilityIds.has(facilityId)

  if (siteBlocked || facilityBlocked) {
    if (siteBlocked) reasonCodes.push('site_clearance_blocked')
    if (facilityBlocked) reasonCodes.push('facility_clearance_blocked')
    return { outcome: 'blocked' as const, reasonCodes, siteSpecific }
  }

  if (input?.onboardingDecision?.stage === 'lost') {
    return {
      outcome: 'blocked' as const,
      reasonCodes: ['onboarding_lost_clearance_blocked'],
      siteSpecific,
    }
  }

  if (input?.basePermissionDecision?.outcome === 'blocked') {
    return {
      outcome: 'blocked' as const,
      reasonCodes: ['base_permission_blocked'],
      siteSpecific,
    }
  }

  if (!siteSpecific) {
    return {
      outcome: 'restricted' as const,
      reasonCodes: ['missing_site_or_facility_scope'],
      siteSpecific,
    }
  }

  const siteRestricted = hasSiteScope && restrictedSiteIds.has(siteId)
  const facilityRestricted = hasFacilityScope && restrictedFacilityIds.has(facilityId)

  if (siteRestricted || facilityRestricted) {
    if (siteRestricted) reasonCodes.push('site_clearance_restricted')
    if (facilityRestricted) reasonCodes.push('facility_clearance_restricted')
    return { outcome: 'restricted' as const, reasonCodes, siteSpecific }
  }

  if (!hasMinimumOnboardingStage(input?.onboardingDecision, minimumStage)) {
    return {
      outcome: 'restricted' as const,
      reasonCodes: input?.onboardingDecision
        ? [`onboarding_${minimumStage}_clearance_required`]
        : ['missing_onboarding_clearance'],
      siteSpecific,
    }
  }

  const siteGranted = hasSiteScope && grantedSiteIds.has(siteId)
  const facilityGranted = hasFacilityScope && grantedFacilityIds.has(facilityId)

  if (!siteGranted && !facilityGranted) {
    return {
      outcome: 'restricted' as const,
      reasonCodes:
        siteLayer === 'interior'
          ? ['interior_site_clearance_required']
          : ['site_or_facility_grant_required'],
      siteSpecific,
    }
  }

  return {
    outcome: 'allowed' as const,
    reasonCodes: [
      facilityGranted ? 'facility_clearance_granted' : 'site_clearance_granted',
      subjectId === 'subject:unknown' ? 'unknown_subject_clearance' : 'subject_clearance_resolved',
      ...(input?.basePermissionDecision?.outcome === 'restricted'
        ? ['base_permission_restricted_observed']
        : []),
    ],
    siteSpecific,
  }
}

export function evaluateAffiliationSiteClearance(
  input: AffiliationSiteClearanceInput
): AffiliationSiteClearanceDecision {
  const inputRecord = isRecord(input) ? input : null
  const context = inputRecord?.context ?? {}
  const subjectId = normalizeSubjectId(inputRecord)
  const subjectLabel = normalizeSubjectLabel(inputRecord, subjectId)
  const surface = coerceSurface(inputRecord?.surface)
  const boundary = coerceBoundary(context.boundary)
  const siteLayer = coerceSiteLayer(context.siteLayer)
  const minimumStage = coerceMinimumStage(context.minimumOnboardingStage)
  const siteId = normalizeScopedId(context.siteId, 'site:unknown')
  const facilityId = normalizeScopedId(context.facilityId, 'facility:unknown')
  const siteLabel = normalizeScopedLabel(context.siteLabel, siteId)
  const facilityLabel = normalizeScopedLabel(context.facilityLabel, facilityId)
  const policy = evaluateOutcome(
    inputRecord,
    subjectId,
    siteId,
    facilityId,
    siteLayer,
    minimumStage
  )
  const validationReasonCodes = getValidationReasonCodes(inputRecord, surface, boundary, siteLayer)

  return Object.freeze({
    subjectId,
    subjectLabel,
    surface,
    surfaceLabel: formatEnumLabel(surface),
    outcome: policy.outcome,
    outcomeLabel: formatEnumLabel(policy.outcome),
    decisionLabel: `${formatEnumLabel(surface)}: ${formatEnumLabel(policy.outcome)}`,
    boundary,
    boundaryLabel: formatEnumLabel(boundary),
    siteId,
    siteLabel,
    facilityId,
    facilityLabel,
    siteLayer,
    siteLayerLabel: formatEnumLabel(siteLayer),
    siteSpecific: policy.siteSpecific,
    reasonCodes: Object.freeze(uniqueSorted([...policy.reasonCodes, ...validationReasonCodes])),
  })
}

export function evaluateAffiliationSiteClearanceSet(
  inputs: readonly AffiliationSiteClearanceInput[]
): readonly AffiliationSiteClearanceDecision[] {
  return Object.freeze(
    [...inputs]
      .map((input) => evaluateAffiliationSiteClearance(input))
      .sort((left, right) => {
        const subjectOrder = left.subjectId.localeCompare(right.subjectId)
        if (subjectOrder !== 0) return subjectOrder

        const siteOrder = left.siteId.localeCompare(right.siteId)
        if (siteOrder !== 0) return siteOrder

        const facilityOrder = left.facilityId.localeCompare(right.facilityId)
        if (facilityOrder !== 0) return facilityOrder

        return (
          ENTITY_WELFARE_PERMISSION_SURFACES.indexOf(left.surface) -
          ENTITY_WELFARE_PERMISSION_SURFACES.indexOf(right.surface)
        )
      })
  )
}
