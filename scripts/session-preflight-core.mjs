const SCHEMA_VERSION = 1
const SHA_RE = /^[0-9a-f]{40}$/i
const ISSUE_RE = /^[A-Z][A-Z0-9]+-\d+$/
const REPOSITORY_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
const WORKSTREAMS = new Set(['CP-core', 'Academy', 'shared-system', 'cross-project'])
const OPERATIONS = new Set(['start', 'resume'])
const EXECUTION_MODES = new Set(['local-checkout', 'codex-managed-worktree'])
const COLLECTION_STATUSES = new Set(['ready', 'needsAuth', 'failed', 'unchecked'])
const LIFECYCLE_TYPES = new Set(['backlog', 'unstarted', 'started', 'completed', 'canceled'])
const APPROVAL_STATES = new Set(['approved', 'not-approved', 'unknown'])

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isNullableString(value) {
  return value === null || isNonEmptyString(value)
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isNonEmptyString)
}

function isIssueArray(value) {
  return Array.isArray(value) && value.every((item) => ISSUE_RE.test(item))
}

function isIsoTimestamp(value) {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value))
}

function isSha(value) {
  return typeof value === 'string' && SHA_RE.test(value)
}

function sameStrings(left, right) {
  return JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort())
}

function pushError(errors, condition, message) {
  if (!condition) errors.push(message)
}

function validateEvidenceHeader(errors, value, path, allowedStatuses = COLLECTION_STATUSES) {
  pushError(errors, isObject(value), `${path} must be an object`)
  if (!isObject(value)) return
  pushError(errors, allowedStatuses.has(value.collectionStatus), `${path}.collectionStatus is invalid`)
  pushError(errors, isIsoTimestamp(value.checkedAt), `${path}.checkedAt must be ISO-8601`)
  pushError(errors, isNonEmptyString(value.sourceRef), `${path}.sourceRef is required`)
}

