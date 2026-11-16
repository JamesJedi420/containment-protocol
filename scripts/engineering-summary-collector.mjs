// Manual, bounded, read-only CP GitHub capture. Raw responses stay in memory.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { adaptGitHubMergedPrCapture } from './engineering-summary-github.mjs'
import { adaptGitHubCheckRunCapture } from './engineering-summary-checks.mjs'
import { renderEngineeringSummary } from './engineering-summary.mjs'
import { renderEngineeringSummaryHtml } from './engineering-summary-html.mjs'
import { captureValidation } from './engineering-summary-capture.mjs'

const exec = promisify(execFile)
const REPO = 'JamesJedi420/containment-protocol'
const REPO_ID = 1200651972
const API = '2026-03-10'
const { fields, requireValue, revision, timestamp, paginationLinks, parseUrl } = captureValidation(
  'engineering-summary-collector'
)

// gh owns the existing session; never read or return its credential or diagnostic text.
export async function ghTransport(path) {
  try {
    const { stdout } = await exec(
      'gh',
      ['api', '--hostname', 'github.com', '--include', '-H', `X-GitHub-Api-Version: ${API}`, path],
      { timeout: 15000, maxBuffer: 5_000_000, windowsHide: true }
    )
    const split = stdout.search(/\r?\n\r?\n/)
    if (split < 0) return { error: 'partial-response' }
    const header = stdout.slice(0, split),
      body = stdout.slice(split).trim()
    if (!/^HTTP\/\S+ 200\b/.test(header)) return { error: 'http-error' }
    const links = header.split(/\r?\n/).filter((line) => /^link:/i.test(line))
    if (links.length > 1) return { error: 'partial-response' }
    return {
      status: 200,
      link: links.length ? links[0].slice(5).trim() : null,
      data: JSON.parse(body),
    }
  } catch (error) {
    if (error.killed || error.code === 'ETIMEDOUT') return { error: 'timeout' }
    if (error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' || error instanceof SyntaxError)
      return { error: 'partial-response' }
    const status = /^HTTP\/\S+ (\d{3})\b/.exec(error.stdout ?? '')?.[1]
    return {
      error: ['401', '403', '429'].includes(status)
        ? `http-${status}`
        : status
          ? 'http-error'
          : 'network',
    }
  }
}

function requestPath(kind, sha, page, perPage) {
  const prefix = `repos/${REPO}`
  return kind === 'pr'
    ? `${prefix}/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=${perPage}&page=${page}`
    : `${prefix}/commits/${sha}/check-runs?filter=latest&per_page=${perPage}&page=${page}`
}

function nextPage(link, kind, sha, current, perPage) {
  const expected = new URL(`https://api.github.com/${requestPath(kind, sha, 1, perPage)}`)
  return paginationLinks(link, current, (value) => {
    const url = parseUrl(value)
    const suffix = kind === 'pr' ? 'pulls' : `commits/${sha}/check-runs`
    requireValue(
      url.hostname === 'api.github.com' &&
        [expected.pathname, `/repositories/${REPO_ID}/${suffix}`].includes(url.pathname),
      'pagination endpoint'
    )
    const entries = [...url.searchParams]
    requireValue(
      entries.length === [...expected.searchParams].length &&
        new Set(entries.map(([key]) => key)).size === entries.length &&
        [...expected.searchParams].every(
          ([key, val]) => key === 'page' || url.searchParams.get(key) === val
        ),
      'pagination scope'
    )
    const page = url.searchParams.get('page')
    requireValue(
      /^[1-9]\d*$/.test(page ?? '') && Number.isSafeInteger(Number(page)),
      'pagination page'
    )
    return Number(page)
  }).nextPage
}

export async function collectGitHubSummary(config, transport, clock) {
  fields(
    config,
    [
      'headSha',
      'window',
      'workstream',
      'maxAgeSeconds',
      'perPage',
      'maxPages',
      'maxRecords',
      'prLastSuccess',
      'checkLastSuccess',
    ],
    'configuration'
  )
  requireValue(
    revision(config.headSha) &&
      config.headSha.length === 40 &&
      ['CP-core', 'Academy', 'shared-system', 'cross-project'].includes(config.workstream) &&
      Number.isSafeInteger(config.maxAgeSeconds) &&
      config.maxAgeSeconds >= 0 &&
      Number.isSafeInteger(config.perPage) &&
      config.perPage >= 1 &&
      config.perPage <= 100 &&
      Number.isSafeInteger(config.maxPages) &&
      config.maxPages >= 1 &&
      config.maxPages <= 20 &&
      Number.isSafeInteger(config.maxRecords) &&
      config.maxRecords >= config.perPage &&
      config.maxRecords <= 2000,
    'configuration'
  )
  const startedAt = timestamp(clock())
  const common = {
    schemaVersion: 1,
    repository: { id: REPO_ID, fullName: REPO },
    linearWorkspace: 'spectranoir',
    apiVersion: API,
    window: config.window,
    bounds: { maxPages: config.maxPages, maxRecords: config.maxRecords },
    workstreamEvidence: { revision: null, checkedAt: startedAt, assignments: [] },
  }
  const makeInput = (kind, capture) =>
    kind === 'pr'
      ? {
          ...common,
          scope: { baseRef: 'main', sort: 'updated', direction: 'desc', perPage: config.perPage },
          sourceRef: `https://github.com/${REPO}/commit/${config.headSha}`,
          capture,
          lastSuccess: config.prLastSuccess,
        }
      : {
          ...common,
          provider: 'github-check-runs',
          scope: { headSha: config.headSha, filter: 'latest', perPage: config.perPage },
          capture,
          lastSuccess: config.checkLastSuccess,
        }
  const adapters = { pr: adaptGitHubMergedPrCapture, checks: adaptGitHubCheckRunCapture }
  // Validate caller metadata before the first network request.
  for (const kind of ['pr', 'checks'])
    adapters[kind](makeInput(kind, { startedAt, finishedAt: startedAt, pages: [], error: null }))
  const results = {}
  for (const kind of ['pr', 'checks']) {
    const pages = []
    let error = null,
      count = 0
    for (let page = 1; page <= config.maxPages; page++) {
      const path = requestPath(kind, config.headSha, page, config.perPage)
      let response
      try {
        response = await transport(path)
      } catch {
        response = { error: 'network' }
      }
      const observedAt = timestamp(clock())
      if (response.error) {
        error = { code: response.error }
        break
      }
      const rows = kind === 'pr' ? response.data : response.data?.check_runs
      if (response.status !== 200 || !Array.isArray(rows)) {
        error = { code: 'partial-response' }
        break
      }
      if (count + rows.length > config.maxRecords) {
        error = { code: 'partial-response' }
        break
      }
      count += rows.length
      const entry = {
        requestUrl: `https://api.github.com/${path}`,
        observedAt,
        status: 200,
        link: response.link,
        data: response.data,
      }
      pages.push(entry)
      // Adapter validates page identity, payload, links, timestamps and prior pages before following any link.
      adapters[kind](makeInput(kind, { startedAt, finishedAt: observedAt, pages, error: null }))
      const next = nextPage(response.link, kind, config.headSha, page, config.perPage)
      if (next === null) break
      if (page === config.maxPages || count + config.perPage > config.maxRecords) {
        break
      }
    }
    const finishedAt = timestamp(clock())
    results[kind] = adapters[kind](makeInput(kind, { startedAt, finishedAt, pages, error }))
  }
  const evaluatedAt = timestamp(clock())
  const names = ['github', 'linear', 'handoff', 'validation', 'drift', 'queue', 'recommendations']
  const report = (source, render) =>
    render({
      schemaVersion: 1,
      repository: REPO,
      linearWorkspace: 'spectranoir',
      workstream: config.workstream,
      window: config.window,
      evaluatedAt,
      policy: {
        maxAgeSeconds: Object.fromEntries(names.map((name) => [name, config.maxAgeSeconds])),
        expectedRevisions: Object.fromEntries(names.map((name) => [name, null])),
        futureToleranceSeconds: 0,
        maxRecordsPerSource: config.maxRecords,
      },
      sources: { github: source },
    })
  return {
    pr: {
      ...results.pr,
      markdown: report(results.pr.source, renderEngineeringSummary),
      html: report(results.pr.source, renderEngineeringSummaryHtml),
    },
    checks: {
      ...results.checks,
      markdown: report(results.checks.source, renderEngineeringSummary),
      html: report(results.checks.source, renderEngineeringSummaryHtml),
    },
  }
}

async function main() {
  let input = ''
  for await (const chunk of process.stdin) {
    input += chunk
    if (input.length > 16384) throw new Error('input bound')
  }
  const result = await collectGitHubSummary(JSON.parse(input), ghTransport, () =>
    new Date().toISOString()
  )
  process.stdout.write(JSON.stringify(result, null, 2) + '\n')
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    process.stderr.write('Collector failed: invalid input or inconsistent provider response.\n')
    process.exitCode = 1
  })
}
