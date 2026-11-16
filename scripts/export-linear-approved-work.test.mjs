import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import './implementation-evidence-feed.test.mjs'
import {
  exportApprovedWork,
  fetchLinearAuthority,
  normalizeLinearIssues as normalizeWithRevision,
} from './export-linear-approved-work.mjs'
import { linearInventory, produceEvidenceFeed } from './implementation-evidence-feed.mjs'
import { projectApprovedWork } from './project-approved-work.mjs'
const githubRevision = 'a'.repeat(40)
const observedAt = '2026-10-28T01:00:00Z'
const issue = (identifier, extra = {}) => ({
  identifier,
  id: identifier,
  updatedAt: '2026-10-28T01:00:00Z',
  title: identifier,
  priority: 2,
  state: { type: 'started' },
  labels: {
    pageInfo: { hasNextPage: false },
    nodes: [{ id: 'label-cp', name: 'workstream:CP-core' }],
  },
  relations: { pageInfo: { hasNextPage: false }, nodes: [] },
  inverseRelations: { pageInfo: { hasNextPage: false }, nodes: [] },
  ...extra,
})
const coverage = (ids) => ({
  source: 'approved-planning',
  complete: true,
  projectIds: ['project-1'],
  issueIds: ids,
})
const normalizeLinearIssues = (pages, feed, asOf, inventory, projectIds = inventory?.projectIds) =>
  normalizeWithRevision(pages, feed, asOf, inventory, projectIds, githubRevision)
const evidence = (ids, { projects = ['project-1'], projectFor = {}, uuids = {} } = {}) => {
  const pages = projects.map((project) =>
    ids
      .filter((id) => (projectFor[id] ?? 'project-1') === project)
      .map((id) => issue(id, { id: uuids[id] ?? id }))
  )
  const findings = ids.map((id) => ({
    authority: 'SPE-3276',
    verified: true,
    sourceCommentId: 'comment-' + id,
    sourceUpdatedAt: observedAt,
    canonicalIssueId: id,
    linearUuid: uuids[id] ?? id,
    linearUpdatedAt: observedAt,
    githubRevision,
    findingRef: 'https://linear.app/spectranoir/issue/SPE-3276#' + id,
    assessedAt: observedAt,
    materialDrift: 'non-conflict',
    implementationEvidence: { state: 'merged' },
    basis: {
      kind: 'references',
      issueId: id,
      issueRef: 'https://linear.app/spectranoir/issue/' + id,
      refs: [
        {
          url: 'https://github.com/JamesJedi420/containment-protocol/commit/' + githubRevision,
          revision: githubRevision,
          checkedAt: observedAt,
        },
      ],
    },
  }))
  return produceEvidenceFeed({
    projectIds: projects,
    pages,
    verifiedInventory: linearInventory(projects, pages),
    retrievedAt: observedAt,
    revisionVerifiedAt: observedAt,
    githubRevision,
    githubVerifiedAt: observedAt,
    findings,
  })
}
test('paginates all authoritative Linear pages, rejects transport and partial GraphQL errors', async () => {
  let calls = 0
  const request = async (_url, opts) => {
    calls++
    const { query, variables } = JSON.parse(opts.body)
    assert.match(query, /issues\(first:10, after:\$after, includeArchived:true\)/)
    assert.equal(variables.project, 'project-1')
    return {
      ok: true,
      json: async () => ({
        data: {
          project: {
            id: 'project-1',
            issues: {
              pageInfo: {
                hasNextPage: !variables.after,
                endCursor: variables.after ? null : 'next',
              },
              nodes: [issue(variables.after ? 'SPE-2' : 'SPE-1')],
            },
          },
        },
      }),
    }
  }
  const result = await fetchLinearAuthority({
    apiKey: 'test',
    projectIds: ['project-1'],
    request,
    clock: () => '2026-10-28T01:00:00Z',
  })
  assert.equal(calls, 2)
  assert.equal(result.pages[0].length, 2)
  await assert.rejects(
    fetchLinearAuthority({
      apiKey: 'test',
      projectIds: ['project-1'],
      request: async () => ({
        ok: true,
        json: async () => ({ errors: [{ message: 'access denied' }], data: { project: null } }),
      }),
    }),
    /partial/
  )
})
test('missing workstream metadata, evidence coverage, or related identity fails closed', () => {
  const rows = [[issue('SPE-1')]]
  const normalized = normalizeLinearIssues(
    rows,
    evidence(['SPE-1']),
    '2026-10-28T01:00:00Z',
    coverage(['SPE-1'])
  )
  assert.equal(projectApprovedWork(normalized).active[0].statusType, 'started')
  assert.throws(
    () =>
      normalizeLinearIssues(
        [[issue('SPE-1', { labels: { pageInfo: { hasNextPage: false }, nodes: [] } })]],
        evidence(['SPE-1']),
        '2026-10-28T01:00:00Z',
        coverage(['SPE-1'])
      ),
    /metadata/
  )
  assert.throws(
    () =>
      normalizeLinearIssues(
        rows,
        { ...evidence(['SPE-1']), complete: false },
        '2026-10-28T01:00:00Z',
        coverage(['SPE-1'])
      ),
    /classification/
  )
  assert.throws(
    () =>
      normalizeLinearIssues(
        [
          [
            issue('SPE-1', {
              inverseRelations: {
                pageInfo: { hasNextPage: false },
                nodes: [{ type: 'blocks', issue: null }],
              },
            }),
          ],
        ],
        evidence(['SPE-1']),
        '2026-10-28T01:00:00Z',
        coverage(['SPE-1'])
      ),
    /relationship/
  )
})

