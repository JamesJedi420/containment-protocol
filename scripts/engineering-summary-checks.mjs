// SPE-3512: captured check runs only; no acquisition, clock or persistence.
import { createHash } from 'node:crypto'
import { captureValidation } from './engineering-summary-capture.mjs'

const WORKSTREAMS = new Set(['CP-core', 'Academy', 'shared-system', 'cross-project'])
const ERRORS = new Set([
  'http-401',
  'http-403',
  'http-429',
  'http-error',
  'timeout',
  'network',
  'partial-response',
])
const STATUSES = new Set(['queued', 'in_progress', 'completed', 'waiting', 'requested', 'pending'])
const CONCLUSIONS = new Set([
  'success',
  'failure',
  'neutral',
  'cancelled',
  'skipped',
  'timed_out',
  'action_required',
  'stale',
])
const FAILURES = new Set(['failure', 'timed_out', 'cancelled', 'action_required'])
const {
  object,
  positive,
  nonnegative,
  revision,
  requireValue,
  fields,
  timestamp,
  parseUrl,
  reference,
  paginationLinks,
  validatePageChain,
} = captureValidation('engineering-summary-checks')

function repositoryPaths(input, suffix) {
  return [
    `/repos/${input.repository.fullName}/${suffix}`,
    `/repositories/${input.repository.id}/${suffix}`,
  ]
}
function requestPage(value, input) {
  const url = parseUrl(value)
  requireValue(
    url.hostname === 'api.github.com' &&
      repositoryPaths(input, `commits/${input.scope.headSha}/check-runs`).includes(url.pathname),
    'request repository/head'
  )
  const entries = [...url.searchParams]
  requireValue(
    entries.length === 3 &&
      new Set(entries.map(([key]) => key)).size === 3 &&
      url.searchParams.get('filter') === 'latest' &&
      url.searchParams.get('per_page') === String(input.scope.perPage),
    'request scope'
  )
  const page = url.searchParams.get('page')
  requireValue(/^[1-9]\d*$/.test(page ?? '') && positive(Number(page)), 'page identity')
  return Number(page)
}
function configuration(input) {
  fields(
    input,
    [
      'schemaVersion',
      'provider',
      'repository',
      'linearWorkspace',
      'apiVersion',
      'scope',
      'window',
      'bounds',
      'capture',
      'workstreamEvidence',
      'lastSuccess',
    ],
    'envelope'
  )
  fields(input.repository, ['id', 'fullName'], 'repository')
  requireValue(
    input.schemaVersion === 1 &&
      input.provider === 'github-check-runs' &&
      positive(input.repository.id) &&
      typeof input.repository.fullName === 'string' &&
      /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(input.repository.fullName) &&
      typeof input.linearWorkspace === 'string' &&
      /^[a-z0-9-]{1,100}$/.test(input.linearWorkspace) &&
      ['2022-11-28', '2026-03-10'].includes(input.apiVersion),
    'identity/version'
  )
  fields(input.scope, ['headSha', 'filter', 'perPage'], 'scope')
  requireValue(
    typeof input.scope.headSha === 'string' &&
      /^[a-f0-9]{40}$/.test(input.scope.headSha) &&
      input.scope.filter === 'latest' &&
      positive(input.scope.perPage) &&
      input.scope.perPage <= 100,
    'scope'
  )
  fields(input.bounds, ['maxPages', 'maxRecords'], 'bounds')
  requireValue(
    positive(input.bounds.maxPages) &&
      input.bounds.maxPages <= 10000 &&
      nonnegative(input.bounds.maxRecords) &&
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
    requireValue(
      typeof input.capture.error.code === 'string' &&
        input.capture.error.code.length <= 32 &&
        ERRORS.has(input.capture.error.code),
      'capture error code'
    )
  }
  return { window, startedAt, finishedAt }
}
function mapping(input, startedAt) {
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
  const ids = new Set()
  const assignments = evidence.assignments
    .map((row) => {
      fields(row, ['checkRunId', 'headSha', 'workstream', 'sourceRef'], 'workstream assignment')
      requireValue(
        positive(row.checkRunId) &&
          row.headSha === input.scope.headSha &&
          typeof row.workstream === 'string' &&
          row.workstream.length <= 32 &&
          WORKSTREAMS.has(row.workstream) &&
          !ids.has(row.checkRunId),
        'workstream identity'
      )
      ids.add(row.checkRunId)
      return {
        checkRunId: row.checkRunId,
        headSha: row.headSha,
        workstream: row.workstream,
        sourceRef: reference(row.sourceRef, input),
      }
    })
    .sort((a, b) => a.checkRunId - b.checkRunId)
  return { revision: evidence.revision, checkedAt, assignments }
}
function checkRun(row, input, observedAt) {
  requireValue(
    object(row) &&
      positive(row.id) &&
      row.head_sha === input.scope.headSha &&
      typeof row.status === 'string' &&
      row.status.length <= 32 &&
      STATUSES.has(row.status) &&
      (row.conclusion === null ||
        (typeof row.conclusion === 'string' &&
          row.conclusion.length <= 32 &&
          CONCLUSIONS.has(row.conclusion))),
    'check-run identity/state'
  )
  const url = parseUrl(row.url)
  requireValue(
    url.hostname === 'api.github.com' &&
      !url.search &&
      repositoryPaths(input, `check-runs/${row.id}`).includes(url.pathname),
    'check-run repository'
  )
  requireValue(
    (row.check_suite === null || (object(row.check_suite) && positive(row.check_suite.id))) &&
      (row.app === null || (object(row.app) && positive(row.app.id))),
    'check-run provider identity'
  )
  const startedAt = row.started_at === null ? null : timestamp(row.started_at)
  const completedAt = row.completed_at === null ? null : timestamp(row.completed_at)
  requireValue(
    (startedAt === null || startedAt <= observedAt) &&
      (completedAt === null || completedAt <= observedAt) &&
      (startedAt === null || completedAt === null || startedAt <= completedAt) &&
      (row.status === 'completed'
        ? row.conclusion !== null
        : row.conclusion === null && completedAt === null),
    'check-run time/state'
  )
  return {
    id: row.id,
    headSha: row.head_sha,
    checkSuiteId: row.check_suite?.id ?? null,
    appId: row.app?.id ?? null,
    status: row.status,
    conclusion: row.conclusion,
    startedAt,
    completedAt,
    observedAt,
  }
}
function pages(input, times) {
  let count = 0
  const ids = new Set(),
    totals = new Set()
  const result = input.capture.pages
    .map((page) => {
      fields(page, ['requestUrl', 'observedAt', 'status', 'link', 'data'], 'page')
      const number = requestPage(page.requestUrl, input),
        observedAt = timestamp(page.observedAt)
      requireValue(
        page.status === 200 &&
          observedAt >= times.startedAt &&
          observedAt <= times.finishedAt &&
          object(page.data) &&
          nonnegative(page.data.total_count) &&
          Array.isArray(page.data.check_runs) &&
          page.data.check_runs.length <= input.scope.perPage,
        'page response'
      )
      totals.add(page.data.total_count)
      count += page.data.check_runs.length
      requireValue(
        count <= input.bounds.maxRecords && count <= page.data.total_count,
        'record/total bound'
      )
      const records = page.data.check_runs
        .map((row) => {
          const fact = checkRun(row, input, observedAt)
          requireValue(!ids.has(fact.id), 'duplicate check run')
          ids.add(fact.id)
          return fact
        })
        .sort((a, b) => a.id - b.id)
      return {
        number,
        observedAt,
        totalCount: page.data.total_count,
        ...paginationLinks(page.link, number, (value) => requestPage(value, input)),
        records,
      }
    })
    .sort((a, b) => a.number - b.number)
  requireValue(totals.size <= 1, 'changing provider total')
  validatePageChain(result)
  return result
}
function priorSuccess(input, startedAt) {
  if (input.lastSuccess === null) return null
  const value = input.lastSuccess
  fields(value, ['checkedAt', 'revision', 'sourceRef'], 'last success')
  const checkedAt = timestamp(value.checkedAt)
  requireValue(checkedAt <= startedAt && revision(value.revision), 'last success time/revision')
  return { checkedAt, revision: value.revision, sourceRef: reference(value.sourceRef, input) }
}

