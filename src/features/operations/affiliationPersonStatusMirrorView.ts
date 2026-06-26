import type { GameState } from '../../domain/models'
import {
  projectAffiliationPersonStatusSnapshots,
  type AffiliationPersonStatusSnapshot,
} from '../../domain/affiliationPersonStatusRecords'
import type { EntityWelfarePermissionDecision } from '../../domain/entityWelfareStatusPermissions'

export interface AffiliationPersonStatusMirrorRecordView {
  id: string
  subjectLabel: string
  subjectId: string
  candidateRefLabel: string
  entityWelfareReclassificationRefLabel: string
  permissionDecisionLabels: readonly string[]
  fileAccessLabels: readonly string[]
  onboardingLabels: readonly string[]
  siteClearanceLabels: readonly string[]
  dualLoyaltyLabels: readonly string[]
  protectedStatusLabels: readonly string[]
  revocationLabels: readonly string[]
  reasonCodeLabels: readonly string[]
}

export interface AffiliationPersonStatusMirrorSummaryView {
  totalRecords: number
  candidateLinkedCount: number
  welfareLinkedCount: number
  restrictedOrBlockedCount: number
  missingReferenceCount: number
  week: number
}

export interface AffiliationPersonStatusMirrorView {
  isEmpty: boolean
  summary: AffiliationPersonStatusMirrorSummaryView
  records: readonly AffiliationPersonStatusMirrorRecordView[]
}

function emptyFallback(values: readonly string[]) {
  return values.length > 0 ? values : ['-']
}

function formatPermissionDecisionLabels(
  decisions: readonly EntityWelfarePermissionDecision[]
): readonly string[] {
  return Object.freeze(
    emptyFallback(decisions.map((decision) => `${decision.surfaceLabel}: ${decision.outcomeLabel}`))
  )
}

function formatFileAccessLabels(
  decisions: readonly EntityWelfarePermissionDecision[]
): readonly string[] {
  const decision = decisions.find((candidate) => candidate.surface === 'file')

  if (!decision) {
    return Object.freeze(['File access: -'])
  }

  const labels = [`File access: ${decision.outcomeLabel}`]

  if (decision.reasonCodes.length > 0) {
    labels.push(`Reasons: ${decision.reasonCodes.join(', ')}`)
  }

  return Object.freeze(labels)
}

function formatOnboardingLabels(snapshot: AffiliationPersonStatusSnapshot): readonly string[] {
  const decision = snapshot.onboardingDecision
  if (!decision) {
    return Object.freeze(['Candidate: -', 'Access: -'])
  }

  return Object.freeze([
    `Candidate: ${decision.candidateName}`,
    `Stage: ${decision.stageLabel}`,
    `Access: ${decision.fullAccessEligible ? 'Eligible' : 'Not eligible'}`,
  ])
}

function formatSiteClearanceLabels(snapshot: AffiliationPersonStatusSnapshot): readonly string[] {
  const decision = snapshot.siteClearanceDecision
  const labels = [
    `${decision.surfaceLabel}: ${decision.outcomeLabel}`,
    `${decision.boundaryLabel}: ${decision.siteSpecific ? 'Scoped' : 'Unscoped'}`,
    `Site: ${decision.siteLabel}`,
  ]

  if (decision.facilityId !== 'facility:unknown') {
    labels.push(`Facility: ${decision.facilityLabel}`)
  }

  return Object.freeze(labels)
}

function formatDualLoyaltyLabels(snapshot: AffiliationPersonStatusSnapshot): readonly string[] {
  const decision = snapshot.dualLoyaltyDecision
  const labels = [
    `Risk: ${decision.riskLevelLabel}`,
    `Primary: ${decision.primaryAnchorLabel}`,
    `Anchors: ${
      decision.secondaryAnchorLabels.length > 0
        ? decision.secondaryAnchorLabels.join(', ')
        : 'Agency only'
    }`,
  ]

  if (decision.restrictedSurfaceLabels.length > 0) {
    labels.push(`Restricted: ${decision.restrictedSurfaceLabels.join(', ')}`)
  }

  return Object.freeze(labels)
}

