import {
  explainDecay,
  explainFusion,
  explainHazardKnowledge,
  explainRelayChain,
} from '../explanations'
import { getKnowledgeKey, explainSpatialState, type KnowledgeState, type KnowledgeStateMap } from '../knowledge'
import { getDistortionStatesForScore, mergeDistortionStates } from '../shared/distortion'
import { buildFactionStates } from '../factions'
import type {
  CaseInstance,
  GameState,
  MissionResult,
  MissionRewardBreakdown,
  PerformanceMetricSummary,
  WeeklyReportCaseSnapshot,
} from '../models'

export function buildReportCaseSnapshot(
  currentCase: CaseInstance,
  knowledge?: KnowledgeStateMap,
  extras?: {
    performanceSummary?: PerformanceMetricSummary
    rewardBreakdown?: MissionRewardBreakdown
    missionResult?: MissionResult
    distortion?: WeeklyReportCaseSnapshot['distortion']
  }
): WeeklyReportCaseSnapshot {
  const caseKnowledge: Record<string, KnowledgeState> = {}
  const explanationParts: string[] = []

  if (knowledge && currentCase.assignedTeamIds.length > 0) {
    for (const teamId of currentCase.assignedTeamIds) {
      const key = getKnowledgeKey(teamId, currentCase.id)
      const ks = knowledge[key]

      if (ks) {
        caseKnowledge[teamId] = ks
        let part = `[${teamId}] ${ks.tier}`

        if (ks.notes) {
          part += `: ${ks.notes}`
        }

        const extra = [
          explainFusion(ks),
          explainDecay(ks),
          explainRelayChain(ks),
          explainHazardKnowledge(ks),
        ]
          .filter(Boolean)
          .join(' | ')

        if (extra) {
          part += ` (${extra})`
        }

        explanationParts.push(part)
      }
    }
  }

  const spatialExplanation = explainSpatialState(
    currentCase.siteLayer,
    currentCase.visibilityState,
    currentCase.transitionType,
    currentCase.spatialFlags
  )

  if (spatialExplanation) {
    explanationParts.push(spatialExplanation)
  }

  const joinedExplanation = explanationParts.join(' | ')
  const revealExplanation =
    joinedExplanation.length > 0 && joinedExplanation !== 'No spatial constraints.'
      ? joinedExplanation
      : undefined

  const snapshot: WeeklyReportCaseSnapshot = {
    caseId: currentCase.id,
    title: currentCase.title,
    kind: currentCase.kind,
    mode: currentCase.mode,
    status: currentCase.status,
    stage: currentCase.stage,
    deadlineRemaining: currentCase.deadlineRemaining,
    durationWeeks: currentCase.durationWeeks,
    weeksRemaining: currentCase.weeksRemaining,
    assignedTeamIds: [...currentCase.assignedTeamIds],
    knowledge: Object.keys(caseKnowledge).length > 0 ? caseKnowledge : undefined,
    ...(revealExplanation !== undefined ? { revealExplanation } : {}),
    ...(extras?.performanceSummary ? { performanceSummary: extras.performanceSummary } : {}),
    ...(extras?.rewardBreakdown ? { rewardBreakdown: extras.rewardBreakdown } : {}),
    ...(extras?.missionResult ? { missionResult: extras.missionResult } : {}),
    ...(extras?.distortion?.length ? { distortion: extras.distortion } : {}),
  }

  return snapshot
}

export function buildReportCaseSnapshots(
  cases: GameState['cases'],
  knowledge?: KnowledgeStateMap,
  performanceByCaseId: Partial<Record<string, PerformanceMetricSummary>> = {},
  rewardByCaseId: Partial<Record<string, MissionRewardBreakdown>> = {},
  missionResultByCaseId: Partial<Record<string, MissionResult>> = {},
  stateForFactionDistortion?: Pick<GameState, 'factions'>
) {
  const anchorDistortion = stateForFactionDistortion
    ? (buildFactionStates(stateForFactionDistortion)[0]?.distortion ?? 0)
    : 0
  const anchorDistortionStates = getDistortionStatesForScore(anchorDistortion)

  return Object.fromEntries(
    Object.values(cases).map((currentCase) => {
      const distortion = mergeDistortionStates(currentCase.distortion, anchorDistortionStates)

      return [
        currentCase.id,
        buildReportCaseSnapshot(currentCase, knowledge, {
          performanceSummary:
            performanceByCaseId[currentCase.id] ??
            missionResultByCaseId[currentCase.id]?.performanceSummary,
          rewardBreakdown:
            rewardByCaseId[currentCase.id] ?? missionResultByCaseId[currentCase.id]?.rewards,
          missionResult: missionResultByCaseId[currentCase.id],
          distortion: distortion.length > 0 ? distortion : undefined,
        }),
      ]
    })
  )
}