export function validateSessionPreflightInput(input) {
  const errors = []
  pushError(errors, isObject(input), 'input must be an object')
  if (!isObject(input)) return errors

  pushError(errors, input.schemaVersion === SCHEMA_VERSION, `schemaVersion must be ${SCHEMA_VERSION}`)
  pushError(errors, isNonEmptyString(input.repository) && REPOSITORY_RE.test(input.repository), 'repository must be owner/name')
  pushError(errors, isIsoTimestamp(input.observedAt), 'observedAt must be ISO-8601')
  pushError(
    errors,
    Number.isSafeInteger(input.freshnessWindowSeconds) && input.freshnessWindowSeconds > 0,
    'freshnessWindowSeconds must be a positive safe integer'
  )
  pushError(errors, OPERATIONS.has(input.requestedOperation), 'requestedOperation is invalid')
  pushError(errors, EXECUTION_MODES.has(input.executionMode), 'executionMode is invalid')

  const handoff = input.handoff
  pushError(errors, isObject(handoff), 'handoff must be an object')
  if (isObject(handoff)) {
    pushError(errors, ISSUE_RE.test(handoff.issueId ?? ''), 'handoff.issueId is invalid')
    pushError(errors, WORKSTREAMS.has(handoff.workstream), 'handoff.workstream is invalid')
    pushError(errors, handoff.parentId === null || ISSUE_RE.test(handoff.parentId ?? ''), 'handoff.parentId is invalid')
    pushError(errors, isNullableString(handoff.sliceRef), 'handoff.sliceRef must be a string or null')
    pushError(errors, isNonEmptyString(handoff.intendedBranch), 'handoff.intendedBranch is required')
    pushError(errors, isSha(handoff.expectedBaseMainSha), 'handoff.expectedBaseMainSha is invalid')
    pushError(errors, isIssueArray(handoff.blockerIds), 'handoff.blockerIds must be issue identifiers')
    pushError(errors, isIssueArray(handoff.dependencyIds), 'handoff.dependencyIds must be issue identifiers')
  }

  const linear = input.linear
  validateEvidenceHeader(errors, linear, 'linear')
  if (isObject(linear) && linear.collectionStatus === 'ready') {
    pushError(errors, ISSUE_RE.test(linear.issueId ?? ''), 'linear.issueId is invalid')
    pushError(errors, linear.parentId === null || ISSUE_RE.test(linear.parentId ?? ''), 'linear.parentId is invalid')
    pushError(errors, isNonEmptyString(linear.status), 'linear.status is required')
    pushError(errors, LIFECYCLE_TYPES.has(linear.statusType), 'linear.statusType is invalid')
    pushError(errors, APPROVAL_STATES.has(linear.approvalState), 'linear.approvalState is invalid')
    pushError(errors, isIssueArray(linear.blockerIds), 'linear.blockerIds must be issue identifiers')
    pushError(errors, isIssueArray(linear.dependencyIds), 'linear.dependencyIds must be issue identifiers')
  }

  const github = input.github
  validateEvidenceHeader(errors, github, 'github', new Set(['ready', 'failed', 'unchecked']))
  if (isObject(github) && github.collectionStatus === 'ready') {
    pushError(errors, isSha(github.remoteMainSha), 'github.remoteMainSha is invalid')
    pushError(errors, Array.isArray(github.openPullRequests), 'github.openPullRequests must be an array')
    if (Array.isArray(github.openPullRequests)) {
      github.openPullRequests.forEach((pullRequest, index) => {
        const path = `github.openPullRequests[${index}]`
        pushError(errors, isObject(pullRequest), `${path} must be an object`)
        if (!isObject(pullRequest)) return
        pushError(errors, Number.isSafeInteger(pullRequest.number) && pullRequest.number > 0, `${path}.number is invalid`)
        pushError(errors, isNonEmptyString(pullRequest.url), `${path}.url is required`)
        pushError(errors, isNonEmptyString(pullRequest.headBranch), `${path}.headBranch is required`)
        pushError(errors, isNonEmptyString(pullRequest.baseBranch), `${path}.baseBranch is required`)
        pushError(errors, pullRequest.issueId === null || ISSUE_RE.test(pullRequest.issueId ?? ''), `${path}.issueId is invalid`)
        pushError(errors, typeof pullRequest.ownershipVerified === 'boolean', `${path}.ownershipVerified must be boolean`)
        pushError(errors, pullRequest.state === 'open', `${path}.state must be open`)
        pushError(errors, pullRequest.merged === false, `${path}.merged must be false`)
      })
    }
    if (github.implementationEvidence !== undefined) {
      const evidence = github.implementationEvidence
      pushError(errors, isObject(evidence), 'github.implementationEvidence must be an object')
      if (isObject(evidence)) {
        pushError(errors, typeof evidence.mergedCurrentMain === 'boolean', 'github.implementationEvidence.mergedCurrentMain must be boolean')
        pushError(errors, isStringArray(evidence.mergedPrUrls), 'github.implementationEvidence.mergedPrUrls must be strings')
      }
    }
  }

  const git = input.git
  validateEvidenceHeader(errors, git, 'git', new Set(['ready', 'failed', 'unchecked']))
  if (isObject(git) && git.collectionStatus === 'ready') {
    pushError(errors, isSha(git.headSha), 'git.headSha is invalid')
    pushError(errors, isNullableString(git.currentBranch), 'git.currentBranch must be a string or null')
    pushError(errors, typeof git.detachedHead === 'boolean', 'git.detachedHead must be boolean')
    pushError(errors, typeof git.trackedDirty === 'boolean', 'git.trackedDirty must be boolean')
    pushError(errors, git.localMainSha === null || isSha(git.localMainSha), 'git.localMainSha is invalid')
    pushError(errors, isSha(git.remoteMainSha), 'git.remoteMainSha is invalid')
  }

  return errors
}

function makeReason(code, source, detail) {
  return { code, source, detail }
}

function addFreshnessReasons(input, reasons) {
  const observedAt = Date.parse(input.observedAt)
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
    const checkedAt = Date.parse(evidence.checkedAt)
    const ageSeconds = Math.floor((observedAt - checkedAt) / 1000)
    if (ageSeconds < -30) {
      reasons.push(makeReason(`${source}_evidence_from_future`, source, `${source} evidence is ${Math.abs(ageSeconds)}s in the future`))
    } else if (ageSeconds > input.freshnessWindowSeconds) {
      reasons.push(makeReason(`${source}_evidence_stale`, source, `${source} evidence is ${ageSeconds}s old`))
    }
  }
}

