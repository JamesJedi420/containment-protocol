import type { GameState } from '../../domain/models'
import { deriveOperationalStaffCapacity } from '../../domain/operationalStaffCapacity'

/** Presentation copy stays separate from canonical staffing reasons and counts. */
export const OPERATIONAL_STAFFING_COPY = {
  heading: 'Operational staffing',
  headcount: 'Operational staff headcount',
  assigned: 'Assigned personnel',
  capacity: 'Effective operational capacity',
  explanation: 'Capacity counts usable operational-post occupants. Headcount excludes instructors.',
  unassigned: 'Unassigned staff are not contributing to operational capacity.',
  invalidAssignment:
    'Invalid or conflicting post assignments do not contribute to operational capacity.',
  navigationUnavailable: 'Operational-post assignment navigation is currently unavailable.',
  rosterUnavailable: 'Operational staffing data is unavailable.',
} as const

export function projectOperationalStaffingView(game: GameState) {
  const capacity = deriveOperationalStaffCapacity(game)
  return {
    capacity,
    unassignedCount: capacity.reasonCounts.unassigned,
    invalidAssignmentCount: capacity.reasonCounts.invalid_assignment,
    unavailable: capacity.reason === 'invalid_roster',
  }
}
