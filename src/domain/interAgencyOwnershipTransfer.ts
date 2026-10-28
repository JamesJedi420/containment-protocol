/**
 * SPE-2738 — inter-agency ownership transfer governance (pure domain).
 *
 * Request → authorize → complete/reject with provenance and a temporary anti-cycling
 * lock. Campaign time uses SPE-1071 authoritative integer weeks only (no wall clock).
 * Internal reassignment within one agency does not create transfer provenance or locks.
 * Forced/admin transfers use the same `completeOwnershipTransfer` mutation path.
 */

export const INTER_AGENCY_OWNERSHIP_TRANSFER_OWNER = 'SPE-2738' as const
export const INTER_AGENCY_OWNERSHIP_TRANSFER_SCHEMA_VERSION = 'spe-2738.v1' as const
export const INTER_AGENCY_OWNERSHIP_TRANSFER_MAX_ASSETS = 256 as const
export const INTER_AGENCY_OWNERSHIP_TRANSFER_MAX_PROVENANCE_PER_ASSET = 64 as const

export const ASSET_CLASSES = ['personnel', 'equipment', 'artifact', 'vehicle'] as const
export type AssetClass = (typeof ASSET_CLASSES)[number]

/** Data-driven anti-cycling lock duration (authoritative weeks, exclusive expiration week). */
export const TRANSFER_LOCK_DURATION_WEEKS_BY_ASSET_CLASS: Readonly<Record<AssetClass, number>> =
  Object.freeze({
    personnel: 8,
    equipment: 4,
    artifact: 12,
    vehicle: 6,
  })

export const TRANSFER_REQUEST_MODES = ['standard', 'forced_admin'] as const
export type TransferRequestMode = (typeof TRANSFER_REQUEST_MODES)[number]

export const TRANSFER_PROVENANCE_KINDS = [
  'inter_agency_transfer',
  'forced_admin_transfer',
] as const
export type TransferProvenanceKind = (typeof TRANSFER_PROVENANCE_KINDS)[number]

export const TRANSFER_REJECTION_REASONS = [
  'malformed_request',
  'asset_not_found',
  'ownership_mismatch',
  'same_agency_transfer',
  'unauthorized_request',
  'transfer_lock_active',
  'duplicate_request_id',
  'authorization_not_granted',
  'authorization_request_mismatch',
  'provenance_capacity_exceeded',
] as const
export type TransferRejectionReason = (typeof TRANSFER_REJECTION_REASONS)[number]

export interface TransferRequest {
  readonly requestId: string
  readonly assetId: string
  readonly assetClass: AssetClass
  readonly fromAgencyId: string
  readonly toAgencyId: string
  readonly authoritativeWeek: number
  readonly mode: TransferRequestMode
  readonly authorizationRef?: string
}

export interface TransferAuthorizationResult {
  readonly requestId: string
  readonly authorized: boolean
  readonly reasonCode: TransferRejectionReason | 'authorized'
  readonly authorizationRef?: string
  /** Stable binding of the authorized request fields — must match at completion. */
  readonly requestFingerprint?: string
}

export interface OwnershipRecord {
  readonly assetId: string
  readonly assetClass: AssetClass
  readonly owningAgencyId: string
  readonly internalAssignmentRef?: string
  readonly updatedAtWeek: number
}

export interface TransferProvenanceEntry {
  readonly entryId: string
  readonly requestId: string
  readonly kind: TransferProvenanceKind
  readonly fromAgencyId: string
  readonly toAgencyId: string
  readonly authoritativeWeek: number
}

export interface TransferLock {
  readonly assetId: string
  readonly assetClass: AssetClass
  readonly lockStartedWeek: number
  readonly expiresAtWeek: number
  readonly originatingRequestId: string
}

