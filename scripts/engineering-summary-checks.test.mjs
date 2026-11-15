import assert from 'node:assert/strict'
import test from 'node:test'
import { adaptGitHubCheckRunCapture as adapt } from './engineering-summary-checks.mjs'
import { adaptGitHubMergedPrCapture as adaptPr } from './engineering-summary-github.mjs'
import {
  summarizeEngineeringActivity as summarize,
  serializeEngineeringSummary as serialize,
  renderEngineeringSummary as render,
} from './engineering-summary.mjs'

// Constructed REST-shaped captures; no live authority, connectivity or classifications.
const REPO = 'JamesJedi420/containment-protocol',
  REPO_ID = 1200651972
const HEAD = 'a'.repeat(40),
  SHA = 'b'.repeat(40)
const START = '2026-11-14T00:00:00.000Z',
  END = '2026-11-15T00:00:00.000Z'
const CHECKED = '2026-11-15T01:00:00.000Z',
  OBSERVED = '2026-11-15T01:01:00.000Z',
  FINISHED = '2026-11-15T01:02:00.000Z'
const REF = `https://github.com/${REPO}/commit/${HEAD}`
const url = (page = 1, numeric = false) =>
  `https://api.github.com/${numeric ? `repositories/${REPO_ID}` : `repos/${REPO}`}/commits/${HEAD}/check-runs?filter=latest&per_page=2&page=${page}`
function check(id = 1, changes = {}) {
  return {
    id,
    head_sha: HEAD,
    url: `https://api.github.com/repos/${REPO}/check-runs/${id}`,
    status: 'completed',
    conclusion: 'failure',
    started_at: '2026-11-14T12:00:00Z',
    completed_at: '2026-11-14T12:01:00Z',
    check_suite: { id: 100 },
    app: { id: 200 },
    ...changes,
  }
}
function page(number = 1, records = [check()], total = records.length, next = null) {
  return {
    requestUrl: url(number),
    observedAt: OBSERVED,
    status: 200,
    link: next === null ? null : `<${url(next)}>; rel="next"`,
    data: { total_count: total, check_runs: records },
  }
}
function input() {
  return {
    schemaVersion: 1,
    provider: 'github-check-runs',
    repository: { id: REPO_ID, fullName: REPO },
    linearWorkspace: 'spectranoir',
    apiVersion: '2026-03-10',
    scope: { headSha: HEAD, filter: 'latest', perPage: 2 },
    window: { start: START, end: END },
    bounds: { maxPages: 5, maxRecords: 10 },
    capture: { startedAt: CHECKED, finishedAt: FINISHED, pages: [page()], error: null },
    workstreamEvidence: {
      revision: SHA,
      checkedAt: END,
      assignments: [
        {
          checkRunId: 1,
          headSha: HEAD,
          workstream: 'CP-core',
          sourceRef: 'https://linear.app/spectranoir/issue/SPE-3512',
        },
      ],
    },
    lastSuccess: null,
  }
}
function envelope(source) {
  const names = ['github', 'linear', 'handoff', 'validation', 'drift', 'queue', 'recommendations']
  return {
    schemaVersion: 1,
    repository: REPO,
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
  }
}
function invalid(change) {
  const value = input()
  change(value)
  assert.throws(() => adapt(value), /^Error: engineering-summary-checks: invalid [A-Za-z /-]+$/)
}

