import {
  validateReadinessCompositionRecord,
  type ReadinessCompositionInputClass,
  type ReadinessCompositionRecord,
} from '../../domain/deployableReadiness'
import {
  createOperationalExplanationRecord,
  type OperationalExplanationRecord,
  type OperationalExplanationSeverity,
} from '../../domain/operationalExplanation'

function toSeverity(record: ReadinessCompositionRecord): OperationalExplanationSeverity {
  if (record.readinessBand === 'ready') return 'routine'
  if (record.readinessBand === 'blocked') return 'blocked'
  return 'degraded'
}

function missingBlocker(input: ReadinessCompositionInputClass): string {
  return `deployable_readiness.missing_${input}`
}

function getBlockerCodes(record: ReadinessCompositionRecord): readonly string[] {
  const blockers = record.missingInputs.map(missingBlocker)
  if (record.certificationState === 'not_started') {
    blockers.push('deployable_readiness.certification_not_started')
  }
  if (record.certificationState === 'expired') {
    blockers.push('deployable_readiness.certification_expired')
  }
  if (record.certificationState === 'revoked') {
    blockers.push('deployable_readiness.certification_revoked')
  }
  if (record.conditionBand === 'unavailable') {
    blockers.push('deployable_readiness.condition_unavailable')
  }
  return blockers
}

function getCorrectionCondition(record: ReadinessCompositionRecord): string | undefined {
  if (record.missingInputs.length > 0) {
    return `Supply the missing ${record.missingInputs.join(', ')} input${record.missingInputs.length === 1 ? '' : 's'}.`
  }
  if (record.certificationState === 'not_started') return 'Begin and complete the required certification.'
  if (record.certificationState === 'in_progress') return 'Complete the certification process.'
  if (record.certificationState === 'eligible_review') return 'Complete certification review.'
  if (record.certificationState === 'expired') return 'Renew the expired certification.'
  if (record.certificationState === 'revoked') return 'Resolve the revoked certification outside this adapter.'
  if (record.conditionBand === 'unavailable') return 'Restore operative availability.'
  if (record.conditionBand === 'critical' || record.conditionBand === 'strained') {
    return 'Improve the authoritative operative condition.'
  }
  return undefined
}

export function getDeployableReadinessOperationalExplanation(
  record: ReadinessCompositionRecord
): OperationalExplanationRecord {
  const validation = validateReadinessCompositionRecord(record)
  if (!validation.valid) {
    throw new Error(`Invalid readiness composition record: ${validation.issues.join(', ')}`)
  }

  const blockerCodes = getBlockerCodes(record)
  return createOperationalExplanationRecord({
    source: {
      system: 'deployable_readiness',
      recordType: 'readiness_composition',
      recordId: record.deployableId,
    },
    subjectId: record.deployableId,
    reasonCode: `deployable_readiness.${record.readinessBand}`,
    severity: toSeverity(record),
    lifecycle: 'active',
    summary: `Deployable readiness is ${record.readinessBand}.`,
    cause:
      blockerCodes.length > 0
        ? `Authoritative readiness inputs report: ${blockerCodes.join(', ')}.`
        : `The validated readiness composition resolves ${record.readinessBand}.`,
    currentEffect: `Field reliability is ${record.fieldReliabilityScore}/100; this does not determine mission suitability.`,
    correctionCondition: getCorrectionCondition(record),
    confidence: 'confirmed',
    provenance: [
      `readiness_composition:${record.deployableId}`,
      `certification:${record.certificationState ?? 'missing'}`,
      `condition:${record.conditionBand ?? 'missing'}`,
      `gear:${record.gearTier ?? 'missing'}`,
    ],
    blockerCodes,
  })
}
