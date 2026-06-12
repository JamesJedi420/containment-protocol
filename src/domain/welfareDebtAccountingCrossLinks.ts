/**
 * SPE-1888 slice 7: welfare-debt ledger cross-link compose.
 *
 * Pure deterministic linkage from persisted welfare-debt records to integrated
 * health bundles, coercive protocol records, and opaque review-owner refs —
 * no SPE-1047 / SPE-1131 matrix projections.
 */

import {
  validateCoerciveProtocolRecord,
  type CoerciveProtocolRecord,
  type CoerciveProtocolRecordsMap,
} from './coerciveContainedPersonProtocolRegistry'
import { COERCIVE_PROCEDURE_ANCHORS } from './coerciveProcedureRegistry'
import {
  validateContainedPersonIntegratedHealthBundle,
  type ContainedPersonIntegratedHealthBundle,
  type ContainedPersonIntegratedHealthBundleRecordsMap,
} from './containedPersonIntegratedHealthBundleRegistry'
import {
  validateWelfareDebtAccountingRecord,
  type WelfareDebtAccountingRecord,
  type WelfareDebtAccountingRecordsMap,
} from './welfareDebtAccountingRegistry'

export const WELFARE_DEBT_RECORD_ID_PREFIX = 'welfare-debt:'

export type WelfareDebtIntegratedHealthMatchKind = 'subject_ref'
export type WelfareDebtCoerciveProtocolMatchKind = 'subject_ref' | 'procedure_ref'
export type WelfareDebtAccountabilityLinkKind = 'review_owner' | 'mitigation_path'

export interface WelfareDebtIntegratedHealthCrossLink {
  readonly debtRef: string
  readonly integratedHealthBundleId: string
  readonly subjectRef: string
  readonly matchKind: WelfareDebtIntegratedHealthMatchKind
}

export interface WelfareDebtCoerciveProtocolCrossLink {
  readonly debtRef: string
  readonly coerciveProtocolId: string
  readonly subjectRef: string
  readonly matchKind: WelfareDebtCoerciveProtocolMatchKind
}

export interface WelfareDebtAccountabilityLinkRef {
  readonly kind: WelfareDebtAccountabilityLinkKind
  readonly wiredRef: string
  readonly label: string
}

export interface WelfareDebtAccountingCrossLinkSummary {
  readonly debtRef: string
  readonly subjectRef: string
  readonly integratedHealthLinks: readonly WelfareDebtIntegratedHealthCrossLink[]
  readonly coerciveProtocolLinks: readonly WelfareDebtCoerciveProtocolCrossLink[]
  readonly accountabilityLinkRefs: readonly WelfareDebtAccountabilityLinkRef[]
}

export interface ComposeAllWelfareDebtAccountingCrossLinksInput {
  readonly records: WelfareDebtAccountingRecordsMap | null | undefined
  readonly bundles?: ContainedPersonIntegratedHealthBundleRecordsMap | null | undefined
  readonly coerciveProtocolRecords?: CoerciveProtocolRecordsMap | null | undefined
}

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function slugifyLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildReviewOwnerWiredRef(label: string): string {
  return `review-owner:${slugifyLabel(label)}`
}

function buildMitigationPathWiredRef(label: string): string {
  return `mitigation-path:${slugifyLabel(label)}`
}

/** Match longest coercive procedure anchor prefix on a creation-tick execution key. */
export function resolveProcedureRefFromWelfareDebtRecordId(
  recordId: string
): string | undefined {
  const token = normalizeToken(recordId)
  if (!token.startsWith(WELFARE_DEBT_RECORD_ID_PREFIX)) {
    return undefined
  }

  const executionKey = token.slice(WELFARE_DEBT_RECORD_ID_PREFIX.length)
  if (!executionKey) {
    return undefined
  }

  let matchedProcedureRef: string | undefined

  for (const anchor of COERCIVE_PROCEDURE_ANCHORS) {
    const prefix = `${anchor.procedureRef}:`
    if (executionKey.startsWith(prefix)) {
      if (!matchedProcedureRef || anchor.procedureRef.length > matchedProcedureRef.length) {
        matchedProcedureRef = anchor.procedureRef
      }
    }
  }

  return matchedProcedureRef
}

