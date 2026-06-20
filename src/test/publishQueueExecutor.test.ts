import { describe, expect, it } from 'vitest'

import {
  CANONICAL_CONTRIBUTION_SUBMISSION_FIXTURE,
  evaluateContributionIntakeCuration,
} from '../domain/contributionIntakeCuration'
import {
  CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
  evaluateModularReleasePackaging,
} from '../domain/modularReleasePackaging'
import {
  CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE,
  CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
  composePublishQueueRecord,
  evaluatePublishAutomationCreditingHooks,
} from '../domain/publishAutomationCreditingHooks'
import {
  applyWeeklyPublishQueueExecutionTick,
  executePublishQueueRecordDryRun,
  executePublishQueueRecordLiveSync,
  executePublishQueueRecordsDryRun,
} from '../domain/publishQueueExecutor'
import {
  CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE,
  evaluateSubmissionGovernanceRights,
} from '../domain/submissionGovernanceRights'

describe('publishQueueExecutor (SPE-2484 slice 1)', () => {
  const acceptedCuration = evaluateContributionIntakeCuration(
    CANONICAL_CONTRIBUTION_SUBMISSION_FIXTURE
  )
  const packagedRelease = evaluateModularReleasePackaging(
    acceptedCuration,
    CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE
  )
  const appliedGovernance = evaluateSubmissionGovernanceRights(
    CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE
  )
  const decision = evaluatePublishAutomationCreditingHooks(
    packagedRelease,
    appliedGovernance,
    CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE
  )
  const composedRecord = composePublishQueueRecord({
    id: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id,
    label: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.label,
    releaseArtifactRef: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.releaseArtifactRef,
    decision,
    summary: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.summary,
    queuedWeek: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.queuedWeek,
  })!

  it('executes the canonical fixture chain with stable hook stubs and published transition', () => {
    const result = executePublishQueueRecordDryRun(composedRecord, { week: 4 })

    expect(result.receipt).toEqual({
      recordId: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id,
      outcome: 'completed',
      executionWeek: 4,
      publishChannelStub: 'dry-run:publish_channel:pr-merge:channel:pr-merge',
      appliedHooks: [
        {
          kind: 'attribution_target',
          target: 'CHANGELOG.md',
          payload: 'contributor:agent-maintainer:canonical',
          channelStub:
            'dry-run:attribution_target:CHANGELOG.md:contributor:agent-maintainer:canonical',
        },
        {
          kind: 'attribution_target',
          target: 'CONTRIBUTORS',
          payload: 'contributor:agent-maintainer:canonical',
          channelStub:
            'dry-run:attribution_target:CONTRIBUTORS:contributor:agent-maintainer:canonical',
        },
        {
          kind: 'changelog_entry',
          target: 'CHANGELOG.md',
          payload:
            'Add publish automation and crediting hooks baseline for SPE-75 contribution pipeline.',
          channelStub:
            'dry-run:changelog_entry:CHANGELOG.md:Add publish automation and crediting hooks baseline for SPE-75 contribution pipeline.',
        },
        {
          kind: 'contributor_credit',
          target: 'contributor:agent-maintainer',
          payload:
            'Maintainer-authored domain module with explicit MIT license and canonical release manifest alignment.',
          channelStub:
            'dry-run:contributor_credit:contributor:agent-maintainer:Maintainer-authored domain module with explicit MIT license and canonical release manifest alignment.',
        },
        {
          kind: 'contributor_credit',
          target: 'contributor:release-bot',
          payload:
            'Maintainer-authored domain module with explicit MIT license and canonical release manifest alignment.',
          channelStub:
            'dry-run:contributor_credit:contributor:release-bot:Maintainer-authored domain module with explicit MIT license and canonical release manifest alignment.',
        },
        {
          kind: 'version_bump',
          target: 'package.json:version',
          payload: 'bump:package.json:version',
          channelStub: 'dry-run:version_bump:package.json:version:bump:package.json:version',
        },
        {
          kind: 'announcement_segment',
          target: 'agent-packaging-pipeline',
          payload: 'segment:agent-packaging-pipeline',
          channelStub:
            'dry-run:announcement_segment:agent-packaging-pipeline:segment:agent-packaging-pipeline',
        },
        {
          kind: 'announcement_segment',
          target: 'domain-release',
          payload: 'segment:domain-release',
          channelStub: 'dry-run:announcement_segment:domain-release:segment:domain-release',
        },
        {
          kind: 'publish_channel',
          target: 'pr-merge',
          payload: 'channel:pr-merge',
          channelStub: 'dry-run:publish_channel:pr-merge:channel:pr-merge',
        },
      ],
    })
    expect(result.record.status).toBe('published')
    expect(result.record.creditingHooks).toEqual(composedRecord.creditingHooks)
    expect(result.record.publishHooks).toEqual(composedRecord.publishHooks)
  })

  it('rejects non-ready_to_publish records without mutation', () => {
    const needsRevision = {
      ...composedRecord,
      id: 'publish-queue:needs-revision-single',
      status: 'needs_revision' as const,
      reasonCodes: ['crediting_targets_borderline'] as const,
    }
    const rejected = {
      ...composedRecord,
      id: 'publish-queue:rejected-single',
      status: 'rejected' as const,
      reasonCodes: ['missing_publish_channel'] as const,
    }

    const needsRevisionResult = executePublishQueueRecordDryRun(needsRevision)
    const rejectedResult = executePublishQueueRecordDryRun(rejected)

    expect(needsRevisionResult.receipt.outcome).toBe('rejected')
    expect(needsRevisionResult.receipt.skipCode).toBe('record_not_ready_to_publish')
    expect(needsRevisionResult.record).toBe(needsRevision)

    expect(rejectedResult.receipt.outcome).toBe('rejected')
    expect(rejectedResult.receipt.skipCode).toBe('record_not_ready_to_publish')
    expect(rejectedResult.record).toBe(rejected)
  })

  it('rejects ready_to_publish records missing publish_channel hooks', () => {
    const missingChannel = {
      ...composedRecord,
      publishHooks: composedRecord.publishHooks.filter((hook) => hook.kind !== 'publish_channel'),
    }

    const result = executePublishQueueRecordDryRun(missingChannel)

    expect(result.receipt.outcome).toBe('rejected')
    expect(result.receipt.skipCode).toBe('missing_publish_channel_hook')
    expect(result.record).toBe(missingChannel)
  })

  it('is idempotent when re-executing published records', () => {
    const first = executePublishQueueRecordDryRun(composedRecord, { week: 4 })
    const second = executePublishQueueRecordDryRun(first.record, { week: 4 })

    expect(first.receipt.outcome).toBe('completed')
    expect(second.receipt.outcome).toBe('skipped')
    expect(second.receipt.skipCode).toBe('already_published')
    expect(second.record).toBe(first.record)

    const third = executePublishQueueRecordDryRun(first.record, { week: 4 })
    expect(third).toEqual(second)
  })

  it('batch-executes records in stable id order and preserves non-ready entries', () => {
    const needsRevision = {
      ...composedRecord,
      id: 'publish-queue:needs-revision',
      status: 'needs_revision' as const,
      reasonCodes: ['crediting_targets_borderline'] as const,
    }

    const batch = executePublishQueueRecordsDryRun(
      {
        [needsRevision.id]: needsRevision,
        [composedRecord.id]: composedRecord,
      },
      { week: 5 }
    )

    expect(batch.receipts.map((receipt) => receipt.recordId)).toEqual([
      composedRecord.id,
      needsRevision.id,
    ])
    expect(batch.records[composedRecord.id]?.status).toBe('published')
    expect(batch.records[needsRevision.id]).toBe(needsRevision)
  })

  it('weekly batch hook matches single-pass dry-run execution', () => {
    const records = {
      [composedRecord.id]: composedRecord,
    }

    const singlePass = executePublishQueueRecordsDryRun(records, { week: 6 })
    const weeklyPass = applyWeeklyPublishQueueExecutionTick(records, 6)

    expect(weeklyPass).toEqual(singlePass)
  })

  it('repeated batch execution is byte-identical after records are published', () => {
    const records = {
      [composedRecord.id]: composedRecord,
    }

    const first = executePublishQueueRecordsDryRun(records, { week: 7 })
    const second = executePublishQueueRecordsDryRun(first.records, { week: 7 })

    expect(second.records).toEqual(first.records)
    expect(second.receipts).toEqual(
      first.receipts.map((receipt) => ({
        ...receipt,
        outcome: 'skipped',
        skipCode: 'already_published',
        appliedHooks: [],
        publishChannelStub: undefined,
      }))
    )
  })
})

