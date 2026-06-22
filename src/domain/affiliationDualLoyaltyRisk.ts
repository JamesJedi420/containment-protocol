/**
 * SPE-1046: pure dual-loyalty risk substrate over read-only affiliation
 * evidence. No persistence, weekly mutation, UI surfacing, or enforcement.
 */

import type { AffiliationOnboardingDecision } from './affiliationOnboardingReadiness'
import type { AffiliationSiteClearanceDecision } from './affiliationSiteClearance'
import {
  ENTITY_WELFARE_PERMISSION_SURFACES,
  type EntityWelfarePermissionSurface,
} from './entityWelfareStatusPermissions'

export type AffiliationLoyaltyAnchor =
  | 'agency'
  | 'civic'
  | 'family'
  | 'medical'
  | 'religious'
  | 'academic'
  | 'criminal'
  | 'occult'
  | 'rival_containment'
  | 'patron'
  | 'unknown'

export const AFFILIATION_LOYALTY_ANCHORS: readonly AffiliationLoyaltyAnchor[] = [
  'agency',
  'civic',
  'family',
  'medical',
  'religious',
  'academic',
  'criminal',
  'occult',
  'rival_containment',
  'patron',
  'unknown',
] as const

export type AffiliationDualLoyaltyRiskLevel = 'none' | 'watch' | 'restricted' | 'blocked'

export interface AffiliationDualLoyaltyRiskInput {
  readonly subjectId?: string
  readonly subjectLabel?: string
  readonly primaryAnchor?: AffiliationLoyaltyAnchor
  readonly secondaryAnchors?: readonly AffiliationLoyaltyAnchor[]
  readonly onboardingDecision?: AffiliationOnboardingDecision
  readonly siteClearanceDecision?: AffiliationSiteClearanceDecision
  readonly evidenceTags?: readonly string[]
  readonly affiliationRefs?: readonly string[]
}

export interface AffiliationDualLoyaltyDecision {
  readonly subjectId: string
  readonly subjectLabel: string
  readonly primaryAnchor: AffiliationLoyaltyAnchor
  readonly primaryAnchorLabel: string
  readonly secondaryAnchors: readonly AffiliationLoyaltyAnchor[]
  readonly secondaryAnchorLabels: readonly string[]
  readonly riskLevel: AffiliationDualLoyaltyRiskLevel
  readonly riskLevelLabel: string
  readonly decisionLabel: string
  readonly restrictedSurfaces: readonly EntityWelfarePermissionSurface[]
  readonly restrictedSurfaceLabels: readonly string[]
  readonly evidenceTags: readonly string[]
  readonly affiliationRefs: readonly string[]
  readonly reasonCodes: readonly string[]
}

type DualLoyaltyInputLike = Partial<AffiliationDualLoyaltyRiskInput> & Record<string, unknown>

const RISK_RANK: Readonly<Record<AffiliationDualLoyaltyRiskLevel, number>> = {
  none: 0,
  watch: 1,
  restricted: 2,
  blocked: 3,
} as const

const RESTRICTED_ANCHORS: ReadonlySet<AffiliationLoyaltyAnchor> = new Set([
  'criminal',
  'occult',
  'patron',
  'rival_containment',
])

const BENIGN_WATCH_ANCHORS: ReadonlySet<AffiliationLoyaltyAnchor> = new Set([
  'academic',
  'civic',
  'family',
  'medical',
  'religious',
  'unknown',
])

const BLOCKING_EVIDENCE_TAGS: ReadonlySet<string> = new Set([
  'conflict:hostile',
  'dual_loyalty:blocked',
  'evidence:hostile',
  'hostile',
  'loyalty:hostile',
])

const RESTRICTING_EVIDENCE_TAGS: ReadonlySet<string> = new Set([
  'civic_conflict',
  'conflict:civic_authority',
  'conflict:undisclosed_affiliation',
  'dual_loyalty:restricted',
  'split_loyalties',
])

const RESTRICTED_SURFACES: readonly EntityWelfarePermissionSurface[] = [
  'file',
  'gear',
  'mission',
] as const

function isRecord(value: unknown): value is DualLoyaltyInputLike {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeTag(value: unknown) {
  return normalizeToken(value).toLowerCase()
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  )
}

function uniqueAnchorOrder(values: readonly AffiliationLoyaltyAnchor[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function formatEnumLabel(value: string) {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? `${part[0]?.toUpperCase()}${part.slice(1)}` : part))
    .join(' ')
}

