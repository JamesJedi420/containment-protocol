import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  fetchLinearRevisionInventory,
  linearInventory,
  produceEvidenceFeed,
  serializeEvidenceFeed,
  validateEvidenceFeed,
  verifyAuthorityFindings,
  verifyEvidenceFeedSource,
} from './implementation-evidence-feed.mjs'
import { normalizeLinearIssues } from './export-linear-approved-work.mjs'
import { projectApprovedWork } from './project-approved-work.mjs'
import { runProducer } from './produce-implementation-evidence.mjs'

const time = '2026-11-16T15:00:00Z'
const sha = 'a'.repeat(40)
const projectIds = ['project-1']
const row = (id, extra = {}) => ({
  identifier: id,
  id: 'uuid-' + id,
  updatedAt: time,
  priority: 2,
  state: { type: 'started' },
  labels: { pageInfo: { hasNextPage: false }, nodes: [{ id: 'ws', name: 'workstream:CP-core' }] },
  relations: { pageInfo: { hasNextPage: false }, nodes: [] },
  inverseRelations: { pageInfo: { hasNextPage: false }, nodes: [] },
  ...extra,
})
const finding = (id, extra = {}) => ({
  authority: 'SPE-3276',
  verified: true,
  sourceCommentId: 'comment-' + id,
  sourceUpdatedAt: time,
  canonicalIssueId: id,
  linearUuid: 'uuid-' + id,
  linearUpdatedAt: time,
  githubRevision: sha,
  findingRef: 'https://linear.app/spectranoir/issue/SPE-3276#' + id,
  assessedAt: time,
  materialDrift: 'non-conflict',
  implementationEvidence: { state: 'merged' },
  basis: {
    kind: 'references',
    issueId: id,
    issueRef: 'https://linear.app/spectranoir/issue/' + id,
    refs: [
      {
        url: 'https://github.com/JamesJedi420/containment-protocol/commit/' + sha,
        revision: sha,
        checkedAt: time,
      },
    ],
  },
  ...extra,
})
const assessment = ({ sourceCommentId, sourceUpdatedAt, ...content }) => content
const feed = (pages, findings, overrides = {}) =>
  produceEvidenceFeed({
    projectIds,
    pages,
    verifiedInventory: linearInventory(projectIds, pages),
    retrievedAt: time,
    revisionVerifiedAt: time,
    githubRevision: sha,
    githubVerifiedAt: time,
    findings,
    ...overrides,
  })

test('exact verified findings produce byte-stable feed and preserve Linear lifecycle', () => {
  const pages = [[row('SPE-1')]]
  const value = feed(pages, [finding('SPE-1')])
  assert.equal(value.complete, true)
  assert.deepEqual(value.diagnostics, [])
  assert.equal(serializeEvidenceFeed(value), serializeEvidenceFeed(feed(pages, [finding('SPE-1')])))
  assert.deepEqual(
    validateEvidenceFeed(value, { projectIds, pages, githubRevision: sha }),
    value.issues
  )
  const snapshot = normalizeLinearIssues(pages, value, time, undefined, projectIds, sha)
  const projection = projectApprovedWork(snapshot)
  assert.equal(projection.active[0].statusType, 'started')
  assert.equal(projection.active[0].implementationEvidence.state, 'merged')
  assert.deepEqual(projection.history, [])
})

test('missing, extra, duplicate, stale, and changed findings never qualify', () => {
  const pages = [[row('SPE-1')]]
  for (const findings of [
    [],
    [finding('SPE-1'), finding('SPE-1')],
    [finding('SPE-1'), finding('SPE-2')],
    [finding('SPE-1', { linearUpdatedAt: '2026-11-15T00:00:00Z' })],
    [finding('SPE-1', { githubRevision: 'b'.repeat(40) })],
    [finding('SPE-1', { verified: false })],
    [finding('SPE-1', { unsupported: true })],
    [finding('SPE-1', { materialDrift: 'unknown' })],
  ]) {
    const value = feed(pages, findings)
    assert.equal(value.complete, false)
    assert.ok(value.diagnostics.length)
    assert.throws(() => validateEvidenceFeed(value, { projectIds, pages, githubRevision: sha }))
  }
  const changed = feed(pages, [finding('SPE-1')], { verifiedInventory: [] })
  assert.equal(changed.complete, false)
  assert.deepEqual(changed.diagnostics, [{ code: 'linear-revision-mismatch' }])
})