export interface InterAgencyOwnershipTransferState {
  readonly schemaVersion: typeof INTER_AGENCY_OWNERSHIP_TRANSFER_SCHEMA_VERSION
  readonly ownership: Readonly<Record<string, OwnershipRecord>>
  readonly provenance: Readonly<Record<string, readonly TransferProvenanceEntry[]>>
  readonly locks: Readonly<Record<string, TransferLock>>
  readonly completedRequestIds: Readonly<Record<string, true>>
}

export interface TransferEligibilityEvaluation {
  readonly requestId: string
  readonly eligible: boolean
  readonly reasonCode: TransferRejectionReason | 'eligible'
  readonly lockRemainingWeeks?: number
}

export interface TransferAttemptResult {
  readonly outcome: 'completed' | 'rejected'
  readonly reasonCode: TransferRejectionReason | 'completed'
  readonly state: InterAgencyOwnershipTransferState
  readonly lockRemainingWeeks?: number
  readonly authorization?: TransferAuthorizationResult
}

export interface InternalReassignmentResult {
  readonly outcome: 'applied' | 'rejected'
  readonly reasonCode: TransferRejectionReason | 'internal_reassignment_applied'
  readonly state: InterAgencyOwnershipTransferState
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

const FORBIDDEN_IDS = new Set(['__proto__', 'constructor', 'prototype', 'toString', 'valueOf'])

function isSafeId(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false
  const id = value.trim()
  if (FORBIDDEN_IDS.has(id)) return false
  if (id.includes('\0')) return false
  return true
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isAssetClass(value: unknown): value is AssetClass {
  return typeof value === 'string' && (ASSET_CLASSES as readonly string[]).includes(value)
}

function isTransferRequestMode(value: unknown): value is TransferRequestMode {
  return (
    typeof value === 'string' && (TRANSFER_REQUEST_MODES as readonly string[]).includes(value)
  )
}

function createStringBag<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>
}

function lockDurationWeeks(assetClass: AssetClass): number {
  return TRANSFER_LOCK_DURATION_WEEKS_BY_ASSET_CLASS[assetClass]
}

function isLockActive(lock: TransferLock, authoritativeWeek: number): boolean {
  if (!isNonNegativeInt(authoritativeWeek)) return false
  return authoritativeWeek < lock.expiresAtWeek
}

function lockRemainingWeeks(lock: TransferLock, authoritativeWeek: number): number {
  if (!isLockActive(lock, authoritativeWeek)) return 0
  return lock.expiresAtWeek - authoritativeWeek
}

function freezeOwnershipRecord(record: OwnershipRecord): OwnershipRecord {
  return Object.freeze({
    assetId: record.assetId,
    assetClass: record.assetClass,
    owningAgencyId: record.owningAgencyId,
    updatedAtWeek: record.updatedAtWeek,
    ...(record.internalAssignmentRef !== undefined
      ? { internalAssignmentRef: record.internalAssignmentRef }
      : {}),
  })
}

function freezeProvenanceEntry(entry: TransferProvenanceEntry): TransferProvenanceEntry {
  return Object.freeze({ ...entry })
}

function freezeLock(lock: TransferLock): TransferLock {
  return Object.freeze({ ...lock })
}

function freezeState(state: InterAgencyOwnershipTransferState): InterAgencyOwnershipTransferState {
  const ownership = createStringBag<OwnershipRecord>()
  for (const [key, record] of Object.entries(state.ownership)) {
    if (isSafeId(key)) ownership[key] = freezeOwnershipRecord(record)
  }

  const provenance = createStringBag<readonly TransferProvenanceEntry[]>()
  for (const [key, entries] of Object.entries(state.provenance)) {
    if (!isSafeId(key)) continue
    provenance[key] = Object.freeze(entries.map((entry) => freezeProvenanceEntry(entry)))
  }

  const locks = createStringBag<TransferLock>()
  for (const [key, lock] of Object.entries(state.locks)) {
    if (isSafeId(key)) locks[key] = freezeLock(lock)
  }

  const completedRequestIds = createStringBag<true>()
  for (const [key, marker] of Object.entries(state.completedRequestIds)) {
    if (isSafeId(key) && marker === true) completedRequestIds[key] = true
  }

  return Object.freeze({
    schemaVersion: INTER_AGENCY_OWNERSHIP_TRANSFER_SCHEMA_VERSION,
    ownership: Object.freeze(ownership),
    provenance: Object.freeze(provenance),
    locks: Object.freeze(locks),
    completedRequestIds: Object.freeze(completedRequestIds),
  })
}

export function createEmptyInterAgencyOwnershipTransferState(): InterAgencyOwnershipTransferState {
  return freezeState({
    schemaVersion: INTER_AGENCY_OWNERSHIP_TRANSFER_SCHEMA_VERSION,
    ownership: Object.freeze({}),
    provenance: Object.freeze({}),
    locks: Object.freeze({}),
    completedRequestIds: Object.freeze({}),
  })
}

export function parseTransferRequest(raw: unknown): TransferRequest | null {
  if (!isRecord(raw)) return null
  if (
    !isSafeId(raw.requestId) ||
    !isSafeId(raw.assetId) ||
    !isSafeId(raw.fromAgencyId) ||
    !isSafeId(raw.toAgencyId)
  ) {
    return null
  }
  if (!isAssetClass(raw.assetClass)) return null
  if (!isNonNegativeInt(raw.authoritativeWeek)) return null
  const mode = raw.mode === undefined ? 'standard' : raw.mode
  if (!isTransferRequestMode(mode)) return null

  let authorizationRef: string | undefined
  if (raw.authorizationRef !== undefined) {
    if (!isNonEmptyString(raw.authorizationRef)) return null
    authorizationRef = raw.authorizationRef.trim()
  }

  return Object.freeze({
    requestId: raw.requestId.trim(),
    assetId: raw.assetId.trim(),
    assetClass: raw.assetClass,
    fromAgencyId: raw.fromAgencyId.trim(),
    toAgencyId: raw.toAgencyId.trim(),
    authoritativeWeek: raw.authoritativeWeek,
    mode,
    ...(authorizationRef !== undefined ? { authorizationRef } : {}),
  })
}

export function parseOwnershipRecord(raw: unknown): OwnershipRecord | null {
  if (!isRecord(raw)) return null
  if (!isSafeId(raw.assetId) || !isSafeId(raw.owningAgencyId)) return null
  if (!isAssetClass(raw.assetClass)) return null
  if (!isNonNegativeInt(raw.updatedAtWeek)) return null

  let internalAssignmentRef: string | undefined
  if (raw.internalAssignmentRef !== undefined) {
    if (!isNonEmptyString(raw.internalAssignmentRef)) return null
    internalAssignmentRef = raw.internalAssignmentRef.trim()
  }

  return freezeOwnershipRecord({
    assetId: raw.assetId.trim(),
    assetClass: raw.assetClass,
    owningAgencyId: raw.owningAgencyId.trim(),
    updatedAtWeek: raw.updatedAtWeek,
    ...(internalAssignmentRef !== undefined ? { internalAssignmentRef } : {}),
  })
}

export function parseInterAgencyOwnershipTransferState(
  raw: unknown,
): InterAgencyOwnershipTransferState | null {
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      return null
    }
  }
  if (!isRecord(parsed)) return null
  if (parsed.schemaVersion !== INTER_AGENCY_OWNERSHIP_TRANSFER_SCHEMA_VERSION) return null

  if (!isRecord(parsed.ownership) || !isRecord(parsed.provenance) || !isRecord(parsed.locks)) {
    return null
  }
  if (!isRecord(parsed.completedRequestIds)) return null

  const ownership = createStringBag<OwnershipRecord>()
  const ownershipKeys = (
    Reflect.ownKeys(parsed.ownership).filter((key) => typeof key === 'string') as string[]
  ).sort((a, b) => a.localeCompare(b))
  if (ownershipKeys.length > INTER_AGENCY_OWNERSHIP_TRANSFER_MAX_ASSETS) return null
  for (const key of ownershipKeys) {
    if (!isSafeId(key)) return null
    const record = parseOwnershipRecord(parsed.ownership[key])
    if (!record || record.assetId !== key) return null
    ownership[key] = record
  }

  const provenance = createStringBag<readonly TransferProvenanceEntry[]>()
  const provenanceKeys = (
    Reflect.ownKeys(parsed.provenance).filter((key) => typeof key === 'string') as string[]
  ).sort((a, b) => a.localeCompare(b))
  for (const key of provenanceKeys) {
    if (!isSafeId(key)) return null
    const rawEntries = parsed.provenance[key]
    if (!Array.isArray(rawEntries)) return null
    if (rawEntries.length > INTER_AGENCY_OWNERSHIP_TRANSFER_MAX_PROVENANCE_PER_ASSET) return null
    const entries: TransferProvenanceEntry[] = []
    for (const rawEntry of rawEntries) {
      if (!isRecord(rawEntry)) return null
      if (
        !isSafeId(rawEntry.entryId) ||
        !isSafeId(rawEntry.requestId) ||
        !isSafeId(rawEntry.fromAgencyId) ||
        !isSafeId(rawEntry.toAgencyId)
      ) {
        return null
      }
      if (!isNonNegativeInt(rawEntry.authoritativeWeek)) return null
      const kind = rawEntry.kind
      if (
        typeof kind !== 'string' ||
        !(TRANSFER_PROVENANCE_KINDS as readonly string[]).includes(kind)
      ) {
        return null
      }
      entries.push(
        freezeProvenanceEntry({
          entryId: rawEntry.entryId.trim(),
          requestId: rawEntry.requestId.trim(),
          kind: kind as TransferProvenanceKind,
          fromAgencyId: rawEntry.fromAgencyId.trim(),
          toAgencyId: rawEntry.toAgencyId.trim(),
          authoritativeWeek: rawEntry.authoritativeWeek,
        }),
      )
    }
    provenance[key] = Object.freeze(entries)
  }

  const locks = createStringBag<TransferLock>()
  const lockKeys = (
    Reflect.ownKeys(parsed.locks).filter((key) => typeof key === 'string') as string[]
  ).sort((a, b) => a.localeCompare(b))
  for (const key of lockKeys) {
    if (!isSafeId(key)) return null
    const rawLock = parsed.locks[key]
    if (!isRecord(rawLock)) return null
    if (!isSafeId(rawLock.assetId) || rawLock.assetId.trim() !== key) return null
    if (!isAssetClass(rawLock.assetClass)) return null
    if (!isNonNegativeInt(rawLock.lockStartedWeek) || !isNonNegativeInt(rawLock.expiresAtWeek)) {
      return null
    }
    if (rawLock.expiresAtWeek <= rawLock.lockStartedWeek) return null
    if (!isSafeId(rawLock.originatingRequestId)) return null
    locks[key] = freezeLock({
      assetId: rawLock.assetId.trim(),
      assetClass: rawLock.assetClass,
      lockStartedWeek: rawLock.lockStartedWeek,
      expiresAtWeek: rawLock.expiresAtWeek,
      originatingRequestId: rawLock.originatingRequestId.trim(),
    })
  }

  const completedRequestIds = createStringBag<true>()
  const completedKeys = (
    Reflect.ownKeys(parsed.completedRequestIds).filter((key) => typeof key === 'string') as string[]
  ).sort((a, b) => a.localeCompare(b))
  for (const key of completedKeys) {
    if (!isSafeId(key)) return null
    if (parsed.completedRequestIds[key] !== true) return null
    completedRequestIds[key] = true
  }

  return freezeState({
    schemaVersion: INTER_AGENCY_OWNERSHIP_TRANSFER_SCHEMA_VERSION,
    ownership: Object.freeze(ownership),
    provenance: Object.freeze(provenance),
    locks: Object.freeze(locks),
    completedRequestIds: Object.freeze(completedRequestIds),
  })
}

