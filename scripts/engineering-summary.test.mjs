import test from 'node:test'
import assert from 'node:assert/strict'
import {
  summarizeEngineeringActivity as summarize,
  serializeEngineeringSummary as serialize,
  renderEngineeringSummary as render,
} from './engineering-summary.mjs'
import { normalizeLinearIssues } from './export-linear-approved-work.mjs'

// Constructed snapshots, never live connectivity or authoritative classifications.
const NOW = '2026-11-14T20:00:00.000Z'
const START = '2026-11-13T20:00:00.000Z'
const SHA = 'a'.repeat(40),
  OTHER = 'b'.repeat(40)
const names = ['github', 'linear', 'handoff', 'validation', 'drift', 'queue', 'recommendations']
const authorities = ['GitHub', 'Linear', 'SPE-3337', 'SPE-3348', 'SPE-3276', 'SPE-3338', 'SPE-3339']
const url = 'https://github.com/JamesJedi420/containment-protocol/pull/1'
const issue = (id, extra = {}) => ({
  id,
  approved: true,
  workstream: 'CP-core',
  statusType: 'backlog',
  priority: 3,
  blockedBy: [],
  dependsOn: [],
  implementationEvidence: { state: 'unstarted' },
  evidenceDrift: false,
  ...extra,
})
function source(name, records = []) {
  return {
    authority: authorities[names.indexOf(name)],
    status: 'ready',
    checkedAt: NOW,
    revision: SHA,
    sourceRef: url,
    coverage: {
      complete: true,
      paginationComplete: true,
      window: { start: START, end: NOW },
      workstreams: ['CP-core', 'Academy', 'shared-system', 'cross-project'],
    },
    records: name === 'queue' ? null : records,
    lastSuccess: null,
    currentError: null,
    ...(name === 'queue'
      ? {
          snapshot: {
            source: 'Linear',
            complete: true,
            asOf: NOW,
            workstreamCoverage: 'all-approved',
            relationCoverage: 'complete',
            issues: [],
          },
        }
      : {}),
  }
}
function input() {
  return {
    schemaVersion: 1,
    repository: 'JamesJedi420/containment-protocol',
    linearWorkspace: 'spectranoir',
    workstream: 'CP-core',
    window: { start: START, end: NOW },
    evaluatedAt: NOW,
    policy: {
      maxAgeSeconds: Object.fromEntries(names.map((name) => [name, 300])),
      expectedRevisions: Object.fromEntries(names.map((name) => [name, SHA])),
      futureToleranceSeconds: 0,
      maxRecordsPerSource: 20,
    },
    sources: Object.fromEntries(names.map((name) => [name, source(name)])),
  }
}
function record(kind, changes = {}) {
  const states = {
    'merged-pr': 'merged',
    'ci-failure': 'FAILURE',
    blocker: 'started',
    decision: 'awaiting-design',
    handoff: 'blocked',
    validation: 'failed',
    drift: 'evidence-conflicted',
    recommendation: 'recommended',
  }
  return {
    id:
      kind === 'merged-pr'
        ? 'PR-1'
        : kind === 'ci-failure'
          ? 'CHECK-1'
          : kind === 'validation'
            ? 'lint'
            : 'SPE-1',
    kind,
    state: states[kind],
    workstream: 'CP-core',
    at: kind === 'merged-pr' ? START : NOW,
    revision: SHA,
    sourceRef: url,
    ...(kind === 'recommendation' ? { position: 0 } : {}),
    ...changes,
  }
}

test('only complete fresh successful coverage can report zero events', () => {
  const result = summarize(input())
  assert.equal(result.status, 'no-events')
  assert.equal(result.informationalOnly, true)
  for (const row of Object.values(result.sources)) {
    assert.equal(row.status, 'no-events')
    assert.equal(row.count, 0)
  }
  const missing = input()
  missing.sources = {}
  assert.equal(summarize(missing).status, 'unavailable')
  for (const row of Object.values(summarize(missing).sources)) {
    assert.equal(row.count, null)
    assert.equal(row.observations, null)
    assert.equal(row.observedCount, null)
  }
})

