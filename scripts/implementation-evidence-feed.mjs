/**
 * SPE-3758: package verified SPE-3276 findings for an exact Linear retrieval.
 * This module does not classify GitHub evidence or grant planning authority.
 */
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { isDeepStrictEqual } from 'node:util'

const ISSUE_ID = /^[A-Z]+-\d+$/
const SHA = /^[a-f0-9]{40}$/i
const STATES = new Set([
  'unstarted',
  'partial',
  'merged',
  'current-main',
  'superseded',
  'missing',
  'evidence-conflicted',
])
const FINDING_KEYS = [
  'assessedAt',
  'authority',
  'basis',
  'canonicalIssueId',
  'findingRef',
  'githubRevision',
  'implementationEvidence',
  'linearUpdatedAt',
  'linearUuid',
  'materialDrift',
  'sourceCommentId',
  'sourceUpdatedAt',
  'verified',
].sort()
const order = (a, b) => a.localeCompare(b, 'en')
const timestamp = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value))
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const fail = (message) => {
  throw new Error('evidence feed invalid: ' + message)
}
const linearRef = (value, issueId) => {
  if (!nonempty(value)) return false
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      url.hostname === 'linear.app' &&
      url.pathname.split('/').includes('issue') &&
      url.pathname.split('/').some((part) => part === issueId)
    )
  } catch {
    return false
  }
}
const githubRef = (value) => {
  if (!nonempty(value)) return false
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      url.hostname === 'github.com' &&
      url.pathname.split('/').filter(Boolean).length >= 3
    )
  } catch {
    return false
  }
}

export function readMainRevision() {
  const candidates =
    process.platform === 'win32'
      ? ['C:\\Program Files\\Git\\cmd\\git.exe']
      : ['/usr/bin/git', '/bin/git', '/opt/homebrew/bin/git', '/usr/local/bin/git']
  const git = candidates.find((candidate) => fs.existsSync(candidate))
  if (!git) fail('Git executable unavailable at a fixed system path')
  const output = execFileSync(git, ['ls-remote', 'origin', 'refs/heads/main'], {
    encoding: 'utf8',
    windowsHide: true,
  }).trim()
  const match = /^([a-f0-9]{40})\s+refs\/heads\/main$/i.exec(output)
  if (!match) fail('GitHub main revision unavailable')
  return match[1]
}

export function linearInventory(projectIds, pages) {
  if (
    !Array.isArray(projectIds) ||
    !projectIds.length ||
    projectIds.some((id) => !nonempty(id)) ||
    new Set(projectIds).size !== projectIds.length ||
    !Array.isArray(pages) ||
    pages.length !== projectIds.length ||
    pages.some((page) => !Array.isArray(page))
  )
    fail('project coverage')
  const records = []
  const ids = new Set()
  const uuids = new Set()
  for (let index = 0; index < pages.length; index++) {
    for (const issue of pages[index]) {
      if (
        !ISSUE_ID.test(issue?.identifier ?? '') ||
        !nonempty(issue?.id) ||
        !timestamp(issue?.updatedAt) ||
        ids.has(issue.identifier) ||
        uuids.has(issue.id)
      )
        fail('issue identity or duplicate')
      ids.add(issue.identifier)
      uuids.add(issue.id)
      records.push({
        id: issue.identifier,
        uuid: issue.id,
        projectId: projectIds[index],
        updatedAt: issue.updatedAt,
      })
    }
  }
  return records.sort((a, b) => order(a.id, b.id))
}

function validBasis(basis, issueId) {
  if (!basis || basis.issueId !== issueId || !linearRef(basis.issueRef, issueId)) return false
  if (basis.kind === 'references') {
    return (
      Array.isArray(basis.refs) &&
      basis.refs.length > 0 &&
      basis.refs.every(
        (ref) => githubRef(ref?.url) && SHA.test(ref?.revision ?? '') && timestamp(ref?.checkedAt)
      )
    )
  }
  if (basis.kind === 'negative-search') {
    return (
      nonempty(basis.repository) &&
      nonempty(basis.query) &&
      basis.query.includes(issueId) &&
      SHA.test(basis.revision ?? '') &&
      timestamp(basis.checkedAt) &&
      basis.resultCount === 0
    )
  }
  return false
}

