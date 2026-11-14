import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateSessionPreflight } from './session-preflight-core.mjs'
import { collectGitHubEvidence, collectLocalSessionEvidence } from './session-preflight.mjs'
import { renderSessionHandoff } from './session-preflight-presentation.mjs'
import {
  baseInput,
  CHECKED_AT,
  OTHER_SHA,
  SHA,
  reasonCodes,
} from './session-preflight-test-fixtures.mjs'

const UPDATED_AT = '2026-11-03T03:29:00.000Z'
function pr(overrides = {}) {
  return {
    number: 42,
    url: 'https://github.com/JamesJedi420/containment-protocol/pull/42',
    headBranch: 'other/work',
    baseBranch: 'main',
    issueId: 'SPE-100',
    ownershipVerified: true,
    state: 'open',
    merged: false,
    headSha: OTHER_SHA,
    updatedAt: UPDATED_AT,
    isDraft: true,
    changedPaths: ['docs/other.md'],
    ...overrides,
  }
}
function item(pullRequest, disposition = 'blocked') {
  return {
    number: pullRequest.number,
    headSha: pullRequest.headSha,
    updatedAt: pullRequest.updatedAt,
    isDraft: pullRequest.isDraft,
    disposition,
    reason: 'Current explicit author-only repair hold, not merely a draft or assignment',
    nextAction: 'Existing author corrects the documented finding, then requests fresh review',
    checkedAt: CHECKED_AT,
    sourceRef: `review:pr-${pullRequest.number}@${pullRequest.headSha}`,
    dependency: {
      status: 'independent',
      checkedAt: CHECKED_AT,
      sourceRef: 'linear:verified-boundary-and-dependencies',
    },
    ...(disposition === 'blocked'
      ? {
          blocker: {
            kind: 'explicit-hold',
            actor: 'human-owner',
            detail: 'Current assignment explicitly excludes taking over this branch',
            checkedAt: CHECKED_AT,
            sourceRef: 'user:bounded-no-takeover-hold',
          },
        }
      : {}),
    ...(disposition === 'active-owner'
      ? {
          activity: {
            executor: 'cursor-session:other',
            status: 'active',
            acceptedAt: '2026-11-03T03:00:00Z',
            acceptanceSourceRef: 'session:accepted-pr-42',
            checkedAt: CHECKED_AT,
            sourceRef: 'session:current-head-progress-report',
          },
        }
      : {}),
  }
}
function input(pullRequests = [pr()], items = pullRequests.map((p) => item(p)), overrides = {}) {
  return baseInput({
    github: { openPullRequestsComplete: true, openPullRequests: pullRequests },
    openPrTriage: {
      schemaVersion: 1,
      boundary: {
        issueId: 'SPE-3337',
        workstream: 'shared-system',
        branch: 'codex/spe-3337-session-preflight',
        baseMainSha: SHA,
        executor: 'codex-session:this',
        paths: ['scripts/session-preflight-core.mjs'],
        checkedAt: CHECKED_AT,
        sourceRef: 'linear:approved-exact-six-file-boundary',
      },
      items,
    },
    ...overrides,
  })
}

test('actionable drafts block new work; draft/assignee/author labels alone do not exempt them', () => {
  const result = evaluateSessionPreflight(input([pr()], [item(pr(), 'actionable')]))
  assert.equal(result.status, 'blocked')
  assert.ok(reasonCodes(result).includes('pr_actionable'))
  const legacy = baseInput({ github: { openPullRequests: [pr()] }, ignoreOpenPrs: true })
  assert.equal(evaluateSessionPreflight(legacy).status, 'blocked')
  const malformed = input()
  malformed.openPrTriage = true
  assert.equal(evaluateSessionPreflight(malformed).status, 'unknown')
})

test('current evidenced external blocker permits only independent approved work', () => {
  const before = input()
  const result = evaluateSessionPreflight(before)
  assert.equal(result.status, 'ready')
  assert.equal(result.readOnly, true)
  assert.deepEqual(before, input())
  assert.deepEqual(result.evidence.openPrTriage, before.openPrTriage)
  assert.ok(result.sources.includes('user:bounded-no-takeover-hold'))
  assert.match(renderSessionHandoff(result), /Sourced per-PR triage observations/)
})

