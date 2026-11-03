#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { evaluateSessionPreflight } from './session-preflight-core.mjs'
import { spawnSafe } from './validation/spawn-safe.mjs'

function trimOutput(result) {
  return typeof result.stdout === 'string' ? result.stdout.trim() : ''
}

function runReadOnly(command, args, cwd, env = {}) {
  return spawnSafe(command, args, { cwd, encoding: 'utf8', env })
}

function failedEvidence(checkedAt, sourceRef, failureCode) {
  return {
    collectionStatus: 'failed',
    checkedAt,
    sourceRef,
    failureCode,
  }
}

export function collectLocalGitEvidence({ cwd = process.cwd(), checkedAt, run = runReadOnly } = {}) {
  const head = run('git', ['rev-parse', 'HEAD'], cwd)
  if (head.status !== 0) return failedEvidence(checkedAt, 'git:local', 'head-unavailable')

  const branch = run('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], cwd)
  if (![0, 1].includes(branch.status)) {
    return failedEvidence(checkedAt, `git:${trimOutput(head)}`, 'branch-unavailable')
  }

  const status = run(
    'git',
    ['status', '--porcelain=v1', '--untracked-files=no'],
    cwd,
    { GIT_OPTIONAL_LOCKS: '0' }
  )
  if (status.status !== 0) {
    return failedEvidence(checkedAt, `git:${trimOutput(head)}`, 'status-unavailable')
  }

  const localMain = run('git', ['rev-parse', 'refs/heads/main'], cwd)
  const remoteMain = run('git', ['ls-remote', 'origin', 'refs/heads/main'], cwd)
  const remoteMainSha = trimOutput(remoteMain).split(/\s+/)[0] || null
  if (remoteMain.status !== 0 || !remoteMainSha) {
    return failedEvidence(checkedAt, `git:${trimOutput(head)}`, 'remote-main-unavailable')
  }
  return {
    collectionStatus: 'ready',
    checkedAt,
    sourceRef: `git:${trimOutput(head)}`,
    headSha: trimOutput(head),
    currentBranch: branch.status === 0 ? trimOutput(branch) : null,
    detachedHead: branch.status === 1,
    trackedDirty: trimOutput(status).length > 0,
    localMainSha: localMain.status === 0 ? trimOutput(localMain) : null,
    remoteMainSha,
  }
}

function findIssueIds(value) {
  return [...new Set((value ?? '').match(/\b[A-Z][A-Z0-9]+-\d+\b/g) ?? [])]
}

function extractIssueIdentity(title, body) {
  const titleMatches = findIssueIds(title)
  if (titleMatches.length === 1) {
    return { issueId: titleMatches[0], ownershipVerified: true }
  }
  if (titleMatches.length > 1) {
    return { issueId: null, ownershipVerified: false }
  }
  const bodyMatches = findIssueIds(body)
  return {
    issueId: bodyMatches.length === 1 ? bodyMatches[0] : null,
    ownershipVerified: bodyMatches.length === 1,
  }
}

export function collectGitHubEvidence({
  repository,
  checkedAt,
  implementationEvidence,
  cwd = process.cwd(),
  run = runReadOnly,
} = {}) {
  const remoteMain = run(
    'gh',
    ['api', `repos/${repository}/git/ref/heads/main`, '--jq', '.object.sha'],
    cwd
  )
  if (remoteMain.status !== 0) {
    return failedEvidence(checkedAt, `github:${repository}`, 'remote-main-unavailable')
  }
  const remoteMainSha = trimOutput(remoteMain) || null
  if (!remoteMainSha) {
    return failedEvidence(checkedAt, `github:${repository}`, 'remote-main-unavailable')
  }

  const pullRequests = run(
    'gh',
    [
      'pr',
      'list',
      '--repo',
      repository,
      '--state',
      'open',
      '--json',
      'number,url,headRefName,baseRefName,title,body',
    ],
    cwd
  )
  if (pullRequests.status !== 0) {
    return failedEvidence(checkedAt, `github:${repository}`, 'open-prs-unavailable')
  }

  const pullRequestOutput = trimOutput(pullRequests)
  if (!pullRequestOutput) {
    return failedEvidence(checkedAt, `github:${repository}`, 'open-prs-malformed')
  }

  let parsed
  try {
    parsed = JSON.parse(pullRequestOutput)
  } catch {
    return failedEvidence(checkedAt, `github:${repository}`, 'open-prs-malformed')
  }
  if (!Array.isArray(parsed)) {
    return failedEvidence(checkedAt, `github:${repository}`, 'open-prs-malformed')
  }

  const evidence = {
    collectionStatus: 'ready',
    checkedAt,
    sourceRef: `github:${repository}:open-prs`,
    remoteMainSha,
    openPullRequests: parsed.map((pullRequest) => {
      const ownership = extractIssueIdentity(pullRequest.title, pullRequest.body)
      return {
        number: pullRequest.number,
        url: pullRequest.url,
        headBranch: pullRequest.headRefName,
        baseBranch: pullRequest.baseRefName,
        issueId: ownership.issueId,
        ownershipVerified: ownership.ownershipVerified,
        state: 'open',
        merged: false,
      }
    }),
  }
  if (implementationEvidence !== undefined) {
    evidence.implementationEvidence = implementationEvidence
  }
  return evidence
}

export function parseSessionPreflightArguments(argv) {
  const allowed = new Set(['--stdin', '--collect-local'])
  const unexpected = argv.filter((arg) => !allowed.has(arg))
  if (unexpected.length > 0 || !argv.includes('--stdin')) {
    return {
      ok: false,
      message: 'usage: node scripts/session-preflight.mjs --stdin [--collect-local]',
    }
  }
  return { ok: true, collectLocal: argv.includes('--collect-local') }
}

export function collectLocalSessionEvidence(
  input,
  {
    cwd = process.cwd(),
    run = runReadOnly,
    now = () => new Date().toISOString(),
  } = {}
) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input

  const checkedAt = now()
  const github = collectGitHubEvidence({
    repository: input.repository,
    checkedAt,
    implementationEvidence: input.github?.implementationEvidence,
    cwd,
    run,
  })
  const git = collectLocalGitEvidence({ checkedAt, cwd, run })
  return {
    ...input,
    observedAt: now(),
    github,
    git,
  }
}

function readInput() {
  const raw = readFileSync(0, 'utf8')
  if (!raw.trim()) throw new Error('stdin JSON is required')
  return JSON.parse(raw)
}

export function runSessionPreflightCli({ argv = process.argv.slice(2), cwd = process.cwd() } = {}) {
  const argumentsResult = parseSessionPreflightArguments(argv)
  if (!argumentsResult.ok) {
    process.stderr.write(`${argumentsResult.message}\n`)
    return 2
  }

  let input
  try {
    input = readInput()
  } catch (error) {
    process.stderr.write(`invalid input: ${error.message}\n`)
    return 2
  }

  if (argumentsResult.collectLocal) {
    input = collectLocalSessionEvidence(input, { cwd })
  }

  const result = evaluateSessionPreflight(input)
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  if (result.validationErrors.length > 0) return 2
  return result.status === 'ready' ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runSessionPreflightCli()
}
