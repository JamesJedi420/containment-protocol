import { createSeededRng } from '../math'
import {
  appendOperationEventDrafts,
  createRecruitmentIntelConfirmedDraft,
  createRecruitmentScoutingInitiatedDraft,
  createRecruitmentScoutingRefinedDraft,
} from '../events'
import {
  buildCandidateScoutReport,
  getCandidatePool,
  getNextCandidateScoutStage,
  getCandidateScoutCost,
  isCandidateScoutable,
  revealCandidate,
  syncCandidatePoolState,
} from '../recruitment'
import { evaluateRecruitmentScoutSupport } from '../recon'
import { ensureNormalizedGameState, normalizeGameState } from '../teamSimulation'
import type { GameState, Id } from '../models'
import type { CandidateScoutReport } from '../recruitment'

export type CandidateScoutBlockReason =
  | 'missing_candidate'
  | 'non_agent'
  | 'intel_confirmed'
  | 'candidate_unavailable'
  | 'insufficient_funding'

export interface CandidateScoutAssessment {
  canScout: boolean
  cost: number
  nextStage?: 1 | 2 | 3
  reason?: CandidateScoutBlockReason
}

function createCandidateScoutEventDraft(
  state: GameState,
  candidateId: Id,
  candidateName: string,
  assessment: CandidateScoutAssessment,
  report: CandidateScoutReport,
  revealLevel: number,
  previousReport?: CandidateScoutReport
) {
  const payload = {
    week: state.week,
    candidateId,
    candidateName,
    fundingCost: assessment.cost,
    stage: report.stage,
    projectedTier: report.projectedTier,
    confidence: report.confidence,
    previousProjectedTier: previousReport?.projectedTier,
    previousConfidence: previousReport?.confidence,
    confirmedTier: report.confirmedTier,
    revealLevel,
  }

  if (report.exactKnown) {
    return createRecruitmentIntelConfirmedDraft(payload)
  }

  if (report.stage === 1) {
    return createRecruitmentScoutingInitiatedDraft(payload)
  }

  return createRecruitmentScoutingRefinedDraft(payload)
}

export function assessCandidateScouting(
  state: GameState,
  candidateId: Id
): CandidateScoutAssessment {
  const candidate = getCandidatePool(state).find((entry) => entry.id === candidateId)

  if (!candidate) {
    return { canScout: false, cost: 0, reason: 'missing_candidate' }
  }

  const support = evaluateRecruitmentScoutSupport(state.agents)

  if (candidate.category !== 'agent' || !candidate.agentData) {
    return { canScout: false, cost: 0, reason: 'non_agent' }
  }

  const nextStage = getNextCandidateScoutStage(candidate)

  if (nextStage === null) {
    return { canScout: false, cost: 0, reason: 'intel_confirmed' }
  }

  const cost = Math.max(4, getCandidateScoutCost(candidate) - support.costDiscount)

  if (!isCandidateScoutable(candidate)) {
    return { canScout: false, cost, nextStage, reason: 'candidate_unavailable' }
  }

  if (state.funding < cost) {
    return { canScout: false, cost, nextStage, reason: 'insufficient_funding' }
  }

  return { canScout: true, cost, nextStage }
}

export function scoutCandidate(state: GameState, candidateId: Id): GameState {
  const assessment = assessCandidateScouting(state, candidateId)

  if (!assessment.canScout) {
    return ensureNormalizedGameState(state)
  }

  const candidatePool = getCandidatePool(state)
  const targetCandidate = candidatePool.find((candidate) => candidate.id === candidateId)

  if (!targetCandidate) {
    return ensureNormalizedGameState(state)
  }

  const rng = createSeededRng(state.rngState)
  const scoutSupport = evaluateRecruitmentScoutSupport(state.agents)
  let scoutEventDraft:
    | ReturnType<typeof createRecruitmentScoutingInitiatedDraft>
    | ReturnType<typeof createRecruitmentScoutingRefinedDraft>
    | ReturnType<typeof createRecruitmentIntelConfirmedDraft>
    | undefined
  const nextCandidates = candidatePool.map((candidate) => {
    if (candidate.id !== candidateId) {
      return candidate
    }

    const revealedCandidate = revealCandidate(candidate, 1 + scoutSupport.revealBoost)
    const nextScoutReport = buildCandidateScoutReport(revealedCandidate, rng.next, {
      clearanceLevel: state.agency?.clearanceLevel ?? state.clearanceLevel,
      week: state.week,
      reliabilityBonus: scoutSupport.reliabilityBonus,
    })

    scoutEventDraft = createCandidateScoutEventDraft(
      state,
      candidate.id,
      candidate.name,
      assessment,
      nextScoutReport,
      revealedCandidate.revealLevel,
      candidate.scoutReport
    )

    return {
      ...revealedCandidate,
      scoutReport: nextScoutReport,
    }
  })

  const nextState = syncCandidatePoolState(
    {
      ...state,
      funding: state.funding - assessment.cost,
      rngState: rng.getState(),
    },
    nextCandidates
  )

  if (!scoutEventDraft) {
    return normalizeGameState(nextState)
  }

  return normalizeGameState(appendOperationEventDrafts(nextState, [scoutEventDraft]))
}
