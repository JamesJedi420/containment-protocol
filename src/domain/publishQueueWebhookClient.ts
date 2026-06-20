/**
 * SPE-75 webhook slice 1: injectable HTTP client for publish-queue `webhook` channel.
 *
 * Pure domain HTTP adapter — no GameState mutation. Live mode requires explicit
 * injected clients or CI env config; browser runtime defaults to dry-run via executor.
 */

import type { PublishHookDescriptor } from './publishAutomationCreditingHooks'
import type { PublishQueueRecord } from './publishAutomationCreditingHooks'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PublishQueueWebhookEndpointConfig {
  readonly url: string
  readonly token?: string
}

export interface PublishQueueWebhookConfig {
  readonly endpoints: Readonly<Record<string, PublishQueueWebhookEndpointConfig>>
}

export interface PublishQueueWebhookRequest {
  readonly recordId: string
  readonly releaseArtifactRef: string
  readonly channelTarget: 'webhook'
  readonly channelPayload: string
  readonly endpointId: string
  readonly url: string
  readonly authToken?: string
}

export interface PublishQueueWebhookSuccess {
  readonly ok: true
  readonly endpointId: string
  readonly alreadyDelivered: boolean
}

export interface PublishQueueWebhookFailure {
  readonly ok: false
  readonly statusCode: number
  readonly message: string
}

export type PublishQueueWebhookResult = PublishQueueWebhookSuccess | PublishQueueWebhookFailure

export interface PublishQueueWebhookClient {
  deliverWebhook(request: PublishQueueWebhookRequest): Promise<PublishQueueWebhookResult>
}

export interface PublishQueueWebhookClientSync {
  deliverWebhook(request: PublishQueueWebhookRequest): PublishQueueWebhookResult
}

export type PublishQueueWebhookEnvSource = Record<string, string | undefined>

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

const DEFAULT_ENDPOINT_ID = 'default'

const WEBHOOK_URL_ENV_PREFIX = 'PUBLISH_QUEUE_WEBHOOK_'
const WEBHOOK_URL_ENV_SUFFIX = '_URL'
const WEBHOOK_TOKEN_ENV_SUFFIX = '_TOKEN'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readProcessEnv(): PublishQueueWebhookEnvSource {
  if (typeof process === 'undefined' || !process.env) {
    return {}
  }

  return process.env
}

function normalizeEndpointIdForEnv(endpointId: string): string {
  return endpointId.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()
}

function buildWebhookTokenEnvKey(endpointId: string): string {
  return `${WEBHOOK_URL_ENV_PREFIX}${normalizeEndpointIdForEnv(endpointId)}${WEBHOOK_TOKEN_ENV_SUFFIX}`
}

function decodeEndpointIdFromEnvKey(envId: string): string {
  return envId.toLowerCase().replace(/_/g, '-')
}

function parseEndpointIdFromChannelPayload(payload: string): string | undefined {
  const parts = payload.split(':')
  if (parts.length < 2 || parts[0] !== 'channel' || parts[1] !== 'webhook') {
    return undefined
  }

  if (parts.length === 2) {
    return DEFAULT_ENDPOINT_ID
  }

  const endpointId = parts[2]?.trim()
  return endpointId && endpointId.length > 0 ? endpointId : undefined
}

function parseAuthTokenFromChannelPayload(payload: string): string | undefined {
  const parts = payload.split(':')
  if (parts.length < 2 || parts[0] !== 'channel' || parts[1] !== 'webhook') {
    return undefined
  }

  if (parts.length <= 3) {
    return undefined
  }

  const token = parts.slice(3).join(':').trim()
  return token.length > 0 ? token : undefined
}

function parseEndpointIdFromReleaseArtifactRef(releaseArtifactRef: string): string | undefined {
  const parts = releaseArtifactRef.split(':')
  if (parts.length < 3 || parts[0] !== 'release' || parts[1] !== 'webhook') {
    return undefined
  }

  const endpointId = parts.slice(2).join(':').trim()
  return endpointId.length > 0 ? endpointId : undefined
}

function resolveEndpointConfig(
  endpointId: string,
  config: PublishQueueWebhookConfig
): PublishQueueWebhookEndpointConfig | undefined {
  return config.endpoints[endpointId]
}

function buildLiveWebhookChannelRef(request: PublishQueueWebhookRequest): string {
  return `live:publish_channel:${request.channelTarget}:endpoint:${request.endpointId}:status:delivered`
}

function buildWebhookPostBody(request: PublishQueueWebhookRequest): string {
  return JSON.stringify({
    recordId: request.recordId,
    releaseArtifactRef: request.releaseArtifactRef,
    endpointId: request.endpointId,
    channelTarget: request.channelTarget,
    channelPayload: request.channelPayload,
  })
}

