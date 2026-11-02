import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import {
  compareBudget,
  compareCensuses,
  compareText,
  parseDiagnostics,
  sha256,
  summarize,
} from './typecheck-census.mjs'

const project = (file) => (file.startsWith('src/') ? 'tsconfig.app.json' : undefined)
const diagnostic = 'src/a.test.ts(2,3): error TS2322: Type mismatch.\n  Missing member.\n'

test('committed baseline reconciles raw compiler output, every occurrence, summary and both run hashes', () => {
  const base = new URL('../docs/typecheck/41873280/', import.meta.url)
  const report = JSON.parse(fs.readFileSync(new URL('census.json', base), 'utf8'))
  const raw = fs.readFileSync(new URL('compiler.txt', base), 'utf8')
  const records = parseDiagnostics(raw, (file) =>
    file.startsWith('src/') ? 'tsconfig.app.json' : undefined
  )
  assert.deepEqual(records, report.diagnostics)
  assert.deepEqual(summarize(records), report.summary)
  assert.equal(report.reproducible, true)
  assert.deepEqual(report.identityDelta, [])
  assert.equal(report.runs.length, 2)
  for (const run of report.runs) {
    assert.equal(run.exitCode, 2)
    assert.equal(run.rawHash, sha256(raw))
  }
})

test('normalizes CRLF and Windows separators, retaining continuation text and coordinates', () => {
  const records = parseDiagnostics(
    diagnostic.replace('src/', 'src\\').replaceAll('\n', '\r\n'),
    project
  )
  assert.equal(records[0].file, 'src/a.test.ts')
  assert.equal(records[0].line, 2)
  assert.equal(records[0].column, 3)
  assert.equal(records[0].message, 'Type mismatch.\n  Missing member.')
  assert.equal(records[0].surface, 'test-fixture')
  assert.deepEqual(records, parseDiagnostics(diagnostic, project))
})

test('line movement preserves identity; message changes do not', () => {
  const before = parseDiagnostics(diagnostic, project)
  const moved = parseDiagnostics(diagnostic.replace('(2,3)', '(80,10)'), project)
  assert.deepEqual(compareCensuses(before, moved), [])
  assert.notEqual(
    before[0].identity,
    parseDiagnostics(diagnostic.replace('member', 'field'), project)[0].identity
  )
})

test('duplicate occurrences are preserved and multiset comparison detects count changes', () => {
  const one = parseDiagnostics(diagnostic, project)
  const two = parseDiagnostics(diagnostic + diagnostic, project)
  assert.equal(summarize(two).occurrences, 2)
  assert.equal(summarize(two).uniqueIdentities, 1)
  assert.equal(summarize(two).repeatedIdentityOccurrences, 1)
  assert.equal(summarize(two).exactDuplicateOccurrences, 1)
  assert.deepEqual(compareCensuses(two, one), [{ identity: one[0].identity, change: -1 }])
})

test('unparsed diagnostics, banners, and unknown project attribution fail closed', () => {
  for (const text of [
    'unexpected output',
    ' error TS999: malformed',
    'src/a.ts: error TS123: malformed',
  ]) {
    assert.throws(() => parseDiagnostics(text, project))
  }
  assert.throws(() => parseDiagnostics('other.ts(1,1): error TS123: bad', project), /attribute/)
  assert.throws(
    () => parseDiagnostics(`${diagnostic}  error TS123: hidden diagnostic`, project),
    /Unparsed/
  )
})

test('empty successful output and global configuration diagnostics are explicit', () => {
  assert.equal(summarize(parseDiagnostics('', project)).occurrences, 0)
  const [record] = parseDiagnostics('error TS5083: Cannot read file.\n', project)
  assert.equal(record.project, 'tsconfig.json')
  assert.equal(record.file, null)
  assert.equal(record.surface, 'configuration')
})

test('test helper directories are fixtures without misclassifying production lookalikes', () => {
  for (const file of [
    'src/test/fixtures/payloads.ts',
    'src/test/helpers/proof.ts',
    'test/setup.ts',
    'src/__tests__/helper.ts',
  ]) {
    const [record] = parseDiagnostics(
      `${file}(1,1): error TS2322: mismatch`,
      () => 'tsconfig.app.json'
    )
    assert.equal(record.surface, 'test-fixture')
  }
  const [record] = parseDiagnostics('src/testingRuntime.ts(1,1): error TS2322: mismatch', project)
  assert.equal(record.surface, 'production-source')
})

