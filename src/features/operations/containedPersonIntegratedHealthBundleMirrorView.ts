import type { GameState } from '../../domain/models'
import {
  validateContainedPersonIntegratedHealthBundle,
  type ContainedPersonIntegratedHealthBundle,
  type CustodyStatusLink,
  type MedicationRegimenLink,
  type MentalStateBand,
  type TherapeuticCareScheduleLink,
  type WelfareDebtAccountingLink,
} from '../../domain/containedPersonIntegratedHealthBundleRegistry'
import { formatContainedPersonTherapeuticCareEnumLabel } from './containedPersonTherapeuticCareMirrorView'

export interface TherapeuticCareScheduleLinkMirrorView {
  scheduleRefLabel: string
  wiredRefLabel: string
  careModeLabel: string
  channelStateLabel: string
  missedSessionStreakLabel: string
  complianceRiskScoreLabel: string
  lockdownEscalationLikelyLabel: string
}

export interface MedicationRegimenLinkMirrorView {
  regimenRefLabel: string
  wiredRefLabel: string
  consentStatusLabel: string
  deliveryVectorLabel: string
  interactionRiskScoreLabel: string
  adverseReactionFlagLabel: string
}

export interface CustodyStatusLinkMirrorView {
  custodyRefLabel: string
  wiredRefLabel: string
  custodyStageLabel: string
  formerRoleCategoryLabel: string
  restrictionLevelLabel: string
  rightsReviewPendingLabel: string
}

export interface WelfareDebtAccountingLinkMirrorView {
  debtRefLabel: string
  wiredRefLabel: string
  severityBandLabel: string
  mitigationStateLabel: string
  containmentBenefitScoreLabel: string
}

export interface ContainedPersonIntegratedHealthBundleMirrorRecordView {
  id: string
  label: string
  subjectRefLabel: string
  mentalStateBandLabel: string
  humaneCareRiskScoreLabel: string
  confidenceLabel: string
  therapeuticCareScheduleLinks: readonly TherapeuticCareScheduleLinkMirrorView[]
  medicationRegimenLinks: readonly MedicationRegimenLinkMirrorView[]
  custodyStatusLinks: readonly CustodyStatusLinkMirrorView[]
  welfareDebtAccountingLinks: readonly WelfareDebtAccountingLinkMirrorView[]
  validationWarningLabels: readonly string[]
  redactedFieldLabels: readonly string[]
}

export interface ContainedPersonIntegratedHealthBundleMirrorSummaryView {
  totalBundles: number
  criticalMentalStateCount: number
  distressedMentalStateCount: number
  lockdownEscalationLinkCount: number
  coercedMedicationLinkCount: number
  rightsReviewPendingCount: number
  unresolvedWelfareDebtLinkCount: number
  week: number
}

export interface ContainedPersonIntegratedHealthBundleMirrorView {
  isEmpty: boolean
  summary: ContainedPersonIntegratedHealthBundleMirrorSummaryView
  records: readonly ContainedPersonIntegratedHealthBundleMirrorRecordView[]
}

export function formatIntegratedHealthBundleEnumLabel(value: string): string {
  return formatContainedPersonTherapeuticCareEnumLabel(value)
}

function listPersistedBundles(game: GameState): ContainedPersonIntegratedHealthBundle[] {
  const map = game.containedPersonIntegratedHealthBundles ?? {}
  return Object.values(map).sort((left, right) => left.id.localeCompare(right.id))
}

function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toFixed(2)
}

function formatUnitScore(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toFixed(2)
}

function formatYesNo(value: boolean): string {
  return value ? 'Yes' : '—'
}

function formatMentalStateBand(value: MentalStateBand | undefined): string {
  if (!value) {
    return '—'
  }

  return formatIntegratedHealthBundleEnumLabel(value)
}

