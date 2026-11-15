// SPE-3512: supplied snapshots only. No network, clock, persistence or work selection.
import { projectApprovedWork, filterWorkstream } from './project-approved-work.mjs'

const AUTHORITIES = Object.freeze({
  github: 'GitHub',
  linear: 'Linear',
  handoff: 'SPE-3337',
  validation: 'SPE-3348',
  drift: 'SPE-3276',
  queue: 'SPE-3338',
  recommendations: 'SPE-3339',
})
const KINDS = {
  github: ['merged-pr', 'ci-failure'],
  linear: ['blocker', 'decision'],
  handoff: ['handoff'],
  validation: ['validation'],
  drift: ['drift'],
  recommendations: ['recommendation'],
}
const STATES = {
  'merged-pr': ['merged'],
  'ci-failure': ['FAILURE', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED'],
  blocker: ['backlog', 'unstarted', 'started'],
  decision: ['awaiting-design', 'awaiting-approval'],
  handoff: ['ready', 'blocked', 'unknown'],
  validation: ['passed', 'failed', 'unavailable', 'skipped', 'selected'],
  drift: [
    'unstarted',
    'partial',
    'merged',
    'current-main',
    'superseded',
    'missing',
    'evidence-conflicted',
  ],
  recommendation: ['recommended'],
}
const WORKSTREAMS = ['CP-core', 'Academy', 'shared-system', 'cross-project']
const ERRORS = [
  'http-401',
  'http-403',
  'http-429',
  'http-error',
  'timeout',
  'network',
  'partial-response',
  'incomplete-coverage',
  'unimplemented',
  'not-collected',
]
function compare(a, b) {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const revision = (value) =>
  typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value)
const integer = (value) => Number.isSafeInteger(value) && value >= 0
const requireValue = (condition, field) => {
  if (!condition) throw new Error(`engineering-summary: invalid ${field}`)
}

function keys(value, required, optional, field) {
  requireValue(object(value), field)
  requireValue(
    required.every((key) => Object.hasOwn(value, key)),
    field
  )
  requireValue(
    Object.keys(value).every((key) => required.includes(key) || optional.includes(key)),
    field
  )
}

function instant(value) {
  requireValue(
    typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value),
    'timestamp'
  )
  const time = Date.parse(value)
  requireValue(Number.isFinite(time), 'timestamp')
  // Date.parse normalizes impossible days. Validate the local calendar first.
  const day = value.slice(0, 10)
  requireValue(new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day, 'calendar date')
  return time
}

function reference(value, input) {
  requireValue(typeof value === 'string' && value.length <= 2048, 'source reference')
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('engineering-summary: invalid source reference')
  }
  requireValue(
    url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash,
    'source reference'
  )
  const github =
    url.hostname === 'github.com' &&
    url.pathname.startsWith(`/${input.repository}/`) &&
    /^\/(?:[A-Za-z0-9_.-]+\/){2}(?:pull\/\d+|commit\/[a-f0-9]{40}|actions\/runs\/\d+|blob\/[a-f0-9]{40}\/[A-Za-z0-9_./-]+)$/.test(
      url.pathname
    )
  const linear =
    url.hostname === 'linear.app' &&
    new RegExp(`^/${input.linearWorkspace}/issue/SPE-[1-9]\\d*(?:/[a-z0-9-]+)?$`).test(url.pathname)
  requireValue(
    (github || linear) && !url.pathname.split('/').some((part) => part === '..' || part === '.'),
    'source reference'
  )
  return url.href
}

