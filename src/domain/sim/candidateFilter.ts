import { type Candidate } from '../models'
import { getCandidateOverall, normalizeCandidateCategory } from '../recruitment'

type CandidateFilters = Partial<{
  category: string
  role: string
  minOverall: number
  maxAge: number
}>

export type { CandidateFilters }

export function filterCandidates(candidates: Candidate[], filters: CandidateFilters): Candidate[] {
  return candidates.filter((candidate) => {
    if (
      filters.category &&
      normalizeCandidateCategory(candidate.category) !== filters.category
    ) {
      return false
    }

    if (filters.role && candidate.agentData?.role !== filters.role) {
      return false
    }

    if (filters.maxAge !== undefined && candidate.age > filters.maxAge) {
      return false
    }

    if (filters.minOverall !== undefined) {
      const overall = getCandidateOverall(candidate)

      if (!candidate.evaluation.overallVisible || overall === undefined) {
        return false
      }

      if (overall < filters.minOverall) {
        return false
      }
    }

    return true
  })
}
