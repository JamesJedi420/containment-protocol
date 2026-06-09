/**
 * SPE-868 slice 17: materialize action-stub tokens from persisted recommendation records.
 *
 * When a qualifying recommendation record materializes this tick, append one bounded action
 * record linked to the recommendation. Training-ref closeouts are ignored upstream.
 */

import type { GameState } from './models'
import {
  buildRecommendationActionRecordFromRecommendation,
  type PostIncidentReviewRecommendationActionRecordsMap,
} from './postIncidentReviewRecommendationActionRegistry'
import type { PostIncidentReviewRecommendationRecordsMap } from './postIncidentReviewRecommendationRegistry'

const MIN_ACADEMY_TIER_FOR_RECOMMENDATION_ACTION = 1

function collectNewlyMaterializedRecommendationIds(input: {
  priorRecommendations: PostIncidentReviewRecommendationRecordsMap
  nextRecommendations: PostIncidentReviewRecommendationRecordsMap
}): readonly string[] {
  return Object.keys(input.nextRecommendations)
    .filter((recommendationId) => {
      const nextRecord = input.nextRecommendations[recommendationId]
      return nextRecord && !input.priorRecommendations[recommendationId]
    })
    .sort((left, right) => left.localeCompare(right))
}

function canMaterializeRecommendationActions(state: Pick<GameState, 'academyTier'>): boolean {
  return (state.academyTier ?? 0) >= MIN_ACADEMY_TIER_FOR_RECOMMENDATION_ACTION
}

/**
 * Appends action registry records for recommendation records materialized this tick.
 * Re-applying for the same week is idempotent; academy tier below threshold skips append.
 */
export function applyWeeklyPostIncidentReviewFollowOnRecommendationActionTick(
  state: Pick<GameState, 'academyTier'>,
  priorActions: PostIncidentReviewRecommendationActionRecordsMap | null | undefined,
  priorRecommendations: PostIncidentReviewRecommendationRecordsMap | null | undefined,
  nextRecommendations: PostIncidentReviewRecommendationRecordsMap | null | undefined
): PostIncidentReviewRecommendationActionRecordsMap {
  const prior = priorActions ?? {}
  const priorRecommendationMap = priorRecommendations ?? {}
  const next = nextRecommendations ?? {}

  if (!canMaterializeRecommendationActions(state)) {
    return prior
  }

  const materializedIds = collectNewlyMaterializedRecommendationIds({
    priorRecommendations: priorRecommendationMap,
    nextRecommendations: next,
  })

  if (materializedIds.length === 0) {
    return prior
  }

  const nextActions: PostIncidentReviewRecommendationActionRecordsMap = { ...prior }
  let changed = false

  for (const recommendationId of materializedIds) {
    const recommendation = next[recommendationId]
    if (!recommendation) {
      continue
    }

    const action = buildRecommendationActionRecordFromRecommendation(recommendation)
    if (!action || nextActions[action.id]) {
      continue
    }

    nextActions[action.id] = action
    changed = true
  }

  return changed ? nextActions : prior
}