function rejectResult(
  state: InterAgencyOwnershipTransferState,
  reasonCode: TransferRejectionReason,
  lockRemainingWeeks?: number,
  authorization?: TransferAuthorizationResult,
): TransferAttemptResult {
  return Object.freeze({
    outcome: 'rejected',
    reasonCode,
    state,
    ...(lockRemainingWeeks !== undefined ? { lockRemainingWeeks } : {}),
    ...(authorization !== undefined ? { authorization } : {}),
  })
}

export function evaluateTransferEligibility(
  state: InterAgencyOwnershipTransferState,
  request: TransferRequest | unknown,
): TransferEligibilityEvaluation {
  const parsed = parseTransferRequest(request)
  if (!parsed) {
    return Object.freeze({
      requestId: '',
      eligible: false,
      reasonCode: 'malformed_request',
    })
  }

  if (Object.prototype.hasOwnProperty.call(state.completedRequestIds, parsed.requestId)) {
    return Object.freeze({
      requestId: parsed.requestId,
      eligible: false,
      reasonCode: 'duplicate_request_id',
    })
  }

  const ownership = state.ownership[parsed.assetId]
  if (!ownership) {
    return Object.freeze({
      requestId: parsed.requestId,
      eligible: false,
      reasonCode: 'asset_not_found',
    })
  }

  if (ownership.assetClass !== parsed.assetClass) {
    return Object.freeze({
      requestId: parsed.requestId,
      eligible: false,
      reasonCode: 'malformed_request',
    })
  }

  if (ownership.owningAgencyId !== parsed.fromAgencyId) {
    return Object.freeze({
      requestId: parsed.requestId,
      eligible: false,
      reasonCode: 'ownership_mismatch',
    })
  }

  if (parsed.fromAgencyId === parsed.toAgencyId) {
    return Object.freeze({
      requestId: parsed.requestId,
      eligible: false,
      reasonCode: 'same_agency_transfer',
    })
  }

  const lock = state.locks[parsed.assetId]
  if (lock && isLockActive(lock, parsed.authoritativeWeek)) {
    return Object.freeze({
      requestId: parsed.requestId,
      eligible: false,
      reasonCode: 'transfer_lock_active',
      lockRemainingWeeks: lockRemainingWeeks(lock, parsed.authoritativeWeek),
    })
  }

  return Object.freeze({
    requestId: parsed.requestId,
    eligible: true,
    reasonCode: 'eligible',
  })
}