export function resolveSubjectRefFromWelfareDebtRecordId(
  recordId: string,
  procedureRef: string | undefined
): string | undefined {
  const token = normalizeToken(recordId)
  if (!token.startsWith(WELFARE_DEBT_RECORD_ID_PREFIX) || !procedureRef) {
    return undefined
  }

  const executionKey = token.slice(WELFARE_DEBT_RECORD_ID_PREFIX.length)
  const prefix = `${procedureRef}:`
  if (!executionKey.startsWith(prefix)) {
    return undefined
  }

  const subjectRef = normalizeToken(executionKey.slice(prefix.length))
  return subjectRef || undefined
}

function deriveAccountabilityLinkRefs(
  record: WelfareDebtAccountingRecord
): readonly WelfareDebtAccountabilityLinkRef[] {
  const refs: WelfareDebtAccountabilityLinkRef[] = []

  const reviewOwnerLabel = normalizeToken(record.reviewOwnerLabel)
  if (reviewOwnerLabel) {
    refs.push(
      Object.freeze({
        kind: 'review_owner',
        wiredRef: buildReviewOwnerWiredRef(reviewOwnerLabel),
        label: reviewOwnerLabel,
      })
    )
  }

  const mitigationPathLabel = normalizeToken(record.mitigationPathLabel ?? '')
  if (mitigationPathLabel) {
    refs.push(
      Object.freeze({
        kind: 'mitigation_path',
        wiredRef: buildMitigationPathWiredRef(mitigationPathLabel),
        label: mitigationPathLabel,
      })
    )
  }

  return Object.freeze(
    refs.sort((left, right) => {
      const byKind = left.kind.localeCompare(right.kind)
      if (byKind !== 0) {
        return byKind
      }

      return left.wiredRef.localeCompare(right.wiredRef)
    })
  )
}

function listHydratedCoerciveProtocolRecordsForSubject(
  protocols: CoerciveProtocolRecordsMap | undefined,
  subjectRef: string
): CoerciveProtocolRecord[] {
  const normalizedSubjectRef = normalizeToken(subjectRef)
  if (!normalizedSubjectRef) {
    return []
  }

  return Object.values(protocols ?? {})
    .filter(
      (record) =>
        normalizeToken(record.subjectRef) === normalizedSubjectRef &&
        validateCoerciveProtocolRecord(record).valid
    )
    .sort((left, right) => left.id.localeCompare(right.id))
}

function resolveHydratedBundleForSubject(
  bundles: ContainedPersonIntegratedHealthBundleRecordsMap | undefined,
  subjectRef: string
): ContainedPersonIntegratedHealthBundle | null {
  const normalizedSubjectRef = normalizeToken(subjectRef)
  if (!normalizedSubjectRef) {
    return null
  }

  const bundle = bundles?.[normalizedSubjectRef]
  if (!bundle || !validateContainedPersonIntegratedHealthBundle(bundle).valid) {
    return null
  }

  return bundle
}

function buildIntegratedHealthLinks(
  debtRef: string,
  subjectRef: string,
  bundle: ContainedPersonIntegratedHealthBundle | null
): readonly WelfareDebtIntegratedHealthCrossLink[] {
  if (!bundle) {
    return Object.freeze([])
  }

  return Object.freeze([
    Object.freeze({
      debtRef,
      integratedHealthBundleId: bundle.id,
      subjectRef,
      matchKind: 'subject_ref' as const,
    }),
  ])
}

