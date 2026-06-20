import { describe, expect, it, vi } from 'vitest'

import { CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE } from '../domain/publishAutomationCreditingHooks'
import {
  buildPublishQueueWebhookConfig,
  buildWebhookRequest,
  createPublishQueueWebhookClient,
  formatPublishQueueWebhookSuccessRef,
  resolveWebhookEndpointId,
} from '../domain/publishQueueWebhookClient'

const testWebhookConfig = Object.freeze({
  endpoints: Object.freeze({
    default: Object.freeze({
      url: 'https://hooks.example.com/default',
    }),
    'release-batch-1': Object.freeze({
      url: 'https://hooks.example.com/release-batch-1',
      token: 'endpoint-secret',
    }),
  }),
})

describe('publishQueueWebhookClient (SPE-2499 slice 1)', () => {
  it('resolves endpoint id from bare channel payload as default', () => {
    const hook = {
      kind: 'publish_channel' as const,
      target: 'webhook',
      payload: 'channel:webhook',
    }

    expect(
      resolveWebhookEndpointId(hook, {
        ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
        releaseArtifactRef: 'release:domain-code-bundle-spe-2480',
      })
    ).toBe('default')
  })

  it('resolves endpoint id from channel payload suffix', () => {
    const hook = {
      kind: 'publish_channel' as const,
      target: 'webhook',
      payload: 'channel:webhook:release-batch-1',
    }

    expect(
      resolveWebhookEndpointId(hook, {
        ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
        releaseArtifactRef: 'release:domain-code-bundle-spe-2480',
      })
    ).toBe('release-batch-1')
  })

  it('falls back to releaseArtifactRef webhook pattern', () => {
    const hook = {
      kind: 'publish_channel' as const,
      target: 'webhook',
      payload: 'channel:webhook',
    }

    expect(
      resolveWebhookEndpointId(hook, {
        ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
        releaseArtifactRef: 'release:webhook:release-batch-1',
      })
    ).toBe('release-batch-1')
  })

  it('builds webhook requests with frozen shape and endpoint config', () => {
    const hook = {
      kind: 'publish_channel' as const,
      target: 'webhook',
      payload: 'channel:webhook:release-batch-1',
    }
    const record = {
      ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
      id: 'publish-queue:webhook',
      releaseArtifactRef: 'release:webhook:ignored-when-payload-resolves',
    }

    const request = buildWebhookRequest(hook, record, testWebhookConfig)

    expect(request).toEqual({
      recordId: 'publish-queue:webhook',
      releaseArtifactRef: 'release:webhook:ignored-when-payload-resolves',
      channelTarget: 'webhook',
      channelPayload: 'channel:webhook:release-batch-1',
      endpointId: 'release-batch-1',
      url: 'https://hooks.example.com/release-batch-1',
      authToken: 'endpoint-secret',
    })
  })

  it('prefers auth token from hook payload suffix over endpoint config', () => {
    const hook = {
      kind: 'publish_channel' as const,
      target: 'webhook',
      payload: 'channel:webhook:release-batch-1:payload-token',
    }
    const record = {
      ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
      id: 'publish-queue:webhook',
    }

    const request = buildWebhookRequest(hook, record, testWebhookConfig)

    expect(request?.authToken).toBe('payload-token')
  })

  it('formats live success refs deterministically', () => {
    const request = {
      recordId: 'publish-queue:webhook',
      releaseArtifactRef: 'release:webhook:release-batch-1',
      channelTarget: 'webhook' as const,
      channelPayload: 'channel:webhook:release-batch-1',
      endpointId: 'release-batch-1',
      url: 'https://hooks.example.com/release-batch-1',
    }

    expect(formatPublishQueueWebhookSuccessRef(request)).toBe(
      'live:publish_channel:webhook:endpoint:release-batch-1:status:delivered'
    )
  })

  it('returns undefined when endpoint id or config cannot be resolved', () => {
    const hook = {
      kind: 'publish_channel' as const,
      target: 'webhook',
      payload: 'channel:webhook:',
    }

    expect(
      buildWebhookRequest(hook, CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE, testWebhookConfig)
    ).toBeUndefined()

    expect(
      buildWebhookRequest(
        {
          kind: 'publish_channel',
          target: 'webhook',
          payload: 'channel:webhook:missing-endpoint',
        },
        CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
        testWebhookConfig
      )
    ).toBeUndefined()
  })

  it('reads endpoint config from CI-style env keys', () => {
    const config = buildPublishQueueWebhookConfig({
      PUBLISH_QUEUE_WEBHOOK_DEFAULT_URL: 'https://hooks.example.com/default',
      PUBLISH_QUEUE_WEBHOOK_RELEASE_BATCH_1_URL: 'https://hooks.example.com/release-batch-1',
      PUBLISH_QUEUE_WEBHOOK_RELEASE_BATCH_1_TOKEN: 'env-token',
    })

    expect(config).toEqual({
      endpoints: {
        default: { url: 'https://hooks.example.com/default' },
        'release-batch-1': {
          url: 'https://hooks.example.com/release-batch-1',
          token: 'env-token',
        },
      },
    })
  })

  it('delivers webhooks through fetch and treats 409 as idempotent success', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('', {
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response('already accepted', {
          status: 409,
        })
      )

    const client = createPublishQueueWebhookClient(testWebhookConfig, fetchImpl)
    const request = {
      recordId: 'publish-queue:webhook',
      releaseArtifactRef: 'release:webhook:release-batch-1',
      channelTarget: 'webhook' as const,
      channelPayload: 'channel:webhook:release-batch-1',
      endpointId: 'release-batch-1',
      url: 'https://hooks.example.com/release-batch-1',
      authToken: 'endpoint-secret',
    }

    const success = await client.deliverWebhook(request)
    const alreadyDelivered = await client.deliverWebhook(request)

    expect(success).toEqual({
      ok: true,
      endpointId: 'release-batch-1',
      alreadyDelivered: false,
    })
    expect(alreadyDelivered).toEqual({
      ok: true,
      endpointId: 'release-batch-1',
      alreadyDelivered: true,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://hooks.example.com/release-batch-1',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer endpoint-secret',
        }),
      })
    )
  })

  it('returns failure results for non-success HTTP responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('delivery rejected', {
        status: 500,
      })
    )

    const client = createPublishQueueWebhookClient(testWebhookConfig, fetchImpl)
    const result = await client.deliverWebhook({
      recordId: 'publish-queue:webhook',
      releaseArtifactRef: 'release:webhook:release-batch-1',
      channelTarget: 'webhook',
      channelPayload: 'channel:webhook:release-batch-1',
      endpointId: 'release-batch-1',
      url: 'https://hooks.example.com/release-batch-1',
    })

    expect(result).toEqual({
      ok: false,
      statusCode: 500,
      message: 'delivery rejected',
    })
  })
})
