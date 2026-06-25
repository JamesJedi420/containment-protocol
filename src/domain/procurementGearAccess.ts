import {
  evaluateEntityWelfareStatusPermission,
  type EntityWelfarePermissionDecision,
} from './entityWelfareStatusPermissions'
import type { EntityWelfareReclassificationRecordsMap } from './entityWelfareReclassificationRegistry'
import type { ProcurementAcquisitionClass } from './market'

export interface ProcurementGearAccessAssessment {
  readonly available: boolean
  readonly details: readonly string[]
  readonly blockedReason?: string
  readonly permissionDecisions: readonly EntityWelfarePermissionDecision[]
}

export interface ProcurementGearAccessInput {
  readonly listingId: string
  readonly itemName: string
  readonly acquisitionClass: ProcurementAcquisitionClass
  readonly entityWelfareReclassificationRecords?: EntityWelfareReclassificationRecordsMap | null
}

function collectGearPermissionDecisions(
  records: EntityWelfareReclassificationRecordsMap | null | undefined
) {
  return Object.keys(records ?? {})
    .sort((left, right) => left.localeCompare(right))
    .map((recordId) => records?.[recordId])
    .filter((record): record is NonNullable<typeof record> => record !== undefined)
    .map((record) => evaluateEntityWelfareStatusPermission(record, 'gear'))
}

function summarizeDecision(decision: EntityWelfarePermissionDecision) {
  const reasonSuffix =
    decision.reasonCodes.length > 0 ? ` (${decision.reasonCodes.join(', ')})` : ''

  return `${decision.recordLabel}: ${decision.outcomeLabel} gear permission${reasonSuffix}.`
}

export function assessProcurementGearAccess(
  input: ProcurementGearAccessInput
): ProcurementGearAccessAssessment {
  if (input.acquisitionClass === 'standard') {
    return Object.freeze({
      available: true,
      details: Object.freeze([] as string[]),
      permissionDecisions: Object.freeze([] as EntityWelfarePermissionDecision[]),
    })
  }

  const permissionDecisions = collectGearPermissionDecisions(
    input.entityWelfareReclassificationRecords
  )
  const restrictiveDecision = permissionDecisions.find(
    (decision) => decision.outcome === 'blocked' || decision.outcome === 'restricted'
  )

  if (restrictiveDecision) {
    const blockedReason = `SPE-1046 gear access blocked for ${input.itemName}: ${summarizeDecision(
      restrictiveDecision
    )}`

    return Object.freeze({
      available: false,
      details: Object.freeze([
        'SPE-1046 gear permission check applies to restricted and rare procurement lines.',
        ...permissionDecisions.map(summarizeDecision),
      ]),
      blockedReason,
      permissionDecisions: Object.freeze(permissionDecisions),
    })
  }

  return Object.freeze({
    available: true,
    details: Object.freeze([
      permissionDecisions.length > 0
        ? `SPE-1046 gear permission allowed for ${input.itemName}.`
        : `SPE-1046 gear permission has no restrictive record for ${input.itemName}.`,
      ...permissionDecisions.map(summarizeDecision),
    ]),
    permissionDecisions: Object.freeze(permissionDecisions),
  })
}