function sortedRedactedFieldLabels(bundle: ContainedPersonIntegratedHealthBundle): readonly string[] {
  return Object.freeze([...(bundle.redactedFields ?? [])].sort((left, right) => left.localeCompare(right)))
}

function toScheduleLinkView(link: TherapeuticCareScheduleLink): TherapeuticCareScheduleLinkMirrorView {
  return Object.freeze({
    scheduleRefLabel: link.scheduleRef,
    wiredRefLabel: link.wiredRef,
    careModeLabel: formatIntegratedHealthBundleEnumLabel(link.careMode),
    channelStateLabel: formatIntegratedHealthBundleEnumLabel(link.channelState),
    missedSessionStreakLabel: String(link.missedSessionStreak),
    complianceRiskScoreLabel: formatUnitScore(link.complianceRiskScore),
    lockdownEscalationLikelyLabel: formatYesNo(link.lockdownEscalationLikely),
  })
}

function sortedScheduleLinkViews(
  bundle: ContainedPersonIntegratedHealthBundle
): readonly TherapeuticCareScheduleLinkMirrorView[] {
  return Object.freeze(
    [...(bundle.therapeuticCareScheduleLinks ?? [])]
      .sort((left, right) => left.scheduleRef.localeCompare(right.scheduleRef))
      .map((link) => toScheduleLinkView(link))
  )
}

function toMedicationRegimenLinkView(link: MedicationRegimenLink): MedicationRegimenLinkMirrorView {
  return Object.freeze({
    regimenRefLabel: link.regimenRef,
    wiredRefLabel: link.wiredRef,
    consentStatusLabel: formatIntegratedHealthBundleEnumLabel(link.consentStatus),
    deliveryVectorLabel: link.deliveryVector,
    interactionRiskScoreLabel: formatUnitScore(link.interactionRiskScore),
    adverseReactionFlagLabel: formatYesNo(link.adverseReactionFlag),
  })
}

function sortedMedicationRegimenLinkViews(
  bundle: ContainedPersonIntegratedHealthBundle
): readonly MedicationRegimenLinkMirrorView[] {
  return Object.freeze(
    [...(bundle.medicationRegimenLinks ?? [])]
      .sort((left, right) => left.regimenRef.localeCompare(right.regimenRef))
      .map((link) => toMedicationRegimenLinkView(link))
  )
}

function toCustodyStatusLinkView(link: CustodyStatusLink): CustodyStatusLinkMirrorView {
  return Object.freeze({
    custodyRefLabel: link.custodyRef,
    wiredRefLabel: link.wiredRef,
    custodyStageLabel: formatIntegratedHealthBundleEnumLabel(link.custodyStage),
    formerRoleCategoryLabel: formatIntegratedHealthBundleEnumLabel(link.formerRoleCategory),
    restrictionLevelLabel: link.restrictionLevel,
    rightsReviewPendingLabel: formatYesNo(link.rightsReviewPending),
  })
}

function sortedCustodyStatusLinkViews(
  bundle: ContainedPersonIntegratedHealthBundle
): readonly CustodyStatusLinkMirrorView[] {
  return Object.freeze(
    [...(bundle.custodyStatusLinks ?? [])]
      .sort((left, right) => left.custodyRef.localeCompare(right.custodyRef))
      .map((link) => toCustodyStatusLinkView(link))
  )
}

function toWelfareDebtAccountingLinkView(
  link: WelfareDebtAccountingLink
): WelfareDebtAccountingLinkMirrorView {
  return Object.freeze({
    debtRefLabel: link.debtRef,
    wiredRefLabel: link.wiredRef,
    severityBandLabel: formatIntegratedHealthBundleEnumLabel(link.severityBand),
    mitigationStateLabel: formatIntegratedHealthBundleEnumLabel(link.mitigationState),
    containmentBenefitScoreLabel: formatUnitScore(link.containmentBenefitScore),
  })
}