function validFinding(finding, issue, githubRevision) {
  return (
    same(Object.keys(finding ?? {}).sort(), FINDING_KEYS) &&
    same(Object.keys(finding.implementationEvidence ?? {}), ['state']) &&
    finding?.authority === 'SPE-3276' &&
    finding.verified === true &&
    nonempty(finding.sourceCommentId) &&
    timestamp(finding.sourceUpdatedAt) &&
    finding.canonicalIssueId === issue.id &&
    finding.linearUuid === issue.uuid &&
    finding.linearUpdatedAt === issue.updatedAt &&
    finding.githubRevision === githubRevision &&
    linearRef(finding.findingRef, 'SPE-3276') &&
    timestamp(finding.assessedAt) &&
    ['conflict', 'non-conflict'].includes(finding.materialDrift) &&
    STATES.has(finding.implementationEvidence?.state) &&
    (finding.materialDrift !== 'conflict' ||
      finding.implementationEvidence.state === 'evidence-conflicted') &&
    (finding.materialDrift !== 'non-conflict' ||
      finding.implementationEvidence.state !== 'evidence-conflicted') &&
    validBasis(finding.basis, issue.id)
  )
}

function sameInventory(left, right) {
  return same(left, right)
}

export function produceEvidenceFeed({
  projectIds,
  pages,
  verifiedInventory,
  retrievedAt,
  revisionVerifiedAt,
  githubRevision,
  githubVerifiedAt,
  findings,
}) {
  const issues = linearInventory(projectIds, pages)
  if (!issues.length) fail('empty project issue inventory')
  if (
    !timestamp(retrievedAt) ||
    !timestamp(revisionVerifiedAt) ||
    !timestamp(githubVerifiedAt) ||
    !SHA.test(githubRevision ?? '')
  ) {
    fail('source revision or timestamp')
  }
  const diagnostics = []
  if (!sameInventory(issues, verifiedInventory)) {
    diagnostics.push({ code: 'linear-revision-mismatch' })
  }
  if (!Array.isArray(findings)) fail('findings must be a list')
  const byId = new Map()
  for (const finding of findings) {
    if (!ISSUE_ID.test(finding?.canonicalIssueId ?? '') || byId.has(finding.canonicalIssueId)) {
      diagnostics.push({
        code: 'duplicate-or-invalid-finding',
        id: finding?.canonicalIssueId ?? null,
      })
    } else byId.set(finding.canonicalIssueId, finding)
  }
  const records = {}
  for (const issue of issues) {
    const finding = byId.get(issue.id)
    if (!validFinding(finding, issue, githubRevision)) {
      diagnostics.push({ code: finding ? 'unverified-finding' : 'missing-finding', id: issue.id })
      records[issue.id] = {
        linearUpdatedAt: issue.updatedAt,
        verified: false,
        implementationEvidence: { state: 'unknown' },
        evidenceDrift: null,
      }
      continue
    }
    records[issue.id] = {
      linearUpdatedAt: issue.updatedAt,
      verified: true,
      implementationEvidence: { state: finding.implementationEvidence.state },
      evidenceDrift: finding.materialDrift === 'conflict',
      provenance: {
        authority: 'SPE-3276',
        findingRef: finding.findingRef,
        sourceCommentId: finding.sourceCommentId,
        sourceUpdatedAt: finding.sourceUpdatedAt,
        assessedAt: finding.assessedAt,
        githubRevision,
        basis: finding.basis,
      },
    }
  }
  for (const id of byId.keys()) {
    if (!records[id]) diagnostics.push({ code: 'extra-finding', id })
  }
  diagnostics.sort((a, b) => order(a.code, b.code) || order(a.id ?? '', b.id ?? ''))
  return {
    schemaVersion: 1,
    source: 'SPE-3276',
    producer: 'SPE-3758',
    complete: diagnostics.length === 0,
    retrieval: {
      source: 'Linear',
      projectIds: [...projectIds],
      retrievedAt,
      revisionVerifiedAt,
      issues,
    },
    github: { revision: githubRevision, verifiedAt: githubVerifiedAt },
    issues: records,
    diagnostics,
  }
}

