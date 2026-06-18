import { describe, expect, it, vi } from 'vitest'

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
  executePublishQueueRecordLive,
  executePublishQueueRecordsDryRun,
  executePublishQueueRecordsLive,
} from '../domain/publishQueueExecutor'
import {
  buildPublishQueueGitHubConfig,
  createPublishQueueGitHubClient,
  readPublishQueueExecutorEnvironment,
  resolvePrMergePullNumber,
} from '../domain/publishQueueGitHubClient'
import {
  CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE,
  evaluateSubmissionGovernanceRights,
} from '../domain/submissionGovernanceRights'

describe('publishQueueGitHubClient (SPE-2488 slice 1)', () => {
  it('defaults executor environment to dry-run without credentials', () => {
    expect(readPublishQueueExecutorEnvironment({})).toEqual({
      mode: 'dry-run',
    })
  })

  it('reads live mode and repository credentials from CI-style env', () => {
    const environment = readPublishQueueExecutorEnvironment({
      PUBLISH_QUEUE_EXECUTOR_MODE: 'live',
      GITHUB_REPOSITORY: 'JamesJedi420/containment-protocol',
      GITHUB_TOKEN: 'ghp_test_token',
    })

    expect(environment).toEqual({
      mode: 'live',
      githubOwner: 'JamesJedi420',
      githubRepo: 'containment-protocol',
      githubToken: 'ghp_test_token',
    })
    expect(buildPublishQueueGitHubConfig(environment)).toEqual({
      owner: 'JamesJedi420',
      repo: 'containment-protocol',
      token: 'ghp_test_token',
    })
  })

  it('resolves pull number from channel payload suffix', () => {
    const hook = {
      kind: 'publish_channel' as const,
      target: 'pr-merge',
      payload: 'channel:pr-merge:2890',
    }

    expect(
      resolvePrMergePullNumber(hook, {
        ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
        releaseArtifactRef: 'release:domain-code-bundle-spe-2480',
      })
    ).toBe(2890)
  })

  it('merges pull requests through fetch and treats already-merged as idempotent success', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sha: 'abc123def456' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Pull Request successfully merged' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    const client = createPublishQueueGitHubClient(
      {
        owner: 'JamesJedi420',
        repo: 'containment-protocol',
        token: 'ghp_test_token',
      },
      fetchImpl
    )

    const request = {
      owner: 'JamesJedi420',
      repo: 'containment-protocol',
      pullNumber: 2890,
      recordId: 'publish-queue:test',
      releaseArtifactRef: 'release:pr:2890',
      channelTarget: 'pr-merge',
      channelPayload: 'channel:pr-merge:2890',
    }

    await expect(client.mergePullRequest(request)).resolves.toEqual({
      ok: true,
      sha: 'abc123def456',
      merged: true,
      alreadyMerged: false,
    })

    await expect(client.mergePullRequest(request)).resolves.toEqual({
      ok: true,
      sha: 'already-merged',
      merged: false,
      alreadyMerged: true,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'https://api.github.com/repos/JamesJedi420/containment-protocol/pulls/2890/merge'
    )
  })

  it('returns structured failure without throwing on network errors', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'))
    const client = createPublishQueueGitHubClient(
      {
        owner: 'JamesJedi420',
        repo: 'containment-protocol',
        token: 'ghp_test_token',
      },
      fetchImpl
    )

    await expect(
      client.mergePullRequest({
        owner: 'JamesJedi420',
        repo: 'containment-protocol',
        pullNumber: 1,
        recordId: 'publish-queue:test',
        releaseArtifactRef: 'release:pr:1',
        channelTarget: 'pr-merge',
        channelPayload: 'channel:pr-merge:1',
      })
    ).resolves.toEqual({
      ok: false,
      statusCode: 0,
      message: 'network down',
    })
  })
})