test('empty configured project inventory cannot assert complete authority', () => {
  assert.throws(() => feed([[]], []), /empty project issue inventory/)
})

test('configured project order does not change exact feed coverage', () => {
  const ids = ['project-1', 'project-2']
  const pages = [[row('SPE-1')], [row('SPE-2')]]
  const value = produceEvidenceFeed({
    projectIds: ids,
    pages,
    verifiedInventory: linearInventory(ids, pages),
    retrievedAt: time,
    revisionVerifiedAt: time,
    githubRevision: sha,
    githubVerifiedAt: time,
    findings: [finding('SPE-1'), finding('SPE-2')],
  })
  assert.equal(value.complete, true)
  assert.deepEqual(
    validateEvidenceFeed(value, {
      projectIds: [...ids].reverse(),
      pages: [...pages].reverse(),
      githubRevision: sha,
    }),
    value.issues
  )
})

test('SPE-175 conflict and child-only parent evidence remain explicit', () => {
  const pages = [[row('SPE-175'), row('SPE-42')]]
  const conflict = finding('SPE-175', {
    materialDrift: 'conflict',
    implementationEvidence: { state: 'evidence-conflicted' },
  })
  const childOnly = finding('SPE-43')
  const value = feed(pages, [conflict, childOnly])
  assert.equal(value.complete, false)
  assert.equal(value.issues['SPE-175'].evidenceDrift, true)
  assert.equal(value.issues['SPE-42'].verified, false)
  const parent = finding('SPE-42', {
    basis: { ...finding('SPE-42').basis, issueId: 'SPE-43' },
  })
  assert.equal(feed(pages, [conflict, parent]).complete, false)
  const complete = feed(pages, [conflict, finding('SPE-42')])
  const snapshot = normalizeLinearIssues(pages, complete, time, undefined, projectIds, sha)
  assert.ok(
    projectApprovedWork(snapshot)
      .active.find((x) => x.id === 'SPE-175')
      .reasons.includes('evidence-conflicted')
  )
})

test('GitHub issue-number coincidence does not substitute for canonical Linear identity', () => {
  const pages = [[row('SPE-1013')]]
  const wrong = finding('SPE-1013', {
    basis: {
      kind: 'references',
      issueId: 'SPE-1013',
      issueRef: 'https://github.com/JamesJedi420/containment-protocol/issues/1013',
      refs: finding('SPE-1013').basis.refs,
    },
  })
  assert.equal(feed(pages, [wrong]).complete, false)
  assert.equal(feed(pages, [finding('SPE-1013')]).complete, true)
})

test('consumer rejects forged completeness, mismatched revisions, and unsupported provenance', () => {
  const pages = [[row('SPE-1')]]
  const good = feed(pages, [finding('SPE-1')])
  for (const mutation of [
    (value) => {
      value.retrieval.issues[0].updatedAt = '2026-11-15T00:00:00Z'
    },
    (value) => {
      value.github.revision = 'b'.repeat(40)
    },
    (value) => {
      value.issues['SPE-1'].provenance.findingRef = ''
    },
    (value) => {
      value.issues['SPE-1'].evidenceDrift = false
      value.issues['SPE-1'].implementationEvidence.state = 'evidence-conflicted'
    },
    (value) => {
      value.issues['SPE-1'].provenance.basis.refs = []
    },
    (value) => {
      value.diagnostics.push({ code: 'unknown' })
    },
  ]) {
    const value = structuredClone(good)
    mutation(value)
    assert.throws(() => validateEvidenceFeed(value, { projectIds, pages, githubRevision: sha }))
  }
})

