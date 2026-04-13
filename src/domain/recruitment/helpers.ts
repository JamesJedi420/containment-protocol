import type {
  Candidate,
  CandidateCategory,
  CandidateCostEstimate,
  CandidateEvaluation,
  CandidatePipelineStatus,
  CandidatePotentialTier,
  CandidateRevealLevel,
  RecruitmentFunnelStage,
  StaffCandidateSpecialty,
} from './types'

const FUNNEL_STAGE_ORDER: RecruitmentFunnelStage[] = [
  'prospect',
  'contacted',
  'screening',
  'hired',
  'lost',
]

export const CANDIDATE_REVEAL_THRESHOLDS = {
  potential: 1,
  overall: 2,
} as const

export function isCandidateFieldVisible(
  revealLevel: CandidateRevealLevel,
  threshold: CandidateRevealLevel
) {
  return revealLevel >= threshold
}

export function getCandidateWeeklyCost(candidate: Candidate) {
  return candidate.weeklyCost ?? candidate.weeklyWage
}

export function deriveCandidateCostEstimate(weeklyCost: number | undefined): CandidateCostEstimate {
  if (weeklyCost === undefined) {
    return 'unknown'
  }

  if (weeklyCost <= 16) {
    return 'low'
  }

  if (weeklyCost <= 30) {
    return 'moderate'
  }

  return 'high'
}

export function normalizeCandidateCategory(
  category: CandidateCategory
): 'agent' | 'staff' | 'specialist' | 'instructor' {
  if (category === 'fieldTech' || category === 'analyst') {
    return 'specialist'
  }

  return category
}

export function normalizeCandidateHireStatus(
  status: CandidatePipelineStatus
): 'available' | 'reserved' | 'expired' {
  if (status === 'candidate') {
    return 'available'
  }

  return status
}

export function normalizeRecruitmentFunnelStage(
  stage: unknown,
  fallback: RecruitmentFunnelStage = 'prospect'
): RecruitmentFunnelStage {
  if (typeof stage !== 'string') {
    return fallback
  }

  const normalized = stage.trim() as RecruitmentFunnelStage
  return FUNNEL_STAGE_ORDER.includes(normalized) ? normalized : fallback
}

export function getCandidateFunnelStage(candidate: Candidate): RecruitmentFunnelStage {
  if (candidate.funnelStage) {
    return normalizeRecruitmentFunnelStage(candidate.funnelStage)
  }

  if (normalizeCandidateHireStatus(candidate.hireStatus) === 'expired') {
    return 'lost'
  }

  return 'prospect'
}

export function canTransitionCandidateFunnelStage(
  fromStage: RecruitmentFunnelStage,
  toStage: RecruitmentFunnelStage
) {
  if (fromStage === toStage) {
    return true
  }

  const validTransitions: Record<RecruitmentFunnelStage, RecruitmentFunnelStage[]> = {
    prospect: ['contacted', 'lost'],
    contacted: ['screening', 'lost'],
    screening: ['hired', 'lost'],
    hired: [],
    lost: [],
  }

  return validTransitions[fromStage].includes(toStage)
}

export function isCandidateHireable(status: CandidatePipelineStatus) {
  return normalizeCandidateHireStatus(status) === 'available'
}

export function normalizeStaffCandidateSpecialty(
  specialty: StaffCandidateSpecialty
): 'intel' | 'logistics' | 'fabrication' | 'analysis' {
  if (specialty === 'intelligence') {
    return 'intel'
  }

  return specialty
}

export function scoreToCandidatePotentialTier(score: number): CandidatePotentialTier {
  if (score >= 78) {
    return 'high'
  }

  if (score >= 52) {
    return 'mid'
  }

  return 'low'
}

export function buildCandidateEvaluation(
  revealLevel: CandidateRevealLevel,
  input: {
    overall?: number
    potentialTier?: CandidatePotentialTier
    rumorTags?: string[]
    impression?: string
    teamwork?: string
    outlook?: string
  }
): CandidateEvaluation {
  const overallVisible = isCandidateFieldVisible(revealLevel, CANDIDATE_REVEAL_THRESHOLDS.overall)
  const potentialVisible = isCandidateFieldVisible(
    revealLevel,
    CANDIDATE_REVEAL_THRESHOLDS.potential
  )

  return {
    overallVisible,
    overall: overallVisible ? input.overall : undefined,
    overallValue: input.overall,
    potentialVisible,
    potentialTier: input.potentialTier,
    rumorTags: input.rumorTags ?? [],
    impression: input.impression,
    teamwork: input.teamwork,
    outlook: input.outlook,
  }
}

export function getCandidateOverall(candidate: Candidate) {
  return candidate.evaluation.overall ?? candidate.evaluation.overallValue
}

export function getCandidatePool<TState extends { candidates: Candidate[] }>(state: TState) {
  return state.candidates
}

export function syncCandidatePoolState<TState extends { candidates: Candidate[] }>(
  state: TState,
  candidatePool: Candidate[]
) {
  return {
    ...state,
    candidates: candidatePool,
  }
}

/** @deprecated Use getCandidatePool instead. */
export function getRecruitmentPool<TState extends { candidates: Candidate[] }>(state: TState) {
  return getCandidatePool(state)
}

/** @deprecated Use syncCandidatePoolState instead. */
export function syncRecruitmentPoolState<TState extends { candidates: Candidate[] }>(
  state: TState,
  recruitmentPool: Candidate[]
) {
  return syncCandidatePoolState(state, recruitmentPool)
}