function formatProtectedStatusLabels(snapshot: AffiliationPersonStatusSnapshot): readonly string[] {
  const decision = snapshot.protectedActionDecision
  const labels = [`Status: ${decision.protectedStatusLabel}`, decision.decisionLabel]

  if (decision.restrictedSurfaceLabels.length > 0) {
    labels.push(`Restricted: ${decision.restrictedSurfaceLabels.join(', ')}`)
  }

  if (decision.requiredReviewGates.length > 0) {
    labels.push(`Review: ${decision.requiredReviewGates.join(', ')}`)
  }

  return Object.freeze(labels)
}

function formatRevocationLabels(snapshot: AffiliationPersonStatusSnapshot): readonly string[] {
  const decision = snapshot.revocationDecision
  const labels = [
    `Kind: ${decision.kindLabel}`,
    `Outcome: ${decision.outcomeLabel}`,
    `Trust: ${decision.trustOutcomeLabel}`,
  ]

  if (decision.blockedSurfaceLabels.length > 0) {
    labels.push(`Blocked: ${decision.blockedSurfaceLabels.join(', ')}`)
  }

  return Object.freeze(labels)
}

function hasRestrictedOrBlockedOutcome(snapshot: AffiliationPersonStatusSnapshot) {
  return (
    snapshot.permissionDecisions.some(
      (decision) => decision.outcome === 'restricted' || decision.outcome === 'blocked'
    ) ||
    snapshot.siteClearanceDecision.outcome === 'restricted' ||
    snapshot.siteClearanceDecision.outcome === 'blocked' ||
    snapshot.dualLoyaltyDecision.riskLevel === 'restricted' ||
    snapshot.dualLoyaltyDecision.riskLevel === 'blocked' ||
    snapshot.protectedActionDecision.outcome === 'restricted' ||
    snapshot.protectedActionDecision.outcome === 'blocked' ||
    snapshot.revocationDecision.outcome !== 'unchanged'
  )
}

function hasMissingReference(snapshot: AffiliationPersonStatusSnapshot) {
  return snapshot.reasonCodes.some((reasonCode) => reasonCode.startsWith('missing_'))
}

function toRecordView(
  snapshot: AffiliationPersonStatusSnapshot
): AffiliationPersonStatusMirrorRecordView {
  return Object.freeze({
    id: snapshot.recordId,
    subjectLabel: snapshot.subjectLabel,
    subjectId: snapshot.subjectId,
    candidateRefLabel: snapshot.candidateRef ?? '-',
    entityWelfareReclassificationRefLabel: snapshot.entityWelfareReclassificationRef ?? '-',
    permissionDecisionLabels: formatPermissionDecisionLabels(snapshot.permissionDecisions),
    fileAccessLabels: formatFileAccessLabels(snapshot.permissionDecisions),
    onboardingLabels: formatOnboardingLabels(snapshot),
    siteClearanceLabels: formatSiteClearanceLabels(snapshot),
    dualLoyaltyLabels: formatDualLoyaltyLabels(snapshot),
    protectedStatusLabels: formatProtectedStatusLabels(snapshot),
    revocationLabels: formatRevocationLabels(snapshot),
    reasonCodeLabels: Object.freeze(emptyFallback([...snapshot.reasonCodes])),
  })
}

/** Read-only mirror over hydrated `affiliationPersonStatusRecords`; does not re-validate dropped entries. */
export function getAffiliationPersonStatusMirrorView(
  game: GameState
): AffiliationPersonStatusMirrorView {
  const snapshots = projectAffiliationPersonStatusSnapshots({
    records: game.affiliationPersonStatusRecords,
    candidates: game.recruitmentPool ?? game.candidates,
    entityWelfareReclassificationRecords: game.entityWelfareReclassificationRecords,
  })
  let restrictedOrBlockedCount = 0
  let missingReferenceCount = 0

  for (const snapshot of snapshots) {
    if (hasRestrictedOrBlockedOutcome(snapshot)) {
      restrictedOrBlockedCount += 1
    }

    if (hasMissingReference(snapshot)) {
      missingReferenceCount += 1
    }
  }

  return Object.freeze({
    isEmpty: snapshots.length === 0,
    summary: Object.freeze({
      totalRecords: snapshots.length,
      candidateLinkedCount: snapshots.filter((snapshot) => snapshot.candidateRef).length,
      welfareLinkedCount: snapshots.filter((snapshot) => snapshot.entityWelfareReclassificationRef)
        .length,
      restrictedOrBlockedCount,
      missingReferenceCount,
      week: game.week,
    }),
    records: Object.freeze(snapshots.map((snapshot) => toRecordView(snapshot))),
  })
}