function buildCoerciveProtocolLinks(
  debtRef: string,
  subjectRef: string,
  procedureRef: string | undefined,
  protocols: CoerciveProtocolRecordsMap | undefined
): readonly WelfareDebtCoerciveProtocolCrossLink[] {
  const candidates = listHydratedCoerciveProtocolRecordsForSubject(protocols, subjectRef)
  if (candidates.length === 0) {
    return Object.freeze([])
  }

  const normalizedProcedureRef = normalizeToken(procedureRef ?? '')
  let matches = candidates

  if (normalizedProcedureRef) {
    const procedureMatches = candidates.filter(
      (record) => normalizeToken(record.procedureRef ?? '') === normalizedProcedureRef
    )
    if (procedureMatches.length > 0) {
      matches = procedureMatches
    }
  }

  return Object.freeze(
    matches
      .map((record) =>
        Object.freeze({
          debtRef,
          coerciveProtocolId: record.id,
          subjectRef,
          matchKind:
            normalizedProcedureRef &&
            normalizeToken(record.procedureRef ?? '') === normalizedProcedureRef
              ? ('procedure_ref' as const)
              : ('subject_ref' as const),
        })
      )
      .sort((left, right) => left.coerciveProtocolId.localeCompare(right.coerciveProtocolId))
  )
}

export function composeWelfareDebtAccountingCrossLinksForRecord(
  record: WelfareDebtAccountingRecord,
  input?: {
    readonly bundles?: ContainedPersonIntegratedHealthBundleRecordsMap | null | undefined
    readonly coerciveProtocolRecords?: CoerciveProtocolRecordsMap | null | undefined
  }
): WelfareDebtAccountingCrossLinkSummary | null {
  if (!validateWelfareDebtAccountingRecord(record).valid) {
    return null
  }

  const debtRef = normalizeToken(record.id)
  const subjectRef = normalizeToken(record.subjectRef)
  if (!debtRef || !subjectRef) {
    return null
  }

  const procedureRef = resolveProcedureRefFromWelfareDebtRecordId(debtRef)
  const bundle = resolveHydratedBundleForSubject(input?.bundles ?? undefined, subjectRef)

  return Object.freeze({
    debtRef,
    subjectRef,
    integratedHealthLinks: buildIntegratedHealthLinks(debtRef, subjectRef, bundle),
    coerciveProtocolLinks: buildCoerciveProtocolLinks(
      debtRef,
      subjectRef,
      procedureRef,
      input?.coerciveProtocolRecords ?? undefined
    ),
    accountabilityLinkRefs: deriveAccountabilityLinkRefs(record),
  })
}

export function composeAllWelfareDebtAccountingCrossLinks(
  input: ComposeAllWelfareDebtAccountingCrossLinksInput
): readonly WelfareDebtAccountingCrossLinkSummary[] {
  const safeRecords = input.records ?? {}
  const recordIds = Object.keys(safeRecords).sort((left, right) => left.localeCompare(right))

  if (recordIds.length === 0) {
    return Object.freeze([])
  }

  const summaries: WelfareDebtAccountingCrossLinkSummary[] = []

  for (const recordId of recordIds) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const summary = composeWelfareDebtAccountingCrossLinksForRecord(record, {
      bundles: input.bundles,
      coerciveProtocolRecords: input.coerciveProtocolRecords,
    })
    if (summary) {
      summaries.push(summary)
    }
  }

  return Object.freeze(summaries)
}

export function formatWelfareDebtAccountingCrossLinkLabels(
  summary: WelfareDebtAccountingCrossLinkSummary
): readonly string[] {
  const labels: string[] = []

  for (const link of summary.integratedHealthLinks) {
    labels.push(`integrated-health:${link.integratedHealthBundleId}`)
  }

  for (const link of summary.coerciveProtocolLinks) {
    labels.push(`coercive-protocol:${link.coerciveProtocolId}`)
  }

  for (const ref of summary.accountabilityLinkRefs) {
    labels.push(`${ref.kind}:${ref.wiredRef}`)
  }

  return Object.freeze([...labels].sort((left, right) => left.localeCompare(right)))
}

export function formatWelfareDebtAccountingCrossLinkAuditLine(
  summary: WelfareDebtAccountingCrossLinkSummary
): string {
  const labels = formatWelfareDebtAccountingCrossLinkLabels(summary)
  const linkText = labels.length > 0 ? labels.join('; ') : 'none'
  return `Cross-links (${summary.debtRef}): ${linkText}`
}
