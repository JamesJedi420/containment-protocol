import { BIOHAZARD_RESPONSE_FACILITY_ID } from './departmentWorkshopFacilityMapping'
import type { DepartmentWorkshopConditionLevel } from './departmentWorkshopQueue'
import type { GameState } from './models'

export interface DepartmentWorkshopRoomQualityFacilityMapping {
  readonly departmentId: string
  readonly facilityId: string
}

/**
 * Authored production department → facility binding for the room-contamination
 * completion-quality axis. Unmapped departments remain caller-owned.
 */
export const DEFAULT_DEPARTMENT_WORKSHOP_ROOM_QUALITY_MAPPINGS: readonly DepartmentWorkshopRoomQualityFacilityMapping[] =
  Object.freeze([
    Object.freeze({
      departmentId: 'department:biohazard-response',
      facilityId: BIOHAZARD_RESPONSE_FACILITY_ID,
    }),
  ])

/**
 * Derives the authoritative room-contamination condition for one mapped
 * department. Active resolves good; absent or non-active resolves poor.
 * Unmapped departments return undefined so existing caller-owned quality
 * behavior remains unchanged.
 */
export function deriveDepartmentWorkshopRoomContaminationFromFacilities(
  source: GameState,
  departmentId: string,
  mappings: readonly DepartmentWorkshopRoomQualityFacilityMapping[] =
    DEFAULT_DEPARTMENT_WORKSHOP_ROOM_QUALITY_MAPPINGS
): DepartmentWorkshopConditionLevel | undefined {
  if (typeof departmentId !== 'string' || departmentId.length === 0 || !Array.isArray(mappings)) {
    return undefined
  }

  const mapping = mappings.find((candidate) => candidate.departmentId === departmentId)
  if (!mapping) {
    return undefined
  }

  const facility = source.facilityState?.facilities?.[mapping.facilityId]
  return facility?.status === 'active' ? 'good' : 'poor'
}