export const serializeEvidenceFeed = (feed) => JSON.stringify(feed, null, 2) + '\n'

export function writeAtomically(outputPath, bytes) {
  const pending = outputPath + '.pending-' + randomUUID()
  const descriptor = fs.openSync(pending, 'wx')
  try {
    fs.writeFileSync(descriptor, bytes)
    fs.closeSync(descriptor)
    fs.renameSync(pending, outputPath)
  } catch (error) {
    try {
      fs.closeSync(descriptor)
    } catch {
      /* already closed */
    }
    if (fs.existsSync(pending)) fs.unlinkSync(pending)
    throw error
  }
}

const REVISION_QUERY = `query EvidenceRevisionIssues($project: String!, $after: String) {
  project(id:$project) { id issues(first:50, after:$after, includeArchived:true) {
    pageInfo {hasNextPage endCursor}
    nodes {identifier id updatedAt}
  }}
}`

const FINDING_QUERY = `query EvidenceAuthorityComments($after: String) {
  issue(id:"SPE-3276") { identifier assignee { id }
    comments(first:50, after:$after, includeArchived:true) {
      pageInfo {hasNextPage endCursor}
      nodes {id body updatedAt user { id }}
    }
  }
}`

export async function verifyAuthorityFindings({ apiKey, findings, request = fetch }) {
  if (!nonempty(apiKey) || !Array.isArray(findings)) fail('SPE-3276 source configuration')
  for (const finding of findings) {
    if (!nonempty(finding?.sourceCommentId) || finding.verified !== true) {
      fail(
        (finding?.canonicalIssueId ?? 'unknown issue') +
          ' SPE-3276 finding not verified by its owner'
      )
    }
  }
  if (!findings.length) return []
  const needed = new Set(findings.map((finding) => finding.sourceCommentId))
  const comments = new Map()
  const cursors = new Set()
  let ownerId = null
  let after = null
  for (;;) {
    const response = await request('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: FINDING_QUERY, variables: { after } }),
    })
    if (!response.ok) fail('SPE-3276 source HTTP ' + response.status)
    const body = await response.json()
    const issue = body.data?.issue
    if (
      body.errors?.length ||
      issue?.identifier !== 'SPE-3276' ||
      !nonempty(issue.assignee?.id) ||
      (ownerId !== null && ownerId !== issue.assignee.id) ||
      !Array.isArray(issue.comments?.nodes) ||
      typeof issue.comments.pageInfo?.hasNextPage !== 'boolean'
    )
      fail('SPE-3276 source owner or pagination mismatch')
    ownerId = issue.assignee.id
    for (const comment of issue.comments.nodes) {
      if (!nonempty(comment?.id) || comments.has(comment.id)) {
        fail('SPE-3276 duplicate or missing comment identity')
      }
      if (needed.has(comment.id)) comments.set(comment.id, comment)
    }
    if (!issue.comments.pageInfo.hasNextPage) break
    const cursor = issue.comments.pageInfo.endCursor
    if (!nonempty(cursor) || cursors.has(cursor)) fail('SPE-3276 cyclic comment pagination')
    cursors.add(cursor)
    after = cursor
  }
  const verified = []
  for (const finding of findings) {
    const comment = comments.get(finding.sourceCommentId)
    if (
      !comment ||
      comment.user?.id !== ownerId ||
      comment.updatedAt !== finding.sourceUpdatedAt ||
      !timestamp(comment.updatedAt)
    )
      fail(finding.canonicalIssueId + ' SPE-3276 source revision or owner mismatch')
    let recorded
    try {
      recorded = JSON.parse(comment.body)
    } catch {
      fail('SPE-3276 source is not JSON')
    }
    const { sourceCommentId, sourceUpdatedAt, ...assessment } = finding
    if (!isDeepStrictEqual(recorded, assessment)) {
      fail(finding.canonicalIssueId + ' SPE-3276 source content mismatch')
    }
    verified.push({ ...finding, verified: true })
  }
  return verified
}

