import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildAffiliationFileWorkQueueActionRecord } from '../domain/affiliationFileWorkQueueActionRecords'
import type { AffiliationFileWorkQueueSourceBucket } from '../domain/affiliationFileWorkQueueActionRecords'
import {
  getAffiliationFileWorkQueueEntry,
  resolveAffiliationFileWorkQueueEntry,
} from '../domain/affiliationFileWorkQueueDecisions'
import { buildAffiliationFileWorkQueueEvidenceRepairWorkflow } from '../domain/affiliationFileWorkQueueEvidenceRepairWorkflows'
import { buildAffiliationFileWorkQueueEvidenceResolutionRecord } from '../domain/affiliationFileWorkQueueEvidenceResolutionRecords'
import { buildAffiliationFileWorkQueueFileReleaseDeliveryRecord } from '../domain/affiliationFileWorkQueueFileReleaseDeliveryRecords'
import { buildAffiliationFileWorkQueueNonMissionEnforcementRecord } from '../domain/affiliationFileWorkQueueNonMissionEnforcementRecords'
import { buildAffiliationFileWorkQueueReleaseActionRecord } from '../domain/affiliationFileWorkQueueReleaseActionRecords'
import { buildAffiliationFileWorkQueueReleaseFulfillmentRecord } from '../domain/affiliationFileWorkQueueReleaseFulfillmentRecords'
import { buildAffiliationFileWorkQueueReleaseOutcomeRecord } from '../domain/affiliationFileWorkQueueReleaseOutcomeRecords'
import { buildAffiliationFileWorkQueueReleasePackageRecord } from '../domain/affiliationFileWorkQueueReleasePackageRecords'
import { buildAffiliationFileWorkQueueRepairActionRecord } from '../domain/affiliationFileWorkQueueRepairActionRecords'
import * as statusRecords from '../domain/affiliationPersonStatusRecords'
import {
  COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
  projectAffiliationPersonStatusSnapshots,
} from '../domain/affiliationPersonStatusRecords'
import type { AffiliationPersonStatusSnapshot } from '../domain/affiliationPersonStatusRecords'
import {
  HOSTILE_TO_COOPERATIVE_FIXTURE,
  PENDING_TO_APPROVED_FIXTURE,
} from '../domain/entityWelfareReclassificationRegistry'
import type { GameState } from '../domain/models'
import { getAffiliationPersonStatusMirrorView } from '../features/operations/affiliationPersonStatusMirrorView'

const statusId = COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id
const missingId = 'person-status:missing-review'
const identity = {
  workQueueEntryId: statusId,
  subjectId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectId,
  subjectLabel: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectLabel,
}
const allowedReasons = ['file_permission_allowed', 'site_clearance_allowed']

