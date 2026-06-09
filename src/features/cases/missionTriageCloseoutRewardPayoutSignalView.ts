import {
  deriveCloseoutRewardPayoutLineLabelsForReview,
  formatCloseoutRewardPayoutLineLabel,
  type CloseoutRewardPayoutLineKind,
} from '../../domain/postIncidentReviewCloseoutRewardPayoutSurfacing'
import type { PostIncidentCloseoutRewardBranch } from '../../domain/postIncidentReviewCloseoutRewardBranch'
import type { CaseInstance, GameState, ReportNote } from '../../domain/models'
import type { PostIncidentReviewRecord } from '../../domain/postIncidentReviewRegistry'

const MAX_PAYOUT_MARKERS = 2

const MARKER_STYLE = 'border-lime-500/40 bg-lime-500/10 text-lime-100'

const CASE_CLOSEOUT_REVIEW_REF_PATTERN = /^review:case-([a-zA-Z0-9_-]+)-closeout$/
const NEAR_CATASTROPHE_REVIEW_REF_PATTERN = /^review:near-catastrophe-([a-zA-Z0-9_-]+)$/

const PAYOUT_LINE_KIND_ORDER: readonly CloseoutRewardPayoutLineKind[] = [
  'funding_credit',
  'training_credit',
]

export interface MissionTriageCloseoutRewardPayoutSignalMarker {
  readonly id: string
  readonly label: string
  readonly className: string
  readonly title?: string
}

export interface MissionTriageCloseoutRewardPayoutSignals {
  readonly visible: boolean
  readonly markers: readonly MissionTriageCloseoutRewardPayoutSignalMarker[]
}

function normalizeCaseId(caseId: string): string {
  return caseId.trim()
}

function qualifyingCaseCloseoutReviewRef(caseId: string): string {
  return `review:case-${normalizeCaseId(caseId)}-closeout`
}

function nearCatastropheReviewRef(caseId: string): string {
  return `review:near-catastrophe-${normalizeCaseId(caseId)}`
}

function extractCaseIdFromReviewRef(reviewRef: unknown): string {
  if (typeof reviewRef !== 'string') {
    return ''
  }

  const caseCloseoutMatch = CASE_CLOSEOUT_REVIEW_REF_PATTERN.exec(reviewRef)
  if (caseCloseoutMatch?.[1]) {
    return caseCloseoutMatch[1]
  }

  const nearCatastropheMatch = NEAR_CATASTROPHE_REVIEW_REF_PATTERN.exec(reviewRef)
  if (nearCatastropheMatch?.[1]) {
    return nearCatastropheMatch[1]
  }

  return ''
}

function collectLinkedReviewRecords(
  caseId: string,
  game: GameState
): readonly PostIncidentReviewRecord[] {
  const records = game.postIncidentReviewRecords ?? {}
  const refs = [qualifyingCaseCloseoutReviewRef(caseId), nearCatastropheReviewRef(caseId)].sort(
    (left, right) => left.localeCompare(right)
  )

  return refs
    .map((ref) => records[ref])
    .filter((record): record is PostIncidentReviewRecord => record !== undefined)
}

function isRewardBranch(value: unknown): value is PostIncidentCloseoutRewardBranch {
  return typeof value === 'string' && value.length > 0
}

function payoutLabelsFromReportNote(note: ReportNote): readonly string[] {
  if (note.type !== 'post_incident_review.closeout_reward_payout') {
    return []
  }

  const branch = note.metadata?.rewardBranch
  const payoutKinds = note.metadata?.payoutKinds
  if (!isRewardBranch(branch) || !Array.isArray(payoutKinds)) {
    return []
  }

  const orderedKinds = PAYOUT_LINE_KIND_ORDER.filter((kind) => payoutKinds.includes(kind))
  return orderedKinds.map((kind) => formatCloseoutRewardPayoutLineLabel(kind, branch))
}

function collectPayoutLabelsFromReportNotes(
  caseId: string,
  game: GameState
): readonly string[] {
  const normalizedCaseId = normalizeCaseId(caseId)
  const labels: string[] = []
  const seen = new Set<string>()

  for (const report of game.reports ?? []) {
    for (const note of report.notes ?? []) {
      const linkedCaseId = extractCaseIdFromReviewRef(note.metadata?.reviewRef)
      if (linkedCaseId !== normalizedCaseId) {
        continue
      }

      for (const label of payoutLabelsFromReportNote(note)) {
        if (seen.has(label)) {
          continue
        }

        seen.add(label)
        labels.push(label)
      }
    }
  }

  return sortPayoutLineLabels(labels)
}

function sortPayoutLineLabels(labels: readonly string[]): string[] {
  return [...labels].sort((left, right) => {
    const leftIsFunding = left.startsWith('Funding credit') ? 0 : 1
    const rightIsFunding = right.startsWith('Funding credit') ? 0 : 1

    if (leftIsFunding !== rightIsFunding) {
      return leftIsFunding - rightIsFunding
    }

    return left.localeCompare(right)
  })
}

function compactPayoutChipLabel(fullLabel: string): string {
  if (fullLabel.startsWith('Funding credit')) {
    return 'Closeout: funding'
  }

  if (fullLabel.startsWith('Training credit')) {
    return 'Closeout: training'
  }

  return 'Closeout: reward'
}

function payoutMarkerId(fullLabel: string): string {
  if (fullLabel.startsWith('Funding credit')) {
    return 'closeout-reward-payout:funding'
  }

  if (fullLabel.startsWith('Training credit')) {
    return 'closeout-reward-payout:training'
  }

  return 'closeout-reward-payout:unknown'
}

function pushMarker(
  markers: MissionTriageCloseoutRewardPayoutSignalMarker[],
  marker: MissionTriageCloseoutRewardPayoutSignalMarker
) {
  if (markers.length >= MAX_PAYOUT_MARKERS) {
    return
  }

  markers.push(marker)
}

export function buildMissionTriageCloseoutRewardPayoutSignals(
  caseData: CaseInstance,
  game: GameState
): MissionTriageCloseoutRewardPayoutSignals {
  const resolvedCase = game.cases[caseData.id] ?? caseData
  const fundingState = game.agency?.fundingState
  const seen = new Set<string>()
  const labels: string[] = []

  for (const record of collectLinkedReviewRecords(resolvedCase.id, game)) {
    for (const label of deriveCloseoutRewardPayoutLineLabelsForReview(record, fundingState)) {
      if (seen.has(label)) {
        continue
      }

      seen.add(label)
      labels.push(label)
    }
  }

  if (labels.length === 0) {
    for (const label of collectPayoutLabelsFromReportNotes(resolvedCase.id, game)) {
      if (seen.has(label)) {
        continue
      }

      seen.add(label)
      labels.push(label)
    }
  }

  const orderedLabels = sortPayoutLineLabels(labels)
  if (orderedLabels.length === 0) {
    return { visible: false, markers: [] }
  }

  const markers: MissionTriageCloseoutRewardPayoutSignalMarker[] = []

  for (const fullLabel of orderedLabels) {
    pushMarker(markers, {
      id: payoutMarkerId(fullLabel),
      label: compactPayoutChipLabel(fullLabel),
      className: MARKER_STYLE,
      title: fullLabel,
    })
  }

  return {
    visible: markers.length > 0,
    markers,
  }
}
