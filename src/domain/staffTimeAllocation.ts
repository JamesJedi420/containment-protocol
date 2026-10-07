import type { GameState } from './models'
import { deriveOperationalStaffCapacity } from './operationalStaffCapacity'
import { OPERATIONAL_STAFF_POSTS } from './operationalStaffPosts'

export interface StaffTimeCommitment {
  readonly id: string
  readonly week: number
  readonly staffIds: readonly string[]
  readonly postIds: readonly string[]
  readonly destination: string
  readonly displacedAlternative: string | null
  readonly status: 'active' | 'released'
}
export type StaffTimeLedger =
  | { readonly version: 1; readonly commitments: readonly StaffTimeCommitment[] }
  | { readonly version: 1; readonly unavailable: true }
export interface StaffTimeRequest {
  readonly id: string
  readonly week: number
  readonly staffIds: readonly string[]
  readonly destination: string
  readonly displacedAlternative: string | null
  readonly revision: string
}
export type StaffTimeReason =
  | 'committed'
  | 'released'
  | 'no_op'
  | 'invalid_request'
  | 'malformed_source'
  | 'stale_request'
  | 'insufficient_capacity'
  | 'conflict'
export interface StaffTimeResult {
  readonly game: GameState
  readonly status: 'applied' | 'no_op' | 'blocked'
  readonly reason: StaffTimeReason
}
const id = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.trim() === value
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/** Invalid present saves retain an explicit fail-closed marker, never a free pool. */
export function normalizeStaffTimeLedger(raw: unknown): StaffTimeLedger | undefined {
  if (raw === undefined) return undefined
  const invalid = { version: 1, unavailable: true } as const
  if (
    !record(raw) ||
    !Object.hasOwn(raw, 'version') ||
    !Object.hasOwn(raw, 'commitments') ||
    'unavailable' in raw ||
    raw.version !== 1 ||
    !Array.isArray(raw.commitments)
  )
    return invalid
  const commitments: StaffTimeCommitment[] = []
  const ids = new Set<string>()
  const claims = new Set<string>()
  const destinations = new Set<string>()
  for (const value of raw.commitments) {
    if (
      !record(value) ||
      !['id', 'week', 'staffIds', 'postIds', 'destination', 'displacedAlternative', 'status'].every(
        (key) => Object.hasOwn(value, key)
      ) ||
      !id(value.id) ||
      ids.has(value.id) ||
      !Number.isSafeInteger(value.week) ||
      (value.week as number) < 0 ||
      !id(value.destination) ||
      !(value.displacedAlternative === null || id(value.displacedAlternative)) ||
      value.destination === value.displacedAlternative ||
      !['active', 'released'].includes(value.status as string) ||
      !Array.isArray(value.staffIds) ||
      value.staffIds.length === 0 ||
      !Array.from(value.staffIds).every(id) ||
      new Set(value.staffIds).size !== value.staffIds.length ||
      !Array.isArray(value.postIds) ||
      value.postIds.length !== value.staffIds.length ||
      !Array.from(value.postIds).every((post) => OPERATIONAL_STAFF_POSTS.some((p) => p.id === post))
    )
      return invalid
    ids.add(value.id)
    const destination = JSON.stringify([value.week, value.destination])
    if (destinations.has(destination)) return invalid
    destinations.add(destination)
    for (const staffId of value.staffIds) {
      const claim = JSON.stringify([value.week, staffId])
      if (value.status === 'active' && claims.has(claim)) return invalid
      if (value.status === 'active') claims.add(claim)
    }
    commitments.push({
      id: value.id,
      week: value.week as number,
      staffIds: [...value.staffIds],
      postIds: [...value.postIds],
      destination: value.destination,
      displacedAlternative: value.displacedAlternative as string | null,
      status: value.status as StaffTimeCommitment['status'],
    })
  }
  return {
    version: 1,
    commitments: commitments.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  }
}

