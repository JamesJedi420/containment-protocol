/**
 * SPE-3109 — pure workshop-consume adapter over specialist labor gate.
 *
 * Maps a `SpecialistLaborGateProjection` onto the existing SPE-2768 workshop
 * specialist-condition axis (`good` | `poor`) plus a consume-allow flag.
 * Callers own other quality axes. This module does not mutate the gate,
 * operators, or workshop state; does not persist GameState; does not wire
 * week-close or `processDepartmentWorkshopTick`.
 */

import type { DepartmentWorkshopConditionLevel } from './departmentWorkshopQueue'
import {
  isSpecialistTaskGateOutcome,
  type SpecialistLaborGateProjection,
  type SpecialistTaskGateOutcome,
} from './specialistLaborRegistry'

/**
 * Immutable consume view for department-workshop callers.
 *
 * - `consumeAllowed` is false for stalled / undefined / malformed gates.
 * - `specialistCondition` is null when consume is blocked so callers do not
 *   invent a `'good'` specialist axis.
 * - When allowed, `specialistCondition` is the only axis this adapter sets.
 */
export interface SpecialistLaborWorkshopConsumeView {
  readonly consumeAllowed: boolean
  readonly specialistCondition: DepartmentWorkshopConditionLevel | null
  /** Mirrored gate outcome when the projection was well-formed; null on fail-closed. */
  readonly gateOutcome: SpecialistTaskGateOutcome | null
}

const FAIL_CLOSED: SpecialistLaborWorkshopConsumeView = Object.freeze({
  consumeAllowed: false,
  specialistCondition: null,
  gateOutcome: null,
})

/**
 * Minimal structural check: a projection must carry a known gate outcome.
 * Full field shape is owned by `projectSpecialistLaborGate`; this adapter
 * fails closed on missing or unknown outcomes rather than inventing consume.
 */
function isWellFormedGateProjection(
  value: unknown
): value is SpecialistLaborGateProjection {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const record = value as Record<string, unknown>
  return isSpecialistTaskGateOutcome(record.gateOutcome)
}

/**
 * Map a specialist labor gate projection into workshop-consume inputs.
 *
 * | gateOutcome | consumeAllowed | specialistCondition |
 * | ----------- | -------------- | ------------------- |
 * | operable    | true           | good                |
 * | degraded    | true           | poor                |
 * | stalled     | false          | null                |
 * | undefined / malformed | false | null           |
 *
 * Infrastructure-present and adjacent-rejected stalls remain blocked —
 * those cases already project as `stalled` from the registry.
 */
export function mapSpecialistLaborGateToWorkshopConsume(
  projection: SpecialistLaborGateProjection | null | undefined
): SpecialistLaborWorkshopConsumeView {
  if (!isWellFormedGateProjection(projection)) {
    return FAIL_CLOSED
  }

  const gateOutcome = projection.gateOutcome
  switch (gateOutcome) {
    case 'operable':
      return Object.freeze({
        consumeAllowed: true,
        specialistCondition: 'good' as const,
        gateOutcome: 'operable' as const,
      })
    case 'degraded':
      return Object.freeze({
        consumeAllowed: true,
        specialistCondition: 'poor' as const,
        gateOutcome: 'degraded' as const,
      })
    case 'stalled':
      return Object.freeze({
        consumeAllowed: false,
        specialistCondition: null,
        gateOutcome: 'stalled' as const,
      })
    default: {
      const _exhaustive: never = gateOutcome
      void _exhaustive
      return FAIL_CLOSED
    }
  }
}