test('only four check-run conclusions map to existing CI failure records and both renderers', () => {
  for (const conclusion of ['failure', 'timed_out', 'cancelled', 'action_required']) {
    const value = input()
    value.capture.pages[0].data.check_runs[0].conclusion = conclusion
    const { source, provenance } = adapt(value)
    assert.equal(source.status, 'partial')
    assert.deepEqual(source.currentError, { code: 'incomplete-coverage' })
    assert.deepEqual(source.records[0], {
      id: 'CHECK-1',
      kind: 'ci-failure',
      state: conclusion.toUpperCase(),
      workstream: 'CP-core',
      at: OBSERVED,
      revision: provenance.revision,
      sourceRef: REF,
    })
    assert.equal(source.checkedAt, FINISHED)
    assert.equal(provenance.capture.pages[0].records[0].completedAt, '2026-11-14T12:01:00.000Z')
    assert.equal(provenance.returnedSubsetPaginationComplete, true)
    assert.equal(provenance.allCiCoverage, false)
    assert.equal(provenance.atomicSnapshot, false)
    assert.equal(provenance.mergedPrsCollected, false)
    assert.deepEqual(source.coverage, {
      complete: false,
      paginationComplete: false,
      window: { start: START, end: END },
      workstreams: [],
    })
    const report = envelope(source),
      github = summarize(report).sources.github
    assert.equal(report.policy.expectedRevisions.github, null)
    assert.equal(github.count, null)
    assert.equal(github.observedCount, 1)
    assert.ok(github.reasons.includes('unverified-revision'))
    assert.equal(JSON.parse(serialize(report)).sources.github.count, null)
    assert.match(render(report), /CHECK-1/)
  }
})

test('pending and successful/neutral/skipped checks never become failures or a verified zero', () => {
  const rows = ['success', 'neutral', 'skipped'].map((conclusion) => check(1, { conclusion }))
  rows.push(
    ...['queued', 'in_progress', 'waiting', 'requested', 'pending'].map((status) =>
      check(1, { status, conclusion: null, started_at: null, completed_at: null })
    )
  )
  for (const row of rows) {
    const value = input()
    value.capture.pages[0].data.check_runs = [row]
    const result = adapt(value)
    assert.deepEqual(result.source.records, [])
    assert.equal(result.provenance.capture.pages[0].records[0].status, row.status)
    assert.equal(summarize(envelope(result.source)).sources.github.count, null)
    assert.equal(result.source.status, 'partial')
  }
})

test('provider stale conclusion is preserved as unmapped, not invented failure or snapshot-freshness status', () => {
  const value = input()
  value.capture.pages[0].data.check_runs[0].conclusion = 'stale'
  const result = adapt(value)
  assert.deepEqual(result.provenance.unmappedConclusionIds, [1])
  assert.deepEqual(result.source.records, [])
  assert.equal(summarize(envelope(result.source)).sources.github.status, 'partial')
  invalid((next) => {
    next.capture.pages[0].data.check_runs[0].conclusion = 'startup_failure'
  })
})

test('CI is a current observation, never filtered by completion-event reporting-window edges', () => {
  for (const completedAt of ['2026-11-13T23:59:59.999Z', START, END, CHECKED]) {
    const value = input()
    Object.assign(value.capture.pages[0].data.check_runs[0], {
      started_at: null,
      completed_at: completedAt,
    })
    const result = adapt(value)
    assert.equal(result.source.records[0].at, OBSERVED)
    assert.equal(result.provenance.capture.pages[0].records[0].completedAt, completedAt)
    assert.equal(summarize(envelope(result.source)).sources.github.observations.length, 1)
  }
})

test('nullable provider start/completion/suite/app metadata is preserved without invented timestamps or IDs', () => {
  const value = input()
  Object.assign(value.capture.pages[0].data.check_runs[0], {
    started_at: null,
    completed_at: null,
    check_suite: null,
    app: null,
  })
  const result = adapt(value),
    fact = result.provenance.capture.pages[0].records[0]
  assert.equal(fact.startedAt, null)
  assert.equal(fact.completedAt, null)
  assert.equal(fact.checkSuiteId, null)
  assert.equal(fact.appId, null)
  assert.equal(result.source.records[0].at, OBSERVED)
})

