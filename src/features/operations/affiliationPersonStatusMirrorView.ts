import type { GameState } from '../../domain/models'
import { buildAffiliationFileWorkQueueActionRecordId } from '../../domain/affiliationFileWorkQueueActionRecords'
import {
  buildAffiliationFileWorkQueueEvidenceRepairCandidates,
  buildAffiliationFileWorkQueueEvidenceResolutionRecordId,
} from '../../domain/affiliationFileWorkQueueEvidenceResolutionRecords'
import { buildAffiliationFileWorkQueueRepairActionRecordId } from '../../domain/affiliationFileWorkQueueRepairActionRecords'
import {
  buildAffiliationFileWorkQueueReleaseActionRecordId,
  getAffiliationFileWorkQueueReleaseActionForBucket,
  type AffiliationFileWorkQueueReleaseActionKind,
} from '../../domain/affiliationFileWorkQueueReleaseActionRecords'
import { buildAffiliationFileWorkQueueReleaseOutcomeRecordId } from '../../domain/affiliationFileWorkQueueReleaseOutcomeRecords'
import {
  buildAffiliationFileWorkQueueReleaseFulfillmentRecordId,
  getAffiliationFileWorkQueueReleaseFulfillmentForOutcome,
  type AffiliationFileWorkQueueReleaseFulfillmentKind,
} from '../../domain/affiliationFileWorkQueueReleaseFulfillmentRecords'
import {
  buildAffiliationFileWorkQueueReleasePackageRecordId,
  type AffiliationFileWorkQueueReleasePackageKind,
} from '../../domain/affiliationFileWorkQueueReleasePackageRecords'
import {
  buildAffiliationFileWorkQueueFileReleaseDeliveryRecordId,
  type AffiliationFileWorkQueueFileReleaseDeliveryRecord,
} from '../../domain/affiliationFileWorkQueueFileReleaseDeliveryRecords'
import {
  buildAffiliationFileWorkQueueNonMissionEnforcementRecordId,
  getAffiliationFileWorkQueueNonMissionEnforcementForBucket,
} from '../../domain/affiliationFileWorkQueueNonMissionEnforcementRecords'
import { buildAffiliationFileWorkQueueEvidenceRepairWorkflowId } from '../../domain/affiliationFileWorkQueueEvidenceRepairWorkflows'
import type { AffiliationFileWorkQueueReleaseOutcomeKind } from '../../domain/affiliationFileWorkQueueReleaseOutcomeRecords'
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
  roomAccessLabels: readonly string[]
  fileAccessLabels: readonly string[]
  facilityFileAccessLabels: readonly string[]
  housingAccessLabels: readonly string[]
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
  fileAccessWorkQueueCount: number
  fileAccessBlockedCount: number
  fileAccessRestrictedCount: number
  fileAccessMissingReviewCount: number
  week: number
}

export type AffiliationFileAccessWorkQueueBucket =
  | 'blocked'
  | 'restricted'
  | 'missing_review'
  | 'allowed'

export type AffiliationFileAccessRecommendedActionKind =
  | 'resolve_missing_review'
  | 'hold_blocked_access'
  | 'route_restricted_review'
  | 'monitor_allowed_access'

export interface AffiliationFileAccessRecommendedActionView {
  recommendedActionKind: AffiliationFileAccessRecommendedActionKind
  recommendedActionLabel: string
  recommendedActionDetail: string
}

export interface AffiliationFileAccessRepairCandidateView {
  reasonCode: string
  repairLabel: string
  isRepairActionRecorded: boolean
  repairActionLabel?: string
}