test('active owner requires accepted executor and fresh actual activity, independent of issue ownership', () => {
  const p = pr({ issueId: null, ownershipVerified: false })
  const good = input([p], [item(p, 'active-owner')])
  assert.equal(evaluateSessionPreflight(good).status, 'ready')
  for (const field of [
    'executor',
    'acceptedAt',
    'acceptanceSourceRef',
    'checkedAt',
    'sourceRef',
    'status',
  ]) {
    const bad = structuredClone(good)
    delete bad.openPrTriage.items[0].activity[field]
    assert.equal(evaluateSessionPreflight(bad).status, 'unknown', field)
  }
  const same = structuredClone(good)
  same.openPrTriage.items[0].activity.executor = same.openPrTriage.boundary.executor
  assert.ok(reasonCodes(evaluateSessionPreflight(same)).includes('pr_boundary_conflict'))
  const reversed = structuredClone(good)
  reversed.openPrTriage.items[0].activity.acceptedAt = '2026-11-03T03:30:00Z'
  assert.equal(evaluateSessionPreflight(reversed).status, 'unknown')
})

test('a genuinely blocked owned PR can remain paused while one independent authorized boundary starts', () => {
  const paused = input()
  const blocked = paused.openPrTriage.items[0]
  blocked.reason =
    'Owned PR explicitly left paused while the required external reviewer service is unavailable'
  blocked.nextAction =
    'Codex refreshes the reviewer service and resumes this PR when it is available'
  blocked.blocker.kind = 'service-unavailable'
  blocked.blocker.actor = paused.openPrTriage.boundary.executor
  blocked.blocker.detail =
    'Required independent review service is unavailable; review cannot be bypassed'
  const before = structuredClone(paused)
  const result = evaluateSessionPreflight(paused)
  assert.equal(result.status, 'ready')
  assert.deepEqual(paused, before)
  assert.equal(paused.github.openPullRequests[0].state, 'open')
  assert.equal(paused.github.openPullRequests[0].merged, false)
  assert.equal(result.evidence.openPrTriage.items[0].disposition, 'blocked')
})

test('unknown, incomplete, duplicate and contradictory dispositions fail closed', () => {
  assert.equal(evaluateSessionPreflight(input([pr()], [item(pr(), 'unknown')])).status, 'unknown')
  for (const mutate of [
    (v) => {
      v.openPrTriage.items = []
    },
    (v) => {
      v.openPrTriage.items.push(item(pr()))
    },
    (v) => {
      v.openPrTriage.items.push(item(pr({ number: 43 })))
    },
    (v) => {
      v.openPrTriage.items[0].disposition = 'draft'
    },
    (v) => {
      v.openPrTriage.items[0].blocker.kind = 'changes-requested'
    },
    (v) => {
      v.openPrTriage.items[0].nextAction = ''
    },
    (v) => {
      v.openPrTriage.items[0].dependency.status = 'unknown'
    },
    (v) => {
      v.openPrTriage.items[0].activity = item(pr(), 'active-owner').activity
    },
    (v) => {
      v.openPrTriage.bypass = true
    },
    (v) => {
      v.github.openPullRequestsComplete = false
    },
    (v) => {
      delete v.github.openPullRequests[0].changedPaths
    },
    (v) => {
      delete v.github.openPullRequests[0].headSha
    },
  ]) {
    const v = input()
    mutate(v)
    assert.equal(evaluateSessionPreflight(v).status, 'unknown')
  }
})

test('every open draft must be covered and changed heads, draft state or metadata require re-triage', () => {
  const newer = pr({ number: 43, headBranch: 'other/new', issueId: 'SPE-101' })
  assert.equal(evaluateSessionPreflight(input([pr(), newer], [item(pr())])).status, 'unknown')
  for (const change of [{ headSha: SHA }, { isDraft: false }, { updatedAt: CHECKED_AT }]) {
    assert.equal(evaluateSessionPreflight(input([pr(change)], [item(pr())])).status, 'unknown')
  }
})

test('every triage observation uses the existing freshness window, including executor activity', () => {
  for (const mode of ['blocked', 'active-owner']) {
    const good = input([pr()], [item(pr(), mode)])
    for (const select of [
      (v) => v.openPrTriage.boundary,
      (v) => v.openPrTriage.items[0],
      (v) => v.openPrTriage.items[0].dependency,
      (v) => v.openPrTriage.items[0][mode === 'blocked' ? 'blocker' : 'activity'],
    ]) {
      for (const checkedAt of ['2026-11-03T03:24:59.999Z', '2026-11-03T03:30:30.001Z']) {
        const bad = structuredClone(good)
        select(bad).checkedAt = checkedAt
        assert.equal(evaluateSessionPreflight(bad).status, 'unknown')
      }
    }
  }
  const bad = input()
  bad.openPrTriage.items[0].checkedAt = '2026-11-03T03:28:59Z'
  assert.equal(evaluateSessionPreflight(bad).status, 'unknown')
})