test('capture finish cannot refresh stale page observations; expected revisions remain independent', () => {
  const value = input()
  value.capture.startedAt = END
  value.capture.pages[0].observedAt = END
  const { source } = adapt(value),
    report = envelope(source)
  report.policy.expectedRevisions.github = source.revision
  const github = summarize(report).sources.github
  assert.equal(source.checkedAt, FINISHED)
  assert.equal(github.status, 'stale')
  assert.ok(github.reasons.includes('stale'))
  report.policy.expectedRevisions.github = SHA
  assert.equal(summarize(report).sources.github.status, 'conflicted')
})

test('failed acquisition preserves true prior last success and exposes unknown evidence', () => {
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
    value.lastSuccess = { checkedAt: END, revision: SHA, sourceRef: REF }
    const result = adapt(value),
      github = summarize(envelope(result.source)).sources.github
    assert.equal(result.source.status, 'unavailable')
    assert.equal(result.source.records, null)
    assert.equal(result.source.revision, null)
    assert.deepEqual(result.source.lastSuccess, value.lastSuccess)
    assert.deepEqual(result.source.currentError, { code })
    assert.equal(result.provenance.returnedSubsetPaginationComplete, false)
    assert.equal(github.count, null)
    assert.equal(github.observedCount, null)
  }
})

test('no attempted page differs from successful empty data and never invents matching check IDs', () => {
  const value = input()
  value.capture.pages = []
  assert.equal(adapt(value).source.currentError.code, 'not-collected')
  assert.equal(adapt(value).source.status, 'unavailable')
  value.capture.error = { code: 'http-403' }
  assert.equal(adapt(value).source.currentError.code, 'http-403')
  value.capture.error = null
  value.capture.pages = [page(1, [], 0)]
  value.workstreamEvidence.assignments = []
  const result = adapt(value)
  assert.equal(result.source.status, 'partial')
  assert.equal(result.source.currentError.code, 'incomplete-coverage')
  assert.deepEqual(result.source.records, [])
  assert.equal(result.provenance.returnedSubsetPaginationComplete, true)
  assert.equal(summarize(envelope(result.source)).sources.github.count, null)
})

test('missing final pages or mismatched returned total never claim complete returned-subset pagination', () => {
  for (const next of [null, 2]) {
    const value = input()
    value.capture.pages = [page(1, [check()], 3, next)]
    value.bounds.maxPages = 1
    const result = adapt(value)
    assert.equal(result.provenance.returnedSubsetPaginationComplete, false)
    assert.equal(result.source.coverage.paginationComplete, false)
    assert.equal(summarize(envelope(result.source)).sources.github.count, null)
  }
})

test('page/row ordering and numeric repository URLs normalize deterministically', () => {
  const value = input()
  value.capture.pages = [page(1, [check(2), check(1)], 3, 2), page(2, [check(3)], 3)]
  value.capture.pages[1].requestUrl = url(2, true)
  value.capture.pages[1].link = `<${url(1)}>; rel="prev", <${url(2)}>; rel="last"`
  const result = adapt(value)
  value.capture.pages.reverse()
  value.capture.pages[1].data.check_runs.reverse()
  assert.deepEqual(adapt(value), result)
  assert.equal(result.provenance.returnedSubsetPaginationComplete, true)
})

test('different check-run IDs are never collapsed by name, suite, app, workflow URL or alleged attempt', () => {
  const value = input()
  const extra = {
    name: 'same',
    details_url: `https://github.com/${REPO}/actions/runs/1/attempts/2`,
    run_attempt: 2,
  }
  value.capture.pages = [page(1, [check(1, extra), check(2, extra)], 2)]
  const result = adapt(value)
  assert.deepEqual(
    result.source.records.map((row) => row.id),
    ['CHECK-1', 'CHECK-2']
  )
  assert.deepEqual(
    result.provenance.capture.pages[0].records.map((row) => row.checkSuiteId),
    [100, 100]
  )
  assert.ok(!JSON.stringify(result).includes('run_attempt'))
})