/** Deterministic fingerprint binding authorization to the exact request payload. */
export function transferRequestFingerprint(request: TransferRequest): string {
  return [
    request.requestId,
    request.assetId,
    request.assetClass,
    request.fromAgencyId,
    request.toAgencyId,
    String(request.authoritativeWeek),
    request.mode,
    request.authorizationRef?.trim() ?? '',
  ].join('|')
}

export function authorizeTransferRequest(
  state: InterAgencyOwnershipTransferState,
  request: TransferRequest | unknown,
): TransferAuthorizationResult {
  const parsed = parseTransferRequest(request)
  if (!parsed) {
    return Object.freeze({
      requestId: '',
      authorized: false,
      reasonCode: 'malformed_request',
    })
  }

  const eligibility = evaluateTransferEligibility(state, parsed)
  if (!eligibility.eligible) {
    return Object.freeze({
      requestId: parsed.requestId,
      authorized: false,
      reasonCode: eligibility.reasonCode as TransferRejectionReason,
    })
  }

  if (parsed.mode === 'forced_admin') {
    if (!isNonEmptyString(parsed.authorizationRef) || !parsed.authorizationRef.startsWith('admin:')) {
      return Object.freeze({
        requestId: parsed.requestId,
        authorized: false,
        reasonCode: 'unauthorized_request',
      })
    }
    return Object.freeze({
      requestId: parsed.requestId,
      authorized: true,
      reasonCode: 'authorized',
      authorizationRef: parsed.authorizationRef.trim(),
      requestFingerprint: transferRequestFingerprint(parsed),
    })
  }

  if (!isNonEmptyString(parsed.authorizationRef) || !parsed.authorizationRef.startsWith('gov:')) {
    return Object.freeze({
      requestId: parsed.requestId,
      authorized: false,
      reasonCode: 'unauthorized_request',
    })
  }

  return Object.freeze({
    requestId: parsed.requestId,
    authorized: true,
    reasonCode: 'authorized',
    authorizationRef: parsed.authorizationRef.trim(),
    requestFingerprint: transferRequestFingerprint(parsed),
  })
}

