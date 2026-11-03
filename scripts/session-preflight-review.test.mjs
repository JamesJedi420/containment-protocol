import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateSessionPreflight } from './session-preflight-core.mjs'
import {
  collectGitHubEvidence,
  collectLocalSessionEvidence,
} from './session-preflight.mjs'

const SHA = '1'.repeat(40)
const CHECKED_AT = '2026-11-03T03:29:30.000Z'
const OBSERVED_AT = '2026-11-03T03:30:00.000Z'

function merge(base, overrides) {
  const output = structuredClone(base)
  for (const [key, value] of Object.entries(overrides)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof output[key] === 'object'
    ) {
      output[key] = merge(output[key], value)
    } else {
      output[key] = value
    }
  }
  return output
}

function input(overrides = {}) {
  return merge(
    {
      schemaVersion: 1,
      repository: 'JamesJedi420/containment-protocol',
      observedAt: OBSERVED_AT,
      freshnessWindowSeconds: 300,
      requestedOperation: 'start',
      executionMode: 'local-checkout',
      handoff: {
        issueId: 'SPE-3337',
        workstream: 'shared-system',
        parentId: null,
        sliceRef: 'planning/spe-3337-session-preflight-slice.md',
        intendedBranch: 'codex/spe-3337-session-preflight',
        expectedBaseMainSha: SHA,
        blockerIds: [],
        dependencyIds: [],
      },
      linear: {
        collectionStatus: 'ready',
        checkedAt: CHECKED_AT,
        sourceRef: 'linear:SPE-3337',
        issueId: 'SPE-3337',
        parentId: null,
        status: 'Backlog',
        statusType: 'backlog',
        approvalState: 'approved',
        blockerIds: [],
        dependencyIds: [],
      },
      github: {
        collectionStatus: 'ready',
        checkedAt: CHECKED_AT,
        sourceRef: 'github:open-prs',
        remoteMainSha: SHA,
        openPullRequests: [],
        implementationEvidence: {
          checkedAt: CHECKED_AT,
          sourceRef: 'github:implementation:SPE-3337',
          mergedCurrentMain: false,
          mergedPrUrls: [],
        },
      },
      git: {
        collectionStatus: 'ready',
        checkedAt: CHECKED_AT,
        sourceRef: `git:${SHA}`,
        headSha: SHA,
        currentBranch: 'main',
        detachedHead: false,
        trackedDirty: false,
        localMainSha: SHA,
        remoteMainSha: SHA,
      },
    },
    overrides
  )
}

function codes(result) {
  return result.reasons.map((reason) => reason.code)
}

function collectorResponses(prOutput = '[]') {
  return new Map([
    ['git rev-parse HEAD', { status: 0, stdout: `${SHA}\n` }],
    ['git symbolic-ref --quiet --short HEAD', { status: 1, stdout: '' }],
    [
      'git --no-optional-locks status --porcelain=v1 --untracked-files=no',
      { status: 0, stdout: '' },
    ],
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
  const ambiguous = evaluateSessionPreflight(input({ observedAt: '2026-11-03T03:30:00' }))
  assert.equal(ambiguous.status, 'unknown')
  assert.ok(codes(ambiguous).includes('invalid_input'))

  const offset = evaluateSessionPreflight(
    input({ observedAt: '2026-11-03T04:30:00+01:00' })
  )
  assert.equal(offset.status, 'ready')
})

test('an explicitly named next slice may start on an In Progress parent', () => {
  const named = evaluateSessionPreflight(
    input({ linear: { status: 'In Progress', statusType: 'started' } })
  )
  assert.equal(named.status, 'ready')

  const unnamed = evaluateSessionPreflight(
    input({
      handoff: { sliceRef: null },
      linear: { status: 'In Progress', statusType: 'started' },
    })
  )
  assert.equal(unnamed.status, 'blocked')
  assert.ok(codes(unnamed).includes('issue_already_started'))
})

test('failed source payloads cannot leak malformed PR data into output', () => {
  const result = evaluateSessionPreflight(
    input({
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
    input({
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
  assert.ok(codes(result).includes('github_implementation_evidence_stale'))
})

test('local collection evaluates after collection and preserves supplied implementation evidence', () => {
  const responses = collectorResponses()
  const calls = []
  const run = (command, args) => {
    const key = `${command} ${args.join(' ')}`
    calls.push(key)
    return responses.get(key)
  }
  const times = [CHECKED_AT, OBSERVED_AT]
  const collected = collectLocalSessionEvidence(input(), {
    run,
    now: () => times.shift(),
  })

  assert.equal(collected.github.checkedAt, CHECKED_AT)
  assert.equal(collected.git.checkedAt, CHECKED_AT)
  assert.equal(collected.observedAt, OBSERVED_AT)
  assert.deepEqual(collected.github.implementationEvidence, input().github.implementationEvidence)
  assert.ok(calls.includes('git --no-optional-locks status --porcelain=v1 --untracked-files=no'))
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
