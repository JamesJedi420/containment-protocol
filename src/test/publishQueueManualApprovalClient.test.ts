import { describe, expect, it } from 'vitest'

import { CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE } from '../domain/publishAutomationCreditingHooks'
import {
  buildManualApprovalRequest,
  formatPublishQueueManualApprovalSuccessRef,
  resolveManualApprovalToken,
} from '../domain/publishQueueManualApprovalClient'

describe('publishQueueManualApprovalClient (SPE-2498 slice 1)', () => {
  it('resolves approval token from bare channel payload as default', () => {
    const hook = {
      kind: 'publish_channel' as const,
      target: 'manual-approval',
      payload: 'channel:manual-approval',
    }

    expect(
      resolveManualApprovalToken(hook, {
        ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
        releaseArtifactRef: 'release:domain-code-bundle-spe-2480',
      })
    ).toBe('default')
  })

  it('resolves approval token from channel payload suffix', () => {
    const hook = {
      kind: 'publish_channel' as const,
      target: 'manual-approval',
      payload: 'channel:manual-approval:release-batch-1',
    }

    expect(
      resolveManualApprovalToken(hook, {
        ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
        releaseArtifactRef: 'release:domain-code-bundle-spe-2480',
      })
    ).toBe('release-batch-1')
  })

  it('falls back to releaseArtifactRef approval pattern', () => {
    const hook = {
      kind: 'publish_channel' as const,
      target: 'manual-approval',
      payload: 'channel:manual-approval',
    }

    expect(
      resolveManualApprovalToken(hook, {
        ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
        releaseArtifactRef: 'release:approval:release-batch-1',
      })
    ).toBe('release-batch-1')
  })

  it('builds manual approval requests with frozen shape', () => {
    const hook = {
      kind: 'publish_channel' as const,
      target: 'manual-approval',
      payload: 'channel:manual-approval:release-batch-1',
    }
    const record = {
      ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
      id: 'publish-queue:manual-approval',
      releaseArtifactRef: 'release:approval:ignored-when-payload-resolves',
    }

    const request = buildManualApprovalRequest(hook, record)

    expect(request).toEqual({
      recordId: 'publish-queue:manual-approval',
      releaseArtifactRef: 'release:approval:ignored-when-payload-resolves',
      channelTarget: 'manual-approval',
      channelPayload: 'channel:manual-approval:release-batch-1',
      approvalToken: 'release-batch-1',
    })
  })

  it('formats live success refs deterministically', () => {
    const request = {
      recordId: 'publish-queue:manual-approval',
      releaseArtifactRef: 'release:approval:release-batch-1',
      channelTarget: 'manual-approval' as const,
      channelPayload: 'channel:manual-approval:release-batch-1',
      approvalToken: 'release-batch-1',
    }

    expect(
      formatPublishQueueManualApprovalSuccessRef(request, {
        ok: true,
        approvalToken: 'release-batch-1',
        alreadyApproved: false,
      })
    ).toBe('live:publish_channel:manual-approval:token:release-batch-1:status:approved')
  })

  it('returns undefined when approval token cannot be resolved', () => {
    const hook = {
      kind: 'publish_channel' as const,
      target: 'manual-approval',
      payload: 'channel:manual-approval:',
    }

    expect(
      buildManualApprovalRequest(hook, {
        ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
        releaseArtifactRef: 'release:domain-code-bundle-spe-2480',
      })
    ).toBeUndefined()
  })
})