test('truncated nested relation pages must fail closed', () => {
  const row = issue('SPE-1', { relations: { pageInfo: { hasNextPage: true }, nodes: [] } })
  assert.throws(
    () =>
      normalizeLinearIssues(
        [[row]],
        evidence(['SPE-1']),
        '2026-10-28T01:00:00Z',
        coverage(['SPE-1'])
      ),
    /relation pagination/
  )
})

test('an optional inventory must match the exact fetched issue set', () => {
  assert.throws(
    () => normalizeLinearIssues([[issue('SPE-1')]], evidence(['SPE-1']), '2026-10-28T01:00:00Z'),
    /Linear project coverage/
  )
  assert.throws(
    () =>
      normalizeLinearIssues(
        [[issue('SPE-1')]],
        evidence(['SPE-1']),
        '2026-10-28T01:00:00Z',
        coverage(['SPE-1', 'SPE-2'])
      ),
    /issue coverage/
  )
})

test('Linear presence establishes approval without an approval label or separate approval inventory', () => {
  const rows = [[issue('SPE-1')]]
  const normalized = normalizeLinearIssues(
    rows,
    evidence(['SPE-1']),
    '2026-10-28T01:00:00Z',
    undefined,
    ['project-1']
  )
  assert.equal(normalized.issues[0].approved, true)
  assert.deepEqual(
    projectApprovedWork(normalized).runnable.map((r) => r.id),
    ['SPE-1']
  )
  const labeled = issue('SPE-1', {
    labels: {
      pageInfo: { hasNextPage: false },
      nodes: [{ name: 'approved-work' }, { name: 'workstream:CP-core' }],
    },
  })
  assert.deepEqual(
    normalizeLinearIssues([[labeled]], evidence(['SPE-1']), '2026-10-28T01:00:00Z', undefined, [
      'project-1',
    ]),
    normalized
  )
})

test('approval without historical records preserves lifecycle, blocker and evidence restrictions', () => {
  const rows = [
    [
      issue('SPE-1', { state: { type: 'canceled' } }),
      issue('SPE-2', {
        inverseRelations: {
          pageInfo: { hasNextPage: false },
          nodes: [{ type: 'blocks', issue: { identifier: 'SPE-1' } }],
        },
      }),
    ],
  ]
  const records = evidence(['SPE-1', 'SPE-2'])
  const projection = projectApprovedWork(
    normalizeLinearIssues(rows, records, '2026-10-28T01:00:00Z', undefined, ['project-1'])
  )
  assert.deepEqual(
    projection.history.map((r) => r.id),
    ['SPE-1']
  )
  assert.deepEqual(projection.runnable, [])
  assert.ok(projection.active[0].reasons.includes('dependency-not-completed:SPE-1'))
  records.issues['SPE-2'].evidenceDrift = true
  records.issues['SPE-2'].implementationEvidence.state = 'evidence-conflicted'
  assert.ok(
    projectApprovedWork(
      normalizeLinearIssues(rows, records, '2026-10-28T01:00:00Z', undefined, ['project-1'])
    ).active[0].reasons.includes('evidence-conflicted')
  )
})

