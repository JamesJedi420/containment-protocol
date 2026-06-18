/**
 * SPE-2491 slice 1: weekly publish-queue execution orchestration for `advanceWeek`.
 *
 * Dry-run is the safe default. Live `pr-merge` execution requires explicit
 * `PUBLISH_QUEUE_EXECUTOR_MODE=live`, complete GitHub credentials, and an
 * injectable sync client (tests/CI harness) because `advanceWeek` is synchronous.
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

export interface PublishQueueWeeklyOrchestrationDeps {
  readonly environment?: PublishQueueExecutorEnvironment
  readonly githubClient?: PublishQueueGitHubClientSync
}

/**
 * Resolves the effective weekly execution mode. Live mode requires both
 * `mode=live` and complete GitHub credentials; otherwise dry-run.
 */
export function resolveEffectivePublishQueueWeeklyExecutionMode(
  deps: PublishQueueWeeklyOrchestrationDeps = {}
): PublishQueueExecutionMode {
  const environment = deps.environment ?? readPublishQueueExecutorEnvironment()

  if (environment.mode !== 'live') {
    return 'dry-run'
  }

  if (!buildPublishQueueGitHubConfig(environment)) {
    return 'dry-run'
  }

  return 'live'
}

/**
 * One deterministic weekly publish-queue execution pass. Uses dry-run stubs by
 * default; when live mode is configured and a sync GitHub client is available,
 * invokes the live `pr-merge` executor path without mutating records on failure.
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

  const environment = deps.environment ?? readPublishQueueExecutorEnvironment()
  const githubConfig = buildPublishQueueGitHubConfig(environment)

  if (!githubConfig || !deps.githubClient) {
    return applyWeeklyPublishQueueExecutionTick(records, week)
  }

  return executePublishQueueRecordsLiveSync(records, {
    week,
    githubClient: deps.githubClient,
    githubConfig: {
      owner: githubConfig.owner,
      repo: githubConfig.repo,
    },
  })
}
