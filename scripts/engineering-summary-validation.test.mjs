import test from 'node:test'
import assert from 'node:assert/strict'
import { adaptValidationReport } from './engineering-summary-validation.mjs'
import {
  summarizeEngineeringActivity,
  serializeEngineeringSummary,
  renderEngineeringSummary,
} from './engineering-summary.mjs'

const sha = 'a'.repeat(40)
const make = () => ({
  repository: { fullName: 'JamesJedi420/containment-protocol' },
  linearWorkspace: 'spectranoir',
  window: { start: '2026-11-13T00:00:00Z', end: '2026-11-14T00:00:00Z' },
  observedAt: '2026-11-14T00:00:00Z',
  revision: sha,
  sourceRef: `https://github.com/JamesJedi420/containment-protocol/commit/${sha}`,
  mode: 'selection',
  workstreamEvidence: {
    workstream: 'CP-core',
    revision: sha,
    checkedAt: '2026-11-14T00:00:00Z',
    sourceRef: `https://github.com/JamesJedi420/containment-protocol/commit/${sha}`,
  },
  lastSuccess: null,
  currentError: null,
  report: {
    policyOwner: 'SPE-3348',
    requiredIds: ['lint'],
    advisoryIds: [],
    skippedExceptionIds: [],
    missingRequired: [],
    ok: true,
    results: [
      {
        id: 'lint',
        status: 'selected',
        enforcement: 'required',
        whenUnavailable: 'fail',
        detail: 'secret path',
      },
    ],
  },
})
test('selected stays selected and source remains partial without leaking detail', () => {
  const { source } = adaptValidationReport(make())
  assert.equal(source.records[0].state, 'selected')
  assert.equal(source.status, 'partial')
  assert.equal(source.coverage.complete, false)
  assert.equal(JSON.stringify(source).includes('secret path'), false)
})
test('rejects duplicate identities and conflicting enforcement', () => {
  const input = make()
  input.report.results.push({ ...input.report.results[0] })
  assert.throws(() => adaptValidationReport(input))
  input.report.results.pop()
  input.report.results[0].enforcement = 'advisory'
  assert.throws(() => adaptValidationReport(input))
})
test('missing report is unavailable, never an empty successful capture', () => {
  const input = make()
  input.report = null
  input.currentError = { code: 'not-collected' }
  const { source } = adaptValidationReport(input)
  assert.equal(source.status, 'unavailable')
  assert.equal(source.records, null)
})
test('execution preserves canonical states and enforcement without inventing completeness', () => {
  const input = make()
  input.mode = 'execution'
  input.report.requiredIds = ['lint', 'unit-tests']
  input.report.advisoryIds = ['format-check']
  input.report.skippedExceptionIds = ['playwright-e2e']
  input.report.results = [
    { id: 'lint', status: 'passed', enforcement: 'required', whenUnavailable: 'fail' },
    { id: 'unit-tests', status: 'unavailable', enforcement: 'required', whenUnavailable: 'fail' },
    {
      id: 'format-check',
      status: 'failed',
      enforcement: 'advisory',
      whenUnavailable: 'report-unavailable',
    },
    {
      id: 'playwright-e2e',
      status: 'skipped',
      enforcement: 'skipped-exception',
      whenUnavailable: 'fail',
    },
  ]
  input.report.missingRequired = [{ id: 'unit-tests', reason: 'required-validator-unavailable' }]
  input.report.ok = false
  const { source, provenance } = adaptValidationReport(input)
  assert.deepEqual(
    source.records.map(({ id, state }) => [id, state]),
    [
      ['format-check', 'failed'],
      ['lint', 'passed'],
      ['playwright-e2e', 'skipped'],
      ['unit-tests', 'unavailable'],
    ]
  )
  assert.equal(provenance.results.find((row) => row.id === 'format-check').enforcement, 'advisory')
  assert.deepEqual(provenance.missingRequired, input.report.missingRequired)
  assert.equal(source.coverage.complete, false)
  input.report.ok = true
  assert.throws(() => adaptValidationReport(input), /report status conflict/)
})
test('selection cannot claim execution, and workstream evidence cannot be fabricated', () => {
  const input = make()
  input.report.results[0].status = 'passed'
  assert.throws(() => adaptValidationReport(input), /mode\/status/)
  input.report.results[0].status = 'selected'
  input.workstreamEvidence.revision = null
  assert.throws(() => adaptValidationReport(input), /workstream revision/)
  input.workstreamEvidence.workstream = null
  assert.equal(adaptValidationReport(input).source.records[0].workstream, null)
})
test('actual adapter output survives both existing renderers without a verified zero', () => {
  const source = adaptValidationReport(make()).source
  const names = ['github', 'linear', 'handoff', 'validation', 'drift', 'queue', 'recommendations']
  const input = {
    schemaVersion: 1,
    repository: 'JamesJedi420/containment-protocol',
    linearWorkspace: 'spectranoir',
    workstream: 'CP-core',
    window: make().window,
    evaluatedAt: '2026-11-14T00:00:00Z',
    policy: {
      maxAgeSeconds: Object.fromEntries(names.map((name) => [name, 300])),
      expectedRevisions: Object.fromEntries(names.map((name) => [name, sha])),
      futureToleranceSeconds: 0,
      maxRecordsPerSource: 20,
    },
    sources: { validation: source },
  }
  const summary = summarizeEngineeringActivity(input)
  assert.equal(summary.sources.validation.count, null)
  assert.equal(summary.sources.validation.observations[0].state, 'selected')
  assert.deepEqual(JSON.parse(serializeEngineeringSummary(input)), summary)
  assert.match(renderEngineeringSummary(input), /selected/)
})
test('missing required checks and supplied last success remain explicit', () => {
  const input = make()
  input.mode = 'execution'
  input.report.results = []
  input.report.missingRequired = [{ id: 'lint', reason: 'required-validator-not-executed' }]
  input.report.ok = false
  input.lastSuccess = {
    checkedAt: '2026-11-13T12:00:00Z',
    revision: sha,
    sourceRef: input.sourceRef,
  }
  const result = adaptValidationReport(input)
  assert.equal(result.source.records.length, 0)
  assert.equal(result.source.status, 'partial')
  assert.equal(result.source.lastSuccess.checkedAt, '2026-11-13T12:00:00.000Z')
  assert.deepEqual(result.provenance.requiredIds, ['lint'])
  assert.deepEqual(result.provenance.missingRequired, input.report.missingRequired)
  assert.equal(result.provenance.reportOk, false)
})
test('input order does not change normalized output and inputs are not mutated', () => {
  const input = make()
  input.report.advisoryIds = ['unit-tests']
  input.report.results.push({
    id: 'unit-tests',
    status: 'selected',
    enforcement: 'advisory',
    whenUnavailable: 'fail',
  })
  const before = structuredClone(input)
  const output = adaptValidationReport(input)
  assert.deepEqual(input, before)
  input.report.results.reverse()
  assert.deepEqual(adaptValidationReport(input), output)
})
test('rejects invalid references, future last success, inconsistent missing checks and report/error conflicts', () => {
  const input = make()
  input.sourceRef += '?token=secret'
  assert.throws(() => adaptValidationReport(input), /reference/)
  input.sourceRef = make().sourceRef
  input.lastSuccess = {
    checkedAt: '2026-11-15T00:00:00Z',
    revision: sha,
    sourceRef: input.sourceRef,
  }
  assert.throws(() => adaptValidationReport(input), /last success/)
  input.lastSuccess = null
  input.mode = 'execution'
  input.report.results[0].status = 'passed'
  input.report.missingRequired = [{ id: 'lint', reason: 'required-validator-not-executed' }]
  assert.throws(() => adaptValidationReport(input), /missing required conflict/)
  input.report.missingRequired = []
  input.currentError = { code: 'not-collected' }
  assert.throws(() => adaptValidationReport(input), /report\/error conflict/)
})