function evaluateLinear(input, reasons) {
  const { handoff, linear, requestedOperation } = input
  if (linear.collectionStatus !== 'ready') return
  if (linear.issueId !== handoff.issueId) {
    reasons.push(makeReason('linear_issue_mismatch', 'linear', `expected ${handoff.issueId}; observed ${linear.issueId}`))
  }
  if (linear.parentId !== handoff.parentId) {
    reasons.push(makeReason('linear_parent_mismatch', 'linear', `expected parent ${handoff.parentId ?? 'none'}; observed ${linear.parentId ?? 'none'}`))
  }
  if (linear.approvalState === 'unknown') {
    reasons.push(makeReason('approval_state_unknown', 'linear', 'current approval state could not be verified'))
  } else if (linear.approvalState === 'not-approved') {
    reasons.push(makeReason('scope_not_approved', 'linear', 'the named implementation boundary is not approved'))
  }
  if (linear.statusType === 'completed' || linear.statusType === 'canceled') {
    reasons.push(makeReason('issue_not_active', 'linear', `issue lifecycle is ${linear.statusType}`))
  }
  if (requestedOperation === 'start' && linear.statusType === 'started') {
    reasons.push(makeReason('issue_already_started', 'linear', 'start was requested for an issue already in progress'))
  }
  if (requestedOperation === 'resume' && linear.statusType !== 'started') {
    reasons.push(makeReason('issue_not_started', 'linear', `resume requires started lifecycle; observed ${linear.statusType}`))
  }
  if (!sameStrings(handoff.blockerIds, linear.blockerIds)) {
    reasons.push(makeReason('blocker_snapshot_changed', 'linear', 'current blockers differ from the handoff snapshot'))
  }
  if (!sameStrings(handoff.dependencyIds, linear.dependencyIds)) {
    reasons.push(makeReason('dependency_snapshot_changed', 'linear', 'current dependencies differ from the handoff snapshot'))
  }
  if (linear.blockerIds.length > 0) {
    reasons.push(makeReason('issue_blocked', 'linear', `unresolved blockers: ${[...linear.blockerIds].sort().join(', ')}`))
  }
  if (linear.dependencyIds.length > 0) {
    reasons.push(makeReason('dependency_unresolved', 'linear', `unresolved dependencies: ${[...linear.dependencyIds].sort().join(', ')}`))
  }
}

