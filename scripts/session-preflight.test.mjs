import assert from 'node:assert/strict'
import test from 'node:test'
import {
  compareSessionPreflightReasons,
  evaluateSessionPreflight,
  validateSessionPreflightInput,
} from './session-preflight-core.mjs'
import {
  collectGitHubEvidence,
  collectLocalGitEvidence,
  collectLocalSessionEvidence,
  parseSessionPreflightArguments,
} from './session-preflight.mjs'

const SHA = '1'.repeat(40)
const OTHER_SHA = '2'.repeat(40)
const OBSERVED_AT = '2026-11-03T03:30:00.000Z'
const CHECKED_AT = '2026-11-03T03:29:30.000Z'

function baseInput(overrides = {}) {
  const input = {
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
      sourceRef: 'linear:SPE-3337@2026-11-03T03:29:30Z',
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
      sourceRef: 'github:JamesJedi420/containment-protocol:open-prs',
      remoteMainSha: SHA,
      openPullRequests: [],
      implementationEvidence: {
        checkedAt: CHECKED_AT,
        sourceRef: 'github:JamesJedi420/containment-protocol:implementation:SPE-3337',
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
  }
  return deepMerge(input, overrides)
}

function deepMerge(base, overrides) {
  const output = structuredClone(base)
  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof output[key] === 'object') {
      output[key] = deepMerge(output[key], value)
    } else {
      output[key] = value
    }
  }
  return output
}

function reasonCodes(result) {
  return result.reasons.map((reason) => reason.code)
}

function matchingPullRequest(overrides = {}) {
  return {
    number: 42,
    url: 'https://github.com/JamesJedi420/containment-protocol/pull/42',
    headBranch: 'codex/spe-3337-session-preflight',
    baseBranch: 'main',
    issueId: 'SPE-3337',
    ownershipVerified: true,
    state: 'open',
    merged: false,
    ...overrides,
  }
}

test('clean synchronized local main with no pull requests is ready', () => {
  const result = evaluateSessionPreflight(baseInput())
  assert.equal(result.status, 'ready')
  assert.deepEqual(result.reasons, [])
  assert.equal(result.readOnly, true)
})

test('matching issue and branch can resume its sole open pull request', () => {
  const result = evaluateSessionPreflight(
    baseInput({
      requestedOperation: 'resume',
      linear: { status: 'In Progress', statusType: 'started' },
      github: { openPullRequests: [matchingPullRequest()] },
      git: {
        headSha: OTHER_SHA,
        currentBranch: 'codex/spe-3337-session-preflight',
        detachedHead: false,
      },
    })
  )
  assert.equal(result.status, 'ready')
})

test('an open pull request blocks start, including the same issue', () => {
  const result = evaluateSessionPreflight(baseInput({ github: { openPullRequests: [matchingPullRequest()] } }))
  assert.equal(result.status, 'blocked')
  assert.ok(reasonCodes(result).includes('open_pr_blocks_start'))
})

test('unrelated and multiple pull requests block execution', () => {
  const unrelated = evaluateSessionPreflight(
    baseInput({ github: { openPullRequests: [matchingPullRequest({ issueId: 'SPE-100' })] } })
  )
  assert.equal(unrelated.status, 'blocked')
  assert.ok(reasonCodes(unrelated).includes('open_pr_blocks_start'))

  const multiple = evaluateSessionPreflight(
    baseInput({
      requestedOperation: 'resume',
      linear: { status: 'In Progress', statusType: 'started' },
      github: {
        openPullRequests: [matchingPullRequest(), matchingPullRequest({ number: 43 })],
      },
      git: { currentBranch: 'codex/spe-3337-session-preflight', headSha: OTHER_SHA },
    })
  )
  assert.equal(multiple.status, 'blocked')
  assert.ok(reasonCodes(multiple).includes('multiple_open_prs'))
})

test('unverifiable pull request ownership is unknown', () => {
  const result = evaluateSessionPreflight(
    baseInput({
      requestedOperation: 'resume',
      linear: { status: 'In Progress', statusType: 'started' },
      github: {
        openPullRequests: [matchingPullRequest({ issueId: null, ownershipVerified: false })],
      },
      git: { currentBranch: 'codex/spe-3337-session-preflight', headSha: OTHER_SHA },
    })
  )
  assert.equal(result.status, 'unknown')
  assert.ok(reasonCodes(result).includes('pr_ownership_unverified'))
})

