import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import { compareCensuses, parseDiagnostics, sha256, summarize } from './typecheck-census.mjs'

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
