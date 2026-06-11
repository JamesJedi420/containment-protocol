/**
 * SPE-1908 / SPE-2428 slice 1 + SPE-2430 slice 3 + SPE-2436 slice 4: coercive
 * protocol ↔ integrated health bundle cross-system reconciliation compose.
 *
 * Pure deterministic linkage between persisted coercive protocol records,
 * integrated health bundles, surveillance-tuning records, and psychological
 * resilience records — reuses registry projections only; no new reconciliation
 * engine or hidden truth beyond hydrated maps.
 */

import {
  evaluateCoerciveProtocolContradictionChecks,
  evaluateStaffExclusionSupportDutyContradictionCheck,
  projectCoerciveProtocolRiskReview,
  validateCoerciveProtocolRecord,
  type CoerciveProtocolContradictionCheckResult,
  type CoerciveProtocolRecord,
  type CoerciveProtocolRecordsMap,
  type CoerciveProtocolRiskReviewProjection,
  type CoerciveProtocolStaffExclusionSupportDutyContradictionCheckCode,
} from './coerciveContainedPersonProtocolRegistry'
import {
  validateContainedPersonIntegratedHealthBundle,
  type ContainedPersonIntegratedHealthBundle,
  type ContainedPersonIntegratedHealthBundleRecordsMap,
  type MentalStateBand,
  type TherapeuticCareScheduleLink,
} from './containedPersonIntegratedHealthBundleRegistry'
import {
  projectPsychologicalResilienceReview,
  validatePsychologicalResilienceRecord,
  type PsychologicalResilienceProjection,
  type PsychologicalResilienceRecord,
  type PsychologicalResilienceRecordsMap,
} from './psychologicalResilienceRegistry'
import {
  projectSurveillanceInterventionTuningReview,
  validateSurveillanceInterventionTuningRecord,
  type SurveillanceInterventionTuningProjection,
  type SurveillanceInterventionTuningRecord,
  type SurveillanceInterventionTuningRecordsMap,
} from './surveillanceCapacityInterventionTuningRegistry'

export type CoerciveProtocolIntegratedHealthMatchKind = 'subject_ref' | 'operator_ref'

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
  | 'psychological_resilience_duty_reliability_degraded'
  | 'psychological_resilience_exposure_elevated'
  | 'psychological_resilience_treatment_gated'
  | 'staff_exclusion_support_duty_obligation_elevated'
  | 'staff_exclusion_exposure_risk_not_separated'
  | 'staff_exclusion_medical_access_not_routed'
  | 'staff_exclusion_accommodation_access_not_routed'
  | 'staff_exclusion_resilience_duty_reliability_cross_tension'
  | 'staff_exclusion_bundle_no_active_contact_cross_tension'

export interface CoerciveProtocolSurveillanceTuningCrossLink {
  readonly surveillanceTuningId: string
  readonly subjectRef: string
  readonly matchKind: CoerciveProtocolIntegratedHealthMatchKind
}

export interface CoerciveProtocolPsychologicalResilienceCrossLink {
  readonly psychologicalResilienceId: string
  readonly operatorRef: string
  readonly matchKind: CoerciveProtocolIntegratedHealthMatchKind
}