test('omitting an approval inventory does not waive project identity or exact evidence coverage', () => {
  const rows = [[issue('SPE-1')]]
  for (const ids of [[], ['project-1', 'project-1'], ['project-1', 'project-2'], ['']])
    assert.throws(
      () =>
        normalizeLinearIssues(rows, evidence(['SPE-1']), '2026-10-28T01:00:00Z', undefined, ids),
      /project coverage/
    )
  assert.throws(
    () =>
      normalizeLinearIssues(rows, evidence(['SPE-1', 'SPE-2']), '2026-10-28T01:00:00Z', undefined, [
        'project-1',
      ]),
    /incomplete coverage/
  )
})

test('export writes only after full validation and preserves prior output on failure', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'linear-approval-export-'))
  const output = path.join(dir, 'projection.json')
  const good = {
    data: {
      project: {
        id: 'project-1',
        issues: { pageInfo: { hasNextPage: false }, nodes: [issue('SPE-1')] },
      },
    },
  }
  let response = good
  let sourceError = false
  let staleInventory = false
  let changedMain = false
  let revisionReads = 0
  const request = async () => ({
    ok: response.__ok !== false,
    status: response.__status ?? 200,
    json: async () => response,
  })
  const run = (feed) =>
    exportApprovedWork({
      evidence: feed,
      outputPath: output,
      apiKey: 'test',
      projectIds: ['project-1'],
      request,
      clock: () => observedAt,
      revision: () => (changedMain && ++revisionReads === 2 ? 'b'.repeat(40) : githubRevision),
      verifySource: async () => {
        if (sourceError) throw new Error('SPE-3276 source changed')
      },
      verifyRevision: async () =>
        linearInventory(
          ['project-1'],
          [[issue('SPE-1', staleInventory ? { updatedAt: '2026-10-27T01:00:00Z' } : {})]]
        ),
    })
  try {
    const projection = await run(evidence(['SPE-1']))
    assert.deepEqual(
      projection.runnable.map((r) => r.id),
      ['SPE-1']
    )
    sourceError = true
    await assert.rejects(run(evidence(['SPE-1'])), /source changed/)
    sourceError = false
    staleInventory = true
    await assert.rejects(run(evidence(['SPE-1'])), /Linear issue revisions changed/)
    staleInventory = false
    changedMain = true
    revisionReads = 0
    await assert.rejects(run(evidence(['SPE-1'])), /GitHub main changed/)
    changedMain = false
    for (const failure of [
      { __ok: false, __status: 400 },
      { errors: [{ message: 'partial' }], data: good.data },
      {
        data: {
          project: { id: 'project-1', issues: { pageInfo: { hasNextPage: true }, nodes: [] } },
        },
      },
      {
        data: {
          project: {
            id: 'project-1',
            issues: {
              pageInfo: { hasNextPage: false },
              nodes: [issue('SPE-1', { labels: { pageInfo: { hasNextPage: false }, nodes: [] } })],
            },
          },
        },
      },
    ]) {
      response = failure
      fs.writeFileSync(output, 'previous projection')
      await assert.rejects(run(evidence(['SPE-1'])))
      assert.equal(fs.readFileSync(output, 'utf8'), 'previous projection')
    }
  } finally {
    if (fs.existsSync(output)) fs.unlinkSync(output)
    fs.rmdirSync(dir)
  }
})

test('incoming blocks prevents runnable output; outgoing blocks does not block its owner', () => {
  const a = issue('SPE-1', {
    inverseRelations: {
      pageInfo: { hasNextPage: false },
      nodes: [{ type: 'blocks', issue: { identifier: 'SPE-2' } }],
    },
  })
  const b = issue('SPE-2', {
    relations: {
      pageInfo: { hasNextPage: false },
      nodes: [{ type: 'blocks', relatedIssue: { identifier: 'SPE-1' } }],
    },
  })
  const projection = projectApprovedWork(
    normalizeLinearIssues(
      [[a, b]],
      evidence(['SPE-1', 'SPE-2']),
      '2026-10-28T01:00:00Z',
      coverage(['SPE-1', 'SPE-2'])
    )
  )
  assert.deepEqual(projection.active.find((x) => x.id === 'SPE-1').blockedBy, ['SPE-2'])
  assert.ok(
    projection.active
      .find((x) => x.id === 'SPE-1')
      .reasons.includes('dependency-not-completed:SPE-2')
  )
  assert.equal(projection.active.find((x) => x.id === 'SPE-2').readiness, 'runnable')
})
test('missing or truncated incoming connections fail closed', () => {
  const base = issue('SPE-1')
  const missing = { ...base }
  delete missing.inverseRelations
  assert.throws(
    () =>
      normalizeLinearIssues(
        [[missing]],
        evidence(['SPE-1']),
        '2026-10-28T01:00:00Z',
        coverage(['SPE-1'])
      ),
    /pagination/
  )
  const truncated = issue('SPE-1', {
    inverseRelations: { pageInfo: { hasNextPage: true }, nodes: [] },
  })
  assert.throws(
    () =>
      normalizeLinearIssues(
        [[truncated]],
        evidence(['SPE-1']),
        '2026-10-28T01:00:00Z',
        coverage(['SPE-1'])
      ),
    /pagination/
  )
})