export function queryStaffTimeAllocation(game: GameState) {
  const capacity = deriveOperationalStaffCapacity(game)
  const ledger = normalizeStaffTimeLedger(game.staffTimeAllocations)
  const unavailable =
    capacity.reason !== 'valid_roster' ||
    !Number.isSafeInteger(game.week) ||
    game.week < 0 ||
    (ledger !== undefined && 'unavailable' in ledger) ||
    (ledger !== undefined &&
      'commitments' in ledger &&
      ledger.commitments.some((c) => c.week > game.week))
  const commitments = ledger && 'commitments' in ledger ? ledger.commitments : []
  const active = commitments.filter((c) => c.status === 'active' && c.week === game.week)
  const occupied = new Set(active.flatMap((c) => c.staffIds))
  const eligibleIds = Object.keys(capacity.byStaffId)
    .filter((key) => capacity.byStaffId[key].effectiveCapacity > 0)
    .sort()
  const availableIds = unavailable ? [] : eligibleIds.filter((key) => !occupied.has(key))
  const usableCommitmentIds = unavailable
    ? []
    : active
        .filter((commitment) =>
          commitment.staffIds.every(
            (key, index) =>
              capacity.byStaffId[key]?.effectiveCapacity > 0 &&
              capacity.byStaffId[key]?.postId === commitment.postIds[index]
          )
        )
        .map((commitment) => commitment.id)
  const revision = JSON.stringify([
    game.week,
    unavailable,
    eligibleIds.map((key) => [key, capacity.byStaffId[key].postId]),
    commitments,
  ])
  return { unavailable, commitments, active, availableIds, usableCommitmentIds, capacity, revision }
}

export function isStaffTimeCommitmentUsable(
  game: GameState,
  commitment: StaffTimeCommitment
): boolean {
  const query = queryStaffTimeAllocation(game)
  const stored = query.active.find((c) => c.id === commitment.id)
  return (
    !query.unavailable &&
    stored !== undefined &&
    JSON.stringify(stored) === JSON.stringify(commitment) &&
    query.usableCommitmentIds.includes(commitment.id)
  )
}

export function commitStaffTime(game: GameState, request: StaffTimeRequest): StaffTimeResult {
  const blocked = (reason: StaffTimeReason): StaffTimeResult => ({
    game,
    status: 'blocked',
    reason,
  })
  if (
    !record(request) ||
    !id(request.id) ||
    !id(request.destination) ||
    !(request.displacedAlternative === null || id(request.displacedAlternative)) ||
    request.displacedAlternative === request.destination ||
    !Array.isArray(request.staffIds) ||
    request.staffIds.length === 0 ||
    !Array.from(request.staffIds).every(id) ||
    new Set(request.staffIds).size !== request.staffIds.length
  )
    return blocked('invalid_request')
  const query = queryStaffTimeAllocation(game)
  if (query.unavailable) return blocked('malformed_source')
  const staffIds = [...request.staffIds].sort()
  const prior = query.commitments.find((c) => c.id === request.id)
  if (prior)
    return prior.week === request.week &&
      prior.destination === request.destination &&
      prior.displacedAlternative === request.displacedAlternative &&
      JSON.stringify(prior.staffIds) === JSON.stringify(staffIds)
      ? { game, status: 'no_op', reason: 'no_op' }
      : blocked('conflict')
  if (request.week !== game.week || request.revision !== query.revision)
    return blocked('stale_request')
  if (query.commitments.some((c) => c.week === game.week && c.destination === request.destination))
    return blocked('conflict')
  if (staffIds.some((key) => !(query.capacity.byStaffId[key]?.effectiveCapacity > 0)))
    return blocked('insufficient_capacity')
  if (staffIds.some((key) => !query.availableIds.includes(key))) return blocked('conflict')
  const commitment: StaffTimeCommitment = {
    id: request.id,
    week: game.week,
    staffIds,
    postIds: staffIds.map((key) => query.capacity.byStaffId[key].postId as string),
    destination: request.destination,
    displacedAlternative: request.displacedAlternative,
    status: 'active',
  }
  return {
    game: {
      ...game,
      staffTimeAllocations: normalizeStaffTimeLedger({
        version: 1,
        commitments: [...query.commitments, commitment],
      }),
    },
    status: 'applied',
    reason: 'committed',
  }
}

export function releaseStaffTime(
  game: GameState,
  commitmentId: string,
  revision: string
): StaffTimeResult {
  const query = queryStaffTimeAllocation(game)
  if (query.unavailable) return { game, status: 'blocked', reason: 'malformed_source' }
  const prior = query.commitments.find((c) => c.id === commitmentId)
  if (!prior) return { game, status: 'blocked', reason: 'invalid_request' }
  if (prior.status === 'released') return { game, status: 'no_op', reason: 'no_op' }
  if (revision !== query.revision) return { game, status: 'blocked', reason: 'stale_request' }
  return {
    game: {
      ...game,
      staffTimeAllocations: {
        version: 1,
        commitments: query.commitments.map((c) =>
          c.id === commitmentId ? { ...c, status: 'released' } : c
        ),
      },
    },
    status: 'applied',
    reason: 'released',
  }
}
