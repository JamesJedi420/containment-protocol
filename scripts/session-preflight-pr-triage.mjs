// SPE-3337 contract maintenance: supplied observations only, never a queue or override.
const dispositions = new Set(['actionable', 'blocked', 'active-owner', 'unknown'])
const blockerKinds = new Set([
  'explicit-hold',
  'external-dependency',
  'permission',
  'service-unavailable',
])
const object = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const text = (value) => typeof value === 'string' && value.trim().length > 0
const timestamp = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  Number.isFinite(Date.parse(value))
const sha = (value) => typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value)

export function isTriagePath(value) {
  return (
    text(value) &&
    value === value.trim() &&
    !/[\\:*?\[\]{}\u0000-\u001f\u007f]/.test(value) &&
    value.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..')
  )
}

function exactKeys(value, required, optional, path, errors) {
  if (!object(value)) {
    errors.push(`${path} must be an object`)
    return false
  }
  for (const key of required) if (!(key in value)) errors.push(`${path}.${key} is required`)
  for (const key of Object.keys(value)) {
    if (![...required, ...optional].includes(key)) errors.push(`${path}.${key} is unsupported`)
  }
  return true
}

function observation(value, path, errors) {
  if (!timestamp(value.checkedAt))
    errors.push(`${path}.checkedAt must be a timestamp at millisecond precision or coarser`)
  if (!text(value.sourceRef)) errors.push(`${path}.sourceRef is required`)
}

export function validateOpenPrTriage(packet) {
  if (packet === undefined) return []
  const errors = []
  if (!exactKeys(packet, ['schemaVersion', 'boundary', 'items'], [], 'openPrTriage', errors))
    return errors
  if (packet.schemaVersion !== 1) errors.push('openPrTriage.schemaVersion must be 1')
  const boundary = packet.boundary
  if (
    exactKeys(
      boundary,
      [
        'issueId',
        'workstream',
        'branch',
        'baseMainSha',
        'executor',
        'paths',
        'checkedAt',
        'sourceRef',
      ],
      [],
      'openPrTriage.boundary',
      errors
    )
  ) {
    observation(boundary, 'openPrTriage.boundary', errors)
    for (const key of ['issueId', 'workstream', 'branch', 'executor']) {
      if (!text(boundary[key])) errors.push(`openPrTriage.boundary.${key} is required`)
    }
    if (!sha(boundary.baseMainSha)) errors.push('openPrTriage.boundary.baseMainSha is invalid')
    if (
      !Array.isArray(boundary.paths) ||
      boundary.paths.length === 0 ||
      !boundary.paths.every(isTriagePath)
    )
      errors.push('openPrTriage.boundary.paths must be nonempty literal repository paths')
  }
  if (!Array.isArray(packet.items)) return [...errors, 'openPrTriage.items must be an array']
  const seen = new Set()
  packet.items.forEach((item, index) => {
    const path = `openPrTriage.items[${index}]`
    if (
      !exactKeys(
        item,
        [
          'number',
          'headSha',
          'updatedAt',
          'isDraft',
          'disposition',
          'reason',
          'nextAction',
          'checkedAt',
          'sourceRef',
          'dependency',
        ],
        ['blocker', 'activity'],
        path,
        errors
      )
    )
      return
    observation(item, path, errors)
    if (!Number.isSafeInteger(item.number) || item.number < 1 || seen.has(item.number))
      errors.push(`${path}.number is invalid or duplicated`)
    seen.add(item.number)
    if (!sha(item.headSha) || !timestamp(item.updatedAt) || typeof item.isDraft !== 'boolean')
      errors.push(`${path} requires headSha, updatedAt and isDraft`)
    if (!dispositions.has(item.disposition)) errors.push(`${path}.disposition is invalid`)
    if (!text(item.reason) || !text(item.nextAction))
      errors.push(`${path} requires a concrete reason and nextAction`)
    if (
      exactKeys(
        item.dependency,
        ['status', 'checkedAt', 'sourceRef'],
        [],
        `${path}.dependency`,
        errors
      )
    ) {
      observation(item.dependency, `${path}.dependency`, errors)
      if (!['independent', 'dependent', 'unknown'].includes(item.dependency.status))
        errors.push(`${path}.dependency.status is invalid`)
    }
    if (item.disposition === 'blocked') {
      if (
        exactKeys(
          item.blocker,
          ['kind', 'actor', 'detail', 'checkedAt', 'sourceRef'],
          [],
          `${path}.blocker`,
          errors
        )
      ) {
        observation(item.blocker, `${path}.blocker`, errors)
        if (
          !blockerKinds.has(item.blocker.kind) ||
          !text(item.blocker.actor) ||
          !text(item.blocker.detail)
        )
          errors.push(
            `${path}.blocker requires an external blocker or explicit hold and its responsible actor`
          )
      }
    } else if (item.blocker !== undefined)
      errors.push(`${path}.blocker contradicts its disposition`)
    if (item.disposition === 'active-owner') {
      if (
        exactKeys(
          item.activity,
          ['executor', 'acceptedAt', 'acceptanceSourceRef', 'status', 'checkedAt', 'sourceRef'],
          [],
          `${path}.activity`,
          errors
        )
      ) {
        observation(item.activity, `${path}.activity`, errors)
        if (
          !text(item.activity.executor) ||
          !text(item.activity.acceptanceSourceRef) ||
          !timestamp(item.activity.acceptedAt) ||
          item.activity.status !== 'active'
        )
          errors.push(
            `${path}.activity requires accepted executor and actual active-session evidence`
          )
      }
    } else if (item.activity !== undefined)
      errors.push(`${path}.activity contradicts its disposition`)
  })
  return errors
}

