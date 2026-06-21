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
import { applyWeeklyPublishQueueExecutionTick } from '../domain/publishQueueExecutor'
import {
  applyWeeklyPublishQueueExecutionTickOrchestrated,
  resolveEffectivePublishQueueWeeklyExecutionMode,
} from '../domain/publishQueueWeeklyOrchestration'
import {
  CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE,
  evaluateSubmissionGovernanceRights,
} from '../domain/submissionGovernanceRights'

function buildCanonicalReadyQueueRecord() {
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

  return composePublishQueueRecord({
    id: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id,
    label: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.label,
    releaseArtifactRef: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.releaseArtifactRef,
    decision,
    summary: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.summary,
    queuedWeek: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.queuedWeek,
  })!
}

function buildLiveReadyQueueRecord() {
  const record = buildCanonicalReadyQueueRecord()

  return {
    ...record,
    releaseArtifactRef: 'release:pr:2890',
  }
}

describe('publishQueueWeeklyOrchestration (SPE-2491 slice 1)', () => {
  const composedRecord = buildCanonicalReadyQueueRecord()
  const records = {
    [composedRecord.id]: composedRecord,
  }

  const liveEnvironment = {
    mode: 'live' as const,
    githubOwner: 'JamesJedi420',
    githubRepo: 'containment-protocol',
    githubToken: 'ghp_test_token',
  }

  it('defaults to dry-run when environment is unset or incomplete', () => {
    expect(resolveEffectivePublishQueueWeeklyExecutionMode()).toBe('dry-run')
    expect(
      resolveEffectivePublishQueueWeeklyExecutionMode({
        environment: { mode: 'live' },
      })
    ).toBe('dry-run')
  })

  it('resolves live mode only with complete GitHub credentials', () => {
    expect(
      resolveEffectivePublishQueueWeeklyExecutionMode({
        environment: liveEnvironment,
      })
    ).toBe('live')
  })

  it('resolves live mode with injectable manual-approval client even without GitHub credentials', () => {
    expect(
      resolveEffectivePublishQueueWeeklyExecutionMode({
        environment: { mode: 'live' },
        manualApprovalClient: {
          resolveApproval: () => ({
            ok: true,
            approvalToken: 'release-batch-1',
            alreadyApproved: false,
          }),
        },
      })
    ).toBe('live')
  })

  it('matches dry-run weekly tick when live mode is not effective', () => {
    const orchestrated = applyWeeklyPublishQueueExecutionTickOrchestrated(records, 4)
    const dryRun = applyWeeklyPublishQueueExecutionTick(records, 4)

    expect(orchestrated).toEqual(dryRun)
  })

  it('uses live sync executor when configured with injectable client', () => {
    const liveRecord = buildLiveReadyQueueRecord()
    const liveRecords = {
      [liveRecord.id]: liveRecord,
    }

    const orchestrated = applyWeeklyPublishQueueExecutionTickOrchestrated(liveRecords, 4, {
      environment: liveEnvironment,
      githubClient: {
        mergePullRequest: () => ({
          ok: true,
          sha: 'abc123def456',
          merged: true,
          alreadyMerged: false,
        }),
      },
    })

    expect(orchestrated.records[liveRecord.id]?.status).toBe('published')
    expect(orchestrated.receipts[0]?.publishChannelRef).toContain('live:publish_channel:pr-merge')
    expect(orchestrated.receipts[0]?.publishChannelStub).toBeUndefined()
  })

  it('does not mutate records when live API merge fails', () => {
    const liveRecord = buildLiveReadyQueueRecord()
    const liveRecords = {
      [liveRecord.id]: liveRecord,
    }

    const orchestrated = applyWeeklyPublishQueueExecutionTickOrchestrated(liveRecords, 4, {
      environment: liveEnvironment,
      githubClient: {
        mergePullRequest: () => ({
          ok: false,
          statusCode: 500,
          message: 'merge failed',
        }),
      },
    })

    expect(orchestrated.records[liveRecord.id]).toBe(liveRecord)
    expect(orchestrated.receipts[0]?.outcome).toBe('rejected')
    expect(orchestrated.receipts[0]?.skipCode).toBe('publish_channel_api_failed')
  })

  it('falls back to dry-run when live mode is configured without sync client', () => {
    const orchestrated = applyWeeklyPublishQueueExecutionTickOrchestrated(records, 4, {
      environment: liveEnvironment,
    })
    const dryRun = applyWeeklyPublishQueueExecutionTick(records, 4)

    expect(orchestrated).toEqual(dryRun)
  })

  it('uses live manual-approval client when configured without GitHub credentials', () => {
    const manualApprovalRecord = {
      ...buildCanonicalReadyQueueRecord(),
      id: 'publish-queue:manual-approval',
      releaseArtifactRef: 'release:approval:release-batch-1',
      publishHooks: buildCanonicalReadyQueueRecord().publishHooks.map((hook) =>
        hook.kind === 'publish_channel'
          ? {
              ...hook,
              target: 'manual-approval',
              payload: 'channel:manual-approval:release-batch-1',
            }
          : hook
      ),
    }
    const manualApprovalRecords = {
      [manualApprovalRecord.id]: manualApprovalRecord,
    }

    const orchestrated = applyWeeklyPublishQueueExecutionTickOrchestrated(
      manualApprovalRecords,
      4,
      {
        environment: { mode: 'live' },
        manualApprovalClient: {
          resolveApproval: () => ({
            ok: true,
            approvalToken: 'release-batch-1',
            alreadyApproved: false,
          }),
        },
      }
    )

    expect(orchestrated.records[manualApprovalRecord.id]?.status).toBe('published')
    expect(orchestrated.receipts[0]?.publishChannelRef).toBe(
      'live:publish_channel:manual-approval:token:release-batch-1:status:approved'
    )
  })

  it('executes mixed pr-merge and manual-approval records in stable id order', () => {
    const prMergeRecord = buildLiveReadyQueueRecord()
    const manualApprovalRecord = {
      ...buildCanonicalReadyQueueRecord(),
      id: 'publish-queue:manual-approval-mixed',
      releaseArtifactRef: 'release:approval:release-batch-2',
      publishHooks: buildCanonicalReadyQueueRecord().publishHooks.map((hook) =>
        hook.kind === 'publish_channel'
          ? {
              ...hook,
              target: 'manual-approval',
              payload: 'channel:manual-approval:release-batch-2',
            }
          : hook
      ),
    }
    const mixedRecords = {
      [manualApprovalRecord.id]: manualApprovalRecord,
      [prMergeRecord.id]: prMergeRecord,
    }

    const orchestrated = applyWeeklyPublishQueueExecutionTickOrchestrated(mixedRecords, 4, {
      environment: liveEnvironment,
      githubClient: {
        mergePullRequest: () => ({
          ok: true,
          sha: 'abc123def456',
          merged: true,
          alreadyMerged: false,
        }),
      },
      manualApprovalClient: {
        resolveApproval: () => ({
          ok: true,
          approvalToken: 'release-batch-2',
          alreadyApproved: false,
        }),
      },
    })

    expect(orchestrated.receipts.map((receipt) => receipt.recordId)).toEqual([
      prMergeRecord.id,
      manualApprovalRecord.id,
    ])
    expect(orchestrated.records[manualApprovalRecord.id]?.status).toBe('published')
    expect(orchestrated.records[prMergeRecord.id]?.status).toBe('published')
  })

  const testWebhookConfig = {
    endpoints: {
      'release-batch-1': {
        url: 'https://hooks.example.com/release-batch-1',
      },
    },
  }

  it('resolves live mode with injectable webhook client even without GitHub credentials', () => {
    expect(
      resolveEffectivePublishQueueWeeklyExecutionMode({
        environment: { mode: 'live' },
        webhookClient: {
          deliverWebhook: () => ({
            ok: true,
            endpointId: 'release-batch-1',
            alreadyDelivered: false,
          }),
        },
      })
    ).toBe('live')
  })

  it('uses live webhook client when configured without GitHub credentials', () => {
    const webhookRecord = {
      ...buildCanonicalReadyQueueRecord(),
      id: 'publish-queue:webhook',
      releaseArtifactRef: 'release:webhook:release-batch-1',
      publishHooks: buildCanonicalReadyQueueRecord().publishHooks.map((hook) =>
        hook.kind === 'publish_channel'
          ? {
              ...hook,
              target: 'webhook',
              payload: 'channel:webhook:release-batch-1',
            }
          : hook
      ),
    }
    const webhookRecords = {
      [webhookRecord.id]: webhookRecord,
    }

    const orchestrated = applyWeeklyPublishQueueExecutionTickOrchestrated(webhookRecords, 4, {
      environment: { mode: 'live' },
      webhookConfig: testWebhookConfig,
      webhookClient: {
        deliverWebhook: () => ({
          ok: true,
          endpointId: 'release-batch-1',
          alreadyDelivered: false,
        }),
      },
    })

    expect(orchestrated.records[webhookRecord.id]?.status).toBe('published')
    expect(orchestrated.receipts[0]?.publishChannelRef).toBe(
      'live:publish_channel:webhook:endpoint:release-batch-1:status:delivered'
    )
  })

  it('executes mixed pr-merge, manual-approval, and webhook records in stable id order', () => {
    const prMergeRecord = buildLiveReadyQueueRecord()
    const manualApprovalRecord = {
      ...buildCanonicalReadyQueueRecord(),
      id: 'publish-queue:manual-approval-mixed',
      releaseArtifactRef: 'release:approval:release-batch-2',
      publishHooks: buildCanonicalReadyQueueRecord().publishHooks.map((hook) =>
        hook.kind === 'publish_channel'
          ? {
              ...hook,
              target: 'manual-approval',
              payload: 'channel:manual-approval:release-batch-2',
            }
          : hook
      ),
    }
    const webhookRecord = {
      ...buildCanonicalReadyQueueRecord(),
      id: 'publish-queue:webhook-mixed',
      releaseArtifactRef: 'release:webhook:release-batch-1',
      publishHooks: buildCanonicalReadyQueueRecord().publishHooks.map((hook) =>
        hook.kind === 'publish_channel'
          ? {
              ...hook,
              target: 'webhook',
              payload: 'channel:webhook:release-batch-1',
            }
          : hook
      ),
    }
    const mixedRecords = {
      [manualApprovalRecord.id]: manualApprovalRecord,
      [prMergeRecord.id]: prMergeRecord,
      [webhookRecord.id]: webhookRecord,
    }

    const orchestrated = applyWeeklyPublishQueueExecutionTickOrchestrated(mixedRecords, 4, {
      environment: liveEnvironment,
      webhookConfig: testWebhookConfig,
      githubClient: {
        mergePullRequest: () => ({
          ok: true,
          sha: 'abc123def456',
          merged: true,
          alreadyMerged: false,
        }),
      },
      manualApprovalClient: {
        resolveApproval: () => ({
          ok: true,
          approvalToken: 'release-batch-2',
          alreadyApproved: false,
        }),
      },
      webhookClient: {
        deliverWebhook: () => ({
          ok: true,
          endpointId: 'release-batch-1',
          alreadyDelivered: false,
        }),
      },
    })

    expect(orchestrated.receipts.map((receipt) => receipt.recordId)).toEqual([
      prMergeRecord.id,
      manualApprovalRecord.id,
      webhookRecord.id,
    ])
    expect(orchestrated.records[manualApprovalRecord.id]?.status).toBe('published')
    expect(orchestrated.records[prMergeRecord.id]?.status).toBe('published')
    expect(orchestrated.records[webhookRecord.id]?.status).toBe('published')
  })
})
