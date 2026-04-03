import { clamp } from '../math'
import type { DomainStats } from '../agent/models'
import type {
  Candidate,
  CandidateCostEstimate,
  CandidateLegacyStats,
  CandidatePotentialTier,
  CandidateRevealLevel,
} from './types'
import { buildCandidateEvaluation, deriveCandidateCostEstimate, getCandidateWeeklyCost } from './helpers'

function toRevealLevel(value: number): CandidateRevealLevel {
  return clamp(Math.trunc(value), 0, 2) as CandidateRevealLevel
}

function buildPartialLegacyStats(
  stats: CandidateLegacyStats | undefined
): Partial<CandidateLegacyStats> | undefined {
  if (!stats) {
    return undefined
  }

  return {
    combat: Math.round(stats.combat / 10) * 10,
    investigation: Math.round(stats.investigation / 10) * 10,
    utility: Math.round(stats.utility / 10) * 10,
    social: Math.round(stats.social / 10) * 10,
  }
}

function buildPartialDomainStats(
  stats: Partial<DomainStats> | undefined
): Partial<DomainStats> | undefined {
  if (!stats) {
    return undefined
  }

  return {
    physical: stats.physical
      ? {
          strength: Math.round(stats.physical.strength / 10) * 10,
          endurance: Math.round(stats.physical.endurance / 10) * 10,
        }
      : undefined,
    tactical: stats.tactical
      ? {
          awareness: Math.round(stats.tactical.awareness / 10) * 10,
          reaction: Math.round(stats.tactical.reaction / 10) * 10,
        }
      : undefined,
    cognitive: stats.cognitive
      ? {
          analysis: Math.round(stats.cognitive.analysis / 10) * 10,
          investigation: Math.round(stats.cognitive.investigation / 10) * 10,
        }
      : undefined,
    social: stats.social
      ? {
          negotiation: Math.round(stats.social.negotiation / 10) * 10,
          influence: Math.round(stats.social.influence / 10) * 10,
        }
      : undefined,
    stability: stats.stability
      ? {
          resistance: Math.round(stats.stability.resistance / 10) * 10,
          tolerance: Math.round(stats.stability.tolerance / 10) * 10,
        }
      : undefined,
    technical: stats.technical
      ? {
          equipment: Math.round(stats.technical.equipment / 10) * 10,
          anomaly: Math.round(stats.technical.anomaly / 10) * 10,
        }
      : undefined,
  }
}

function deriveCandidatePotentialTier(candidate: Candidate): CandidatePotentialTier | undefined {
  return candidate.evaluation.potentialTier
}

function deriveCandidateOverall(candidate: Candidate) {
  return candidate.evaluation.overallValue ?? candidate.evaluation.overall
}

function deriveVisibleCostEstimate(
  candidate: Candidate,
  revealLevel: CandidateRevealLevel
): CandidateCostEstimate | undefined {
  if (revealLevel < 1) {
    return undefined
  }

  return candidate.costEstimate ?? deriveCandidateCostEstimate(getCandidateWeeklyCost(candidate))
}

export function revealCandidate(candidate: Candidate, revealAmount: number): Candidate {
  const nextRevealLevel = toRevealLevel(candidate.revealLevel + Math.max(0, revealAmount))
  const evaluation = buildCandidateEvaluation(nextRevealLevel, {
    overall: deriveCandidateOverall(candidate),
    potentialTier: deriveCandidatePotentialTier(candidate),
    rumorTags: candidate.evaluation.rumorTags,
    impression: candidate.evaluation.impression,
    teamwork: candidate.evaluation.teamwork,
    outlook: candidate.evaluation.outlook,
  })

  if (candidate.category === 'agent' && candidate.agentData) {
    return {
      ...candidate,
      revealLevel: nextRevealLevel,
      costEstimate: deriveVisibleCostEstimate(candidate, nextRevealLevel),
      evaluation,
      agentData: {
        ...candidate.agentData,
        visibleStats:
          nextRevealLevel >= 2
            ? candidate.agentData.stats
            : nextRevealLevel === 1
              ? buildPartialLegacyStats(candidate.agentData.stats)
              : undefined,
        visibleDomainStats:
          nextRevealLevel >= 2
            ? candidate.agentData.domainStats
            : nextRevealLevel === 1
              ? buildPartialDomainStats(candidate.agentData.domainStats)
              : undefined,
      },
    }
  }

  if (candidate.category === 'staff' && candidate.staffData) {
    return {
      ...candidate,
      revealLevel: nextRevealLevel,
      costEstimate: deriveVisibleCostEstimate(candidate, nextRevealLevel),
      evaluation,
      staffData: {
        ...candidate.staffData,
        visibleEfficiency:
          nextRevealLevel >= 2
            ? candidate.staffData.efficiency
            : nextRevealLevel === 1 && candidate.staffData.efficiency !== undefined
              ? Math.round(candidate.staffData.efficiency / 10) * 10
              : undefined,
      },
    }
  }

  return {
    ...candidate,
    revealLevel: nextRevealLevel,
    costEstimate: deriveVisibleCostEstimate(candidate, nextRevealLevel),
    evaluation,
  }
}