test('failed GitHub reads preserve error and actual last success without a zero or empty success', () => {
  const value = input()
  value.sources.github = {
    ...source('github'),
    status: 'unavailable',
    revision: null,
    records: null,
    currentError: { code: 'http-403' },
    lastSuccess: { checkedAt: START, revision: OTHER, sourceRef: url },
  }
  const row = summarize(value).sources.github
  assert.equal(row.status, 'unavailable')
  assert.equal(row.count, null)
  assert.equal(row.observedCount, null)
  assert.equal(row.observations, null)
  assert.deepEqual(row.currentError, { code: 'http-403' })
  assert.equal(row.lastSuccess.revision, OTHER)
  assert.equal(row.lastSuccess.checkedAt, START)
  assert.match(render(value), /Status: unavailable; count: unknown/)
  assert.match(render(value), /Current error: http-403/)
  assert.match(render(value), /Last successful refresh: 2026-11-13/)
  assert.equal(summarize(value).status, 'partial')
  value.sources.github.records = []
  assert.throws(() => summarize(value), /invalid unavailable\/queue records/)
})

test('each coverage failure makes a successful empty source partial, never no-events', () => {
  for (const mutate of [
    (s) => {
      s.status = 'partial'
    },
    (s) => {
      s.coverage.complete = false
    },
    (s) => {
      s.coverage.paginationComplete = false
    },
    (s) => {
      s.coverage.window.start = '2026-11-13T20:00:00.001Z'
    },
    (s) => {
      s.coverage.window.end = '2026-11-14T19:59:59.999Z'
    },
    (s) => {
      s.coverage.workstreams = ['Academy']
    },
    (s) => {
      s.status = 'partial'
      s.currentError = { code: 'partial-response' }
    },
    (s) => {
      s.revision = null
    },
  ]) {
    const value = input()
    mutate(value.sources.github)
    assert.equal(summarize(value).sources.github.status, 'partial')
    assert.equal(summarize(value).sources.github.count, null)
  }
})

test('freshness boundaries preserve milliseconds and use explicit caller clock tolerance', () => {
  const value = input()
  value.window.end = '2026-11-14T19:54:00.000Z'
  value.sources.github.coverage.window.end = value.window.end
  value.sources.github.checkedAt = '2026-11-14T19:55:00.000Z'
  assert.equal(summarize(value).sources.github.status, 'no-events')
  value.sources.github.checkedAt = '2026-11-14T19:54:59.999Z'
  assert.equal(summarize(value).sources.github.status, 'stale')
  value.sources.github.checkedAt = '2026-11-14T20:00:00.001Z'
  assert.equal(summarize(value).sources.github.status, 'stale')
  value.policy.futureToleranceSeconds = 1
  assert.equal(summarize(value).sources.github.status, 'no-events')
  value.sources.github.checkedAt = '2026-11-14T20:00:01.001Z'
  assert.equal(summarize(value).sources.github.status, 'stale')
})

test('complete coverage cannot extend beyond the actual source observation', () => {
  const value = input()
  value.sources.github.coverage.window.end = '2026-11-14T20:00:00.001Z'
  assert.equal(summarize(value).sources.github.status, 'conflicted')
  assert.equal(summarize(value).sources.github.count, null)
  value.policy.futureToleranceSeconds = 1
  assert.equal(summarize(value).sources.github.status, 'no-events')
  const malformedQueue = input()
  delete malformedQueue.sources.queue.snapshot.issues
  assert.throws(() => summarize(malformedQueue), /invalid queue snapshot\/bound/)
})

test('merged PRs use start-inclusive/end-exclusive windows; current snapshots are separate', () => {
  const value = input()
  value.sources.github.records = [
    record('merged-pr'),
    record('merged-pr', { id: 'PR-2', at: NOW }),
    record('merged-pr', { id: 'PR-3', at: '2026-11-13T19:59:59.999Z' }),
    record('ci-failure'),
  ]
  value.sources.linear.records = [record('blocker'), record('decision')]
  assert.deepEqual(
    summarize(value).sources.github.observations.map((row) => row.id),
    ['CHECK-1', 'PR-1']
  )
  assert.equal(summarize(value).sources.linear.count, 2)
  value.sources.github.records = [record('ci-failure', { at: START })]
  assert.equal(summarize(value).sources.github.status, 'stale')
})

test('source, record and policy revision mismatches are conflicts; unknown revisions cannot qualify', () => {
  const value = input()
  value.sources.github.records = [record('merged-pr', { revision: OTHER })]
  assert.equal(summarize(value).sources.github.status, 'conflicted')
  value.sources.github.records = []
  value.policy.expectedRevisions.github = OTHER
  assert.equal(summarize(value).sources.github.status, 'conflicted')
  value.policy.expectedRevisions.github = null
  assert.equal(summarize(value).sources.github.status, 'partial')
  value.sources.github.lastSuccess = {
    checkedAt: '2026-11-14T20:00:00.001Z',
    revision: SHA,
    sourceRef: url,
  }
  assert.equal(summarize(value).sources.github.status, 'conflicted')
})

