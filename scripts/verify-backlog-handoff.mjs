/**
 * Verifies the compact queue, archived shipped evidence, and current slice-doc statuses match
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

function extractHandoffSection(body, sourcePath = backlogPath) {
  const startMarker = '## Recommended next step (agent handoff)'
  const start = body.indexOf(startMarker)
  if (start === -1) {
    fail(`${sourcePath}: missing "${startMarker}" section`)
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
  const re = new RegExp(`\\|\\s*\`${escaped}\`\\s*\\|\\s*\\*\\*([^*]+)\\*\\*\\s*\\|`, 'm')
  const match = backlogBody.match(re)
  if (!match) {
    fail(
      `${backlogPath}: missing slice-doc table row for \`${sliceDocFile}\` under Git-visible implementation plans`
    )
  }
  return match[1].trim()
}

const manifest = readJson(manifestPath)
const backlogBody = fs.readFileSync(backlogPath, 'utf8').replace(/\r\n/g, '\n')
const handoffSection = extractHandoffSection(backlogBody)
// Frozen history retains shipped evidence; current slice statuses live in the manifest.
const historyBody = manifest.historyFile
  ? fs.readFileSync(path.join(root, manifest.historyFile), 'utf8')
  : backlogBody
const historyHandoff = extractHandoffSection(historyBody, manifest.historyFile ?? backlogPath)

if (manifest.historyFile) {
  const queue = backlogBody.split('## Active queue\n')[1]?.split('\n## ')[0] ?? ''
  const entries = queue.split('\n').filter((line) => line.startsWith('- '))
  if (entries.length === 0 || entries.length > 12)
    fail('backlog: keep 1–12 one-line active entries')
  if (entries.some((line) => line.length > 350))
    fail('backlog: queue entries must be concise (350 characters max)')
  if (Buffer.byteLength(backlogBody) > 6000)
    fail('backlog: keep the live queue under 6 KB; put history in Linear')
  if (/Recently shipped|\*\*Shipped\*\*/i.test(backlogBody))
    fail('backlog: shipped records belong in history or Linear')
  const queueIds = entries.map((line) => extractIssueIds(line)[0])
  if (queueIds.some((id) => !id) || new Set(queueIds).size !== queueIds.length)
    fail('backlog: each entry needs one distinct owning issue')
  for (const id of [manifest.primary, ...(manifest.inProgress ?? [])].filter(Boolean)) {
    if (!queueIds.includes(id)) fail(`backlog: handoff issue ${id} is missing from active queue`)
  }
}

const primaryLine = lineValue(handoffSection, 'Current handoff \\(primary\\)')
const inProgressLine = lineValue(handoffSection, 'In progress')

if (!primaryLine) {
  fail(`${backlogPath}: missing "**Current handoff (primary):**" line in handoff section`)
}
if (!inProgressLine) {
  fail(`${backlogPath}: missing "**In progress:**" line in handoff section`)
}

const primaryIds = extractIssueIds(primaryLine)
const inProgressIds = inProgressLine.includes('(none)') ? [] : extractIssueIds(inProgressLine)

const recentlyShippedBlock = historyHandoff
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
    fail(`${backlogPath}: primary handoff must mention ${manifestPrimary} (got: ${primaryLine})`)
  }
}

for (const issueId of manifestInProgress) {
  if (!inProgressIds.includes(issueId)) {
    fail(`${backlogPath}: "**In progress:**" must include ${issueId} per ${manifestPath}`)
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
  fail(
    `${manifestPath}: issue(s) appear in both inProgress and recentlyShipped: ${overlap.join(', ')}`
  )
}

for (const [sliceDocFile, expectedStatus] of Object.entries(manifestSliceDocs)) {
  const sliceDocFull = path.join(root, sliceDocFile)
  if (!fs.existsSync(sliceDocFull)) {
    fail(`${manifestPath}: slice doc not found: ${sliceDocFile}`)
  }

  const docStatus = parseSliceDocStatus(sliceDocFile)
  const tableStatus = manifest.historyFile
    ? expectedStatus
    : parseBacklogTableStatus(backlogBody, sliceDocFile)

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
  `archivedShipped=${manifestRecentlyShipped.length}`
)
