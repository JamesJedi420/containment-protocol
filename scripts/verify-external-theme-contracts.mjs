/**
 * Ensures architecture/external-design-theme-contracts.md **SPE coverage**
 * sets match docs/linear-external-documentation-follow-ups.md (## Follow-up prompts only).
 *
 * Usage: node scripts/verify-external-theme-contracts.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const mirrorPath = path.join(root, 'docs/linear-external-documentation-follow-ups.md')
const themesPath = path.join(root, 'architecture/external-design-theme-contracts.md')

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

function parseMirrorSpeSet() {
  const body = fs.readFileSync(mirrorPath, 'utf8')
  const idx = body.indexOf('## Follow-up prompts')
  if (idx === -1) fail(`${mirrorPath}: missing "## Follow-up prompts"`)
  const tail = body.slice(idx)
  const set = new Set()
  for (const m of tail.matchAll(/\*\*SPE-(\d+)\*\*/g)) {
    set.add(Number(m[1]))
  }
  return set
}

function expandCoverageLine(line, into) {
  const cleaned = line
    .replace(/\([^)]*\)/g, '')
    .replace(/\u2013/g, '-')
    .replace(/\u2212/g, '-')
  for (const raw of cleaned.split(',')) {
    const part = raw.trim()
    if (!part) continue
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/)
    if (range) {
      const a = Number(range[1])
      const b = Number(range[2])
      const lo = Math.min(a, b)
      const hi = Math.max(a, b)
      for (let n = lo; n <= hi; n++) into.add(n)
      continue
    }
    const n = Number(part)
    if (!Number.isNaN(n)) into.add(n)
  }
}

function parseThemedSpeSet() {
  const body = fs.readFileSync(themesPath, 'utf8')
  const set = new Set()
  const parts = body.split('**SPE coverage:**')
  for (let i = 1; i < parts.length; i++) {
    const firstLine = parts[i].split(/\r?\n/)[0] ?? ''
    expandCoverageLine(firstLine, set)
  }
  return set
}

const mirror = parseMirrorSpeSet()
const themed = parseThemedSpeSet()

const missing = [...mirror].filter((n) => !themed.has(n)).sort((a, b) => a - b)
const extra = [...themed].filter((n) => !mirror.has(n)).sort((a, b) => a - b)

if (missing.length) {
  fail(
    `${themesPath}: SPE ids in mirror but not in any **SPE coverage:** line: ${missing.join(', ')}\n` +
      `Update theme clusters so every mirrored bullet maps to exactly one theme.`
  )
}
if (extra.length) {
  fail(
    `${themesPath}: SPE ids in **SPE coverage:** but not in mirror follow-ups: ${extra.join(', ')}\n` +
      `Remove stale numbers or refresh the mirror from Linear.`
  )
}

console.log('external-theme-contracts: OK', mirror.size, 'SPE ids mirrored ↔ themed')