function validateInput(input) {
  keys(
    input,
    [
      'schemaVersion',
      'repository',
      'linearWorkspace',
      'workstream',
      'window',
      'evaluatedAt',
      'policy',
      'sources',
    ],
    [],
    'envelope'
  )
  requireValue(
    input.schemaVersion === 1 &&
      typeof input.repository === 'string' &&
      typeof input.linearWorkspace === 'string' &&
      /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(input.repository) &&
      /^[a-z0-9-]{1,100}$/.test(input.linearWorkspace),
    'identity/version'
  )
  requireValue(WORKSTREAMS.includes(input.workstream), 'workstream')
  keys(input.window, ['start', 'end'], [], 'window')
  const start = instant(input.window.start),
    end = instant(input.window.end),
    now = instant(input.evaluatedAt)
  requireValue(start < end && end <= now, 'reporting window')
  keys(
    input.policy,
    ['maxAgeSeconds', 'expectedRevisions', 'futureToleranceSeconds', 'maxRecordsPerSource'],
    [],
    'policy'
  )
  requireValue(
    integer(input.policy.futureToleranceSeconds) &&
      integer(input.policy.maxRecordsPerSource) &&
      input.policy.maxRecordsPerSource <= 100000,
    'resource/clock policy'
  )
  keys(input.policy.maxAgeSeconds, Object.keys(AUTHORITIES), [], 'freshness policy')
  keys(input.policy.expectedRevisions, Object.keys(AUTHORITIES), [], 'revision policy')
  for (const name of Object.keys(AUTHORITIES)) {
    requireValue(integer(input.policy.maxAgeSeconds[name]), 'freshness policy')
    requireValue(
      input.policy.expectedRevisions[name] === null ||
        revision(input.policy.expectedRevisions[name]),
      'revision policy'
    )
  }
  keys(input.sources, [], Object.keys(AUTHORITIES), 'sources')
  return { start, end, now }
}

function metadata(value, input) {
  keys(value, ['checkedAt', 'revision', 'sourceRef'], [], 'last-success metadata')
  requireValue(revision(value.revision), 'last-success revision')
  return {
    checkedAt: new Date(instant(value.checkedAt)).toISOString(),
    revision: value.revision,
    sourceRef: reference(value.sourceRef, input),
  }
}

function validateSource(name, source, input) {
  keys(
    source,
    [
      'authority',
      'status',
      'checkedAt',
      'revision',
      'sourceRef',
      'coverage',
      'records',
      'lastSuccess',
      'currentError',
    ],
    ['snapshot'],
    'source'
  )
  requireValue(
    source.authority === AUTHORITIES[name] &&
      ['ready', 'partial', 'unavailable', 'conflicted'].includes(source.status),
    'source authority/status'
  )
  instant(source.checkedAt)
  reference(source.sourceRef, input)
  requireValue(source.revision === null || revision(source.revision), 'source revision')
  keys(source.coverage, ['complete', 'paginationComplete', 'window', 'workstreams'], [], 'coverage')
  requireValue(
    typeof source.coverage.complete === 'boolean' &&
      typeof source.coverage.paginationComplete === 'boolean',
    'coverage flags'
  )
  keys(source.coverage.window, ['start', 'end'], [], 'coverage window')
  requireValue(
    instant(source.coverage.window.start) <= instant(source.coverage.window.end),
    'coverage window'
  )
  requireValue(
    Array.isArray(source.coverage.workstreams) &&
      source.coverage.workstreams.every((value) => WORKSTREAMS.includes(value)) &&
      new Set(source.coverage.workstreams).size === source.coverage.workstreams.length,
    'coverage workstreams'
  )
  if (source.lastSuccess !== null) metadata(source.lastSuccess, input)
  if (source.currentError !== null) {
    keys(source.currentError, ['code'], [], 'current error')
    requireValue(ERRORS.includes(source.currentError.code), 'current error code')
  }
  if (name === 'queue' || source.status === 'unavailable')
    requireValue(source.records === null, 'unavailable/queue records')
  else
    requireValue(
      Array.isArray(source.records) && source.records.length <= input.policy.maxRecordsPerSource,
      'record bound'
    )
  requireValue(name === 'queue' || source.snapshot === undefined, 'snapshot owner')
}