function coerceAnchor(anchor: unknown): AffiliationLoyaltyAnchor {
  return AFFILIATION_LOYALTY_ANCHORS.includes(anchor as AffiliationLoyaltyAnchor)
    ? (anchor as AffiliationLoyaltyAnchor)
    : 'unknown'
}

function normalizeAnchorList(values: unknown) {
  if (!Array.isArray(values)) {
    return []
  }

  return uniqueAnchorOrder(values.map((value) => coerceAnchor(value)))
}

function normalizeSubjectId(input: DualLoyaltyInputLike | null) {
  const subjectId = normalizeToken(input?.subjectId)
  return subjectId.length > 0 ? subjectId : 'subject:unknown'
}

function normalizeSubjectLabel(input: DualLoyaltyInputLike | null, subjectId: string) {
  const subjectLabel = normalizeToken(input?.subjectLabel)
  return subjectLabel.length > 0 ? subjectLabel : subjectId
}

function normalizeStringList(values: unknown) {
  if (!Array.isArray(values)) {
    return []
  }

  return uniqueSorted(values.map((value) => normalizeToken(value)))
}

function normalizeEvidenceTags(values: unknown) {
  if (!Array.isArray(values)) {
    return []
  }

  return uniqueSorted(values.map((value) => normalizeTag(value)))
}

function maxRisk(current: AffiliationDualLoyaltyRiskLevel, next: AffiliationDualLoyaltyRiskLevel) {
  return RISK_RANK[next] > RISK_RANK[current] ? next : current
}

function getValidationReasonCodes(
  input: DualLoyaltyInputLike | null,
  primaryAnchor: AffiliationLoyaltyAnchor,
  secondaryAnchors: readonly AffiliationLoyaltyAnchor[]
) {
  const reasonCodes: string[] = []

  if (!input) {
    return ['invalid_dual_loyalty_input']
  }

  if (!normalizeToken(input.subjectId)) {
    reasonCodes.push('missing_subject_id')
  }

  if (input.primaryAnchor !== undefined && input.primaryAnchor !== primaryAnchor) {
    reasonCodes.push('invalid_primary_anchor')
  }

  if (
    Array.isArray(input.secondaryAnchors) &&
    input.secondaryAnchors.some((anchor) => coerceAnchor(anchor) !== anchor)
  ) {
    reasonCodes.push('invalid_secondary_anchor')
  }

  if (secondaryAnchors.includes('unknown')) {
    reasonCodes.push('unknown_secondary_anchor')
  }

  return uniqueSorted(reasonCodes)
}

function resolveRisk(
  input: DualLoyaltyInputLike | null,
  primaryAnchor: AffiliationLoyaltyAnchor,
  secondaryAnchors: readonly AffiliationLoyaltyAnchor[],
  evidenceTags: readonly string[]
) {
  let riskLevel: AffiliationDualLoyaltyRiskLevel = 'none'
  const reasonCodes: string[] = []

  if (primaryAnchor === 'unknown') {
    riskLevel = maxRisk(riskLevel, 'watch')
    reasonCodes.push('unknown_primary_anchor_watch')
  }

  if (secondaryAnchors.length === 0) {
    reasonCodes.push('single_loyalty_anchor')
  }

  for (const anchor of secondaryAnchors) {
    if (anchor === primaryAnchor) {
      reasonCodes.push(`duplicate_${anchor}_anchor`)
      continue
    }

    if (RESTRICTED_ANCHORS.has(anchor) || RESTRICTED_ANCHORS.has(primaryAnchor)) {
      riskLevel = maxRisk(riskLevel, 'restricted')
      reasonCodes.push(`restricted_${anchor}_overlap`)
      continue
    }

    if (BENIGN_WATCH_ANCHORS.has(anchor)) {
      riskLevel = maxRisk(riskLevel, 'watch')
      reasonCodes.push(`benign_${anchor}_overlap_watch`)
    }
  }

  if (evidenceTags.some((tag) => BLOCKING_EVIDENCE_TAGS.has(tag))) {
    riskLevel = maxRisk(riskLevel, 'blocked')
    reasonCodes.push('hostile_evidence_blocked')
  } else if (evidenceTags.some((tag) => RESTRICTING_EVIDENCE_TAGS.has(tag))) {
    riskLevel = maxRisk(riskLevel, 'restricted')
    reasonCodes.push('conflict_evidence_restricted')
  }

  if (input?.siteClearanceDecision?.outcome === 'blocked') {
    riskLevel = maxRisk(riskLevel, 'blocked')
    reasonCodes.push('blocked_site_clearance')
  } else if (input?.siteClearanceDecision?.outcome === 'restricted') {
    riskLevel = maxRisk(riskLevel, 'restricted')
    reasonCodes.push('restricted_site_clearance')
  }

  if (input?.onboardingDecision?.stage === 'lost') {
    riskLevel = maxRisk(riskLevel, 'blocked')
    reasonCodes.push('lost_onboarding_blocked')
  } else if (input?.onboardingDecision && !input.onboardingDecision.fullAccessEligible) {
    riskLevel = maxRisk(riskLevel, 'watch')
    reasonCodes.push(`onboarding_${input.onboardingDecision.stage}_watch`)
  }

  return {
    riskLevel,
    reasonCodes: riskLevel === 'none' ? [...reasonCodes, 'no_dual_loyalty_risk'] : reasonCodes,
  }
}

