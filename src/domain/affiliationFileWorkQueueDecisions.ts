import type { GameState } from './models'
import { buildAffiliationFileWorkQueueActionRecordId } from './affiliationFileWorkQueueActionRecords'
import {
  buildAffiliationFileWorkQueueEvidenceRepairCandidates,
  buildAffiliationFileWorkQueueEvidenceResolutionRecordId,
} from './affiliationFileWorkQueueEvidenceResolutionRecords'
import { buildAffiliationFileWorkQueueRepairActionRecordId } from './affiliationFileWorkQueueRepairActionRecords'
import {
  buildAffiliationFileWorkQueueReleaseActionRecordId,
  getAffiliationFileWorkQueueReleaseActionForBucket,
} from './affiliationFileWorkQueueReleaseActionRecords'
import { buildAffiliationFileWorkQueueReleaseOutcomeRecordId } from './affiliationFileWorkQueueReleaseOutcomeRecords'
import {
  buildAffiliationFileWorkQueueReleaseFulfillmentRecordId,
  getAffiliationFileWorkQueueReleaseFulfillmentForOutcome,
} from './affiliationFileWorkQueueReleaseFulfillmentRecords'
import { buildAffiliationFileWorkQueueReleasePackageRecordId } from './affiliationFileWorkQueueReleasePackageRecords'
import {
  buildAffiliationFileWorkQueueFileReleaseDeliveryRecordId,
  type AffiliationFileWorkQueueFileReleaseDeliveryRecord,
} from './affiliationFileWorkQueueFileReleaseDeliveryRecords'
import {
  buildAffiliationFileWorkQueueNonMissionEnforcementRecordId,
  getAffiliationFileWorkQueueNonMissionEnforcementForBucket,
} from './affiliationFileWorkQueueNonMissionEnforcementRecords'
import { buildAffiliationFileWorkQueueEvidenceRepairWorkflowId } from './affiliationFileWorkQueueEvidenceRepairWorkflows'
import {
  projectAffiliationPersonStatusSnapshots,
  type AffiliationPersonStatusSnapshot,
} from './affiliationPersonStatusRecords'

import type {
  AffiliationFileWorkQueueSourceBucket,
  AffiliationFileWorkQueueActionKind,
} from './affiliationFileWorkQueueActionRecords'

/** Canonical action identity and durable record label; explanatory UI copy stays in the feature. */
export function getAffiliationFileWorkQueueRecommendedAction(
  bucket: AffiliationFileWorkQueueSourceBucket
) {
  const actions: Record<
    AffiliationFileWorkQueueSourceBucket,
    { recommendedActionKind: AffiliationFileWorkQueueActionKind; recommendedActionLabel: string }
  > = {
    missing_review: {
      recommendedActionKind: 'resolve_missing_review',
      recommendedActionLabel: 'Resolve missing review',
    },
    blocked: {
      recommendedActionKind: 'hold_blocked_access',
      recommendedActionLabel: 'Hold access',
    },
    restricted: {
      recommendedActionKind: 'route_restricted_review',
      recommendedActionLabel: 'Route restricted review',
    },
    allowed: {
      recommendedActionKind: 'monitor_allowed_access',
      recommendedActionLabel: 'Monitor allowed access',
    },
  }
  return Object.freeze(actions[bucket])
}