function normalizeRecord(record, name, input) {
  keys(
    record,
    ['id', 'kind', 'state', 'workstream', 'at', 'revision', 'sourceRef'],
    ['position'],
    'record'
  )
  requireValue(
    KINDS[name].includes(record.kind) && STATES[record.kind].includes(record.state),
    'record kind/state'
  )
  const idPatterns = {
    'merged-pr': /^PR-[1-9]\d*$/,
    'ci-failure': /^CHECK-[1-9]\d*$/,
    validation: /^[a-z][a-z0-9-]{0,79}$/,
  }
  const idPattern = idPatterns[record.kind] ?? /^SPE-[1-9]\d*$/
  requireValue(typeof record.id === 'string' && idPattern.test(record.id), 'record identity')
  requireValue(
    record.workstream === null || WORKSTREAMS.includes(record.workstream),
    'record workstream'
  )
  requireValue(revision(record.revision), 'record revision')
  if (name === 'recommendations') requireValue(integer(record.position), 'recommendation position')
  else requireValue(record.position === undefined, 'recommendation owner')
  return {
    id: record.id,
    kind: record.kind,
    state: record.state,
    workstream: record.workstream,
    at: new Date(instant(record.at)).toISOString(),
    revision: record.revision,
    sourceRef: reference(record.sourceRef, input),
    ...(name === 'recommendations' ? { position: record.position } : {}),
  }
}

function stale(time, name, input, times) {
  const age = times.now - instant(time)
  return (
    age > input.policy.maxAgeSeconds[name] * 1000 ||
    age < -input.policy.futureToleranceSeconds * 1000
  )
}

function coverageReasons(source, input, times, reasons) {
  if (
    !source.coverage.complete ||
    !source.coverage.paginationComplete ||
    !source.coverage.workstreams.includes(input.workstream) ||
    instant(source.coverage.window.start) > times.start ||
    instant(source.coverage.window.end) < times.end
  )
    reasons.push('incomplete-coverage')
  if (
    instant(source.coverage.window.end) >
    instant(source.checkedAt) + input.policy.futureToleranceSeconds * 1000
  )
    reasons.push('coverage-time-conflict')
}

function sourceReasons(name, source, input, times) {
  const reasons = []
  if (source.status !== 'ready') reasons.push(source.status)
  coverageReasons(source, input, times, reasons)
  if (stale(source.checkedAt, name, input, times)) reasons.push('stale')
  if (source.revision === null || input.policy.expectedRevisions[name] === null)
    reasons.push('unverified-revision')
  else if (source.revision !== input.policy.expectedRevisions[name])
    reasons.push('revision-conflict')
  if (source.currentError !== null)
    reasons.push(source.status === 'ready' ? 'status-error-conflict' : 'current-error')
  if (source.lastSuccess && instant(source.lastSuccess.checkedAt) > instant(source.checkedAt))
    reasons.push('last-success-conflict')
  return reasons
}

function recordReasons(record, name, source, input, times, seen, positions, reasons) {
  const key = `${record.kind}:${record.id}`
  if (seen.has(key)) reasons.push('duplicate-record')
  seen.add(key)
  if (record.revision !== source.revision) reasons.push('revision-conflict')
  if (record.workstream === null) reasons.push('unknown-workstream')
  if (instant(record.at) > instant(source.checkedAt) + input.policy.futureToleranceSeconds * 1000)
    reasons.push('record-time-conflict')
  if (record.kind !== 'merged-pr' && stale(record.at, name, input, times)) reasons.push('stale')
  if (name === 'recommendations' && positions.has(record.position))
    reasons.push('duplicate-position')
  positions.add(record.position)
}

function scopedRecords(name, source, input, times, reasons) {
  const records = source.records.map((record) => normalizeRecord(record, name, input))
  const seen = new Set(),
    positions = new Set()
  for (const record of records)
    recordReasons(record, name, source, input, times, seen, positions, reasons)
  if (
    name === 'drift' &&
    records.some(
      (record) => record.workstream === input.workstream && record.state === 'evidence-conflicted'
    )
  )
    reasons.push('supplied-evidence-conflict')
  return records
    .filter(
      (record) =>
        record.workstream === input.workstream &&
        (record.kind !== 'merged-pr' ||
          (instant(record.at) >= times.start && instant(record.at) < times.end))
    )
    .sort((a, b) =>
      name === 'recommendations'
        ? a.position - b.position
        : compare(JSON.stringify(a), JSON.stringify(b))
    )
}

