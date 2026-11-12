import {
  indexFacilityOperationalPostValidity,
  type FacilityOperationalPostValidity,
  type FacilityOperationalPostValidityReason,
} from './facilityOperationalPostValidity'
import type { GameState, StaffData } from './models'
import { normalizeStaffCandidateSpecialty } from './recruitment/helpers'

export type StaffSpecialty = 'analysis' | 'intel' | 'logistics' | 'fabrication'
export type OperationalStaffPostId = `staff-post:${StaffSpecialty}:${1 | 2}`

/** Authored assignment slots only; capacity and throughput belong to downstream consumers. */
export const OPERATIONAL_STAFF_POSTS = Object.freeze(
  (['analysis', 'intel', 'logistics', 'fabrication'] as const).flatMap((specialty) =>
    ([1, 2] as const).map((slot) =>
      Object.freeze({ id: `staff-post:${specialty}:${slot}` as OperationalStaffPostId, specialty })
    )
  )
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function operationalStaffSpecialty(value: unknown): StaffSpecialty | undefined {
  if (!isRecord(value) || (value.role !== undefined && value.role !== 'staff')) return undefined
  const specialty = value.specialty
  if (
    specialty !== 'analysis' &&
    specialty !== 'intel' &&
    specialty !== 'intelligence' &&
    specialty !== 'logistics' &&
    specialty !== 'fabrication'
  )
    return undefined
  return normalizeStaffCandidateSpecialty(specialty)
}

export function isValidOperationalStaffPost(
  value: unknown,
  postId: unknown
): postId is OperationalStaffPostId {
  const specialty = operationalStaffSpecialty(value)
  return (
    specialty !== undefined &&
    OPERATIONAL_STAFF_POSTS.some((post) => post.id === postId && post.specialty === specialty)
  )
}

/** Remove invalid and conflicting occupancy without selecting a winner by roster order. */
export function normalizeOperationalStaffPosts(staff: GameState['staff']): GameState['staff'] {
  const claims = new Map<string, number>()
  for (const entry of Object.values(staff)) {
    if (isRecord(entry) && typeof entry.operationalPostId === 'string') {
      claims.set(entry.operationalPostId, (claims.get(entry.operationalPostId) ?? 0) + 1)
    }
  }
  let next = staff
  for (const [id, entry] of Object.entries(staff)) {
    if (!isRecord(entry) || !Object.hasOwn(entry, 'operationalPostId')) continue
    if (
      isValidOperationalStaffPost(entry, entry.operationalPostId) &&
      claims.get(entry.operationalPostId) === 1
    )
      continue
    if (next === staff) next = { ...staff }
    const clean = { ...entry }
    delete clean.operationalPostId
    next[id] = clean as StaffData
  }
  return next
}

export type OperationalStaffPostReason =
  | 'assigned'
  | 'unassigned'
  | 'reassigned'
  | 'already_at_destination'
  | 'invalid_request'
  | 'invalid_roster'
  | 'unknown_staff'
  | 'instructor_not_supported'
  | 'invalid_staff'
  | 'unknown_post'
  | 'specialty_mismatch'
  | 'occupied_post'
  | 'invalid_assignment'
  | 'stale_request'

export interface OperationalStaffPostRequest {
  staffId: string
  expectedPreviousPostId: OperationalStaffPostId | null
}
export interface OperationalStaffPostAssignmentRequest extends OperationalStaffPostRequest {
  postId: OperationalStaffPostId
}
export interface OperationalStaffPostResult {
  game: GameState
  status: 'applied' | 'no_op' | 'blocked'
  reason: OperationalStaffPostReason
}

/** Shared assignment truth; recruitment metadata never establishes occupancy. */
function queryPostEntry(entry: unknown, claims: ReadonlyMap<string, number>) {
  if (isRecord(entry) && entry.role === 'instructor')
    return { postId: null, reason: 'instructor_not_supported' as const }
  if (!operationalStaffSpecialty(entry)) return { postId: null, reason: 'invalid_staff' as const }
  const rawPost = (entry as Exclude<StaffData, { role: 'instructor' }>).operationalPostId
  if (rawPost === undefined) return { postId: null, reason: 'unassigned' as const }
  if (!isValidOperationalStaffPost(entry, rawPost))
    return { postId: null, reason: 'invalid_assignment' as const }
  if (claims.get(rawPost) !== 1) {
    return { postId: null, reason: 'invalid_assignment' as const }
  }
  return { postId: rawPost, reason: 'assigned' as const }
}

export interface OperationalStaffPostFacilityGate {
  readonly facilityEligible: boolean
  readonly facilityReason: FacilityOperationalPostValidityReason
}

export type OperationalStaffPostQuery = Readonly<
  ReturnType<typeof queryPostEntry> & Partial<OperationalStaffPostFacilityGate>
>

function withFacilityGate(
  occupancy: ReturnType<typeof queryPostEntry>,
  gates: ReadonlyMap<string, FacilityOperationalPostValidity> | undefined
): OperationalStaffPostQuery {
  if (!gates || occupancy.postId === null) return occupancy
  const gate = gates.get(occupancy.postId)
  if (!gate) return occupancy
  return {
    ...occupancy,
    facilityEligible: gate.eligible,
    facilityReason: gate.reason,
  }
}

/** One snapshot and two passes; all raw claims participate in conflict validation. */
export function queryOperationalStaffPosts(
  game: GameState,
  facilityValidity?: readonly FacilityOperationalPostValidity[]
): {
  readonly reason: 'valid_roster' | 'invalid_roster'
  readonly byStaffId: Readonly<Record<string, OperationalStaffPostQuery>>
} {
  if (!isRecord(game.staff)) return { reason: 'invalid_roster', byStaffId: {} }
  const entries = Object.entries(game.staff)
  const claims = new Map<string, number>()
  for (const [, entry] of entries) {
    if (isRecord(entry) && typeof entry.operationalPostId === 'string') {
      claims.set(entry.operationalPostId, (claims.get(entry.operationalPostId) ?? 0) + 1)
    }
  }
  const gates =
    facilityValidity === undefined
      ? undefined
      : indexFacilityOperationalPostValidity(facilityValidity)
  return {
    reason: 'valid_roster',
    byStaffId: Object.fromEntries(
      entries.map(([id, entry]) => [id, withFacilityGate(queryPostEntry(entry, claims), gates)])
    ),
  }
}

/** Recruitment metadata never establishes occupancy. */
export function queryOperationalStaffPost(game: GameState, staffId: string) {
  const batch = queryOperationalStaffPosts(game)
  if (batch.reason === 'invalid_roster') return { postId: null, reason: 'invalid_roster' as const }
  if (!Object.hasOwn(batch.byStaffId, staffId))
    return { postId: null, reason: 'unknown_staff' as const }
  return batch.byStaffId[staffId]!
}

function changePost(
  game: GameState,
  request: OperationalStaffPostRequest,
  destination: unknown
): OperationalStaffPostResult {
  const blocked = (reason: OperationalStaffPostReason): OperationalStaffPostResult => ({
    game,
    status: 'blocked',
    reason,
  })
  if (
    !isRecord(request) ||
    typeof request.staffId !== 'string' ||
    request.staffId.length === 0 ||
    !Object.hasOwn(request, 'expectedPreviousPostId') ||
    (request.expectedPreviousPostId !== null &&
      !OPERATIONAL_STAFF_POSTS.some((post) => post.id === request.expectedPreviousPostId))
  )
    return blocked('invalid_request')
  const current = queryOperationalStaffPost(game, request.staffId)
  if (current.reason !== 'assigned' && current.reason !== 'unassigned')
    return blocked(current.reason)
  const entry = game.staff[request.staffId] as Exclude<StaffData, { role: 'instructor' }>
  if (destination !== null) {
    if (!OPERATIONAL_STAFF_POSTS.some((post) => post.id === destination))
      return blocked('unknown_post')
    if (!isValidOperationalStaffPost(entry, destination)) return blocked('specialty_mismatch')
    if (
      Object.entries(game.staff).some(
        ([id, other]) =>
          id !== request.staffId && isRecord(other) && other.operationalPostId === destination
      )
    )
      return blocked('occupied_post')
  }
  if (current.postId === destination)
    return { game, status: 'no_op', reason: 'already_at_destination' }
  if (current.postId !== request.expectedPreviousPostId) return blocked('stale_request')
  const updated = { ...entry }
  delete updated.operationalPostId
  if (destination !== null) updated.operationalPostId = destination as OperationalStaffPostId
  return {
    game: { ...game, staff: { ...game.staff, [request.staffId]: updated } },
    status: 'applied',
    reason:
      destination === null ? 'unassigned' : current.postId === null ? 'assigned' : 'reassigned',
  }
}

export function assignOperationalStaffPost(
  game: GameState,
  request: OperationalStaffPostAssignmentRequest
) {
  return changePost(game, request, request?.postId)
}
export function reassignOperationalStaffPost(
  game: GameState,
  request: OperationalStaffPostAssignmentRequest
) {
  return changePost(game, request, request?.postId)
}
export function unassignOperationalStaffPost(
  game: GameState,
  request: OperationalStaffPostRequest
) {
  return changePost(game, request, null)
}
