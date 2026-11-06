import './session-preflight-linear-diagnostics.test.mjs'
import './session-preflight-designations.test.mjs'
import './session-preflight-followups.test.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawnSafe } from './validation/spawn-safe.mjs'
import { evaluateSessionPreflight } from './session-preflight-core.mjs'
import {
  collectGitHubEvidence,
  collectLocalGitEvidence,
  runReadOnly,
  collectLocalSessionEvidence,
} from './session-preflight.mjs'

import {
  CHECKED_AT,
  OBSERVED_AT,
  SHA,
  baseInput,
  reasonCodes,
} from './session-preflight-test-fixtures.mjs'

test('intended branch syntax fails closed and agrees with Git for literal names', () => {
  const invalid = [
    '',
    'codex/bad..branch',
    'codex/has space',
    '-branch',
    'HEAD',
    '/branch',
    'branch/',
    'codex//branch',
    '.hidden',
    'codex/.hidden',
    'branch.',
    'branch.lock',
    'codex/branch.lock/child',
    'branch@{1}',
    'branch~1',
    'branch^',
    'branch:name',
    'branch?',
    'branch*',
    'branch[1]',
    'branch\\child',
    'branch\tname',
    'branch\nname',
    'branch\u007f',
  ]
  const valid = ['main', 'codex/fix', 'codex/nested/fix', 'codex/修正', 'codex/a./b', '@']
  for (const branch of [null, undefined, {}, [], '@{-1}']) {
    const result = evaluateSessionPreflight(baseInput({ handoff: { intendedBranch: branch } }))
    assert.equal(result.status, 'unknown')
    assert.ok(reasonCodes(result).includes('invalid_input'))
  }
  for (const [names, expected] of [
    [invalid, false],
    [valid, true],
  ]) {
    for (const branch of names) {
      const git = spawnSafe('git', ['check-ref-format', '--branch', branch], { encoding: 'utf8' })
      assert.ifError(git.error)
      assert.equal(git.status === 0, expected, `Git syntax: ${JSON.stringify(branch)}`)
      for (const executionMode of ['local-checkout', 'codex-managed-worktree']) {
        const result = evaluateSessionPreflight(
          baseInput({
            executionMode,
            handoff: { intendedBranch: branch },
            ...(executionMode === 'codex-managed-worktree'
              ? { git: { currentBranch: null, detachedHead: true } }
              : {}),
          })
        )
        assert.equal(result.status, expected ? 'ready' : 'unknown', JSON.stringify(branch))
        if (!expected) assert.ok(reasonCodes(result).includes('invalid_input'))
      }
    }
  }
})

test('standard Windows GitHub CLI installation launches through the real collector runner', (t) => {
  if (process.platform !== 'win32') return t.skip('Windows installation integration check')
  const installed =
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'GitHub CLI', 'gh.exe')
  if (!installed || !existsSync(installed)) return t.skip('Standard GitHub CLI installation absent')
  const result = spawnSafe('gh', ['--version'], { encoding: 'utf8', timeout: 10000 })
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /^gh version /)
})

