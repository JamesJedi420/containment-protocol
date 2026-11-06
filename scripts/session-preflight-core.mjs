import { validateLinearMcpDiagnostic } from './session-preflight-linear-diagnostics.mjs'

const SCHEMA_VERSION = 1
const SHA_RE = /^[0-9a-f]{40}$/i
const ISSUE_RE = /^[A-Z][A-Z0-9]+-\d+$/
const REPOSITORY_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
const ZONED_ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/
const WORKSTREAMS = new Set(['CP-core', 'Academy', 'shared-system', 'cross-project'])
const OPERATIONS = new Set(['start', 'resume'])
const EXECUTION_MODES = new Set(['local-checkout', 'codex-managed-worktree'])
const COLLECTION_STATUSES = new Set(['ready', 'needsAuth', 'failed', 'unchecked'])
const READ_ONLY_COLLECTION_STATUSES = new Set(['ready', 'failed', 'unchecked'])
const LIFECYCLE_TYPES = new Set(['backlog', 'unstarted', 'started', 'completed', 'canceled'])
const APPROVAL_STATES = new Set(['approved', 'not-approved', 'unknown'])

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

// Literal branch names only; do not expand checkout/reflog expressions using
// repository state. Mirrors git check-ref-format --branch syntax.
function isBranchName(value) {
  if (!isNonEmptyString(value) || value === 'HEAD' || value.startsWith('-')) return false
  if (value.endsWith('.') || value.includes('..') || value.includes('@{')) return false
  if (
    [...value].some(
      (char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127 || '~^:?*[\\'.includes(char)
    )
  )
    return false
  return value
    .split('/')
    .every((part) => part.length > 0 && !part.startsWith('.') && !part.endsWith('.lock'))
}

export function isSessionPreflightRepository(value) {
  return isNonEmptyString(value) && REPOSITORY_RE.test(value)
}

function isNullableString(value) {
  return value === null || isNonEmptyString(value)
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isNonEmptyString)
}

function isIssueId(value) {
  return typeof value === 'string' && ISSUE_RE.test(value)
}

function isIssueArray(value) {
  return Array.isArray(value) && value.every(isIssueId)
}

function isIsoTimestamp(value) {
  return isNonEmptyString(value) && ZONED_ISO_RE.test(value) && Number.isFinite(Date.parse(value))
}

function isSha(value) {
  return typeof value === 'string' && SHA_RE.test(value)
}

