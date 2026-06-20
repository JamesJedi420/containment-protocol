/**
 * SPE-2491 slice 1: weekly publish-queue execution orchestration for `advanceWeek`.
 * SPE-2498 slice 1: live `manual-approval` channel via injectable sync client.
 *
 * Dry-run is the safe default. Live execution requires explicit
 * `PUBLISH_QUEUE_EXECUTOR_MODE=live` plus injectable sync clients because
 * `advanceWeek` is synchronous.
 */

import type { PublishQueueRecordsMap } from './publishAutomationCreditingHooks'
import {
  applyWeeklyPublishQueueExecutionTick,
  executePublishQueueRecordsLiveSync,
  type PublishQueueBatchExecutionResult,
} from './publishQueueExecutor'
import type {
  PublishQueueExecutionMode,
  PublishQueueExecutorEnvironment,
  PublishQueueGitHubClientSync,
} from './publishQueueGitHubClient'
import {
  buildPublishQueueGitHubConfig,
  readPublishQueueExecutorEnvironment,
} from './publishQueueGitHubClient'
import type { PublishQueueManualApprovalClientSync } from './publishQueueManualApprovalClient'

export interface PublishQueueWeeklyOrchestrationDeps {
  readonly environment?: PublishQueueExecutorEnvironment
  readonly githubClient?: PublishQueueGitHubClientSync
  readonly manualApprovalClient?: PublishQueueManualApprovalClientSync
}

/**
 * Resolves the effective weekly execution mode. Live mode requires `mode=live`
 * plus complete GitHub credentials and/or an injectable manual-approval client;
 * otherwise dry-run.
 */
export function resolveEffectivePublishQueueWeeklyExecutionMode(
  deps: PublishQueueWeeklyOrchestrationDeps = {}
): PublishQueueExecutionMode {
  const environment = deps.environment ?? readPublishQueueExecutorEnvironment()

  if (environment.mode !== 'live') {
    return 'dry-run'
  }

  if (buildPublishQueueGitHubConfig(environment)) {
    return 'live'
  }

  if (deps.manualApprovalClient) {
    return 'live'
  }

  return 'dry-run'
}

function hasLiveOrchestrationClients(deps: PublishQueueWeeklyOrchestrationDeps): boolean {
  return Boolean(deps.githubClient || deps.manualApprovalClient)
}

/**
 * One deterministic weekly publish-queue execution pass. Uses dry-run stubs by
 * default; when live mode is configured and sync clients are available, invokes
 * the live executor path without mutating records on failure.
 */
export function applyWeeklyPublishQueueExecutionTickOrchestrated(
  records: PublishQueueRecordsMap | null | undefined,
  week: number,
  deps: PublishQueueWeeklyOrchestrationDeps = {}
): PublishQueueBatchExecutionResult {
  const executionMode = resolveEffectivePublishQueueWeeklyExecutionMode(deps)

  if (executionMode === 'dry-run') {
    return applyWeeklyPublishQueueExecutionTick(records, week)
  }

  if (!hasLiveOrchestrationClients(deps)) {
    return applyWeeklyPublishQueueExecutionTick(records, week)
  }

  const environment = deps.environment ?? readPublishQueueExecutorEnvironment()
  const githubConfig = buildPublishQueueGitHubConfig(environment)

  return executePublishQueueRecordsLiveSync(records, {
    week,
    ...(githubConfig && deps.githubClient
      ? {
          githubClient: deps.githubClient,
          githubConfig: {
            owner: githubConfig.owner,
            repo: githubConfig.repo,
          },
        }
      : {}),
    ...(deps.manualApprovalClient
      ? { manualApprovalClient: deps.manualApprovalClient }
      : {}),
  })
}
