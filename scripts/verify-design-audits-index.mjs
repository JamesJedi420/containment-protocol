/**
 * Ensures docs/design-audits-index.md lists every top-level docs/*audit*.md
 * exactly once, in strict alphabetical order, with ./ relative links.
 *
 * Files matching *audit* that are not audit checklists (e.g. this index) are excluded.
 *
 * Usage: node scripts/verify-design-audits-index.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const docsDir = path.join(root, 'docs')
const indexPath = path.join(docsDir, 'design-audits-index.md')

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

const diskAudits = fs
  .readdirSync(docsDir)
  .filter(
    (f) => f.endsWith('.md') && f.toLowerCase().includes('audit') && f !== 'design-audits-index.md'
  )
  .sort((a, b) => a.localeCompare(b, 'en'))

const diskSet = new Set(diskAudits)

const body = fs.readFileSync(indexPath, 'utf8')
const startMarker = '## Audits (alphabetical)'
const endMarker = '## Related'
const start = body.indexOf(startMarker)
const end = body.indexOf(endMarker, start + 1)
if (start === -1) fail(`${indexPath}: missing "${startMarker}" section`)
if (end === -1) fail(`${indexPath}: missing "${endMarker}" after audits section`)

const section = body.slice(start, end)
const lineRe = /^- \[`([^`]+)`\]\(\.\/([^)]+)\)\s*$/
const indexed = []
for (const line of section.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('- ')) continue
  const m = trimmed.match(lineRe)
  if (!m) {
    fail(
      `${indexPath}: audits list lines must match - [\`name\`](./name) (got: ${JSON.stringify(trimmed)})`
    )
  }
  const label = m[1]
  const href = m[2]
  if (label !== href) {
    fail(
      `${indexPath}: link text and path must match (${JSON.stringify(label)} vs ${JSON.stringify(href)})`
    )
  }
  if (!href.endsWith('.md')) {
    fail(`${indexPath}: audits entries must be .md files (${JSON.stringify(href)})`)
  }
  indexed.push(href)
}

const dup = indexed.filter((f, i) => indexed.indexOf(f) !== i)
if (dup.length) fail(`${indexPath}: duplicate audit entries: ${[...new Set(dup)].join(', ')}`)

const indexedSet = new Set(indexed)
const missingOnDisk = indexed.filter((f) => !diskSet.has(f))
if (missingOnDisk.length) {
  fail(
    `${indexPath}: index lists files not found under docs/: ${missingOnDisk.join(', ')}\n` +
      `Fix: remove stale bullets or restore the files.`
  )
}

const missingInIndex = diskAudits.filter((f) => !indexedSet.has(f))
if (missingInIndex.length) {
  fail(
    `${indexPath}: missing bullets for docs audit files: ${missingInIndex.join(', ')}\n` +
      `Fix: add one line per file under "## Audits (alphabetical)" in strict order:\n` +
      missingInIndex.map((f) => `- [\`${f}\`](./${f})`).join('\n')
  )
}

const sorted = [...indexed].sort((a, b) => a.localeCompare(b, 'en'))
if (indexed.join('\n') !== sorted.join('\n')) {
  fail(
    `${indexPath}: audits section must be strictly alphabetical by filename.\n` +
      `Expected order (first mismatch):\n` +
      sorted.map((f) => `- [\`${f}\`](./${f})`).join('\n')
  )
}

console.log('design-audits-index: OK', indexed.length, 'audit files')
