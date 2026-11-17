import test from 'node:test'
import assert from 'node:assert/strict'
import { AUDIT_ARGS, evaluateAuditResult, runDependencyAudit } from './dependency-audit.mjs'

function result(counts = {}, processFields = {}) {
  const vulnerabilities = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, ...counts }
  vulnerabilities.total = Object.values(vulnerabilities).reduce((sum, n) => sum + n, 0)
  return {
    status: 0,
    signal: null,
    stdout: JSON.stringify({
      auditReportVersion: 2,
      vulnerabilities: {},
      metadata: { vulnerabilities },
    }),
    ...processFields,
  }
}

test('moderate-or-higher findings fail even if the tool incorrectly exits zero', () => {
  assert.equal(evaluateAuditResult(result()).ok, true)
  assert.equal(evaluateAuditResult(result({ low: 2, info: 1 })).ok, true)
  for (const level of ['moderate', 'high', 'critical']) {
    assert.equal(evaluateAuditResult(result({ [level]: 1 })).ok, false)
  }
})

test('native failure exits and registry/spawn/timeout/signal failures never pass', () => {
  for (const fields of [
    { status: 1 },
    { status: 2 },
    { status: 127 },
    { status: null },
    { status: null, error: { code: 'ENOENT' } },
    { status: null, error: { code: 'ETIMEDOUT' } },
    { signal: 'SIGTERM' },
    { stdout: JSON.stringify({ error: { code: 'E503' } }) },
  ])
    assert.equal(evaluateAuditResult(result({}, fields)).ok, false)
})

test('empty, invalid, missing, inconsistent and malformed audit output fails closed', () => {
  const valid = JSON.parse(result().stdout)
  const reports = [
    '',
    'not json',
    'null',
    '[]',
    '{}',
    '{"metadata":{}}',
    JSON.stringify({ ...valid, error: {} }),
    JSON.stringify({ metadata: valid.metadata }),
    JSON.stringify({ ...valid, vulnerabilities: [] }),
    JSON.stringify({ ...valid, auditReportVersion: 999 }),
    ...[
      { ...valid.metadata.vulnerabilities, total: 1 },
      { ...valid.metadata.vulnerabilities, moderate: -1 },
      { ...valid.metadata.vulnerabilities, critical: '0' },
      { ...valid.metadata.vulnerabilities, high: 0.5 },
      { total: 0 },
    ].map((vulnerabilities) => JSON.stringify({ ...valid, metadata: { vulnerabilities } })),
  ]
  for (const stdout of reports)
    assert.equal(evaluateAuditResult(result({}, { stdout })).ok, false, stdout)
})

test('uses the safe npm launch with lockfile, all dependency classes, threshold and no fixes', () => {
  let captured
  const audit = runDependencyAudit({
    cwd: '/repo',
    launch: { ok: true, command: '/node', args: ['/npm-cli.js'] },
    spawn: (...args) => {
      captured = args
      return result()
    },
  })
  assert.equal(audit.ok, true)
  assert.equal(captured[0], '/node')
  assert.deepEqual(captured[1], ['/npm-cli.js', ...AUDIT_ARGS])
  for (const type of ['prod', 'dev', 'optional', 'peer'])
    assert.ok(AUDIT_ARGS.includes(`--include=${type}`))
  for (const flag of [
    '--package-lock-only',
    '--audit-level=moderate',
    '--ignore-scripts',
    '--json',
  ])
    assert.ok(AUDIT_ARGS.includes(flag))
  assert.ok(!AUDIT_ARGS.includes('fix'))
  assert.equal(captured[2].cwd, '/repo')
  assert.ok(captured[2].timeout > 0)
  assert.equal(
    runDependencyAudit({
      launch: { ok: false, reason: 'unavailable' },
      spawn: () => assert.fail('must not spawn'),
    }).ok,
    false
  )
  assert.equal(
    runDependencyAudit({
      launch: { ok: true, command: '/npm', args: [] },
      spawn: () => result({}, { status: 1 }),
    }).ok,
    false
  )
})
