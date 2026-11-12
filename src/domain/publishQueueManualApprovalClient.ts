/**
 * SPE-2498 slice 1: injectable sync client for publish-queue `manual-approval` channel.
 *
 * Pure domain adapter — no GameState mutation. Live mode requires an injected
 * sync client (tests/CI harness); browser runtime defaults to dry-run via executor.
 */

import type { PublishHookDescriptor } from './publishAutomationCreditingHooks'
import type { PublishQueueRecord } from './publishAutomationCreditingHooks'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PublishQueueManualApprovalRequest {
  readonly recordId: string
  readonly releaseArtifactRef: string
  readonly channelTarget: 'manual-approval'
  readonly channelPayload: string
  readonly approvalToken: string
}

export interface PublishQueueManualApprovalSuccess {
  readonly ok: true
  readonly approvalToken: string
  readonly alreadyApproved: boolean
}

export interface PublishQueueManualApprovalFailure {
  readonly ok: false
  readonly message: string
}

export type PublishQueueManualApprovalResult =
  | PublishQueueManualApprovalSuccess
  | PublishQueueManualApprovalFailure

export interface PublishQueueManualApprovalClientSync {
  resolveApproval(request: PublishQueueManualApprovalRequest): PublishQueueManualApprovalResult
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_APPROVAL_TOKEN = 'default'

function isBareManualApprovalChannelPayload(payload: string): boolean {
  const parts = payload.split(':')
  return parts.length === 2 && parts[0] === 'channel' && parts[1] === 'manual-approval'
}

function parseApprovalTokenFromChannelPayload(payload: string): string | undefined {
  const parts = payload.split(':')
  if (parts.length <= 2 || parts[0] !== 'channel' || parts[1] !== 'manual-approval') {
    return undefined
  }

  const token = parts.slice(2).join(':').trim()
  return token.length > 0 ? token : undefined
}

function parseApprovalTokenFromReleaseArtifactRef(releaseArtifactRef: string): string | undefined {
  const parts = releaseArtifactRef.split(':')
  if (parts.length < 3 || parts[0] !== 'release' || parts[1] !== 'approval') {
    return undefined
  }

  const token = parts.slice(2).join(':').trim()
  return token.length > 0 ? token : undefined
}

function buildLiveManualApprovalChannelRef(request: PublishQueueManualApprovalRequest): string {
  return `live:publish_channel:${request.channelTarget}:token:${request.approvalToken}:status:approved`
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolves approval token for the canonical `manual-approval` channel from hook
 * payload (`channel:manual-approval[:token]`) or `releaseArtifactRef`
 * (`release:approval:{token}`).
 */
export function resolveManualApprovalToken(
  hook: PublishHookDescriptor,
  record: PublishQueueRecord
): string | undefined {
  if (hook.kind !== 'publish_channel' || hook.target !== 'manual-approval') {
    return undefined
  }

  const payloadToken = parseApprovalTokenFromChannelPayload(hook.payload)
  if (payloadToken) {
    return payloadToken
  }

  const artifactToken = parseApprovalTokenFromReleaseArtifactRef(record.releaseArtifactRef)
  if (artifactToken) {
    return artifactToken
  }

  return isBareManualApprovalChannelPayload(hook.payload) ? DEFAULT_APPROVAL_TOKEN : undefined
}

export function buildManualApprovalRequest(
  hook: PublishHookDescriptor,
  record: PublishQueueRecord
): PublishQueueManualApprovalRequest | undefined {
  const approvalToken = resolveManualApprovalToken(hook, record)
  if (!approvalToken) {
    return undefined
  }

  return Object.freeze({
    recordId: record.id,
    releaseArtifactRef: record.releaseArtifactRef,
    channelTarget: 'manual-approval',
    channelPayload: hook.payload,
    approvalToken,
  })
}

export function formatPublishQueueManualApprovalSuccessRef(
  request: PublishQueueManualApprovalRequest
): string {
  return buildLiveManualApprovalChannelRef(request)
}