test('duplicate IDs and conflicting observations across a mutable/rerequested check fail closed', () => {
  for (const second of [
    check(),
    check(1, { conclusion: 'success' }),
    check(1, { status: 'queued', conclusion: null, completed_at: null }),
    check(1, { app: { id: 201 } }),
  ])
    invalid((value) => {
      value.capture.pages = [page(1, [check(), second], 2)]
    })
  const value = input(),
    failed = adapt(value)
  value.capture.pages[0].data.check_runs[0].conclusion = 'success'
  const succeeded = adapt(value)
  assert.deepEqual(succeeded.source.records, [])
  assert.notEqual(succeeded.provenance.revision, failed.provenance.revision)
})

test('provider type, payload and check URLs prevent workflow-run or commit-status identity collisions', () => {
  for (const change of [
    (value) => {
      value.provider = 'github-workflow-runs'
    },
    (value) => {
      value.capture.pages[0].data = { total_count: 1, workflow_runs: [check()] }
    },
    (value) => {
      value.capture.pages[0].data = { state: 'failure', statuses: [check()] }
    },
    (value) => {
      value.capture.pages[0].data.check_runs[0].url = `https://api.github.com/repos/${REPO}/actions/runs/1`
    },
    (value) => {
      value.scope.filter = 'all'
    },
  ])
    invalid(change)
})

test('foreign repositories/heads and extra filters cannot silently narrow or redirect evidence', () => {
  for (const change of [
    (value) => {
      value.capture.pages[0].requestUrl = url().replace(REPO, 'foreign/repo')
    },
    (value) => {
      value.capture.pages[0].requestUrl = url().replace(HEAD, SHA)
    },
    (value) => {
      value.capture.pages[0].requestUrl += '&status=completed'
    },
    (value) => {
      value.capture.pages[0].requestUrl += '&app_id=1'
    },
    (value) => {
      value.capture.pages[0].requestUrl += '&check_name=secret-canary'
    },
    (value) => {
      value.capture.pages[0].requestUrl += '&page=1'
    },
    (value) => {
      value.capture.pages[0].data.check_runs[0].head_sha = SHA
    },
    (value) => {
      value.capture.pages[0].data.check_runs[0].url =
        'https://api.github.com/repos/foreign/repo/check-runs/1'
    },
    (value) => {
      value.capture.pages[0].data.check_runs[0].url += '?token=secret-canary'
    },
  ])
    invalid(change)
})

test('missing/repeated/cyclic pages, contradictory last links and changing totals fail closed', () => {
  for (const change of [
    (value) => {
      value.capture.pages = [page(2)]
    },
    (value) => {
      value.capture.pages = [page(1, [], 0, 2), page(1, [], 0)]
    },
    (value) => {
      value.capture.pages = [page(1, [], 0), page(2, [], 0)]
    },
    (value) => {
      value.capture.pages[0].link = `<${url(1)}>; rel="next"`
    },
    (value) => {
      value.capture.pages[0].link = `<${url(2)}>; rel="last"`
    },
    (value) => {
      value.capture.pages = [page(1, [], 2, 2), page(2, [], 3)]
    },
    (value) => {
      value.capture.pages = [page(1, [], 0, 2), page(2, [], 0)]
      value.capture.pages[0].link += `, <${url(3)}>; rel="last"`
    },
    (value) => {
      value.capture.pages[0].data.total_count = 0
    },
    (value) => {
      value.capture.pages[0].data.total_count = -1
    },
  ])
    invalid(change)
})

