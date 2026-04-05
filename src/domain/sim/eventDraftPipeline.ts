import type { AnyOperationEventDraft, CaseEscalationTrigger } from '../events'
import type { CaseInstance, Id, MissionRewardBreakdown, PerformanceMetricSummary } from '../models'

interface BaseCaseEventInput {
  week: number
  caseData: Pick<CaseInstance, 'id' | 'title' | 'mode' | 'kind' | 'stage'>
}

interface ResolutionEventInput extends BaseCaseEventInput {
  teamIds: Id[]
  rewardBreakdown: MissionRewardBreakdown
  performanceSummary?: PerformanceMetricSummary
}

interface EscalationEventInput {
  week: number
  caseData: Pick<CaseInstance, 'id' | 'title' | 'stage'>
  toStage: number
  rewardBreakdown: MissionRewardBreakdown
  trigger: CaseEscalationTrigger
  deadlineRemaining: number
  convertedToRaid: boolean
}

interface RaidConvertedEventInput {
  week: number
  caseData: Pick<CaseInstance, 'id' | 'title'>
  stage: number
  trigger: CaseEscalationTrigger
  minTeams: number
  maxTeams: number
}

export function buildCaseResolvedEventDraft({
  week,
  caseData,
  teamIds,
  rewardBreakdown,
  performanceSummary,
}: ResolutionEventInput): AnyOperationEventDraft {
  return {
    type: 'case.resolved',
    sourceSystem: 'incident',
    payload: {
      week,
      caseId: caseData.id,
      caseTitle: caseData.title,
      mode: caseData.mode,
      kind: caseData.kind,
      stage: caseData.stage,
      teamIds: [...teamIds],
      performanceSummary,
      rewardBreakdown,
    },
  }
}

export function buildCaseFailedEventDraft({
  week,
  caseData,
  toStage,
  teamIds,
  rewardBreakdown,
  performanceSummary,
}: ResolutionEventInput & { toStage: number }): AnyOperationEventDraft {
  return {
    type: 'case.failed',
    sourceSystem: 'incident',
    payload: {
      week,
      caseId: caseData.id,
      caseTitle: caseData.title,
      mode: caseData.mode,
      kind: caseData.kind,
      fromStage: caseData.stage,
      toStage,
      teamIds: [...teamIds],
      performanceSummary,
      rewardBreakdown,
    },
  }
}

export function buildCasePartiallyResolvedEventDraft({
  week,
  caseData,
  toStage,
  teamIds,
  rewardBreakdown,
  performanceSummary,
}: ResolutionEventInput & { toStage: number }): AnyOperationEventDraft {
  return {
    type: 'case.partially_resolved',
    sourceSystem: 'incident',
    payload: {
      week,
      caseId: caseData.id,
      caseTitle: caseData.title,
      mode: caseData.mode,
      kind: caseData.kind,
      fromStage: caseData.stage,
      toStage,
      teamIds: [...teamIds],
      performanceSummary,
      rewardBreakdown,
    },
  }
}

export function buildCaseEscalatedEventDraft({
  week,
  caseData,
  toStage,
  rewardBreakdown,
  trigger,
  deadlineRemaining,
  convertedToRaid,
}: EscalationEventInput): AnyOperationEventDraft {
  return {
    type: 'case.escalated',
    sourceSystem: 'incident',
    payload: {
      week,
      caseId: caseData.id,
      caseTitle: caseData.title,
      fromStage: caseData.stage,
      toStage,
      trigger,
      deadlineRemaining,
      convertedToRaid,
      rewardBreakdown,
    },
  }
}

export function buildCaseRaidConvertedEventDraft({
  week,
  caseData,
  stage,
  trigger,
  minTeams,
  maxTeams,
}: RaidConvertedEventInput): AnyOperationEventDraft {
  return {
    type: 'case.raid_converted',
    sourceSystem: 'incident',
    payload: {
      week,
      caseId: caseData.id,
      caseTitle: caseData.title,
      stage,
      trigger,
      minTeams,
      maxTeams,
    },
  }
}
