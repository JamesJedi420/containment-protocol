/** SPE-3762 — execute and attest the existing CP event/save contract suites. */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluateCompleteness } from '../test-execution-completeness/evaluate.mjs'
import { buildInventory } from '../test-execution-completeness/inventory.mjs'
import { spawnSafe } from './spawn-safe.mjs'

export const CP_CONTRACT_SUITES = Object.freeze([
  'src/test/events.validation.test.ts',
  'src/test/events.coverage.test.ts',
  'src/test/events.producerValidation.test.ts',
  'src/test/events.recoveredValidation.test.ts',
  'src/domain/events/eventMigration.test.ts',
  'src/app/store/saveSystem.test.ts',
  'src/app/store/runTransfer.test.ts',
  'src/app/store/gameStore.test.ts',
])

const ROOT = fileURLToPath(new URL('../../', import.meta.url))

export function contractArgs(ci, reportPath) {
  return [
    'run',
    ...CP_CONTRACT_SUITES,
    '--config',
    'app.vite.config.ts',
    '--configLoader',
    'native',
    '--environment',
    'jsdom',
    '--globals',
    '--pool',
    ci ? 'forks' : 'vmThreads',
    '--reporter=default',
    '--reporter=json',
    `--outputFile.json=${reportPath}`,
  ]
}

export function evaluateContractReport(report, root) {
  // This ephemeral inventory attests only these eight suites. The committed
  // full-suite inventory and its CI guard remain independent and unchanged.
  const inventory = buildInventory(CP_CONTRACT_SUITES, {
    include: CP_CONTRACT_SUITES,
    exclude: [],
  })
  const evaluation = evaluateCompleteness({ inventory, report, root })
  const failures = evaluation.failures.map((failure) => JSON.stringify(failure))
  if (report?.success !== true) failures.push('runner did not report success')
  for (const suite of Array.isArray(report?.testResults) ? report.testResults : []) {
    if (
      suite?.status !== 'passed' ||
      !Array.isArray(suite.assertionResults) ||
      !suite.assertionResults.some((assertion) => assertion?.status === 'passed')
    ) {
      failures.push(`suite did not execute passing tests: ${String(suite?.name)}`)
    }
  }
  return { ok: failures.length === 0, failures, counts: evaluation.counts }
}

export function runCpContracts({
  argv = [],
  root = ROOT,
  spawn = spawnSafe,
  log = console.error,
} = {}) {
  if (argv.length > 1 || (argv.length === 1 && argv[0] !== '--ci')) {
    log('cp-contracts: only --ci is accepted; suite filters and overrides are forbidden')
    return 1
  }
  let reportDir
  try {
    for (const suite of CP_CONTRACT_SUITES) {
      if (!fs.statSync(path.join(root, suite)).isFile()) {
        throw new Error(`required suite is not a file: ${suite}`)
      }
    }
    reportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-contracts-'))
    const reportPath = path.join(reportDir, 'vitest-report.json')
    log(`cp-contracts: running ${CP_CONTRACT_SUITES.length} required suites`)
    const child = spawn(
      process.execPath,
      [
        path.join(root, 'node_modules/vitest/vitest.mjs'),
        ...contractArgs(argv[0] === '--ci', reportPath),
      ],
      { cwd: root, stdio: 'inherit', env: process.env }
    )
    if (child.error || child.signal || child.status !== 0) {
      throw new Error(
        `Vitest failed: ${child.error?.message ?? child.signal ?? String(child.status)}`
      )
    }
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
    const evaluation = evaluateContractReport(report, root)
    if (!evaluation.ok) throw new Error(evaluation.failures.join('\n'))
    log(`cp-contracts: verified ${evaluation.counts.matched}/8 executed suites`)
    return 0
  } catch (error) {
    log(`cp-contracts: FAILED — ${error.message}`)
    return 1
  } finally {
    if (reportDir) fs.rmSync(reportDir, { recursive: true, force: true })
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runCpContracts({ argv: process.argv.slice(2) })
}
