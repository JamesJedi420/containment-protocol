import { createHash } from 'node:crypto'

export const EXPERIMENT_TASK_ID = 'cp-simulation-experiment'
export const EXPERIMENT_FIXTURE = 'starter-no-commands'
export const EXPERIMENT_VERSION = 'spe-3521.v1'

export interface ExperimentRequest {
  fixture: typeof EXPERIMENT_FIXTURE
  version: typeof EXPERIMENT_VERSION
  commit: string
  seeds: number[]
  weeks: number
  budgetMs: number
  concurrency: 1
  maxAttempts: 1
  replay: 'same-commit' | 'scoped'
}

export type ExperimentStatus =
  | 'success'
  | 'invalid_input'
  | 'missing_capability'
  | 'replay_unavailable'
  | 'invariant_failure'
  | 'infrastructure_failure'
  | 'budget_exhausted'
  | 'cancelled'

export class ExperimentError extends Error {
  readonly status: Exclude<ExperimentStatus, 'success'>

  constructor(status: Exclude<ExperimentStatus, 'success'>, message: string) {
    super(message)
    this.status = status
  }
}

const fields = [
  'fixture',
  'version',
  'commit',
  'seeds',
  'weeks',
  'budgetMs',
  'concurrency',
  'maxAttempts',
  'replay',
]

/** The request cannot carry a save, arbitrary config, commands, paths or credentials. */
export function parseExperimentRequest(raw: unknown): ExperimentRequest {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ExperimentError('invalid_input', 'Expected an experiment request object.')
  }
  const input = raw as Record<string, unknown>
  if (
    Object.keys(input).length !== fields.length ||
    fields.some((key) => !Object.hasOwn(input, key))
  ) {
    throw new ExperimentError(
      'invalid_input',
      'Request fields must match the experiment contract exactly.'
    )
  }
  if (
    typeof input.commit !== 'string' ||
    !/^[a-f0-9]{40}$/.test(input.commit) ||
    !Array.isArray(input.seeds) ||
    input.seeds.length < 1 ||
    input.seeds.length > 8 ||
    input.seeds.some((seed) => !Number.isInteger(seed) || seed < 1 || seed > 0xffffffff) ||
    new Set(input.seeds).size !== input.seeds.length ||
    !Number.isInteger(input.weeks) ||
    (input.weeks as number) < 1 ||
    (input.weeks as number) > 4 ||
    !Number.isInteger(input.budgetMs) ||
    (input.budgetMs as number) < 1 ||
    (input.budgetMs as number) > 30_000 ||
    input.concurrency !== 1 ||
    input.maxAttempts !== 1 ||
    (input.replay !== 'same-commit' && input.replay !== 'scoped')
  ) {
    throw new ExperimentError(
      'invalid_input',
      'Invalid seed, revision, replay mode or resource limits.'
    )
  }
  if (input.fixture !== EXPERIMENT_FIXTURE || input.version !== EXPERIMENT_VERSION) {
    throw new ExperimentError('missing_capability', 'Unsupported fixture or fixture version.')
  }
  return {
    fixture: EXPERIMENT_FIXTURE,
    version: EXPERIMENT_VERSION,
    commit: input.commit,
    seeds: [...input.seeds].sort((a, b) => a - b),
    weeks: input.weeks as number,
    budgetMs: input.budgetMs as number,
    concurrency: 1,
    maxAttempts: 1,
    replay: input.replay,
  }
}

/** Includes every execution parameter; input key order and seed ordering do not matter. */
export function experimentIdempotencyKey(raw: unknown): string {
  return `cp-experiment:${createHash('sha256')
    .update(JSON.stringify(parseExperimentRequest(raw)))
    .digest('hex')}`
}
