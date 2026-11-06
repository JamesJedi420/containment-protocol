// Read-only reporting of observations collected from existing authorities, never a write gate.
const text = (value) => typeof value === 'string' && value.trim().length > 0
const nullableText = (value) => value === null || text(value)
const issue = (value) => typeof value === 'string' && /^[A-Z][A-Z0-9]+-\d+$/.test(value)
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const exact = (value, keys) =>
  object(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key))
const utc = (value) =>
  text(value) &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 19) === value.slice(0, 19)
const OBSERVATION = ['status', 'checkedAt', 'sourceRef']
const COMMON = ['id', 'summary', 'sourceRef', 'kind']
const DEFERRAL = [
  'ownerIssueId',
  'canonicalOwner',
  'deferralReason',
  'remainingAcceptance',
  'closureImpact',
  'boundary',
]
const DISCOVERY = [
  'outsideBoundaryReason',
  'provisionalWorkstream',
  'provisionalOwner',
  'disposition',
  'phase',
  'authorization',
  'application',
]
const PHASES = ['unassessed', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'actor-authorized']

function observation(value, extra) {
  return (
    exact(value, [...OBSERVATION, ...extra]) &&
    ['verified', 'unverified', 'contradictory'].includes(value.status) &&
    (value.checkedAt === null || utc(value.checkedAt)) &&
    nullableText(value.sourceRef)
  )
}

function validBoundary(value) {
  return (
    value === null ||
    (observation(value, ['issueId', 'boundaryIssueId', 'canonicalOwner', 'scopeRelation']) &&
      issue(value.issueId) &&
      issue(value.boundaryIssueId) &&
      text(value.canonicalOwner) &&
      ['within-approved-boundary', 'outside-approved-boundary', 'unknown'].includes(
        value.scopeRelation
      ))
  )
}

function validAuthorization(value) {
  return (
    value === null ||
    (observation(value, [
      'itemId',
      'actor',
      'authorityRef',
      'decision',
      'issueId',
      'canonicalOwner',
    ]) &&
      text(value.itemId) &&
      ['ChatGPT', 'Cursor', 'Codex', 'human'].includes(value.actor) &&
      text(value.authorityRef) &&
      ['authorized', 'not-authorized', 'unknown'].includes(value.decision) &&
      (value.issueId === null || issue(value.issueId)) &&
      text(value.canonicalOwner))
  )
}

function validApplication(value) {
  return (
    value === null ||
    (observation(value, ['itemId', 'outcome', 'issueId', 'canonicalOwner']) &&
      text(value.itemId) &&
      ['applied', 'not-applied', 'unknown'].includes(value.outcome) &&
      (value.issueId === null || issue(value.issueId)) &&
      nullableText(value.canonicalOwner))
  )
}

function validItem(value) {
  if (!object(value) || !text(value.id) || !text(value.summary) || !text(value.sourceRef))
    return false
  if (value.kind === 'in-boundary-deferral') {
    return (
      exact(value, [...COMMON, ...DEFERRAL]) &&
      issue(value.ownerIssueId) &&
      text(value.canonicalOwner) &&
      text(value.deferralReason) &&
      text(value.remainingAcceptance) &&
      ['blocks-completion', 'does-not-block-completion'].includes(value.closureImpact) &&
      validBoundary(value.boundary)
    )
  }
  return (
    ['candidate-discovery', 'applied-scope'].includes(value.kind) &&
    exact(value, [...COMMON, ...DISCOVERY]) &&
    text(value.outsideBoundaryReason) &&
    ['CP-core', 'Academy', 'shared-system', 'cross-project', 'unknown'].includes(
      value.provisionalWorkstream
    ) &&
    nullableText(value.provisionalOwner) &&
    text(value.disposition) &&
    PHASES.includes(value.phase) &&
    validAuthorization(value.authorization) &&
    validApplication(value.application)
  )
}

export function validateFollowUps(packet, issueId) {
  const invalid = ['followUps evidence is malformed or belongs to another issue']
  if (
    !exact(packet, ['schemaVersion', 'issueId', 'items']) ||
    packet.schemaVersion !== 1 ||
    packet.issueId !== issueId ||
    !Array.isArray(packet.items)
  )
    return invalid
  const ids = new Set()
  for (const item of packet.items) {
    if (!validItem(item) || ids.has(item.id)) return invalid
    ids.add(item.id)
  }
  return []
}

function freshVerified(value, observedAt, window) {
  if (
    !value ||
    value.status !== 'verified' ||
    value.checkedAt === null ||
    !text(value.sourceRef) ||
    /\.\d{4,}/.test(observedAt)
  )
    return false
  const age = Date.parse(observedAt) - Date.parse(value.checkedAt)
  return age >= -30000 && age <= window * 1000
}

function classifyDeferral(item, issueId, observedAt, window) {
  const boundary = item.boundary
  if (!freshVerified(boundary, observedAt, window)) return 'boundary-evidence-unverified'
  if (
    boundary.boundaryIssueId !== issueId ||
    boundary.issueId !== item.ownerIssueId ||
    boundary.canonicalOwner !== item.canonicalOwner ||
    boundary.scopeRelation !== 'within-approved-boundary'
  )
    return 'boundary-evidence-conflict'
  return null
}

function classifyApplication(item, observedAt, window) {
  const { authorization, application } = item
  if (
    !freshVerified(authorization, observedAt, window) ||
    !freshVerified(application, observedAt, window)
  )
    return 'authorization-or-application-unverified'
  if (
    authorization.decision !== 'authorized' ||
    application.outcome !== 'applied' ||
    !issue(application.issueId) ||
    !text(application.canonicalOwner)
  )
    return 'authorization-or-application-incomplete'
  if (
    authorization.itemId !== item.id ||
    application.itemId !== item.id ||
    authorization.canonicalOwner !== application.canonicalOwner ||
    (authorization.issueId !== null && authorization.issueId !== application.issueId)
  )
    return 'authorization-application-conflict'
  if (authorization.actor === 'ChatGPT' && item.phase !== 'phase-4')
    return 'chatgpt-phase-four-evidence-required'
  if (authorization.actor !== 'ChatGPT' && !['phase-4', 'actor-authorized'].includes(item.phase))
    return 'authorization-phase-conflict'
  return null
}

function compareItems(left, right) {
  if (left.id < right.id) return -1
  if (left.id > right.id) return 1
  return 0
}

export function projectFollowUps(packet, observedAt, window) {
  const items = packet.items
    .map((item) => {
      let reason = null
      if (item.kind === 'in-boundary-deferral')
        reason = classifyDeferral(item, packet.issueId, observedAt, window)
      if (item.kind === 'applied-scope') reason = classifyApplication(item, observedAt, window)
      return {
        ...structuredClone(item),
        reportedKind: item.kind,
        kind: reason === null ? item.kind : 'unverified-follow-up',
        reason,
      }
    })
    .sort(compareItems)
  return { schemaVersion: 1, issueId: packet.issueId, authority: 'evidence-projection-only', items }
}

export function followUpSourceRefs(packet) {
  return packet.items.flatMap((item) => [
    item.sourceRef,
    ...(item.authorization ? [item.authorization.authorityRef] : []),
    ...['boundary', 'authorization', 'application'].map((key) => item[key]?.sourceRef).filter(text),
  ])
}
