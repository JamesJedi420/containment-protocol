import type { Candidate, GameState } from '../models'
import {
  getCandidateWeeklyCost,
  getCandidateOverall,
  isCandidateHireable,
  normalizeCandidateCategory,
} from './helpers'

export interface CandidatePreview {
  canHire: boolean
  reasons: string[]
  estimatedValue: number
}

function deriveEstimatedValue(candidate: Candidate) {
  const visibleOrHiddenOverall = getCandidateOverall(candidate)
  if (typeof visibleOrHiddenOverall === 'number') {
    return visibleOrHiddenOverall
  }

  if (candidate.agentData?.stats) {
    const stats = candidate.agentData.stats
    return Math.round((stats.combat + stats.investigation + stats.utility + stats.social) / 4)
  }

  if (typeof candidate.staffData?.efficiency === 'number') {
    return candidate.staffData.efficiency
  }

  if (typeof candidate.instructorData?.efficiency === 'number') {
    return candidate.instructorData.efficiency
  }

  return 50
}

export function previewCandidate(candidate: Candidate, game: GameState): CandidatePreview {
  const reasons: string[] = []
  const normalizedCategory = normalizeCandidateCategory(candidate.category)
  const weeklyCost = getCandidateWeeklyCost(candidate) ?? 0

  if (!isCandidateHireable(candidate.hireStatus)) {
    reasons.push('unavailable')
  }

  if (weeklyCost > game.funding) {
    reasons.push('insufficient-funding')
  }

  if (normalizedCategory === 'agent' && !candidate.agentData) {
    reasons.push('missing-agent-data')
  }

  if (normalizedCategory === 'staff' && !candidate.staffData) {
    reasons.push('missing-staff-data')
  }

  if (normalizedCategory === 'instructor' && !candidate.instructorData) {
    reasons.push('missing-instructor-data')
  }

  if (normalizedCategory === 'specialist') {
    reasons.push('unsupported-category')
  }

  return {
    canHire: reasons.length === 0,
    reasons,
    estimatedValue: deriveEstimatedValue(candidate),
  }
}
