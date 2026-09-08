/**
 * SPE-877 week-close last-inspection auto-advance for frozen blast-door integrity.
 */

import type { GameState } from './models'
import { getEquipmentDefinition } from './equipment'
import {
  parseContainmentClassIntegrity,
  resolveContainmentClassWeekCloseInspection,
  snapshotContainmentClassIntegrity,
  type ContainmentDeficiency,
} from './containmentClassInspection'
import {
  applyEquipmentInstanceTransition,
  persistContainmentBarrierCoupling,
} from './equipmentInstance'
import { ensureNormalizedGameState } from './teamSimulation'
import {
  createContainmentClassDeficiencyRecordedDraft,
  createContainmentClassInspectedDraft,
  type AnyOperationEventDraft,
} from './events/eventBus'

export interface ContainmentClassWeekCloseResult {
  state: GameState
  eventDrafts: AnyOperationEventDraft[]
}

function compensatingControlIdFor(
  deficiency: Exclude<ContainmentDeficiency, { kind: 'none' }>
): 'secondary_interlock_watch' | undefined {
  return deficiency.kind === 'compensating_continue' ? deficiency.compensatingControlId : undefined
}

export function advanceContainmentClassInspectionsAtWeekClose(
  state: GameState,
  closedWeek: number = state.week
): ContainmentClassWeekCloseResult {
  // Callers in `advanceWeek` must pass `sourceState.week`: `advanceQueues` runs after
  // `settleWeekState` has already incremented `state.week`.
  const normalized = ensureNormalizedGameState(state)
  const registry = normalized.equipmentInstances
  if (!registry) {
    return { state: normalized, eventDrafts: [] }
  }

  let nextState = normalized
  const eventDrafts: AnyOperationEventDraft[] = []
  let changed = false

  for (const instanceId of Object.keys(registry).sort()) {
    const current = nextState.equipmentInstances?.[instanceId]
    if (!current?.containmentIntegrity) continue
    const parsed = parseContainmentClassIntegrity(current.containmentIntegrity)
    if (!parsed.ok) continue

    const resolved = resolveContainmentClassWeekCloseInspection({
      classId: parsed.integrity.classId,
      lastInspectionWeek: parsed.integrity.lastInspectionWeek,
      currentWeek: closedWeek,
      cycleCount: parsed.integrity.cycleCount,
      existingDeficiency: parsed.integrity.deficiency,
    })
    if (!resolved.ok || resolved.action === 'noop') continue

    const definition = getEquipmentDefinition(current.definitionId)
    if (!definition) continue

    const nextIntegrity = snapshotContainmentClassIntegrity({
      ...parsed.integrity,
      lastInspectionWeek: resolved.lastInspectionWeek,
      deficiency: resolved.deficiency,
    })
    const transitioned = applyEquipmentInstanceTransition(
      nextState,
      instanceId,
      current,
      {
        ...current,
        containmentIntegrity: nextIntegrity,
      },
      { allowNonIdleCarrier: true }
    )
    if (!transitioned.ok) continue

    nextState = persistContainmentBarrierCoupling(
      transitioned.state,
      instanceId,
      resolved.deficiency
    )
    changed = true

    const compensatingControlId = compensatingControlIdFor(resolved.deficiency)
    eventDrafts.push(
      createContainmentClassInspectedDraft({
        week: closedWeek,
        instanceId,
        definitionId: current.definitionId,
        definitionName: definition.name,
        classId: 'blast_door',
        status: resolved.status,
        previousLastInspectionWeek: resolved.previousLastInspectionWeek,
        lastInspectionWeek: resolved.lastInspectionWeek,
        intervalWeeks: resolved.intervalWeeks,
        weeksSinceInspection: resolved.weeksSinceInspection,
        deficiencyKind: resolved.deficiency.kind,
        ...(compensatingControlId ? { compensatingControlId } : {}),
        inService: resolved.inService,
        reason: 'week_close_auto_advance',
      })
    )
    if (resolved.deficiencyChanged) {
      eventDrafts.push(
        createContainmentClassDeficiencyRecordedDraft({
          week: closedWeek,
          instanceId,
          definitionId: current.definitionId,
          definitionName: definition.name,
          classId: 'blast_door',
          status: resolved.status,
          intervalWeeks: resolved.intervalWeeks,
          weeksSinceInspection: resolved.weeksSinceInspection,
          deficiencyKind: resolved.deficiency.kind,
          ...(compensatingControlId ? { compensatingControlId } : {}),
          inService: resolved.inService,
          reason: 'inspection_cadence_deficiency',
        })
      )
    }
  }

  return { state: changed ? nextState : normalized, eventDrafts }
}
