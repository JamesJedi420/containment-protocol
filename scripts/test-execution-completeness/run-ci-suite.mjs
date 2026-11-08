#!/usr/bin/env node
/**
 * SPE-3427 — completeness-guarded CI test entrypoint.
 *
 * Runs the existing full Vitest suite exactly once (same config, environment and
 * pool as the previous `test:run:ci`), writes one JSON report to a fresh
 * per-run temporary directory, and compares per-file results with the reviewed
 * inventory. A report can therefore never be stale: it is created by this run
 * and its path is unique.
 *
 * Exit codes: 0 complete; 1 completeness failure; 2 untrustworthy observation
 * (missing/malformed report, interruption, narrowed CI invocation); otherwise
 * the child Vitest status is preserved.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  FAILURE_CODES,
  completenessExitCode,
  evaluateCompleteness,
  normalizeRepoPath,
  stripWrapperOwnedArgs,
  toRepoRelative,
} from './evaluate.mjs'
import { buildInventory, readInventory, writeInventory } from './inventory.mjs'
import { readDiscoveryFromConfig } from './discovery.mjs'

const ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)))
const CONFIG_PATH = path.join(ROOT, 'app.vite.config.ts')
const VITEST_ENTRY = path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs')

/** Identical to the previously declared `test:run:ci` invocation. */
const BASE_VITEST_ARGS = [
  'run',
  '--config',
  'app.vite.config.ts',
  '--configLoader',
  'native',
  '--environment',
  'jsdom',
  '--globals',
  '--pool',
  'forks',
]

const WRAPPER_FLAGS = new Set(['--update', '--json'])
const VALUE_FLAGS = new Set([
  '--config',
  '--configLoader',
  '--environment',
  '--pool',
  '--maxWorkers',
  '--minWorkers',
  '--reporter',
  '--outputFile',
  '--root',
  '--dir',
  '--exclude',
  '--project',
  '--testTimeout',
  '--hookTimeout',
  '--bail',
  '--retry',
  '--shard',
])
/** Any of these narrows what is collected, so the run cannot prove completeness. */
const NARROWING_FLAGS = new Set([
  '--changed',
  '-t',
  '--testNamePattern',
  '--project',
  '--dir',
  '--exclude',
  '--shard',
])

function isCi() {
  return ['1', 'true'].includes(String(process.env.CI ?? '').toLowerCase())
}

function detectNarrowing(args) {
  const reasons = []
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index]
    if (token.startsWith('-')) {
      const name = token.split('=')[0]
      if (NARROWING_FLAGS.has(name)) reasons.push(token)
      if (VALUE_FLAGS.has(name) && !token.includes('=')) index += 1
      continue
    }
    reasons.push(`positional:${token}`)
  }
  return reasons
}

function printFailures(failures) {
  console.error('test-execution-completeness: FAILED')
  for (const failure of failures.slice(0, 50)) {
    const where = failure.path ? ` ${failure.path}` : ''
    const detail = failure.detail ?? failure.message
    console.error(`  [${failure.code}]${where}${detail ? ` — ${detail}` : ''}`)
  }
  if (failures.length > 50) {
    console.error(`  … ${failures.length - 50} more`)
  }
}

