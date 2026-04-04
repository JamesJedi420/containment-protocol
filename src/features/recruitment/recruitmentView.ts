import { type Candidate, type GameState } from '../../domain/models'
import { ROLE_LABELS } from '../../data/copy'
import { filterCandidates, type CandidateFilters } from '../../domain/sim/candidateFilter'
import { assessCandidateScouting } from '../../domain/sim/recruitmentScouting'
import {
  getCandidateHireRole,
  getCandidatePool,
  getCandidateOverall,
  getCandidateWeeklyCost,
  normalizeCandidateCategory,
  normalizeStaffCandidateSpecialty,
  previewCandidate,
  type CandidatePreview,
} from '../../domain/recruitment'

export interface RecruitmentViewFilters extends CandidateFilters {
  search?: string
  expiringSoonOnly?: boolean
  sort?: 'expiry' | 'overall' | 'wage' | 'name'
}

export interface RecruitmentCandidateView {
  candidate: Candidate
  roleLabel: string
  hireOutcomeLabel?: string
  overallLabel: string
  potentialLabel: string
  scoutLabel: string
  scoutActionLabel: string
  scoutCost?: number
  canScout: boolean
  scoutBlockedReason?: string
  expiringSoon: boolean
  hiddenOverall: boolean
  preview: CandidatePreview
}

