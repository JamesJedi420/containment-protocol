// cspell:words scoutable
import {
  normalizePotentialTier,
  scoreToExactPotentialTier,
  shiftPotentialTier,
  stepPotentialTierToward,
  type LivePotentialTier,
} from '../agentPotential'
import { clamp } from '../math'
import type { Candidate, CandidateScoutReport, CandidateScoutStage } from './types'
import { getCandidateWeeklyCost, isCandidateHireable, normalizeCandidateCategory } from './helpers'

function getCandidateScoreHint(candidate: Candidate) {
  if (typeof candidate.evaluation.overallValue === 'number') {
    return candidate.evaluation.overallValue
  }

  if (typeof candidate.evaluation.overall === 'number') {
    return candidate.evaluation.overall
  }

  const stats = candidate.agentData?.stats

  if (stats) {
    return (stats.combat + stats.investigation + stats.utility + stats.social) / 4
  }

  return 50
}

function getOffsetProjectedTier(actualTier: LivePotentialTier, distance: number, roll: number) {
  const primaryDirection = roll >= 0.5 ? 1 : -1
  const primaryProjection = shiftPotentialTier(actualTier, primaryDirection * distance)

  if (primaryProjection !== actualTier) {
    return primaryProjection
  }

  return shiftPotentialTier(actualTier, -primaryDirection * distance)
}

function isCandidateScoutStage(value: number | undefined): value is CandidateScoutStage {
  return value === 1 || value === 2 || value === 3
}

function isCandidateScoutReport(
  value: Pick<Candidate, 'scoutReport'> | CandidateScoutReport | undefined
): value is CandidateScoutReport {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'projectedTier' in value &&
    'exactKnown' in value &&
    'confidence' in value
  )
}

function isScoutReportConfirmed(report: CandidateScoutReport | undefined) {
  return report?.exactKnown === true || report?.confidence === 'confirmed'
}

export function isCandidateScoutConfirmed(
  candidate: Pick<Candidate, 'scoutReport'> | CandidateScoutReport | undefined
) {
  const report = isCandidateScoutReport(candidate)
    ? candidate
    : (candidate?.scoutReport ?? undefined)

  return isScoutReportConfirmed(report)
}

export function getCandidateScoutStage(
  candidate: Pick<Candidate, 'scoutReport'> | CandidateScoutReport | undefined
): CandidateScoutStage {
  const report = isCandidateScoutReport(candidate)
    ? candidate
    : (candidate?.scoutReport ?? undefined)

  if (isCandidateScoutStage(report?.stage)) {
    return report.stage
  }

  return isScoutReportConfirmed(report) ? 3 : 1
}

export function resolveCandidateActualPotentialTier(candidate: Candidate): LivePotentialTier {
  if (candidate.actualPotentialTier) {
    return candidate.actualPotentialTier
  }

  if (candidate.evaluation.potentialTier) {
    return normalizePotentialTier(
      candidate.evaluation.potentialTier,
      candidate.agentData?.stats,
      getCandidateScoreHint(candidate)
    )
  }

  return scoreToExactPotentialTier(getCandidateScoreHint(candidate))
}

export function getCandidateScoutCost(candidate: Candidate) {
  const baseCost = getCandidateWeeklyCost(candidate) ?? 12
  return clamp(Math.round(baseCost * 0.6) + 4, 8, 28)
}

export function isCandidateScoutable(candidate: Candidate) {
  return (
    normalizeCandidateCategory(candidate.category) === 'agent' &&
    isCandidateHireable(candidate.hireStatus)
  )
}

export function getNextCandidateScoutStage(
  candidate: Pick<Candidate, 'scoutReport'> | CandidateScoutReport | undefined
): CandidateScoutStage | null {
  const report = isCandidateScoutReport(candidate)
    ? candidate
    : (candidate?.scoutReport ?? undefined)

  if (!report) {
    return 1
  }

  const currentStage = getCandidateScoutStage(report)

  if (isScoutReportConfirmed(report) || currentStage >= 3) {
    return null
  }

  return (currentStage + 1) as CandidateScoutStage
}

function buildInitialScoutReport(
  actualTier: LivePotentialTier,
  reliability: number,
  rng: () => number,
  week: number
): CandidateScoutReport {
  const exactChance = reliability
  const adjacentChance = clamp(0.25 + (reliability - 0.42) * 0.45, 0.18, 0.45)
  const roll = rng()

  let projectedTier = actualTier
  let distance = 0

  if (roll > exactChance) {
    distance = roll <= exactChance + adjacentChance ? 1 : 2
    projectedTier = getOffsetProjectedTier(actualTier, distance, rng())
  }

  return {
    stage: 1,
    projectedTier,
    exactKnown: false,
    confidence: distance === 0 && reliability >= 0.56 ? 'medium' : 'low',
    scoutedWeek: week,
  }
}

function buildFollowUpScoutReport(
  previousReport: CandidateScoutReport,
  actualTier: LivePotentialTier,
  week: number
): CandidateScoutReport {
  return {
    stage: 2,
    projectedTier:
      previousReport.projectedTier === actualTier
        ? actualTier
        : stepPotentialTierToward(previousReport.projectedTier, actualTier),
    exactKnown: false,
    confidence: previousReport.confidence === 'low' ? 'medium' : 'high',
    scoutedWeek: week,
  }
}

export function buildCandidateScoutReport(
  candidate: Candidate,
  rng: () => number,
  options: {
    clearanceLevel: number
    week: number
    reliabilityBonus?: number
  }
): CandidateScoutReport {
  const actualTier = resolveCandidateActualPotentialTier(candidate)
  const nextStage = getNextCandidateScoutStage(candidate)

  if (nextStage === null) {
    return (
      candidate.scoutReport ?? {
        stage: 3,
        projectedTier: actualTier,
        confirmedTier: actualTier,
        exactKnown: true,
        confidence: 'confirmed',
        scoutedWeek: options.week,
      }
    )
  }

  const reliability = clamp(
    0.42 +
      Math.max(0, options.clearanceLevel) * 0.08 +
      candidate.revealLevel * 0.1 +
      (candidate.evaluation.potentialVisible ? 0.06 : 0) +
      (options.reliabilityBonus ?? 0),
    0.2,
    0.88
  )

  if (nextStage === 1) {
    return buildInitialScoutReport(actualTier, reliability, rng, options.week)
  }

  if (nextStage === 2 && candidate.scoutReport) {
    return buildFollowUpScoutReport(candidate.scoutReport, actualTier, options.week)
  }

  return {
    stage: 3,
    projectedTier: actualTier,
    confirmedTier: actualTier,
    exactKnown: true,
    confidence: 'confirmed',
    scoutedWeek: options.week,
  }
}
