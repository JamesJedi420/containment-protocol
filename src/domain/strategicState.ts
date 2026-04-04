import type { CaseInstance, GameState } from './models'
import { buildAcademyOverview, type AcademyOverview } from './academy'
import { buildAgencySummary, type AgencySummary } from './agency'
import { buildCaseGenerationProfile, type EncounterType } from './caseGeneration'
import { buildFactionStates, type FactionState } from './factions'
import { buildLogisticsOverview, type LogisticsOverview } from './logistics'
import {
  buildMajorIncidentProfile,
  type MajorIncidentBossEntity,
  type MajorIncidentModifier,
  type MajorIncidentProgressionEntry,
  type MajorIncidentSpecialMechanic,
} from './majorIncidents'
import { buildAgencyRanking, type AgencyRankingView } from './rankings'
import { getTeamAssignedCaseId } from './teamSimulation'

export interface EncounterGenerationTarget {
  templateId: string
  title: string
  sourceCount: number
}

export interface EncounterGenerationView {
  openSlots: number
  pressureTags: Array<{ tag: string; count: number }>
  likelyFollowUps: EncounterGenerationTarget[]
  likelyRaidConversions: Array<{
    caseId: string
    caseTitle: string
    trigger: 'failure' | 'unresolved'
    targetStage: number
    minTeams: number
    maxTeams: number
  }>
}

export interface EncounterStructureState {
  totalOpenCases: number
  openSlots: number
  types: Array<{
    encounterType: EncounterType
    label: string
    count: number
  }>
  origins: Array<{
    trigger: string
    label: string
    count: number
  }>
  stageBreakdown: Array<{
    stage: number
    count: number
  }>
  urgentEscalations: Array<{
    caseId: string
    caseTitle: string
    encounterTypeLabel: string
    originLabel: string
    stage: number
    deadlineRemaining: number
    nextStage: number
    convertsToRaid: boolean
    followUpCount: number
  }>
  pressureTags: EncounterGenerationView['pressureTags']
  likelyFollowUps: EncounterGenerationView['likelyFollowUps']
  likelyRaidConversions: EncounterGenerationView['likelyRaidConversions']
}

export interface MajorIncidentEntry {
  caseId: string
  caseTitle: string
  kind: CaseInstance['kind']
  stage: number
  archetypeId: string
  archetypeLabel: string
  currentStageIndex: number
  currentStageLabel: string
  totalStages: number
  deadlineRemaining: number
  assignedTeams: number
  requiredTeams: number
  recommendedTeams: number
  pressureScore: number
  effectiveDifficultyMultiplier: number
  effectiveDifficulty: CaseInstance['difficulty']
  difficultyPressure: Partial<CaseInstance['difficulty']>
  modifiers: MajorIncidentModifier[]
  specialMechanics: MajorIncidentSpecialMechanic[]
  progression: MajorIncidentProgressionEntry[]
  bossEntity?: MajorIncidentBossEntity
}

export interface MajorIncidentState {
  severity: 'watch' | 'danger' | 'crisis'
  pressureScore: number
  unresolvedMomentum: number
  incidents: MajorIncidentEntry[]
}

export interface EndgameScalingState {
  severity: MajorIncidentState['severity']
  pressureScore: number
  nextThreshold: number | null
  pressureToNextThreshold: number
  activeIncidents: number
  bossIncidents: number
  totalRequiredTeams: number
  totalRecommendedTeams: number
  averageDifficultyMultiplier: number
  maxStage: number
  progressionBands: Array<{
    label: string
    count: number
  }>
  incidents: MajorIncidentEntry[]
}

export interface AgencyOverview {
  summary: AgencySummary
  containmentRating: number
  clearanceLevel: number
  funding: number
  activeCases: number
  activeTeams: number
  readyAgents: number
  academy: AcademyOverview
  logistics: LogisticsOverview
  encounters: EncounterGenerationView
  encounterStructure: EncounterStructureState
  incidents: MajorIncidentState
  endgame: EndgameScalingState
  factions: FactionState[]
  ranking: AgencyRankingView
}

function getOpenCases(game: GameState) {
  return Object.values(game.cases).filter((currentCase) => currentCase.status !== 'resolved')
}

function getCasePressureScore(currentCase: CaseInstance) {
  return (
    currentCase.stage * 12 +
    (currentCase.kind === 'raid' ? 18 : 0) +
    Math.max(0, 3 - currentCase.deadlineRemaining) * 8 +
    (currentCase.status === 'in_progress' ? 4 : 0)
  )
}

function getRecentUnresolvedMomentum(game: GameState) {
  return game.reports
    .slice(-3)
    .reduce((sum, report) => sum + report.unresolvedTriggers.length + report.failedCases.length, 0)
}

