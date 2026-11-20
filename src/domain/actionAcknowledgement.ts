import type { MaintenanceConversionResult } from './facilityMaintenanceConversion'
import type { DepartmentWorkshopCompletionOutcome } from './departmentWorkshopQueue'
import { createOperationalExplanationRecord } from './operationalExplanation'
import type { ProtectedRemoteWorkExplainability } from './protectedRemoteWorkCell'

/** Presentation semantics derived only from the selected owners' evidence. */
export function projectActionAcknowledgement(
  evidence:
    | { kind: 'maintenance'; result: MaintenanceConversionResult; id: string; superseded?: boolean }
    | { kind: 'workshop'; id: string; receipt?: DepartmentWorkshopCompletionOutcome; superseded?: boolean }
    | { kind: 'remote'; work: ProtectedRemoteWorkExplainability; superseded?: boolean }
) {
  if (evidence.superseded) {
    return createOperationalExplanationRecord({
      source:
        evidence.kind === 'maintenance'
          ? { system: 'maintenance_conversion', recordType: 'conversion', recordId: evidence.id }
          : evidence.kind === 'workshop'
            ? { system: 'department_workshop', recordType: 'work_order', recordId: evidence.id }
            : { system: 'protected_remote_work', recordType: 'remote_work', recordId: evidence.work.workId },
      subjectId: evidence.kind === 'remote' ? evidence.work.workId : evidence.id,
      reasonCode: 'acknowledgement.result',
      severity: 'routine',
      lifecycle: 'superseded',
      summary: 'superseded',
      cause: 'Reported by the owning system.',
      currentEffect: 'superseded',
      confidence: 'confirmed',
    })
  }
  if (evidence.kind === 'remote') {
    const work = evidence.work
    const terminal =
      work.outcome === 'completed' || work.outcome === 'failed' || work.outcome === 'aborted'
    return createOperationalExplanationRecord({
      source: { system: 'protected_remote_work', recordType: 'remote_work', recordId: work.workId },
      subjectId: work.workId,
      reasonCode: 'acknowledgement.result',
      severity:
        work.outcome === 'failed' || work.outcome === 'blocked'
          ? 'blocked'
          : terminal
            ? 'routine'
            : 'pending',
      lifecycle: terminal ? 'resolved' : 'active',
      summary: work.stage.replaceAll('_', ' '),
      cause: 'Reported by the owning system.',
      currentEffect: work.stage.replaceAll('_', ' '),
      confidence: 'confirmed',
    })
  }
  const status =
    evidence.kind === 'maintenance'
      ? evidence.result.status === 'applied'
        ? 'applied'
        : evidence.result.status === 'no_op'
          ? 'no_effect'
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
    currentEffect: status === 'no_effect' ? 'no effect' : status,
    confidence: 'confirmed',
  })
}
