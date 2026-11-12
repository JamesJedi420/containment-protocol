/**
 * SPE-2910 — bounded workshop disorder projection.
 *
 * SPE-1060 owns normalized room physical condition. This adapter only maps an
 * authored facility-layout room onto one existing department workshop and
 * translates its clutter score into transient processing/quality context.
 */

import type { FacilityLayoutSnapshot, FacilityRoomId } from './facilityLayoutStrategy'
import type {
  DepartmentWorkshopDisorderContext,
  DepartmentWorkshopDisorderLevel,
} from './departmentWorkshopQueue'

export const WORKSHOP_DISORDER_CLUTTER_THRESHOLD = 0.5
export const WORKSHOP_DISORDER_SEVERE_THRESHOLD = 0.8

export interface DepartmentWorkshopDisorderMapping {
  readonly departmentId: string
  readonly roomId: FacilityRoomId
}

export const DEFAULT_DEPARTMENT_WORKSHOP_DISORDER_MAPPINGS: readonly DepartmentWorkshopDisorderMapping[] =
  Object.freeze([
    Object.freeze({
      departmentId: 'department:emergency-response',
      roomId: 'med_bay',
    }),
  ])

export interface DepartmentWorkshopDisorderProjection extends DepartmentWorkshopDisorderContext {
  readonly sourceStatus: 'available' | 'unavailable'
  readonly effect:
    'baseline' | 'ordered_room' | 'clutter_throughput_cap' | 'disorder_wrong_kit_risk'
}

const UNAVAILABLE: DepartmentWorkshopDisorderProjection = Object.freeze({
  level: 'baseline',
  sourceStatus: 'unavailable',
  effect: 'baseline',
})

function levelForClutter(clutter: number): DepartmentWorkshopDisorderLevel {
  if (clutter >= WORKSHOP_DISORDER_SEVERE_THRESHOLD) return 'disordered'
  if (clutter >= WORKSHOP_DISORDER_CLUTTER_THRESHOLD) return 'cluttered'
  return 'ordered'
}

/** Resolve one department with an inspectable baseline for absent/malformed input. */
export function projectDepartmentWorkshopDisorder(
  layout: FacilityLayoutSnapshot | undefined,
  departmentId: string,
  mappings: readonly DepartmentWorkshopDisorderMapping[] = DEFAULT_DEPARTMENT_WORKSHOP_DISORDER_MAPPINGS
): DepartmentWorkshopDisorderProjection {
  if (!Array.isArray(mappings) || typeof departmentId !== 'string' || departmentId.length === 0) {
    return UNAVAILABLE
  }
  const mapping = mappings.find((candidate) => candidate.departmentId === departmentId)
  if (!mapping) return UNAVAILABLE
  const room = layout?.rooms.find((candidate) => candidate.roomId === mapping.roomId)
  if (!room?.physicalCondition) return UNAVAILABLE

  const level = levelForClutter(room.physicalCondition.clutter)
  return Object.freeze({
    level,
    sourceStatus: 'available',
    effect:
      level === 'ordered'
        ? 'ordered_room'
        : level === 'cluttered'
          ? 'clutter_throughput_cap'
          : 'disorder_wrong_kit_risk',
  })
}

/** Project every authored mapping in stable mapping order for the week-close tick. */
export function projectDepartmentWorkshopDisorderByDepartment(
  layout: FacilityLayoutSnapshot | undefined,
  mappings: readonly DepartmentWorkshopDisorderMapping[] = DEFAULT_DEPARTMENT_WORKSHOP_DISORDER_MAPPINGS
): Readonly<Record<string, DepartmentWorkshopDisorderProjection>> {
  if (!Array.isArray(mappings)) return Object.freeze({})
  return Object.freeze(
    Object.fromEntries(
      mappings.map((mapping) => [
        mapping.departmentId,
        projectDepartmentWorkshopDisorder(layout, mapping.departmentId, mappings),
      ])
    )
  )
}
