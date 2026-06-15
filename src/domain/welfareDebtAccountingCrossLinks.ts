/**
 * SPE-1888 slice 7 + slice 9: welfare-debt ledger cross-link compose.
 *
 * Pure deterministic linkage from persisted welfare-debt records to integrated
 * health bundles, coercive protocol records, SPE-1047 faction ethics matrix
 * projections, SPE-1131 accountability matrix projections, and opaque review-owner
 * / mitigation-path wired refs when matrix maps are absent.
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
  listHydratedFactionEthicsMatrixRecordsForReviewOwnerLabel,
  listHydratedFactionEthicsMatrixRecordsForSubjectRef,
  projectFactionEthicsMatrixReview,
  slugifyReviewOwnerLabel,
  type FactionEthicsMatrixRecordsMap,
} from './factionEthicsMatrixRegistry'
import {
  listHydratedAccountabilityMatrixRecordsForMitigationPathLabel,
  listHydratedAccountabilityMatrixRecordsForSubjectRef,
  projectMoralLegalAccountabilityMatrixReview,
  slugifyMitigationPathLabel,
  type MoralLegalAccountabilityMatrixRecordsMap,
} from './moralLegalAccountabilityMatrixRegistry'
import {
  validateWelfareDebtAccountingRecord,
  type WelfareDebtAccountingRecord,
  type WelfareDebtAccountingRecordsMap,
} from './welfareDebtAccountingRegistry'

export const WELFARE_DEBT_RECORD_ID_PREFIX = 'welfare-debt:'

export type WelfareDebtIntegratedHealthMatchKind = 'subject_ref'
export type WelfareDebtCoerciveProtocolMatchKind = 'subject_ref' | 'procedure_ref'
export type WelfareDebtFactionEthicsMatchKind = 'review_owner_label' | 'subject_ref'
export type WelfareDebtAccountabilityMatrixMatchKind = 'mitigation_path_label' | 'subject_ref'
export type WelfareDebtAccountabilityLinkKind =
  | 'review_owner'
  | 'mitigation_path'
  | 'faction_ethics'
  | 'accountability_matrix'

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

export interface WelfareDebtFactionEthicsCrossLink {
  readonly debtRef: string
  readonly factionEthicsRecordId: string
  readonly wiredRef: string
  readonly subjectRef: string
  readonly matchKind: WelfareDebtFactionEthicsMatchKind
}

export interface WelfareDebtAccountabilityMatrixCrossLink {
  readonly debtRef: string
  readonly accountabilityMatrixRecordId: string
  readonly wiredRef: string
  readonly subjectRef: string
  readonly matchKind: WelfareDebtAccountabilityMatrixMatchKind
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
  readonly factionEthicsLinks: readonly WelfareDebtFactionEthicsCrossLink[]
  readonly accountabilityMatrixLinks: readonly WelfareDebtAccountabilityMatrixCrossLink[]
  readonly accountabilityLinkRefs: readonly WelfareDebtAccountabilityLinkRef[]
}

export interface ComposeAllWelfareDebtAccountingCrossLinksInput {
  readonly records: WelfareDebtAccountingRecordsMap | null | undefined
  readonly bundles?: ContainedPersonIntegratedHealthBundleRecordsMap | null | undefined
  readonly coerciveProtocolRecords?: CoerciveProtocolRecordsMap | null | undefined
  readonly factionEthicsRecords?: FactionEthicsMatrixRecordsMap | null | undefined
  readonly accountabilityMatrixRecords?: MoralLegalAccountabilityMatrixRecordsMap | null | undefined
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

function buildFactionEthicsLinks(
  debtRef: string,
  subjectRef: string,
  reviewOwnerLabel: string,
  records: FactionEthicsMatrixRecordsMap | undefined
): readonly WelfareDebtFactionEthicsCrossLink[] {
  if (!records) {
    return Object.freeze([])
  }

  const labelMatches = listHydratedFactionEthicsMatrixRecordsForReviewOwnerLabel(
    records,
    reviewOwnerLabel
  )
  let matches = labelMatches

  if (matches.length === 0) {
    matches = listHydratedFactionEthicsMatrixRecordsForSubjectRef(records, subjectRef)
  }

  return Object.freeze(
    matches.map((record) => {
      const projection = projectFactionEthicsMatrixReview(record)
      const matchKind: WelfareDebtFactionEthicsMatchKind =
        slugifyReviewOwnerLabel(record.reviewOwnerLabel) === slugifyReviewOwnerLabel(reviewOwnerLabel)
          ? 'review_owner_label'
          : 'subject_ref'

      return Object.freeze({
        debtRef,
        factionEthicsRecordId: record.id,
        wiredRef: projection.wiredRef,
        subjectRef,
        matchKind,
      })
    })
  )
}

function buildAccountabilityMatrixLinks(
  debtRef: string,
  subjectRef: string,
  mitigationPathLabel: string | undefined,
  records: MoralLegalAccountabilityMatrixRecordsMap | undefined
): readonly WelfareDebtAccountabilityMatrixCrossLink[] {
  if (!records || !mitigationPathLabel) {
    return Object.freeze([])
  }

  const labelMatches = listHydratedAccountabilityMatrixRecordsForMitigationPathLabel(
    records,
    mitigationPathLabel
  )
  let matches = labelMatches

  if (matches.length === 0) {
    matches = listHydratedAccountabilityMatrixRecordsForSubjectRef(records, subjectRef)
  }

  return Object.freeze(
    matches.map((record) => {
      const projection = projectMoralLegalAccountabilityMatrixReview(record)
      const matchKind: WelfareDebtAccountabilityMatrixMatchKind =
        slugifyMitigationPathLabel(record.mitigationPathLabel) ===
        slugifyMitigationPathLabel(mitigationPathLabel)
          ? 'mitigation_path_label'
          : 'subject_ref'

      return Object.freeze({
        debtRef,
        accountabilityMatrixRecordId: record.id,
        wiredRef: projection.wiredRef,
        subjectRef,
        matchKind,
      })
    })
  )
}

function deriveAccountabilityLinkRefs(
  record: WelfareDebtAccountingRecord,
  input?: {
    readonly factionEthicsLinks?: readonly WelfareDebtFactionEthicsCrossLink[]
    readonly accountabilityMatrixLinks?: readonly WelfareDebtAccountabilityMatrixCrossLink[]
  }
): readonly WelfareDebtAccountabilityLinkRef[] {
  const refs: WelfareDebtAccountabilityLinkRef[] = []
  const factionEthicsLinks = input?.factionEthicsLinks ?? []
  const accountabilityMatrixLinks = input?.accountabilityMatrixLinks ?? []

  const reviewOwnerLabel = normalizeToken(record.reviewOwnerLabel)
  if (reviewOwnerLabel) {
    if (factionEthicsLinks.length > 0) {
      for (const link of factionEthicsLinks) {
        refs.push(
          Object.freeze({
            kind: 'faction_ethics',
            wiredRef: link.wiredRef,
            label: reviewOwnerLabel,
          })
        )
      }
    } else {
      refs.push(
        Object.freeze({
          kind: 'review_owner',
          wiredRef: buildReviewOwnerWiredRef(reviewOwnerLabel),
          label: reviewOwnerLabel,
        })
      )
    }
  }

  const mitigationPathLabel = normalizeToken(record.mitigationPathLabel ?? '')
  if (mitigationPathLabel) {
    if (accountabilityMatrixLinks.length > 0) {
      for (const link of accountabilityMatrixLinks) {
        refs.push(
          Object.freeze({
            kind: 'accountability_matrix',
            wiredRef: link.wiredRef,
            label: mitigationPathLabel,
          })
        )
      }
    } else {
      refs.push(
        Object.freeze({
          kind: 'mitigation_path',
          wiredRef: buildMitigationPathWiredRef(mitigationPathLabel),
          label: mitigationPathLabel,
        })
      )
    }
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
    readonly factionEthicsRecords?: FactionEthicsMatrixRecordsMap | null | undefined
    readonly accountabilityMatrixRecords?: MoralLegalAccountabilityMatrixRecordsMap | null | undefined
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
  const factionEthicsLinks = buildFactionEthicsLinks(
    debtRef,
    subjectRef,
    record.reviewOwnerLabel,
    input?.factionEthicsRecords ?? undefined
  )
  const accountabilityMatrixLinks = buildAccountabilityMatrixLinks(
    debtRef,
    subjectRef,
    record.mitigationPathLabel,
    input?.accountabilityMatrixRecords ?? undefined
  )

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
    factionEthicsLinks,
    accountabilityMatrixLinks,
    accountabilityLinkRefs: deriveAccountabilityLinkRefs(record, {
      factionEthicsLinks,
      accountabilityMatrixLinks,
    }),
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
      factionEthicsRecords: input.factionEthicsRecords,
      accountabilityMatrixRecords: input.accountabilityMatrixRecords,
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

  for (const link of summary.factionEthicsLinks) {
    labels.push(link.wiredRef)
  }

  for (const link of summary.accountabilityMatrixLinks) {
    labels.push(link.wiredRef)
  }

  for (const ref of summary.accountabilityLinkRefs) {
    if (ref.kind === 'review_owner' || ref.kind === 'mitigation_path') {
      labels.push(`${ref.kind}:${ref.wiredRef}`)
    }
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

/** Inverse compose: welfare-debt ledger links for one coercive protocol record (SPE-1882 slice 12). */
export function composeWelfareDebtCrossLinksForCoerciveProtocolRecord(
  record: CoerciveProtocolRecord,
  input?: {
    readonly welfareDebtRecords?: WelfareDebtAccountingRecordsMap | null | undefined
  }
): readonly WelfareDebtCoerciveProtocolCrossLink[] {
  if (!validateCoerciveProtocolRecord(record).valid) {
    return Object.freeze([])
  }

  const protocolId = normalizeToken(record.id)
  if (!protocolId) {
    return Object.freeze([])
  }

  const safeRecords = input?.welfareDebtRecords ?? {}
  if (Object.keys(safeRecords).length === 0) {
    return Object.freeze([])
  }

  const links: WelfareDebtCoerciveProtocolCrossLink[] = []

  for (const debtRecord of Object.values(safeRecords)) {
    const summary = composeWelfareDebtAccountingCrossLinksForRecord(debtRecord, {
      coerciveProtocolRecords: { [protocolId]: record },
    })
    if (!summary) {
      continue
    }

    for (const link of summary.coerciveProtocolLinks) {
      if (link.coerciveProtocolId === protocolId) {
        links.push(link)
      }
    }
  }

  return Object.freeze(
    [...links].sort((left, right) => {
      const debtCompare = left.debtRef.localeCompare(right.debtRef)
      if (debtCompare !== 0) {
        return debtCompare
      }

      return left.matchKind.localeCompare(right.matchKind)
    })
  )
}

export function formatCoerciveProtocolWelfareDebtCrossLinkLabels(
  links: readonly WelfareDebtCoerciveProtocolCrossLink[]
): readonly string[] {
  return Object.freeze(
    [...links]
      .map((link) => `welfare-debt:${link.debtRef}`)
      .sort((left, right) => left.localeCompare(right))
  )
}
