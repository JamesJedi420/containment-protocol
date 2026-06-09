/**
 * SPE-868 slice 13: enqueue academy training from orchestration follow-on training-ref tokens.
 *
 * When a qualifying review materializes with a catalog-valid training reference, queue one
 * agent training program via the existing `queueTraining` path. Recommendation stubs are ignored.
 */

import { getTrainingProgram } from '../data/training'
import type { GameState, Id } from './models'
import {
  FOLLOW_ON_TRAINING_REF_PREFIX,
  isOrchestrationCreatedPostIncidentReviewRecord,
} from './postIncidentReviewFollowOnArtifact'
import { extractFollowOnArtifactTokenFromUnknownFields } from './postIncidentReviewFollowOnWeeklyReportNotes'
import type { PostIncidentReviewRecordsMap } from './postIncidentReviewRegistry'
import { assessAgentTrainingQueue, queueTraining } from './sim/training'
import { getTeamMemberIds } from './teamSimulation'

const CASE_CLOSEOUT_REVIEW_REF_PATTERN = /^review:case-([a-zA-Z0-9_-]+)-closeout$/

/** Returns a catalog-valid training id from a follow-on training-ref token, or undefined. */
export function parseFollowOnTrainingRefToken(token: string): string | undefined {
  if (!token.startsWith(FOLLOW_ON_TRAINING_REF_PREFIX)) {
    return undefined
  }

  const trainingId = token.slice(FOLLOW_ON_TRAINING_REF_PREFIX.length).trim()
  if (!trainingId) {
    return undefined
  }

  return getTrainingProgram(trainingId) ? trainingId : undefined
}

function resolveLinkedCaseIdFromReviewRef(reviewRef: string): string | undefined {
  const match = CASE_CLOSEOUT_REVIEW_REF_PATTERN.exec(reviewRef)
  return match?.[1]?.trim() || undefined
}

function collectCandidateAgentIds(state: GameState, linkedCaseId: string | undefined): readonly Id[] {
  if (linkedCaseId) {
    const caseData = state.cases[linkedCaseId]
    if (caseData) {
      const candidateIds = new Set<Id>()
      for (const teamId of caseData.assignedTeamIds) {
        const team = state.teams[teamId]
        if (!team) {
          continue
        }
        for (const agentId of getTeamMemberIds(team)) {
          candidateIds.add(agentId)
        }
      }
      if (candidateIds.size > 0) {
        return Object.freeze([...candidateIds].sort((left, right) => left.localeCompare(right)))
      }
    }
  }

  return Object.freeze(
    Object.keys(state.agents)
      .filter((agentId) => state.agents[agentId]?.status === 'active')
      .sort((left, right) => left.localeCompare(right))
  )
}

function resolveFollowOnTrainingAgentId(
  state: GameState,
  trainingId: string,
  linkedCaseId: string | undefined
): Id | undefined {
  for (const agentId of collectCandidateAgentIds(state, linkedCaseId)) {
    if (assessAgentTrainingQueue(state, agentId, trainingId).canQueue) {
      return agentId
    }
  }

  return undefined
}

function collectMaterializedFollowOnTrainingRefReviewRefs(input: {
  priorReviews: PostIncidentReviewRecordsMap
  nextReviews: PostIncidentReviewRecordsMap
}): readonly string[] {
  return Object.keys(input.nextReviews)
    .filter((reviewRef) => {
      const nextRecord = input.nextReviews[reviewRef]
      if (!nextRecord || input.priorReviews[reviewRef]) {
        return false
      }

      if (!isOrchestrationCreatedPostIncidentReviewRecord(nextRecord)) {
        return false
      }

      const token = extractFollowOnArtifactTokenFromUnknownFields(nextRecord.unknownFields)
      return token !== undefined && parseFollowOnTrainingRefToken(token) !== undefined
    })
    .sort((left, right) => left.localeCompare(right))
}

/**
 * Enqueues training programs for follow-on training-ref artifacts on reviews materialized this tick.
 * Re-applying for the same week is idempotent; recommendation-stub tokens are skipped.
 */
export function applyWeeklyPostIncidentReviewFollowOnTrainingEnqueueTick(
  state: GameState,
  priorReviews: PostIncidentReviewRecordsMap | null | undefined,
  nextReviews: PostIncidentReviewRecordsMap | null | undefined
): GameState {
  const prior = priorReviews ?? {}
  const next = nextReviews ?? {}
  const materializedRefs = collectMaterializedFollowOnTrainingRefReviewRefs({
    priorReviews: prior,
    nextReviews: next,
  })

  if (materializedRefs.length === 0) {
    return state
  }

  let currentState = state

  for (const reviewRef of materializedRefs) {
    const record = next[reviewRef]
    if (!record) {
      continue
    }

    const token = extractFollowOnArtifactTokenFromUnknownFields(record.unknownFields)
    const trainingId = token ? parseFollowOnTrainingRefToken(token) : undefined
    if (!trainingId) {
      continue
    }

    const linkedCaseId = resolveLinkedCaseIdFromReviewRef(reviewRef)
    const agentId = resolveFollowOnTrainingAgentId(currentState, trainingId, linkedCaseId)
    if (!agentId) {
      continue
    }

    currentState = queueTraining(currentState, agentId, trainingId)
  }

  return currentState
}

export function extractFollowOnTrainingRefFromUnknownFields(
  unknownFields: readonly string[] | undefined
): string | undefined {
  const token = extractFollowOnArtifactTokenFromUnknownFields(unknownFields)
  if (!token) {
    return undefined
  }

  return parseFollowOnTrainingRefToken(token)
}