test('path, issue, branch and dependency conflicts still block blocked or externally owned PRs', () => {
  for (const changedPaths of [
    ['scripts/session-preflight-core.mjs'],
    ['SCRIPTS/session-preflight-core.mjs'],
    ['scripts'],
  ]) {
    assert.ok(
      reasonCodes(evaluateSessionPreflight(input([pr({ changedPaths })]))).includes(
        'pr_scope_overlap'
      )
    )
  }
  for (const change of [
    { issueId: 'SPE-3337' },
    { headBranch: 'codex/spe-3337-session-preflight' },
  ]) {
    assert.ok(
      reasonCodes(evaluateSessionPreflight(input([pr(change)]))).includes('pr_boundary_conflict')
    )
  }
  const dependent = input()
  dependent.openPrTriage.items[0].dependency.status = 'dependent'
  assert.ok(reasonCodes(evaluateSessionPreflight(dependent)).includes('pr_dependency_conflict'))
  const linked = input([pr()], [item(pr())], {
    handoff: { dependencyIds: ['SPE-100'] },
    linear: { dependencyIds: ['SPE-100'] },
  })
  assert.ok(reasonCodes(evaluateSessionPreflight(linked)).includes('pr_dependency_conflict'))
  for (const path of [
    '/absolute',
    '../escape',
    'scripts/../docs',
    'scripts\\file',
    'scripts/*',
    './scripts',
    'scripts//file',
  ]) {
    const bad = input()
    bad.openPrTriage.boundary.paths = [path]
    assert.equal(evaluateSessionPreflight(bad).status, 'unknown', path)
  }
})

test('triage cannot be reused for a different authorized issue, workstream, branch or main', () => {
  for (const [key, value] of [
    ['issueId', 'SPE-100'],
    ['workstream', 'Academy'],
    ['branch', 'other/work'],
    ['baseMainSha', OTHER_SHA],
  ]) {
    const bad = input()
    bad.openPrTriage.boundary[key] = value
    assert.equal(evaluateSessionPreflight(bad).status, 'unknown', key)
  }
})

test('multiple-PR resume permits exactly one matching owned boundary and accounts for every other PR', () => {
  const own = pr({
    number: 43,
    issueId: 'SPE-3337',
    headBranch: 'codex/spe-3337-session-preflight',
    isDraft: false,
    changedPaths: ['scripts/session-preflight-core.mjs'],
  })
  const good = input([pr(), own], [item(pr())], {
    requestedOperation: 'resume',
    linear: { status: 'In Progress', statusType: 'started' },
    git: { headSha: OTHER_SHA, currentBranch: own.headBranch },
  })
  assert.equal(evaluateSessionPreflight(good).status, 'ready')
  const legacy = structuredClone(good)
  delete legacy.openPrTriage
  assert.ok(reasonCodes(evaluateSessionPreflight(legacy)).includes('multiple_open_prs'))
  const duplicate = structuredClone(good)
  duplicate.github.openPullRequests.push({ ...own, number: 44 })
  assert.notEqual(evaluateSessionPreflight(duplicate).status, 'ready')
  const unknownOwner = structuredClone(good)
  unknownOwner.github.openPullRequests[1].ownershipVerified = false
  assert.equal(evaluateSessionPreflight(unknownOwner).status, 'unknown')
  const staleHead = structuredClone(good)
  staleHead.git.headSha = SHA
  assert.equal(evaluateSessionPreflight(staleHead).status, 'unknown')
  const emptyDiff = structuredClone(good)
  emptyDiff.github.openPullRequests[1].changedPaths = []
  assert.equal(evaluateSessionPreflight(emptyDiff).status, 'unknown')
  const actualOverlap = structuredClone(good)
  actualOverlap.github.openPullRequests[1].changedPaths = ['docs/other.md']
  assert.ok(reasonCodes(evaluateSessionPreflight(actualOverlap)).includes('pr_scope_overlap'))
})

