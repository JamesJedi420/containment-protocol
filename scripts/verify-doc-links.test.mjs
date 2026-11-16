import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'

const script = path.resolve('scripts/verify-doc-links.mjs')

function run(cwd) {
  return spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' })
}

// Baseline on real repo should exit 0
const base = run(process.cwd())
assert.equal(base.status, 0, 'baseline should exit 0')
assert.match(base.stdout, /OK \d+ files scanned/)

// Fixture for planted error
const dir = fs.mkdtempSync(path.join(tmpdir(), 'doclinks-'))
fs.mkdirSync(path.join(dir, 'docs'), { recursive: true })
fs.writeFileSync(path.join(dir, 'docs', 'x.md'), '# Test\n\n`docs/missing.ts:9999`\n\n[bad](missing.md)\n')
const planted = run(dir)
assert.notEqual(planted.status, 0, 'planted should fail')
assert.match(planted.stderr, /unresolved|missing/)

console.log('verify-doc-links tests passed')
