#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import {
  evaluateSessionPreflight,
  isSessionPreflightRepository,
} from './session-preflight-core.mjs'
import { spawnSafe } from './validation/spawn-safe.mjs'
import { renderSessionHandoff } from './session-preflight-presentation.mjs'
import { isTriagePath } from './session-preflight-pr-triage.mjs'

function trimOutput(result) {
  return typeof result.stdout === 'string' ? result.stdout.trim() : ''
}

function parseArrayPages(output) {
  // gh --paginate --jq '... | @json' emits one compact JSON array per page.
  // --slurp cannot be combined with --jq. Do not silently drop later pages.
  const pages = output.split(/\r?\n/).map((line) => JSON.parse(line))
  if (!pages.every(Array.isArray)) throw new Error('expected JSON array pages')
  return pages.flat()
}

export function runReadOnly(command, args, cwd, env = {}, spawn = spawnSafe) {
  return spawn(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...env, GIT_TERMINAL_PROMPT: '0', GH_PROMPT_DISABLED: '1', GCM_INTERACTIVE: 'Never' },
  })
}

function originRepositoryFromUrl(value) {
  // Aliases and local paths cannot establish the requested GitHub repository identity.
  const match =
    /^(?:https:\/\/github\.com\/|ssh:\/\/git@github\.com\/|git@github\.com:)([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)\/?$/i.exec(
      value
    )
  if (!match) return null
  const repository = match[1].replace(/\.git$/, '')
  return isSessionPreflightRepository(repository) ? repository : null
}

function failedEvidence(checkedAt, sourceRef, failureCode) {
  return {
    collectionStatus: 'failed',
    checkedAt,
    sourceRef,
    failureCode,
  }
}

export function collectLocalGitEvidence({
  cwd = process.cwd(),
  checkedAt,
  run = runReadOnly,
} = {}) {
  const head = run('git', ['rev-parse', 'HEAD'], cwd)
  if (head.status !== 0) return failedEvidence(checkedAt, 'git:local', 'head-unavailable')

  const branch = run('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], cwd)
  if (![0, 1].includes(branch.status)) {
    return failedEvidence(checkedAt, `git:${trimOutput(head)}`, 'branch-unavailable')
  }

  const status = run('git', ['status', '--porcelain=v1', '--untracked-files=no'], cwd, {
    GIT_OPTIONAL_LOCKS: '0',
  })
  if (status.status !== 0) {
    return failedEvidence(checkedAt, `git:${trimOutput(head)}`, 'status-unavailable')
  }

  const localMain = run('git', ['rev-parse', 'refs/heads/main'], cwd)
  const origin = run('git', ['remote', 'get-url', 'origin'], cwd)
  const originRepository = origin.status === 0 ? originRepositoryFromUrl(trimOutput(origin)) : null
  if (!originRepository) {
    return failedEvidence(checkedAt, `git:${trimOutput(head)}`, 'origin-repository-unavailable')
  }
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
    originRepository,
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

function isCollectedPullRequest(value) {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Number.isInteger(value.number) &&
    value.number > 0 &&
    typeof value.url === 'string' &&
    value.url.length > 0 &&
    typeof value.headRefName === 'string' &&
    value.headRefName.length > 0 &&
    typeof value.baseRefName === 'string' &&
    value.baseRefName.length > 0 &&
    typeof value.title === 'string' &&
    value.title.length > 0 &&
    typeof value.headRefOid === 'string' &&
    /^[0-9a-f]{40}$/i.test(value.headRefOid) &&
    typeof value.isDraft === 'boolean' &&
    typeof value.updatedAt === 'string' &&
    Number.isFinite(Date.parse(value.updatedAt)) &&
    (typeof value.body === 'string' || value.body === null)
  )
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
  includeChangedPaths = false,
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

  const inventoryArgs = [
    'api',
    `repos/${repository}/pulls?state=open&per_page=100`,
    '--method',
    'GET',
    '--paginate',
    '--jq',
    'map({number,url:.html_url,headRefName:.head.ref,headRefOid:.head.sha,baseRefName:.base.ref,title,body,isDraft:.draft,updatedAt:.updated_at}) | @json',
  ]
  const pullRequests = run('gh', inventoryArgs, cwd)
  if (pullRequests.status !== 0) {
    return failedEvidence(checkedAt, `github:${repository}`, 'open-prs-unavailable')
  }

  const pullRequestOutput = trimOutput(pullRequests)
  if (!pullRequestOutput) {
    return failedEvidence(checkedAt, `github:${repository}`, 'open-prs-malformed')
  }

  let parsed
  try {
    parsed = parseArrayPages(pullRequestOutput)
  } catch {
    return failedEvidence(checkedAt, `github:${repository}`, 'open-prs-malformed')
  }
  if (!Array.isArray(parsed) || !parsed.every(isCollectedPullRequest)) {
    return failedEvidence(checkedAt, `github:${repository}`, 'open-prs-malformed')
  }
  if (new Set(parsed.map((pr) => pr.number)).size !== parsed.length)
    return failedEvidence(checkedAt, `github:${repository}`, 'open-prs-duplicated')
  const pathsByNumber = new Map()
  if (includeChangedPaths) {
    for (const pr of parsed) {
      const files = run(
        'gh',
        [
          'api',
          `repos/${repository}/pulls/${pr.number}/files?per_page=100`,
          '--method',
          'GET',
          '--paginate',
          '--jq',
          'map({filename,previous_filename}) | @json',
        ],
        cwd
      )
      const metadata = run(
        'gh',
        [
          'api',
          `repos/${repository}/pulls/${pr.number}`,
          '--method',
          'GET',
          '--jq',
          '{headSha:.head.sha,headBranch:.head.ref,baseBranch:.base.ref,updatedAt:.updated_at,isDraft:.draft,changedFiles:.changed_files,state,merged}',
        ],
        cwd
      )
      if (files.status !== 0 || metadata.status !== 0)
        return failedEvidence(checkedAt, `github:${repository}`, 'pr-paths-unavailable')
      let rows, current
      try {
        rows = parseArrayPages(trimOutput(files))
        current = JSON.parse(trimOutput(metadata))
      } catch {
        return failedEvidence(checkedAt, `github:${repository}`, 'pr-paths-malformed')
      }
      // GitHub's files API caps at 3,000. Never claim a capped/partial diff is complete.
      if (
        !Array.isArray(rows) ||
        !current ||
        !Number.isSafeInteger(current.changedFiles) ||
        current.changedFiles < 1 ||
        current.changedFiles >= 3000 ||
        current.changedFiles !== rows.length ||
        !rows.every(
          (row) =>
            row &&
            isTriagePath(row.filename) &&
            (row.previous_filename == null || isTriagePath(row.previous_filename))
        )
      )
        return failedEvidence(checkedAt, `github:${repository}`, 'pr-paths-incomplete')
      if (
        current.headSha !== pr.headRefOid ||
        current.headBranch !== pr.headRefName ||
        current.baseBranch !== pr.baseRefName ||
        current.updatedAt !== pr.updatedAt ||
        current.isDraft !== pr.isDraft ||
        current.state !== 'open' ||
        current.merged !== false
      )
        return failedEvidence(checkedAt, `github:${repository}`, 'pr-changed-during-collection')
      pathsByNumber.set(
        pr.number,
        [
          ...new Set(
            rows.flatMap((row) => [
              row.filename,
              ...(row.previous_filename ? [row.previous_filename] : []),
            ])
          ),
        ].sort()
      )
    }
    const confirmed = run('gh', inventoryArgs, cwd)
    let confirmedPrs
    try {
      confirmedPrs = parseArrayPages(trimOutput(confirmed))
    } catch {
      /* fail closed below */
    }
    const ordered = (prs) => [...prs].sort((a, b) => a.number - b.number)
    if (
      confirmed.status !== 0 ||
      !Array.isArray(confirmedPrs) ||
      !confirmedPrs.every(isCollectedPullRequest) ||
      JSON.stringify(ordered(confirmedPrs)) !== JSON.stringify(ordered(parsed))
    )
      return failedEvidence(checkedAt, `github:${repository}`, 'open-prs-changed-during-collection')
  }

  const evidence = {
    collectionStatus: 'ready',
    checkedAt,
    sourceRef: `github:${repository}:open-prs`,
    remoteMainSha,
    openPullRequestsComplete: true,
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
        headSha: pullRequest.headRefOid,
        isDraft: pullRequest.isDraft,
        updatedAt: pullRequest.updatedAt,
        ...(pathsByNumber.has(pullRequest.number)
          ? { changedPaths: pathsByNumber.get(pullRequest.number) }
          : {}),
      }
    }),
  }
  if (implementationEvidence !== undefined) {
    evidence.implementationEvidence = implementationEvidence
  }
  return evidence
}