test('malformed and empty SPE-3276 evidence fail at attestation boundary', () => {
  for (const issues of ['complete', {}, []]) {
    assert.throws(
      () =>
        normalizeLinearIssues(
          [[issue('SPE-1')]],
          { source: 'SPE-3276', complete: true, issues },
          '2026-10-28T01:00:00Z',
          coverage(['SPE-1'])
        ),
      /classification coverage not attested/
    )
  }
})
test('project ID mismatch fails for direct normalization callers', () => {
  assert.throws(
    () =>
      normalizeLinearIssues(
        [[issue('SPE-1')]],
        evidence(['SPE-1']),
        '2026-10-28T01:00:00Z',
        coverage(['SPE-1']),
        ['different-project']
      ),
    /project IDs differ/
  )
})

test('missing or malformed pagination completion fails closed', async () => {
  for (const pageInfo of [
    {},
    { hasNextPage: null },
    { hasNextPage: 0 },
    { hasNextPage: 'false' },
  ]) {
    const request = async () => ({
      ok: true,
      json: async () => ({
        data: { project: { id: 'project-1', issues: { pageInfo, nodes: [issue('SPE-1')] } } },
      }),
    })
    await assert.rejects(
      fetchLinearAuthority({ apiKey: 'test', projectIds: ['project-1'], request }),
      /incomplete pagination/
    )
  }
})

