import type { GameState } from '../../domain/models'
import {
  validateContainedPersonIntegratedHealthBundle,
  type ContainedPersonIntegratedHealthBundle,
  type MentalStateBand,
  type TherapeuticCareScheduleLink,
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

export interface ContainedPersonIntegratedHealthBundleMirrorRecordView {
  id: string
  label: string
  subjectRefLabel: string
  mentalStateBandLabel: string
  humaneCareRiskScoreLabel: string
  confidenceLabel: string
  therapeuticCareScheduleLinks: readonly TherapeuticCareScheduleLinkMirrorView[]
  validationWarningLabels: readonly string[]
  redactedFieldLabels: readonly string[]
}

export interface ContainedPersonIntegratedHealthBundleMirrorSummaryView {
  totalBundles: number
  criticalMentalStateCount: number
  distressedMentalStateCount: number
  lockdownEscalationLinkCount: number
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

    return toRecordView(bundle)
  })

  return Object.freeze({
    isEmpty: bundles.length === 0,
    summary: Object.freeze({
      totalBundles: bundles.length,
      criticalMentalStateCount,
      distressedMentalStateCount,
      lockdownEscalationLinkCount,
      week,
    }),
    records: Object.freeze(recordViews),
  })
}
