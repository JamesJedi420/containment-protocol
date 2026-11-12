/**
 * SPE-1046: effective file access for a concrete site/facility. Pure helper;
 * composes existing status-class file permissions and site/facility clearance.
 */

import type { AffiliationSiteClearanceDecision } from './affiliationSiteClearance'
import type {
  EntityWelfarePermissionDecision,
  EntityWelfarePermissionOutcome,
} from './entityWelfareStatusPermissions'

export interface AffiliationFacilityFileAccessInput {
  readonly subjectId?: string
  readonly subjectLabel?: string
  readonly filePermissionDecision?: EntityWelfarePermissionDecision
  readonly siteClearanceDecision?: AffiliationSiteClearanceDecision
}

export interface AffiliationFacilityFileAccessDecision {
  readonly subjectId: string
  readonly subjectLabel: string
  readonly outcome: EntityWelfarePermissionOutcome
  readonly outcomeLabel: string
  readonly decisionLabel: string
  readonly siteId: string
  readonly siteLabel: string
  readonly facilityId: string
  readonly facilityLabel: string
  readonly siteSpecific: boolean
  readonly reasonCodes: readonly string[]
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function formatEnumLabel(value: string) {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? `${part[0]?.toUpperCase()}${part.slice(1)}` : part))
    .join(' ')
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  )
}

function maxOutcome(
  left: EntityWelfarePermissionOutcome,
  right: EntityWelfarePermissionOutcome
): EntityWelfarePermissionOutcome {
  if (left === 'blocked' || right === 'blocked') return 'blocked'
  if (left === 'restricted' || right === 'restricted') return 'restricted'
  return 'allowed'
}

export function evaluateAffiliationFacilityFileAccess(
  input: AffiliationFacilityFileAccessInput
): AffiliationFacilityFileAccessDecision {
  const permission = input.filePermissionDecision
  const clearance = input.siteClearanceDecision
  const subjectId =
    normalizeToken(input.subjectId) ||
    normalizeToken(permission?.recordId) ||
    normalizeToken(clearance?.subjectId) ||
    'subject:unknown'
  const subjectLabel =
    normalizeToken(input.subjectLabel) ||
    normalizeToken(permission?.recordLabel) ||
    normalizeToken(clearance?.subjectLabel) ||
    subjectId
  const permissionOutcome = permission?.outcome ?? 'restricted'
  const clearanceOutcome = clearance?.outcome ?? 'restricted'
  const outcome = maxOutcome(permissionOutcome, clearanceOutcome)
  const siteId = clearance?.siteId ?? 'site:unknown'
  const siteLabel = clearance?.siteLabel ?? siteId
  const facilityId = clearance?.facilityId ?? 'facility:unknown'
  const facilityLabel = clearance?.facilityLabel ?? facilityId
  const siteSpecific = clearance?.siteSpecific ?? false
  const reasonCodes = uniqueSorted([
    ...(permission?.reasonCodes ?? ['missing_file_permission_decision']),
    ...(clearance?.reasonCodes ?? ['missing_site_clearance_decision']),
    `file_permission_${permissionOutcome}`,
    `site_clearance_${clearanceOutcome}`,
  ])

  return Object.freeze({
    subjectId,
    subjectLabel,
    outcome,
    outcomeLabel: formatEnumLabel(outcome),
    decisionLabel: `Facility file access: ${formatEnumLabel(outcome)}`,
    siteId,
    siteLabel,
    facilityId,
    facilityLabel,
    siteSpecific,
    reasonCodes: Object.freeze(reasonCodes),
  })
}