test('archived completed prerequisites remain in the authoritative inventory', async () => {
  const active = issue('SPE-1', {
    inverseRelations: {
      pageInfo: { hasNextPage: false },
      nodes: [{ id: 'block-2-1', type: 'blocks', issue: { identifier: 'SPE-2' } }],
    },
  })
  const archived = issue('SPE-2', {
    state: { type: 'completed' },
    archivedAt: '2026-10-01T00:00:00Z',
  })
  const request = async (_url, opts) => {
    const { query } = JSON.parse(opts.body)
    const includeArchived = /includeArchived:\s*true/.test(query)
    assert.match(query, /labels\(first:100\)\s*\{pageInfo\s*\{hasNextPage endCursor\}/)
    return {
      ok: true,
      json: async () => ({
        data: {
          project: {
            id: 'project-1',
            issues: {
              pageInfo: { hasNextPage: false },
              nodes: includeArchived ? [active, archived] : [active],
            },
          },
        },
      }),
    }
  }
  const { pages, asOf } = await fetchLinearAuthority({
    apiKey: 'test',
    projectIds: ['project-1'],
    request,
    clock: () => '2026-10-28T01:00:00Z',
  })
  const projection = projectApprovedWork(
    normalizeLinearIssues(pages, evidence(['SPE-1', 'SPE-2']), asOf, coverage(['SPE-1', 'SPE-2']))
  )
  assert.deepEqual(
    projection.runnable.map((row) => row.id),
    ['SPE-1']
  )
  assert.deepEqual(
    projection.history.map((row) => row.id),
    ['SPE-2']
  )
})

test('missing or incomplete label pages cannot certify workstream ownership', () => {
  const base = issue('SPE-1')
  for (const pageInfo of [undefined, {}, { hasNextPage: true }, { hasNextPage: 'false' }]) {
    const row = { ...base, labels: { nodes: base.labels.nodes, pageInfo } }
    assert.throws(
      () =>
        normalizeLinearIssues(
          [[row]],
          evidence(['SPE-1']),
          '2026-10-28T01:00:00Z',
          coverage(['SPE-1'])
        ),
      /incomplete label pagination/
    )
  }
  const ambiguous = {
    ...base,
    labels: {
      pageInfo: { hasNextPage: false },
      nodes: [...base.labels.nodes, { name: 'workstream:Academy' }],
    },
  }
  assert.throws(
    () =>
      normalizeLinearIssues(
        [[ambiguous]],
        evidence(['SPE-1']),
        '2026-10-28T01:00:00Z',
        coverage(['SPE-1'])
      ),
    /metadata/
  )
})
const connection = (nodes, endCursor = null) => ({
  nodes,
  pageInfo: { hasNextPage: endCursor !== null, endCursor },
})
const result = (data) => ({ ok: true, json: async () => ({ data }) })
const transport = (request, projectIds = ['project-1']) =>
  fetchLinearAuthority({ apiKey: 'test', projectIds, request, clock: () => '2026-10-28T01:00:00Z' })

test('exhausts labels and both relationship directions across project pages', async () => {
  const first = issue('SPE-1', {
    id: 'uuid-1',
    labels: connection(
      Array.from({ length: 100 }, (_, i) => ({ id: 'label-' + i, name: 'tag:' + i })),
      'labels-next'
    ),
    relations: connection(
      Array.from({ length: 100 }, (_, i) => ({
        id: 'out-' + i,
        type: 'related',
        relatedIssue: { identifier: 'SPE-2' },
      })),
      'out-next'
    ),
    inverseRelations: connection(
      Array.from({ length: 100 }, (_, i) => ({
        id: 'in-' + i,
        type: 'related',
        issue: { identifier: 'SPE-2' },
      })),
      'in-next'
    ),
  })
  const original = structuredClone(first),
    calls = []
  const request = async (_url, opts) => {
    const { query, variables } = JSON.parse(opts.body)
    calls.push({ query, variables })
    if (variables.project) {
      assert.match(query, /issues\(first:10,/)
      if (variables.project === 'academy')
        return result({
          project: {
            id: 'academy',
            issues: connection([
              issue('SPE-3', { state: { type: 'completed' }, archivedAt: '2026-10-01T00:00:00Z' }),
            ]),
          },
        })
      return result({
        project: {
          id: 'project-1',
          issues: variables.after
            ? connection([issue('SPE-2')])
            : connection([first], 'project-next'),
        },
      })
    }
    assert.equal(variables.id, 'uuid-1')
    const header = { id: first.id, identifier: first.identifier, updatedAt: first.updatedAt }
    if (query.includes('query IssueLabels')) {
      assert.equal(variables.after, 'labels-next')
      return result({
        issue: {
          ...header,
          labels: connection([{ id: 'label-owner', name: 'workstream:CP-core' }]),
        },
      })
    }
    if (query.includes('query IssueRelations')) {
      assert.equal(variables.after, 'out-next')
      return result({
        issue: {
          ...header,
          relations: connection([
            { id: 'out-block', type: 'blocks', relatedIssue: { identifier: 'SPE-2' } },
          ]),
        },
      })
    }
    assert.match(query, /query IssueInverseRelations/)
    assert.equal(variables.after, 'in-next')
    return result({
      issue: {
        ...header,
        inverseRelations: connection([
          { id: 'in-block', type: 'blocks', issue: { identifier: 'SPE-2' } },
        ]),
      },
    })
  }
  const { pages, asOf } = await transport(request, ['project-1', 'academy'])
  assert.deepEqual(first, original)
  assert.equal(calls.length, 6)
  for (const field of ['labels', 'relations', 'inverseRelations']) {
    assert.equal(pages[0][0][field].nodes.length, 101)
    assert.equal(pages[0][0][field].pageInfo.hasNextPage, false)
  }
  const projection = projectApprovedWork(
    normalizeLinearIssues(
      pages,
      evidence(['SPE-1', 'SPE-2', 'SPE-3'], {
        projects: ['project-1', 'academy'],
        projectFor: { 'SPE-3': 'academy' },
        uuids: { 'SPE-1': 'uuid-1' },
      }),
      asOf,
      undefined,
      ['project-1', 'academy']
    )
  )
  assert.deepEqual(projection.active.find((r) => r.id === 'SPE-1').blockedBy, ['SPE-2'])
  assert.deepEqual(
    projection.runnable.map((r) => r.id),
    ['SPE-2']
  )
  assert.deepEqual(
    projection.history.map((r) => r.id),
    ['SPE-3']
  )
})

test('workstream ambiguity on a later label page fails normalization', async () => {
  const first = issue('SPE-1', {
    labels: connection([{ id: 'cp', name: 'workstream:CP-core' }], 'next'),
  })
  const { pages, asOf } = await transport(async (_url, opts) => {
    const { variables } = JSON.parse(opts.body)
    return variables.project
      ? result({ project: { id: 'project-1', issues: connection([first]) } })
      : result({
          issue: { ...first, labels: connection([{ id: 'academy', name: 'workstream:Academy' }]) },
        })
  })
  assert.throws(
    () => normalizeLinearIssues(pages, evidence(['SPE-1']), asOf, undefined, ['project-1']),
    /missing explicit workstream metadata/
  )
})

test('nested pagination rejects missing or repeated cursors, overlaps and missing identities', async () => {
  for (const field of ['labels', 'relations', 'inverseRelations']) {
    const node = { id: 'node-1' }
    for (const [badPage, expected] of [
      [{ nodes: [], pageInfo: { hasNextPage: true } }, /missing pagination cursor/],
      [connection([{ id: 'node-2' }], 'next'), /cyclic pagination/],
      [connection([node]), /overlapping pagination/],
      [connection([{}]), /missing node identity/],
      [{ nodes: [], pageInfo: { hasNextPage: 'false' } }, /incomplete pagination/],
      [{ nodes: null, pageInfo: { hasNextPage: false } }, /incomplete pagination/],
    ]) {
      let calls = 0
      const first = issue('SPE-1', { [field]: connection([node], 'next') })
      await assert.rejects(
        transport(async (_url, opts) => {
          const { variables } = JSON.parse(opts.body)
          if (variables.project)
            return result({ project: { id: 'project-1', issues: connection([first]) } })
          calls++
          return result({ issue: { ...first, [field]: badPage } })
        }),
        expected
      )
      assert.equal(calls, 1)
    }
  }
})

test('nested continuation rejects changed UUID, identifier or revision', async () => {
  for (const change of [
    { id: 'wrong-uuid' },
    { identifier: 'SPE-2' },
    { updatedAt: '2026-10-28T02:00:00Z' },
  ]) {
    const first = issue('SPE-1', { relations: connection([{ id: 'first' }], 'next') })
    await assert.rejects(
      transport(async (_url, opts) => {
        const { variables } = JSON.parse(opts.body)
        return variables.project
          ? result({ project: { id: 'project-1', issues: connection([first]) } })
          : result({ issue: { ...first, ...change, relations: connection([{ id: 'second' }]) } })
      }),
      /identity mismatch|changed during pagination/
    )
  }
})

test('nested continuation rejects HTTP failures, partial results and missing issue', async () => {
  for (const failure of [
    { ok: false, status: 429 },
    { ok: true, json: async () => ({ errors: [{ message: 'partial' }], data: { issue: {} } }) },
    result({ issue: null }),
  ]) {
    const first = issue('SPE-1', { labels: connection([], 'next') })
    await assert.rejects(
      transport(async (_url, opts) => {
        const { variables } = JSON.parse(opts.body)
        return variables.project
          ? result({ project: { id: 'project-1', issues: connection([first]) } })
          : failure
      }),
      /HTTP 429|partial result|incomplete issue/
    )
  }
})

test('initial issue and connection identity/revision/pagination must be valid', async () => {
  for (const extra of [
    { id: null },
    { identifier: 'bad' },
    { updatedAt: null },
    { updatedAt: 'invalid' },
    { labels: connection([{}]) },
    { relations: connection([{ id: 'repeat' }, { id: 'repeat' }]) },
    { inverseRelations: { nodes: [], pageInfo: { hasNextPage: true, endCursor: '' } } },
  ]) {
    await assert.rejects(
      transport(async () =>
        result({ project: { id: 'project-1', issues: connection([issue('SPE-1', extra)]) } })
      ),
      /identity|revision|overlapping|cursor/
    )
  }
})

test('project traversal rejects repeated cursors and overlapping issues', async () => {
  for (const overlap of [false, true]) {
    await assert.rejects(
      transport(async (_url, opts) => {
        const { variables } = JSON.parse(opts.body)
        return result({
          project: {
            id: 'project-1',
            issues: variables.after
              ? connection([issue(overlap ? 'SPE-1' : 'SPE-2')], 'next')
              : connection([issue('SPE-1')], 'next'),
          },
        })
      }),
      overlap ? /overlapping issue pagination/ : /cyclic pagination/
    )
  }
})

test('empty completed project pages and incomplete project identity fail safely', async () => {
  const empty = await transport(async () =>
    result({ project: { id: 'project-1', issues: connection([]) } })
  )
  assert.deepEqual(empty.pages, [[]])
  for (const project of [
    null,
    { id: 'wrong', issues: connection([]) },
    { id: 'project-1', issues: { nodes: [], pageInfo: { hasNextPage: null } } },
  ]) {
    await assert.rejects(
      transport(async () => result({ project })),
      /project identity mismatch|incomplete pagination/
    )
  }
})