test('duplicates and contradictory supplied observations remain explicitly conflicted', () => {
  const value = input()
  value.sources.github.records = [record('ci-failure'), record('ci-failure')]
  assert.equal(summarize(value).sources.github.status, 'conflicted')
  value.sources.github.records[1].state = 'TIMED_OUT'
  assert.equal(summarize(value).sources.github.status, 'conflicted')
  assert.equal(summarize(value).sources.github.observations.length, 2)
  value.sources.github.records = []
  value.sources.github.status = 'conflicted'
  assert.equal(summarize(value).status, 'conflicted')
  value.sources.github.status = 'ready'
  value.sources.github.currentError = { code: 'http-403' }
  assert.equal(summarize(value).sources.github.status, 'conflicted')
})

test('canonical handoff, validation and supplied drift states are preserved without a new classifier', () => {
  const value = input()
  value.sources.handoff.records = [record('handoff')]
  value.sources.validation.records = [record('validation')]
  value.sources.drift.records = [record('drift')]
  const result = summarize(value)
  assert.equal(result.sources.handoff.observations[0].state, 'blocked')
  assert.equal(result.sources.validation.observations[0].state, 'failed')
  assert.equal(result.sources.drift.status, 'conflicted')
  assert.equal(result.status, 'conflicted')
  assert.equal(result.sources.recommendations.count, null)
})

test('unknown or different workstreams never silently enter the selected scope', () => {
  const value = input()
  value.sources.github.records = [record('merged-pr', { workstream: 'Academy' })]
  assert.equal(summarize(value).sources.github.count, 0)
  value.workstream = 'Academy'
  assert.equal(summarize(value).sources.github.count, 1)
  value.workstream = 'shared-system'
  assert.equal(summarize(value).sources.github.count, 0)
  value.sources.github.records[0].workstream = null
  assert.equal(summarize(value).sources.github.status, 'partial')
  assert.equal(summarize(value).sources.github.count, null)
  value.sources.github.records[0].workstream = 'unknown'
  assert.throws(() => summarize(value), /invalid record workstream/)
})

test('queue summary uses canonical lifecycle, prerequisites, drift and supplied priority', () => {
  const value = input()
  value.sources.queue.snapshot.issues = [
    issue('SPE-1', {
      statusType: 'started',
      implementationEvidence: { state: 'merged', secret: 'PRIVATE_VALUE' },
    }),
    issue('SPE-2', { blockedBy: ['SPE-1'] }),
    issue('SPE-3', { statusType: 'completed' }),
    issue('SPE-4', { priority: 1 }),
    issue('SPE-5', { evidenceDrift: true }),
  ]
  const queue = summarize(value).sources.queue.approvedWork
  assert.deepEqual(queue.runnableIds, ['SPE-4', 'SPE-1'])
  assert.ok(queue.activeIds.includes('SPE-1'))
  assert.deepEqual(queue.historyIds, ['SPE-3'])
  assert.ok(!serialize(value).includes('PRIVATE_VALUE'))
  value.sources.queue.snapshot.issues[0].dependsOn = ['SPE-999']
  assert.throws(() => summarize(value), /invalid canonical queue snapshot/)
})

test('constructed exporter normalization flows through canonical projection into both summary formats', () => {
  const value = input()
  const connection = { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } }
  const row = {
    id: 'fixture-uuid',
    identifier: 'SPE-1',
    updatedAt: NOW,
    priority: 3,
    state: { type: 'started' },
    labels: {
      nodes: [{ id: 'label-1', name: 'workstream:CP-core' }],
      pageInfo: { hasNextPage: false },
    },
    relations: connection,
    inverseRelations: connection,
  }
  const feed = {
    source: 'SPE-3276',
    complete: true,
    issues: {
      'SPE-1': {
        verified: true,
        evidenceDrift: false,
        implementationEvidence: { state: 'merged' },
      },
    },
  }
  value.sources.queue.snapshot = normalizeLinearIssues([[row]], feed, NOW, undefined, [
    'fixture-project',
  ])
  const machine = JSON.parse(serialize(value))
  assert.deepEqual(machine.sources.queue.approvedWork.activeIds, ['SPE-1'])
  assert.deepEqual(machine.sources.queue.approvedWork.historyIds, [])
  assert.match(render(value), /Canonical runnable IDs \(supplied priority order\): SPE-1/)
})

