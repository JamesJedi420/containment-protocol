import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE,
  CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
  composePublishQueueRecord,
  evaluatePublishAutomationCreditingHooks,
} from '../domain/publishAutomationCreditingHooks'
import { evaluateContributionIntakeCuration, CANONICAL_CONTRIBUTION_SUBMISSION_FIXTURE } from '../domain/contributionIntakeCuration'
import {
  CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
  evaluateModularReleasePackaging,
} from '../domain/modularReleasePackaging'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  buildPublishQueueExecutionReceiptKey,
} from '../domain/publishQueueExecutionReceiptPersistence'
import {
  CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE,
  evaluateSubmissionGovernanceRights,
} from '../domain/submissionGovernanceRights'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

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

describe('advanceWeek publish queue integration (SPE-2485 / SPE-2491)', () => {
  it('is a no-op for an empty publish queue map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.publishQueueRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.publishQueueRecords).toEqual({})
    expect(nextState.publishQueueExecutionReceipts ?? {}).toEqual({})
  })

  it('transitions ready_to_publish records and surfaces dry-run execution notes', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    const record = buildCanonicalReadyQueueRecord()
    state.publishQueueRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const nextRecord = nextState.publishQueueRecords?.[record.id]

    expect(nextRecord?.status).toBe('published')

    const lastReport = nextState.reports[nextState.reports.length - 1]
    const publishQueueNote = lastReport?.notes?.find(
      (note) => note.type === 'contribution_release.publish_queue_execution'
    )

    expect(publishQueueNote).toBeDefined()
    expect(publishQueueNote?.content).toContain('Publish queue (dry-run)')
    expect(publishQueueNote?.content).toContain(record.label)
    expect(publishQueueNote?.content).toContain('dry-run:publish_channel:pr-merge:channel:pr-merge')
    expect(publishQueueNote?.metadata).toMatchObject({
      executionMode: 'dry-run',
      publishChannelStub: 'dry-run:publish_channel:pr-merge:channel:pr-merge',
    })

    const receiptKey = buildPublishQueueExecutionReceiptKey(record.id, nextState.week)!
    expect(nextState.publishQueueExecutionReceipts?.[receiptKey]).toMatchObject({
      recordId: record.id,
      outcome: 'completed',
      executionWeek: nextState.week,
    })
  })

  it('surfaces live execution notes when orchestration deps inject sync client', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    const record = {
      ...buildCanonicalReadyQueueRecord(),
      releaseArtifactRef: 'release:pr:2890',
    }
    state.publishQueueRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state, undefined, {
      environment: {
        mode: 'live',
        githubOwner: 'JamesJedi420',
        githubRepo: 'containment-protocol',
        githubToken: 'ghp_test_token',
      },
      githubClient: {
        mergePullRequest: () => ({
          ok: true,
          sha: 'abc123def456',
          merged: true,
          alreadyMerged: false,
        }),
      },
    })

    const nextRecord = nextState.publishQueueRecords?.[record.id]
    expect(nextRecord?.status).toBe('published')

    const lastReport = nextState.reports[nextState.reports.length - 1]
    const publishQueueNote = lastReport?.notes?.find(
      (note) => note.type === 'contribution_release.publish_queue_execution'
    )

    expect(publishQueueNote).toBeDefined()
    expect(publishQueueNote?.content).toContain('Publish queue (live)')
    expect(publishQueueNote?.content).toContain('Completed (live)')
    expect(publishQueueNote?.content).toContain('live:publish_channel:pr-merge')
    expect(publishQueueNote?.metadata).toMatchObject({
      executionMode: 'live',
      publishChannelRef: expect.stringContaining('live:publish_channel:pr-merge'),
    })

    const receiptKey = buildPublishQueueExecutionReceiptKey(record.id, nextState.week)!
    expect(nextState.publishQueueExecutionReceipts?.[receiptKey]?.publishChannelRef).toEqual(
      expect.stringContaining('live:publish_channel:pr-merge')
    )
  })

  it('surfaces live manual-approval notes and persists receipts when orchestration deps inject client', () => {
    const baseRecord = buildCanonicalReadyQueueRecord()
    const record = {
      ...baseRecord,
      id: 'publish-queue:manual-approval',
      releaseArtifactRef: 'release:approval:release-batch-1',
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
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.publishQueueRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state, undefined, {
      environment: { mode: 'live' },
      manualApprovalClient: {
        resolveApproval: () => ({
          ok: true,
          approvalToken: 'release-batch-1',
          alreadyApproved: false,
        }),
      },
    })

    expect(nextState.publishQueueRecords?.[record.id]?.status).toBe('published')

    const lastReport = nextState.reports[nextState.reports.length - 1]
    const publishQueueNote = lastReport?.notes?.find(
      (note) => note.type === 'contribution_release.publish_queue_execution'
    )

    expect(publishQueueNote).toBeDefined()
    expect(publishQueueNote?.content).toContain('Publish queue (live)')
    expect(publishQueueNote?.content).toContain(
      'live:publish_channel:manual-approval:token:release-batch-1:status:approved'
    )
    expect(publishQueueNote?.metadata).toMatchObject({
      executionMode: 'live',
      publishChannelRef:
        'live:publish_channel:manual-approval:token:release-batch-1:status:approved',
    })

    const receiptKey = buildPublishQueueExecutionReceiptKey(record.id, nextState.week)!
    expect(nextState.publishQueueExecutionReceipts?.[receiptKey]).toMatchObject({
      recordId: record.id,
      outcome: 'completed',
      executionWeek: nextState.week,
      publishChannelRef:
        'live:publish_channel:manual-approval:token:release-batch-1:status:approved',
    })
  })

  it('does not emit reportable notes when re-ticking already-published manual-approval records', () => {
    const baseRecord = buildCanonicalReadyQueueRecord()
    const record = {
      ...baseRecord,
      id: 'publish-queue:manual-approval-idempotent',
      status: 'published' as const,
      releaseArtifactRef: 'release:approval:release-batch-1',
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
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.publishQueueRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state, undefined, {
      environment: { mode: 'live' },
      manualApprovalClient: {
        resolveApproval: () => ({
          ok: true,
          approvalToken: 'release-batch-1',
          alreadyApproved: true,
        }),
      },
    })

    const lastReport = nextState.reports[nextState.reports.length - 1]
    const publishQueueNotes =
      lastReport?.notes?.filter(
        (note) => note.type === 'contribution_release.publish_queue_execution'
      ) ?? []

    expect(publishQueueNotes).toHaveLength(0)
    expect(nextState.publishQueueRecords?.[record.id]).toBe(record)
  })

  it('surfaces live webhook notes and persists receipts when orchestration deps inject client', () => {
    const baseRecord = buildCanonicalReadyQueueRecord()
    const record = {
      ...baseRecord,
      id: 'publish-queue:webhook',
      releaseArtifactRef: 'release:webhook:release-batch-1',
      publishHooks: baseRecord.publishHooks.map((hook) =>
        hook.kind === 'publish_channel'
          ? {
              ...hook,
              target: 'webhook',
              payload: 'channel:webhook:release-batch-1',
            }
          : hook
      ),
    }
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.publishQueueRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state, undefined, {
      environment: { mode: 'live' },
      webhookConfig: {
        endpoints: {
          'release-batch-1': {
            url: 'https://hooks.example.com/release-batch-1',
          },
        },
      },
      webhookClient: {
        deliverWebhook: () => ({
          ok: true,
          endpointId: 'release-batch-1',
          alreadyDelivered: false,
        }),
      },
    })

    const lastReport = nextState.reports[nextState.reports.length - 1]
    const publishQueueNote = lastReport?.notes?.find(
      (note) => note.type === 'contribution_release.publish_queue_execution'
    )

    expect(publishQueueNote).toBeDefined()
    expect(publishQueueNote?.content).toContain('Publish queue (live)')
    expect(publishQueueNote?.content).toContain(
      'live:publish_channel:webhook:endpoint:release-batch-1:status:delivered'
    )
    expect(publishQueueNote?.metadata).toMatchObject({
      executionMode: 'live',
      publishChannelRef:
        'live:publish_channel:webhook:endpoint:release-batch-1:status:delivered',
    })

    const receiptKey = buildPublishQueueExecutionReceiptKey(record.id, nextState.week)!
    expect(nextState.publishQueueExecutionReceipts?.[receiptKey]).toMatchObject({
      recordId: record.id,
      outcome: 'completed',
      executionWeek: nextState.week,
      publishChannelRef:
        'live:publish_channel:webhook:endpoint:release-batch-1:status:delivered',
    })
  })

  it('does not emit reportable notes when re-ticking already-published webhook records', () => {
    const baseRecord = buildCanonicalReadyQueueRecord()
    const record = {
      ...baseRecord,
      id: 'publish-queue:webhook-idempotent',
      status: 'published' as const,
      releaseArtifactRef: 'release:webhook:release-batch-1',
      publishHooks: baseRecord.publishHooks.map((hook) =>
        hook.kind === 'publish_channel'
          ? {
              ...hook,
              target: 'webhook',
              payload: 'channel:webhook:release-batch-1',
            }
          : hook
      ),
    }
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.publishQueueRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state, undefined, {
      environment: { mode: 'live' },
      webhookConfig: {
        endpoints: {
          'release-batch-1': {
            url: 'https://hooks.example.com/release-batch-1',
          },
        },
      },
      webhookClient: {
        deliverWebhook: () => ({
          ok: true,
          endpointId: 'release-batch-1',
          alreadyDelivered: true,
        }),
      },
    })

    const lastReport = nextState.reports[nextState.reports.length - 1]
    const publishQueueNotes =
      lastReport?.notes?.filter(
        (note) => note.type === 'contribution_release.publish_queue_execution'
      ) ?? []

    expect(publishQueueNotes).toHaveLength(0)
    expect(nextState.publishQueueRecords?.[record.id]).toBe(record)
  })
})
