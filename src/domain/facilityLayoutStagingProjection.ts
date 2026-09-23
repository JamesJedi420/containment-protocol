/**
 * SPE-2987: one authored room → department staging pair.
 * Caller-owned. Hydration and week-close do not call this.
 */

import type { DepartmentLocalStaging } from './departmentLocalStaging'
import type { FacilityLayoutSnapshot } from './facilityLayoutStrategy'
import { parseDepartmentLocalStaging } from './departmentLocalStaging'

/** The only room this slice projects. Other room ids stay unprojected. */
export const LAYOUT_STAGING_ROOM_ID = 'archive' as const

/** Known SPE-2083 department written when that room is adjacent to critical. */
export const LAYOUT_STAGING_DEPARTMENT_ID = 'department:records-analysis' as const

/**
 * Project `facilityLayoutSnapshot.rooms` onto a caller-owned staging map.
 * Omit layout (`undefined`) returns `staging` unchanged (same reference).
 * `archive` with `adjacentToCritical: true` sets records-analysis to adjacent on both axes.
 * A false flag, a missing room, or any other room does not insert a key and does not write `remote`.
 * Unrelated saved staging entries are kept. The result is sanitized with `parseDepartmentLocalStaging`.
 */
export function projectFacilityLayoutRoomsOntoDepartmentLocalStaging(
  layout: FacilityLayoutSnapshot | undefined,
  staging: DepartmentLocalStaging | undefined
): DepartmentLocalStaging | undefined {
  if (layout === undefined) return staging

  const draft: Record<string, unknown> = staging === undefined ? {} : { ...staging }
  const authoredRoom = layout.rooms.find((room) => room.roomId === LAYOUT_STAGING_ROOM_ID)
  if (authoredRoom?.adjacentToCritical === true) {
    draft[LAYOUT_STAGING_DEPARTMENT_ID] = {
      inputStaging: 'adjacent',
      outputStaging: 'adjacent',
    }
  }
  return parseDepartmentLocalStaging(draft)
}