test('dirty tracked checkout and local main divergence are blocked', () => {
  const dirty = evaluateSessionPreflight(baseInput({ git: { trackedDirty: true } }))
  assert.equal(dirty.status, 'blocked')
  assert.ok(reasonCodes(dirty).includes('tracked_worktree_dirty'))

  const diverged = evaluateSessionPreflight(baseInput({ git: { localMainSha: OTHER_SHA } }))
  assert.equal(diverged.status, 'blocked')
  assert.ok(reasonCodes(diverged).includes('local_main_diverged'))
})

test('Codex managed worktree may start detached only at the exact expected base', () => {
  const ready = evaluateSessionPreflight(
    baseInput({
      executionMode: 'codex-managed-worktree',
      git: { currentBranch: null, detachedHead: true, localMainSha: null },
    })
  )
  assert.equal(ready.status, 'ready')

  const wrong = evaluateSessionPreflight(
    baseInput({
      executionMode: 'codex-managed-worktree',
      git: { currentBranch: null, detachedHead: true, localMainSha: null, headSha: OTHER_SHA },
    })
  )
  assert.equal(wrong.status, 'blocked')
  assert.ok(reasonCodes(wrong).includes('managed_worktree_base_mismatch'))
})

test('unavailable and stale evidence are unknown', () => {
  const unavailable = evaluateSessionPreflight(baseInput({ linear: { collectionStatus: 'needsAuth' } }))
  assert.equal(unavailable.status, 'unknown')
  assert.ok(reasonCodes(unavailable).includes('linear_evidence_unavailable'))

  const stale = evaluateSessionPreflight(
    baseInput({ github: { checkedAt: '2026-11-03T03:00:00.000Z' } })
  )
  assert.equal(stale.status, 'unknown')
  assert.ok(reasonCodes(stale).includes('github_evidence_stale'))
})

test('unavailable evidence may omit current source-specific fields', () => {
  const input = baseInput({
    linear: {
      collectionStatus: 'needsAuth',
      checkedAt: CHECKED_AT,
      sourceRef: 'linear:unavailable',
      issueId: undefined,
      parentId: undefined,
      status: undefined,
      statusType: undefined,
      approvalState: undefined,
      blockerIds: undefined,
      dependencyIds: undefined,
    },
    github: {
      collectionStatus: 'failed',
      checkedAt: CHECKED_AT,
      sourceRef: 'github:failed',
      remoteMainSha: undefined,
      openPullRequests: undefined,
      implementationEvidence: undefined,
    },
    git: {
      collectionStatus: 'failed',
      checkedAt: CHECKED_AT,
      sourceRef: 'git:failed',
      headSha: undefined,
      currentBranch: undefined,
      detachedHead: undefined,
      trackedDirty: undefined,
      localMainSha: undefined,
      remoteMainSha: undefined,
    },
  })
  const result = evaluateSessionPreflight(input)
  assert.equal(result.status, 'unknown')
  assert.deepEqual(result.validationErrors, [])
  assert.ok(reasonCodes(result).includes('linear_evidence_unavailable'))
  assert.ok(reasonCodes(result).includes('github_evidence_unavailable'))
  assert.ok(reasonCodes(result).includes('git_evidence_unavailable'))
})

test('completed, canceled, and changed prerequisites are blocked', () => {
  for (const statusType of ['completed', 'canceled']) {
    const result = evaluateSessionPreflight(baseInput({ linear: { statusType, status: statusType } }))
    assert.equal(result.status, 'blocked')
    assert.ok(reasonCodes(result).includes('issue_not_active'))
  }

  const changed = evaluateSessionPreflight(
    baseInput({ linear: { blockerIds: ['SPE-1'], dependencyIds: ['SPE-2'] } })
  )
  assert.equal(changed.status, 'blocked')
  assert.ok(reasonCodes(changed).includes('blocker_snapshot_changed'))
  assert.ok(reasonCodes(changed).includes('dependency_snapshot_changed'))
})

