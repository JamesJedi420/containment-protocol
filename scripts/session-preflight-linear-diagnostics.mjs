// SPE-3337 observation metadata only. Transport and authorization remain with the caller.
const RECOVERY = Object.freeze({
  ready:
    'Revalidate the issue and connection before implementation; read success grants no write authority.',
  unchecked:
    'Run an authorized read through the existing Linear connection before relying on this handoff.',
  'authentication-missing': 'Sign in through the existing Linear connection, then repeat the read.',
  'authentication-expired':
    'Renew authentication through the existing Linear connection, then repeat the read.',
  'configuration-missing': 'Configure the existing Linear connection, then repeat the read.',
  'permission-denied':
    'Verify access to the requested issue with the connection owner, then repeat the read.',
  timeout: 'Retry the authorized read after checking connection availability.',
  'service-failure': 'Check Linear service availability and retry the authorized read.',
  unknown:
    'Inspect the provider failure privately; do not infer a cause. Repeat the authorized read when available.',
})
const ACTORS = new Set(['Codex', 'Cursor', 'ChatGPT', 'human'])
const AUTH_CODES = new Set(['authentication-missing', 'authentication-expired'])
const FAILURE_CODES = new Set(
  Object.keys(RECOVERY).filter((key) => !['ready', 'unchecked'].includes(key))
)
const FIELDS = [
  'schemaVersion',
  'status',
  'checkedAt',
  'checkedBy',
  'operationChecked',
  'failureCode',
  'retryGuidance',
  'evidenceRef',
]

export function validateLinearMcpDiagnostic(value) {
  const fail = () => ['linearMcp diagnostic is malformed or contradictory']
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail()
  if (Object.keys(value).some((key) => !FIELDS.includes(key)) || value.schemaVersion !== 1)
    return fail()
  const { status, failureCode, checkedAt, checkedBy, operationChecked, evidenceRef } = value
  if (!['ready', 'needsAuth', 'failed', 'unchecked'].includes(status)) return fail()
  if (
    evidenceRef !== null &&
    (typeof evidenceRef !== 'string' || !/^linear:[A-Z][A-Z0-9]+-\d+$/.test(evidenceRef))
  )
    return fail()
  if (status === 'unchecked') {
    if (
      checkedAt !== null ||
      checkedBy !== null ||
      operationChecked !== 'none' ||
      failureCode !== null
    )
      return fail()
  } else {
    if (
      !ACTORS.has(checkedBy) ||
      operationChecked !== 'read' ||
      typeof checkedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(checkedAt) ||
      !Number.isFinite(Date.parse(checkedAt)) ||
      new Date(checkedAt).toISOString().slice(0, 19) !== checkedAt.slice(0, 19)
    )
      return fail()
    if (status === 'ready' && (failureCode !== null || evidenceRef === null)) return fail()
    if (status === 'needsAuth' && !AUTH_CODES.has(failureCode)) return fail()
    if (status === 'failed' && (!FAILURE_CODES.has(failureCode) || AUTH_CODES.has(failureCode)))
      return fail()
  }
  if (value.retryGuidance !== RECOVERY[failureCode ?? status]) return fail()
  return []
}

// Accept explicit provider classifications, never raw response bodies, tokens or error messages.
export function createLinearMcpDiagnostic({
  status = 'unchecked',
  failureCode = null,
  checkedAt = null,
  checkedBy = null,
  evidenceRef = null,
} = {}) {
  const result = {
    schemaVersion: 1,
    status,
    checkedAt,
    checkedBy,
    operationChecked: status === 'unchecked' ? 'none' : 'read',
    failureCode,
    retryGuidance: RECOVERY[failureCode ?? status],
    evidenceRef,
  }
  if (validateLinearMcpDiagnostic(result).length) throw new Error('Invalid Linear read observation')
  return result
}