export async function fetchLinearRevisionInventory({ apiKey, projectIds, request = fetch }) {
  if (!nonempty(apiKey) || !Array.isArray(projectIds) || !projectIds.length) {
    fail('Linear revision read configuration')
  }
  const pages = []
  for (const projectId of projectIds) {
    const issues = []
    const cursors = new Set()
    let after = null
    for (;;) {
      const response = await request('https://api.linear.app/graphql', {
        method: 'POST',
        headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: REVISION_QUERY, variables: { project: projectId, after } }),
      })
      if (!response.ok) fail('Linear revision HTTP ' + response.status)
      const body = await response.json()
      if (body.errors?.length || !body.data?.project || body.data.project.id !== projectId)
        fail('Linear revision partial result')
      const connection = body.data.project.issues
      if (
        !Array.isArray(connection?.nodes) ||
        typeof connection.pageInfo?.hasNextPage !== 'boolean'
      ) {
        fail('Linear revision incomplete pagination')
      }
      issues.push(...connection.nodes)
      if (!connection.pageInfo.hasNextPage) break
      const cursor = connection.pageInfo.endCursor
      if (!nonempty(cursor) || cursors.has(cursor)) fail('Linear revision cyclic pagination')
      cursors.add(cursor)
      after = cursor
    }
    pages.push(issues)
  }
  return linearInventory(projectIds, pages)
}

function findingFromRecord(issue, record) {
  return {
    authority: record?.provenance?.authority,
    verified: record?.verified,
    canonicalIssueId: issue.id,
    linearUuid: issue.uuid,
    linearUpdatedAt: record?.linearUpdatedAt,
    githubRevision: record?.provenance?.githubRevision,
    findingRef: record?.provenance?.findingRef,
    sourceCommentId: record?.provenance?.sourceCommentId,
    sourceUpdatedAt: record?.provenance?.sourceUpdatedAt,
    assessedAt: record?.provenance?.assessedAt,
    materialDrift: record?.evidenceDrift === true ? 'conflict' : 'non-conflict',
    implementationEvidence: record?.implementationEvidence,
    basis: record?.provenance?.basis,
  }
}

export async function verifyEvidenceFeedSource({ feed, apiKey, request = fetch }) {
  if (
    !Array.isArray(feed?.retrieval?.issues) ||
    !feed.issues ||
    typeof feed.issues !== 'object' ||
    Array.isArray(feed.issues)
  ) {
    fail('SPE-3276 source record coverage missing')
  }
  const findings = feed.retrieval.issues.map((issue) =>
    findingFromRecord(issue, feed.issues[issue.id])
  )
  await verifyAuthorityFindings({ apiKey, findings, request })
}

export function validateEvidenceFeed(feed, { projectIds, pages, githubRevision }) {
  const expected = linearInventory(projectIds, pages)
  if (!expected.length) fail('empty project issue inventory')
  if (
    feed?.schemaVersion !== 1 ||
    feed.source !== 'SPE-3276' ||
    feed.producer !== 'SPE-3758' ||
    feed.complete !== true ||
    !Array.isArray(feed.diagnostics) ||
    feed.diagnostics.length ||
    feed.retrieval?.source !== 'Linear' ||
    !Array.isArray(feed.retrieval.projectIds) ||
    !same([...feed.retrieval.projectIds].sort(order), [...projectIds].sort(order)) ||
    !same(feed.retrieval.issues, expected) ||
    !timestamp(feed.retrieval.retrievedAt) ||
    !timestamp(feed.retrieval.revisionVerifiedAt) ||
    !SHA.test(feed.github?.revision ?? '') ||
    feed.github.revision !== githubRevision ||
    !timestamp(feed.github.verifiedAt) ||
    !feed.issues ||
    typeof feed.issues !== 'object' ||
    Array.isArray(feed.issues) ||
    !same(
      Object.keys(feed.issues).sort(order),
      expected.map((x) => x.id)
    )
  ) {
    fail('unsupported provenance, revision, or incomplete coverage')
  }
  for (const issue of expected) {
    const record = feed.issues[issue.id]
    const finding = findingFromRecord(issue, record)
    if (
      typeof record?.evidenceDrift !== 'boolean' ||
      !validFinding(finding, issue, githubRevision)
    ) {
      fail(issue.id + ' unsupported classification')
    }
  }
  return feed.issues
}