export function parseSessionPreflightArguments(argv) {
  const allowed = new Set(['--stdin', '--collect-local', '--markdown'])
  const unexpected = argv.filter((arg) => !allowed.has(arg))
  if (unexpected.length > 0 || !argv.includes('--stdin')) {
    return {
      ok: false,
      message: 'usage: node scripts/session-preflight.mjs --stdin [--collect-local] [--markdown]',
    }
  }
  return {
    ok: true,
    collectLocal: argv.includes('--collect-local'),
    ...(argv.includes('--markdown') ? { markdown: true } : {}),
  }
}

export function collectLocalSessionEvidence(
  input,
  { cwd = process.cwd(), run = runReadOnly, now = () => new Date().toISOString() } = {}
) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input
  if (!isSessionPreflightRepository(input.repository)) return input

  const checkedAt = now()
  const github = collectGitHubEvidence({
    repository: input.repository,
    checkedAt,
    implementationEvidence: input.github?.implementationEvidence,
    includeChangedPaths: input.openPrTriage !== undefined,
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
  process.stdout.write(
    argumentsResult.markdown ? renderSessionHandoff(result) : `${JSON.stringify(result, null, 2)}\n`
  )
  if (result.validationErrors.length > 0) return 2
  return result.status === 'ready' ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runSessionPreflightCli()
}