function collectorResponses(prOutput = '[]') {
  return new Map([
    ['git rev-parse HEAD', { status: 0, stdout: `${SHA}\n` }],
    ['git symbolic-ref --quiet --short HEAD', { status: 1, stdout: '' }],
    ['git status --porcelain=v1 --untracked-files=no', { status: 0, stdout: '' }],
    ['git rev-parse refs/heads/main', { status: 0, stdout: `${SHA}\n` }],
    [
      'git remote get-url origin',
      { status: 0, stdout: 'https://github.com/JamesJedi420/containment-protocol.git\n' },
    ],
    ['git ls-remote origin refs/heads/main', { status: 0, stdout: `${SHA}\trefs/heads/main\n` }],
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

test('freshness boundaries retain millisecond precision for every evidence source', () => {
  for (const [age, expected] of [
    [300000, 'ready'],
    [300001, 'unknown'],
    [-30000, 'ready'],
    [-30001, 'unknown'],
  ]) {
    const checkedAt = new Date(Date.parse(OBSERVED_AT) - age).toISOString()
    for (const source of ['linear', 'github', 'git', 'implementation']) {
      const override =
        source === 'implementation'
          ? { github: { implementationEvidence: { checkedAt } } }
          : { [source]: { checkedAt } }
      const result = evaluateSessionPreflight(baseInput(override))
      assert.equal(result.status, expected, `${source}: ${age}ms`)
      if (expected === 'unknown') {
        const prefix = source === 'implementation' ? 'github_implementation' : source
        assert.ok(
          reasonCodes(result).includes(`${prefix}_evidence_${age > 0 ? 'stale' : 'from_future'}`)
        )
      }
    }
  }
})

test('Linear workstream evidence must exist and match the named boundary', () => {
  for (const workstream of [undefined, null, '', 'unknown', {}]) {
    const result = evaluateSessionPreflight(baseInput({ linear: { workstream } }))
    assert.equal(result.status, 'unknown')
    assert.ok(reasonCodes(result).includes('invalid_input'))
  }
  for (const workstream of ['CP-core', 'Academy', 'shared-system', 'cross-project']) {
    const result = evaluateSessionPreflight(
      baseInput({
        handoff: { workstream },
        linear: { workstream },
      })
    )
    assert.equal(result.status, 'ready')
    assert.equal(result.evidence.linearLifecycle.workstream, workstream)
  }
  const mismatch = evaluateSessionPreflight(baseInput({ linear: { workstream: 'Academy' } }))
  assert.equal(mismatch.status, 'unknown')
  assert.ok(reasonCodes(mismatch).includes('linear_workstream_mismatch'))
})

test('origin repository identity is independent of matching main SHAs', () => {
  for (const url of [
    'https://github.com/JamesJedi420/containment-protocol.git',
    'git@github.com:JamesJedi420/containment-protocol.git',
    'ssh://git@github.com/JamesJedi420/containment-protocol.git',
    'https://GitHub.com/jamesjedi420/Containment-Protocol/',
    'https://github.com/some-fork/containment-protocol.git',
    'https://elsewhere.example/JamesJedi420/containment-protocol.git',
    'https://github.com.evil.example/JamesJedi420/containment-protocol',
    'https://token@github.com/JamesJedi420/containment-protocol.git',
    'https://github.com/JamesJedi420/containment-protocol?other',
    'git@github-alias:JamesJedi420/containment-protocol.git',
    '../local-repo',
    '',
  ]) {
    const responses = collectorResponses()
    responses.set('git remote get-url origin', { status: 0, stdout: url })
    const git = collectLocalGitEvidence({
      checkedAt: CHECKED_AT,
      run: (command, args) => responses.get(`${command} ${args.join(' ')}`),
    })
    const result = evaluateSessionPreflight(
      baseInput({ executionMode: 'codex-managed-worktree', git })
    )
    const sameRepo =
      /^(https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)jamesjedi420\/containment-protocol(?:\.git|\/)?$/i.test(
        url
      )
    assert.equal(result.status, sameRepo ? 'ready' : 'unknown', url)
    if (url.includes('some-fork'))
      assert.ok(reasonCodes(result).includes('git_repository_mismatch'))
    if (git.collectionStatus === 'failed')
      assert.equal(git.failureCode, 'origin-repository-unavailable')
    assert.ok(!JSON.stringify(git).includes('token@'))
  }
  assert.equal(
    evaluateSessionPreflight(baseInput({ git: { originRepository: undefined } })).status,
    'unknown'
  )
})

test('collector runner bounds commands and suppresses credential prompts', () => {
  const timeout = {
    status: null,
    error: Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' }),
  }
  const result = runReadOnly(
    'git',
    ['ls-remote', 'origin', 'refs/heads/main'],
    '.',
    { GIT_OPTIONAL_LOCKS: '0' },
    (_command, _args, options) => {
      assert.equal(options.timeout, 30000)
      assert.equal(options.env.GIT_OPTIONAL_LOCKS, '0')
      assert.equal(options.env.GIT_TERMINAL_PROMPT, '0')
      assert.equal(options.env.GH_PROMPT_DISABLED, '1')
      assert.equal(options.env.GCM_INTERACTIVE, 'Never')
      return timeout
    }
  )
  assert.equal(result, timeout)
  for (const command of [
    'git ls-remote origin refs/heads/main',
    'gh api repos/JamesJedi420/containment-protocol/git/ref/heads/main --jq .object.sha',
  ]) {
    const responses = collectorResponses()
    responses.set(command, timeout)
    const collected = collectLocalSessionEvidence(
      baseInput({ executionMode: 'codex-managed-worktree' }),
      {
        run: (bin, args) => responses.get(`${bin} ${args.join(' ')}`),
        now: () => OBSERVED_AT,
      }
    )
    const source = command.startsWith('git ') ? 'git' : 'github'
    assert.equal(collected[source].collectionStatus, 'failed')
    assert.equal(evaluateSessionPreflight(collected).status, 'unknown')
  }
})

test('timestamps require an explicit zone and accept numeric offsets', () => {
  const ambiguous = evaluateSessionPreflight(baseInput({ observedAt: '2026-11-03T03:30:00' }))
  assert.equal(ambiguous.status, 'unknown')
  assert.ok(reasonCodes(ambiguous).includes('invalid_input'))

  const offset = evaluateSessionPreflight(baseInput({ observedAt: '2026-11-03T04:30:00+01:00' }))
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
  assert.deepEqual(
    collected.github.implementationEvidence,
    baseInput().github.implementationEvidence
  )
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
