// Issue-scoped preferences are evidence, never exclusive execution authority.
const PACKET_FIELDS = ['schemaVersion', 'issueId', 'checkedAt', 'sourceRef', 'entries']
const ENTRY_FIELDS = [
  'id',
  'agent',
  'sourceRef',
  'designatedAt',
  'timestampSourceRef',
  'supersedes',
]
const text = (value) => typeof value === 'string' && value.trim().length > 0
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const fields = (value, allowed) =>
  object(value) && Object.keys(value).every((key) => allowed.includes(key))
const utc = (value) =>
  text(value) &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 19) === value.slice(0, 19)

function compareText(left, right) {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function validSupersession(entry, byId) {
  const seen = new Set([entry.id])
  let current = entry
  let laterKnownTime = entry.designatedAt
  while (current.supersedes !== null) {
    const previous = byId.get(current.supersedes)
    if (!previous || seen.has(previous.id)) return false
    if (
      previous.designatedAt !== null &&
      laterKnownTime !== null &&
      Date.parse(previous.designatedAt) > Date.parse(laterKnownTime)
    )
      return false
    seen.add(previous.id)
    if (previous.designatedAt !== null) laterKnownTime = previous.designatedAt
    current = previous
  }
  return true
}

export function validateAgentDesignations(packet, issueId) {
  const fail = () => ['agentDesignations evidence is malformed or belongs to another issue']
  if (
    !fields(packet, PACKET_FIELDS) ||
    packet.schemaVersion !== 1 ||
    packet.issueId !== issueId ||
    !text(packet.sourceRef) ||
    !(packet.checkedAt === null || utc(packet.checkedAt)) ||
    !Array.isArray(packet.entries)
  )
    return fail()
  const byId = new Map()
  for (const entry of packet.entries) {
    if (
      !fields(entry, ENTRY_FIELDS) ||
      !text(entry.id) ||
      !text(entry.agent) ||
      !text(entry.sourceRef) ||
      !(entry.supersedes === null || text(entry.supersedes)) ||
      !(entry.designatedAt === null || utc(entry.designatedAt)) ||
      (entry.designatedAt === null
        ? entry.timestampSourceRef !== null
        : !text(entry.timestampSourceRef)) ||
      byId.has(entry.id)
    )
      return fail()
    byId.set(entry.id, entry)
  }
  for (const entry of packet.entries) {
    if (!validSupersession(entry, byId)) return fail()
    if (
      packet.checkedAt !== null &&
      entry.designatedAt !== null &&
      Date.parse(entry.designatedAt) > Date.parse(packet.checkedAt)
    )
      return fail()
  }
  return []
}

export function projectAgentDesignations(packet, observedAt, freshnessWindowSeconds) {
  const superseded = new Set(
    packet.entries.map((entry) => entry.supersedes).filter((id) => id !== null)
  )
  const entries = packet.entries
    .map((entry) => ({ ...entry, superseded: superseded.has(entry.id) }))
    .sort((a, b) => compareText(a.id, b.id))
  const current = entries.filter((entry) => !entry.superseded)
  const preferences = [...new Set(current.map((entry) => entry.agent))].sort(compareText)
  const age =
    packet.checkedAt === null ? null : Date.parse(observedAt) - Date.parse(packet.checkedAt)
  const precise = !/\.\d{4,}/.test(observedAt)
  let status = 'current'
  if (age === null || !precise) status = 'unknown'
  else if (age < -30000) status = 'from-future'
  else if (age > freshnessWindowSeconds * 1000) status = 'stale'
  else if (preferences.length > 1) status = 'conflicting'
  else if (current.length === 0) status = 'absent'
  // Only explicit timestamps on every current record support a last-designation claim.
  const lastDesignationAt =
    status === 'current' && current.every((entry) => entry.designatedAt !== null)
      ? current.reduce(
          (last, entry) =>
            last === null || Date.parse(entry.designatedAt) > Date.parse(last)
              ? entry.designatedAt
              : last,
          null
        )
      : null
  return {
    schemaVersion: 1,
    issueId: packet.issueId,
    checkedAt: packet.checkedAt,
    sourceRef: packet.sourceRef,
    status,
    preferredAgent: status === 'current' ? preferences[0] : null,
    lastDesignationAt,
    nonexclusive: true,
    authority: 'preference-only',
    humanAssignment: 'not-derived',
    executorAcceptance: 'unverified',
    sessionActivity: 'unverified',
    entries,
  }
}