function emit(jsonMode, payload) {
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(payload)}\n`)
  }
}

function fail(jsonMode, failures, counts = null) {
  printFailures(failures)
  emit(jsonMode, {
    schemaVersion: 1,
    owner: 'SPE-3427',
    ok: false,
    counts,
    failures,
  })
  process.exit(2)
}

function runVitest(extraArgs) {
  console.error(
    `test-execution-completeness: ${process.execPath} ${[VITEST_ENTRY, ...BASE_VITEST_ARGS, ...extraArgs].join(' ')}`
  )
  return spawnSync(process.execPath, [VITEST_ENTRY, ...BASE_VITEST_ARGS, ...extraArgs], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  })
}

function loadDiscovery() {
  try {
    return readDiscoveryFromConfig(fs.readFileSync(CONFIG_PATH, 'utf8'))
  } catch (error) {
    return { error: error.message }
  }
}

const argv = process.argv.slice(2)
const jsonMode = argv.includes('--json')
const update = argv.includes('--update')
const passthrough = stripWrapperOwnedArgs(argv.filter((token) => !WRAPPER_FLAGS.has(token)))
const narrowing = detectNarrowing(passthrough)

if (narrowing.length > 0 && isCi()) {
  fail(jsonMode, [
    {
      code: FAILURE_CODES.NARROWED_RUN,
      detail: `CI must run the full suite; received ${narrowing.join(', ')}`,
    },
  ])
}

if (narrowing.length > 0) {
  console.error(
    `test-execution-completeness: subset run (${narrowing.join(', ')}) — completeness not evaluated`
  )
  const subset = runVitest(passthrough)
  process.exit(subset.error || subset.signal ? 2 : (subset.status ?? 2))
}

const reportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-test-completeness-'))
const reportPath = path.join(reportDir, 'vitest-report.json')
const child = runVitest([
  ...passthrough,
  '--reporter=default',
  '--reporter=json',
  `--outputFile.json=${reportPath}`,
])

if (child.error) {
  fail(jsonMode, [
    {
      code: FAILURE_CODES.REPORT_MALFORMED,
      detail: `could not start Vitest: ${child.error.message}`,
    },
  ])
}
if (child.signal) {
  fail(jsonMode, [
    {
      code: FAILURE_CODES.REPORT_MALFORMED,
      detail: `Vitest terminated by ${child.signal}; no trustworthy report`,
    },
  ])
}
if (!fs.existsSync(reportPath)) {
  fail(jsonMode, [
    {
      code: FAILURE_CODES.REPORT_MALFORMED,
      detail: `no report written (Vitest exit ${String(child.status)}); interrupted or failed run`,
    },
  ])
}

let report
try {
  report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
} catch (error) {
  fail(jsonMode, [
    { code: FAILURE_CODES.REPORT_MALFORMED, detail: `report is not valid JSON: ${error.message}` },
  ])
}

const discovery = loadDiscovery()
if (discovery.error) {
  fail(jsonMode, [{ code: FAILURE_CODES.DISCOVERY_DRIFT, detail: discovery.error }])
}

if (update) {
  if (!Array.isArray(report.testResults) || report.testResults.length === 0) {
    fail(jsonMode, [
      {
        code: FAILURE_CODES.EMPTY_EXECUTION,
        detail: 'refusing to seed inventory from a run that reported no suites',
      },
    ])
  }
  const identities = []
  for (const suite of report.testResults) {
    const identity = normalizeRepoPath(toRepoRelative(suite?.name, ROOT))
    if (!identity) {
      fail(jsonMode, [
        {
          code: FAILURE_CODES.REPORT_MALFORMED,
          detail: `unusable suite path ${JSON.stringify(suite?.name)}`,
        },
      ])
    }
    identities.push(identity)
  }
  if (new Set(identities).size !== identities.length) {
    fail(jsonMode, [
      { code: FAILURE_CODES.REPORT_MALFORMED, detail: 'report contains duplicate suite paths' },
    ])
  }
  const inventory = buildInventory(identities, discovery)
  writeInventory(inventory)
  console.error(
    `test-execution-completeness: inventory written with ${inventory.files.length} identities (identities only; test outcomes are not attested)`
  )
  if (child.status !== 0) {
    console.error(
      `test-execution-completeness: note — the seeding run exited ${String(child.status)}; fix failures before reviewing the inventory change`
    )
  }
  process.exit(0)
}

let loaded
try {
  loaded = readInventory()
} catch (error) {
  fail(jsonMode, [
    {
      code: FAILURE_CODES.INVENTORY_INVALID,
      detail: `cannot read expected inventory: ${error.message}`,
    },
  ])
}

const evaluation = evaluateCompleteness({
  inventory: loaded.inventory,
  report,
  discovery,
  root: ROOT,
})

if (!evaluation.ok) {
  printFailures(evaluation.failures)
  emit(jsonMode, {
    schemaVersion: 1,
    owner: 'SPE-3427',
    ok: false,
    counts: evaluation.counts,
    failures: evaluation.failures,
    reportPath,
  })
  process.exit(completenessExitCode(child.status))
}

console.error(
  `test-execution-completeness: OK — ${evaluation.counts.expected} expected, ${evaluation.counts.observed} observed, ${evaluation.counts.failed} failed suites`
)
emit(jsonMode, {
  schemaVersion: 1,
  owner: 'SPE-3427',
  ok: true,
  counts: evaluation.counts,
  failures: [],
  reportPath,
})
process.exit(child.status ?? 0)
