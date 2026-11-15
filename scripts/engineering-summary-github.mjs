// SPE-3512: normalize supplied JSON captures only; never acquire or persist evidence.
import { createHash } from 'node:crypto'
import { captureValidation } from './engineering-summary-capture.mjs'

const WORKSTREAMS = ['CP-core', 'Academy', 'shared-system', 'cross-project']
const FAILURE_CODES = [
  'http-401',
  'http-403',
  'http-429',
  'http-error',
  'timeout',
  'network',
  'partial-response',
]
const {
  object,
  positive,
  revision,
  requireValue,
  fields,
  timestamp,
  parseUrl,
  reference,
  paginationLinks,
  validatePageChain,
} = captureValidation('engineering-summary-github')

function requestPage(value, input) {
  const url = parseUrl(value)
  requireValue(
    url.hostname === 'api.github.com' &&
      [
        `/repos/${input.repository.fullName}/pulls`,
        `/repositories/${input.repository.id}/pulls`,
      ].includes(url.pathname),
    'request repository'
  )
  const expected = {
    state: 'closed',
    base: input.scope.baseRef,
    sort: input.scope.sort,
    direction: input.scope.direction,
    per_page: String(input.scope.perPage),
  }
  const entries = [...url.searchParams]
  requireValue(
    entries.length === 6 &&
      new Set(entries.map(([key]) => key)).size === 6 &&
      Object.entries(expected).every(([key, val]) => url.searchParams.get(key) === val),
    'request scope'
  )
  const page = url.searchParams.get('page')
  requireValue(/^[1-9]\d*$/.test(page ?? '') && positive(Number(page)), 'page identity')
  return Number(page)
}
function lastSuccess(value, input) {
  if (value === null) return null
  fields(value, ['checkedAt', 'revision', 'sourceRef'], 'last success')
  requireValue(revision(value.revision), 'last success revision')
  const checkedAt = timestamp(value.checkedAt)
  requireValue(checkedAt <= timestamp(input.capture.startedAt), 'last success time')
  return { checkedAt, revision: value.revision, sourceRef: reference(value.sourceRef, input) }
}
function configuration(input) {
  fields(
    input,
    [
      'schemaVersion',
      'repository',
      'linearWorkspace',
      'apiVersion',
      'scope',
      'window',
      'bounds',
      'sourceRef',
      'capture',
      'workstreamEvidence',
      'lastSuccess',
    ],
    'envelope'
  )
  fields(input.repository, ['id', 'fullName'], 'repository')
  requireValue(
    input.schemaVersion === 1 &&
      positive(input.repository.id) &&
      typeof input.repository.fullName === 'string' &&
      /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(input.repository.fullName) &&
      typeof input.linearWorkspace === 'string' &&
      /^[a-z0-9-]{1,100}$/.test(input.linearWorkspace) &&
      ['2022-11-28', '2026-03-10'].includes(input.apiVersion),
    'identity/version'
  )
  fields(input.scope, ['baseRef', 'sort', 'direction', 'perPage'], 'scope')
  requireValue(
    typeof input.scope.baseRef === 'string' &&
      /^[A-Za-z0-9][A-Za-z0-9_./-]{0,199}$/.test(input.scope.baseRef) &&
      ['created', 'updated'].includes(input.scope.sort) &&
      ['asc', 'desc'].includes(input.scope.direction) &&
      positive(input.scope.perPage) &&
      input.scope.perPage <= 100,
    'scope'
  )
  fields(input.bounds, ['maxPages', 'maxRecords'], 'bounds')
  requireValue(
    positive(input.bounds.maxPages) &&
      input.bounds.maxPages <= 10000 &&
      Number.isSafeInteger(input.bounds.maxRecords) &&
      input.bounds.maxRecords >= 0 &&
      input.bounds.maxRecords <= 100000,
    'bounds'
  )
  fields(input.window, ['start', 'end'], 'window')
  const window = { start: timestamp(input.window.start), end: timestamp(input.window.end) }
  fields(input.capture, ['startedAt', 'finishedAt', 'pages', 'error'], 'capture')
  const startedAt = timestamp(input.capture.startedAt),
    finishedAt = timestamp(input.capture.finishedAt)
  requireValue(
    window.start < window.end && window.end <= startedAt && startedAt <= finishedAt,
    'capture/window time'
  )
  requireValue(
    Array.isArray(input.capture.pages) && input.capture.pages.length <= input.bounds.maxPages,
    'page bound'
  )
  if (input.capture.error !== null) {
    fields(input.capture.error, ['code'], 'capture error')
    requireValue(FAILURE_CODES.includes(input.capture.error.code), 'capture error code')
  }
  return { window, startedAt, finishedAt }
}
function assignments(input, startedAt) {
  const evidence = input.workstreamEvidence
  fields(evidence, ['revision', 'checkedAt', 'assignments'], 'workstream evidence')
  requireValue(evidence.revision === null || revision(evidence.revision), 'workstream revision')
  const checkedAt = timestamp(evidence.checkedAt)
  requireValue(
    checkedAt <= startedAt &&
      Array.isArray(evidence.assignments) &&
      evidence.assignments.length <= input.bounds.maxRecords &&
      (evidence.assignments.length === 0 || evidence.revision !== null),
    'workstream evidence'
  )
  const ids = new Set(),
    numbers = new Set()
  const rows = evidence.assignments
    .map((row) => {
      fields(row, ['pullRequestId', 'number', 'workstream', 'sourceRef'], 'workstream assignment')
      requireValue(
        positive(row.pullRequestId) &&
          positive(row.number) &&
          WORKSTREAMS.includes(row.workstream) &&
          !ids.has(row.pullRequestId) &&
          !numbers.has(row.number),
        'workstream identity'
      )
      ids.add(row.pullRequestId)
      numbers.add(row.number)
      return {
        pullRequestId: row.pullRequestId,
        number: row.number,
        workstream: row.workstream,
        sourceRef: reference(row.sourceRef, input),
      }
    })
    .sort((a, b) => a.number - b.number)
  return { revision: evidence.revision, checkedAt, assignments: rows }
}
function pullRequest(row, input, observedAt) {
  requireValue(
    object(row) &&
      positive(row.id) &&
      positive(row.number) &&
      row.state === 'closed' &&
      row.base?.repo?.id === input.repository.id &&
      row.base.repo.full_name === input.repository.fullName &&
      row.base.ref === input.scope.baseRef,
    'pull request identity/scope'
  )
  const sourceRef = reference(row.html_url, input)
  requireValue(
    sourceRef === `https://github.com/${input.repository.fullName}/pull/${row.number}`,
    'pull request reference'
  )
  const updatedAt = timestamp(row.updated_at)
  const mergedAt = row.merged_at === null ? null : timestamp(row.merged_at)
  requireValue(
    updatedAt <= observedAt &&
      (mergedAt === null || mergedAt <= updatedAt) &&
      (row.merged === undefined || row.merged === (mergedAt !== null)),
    'pull request time/state'
  )
  return { id: row.id, number: row.number, sourceRef, mergedAt, updatedAt }
}
function pages(input, times) {
  let recordCount = 0
  const ids = new Set(),
    numbers = new Set()
  const result = input.capture.pages
    .map((page) => {
      fields(page, ['requestUrl', 'observedAt', 'status', 'link', 'data'], 'page')
      const number = requestPage(page.requestUrl, input),
        observedAt = timestamp(page.observedAt)
      requireValue(
        page.status === 200 &&
          observedAt >= times.startedAt &&
          observedAt <= times.finishedAt &&
          Array.isArray(page.data) &&
          page.data.length <= input.scope.perPage,
        'page response'
      )
      recordCount += page.data.length
      requireValue(recordCount <= input.bounds.maxRecords, 'record bound')
      const records = page.data
        .map((row) => {
          const value = pullRequest(row, input, observedAt)
          requireValue(!ids.has(value.id) && !numbers.has(value.number), 'duplicate pull request')
          ids.add(value.id)
          numbers.add(value.number)
          return value
        })
        .sort((a, b) => a.number - b.number)
      return {
        number,
        observedAt,
        ...paginationLinks(page.link, number, (value) => requestPage(value, input)),
        records,
      }
    })
    .sort((a, b) => a.number - b.number)
  validatePageChain(result)
  return result
}

