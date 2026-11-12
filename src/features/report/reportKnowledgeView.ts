import { getKnowledgeKey, type KnowledgeStateMap } from '../../domain/knowledge'
import type { GameState } from '../../domain/models'

export function buildReportKnowledgeView(
  liveKnowledge: KnowledgeStateMap,
  caseSnapshots: GameState['reports'][number]['caseSnapshots']
): KnowledgeStateMap {
  if (!caseSnapshots) {
    return liveKnowledge
  }

  const snapshotKnowledge: KnowledgeStateMap = {}

  for (const [caseId, snapshot] of Object.entries(caseSnapshots)) {
    if (!snapshot.knowledge) {
      continue
    }

    for (const [teamId, state] of Object.entries(snapshot.knowledge)) {
      snapshotKnowledge[getKnowledgeKey(teamId, caseId)] = state
    }
  }

  if (Object.keys(snapshotKnowledge).length === 0) {
    return liveKnowledge
  }

  return {
    ...liveKnowledge,
    ...snapshotKnowledge,
  }
}