test('merged evidence disagreement stays explicit and never infers completion', () => {
  const result = evaluateSessionPreflight(
    baseInput({ github: { implementationEvidence: { checkedAt: CHECKED_AT, sourceRef: 'github:implementation:merged', mergedCurrentMain: true, mergedPrUrls: ['https://example.test/pr/1'] } } })
  )
  assert.equal(result.status, 'unknown')
  assert.ok(reasonCodes(result).includes('lifecycle_evidence_conflict'))
  assert.equal(result.evidence.linearLifecycle.statusType, 'backlog')
  assert.equal(result.evidence.githubImplementation.mergedCurrentMain, true)
})

test('merged evidence does not invent a lifecycle conflict when Linear is unavailable', () => {
  const result = evaluateSessionPreflight(
    baseInput({
      linear: { collectionStatus: 'needsAuth' },
      github: {
        implementationEvidence: {
          checkedAt: CHECKED_AT,
          sourceRef: 'github:implementation:merged',
          mergedCurrentMain: true,
          mergedPrUrls: ['https://example.test/pr/1'],
        },
      },
    })
  )
  assert.equal(result.status, 'unknown')
  assert.ok(reasonCodes(result).includes('linear_evidence_unavailable'))
  assert.ok(!reasonCodes(result).includes('lifecycle_evidence_conflict'))
})

test('CP core and Academy consume the same contract', () => {
  const cp = evaluateSessionPreflight(baseInput({ handoff: { workstream: 'CP-core' } }))
  const academy = evaluateSessionPreflight(baseInput({ handoff: { workstream: 'Academy' } }))
  assert.equal(cp.status, 'ready')
  assert.equal(academy.status, 'ready')
  assert.deepEqual(cp.reasons, academy.reasons)
})

test('malformed input fails closed with deterministic validation errors', () => {
  const malformed = baseInput({ handoff: { issueId: 'invalid' } })
  const first = evaluateSessionPreflight(malformed)
  const second = evaluateSessionPreflight(malformed)
  assert.equal(first.status, 'unknown')
  assert.ok(reasonCodes(first).includes('invalid_input'))
  assert.deepEqual(first, second)
  assert.ok(validateSessionPreflightInput(malformed).length > 0)
})

test('ready evidence requires current Git and GitHub SHAs', () => {
  for (const overrides of [
    { github: { remoteMainSha: null } },
    { git: { headSha: null } },
    { git: { remoteMainSha: null } },
  ]) {
    const result = evaluateSessionPreflight(baseInput(overrides))
    assert.equal(result.status, 'unknown')
    assert.ok(reasonCodes(result).includes('invalid_input'))
  }
})

test('CLI argument parser rejects file paths and requires standard input', () => {
  assert.deepEqual(parseSessionPreflightArguments(['--stdin']), {
    ok: true,
    collectLocal: false,
  })
  assert.deepEqual(parseSessionPreflightArguments(['--stdin', '--collect-local']), {
    ok: true,
    collectLocal: true,
  })
  assert.equal(parseSessionPreflightArguments(['payload.json']).ok, false)
  assert.equal(parseSessionPreflightArguments([]).ok, false)
})

test('reason ordering uses explicit code-point comparison rather than locale rules', () => {
  const ascii = { source: 'git', code: 'z_reason', detail: '' }
  const nonAscii = { source: 'git', code: 'ä_reason', detail: '' }
  assert.equal(compareSessionPreflightReasons(ascii, nonAscii), -1)
  assert.equal(compareSessionPreflightReasons(nonAscii, ascii), 1)
  assert.equal(compareSessionPreflightReasons(ascii, ascii), 0)
})

