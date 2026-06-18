/**
 * SPE-2488 slice 1: injectable GitHub client for publish-queue `pr-merge` channel.
 *
 * Pure domain HTTP adapter — no GameState mutation. Live mode requires explicit
 * credentials; browser runtime defaults to dry-run via executor options.
 */

import type { PublishHookDescriptor } from './publishAutomationCreditingHooks'
import type { PublishQueueRecord } from './publishAutomationCreditingHooks'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PublishQueueExecutionMode = 'dry-run' | 'live'

export const PUBLISH_QUEUE_EXECUTION_MODES: readonly PublishQueueExecutionMode[] = [
  'dry-run',
  'live',
] as const

export interface PublishQueueGitHubMergeRequest {
  readonly owner: string
  readonly repo: string
  readonly pullNumber: number
  readonly recordId: string
  readonly releaseArtifactRef: string
  readonly channelTarget: string
  readonly channelPayload: string
}

export interface PublishQueueGitHubMergeSuccess {
  readonly ok: true
  readonly sha: string
  readonly merged: boolean
  readonly alreadyMerged: boolean
}

export interface PublishQueueGitHubMergeFailure {
  readonly ok: false
  readonly statusCode: number
  readonly message: string
}

export type PublishQueueGitHubMergeResult =
  | PublishQueueGitHubMergeSuccess
  | PublishQueueGitHubMergeFailure

export interface PublishQueueGitHubClient {
  mergePullRequest(
    request: PublishQueueGitHubMergeRequest
  ): Promise<PublishQueueGitHubMergeResult>
}

export interface PublishQueueGitHubClientSync {
  mergePullRequest(request: PublishQueueGitHubMergeRequest): PublishQueueGitHubMergeResult
}

export interface PublishQueueGitHubConfig {
  readonly owner: string
  readonly repo: string
  readonly token: string
}

export interface PublishQueueExecutorEnvironment {
  readonly mode: PublishQueueExecutionMode
  readonly githubOwner?: string
  readonly githubRepo?: string
  readonly githubToken?: string
}

export type PublishQueueGitHubEnvSource = Record<string, string | undefined>

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

const EXECUTION_MODE_SET = new Set<string>(PUBLISH_QUEUE_EXECUTION_MODES)

const DEFAULT_EXECUTOR_ENVIRONMENT: PublishQueueExecutorEnvironment = Object.freeze({
  mode: 'dry-run',
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) {
    return undefined
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return undefined
  }

  return Math.trunc(parsed)
}

function parseRepositorySlug(slug: string | undefined): { owner: string; repo: string } | undefined {
  if (!slug) {
    return undefined
  }

  const [owner, repo] = slug.split('/')
  if (!owner || !repo) {
    return undefined
  }

  return { owner, repo }
}

function parsePullNumberFromChannelPayload(payload: string): number | undefined {
  const parts = payload.split(':')
  if (parts.length < 3 || parts[0] !== 'channel' || parts[1] !== 'pr-merge') {
    return undefined
  }

  return parsePositiveInt(parts[2])
}

function parsePullNumberFromReleaseArtifactRef(releaseArtifactRef: string): number | undefined {
  const parts = releaseArtifactRef.split(':')
  if (parts.length < 3 || parts[0] !== 'release' || parts[1] !== 'pr') {
    return undefined
  }

  return parsePositiveInt(parts[2])
}

