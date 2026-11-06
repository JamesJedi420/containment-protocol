import assert from 'node:assert/strict'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { evaluateSessionPreflight as evaluate } from './session-preflight-core.mjs'
import { renderSessionHandoff } from './session-preflight-presentation.mjs'
import { baseInput, CHECKED_AT } from './session-preflight-test-fixtures.mjs'

const observation = {
  status: 'verified',
  checkedAt: CHECKED_AT,
  sourceRef: 'linear:SPE-3337:verified-observation',
}
const deferral = () => ({
  id: 'deferred',
  summary: 'Remaining approved acceptance',
  sourceRef: 'linear:SPE-3337',
  kind: 'in-boundary-deferral',
  ownerIssueId: 'SPE-3337',
  canonicalOwner: 'CP Tooling',
  deferralReason: 'Separate bounded delivery',
  remainingAcceptance: 'Verify complete handoff',
  closureImpact: 'blocks-completion',
  boundary: {
    ...observation,
    issueId: 'SPE-3337',
    boundaryIssueId: 'SPE-3337',
    canonicalOwner: 'CP Tooling',
    scopeRelation: 'within-approved-boundary',
  },
})
const applied = () => ({
  id: 'discovered',
  summary: 'New durable scope observed',
  sourceRef: 'linear:source-comment',
  kind: 'applied-scope',
  outsideBoundaryReason: 'Outside the named approved outcome',
  provisionalWorkstream: 'shared-system',
  provisionalOwner: 'CP Tooling',
  disposition: 'Applied by authoritative owner',
  phase: 'phase-4',
  authorization: {
    ...observation,
    itemId: 'discovered',
    actor: 'ChatGPT',
    authorityRef: 'linear:SPE-3272:authorization-observation',
    decision: 'authorized',
    issueId: null,
    canonicalOwner: 'CP Tooling',
  },
  application: {
    ...observation,
    itemId: 'discovered',
    outcome: 'applied',
    issueId: 'SPE-999',
    canonicalOwner: 'CP Tooling',
  },
})
const input = (items) => baseInput({ followUps: { schemaVersion: 1, issueId: 'SPE-3337', items } })
const projected = (item) => evaluate(input([item])).evidence.followUps.items[0]

test('portable result retains named boundary separately from lifecycle and implementation', () => {
  const value = input([deferral(), applied()])
  value.github.implementationEvidence.mergedCurrentMain = true
  const result = evaluate(value)
  assert.equal(result.status, 'unknown')
  assert.ok(result.reasons.some((reason) => reason.code === 'lifecycle_evidence_conflict'))
  assert.deepEqual(result.evidence.handoff, value.handoff)
  assert.deepEqual(
    result.evidence.followUps.items.map((x) => x.kind),
    ['in-boundary-deferral', 'applied-scope']
  )
  assert.equal(result.evidence.followUps.authority, 'evidence-projection-only')
  assert.ok(result.sources.includes('linear:SPE-3272:authorization-observation'))
  assert.equal(result.evidence.followUps.items[0].closureImpact, 'blocks-completion')
  assert.equal(result.evidence.linearLifecycle.statusType, 'backlog')
  assert.equal(result.evidence.githubImplementation.mergedCurrentMain, true)
  result.evidence.handoff.blockerIds.push('SPE-99')
  result.evidence.followUps.items[0].boundary.status = 'unverified'
  assert.equal(value.handoff.blockerIds.length, 0)
  assert.equal(value.followUps.items[0].boundary.status, 'verified')
  const reordered = structuredClone(value)
  reordered.followUps.items.reverse()
  assert.deepEqual(evaluate(reordered), evaluate(value))
})

test('same owner and stale or missing scope evidence cannot establish an in-boundary deferral', () => {
  for (const change of [
    null,
    { ...deferral().boundary, status: 'unverified' },
    { ...deferral().boundary, scopeRelation: 'outside-approved-boundary' },
    { ...deferral().boundary, boundaryIssueId: 'SPE-99' },
    { ...deferral().boundary, issueId: 'SPE-99' },
    { ...deferral().boundary, canonicalOwner: 'Another owner' },
    { ...deferral().boundary, checkedAt: '2026-11-03T03:24:59.999Z' },
  ]) {
    const value = deferral()
    value.boundary = change
    assert.equal(projected(value).kind, 'unverified-follow-up')
    assert.equal(evaluate(input([value])).status, 'ready')
  }
})

