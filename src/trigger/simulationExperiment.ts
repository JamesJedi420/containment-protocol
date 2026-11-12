import { AbortTaskRunError, task } from '@trigger.dev/sdk'
import { runExperimentBatch } from '../tooling/simulationExperimentBatch'
import { EXPERIMENT_TASK_ID } from '../tooling/simulationExperimentRequest'

// Replaced by the build plugin, never trusted from a request or worker environment variable.
declare const CP_EXPERIMENT_BUILD: { commit: string; dirty: boolean } | null

export const simulationExperimentTask = task({
  id: EXPERIMENT_TASK_ID,
  queue: { name: 'cp-simulation-experiments', concurrencyLimit: 1 },
  maxDuration: 60,
  // Pure local computation has no retryable external operation. Submission retries use idempotency.
  retry: { maxAttempts: 1 },
  run: async (payload: unknown, { ctx, signal }) => {
    const report = await runExperimentBatch(payload, {
      runId: ctx.run.id,
      environment: ctx.environment.type,
      build: typeof CP_EXPERIMENT_BUILD === 'undefined' ? null : CP_EXPERIMENT_BUILD,
      signal,
    })
    if (report.status !== 'success') {
      // Keep deterministic rejection visible as a failed dashboard run, with compact evidence.
      throw new AbortTaskRunError(JSON.stringify(report))
    }
    return report
  },
})
