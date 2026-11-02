#!/usr/bin/env node
/**
 * SPE-3376 — advisory TypeScript census for CI.
 *
 * Runs the reproducible collector, compares the summary with the committed
 * budget, and exits nonzero only when the census itself cannot be produced.
 * The red baseline is reported, not enforced; Phase 10 flips enforcement.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compareBudget } from './typecheck-census.mjs'
import { spawnSafe } from './validation/spawn-safe.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, '.tmp/typecheck-census')
const budgetPath = path.join(root, 'docs/typecheck/budget.json')

function fail(message) {
  console.error(`typecheck advisory: ${message}`)
  process.exit(1)
}

let budget
try {
  budget = JSON.parse(fs.readFileSync(budgetPath, 'utf8'))
} catch (error) {
  fail(`budget unavailable at docs/typecheck/budget.json: ${error.message}`)
}
for (const key of ['occurrences', 'fingerprints', 'files']) {
  if (!Number.isInteger(budget[key])) fail(`budget ${key} must be an integer`)
}

fs.rmSync(output, { recursive: true, force: true })
const capture = spawnSafe(process.execPath, ['scripts/report-typecheck.mjs'], {
  cwd: root,
  stdio: 'inherit',
  timeout: 600_000,
})
if (capture.error || capture.signal || ![0, 2].includes(capture.status)) {
  fail(
    `census capture failed (${capture.error?.message ?? capture.signal ?? `exit ${capture.status}`})`
  )
}

let census
try {
  census = JSON.parse(fs.readFileSync(path.join(output, 'census.json'), 'utf8'))
} catch (error) {
  fail(`census was not written: ${error.message}`)
}

const summary = census.summary
for (const key of ['occurrences', 'uniqueIdentities', 'files']) {
  if (!Number.isInteger(summary?.[key])) fail(`census summary ${key} is missing`)
}

const comparison = compareBudget(summary, budget)
const counts = new Map()
for (const diagnostic of census.diagnostics) {
  if (!diagnostic.file) continue
  counts.set(diagnostic.file, (counts.get(diagnostic.file) ?? 0) + 1)
}
const topFiles = [...counts.entries()]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .slice(0, 5)
const signed = (value) => (value > 0 ? `+${value}` : String(value))

console.log(
  `typecheck advisory: ${summary.occurrences} occurrences, ${summary.uniqueIdentities} fingerprints, ${summary.files} files`
)
console.log(
  `typecheck advisory: budget ${budget.occurrences}/${budget.fingerprints}; delta ${signed(comparison.occurrenceDelta)}/${signed(comparison.fingerprintDelta)}`
)
for (const [file, count] of topFiles) console.log(`  ${count}\t${file}`)
console.log('typecheck advisory: census published at .tmp/typecheck-census/census.json')
if (comparison.overBudget) {
  console.warn('typecheck advisory: above the committed budget; non-blocking until Phase 10')
}
process.exit(0)