/**
 * Single ownership-transfer mutation path (standard and forced/admin).
 */
export function completeOwnershipTransfer(
  state: InterAgencyOwnershipTransferState,
  request: TransferRequest | unknown,
  authorization: TransferAuthorizationResult,
): TransferAttemptResult {
  const parsed = parseTransferRequest(request)
  if (!parsed) {
    return rejectResult(state, 'malformed_request')
  }

  if (!authorization.authorized || authorization.requestId !== parsed.requestId) {
    return rejectResult(state, 'authorization_not_granted', undefined, authorization)
  }

  const fingerprint = transferRequestFingerprint(parsed)
  if (
    authorization.requestFingerprint === undefined ||
    authorization.requestFingerprint !== fingerprint
  ) {
    return rejectResult(state, 'authorization_request_mismatch', undefined, authorization)
  }

  const eligibility = evaluateTransferEligibility(state, parsed)
  if (!eligibility.eligible) {
    const reason = eligibility.reasonCode as TransferRejectionReason
    return rejectResult(
      state,
      reason,
      eligibility.lockRemainingWeeks,
      authorization,
    )
  }

  const existing = state.ownership[parsed.assetId]
  if (!existing) {
    return rejectResult(state, 'asset_not_found', undefined, authorization)
  }

  const priorProvenance = state.provenance[parsed.assetId] ?? Object.freeze([])
  if (priorProvenance.length >= INTER_AGENCY_OWNERSHIP_TRANSFER_MAX_PROVENANCE_PER_ASSET) {
    return rejectResult(state, 'provenance_capacity_exceeded', undefined, authorization)
  }

  const duration = lockDurationWeeks(parsed.assetClass)
  const expiresAtWeek = parsed.authoritativeWeek + duration
  const provenanceKind: TransferProvenanceKind =
    parsed.mode === 'forced_admin' ? 'forced_admin_transfer' : 'inter_agency_transfer'

  const entryId = `${parsed.requestId}:prov`
  const provenanceEntry = freezeProvenanceEntry({
    entryId,
    requestId: parsed.requestId,
    kind: provenanceKind,
    fromAgencyId: parsed.fromAgencyId,
    toAgencyId: parsed.toAgencyId,
    authoritativeWeek: parsed.authoritativeWeek,
  })

  const nextProvenanceList = Object.freeze([...priorProvenance, provenanceEntry])

  const nextOwnership = createStringBag<OwnershipRecord>()
  for (const [key, record] of Object.entries(state.ownership)) {
    nextOwnership[key] = record
  }
  nextOwnership[parsed.assetId] = freezeOwnershipRecord({
    ...existing,
    owningAgencyId: parsed.toAgencyId,
    updatedAtWeek: parsed.authoritativeWeek,
  })

  const nextLocks = createStringBag<TransferLock>()
  for (const [key, lock] of Object.entries(state.locks)) {
    nextLocks[key] = lock
  }
  nextLocks[parsed.assetId] = freezeLock({
    assetId: parsed.assetId,
    assetClass: parsed.assetClass,
    lockStartedWeek: parsed.authoritativeWeek,
    expiresAtWeek,
    originatingRequestId: parsed.requestId,
  })

  const nextCompleted = createStringBag<true>()
  for (const [key, marker] of Object.entries(state.completedRequestIds)) {
    nextCompleted[key] = marker
  }
  nextCompleted[parsed.requestId] = true

  const nextProvenance = createStringBag<readonly TransferProvenanceEntry[]>()
  for (const [key, entries] of Object.entries(state.provenance)) {
    nextProvenance[key] = entries
  }
  nextProvenance[parsed.assetId] = nextProvenanceList

  const nextState = freezeState({
    schemaVersion: INTER_AGENCY_OWNERSHIP_TRANSFER_SCHEMA_VERSION,
    ownership: Object.freeze(nextOwnership),
    provenance: Object.freeze(nextProvenance),
    locks: Object.freeze(nextLocks),
    completedRequestIds: Object.freeze(nextCompleted),
  })

  return Object.freeze({
    outcome: 'completed',
    reasonCode: 'completed',
    state: nextState,
    authorization,
  })
}

