import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { renderEngineeringSummaryHtml as render } from './engineering-summary-html.mjs'

// Constructed snapshots, not live source authority.
const names = ['github', 'linear', 'handoff', 'validation', 'drift', 'queue', 'recommendations']
const time = '2026-11-15T12:00:00.000Z'
const revision = 'a'.repeat(64)
const ref = 'https://linear.app/spectranoir/issue/SPE-3512'
const input = () => ({
  schemaVersion: 1,
  repository: 'JamesJedi420/containment-protocol',
  linearWorkspace: 'spectranoir',
  workstream: 'shared-system',
  window: { start: '2026-11-14T12:00:00.000Z', end: time },
  evaluatedAt: time,
  policy: {
    maxAgeSeconds: Object.fromEntries(names.map((n) => [n, 300])),
    expectedRevisions: Object.fromEntries(names.map((n) => [n, null])),
    futureToleranceSeconds: 0,
    maxRecordsPerSource: 20,
  },
  sources: {},
})
const linear = () => ({
  authority: 'Linear',
  status: 'partial',
  checkedAt: time,
  revision,
  sourceRef: ref,
  coverage: {
    complete: false,
    paginationComplete: false,
    window: input().window,
    workstreams: ['shared-system'],
  },
  records: [
    {
      id: 'SPE-3512',
      kind: 'blocker',
      state: 'started',
      workstream: 'shared-system',
      at: time,
      revision,
      sourceRef: ref,
    },
  ],
  lastSuccess: null,
  currentError: { code: 'incomplete-coverage' },
})

test('self-contained deterministic manual view preserves unknown counts and all authorities', () => {
  const value = input()
  value.sources.linear = linear()
  const html = render(value)
  assert.equal(render(value), html)
  assert.match(html, /Manual snapshot, not live monitoring/)
  assert.match(html, /Qualified count<\/dt><dd>unknown/)
  assert.match(html, /Observed count \(not a total\)<\/dt><dd>1/)
  assert.match(html, /href="https:\/\/linear.app\/spectranoir\/issue\/SPE-3512"/)
  assert.equal((html.match(/<section /g) ?? []).length, 7)
  assert.doesNotMatch(html, /<script|<iframe|<img|<link|http-equiv="refresh"|\son\w+=|url\(/i)
  assert.match(html, /default-src 'none'/)
  assert.match(html, /not when this file is opened/)
})

test('stale, errors and last success remain visible without refreshing capture time', () => {
  const value = input()
  value.sources.linear = linear()
  value.evaluatedAt = '2026-11-16T12:00:00.000Z'
  assert.match(render(value), /<span class="badge">stale/)
  value.sources.linear.status = 'unavailable'
  value.sources.linear.records = null
  value.sources.linear.revision = null
  value.sources.linear.currentError = { code: 'http-403' }
  value.sources.linear.lastSuccess = {
    checkedAt: '2026-11-14T12:00:00.000Z',
    revision,
    sourceRef: ref,
  }
  const html = render(value)
  assert.match(html, /http-403/)
  assert.match(html, /Last successful refresh<\/dt><dd>2026-11-14/)
  assert.match(html, /Observed count \(not a total\)<\/dt><dd>unknown/)
})

test('qualified zero differs from unknown and no classification is invented', () => {
  const value = input()
  value.sources.linear = {
    ...linear(),
    status: 'ready',
    currentError: null,
    records: [],
    coverage: { ...linear().coverage, complete: true, paginationComplete: true },
  }
  value.policy.expectedRevisions.linear = revision
  assert.match(render(value), /Qualified count<\/dt><dd>0/)
  assert.match(render(value), /<span class="badge">no-events/)
  value.sources.linear = linear()
  value.sources.linear.records[0].workstream = null
  assert.match(render(value), /unknown-workstream/)
  assert.doesNotMatch(render(value), />SPE-3512<\/a>/)
})

test('schema rejects injection and unsafe links before rendering', () => {
  for (const url of [
    'javascript:alert(1)',
    ref + '?secret=private',
    'https://evil.test/<script>',
  ]) {
    const value = input()
    value.sources.linear = linear()
    value.sources.linear.sourceRef = url
    assert.throws(() => render(value))
  }
  const value = input()
  value.repository = '<img src=x onerror=alert(1)>'
  assert.throws(() => render(value))
})

// This cloud runtime can prepend one experimental proxy warning before CLI execution.
// Strip only that exact optional prefix; every application diagnostic still must match.
const proxyWarningPrefix =
  /^\(node:\d+\) \[UNDICI-EHPA\] Warning: EnvHttpProxyAgent is experimental, expect them to change at any time\.\r?\n\(Use `node --trace-warnings \.\.\.` to show where the warning was created\)\r?\n/
const sanitizedError = 'Snapshot view failed: invalid or oversized input.\n'
const isSanitizedError = (stderr) => stderr.replace(proxyWarningPrefix, '') === sanitizedError

test('CLI diagnostic allowance accepts only one exact optional proxy-warning prefix', () => {
  const warning =
    '(node:123) [UNDICI-EHPA] Warning: EnvHttpProxyAgent is experimental, expect them to change at any time.\n(Use `node --trace-warnings ...` to show where the warning was created)\n'
  assert.equal(isSanitizedError(sanitizedError), true)
  assert.equal(isSanitizedError(warning + sanitizedError), true)
  assert.equal(isSanitizedError(warning.replaceAll('\n', '\r\n') + sanitizedError), true)
  for (const extra of [
    'Unrelated warning\n',
    '(Use `node --trace-warnings ...` to show where the warning was created)\n',
    'private invalid secret\n',
    warning + warning,
    warning.replace('node:123', 'node:private'),
  ])
    assert.equal(isSanitizedError(extra + sanitizedError), false)
  assert.equal(isSanitizedError(warning + sanitizedError + 'extra diagnostics'), false)
  assert.equal(isSanitizedError(sanitizedError + warning), false)
})

test('CLI is stdin/stdout only and fails without leaking bad input', () => {
  const run = (text) =>
    spawnSync(process.execPath, ['scripts/engineering-summary-html.mjs'], {
      input: text,
      encoding: 'utf8',
      maxBuffer: 6_000_000,
    })
  const ok = run(JSON.stringify(input()))
  assert.equal(ok.status, 0)
  assert.equal(ok.stdout, render(input()))
  for (const text of ['private invalid secret', 'x'.repeat(5_000_001)]) {
    const bad = run(text)
    assert.equal(bad.status, 1)
    assert.equal(bad.stdout, '')
    assert.equal(isSanitizedError(bad.stderr), true)
  }
})
