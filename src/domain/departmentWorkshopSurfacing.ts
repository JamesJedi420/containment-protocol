/**
 * SPE-2773 / SPE-1028: read-only labels and snapshot-derived blockers for the
 * player-facing department workshop surface. No grading, week-close, or live
 * facility/staff projection.
 */

import type {
  DepartmentWorkshopCompletionQuality,
  DepartmentWorkshopCompletionSafety,
  DepartmentWorkshopQualityReason,
  DepartmentWorkshopSafetyReason,
  DepartmentWorkshopSnapshot,
} from './departmentWorkshopQueue'
import type { DepartmentTaskType } from './departmentCapabilities'

export type DepartmentWorkshopLane = 'active' | 'queued' | 'paused'

export type DepartmentWorkshopBlockerCode =
  | 'zero_slot_capacity'
  | 'slots_full'
  | 'waiting_resume_slot'

function titleCaseParts(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

export function formatDepartmentWorkshopLaneLabel(lane: DepartmentWorkshopLane): string {
  switch (lane) {
    case 'active':
      return 'Active'
    case 'queued':
      return 'Queued'
    case 'paused':
      return 'Paused'
    default: {
      const unreachable: never = lane
      return unreachable
    }
  }
}

export function formatDepartmentWorkshopTaskTypeLabel(taskType: DepartmentTaskType | string): string {
  return titleCaseParts(taskType)
}

export function formatDepartmentWorkshopQualityLabel(
  quality: DepartmentWorkshopCompletionQuality
): string {
  switch (quality) {
    case 'nominal':
      return 'Nominal'
    case 'degraded':
      return 'Degraded'
    default: {
      const unreachable: never = quality
      return unreachable
    }
  }
}

export function formatDepartmentWorkshopSafetyLabel(
  safety: DepartmentWorkshopCompletionSafety
): string {
  switch (safety) {
    case 'safe':
      return 'Safe'
    case 'unsafe':
      return 'Unsafe'
    default: {
      const unreachable: never = safety
      return unreachable
    }
  }
}

export function formatDepartmentWorkshopQualityReasonLabel(
  reason: DepartmentWorkshopQualityReason
): string {
  switch (reason) {
    case 'poor_input_quality':
      return 'Poor input quality'
    case 'poor_specialist_condition':
      return 'Poor specialist condition'
    case 'poor_room_contamination':
      return 'Poor room contamination'
    case 'poor_dependency_condition':
      return 'Poor dependency condition'
    case 'poor_equipment_condition':
      return 'Poor equipment condition'
    case 'poor_reagent_grade':
      return 'Poor reagent grade'
    default: {
      const unreachable: never = reason
      return unreachable
    }
  }
}

export function formatDepartmentWorkshopSafetyReasonLabel(
  reason: DepartmentWorkshopSafetyReason
): string {
  switch (reason) {
    case 'inadequate_isolation':
      return 'Inadequate isolation'
    case 'inadequate_ventilation':
      return 'Inadequate ventilation'
    case 'inadequate_ppe':
      return 'Inadequate PPE'
    case 'missing_dual_auth':
      return 'Missing dual authorization'
    default: {
      const unreachable: never = reason
      return unreachable
    }
  }
}

export function formatDepartmentWorkshopBlockerLabel(code: DepartmentWorkshopBlockerCode): string {
  switch (code) {
    case 'zero_slot_capacity':
      return 'Zero slot capacity'
    case 'slots_full':
      return 'Slots full'
    case 'waiting_resume_slot':
      return 'Waiting for resume slot'
    default: {
      const unreachable: never = code
      return unreachable
    }
  }
}

/** Free active slots from durable snapshot capacity and occupancy only. */
export function countDepartmentWorkshopFreeSlots(snapshot: DepartmentWorkshopSnapshot): number {
  return Math.max(0, snapshot.slotCapacity - snapshot.active.length)
}

/**
 * Deterministic blockers from durable snapshot membership + capacity only.
 * Does not inspect facility, staff, or live quality/safety inputs.
 */
export function resolveDepartmentWorkshopBlockers(
  snapshot: DepartmentWorkshopSnapshot
): readonly DepartmentWorkshopBlockerCode[] {
  const blockers: DepartmentWorkshopBlockerCode[] = []
  const waitingCount = snapshot.queued.length + snapshot.paused.length
  const freeSlots = countDepartmentWorkshopFreeSlots(snapshot)

  if (snapshot.slotCapacity === 0 && waitingCount > 0) {
    blockers.push('zero_slot_capacity')
  }

  if (snapshot.slotCapacity > 0 && freeSlots === 0 && snapshot.queued.length > 0) {
    blockers.push('slots_full')
  }

  if (snapshot.paused.length > 0 && freeSlots === 0) {
    blockers.push('waiting_resume_slot')
  }

  return Object.freeze(blockers)
}