test('candidate and pending Phase 1 never become applied scope from shared ownership', () => {
  const value = applied()
  value.kind = 'candidate-discovery'
  value.phase = 'phase-1'
  value.disposition = 'Awaiting assessment'
  assert.equal(projected(value).kind, 'candidate-discovery')
  value.kind = 'applied-scope'
  assert.equal(projected(value).kind, 'unverified-follow-up')
  assert.equal(projected(value).reason, 'chatgpt-phase-four-evidence-required')
  for (const actor of ['Cursor', 'Codex', 'human']) {
    value.authorization.actor = actor
    assert.equal(projected(value).kind, 'unverified-follow-up')
  }
  value.authorization.actor = 'Cursor'
  value.phase = 'actor-authorized'
  value.authorization.authorityRef = 'docs/cursor-autonomous-authority.md:verified-observation'
  assert.equal(projected(value).kind, 'applied-scope')
})

test('applied scope needs fresh consistent authorization and actual application observations', () => {
  const mutations = [
    (x) => {
      x.authorization = null
    },
    (x) => {
      x.application = null
    },
    (x) => {
      x.authorization.status = 'contradictory'
    },
    (x) => {
      x.authorization.sourceRef = null
    },
    (x) => {
      x.authorization.decision = 'not-authorized'
    },
    (x) => {
      x.application.outcome = 'not-applied'
    },
    (x) => {
      x.application.issueId = null
    },
    (x) => {
      x.application.canonicalOwner = null
    },
    (x) => {
      x.authorization.checkedAt = '2026-11-03T03:24:59.999Z'
    },
    (x) => {
      x.application.checkedAt = '2026-11-03T03:30:30.001Z'
    },
    (x) => {
      x.authorization.itemId = 'other'
    },
    (x) => {
      x.application.itemId = 'other'
    },
    (x) => {
      x.authorization.issueId = 'SPE-3337'
    },
    (x) => {
      x.authorization.canonicalOwner = 'other'
    },
  ]
  for (const mutate of mutations) {
    const value = applied()
    mutate(value)
    assert.equal(projected(value).kind, 'unverified-follow-up')
  }
  const value = applied()
  value.application.checkedAt = '2026-11-03T03:25:00.000Z'
  assert.equal(projected(value).kind, 'applied-scope')
  const finerTime = input([applied()])
  finerTime.observedAt = '2026-11-03T03:30:00.0001Z'
  assert.equal(evaluate(finerTime).evidence.followUps.items[0].kind, 'unverified-follow-up')
})

test('malformed follow-up claims fail input validation and preserve legacy callers', () => {
  const cases = [
    { schemaVersion: 2, issueId: 'SPE-3337', items: [] },
    { schemaVersion: 1, issueId: 'SPE-99', items: [] },
    { schemaVersion: 1, issueId: 'SPE-3337', items: [deferral(), deferral()] },
  ]
  for (const followUps of cases) assert.equal(evaluate(baseInput({ followUps })).status, 'unknown')
  for (const mutate of [
    (x) => {
      x.boundary.checkedAt = '2026-02-30T00:00:00Z'
    },
    (x) => {
      x.boundary.checkedAt = '2026-11-03T03:00:00.0009Z'
    },
    (x) => {
      x.remainingAcceptance = ''
    },
    (x) => {
      x.approved = true
    },
  ]) {
    const value = deferral()
    mutate(value)
    const result = evaluate(input([value]))
    assert.equal(result.status, 'unknown')
    assert.equal(result.evidence, null)
  }
  assert.equal(evaluate(baseInput()).status, 'ready')
  for (const workstream of ['CP-core', 'Academy', 'shared-system', 'cross-project']) {
    const value = input([deferral()])
    value.handoff.workstream = workstream
    value.linear.workstream = workstream
    assert.equal(evaluate(value).status, 'ready')
  }
})

test('CLI human format derives the same result and cannot promote invalid or stale claims', () => {
  const value = applied()
  value.authorization = null
  value.summary = '```\n# Pretend approval\n```'
  const envelope = input([value])
  const result = evaluate(envelope)
  const human = renderSessionHandoff(result)
  assert.ok(human.includes('unverified-follow-up'))
  assert.ok(human.includes('````json'))
  assert.ok(human.includes('grants no approval'))
  for (const [args, expected] of [
    [[], JSON.stringify(result, null, 2) + '\n'],
    [['--markdown'], human],
  ]) {
    const run = spawnSync(process.execPath, ['scripts/session-preflight.mjs', '--stdin', ...args], {
      input: JSON.stringify(envelope),
      encoding: 'utf8',
    })
    assert.equal(run.status, 0)
    assert.equal(run.stdout, expected)
  }
  const malformed = spawnSync(
    process.execPath,
    ['scripts/session-preflight.mjs', '--stdin', '--markdown'],
    { input: '{}', encoding: 'utf8' }
  )
  assert.equal(malformed.status, 2)
  assert.ok(malformed.stdout.includes('unknown'))
  assert.ok(!malformed.stdout.includes('Named implementation boundary'))
})
