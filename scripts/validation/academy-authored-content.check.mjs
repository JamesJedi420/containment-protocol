import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import {
  formatDiagnostics,
  listRegisteredKinds,
  validateAcademyAuthoredContent,
} from './academy-authored-content.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixturesRoot = path.join(here, 'fixtures', 'academy-authored-content')
const validatorPath = path.join(here, 'academy-authored-content.mjs')

function fixture(name) {
  return path.join(fixturesRoot, name)
}

function hashTree(root) {
  if (!fs.existsSync(root)) return 'absent'
  const hash = crypto.createHash('sha256')
  const walk = (dir) => {
    for (const entry of fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else {
        hash.update(path.relative(root, full).split(path.sep).join('/'))
        hash.update('\0')
        hash.update(fs.readFileSync(full))
        hash.update('\0')
      }
    }
  }
  walk(root)
  return hash.digest('hex')
}

function runCli(rootArg) {
  return spawnSync(process.execPath, [validatorPath, '--root', rootArg], {
    encoding: 'utf8',
    cwd: path.join(here, '../..'),
  })
}

test('registered kinds expose an extensibility seam', () => {
  const kinds = listRegisteredKinds()
  assert.deepEqual(kinds, ['course', 'module'])
})

test('valid/minimal-pack exits 0 with no diagnostics', () => {
  const root = fixture('valid/minimal-pack')
  const before = hashTree(root)
  const a = validateAcademyAuthoredContent(root, { relativeTo: root })
  const b = validateAcademyAuthoredContent(root, { relativeTo: root })
  assert.equal(a.ok, true)
  assert.equal(a.diagnostics.length, 0)
  assert.equal(formatDiagnostics(a.diagnostics), formatDiagnostics(b.diagnostics))
  assert.equal(hashTree(root), before)
  const cli = runCli(root)
  assert.equal(cli.status, 0)
  assert.equal((cli.stdout ?? '').trim(), '')
})

test('valid/empty-root exits 0', () => {
  const root = fixture('valid/empty-root')
  const result = validateAcademyAuthoredContent(root)
  assert.equal(result.ok, true)
  assert.equal(result.filesChecked, 0)
  assert.equal(runCli(root).status, 0)
})

test('valid/absent-root exits 0', () => {
  const root = path.join(fixturesRoot, 'valid', 'absent-root-does-not-exist')
  assert.equal(fs.existsSync(root), false)
  const result = validateAcademyAuthoredContent(root)
  assert.equal(result.ok, true)
  assert.equal(result.filesChecked, 0)
  assert.equal(runCli(root).status, 0)
})

test('invalid/unknown-kind fails with unclassified diagnostic', () => {
  const root = fixture('invalid/unknown-kind')
  const result = validateAcademyAuthoredContent(root, { relativeTo: root })
  assert.equal(result.ok, false)
  assert.equal(result.diagnostics.length, 1)
  assert.equal(result.diagnostics[0].rule, 'unknown-kind')
  assert.match(formatDiagnostics(result.diagnostics), /mystery\.json/)
  assert.equal(runCli(root).status, 1)
})

test('invalid/malformed-json (generated) fails with parse diagnostic', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'academy-authored-'))
  try {
    fs.writeFileSync(path.join(tmp, 'broken.json'), '{ not json', 'utf8')
    const result = validateAcademyAuthoredContent(tmp, { relativeTo: tmp })
    assert.equal(result.ok, false)
    assert.equal(result.diagnostics[0].rule, 'malformed-json')
    assert.equal(runCli(tmp).status, 1)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test('invalid/malformed-record names the field path', () => {
  const root = fixture('invalid/malformed-record')
  const result = validateAcademyAuthoredContent(root, { relativeTo: root })
  assert.equal(result.ok, false)
  assert.ok(
    result.diagnostics.some((d) => d.rule === 'malformed-record' && d.fieldPath === 'prerequisites')
  )
})

test('invalid/duplicate-id-same-kind reports both occurrences', () => {
  const root = fixture('invalid/duplicate-id-same-kind')
  const result = validateAcademyAuthoredContent(root, { relativeTo: root })
  assert.equal(result.ok, false)
  const dups = result.diagnostics.filter((d) => d.rule === 'duplicate-id')
  assert.ok(dups.length >= 2)
  assert.ok(dups.every((d) => d.recordId === 'course-dup'))
})

test('invalid/duplicate-id-shared-space reports cross-kind collision', () => {
  const root = fixture('invalid/duplicate-id-shared-space')
  const result = validateAcademyAuthoredContent(root, { relativeTo: root })
  assert.equal(result.ok, false)
  const dups = result.diagnostics.filter((d) => d.rule === 'duplicate-id')
  assert.ok(dups.length >= 2)
  assert.ok(dups.every((d) => d.recordId === 'shared-collide'))
  assert.ok(dups.some((d) => /shared id-space/.test(d.message)))
})

test('invalid/id-grammar quotes the offending id', () => {
  const root = fixture('invalid/id-grammar')
  const result = validateAcademyAuthoredContent(root, { relativeTo: root })
  assert.equal(result.ok, false)
  assert.ok(result.diagnostics.some((d) => d.rule === 'id-grammar'))
  assert.match(formatDiagnostics(result.diagnostics), /Bad_ID!/)
})

test('invalid/dangling-reference names source and missing target', () => {
  const root = fixture('invalid/dangling-reference')
  const result = validateAcademyAuthoredContent(root, { relativeTo: root })
  assert.equal(result.ok, false)
  const hit = result.diagnostics.find((d) => d.rule === 'dangling-reference')
  assert.ok(hit)
  assert.equal(hit.recordId, 'course-lonely')
  assert.match(hit.message, /module-missing/)
})

test('invalid/impossible-prerequisite names the cycle', () => {
  const root = fixture('invalid/impossible-prerequisite')
  const result = validateAcademyAuthoredContent(root, { relativeTo: root })
  assert.equal(result.ok, false)
  assert.ok(
    result.diagnostics.some((d) => d.rule === 'impossible-prerequisite' && /cycle/.test(d.message))
  )
})

test('repeated runs are byte-identical', () => {
  const root = fixture('invalid/dangling-reference')
  const a = formatDiagnostics(
    validateAcademyAuthoredContent(root, { relativeTo: root }).diagnostics
  )
  const b = formatDiagnostics(
    validateAcademyAuthoredContent(root, { relativeTo: root }).diagnostics
  )
  assert.equal(a, b)
})

test('invalid CLI invocation exits 2', () => {
  const result = spawnSync(process.execPath, [validatorPath, '--root'], {
    encoding: 'utf8',
  })
  assert.equal(result.status, 2)
})

test('default production root validates without requiring absence', () => {
  // Gate activates on academy/** PRs that may create this root; do not assert it stays missing.
  const productionRoot = path.join(here, '..', '..', 'academy', 'content')
  const result = validateAcademyAuthoredContent(productionRoot)
  assert.ok(Array.isArray(result.diagnostics))
  if (!fs.existsSync(productionRoot)) {
    assert.equal(result.ok, true)
    assert.equal(result.filesChecked, 0)
  }
})

test('duplicate-id diagnostics attribute distinct lines per occurrence', () => {
  const root = fixture('invalid/duplicate-id-same-kind')
  const result = validateAcademyAuthoredContent(root, { relativeTo: root })
  const dups = result.diagnostics.filter((d) => d.rule === 'duplicate-id')
  assert.ok(dups.length >= 2)
  const lines = new Set(dups.map((d) => d.line))
  assert.ok(lines.size >= 2, `expected distinct lines, got ${[...lines]}`)
})