/** Operational interpretation over canonical snapshots and existing workflow records. No mutation or UI dependencies. */
export function resolveAffiliationFileWorkQueueEntry(
  snapshot: AffiliationPersonStatusSnapshot,
  game: GameState
) {
  const decision = snapshot.facilityFileAccessDecision
  const bucket: AffiliationFileWorkQueueSourceBucket = decision?.outcome ?? 'missing_review'
  const reasonCodes = decision
    ? decision.reasonCodes
    : snapshot.reasonCodes.filter((reasonCode) => reasonCode.startsWith('missing_'))
  const reasonCodeLabels =
    reasonCodes.length > 0 ? reasonCodes : ['missing_facility_file_access_decision']
  const recommendedAction = getAffiliationFileWorkQueueRecommendedAction(bucket)
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
      ).map((candidate) => {
        const recordId = buildAffiliationFileWorkQueueRepairActionRecordId({
          workQueueEntryId: snapshot.recordId,
          reasonCode: candidate.reasonCode,
        })
        const record = game.affiliationFileWorkQueueRepairActionRecords?.[recordId]

        return Object.freeze({
          reasonCode: candidate.reasonCode,
          repairLabel: candidate.repairLabel,
          isRepairActionRecorded: Boolean(record),
          record,
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

  const entry = Object.freeze({
    id: snapshot.recordId,
    subjectId: snapshot.subjectId,
    subjectLabel: snapshot.subjectLabel,
    bucket,
    ...recommendedAction,
    reasonCodes: Object.freeze([...reasonCodeLabels]),
    isRecommendedActionRecorded: Boolean(recordedAction),
    canRecordEvidenceResolution:
      bucket === 'missing_review' && missingReasonCodes.length > 0 && !evidenceResolution,
    isEvidenceResolutionRecorded: Boolean(evidenceResolution),
    evidenceRepairCandidates: Object.freeze(
      evidenceRepairCandidates.map(({ reasonCode, repairLabel, isRepairActionRecorded }) =>
        Object.freeze({ reasonCode, repairLabel, isRepairActionRecorded })
      )
    ),
    canRecordReleaseAction: Boolean(releaseAction && !releaseActionRecord),
    isReleaseActionRecorded: Boolean(releaseActionRecord),
    ...(releaseAction ? { releaseActionKind: releaseAction.actionKind } : {}),
    canRecordReleaseOutcome: Boolean(releaseActionRecord && !releaseOutcomeRecord),
    isReleaseOutcomeRecorded: Boolean(releaseOutcomeRecord),
    ...(releaseOutcomeRecord ? { releaseOutcomeKind: releaseOutcomeRecord.outcomeKind } : {}),
    canRecordReleaseFulfillment: Boolean(releaseFulfillment && !releaseFulfillmentRecord),
    isReleaseFulfillmentRecorded: Boolean(durableReleaseFulfillmentRecord),
    ...(durableReleaseFulfillmentRecord
      ? {
          releaseOutcomeKind: durableReleaseFulfillmentRecord.sourceOutcomeKind,
          releaseFulfillmentKind: durableReleaseFulfillmentRecord.fulfillmentKind,
          releaseFulfillmentSourceReasonCodes: durableReleaseFulfillmentRecord.sourceReasonCodes,
        }
      : {}),
    canRecordReleasePackage: Boolean(durableReleaseFulfillmentRecord && !releasePackageRecord),
    isReleasePackageRecorded: Boolean(releasePackageRecord),
    ...(releasePackageRecord
      ? {
          releasePackageKind: releasePackageRecord.packageKind,
          releasePackageRef: releasePackageRecord.packageRef,
          releasePackageSourceReasonCodes: releasePackageRecord.sourceReasonCodes,
        }
      : {}),
    canRecordFileReleaseDelivery: Boolean(releasePackageRecord && !hasActualFileReleaseDelivery),
    isFileReleaseDeliveryRecorded: Boolean(fileReleaseDeliveryRecord),
    canRecordNonMissionEnforcement: Boolean(nonMissionEnforcement && !nonMissionEnforcementRecord),
    isNonMissionEnforcementRecorded: Boolean(nonMissionEnforcementRecord),
    canRecordEvidenceRepairWorkflow:
      bucket === 'missing_review' &&
      missingReasonCodes.includes('missing_entity_welfare_reclassification_ref') &&
      !evidenceRepairWorkflow,
    isEvidenceRepairWorkflowRecorded: Boolean(evidenceRepairWorkflow),
  })
  return {
    entry,
    recordedAction,
    evidenceResolution,
    evidenceRepairCandidates,
    releaseAction,
    releaseActionRecord,
    releaseOutcomeRecord,
    releaseFulfillment,
    durableReleaseFulfillmentRecord,
    releasePackageRecord,
    fileReleaseDeliveryRecord,
    hasMetadataFileReleaseDelivery,
    nonMissionEnforcement,
    nonMissionEnforcementRecord,
    evidenceRepairWorkflow,
  }
}

/** Resolve just the requested entry; callers do not consume the UI projection. */
export function getAffiliationFileWorkQueueEntry(game: GameState, entryId: string) {
  const candidates = game.candidates.length > 0 ? game.candidates : game.recruitmentPool
  const snapshots = projectAffiliationPersonStatusSnapshots({
    records: game.affiliationPersonStatusRecords,
    candidates,
    entityWelfareReclassificationRecords: game.entityWelfareReclassificationRecords,
  })
  const snapshot = snapshots.find((candidate) => candidate.recordId === entryId)
  return snapshot ? resolveAffiliationFileWorkQueueEntry(snapshot, game).entry : undefined
}