/** Only provider-returned latest-filter check-run observations, never all CI. */
export function adaptGitHubCheckRunCapture(input) {
  const times = configuration(input),
    lastSuccess = priorSuccess(input, times.startedAt)
  const workstreamEvidence = mapping(input, times.startedAt)
  const capturedPages = pages(input, times),
    facts = capturedPages.flatMap((page) => page.records)
  const unavailable = input.capture.error !== null || capturedPages.length === 0
  const ids = new Set(facts.map((row) => row.id))
  if (!unavailable)
    for (const row of workstreamEvidence.assignments)
      requireValue(ids.has(row.checkRunId), 'workstream/capture mismatch')
  const sourceRef = `https://github.com/${input.repository.fullName}/commit/${input.scope.headSha}`
  const provenance = {
    schemaVersion: 1,
    provider: 'github-check-runs',
    apiVersion: input.apiVersion,
    repository: { id: input.repository.id, fullName: input.repository.fullName },
    scope: { headSha: input.scope.headSha, filter: 'latest', perPage: input.scope.perPage },
    window: times.window,
    sourceRef,
    capture: {
      startedAt: times.startedAt,
      finishedAt: times.finishedAt,
      error: input.capture.error === null ? null : { code: input.capture.error.code },
      pages: capturedPages,
    },
    workstreamEvidence,
    returnedSubsetPaginationComplete:
      !unavailable &&
      capturedPages.at(-1).nextPage === null &&
      facts.length === capturedPages[0].totalCount,
    unmappedConclusionIds: facts
      .filter((row) => row.conclusion === 'stale')
      .map((row) => row.id)
      .sort((a, b) => a - b),
    atomicSnapshot: false,
    allCiCoverage: false,
    mergedPrsCollected: false,
  }
  const digest = createHash('sha256').update(JSON.stringify(provenance), 'utf8').digest('hex')
  const mapped = new Map(
    workstreamEvidence.assignments.map((row) => [row.checkRunId, row.workstream])
  )
  const records = facts
    .filter((row) => row.status === 'completed' && FAILURES.has(row.conclusion))
    .sort((a, b) => a.id - b.id)
    .map((row) => ({
      id: `CHECK-${row.id}`,
      kind: 'ci-failure',
      state: row.conclusion.toUpperCase(),
      workstream: mapped.get(row.id) ?? null,
      at: row.observedAt,
      revision: digest,
      sourceRef,
    }))
  return {
    source: {
      authority: 'GitHub',
      status: unavailable ? 'unavailable' : 'partial',
      checkedAt: times.finishedAt,
      revision: unavailable ? null : digest,
      sourceRef,
      coverage: {
        complete: false,
        paginationComplete: false,
        window: { ...times.window },
        workstreams: [],
      },
      records: unavailable ? null : records,
      lastSuccess,
      currentError: {
        code:
          input.capture.error?.code ??
          (capturedPages.length === 0 ? 'not-collected' : 'incomplete-coverage'),
      },
    },
    provenance: { ...provenance, revision: digest },
  }
}
