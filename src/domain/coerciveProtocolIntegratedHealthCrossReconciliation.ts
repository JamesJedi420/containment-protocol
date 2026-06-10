/**
 * SPE-1908 / SPE-2428 slice 1 + SPE-2430 slice 3: coercive protocol ↔ integrated
 * health bundle cross-system reconciliation compose.
 *
 * Pure deterministic linkage between persisted coercive protocol records,
 * integrated health bundles, and surveillance-tuning records via shared subject
 * refs — reuses registry projections only; no new reconciliation engine or
 * hidden truth beyond hydrated maps.
 */

import {
  evaluateCoerciveProtocolContradictionChecks,
  projectCoerciveProtocolRiskReview,
  validateCoerciveProtocolRecord,
  type CoerciveProtocolContradictionCheckResult,
  type CoerciveProtocolRecord,
  type CoerciveProtocolRecordsMap,
  type CoerciveProtocolRiskReviewProjection,
} from './coerciveContainedPersonProtocolRegistry'
import {
  validateContainedPersonIntegratedHealthBundle,
  type ContainedPersonIntegratedHealthBundle,
  type ContainedPersonIntegratedHealthBundleRecordsMap,
  type MentalStateBand,
  type TherapeuticCareScheduleLink,
} from './containedPersonIntegratedHealthBundleRegistry'
import {
  projectSurveillanceInterventionTuningReview,
  validateSurveillanceInterventionTuningRecord,
  type SurveillanceInterventionTuningProjection,
  type SurveillanceInterventionTuningRecord,
  type SurveillanceInterventionTuningRecordsMap,
} from './surveillanceCapacityInterventionTuningRegistry'

export type CoerciveProtocolIntegratedHealthMatchKind = 'subject_ref'

export interface CoerciveProtocolIntegratedHealthCrossLink {
  readonly coerciveProtocolId: string
  readonly integratedHealthBundleId: string
  readonly subjectRef: string
  readonly matchKind: CoerciveProtocolIntegratedHealthMatchKind
}

export type CoerciveProtocolCrossSystemTensionFlag =
  | 'surveillance_burden_stable_mental_state'
  | 'surveillance_burden_no_active_contact_channel'
  | 'surveillance_burden_low_humane_care_risk'
  | 'monitoring_substitutes_contact_signal'
  | 'surveillance_tuning_monitoring_exceeds_contact'
  | 'surveillance_tuning_sustained_under_collateral_strain'

export interface CoerciveProtocolSurveillanceTuningCrossLink {
  readonly surveillanceTuningId: string
  readonly subjectRef: string
  readonly matchKind: CoerciveProtocolIntegratedHealthMatchKind
}

export interface CoerciveProtocolIntegratedHealthReconciliationSummary {
  readonly subjectRef: string
  readonly links: readonly CoerciveProtocolIntegratedHealthCrossLink[]
  readonly surveillanceTuningLinks: readonly CoerciveProtocolSurveillanceTuningCrossLink[]
  readonly linkedProtocolCount: number
  readonly linkedBundleCount: number
  readonly linkedTuningCount: number
  readonly protocolRiskReviews: readonly CoerciveProtocolRiskReviewProjection[]
  readonly triggeredContradictionChecks: readonly CoerciveProtocolContradictionCheckResult[]
  readonly surveillanceTuningProjections: readonly SurveillanceInterventionTuningProjection[]
  readonly bundleMentalStateBand: MentalStateBand | null
  readonly bundleHumaneCareRiskScore: number | null
  readonly bundleTherapeuticChannelStates: readonly TherapeuticCareScheduleLink['channelState'][]
  readonly crossSystemTensionFlags: readonly CoerciveProtocolCrossSystemTensionFlag[]
  readonly structuredReasons: readonly string[]
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isHydratedCoerciveProtocolRecord(record: CoerciveProtocolRecord): boolean {
  return validateCoerciveProtocolRecord(record).valid
}

function isHydratedIntegratedHealthBundle(
  bundle: ContainedPersonIntegratedHealthBundle
): boolean {
  return validateContainedPersonIntegratedHealthBundle(bundle).valid
}

function isHydratedSurveillanceInterventionTuningRecord(
  record: SurveillanceInterventionTuningRecord
): boolean {
  return validateSurveillanceInterventionTuningRecord(record).valid
}

function mergeUnknownFields(
  ...sources: readonly (readonly string[] | undefined)[]
): readonly string[] {
  const merged = new Set<string>()

  for (const source of sources) {
    for (const field of source ?? []) {
      const token = normalizeToken(field)
      if (token) {
        merged.add(token)
      }
    }
  }

  return Object.freeze([...merged].sort((left, right) => left.localeCompare(right)))
}

function listHydratedProtocolsForSubject(
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
        isHydratedCoerciveProtocolRecord(record)
    )
    .sort((left, right) => left.id.localeCompare(right.id))
}