test('queue freshness is independently checked and unavailable inputs cannot invent a queue', () => {
  const value = input()
  value.sources.queue.snapshot.asOf = START
  assert.equal(summarize(value).sources.queue.status, 'stale')
  assert.equal(summarize(value).sources.queue.approvedWork, null)
  value.sources.queue = {
    ...source('queue'),
    status: 'unavailable',
    revision: null,
    currentError: { code: 'not-collected' },
  }
  delete value.sources.queue.snapshot
  assert.equal(summarize(value).sources.queue.count, null)
  assert.equal(summarize(value).sources.queue.approvedWork, null)
})

test('recommendations retain source order and require independently qualified canonical runnable IDs', () => {
  const value = input()
  value.sources.queue.snapshot.issues = [issue('SPE-1'), issue('SPE-2', { priority: 1 })]
  value.sources.recommendations.records = [
    record('recommendation', { id: 'SPE-1', position: 1 }),
    record('recommendation', { id: 'SPE-2', position: 0 }),
  ]
  assert.deepEqual(
    summarize(value).sources.recommendations.observations.map((row) => row.id),
    ['SPE-2', 'SPE-1']
  )
  value.sources.queue.snapshot.issues[1].evidenceDrift = true
  assert.equal(summarize(value).sources.recommendations.status, 'conflicted')
  value.sources.recommendations.records = []
  delete value.sources.queue
  assert.equal(summarize(value).sources.recommendations.count, null)
  const duplicate = input()
  duplicate.sources.queue.snapshot.issues = [issue('SPE-1'), issue('SPE-2')]
  duplicate.sources.recommendations.records = [
    record('recommendation'),
    record('recommendation', { id: 'SPE-2' }),
  ]
  assert.equal(summarize(duplicate).sources.recommendations.status, 'conflicted')
})

test('stable output does not mutate input or depend on object/record ordering', () => {
  const value = input()
  value.sources.github.records = [record('ci-failure'), record('merged-pr')]
  const before = structuredClone(value),
    shuffled = structuredClone(value)
  shuffled.sources = Object.fromEntries(Object.entries(shuffled.sources).reverse())
  shuffled.sources.github.records.reverse()
  assert.equal(serialize(value), serialize(shuffled))
  assert.equal(render(value), render(shuffled))
  assert.deepEqual(value, before)
  assert.equal(serialize(value), serialize(value))
  assert.match(render(value), /Informational only/)
})

test('raw secrets, free-text provider errors and unsafe links never reach output or diagnostics', () => {
  for (const badRef of [
    'http://github.com/x',
    'https://secret@github.com/JamesJedi420/containment-protocol/pull/1',
    `${url}?token=PRIVATE_VALUE`,
    `${url}#PRIVATE_VALUE`,
    'https://evil.example/PRIVATE_VALUE',
  ]) {
    const value = input()
    value.sources.github.sourceRef = badRef
    assert.throws(
      () => serialize(value),
      (error) => !error.message.includes('PRIVATE_VALUE') && /source reference/.test(error.message)
    )
  }
  for (const mutate of [
    (s) => {
      s.token = 'PRIVATE_VALUE'
    },
    (s) => {
      s.currentError = { code: 'http-403', message: 'PRIVATE_VALUE' }
    },
    (s) => {
      s.records = [record('merged-pr', { title: 'PRIVATE_VALUE' })]
    },
  ]) {
    const value = input()
    mutate(value.sources.github)
    assert.throws(
      () => render(value),
      (error) => !error.message.includes('PRIVATE_VALUE')
    )
  }
})

test('record identities and reference bounds cannot disguise another evidence kind', () => {
  const value = input()
  value.sources.github.records = [record('merged-pr', { id: 'CHECK-1' })]
  assert.throws(() => summarize(value), /invalid record identity/)
  value.sources.github.records = []
  value.sources.github.sourceRef = `https://github.com/JamesJedi420/containment-protocol/blob/${SHA}/${'a'.repeat(2048)}`
  assert.throws(() => summarize(value), /invalid source reference/)
})

test('malformed envelopes, impossible dates, unbounded data and missing policy fail safely', () => {
  for (const mutate of [
    (v) => {
      v.window.end = START
    },
    (v) => {
      v.window.end = '2026-11-15T00:00:00Z'
    },
    (v) => {
      v.evaluatedAt = '2026-02-30T20:00:00Z'
    },
    (v) => {
      delete v.policy.maxAgeSeconds.github
    },
    (v) => {
      v.policy.maxRecordsPerSource = 0
      v.sources.github.records = [record('merged-pr')]
    },
    (v) => {
      v.sources.github.authority = 'other'
    },
    (v) => {
      v.policy = {}
    },
    (v) => {
      v.workstream = 'all'
    },
  ]) {
    const value = input()
    mutate(value)
    assert.throws(() => summarize(value), /engineering-summary/)
  }
})