export function getRecruitmentCandidateViews(
  game: GameState,
  filters: RecruitmentViewFilters = {}
): RecruitmentCandidateView[] {
  const recruitmentPool = getCandidatePool(game)
  const search = filters.search?.trim().toLowerCase() ?? ''
  const filtered = filterCandidates(recruitmentPool, filters).filter((candidate) => {
    if (filters.expiringSoonOnly && candidate.expiryWeek > game.week + 1) {
      return false
    }

    if (search.length === 0) {
      return true
    }

    const haystack = [
      candidate.name,
      candidate.category,
      candidate.agentData?.role,
      candidate.agentData?.specialization,
      candidate.staffData?.specialty,
      candidate.evaluation.impression,
      candidate.evaluation.outlook,
      ...candidate.evaluation.rumorTags,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(search)
  })

  return filtered
    .map((candidate) => {
      const preview = previewCandidate(candidate, game)
      const scoutAssessment = assessCandidateScouting(game, candidate.id)

      return {
        candidate,
        roleLabel: getCandidateRoleLabel(candidate),
        ...(getCandidateHireOutcomeLabel(candidate)
          ? { hireOutcomeLabel: getCandidateHireOutcomeLabel(candidate) }
          : {}),
        overallLabel:
          candidate.evaluation.overallVisible && getCandidateOverall(candidate) !== undefined
            ? String(getCandidateOverall(candidate))
            : 'Obscured',
        potentialLabel: candidate.evaluation.potentialVisible
          ? (candidate.evaluation.potentialTier ?? 'Unknown')
          : 'Unknown',
        scoutLabel: formatScoutLabel(candidate),
        scoutActionLabel: getScoutActionLabel(candidate, scoutAssessment.nextStage),
        scoutCost: scoutAssessment.cost > 0 ? scoutAssessment.cost : undefined,
        canScout: scoutAssessment.canScout,
        scoutBlockedReason: scoutAssessment.reason
          ? formatScoutBlockedReason(scoutAssessment.reason)
          : undefined,
        expiringSoon: candidate.expiryWeek <= game.week + 1,
        hiddenOverall:
          !candidate.evaluation.overallVisible || getCandidateOverall(candidate) === undefined,
        preview,
      }
    })
    .sort((left, right) => compareCandidateViews(left, right, filters.sort ?? 'expiry'))
}

export function getRecruitmentMetrics(game: GameState) {
  const recruitmentPool = getCandidatePool(game)
  const total = recruitmentPool.length
  const agents = recruitmentPool.filter(
    (candidate) => normalizeCandidateCategory(candidate.category) === 'agent'
  ).length
  const staff = recruitmentPool.filter(
    (candidate) => normalizeCandidateCategory(candidate.category) === 'staff'
  ).length
  const specialists = recruitmentPool.filter(
    (candidate) => normalizeCandidateCategory(candidate.category) === 'specialist'
  ).length
  const expiringSoon = recruitmentPool.filter(
    (candidate) => candidate.expiryWeek <= game.week + 1
  ).length

  return { total, agents, staff, specialists, expiringSoon }
}

function compareCandidateViews(
  left: RecruitmentCandidateView,
  right: RecruitmentCandidateView,
  sort: NonNullable<RecruitmentViewFilters['sort']>
) {
  if (sort === 'name') {
    return left.candidate.name.localeCompare(right.candidate.name)
  }

  if (sort === 'wage') {
    return (
      (getCandidateWeeklyCost(left.candidate) ?? Number.MAX_SAFE_INTEGER) -
        (getCandidateWeeklyCost(right.candidate) ?? Number.MAX_SAFE_INTEGER) ||
      left.candidate.name.localeCompare(right.candidate.name)
    )
  }

  if (sort === 'overall') {
    return (
      right.preview.estimatedValue - left.preview.estimatedValue ||
      left.candidate.expiryWeek - right.candidate.expiryWeek ||
      left.candidate.name.localeCompare(right.candidate.name)
    )
  }

  return (
    left.candidate.expiryWeek - right.candidate.expiryWeek ||
    (getCandidateOverall(right.candidate) ?? -1) - (getCandidateOverall(left.candidate) ?? -1) ||
    left.candidate.name.localeCompare(right.candidate.name)
  )
}

function getCandidateRoleLabel(candidate: Candidate) {
  if (candidate.agentData) {
    return `${candidate.agentData.role} / ${candidate.agentData.specialization}`
  }

  if (candidate.staffData) {
    return `${normalizeCandidateCategory(candidate.category)} / ${normalizeStaffCandidateSpecialty(
      candidate.staffData.specialty
    )}`
  }

  return normalizeCandidateCategory(candidate.category)
}

function getCandidateHireOutcomeLabel(candidate: Candidate) {
  const hireRole = getCandidateHireRole(candidate)

  return hireRole ? ROLE_LABELS[hireRole] : undefined
}

function formatScoutLabel(candidate: Candidate) {
  if (!candidate.scoutReport) {
    return normalizeCandidateCategory(candidate.category) === 'agent'
      ? 'Not commissioned'
      : 'Not applicable'
  }

  if (candidate.scoutReport.exactKnown) {
    return `Confirmed ${candidate.scoutReport.confirmedTier ?? candidate.scoutReport.projectedTier}`
  }

  return `Projected ${candidate.scoutReport.projectedTier} (${formatScoutConfidence(
    candidate.scoutReport.confidence
  )})`
}

function getScoutActionLabel(candidate: Candidate, nextStage?: 1 | 2 | 3) {
  if (normalizeCandidateCategory(candidate.category) !== 'agent') {
    return 'Scout'
  }

  if (candidate.scoutReport?.exactKnown) {
    return 'Confirmed'
  }

  if (nextStage === 2) {
    return 'Follow-up scout'
  }

  if (nextStage === 3) {
    return 'Deep scan'
  }

  return 'Scout'
}

function formatScoutConfidence(confidence: 'low' | 'medium' | 'high' | 'confirmed') {
  if (confidence === 'confirmed') {
    return 'confirmed intel'
  }

  return confidence === 'high'
    ? 'high confidence'
    : confidence === 'medium'
      ? 'medium confidence'
      : 'low confidence'
}

function formatScoutBlockedReason(
  reason: NonNullable<ReturnType<typeof assessCandidateScouting>['reason']>
) {
  if (reason === 'intel_confirmed') {
    return 'intel confirmed'
  }

  if (reason === 'insufficient_funding') {
    return 'insufficient funding'
  }

  if (reason === 'candidate_unavailable') {
    return 'candidate unavailable'
  }

  if (reason === 'non_agent') {
    return 'agent scouting only'
  }

  return 'candidate missing'
}