test('unknown/mismatched/conflicting workstream metadata never becomes CP or merges Academy priorities', () => {
  const value = input()
  value.workstreamEvidence = { revision: null, checkedAt: END, assignments: [] }
  const result = adapt(value),
    github = summarize(envelope(result.source)).sources.github
  assert.equal(result.source.records[0].workstream, null)
  assert.ok(github.reasons.includes('unknown-workstream'))
  assert.deepEqual(github.observations, [])
  for (const change of [
    (next) => {
      next.workstreamEvidence.revision = null
    },
    (next) => {
      next.workstreamEvidence.assignments[0].headSha = SHA
    },
    (next) => {
      next.workstreamEvidence.assignments[0].checkRunId = 2
    },
    (next) => {
      next.workstreamEvidence.assignments.push({ ...next.workstreamEvidence.assignments[0] })
    },
    (next) => {
      next.workstreamEvidence.assignments[0].workstream = 'all'
    },
    (next) => {
      next.workstreamEvidence.checkedAt = FINISHED
    },
  ])
    invalid(change)
  value.workstreamEvidence = input().workstreamEvidence
  value.workstreamEvidence.assignments[0].workstream = 'Academy'
  assert.deepEqual(summarize(envelope(adapt(value).source)).sources.github.observations, [])
})

test('invalid capture/provider/last-success timestamps and contradictory states fail without echoing values', () => {
  for (const change of [
    (value) => {
      value.window.start = value.window.end
    },
    (value) => {
      value.window.end = FINISHED
    },
    (value) => {
      value.capture.startedAt = '2026-02-30T00:00:00Z'
    },
    (value) => {
      value.capture.pages[0].observedAt = END
    },
    (value) => {
      value.capture.pages[0].data.check_runs[0].started_at = FINISHED
    },
    (value) => {
      value.capture.pages[0].data.check_runs[0].completed_at = FINISHED
    },
    (value) => {
      value.capture.pages[0].data.check_runs[0].completed_at = '2026-11-14T11:00:00Z'
    },
    (value) => {
      value.capture.pages[0].data.check_runs[0].status = 'in_progress'
    },
    (value) => {
      value.capture.pages[0].data.check_runs[0].conclusion = null
    },
    (value) => {
      value.capture.pages[0].data.check_runs[0].app = { id: '200' }
    },
    (value) => {
      value.lastSuccess = { checkedAt: FINISHED, revision: SHA, sourceRef: REF }
    },
    (value) => {
      value.capture.error = { code: 'secret-canary' }
    },
    (value) => {
      value.capture.pages[0].status = 403
    },
  ])
    invalid(change)
})

test('resource bounds apply to pending/successful rows across all supplied pages before filtering', () => {
  invalid((value) => {
    value.bounds.maxRecords = 2
    value.capture.pages = [
      page(1, [check(1), check(2, { conclusion: 'success' })], 3, 2),
      page(2, [check(3, { status: 'pending', conclusion: null, completed_at: null })], 3),
    ]
  })
  for (const change of [
    (value) => {
      value.bounds.maxRecords = 100001
    },
    (value) => {
      value.bounds.maxPages = 0
    },
    (value) => {
      value.bounds.maxPages = 1
      value.capture.pages = [page(1, [], 0, 2), page(2, [], 0)]
    },
    (value) => {
      value.capture.pages[0].data.check_runs.push(check(2), check(3))
    },
  ])
    invalid(change)
  const value = input()
  value.bounds.maxRecords = 0
  value.capture.pages = [page(1, [], 0)]
  value.workstreamEvidence.assignments = []
  assert.deepEqual(adapt(value).source.records, [])
})

