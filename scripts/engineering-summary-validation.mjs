// SPE-3512: supplied SPE-3348 reports only; no collection or policy inference.
import { captureValidation } from './engineering-summary-capture.mjs'

const v = captureValidation('engineering-summary-validation')
const states = new Set(['passed', 'failed', 'unavailable', 'skipped', 'selected'])
const workstreams = new Set(['CP-core', 'Academy', 'shared-system', 'cross-project'])
const idPattern = /^[a-z][a-z0-9-]{0,79}$/

function compareText(a, b) {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}
function compareId(a, b) {
  return compareText(a.id, b.id)
}

function validateExecution(report, rowsById, mode) {
  if (mode === 'execution') {
    const expectedMissing = report.requiredIds.flatMap((id) => {
      const row = rowsById.get(id)
      if (!row) return [{ id, reason: 'required-validator-not-executed' }]
      if (row.whenUnavailable === 'fail' && row.status === 'unavailable')
        return [{ id, reason: 'required-validator-unavailable' }]
      if (row.whenUnavailable === 'fail' && row.status === 'skipped')
        return [{ id, reason: 'required-validator-skipped' }]
      return []
    })
    v.requireValue(
      JSON.stringify([...expectedMissing].sort(compareId)) ===
        JSON.stringify(
          report.missingRequired.map(({ id, reason }) => ({ id, reason })).sort(compareId)
        ),
      'missing required conflict'
    )
    v.requireValue(
      report.ok ===
        (expectedMissing.length === 0 &&
          !report.results.some(
            (row) =>
              row.enforcement === 'required' && ['failed', 'unavailable'].includes(row.status)
          )),
      'report status conflict'
    )
  } else {
    v.requireValue(report.missingRequired.length === 0 && report.ok, 'selection report conflict')
  }
}

function validateLists(report, rowsById, mode) {
  const required = new Set(report.requiredIds),
    advisory = new Set(report.advisoryIds),
    exceptions = new Set(report.skippedExceptionIds)
  v.requireValue(
    [...required].every((id) => !advisory.has(id) && !exceptions.has(id)) &&
      [...advisory].every((id) => !exceptions.has(id)),
    'enforcement conflict'
  )
  for (const row of report.results) {
    const expected = required.has(row.id)
      ? 'required'
      : advisory.has(row.id)
        ? 'advisory'
        : exceptions.has(row.id)
          ? 'skipped-exception'
          : null
    v.requireValue(
      expected === row.enforcement &&
        (expected !== 'skipped-exception' || row.status === 'skipped'),
      'enforcement conflict'
    )
  }
  v.requireValue(
    report.missingRequired.every((row) => required.has(row.id)) &&
      new Set(report.missingRequired.map((row) => row.id)).size === report.missingRequired.length,
    'missing required'
  )
  validateExecution(report, rowsById, mode)
  return { required, advisory, exceptions }
}

function normalizeReport(input, evidence, at, sourceRef) {
  const report = input.report
  v.requireValue(
    v.object(report) &&
      report.policyOwner === 'SPE-3348' &&
      Array.isArray(report.results) &&
      report.results.length <= 100000 &&
      Array.isArray(report.requiredIds) &&
      Array.isArray(report.advisoryIds) &&
      Array.isArray(report.skippedExceptionIds) &&
      Array.isArray(report.missingRequired) &&
      typeof report.ok === 'boolean',
    'report'
  )
  const ids = new Set(),
    rowsById = new Map()
  const records = report.results
    .map((row) => {
      v.requireValue(
        v.object(row) &&
          typeof row.id === 'string' &&
          idPattern.test(row.id) &&
          !ids.has(row.id) &&
          states.has(row.status) &&
          ['required', 'advisory', 'skipped-exception'].includes(row.enforcement) &&
          ['fail', 'skip', 'report-unavailable'].includes(row.whenUnavailable),
        'result'
      )
      ids.add(row.id)
      rowsById.set(row.id, row)
      v.requireValue(
        input.mode === 'selection'
          ? !['passed', 'failed'].includes(row.status)
          : row.status !== 'selected',
        'mode/status'
      )
      return {
        id: row.id,
        kind: 'validation',
        state: row.status,
        workstream: evidence.workstream,
        at,
        revision: input.revision,
        sourceRef,
      }
    })
    .sort(compareId)
  for (const key of ['requiredIds', 'advisoryIds', 'skippedExceptionIds']) {
    v.requireValue(
      report[key].length <= 100000 &&
        report[key].every((id) => typeof id === 'string' && idPattern.test(id)) &&
        new Set(report[key]).size === report[key].length,
      key
    )
  }
  v.requireValue(
    report.missingRequired.length <= 100000 &&
      report.missingRequired.every(
        (row) =>
          v.object(row) &&
          typeof row.id === 'string' &&
          idPattern.test(row.id) &&
          [
            'required-validator-not-executed',
            'required-validator-unavailable',
            'required-validator-skipped',
          ].includes(row.reason)
      ),
    'missing required'
  )
  const lists = validateLists(report, rowsById, input.mode)
  return { records, ...lists }
}