function queueEvidence(source, input, times, reasons) {
  requireValue(
    source.snapshot &&
      Array.isArray(source.snapshot.issues) &&
      source.snapshot.issues.length <= input.policy.maxRecordsPerSource,
    'queue snapshot/bound'
  )
  let projection
  try {
    projection = filterWorkstream(projectApprovedWork(source.snapshot), input.workstream)
  } catch {
    throw new Error('engineering-summary: invalid canonical queue snapshot')
  }
  if (stale(source.snapshot.asOf, 'queue', input, times)) reasons.push('stale')
  if (
    instant(source.snapshot.asOf) >
    instant(source.checkedAt) + input.policy.futureToleranceSeconds * 1000
  )
    reasons.push('record-time-conflict')
  return {
    activeIds: projection.active.map((row) => row.id),
    historyIds: projection.history.map((row) => row.id),
    runnableIds: projection.runnable.map((row) => row.id),
  }
}

function health(reasons, count) {
  if (reasons.some((reason) => reason.includes('conflict') || reason.startsWith('duplicate')))
    return 'conflicted'
  if (reasons.includes('unavailable') || reasons.includes('missing-source')) return 'unavailable'
  if (reasons.includes('stale')) return 'stale'
  if (reasons.length) return 'partial'
  return count === 0 ? 'no-events' : 'ready'
}

function summarizeSource(name, source, input, times) {
  if (!source)
    return {
      authority: AUTHORITIES[name],
      status: 'unavailable',
      count: null,
      observedCount: null,
      reasons: ['missing-source'],
      checkedAt: null,
      revision: null,
      sourceRef: null,
      coverage: null,
      lastSuccess: null,
      currentError: null,
      observations: null,
      approvedWork: null,
    }
  validateSource(name, source, input)
  const reasons = sourceReasons(name, source, input, times)
  let observations = null,
    approvedWork = null
  if (source.status !== 'unavailable') {
    if (name === 'queue') approvedWork = queueEvidence(source, input, times, reasons)
    else observations = scopedRecords(name, source, input, times, reasons)
  }
  const observedCount = approvedWork
    ? approvedWork.activeIds.length
    : (observations?.length ?? null)
  const status = health(reasons, observedCount)
  return {
    authority: AUTHORITIES[name],
    status,
    count: ['ready', 'no-events'].includes(status) ? observedCount : null,
    observedCount,
    reasons: [...new Set(reasons)].sort(compare),
    checkedAt: new Date(instant(source.checkedAt)).toISOString(),
    revision: source.revision,
    sourceRef: reference(source.sourceRef, input),
    coverage: {
      complete: source.coverage.complete,
      paginationComplete: source.coverage.paginationComplete,
      window: {
        start: new Date(instant(source.coverage.window.start)).toISOString(),
        end: new Date(instant(source.coverage.window.end)).toISOString(),
      },
      workstreams: [...source.coverage.workstreams].sort(compare),
    },
    lastSuccess: source.lastSuccess ? metadata(source.lastSuccess, input) : null,
    currentError: source.currentError ? { code: source.currentError.code } : null,
    observations,
    approvedWork: ['ready', 'no-events'].includes(status) ? approvedWork : null,
  }
}

function qualifyRecommendations(sources) {
  const recommendations = sources.recommendations
  if (!['ready', 'no-events'].includes(recommendations.status)) return
  const runnable = sources.queue.approvedWork?.runnableIds
  if (
    !runnable ||
    !['ready', 'no-events'].includes(sources.drift.status) ||
    recommendations.observations.some((record) => !runnable.includes(record.id))
  ) {
    recommendations.status = 'conflicted'
    recommendations.count = null
    recommendations.reasons.push('queue-qualification-conflict')
    recommendations.observations = []
  }
}

