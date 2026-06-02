/**
 * SPE-854 parent integration slice 1: mixed-source intake → mission triage/routing.
 *
 * Links persisted information intake reports to mission cases and surfaces
 * operational signals through triage score adjustments and reason codes.
 */

import type { InformationIntakeReportRecord } from './informationIntakeReport'
import {
  evaluateTopicIntakeCoverage,
  type PublicSignalCoverageBand,
} from './publicSignalCoverage'
import type { CaseInstance, GameState, MissionIntakeSource } from './models'

function normalizeToken(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().toLowerCase()
}

export function resolveMissionIntakeTopicKeys(
  currentCase: Pick<CaseInstance, 'id' | 'tags'>
): readonly string[] {
  const keys = new Set<string>([normalizeToken(currentCase.id)])

  for (const tag of currentCase.tags) {
    const normalized = normalizeToken(tag)
    if (!normalized) {
      continue
    }

    keys.add(normalized)
    keys.add(normalized.startsWith('topic:') ? normalized : `topic:${normalized}`)
  }

  return [...keys].sort((left, right) => left.localeCompare(right))
}

export function listInformationIntakeReportsForMission(
  state: Pick<GameState, 'informationIntakeReports'>,
  currentCase: Pick<CaseInstance, 'id' | 'tags'>
): InformationIntakeReportRecord[] {
  const reports = state.informationIntakeReports
  if (!reports) {
    return []
  }

  const topicKeys = new Set(resolveMissionIntakeTopicKeys(currentCase))
  const linked: InformationIntakeReportRecord[] = []

  for (const report of Object.values(reports)) {
    const topicRef = normalizeToken(report.topicRef)
    if (topicKeys.has(topicRef)) {
      linked.push(report)
    }
  }

  return linked.sort((left, right) => left.id.localeCompare(right.id))
}

export interface MissionIntakeInformationRoutingSignals {
  readonly linkedReportCount: number
  readonly coverageBand: PublicSignalCoverageBand | null
  readonly scoreAdjustment: number
  readonly reasonCodes: string[]
  readonly intakeSourceOverride: MissionIntakeSource | null
}

const NEUTRAL_SIGNALS: MissionIntakeInformationRoutingSignals = {
  linkedReportCount: 0,
  coverageBand: null,
  scoreAdjustment: 0,
  reasonCodes: [],
  intakeSourceOverride: null,
}

function coverageReasonCode(band: PublicSignalCoverageBand): string {
  return `intake-coverage-${band.replace(/_/g, '-')}`
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.max(min, Math.min(max, Math.trunc(value)))
}

export function deriveMissionIntakeInformationSignals(
  state: Pick<GameState, 'informationIntakeReports'>,
  currentCase: Pick<CaseInstance, 'id' | 'tags' | 'contract' | 'stage' | 'factionId'>
): MissionIntakeInformationRoutingSignals {
  const linkedReports = listInformationIntakeReportsForMission(state, currentCase)
  if (linkedReports.length === 0) {
    return NEUTRAL_SIGNALS
  }

  const primaryTopicRef = normalizeToken(linkedReports[0]?.topicRef) || currentCase.id
  const coverage = evaluateTopicIntakeCoverage({
    topicId: primaryTopicRef,
    reports: linkedReports,
  })
  const summary = coverage.intakeSummary

  let scoreAdjustment = 0
  const reasonCodes: string[] = ['intake-linked-reports']

  if (summary.hasConflictingVerification) {
    scoreAdjustment += 6
    reasonCodes.push('intake-verification-conflict')
  }

  if (summary.hasIncompleteIntake) {
    scoreAdjustment += 4
    reasonCodes.push('intake-incomplete')
  }

  if (coverage.coverageBand === 'blind_spot') {
    scoreAdjustment += 5
    reasonCodes.push('intake-coverage-blind-spot')
  } else if (coverage.coverageBand === 'public_led') {
    scoreAdjustment += 3
    reasonCodes.push('intake-coverage-public-led')
  } else {
    reasonCodes.push(coverageReasonCode(coverage.coverageBand))
  }

  if (
    summary.dominantVerificationStatus === 'verified' ||
    summary.dominantVerificationStatus === 'escalated_confidence'
  ) {
    scoreAdjustment -= 2
    reasonCodes.push('intake-verification-corroborated')
  }

  if (summary.rumorSeparatedCount > 0) {
    reasonCodes.push('intake-rumor-separated')
  }

  let intakeSourceOverride: MissionIntakeSource | null = null
  const wouldDefaultToScripted =
    !currentCase.contract &&
    currentCase.stage <= 1 &&
    !currentCase.factionId &&
    !currentCase.id.startsWith('case-spawned-')

  if (
    wouldDefaultToScripted &&
    (coverage.coverageBand === 'blind_spot' ||
      coverage.coverageBand === 'public_led' ||
      summary.hasConflictingVerification)
  ) {
    intakeSourceOverride = 'pressure'
    reasonCodes.push('intake-nonstandard-hook')
  }

  return {
    linkedReportCount: linkedReports.length,
    coverageBand: coverage.coverageBand,
    scoreAdjustment: clampInteger(scoreAdjustment, -8, 18),
    reasonCodes: [...new Set(reasonCodes)].sort((left, right) => left.localeCompare(right)),
    intakeSourceOverride,
  }
}