test('triage never waives dirty/current-base, approval, lifecycle or unavailable-source checks', () => {
  for (const override of [
    { git: { trackedDirty: true } },
    { github: { remoteMainSha: OTHER_SHA } },
    { linear: { approvalState: 'not-approved' } },
    { linear: { status: 'Done', statusType: 'completed' } },
    { linear: { collectionStatus: 'failed' } },
  ]) {
    assert.notEqual(evaluateSessionPreflight(input([pr()], [item(pr())], override)).status, 'ready')
  }
  const good = input([pr(), pr({ number: 43, headBranch: 'other/second', issueId: 'SPE-101' })])
  const reversed = structuredClone(good)
  reversed.github.openPullRequests.reverse()
  reversed.openPrTriage.items.reverse()
  assert.deepEqual(
    evaluateSessionPreflight(good).reasons,
    evaluateSessionPreflight(reversed).reasons
  )
})

test('two independent actionable drafts do not deadlock a selected authorized PR continuation', () => {
  const own = pr({
    number: 43,
    headSha: '3'.repeat(40),
    issueId: 'SPE-3337',
    headBranch: 'codex/spe-3337-session-preflight',
    changedPaths: ['scripts/session-preflight-core.mjs'],
  })
  const other = pr()
  const good = input([other, own], [item(other, 'actionable')], {
    requestedOperation: 'resume',
    linear: { status: 'In Progress', statusType: 'started' },
    git: { headSha: own.headSha, currentBranch: own.headBranch },
  })
  assert.equal(evaluateSessionPreflight(good).status, 'ready')
  assert.equal(good.openPrTriage.items[0].blocker, undefined)
  assert.equal(good.openPrTriage.items[0].activity, undefined)
  const reverse = structuredClone(good)
  reverse.handoff.issueId = other.issueId
  reverse.handoff.intendedBranch = other.headBranch
  reverse.linear.issueId = other.issueId
  reverse.git.currentBranch = other.headBranch
  reverse.git.headSha = other.headSha
  reverse.openPrTriage.boundary.issueId = other.issueId
  reverse.openPrTriage.boundary.branch = other.headBranch
  reverse.openPrTriage.boundary.paths = other.changedPaths
  reverse.openPrTriage.items = [item(own, 'actionable')]
  assert.equal(evaluateSessionPreflight(reverse).status, 'ready')
  const overlap = structuredClone(good)
  overlap.github.openPullRequests[0].changedPaths = own.changedPaths
  assert.ok(reasonCodes(evaluateSessionPreflight(overlap)).includes('pr_scope_overlap'))
  const dependent = structuredClone(good)
  dependent.openPrTriage.items[0].dependency.status = 'dependent'
  assert.ok(reasonCodes(evaluateSessionPreflight(dependent)).includes('pr_dependency_conflict'))
  const unknown = structuredClone(good)
  unknown.openPrTriage.items[0].disposition = 'unknown'
  assert.equal(evaluateSessionPreflight(unknown).status, 'unknown')
  const freshStart = structuredClone(good)
  freshStart.requestedOperation = 'start'
  assert.ok(reasonCodes(evaluateSessionPreflight(freshStart)).includes('pr_actionable'))
})

function apiFixture(overrides = {}) {
  const row = {
    number: 42,
    url: pr().url,
    headRefName: 'other/work',
    baseRefName: 'main',
    headRefOid: OTHER_SHA,
    title: 'docs(SPE-100): note',
    body: '',
    isDraft: true,
    updatedAt: UPDATED_AT,
  }
  const metadata = {
    headSha: OTHER_SHA,
    headBranch: row.headRefName,
    baseBranch: 'main',
    updatedAt: UPDATED_AT,
    isDraft: true,
    changedFiles: 1,
    state: 'open',
    merged: false,
    ...overrides,
  }
  const calls = []
  let inventories = 0
  return {
    row,
    metadata,
    calls,
    run(command, args) {
      calls.push([command, args])
      if (args[1].endsWith('/git/ref/heads/main')) return { status: 0, stdout: SHA }
      if (args[1].includes('/pulls?')) {
        inventories++
        return { status: 0, stdout: JSON.stringify([row]), inventories }
      }
      if (args[1].includes('/files?'))
        return {
          status: 0,
          stdout: JSON.stringify([
            { filename: 'docs/new.md', previous_filename: 'scripts/session-preflight-core.mjs' },
          ]),
        }
      return { status: 0, stdout: JSON.stringify(metadata) }
    },
  }
}