export function adaptValidationReport(input) {
  v.fields(
    input,
    [
      'repository',
      'linearWorkspace',
      'window',
      'observedAt',
      'revision',
      'sourceRef',
      'workstreamEvidence',
      'mode',
      'report',
      'lastSuccess',
      'currentError',
    ],
    'envelope'
  )
  v.fields(input.repository, ['fullName'], 'repository')
  v.requireValue(
    typeof input.repository.fullName === 'string' &&
      /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(input.repository.fullName) &&
      typeof input.linearWorkspace === 'string' &&
      /^[a-z0-9-]{1,100}$/.test(input.linearWorkspace),
    'identity'
  )
  v.fields(input.window, ['start', 'end'], 'window')
  const start = v.timestamp(input.window.start),
    end = v.timestamp(input.window.end),
    at = v.timestamp(input.observedAt)
  v.requireValue(start < end && end <= at && v.revision(input.revision), 'time/revision')
  const sourceRef = v.reference(input.sourceRef, input)
  v.requireValue(['execution', 'selection'].includes(input.mode), 'mode')
  v.fields(
    input.workstreamEvidence,
    ['workstream', 'revision', 'checkedAt', 'sourceRef'],
    'workstream evidence'
  )
  const evidence = input.workstreamEvidence
  v.requireValue(evidence.workstream === null || workstreams.has(evidence.workstream), 'workstream')
  v.requireValue(evidence.revision === null || v.revision(evidence.revision), 'workstream revision')
  v.requireValue(evidence.workstream === null || evidence.revision !== null, 'workstream revision')
  v.requireValue(v.timestamp(evidence.checkedAt) <= at, 'workstream time')
  const workstreamRef = v.reference(evidence.sourceRef, input)
  let lastSuccess = null
  if (input.lastSuccess !== null) {
    v.fields(input.lastSuccess, ['checkedAt', 'revision', 'sourceRef'], 'last success')
    const checkedAt = v.timestamp(input.lastSuccess.checkedAt)
    v.requireValue(checkedAt <= at && v.revision(input.lastSuccess.revision), 'last success')
    lastSuccess = {
      checkedAt,
      revision: input.lastSuccess.revision,
      sourceRef: v.reference(input.lastSuccess.sourceRef, input),
    }
  }
  if (input.currentError !== null) {
    v.fields(input.currentError, ['code'], 'error')
    v.requireValue(
      [
        'not-collected',
        'partial-response',
        'incomplete-coverage',
        'http-401',
        'http-403',
        'http-429',
        'http-error',
        'timeout',
        'network',
      ].includes(input.currentError.code),
      'error'
    )
  }
  const coverage = {
    complete: false,
    paginationComplete: false,
    window: { start, end },
    workstreams: [],
  }
  if (input.report === null) {
    v.requireValue(input.currentError !== null, 'missing report error')
    return {
      source: {
        authority: 'SPE-3348',
        status: 'unavailable',
        checkedAt: at,
        revision: null,
        sourceRef,
        coverage,
        records: null,
        lastSuccess,
        currentError: { code: input.currentError.code },
      },
      provenance: {
        mode: input.mode,
        workstreamEvidence: {
          ...evidence,
          checkedAt: v.timestamp(evidence.checkedAt),
          sourceRef: workstreamRef,
        },
        results: [],
        missingRequired: [],
      },
    }
  }
  v.requireValue(
    input.currentError === null ||
      ['partial-response', 'incomplete-coverage'].includes(input.currentError.code),
    'report/error conflict'
  )
  const report = input.report
  const { records, required, advisory, exceptions } = normalizeReport(
    input,
    evidence,
    at,
    sourceRef
  )
  return {
    source: {
      authority: 'SPE-3348',
      status: 'partial',
      checkedAt: at,
      revision: input.revision,
      sourceRef,
      coverage,
      records,
      lastSuccess,
      currentError:
        input.currentError === null
          ? { code: 'incomplete-coverage' }
          : { code: input.currentError.code },
    },
    provenance: {
      mode: input.mode,
      reportOk: report.ok,
      requiredIds: [...required].sort(compareText),
      advisoryIds: [...advisory].sort(compareText),
      skippedExceptionIds: [...exceptions].sort(compareText),
      workstreamEvidence: {
        ...evidence,
        checkedAt: v.timestamp(evidence.checkedAt),
        sourceRef: workstreamRef,
      },
      results: report.results
        .map(({ id, enforcement, whenUnavailable }) => ({ id, enforcement, whenUnavailable }))
        .sort(compareId),
      missingRequired: report.missingRequired
        .map(({ id, reason }) => ({ id, reason }))
        .sort(compareId),
    },
  }
}
