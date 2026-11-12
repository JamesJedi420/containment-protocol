import { spawnSafe } from './validation/spawn-safe.mjs'
import {
  experimentIdempotencyKey,
  parseExperimentRequest,
} from '../src/tooling/simulationExperimentRequest.ts'

// Node 22 --experimental-strip-types. Prints arguments only; never submits or reads credentials.
const revision = spawnSafe('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', timeout: 5000 })
if (revision.status !== 0 || revision.error) throw new Error('Git identity unavailable.')
const commit = revision.stdout.trim()
const request = parseExperimentRequest({
  fixture: 'starter-no-commands',
  version: 'spe-3521.v1',
  commit,
  seeds: [11, 22],
  weeks: 2,
  budgetMs: 30_000,
  concurrency: 1,
  maxAttempts: 1,
  replay: 'same-commit',
})
console.log(
  JSON.stringify({ payload: request, idempotencyKey: experimentIdempotencyKey(request) }, null, 2)
)
