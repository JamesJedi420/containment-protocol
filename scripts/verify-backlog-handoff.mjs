/**
 * Verifies planning/backlog.md handoff text and slice-doc status rows match
 * planning/backlog-handoff-manifest.json (git-visible handoff source of truth).
 *
 * Update the manifest whenever you change backlog handoff or slice-doc status.
 *
 * Usage: node scripts/verify-backlog-handoff.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const backlogPath = path.join(root, 'planning', 'backlog.md')
const manifestPath = path.join(root, 'planning', 'backlog-handoff-manifest.json')

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    fail(`${filePath}: invalid JSON (${error.message})`)
  }
}

function extractHandoffSection(body) {
  const startMarker = '## Recommended next step (agent handoff)'
  const start = body.indexOf(startMarker)
  if (start === -1) {
    fail(`${backlogPath}: missing "${startMarker}" section`)
  }

  const nextHeading = body.indexOf('\n## ', start + startMarker.length)
  const end = nextHeading === -1 ? body.length : nextHeading
  return body.slice(start, end)
}

function extractIssueIds(text) {
  const ids = []
  const re = /SPE-\d+/g
  for (const match of text.matchAll(re)) {
    ids.push(match[0])
  }
  return ids
}

function lineValue(handoffSection, label) {
  const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)$`, 'm')
  const match = handoffSection.match(re)
  return match ? match[1].trim() : null
}

function parseSliceDocStatus(sliceDocPath) {
  const body = fs.readFileSync(path.join(root, sliceDocPath), 'utf8')
  const match = body.match(/\|\s*\*\*Status\*\*\s*\|\s*\*\*([^*]+)\*\*/)
  if (!match) {
    fail(`${sliceDocPath}: missing "| **Status** | **...** |" table row`)
  }
  return match[1].trim()
}

function parseBacklogTableStatus(backlogBody, sliceDocPath) {
  const sliceDocFile = path.basename(sliceDocPath)
  const escaped = sliceDocFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(
    `\\|\\s*\`${escaped}\`\\s*\\|\\s*\\*\\*([^*]+)\\*\\*\\s*\\|`,
    'm'
  )
  const match = backlogBody.match(re)
  if (!match) {
    fail(
      `${backlogPath}: missing slice-doc table row for \`${sliceDocFile}\` under Git-visible implementation plans`
    )
  }
  return match[1].trim()
}

const manifest = readJson(manifestPath)
const backlogBody = fs.readFileSync(backlogPath, 'utf8')
const handoffSection = extractHandoffSection(backlogBody)

const primaryLine = lineValue(handoffSection, 'Current handoff \\(primary\\)')
const inProgressLine = lineValue(handoffSection, 'In progress')

if (!primaryLine) {
  fail(`${backlogPath}: missing "**Current handoff (primary):**" line in handoff section`)
}
if (!inProgressLine) {
  fail(`${backlogPath}: missing "**In progress:**" line in handoff section`)
}

const primaryIds = extractIssueIds(primaryLine)
const inProgressIds = inProgressLine.includes('(none)')
  ? []
  : extractIssueIds(inProgressLine)

const recentlyShippedBlock = handoffSection
  .split('\n')
  .filter((line) => line.startsWith('**Recently shipped:**'))
  .slice(0, 12)
  .join('\n')
const recentlyShippedIds = extractIssueIds(recentlyShippedBlock)

const manifestPrimary = manifest.primary ?? null
const manifestInProgress = manifest.inProgress ?? []
const manifestRecentlyShipped = manifest.recentlyShipped ?? []
const manifestSliceDocs = manifest.sliceDocStatus ?? {}

if (manifestPrimary === null) {
  if (!primaryLine.includes('(none)')) {
    fail(
      `${manifestPath}: primary is null but backlog primary handoff is not "(none)": ${primaryLine}`
    )
  }
} else {
  if (!primaryIds.includes(manifestPrimary)) {
    fail(
      `${backlogPath}: primary handoff must mention ${manifestPrimary} (got: ${primaryLine})`
    )
  }
}

for (const issueId of manifestInProgress) {
  if (!inProgressIds.includes(issueId)) {
    fail(
      `${backlogPath}: "**In progress:**" must include ${issueId} per ${manifestPath}`
    )
  }
  if (recentlyShippedIds.includes(issueId)) {
    fail(
      `${backlogPath}: ${issueId} is listed under both In progress and Recently shipped in the handoff block`
    )
  }
}

for (const issueId of manifestRecentlyShipped) {
  if (!recentlyShippedIds.includes(issueId)) {
    fail(
      `${backlogPath}: Recently shipped handoff lines must include ${issueId} per ${manifestPath}`
    )
  }
  if (inProgressIds.includes(issueId)) {
    fail(
      `${backlogPath}: ${issueId} is listed under both In progress and Recently shipped in the handoff block`
    )
  }
}

const overlap = manifestInProgress.filter((id) => manifestRecentlyShipped.includes(id))
if (overlap.length) {
  fail(`${manifestPath}: issue(s) appear in both inProgress and recentlyShipped: ${overlap.join(', ')}`)
}

for (const [sliceDocFile, expectedStatus] of Object.entries(manifestSliceDocs)) {
  const sliceDocFull = path.join(root, sliceDocFile)
  if (!fs.existsSync(sliceDocFull)) {
    fail(`${manifestPath}: slice doc not found: ${sliceDocFile}`)
  }

  const docStatus = parseSliceDocStatus(sliceDocFile)
  const tableStatus = parseBacklogTableStatus(backlogBody, sliceDocFile)

  if (docStatus !== expectedStatus) {
    fail(
      `${sliceDocFile}: **Status** is "${docStatus}" but ${manifestPath} expects "${expectedStatus}"`
    )
  }

  if (tableStatus !== expectedStatus) {
    fail(
      `${backlogPath}: table status for \`${sliceDocFile}\` is "${tableStatus}" but manifest expects "${expectedStatus}"`
    )
  }
}

console.log(
  'backlog-handoff: OK',
  `primary=${manifestPrimary ?? 'none'}`,
  `inProgress=${manifestInProgress.join(',') || 'none'}`,
  `recentlyShipped=${manifestRecentlyShipped.join(',') || 'none'}`
)
