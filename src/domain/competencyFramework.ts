import { clamp } from './math'
import { COMPETENCY_CALIBRATION } from './sim/calibration'
import type { Agent } from './models'

export type CompetencyDomain =
  | 'response'
  | 'containment'
  | 'technical'
  | 'research'
  | 'medical'
  | 'social'

export type CompetencyVisibility = 'known' | 'estimated'

export type CompetencyAgentSource = Pick<Agent, 'id' | 'role' | 'baseStats' | 'progression'>

export interface CompetencyProfile {
  agentId: string
  role: Agent['role']
  scores: Record<CompetencyDomain, number>
  lastUsedWeekByDomain: Partial<Record<CompetencyDomain, number>>
  visibility: CompetencyVisibility
}

export interface CompetencyTaskRequirement {
  taskId: string
  requiredDomain: CompetencyDomain
  successThreshold: number
  partialThreshold: number
  secondaryDomain?: CompetencyDomain
  secondaryWeight?: number
  requiredCertifications?: string[]
}

export interface CompetencyEvaluationResult {
  taskId: string
  outcome: 'success' | 'partial' | 'fail'
  score: number
  thresholds: {
    success: number
    partial: number
  }
  reasons: string[]
}

export interface CertificationGateResult {
  allowed: boolean
  missingCertifications: string[]
}

function normalizeScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return clamp(Math.round(value), 0, COMPETENCY_CALIBRATION.maxScore)
}

function normalizeWeek(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.trunc(value))
}

function getPotentialVisibility(agent: CompetencyAgentSource): CompetencyVisibility {
  const confidence = agent.progression?.potentialIntel?.confidence
  return confidence === 'confirmed' || confidence === 'high' ? 'known' : 'estimated'
}

function deriveBaselineScores(agent: CompetencyAgentSource): Record<CompetencyDomain, number> {
  const combat = normalizeScore(agent.baseStats.combat)
  const investigation = normalizeScore(agent.baseStats.investigation)
  const utility = normalizeScore(agent.baseStats.utility)
  const social = normalizeScore(agent.baseStats.social)

  const roleMedicalBonus = agent.role === 'medic' ? 15 : 0
  const readinessImpact = agent.progression?.trainingProfile?.readinessImpact ?? 0
  const readinessOffset = Math.round(readinessImpact * 0.1)

  return {
    response: normalizeScore(combat + readinessOffset),
    containment: normalizeScore(combat * 0.35 + utility * 0.65 + readinessOffset),
    technical: normalizeScore(utility + readinessOffset),
    research: normalizeScore(investigation + readinessOffset),
    medical: normalizeScore(utility * 0.7 + investigation * 0.3 + roleMedicalBonus + readinessOffset),
    social: normalizeScore(social + readinessOffset),
  }
}

/**
 * Builds a normalized competency profile from existing agent progression/base stats.
 * Reuses existing persistence shape; no schema mutation.
 */
export function buildCompetencyProfileFromAgent(agent: CompetencyAgentSource): CompetencyProfile {
  const baselineScores = deriveBaselineScores(agent)
  const lastUsedWeek = normalizeWeek(agent.progression?.lastTrainingWeek ?? 0)

  return {
    agentId: agent.id,
    role: agent.role,
    scores: baselineScores,
    lastUsedWeekByDomain: {
      response: lastUsedWeek,
      containment: lastUsedWeek,
      technical: lastUsedWeek,
      research: lastUsedWeek,
      medical: lastUsedWeek,
      social: lastUsedWeek,
    },
    visibility: getPotentialVisibility(agent),
  }
}

/**
 * Deterministic thresholded competency evaluation.
 * Optionally blends a secondary domain for compact two-domain checks.
 */