function evaluateGitHub(input, reasons) {
  const { github, handoff, requestedOperation } = input
  if (github.collectionStatus !== 'ready') return
  if (github.remoteMainSha !== handoff.expectedBaseMainSha) {
    reasons.push(makeReason('remote_main_advanced', 'github', `expected ${handoff.expectedBaseMainSha}; observed ${github.remoteMainSha ?? 'unknown'}`))
  }
  const pullRequests = [...github.openPullRequests].sort((a, b) => a.number - b.number)
  if (requestedOperation === 'start') {
    if (pullRequests.length > 0) {
      reasons.push(makeReason('open_pr_blocks_start', 'github', `open pull requests: ${pullRequests.map((pr) => `#${pr.number}`).join(', ')}`))
    }
  } else if (pullRequests.length === 0) {
    reasons.push(makeReason('resume_pr_missing', 'github', 'resume requires the matching open pull request'))
  } else if (pullRequests.length > 1) {
    reasons.push(makeReason('multiple_open_prs', 'github', `open pull requests: ${pullRequests.map((pr) => `#${pr.number}`).join(', ')}`))
  } else {
    const pullRequest = pullRequests[0]
    if (!pullRequest.ownershipVerified || pullRequest.issueId === null) {
      reasons.push(makeReason('pr_ownership_unverified', 'github', `pull request #${pullRequest.number} has no single verified issue owner`))
    } else {
      if (pullRequest.issueId !== handoff.issueId) {
        reasons.push(makeReason('pr_issue_mismatch', 'github', `pull request #${pullRequest.number} belongs to ${pullRequest.issueId}`))
      }
      if (pullRequest.headBranch !== handoff.intendedBranch) {
        reasons.push(makeReason('pr_branch_mismatch', 'github', `expected ${handoff.intendedBranch}; observed ${pullRequest.headBranch}`))
      }
      if (pullRequest.baseBranch !== 'main') {
        reasons.push(makeReason('pr_base_mismatch', 'github', `pull request #${pullRequest.number} targets ${pullRequest.baseBranch}`))
      }
    }
  }
  if (
    github.implementationEvidence?.mergedCurrentMain &&
    input.linear.collectionStatus === 'ready' &&
    input.linear.statusType !== 'completed'
  ) {
    reasons.push(makeReason('lifecycle_evidence_conflict', 'github', 'implementation is on current main while Linear lifecycle is not completed'))
  }
}

function evaluateGit(input, reasons) {
  const { git, github, handoff, requestedOperation, executionMode } = input
  if (git.collectionStatus !== 'ready') return
  if (git.trackedDirty) {
    reasons.push(makeReason('tracked_worktree_dirty', 'git', 'tracked changes are present'))
  }
  if (github.collectionStatus === 'ready' && git.remoteMainSha !== github.remoteMainSha) {
    reasons.push(makeReason('remote_main_observation_conflict', 'git', `git observed ${git.remoteMainSha ?? 'unknown'}; GitHub observed ${github.remoteMainSha ?? 'unknown'}`))
  }
  if (git.remoteMainSha !== handoff.expectedBaseMainSha) {
    reasons.push(makeReason('git_remote_main_mismatch', 'git', `expected ${handoff.expectedBaseMainSha}; observed ${git.remoteMainSha ?? 'unknown'}`))
  }

  if (executionMode === 'local-checkout') {
    if (git.detachedHead) {
      reasons.push(makeReason('local_checkout_detached', 'git', 'local checkout mode cannot use detached HEAD'))
    }
    const expectedBranch = requestedOperation === 'start' ? 'main' : handoff.intendedBranch
    if (git.currentBranch !== expectedBranch) {
      reasons.push(makeReason('local_branch_mismatch', 'git', `expected ${expectedBranch}; observed ${git.currentBranch ?? 'detached'}`))
    }
    if (git.localMainSha !== handoff.expectedBaseMainSha) {
      reasons.push(makeReason('local_main_diverged', 'git', `expected ${handoff.expectedBaseMainSha}; observed ${git.localMainSha ?? 'unknown'}`))
    }
    if (requestedOperation === 'start' && git.headSha !== handoff.expectedBaseMainSha) {
      reasons.push(makeReason('local_head_mismatch', 'git', `expected ${handoff.expectedBaseMainSha}; observed ${git.headSha ?? 'unknown'}`))
    }
    return
  }

  if (requestedOperation === 'start') {
    if (!git.detachedHead || git.currentBranch !== null) {
      reasons.push(makeReason('managed_worktree_not_detached', 'git', 'a new Codex managed worktree must begin at detached HEAD'))
    }
    if (git.headSha !== handoff.expectedBaseMainSha) {
      reasons.push(makeReason('managed_worktree_base_mismatch', 'git', `expected ${handoff.expectedBaseMainSha}; observed ${git.headSha ?? 'unknown'}`))
    }
  } else if (git.detachedHead || git.currentBranch !== handoff.intendedBranch) {
    reasons.push(makeReason('managed_resume_branch_mismatch', 'git', `resume requires branch ${handoff.intendedBranch}; observed ${git.currentBranch ?? 'detached'}`))
  }
}

const UNKNOWN_CODES = new Set([
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
  'linear_issue_mismatch',
  'linear_parent_mismatch',
  'approval_state_unknown',
  'pr_ownership_unverified',
  'remote_main_observation_conflict',
  'lifecycle_evidence_conflict',
])

export function compareSessionPreflightReasons(left, right) {
  const leftKey = `${left.source}:${left.code}:${left.detail}`
  const rightKey = `${right.source}:${right.code}:${right.detail}`
  if (leftKey < rightKey) return -1
  if (leftKey > rightKey) return 1
  return 0
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

export function evaluateSessionPreflight(input) {
  const validationErrors = validateSessionPreflightInput(input)
  if (validationErrors.length > 0) {
    const sortedValidationErrors = [...validationErrors].sort()
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

  const reasons = []
  addFreshnessReasons(input, reasons)
  evaluateLinear(input, reasons)
  evaluateGitHub(input, reasons)
  evaluateGit(input, reasons)
  const orderedReasons = stableReasons(reasons)
  const status = orderedReasons.some((reason) => UNKNOWN_CODES.has(reason.code))
    ? 'unknown'
    : orderedReasons.length > 0
      ? 'blocked'
      : 'ready'

  return {
    schemaVersion: SCHEMA_VERSION,
    status,
    readOnly: true,
    issueId: input.handoff.issueId,
    workstream: input.handoff.workstream,
    requestedOperation: input.requestedOperation,
    executionMode: input.executionMode,
    reasons: orderedReasons,
    evidence: {
      linearLifecycle: {
        status: input.linear.status ?? null,
        statusType: input.linear.statusType ?? null,
        checkedAt: input.linear.checkedAt,
        sourceRef: input.linear.sourceRef,
      },
      githubImplementation: {
        checkedAt: input.github.checkedAt,
        sourceRef: input.github.sourceRef,
        openPullRequests: (input.github.openPullRequests ?? []).map((pullRequest) => ({
          number: pullRequest.number,
          url: pullRequest.url,
          headBranch: pullRequest.headBranch,
          baseBranch: pullRequest.baseBranch,
          issueId: pullRequest.issueId,
          ownershipVerified: pullRequest.ownershipVerified,
        })),
        mergedCurrentMain: input.github.implementationEvidence?.mergedCurrentMain ?? false,
        mergedPrUrls: input.github.implementationEvidence?.mergedPrUrls ?? [],
      },
      git: {
        checkedAt: input.git.checkedAt,
        sourceRef: input.git.sourceRef,
        headSha: input.git.headSha ?? null,
        currentBranch: input.git.currentBranch ?? null,
        detachedHead: input.git.detachedHead ?? null,
        trackedDirty: input.git.trackedDirty ?? null,
        localMainSha: input.git.localMainSha ?? null,
        remoteMainSha: input.git.remoteMainSha ?? null,
      },
    },
    sources: [input.linear.sourceRef, input.github.sourceRef, input.git.sourceRef].sort(),
    validationErrors: [],
  }
}

export const SESSION_PREFLIGHT_SCHEMA_VERSION = SCHEMA_VERSION