test('budget comparison reports deltas and treats growth as over budget', () => {
  const summary = { occurrences: 681, uniqueIdentities: 466, files: 178 }
  const budget = { occurrences: 681, fingerprints: 466, files: 178 }
  assert.deepEqual(compareBudget(summary, budget), {
    occurrenceDelta: 0,
    fingerprintDelta: 0,
    fileDelta: 0,
    overBudget: false,
  })
  assert.equal(compareBudget({ ...summary, occurrences: 682 }, budget).overBudget, true)
  assert.equal(compareBudget({ ...summary, uniqueIdentities: 467 }, budget).overBudget, true)
  assert.equal(compareBudget({ ...summary, occurrences: 680 }, budget).overBudget, false)
})

test('advisory budget does not exceed the committed baseline census', () => {
  const report = JSON.parse(
    fs.readFileSync(new URL('../docs/typecheck/41873280/census.json', import.meta.url), 'utf8')
  )
  const budget = JSON.parse(
    fs.readFileSync(new URL('../docs/typecheck/budget.json', import.meta.url), 'utf8')
  )
  assert.equal(budget.schemaVersion, 1)
  // The historical capture is immutable; each phase may ratchet the budget down.
  assert.ok(budget.occurrences <= report.summary.occurrences)
  assert.ok(budget.fingerprints <= report.summary.uniqueIdentities)
  assert.ok(budget.files <= report.summary.files)
  assert.match(budget.revision, /^[0-9a-f]{40}$/)
})

test('partition assigns every baseline occurrence once and binds analysis to verified compiler evidence', () => {
  const base = new URL('../docs/typecheck/', import.meta.url)
  const baseline = JSON.parse(fs.readFileSync(new URL('41873280/census.json', base), 'utf8'))
  const partition = JSON.parse(fs.readFileSync(new URL('partition.json', base), 'utf8'))
  const verification = JSON.parse(
    fs.readFileSync(new URL('verification-1108c4b9.json', base), 'utf8')
  )
  assert.equal(partition.baselineSha256, sha256(JSON.stringify(baseline)))
  assert.equal(verification.normalizedBaselineSha256, partition.baselineSha256)
  assert.equal(verification.revision, partition.analysisRevision)
  assert.equal(verification.compilerInputHash, baseline.compilerInputHash)
  assert.equal(verification.packageLockHash, baseline.packageLockHash)
  assert.equal(verification.reproducible, true)
  assert.equal(verification.workingTreeStatus, '')
  assert.equal(verification.diagnosticsMatchBaseline, true)
  assert.deepEqual(verification.runs, baseline.runs)
  assert.deepEqual(verification.summary, baseline.summary)
  assert.deepEqual(verification.identityDelta, [])
  const assigned = partition.groups.flatMap((group) => group.occurrences)
  assert.equal(new Set(partition.groups.map((group) => group.id)).size, partition.groups.length)
  assert.deepEqual(
    assigned.toSorted((a, b) => a - b),
    baseline.diagnostics.map((_, index) => index)
  )
  for (const group of partition.groups) {
    assert.ok(group.occurrences.length > 0, group.id)
    assert.ok(group.cause, `${group.id}: missing cause`)
    assert.ok(group.canonicalContract, `${group.id}: missing canonicalContract`)
    assert.ok(group.cascadeAssessment, `${group.id}: missing cascadeAssessment`)
    assert.equal(group.reconciliationOwner, 'SPE-3376')
    assert.ok(['repair-candidate', 'semantic-review'].includes(group.disposition), group.id)
    const expectedEvidence = [
      ...new Set(
        group.occurrences.map((index) => {
          const diagnostic = baseline.diagnostics[index]
          return `${diagnostic.file}:${diagnostic.line}`
        })
      ),
    ]
    assert.deepEqual(
      group.evidence.toSorted(compareText),
      expectedEvidence.toSorted(compareText),
      `${group.id}: evidence must match occurrence coordinates`
    )
  }
})