/** Convenience: authorize + complete in one step; surfaces lock remaining weeks on rejection. */
export function attemptTransferDuringLock(
  state: InterAgencyOwnershipTransferState,
  request: TransferRequest | unknown,
): TransferAttemptResult {
  const authorization = authorizeTransferRequest(state, request)
  if (!authorization.authorized) {
    const eligibility = evaluateTransferEligibility(state, request)
    return rejectResult(
      state,
      authorization.reasonCode as TransferRejectionReason,
      eligibility.lockRemainingWeeks,
      authorization,
    )
  }
  return completeOwnershipTransfer(state, request, authorization)
}

/** Forced/admin transfer routes through the same mutation path as standard transfers. */
export function completeForcedAdminOwnershipTransfer(
  state: InterAgencyOwnershipTransferState,
  request: TransferRequest | unknown,
): TransferAttemptResult {
  const parsed = parseTransferRequest(request)
  if (!parsed || parsed.mode !== 'forced_admin') {
    return rejectResult(state, 'malformed_request')
  }
  const authorization = authorizeTransferRequest(state, parsed)
  return completeOwnershipTransfer(state, parsed, authorization)
}

export function expireLocksAtWeek(
  state: InterAgencyOwnershipTransferState,
  authoritativeWeek: number,
): InterAgencyOwnershipTransferState {
  if (!isNonNegativeInt(authoritativeWeek)) return state

  const nextLocks = createStringBag<TransferLock>()
  for (const [key, lock] of Object.entries(state.locks)) {
    if (isLockActive(lock, authoritativeWeek)) {
      nextLocks[key] = lock
    }
  }

  if (Object.keys(nextLocks).length === Object.keys(state.locks).length) {
    return state
  }

  return freezeState({
    schemaVersion: INTER_AGENCY_OWNERSHIP_TRANSFER_SCHEMA_VERSION,
    ownership: state.ownership,
    provenance: state.provenance,
    locks: Object.freeze(nextLocks),
    completedRequestIds: state.completedRequestIds,
  })
}