describe('publishQueueExecutor live path (SPE-2488 slice 1)', () => {
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
    releaseArtifactRef: 'release:pr:2890',
    decision,
    summary: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.summary,
    queuedWeek: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.queuedWeek,
  })!

  const liveGithubClient = {
    mergePullRequest: vi.fn(),
  }

  const liveOptions = {
    week: 8,
    githubConfig: {
      owner: 'JamesJedi420',
      repo: 'containment-protocol',
    },
    githubClient: liveGithubClient,
  }

  it('publishes on successful GitHub merge without mutating hooks', async () => {
    liveGithubClient.mergePullRequest.mockResolvedValueOnce({
      ok: true,
      sha: 'abc123def456',
      merged: true,
      alreadyMerged: false,
    })

    const result = await executePublishQueueRecordLive(composedRecord, liveOptions)

    expect(result.record.status).toBe('published')
    expect(result.receipt.outcome).toBe('completed')
    expect(result.receipt.publishChannelRef).toBe(
      'live:publish_channel:pr-merge:pr:2890:sha:abc123def456'
    )
    expect(result.receipt.publishChannelStub).toBeUndefined()
    expect(result.record.creditingHooks).toEqual(composedRecord.creditingHooks)
    expect(liveGithubClient.mergePullRequest).toHaveBeenCalledOnce()
  })

  it('rejects without mutation when GitHub merge fails', async () => {
    liveGithubClient.mergePullRequest.mockResolvedValueOnce({
      ok: false,
      statusCode: 403,
      message: 'Resource not accessible by integration',
    })

    const failingClient = liveGithubClient

    const result = await executePublishQueueRecordLive(composedRecord, {
      ...liveOptions,
      githubClient: failingClient,
    })

    expect(result.record).toBe(composedRecord)
    expect(result.receipt.outcome).toBe('rejected')
    expect(result.receipt.skipCode).toBe('publish_channel_api_failed')
  })

  it('rejects without mutation when pull request number cannot be resolved', async () => {
    const unresolvedClient = {
      mergePullRequest: vi.fn(),
    }
    const unresolvedRecord = composePublishQueueRecord({
      id: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id,
      label: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.label,
      releaseArtifactRef: 'release:domain-code-bundle-spe-2480',
      decision,
      summary: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.summary,
      queuedWeek: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.queuedWeek,
    })!

    const result = await executePublishQueueRecordLive(unresolvedRecord, {
      ...liveOptions,
      githubClient: unresolvedClient,
    })

    expect(result.record).toBe(unresolvedRecord)
    expect(result.receipt.outcome).toBe('rejected')
    expect(result.receipt.skipCode).toBe('publish_channel_pull_request_unresolved')
    expect(unresolvedClient.mergePullRequest).not.toHaveBeenCalled()
  })

  it('batch live execution preserves non-ready records and stable ordering', async () => {
    liveGithubClient.mergePullRequest.mockResolvedValueOnce({
      ok: true,
      sha: 'abc123def456',
      merged: true,
      alreadyMerged: false,
    })
    const needsRevision = {
      ...composedRecord,
      id: 'publish-queue:needs-revision-live',
      status: 'needs_revision' as const,
      reasonCodes: ['crediting_targets_borderline'] as const,
    }

    const batch = await executePublishQueueRecordsLive(
      {
        [needsRevision.id]: needsRevision,
        [composedRecord.id]: composedRecord,
      },
      liveOptions
    )

    expect(batch.receipts.map((receipt) => receipt.recordId)).toEqual([
      composedRecord.id,
      needsRevision.id,
    ])
    expect(batch.records[composedRecord.id]?.status).toBe('published')
    expect(batch.records[needsRevision.id]).toBe(needsRevision)
  })

  it('keeps dry-run executor behavior unchanged for weekly tick regression', () => {
    const dryRun = executePublishQueueRecordDryRun(
      {
        ...composedRecord,
        releaseArtifactRef: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.releaseArtifactRef,
      },
      { week: 4 }
    )
    const weeklyPass = applyWeeklyPublishQueueExecutionTick(
      {
        [composedRecord.id]: {
          ...composedRecord,
          releaseArtifactRef: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.releaseArtifactRef,
        },
      },
      4
    )
    const batchPass = executePublishQueueRecordsDryRun(
      {
        [composedRecord.id]: {
          ...composedRecord,
          releaseArtifactRef: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.releaseArtifactRef,
        },
      },
      { week: 4 }
    )

    expect(dryRun.receipt.publishChannelStub).toBe(
      'dry-run:publish_channel:pr-merge:channel:pr-merge'
    )
    expect(weeklyPass).toEqual(batchPass)
  })
})