function isAlreadyDeliveredStatus(statusCode: number): boolean {
  return statusCode === 409
}

function buildAuthorizationHeader(authToken: string | undefined): Record<string, string> {
  if (!authToken) {
    return {}
  }

  return { Authorization: `Bearer ${authToken}` }
}

async function deliverWebhookWithFetch(
  request: PublishQueueWebhookRequest,
  fetchImpl: typeof fetch
): Promise<PublishQueueWebhookResult> {
  try {
    const response = await fetchImpl(request.url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...buildAuthorizationHeader(request.authToken),
      },
      body: buildWebhookPostBody(request),
    })

    if (response.ok) {
      return {
        ok: true,
        endpointId: request.endpointId,
        alreadyDelivered: false,
      }
    }

    if (isAlreadyDeliveredStatus(response.status)) {
      return {
        ok: true,
        endpointId: request.endpointId,
        alreadyDelivered: true,
      }
    }

    const bodyText = await response.text()
    return {
      ok: false,
      statusCode: response.status,
      message: bodyText || `Webhook delivery failed with status ${response.status}`,
    }
  } catch (error) {
    return {
      ok: false,
      statusCode: 0,
      message: error instanceof Error ? error.message : 'Webhook delivery request failed',
    }
  }
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolves endpoint id for the canonical `webhook` channel from hook payload
 * (`channel:webhook[:endpointId]`) or `releaseArtifactRef` (`release:webhook:{id}`).
 */
export function resolveWebhookEndpointId(
  hook: PublishHookDescriptor,
  record: PublishQueueRecord
): string | undefined {
  if (hook.kind !== 'publish_channel' || hook.target !== 'webhook') {
    return undefined
  }

  return (
    parseEndpointIdFromChannelPayload(hook.payload) ??
    parseEndpointIdFromReleaseArtifactRef(record.releaseArtifactRef)
  )
}

export function buildWebhookRequest(
  hook: PublishHookDescriptor,
  record: PublishQueueRecord,
  config: PublishQueueWebhookConfig
): PublishQueueWebhookRequest | undefined {
  const endpointId = resolveWebhookEndpointId(hook, record)
  if (!endpointId) {
    return undefined
  }

  const endpointConfig = resolveEndpointConfig(endpointId, config)
  if (!endpointConfig) {
    return undefined
  }

  const payloadAuthToken = parseAuthTokenFromChannelPayload(hook.payload)
  const authToken = payloadAuthToken ?? endpointConfig.token

  return Object.freeze({
    recordId: record.id,
    releaseArtifactRef: record.releaseArtifactRef,
    channelTarget: 'webhook',
    channelPayload: hook.payload,
    endpointId,
    url: endpointConfig.url,
    ...(authToken ? { authToken } : {}),
  })
}

export function buildPublishQueueWebhookConfig(
  env: PublishQueueWebhookEnvSource = readProcessEnv()
): PublishQueueWebhookConfig | undefined {
  const endpoints: Record<string, PublishQueueWebhookEndpointConfig> = {}

  for (const [key, value] of Object.entries(env)) {
    if (!value || !key.startsWith(WEBHOOK_URL_ENV_PREFIX) || !key.endsWith(WEBHOOK_URL_ENV_SUFFIX)) {
      continue
    }

    const envId = key.slice(
      WEBHOOK_URL_ENV_PREFIX.length,
      key.length - WEBHOOK_URL_ENV_SUFFIX.length
    )
    if (!envId) {
      continue
    }

    const endpointId = decodeEndpointIdFromEnvKey(envId)
    const token = env[buildWebhookTokenEnvKey(endpointId)]
    endpoints[endpointId] = Object.freeze({
      url: value,
      ...(token ? { token } : {}),
    })
  }

  if (Object.keys(endpoints).length === 0) {
    return undefined
  }

  return Object.freeze({ endpoints: Object.freeze(endpoints) })
}

export function formatPublishQueueWebhookSuccessRef(request: PublishQueueWebhookRequest): string {
  return buildLiveWebhookChannelRef(request)
}

// ---------------------------------------------------------------------------
// Default client
// ---------------------------------------------------------------------------

/**
 * Creates a fetch-backed webhook client for publish-queue delivery calls.
 * Intended for CI/automation with injected endpoint config — not browser defaults.
 */
export function createPublishQueueWebhookClient(
  config: PublishQueueWebhookConfig,
  fetchImpl: typeof fetch = fetch
): PublishQueueWebhookClient {
  return {
    async deliverWebhook(request) {
      if (!resolveEndpointConfig(request.endpointId, config)) {
        return {
          ok: false,
          statusCode: 0,
          message: `Unknown webhook endpoint: ${request.endpointId}`,
        }
      }

      return deliverWebhookWithFetch(request, fetchImpl)
    },
  }
}
