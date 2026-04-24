import type { Candidate, GameState } from '../models'
import { getFactionReputationTier } from '../factions'
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

function isTierAtLeast(
  current: ReturnType<typeof getFactionReputationTier>,
  minimum: NonNullable<Candidate['sourceRequiredTier']>
) {
  const order = ['hostile', 'unfriendly', 'neutral', 'friendly', 'allied']
  return order.indexOf(current) >= order.indexOf(minimum)
}

function isTierAtMost(
  current: ReturnType<typeof getFactionReputationTier>,
  maximum: NonNullable<Candidate['sourceMaxTier']>
) {
  const order = ['hostile', 'unfriendly', 'neutral', 'friendly', 'allied']
  return order.indexOf(current) <= order.indexOf(maximum)
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
  const pushReason = (reason: string) => {
    if (!reasons.includes(reason)) {
      reasons.push(reason)
    }
  }
  const normalizedCategory = normalizeCandidateCategory(candidate.category)
  const weeklyCost = getCandidateWeeklyCost(candidate) ?? 0

  if (!isCandidateHireable(candidate.hireStatus)) {
    pushReason('unavailable')
  }

  if (weeklyCost > game.funding) {
    pushReason('insufficient-funding')
  }

  if (normalizedCategory === 'agent' && !candidate.agentData) {
    pushReason('missing-agent-data')
  }

  if (normalizedCategory === 'staff' && !candidate.staffData) {
    pushReason('missing-staff-data')
  }

  if (normalizedCategory === 'instructor' && !candidate.instructorData) {
    pushReason('missing-instructor-data')
  }

  if (normalizedCategory === 'specialist') {
    pushReason('unsupported-category')
  }

  if (candidate.sourceFactionId) {
    const sourceFaction = game.factions?.[candidate.sourceFactionId]
    const sourceTier = getFactionReputationTier(sourceFaction?.reputation ?? 0)

    if (candidate.sourceRequiredTier && !isTierAtLeast(sourceTier, candidate.sourceRequiredTier)) {
      pushReason('faction-locked')
    }

    if (candidate.sourceMaxTier && !isTierAtMost(sourceTier, candidate.sourceMaxTier)) {
      pushReason('faction-locked')
    }

    if (candidate.sourceContactId) {
      const contact = (sourceFaction?.contacts ?? []).find(
        (entry) => entry.id === candidate.sourceContactId
      )
      if (candidate.sourceDisposition !== 'adversarial' && contact?.status === 'hostile') {
        pushReason('contact-hostile')
      }

      if (
        candidate.sourceDisposition !== 'adversarial' &&
        contact?.status !== 'hostile' &&
        typeof contact?.relationship === 'number' &&
        contact.relationship < 15
      ) {
        pushReason('faction-locked')
      }
    }
  }

  return {
    canHire: reasons.length === 0,
    reasons,
    estimatedValue: deriveEstimatedValue(candidate),
  }
}
