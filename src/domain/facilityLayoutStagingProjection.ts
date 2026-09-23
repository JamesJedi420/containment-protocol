/**
 * SPE-2987 / SPE-2988 / SPE-2989 / SPE-2990 / SPE-2992: authored room → department staging pairs.
 * Caller-owned. Hydration and week-close do not call this.
 */

import type { DepartmentLocalStaging } from './departmentLocalStaging'
import type { FacilityLayoutSnapshot } from './facilityLayoutStrategy'
import { parseDepartmentLocalStaging } from './departmentLocalStaging'

/** SPE-2987 room. Other room ids stay unprojected unless named below. */
export const LAYOUT_STAGING_ROOM_ID = 'archive' as const

/** Known department written when `archive` is adjacent to critical. */
export const LAYOUT_STAGING_DEPARTMENT_ID = 'department:records-analysis' as const

/** SPE-2988 room. Not derived from the room id. */
export const LAYOUT_STAGING_MED_BAY_ROOM_ID = 'med_bay' as const

/** Known department written when `med_bay` is adjacent to critical. */
export const LAYOUT_STAGING_EMERGENCY_DEPARTMENT_ID = 'department:emergency-response' as const

/** SPE-2989 room. Not derived from the room id. */
export const LAYOUT_STAGING_ARMORY_ROOM_ID = 'armory' as const

/** Known department written when `armory` is adjacent to critical. */
export const LAYOUT_STAGING_FIELD_CONTAINMENT_DEPARTMENT_ID =
  'department:field-containment' as const

/** SPE-2990 room. Not derived from the room id. */
export const LAYOUT_STAGING_CLOSET_ROOM_ID = 'staging_closet' as const

/** Known department written when `staging_closet` is adjacent to critical. */
export const LAYOUT_STAGING_PROCUREMENT_DEPARTMENT_ID = 'department:procurement-logistics' as const

/** SPE-2992 room. Not derived from the room id. */
export const LAYOUT_STAGING_LEGAL_ROOM_ID = 'legal' as const

/** Known department written when `legal` is adjacent to critical. */
export const LAYOUT_STAGING_ETHICS_DEPARTMENT_ID = 'department:ethics-review' as const

const ADJACENT_STAGING = {
  inputStaging: 'adjacent',
  outputStaging: 'adjacent',
} as const

/**
 * Project `facilityLayoutSnapshot.rooms` onto a caller-owned staging map.
 * Omit layout (`undefined`) returns `staging` unchanged (same reference).
 * `archive` with `adjacentToCritical: true` sets records-analysis to adjacent on both axes.
 * `med_bay` with `adjacentToCritical: true` sets emergency-response to adjacent on both axes.
 * `armory` with `adjacentToCritical: true` sets field-containment to adjacent on both axes.
 * `staging_closet` with `adjacentToCritical: true` sets procurement-logistics to adjacent on both axes.
 * `legal` with `adjacentToCritical: true` sets ethics-review to adjacent on both axes.
 * A false flag, a missing room, or any other room does not insert a key and does not write `remote`.
 * Unrelated saved staging entries are kept. The result is sanitized with `parseDepartmentLocalStaging`.
 */
export function projectFacilityLayoutRoomsOntoDepartmentLocalStaging(
  layout: FacilityLayoutSnapshot | undefined,
  staging: DepartmentLocalStaging | undefined
): DepartmentLocalStaging | undefined {
  if (layout === undefined) return staging

  const draft: Record<string, unknown> = staging === undefined ? {} : { ...staging }
  const authoredArchive = layout.rooms.find((room) => room.roomId === LAYOUT_STAGING_ROOM_ID)
  if (authoredArchive?.adjacentToCritical === true) {
    draft[LAYOUT_STAGING_DEPARTMENT_ID] = ADJACENT_STAGING
  }
  const authoredMedBay = layout.rooms.find((room) => room.roomId === LAYOUT_STAGING_MED_BAY_ROOM_ID)
  if (authoredMedBay?.adjacentToCritical === true) {
    draft[LAYOUT_STAGING_EMERGENCY_DEPARTMENT_ID] = ADJACENT_STAGING
  }
  const authoredArmory = layout.rooms.find((room) => room.roomId === LAYOUT_STAGING_ARMORY_ROOM_ID)
  if (authoredArmory?.adjacentToCritical === true) {
    draft[LAYOUT_STAGING_FIELD_CONTAINMENT_DEPARTMENT_ID] = ADJACENT_STAGING
  }
  const authoredStagingCloset = layout.rooms.find(
    (room) => room.roomId === LAYOUT_STAGING_CLOSET_ROOM_ID
  )
  if (authoredStagingCloset?.adjacentToCritical === true) {
    draft[LAYOUT_STAGING_PROCUREMENT_DEPARTMENT_ID] = ADJACENT_STAGING
  }
  const authoredLegal = layout.rooms.find((room) => room.roomId === LAYOUT_STAGING_LEGAL_ROOM_ID)
  if (authoredLegal?.adjacentToCritical === true) {
    draft[LAYOUT_STAGING_ETHICS_DEPARTMENT_ID] = ADJACENT_STAGING
  }
  return parseDepartmentLocalStaging(draft)
}
