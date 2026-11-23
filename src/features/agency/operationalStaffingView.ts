import type { GameState } from '../../domain/models'
import type {
  FacilityOperationalPostValidity,
  FacilityOperationalPostValidityReason,
} from '../../domain/facilityOperationalPostValidity'
import { deriveOperationalStaffCapacity } from '../../domain/operationalStaffCapacity'
import { OPERATIONAL_STAFF_POSTS } from '../../domain/operationalStaffPosts'
import type {
  OperationalStaffPostId,
  OperationalStaffPostReason,
} from '../../domain/operationalStaffPosts'

export const OPERATIONAL_STAFF_POSTS_ANCHOR = 'operational-staff-posts'

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
  rosterUnavailable: 'Operational staffing data is unavailable.',
  managePosts: 'Manage operational posts',
  postHeading: 'Operational post assignments',
  emptyRoster: 'No operational staff on the roster.',
  staffReference: (id: string) => `Staff record ${id}`,
  unassignPost: 'Unassign post',
  currentPost: (post: string) => `Current post: ${post}`,
  unassignedPost: 'Current post: Unassigned',
  choosePost: (post: string, assigned: boolean) =>
    assigned ? `Move to ${post}` : `Assign to ${post}`,
  occupiedPost: (action: string) => `${action} (occupied)`,
  commandFeedback: (person: string, result: string) => `${person}: ${result}`,
  facilityHold: (reason: string) => `Capacity temporarily withheld. ${reason}`,
} as const

export const OPERATIONAL_STAFF_POST_REASON_COPY: Record<OperationalStaffPostReason, string> = {
  assigned: 'Post assigned.',
  unassigned: 'Post unassigned.',
  reassigned: 'Post reassigned.',
  already_at_destination: 'The assignment is already up to date.',
  invalid_request: 'The assignment request is invalid.',
  invalid_roster: 'Operational staffing data is unavailable.',
  unknown_staff: 'This person is no longer on the roster.',
  instructor_not_supported: 'Instructors cannot hold operational posts.',
  invalid_staff: 'This staff record cannot hold an operational post.',
  unknown_post: 'This operational post is no longer available.',
  specialty_mismatch: 'This post requires a different specialty.',
  occupied_post: 'Another staff member already holds this post.',
  invalid_assignment: 'The current assignment is invalid or conflicts with another assignment.',
  stale_request: 'The current assignment changed. Review it and try again.',
}

const FACILITY_REASON_COPY: Record<FacilityOperationalPostValidityReason, string> = {
  supported: 'Facility support is ready.',
  degraded: 'Facility support is degraded.',
  unavailable: 'Facility support is unavailable.',
  missing_support: 'The required facility support could not be found.',
  rejected_support: 'The facility support status could not be validated.',
}

const POST_LABELS: Record<OperationalStaffPostId, string> = {
  'staff-post:analysis:1': 'Analysis post 1',
  'staff-post:analysis:2': 'Analysis post 2',
  'staff-post:intel:1': 'Intelligence post 1',
  'staff-post:intel:2': 'Intelligence post 2',
  'staff-post:logistics:1': 'Logistics post 1',
  'staff-post:logistics:2': 'Logistics post 2',
  'staff-post:fabrication:1': 'Fabrication post 1',
  'staff-post:fabrication:2': 'Fabrication post 2',
}

export function projectOperationalStaffingView(
  game: GameState,
  facilityValidity?: readonly FacilityOperationalPostValidity[]
) {
  const capacity = deriveOperationalStaffCapacity(game, facilityValidity)
  const staffNames = new Map<string, string>()
  for (const event of game.events ?? []) {
    if (event.type === 'agent.hired' && event.payload.recruitCategory === 'staff') {
      staffNames.set(event.payload.agentId, event.payload.agentName)
    }
  }
  const occupied = new Set(Object.values(capacity.byStaffId).map(({ postId }) => postId))
  const personnel = Object.entries(capacity.byStaffId).flatMap(([id, contribution]) => {
    if (contribution.specialty === null) return []
    const { postId, reason, facilityEligible, facilityReason } = contribution
    return [
      {
        id,
        name: staffNames.get(id) ?? OPERATIONAL_STAFFING_COPY.staffReference(id),
        postId,
        postLabel: postId === null ? null : POST_LABELS[postId],
        assignmentIssue:
          reason === 'invalid_assignment' ? OPERATIONAL_STAFF_POST_REASON_COPY[reason] : null,
        facilityHold:
          facilityEligible === false && facilityReason
            ? OPERATIONAL_STAFFING_COPY.facilityHold(FACILITY_REASON_COPY[facilityReason])
            : null,
        targets: OPERATIONAL_STAFF_POSTS.filter(
          (post) => post.specialty === contribution.specialty
        ).map((post) => ({
          id: post.id,
          label: POST_LABELS[post.id],
          occupied: occupied.has(post.id),
        })),
      },
    ]
  })
  return {
    capacity,
    personnel,
    unassignedCount: capacity.reasonCounts.unassigned,
    invalidAssignmentCount: capacity.reasonCounts.invalid_assignment,
    unavailable: capacity.reason === 'invalid_roster',
  }
}