test('source verification rejects malformed feed with a controlled diagnostic', async () => {
  await assert.rejects(
    verifyEvidenceFeedSource({ feed: {}, apiKey: 'test' }),
    /source record coverage missing/
  )
})

test('second Linear revision read exhausts pages and rejects unstable identities', async () => {
  const request = async (_url, opts) => {
    const { query, variables } = JSON.parse(opts.body)
    assert.match(query, /EvidenceRevisionIssues/)
    assert.match(query, /includeArchived:true/)
    return {
      ok: true,
      json: async () => ({
        data: {
          project: {
            id: 'project-1',
            issues: {
              nodes: [row(variables.after ? 'SPE-2' : 'SPE-1')],
              pageInfo: {
                hasNextPage: !variables.after,
                endCursor: variables.after ? null : 'next',
              },
            },
          },
        },
      }),
    }
  }
  const inventory = await fetchLinearRevisionInventory({ apiKey: 'test', projectIds, request })
  assert.deepEqual(
    inventory.map((x) => x.id),
    ['SPE-1', 'SPE-2']
  )
  await assert.rejects(
    fetchLinearRevisionInventory({
      apiKey: 'test',
      projectIds,
      request: async () => ({
        ok: true,
        json: async () => ({
          errors: [{ message: 'partial' }],
          data: { project: null },
        }),
      }),
    }),
    /partial/
  )
})

test('producer verifies the SPE-3276 owner comment and exact source revision', async () => {
  const assessed = finding('SPE-1')
  const request = async (_url, opts) => {
    const { query, variables } = JSON.parse(opts.body)
    assert.match(query, /EvidenceAuthorityComments/)
    assert.match(query, /comments\(first:50, after:\$after, includeArchived:true\)/)
    return {
      ok: true,
      json: async () => ({
        data: {
          issue: {
            identifier: 'SPE-3276',
            assignee: { id: 'owner' },
            comments: {
              nodes: variables.after
                ? [
                    {
                      id: assessed.sourceCommentId,
                      body: JSON.stringify(assessment(assessed)),
                      updatedAt: time,
                      user: { id: 'owner' },
                    },
                  ]
                : [
                    {
                      id: 'unrelated',
                      body: 'not a finding',
                      updatedAt: time,
                      user: { id: 'owner' },
                    },
                  ],
              pageInfo: {
                hasNextPage: !variables.after,
                endCursor: variables.after ? null : 'next',
              },
            },
          },
        },
      }),
    }
  }
  assert.deepEqual(
    await verifyAuthorityFindings({ apiKey: 'test', findings: [assessed], request }),
    [assessed]
  )
  await verifyEvidenceFeedSource({
    feed: feed([[row('SPE-1')]], [assessed]),
    apiKey: 'test',
    request,
  })
  await assert.rejects(
    verifyAuthorityFindings({
      apiKey: 'test',
      findings: [{ ...assessed, sourceUpdatedAt: '2026-11-15T00:00:00Z' }],
      request,
    }),
    /revision or owner mismatch/
  )
  await assert.rejects(
    verifyAuthorityFindings({
      apiKey: 'test',
      findings: [{ ...assessed, implementationEvidence: { state: 'missing' } }],
      request,
    }),
    /source content mismatch/
  )
  await assert.rejects(
    verifyAuthorityFindings({
      apiKey: 'test',
      findings: [assessed],
      request: async () => ({
        ok: true,
        json: async () => ({
          data: {
            issue: {
              identifier: 'SPE-3276',
              assignee: { id: 'owner' },
              comments: {
                nodes: [
                  {
                    id: assessed.sourceCommentId,
                    body: JSON.stringify(assessment(assessed)),
                    updatedAt: time,
                    user: { id: 'different' },
                  },
                ],
                pageInfo: { hasNextPage: false },
              },
            },
          },
        }),
      }),
    }),
    /revision or owner mismatch/
  )
})

