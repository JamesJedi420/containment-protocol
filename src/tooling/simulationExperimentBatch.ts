import {
  EXPERIMENT_TASK_ID,
  EXPERIMENT_VERSION,
  ExperimentError,
  experimentIdempotencyKey,
  parseExperimentRequest,
  type ExperimentRequest,
  type ExperimentStatus,
} from './simulationExperimentRequest'
import type { ExperimentControls, SeedEvidence } from './simulationExperiment'

export interface ExperimentContext {
  runId: string
  environment: string
  build: { commit: string; dirty: boolean } | null
  signal?: AbortSignal
}

export interface ExperimentReport {
  taskId: string
  runId: string
  version: string
  commit: string | null
  status: ExperimentStatus
  reason?: string
  request?: ExperimentRequest
  idempotencyKey?: string
  requestedSeeds: number[]
  executedSeeds: number[]
  results: SeedEvidence[]
  replayScope: 'same-commit-full-state-only'
  scopedReplay: 'unavailable-SPE-3162'
}

type SeedExecutor = (
  request: ExperimentRequest,
  seed: number,
  controls: ExperimentControls
) => Promise<SeedEvidence>

function validateExecutionContext(request: ExperimentRequest, context: ExperimentContext) {
  if (context.environment !== 'DEVELOPMENT') {
    throw new ExperimentError('missing_capability', 'Only Development execution is supported.')
  }
  if (!context.build || context.build.dirty || context.build.commit !== request.commit) {
    throw new ExperimentError(
      'missing_capability',
      'A clean worker build at the requested commit is required.'
    )
  }
  if (request.replay === 'scoped') {
    throw new ExperimentError('replay_unavailable', 'Scoped stochastic replay requires SPE-3162.')
  }
}

/** The lazy loader keeps malformed requests away from even bootstrap module side effects. */
export async function runExperimentBatch(
  raw: unknown,
  context: ExperimentContext,
  load: () => Promise<SeedExecutor> = async () =>
    (await import('./simulationExperiment')).executeExperimentSeed,
  now: () => number = () => performance.now()
): Promise<ExperimentReport> {
  const startedAt = now()
  const report: ExperimentReport = {
    taskId: EXPERIMENT_TASK_ID,
    runId: context.runId,
    version: EXPERIMENT_VERSION,
    commit: context.build?.commit ?? null,
    status: 'success',
    requestedSeeds: [],
    executedSeeds: [],
    results: [],
    replayScope: 'same-commit-full-state-only',
    scopedReplay: 'unavailable-SPE-3162',
  }
  try {
    const request = parseExperimentRequest(raw)
    report.request = request
    report.requestedSeeds = request.seeds
    report.idempotencyKey = experimentIdempotencyKey(request)
    validateExecutionContext(request, context)
    if (context.signal?.aborted) throw new ExperimentError('cancelled', 'Experiment cancelled.')
    let execute: SeedExecutor
    try {
      execute = await load()
    } catch {
      throw new ExperimentError('infrastructure_failure', 'Simulation module could not be loaded.')
    }
    for (const seed of request.seeds) {
      if (context.signal?.aborted) throw new ExperimentError('cancelled', 'Experiment cancelled.')
      if (now() - startedAt >= request.budgetMs) {
        throw new ExperimentError('budget_exhausted', 'Experiment time budget exhausted.')
      }
      const result = await execute(request, seed, {
        signal: context.signal,
        startedAt,
        now,
        onInitialized: (actualSeed) => {
          if (!report.executedSeeds.includes(actualSeed)) report.executedSeeds.push(actualSeed)
        },
      })
      report.results.push(result)
      if (result.replay !== 'matched') {
        throw new ExperimentError(
          'replay_unavailable',
          'Repeated canonical execution produced different full-state fingerprints.'
        )
      }
    }
  } catch (error) {
    report.status = error instanceof ExperimentError ? error.status : 'infrastructure_failure'
    report.reason =
      error instanceof ExperimentError ? error.message : 'Experiment orchestration failed.'
  }
  return report
}
