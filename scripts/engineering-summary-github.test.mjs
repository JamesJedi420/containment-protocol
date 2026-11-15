import assert from 'node:assert/strict'
import test from 'node:test'
import { adaptGitHubMergedPrCapture as adapt } from './engineering-summary-github.mjs'
import {
  summarizeEngineeringActivity as summarize,
  serializeEngineeringSummary as serialize,
  renderEngineeringSummary as render,
} from './engineering-summary.mjs'

// Constructed REST-shaped captures and classifications, never live authority.
const REPOSITORY = 'JamesJedi420/containment-protocol'
const REPO_ID = 1200651972
const SHA = 'a'.repeat(40)
const START = '2026-11-14T00:00:00.000Z'
const END = '2026-11-15T00:00:00.000Z'
const CHECKED = '2026-11-15T01:00:00.000Z'
const FINISHED = '2026-11-15T01:02:00.000Z'
const ANCHOR = `https://github.com/${REPOSITORY}/commit/${SHA}`
const url = (page = 1, numeric = false) =>
  `https://api.github.com/${numeric ? `repositories/${REPO_ID}` : `repos/${REPOSITORY}`}/pulls?state=closed&base=main&sort=created&direction=asc&per_page=2&page=${page}`
function pr(number = 1, changes = {}) {
  return {
    id: 1000 + number,
    number,
    state: 'closed',
    html_url: `https://github.com/${REPOSITORY}/pull/${number}`,
    merged_at: '2026-11-14T12:00:00Z',
    updated_at: '2026-11-14T12:01:00Z',
    base: { ref: 'main', repo: { id: REPO_ID, full_name: REPOSITORY } },
    ...changes,
  }
}
function page(number = 1, data = [pr(1)], next = null) {
  return {
    requestUrl: url(number),
    observedAt: '2026-11-15T01:01:00Z',
    status: 200,
    link: next === null ? null : `<${url(next)}>; rel="next"`,
    data,
  }
}
function input() {
  return {
    schemaVersion: 1,
    repository: { id: REPO_ID, fullName: REPOSITORY },
    linearWorkspace: 'spectranoir',
    apiVersion: '2026-03-10',
    scope: { baseRef: 'main', sort: 'created', direction: 'asc', perPage: 2 },
    window: { start: START, end: END },
    bounds: { maxPages: 5, maxRecords: 10 },
    sourceRef: ANCHOR,
    capture: { startedAt: CHECKED, finishedAt: FINISHED, pages: [page()], error: null },
    workstreamEvidence: {
      revision: SHA,
      checkedAt: END,
      assignments: [
        {
          pullRequestId: 1001,
          number: 1,
          workstream: 'CP-core',
          sourceRef: 'https://linear.app/spectranoir/issue/SPE-3512',
        },
      ],
    },
    lastSuccess: null,
  }
}
function envelope(source, changes = {}) {
  const names = ['github', 'linear', 'handoff', 'validation', 'drift', 'queue', 'recommendations']
  return {
    schemaVersion: 1,
    repository: REPOSITORY,
    linearWorkspace: 'spectranoir',
    workstream: 'CP-core',
    window: { start: START, end: END },
    evaluatedAt: FINISHED,
    policy: {
      maxAgeSeconds: Object.fromEntries(names.map((name) => [name, 300])),
      expectedRevisions: Object.fromEntries(names.map((name) => [name, null])),
      futureToleranceSeconds: 0,
      maxRecordsPerSource: 10,
    },
    sources: { github: source },
    ...changes,
  }
}
function expectInvalid(change) {
  const value = input()
  change(value)
  assert.throws(() => adapt(value), /^Error: engineering-summary-github: invalid [A-Za-z /-]+$/)
}

test('REST-shaped merged facts integrate with both renderers but never qualify GitHub coverage', () => {
  const { source, provenance } = adapt(input())
  assert.equal(source.status, 'partial')
  assert.deepEqual(source.currentError, { code: 'incomplete-coverage' })
  assert.equal(source.records[0].id, 'PR-1')
  assert.equal(source.records[0].at, '2026-11-14T12:00:00.000Z')
  assert.equal(source.records[0].workstream, 'CP-core')
  assert.match(source.revision, /^[a-f0-9]{64}$/)
  assert.equal(source.revision, provenance.revision)
  assert.equal(source.records[0].revision, source.revision)
  assert.equal(provenance.capture.pages[0].records[0].id, 1001)
  assert.equal(provenance.mergedPrPaginationComplete, true)
  assert.equal(provenance.atomicSnapshot, false)
  assert.equal(provenance.ciCollected, false)
  assert.deepEqual(source.coverage, {
    complete: false,
    paginationComplete: false,
    window: { start: START, end: END },
    workstreams: [],
  })
  const report = envelope(source)
  assert.equal(report.policy.expectedRevisions.github, null)
  const github = summarize(report).sources.github
  assert.equal(github.count, null)
  assert.equal(github.observedCount, 1)
  assert.ok(github.reasons.includes('unverified-revision'))
  assert.equal(JSON.parse(serialize(report)).sources.github.count, null)
  assert.match(render(report), /PR-1/)
})