export function evaluateCompetencyTask(
  profile: CompetencyProfile,
  requirement: CompetencyTaskRequirement
): CompetencyEvaluationResult {
  const primaryScore = profile.scores[requirement.requiredDomain]
  const secondaryWeight = requirement.secondaryDomain
    ? clamp(requirement.secondaryWeight ?? 0.35, 0, 1)
    : 0
  const secondaryScore = requirement.secondaryDomain
    ? profile.scores[requirement.secondaryDomain]
    : 0

  const combinedScore = normalizeScore(primaryScore + secondaryScore * secondaryWeight)

  const successThreshold = normalizeScore(requirement.successThreshold)
  const partialThreshold = normalizeScore(
    Math.min(requirement.partialThreshold, successThreshold)
  )

  const outcome: CompetencyEvaluationResult['outcome'] =
    combinedScore >= successThreshold
      ? 'success'
      : combinedScore >= partialThreshold
        ? 'partial'
        : 'fail'

  const reasons = [
    `primary:${requirement.requiredDomain}=${primaryScore}`,
    ...(requirement.secondaryDomain
      ? [
          `secondary:${requirement.secondaryDomain}=${secondaryScore}`,
          `secondaryWeight=${secondaryWeight}`,
        ]
      : []),
    `combined=${combinedScore}`,
    `thresholds success>=${successThreshold} partial>=${partialThreshold}`,
  ]

  return {
    taskId: requirement.taskId,
    outcome,
    score: combinedScore,
    thresholds: {
      success: successThreshold,
      partial: partialThreshold,
    },
    reasons,
  }
}

/**
 * Applies deterministic use-based growth with diminishing gains near cap.
 */
export function applyCompetencyUse(
  profile: CompetencyProfile,
  domain: CompetencyDomain,
  week: number,
  intensity = 1
): CompetencyProfile {
  const boundedIntensity = clamp(Math.trunc(intensity), 1, 5)
  const current = profile.scores[domain]
  const max = COMPETENCY_CALIBRATION.maxScore
  const diminishingFactor = clamp(1 - (current / max) * 0.75, 0.25, 1)
  const rawGain = COMPETENCY_CALIBRATION.baseUseGain * boundedIntensity
  const gain = Math.max(1, Math.round(rawGain * diminishingFactor))

  return {
    ...profile,
    scores: {
      ...profile.scores,
      [domain]: normalizeScore(current + gain),
    },
    lastUsedWeekByDomain: {
      ...profile.lastUsedWeekByDomain,
      [domain]: normalizeWeek(week),
    },
  }
}

/**
 * Applies deterministic decay to neglected competencies after a start threshold.
 */
export function applyCompetencyDecay(
  profile: CompetencyProfile,
  currentWeek: number
): CompetencyProfile {
  const normalizedWeek = normalizeWeek(currentWeek)
  const nextScores = { ...profile.scores }

  const domains: CompetencyDomain[] = [
    'response',
    'containment',
    'technical',
    'research',
    'medical',
    'social',
  ]

  for (const domain of domains) {
    const lastUsed = normalizeWeek(profile.lastUsedWeekByDomain[domain] ?? 0)
    const inactiveWeeks = Math.max(0, normalizedWeek - lastUsed)

    if (inactiveWeeks <= COMPETENCY_CALIBRATION.decayStartAfterWeeks) {
      continue
    }

    const decayWeeks = inactiveWeeks - COMPETENCY_CALIBRATION.decayStartAfterWeeks
    const decayAmount = decayWeeks * COMPETENCY_CALIBRATION.decayPerWeek
    nextScores[domain] = normalizeScore(
      Math.max(
        COMPETENCY_CALIBRATION.minimumScore,
        profile.scores[domain] - decayAmount
      )
    )
  }

  return {
    ...profile,
    scores: nextScores,
  }
}

/**
 * Reads existing certification state on agent progression and evaluates access gates.
 */
export function meetsCertificationGate(
  agent: Pick<Agent, 'progression'>,
  requiredCertifications: string[]
): CertificationGateResult {
  if (requiredCertifications.length === 0) {
    return {
      allowed: true,
      missingCertifications: [],
    }
  }

  const certifications =
    (agent.progression?.certifications ?? {}) as Record<string, { state?: string }>

  const missing = requiredCertifications.filter(
    (certificationId) => certifications[certificationId]?.state !== 'certified'
  )

  return {
    allowed: missing.length === 0,
    missingCertifications: missing,
  }
}