test('independent PR/CI captures do not silently become one complete or revision-qualified source', () => {
  const ci = adapt(input()).source
  const pr = adaptPr({
    schemaVersion: 1,
    repository: { id: REPO_ID, fullName: REPO },
    linearWorkspace: 'spectranoir',
    apiVersion: '2026-03-10',
    scope: { baseRef: 'main', sort: 'created', direction: 'asc', perPage: 2 },
    window: { start: START, end: END },
    bounds: { maxPages: 1, maxRecords: 2 },
    sourceRef: REF,
    capture: {
      startedAt: CHECKED,
      finishedAt: FINISHED,
      error: null,
      pages: [
        {
          requestUrl: `https://api.github.com/repos/${REPO}/pulls?state=closed&base=main&sort=created&direction=asc&per_page=2&page=1`,
          observedAt: OBSERVED,
          status: 200,
          link: null,
          data: [
            {
              id: 500,
              number: 1,
              state: 'closed',
              html_url: `https://github.com/${REPO}/pull/1`,
              merged_at: '2026-11-14T12:00:00Z',
              updated_at: '2026-11-14T12:01:00Z',
              base: { ref: 'main', repo: { id: REPO_ID, full_name: REPO } },
            },
          ],
        },
      ],
    },
    workstreamEvidence: {
      revision: SHA,
      checkedAt: END,
      assignments: [
        {
          pullRequestId: 500,
          number: 1,
          workstream: 'CP-core',
          sourceRef: 'https://linear.app/spectranoir/issue/SPE-3512',
        },
      ],
    },
    lastSuccess: null,
  }).source
  assert.equal(pr.coverage.complete, false)
  assert.equal(ci.coverage.complete, false)
  assert.notEqual(pr.revision, ci.revision)
  const combined = { ...ci, records: [...ci.records, ...pr.records] },
    report = envelope(combined)
  report.policy.expectedRevisions.github = ci.revision
  const github = summarize(report).sources.github
  assert.equal(github.status, 'conflicted')
  assert.ok(github.reasons.includes('revision-conflict'))
  assert.equal(github.count, null)
})

test('minimized diagnostics omit raw output/names/links/attempts and never echo raw errors or credentials', () => {
  const value = input(),
    row = value.capture.pages[0].data.check_runs[0]
  Object.assign(row, {
    name: 'secret-canary',
    output: { text: 'secret-canary' },
    details_url: 'https://secret-canary.invalid/',
    external_id: 'secret-canary',
    run_attempt: 3,
  })
  const result = adapt(value)
  assert.ok(!JSON.stringify(result).includes('secret-canary'))
  assert.deepEqual(Object.keys(result.provenance.capture.pages[0]).sort(), [
    'lastPage',
    'nextPage',
    'number',
    'observedAt',
    'records',
    'totalCount',
  ])
  value.capture.error = { code: 'http-403', raw: 'secret-canary' }
  assert.throws(
    () => adapt(value),
    (error) => !error.message.includes('secret-canary')
  )
})

test('digests track source and mapping facts, not arbitrary text or inferred attempt identity', () => {
  const value = input(),
    initial = adapt(value)
  Object.assign(value.capture.pages[0].data.check_runs[0], { name: 'new', run_attempt: 99 })
  assert.equal(adapt(value).provenance.revision, initial.provenance.revision)
  value.capture.pages[0].data.check_runs[0].check_suite.id++
  assert.notEqual(adapt(value).provenance.revision, initial.provenance.revision)
  value.capture.pages[0].data.check_runs[0].check_suite.id--
  value.workstreamEvidence.revision = HEAD
  assert.notEqual(adapt(value).provenance.revision, initial.provenance.revision)
})

test('supported declared API versions preserve their identity; arbitrary versions are rejected', () => {
  for (const apiVersion of ['2022-11-28', '2026-03-10']) {
    const value = input()
    value.apiVersion = apiVersion
    assert.equal(adapt(value).provenance.apiVersion, apiVersion)
  }
  invalid((value) => {
    value.apiVersion = 'secret-canary'
  })
})

test('frozen JSON remains unchanged across deterministic repeated normalization', () => {
  const value = input(),
    before = JSON.stringify(value)
  const freeze = (object) => {
    if (object !== null && typeof object === 'object') {
      Object.values(object).forEach(freeze)
      Object.freeze(object)
    }
  }
  freeze(value)
  assert.deepEqual(adapt(value), adapt(value))
  assert.equal(JSON.stringify(value), before)
})
