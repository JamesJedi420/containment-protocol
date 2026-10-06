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

/**
 * One unit per usable canonical post occupant. Non-instructor staff currently have
 * no authoritative availability restrictions; never borrow agent-only state.
 * This result is ephemeral derived data, not a persisted personnel registry.
 */
export function deriveOperationalStaffCapacity(game: GameState): OperationalStaffCapacityResult {
  const posts = queryOperationalStaffPosts(game)
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
    const contribution = {
      specialty,
      postId: post.postId,
      reason: post.reason,
      headcount,
      available: headcount,
      assigned,
      effectiveCapacity: assigned,
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