/** Internal reassignment within one agency — no inter-agency provenance or anti-cycling lock. */
export function applyInternalReassignment(
  state: InterAgencyOwnershipTransferState,
  input: {
    readonly assetId: string
    readonly owningAgencyId: string
    readonly internalAssignmentRef: string
    readonly authoritativeWeek: number
  },
): InternalReassignmentResult {
  if (
    !isSafeId(input.assetId) ||
    !isSafeId(input.owningAgencyId) ||
    !isNonEmptyString(input.internalAssignmentRef) ||
    !isNonNegativeInt(input.authoritativeWeek)
  ) {
    return Object.freeze({
      outcome: 'rejected',
      reasonCode: 'malformed_request',
      state,
    })
  }

  const existing = state.ownership[input.assetId.trim()]
  if (!existing) {
    return Object.freeze({
      outcome: 'rejected',
      reasonCode: 'asset_not_found',
      state,
    })
  }

  if (existing.owningAgencyId !== input.owningAgencyId.trim()) {
    return Object.freeze({
      outcome: 'rejected',
      reasonCode: 'ownership_mismatch',
      state,
    })
  }

  const nextOwnership = createStringBag<OwnershipRecord>()
  for (const [key, record] of Object.entries(state.ownership)) {
    nextOwnership[key] = record
  }
  nextOwnership[input.assetId.trim()] = freezeOwnershipRecord({
    ...existing,
    internalAssignmentRef: input.internalAssignmentRef.trim(),
    updatedAtWeek: input.authoritativeWeek,
  })

  return Object.freeze({
    outcome: 'applied',
    reasonCode: 'internal_reassignment_applied',
    state: freezeState({
      schemaVersion: INTER_AGENCY_OWNERSHIP_TRANSFER_SCHEMA_VERSION,
      ownership: Object.freeze(nextOwnership),
      provenance: state.provenance,
      locks: state.locks,
      completedRequestIds: state.completedRequestIds,
    }),
  })
}