test('successful empty and closed-but-unmerged captures stay partial, never successful zero', () => {
  for (const rows of [[], [pr(1, { merged_at: null })]]) {
    const value = input()
    value.capture.pages[0].data = rows
    value.workstreamEvidence.assignments = []
    const result = adapt(value)
    assert.deepEqual(result.source.records, [])
    const github = summarize(envelope(result.source)).sources.github
    assert.equal(github.status, 'partial')
    assert.equal(github.count, null)
    assert.equal(github.observedCount, 0)
    assert.equal(result.source.currentError.code, 'incomplete-coverage')
  }
})

test('merge time uses inclusive start and exclusive end; created/updated times do not decide membership', () => {
  const value = input()
  value.scope.perPage = 100
  const records = [
    pr(1, { merged_at: START }),
    pr(2, { merged_at: END, updated_at: END }),
    pr(3, { merged_at: '2026-11-13T23:59:59.999Z' }),
  ]
  value.capture.pages = [
    { ...page(1, records), requestUrl: url().replace('per_page=2', 'per_page=100') },
  ]
  assert.deepEqual(
    adapt(value).source.records.map((row) => row.id),
    ['PR-1']
  )
})

test('old merged_at on an earlier page does not stop later-page event processing', () => {
  const value = input()
  value.capture.pages = [
    page(1, [pr(2, { merged_at: '2020-01-01T00:00:00Z' })], 2),
    page(2, [pr(1)]),
  ]
  assert.deepEqual(
    adapt(value).source.records.map((row) => row.id),
    ['PR-1']
  )
})

test('page and row input order is immaterial; numeric repository links and ordinary Link relations work', () => {
  const value = input()
  value.capture.pages = [page(1, [pr(2), pr(1)], 2), page(2, [pr(3)])]
  value.capture.pages[1].link = `<${url(1, true)}>; rel="prev", <${url(1)}>; rel="first"`
  const expected = adapt(value)
  value.capture.pages.reverse()
  value.capture.pages[1].data.reverse()
  assert.deepEqual(adapt(value), expected)
})

test('incomplete supplied suffix remains incomplete, including when next page exceeds the capture bound', () => {
  const value = input()
  value.capture.pages[0].link = `<${url(2)}>; rel="next", <${url(900)}>; rel="last"`
  value.bounds.maxPages = 1
  const result = adapt(value)
  assert.equal(result.provenance.mergedPrPaginationComplete, false)
  assert.equal(result.source.currentError.code, 'incomplete-coverage')
  assert.equal(summarize(envelope(result.source)).sources.github.count, null)
})

test('failed acquisition preserves true last success and exposes unknown counts, including with supplied earlier pages', () => {
  for (const code of [
    'http-401',
    'http-403',
    'http-429',
    'http-error',
    'timeout',
    'network',
    'partial-response',
  ]) {
    const value = input()
    value.capture.error = { code }
    value.lastSuccess = { checkedAt: END, revision: SHA, sourceRef: ANCHOR }
    const result = adapt(value)
    assert.equal(result.source.status, 'unavailable')
    assert.equal(result.source.revision, null)
    assert.equal(result.source.records, null)
    assert.deepEqual(result.source.lastSuccess, value.lastSuccess)
    assert.deepEqual(result.source.currentError, { code })
    const github = summarize(envelope(result.source)).sources.github
    assert.equal(github.count, null)
    assert.equal(github.observedCount, null)
  }
})

test('unattempted acquisition is unavailable and never an empty success', () => {
  const value = input()
  value.capture.pages = []
  const result = adapt(value)
  assert.equal(result.source.status, 'unavailable')
  assert.equal(result.source.currentError.code, 'not-collected')
  assert.equal(result.provenance.mergedPrPaginationComplete, false)
  assert.equal(summarize(envelope(result.source)).sources.github.count, null)
})

test('failed acquisition needs no invented matching PRs for previously supplied workstream metadata', () => {
  const value = input()
  value.capture.pages = []
  value.capture.error = { code: 'http-403' }
  const result = adapt(value)
  assert.equal(result.source.status, 'unavailable')
  assert.equal(result.source.currentError.code, 'http-403')
  assert.equal(result.provenance.mergedPrPaginationComplete, false)
})