export function buildEncounterGenerationView(game: GameState): EncounterGenerationView {
  const structure = buildEncounterStructureState(game)

  return {
    openSlots: structure.openSlots,
    pressureTags: structure.pressureTags,
    likelyFollowUps: structure.likelyFollowUps,
    likelyRaidConversions: structure.likelyRaidConversions,
  }
}

export function buildEncounterStructureState(game: GameState): EncounterStructureState {
  const openCases = getOpenCases(game)
  const followUpCounts = new Map<string, number>()
  const tagCounts = new Map<string, number>()
  const typeCounts = new Map<EncounterType, { label: string; count: number }>()
  const originCounts = new Map<string, { label: string; count: number }>()
  const stageCounts = new Map<number, number>()
  const likelyRaidConversions: EncounterGenerationView['likelyRaidConversions'] = []
  const urgentEscalations: EncounterStructureState['urgentEscalations'] = []

  for (const currentCase of openCases) {
    const profile = buildCaseGenerationProfile(currentCase, game)

    typeCounts.set(profile.encounterType, {
      label: profile.encounterTypeLabel,
      count: (typeCounts.get(profile.encounterType)?.count ?? 0) + 1,
    })
    originCounts.set(profile.origin.trigger, {
      label: profile.origin.label,
      count: (originCounts.get(profile.origin.trigger)?.count ?? 0) + 1,
    })
    stageCounts.set(currentCase.stage, (stageCounts.get(currentCase.stage) ?? 0) + 1)

    for (const tag of currentCase.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }

    for (const escalation of profile.escalation) {
      for (const target of escalation.targets) {
        followUpCounts.set(target.templateId, (followUpCounts.get(target.templateId) ?? 0) + 1)
      }
    }

    for (const escalation of profile.escalation) {
      if (escalation.convertsToRaid) {
        likelyRaidConversions.push({
          caseId: currentCase.id,
          caseTitle: currentCase.title,
          trigger: escalation.trigger,
          targetStage: escalation.nextStage,
          minTeams: currentCase.raid?.minTeams ?? 2,
          maxTeams: currentCase.raid?.maxTeams ?? 4,
        })
      }
    }

    const highestRiskEscalation = [...profile.escalation].sort((left, right) => {
      return (
        Number(right.convertsToRaid) - Number(left.convertsToRaid) ||
        right.nextStage - left.nextStage ||
        right.targets.length - left.targets.length ||
        left.trigger.localeCompare(right.trigger)
      )
    })[0]

    if (highestRiskEscalation) {
      urgentEscalations.push({
        caseId: currentCase.id,
        caseTitle: currentCase.title,
        encounterTypeLabel: profile.encounterTypeLabel,
        originLabel: profile.origin.label,
        stage: currentCase.stage,
        deadlineRemaining: currentCase.deadlineRemaining,
        nextStage: highestRiskEscalation.nextStage,
        convertsToRaid: highestRiskEscalation.convertsToRaid,
        followUpCount: highestRiskEscalation.targets.length,
      })
    }
  }

  return {
    totalOpenCases: openCases.length,
    openSlots: Math.max(0, game.config.maxActiveCases - openCases.length),
    types: [...typeCounts.entries()]
      .map(([encounterType, entry]) => ({
        encounterType,
        label: entry.label,
        count: entry.count,
      }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
    origins: [...originCounts.entries()]
      .map(([trigger, entry]) => ({
        trigger,
        label: entry.label,
        count: entry.count,
      }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
    stageBreakdown: [...stageCounts.entries()]
      .map(([stage, count]) => ({ stage, count }))
      .sort((left, right) => right.stage - left.stage),
    urgentEscalations: urgentEscalations
      .sort((left, right) => {
        return (
          left.deadlineRemaining - right.deadlineRemaining ||
          Number(right.convertsToRaid) - Number(left.convertsToRaid) ||
          right.nextStage - left.nextStage ||
          left.caseTitle.localeCompare(right.caseTitle)
        )
      })
      .slice(0, 6),
    pressureTags: [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag))
      .slice(0, 6),
    likelyFollowUps: [...followUpCounts.entries()]
      .map(([templateId, sourceCount]) => ({
        templateId,
        title: game.templates[templateId]?.title ?? templateId,
        sourceCount,
      }))
      .sort(
        (left, right) =>
          right.sourceCount - left.sourceCount || left.title.localeCompare(right.title)
      )
      .slice(0, 6),
    likelyRaidConversions: likelyRaidConversions
      .sort(
        (left, right) =>
          right.targetStage - left.targetStage || left.caseTitle.localeCompare(right.caseTitle)
      )
      .slice(0, 4),
  }
}

export function buildMajorIncidentState(game: GameState): MajorIncidentState {
  const openCases = getOpenCases(game)
  const incidents = openCases
    .map((currentCase) => ({
      currentCase,
      profile: buildMajorIncidentProfile(currentCase),
    }))
    .filter(
      (
        entry
      ): entry is {
        currentCase: CaseInstance
        profile: NonNullable<ReturnType<typeof buildMajorIncidentProfile>>
      } => entry.profile !== null
    )
    .map(({ currentCase, profile }) => ({
      caseId: currentCase.id,
      caseTitle: currentCase.title,
      kind: currentCase.kind,
      stage: currentCase.stage,
      archetypeId: profile.archetypeId,
      archetypeLabel: profile.archetypeLabel,
      currentStageIndex: profile.currentStageIndex,
      currentStageLabel: profile.currentStage.label,
      totalStages: profile.stages.length,
      deadlineRemaining: currentCase.deadlineRemaining,
      assignedTeams: currentCase.assignedTeamIds.length,
      requiredTeams:
        profile.effectiveCase.kind === 'raid' ? (profile.effectiveCase.raid?.minTeams ?? 2) : 1,
      recommendedTeams: profile.recommendedTeams,
      pressureScore: getCasePressureScore(currentCase),
      effectiveDifficultyMultiplier: profile.effectiveDifficultyMultiplier,
      effectiveDifficulty: profile.effectiveCase.difficulty,
      difficultyPressure: profile.currentStage.difficultyPressure,
      modifiers: profile.currentStage.modifiers,
      specialMechanics: profile.currentStage.specialMechanics,
      progression: profile.progression,
      bossEntity: profile.currentStage.bossEntity,
    }))
    .sort(
      (left, right) =>
        right.pressureScore - left.pressureScore || left.caseTitle.localeCompare(right.caseTitle)
    )

  const unresolvedMomentum = getRecentUnresolvedMomentum(game)
  const pressureScore =
    incidents.reduce((sum, incident) => sum + incident.pressureScore, 0) + unresolvedMomentum * 6
  const severity = pressureScore >= 120 ? 'crisis' : pressureScore >= 55 ? 'danger' : 'watch'

  return {
    severity,
    pressureScore,
    unresolvedMomentum,
    incidents: incidents.slice(0, 6),
  }
}

export function buildEndgameScalingState(game: GameState): EndgameScalingState {
  const incidentState = buildMajorIncidentState(game)
  const incidents = incidentState.incidents
  const nextThreshold =
    incidentState.severity === 'watch' ? 55 : incidentState.severity === 'danger' ? 120 : null

  const progressionBands = [
    {
      label: 'Stage I',
      count: incidents.filter((incident) => incident.currentStageIndex <= 1).length,
    },
    {
      label: 'Stage II',
      count: incidents.filter((incident) => incident.currentStageIndex === 2).length,
    },
    {
      label: 'Stage III+',
      count: incidents.filter((incident) => incident.currentStageIndex >= 3).length,
    },
  ]

  return {
    severity: incidentState.severity,
    pressureScore: incidentState.pressureScore,
    nextThreshold,
    pressureToNextThreshold:
      nextThreshold === null ? 0 : Math.max(0, nextThreshold - incidentState.pressureScore),
    activeIncidents: incidents.length,
    bossIncidents: incidents.filter((incident) => Boolean(incident.bossEntity)).length,
    totalRequiredTeams: incidents.reduce((sum, incident) => sum + incident.requiredTeams, 0),
    totalRecommendedTeams: incidents.reduce((sum, incident) => sum + incident.recommendedTeams, 0),
    averageDifficultyMultiplier:
      incidents.length > 0
        ? Number(
            (
              incidents.reduce((sum, incident) => sum + incident.effectiveDifficultyMultiplier, 0) /
              incidents.length
            ).toFixed(2)
          )
        : 1,
    maxStage: incidents.reduce((maxStage, incident) => Math.max(maxStage, incident.stage), 0),
    progressionBands,
    incidents,
  }
}

export { buildFactionStates }
export type { FactionState }

export { buildAgencyRanking }
export type { AgencyRankingView }

export function buildAgencyOverview(game: GameState): AgencyOverview {
  const summary = buildAgencySummary(game)
  const openCases = getOpenCases(game)
  const activeTeams = Object.values(game.teams).filter((team) =>
    Boolean(getTeamAssignedCaseId(team))
  ).length
  const readyAgents = Object.values(game.agents).filter(
    (agent) => agent.status === 'active' && agent.assignment?.state === 'idle'
  ).length

  return {
    summary,
    containmentRating: summary.containmentRating,
    clearanceLevel: summary.clearanceLevel,
    funding: summary.funding,
    activeCases: openCases.length,
    activeTeams,
    readyAgents,
    academy: buildAcademyOverview(game),
    logistics: buildLogisticsOverview(game),
    encounters: buildEncounterGenerationView(game),
    encounterStructure: buildEncounterStructureState(game),
    incidents: buildMajorIncidentState(game),
    endgame: buildEndgameScalingState(game),
    factions: buildFactionStates(game),
    ranking: buildAgencyRanking(game),
  }
}