function restrictedSurfacesForRisk(riskLevel: AffiliationDualLoyaltyRiskLevel) {
  if (riskLevel === 'blocked') {
    return ENTITY_WELFARE_PERMISSION_SURFACES
  }

  if (riskLevel === 'restricted') {
    return RESTRICTED_SURFACES
  }

  return []
}

export function evaluateAffiliationDualLoyaltyRisk(
  input: AffiliationDualLoyaltyRiskInput
): AffiliationDualLoyaltyDecision {
  const inputRecord = isRecord(input) ? input : null
  const subjectId = normalizeSubjectId(inputRecord)
  const subjectLabel = normalizeSubjectLabel(inputRecord, subjectId)
  const primaryAnchor = coerceAnchor(inputRecord?.primaryAnchor)
  const secondaryAnchors = normalizeAnchorList(inputRecord?.secondaryAnchors)
  const evidenceTags = normalizeEvidenceTags(inputRecord?.evidenceTags)
  const affiliationRefs = normalizeStringList(inputRecord?.affiliationRefs)
  const policy = resolveRisk(inputRecord, primaryAnchor, secondaryAnchors, evidenceTags)
  const restrictedSurfaces = restrictedSurfacesForRisk(policy.riskLevel)
  const validationReasonCodes = getValidationReasonCodes(
    inputRecord,
    primaryAnchor,
    secondaryAnchors
  )

  return Object.freeze({
    subjectId,
    subjectLabel,
    primaryAnchor,
    primaryAnchorLabel: formatEnumLabel(primaryAnchor),
    secondaryAnchors: Object.freeze(secondaryAnchors),
    secondaryAnchorLabels: Object.freeze(secondaryAnchors.map((anchor) => formatEnumLabel(anchor))),
    riskLevel: policy.riskLevel,
    riskLevelLabel: formatEnumLabel(policy.riskLevel),
    decisionLabel: `${subjectLabel}: ${formatEnumLabel(policy.riskLevel)}`,
    restrictedSurfaces: Object.freeze(restrictedSurfaces),
    restrictedSurfaceLabels: Object.freeze(
      restrictedSurfaces.map((surface) => formatEnumLabel(surface))
    ),
    evidenceTags: Object.freeze(evidenceTags),
    affiliationRefs: Object.freeze(affiliationRefs),
    reasonCodes: Object.freeze(uniqueSorted([...policy.reasonCodes, ...validationReasonCodes])),
  })
}

export function evaluateAffiliationDualLoyaltyRiskSet(
  inputs: readonly AffiliationDualLoyaltyRiskInput[]
): readonly AffiliationDualLoyaltyDecision[] {
  return Object.freeze(
    [...inputs]
      .map((input) => evaluateAffiliationDualLoyaltyRisk(input))
      .sort((left, right) => {
        const subjectOrder = left.subjectId.localeCompare(right.subjectId)
        if (subjectOrder !== 0) return subjectOrder

        const primaryOrder = left.primaryAnchor.localeCompare(right.primaryAnchor)
        if (primaryOrder !== 0) return primaryOrder

        return left.secondaryAnchors.join('|').localeCompare(right.secondaryAnchors.join('|'))
      })
  )
}
