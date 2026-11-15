import type { MaintenanceConversionResult } from './facilityMaintenanceConversion'
import type { DepartmentWorkshopCompletionOutcome } from './departmentWorkshopQueue'
import { createOperationalExplanationRecord } from './operationalExplanation'

/** Presentation semantics derived only from the selected owners' evidence. */
export function projectActionAcknowledgement(
  evidence:
    | { kind: 'maintenance'; result: MaintenanceConversionResult; id: string }
    | { kind: 'workshop'; id: string; receipt?: DepartmentWorkshopCompletionOutcome }
) {
  const status =
    evidence.kind === 'maintenance'
      ? evidence.result.status === 'applied'
        ? 'applied'
        : evidence.result.status === 'no_op'
          ? 'no_op'
          : 'blocked'
      : !evidence.receipt || evidence.receipt.workOrderId !== evidence.id
        ? 'pending'
        : evidence.receipt.quality === 'degraded'
          ? 'degraded'
          : 'completed'
  return createOperationalExplanationRecord({
    source:
      evidence.kind === 'maintenance'
        ? { system: 'maintenance_conversion', recordType: 'conversion', recordId: evidence.id }
        : { system: 'department_workshop', recordType: 'work_order', recordId: evidence.id },
    subjectId: evidence.id,
    reasonCode: 'acknowledgement.result',
    severity:
      status === 'pending'
        ? 'pending'
        : status === 'blocked'
          ? 'blocked'
          : status === 'degraded'
            ? 'degraded'
            : 'routine',
    lifecycle: status === 'pending' ? 'active' : 'resolved',
    summary: status,
    cause: 'Reported by the owning system.',
    currentEffect: status,
    confidence: 'confirmed',
  })
}
