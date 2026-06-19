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
})
