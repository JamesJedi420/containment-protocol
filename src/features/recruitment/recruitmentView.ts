import { type Candidate, type GameState } from '../../domain/models'
import { filterCandidates, type CandidateFilters } from '../../domain/sim/candidateFilter'
import {
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
  overallLabel: string
  potentialLabel: string
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

      return {
        candidate,
        roleLabel: getCandidateRoleLabel(candidate),
        overallLabel:
          candidate.evaluation.overallVisible && getCandidateOverall(candidate) !== undefined
            ? String(getCandidateOverall(candidate))
            : 'Obscured',
        potentialLabel: candidate.evaluation.potentialVisible
          ? (candidate.evaluation.potentialTier ?? 'Unknown')
          : 'Unknown',
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
    (getCandidateOverall(right.candidate) ?? -1) -
      (getCandidateOverall(left.candidate) ?? -1) ||
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