test('collector paginates every open PR including drafts, retains rename paths, and checks the head after files', () => {
  const f = apiFixture()
  const result = collectGitHubEvidence({
    repository: baseInput().repository,
    checkedAt: CHECKED_AT,
    includeChangedPaths: true,
    run: f.run,
  })
  assert.equal(result.collectionStatus, 'ready')
  assert.equal(result.openPullRequestsComplete, true)
  assert.equal(result.openPullRequests[0].isDraft, true)
  assert.deepEqual(result.openPullRequests[0].changedPaths, [
    'docs/new.md',
    'scripts/session-preflight-core.mjs',
  ])
  const inventories = f.calls.filter(([, args]) => args[1].includes('/pulls?'))
  assert.equal(inventories.length, 2)
  assert.ok(
    inventories.every(
      ([, args]) =>
        args.includes('--paginate') &&
        !args.includes('--slurp') &&
        args.includes('GET') &&
        args.at(-1).endsWith('| @json')
    )
  )
  assert.ok(
    f.calls.findIndex(([, args]) => args[1].includes('/files?')) <
      f.calls.findIndex(([, args]) => args[1].endsWith('/pulls/42'))
  )
  assert.ok(
    reasonCodes(evaluateSessionPreflight(input(result.openPullRequests, [item(pr())]))).includes(
      'pr_scope_overlap'
    )
  )
})

test('partial diffs, changed metadata and inventory changes during collection fail closed', () => {
  for (const metadata of [
    { headSha: SHA },
    { updatedAt: CHECKED_AT },
    { isDraft: false },
    { changedFiles: 2 },
    { changedFiles: 3000 },
    { state: 'closed' },
  ]) {
    const f = apiFixture(metadata)
    assert.equal(
      collectGitHubEvidence({
        repository: baseInput().repository,
        checkedAt: CHECKED_AT,
        includeChangedPaths: true,
        run: f.run,
      }).collectionStatus,
      'failed'
    )
  }
  const f = apiFixture()
  let count = 0
  const run = (command, args) => {
    if (args[1].includes('/pulls?') && ++count === 2) return { status: 0, stdout: '[]' }
    return f.run(command, args)
  }
  const result = collectGitHubEvidence({
    repository: baseInput().repository,
    checkedAt: CHECKED_AT,
    includeChangedPaths: true,
    run,
  })
  assert.equal(result.failureCode, 'open-prs-changed-during-collection')
})

test('collector parses every compact page and rejects malformed later pages', () => {
  const f = apiFixture({ changedFiles: 2 })
  const laterDraft = { ...f.row, number: 43, body: 'First line\nSecond line' }
  const run = (command, args) => {
    if (args[1].includes('/pulls?'))
      return { status: 0, stdout: `${JSON.stringify([f.row])}\n${JSON.stringify([laterDraft])}\n` }
    if (args[1].includes('/files?'))
      return {
        status: 0,
        stdout:
          '[{"filename":"docs/first.md"}]\n[{"filename":"docs/second.md","previous_filename":"docs/old.md"}]\n',
      }
    return f.run(command, args)
  }
  const good = collectGitHubEvidence({
    repository: baseInput().repository,
    checkedAt: CHECKED_AT,
    includeChangedPaths: true,
    run,
  })
  assert.equal(good.collectionStatus, 'ready')
  assert.deepEqual(
    good.openPullRequests.map((p) => p.number),
    [42, 43]
  )
  assert.equal(good.openPullRequests[1].isDraft, true)
  assert.deepEqual(good.openPullRequests[1].changedPaths, [
    'docs/first.md',
    'docs/old.md',
    'docs/second.md',
  ])
  for (const lastPage of ['{}', '{broken', 'null']) {
    const malformed = (command, args) =>
      args[1].includes('/pulls?')
        ? { status: 0, stdout: `${JSON.stringify([f.row])}\n${lastPage}` }
        : run(command, args)
    assert.equal(
      collectGitHubEvidence({
        repository: baseInput().repository,
        checkedAt: CHECKED_AT,
        includeChangedPaths: true,
        run: malformed,
      }).collectionStatus,
      'failed'
    )
  }
})

test('local collection retains supplied dispositions without inventing or refreshing their timestamps', () => {
  const v = input()
  const f = apiFixture()
  const run = (command, args) => {
    if (command === 'gh') return f.run(command, args)
    if (args[0] === 'symbolic-ref') return { status: 0, stdout: 'main' }
    if (args[0] === 'status') return { status: 0, stdout: '' }
    if (args[0] === 'remote')
      return { status: 0, stdout: 'https://github.com/JamesJedi420/containment-protocol.git' }
    return { status: 0, stdout: SHA }
  }
  const collected = collectLocalSessionEvidence(v, { run, now: () => CHECKED_AT })
  assert.deepEqual(collected.openPrTriage, v.openPrTriage)
  assert.ok(
    collected.github.openPullRequests[0].changedPaths.includes('scripts/session-preflight-core.mjs')
  )
})
