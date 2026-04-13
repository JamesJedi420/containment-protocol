import type { MissionResultInput } from '../missionResults'
import type {
  MissionFatalityRecord,
  MissionInjuryRecord,
  MissionRewardBreakdown,
  MissionSpawnedConsequence,
  MissionTeamUsage,
  PerformanceMetricSummary,
  PowerImpactSummary,
} from '../models'
import { createDefaultPowerImpactSummary } from '../teamSimulation'

interface BaseResolvedDraftInput {
  caseId: string
  caseTitle: string
  teamsUsed: MissionTeamUsage[]
  rewards: MissionRewardBreakdown
  performanceSummary?: PerformanceMetricSummary
  powerImpact?: PowerImpactSummary
  injuries?: MissionInjuryRecord[]
  fatalities?: MissionFatalityRecord[]
  resolutionReasons?: string[]
}

interface EscalatedDraftInput extends BaseResolvedDraftInput {
  outcome: 'partial' | 'fail'
  spawnedConsequences: MissionSpawnedConsequence[]
}

interface UnresolvedDraftInput {
  caseId: string
  caseTitle: string
  rewards: MissionRewardBreakdown
  spawnedConsequences: MissionSpawnedConsequence[]
  explanationNotes: string[]
}

export function buildSuccessCaseOutcomeDraft(input: BaseResolvedDraftInput): MissionResultInput {
  return {
    caseId: input.caseId,
    caseTitle: input.caseTitle,
    teamsUsed: input.teamsUsed,
    outcome: 'success',
    rewards: input.rewards,
    performanceSummary: input.performanceSummary,
    powerImpact: input.powerImpact,
    injuries: input.injuries,
    fatalities: input.fatalities,
    resolutionReasons: input.resolutionReasons,
  }
}

export function buildEscalatedCaseOutcomeDraft(input: EscalatedDraftInput): MissionResultInput {
  return {
    caseId: input.caseId,
    caseTitle: input.caseTitle,
    teamsUsed: input.teamsUsed,
    outcome: input.outcome,
    rewards: input.rewards,
    performanceSummary: input.performanceSummary,
    powerImpact: input.powerImpact,
    injuries: input.injuries,
    fatalities: input.fatalities,
    spawnedConsequences: input.spawnedConsequences,
    resolutionReasons: input.resolutionReasons,
  }
}

export function buildUnresolvedCaseOutcomeDraft(input: UnresolvedDraftInput): MissionResultInput {
  return {
    caseId: input.caseId,
    caseTitle: input.caseTitle,
    teamsUsed: [],
    outcome: 'unresolved',
    rewards: input.rewards,
    powerImpact: createDefaultPowerImpactSummary(),
    spawnedConsequences: input.spawnedConsequences,
    explanationNotes: input.explanationNotes,
  }
}