function makeGame() {
  const game = createStartingState()
  const blockedWelfare = {
    ...HOSTILE_TO_COOPERATIVE_FIXTURE,
    id: 'reclass:file-blocked',
    proposedDisposition: 'hostile',
    reclassificationState: 'denied',
  } as const
  game.entityWelfareReclassificationRecords = {
    [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    [blockedWelfare.id]: blockedWelfare,
  }
  game.affiliationPersonStatusRecords = {
    [statusId]: {
      ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
      candidateRef: undefined,
      entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
      permissionSurface: 'file',
    },
    [missingId]: {
      ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
      id: missingId,
      candidateRef: 'candidate:missing',
      entityWelfareReclassificationRef: 'reclass:missing',
    },
    'person-status:blocked': {
      ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
      id: 'person-status:blocked',
      candidateRef: undefined,
      entityWelfareReclassificationRef: blockedWelfare.id,
      permissionSurface: 'file',
    },
  }
  return game
}

function snapshots(game: GameState) {
  return projectAffiliationPersonStatusSnapshots({
    records: game.affiliationPersonStatusRecords,
    candidates: game.candidates.length > 0 ? game.candidates : game.recruitmentPool,
    entityWelfareReclassificationRecords: game.entityWelfareReclassificationRecords,
  })
}

// Authored snapshots exercise the resolver contract, including the allowed bucket.
// Existing welfare policy continues to produce restricted/blocked file permissions.
function authoredSnapshot(bucket: AffiliationFileWorkQueueSourceBucket) {
  const base = snapshots(makeGame()).find((snapshot) => snapshot.recordId === statusId)!
  const decision = base.facilityFileAccessDecision!
  return {
    ...base,
    reasonCodes: ['other_reason', 'missing_entity_welfare_reclassification_ref'],
    facilityFileAccessDecision:
      bucket === 'missing_review'
        ? undefined
        : { ...decision, outcome: bucket, reasonCodes: [`file_permission_${bucket}`] },
  } satisfies AffiliationPersonStatusSnapshot
}

function expectProjectionParity(game: GameState) {
  const view = getAffiliationPersonStatusMirrorView(game)
  for (const snapshot of snapshots(game)) {
    const entry = getAffiliationFileWorkQueueEntry(game, snapshot.recordId)!
    const mirror = view.fileAccessWorkQueue.find((row) => row.id === snapshot.recordId)!
    for (const [key, value] of Object.entries(entry)) {
      if (key === 'reasonCodes') {
        expect(mirror.reasonCodeLabels, `${snapshot.recordId}.${key}`).toEqual(value)
      } else if (key === 'evidenceRepairCandidates') {
        expect(
          mirror.evidenceRepairCandidates.map(
            ({ reasonCode, repairLabel, isRepairActionRecorded }) => ({
              reasonCode,
              repairLabel,
              isRepairActionRecorded,
            })
          ),
          `${snapshot.recordId}.${key}`
        ).toEqual(value)
      } else {
        expect(mirror[key as keyof typeof mirror], `${snapshot.recordId}.${key}`).toEqual(value)
      }
    }
  }
}

function addDurableAllowedFulfillment(game: GameState) {
  const fulfillment = buildAffiliationFileWorkQueueReleaseFulfillmentRecord({
    ...identity,
    sourceOutcomeKind: 'file_released',
    sourceBucket: 'allowed',
    sourceReasonCodes: allowedReasons,
    fulfillmentKind: 'file_release_fulfilled',
    fulfillmentLabel: 'File release fulfilled',
    recordedWeek: 12,
  })
  game.affiliationFileWorkQueueReleaseFulfillmentRecords = { [fulfillment.id]: fulfillment }
  return fulfillment
}

function addPackage(game: GameState) {
  const releasePackage = buildAffiliationFileWorkQueueReleasePackageRecord({
    ...identity,
    sourceOutcomeKind: 'file_released',
    sourceFulfillmentKind: 'file_release_fulfilled',
    sourceReasonCodes: allowedReasons,
    packageKind: 'safe_file_handoff_package',
    packageLabel: 'Safe file handoff package',
    recordedWeek: 13,
  })
  game.affiliationFileWorkQueueReleasePackageRecords = { [releasePackage.id]: releasePackage }
  return releasePackage
}

describe('affiliation file work queue domain decisions (SPE-3436)', () => {
  afterEach(() => vi.restoreAllMocks())

  it.each([
    ['missing_review', 'resolve_missing_review', 'Resolve missing review', true, false, false],
    ['blocked', 'hold_blocked_access', 'Hold access', false, false, true],
    ['restricted', 'route_restricted_review', 'Route restricted review', false, true, true],
    ['allowed', 'monitor_allowed_access', 'Monitor allowed access', false, true, true],
  ] as const)(
    'resolves %s recommendation and initial command eligibility from an authored snapshot',
    (bucket, action, label, evidenceEligible, releaseEligible, enforcementEligible) => {
      const { entry } = resolveAffiliationFileWorkQueueEntry(
        authoredSnapshot(bucket),
        createStartingState()
      )
      expect(entry).toMatchObject({
        id: statusId,
        bucket,
        recommendedActionKind: action,
        recommendedActionLabel: label,
        isRecommendedActionRecorded: false,
        canRecordEvidenceResolution: evidenceEligible,
        canRecordReleaseAction: releaseEligible,
        canRecordReleaseOutcome: false,
        canRecordReleaseFulfillment: false,
        canRecordReleasePackage: false,
        canRecordFileReleaseDelivery: false,
        canRecordNonMissionEnforcement: enforcementEligible,
        canRecordEvidenceRepairWorkflow: evidenceEligible,
      })
      expect(entry.reasonCodes).toEqual(
        bucket === 'missing_review'
          ? ['missing_entity_welfare_reclassification_ref']
          : [`file_permission_${bucket}`]
      )
    }
  )

  it('uses a missing-decision reason when neither decision nor missing snapshot reasons exist', () => {
    const snapshot = { ...authoredSnapshot('missing_review'), reasonCodes: ['unrelated_reason'] }
    expect(
      resolveAffiliationFileWorkQueueEntry(snapshot, createStartingState()).entry
    ).toMatchObject({
      bucket: 'missing_review',
      reasonCodes: ['missing_facility_file_access_decision'],
      canRecordEvidenceResolution: true,
      canRecordEvidenceRepairWorkflow: false,
    })
  })

  it('also supplies the fallback reason for an empty authored decision reason list', () => {
    const snapshot = authoredSnapshot('blocked')
    snapshot.facilityFileAccessDecision = {
      ...snapshot.facilityFileAccessDecision!,
      reasonCodes: [],
    }
    expect(
      resolveAffiliationFileWorkQueueEntry(snapshot, createStartingState()).entry
    ).toMatchObject({
      bucket: 'blocked',
      reasonCodes: ['missing_facility_file_access_decision'],
      canRecordEvidenceResolution: false,
    })
  })

  it('returns undefined for missing entries without fabricating records', () => {
    const game = makeGame()
    const before = JSON.stringify(game)
    expect(getAffiliationFileWorkQueueEntry(game, 'person-status:absent')).toBeUndefined()
    expect(getAffiliationFileWorkQueueEntry(createStartingState(), statusId)).toBeUndefined()
    expect(JSON.stringify(game)).toBe(before)
  })

  it('keeps repeated decisions deterministic without changing snapshots, inputs, or ledgers', () => {
    const game = makeGame()
    addDurableAllowedFulfillment(game)
    addPackage(game)
    const snapshot = authoredSnapshot('restricted')
    const gameBefore = JSON.stringify(game)
    const snapshotBefore = JSON.stringify(snapshot)
    const reasons = snapshot.facilityFileAccessDecision!.reasonCodes
    expect(Object.isFrozen(reasons)).toBe(false)

    const first = resolveAffiliationFileWorkQueueEntry(snapshot, game)
    const second = resolveAffiliationFileWorkQueueEntry(snapshot, game)

    expect(second).toEqual(first)
    expect(JSON.stringify(game)).toBe(gameBefore)
    expect(JSON.stringify(snapshot)).toBe(snapshotBefore)
    expect(Object.isFrozen(reasons)).toBe(false)
    expect(Object.isFrozen(first.entry)).toBe(true)
    expect(Object.isFrozen(first.entry.reasonCodes)).toBe(true)
  })

  it('retains a durable allowed fulfillment when the current real snapshot is restricted', () => {
    const game = makeGame()
    const fulfillment = addDurableAllowedFulfillment(game)
    const entry = getAffiliationFileWorkQueueEntry(game, statusId)!
    expect(entry).toMatchObject({
      bucket: 'restricted',
      releaseOutcomeKind: 'file_released',
      releaseFulfillmentKind: 'file_release_fulfilled',
      releaseFulfillmentSourceReasonCodes: allowedReasons,
      canRecordReleaseFulfillment: false,
      isReleaseFulfillmentRecorded: true,
      canRecordReleasePackage: true,
    })
    const snapshot = snapshots(game).find((candidate) => candidate.recordId === statusId)!
    expect(
      resolveAffiliationFileWorkQueueEntry(snapshot, game).durableReleaseFulfillmentRecord
    ).toBe(fulfillment)
    expectProjectionParity(game)
  })

  it('allows actual delivery after metadata and stops after actual delivery for the matching package', () => {
    const game = makeGame()
    addDurableAllowedFulfillment(game)
    const releasePackage = addPackage(game)
    expect(getAffiliationFileWorkQueueEntry(game, statusId)).toMatchObject({
      canRecordReleasePackage: false,
      isReleasePackageRecorded: true,
      canRecordFileReleaseDelivery: true,
      isFileReleaseDeliveryRecorded: false,
    })
    expectProjectionParity(game)

    const metadata = buildAffiliationFileWorkQueueFileReleaseDeliveryRecord({
      ...identity,
      sourcePackageKind: releasePackage.packageKind,
      sourcePackageRef: releasePackage.packageRef,
      sourceReasonCodes: allowedReasons,
      deliveryKind: 'metadata_only_file_release_delivered',
      deliveryLabel: 'Metadata-only file release delivered',
      recordedWeek: 14,
    })
    const actual = buildAffiliationFileWorkQueueFileReleaseDeliveryRecord({
      ...identity,
      sourcePackageKind: releasePackage.packageKind,
      sourcePackageRef: releasePackage.packageRef,
      sourceReasonCodes: allowedReasons,
      deliveryKind: 'actual_file_content_release_delivered',
      deliveryLabel: 'Actual file content release delivered',
      recordedWeek: 15,
    })
    game.affiliationFileWorkQueueFileReleaseDeliveryRecords = { [metadata.id]: metadata }
    expect(getAffiliationFileWorkQueueEntry(game, statusId)).toMatchObject({
      canRecordFileReleaseDelivery: true,
      isFileReleaseDeliveryRecorded: true,
    })
    expectProjectionParity(game)

    // An actual receipt for another package reference must not close this package.
    game.affiliationFileWorkQueueFileReleaseDeliveryRecords[actual.id] = {
      ...actual,
      sourcePackageRef: 'release-package:other:file_release_fulfilled',
    }
    expect(getAffiliationFileWorkQueueEntry(game, statusId)?.canRecordFileReleaseDelivery).toBe(
      true
    )
    game.affiliationFileWorkQueueFileReleaseDeliveryRecords[actual.id] = actual
    expect(getAffiliationFileWorkQueueEntry(game, statusId)).toMatchObject({
      canRecordFileReleaseDelivery: false,
      isFileReleaseDeliveryRecorded: true,
    })
    const snapshot = snapshots(game).find((candidate) => candidate.recordId === statusId)!
    expect(resolveAffiliationFileWorkQueueEntry(snapshot, game).fileReleaseDeliveryRecord).toBe(
      actual
    )
    expectProjectionParity(game)
  })

  it('matches command fields in the UI projection across real snapshots and evidence ledger states', () => {
    const game = makeGame()
    expect(snapshots(game).map((snapshot) => snapshot.facilityFileAccessDecision?.outcome)).toEqual(
      ['blocked', 'restricted', undefined]
    )
    expectProjectionParity(game)

    const action = buildAffiliationFileWorkQueueActionRecord({
      ...identity,
      actionKind: 'route_restricted_review',
      actionLabel: 'Route restricted review',
      sourceBucket: 'restricted',
      sourceReasonCodes: ['file_permission_restricted'],
      recordedWeek: 8,
    })
    game.affiliationFileWorkQueueActionRecords = { [action.id]: action }
    expect(getAffiliationFileWorkQueueEntry(game, statusId)?.isRecommendedActionRecorded).toBe(true)
    expectProjectionParity(game)

    const missing = getAffiliationFileWorkQueueEntry(game, missingId)!
    const resolution = buildAffiliationFileWorkQueueEvidenceResolutionRecord({
      ...identity,
      workQueueEntryId: missingId,
      sourceBucket: 'missing_review',
      missingReasonCodes: missing.reasonCodes,
      recordedWeek: 9,
    })
    game.affiliationFileWorkQueueEvidenceResolutionRecords = { [resolution.id]: resolution }
    const repair = buildAffiliationFileWorkQueueRepairActionRecord({
      ...identity,
      workQueueEntryId: missingId,
      reasonCode: 'missing_candidate_ref',
      repairLabel: 'Restore candidate evidence',
      recordedWeek: 10,
    })
    game.affiliationFileWorkQueueRepairActionRecords = { [repair.id]: repair }
    const workflow = buildAffiliationFileWorkQueueEvidenceRepairWorkflow({
      ...identity,
      workQueueEntryId: missingId,
      evidenceType: 'missing_entity_welfare_reclassification_ref',
      repairLabel: 'Restore welfare evidence',
      recordedWeek: 10,
    })
    game.affiliationFileWorkQueueEvidenceRepairWorkflows = { [workflow.id]: workflow }
    expect(getAffiliationFileWorkQueueEntry(game, missingId)).toMatchObject({
      canRecordEvidenceResolution: false,
      isEvidenceResolutionRecorded: true,
      canRecordEvidenceRepairWorkflow: false,
      isEvidenceRepairWorkflowRecorded: true,
    })
    expect(
      getAffiliationFileWorkQueueEntry(game, missingId)?.evidenceRepairCandidates
    ).toContainEqual({
      reasonCode: 'missing_candidate_ref',
      repairLabel: 'Candidate link repair: attach or restore recruitment candidate evidence.',
      isRepairActionRecorded: true,
    })
    expectProjectionParity(game)

    const enforcement = buildAffiliationFileWorkQueueNonMissionEnforcementRecord({
      ...identity,
      sourceBucket: 'restricted',
      sourceReasonCodes: ['file_permission_restricted'],
      enforcementKind: 'restricted_non_mission_access_enforced',
      enforcementLabel: 'Restricted non-mission access enforced',
      recordedWeek: 11,
    })
    game.affiliationFileWorkQueueNonMissionEnforcementRecords = { [enforcement.id]: enforcement }
    expect(getAffiliationFileWorkQueueEntry(game, statusId)).toMatchObject({
      canRecordNonMissionEnforcement: false,
      isNonMissionEnforcementRecorded: true,
    })
    expectProjectionParity(game)
  })

  it.each(['restricted', 'allowed'] as const)(
    'preserves %s release action/outcome/fulfillment eligibility and projection parity',
    (bucket) => {
      const game = makeGame()
      if (bucket === 'allowed') {
        // Isolate the authored allowed contract at the snapshot seam; never relax welfare policy.
        vi.spyOn(statusRecords, 'projectAffiliationPersonStatusSnapshots').mockReturnValue([
          authoredSnapshot('allowed'),
        ])
      }
      const isAllowed = bucket === 'allowed'
      const action = buildAffiliationFileWorkQueueReleaseActionRecord({
        ...identity,
        actionKind: isAllowed ? 'file_release_authorized' : 'restricted_release_review_routed',
        actionLabel: isAllowed ? 'File release authorized' : 'Restricted release review routed',
        sourceBucket: bucket,
        sourceReasonCodes: [`file_permission_${bucket}`],
        recordedWeek: 10,
      })
      game.affiliationFileWorkQueueReleaseActionRecords = { [action.id]: action }
      expect(getAffiliationFileWorkQueueEntry(game, statusId)).toMatchObject({
        canRecordReleaseAction: false,
        isReleaseActionRecorded: true,
        canRecordReleaseOutcome: true,
        canRecordReleaseFulfillment: false,
      })
      expectProjectionParity(game)

      const outcome = buildAffiliationFileWorkQueueReleaseOutcomeRecord({
        ...identity,
        sourceActionKind: action.actionKind,
        sourceBucket: bucket,
        sourceReasonCodes: action.sourceReasonCodes,
        outcomeKind: isAllowed ? 'file_released' : 'restricted_review_pending',
        outcomeLabel: isAllowed ? 'File released' : 'Restricted review pending',
        recordedWeek: 11,
      })
      game.affiliationFileWorkQueueReleaseOutcomeRecords = { [outcome.id]: outcome }
      expect(getAffiliationFileWorkQueueEntry(game, statusId)).toMatchObject({
        canRecordReleaseOutcome: false,
        isReleaseOutcomeRecorded: true,
        canRecordReleaseFulfillment: isAllowed,
      })
      expectProjectionParity(game)
      if (isAllowed) {
        addDurableAllowedFulfillment(game)
        expect(getAffiliationFileWorkQueueEntry(game, statusId)).toMatchObject({
          canRecordReleaseFulfillment: false,
          isReleaseFulfillmentRecorded: true,
          canRecordReleasePackage: true,
        })
        expectProjectionParity(game)
      }
    }
  )

  it('keeps this command extraction independent of feature and app imports', () => {
    const store = readFileSync(resolve('src/app/store/gameStore.ts'), 'utf8')
    const domain = readFileSync(resolve('src/domain/affiliationFileWorkQueueDecisions.ts'), 'utf8')
    expect(store).not.toMatch(/(?:from\s*|import\s*\()\s*['"][^'"]*\/features\//)
    expect(domain).not.toMatch(/(?:from\s*|import\s*\()\s*['"][^'"]*\/(?:app|features)\//)
  })
})