export interface AffiliationFileAccessWorkQueueEntryView {
  id: string
  subjectLabel: string
  subjectId: string
  bucket: AffiliationFileAccessWorkQueueBucket
  bucketLabel: string
  fileAccessLabel: string
  facilityFileAccessLabel: string
  siteLabel: string
  facilityLabel: string
  recommendedActionKind: AffiliationFileAccessRecommendedActionKind
  recommendedActionLabel: string
  recommendedActionDetail: string
  isRecommendedActionRecorded: boolean
  recordedActionLabel?: string
  canRecordEvidenceResolution: boolean
  isEvidenceResolutionRecorded: boolean
  evidenceResolutionLabel?: string
  evidenceRepairCandidates: readonly AffiliationFileAccessRepairCandidateView[]
  canRecordReleaseAction: boolean
  isReleaseActionRecorded: boolean
  releaseActionKind?: AffiliationFileWorkQueueReleaseActionKind
  releaseActionLabel?: string
  releaseActionStatusLabel?: string
  releaseActionButtonLabel?: string
  canRecordReleaseOutcome: boolean
  isReleaseOutcomeRecorded: boolean
  releaseOutcomeKind?: AffiliationFileWorkQueueReleaseOutcomeKind
  releaseOutcomeStatusLabel?: string
  releaseOutcomeButtonLabel?: string
  canRecordReleaseFulfillment: boolean
  isReleaseFulfillmentRecorded: boolean
  releaseFulfillmentKind?: AffiliationFileWorkQueueReleaseFulfillmentKind
  releaseFulfillmentSourceReasonCodes?: readonly string[]
  releaseFulfillmentStatusLabel?: string
  releaseFulfillmentButtonLabel?: string
  canRecordReleasePackage: boolean
  isReleasePackageRecorded: boolean
  releasePackageKind?: AffiliationFileWorkQueueReleasePackageKind
  releasePackageRef?: string
  releasePackageSourceReasonCodes?: readonly string[]
  releasePackageStatusLabel?: string
  releasePackageButtonLabel?: string
  canRecordFileReleaseDelivery: boolean
  isFileReleaseDeliveryRecorded: boolean
  fileReleaseDeliveryStatusLabel?: string
  fileReleaseDeliveryButtonLabel?: string
  canRecordNonMissionEnforcement: boolean
  isNonMissionEnforcementRecorded: boolean
  nonMissionEnforcementStatusLabel?: string
  nonMissionEnforcementButtonLabel?: string
  canRecordEvidenceRepairWorkflow: boolean
  isEvidenceRepairWorkflowRecorded: boolean
  evidenceRepairWorkflowStatusLabel?: string
  reasonCodeLabels: readonly string[]
}

