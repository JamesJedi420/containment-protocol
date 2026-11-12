import {
  FACILITY_OPERATIONAL_POST_SUPPORT,
  type FacilityOperationalPostValidity,
  type FacilityOperationalPostValidityReason,
} from './facilityOperationalPostValidity'
import type { GameState } from './models'
import { operationalStaffSpecialty, queryOperationalStaffPosts } from './operationalStaffPosts'
import type { OperationalStaffPostQuery, StaffSpecialty } from './operationalStaffPosts'

export interface OperationalStaffCapacityCounts {
  readonly headcount: number
  readonly available: number
  readonly assigned: number
  readonly effectiveCapacity: number
}

export interface OperationalStaffCapacityContribution extends OperationalStaffCapacityCounts {
  readonly specialty: StaffSpecialty | null
  readonly postId: OperationalStaffPostQuery['postId']
  readonly reason: OperationalStaffPostQuery['reason']
  readonly facilityEligible?: boolean
  readonly facilityReason?: FacilityOperationalPostValidityReason
}

export interface OperationalStaffCapacityResult extends OperationalStaffCapacityCounts {
  readonly reason: 'valid_roster' | 'invalid_roster'
  readonly bySpecialty: Readonly<Record<StaffSpecialty, OperationalStaffCapacityCounts>>
  readonly byStaffId: Readonly<Record<string, OperationalStaffCapacityContribution>>
  readonly reasonCounts: Readonly<Record<OperationalStaffPostQuery['reason'], number>>
}

function emptyCounts() {
  return { headcount: 0, available: 0, assigned: 0, effectiveCapacity: 0 }
}

const AUTHORED_FACILITY_POSTS = new Set<string>(
  FACILITY_OPERATIONAL_POST_SUPPORT.map((support) => support.postId)
)

/**
 * One unit per usable canonical post occupant. Non-instructor staff currently have
 * no authoritative availability restrictions; never borrow agent-only state.
 * This result is ephemeral derived data, not a persisted personnel registry.
 * An optional facility-validity projection withholds effective capacity for an
 * authored post. Omitting it preserves occupancy capacity and the result shape.
 */
export function deriveOperationalStaffCapacity(
  game: GameState,
  facilityValidity?: readonly FacilityOperationalPostValidity[]
): OperationalStaffCapacityResult {
  const posts = queryOperationalStaffPosts(game, facilityValidity)
  const totals = emptyCounts()
  const bySpecialty = {
    analysis: emptyCounts(),
    intel: emptyCounts(),
    logistics: emptyCounts(),
    fabrication: emptyCounts(),
  }
  const reasonCounts = {
    assigned: 0,
    unassigned: 0,
    instructor_not_supported: 0,
    invalid_staff: 0,
    invalid_assignment: 0,
  }
  const contributions: [string, OperationalStaffCapacityContribution][] = []
  for (const [id, post] of Object.entries(posts.byStaffId)) {
    const specialty = operationalStaffSpecialty(game.staff[id]) ?? null
    const headcount = specialty === null ? 0 : 1
    const assigned = post.reason === 'assigned' ? 1 : 0
    const facilityGated =
      facilityValidity !== undefined &&
      post.postId !== null &&
      AUTHORED_FACILITY_POSTS.has(post.postId)
    const facilityEligible = post.facilityEligible === true
    const contribution = {
      specialty,
      postId: post.postId,
      reason: post.reason,
      headcount,
      available: headcount,
      assigned,
      effectiveCapacity: facilityGated ? (assigned === 1 && facilityEligible ? 1 : 0) : assigned,
      ...(facilityGated
        ? {
            facilityEligible,
            facilityReason: post.facilityReason ?? ('missing_support' as const),
          }
        : {}),
    }
    contributions.push([id, contribution])
    reasonCounts[post.reason]++
    for (const key of ['headcount', 'available', 'assigned', 'effectiveCapacity'] as const) {
      totals[key] += contribution[key]
      if (specialty !== null) bySpecialty[specialty][key] += contribution[key]
    }
  }
  return {
    ...totals,
    reason: posts.reason,
    bySpecialty,
    byStaffId: Object.fromEntries(contributions),
    reasonCounts,
  }
}
