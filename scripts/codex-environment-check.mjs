import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { describeSpawnError, spawnSafe } from './validation/spawn-safe.mjs'

const result = spawnSafe(
  process.execPath,
  ['--test', 'scripts/codex-environment.test.mjs', 'scripts/codex-environment-contract.test.mjs'],
  { cwd: fileURLToPath(new URL('../', import.meta.url)), stdio: 'inherit' }
)
if (result.error || result.signal) {
  console.error(
    describeSpawnError(result.error) ?? `Codex contract tests stopped: ${result.signal}`
  )
  process.exitCode = 1
} else {
  process.exitCode = result.status ?? 1
}
