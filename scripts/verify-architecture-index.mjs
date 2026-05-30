/**
 * Ensures every architecture/*.md (except the map file itself) appears exactly once
 * in the ## See also section of architecture/game-state-and-core-loop.md, and that
 * every indexed architecture path exists on disk.
 *
 * The map is selective by design for docs/ and planning/ entries; this verifier
 * only enforces architecture/*.md coverage.
 *
 * Usage: node scripts/verify-architecture-index.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const archDir = path.join(root, 'architecture')
const mapPath = path.join(archDir, 'game-state-and-core-loop.md')
const MAP_FILE = 'game-state-and-core-loop.md'

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

const diskArch = fs
  .readdirSync(archDir)
  .filter((f) => f.endsWith('.md') && f !== MAP_FILE)
  .sort((a, b) => a.localeCompare(b, 'en'))

const diskSet = new Set(diskArch)
const body = fs.readFileSync(mapPath, 'utf8')
const seeAlsoStart = body.indexOf('## See also')
if (seeAlsoStart === -1) fail(`${mapPath}: missing "## See also" section`)

const section = body.slice(seeAlsoStart)
const linkRe = /`architecture\/([^`]+\.md)`/g
const indexed = []
let m
while ((m = linkRe.exec(section))) indexed.push(m[1])

const dup = indexed.filter((f, i) => indexed.indexOf(f) !== i)
if (dup.length) {
  fail(`${mapPath}: duplicate architecture entries: ${[...new Set(dup)].join(', ')}`)
}

const indexedSet = new Set(indexed)
const missingOnDisk = indexed.filter((f) => !diskSet.has(f))
if (missingOnDisk.length) {
  fail(
    `${mapPath}: See also lists missing architecture files: ${missingOnDisk.join(', ')}\n` +
      `Fix: remove stale bullets or restore the files.`
  )
}

const missingInMap = diskArch.filter((f) => !indexedSet.has(f))
if (missingInMap.length) {
  fail(
    `${mapPath}: architecture files not linked under "## See also": ${missingInMap.join(', ')}\n` +
      `Fix: add one bullet per file, or document an explicit exception in planning/documentation-curation.md.`
  )
}

console.log(
  'architecture-index: OK',
  diskArch.length,
  'architecture files indexed (excluding map file)'
)