test('incomplete producer run writes diagnostics without replacing a qualified file', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spe-3758-'))
  const findingsPath = path.join(dir, 'findings.json')
  const outputPath = path.join(dir, 'feed.json')
  const diagnosticsPath = path.join(dir, 'diagnostics.json')
  try {
    await assert.rejects(
      runProducer({
        findingsPath,
        outputPath,
        diagnosticsPath: path.join(dir, '.', 'feed.json'),
      }),
      /three distinct file paths/
    )
    fs.writeFileSync(
      findingsPath,
      JSON.stringify({
        schemaVersion: 1,
        authority: 'SPE-3276',
        findings: [],
      })
    )
    fs.writeFileSync(outputPath, 'previous qualified feed')
    const request = async (_url, opts) => {
      const { query } = JSON.parse(opts.body)
      return {
        ok: true,
        json: async () => ({
          data: {
            project: {
              id: 'project-1',
              issues: { nodes: [row('SPE-1')], pageInfo: { hasNextPage: false } },
            },
          },
        }),
      }
    }
    const result = await runProducer({
      findingsPath,
      outputPath,
      diagnosticsPath,
      apiKey: 'test',
      projectIds,
      request,
      revision: () => sha,
      clock: () => time,
      verifyFindings: async ({ findings }) => findings,
    })
    assert.equal(result.complete, false)
    assert.equal(fs.readFileSync(outputPath, 'utf8'), 'previous qualified feed')
    assert.equal(JSON.parse(fs.readFileSync(diagnosticsPath)).qualifying, false)
    fs.writeFileSync(
      findingsPath,
      JSON.stringify({
        schemaVersion: 1,
        authority: 'SPE-3276',
        findings: [finding('SPE-1')],
      })
    )
    const complete = await runProducer({
      findingsPath,
      outputPath,
      diagnosticsPath,
      apiKey: 'test',
      projectIds,
      request,
      revision: () => sha,
      clock: () => time,
      verifyFindings: async ({ findings }) => findings,
    })
    assert.equal(complete.complete, true)
    const acceptedBytes = fs.readFileSync(outputPath, 'utf8')
    assert.equal(JSON.parse(acceptedBytes).retrieval.issues[0].id, 'SPE-1')
    const stagingNamedInput = outputPath + '.pending'
    const stagingInputBytes = fs.readFileSync(findingsPath, 'utf8')
    fs.writeFileSync(stagingNamedInput, stagingInputBytes)
    const collision = await runProducer({
      findingsPath: stagingNamedInput,
      outputPath,
      diagnosticsPath,
      apiKey: 'test',
      projectIds,
      request,
      revision: () => sha,
      clock: () => time,
      verifyFindings: async ({ findings }) => findings,
    })
    assert.equal(collision.complete, true)
    assert.equal(fs.readFileSync(stagingNamedInput, 'utf8'), stagingInputBytes)
    let revisions = 0
    const changed = await runProducer({
      findingsPath,
      outputPath,
      diagnosticsPath,
      apiKey: 'test',
      projectIds,
      request,
      revision: () => (++revisions === 1 ? sha : 'b'.repeat(40)),
      clock: () => time,
      verifyFindings: async ({ findings }) => findings,
    })
    assert.equal(changed.complete, false)
    assert.equal(fs.readFileSync(outputPath, 'utf8'), acceptedBytes)
    assert.ok(changed.diagnostics.some((item) => item.code === 'github-revision-changed'))
  } finally {
    for (const file of [findingsPath, outputPath, diagnosticsPath, outputPath + '.pending']) {
      if (fs.existsSync(file)) fs.unlinkSync(file)
    }
    fs.rmdirSync(dir)
  }
})