test('missing or other workstream metadata never implies CP or combines priorities', () => {
  const value = input()
  value.workstreamEvidence = { checkedAt: END, revision: null, assignments: [] }
  const result = adapt(value)
  assert.equal(result.source.records[0].workstream, null)
  const github = summarize(envelope(result.source)).sources.github
  assert.deepEqual(github.observations, [])
  assert.ok(github.reasons.includes('unknown-workstream'))
  value.workstreamEvidence = input().workstreamEvidence
  value.workstreamEvidence.assignments[0].workstream = 'Academy'
  assert.deepEqual(summarize(envelope(adapt(value).source)).sources.github.observations, [])
})

test('independent expected-revision pin and evaluation policy detect conflicts and staleness', () => {
  const { source } = adapt(input())
  const report = envelope(source)
  report.policy.expectedRevisions.github = 'b'.repeat(40)
  assert.equal(summarize(report).sources.github.status, 'conflicted')
  report.policy.expectedRevisions.github = source.revision
  report.evaluatedAt = '2026-11-16T01:00:00Z'
  assert.equal(summarize(report).sources.github.status, 'stale')
  assert.equal(source.checkedAt, CHECKED)
})

test('revision changes with relevant capture facts and mapping provenance, not arbitrary provider text', () => {
  const value = input(),
    expected = adapt(value)
  value.capture.pages[0].data[0].title = 'untrusted text'
  value.capture.pages[0].data[0].body = 'untrusted body'
  assert.equal(adapt(value).provenance.revision, expected.provenance.revision)
  value.capture.pages[0].data[0].updated_at = '2026-11-14T12:02:00Z'
  assert.notEqual(adapt(value).provenance.revision, expected.provenance.revision)
  value.capture.pages[0].data[0].updated_at = '2026-11-14T12:01:00Z'
  value.workstreamEvidence.revision = 'b'.repeat(40)
  assert.notEqual(adapt(value).provenance.revision, expected.provenance.revision)
})

test('missing merge SHA is supported in both declared API versions', () => {
  for (const apiVersion of ['2022-11-28', '2026-03-10']) {
    const value = input()
    value.apiVersion = apiVersion
    assert.equal(adapt(value).provenance.apiVersion, apiVersion)
    assert.equal(adapt(value).source.records.length, 1)
  }
})

test('duplicate/conflicting provider IDs and PR numbers fail closed even outside the reporting window', () => {
  for (const other of [
    pr(1),
    pr(2, { id: 1001 }),
    pr(1, { id: 2000 }),
    pr(1, { merged_at: '2020-01-01T00:00:00Z' }),
  ])
    expectInvalid((value) => {
      value.capture.pages[0].data.push(other)
    })
})

test('rejects missing/repeated/cyclic page chains and inconsistent request/Link scope', () => {
  const changes = [
    (value) => {
      value.capture.pages = [page(2)]
    },
    (value) => {
      value.capture.pages = [page(1, [], 2), page(1, [])]
    },
    (value) => {
      value.capture.pages[0].link = `<${url(1)}>; rel="next"`
    },
    (value) => {
      value.capture.pages = [page(1, []), page(2, [])]
    },
    (value) => {
      value.capture.pages[0].link = `<${url(3)}>; rel="next"`
    },
    (value) => {
      value.capture.pages[0].link = `<${url(2)}>; rel="next", <${url(2)}>; rel="next"`
    },
    (value) => {
      value.capture.pages[0].link = `<${url(3)}>; rel="last"`
    },
    (value) => {
      value.capture.pages = [page(1, [], 2), page(2, [])]
      value.capture.pages[0].link += `, <${url(3)}>; rel="last"`
    },
    (value) => {
      value.capture.pages = [page(1, [], 2), page(2, [], 3)]
      value.capture.pages[0].link += `, <${url(3)}>; rel="last"`
      value.capture.pages[1].link += `, <${url(4)}>; rel="last"`
    },
    (value) => {
      value.capture.pages[0].requestUrl = url().replace('closed', 'all')
    },
    (value) => {
      value.capture.pages[0].requestUrl = url().replace('base=main', 'base=other')
    },
    (value) => {
      value.capture.pages[0].link = `<${url(2).replace(REPOSITORY, 'foreign/repo')}>; rel="next"`
    },
    (value) => {
      value.capture.pages[0].requestUrl += '&page=1'
    },
    (value) => {
      value.capture.pages[0].requestUrl += '&token=secret-canary'
    },
  ]
  for (const change of changes) expectInvalid(change)
})