function buildLiveChannelRef(request: PublishQueueGitHubMergeRequest, sha: string): string {
  return `live:publish_channel:${request.channelTarget}:pr:${request.pullNumber}:sha:${sha}`
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isPublishQueueExecutionMode(value: string): value is PublishQueueExecutionMode {
  return EXECUTION_MODE_SET.has(value)
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolves pull request number for the canonical `pr-merge` channel from hook
 * payload (`channel:pr-merge:{n}`) or `releaseArtifactRef` (`release:pr:{n}`).
 */
export function resolvePrMergePullNumber(
  hook: PublishHookDescriptor,
  record: PublishQueueRecord
): number | undefined {
  if (hook.kind !== 'publish_channel' || hook.target !== 'pr-merge') {
    return undefined
  }

  return (
    parsePullNumberFromChannelPayload(hook.payload) ??
    parsePullNumberFromReleaseArtifactRef(record.releaseArtifactRef)
  )
}

export function buildPrMergeGitHubRequest(
  hook: PublishHookDescriptor,
  record: PublishQueueRecord,
  config: Pick<PublishQueueGitHubConfig, 'owner' | 'repo'>
): PublishQueueGitHubMergeRequest | undefined {
  const pullNumber = resolvePrMergePullNumber(hook, record)
  if (!pullNumber) {
    return undefined
  }

  return Object.freeze({
    owner: config.owner,
    repo: config.repo,
    pullNumber,
    recordId: record.id,
    releaseArtifactRef: record.releaseArtifactRef,
    channelTarget: hook.target,
    channelPayload: hook.payload,
  })
}

export function readPublishQueueExecutorEnvironment(
  env: PublishQueueGitHubEnvSource = readProcessEnv()
): PublishQueueExecutorEnvironment {
  const modeValue = env.PUBLISH_QUEUE_EXECUTOR_MODE
  const mode =
    modeValue !== undefined && isPublishQueueExecutionMode(modeValue) ? modeValue : 'dry-run'

  const repository = parseRepositorySlug(env.GITHUB_REPOSITORY)
  const token = env.GITHUB_TOKEN ?? env.GH_TOKEN

  return Object.freeze({
    mode,
    ...(repository ? { githubOwner: repository.owner, githubRepo: repository.repo } : {}),
    ...(token ? { githubToken: token } : {}),
  })
}

export function buildPublishQueueGitHubConfig(
  environment: PublishQueueExecutorEnvironment
): PublishQueueGitHubConfig | undefined {
  if (!environment.githubOwner || !environment.githubRepo || !environment.githubToken) {
    return undefined
  }

  return Object.freeze({
    owner: environment.githubOwner,
    repo: environment.githubRepo,
    token: environment.githubToken,
  })
}

export function formatPublishQueueGitHubMergeSuccessRef(
  request: PublishQueueGitHubMergeRequest,
  result: PublishQueueGitHubMergeSuccess
): string {
  return buildLiveChannelRef(request, result.sha)
}

// ---------------------------------------------------------------------------
// Default client
// ---------------------------------------------------------------------------

function readProcessEnv(): PublishQueueGitHubEnvSource {
  if (typeof process === 'undefined' || !process.env) {
    return {}
  }

  return process.env
}

function parseGitHubMergeResponseBody(body: string): { sha?: string; message?: string } {
  if (!body) {
    return {}
  }

  try {
    const parsed = JSON.parse(body) as { sha?: unknown; message?: unknown }
    return {
      ...(typeof parsed.sha === 'string' ? { sha: parsed.sha } : {}),
      ...(typeof parsed.message === 'string' ? { message: parsed.message } : {}),
    }
  } catch {
    return { message: body }
  }
}

function isAlreadyMergedMessage(message: string | undefined): boolean {
  if (!message) {
    return false
  }

  const normalized = message.toLowerCase()
  return normalized.includes('already been merged') || normalized.includes('pull request successfully merged')
}

/**
 * Creates a fetch-backed GitHub client for `pr-merge` channel merge calls.
 * Intended for CI/automation with injected credentials — not browser defaults.
 */
export function createPublishQueueGitHubClient(
  config: PublishQueueGitHubConfig,
  fetchImpl: typeof fetch = fetch
): PublishQueueGitHubClient {
  return {
    async mergePullRequest(request) {
      const url = `https://api.github.com/repos/${request.owner}/${request.repo}/pulls/${request.pullNumber}/merge`

      try {
        const response = await fetchImpl(url, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${config.token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify({
            merge_method: 'squash',
          }),
        })

        const bodyText = await response.text()
        const body = parseGitHubMergeResponseBody(bodyText)

        if (response.ok) {
          return {
            ok: true,
            sha: body.sha ?? 'unknown',
            merged: true,
            alreadyMerged: false,
          }
        }

        if (response.status === 405 && isAlreadyMergedMessage(body.message)) {
          return {
            ok: true,
            sha: body.sha ?? 'already-merged',
            merged: false,
            alreadyMerged: true,
          }
        }

        return {
          ok: false,
          statusCode: response.status,
          message: body.message ?? `GitHub merge failed with status ${response.status}`,
        }
      } catch (error) {
        return {
          ok: false,
          statusCode: 0,
          message: error instanceof Error ? error.message : 'GitHub merge request failed',
        }
      }
    },
  }
}

export const DEFAULT_PUBLISH_QUEUE_EXECUTOR_ENVIRONMENT = DEFAULT_EXECUTOR_ENVIRONMENT