function overallHealth(sources) {
  const statuses = Object.values(sources).map((source) => source.status)
  if (statuses.includes('conflicted')) return 'conflicted'
  if (statuses.includes('stale')) return 'stale'
  if (statuses.every((value) => value === 'unavailable')) return 'unavailable'
  if (statuses.some((value) => !['ready', 'no-events'].includes(value))) return 'partial'
  if (statuses.every((value) => value === 'no-events')) return 'no-events'
  return 'ready'
}

export function summarizeEngineeringActivity(input) {
  const times = validateInput(input)
  const sources = Object.fromEntries(
    Object.keys(AUTHORITIES).map((name) => [
      name,
      summarizeSource(name, input.sources[name], input, times),
    ])
  )
  qualifyRecommendations(sources)
  const status = overallHealth(sources)
  return {
    schemaVersion: 1,
    informationalOnly: true,
    repository: input.repository,
    workstream: input.workstream,
    window: { start: new Date(times.start).toISOString(), end: new Date(times.end).toISOString() },
    evaluatedAt: new Date(times.now).toISOString(),
    policy: {
      maxAgeSeconds: Object.fromEntries(
        Object.keys(AUTHORITIES).map((name) => [name, input.policy.maxAgeSeconds[name]])
      ),
      expectedRevisions: Object.fromEntries(
        Object.keys(AUTHORITIES).map((name) => [name, input.policy.expectedRevisions[name]])
      ),
      futureToleranceSeconds: input.policy.futureToleranceSeconds,
      maxRecordsPerSource: input.policy.maxRecordsPerSource,
    },
    status,
    sources,
  }
}

export function serializeEngineeringSummary(input) {
  return JSON.stringify(summarizeEngineeringActivity(input), null, 2) + '\n'
}

export function renderEngineeringSummary(input) {
  const summary = summarizeEngineeringActivity(input)
  const lines = [
    '# Engineering activity summary',
    '',
    `Workstream: ${summary.workstream}`,
    `Window: ${summary.window.start} ≤ mergedAt < ${summary.window.end}`,
    `Evaluated: ${summary.evaluatedAt}`,
    `Evidence coverage: ${summary.status}`,
    'Informational only; Linear and GitHub remain authoritative.',
    '',
  ]
  for (const [name, source] of Object.entries(summary.sources)) {
    lines.push(...sourceLines(name, source))
  }
  return lines.join('\n')
}

function sourceLines(name, source) {
  const lines = []
  lines.push(
    `## ${name} (${source.authority})`,
    `Status: ${source.status}; count: ${source.count === null ? 'unknown' : source.count}`
  )
  if (source.reasons.length) lines.push(`Reasons: ${source.reasons.join(', ')}`)
  if (source.sourceRef)
    lines.push(`Source: ${source.sourceRef}; revision: ${source.revision ?? 'unknown'}`)
  if (source.checkedAt) lines.push(`Observed: ${source.checkedAt}`)
  if (source.currentError) lines.push(`Current error: ${source.currentError.code}`)
  if (source.lastSuccess)
    lines.push(
      `Last successful refresh: ${source.lastSuccess.checkedAt}; revision: ${source.lastSuccess.revision}; source: ${source.lastSuccess.sourceRef}`
    )
  if (source.observations?.length) lines.push('')
  for (const row of source.observations ?? [])
    lines.push(
      `- ${row.kind} ${row.id}: ${row.state}; ${row.at}; revision: ${row.revision}; ${row.sourceRef}`
    )
  if (source.observations?.length) lines.push('')
  if (source.approvedWork)
    lines.push(
      `Canonical runnable IDs (supplied priority order): ${source.approvedWork.runnableIds.join(', ') || '(none)'}`
    )
  lines.push('')
  return lines
}