test('rejects wrong repository/base/URL identity and invalid provider state or revision times', () => {
  const changes = [
    (row) => {
      row.base.repo.id++
    },
    (row) => {
      row.base.repo.full_name = 'foreign/repo'
    },
    (row) => {
      row.base.ref = 'other'
    },
    (row) => {
      row.html_url += '?token=secret-canary'
    },
    (row) => {
      row.html_url = `https://github.com/${REPOSITORY}/pull/2`
    },
    (row) => {
      row.state = 'open'
    },
    (row) => {
      row.merged = false
    },
    (row) => {
      delete row.merged_at
    },
    (row) => {
      row.id = '1001'
    },
    (row) => {
      row.updated_at = '2026-11-14T11:00:00Z'
    },
    (row) => {
      row.updated_at = '2026-11-16T01:00:00Z'
    },
  ]
  for (const change of changes) expectInvalid((value) => change(value.capture.pages[0].data[0]))
})

test('rejects invalid or conflicting assignment identity and unverified claims', () => {
  for (const change of [
    (value) => {
      value.workstreamEvidence.revision = null
    },
    (value) => {
      value.workstreamEvidence.assignments[0].pullRequestId++
    },
    (value) => {
      value.workstreamEvidence.assignments[0].number++
    },
    (value) => {
      value.workstreamEvidence.assignments[0].workstream = 'all'
    },
    (value) => {
      value.workstreamEvidence.assignments.push({ ...value.workstreamEvidence.assignments[0] })
    },
    (value) => {
      value.workstreamEvidence.checkedAt = FINISHED
    },
  ])
    expectInvalid(change)
})

test('rejects impossible capture/window/last-success times, bad structures and bounds without echoing values', () => {
  for (const change of [
    (value) => {
      value.window.start = value.window.end
    },
    (value) => {
      value.window.end = FINISHED
    },
    (value) => {
      value.capture.startedAt = '2026-02-30T01:00:00Z'
    },
    (value) => {
      value.capture.finishedAt = END
    },
    (value) => {
      value.capture.pages[0].observedAt = END
    },
    (value) => {
      value.capture.pages[0].status = 403
    },
    (value) => {
      value.capture.pages[0].data = null
    },
    (value) => {
      value.capture.error = { code: 'secret-canary' }
    },
    (value) => {
      value.lastSuccess = { checkedAt: FINISHED, revision: SHA, sourceRef: ANCHOR }
    },
    (value) => {
      value.bounds.maxRecords = 0
    },
    (value) => {
      value.bounds.maxRecords = 100001
    },
    (value) => {
      value.bounds.maxPages = 0
    },
    (value) => {
      value.capture.pages.push(page(2, []))
      value.bounds.maxPages = 1
    },
    (value) => {
      value.capture.pages[0].data.push(pr(2), pr(3))
    },
    (value) => {
      value.sourceRef = 'https://secret-canary@example.com/private'
    },
    (value) => {
      value.unexpected = 'secret-canary'
    },
  ])
    expectInvalid(change)
})

test('minimized output and errors exclude provider bodies, raw errors, request URLs and credentials', () => {
  const value = input()
  Object.assign(value.capture.pages[0].data[0], {
    title: 'secret-canary',
    body: 'secret-canary',
    head: { token: 'secret-canary' },
  })
  const output = JSON.stringify(adapt(value))
  assert.ok(!output.includes('secret-canary'))
  for (const capturedPage of adapt(value).provenance.capture.pages)
    assert.deepEqual(Object.keys(capturedPage).sort(), [
      'lastPage',
      'nextPage',
      'number',
      'observedAt',
      'records',
    ])
  value.capture.error = { code: 'http-403', body: 'secret-canary' }
  assert.throws(
    () => adapt(value),
    (error) => !error.message.includes('secret-canary')
  )
})

test('record bounds count all pages before filtering, including unmerged and old records', () => {
  expectInvalid((value) => {
    value.bounds.maxRecords = 2
    value.capture.pages = [
      page(1, [pr(1), pr(2, { merged_at: null })], 2),
      page(2, [pr(3, { merged_at: '2020-01-01T00:00:00Z' })]),
    ]
  })
  const value = input()
  value.bounds.maxRecords = 0
  value.capture.pages = [page(1, [])]
  value.workstreamEvidence.assignments = []
  assert.deepEqual(adapt(value).source.records, [])
})

test('frozen captures remain unchanged; repeated normalization is deterministic', () => {
  const value = input(),
    before = JSON.stringify(value)
  const freeze = (object) => {
    if (object !== null && typeof object === 'object') {
      Object.values(object).forEach(freeze)
      Object.freeze(object)
    }
  }
  freeze(value)
  const result = adapt(value)
  assert.deepEqual(adapt(value), result)
  assert.equal(JSON.stringify(value), before)
})
