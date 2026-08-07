import { deriveDepartmentWorkshopRoomContaminationFromFacilities } from '../../domain/departmentWorkshopFacilityQualityMapping'
import {
  readDepartmentWorkshopState,
  sanitizeDepartmentWorkshopCompletionOutcomes,
} from '../../domain/departmentWorkshopQueue'
import type { GameState } from '../../domain/models'
import {
  createOperationalExplanationRecord,
  sortOperationalExplanationRecords,
  type OperationalExplanationRecord,
} from '../../domain/operationalExplanation'

const ROOM_REASON = 'department_workshop.poor_room_contamination'

function listOngoingWorkOrderIds(game: GameState): readonly string[] {
  const { snapshots } = readDepartmentWorkshopState(game)
  const ids = new Set<string>()
  for (const snapshot of Object.values(snapshots)) {
    for (const item of [...snapshot.active, ...snapshot.queued, ...snapshot.paused]) {
      ids.add(item.workOrderId)
    }
  }
  return Object.freeze([...ids].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)))
}

export function getDepartmentWorkshopOperationalExplanations(
  game: GameState
): readonly OperationalExplanationRecord[] {
  const { workOrders } = readDepartmentWorkshopState(game)
  const outcomes = sanitizeDepartmentWorkshopCompletionOutcomes(
    game.departmentWorkshopCompletionOutcomes
  )
  const records: OperationalExplanationRecord[] = []

  for (const workOrderId of listOngoingWorkOrderIds(game)) {
    const workOrder = workOrders[workOrderId]
    if (!workOrder) continue

    const roomCondition = deriveDepartmentWorkshopRoomContaminationFromFacilities(
      game,
      workOrder.departmentId
    )
    if (roomCondition !== 'poor') continue

    records.push(
      createOperationalExplanationRecord({
        source: {
          system: 'department_workshop',
          recordType: 'work_order',
          recordId: workOrderId,
        },
        subjectId: workOrderId,
        reasonCode: ROOM_REASON,
        severity: 'degraded',
        lifecycle: 'active',
        summary: 'Room contamination conditions are poor.',
        cause: `The authored facility supporting ${workOrder.departmentId} is absent or not active.`,
        currentEffect: 'Completion quality is at risk of degradation while this condition persists.',
        projectedConsequence:
          'Completion may register degraded quality with poor room contamination taking its established precedence.',
        correctionCondition: 'Restore the mapped workshop facility to active status.',
        confidence: 'confirmed',
        provenance: [
          `department:${workOrder.departmentId}`,
          `work_order:${workOrderId}`,
          'facility_state',
        ],
        blockerCodes: [ROOM_REASON],
      })
    )
  }

  for (const outcome of Object.values(outcomes)) {
    if (outcome.qualityReason !== 'poor_room_contamination') continue
    records.push(
      createOperationalExplanationRecord({
        source: {
          system: 'department_workshop',
          recordType: 'completion_outcome',
          recordId: outcome.workOrderId,
        },
        subjectId: outcome.workOrderId,
        reasonCode: ROOM_REASON,
        severity: 'degraded',
        lifecycle: 'resolved',
        summary: 'Completion quality was degraded by poor room contamination.',
        cause: `The recorded completion receipt for ${outcome.departmentId} identifies poor room contamination.`,
        currentEffect: 'The durable completion outcome records degraded quality.',
        projectedConsequence: 'The recorded outcome remains authoritative across reload and replay.',
        confidence: 'confirmed',
        provenance: [
          `completion_outcome:${outcome.workOrderId}`,
          `department:${outcome.departmentId}`,
        ],
        blockerCodes: [ROOM_REASON],
      })
    )
  }

  return sortOperationalExplanationRecords(records)
}
