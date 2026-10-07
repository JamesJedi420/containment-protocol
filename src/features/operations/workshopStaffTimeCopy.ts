import type { StaffTimeReason } from '../../domain/staffTimeAllocation'
export const WORKSHOP_STAFF_TIME_COPY = {
  title: 'Archive staff reservations',
  mirrorNote: 'Workshop outcomes are read-only. Archive staff reservations can be managed below.',
  description:
    'Reserve one analysis staff member for this week’s records review. Reserved staff are unavailable to competing work until released. Agent-backed work remains independent.',
  order: 'Records-review order',
  staff: 'Analysis staff member',
  alternative: 'Displaced records-review order',
  none: 'None',
  choose: 'Choose',
  reserve: 'Reserve for this week',
  release: 'Release reservation',
  unavailable: 'Staff allocation is unavailable. No capacity can be reserved.',
  available: 'Available analysis staff',
  receipts: 'Reservation history',
  unusable: 'Reserved contributor is no longer usable. Release this reservation to cancel it.',
  reasons: {
    committed: 'Staff reserved.',
    released: 'Reservation released.',
    no_op: 'This command has already been applied.',
    invalid_request: 'Choose a valid order and analysis staff member.',
    malformed_source: 'Allocation state is unavailable.',
    stale_request: 'State changed. Review current availability and try again.',
    insufficient_capacity: 'The selected staff member is no longer operational.',
    conflict: 'That capacity or reservation is already committed.',
  } satisfies Record<StaffTimeReason, string>,
  statuses: { active: 'Reserved', released: 'Released' },
} as const
