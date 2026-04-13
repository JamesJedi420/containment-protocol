import { assessAttritionPressure } from '../agent/attrition'
import type { Candidate, GameState } from '../models'
import {
  canTransitionCandidateFunnelStage,
  getCandidateFunnelStage,
  normalizeCandidateHireStatus,
  syncCandidatePoolState,
  normalizeRecruitmentFunnelStage,
} from './helpers'
import type { RecruitmentFunnelStage } from './types'

export interface RecruitmentFunnelTransitionInput {
  toStage: RecruitmentFunnelStage
  week: number
  note?: string
  lossReason?: string
}

export interface RecruitmentFunnelTransitionResult {
  state: GameState
  transitioned: boolean
  candidateId: string
  fromStage?: RecruitmentFunnelStage
  toStage?: RecruitmentFunnelStage
  reason?: 'missing_candidate' | 'invalid_transition'
}

export interface RecruitmentFunnelSummary {
  week: number
  totalCandidates: number
  stageCounts: Record<RecruitmentFunnelStage, number>
  replacementNeed: {
    replacementPressure: number
    staffingGap: number
    criticalRoleLossCount: number
    temporaryUnavailableCount: number
    priorityBand: 'stable' | 'elevated' | 'critical'
    reasonCodes: string[]
  }
  candidates: Array<{
    id: string
    name: string
    stage: RecruitmentFunnelStage
    roleInclination?: string
    expiryWeek: number
    createdWeek?: number
    lastUpdatedWeek?: number
  }>
}

function normalizeTransitionWeek(value: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return Math.max(1, Math.trunc(fallback))
  }

  return Math.max(1, Math.trunc(value))
}

function normalizeTransitionNote(note: string | undefined) {
  return typeof note === 'string' ? note.trim() : ''
}

function applyTransition(candidate: Candidate, input: RecruitmentFunnelTransitionInput) {
  const nextStage = normalizeRecruitmentFunnelStage(input.toStage)
  const nextWeek = normalizeTransitionWeek(input.week, candidate.lastUpdatedWeek ?? candidate.createdWeek ?? 1)
  const note = normalizeTransitionNote(input.note)
  const nextTransitionNotes = note.length > 0 ? [...(candidate.transitionNotes ?? []), note] : candidate.transitionNotes

  const nextHireStatus =
    nextStage === 'lost'
      ? 'expired'
      : normalizeCandidateHireStatus(candidate.hireStatus) === 'reserved'
        ? 'reserved'
        : 'available'

  return {
    ...candidate,
    funnelStage: nextStage,
    lastUpdatedWeek: nextWeek,
    hireStatus: nextHireStatus,
    ...(candidate.createdWeek === undefined ? { createdWeek: nextWeek } : {}),
    ...(nextTransitionNotes ? { transitionNotes: nextTransitionNotes } : {}),
    ...(nextStage === 'lost' && normalizeTransitionNote(input.lossReason).length > 0
      ? { lossReason: normalizeTransitionNote(input.lossReason) }
      : nextStage === 'lost'
        ? { lossReason: candidate.lossReason }
        : { lossReason: undefined }),
  } as Candidate
}

export function transitionRecruitmentCandidate(
  state: GameState,
  candidateId: string,
  input: RecruitmentFunnelTransitionInput
): RecruitmentFunnelTransitionResult {
  const candidate = state.candidates.find((entry) => entry.id === candidateId)

  if (!candidate) {
    return {
      state,
      transitioned: false,
      candidateId,
      reason: 'missing_candidate',
    }
  }

  const fromStage = getCandidateFunnelStage(candidate)
  const toStage = normalizeRecruitmentFunnelStage(input.toStage)

  if (!canTransitionCandidateFunnelStage(fromStage, toStage)) {
    return {
      state,
      transitioned: false,
      candidateId,
      fromStage,
      toStage,
      reason: 'invalid_transition',
    }
  }

  const nextCandidates = state.candidates.map((entry) =>
    entry.id === candidateId ? applyTransition(entry, input) : entry
  )

  return {
    state: syncCandidatePoolState(state, nextCandidates),
    transitioned: true,
    candidateId,
    fromStage,
    toStage,
  }
}

export function listCandidatesByFunnelStage(state: Pick<GameState, 'candidates'>, stage: RecruitmentFunnelStage) {
  const normalizedStage = normalizeRecruitmentFunnelStage(stage)
  return state.candidates.filter((candidate) => getCandidateFunnelStage(candidate) === normalizedStage)
}

export function buildRecruitmentFunnelSummary(
  state: Pick<GameState, 'week' | 'candidates' | 'agents' | 'agency' | 'config' | 'funding'>
): RecruitmentFunnelSummary {
  const attritionPressure = assessAttritionPressure(state)
  const stageCounts: RecruitmentFunnelSummary['stageCounts'] = {
    prospect: 0,
    contacted: 0,
    screening: 0,
    hired: 0,
    lost: 0,
  }

  const candidates = state.candidates
    .map((candidate) => {
      const stage = getCandidateFunnelStage(candidate)
      stageCounts[stage] += 1

      return {
        id: candidate.id,
        name: candidate.name,
        stage,
        ...(candidate.roleInclination ? { roleInclination: candidate.roleInclination } : {}),
        expiryWeek: candidate.expiryWeek,
        ...(typeof candidate.createdWeek === 'number' ? { createdWeek: candidate.createdWeek } : {}),
        ...(typeof candidate.lastUpdatedWeek === 'number'
          ? { lastUpdatedWeek: candidate.lastUpdatedWeek }
          : {}),
      }
    })
    .sort((left, right) => left.id.localeCompare(right.id))

  return {
    week: Math.max(1, Math.trunc(state.week)),
    totalCandidates: candidates.length,
    stageCounts,
    replacementNeed: {
      replacementPressure: attritionPressure.replacementPressure,
      staffingGap: attritionPressure.staffingGap,
      criticalRoleLossCount: attritionPressure.criticalRoleLossCount,
      temporaryUnavailableCount: attritionPressure.temporaryUnavailableCount,
      priorityBand: attritionPressure.recruitmentPriorityBand,
      reasonCodes: [...attritionPressure.reasonCodes],
    },
    candidates,
  }
}