/** Supplied JSON only. Returns {source, provenance}; never pins expectedRevisions. */
export function adaptGitHubMergedPrCapture(input) {
  const times = configuration(input)
  const sourceRef = reference(input.sourceRef, input)
  requireValue(new URL(sourceRef).hostname === 'github.com', 'source anchor')
  const priorSuccess = lastSuccess(input.lastSuccess, input)
  const workstreamEvidence = assignments(input, times.startedAt)
  const capturedPages = pages(input, times)
  const facts = capturedPages.flatMap((page) => page.records)
  const byId = new Map(facts.map((row) => [row.id, row]))
  const unavailable = input.capture.error !== null || capturedPages.length === 0
  if (!unavailable)
    for (const row of workstreamEvidence.assignments)
      requireValue(
        byId.get(row.pullRequestId)?.number === row.number,
        'workstream/capture mismatch'
      )
  const paginationComplete = !unavailable && capturedPages.at(-1).nextPage === null
  const provenance = {
    schemaVersion: 1,
    apiVersion: input.apiVersion,
    repository: { id: input.repository.id, fullName: input.repository.fullName },
    scope: {
      state: 'closed',
      baseRef: input.scope.baseRef,
      sort: input.scope.sort,
      direction: input.scope.direction,
      perPage: input.scope.perPage,
    },
    sourceRef,
    window: times.window,
    capture: {
      startedAt: times.startedAt,
      finishedAt: times.finishedAt,
      error: input.capture.error === null ? null : { code: input.capture.error.code },
      pages: capturedPages,
    },
    workstreamEvidence,
    mergedPrPaginationComplete: paginationComplete,
    ciCollected: false,
    atomicSnapshot: false,
  }
  const digest = createHash('sha256').update(JSON.stringify(provenance), 'utf8').digest('hex')
  const mapped = new Map(
    workstreamEvidence.assignments.map((row) => [row.pullRequestId, row.workstream])
  )
  const records = facts
    .filter(
      (row) =>
        row.mergedAt !== null &&
        row.mergedAt >= times.window.start &&
        row.mergedAt < times.window.end
    )
    .sort((a, b) => a.number - b.number)
    .map((row) => ({
      id: `PR-${row.number}`,
      kind: 'merged-pr',
      state: 'merged',
      workstream: mapped.get(row.id) ?? null,
      at: row.mergedAt,
      revision: digest,
      sourceRef: row.sourceRef,
    }))
  return {
    source: {
      authority: 'GitHub',
      status: unavailable ? 'unavailable' : 'partial',
      checkedAt: times.startedAt,
      revision: unavailable ? null : digest,
      sourceRef,
      // GitHub coverage also requires CI failures. PR-only evidence never qualifies it.
      coverage: {
        complete: false,
        paginationComplete: false,
        window: { ...times.window },
        workstreams: [],
      },
      records: unavailable ? null : records,
      lastSuccess: priorSuccess,
      currentError: {
        code:
          input.capture.error?.code ??
          (capturedPages.length === 0 ? 'not-collected' : 'incomplete-coverage'),
      },
    },
    provenance: { ...provenance, revision: digest },
  }
}
