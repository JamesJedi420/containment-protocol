import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateSessionPreflight as evaluate } from './session-preflight-core.mjs'
import { baseInput, CHECKED_AT } from './session-preflight-test-fixtures.mjs'

const entry = (overrides = {}) => ({
  id: 'current',
  agent: 'Codex',
  sourceRef: 'linear:SPE-3337:description',
  designatedAt: null,
  timestampSourceRef: null,
  supersedes: null,
  ...overrides,
})
const packet = (overrides = {}) => ({
  schemaVersion: 1,
  issueId: 'SPE-3337',
  checkedAt: CHECKED_AT,
  sourceRef: 'linear:SPE-3337',
  entries: [entry()],
  ...overrides,
})
const run = (agentDesignations, overrides = {}) =>
  evaluate(baseInput({ agentDesignations, ...overrides }))

test('designation is a sourced nonexclusive preference, not assignment or execution', () => {
  for (const workstream of ['CP-core', 'Academy', 'shared-system', 'cross-project']) {
    const result = run(packet(), { handoff: { workstream }, linear: { workstream } })
    assert.equal(result.status, 'ready')
    const preference = result.evidence.agentDesignations
    assert.equal(preference.preferredAgent, 'Codex')
    assert.equal(preference.lastDesignationAt, null)
    assert.equal(preference.nonexclusive, true)
    assert.equal(preference.authority, 'preference-only')
    assert.equal(preference.humanAssignment, 'not-derived')
    assert.equal(preference.executorAcceptance, 'unverified')
    assert.equal(preference.sessionActivity, 'unverified')
    assert.ok(result.sources.includes('linear:SPE-3337:description'))
  }
  assert.equal(run(undefined).status, 'ready')
  assert.equal('agentDesignations' in run(undefined).evidence, false)
})

test('explicit supersession preserves unknown history and uses only evidenced UTC time', () => {
  const input = packet({
    entries: [
      entry({ id: 'old', agent: 'Cursor' }),
      entry({
        supersedes: 'old',
        designatedAt: '2026-11-02T00:00:00Z',
        timestampSourceRef: 'linear:SPE-3337:comment:dated',
      }),
    ],
  })
  const result = run(input)
  assert.equal(result.status, 'ready')
  const preference = result.evidence.agentDesignations
  assert.equal(preference.lastDesignationAt, '2026-11-02T00:00:00Z')
  assert.equal(preference.preferredAgent, 'Codex')
  assert.equal(preference.entries.find((e) => e.id === 'old').designatedAt, null)
  assert.equal(preference.entries.find((e) => e.id === 'old').superseded, true)
  assert.deepEqual(run({ ...input, entries: [...input.entries].reverse() }), result)
  assert.equal(input.entries[0].superseded, undefined)
})

test('optional absent, stale, conflicting or unknown preferences never become execution locks', () => {
  for (const [change, status] of [
    [{ entries: [] }, 'absent'],
    [{ checkedAt: null }, 'unknown'],
    [{ checkedAt: '2026-11-03T03:24:59.999Z' }, 'stale'],
    [{ checkedAt: '2026-11-03T03:30:30.001Z' }, 'from-future'],
    [{ entries: [entry(), entry({ id: 'other', agent: 'Cursor' })] }, 'conflicting'],
  ]) {
    const result = run(packet(change))
    assert.equal(result.status, 'ready')
    assert.equal(result.evidence.agentDesignations.status, status)
    assert.equal(result.evidence.agentDesignations.preferredAgent, null)
    assert.equal(result.evidence.agentDesignations.lastDesignationAt, null)
  }
  assert.equal(
    run(packet({ checkedAt: '2026-11-03T03:25:00.000Z' })).evidence.agentDesignations.status,
    'current'
  )
  assert.equal(
    run(packet(), { observedAt: '2026-11-03T03:30:00.0001Z' }).evidence.agentDesignations.status,
    'unknown'
  )
  const blocked = run(packet(), { linear: { blockerIds: ['SPE-99'] } })
  assert.notEqual(blocked.status, 'ready')
  const conflicting = run(packet({ entries: [entry(), entry({ id: 'other', agent: 'Cursor' })] }), {
    linear: { statusType: 'completed' },
  })
  assert.equal(conflicting.status, 'blocked')
})

test('malformed provenance, invented time and broken supersession fail closed', () => {
  for (const change of [
    { schemaVersion: 2 },
    { issueId: 'SPE-99' },
    { checkedAt: '2026-02-30T00:00:00Z' },
    { checkedAt: '2026-11-03T03:29:00.0001Z' },
    { exclusive: true },
    { entries: [entry(), entry()] },
    { entries: [entry({ supersedes: 'missing' })] },
    { entries: [entry({ supersedes: 'current' })] },
    { entries: [entry({ supersedes: 'old' }), entry({ id: 'old', supersedes: 'current' })] },
    { entries: [entry({ designatedAt: '2026-11-02T00:00:00Z' })] },
    { entries: [entry({ timestampSourceRef: 'invented' })] },
    {
      entries: [
        entry({ designatedAt: '2026-11-04T00:00:00Z', timestampSourceRef: 'linear:future' }),
      ],
    },
    { entries: [entry({ sourceRef: '' })] },
    { entries: [entry({ agent: '' })] },
    {
      entries: [
        entry({
          designatedAt: '2026-11-01T00:00:00Z',
          timestampSourceRef: 'linear:current',
          supersedes: 'middle',
        }),
        entry({ id: 'middle', supersedes: 'old' }),
        entry({
          id: 'old',
          designatedAt: '2026-11-02T00:00:00Z',
          timestampSourceRef: 'linear:old',
        }),
      ],
    },
    {
      entries: [
        entry({
          designatedAt: '2026-11-01T00:00:00Z',
          timestampSourceRef: 'linear:current',
          supersedes: 'old',
        }),
        entry({
          id: 'old',
          designatedAt: '2026-11-02T00:00:00Z',
          timestampSourceRef: 'linear:old',
        }),
      ],
    },
  ]) {
    const result = run(packet(change))
    assert.equal(result.status, 'unknown')
    assert.equal(result.evidence, null)
    assert.deepEqual(result.validationErrors, [
      'agentDesignations evidence is malformed or belongs to another issue',
    ])
  }
})