export interface AffiliationPersonStatusMirrorView {
  isEmpty: boolean
  summary: AffiliationPersonStatusMirrorSummaryView
  fileAccessWorkQueue: readonly AffiliationFileAccessWorkQueueEntryView[]
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

function formatSurfaceAccessLabels(
  decisions: readonly EntityWelfarePermissionDecision[],
  surface: EntityWelfarePermissionDecision['surface'],
  label: string
): readonly string[] {
  const decision = decisions.find((candidate) => candidate.surface === surface)

  if (!decision) {
    return Object.freeze([`${label}: -`])
  }

  const labels = [`${label}: ${decision.outcomeLabel}`]

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

function formatFacilityFileAccessLabels(
  snapshot: AffiliationPersonStatusSnapshot
): readonly string[] {
  const decision = snapshot.facilityFileAccessDecision

  if (!decision) {
    return Object.freeze(['Facility file access: -'])
  }

  const labels = [decision.decisionLabel, `Site: ${decision.siteLabel}`]

  if (decision.facilityId !== 'facility:unknown') {
    labels.push(`Facility: ${decision.facilityLabel}`)
  }

  if (decision.reasonCodes.length > 0) {
    labels.push(`Reasons: ${decision.reasonCodes.join(', ')}`)
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
    snapshot.facilityFileAccessDecision?.outcome === 'restricted' ||
    snapshot.facilityFileAccessDecision?.outcome === 'blocked' ||
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

function formatFileAccessWorkQueueBucketLabel(bucket: AffiliationFileAccessWorkQueueBucket) {
  switch (bucket) {
    case 'blocked':
      return 'Blocked'
    case 'restricted':
      return 'Restricted'
    case 'missing_review':
      return 'Missing review'
    case 'allowed':
      return 'Allowed'
  }
}

function fileAccessWorkQueueBucketPriority(bucket: AffiliationFileAccessWorkQueueBucket) {
  switch (bucket) {
    case 'blocked':
      return 0
    case 'restricted':
      return 1
    case 'missing_review':
      return 2
    case 'allowed':
      return 3
  }
}

export function getFileAccessWorkQueueRecommendedAction(
  bucket: AffiliationFileAccessWorkQueueBucket
): AffiliationFileAccessRecommendedActionView {
  switch (bucket) {
    case 'missing_review':
      return Object.freeze({
        recommendedActionKind: 'resolve_missing_review',
        recommendedActionLabel: 'Resolve missing review',
        recommendedActionDetail:
          'Attach missing candidate, welfare, onboarding, file, or site evidence before evaluating access.',
      })
    case 'blocked':
      return Object.freeze({
        recommendedActionKind: 'hold_blocked_access',
        recommendedActionLabel: 'Hold access',
        recommendedActionDetail:
          'Resolve blocked file, site, or facility reason before moving this file workflow forward.',
      })
    case 'restricted':
      return Object.freeze({
        recommendedActionKind: 'route_restricted_review',
        recommendedActionLabel: 'Route restricted review',
        recommendedActionDetail:
          'Supervisor or review-gate handling is required before any file release.',
      })
    case 'allowed':
      return Object.freeze({
        recommendedActionKind: 'monitor_allowed_access',
        recommendedActionLabel: 'Monitor allowed access',
        recommendedActionDetail: 'Audit visibility only; no intervention is required.',
      })
  }
}

function fileAccessDecisionLabel(snapshot: AffiliationPersonStatusSnapshot) {
  const decision = snapshot.permissionDecisions.find((candidate) => candidate.surface === 'file')
  return decision ? `File access: ${decision.outcomeLabel}` : 'File access: -'
}

function toFileAccessWorkQueueEntry(
  snapshot: AffiliationPersonStatusSnapshot,
  game: GameState
): AffiliationFileAccessWorkQueueEntryView {
  const decision = snapshot.facilityFileAccessDecision
  const bucket: AffiliationFileAccessWorkQueueBucket = decision?.outcome ?? 'missing_review'
  const reasonCodes = decision
    ? decision.reasonCodes
    : snapshot.reasonCodes.filter((reasonCode) => reasonCode.startsWith('missing_'))
  const reasonCodeLabels =
    reasonCodes.length > 0 ? reasonCodes : ['missing_facility_file_access_decision']
  const recommendedAction = getFileAccessWorkQueueRecommendedAction(bucket)
  const recordedActionId = buildAffiliationFileWorkQueueActionRecordId({
    workQueueEntryId: snapshot.recordId,
    actionKind: recommendedAction.recommendedActionKind,
  })
  const recordedAction = game.affiliationFileWorkQueueActionRecords?.[recordedActionId]
  const missingReasonCodes = reasonCodeLabels.filter((reasonCode) =>
    reasonCode.startsWith('missing_')
  )
  const evidenceResolutionId = buildAffiliationFileWorkQueueEvidenceResolutionRecordId({
    workQueueEntryId: snapshot.recordId,
    missingReasonCodes,
  })
  const evidenceResolution =
    game.affiliationFileWorkQueueEvidenceResolutionRecords?.[evidenceResolutionId]
  const evidenceRepairCandidates = evidenceResolution
    ? buildAffiliationFileWorkQueueEvidenceRepairCandidates(
        evidenceResolution.missingReasonCodes
      ).map((candidate): AffiliationFileAccessRepairCandidateView => {
        const recordId = buildAffiliationFileWorkQueueRepairActionRecordId({
          workQueueEntryId: snapshot.recordId,
          reasonCode: candidate.reasonCode,
        })
        const record = game.affiliationFileWorkQueueRepairActionRecords?.[recordId]

        return Object.freeze({
          reasonCode: candidate.reasonCode,
          repairLabel: candidate.repairLabel,
          isRepairActionRecorded: Boolean(record),
          ...(record ? { repairActionLabel: `Repair recorded W${record.recordedWeek}` } : {}),
        })
      })
    : []
  const releaseAction = getAffiliationFileWorkQueueReleaseActionForBucket(bucket)
  const releaseActionRecordId = releaseAction
    ? buildAffiliationFileWorkQueueReleaseActionRecordId({
        workQueueEntryId: snapshot.recordId,
        actionKind: releaseAction.actionKind,
      })
    : ''
  const releaseActionRecord = releaseAction
    ? game.affiliationFileWorkQueueReleaseActionRecords?.[releaseActionRecordId]
    : undefined
  const releaseOutcomeRecordId = releaseActionRecord
    ? buildAffiliationFileWorkQueueReleaseOutcomeRecordId({
        workQueueEntryId: snapshot.recordId,
        sourceActionKind: releaseActionRecord.actionKind,
      })
    : ''
  const releaseOutcomeRecord = releaseActionRecord
    ? game.affiliationFileWorkQueueReleaseOutcomeRecords?.[releaseOutcomeRecordId]
    : undefined
  const releaseFulfillment =
    bucket === 'allowed' && releaseOutcomeRecord?.sourceBucket === 'allowed'
      ? getAffiliationFileWorkQueueReleaseFulfillmentForOutcome(releaseOutcomeRecord.outcomeKind)
      : null
  const releaseFulfillmentRecordId =
    releaseOutcomeRecord && releaseFulfillment
      ? buildAffiliationFileWorkQueueReleaseFulfillmentRecordId({
          workQueueEntryId: snapshot.recordId,
          sourceOutcomeKind: releaseOutcomeRecord.outcomeKind,
        })
      : ''
  const releaseFulfillmentRecord =
    releaseOutcomeRecord && releaseFulfillment
      ? game.affiliationFileWorkQueueReleaseFulfillmentRecords?.[releaseFulfillmentRecordId]
      : undefined
  const durableReleaseFulfillmentRecord =
    releaseFulfillmentRecord ??
    Object.values(game.affiliationFileWorkQueueReleaseFulfillmentRecords ?? {}).find(
      (record) => record.workQueueEntryId === snapshot.recordId
    )
  const releasePackageRecordId = durableReleaseFulfillmentRecord
    ? buildAffiliationFileWorkQueueReleasePackageRecordId({
        workQueueEntryId: snapshot.recordId,
        sourceFulfillmentKind: durableReleaseFulfillmentRecord.fulfillmentKind,
      })
    : ''
  const releasePackageRecord = durableReleaseFulfillmentRecord
    ? game.affiliationFileWorkQueueReleasePackageRecords?.[releasePackageRecordId]
    : undefined
  const fileReleaseDeliveryRecordId = releasePackageRecord
    ? buildAffiliationFileWorkQueueFileReleaseDeliveryRecordId({
        workQueueEntryId: snapshot.recordId,
        sourcePackageKind: releasePackageRecord.packageKind,
      })
    : ''
  const metadataFileReleaseDeliveryRecord = releasePackageRecord
    ? game.affiliationFileWorkQueueFileReleaseDeliveryRecords?.[fileReleaseDeliveryRecordId]
    : undefined
  const relatedFileReleaseDeliveries: readonly AffiliationFileWorkQueueFileReleaseDeliveryRecord[] =
    releasePackageRecord
      ? Object.values(game.affiliationFileWorkQueueFileReleaseDeliveryRecords ?? {}).filter(
          (record) =>
            record &&
            record.workQueueEntryId === snapshot.recordId &&
            record.sourcePackageKind === releasePackageRecord.packageKind &&
            record.sourcePackageRef === releasePackageRecord.packageRef
        )
      : []
  const fileReleaseDeliveryRecord =
    relatedFileReleaseDeliveries.find(
      (record) => record.deliveryKind === 'actual_file_content_release_delivered'
    ) ??
    relatedFileReleaseDeliveries.find(
      (record) => record.deliveryKind === 'metadata_only_file_release_delivered'
    ) ??
    metadataFileReleaseDeliveryRecord
  const hasMetadataFileReleaseDelivery = relatedFileReleaseDeliveries.some(
    (record) => record.deliveryKind === 'metadata_only_file_release_delivered'
  )
  const hasActualFileReleaseDelivery = relatedFileReleaseDeliveries.some(
    (record) => record.deliveryKind === 'actual_file_content_release_delivered'
  )
  const nonMissionEnforcement = getAffiliationFileWorkQueueNonMissionEnforcementForBucket(bucket)
  const nonMissionEnforcementRecordId = nonMissionEnforcement
    ? buildAffiliationFileWorkQueueNonMissionEnforcementRecordId({
        workQueueEntryId: snapshot.recordId,
        sourceBucket: bucket,
      })
    : ''
  const nonMissionEnforcementRecord = nonMissionEnforcement
    ? game.affiliationFileWorkQueueNonMissionEnforcementRecords?.[nonMissionEnforcementRecordId]
    : undefined

  const evidenceRepairWorkflowId = buildAffiliationFileWorkQueueEvidenceRepairWorkflowId({
    workQueueEntryId: snapshot.recordId,
    evidenceType: 'missing_entity_welfare_reclassification_ref',
  })
  const evidenceRepairWorkflow =
    game.affiliationFileWorkQueueEvidenceRepairWorkflows?.[evidenceRepairWorkflowId]

  return Object.freeze({
    id: snapshot.recordId,
    subjectLabel: snapshot.subjectLabel,
    subjectId: snapshot.subjectId,
    bucket,
    bucketLabel: formatFileAccessWorkQueueBucketLabel(bucket),
    fileAccessLabel: fileAccessDecisionLabel(snapshot),
    facilityFileAccessLabel: decision?.decisionLabel ?? 'Facility file access: -',
    siteLabel: decision ? `Site: ${decision.siteLabel}` : 'Site: -',
    facilityLabel: decision ? `Facility: ${decision.facilityLabel}` : 'Facility: -',
    ...recommendedAction,
    isRecommendedActionRecorded: Boolean(recordedAction),
    ...(recordedAction ? { recordedActionLabel: `Recorded W${recordedAction.recordedWeek}` } : {}),
    canRecordEvidenceResolution:
      bucket === 'missing_review' && missingReasonCodes.length > 0 && !evidenceResolution,
    isEvidenceResolutionRecorded: Boolean(evidenceResolution),
    ...(evidenceResolution
      ? {
          evidenceResolutionLabel: `Evidence resolution recorded W${evidenceResolution.recordedWeek}`,
        }
      : {}),
    evidenceRepairCandidates: Object.freeze(evidenceRepairCandidates),
    canRecordReleaseAction: Boolean(releaseAction && !releaseActionRecord),
    isReleaseActionRecorded: Boolean(releaseActionRecord),
    ...(releaseAction ? { releaseActionKind: releaseAction.actionKind } : {}),
    ...(releaseAction ? { releaseActionLabel: releaseAction.actionLabel } : {}),
    ...(releaseAction
      ? {
          releaseActionButtonLabel:
            releaseAction.actionKind === 'file_release_authorized'
              ? 'Record release'
              : 'Route restricted review',
        }
      : {}),
    ...(releaseActionRecord
      ? {
          releaseActionStatusLabel: `${releaseActionRecord.actionLabel} W${releaseActionRecord.recordedWeek}`,
        }
      : {}),
    canRecordReleaseOutcome: Boolean(releaseActionRecord && !releaseOutcomeRecord),
    isReleaseOutcomeRecorded: Boolean(releaseOutcomeRecord),
    ...(releaseOutcomeRecord ? { releaseOutcomeKind: releaseOutcomeRecord.outcomeKind } : {}),
    ...(releaseAction
      ? {
          releaseOutcomeButtonLabel:
            releaseAction.actionKind === 'file_release_authorized'
              ? 'Finalize release'
              : 'Record review hold',
        }
      : {}),
    ...(releaseOutcomeRecord
      ? {
          releaseOutcomeStatusLabel: `${releaseOutcomeRecord.outcomeLabel} W${releaseOutcomeRecord.recordedWeek}`,
        }
      : {}),
    canRecordReleaseFulfillment: Boolean(releaseFulfillment && !releaseFulfillmentRecord),
    isReleaseFulfillmentRecorded: Boolean(durableReleaseFulfillmentRecord),
    ...(durableReleaseFulfillmentRecord
      ? {
          releaseOutcomeKind: durableReleaseFulfillmentRecord.sourceOutcomeKind,
          releaseFulfillmentKind: durableReleaseFulfillmentRecord.fulfillmentKind,
          releaseFulfillmentSourceReasonCodes: durableReleaseFulfillmentRecord.sourceReasonCodes,
        }
      : {}),
    ...(releaseFulfillment ? { releaseFulfillmentButtonLabel: 'Record fulfillment' } : {}),
    ...(durableReleaseFulfillmentRecord
      ? {
          releaseFulfillmentStatusLabel: `${durableReleaseFulfillmentRecord.fulfillmentLabel} W${durableReleaseFulfillmentRecord.recordedWeek}`,
        }
      : {}),
    canRecordReleasePackage: Boolean(durableReleaseFulfillmentRecord && !releasePackageRecord),
    isReleasePackageRecorded: Boolean(releasePackageRecord),
    ...(releasePackageRecord ? { releasePackageKind: releasePackageRecord.packageKind } : {}),
    ...(releasePackageRecord ? { releasePackageRef: releasePackageRecord.packageRef } : {}),
    ...(releasePackageRecord
      ? { releasePackageSourceReasonCodes: releasePackageRecord.sourceReasonCodes }
      : {}),
    ...(durableReleaseFulfillmentRecord
      ? { releasePackageButtonLabel: 'Prepare handoff package' }
      : {}),
    ...(releasePackageRecord
      ? {
          releasePackageStatusLabel: `${releasePackageRecord.packageLabel} W${releasePackageRecord.recordedWeek} (${releasePackageRecord.packageRef})`,
        }
      : {}),
    canRecordFileReleaseDelivery: Boolean(releasePackageRecord && !hasActualFileReleaseDelivery),
    isFileReleaseDeliveryRecorded: Boolean(fileReleaseDeliveryRecord),
    ...(releasePackageRecord
      ? {
          fileReleaseDeliveryButtonLabel: hasMetadataFileReleaseDelivery
            ? 'Record actual file-content delivery'
            : 'Record file delivery',
        }
      : {}),
    ...(fileReleaseDeliveryRecord
      ? {
          fileReleaseDeliveryStatusLabel: `${fileReleaseDeliveryRecord.deliveryLabel} W${fileReleaseDeliveryRecord.recordedWeek} (${fileReleaseDeliveryRecord.deliveryRef})`,
        }
      : {}),
    canRecordNonMissionEnforcement: Boolean(nonMissionEnforcement && !nonMissionEnforcementRecord),
    isNonMissionEnforcementRecorded: Boolean(nonMissionEnforcementRecord),
    ...(nonMissionEnforcement
      ? {
          nonMissionEnforcementButtonLabel: `Record ${bucket} non-mission enforcement`,
        }
      : {}),
    ...(nonMissionEnforcementRecord
      ? {
          nonMissionEnforcementStatusLabel: `${nonMissionEnforcementRecord.enforcementLabel} W${nonMissionEnforcementRecord.recordedWeek} (${nonMissionEnforcementRecord.id})`,
        }
      : {}),
    canRecordEvidenceRepairWorkflow:
      bucket === 'missing_review' &&
      (missingReasonCodes ?? []).includes('missing_entity_welfare_reclassification_ref') &&
      !evidenceRepairWorkflow,
    isEvidenceRepairWorkflowRecorded: Boolean(evidenceRepairWorkflow),
    ...(evidenceRepairWorkflow
      ? {
          evidenceRepairWorkflowStatusLabel: `Repair candidate: welfare evidence (${evidenceRepairWorkflow.repairRef})`,
        }
      : {}),
    reasonCodeLabels: Object.freeze(reasonCodeLabels),
  })
}

function buildFileAccessWorkQueue(
  snapshots: readonly AffiliationPersonStatusSnapshot[],
  game: GameState
): readonly AffiliationFileAccessWorkQueueEntryView[] {
  return Object.freeze(
    snapshots
      .map((snapshot) => toFileAccessWorkQueueEntry(snapshot, game))
      .sort((left, right) => {
        const bucketCompare =
          fileAccessWorkQueueBucketPriority(left.bucket) -
          fileAccessWorkQueueBucketPriority(right.bucket)
        return bucketCompare !== 0 ? bucketCompare : left.id.localeCompare(right.id)
      })
  )
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
    roomAccessLabels: formatSurfaceAccessLabels(
      snapshot.permissionDecisions,
      'room',
      'Room access'
    ),
    fileAccessLabels: formatSurfaceAccessLabels(
      snapshot.permissionDecisions,
      'file',
      'File access'
    ),
    facilityFileAccessLabels: formatFacilityFileAccessLabels(snapshot),
    housingAccessLabels: formatSurfaceAccessLabels(
      snapshot.permissionDecisions,
      'housing',
      'Housing access'
    ),
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
  const candidates = game.candidates.length > 0 ? game.candidates : game.recruitmentPool
  const snapshots = projectAffiliationPersonStatusSnapshots({
    records: game.affiliationPersonStatusRecords,
    candidates,
    entityWelfareReclassificationRecords: game.entityWelfareReclassificationRecords,
  })
  let restrictedOrBlockedCount = 0
  let missingReferenceCount = 0
  const fileAccessWorkQueue = buildFileAccessWorkQueue(snapshots, game)

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
      fileAccessWorkQueueCount: fileAccessWorkQueue.length,
      fileAccessBlockedCount: fileAccessWorkQueue.filter((entry) => entry.bucket === 'blocked')
        .length,
      fileAccessRestrictedCount: fileAccessWorkQueue.filter(
        (entry) => entry.bucket === 'restricted'
      ).length,
      fileAccessMissingReviewCount: fileAccessWorkQueue.filter(
        (entry) => entry.bucket === 'missing_review'
      ).length,
      week: game.week,
    }),
    fileAccessWorkQueue,
    records: Object.freeze(snapshots.map((snapshot) => toRecordView(snapshot))),
  })
}