function sortedWelfareDebtAccountingLinkViews(
  bundle: ContainedPersonIntegratedHealthBundle
): readonly WelfareDebtAccountingLinkMirrorView[] {
  return Object.freeze(
    [...(bundle.welfareDebtAccountingLinks ?? [])]
      .sort((left, right) => left.debtRef.localeCompare(right.debtRef))
      .map((link) => toWelfareDebtAccountingLinkView(link))
  )
}

function isCoercedMedicationConsent(consentStatus: MedicationRegimenLink['consentStatus']): boolean {
  return consentStatus === 'compelled' || consentStatus === 'emergency' || consentStatus === 'covert'
}

function toRecordView(
  bundle: ContainedPersonIntegratedHealthBundle
): ContainedPersonIntegratedHealthBundleMirrorRecordView {
  const validation = validateContainedPersonIntegratedHealthBundle(bundle)

  const validationWarningLabels = Object.freeze(
    validation.issues
      .filter((issue) => issue.severity === 'warning')
      .map((issue) => issue.detail)
  )

  return Object.freeze({
    id: bundle.id,
    label: bundle.label,
    subjectRefLabel: bundle.subjectRef,
    mentalStateBandLabel: formatMentalStateBand(bundle.mentalStateBand),
    humaneCareRiskScoreLabel: formatUnitScore(bundle.humaneCareRiskScore),
    confidenceLabel: formatConfidence(bundle.confidence),
    therapeuticCareScheduleLinks: sortedScheduleLinkViews(bundle),
    medicationRegimenLinks: sortedMedicationRegimenLinkViews(bundle),
    custodyStatusLinks: sortedCustodyStatusLinkViews(bundle),
    welfareDebtAccountingLinks: sortedWelfareDebtAccountingLinkViews(bundle),
    validationWarningLabels,
    redactedFieldLabels: sortedRedactedFieldLabels(bundle),
  })
}

/** Read-only mirror over hydrated `containedPersonIntegratedHealthBundles`; does not re-validate dropped entries. */
export function getContainedPersonIntegratedHealthBundleMirrorView(
  game: GameState
): ContainedPersonIntegratedHealthBundleMirrorView {
  const bundles = listPersistedBundles(game)
  const week = game.week

  let criticalMentalStateCount = 0
  let distressedMentalStateCount = 0
  let lockdownEscalationLinkCount = 0
  let coercedMedicationLinkCount = 0
  let rightsReviewPendingCount = 0
  let unresolvedWelfareDebtLinkCount = 0

  const recordViews = bundles.map((bundle) => {
    if (bundle.mentalStateBand === 'critical') {
      criticalMentalStateCount += 1
    }

    if (bundle.mentalStateBand === 'distressed') {
      distressedMentalStateCount += 1
    }

    for (const link of bundle.therapeuticCareScheduleLinks ?? []) {
      if (link.lockdownEscalationLikely) {
        lockdownEscalationLinkCount += 1
      }
    }

    for (const link of bundle.medicationRegimenLinks ?? []) {
      if (isCoercedMedicationConsent(link.consentStatus)) {
        coercedMedicationLinkCount += 1
      }
    }

    for (const link of bundle.custodyStatusLinks ?? []) {
      if (link.rightsReviewPending) {
        rightsReviewPendingCount += 1
      }
    }

    for (const link of bundle.welfareDebtAccountingLinks ?? []) {
      if (link.mitigationState === 'unresolved' || link.mitigationState === 'escalated') {
        unresolvedWelfareDebtLinkCount += 1
      }
    }

    return toRecordView(bundle)
  })

  return Object.freeze({
    isEmpty: bundles.length === 0,
    summary: Object.freeze({
      totalBundles: bundles.length,
      criticalMentalStateCount,
      distressedMentalStateCount,
      lockdownEscalationLinkCount,
      coercedMedicationLinkCount,
      rightsReviewPendingCount,
      unresolvedWelfareDebtLinkCount,
      week,
    }),
    records: Object.freeze(recordViews),
  })
}
