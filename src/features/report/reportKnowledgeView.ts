import {
  explainDecay,
  explainDefeatConditionKnowledge,
  explainFusion,
  explainHazardKnowledge,
  explainRelayChain,
} from '../../domain/explanations'
import {
  getFilteredKnowledgeView,
  getKnowledgeKey,
  type KnowledgeStateMap,
} from '../../domain/knowledge'
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

export type ReportKnowledgeAudience = 'public' | 'internal'
export interface ReportKnowledgePreview {
  readonly audience: ReportKnowledgeAudience
  readonly groups: readonly {
    readonly teamId: string
    readonly rows: readonly {
      readonly subjectId: string
      readonly tier: string
      readonly explanation: string
      readonly annotations: readonly string[]
    }[]
  }[]
}

/** Every display value comes from the selected projection; no live case/team labels are read. */
export function buildReportKnowledgePreview(
  knowledge: KnowledgeStateMap,
  audience: ReportKnowledgeAudience
): ReportKnowledgePreview {
  const projected = getFilteredKnowledgeView(knowledge, audience)
  const groups = new Map<string, ReportKnowledgePreview['groups'][number]['rows'][number][]>()
  for (const state of Object.values(projected)) {
    if (state.entityType !== undefined && state.entityType !== 'team') continue
    const rows = groups.get(state.entityId) ?? []
    rows.push({
      subjectId: state.subjectId,
      tier: state.tier,
      explanation:
        state.notes && audience === 'public'
          ? state.notes
          : state.subjectType === 'hazard'
            ? explainHazardKnowledge(state)
            : explainDefeatConditionKnowledge(projected, state.entityId, state.subjectId),
      annotations: [
        explainRelayChain(state),
        explainDecay(state),
        explainFusion(state),
        state.obsolete || state.fragmentation === 'obsolete' ? 'Knowledge may be obsolete.' : '',
        state.fragmented || state.fragmentation === 'fragmented' ? 'Knowledge is fragmented.' : '',
      ].filter(Boolean),
    })
    groups.set(state.entityId, rows)
  }
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
  return {
    audience,
    groups: [...groups.entries()]
      .sort(([a], [b]) => compare(a, b))
      .map(([teamId, rows]) => ({
        teamId,
        rows: rows.sort((a, b) => compare(a.subjectId, b.subjectId)),
      })),
  }
}