export interface CoerciveProtocolIntegratedHealthReconciliationSummary {
  readonly subjectRef: string
  readonly links: readonly CoerciveProtocolIntegratedHealthCrossLink[]
  readonly surveillanceTuningLinks: readonly CoerciveProtocolSurveillanceTuningCrossLink[]
  readonly psychologicalResilienceLinks: readonly CoerciveProtocolPsychologicalResilienceCrossLink[]
  readonly linkedProtocolCount: number
  readonly linkedBundleCount: number
  readonly linkedTuningCount: number
  readonly linkedResilienceCount: number
  readonly protocolRiskReviews: readonly CoerciveProtocolRiskReviewProjection[]
  readonly triggeredContradictionChecks: readonly CoerciveProtocolContradictionCheckResult[]
  readonly surveillanceTuningProjections: readonly SurveillanceInterventionTuningProjection[]
  readonly psychologicalResilienceProjections: readonly PsychologicalResilienceProjection[]
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

function isHydratedPsychologicalResilienceRecord(
  record: PsychologicalResilienceRecord
): boolean {
  return validatePsychologicalResilienceRecord(record).valid
}

function isOperatorLinkRef(value: unknown): boolean {
  const token = normalizeToken(value)
  return token.startsWith('agent:')
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

function collectProtocolBundleOperatorLinks(input: {
  readonly protocolRecords: readonly CoerciveProtocolRecord[]
  readonly bundle: ContainedPersonIntegratedHealthBundle | null
}): readonly string[] {
  const operatorLinks = new Set<string>()

  for (const record of input.protocolRecords) {
    for (const candidate of [
      record.subjectFitValidationRef,
      record.procedureRef,
      record.medicationRegimenRef,
      record.custodyStatusRef,
    ]) {
      if (isOperatorLinkRef(candidate)) {
        operatorLinks.add(normalizeToken(candidate))
      }
    }
  }

  if (input.bundle) {
    for (const link of input.bundle.therapeuticCareScheduleLinks ?? []) {
      for (const candidate of [link.scheduleRef, link.wiredRef]) {
        if (isOperatorLinkRef(candidate)) {
          operatorLinks.add(normalizeToken(candidate))
        }
      }
    }

    for (const link of input.bundle.medicationRegimenLinks ?? []) {
      for (const candidate of [link.regimenRef, link.wiredRef]) {
        if (isOperatorLinkRef(candidate)) {
          operatorLinks.add(normalizeToken(candidate))
        }
      }
    }

    for (const link of input.bundle.custodyStatusLinks ?? []) {
      for (const candidate of [link.custodyRef, link.wiredRef]) {
        if (isOperatorLinkRef(candidate)) {
          operatorLinks.add(normalizeToken(candidate))
        }
      }
    }

    for (const link of input.bundle.welfareDebtAccountingLinks ?? []) {
      for (const candidate of [link.debtRef, link.wiredRef]) {
        if (isOperatorLinkRef(candidate)) {
          operatorLinks.add(normalizeToken(candidate))
        }
      }
    }
  }

  return Object.freeze([...operatorLinks].sort((left, right) => left.localeCompare(right)))
}

function listHydratedPsychologicalResilienceRecordsForOperatorLinks(
  records: PsychologicalResilienceRecordsMap | undefined,
  operatorLinks: readonly string[]
): PsychologicalResilienceRecord[] {
  if (operatorLinks.length === 0) {
    return []
  }

  const operatorLinkSet = new Set(operatorLinks.map((link) => normalizeToken(link)).filter(Boolean))

  return Object.values(records ?? {})
    .filter(
      (record) =>
        operatorLinkSet.has(normalizeToken(record.operatorRef)) &&
        isHydratedPsychologicalResilienceRecord(record)
    )
    .sort((left, right) => {
      const byOperator = left.operatorRef.localeCompare(right.operatorRef)
      if (byOperator !== 0) {
        return byOperator
      }

      return left.id.localeCompare(right.id)
    })
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

function collectPsychologicalResilienceCrossSystemTensionFlags(input: {
  readonly psychologicalResilienceProjections: readonly PsychologicalResilienceProjection[]
}): readonly CoerciveProtocolCrossSystemTensionFlag[] {
  const flags: CoerciveProtocolCrossSystemTensionFlag[] = []

  for (const projection of input.psychologicalResilienceProjections) {
    if (projection.exposureElevated) {
      flags.push('psychological_resilience_exposure_elevated')
    }

    if (projection.dutyReliabilityDegraded) {
      flags.push('psychological_resilience_duty_reliability_degraded')
    }

    if (projection.treatmentGated) {
      flags.push('psychological_resilience_treatment_gated')
    }
  }

  return Object.freeze([...new Set(flags)].sort((left, right) => left.localeCompare(right)))
}

const STAFF_EXCLUSION_CROSS_SYSTEM_ISSUE_CODES = new Set<CoerciveProtocolStaffExclusionSupportDutyContradictionCheckCode>([
  'staff_exclusion_support_duty_obligation_elevated',
  'staff_exclusion_exposure_risk_not_separated',
  'staff_exclusion_medical_access_not_routed',
  'staff_exclusion_accommodation_access_not_routed',
])

function mapStaffExclusionIssueToCrossSystemTensionFlag(
  code: CoerciveProtocolStaffExclusionSupportDutyContradictionCheckCode
): CoerciveProtocolCrossSystemTensionFlag | null {
  if (!STAFF_EXCLUSION_CROSS_SYSTEM_ISSUE_CODES.has(code)) {
    return null
  }

  return code
}

function collectStaffExclusionCrossSystemTensionFlags(input: {
  readonly protocolRecords: readonly CoerciveProtocolRecord[]
  readonly bundle: ContainedPersonIntegratedHealthBundle | null
  readonly psychologicalResilienceProjections: readonly PsychologicalResilienceProjection[]
  readonly bundleCrossSystemTensionFlags: readonly CoerciveProtocolCrossSystemTensionFlag[]
  readonly resilienceCrossSystemTensionFlags: readonly CoerciveProtocolCrossSystemTensionFlag[]
}): readonly CoerciveProtocolCrossSystemTensionFlag[] {
  if (!input.bundle) {
    return Object.freeze([])
  }

  const hasStaffExclusionDuty = input.protocolRecords.some((record) => {
    const check = evaluateStaffExclusionSupportDutyContradictionCheck(record)
    return check.triggered
  })

  if (!hasStaffExclusionDuty) {
    return Object.freeze([])
  }

  const flags: CoerciveProtocolCrossSystemTensionFlag[] = []

  for (const record of input.protocolRecords) {
    const check = evaluateStaffExclusionSupportDutyContradictionCheck(record)
    if (!check.triggered) {
      continue
    }

    for (const issue of check.issues) {
      const tensionFlag = mapStaffExclusionIssueToCrossSystemTensionFlag(
        issue.code as CoerciveProtocolStaffExclusionSupportDutyContradictionCheckCode
      )
      if (tensionFlag) {
        flags.push(tensionFlag)
      }
    }
  }

  const resilienceDutyDegraded =
    input.resilienceCrossSystemTensionFlags.includes(
      'psychological_resilience_duty_reliability_degraded'
    ) || input.psychologicalResilienceProjections.some((projection) => projection.dutyReliabilityDegraded)

  if (resilienceDutyDegraded && input.psychologicalResilienceProjections.length > 0) {
    flags.push('staff_exclusion_resilience_duty_reliability_cross_tension')
  }

  const bundleNoActiveContact =
    input.bundleCrossSystemTensionFlags.includes('surveillance_burden_no_active_contact_channel') ||
    ((input.bundle.therapeuticCareScheduleLinks ?? []).length > 0 &&
      !hasActiveTherapeuticContactChannel(input.bundle))

  if (bundleNoActiveContact) {
    flags.push('staff_exclusion_bundle_no_active_contact_cross_tension')
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
  readonly protocolRecords: readonly CoerciveProtocolRecord[]
  readonly protocolRiskReviews: readonly CoerciveProtocolRiskReviewProjection[]
  readonly bundle: ContainedPersonIntegratedHealthBundle | null
  readonly surveillanceTuningProjections: readonly SurveillanceInterventionTuningProjection[]
  readonly psychologicalResilienceProjections: readonly PsychologicalResilienceProjection[]
}): readonly CoerciveProtocolCrossSystemTensionFlag[] {
  const bundleCrossSystemTensionFlags = collectBundleCrossSystemTensionFlags({
    protocolRiskReviews: input.protocolRiskReviews,
    bundle: input.bundle,
  })
  const resilienceCrossSystemTensionFlags = collectPsychologicalResilienceCrossSystemTensionFlags({
    psychologicalResilienceProjections: input.psychologicalResilienceProjections,
  })

  return Object.freeze(
    [
      ...bundleCrossSystemTensionFlags,
      ...collectSurveillanceTuningCrossSystemTensionFlags({
        protocolRiskReviews: input.protocolRiskReviews,
        surveillanceTuningProjections: input.surveillanceTuningProjections,
      }),
      ...resilienceCrossSystemTensionFlags,
      ...collectStaffExclusionCrossSystemTensionFlags({
        protocolRecords: input.protocolRecords,
        bundle: input.bundle,
        psychologicalResilienceProjections: input.psychologicalResilienceProjections,
        bundleCrossSystemTensionFlags,
        resilienceCrossSystemTensionFlags,
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

export function listPsychologicalResilienceRecordsForOperatorLinks(
  records: PsychologicalResilienceRecordsMap | undefined,
  operatorLinks: readonly string[]
): PsychologicalResilienceRecord[] {
  return listHydratedPsychologicalResilienceRecordsForOperatorLinks(records, operatorLinks)
}

export function composeCoerciveProtocolIntegratedHealthReconciliation(
  protocols: CoerciveProtocolRecordsMap | undefined,
  bundles: ContainedPersonIntegratedHealthBundleRecordsMap | undefined,
  subjectRef: string,
  surveillanceTuningRecords?: SurveillanceInterventionTuningRecordsMap | undefined,
  psychologicalResilienceRecords?: PsychologicalResilienceRecordsMap | undefined
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

  const operatorLinks =
    bundle && protocolRecords.length > 0
      ? collectProtocolBundleOperatorLinks({
          protocolRecords,
          bundle,
        })
      : Object.freeze([] as readonly string[])

  const resilienceRecords = listHydratedPsychologicalResilienceRecordsForOperatorLinks(
    psychologicalResilienceRecords,
    operatorLinks
  )

  const psychologicalResilienceProjections = Object.freeze(
    resilienceRecords.map((record) => projectPsychologicalResilienceReview(record))
  )

  const links: CoerciveProtocolIntegratedHealthCrossLink[] = []
  const surveillanceTuningLinks: CoerciveProtocolSurveillanceTuningCrossLink[] = []
  const psychologicalResilienceLinks: CoerciveProtocolPsychologicalResilienceCrossLink[] = []

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

  if (bundle && links.length > 0 && resilienceRecords.length > 0) {
    for (const resilienceRecord of resilienceRecords) {
      psychologicalResilienceLinks.push({
        psychologicalResilienceId: resilienceRecord.id,
        operatorRef: normalizeToken(resilienceRecord.operatorRef),
        matchKind: 'operator_ref',
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

  psychologicalResilienceLinks.sort((left, right) => {
    const byOperator = left.operatorRef.localeCompare(right.operatorRef)
    if (byOperator !== 0) {
      return byOperator
    }

    return left.psychologicalResilienceId.localeCompare(right.psychologicalResilienceId)
  })

  const crossSystemTensionFlags = collectCrossSystemTensionFlags({
    protocolRecords,
    protocolRiskReviews,
    bundle,
    surveillanceTuningProjections,
    psychologicalResilienceProjections,
  })

  const linkedProtocolIds = new Set(links.map((link) => link.coerciveProtocolId))
  const linkedTuningIds = new Set(surveillanceTuningLinks.map((link) => link.surveillanceTuningId))
  const linkedResilienceIds = new Set(
    psychologicalResilienceLinks.map((link) => link.psychologicalResilienceId)
  )
  const structuredReasons = [
    `subject:${normalizedSubjectRef}`,
    `link_count:${links.length}`,
    `linked_protocol_count:${linkedProtocolIds.size}`,
    `linked_bundle_count:${bundle ? 1 : 0}`,
    `linked_tuning_count:${linkedTuningIds.size}`,
    `linked_resilience_count:${linkedResilienceIds.size}`,
    `triggered_contradiction_check_count:${triggeredContradictionChecks.length}`,
    `cross_system_tension_count:${crossSystemTensionFlags.length}`,
    links.some((link) => link.matchKind === 'subject_ref') ? 'match:subject_ref' : 'match:none_subject_ref',
    surveillanceTuningLinks.length > 0 ? 'tuning:linked' : 'tuning:none',
    psychologicalResilienceLinks.length > 0 ? 'resilience:linked' : 'resilience:none',
    crossSystemTensionFlags.length > 0 ? 'tension:present' : 'tension:none',
  ].sort((left, right) => left.localeCompare(right))

  const redacted =
    protocolRecords.some((record) => (record.redactedFields ?? []).length > 0) ||
    (bundle?.redactedFields ?? []).length > 0 ||
    tuningRecords.some((record) => (record.redactedFields ?? []).length > 0) ||
    resilienceRecords.some((record) => (record.redactedFields ?? []).length > 0) ||
    protocolRiskReviews.some((review) => review.redacted) ||
    triggeredContradictionChecks.some((check) => check.redacted) ||
    surveillanceTuningProjections.some((projection) => projection.redacted) ||
    psychologicalResilienceProjections.some((projection) => projection.redacted)

  const unknownFields = mergeUnknownFields(
    ...protocolRecords.map((record) => record.unknownFields),
    bundle?.unknownFields,
    ...tuningRecords.map((record) => record.unknownFields),
    ...resilienceRecords.map((record) => record.unknownFields),
    ...protocolRiskReviews.map((review) => review.unknownFields),
    ...triggeredContradictionChecks.map((check) => check.unknownFields),
    ...surveillanceTuningProjections.map((projection) => projection.unknownFields),
    ...psychologicalResilienceProjections.map((projection) => projection.unknownFields)
  )

  return Object.freeze({
    subjectRef: normalizedSubjectRef,
    links: Object.freeze(links),
    surveillanceTuningLinks: Object.freeze(surveillanceTuningLinks),
    psychologicalResilienceLinks: Object.freeze(psychologicalResilienceLinks),
    linkedProtocolCount: linkedProtocolIds.size,
    linkedBundleCount: bundle ? 1 : 0,
    linkedTuningCount: linkedTuningIds.size,
    linkedResilienceCount: linkedResilienceIds.size,
    protocolRiskReviews,
    triggeredContradictionChecks,
    surveillanceTuningProjections,
    psychologicalResilienceProjections,
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
  surveillanceTuningRecords?: SurveillanceInterventionTuningRecordsMap | undefined,
  psychologicalResilienceRecords?: PsychologicalResilienceRecordsMap | undefined
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
          surveillanceTuningRecords,
          psychologicalResilienceRecords
        )
      )
      .filter((summary) => summary.links.length > 0)
  )
}