function compareStrings(left, right) {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function sameStrings(left, right) {
  const leftValues = [...new Set(left)].sort(compareStrings)
  const rightValues = [...new Set(right)].sort(compareStrings)
  return JSON.stringify(leftValues) === JSON.stringify(rightValues)
}

function pushError(errors, condition, message) {
  if (!condition) errors.push(message)
}

function validateEvidenceHeader(errors, value, path, allowedStatuses = COLLECTION_STATUSES) {
  pushError(errors, isObject(value), `${path} must be an object`)
  if (!isObject(value)) return
  pushError(
    errors,
    allowedStatuses.has(value.collectionStatus),
    `${path}.collectionStatus is invalid`
  )
  pushError(
    errors,
    isIsoTimestamp(value.checkedAt),
    `${path}.checkedAt must be timezone-qualified ISO-8601`
  )
  pushError(errors, isNonEmptyString(value.sourceRef), `${path}.sourceRef is required`)
}

function validateRootFields(errors, input) {
  pushError(
    errors,
    input.schemaVersion === SCHEMA_VERSION,
    `schemaVersion must be ${SCHEMA_VERSION}`
  )
  pushError(errors, isSessionPreflightRepository(input.repository), 'repository must be owner/name')
  pushError(
    errors,
    isIsoTimestamp(input.observedAt),
    'observedAt must be timezone-qualified ISO-8601'
  )
  pushError(
    errors,
    Number.isSafeInteger(input.freshnessWindowSeconds) && input.freshnessWindowSeconds > 0,
    'freshnessWindowSeconds must be a positive safe integer'
  )
  pushError(errors, OPERATIONS.has(input.requestedOperation), 'requestedOperation is invalid')
  pushError(errors, EXECUTION_MODES.has(input.executionMode), 'executionMode is invalid')
}

function validateHandoff(errors, handoff) {
  pushError(errors, isObject(handoff), 'handoff must be an object')
  if (!isObject(handoff)) return
  pushError(errors, isIssueId(handoff.issueId), 'handoff.issueId is invalid')
  pushError(errors, WORKSTREAMS.has(handoff.workstream), 'handoff.workstream is invalid')
  pushError(
    errors,
    handoff.parentId === null || isIssueId(handoff.parentId),
    'handoff.parentId is invalid'
  )
  pushError(errors, isNullableString(handoff.sliceRef), 'handoff.sliceRef must be a string or null')
  pushError(
    errors,
    isBranchName(handoff.intendedBranch),
    'handoff.intendedBranch must be a valid literal Git branch name'
  )
  pushError(errors, isSha(handoff.expectedBaseMainSha), 'handoff.expectedBaseMainSha is invalid')
  pushError(
    errors,
    isIssueArray(handoff.blockerIds),
    'handoff.blockerIds must be issue identifiers'
  )
  pushError(
    errors,
    isIssueArray(handoff.dependencyIds),
    'handoff.dependencyIds must be issue identifiers'
  )
}

function validateLinearEvidence(errors, linear) {
  validateEvidenceHeader(errors, linear, 'linear')
  if (!isObject(linear) || linear.collectionStatus !== 'ready') return
  pushError(errors, isIssueId(linear.issueId), 'linear.issueId is invalid')
  pushError(errors, WORKSTREAMS.has(linear.workstream), 'linear.workstream is invalid')
  pushError(
    errors,
    linear.parentId === null || isIssueId(linear.parentId),
    'linear.parentId is invalid'
  )
  pushError(errors, isNonEmptyString(linear.status), 'linear.status is required')
  pushError(errors, LIFECYCLE_TYPES.has(linear.statusType), 'linear.statusType is invalid')
  pushError(errors, APPROVAL_STATES.has(linear.approvalState), 'linear.approvalState is invalid')
  pushError(errors, isIssueArray(linear.blockerIds), 'linear.blockerIds must be issue identifiers')
  pushError(
    errors,
    isIssueArray(linear.dependencyIds),
    'linear.dependencyIds must be issue identifiers'
  )
}

function validatePullRequest(errors, pullRequest, index) {
  const path = `github.openPullRequests[${index}]`
  pushError(errors, isObject(pullRequest), `${path} must be an object`)
  if (!isObject(pullRequest)) return
  pushError(
    errors,
    Number.isSafeInteger(pullRequest.number) && pullRequest.number > 0,
    `${path}.number is invalid`
  )
  pushError(errors, isNonEmptyString(pullRequest.url), `${path}.url is required`)
  pushError(errors, isNonEmptyString(pullRequest.headBranch), `${path}.headBranch is required`)
  pushError(errors, isNonEmptyString(pullRequest.baseBranch), `${path}.baseBranch is required`)
  pushError(
    errors,
    pullRequest.issueId === null || isIssueId(pullRequest.issueId),
    `${path}.issueId is invalid`
  )
  pushError(
    errors,
    typeof pullRequest.ownershipVerified === 'boolean',
    `${path}.ownershipVerified must be boolean`
  )
  pushError(errors, pullRequest.state === 'open', `${path}.state must be open`)
  pushError(errors, pullRequest.merged === false, `${path}.merged must be false`)
}

function validateImplementationEvidence(errors, evidence) {
  if (evidence === undefined) return
  pushError(errors, isObject(evidence), 'github.implementationEvidence must be an object')
  if (!isObject(evidence)) return
  pushError(
    errors,
    isIsoTimestamp(evidence.checkedAt),
    'github.implementationEvidence.checkedAt must be timezone-qualified ISO-8601'
  )
  pushError(
    errors,
    isNonEmptyString(evidence.sourceRef),
    'github.implementationEvidence.sourceRef is required'
  )
  pushError(
    errors,
    typeof evidence.mergedCurrentMain === 'boolean',
    'github.implementationEvidence.mergedCurrentMain must be boolean'
  )
  pushError(
    errors,
    isStringArray(evidence.mergedPrUrls),
    'github.implementationEvidence.mergedPrUrls must be strings'
  )
}

function validateGitHubEvidence(errors, github) {
  validateEvidenceHeader(errors, github, 'github', READ_ONLY_COLLECTION_STATUSES)
  if (!isObject(github)) return
  validateImplementationEvidence(errors, github.implementationEvidence)
  if (github.collectionStatus !== 'ready') return
  pushError(errors, isSha(github.remoteMainSha), 'github.remoteMainSha is invalid')
  pushError(
    errors,
    Array.isArray(github.openPullRequests),
    'github.openPullRequests must be an array'
  )
  if (Array.isArray(github.openPullRequests)) {
    github.openPullRequests.forEach((pullRequest, index) =>
      validatePullRequest(errors, pullRequest, index)
    )
  }
}

function validateGitEvidence(errors, git) {
  validateEvidenceHeader(errors, git, 'git', READ_ONLY_COLLECTION_STATUSES)
  if (!isObject(git) || git.collectionStatus !== 'ready') return
  pushError(errors, isSha(git.headSha), 'git.headSha is invalid')
  pushError(
    errors,
    isSessionPreflightRepository(git.originRepository),
    'git.originRepository is invalid'
  )
  pushError(
    errors,
    isNullableString(git.currentBranch),
    'git.currentBranch must be a string or null'
  )
  pushError(errors, typeof git.detachedHead === 'boolean', 'git.detachedHead must be boolean')
  pushError(errors, typeof git.trackedDirty === 'boolean', 'git.trackedDirty must be boolean')
  pushError(
    errors,
    git.localMainSha === null || isSha(git.localMainSha),
    'git.localMainSha is invalid'
  )
  pushError(errors, isSha(git.remoteMainSha), 'git.remoteMainSha is invalid')
}

export function validateSessionPreflightInput(input) {
  if (!isObject(input)) return ['input must be an object']
  const errors = []
  validateRootFields(errors, input)
  validateHandoff(errors, input.handoff)
  validateLinearEvidence(errors, input.linear)
  validateGitHubEvidence(errors, input.github)
  validateGitEvidence(errors, input.git)
  if (input.linearMcp !== undefined) {
    errors.push(...validateLinearMcpDiagnostic(input.linearMcp))
    if (typeof input.observedAt === 'string' && /\.\d{4,}/.test(input.observedAt)) {
      errors.push('linearMcp freshness requires observedAt at millisecond precision or coarser')
    }
  }
  return errors
}

function makeReason(code, source, detail) {
  return { code, source, detail }
}

function addTimestampFreshnessReason(
  { checkedAt, observedAt, freshnessWindowSeconds, source, codePrefix },
  reasons
) {
  const ageSeconds = (Date.parse(observedAt) - Date.parse(checkedAt)) / 1000
  if (ageSeconds < -30) {
    reasons.push(
      makeReason(
        `${codePrefix}_from_future`,
        source,
        `${source} evidence is ${Math.abs(ageSeconds)}s in the future`
      )
    )
  } else if (ageSeconds > freshnessWindowSeconds) {
    reasons.push(
      makeReason(`${codePrefix}_stale`, source, `${source} evidence is ${ageSeconds}s old`)
    )
  }
}

function addFreshnessReasons(input, reasons) {
  for (const [source, evidence] of [
    ['linear', input.linear],
    ['github', input.github],
    ['git', input.git],
  ]) {
    if (evidence.collectionStatus !== 'ready') {
      reasons.push(
        makeReason(
          `${source}_evidence_unavailable`,
          source,
          `${source} collection status is ${evidence.collectionStatus}`
        )
      )
      continue
    }
    addTimestampFreshnessReason(
      {
        checkedAt: evidence.checkedAt,
        observedAt: input.observedAt,
        freshnessWindowSeconds: input.freshnessWindowSeconds,
        source,
        codePrefix: `${source}_evidence`,
      },
      reasons
    )
  }

  const implementationEvidence = input.github.implementationEvidence
  if (isObject(implementationEvidence)) {
    addTimestampFreshnessReason(
      {
        checkedAt: implementationEvidence.checkedAt,
        observedAt: input.observedAt,
        freshnessWindowSeconds: input.freshnessWindowSeconds,
        source: 'github-implementation',
        codePrefix: 'github_implementation_evidence',
      },
      reasons
    )
  }
}

function formatIssueIds(issueIds) {
  return [...issueIds].sort(compareStrings).join(', ')
}

function evaluateLinear(input, reasons) {
  const { handoff, linear, requestedOperation } = input
  if (linear.collectionStatus !== 'ready') return
  if (linear.issueId !== handoff.issueId) {
    reasons.push(
      makeReason(
        'linear_issue_mismatch',
        'linear',
        `expected ${handoff.issueId}; observed ${linear.issueId}`
      )
    )
  }
  if (linear.workstream !== handoff.workstream) {
    reasons.push(
      makeReason(
        'linear_workstream_mismatch',
        'linear',
        `expected ${handoff.workstream}; observed ${linear.workstream}`
      )
    )
  }
  if (linear.parentId !== handoff.parentId) {
    reasons.push(
      makeReason(
        'linear_parent_mismatch',
        'linear',
        `expected parent ${handoff.parentId ?? 'none'}; observed ${linear.parentId ?? 'none'}`
      )
    )
  }
  if (linear.approvalState === 'unknown') {
    reasons.push(
      makeReason('approval_state_unknown', 'linear', 'current approval state could not be verified')
    )
  } else if (linear.approvalState === 'not-approved') {
    reasons.push(
      makeReason(
        'scope_not_approved',
        'linear',
        'the named implementation boundary is not approved'
      )
    )
  }
  if (linear.statusType === 'completed' || linear.statusType === 'canceled') {
    reasons.push(
      makeReason('issue_not_active', 'linear', `issue lifecycle is ${linear.statusType}`)
    )
  }
  if (
    requestedOperation === 'start' &&
    linear.statusType === 'started' &&
    handoff.sliceRef === null
  ) {
    reasons.push(
      makeReason(
        'issue_already_started',
        'linear',
        'start on an In Progress issue requires an explicitly named approved slice'
      )
    )
  }
  if (requestedOperation === 'resume' && linear.statusType !== 'started') {
    reasons.push(
      makeReason(
        'issue_not_started',
        'linear',
        `resume requires started lifecycle; observed ${linear.statusType}`
      )
    )
  }
  if (!sameStrings(handoff.blockerIds, linear.blockerIds)) {
    reasons.push(
      makeReason(
        'blocker_snapshot_changed',
        'linear',
        'current blockers differ from the handoff snapshot'
      )
    )
  }
  if (!sameStrings(handoff.dependencyIds, linear.dependencyIds)) {
    reasons.push(
      makeReason(
        'dependency_snapshot_changed',
        'linear',
        'current dependencies differ from the handoff snapshot'
      )
    )
  }
  if (linear.blockerIds.length > 0) {
    reasons.push(
      makeReason(
        'issue_blocked',
        'linear',
        `unresolved blockers: ${formatIssueIds(linear.blockerIds)}`
      )
    )
  }
  if (linear.dependencyIds.length > 0) {
    reasons.push(
      makeReason(
        'dependency_unresolved',
        'linear',
        `unresolved dependencies: ${formatIssueIds(linear.dependencyIds)}`
      )
    )
  }
}

function formatPullRequestNumbers(pullRequests) {
  return pullRequests.map((pullRequest) => `#${pullRequest.number}`).join(', ')
}

function evaluateMatchingResumePullRequest(pullRequest, handoff, reasons) {
  if (!pullRequest.ownershipVerified || pullRequest.issueId === null) {
    reasons.push(
      makeReason(
        'pr_ownership_unverified',
        'github',
        `pull request #${pullRequest.number} has no single verified issue owner`
      )
    )
    return
  }
  if (pullRequest.issueId !== handoff.issueId) {
    reasons.push(
      makeReason(
        'pr_issue_mismatch',
        'github',
        `pull request #${pullRequest.number} belongs to ${pullRequest.issueId}`
      )
    )
  }
  if (pullRequest.headBranch !== handoff.intendedBranch) {
    reasons.push(
      makeReason(
        'pr_branch_mismatch',
        'github',
        `expected ${handoff.intendedBranch}; observed ${pullRequest.headBranch}`
      )
    )
  }
  if (pullRequest.baseBranch !== 'main') {
    reasons.push(
      makeReason(
        'pr_base_mismatch',
        'github',
        `pull request #${pullRequest.number} targets ${pullRequest.baseBranch}`
      )
    )
  }
}

function evaluateResumePullRequests(pullRequests, handoff, reasons) {
  if (pullRequests.length === 0) {
    reasons.push(
      makeReason('resume_pr_missing', 'github', 'resume requires the matching open pull request')
    )
    return
  }
  if (pullRequests.length > 1) {
    reasons.push(
      makeReason(
        'multiple_open_prs',
        'github',
        `open pull requests: ${formatPullRequestNumbers(pullRequests)}`
      )
    )
    return
  }
  evaluateMatchingResumePullRequest(pullRequests[0], handoff, reasons)
}

function evaluateGitHub(input, reasons) {
  const { github, handoff, requestedOperation } = input
  if (github.collectionStatus === 'ready') {
    if (github.remoteMainSha !== handoff.expectedBaseMainSha) {
      reasons.push(
        makeReason(
          'remote_main_advanced',
          'github',
          `expected ${handoff.expectedBaseMainSha}; observed ${github.remoteMainSha}`
        )
      )
    }
    const pullRequests = [...github.openPullRequests].sort(
      (left, right) => left.number - right.number
    )
    if (requestedOperation === 'start' && pullRequests.length > 0) {
      reasons.push(
        makeReason(
          'open_pr_blocks_start',
          'github',
          `open pull requests: ${formatPullRequestNumbers(pullRequests)}`
        )
      )
    } else if (requestedOperation === 'resume') {
      evaluateResumePullRequests(pullRequests, handoff, reasons)
    }
  }

  if (
    input.github.implementationEvidence?.mergedCurrentMain &&
    input.linear.collectionStatus === 'ready' &&
    input.linear.statusType !== 'completed'
  ) {
    reasons.push(
      makeReason(
        'lifecycle_evidence_conflict',
        'github',
        'implementation is on current main while Linear lifecycle is not completed'
      )
    )
  }
}

function evaluateRemoteGitState(input, reasons) {
  const { git, github, handoff } = input
  if (git.originRepository.toLowerCase() !== input.repository.toLowerCase()) {
    reasons.push(
      makeReason(
        'git_repository_mismatch',
        'git',
        `expected ${input.repository}; origin names ${git.originRepository}`
      )
    )
  }
  if (github.collectionStatus === 'ready' && git.remoteMainSha !== github.remoteMainSha) {
    reasons.push(
      makeReason(
        'remote_main_observation_conflict',
        'git',
        `git observed ${git.remoteMainSha}; GitHub observed ${github.remoteMainSha}`
      )
    )
  }
  if (git.remoteMainSha !== handoff.expectedBaseMainSha) {
    reasons.push(
      makeReason(
        'git_remote_main_mismatch',
        'git',
        `expected ${handoff.expectedBaseMainSha}; observed ${git.remoteMainSha}`
      )
    )
  }
}

function evaluateLocalCheckout(input, reasons) {
  const { git, handoff, requestedOperation } = input
  if (git.detachedHead) {
    reasons.push(
      makeReason('local_checkout_detached', 'git', 'local checkout mode cannot use detached HEAD')
    )
  }
  const expectedBranch = requestedOperation === 'start' ? 'main' : handoff.intendedBranch
  if (git.currentBranch !== expectedBranch) {
    reasons.push(
      makeReason(
        'local_branch_mismatch',
        'git',
        `expected ${expectedBranch}; observed ${git.currentBranch ?? 'detached'}`
      )
    )
  }
  if (git.localMainSha !== handoff.expectedBaseMainSha) {
    reasons.push(
      makeReason(
        'local_main_diverged',
        'git',
        `expected ${handoff.expectedBaseMainSha}; observed ${git.localMainSha ?? 'unknown'}`
      )
    )
  }
  if (requestedOperation === 'start' && git.headSha !== handoff.expectedBaseMainSha) {
    reasons.push(
      makeReason(
        'local_head_mismatch',
        'git',
        `expected ${handoff.expectedBaseMainSha}; observed ${git.headSha}`
      )
    )
  }
}

function evaluateManagedWorktree(input, reasons) {
  const { git, handoff, requestedOperation } = input
  if (requestedOperation === 'start') {
    if (!git.detachedHead || git.currentBranch !== null) {
      reasons.push(
        makeReason(
          'managed_worktree_not_detached',
          'git',
          'a new Codex managed worktree must begin at detached HEAD'
        )
      )
    }
    if (git.headSha !== handoff.expectedBaseMainSha) {
      reasons.push(
        makeReason(
          'managed_worktree_base_mismatch',
          'git',
          `expected ${handoff.expectedBaseMainSha}; observed ${git.headSha}`
        )
      )
    }
    return
  }
  if (git.detachedHead || git.currentBranch !== handoff.intendedBranch) {
    reasons.push(
      makeReason(
        'managed_resume_branch_mismatch',
        'git',
        `resume requires branch ${handoff.intendedBranch}; observed ${git.currentBranch ?? 'detached'}`
      )
    )
  }
}

function evaluateGit(input, reasons) {
  const { git, executionMode } = input
  if (git.collectionStatus !== 'ready') return
  if (git.trackedDirty) {
    reasons.push(makeReason('tracked_worktree_dirty', 'git', 'tracked changes are present'))
  }
  evaluateRemoteGitState(input, reasons)
  if (executionMode === 'local-checkout') {
    evaluateLocalCheckout(input, reasons)
  } else {
    evaluateManagedWorktree(input, reasons)
  }
}

const UNKNOWN_CODES = new Set([
  'linear_mcp_unavailable',
  'linear_mcp_stale',
  'linear_mcp_from_future',
  'linear_mcp_evidence_conflict',
  'invalid_input',
  'linear_evidence_unavailable',
  'github_evidence_unavailable',
  'git_evidence_unavailable',
  'linear_evidence_stale',
  'github_evidence_stale',
  'git_evidence_stale',
  'linear_evidence_from_future',
  'github_evidence_from_future',
  'git_evidence_from_future',
  'github_implementation_evidence_stale',
  'github_implementation_evidence_from_future',
  'linear_issue_mismatch',
  'linear_parent_mismatch',
  'linear_workstream_mismatch',
  'git_repository_mismatch',
  'approval_state_unknown',
  'pr_ownership_unverified',
  'remote_main_observation_conflict',
  'lifecycle_evidence_conflict',
])

export function compareSessionPreflightReasons(left, right) {
  return compareStrings(
    `${left.source}:${left.code}:${left.detail}`,
    `${right.source}:${right.code}:${right.detail}`
  )
}

function stableReasons(reasons) {
  const seen = new Set()
  return reasons
    .filter((reason) => {
      const key = `${reason.source}\u0000${reason.code}\u0000${reason.detail}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort(compareSessionPreflightReasons)
}

function resolvePreflightStatus(reasons) {
  if (reasons.some((reason) => UNKNOWN_CODES.has(reason.code))) return 'unknown'
  if (reasons.length > 0) return 'blocked'
  return 'ready'
}

function invalidInputResult(input, validationErrors) {
  const sortedValidationErrors = [...validationErrors].sort(compareStrings)
  return {
    schemaVersion: SCHEMA_VERSION,
    status: 'unknown',
    readOnly: true,
    issueId: isObject(input?.handoff) ? (input.handoff.issueId ?? null) : null,
    requestedOperation: input?.requestedOperation ?? null,
    executionMode: input?.executionMode ?? null,
    reasons: [makeReason('invalid_input', 'input', sortedValidationErrors.join('; '))],
    evidence: null,
    sources: [],
    validationErrors: sortedValidationErrors,
  }
}

function projectLinearLifecycle(linear) {
  const ready = linear.collectionStatus === 'ready'
  return {
    status: ready ? linear.status : null,
    workstream: ready ? linear.workstream : null,
    statusType: ready ? linear.statusType : null,
    checkedAt: linear.checkedAt,
    sourceRef: linear.sourceRef,
  }
}

function projectOpenPullRequests(github) {
  if (github.collectionStatus !== 'ready' || !Array.isArray(github.openPullRequests)) return []
  return github.openPullRequests.map((pullRequest) => ({
    number: pullRequest.number,
    url: pullRequest.url,
    headBranch: pullRequest.headBranch,
    baseBranch: pullRequest.baseBranch,
    issueId: pullRequest.issueId,
    ownershipVerified: pullRequest.ownershipVerified,
  }))
}

function projectGitHubImplementation(github) {
  const implementationEvidence = isObject(github.implementationEvidence)
    ? github.implementationEvidence
    : null
  return {
    checkedAt: github.checkedAt,
    sourceRef: github.sourceRef,
    openPullRequests: projectOpenPullRequests(github),
    mergedCurrentMain: implementationEvidence?.mergedCurrentMain ?? null,
    mergedPrUrls: implementationEvidence?.mergedPrUrls ?? [],
    implementationEvidenceCheckedAt: implementationEvidence?.checkedAt ?? null,
    implementationEvidenceSourceRef: implementationEvidence?.sourceRef ?? null,
  }
}

function projectGitEvidence(git) {
  const ready = git.collectionStatus === 'ready'
  return {
    checkedAt: git.checkedAt,
    sourceRef: git.sourceRef,
    headSha: ready ? git.headSha : null,
    originRepository: ready ? git.originRepository : null,
    currentBranch: ready ? git.currentBranch : null,
    detachedHead: ready ? git.detachedHead : null,
    trackedDirty: ready ? git.trackedDirty : null,
    localMainSha: ready ? git.localMainSha : null,
    remoteMainSha: ready ? git.remoteMainSha : null,
  }
}

function collectSourceRefs(input) {
  const sourceRefs = [input.linear.sourceRef, input.github.sourceRef, input.git.sourceRef]
  if (input.linearMcp?.evidenceRef) sourceRefs.push(input.linearMcp.evidenceRef)
  if (isObject(input.github.implementationEvidence)) {
    sourceRefs.push(input.github.implementationEvidence.sourceRef)
  }
  return [...new Set(sourceRefs)].sort(compareStrings)
}

export function evaluateSessionPreflight(input) {
  const validationErrors = validateSessionPreflightInput(input)
  if (validationErrors.length > 0) return invalidInputResult(input, validationErrors)

  const reasons = []
  addFreshnessReasons(input, reasons)
  evaluateLinear(input, reasons)
  evaluateGitHub(input, reasons)
  evaluateGit(input, reasons)
  if (input.linearMcp !== undefined) {
    const diagnostic = input.linearMcp
    if (diagnostic.status !== 'ready') {
      reasons.push(makeReason('linear_mcp_unavailable', 'linearMcp', diagnostic.retryGuidance))
    }
    if (diagnostic.checkedAt !== null) {
      addTimestampFreshnessReason(
        {
          checkedAt: diagnostic.checkedAt,
          observedAt: input.observedAt,
          freshnessWindowSeconds: input.freshnessWindowSeconds,
          source: 'linearMcp',
          codePrefix: 'linear_mcp',
        },
        reasons
      )
    }
    if (
      (diagnostic.status === 'ready' && input.linear.collectionStatus !== 'ready') ||
      (diagnostic.evidenceRef !== null &&
        diagnostic.evidenceRef !== `linear:${input.handoff.issueId}`)
    ) {
      reasons.push(
        makeReason(
          'linear_mcp_evidence_conflict',
          'linearMcp',
          'connection observation does not match current issue evidence'
        )
      )
    }
  }
  const orderedReasons = stableReasons(reasons)

  return {
    schemaVersion: SCHEMA_VERSION,
    status: resolvePreflightStatus(orderedReasons),
    readOnly: true,
    issueId: input.handoff.issueId,
    workstream: input.handoff.workstream,
    requestedOperation: input.requestedOperation,
    executionMode: input.executionMode,
    reasons: orderedReasons,
    evidence: {
      linearLifecycle: projectLinearLifecycle(input.linear),
      githubImplementation: projectGitHubImplementation(input.github),
      git: projectGitEvidence(input.git),
      ...(input.linearMcp === undefined
        ? {}
        : { linearMcp: { ...input.linearMcp, readOnly: true, writeCapability: 'unverified' } }),
    },
    sources: collectSourceRefs(input),
    validationErrors: [],
  }
}

export const SESSION_PREFLIGHT_SCHEMA_VERSION = SCHEMA_VERSION