export function seedOwnershipRecord(
  state: InterAgencyOwnershipTransferState,
  record: OwnershipRecord | unknown,
): InterAgencyOwnershipTransferState | null {
  const parsed = parseOwnershipRecord(record)
  if (!parsed) return null
  if (Object.keys(state.ownership).length >= INTER_AGENCY_OWNERSHIP_TRANSFER_MAX_ASSETS) {
    if (!Object.prototype.hasOwnProperty.call(state.ownership, parsed.assetId)) return null
  }

  const nextOwnership = createStringBag<OwnershipRecord>()
  for (const [key, existing] of Object.entries(state.ownership)) {
    nextOwnership[key] = existing
  }
  nextOwnership[parsed.assetId] = parsed

  return freezeState({
    schemaVersion: INTER_AGENCY_OWNERSHIP_TRANSFER_SCHEMA_VERSION,
    ownership: Object.freeze(nextOwnership),
    provenance: state.provenance,
    locks: state.locks,
    completedRequestIds: state.completedRequestIds,
  })
}

// ---------------------------------------------------------------------------
// Deterministic fixtures (personnel + equipment share transfer path)
// ---------------------------------------------------------------------------

export const DEMO_AGENCY_ALPHA = 'agency:alpha-field-office' as const
export const DEMO_AGENCY_BETA = 'agency:beta-research-lab' as const

export const DEMO_PERSONNEL_ASSET_ID = 'asset:personnel:agent-kline' as const
export const DEMO_EQUIPMENT_ASSET_ID = 'asset:equipment:spectrometer-7' as const

export const DEMO_PERSONNEL_OWNERSHIP: OwnershipRecord = Object.freeze({
  assetId: DEMO_PERSONNEL_ASSET_ID,
  assetClass: 'personnel',
  owningAgencyId: DEMO_AGENCY_ALPHA,
  internalAssignmentRef: 'unit:alpha-investigations',
  updatedAtWeek: 4,
})

export const DEMO_EQUIPMENT_OWNERSHIP: OwnershipRecord = Object.freeze({
  assetId: DEMO_EQUIPMENT_ASSET_ID,
  assetClass: 'equipment',
  owningAgencyId: DEMO_AGENCY_ALPHA,
  updatedAtWeek: 4,
})

export function createDemoInterAgencyOwnershipTransferState(): InterAgencyOwnershipTransferState {
  let state = createEmptyInterAgencyOwnershipTransferState()
  state = seedOwnershipRecord(state, DEMO_PERSONNEL_OWNERSHIP)!
  state = seedOwnershipRecord(state, DEMO_EQUIPMENT_OWNERSHIP)!
  return state
}