test('local Git collector uses only fixed read-only commands', () => {
  const calls = []
  const responses = new Map([
    ['git rev-parse HEAD', { status: 0, stdout: `${SHA}\n` }],
    ['git symbolic-ref --quiet --short HEAD', { status: 1, stdout: '' }],
    ['git status --porcelain=v1 --untracked-files=no', { status: 0, stdout: '' }],
    ['git rev-parse refs/heads/main', { status: 0, stdout: `${SHA}\n` }],
    ['git ls-remote origin refs/heads/main', { status: 0, stdout: `${SHA}\trefs/heads/main\n` }],
  ])
  const run = (command, args) => {
    const key = `${command} ${args.join(' ')}`
    calls.push(key)
    return responses.get(key)
  }
  const result = collectLocalGitEvidence({ checkedAt: CHECKED_AT, run })
  assert.equal(result.collectionStatus, 'ready')
  assert.equal(result.detachedHead, true)
  assert.deepEqual(calls, [...responses.keys()])
  assert.ok(calls.every((call) => !/\b(checkout|switch|commit|push|merge|reset|clean)\b/.test(call)))
})

test('local Git collector fails closed when remote main output is empty', () => {
  const responses = new Map([
    ['git rev-parse HEAD', { status: 0, stdout: `${SHA}\n` }],
    ['git symbolic-ref --quiet --short HEAD', { status: 0, stdout: 'main\n' }],
    ['git status --porcelain=v1 --untracked-files=no', { status: 0, stdout: '' }],
    ['git rev-parse refs/heads/main', { status: 0, stdout: `${SHA}\n` }],
    ['git ls-remote origin refs/heads/main', { status: 0, stdout: '\n' }],
  ])
  const run = (command, args) => responses.get(`${command} ${args.join(' ')}`)
  const result = collectLocalGitEvidence({ checkedAt: CHECKED_AT, run })
  assert.equal(result.collectionStatus, 'failed')
  assert.equal(result.failureCode, 'remote-main-unavailable')
})

test('local collection leaves invalid top-level input for evaluator validation', () => {
  const collected = collectLocalSessionEvidence(null, {
    now: () => CHECKED_AT,
    run: () => {
      throw new Error('collectors must not run for invalid top-level input')
    },
  })
  assert.equal(collected, null)
  const result = evaluateSessionPreflight(collected)
  assert.equal(result.status, 'unknown')
  assert.ok(result.validationErrors.length > 0)
})

test('GitHub collector uses read-only gh commands and verifies one issue identity', () => {
  const calls = []
  const run = (command, args) => {
    calls.push(`${command} ${args.join(' ')}`)
    if (args[0] === 'api') return { status: 0, stdout: `${SHA}\n` }
    return {
      status: 0,
      stdout: JSON.stringify([
        {
          number: 42,
          url: 'https://github.com/JamesJedi420/containment-protocol/pull/42',
          headRefName: 'codex/spe-3337-session-preflight',
          baseRefName: 'main',
          title: 'feat(SPE-3337): preflight',
          body: 'Implements the named slice under parent SPE-3336.',
        },
      ]),
    }
  }
  const result = collectGitHubEvidence({
    repository: 'JamesJedi420/containment-protocol',
    checkedAt: CHECKED_AT,
    run,
  })
  assert.equal(result.collectionStatus, 'ready')
  assert.equal(result.openPullRequests[0].issueId, 'SPE-3337')
  assert.equal(result.openPullRequests[0].ownershipVerified, true)
  assert.ok(calls.every((call) => !/\b(create|close|merge|edit|ready|review)\b/.test(call)))
})

test('GitHub collector fails closed when remote main output is empty', () => {
  const run = (_command, args) => {
    if (args[0] === 'api') return { status: 0, stdout: '\n' }
    throw new Error('PR collection must not run after missing remote main')
  }
  const result = collectGitHubEvidence({
    repository: 'JamesJedi420/containment-protocol',
    checkedAt: CHECKED_AT,
    run,
  })
  assert.equal(result.collectionStatus, 'failed')
  assert.equal(result.failureCode, 'remote-main-unavailable')
})

test('GitHub collector fails closed when PR JSON is valid but not an array', () => {
  const run = (_command, args) => {
    if (args[0] === 'api') return { status: 0, stdout: `${SHA}\n` }
    return { status: 0, stdout: JSON.stringify({ number: 42 }) }
  }
  const result = collectGitHubEvidence({
    repository: 'JamesJedi420/containment-protocol',
    checkedAt: CHECKED_AT,
    run,
  })
  assert.equal(result.collectionStatus, 'failed')
  assert.equal(result.failureCode, 'open-prs-malformed')
})