function reason(reasons, code, detail) {
  reasons.push({ code, source: 'open-pr-triage', detail })
}

function fresh(observation, input, label, reasons) {
  const age = Date.parse(input.observedAt) - Date.parse(observation.checkedAt)
  if (age > input.freshnessWindowSeconds * 1000 || age < -30000) {
    reason(reasons, 'pr_triage_stale', `${label} evidence is stale or from the future`)
  }
}

function pathsOverlap(left, right) {
  const a = left.toLowerCase()
  const b = right.toLowerCase()
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)
}

export function evaluateOpenPrTriage(input, pullRequests, resumed, reasons) {
  const { openPrTriage: packet, handoff } = input
  const boundary = packet.boundary
  if (input.github.openPullRequestsComplete !== true)
    reason(reasons, 'pr_triage_missing', 'complete current open-PR inventory was not established')
  fresh(boundary, input, 'named boundary', reasons)
  if (
    boundary.issueId !== handoff.issueId ||
    boundary.workstream !== handoff.workstream ||
    boundary.branch !== handoff.intendedBranch ||
    boundary.baseMainSha !== handoff.expectedBaseMainSha
  ) {
    reason(
      reasons,
      'pr_triage_mismatch',
      'triage names a different issue, workstream, branch or main base'
    )
  }
  const otherPrs = pullRequests.filter((pr) => pr !== resumed)
  const byNumber = new Map(packet.items.map((item) => [item.number, item]))
  if (
    packet.items.length !== otherPrs.length ||
    packet.items.some((item) => !otherPrs.some((pr) => pr.number === item.number))
  ) {
    reason(
      reasons,
      'pr_triage_mismatch',
      'triage must account for exactly every other currently open PR, including drafts'
    )
  }
  // Include the owned PR's actual diff, so omitted planned paths cannot hide overlap on resume.
  const plannedPaths = [...boundary.paths]
  if (resumed) {
    if (
      !sha(resumed.headSha) ||
      !timestamp(resumed.updatedAt) ||
      typeof resumed.isDraft !== 'boolean'
    )
      reason(reasons, 'pr_triage_missing', 'resuming PR head and state snapshot are unavailable')
    else if (input.git.collectionStatus === 'ready' && input.git.headSha !== resumed.headSha)
      reason(
        reasons,
        'pr_triage_mismatch',
        'local resume HEAD does not match the current owned PR head'
      )
    if (!Array.isArray(resumed.changedPaths) || resumed.changedPaths.length === 0)
      reason(reasons, 'pr_triage_missing', 'resuming PR changed paths are unavailable')
    else plannedPaths.push(...resumed.changedPaths)
  }
  for (const pr of otherPrs) {
    const item = byNumber.get(pr.number)
    if (!item) {
      reason(
        reasons,
        'pr_triage_missing',
        `#${pr.number} has no current disposition; prioritize its triage`
      )
      continue
    }
    fresh(item, input, `#${pr.number}`, reasons)
    fresh(item.dependency, input, `#${pr.number} dependency check`, reasons)
    for (const observation of [item.dependency, item.blocker, item.activity].filter(Boolean)) {
      if (Date.parse(observation.checkedAt) < Date.parse(pr.updatedAt))
        reason(
          reasons,
          'pr_triage_stale',
          `#${pr.number} changed after its supporting evidence was checked`
        )
    }
    if (
      pr.headSha !== item.headSha ||
      pr.updatedAt !== item.updatedAt ||
      pr.isDraft !== item.isDraft
    )
      reason(reasons, 'pr_triage_mismatch', `#${pr.number} head or state changed; re-triage`)
    if (Date.parse(item.updatedAt) > Date.parse(item.checkedAt))
      reason(reasons, 'pr_triage_stale', `#${pr.number} changed after its disposition was checked`)
    if (!Array.isArray(pr.changedPaths) || pr.changedPaths.length === 0)
      reason(reasons, 'pr_triage_missing', `#${pr.number} complete changed paths are unavailable`)
    else if (
      plannedPaths.some((path) => pr.changedPaths.some((other) => pathsOverlap(path, other)))
    )
      reason(reasons, 'pr_scope_overlap', `#${pr.number} overlaps the named boundary's paths`)
    if (pr.issueId === handoff.issueId || pr.headBranch === handoff.intendedBranch)
      reason(
        reasons,
        'pr_boundary_conflict',
        `#${pr.number} already occupies this issue or branch; resume rather than start a competing boundary`
      )
    if (
      item.dependency.status === 'dependent' ||
      (pr.issueId !== null &&
        [...handoff.dependencyIds, ...handoff.blockerIds].includes(pr.issueId))
    )
      reason(
        reasons,
        'pr_dependency_conflict',
        `#${pr.number} is an unresolved dependency of the named boundary`
      )
    if (item.dependency.status === 'unknown')
      reason(reasons, 'pr_triage_unknown', `#${pr.number} dependency relationship is unverified`)
    if (item.disposition === 'actionable' && input.requestedOperation === 'start')
      reason(reasons, 'pr_actionable', `#${pr.number} can be advanced: ${item.nextAction}`)
    if (item.disposition === 'unknown')
      reason(
        reasons,
        'pr_triage_unknown',
        `#${pr.number} disposition is unverified: ${item.nextAction}`
      )
    if (item.blocker) fresh(item.blocker, input, `#${pr.number} blocker`, reasons)
    if (item.activity) {
      fresh(item.activity, input, `#${pr.number} actual executor activity`, reasons)
      if (Date.parse(item.activity.acceptedAt) > Date.parse(item.activity.checkedAt))
        reason(reasons, 'pr_triage_mismatch', `#${pr.number} activity predates executor acceptance`)
      if (item.activity.executor === boundary.executor)
        reason(
          reasons,
          'pr_boundary_conflict',
          `#${pr.number} is already active for this executor; retain one active owned boundary`
        )
    }
  }
}

export function openPrTriageSourceRefs(packet) {
  if (packet === undefined) return []
  return [
    packet.boundary.sourceRef,
    ...packet.items.flatMap((item) => [
      item.sourceRef,
      item.dependency.sourceRef,
      ...(item.blocker ? [item.blocker.sourceRef] : []),
      ...(item.activity ? [item.activity.sourceRef, item.activity.acceptanceSourceRef] : []),
    ]),
  ]
}
