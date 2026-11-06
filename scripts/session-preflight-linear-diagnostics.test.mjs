import assert from 'node:assert/strict'
import test from 'node:test'
import { createLinearMcpDiagnostic as create } from './session-preflight-linear-diagnostics.mjs'
import { evaluateSessionPreflight as evaluate } from './session-preflight-core.mjs'
import { baseInput, CHECKED_AT } from './session-preflight-test-fixtures.mjs'

const ready = (overrides = {}) =>
  create({
    status: 'ready',
    checkedAt: CHECKED_AT,
    checkedBy: 'Codex',
    evidenceRef: 'linear:SPE-3337',
    ...overrides,
  })

test('fresh shared read diagnostics preserve legacy readiness without write authority', () => {
  for (const workstream of ['CP-core', 'Academy', 'shared-system']) {
    const input = baseInput({ handoff: { workstream }, linear: { workstream }, linearMcp: ready() })
    const result = evaluate(input)
    assert.equal(result.status, 'ready')
    assert.equal(result.evidence.linearMcp.writeCapability, 'unverified')
    assert.equal(result.evidence.linearMcp.readOnly, true)
    assert.ok(result.sources.includes('linear:SPE-3337'))
    assert.deepEqual(evaluate(input), result)
  }
  assert.equal(evaluate(baseInput()).status, 'ready')
  assert.equal('linearMcp' in evaluate(baseInput()).evidence, false)
})

test('failure classes and unchecked probes remain unavailable with fixed recovery', () => {
  for (const failureCode of [
    'authentication-missing',
    'authentication-expired',
    'configuration-missing',
    'permission-denied',
    'timeout',
    'service-failure',
    'unknown',
  ]) {
    const status = failureCode.startsWith('authentication-') ? 'needsAuth' : 'failed'
    const result = evaluate(baseInput({ linearMcp: ready({ status, failureCode }) }))
    assert.equal(result.status, 'unknown')
    assert.ok(result.reasons.some((r) => r.code === 'linear_mcp_unavailable'))
    assert.equal(result.evidence.linearMcp.failureCode, failureCode)
  }
  const result = evaluate(baseInput({ linearMcp: create() }))
  assert.equal(result.status, 'unknown')
  assert.equal(result.evidence.linearMcp.checkedAt, null)
  assert.equal(result.evidence.linearMcp.operationChecked, 'none')
})

test('stale, future, conflicting issue and failed authoritative reads fail closed', () => {
  for (const [overrides, code] of [
    [{ checkedAt: '2026-11-03T03:24:59.999Z' }, 'linear_mcp_stale'],
    [{ checkedAt: '2026-11-03T03:30:30.001Z' }, 'linear_mcp_from_future'],
    [{ evidenceRef: 'linear:SPE-999' }, 'linear_mcp_evidence_conflict'],
  ]) {
    const result = evaluate(baseInput({ linearMcp: ready(overrides) }))
    assert.equal(result.status, 'unknown')
    assert.ok(result.reasons.some((r) => r.code === code))
  }
  const result = evaluate(baseInput({ linearMcp: ready(), linear: { collectionStatus: 'failed' } }))
  assert.ok(result.reasons.some((r) => r.code === 'linear_mcp_evidence_conflict'))
  assert.equal(
    evaluate(baseInput({ linearMcp: ready({ checkedAt: '2026-11-03T03:25:00.000Z' }) })).status,
    'ready'
  )
})

test('malformed or secret-bearing metadata is rejected without echoing values', () => {
  const secret = 'private-credential-example'
  for (const change of [
    { schemaVersion: 2 },
    { status: 'approved' },
    { operationChecked: 'write' },
    { status: 'unchecked' },
    { failureCode: 'timeout' },
    { checkedBy: secret },
    { checkedAt: '2026-02-30T03:29:30Z' },
    { retryGuidance: secret },
    { evidenceRef: `https://example.invalid/?token=${secret}` },
    { rawError: secret },
    { evidenceRef: null },
    { evidenceRef: ['linear:SPE-3337'] },
  ]) {
    const result = evaluate(baseInput({ linearMcp: { ...ready(), ...change } }))
    assert.equal(result.status, 'unknown')
    assert.equal(result.evidence, null)
    assert.ok(!JSON.stringify(result).includes(secret))
  }
  assert.throws(() => ready({ failureCode: 'invented' }), /Invalid Linear read observation/)
})
