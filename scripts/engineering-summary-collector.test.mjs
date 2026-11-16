import assert from 'node:assert/strict'
import test from 'node:test'
import { collectGitHubSummary } from './engineering-summary-collector.mjs'

const sha = 'a'.repeat(40)
const repo = 'JamesJedi420/containment-protocol'
const time = '2026-11-15T01:00:00.000Z'
const config = () => ({
  headSha: sha,
  window: { start: '2026-11-14T00:00:00.000Z', end: '2026-11-15T00:00:00.000Z' },
  workstream: 'CP-core',
  maxAgeSeconds: 300,
  perPage: 2,
  maxPages: 2,
  maxRecords: 4,
  prLastSuccess: null,
  checkLastSuccess: null,
})
const pr = () => ({
  id: 123,
  number: 1,
  html_url: `https://github.com/${repo}/pull/1`,
  state: 'closed',
  merged_at: '2026-11-14T12:00:00Z',
  updated_at: '2026-11-14T12:01:00Z',
  base: { ref: 'main', repo: { id: 1200651972, full_name: repo } },
  title: 'private secret',
})
const check = () => ({
  id: 456,
  head_sha: sha,
  url: `https://api.github.com/repos/${repo}/check-runs/456`,
  status: 'completed',
  conclusion: 'failure',
  started_at: '2026-11-14T12:00:00Z',
  completed_at: '2026-11-14T12:01:00Z',
  app: null,
  check_suite: null,
  output: { text: 'private secret' },
})
const ok = (data, link = null) => ({ status: 200, link, data })
const capture = (transport, input = config()) => collectGitHubSummary(input, transport, () => time)
const transport = async (path) =>
  path.includes('/pulls?') ? ok([pr()]) : ok({ total_count: 1, check_runs: [check()] })

test('live-shaped responses pass both adapters and render separately with unknown mappings and partial coverage', async () => {
  const result = await capture(transport)
  for (const kind of ['pr', 'checks']) {
    assert.equal(result[kind].source.status, 'partial')
    assert.equal(result[kind].source.coverage.complete, false)
    assert.equal(result[kind].source.records[0].workstream, null)
    assert.match(result[kind].html, /Manual snapshot, not live monitoring/)
    assert.match(result[kind].html, /Qualified count<\/dt><dd>unknown/)
    assert.match(result[kind].markdown, /GitHub/i)
    assert.match(result[kind].markdown, /unknown/i)
  }
  assert.equal(result.pr.source.records[0].id, 'PR-1')
  assert.equal(result.checks.source.records[0].id, 'CHECK-456')
  assert.equal(JSON.stringify(result).includes('private secret'), false)
  assert.deepEqual(await capture(transport), result)
})

test('failure preserves real last success and never becomes zero', async () => {
  const value = config()
  value.prLastSuccess = {
    checkedAt: '2026-11-14T00:00:00Z',
    revision: sha,
    sourceRef: `https://github.com/${repo}/commit/${sha}`,
  }
  const result = await capture(
    async (path) => (path.includes('/pulls?') ? { error: 'http-403' } : { error: 'http-429' }),
    value
  )
  assert.equal(result.pr.source.status, 'unavailable')
  assert.equal(result.pr.source.records, null)
  assert.equal(result.pr.source.currentError.code, 'http-403')
  assert.equal(result.pr.source.lastSuccess.revision, sha)
  assert.equal(result.checks.source.currentError.code, 'http-429')
})

test('bounded pagination stops without claiming success', async () => {
  const value = config()
  value.maxPages = 1
  const next = `https://api.github.com/repos/${repo}/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=2&page=2`
  const result = await capture(
    async (path) =>
      path.includes('/pulls?')
        ? ok([pr()], `<${next}>; rel="next"`)
        : ok({ total_count: 0, check_runs: [] }),
    value
  )
  assert.equal(result.pr.source.status, 'partial')
  assert.equal(result.pr.source.currentError.code, 'incomplete-coverage')
  assert.equal(result.pr.source.records[0].id, 'PR-1')
  assert.equal(result.pr.provenance.mergedPrPaginationComplete, false)
  assert.equal(result.checks.source.status, 'partial')
})

test('an oversized provider page is unavailable rather than treated as a valid bounded capture', async () => {
  const value = config()
  value.maxRecords = 2
  const result = await capture(
    async (path) =>
      path.includes('/pulls?') ? ok([pr(), pr(), pr()]) : ok({ total_count: 0, check_runs: [] }),
    value
  )
  assert.equal(result.pr.source.status, 'unavailable')
  assert.equal(result.pr.source.currentError.code, 'partial-response')
  assert.equal(result.pr.source.records, null)
})

test('record budget stops before a further request and preserves the valid prior page', async () => {
  const value = config()
  value.maxRecords = 2
  const next = `https://api.github.com/repos/${repo}/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=2&page=2`
  const paths = []
  const result = await capture(async (path) => {
    paths.push(path)
    return path.includes('/pulls?')
      ? ok([pr()], `<${next}>; rel="next"`)
      : ok({ total_count: 0, check_runs: [] })
  }, value)
  assert.equal(paths.length, 2)
  assert.equal(result.pr.source.status, 'partial')
  assert.equal(result.pr.source.records[0].id, 'PR-1')
  assert.equal(result.pr.provenance.mergedPrPaginationComplete, false)
})

test('sequential pages are checked and retained without mixing source revisions', async () => {
  const next = `https://api.github.com/repositories/1200651972/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=2&page=2`
  const paths = []
  const result = await capture(async (path) => {
    paths.push(path)
    if (!path.includes('/pulls?')) return ok({ total_count: 0, check_runs: [] })
    return path.endsWith('page=1') ? ok([pr()], `<${next}>; rel="next"`) : ok([])
  })
  assert.equal(paths.length, 3)
  assert.equal(result.pr.provenance.mergedPrPaginationComplete, true)
  assert.equal(result.pr.source.status, 'partial')
  assert.notEqual(result.pr.source.revision, result.checks.source.revision)
})

test('fresh wrappers do not refresh older observations', async () => {
  const value = config()
  value.maxAgeSeconds = 0
  let ticks = 0
  const result = await collectGitHubSummary(value, transport, () => {
    const result = new Date(Date.parse(time) + ticks * 1000).toISOString()
    ticks++
    return result
  })
  assert.match(result.pr.markdown, /stale/i)
  assert.match(result.checks.markdown, /stale/i)
})

test('foreign links are rejected before any second request and identity conflicts fail closed', async () => {
  let calls = 0
  await assert.rejects(
    capture(async () => {
      calls++
      return ok([pr()], '<https://evil.example/x?page=2>; rel="next"')
    }),
    /invalid/
  )
  assert.equal(calls, 1)
  await assert.rejects(
    capture(async (path) =>
      path.includes('/pulls?')
        ? ok([pr()])
        : ok({ total_count: 1, check_runs: [{ ...check(), head_sha: 'b'.repeat(40) }] })
    ),
    /invalid/
  )
})

test('bad metadata is rejected before transport and thrown transport details are suppressed', async () => {
  const value = config()
  value.headSha = 'main'
  let calls = 0
  await assert.rejects(
    capture(async () => {
      calls++
      throw Error('secret')
    }, value),
    /invalid/
  )
  assert.equal(calls, 0)
  const result = await capture(async () => {
    throw Error('secret')
  })
  assert.equal(result.pr.source.currentError.code, 'network')
  assert.equal(JSON.stringify(result).includes('secret'), false)
})
