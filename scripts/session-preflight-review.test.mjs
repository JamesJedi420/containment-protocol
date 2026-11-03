import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateSessionPreflight } from './session-preflight-core.mjs'
import {
  collectGitHubEvidence,
  collectLocalSessionEvidence,
} from './session-preflight.mjs'

import {
  CHECKED_AT,
  OBSERVED_AT,
  SHA,
  baseInput,
  reasonCodes,
} from './session-preflight-test-fixtures.mjs'

function collectorResponses(prOutput = '[]') {
  return new Map([
    ['git rev-parse HEAD', { status: 0, stdout: `${SHA}\n` }],
    ['git symbolic-ref --quiet --short HEAD', { status: 1, stdout: '' }],
    ['git status --porcelain=v1 --untracked-files=no', { status: 0, stdout: '' }],
    ['git rev-parse refs/heads/main', { status: 0, stdout: `${SHA}\n` }],
    [
      'git ls-remote origin refs/heads/main',
      { status: 0, stdout: `${SHA}\trefs/heads/main\n` },
    ],
    [
      'gh api repos/JamesJedi420/containment-protocol/git/ref/heads/main --jq .object.sha',
      { status: 0, stdout: `${SHA}\n` },
    ],
    [
      'gh pr list --repo JamesJedi420/containment-protocol --state open --json number,url,headRefName,baseRefName,title,body',
      { status: 0, stdout: prOutput },
    ],
  ])
}

test('timestamps require an explicit zone and accept numeric offsets', () => {
  const ambiguous = evaluateSessionPreflight(baseInput({ observedAt: '2026-11-03T03:30:00' }))
  assert.equal(ambiguous.status, 'unknown')
  assert.ok(reasonCodes(ambiguous).includes('invalid_input'))

  const offset = evaluateSessionPreflight(
    baseInput({ observedAt: '2026-11-03T04:30:00+01:00' })
  )
  assert.equal(offset.status, 'ready')
})

test('an explicitly named next slice may start on an In Progress parent', () => {
  const named = evaluateSessionPreflight(
    baseInput({ linear: { status: 'In Progress', statusType: 'started' } })
  )
  assert.equal(named.status, 'ready')

  const unnamed = evaluateSessionPreflight(
    baseInput({
      handoff: { sliceRef: null },
      linear: { status: 'In Progress', statusType: 'started' },
    })
  )
  assert.equal(unnamed.status, 'blocked')
  assert.ok(reasonCodes(unnamed).includes('issue_already_started'))
})

test('failed source payloads cannot leak malformed PR data into output', () => {
  const result = evaluateSessionPreflight(
    baseInput({
      github: {
        collectionStatus: 'failed',
        checkedAt: CHECKED_AT,
        sourceRef: 'github:failed',
        remoteMainSha: { error: true },
        openPullRequests: { error: 'unavailable' },
        implementationEvidence: undefined,
      },
    })
  )
  assert.equal(result.status, 'unknown')
  assert.deepEqual(result.evidence.githubImplementation.openPullRequests, [])
  assert.equal(result.evidence.githubImplementation.mergedCurrentMain, null)
})

test('implementation evidence has independent freshness', () => {
  const result = evaluateSessionPreflight(
    baseInput({
      github: {
        implementationEvidence: {
          checkedAt: '2026-11-03T03:00:00.000Z',
          sourceRef: 'github:implementation:stale',
          mergedCurrentMain: false,
          mergedPrUrls: [],
        },
      },
    })
  )
  assert.equal(result.status, 'unknown')
  assert.ok(reasonCodes(result).includes('github_implementation_evidence_stale'))
})

test('local collection evaluates after collection and preserves supplied implementation evidence', () => {
  const responses = collectorResponses()
  const calls = []
  const run = (command, args, _cwd, env = {}) => {
    const key = `${command} ${args.join(' ')}`
    calls.push({ key, env })
    return responses.get(key)
  }
  const times = [CHECKED_AT, OBSERVED_AT]
  const collected = collectLocalSessionEvidence(baseInput(), {
    run,
    now: () => times.shift(),
  })

  assert.equal(collected.github.checkedAt, CHECKED_AT)
  assert.equal(collected.git.checkedAt, CHECKED_AT)
  assert.equal(collected.observedAt, OBSERVED_AT)
  assert.deepEqual(collected.github.implementationEvidence, baseInput().github.implementationEvidence)
  const statusCall = calls.find(
    (call) => call.key === 'git status --porcelain=v1 --untracked-files=no'
  )
  assert.equal(statusCall?.env.GIT_OPTIONAL_LOCKS, '0')
})

test('empty pull-request output fails closed instead of becoming an empty list', () => {
  const responses = collectorResponses('   \n')
  const run = (command, args) => responses.get(`${command} ${args.join(' ')}`)
  const result = collectGitHubEvidence({
    repository: 'JamesJedi420/containment-protocol',
    checkedAt: CHECKED_AT,
    run,
  })
  assert.equal(result.collectionStatus, 'failed')
  assert.equal(result.failureCode, 'open-prs-malformed')
})