describe('publishQueueExecutor manual-approval channel (SPE-2498 slice 1)', () => {
  const acceptedCuration = evaluateContributionIntakeCuration(
    CANONICAL_CONTRIBUTION_SUBMISSION_FIXTURE
  )
  const packagedRelease = evaluateModularReleasePackaging(
    acceptedCuration,
    CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE
  )
  const appliedGovernance = evaluateSubmissionGovernanceRights(
    CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE
  )
  const decision = evaluatePublishAutomationCreditingHooks(
    packagedRelease,
    appliedGovernance,
    CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE
  )

  function buildManualApprovalRecord(releaseArtifactRef = 'release:approval:release-batch-1') {
    const baseRecord = composePublishQueueRecord({
      id: 'publish-queue:manual-approval',
      label: 'Manual approval release batch',
      releaseArtifactRef,
      decision,
      summary: 'Awaiting manual approval before publish.',
      queuedWeek: 4,
    })!

    return {
      ...baseRecord,
      publishHooks: baseRecord.publishHooks.map((hook) =>
        hook.kind === 'publish_channel'
          ? {
              ...hook,
              target: 'manual-approval',
              payload: 'channel:manual-approval:release-batch-1',
            }
          : hook
      ),
    }
  }

  it('executes manual-approval dry-run with stable channel stub and published transition', () => {
    const record = buildManualApprovalRecord()
    const result = executePublishQueueRecordDryRun(record, { week: 4 })

    expect(result.record.status).toBe('published')
    expect(result.receipt.outcome).toBe('completed')
    expect(result.receipt.publishChannelStub).toBe(
      'dry-run:publish_channel:manual-approval:channel:manual-approval:release-batch-1'
    )
  })

  it('publishes on successful manual approval without mutating hooks', () => {
    const record = buildManualApprovalRecord()
    const result = executePublishQueueRecordLiveSync(record, {
      week: 8,
      manualApprovalClient: {
        resolveApproval: () => ({
          ok: true,
          approvalToken: 'release-batch-1',
          alreadyApproved: false,
        }),
      },
    })

    expect(result.record.status).toBe('published')
    expect(result.receipt.outcome).toBe('completed')
    expect(result.receipt.publishChannelRef).toBe(
      'live:publish_channel:manual-approval:token:release-batch-1:status:approved'
    )
    expect(result.record.creditingHooks).toEqual(record.creditingHooks)
  })

  it('rejects without mutation when manual approval is denied', () => {
    const record = buildManualApprovalRecord()
    const result = executePublishQueueRecordLiveSync(record, {
      week: 8,
      manualApprovalClient: {
        resolveApproval: () => ({
          ok: false,
          message: 'approval denied',
        }),
      },
    })

    expect(result.record).toBe(record)
    expect(result.receipt.outcome).toBe('rejected')
    expect(result.receipt.skipCode).toBe('publish_channel_api_failed')
  })

  it('rejects without mutation when approval token cannot be resolved', () => {
    const record = buildManualApprovalRecord('release:domain-code-bundle-spe-2480')
    const unresolvedRecord = {
      ...record,
      publishHooks: record.publishHooks.map((hook) =>
        hook.kind === 'publish_channel'
          ? {
              ...hook,
              payload: 'channel:manual-approval:',
            }
          : hook
      ),
    }

    const result = executePublishQueueRecordLiveSync(unresolvedRecord, {
      week: 8,
      manualApprovalClient: {
        resolveApproval: () => ({
          ok: true,
          approvalToken: 'release-batch-1',
          alreadyApproved: false,
        }),
      },
    })

    expect(result.record).toBe(unresolvedRecord)
    expect(result.receipt.outcome).toBe('rejected')
    expect(result.receipt.skipCode).toBe('publish_channel_approval_unresolved')
  })
})