function listHydratedSurveillanceTuningRecordsForSubject(
  records: SurveillanceInterventionTuningRecordsMap | undefined,
  subjectRef: string
): SurveillanceInterventionTuningRecord[] {
  const normalizedSubjectRef = normalizeToken(subjectRef)
  if (!normalizedSubjectRef) {
    return []
  }

  return Object.values(records ?? {})
    .filter(
      (record) =>
        normalizeToken(record.subjectRef) === normalizedSubjectRef &&
        isHydratedSurveillanceInterventionTuningRecord(record)
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
  if (!bundle || !isHydratedIntegratedHealthBundle(bundle)) {
    return null
  }

  return bundle
}

function hasSurveillanceIsolationBurden(
  reviews: readonly CoerciveProtocolRiskReviewProjection[]
): boolean {
  return reviews.some((review) =>
    review.contradictionRiskFlags.includes('surveillance_isolation_burden')
  )
}

function collectTherapeuticChannelStates(
  bundle: ContainedPersonIntegratedHealthBundle | null
): readonly TherapeuticCareScheduleLink['channelState'][] {
  const links = bundle?.therapeuticCareScheduleLinks ?? []
  return Object.freeze(
    [...links]
      .map((link) => link.channelState)
      .sort((left, right) => left.localeCompare(right))
  )
}

function hasActiveTherapeuticContactChannel(
  bundle: ContainedPersonIntegratedHealthBundle | null
): boolean {
  return (bundle?.therapeuticCareScheduleLinks ?? []).some(
    (link) => link.channelState === 'active'
  )
}

function collectBundleCrossSystemTensionFlags(input: {
  readonly protocolRiskReviews: readonly CoerciveProtocolRiskReviewProjection[]
  readonly bundle: ContainedPersonIntegratedHealthBundle | null
}): readonly CoerciveProtocolCrossSystemTensionFlag[] {
  if (!hasSurveillanceIsolationBurden(input.protocolRiskReviews)) {
    return Object.freeze([])
  }

  const flags: CoerciveProtocolCrossSystemTensionFlag[] = []
  const mentalStateBand = input.bundle?.mentalStateBand

  if (mentalStateBand === 'stable') {
    flags.push('surveillance_burden_stable_mental_state')
  }

  const humaneCareRiskScore = input.bundle?.humaneCareRiskScore
  if (humaneCareRiskScore !== undefined && humaneCareRiskScore !== null && humaneCareRiskScore < 0.25) {
    flags.push('surveillance_burden_low_humane_care_risk')
  }

  const therapeuticLinks = input.bundle?.therapeuticCareScheduleLinks ?? []
  if (therapeuticLinks.length > 0 && !hasActiveTherapeuticContactChannel(input.bundle)) {
    flags.push('surveillance_burden_no_active_contact_channel')
  }

  if (!hasActiveTherapeuticContactChannel(input.bundle)) {
    flags.push('monitoring_substitutes_contact_signal')
  }

  return Object.freeze([...new Set(flags)].sort((left, right) => left.localeCompare(right)))
}

function collectSurveillanceTuningCrossSystemTensionFlags(input: {
  readonly protocolRiskReviews: readonly CoerciveProtocolRiskReviewProjection[]
  readonly surveillanceTuningProjections: readonly SurveillanceInterventionTuningProjection[]
}): readonly CoerciveProtocolCrossSystemTensionFlag[] {
  if (!hasSurveillanceIsolationBurden(input.protocolRiskReviews)) {
    return Object.freeze([])
  }

  const flags: CoerciveProtocolCrossSystemTensionFlag[] = []

  for (const projection of input.surveillanceTuningProjections) {
    if (projection.monitoringExceedsContact) {
      flags.push('surveillance_tuning_monitoring_exceeds_contact')
    }

    if (projection.sustainedUnderCollateralStrain) {
      flags.push('surveillance_tuning_sustained_under_collateral_strain')
    }
  }

  return Object.freeze([...new Set(flags)].sort((left, right) => left.localeCompare(right)))
}

function collectCrossSystemTensionFlags(input: {
  readonly protocolRiskReviews: readonly CoerciveProtocolRiskReviewProjection[]
  readonly bundle: ContainedPersonIntegratedHealthBundle | null
  readonly surveillanceTuningProjections: readonly SurveillanceInterventionTuningProjection[]
}): readonly CoerciveProtocolCrossSystemTensionFlag[] {
  return Object.freeze(
    [
      ...collectBundleCrossSystemTensionFlags({
        protocolRiskReviews: input.protocolRiskReviews,
        bundle: input.bundle,
      }),
      ...collectSurveillanceTuningCrossSystemTensionFlags({
        protocolRiskReviews: input.protocolRiskReviews,
        surveillanceTuningProjections: input.surveillanceTuningProjections,
      }),
    ]
      .filter((flag, index, flags) => flags.indexOf(flag) === index)
      .sort((left, right) => left.localeCompare(right))
  )
}

export function listCoerciveProtocolsForIntegratedHealthSubject(
  protocols: CoerciveProtocolRecordsMap | undefined,
  subjectRef: string
): CoerciveProtocolRecord[] {
  return listHydratedProtocolsForSubject(protocols, subjectRef)
}

export function resolveIntegratedHealthBundleForSubject(
  bundles: ContainedPersonIntegratedHealthBundleRecordsMap | undefined,
  subjectRef: string
): ContainedPersonIntegratedHealthBundle | null {
  return resolveHydratedBundleForSubject(bundles, subjectRef)
}

export function listSurveillanceInterventionTuningRecordsForSubject(
  records: SurveillanceInterventionTuningRecordsMap | undefined,
  subjectRef: string
): SurveillanceInterventionTuningRecord[] {
  return listHydratedSurveillanceTuningRecordsForSubject(records, subjectRef)
}

export function composeCoerciveProtocolIntegratedHealthReconciliation(
  protocols: CoerciveProtocolRecordsMap | undefined,
  bundles: ContainedPersonIntegratedHealthBundleRecordsMap | undefined,
  subjectRef: string,
  surveillanceTuningRecords?: SurveillanceInterventionTuningRecordsMap | undefined
): CoerciveProtocolIntegratedHealthReconciliationSummary {
  const normalizedSubjectRef = normalizeToken(subjectRef) || '(unknown)'
  const protocolRecords = listHydratedProtocolsForSubject(protocols, normalizedSubjectRef)
  const bundle = resolveHydratedBundleForSubject(bundles, normalizedSubjectRef)
  const tuningRecords = listHydratedSurveillanceTuningRecordsForSubject(
    surveillanceTuningRecords,
    normalizedSubjectRef
  )

  const protocolRiskReviews = Object.freeze(
    protocolRecords.map((record) => projectCoerciveProtocolRiskReview(record))
  )

  const triggeredContradictionChecks = Object.freeze(
    protocolRecords
      .flatMap((record) => evaluateCoerciveProtocolContradictionChecks(record))
      .sort((left, right) => {
        const byFlag = left.flag.localeCompare(right.flag)
        if (byFlag !== 0) {
          return byFlag
        }

        return left.recordId.localeCompare(right.recordId)
      })
  )

  const surveillanceTuningProjections = Object.freeze(
    tuningRecords.map((record) => projectSurveillanceInterventionTuningReview(record))
  )

  const links: CoerciveProtocolIntegratedHealthCrossLink[] = []
  const surveillanceTuningLinks: CoerciveProtocolSurveillanceTuningCrossLink[] = []

  if (bundle) {
    for (const record of protocolRecords) {
      links.push({
        coerciveProtocolId: record.id,
        integratedHealthBundleId: bundle.id,
        subjectRef: normalizedSubjectRef,
        matchKind: 'subject_ref',
      })
    }
  }

  if (bundle && tuningRecords.length > 0) {
    for (const tuningRecord of tuningRecords) {
      surveillanceTuningLinks.push({
        surveillanceTuningId: tuningRecord.id,
        subjectRef: normalizedSubjectRef,
        matchKind: 'subject_ref',
      })
    }
  }

  links.sort((left, right) => {
    const bySubject = left.subjectRef.localeCompare(right.subjectRef)
    if (bySubject !== 0) {
      return bySubject
    }

    const byProtocol = left.coerciveProtocolId.localeCompare(right.coerciveProtocolId)
    if (byProtocol !== 0) {
      return byProtocol
    }

    return left.integratedHealthBundleId.localeCompare(right.integratedHealthBundleId)
  })

  surveillanceTuningLinks.sort((left, right) => {
    const bySubject = left.subjectRef.localeCompare(right.subjectRef)
    if (bySubject !== 0) {
      return bySubject
    }

    return left.surveillanceTuningId.localeCompare(right.surveillanceTuningId)
  })

  const crossSystemTensionFlags = collectCrossSystemTensionFlags({
    protocolRiskReviews,
    bundle,
    surveillanceTuningProjections,
  })

  const linkedProtocolIds = new Set(links.map((link) => link.coerciveProtocolId))
  const linkedTuningIds = new Set(surveillanceTuningLinks.map((link) => link.surveillanceTuningId))
  const structuredReasons = [
    `subject:${normalizedSubjectRef}`,
    `link_count:${links.length}`,
    `linked_protocol_count:${linkedProtocolIds.size}`,
    `linked_bundle_count:${bundle ? 1 : 0}`,
    `linked_tuning_count:${linkedTuningIds.size}`,
    `triggered_contradiction_check_count:${triggeredContradictionChecks.length}`,
    `cross_system_tension_count:${crossSystemTensionFlags.length}`,
    links.some((link) => link.matchKind === 'subject_ref') ? 'match:subject_ref' : 'match:none_subject_ref',
    surveillanceTuningLinks.length > 0 ? 'tuning:linked' : 'tuning:none',
    crossSystemTensionFlags.length > 0 ? 'tension:present' : 'tension:none',
  ].sort((left, right) => left.localeCompare(right))

  const redacted =
    protocolRecords.some((record) => (record.redactedFields ?? []).length > 0) ||
    (bundle?.redactedFields ?? []).length > 0 ||
    tuningRecords.some((record) => (record.redactedFields ?? []).length > 0) ||
    protocolRiskReviews.some((review) => review.redacted) ||
    triggeredContradictionChecks.some((check) => check.redacted) ||
    surveillanceTuningProjections.some((projection) => projection.redacted)

  const unknownFields = mergeUnknownFields(
    ...protocolRecords.map((record) => record.unknownFields),
    bundle?.unknownFields,
    ...tuningRecords.map((record) => record.unknownFields),
    ...protocolRiskReviews.map((review) => review.unknownFields),
    ...triggeredContradictionChecks.map((check) => check.unknownFields),
    ...surveillanceTuningProjections.map((projection) => projection.unknownFields)
  )

  return Object.freeze({
    subjectRef: normalizedSubjectRef,
    links: Object.freeze(links),
    surveillanceTuningLinks: Object.freeze(surveillanceTuningLinks),
    linkedProtocolCount: linkedProtocolIds.size,
    linkedBundleCount: bundle ? 1 : 0,
    linkedTuningCount: linkedTuningIds.size,
    protocolRiskReviews,
    triggeredContradictionChecks,
    surveillanceTuningProjections,
    bundleMentalStateBand: bundle?.mentalStateBand ?? null,
    bundleHumaneCareRiskScore: bundle?.humaneCareRiskScore ?? null,
    bundleTherapeuticChannelStates: collectTherapeuticChannelStates(bundle),
    crossSystemTensionFlags,
    structuredReasons,
    redacted,
    unknownFields,
  })
}

/** Compose reconciliation summaries for every subject ref with protocol–bundle links. */
export function composeAllCoerciveProtocolIntegratedHealthReconciliations(
  protocols: CoerciveProtocolRecordsMap | undefined,
  bundles: ContainedPersonIntegratedHealthBundleRecordsMap | undefined,
  surveillanceTuningRecords?: SurveillanceInterventionTuningRecordsMap | undefined
): readonly CoerciveProtocolIntegratedHealthReconciliationSummary[] {
  const subjectRefs = new Set<string>()

  for (const record of Object.values(protocols ?? {})) {
    if (!isHydratedCoerciveProtocolRecord(record)) {
      continue
    }

    const subjectRef = normalizeToken(record.subjectRef)
    if (subjectRef && bundles?.[subjectRef] && isHydratedIntegratedHealthBundle(bundles[subjectRef])) {
      subjectRefs.add(subjectRef)
    }
  }

  return Object.freeze(
    [...subjectRefs]
      .sort((left, right) => left.localeCompare(right))
      .map((subjectRef) =>
        composeCoerciveProtocolIntegratedHealthReconciliation(
          protocols,
          bundles,
          subjectRef,
          surveillanceTuningRecords
        )
      )
      .filter((summary) => summary.links.length > 0)
  )
}
