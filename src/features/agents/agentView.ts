// cspell:words callsign reassignable
import { APP_ROUTES } from '../../app/routes'
import {
  buildAgentStatCaps,
  normalizePotentialIntel,
  normalizePotentialTier,
} from '../../domain/agentPotential'
import {
  formatAbilityTrigger,
  getAbilityContextHint,
  resolveAbilityEffect,
  type AbilityEffectResult,
} from '../../domain/abilities'
import {
  EQUIPMENT_SLOT_LABELS,
  buildAgentEquipmentSummary,
  hasEquipmentStatModifiers,
  resolveEquippedItems,
  type EquipmentSlotKind,
} from '../../domain/equipment'
import { evaluateAgentBreakdown } from '../../domain/evaluateAgent'
import { buildAgencyProtocolState } from '../../domain/protocols'
import { getProgressionSnapshot, synchronizeProgressionState } from '../../domain/progression'
import {
  type Agent,
  type AgentReadinessProfile,
  type AgentServiceRecord,
  type AgentTraitModifierKey,
  type CaseInstance,
  type ExactPotentialTier,
  type FatigueBand,
  type GameState,
  type LegacyStatDomain,
  type PotentialIntelConfidence,
  type PotentialIntelSource,
  type StatDomain,
  type StatBlock,
  type Team,
} from '../../domain/models'
import { getTeamMoveEligibility } from '../../domain/sim/teamManagement'
import {
  evaluateTacticalAssessments,
  type TacticalAssessment,
} from '../../domain/tacticalAssessment'
import { resolveTraitEffect, type TraitModifierResult } from '../../domain/traits'
import { createDefaultAgentProgression } from '../../domain/agentDefaults'
import { domainAverage, getAgentDomainStats, STAT_DOMAINS } from '../../domain/statDomains'
import {
  getTeamAssignedCaseId,
  getTeamLeaderId,
  getTeamMemberIds,
} from '../../domain/teamSimulation'

const DOMAIN_LABELS: Record<StatDomain, string> = {
  field: 'Field',
  resilience: 'Resilience',
  control: 'Control',
  insight: 'Insight',
  presence: 'Presence',
  anomaly: 'Anomaly',
}

const LEGACY_DOMAIN_LABELS: Record<LegacyStatDomain, string> = {
  physical: 'Physical',
  tactical: 'Tactical',
  cognitive: 'Cognitive',
  social: 'Social',
  stability: 'Stability',
  technical: 'Technical',
}

const OPERATIONAL_ROLE_LABELS = {
  field: 'Field',
  containment: 'Containment',
  investigation: 'Investigation',
  support: 'Support',
} as const

export interface AgentTeamContext {
  id: string
  name: string
  tags: string[]
  leaderId: string | null
  statusState: string
  assignedCaseId?: string
  assignedCaseTitle?: string
}

export interface AgentCapabilitySummary {
  score: number
  domainAverages: Record<StatDomain, number>
  topDomain: StatDomain
  fatigueBand: FatigueBand
}

export interface AgentDomainSnapshot {
  key: StatDomain
  label: string
  base: number
  effective: number
  weighted: number
}

export interface AgentPerformanceSummary {
  score: number
  fieldPower: number
  containment: number
  investigation: number
  support: number
  stressImpact: number
  contribution: number
  threatHandled: number
  damageTaken: number
  healingPerformed: number
  evidenceGathered: number
  containmentActionsCompleted: number
}

export interface AgentProjectedStatCapRange {
  min: number
  max: number
}

export interface AgentEquipmentViewItem {
  slot: EquipmentSlotKind
  slotLabel: string
  itemId?: string
  itemLabel: string
  quality?: number
  qualityLabel: string
  totalModifierSummary: string
  baseModifierSummary: string
  contextualModifierSummary: string
  contextActive: boolean
  statusLabel: string
  empty: boolean
}

export interface AgentAbilityViewItem {
  id: string
  label: string
  description?: string
  type: 'passive' | 'active'
  trigger?: string
  effectSummary: string
  contextHint?: string
  activeInMvp: boolean
}

export interface AgentTraitViewItem {
  id: string
  label: string
  description?: string
  configuredSummary: string
  activeSummary: string
  active: boolean
}

export interface MaterializedAgentState {
  identity: {
    specialization: string
    callsign?: string
    codename?: string
    age?: number
    background?: string
    operationalRole?: string
  }
  assignment: {
    lifecycleState: string
    startedWeek?: number
    teamId?: string
    caseId?: string
    trainingProgramId?: string
    queueId?: string
  }
  service: {
    joinedWeek: number
    lastAssignmentWeek?: number
    lastCaseWeek?: number
    lastTrainingWeek?: number
    lastRecoveryWeek?: number
    readinessState: AgentReadinessProfile['state']
    readinessBand: AgentReadinessProfile['band']
    deploymentEligible: boolean
    recoveryRequired: boolean
    riskFlags: string[]
  }
  vitals: {
    health: number
    stress: number
    fatigue: number
    morale: number
    wounds: number
    statusFlags: string[]
  }
  performance: AgentPerformanceSummary
  assessments: TacticalAssessment[]
  domains: AgentDomainSnapshot[]
  equipmentSummary: {
    equippedSlots: number
    emptySlots: number
    activeContextSlots: number
    loadoutQuality: number
  }
  equipment: AgentEquipmentViewItem[]
  abilities: AgentAbilityViewItem[]
  traits: AgentTraitViewItem[]
  progression: NonNullable<Agent['progression']> & {
    skillTree: NonNullable<NonNullable<Agent['progression']>['skillTree']>
    actualPotentialTier: ExactPotentialTier
    visiblePotentialTier?: ExactPotentialTier
    exactPotentialKnown: boolean
    potentialConfidence: PotentialIntelConfidence
    potentialSource?: PotentialIntelSource
    discoveryProgress: number
    displayStatCaps?: StatBlock
    projectedStatCapRanges?: Record<keyof StatBlock, AgentProjectedStatCapRange>
    currentLevelStartXp: number
    nextLevelThresholdXp: number
    xpIntoCurrentLevel: number
    xpToNextLevel: number
    progressRatio: number
    progressPercent: number
  }
  history: {
    counters: NonNullable<Agent['history']>['counters']
    casesCompleted: number
    trainingsDone: number
    performanceStats: NonNullable<Agent['history']>['performanceStats']
    alliesWorkedWith: string[]
    recentTimeline: NonNullable<Agent['history']>['timeline']
    timelineCount: number
    recentLogs: NonNullable<Agent['history']>['logs']
    logCount: number
  }
}

export interface AgentView {
  agent: Agent
  team?: AgentTeamContext
  assignedCase?: GameState['cases'][string]
  trainingEntry?: GameState['trainingQueue'][number]
  assignmentLabel: string
  capability: AgentCapabilitySummary
  traitLabels: string[]
  domainTags: string[]
  materialized: MaterializedAgentState
  squadBuilderLabel: string
  squadBuilderLink: string
  squadBuilderBlockedReason?: string
}

export function getAgentTeamContext(
  game: GameState,
  agentId: string
): AgentTeamContext | undefined {
  for (const team of Object.values(game.teams)) {
    if (!getTeamMemberIds(team).includes(agentId)) {
      continue
    }

    const assignedCaseId = getTeamAssignedCaseId(team) ?? undefined
    const assignedCaseTitle = assignedCaseId ? game.cases[assignedCaseId]?.title : undefined

    return {
      id: team.id,
      name: team.name,
      tags: [...team.tags],
      leaderId: getTeamLeaderId(team, game.agents),
      statusState: team.status?.state ?? 'ready',
      assignedCaseId,
      assignedCaseTitle,
    }
  }

  return undefined
}

function buildProjectedStatCapRange(cap: number): AgentProjectedStatCapRange {
  if (cap >= 100) {
    return { min: 90, max: 100 }
  }

  const min = Math.max(0, Math.floor(cap / 10) * 10)

  return {
    min,
    max: Math.min(99, min + 9),
  }
}

function buildProjectedStatCapRanges(
  baseStats: StatBlock,
  visiblePotentialTier: ExactPotentialTier,
  growthProfile: string
) {
  const caps = buildAgentStatCaps(baseStats, visiblePotentialTier, growthProfile)

  return {
    combat: buildProjectedStatCapRange(caps.combat),
    investigation: buildProjectedStatCapRange(caps.investigation),
    utility: buildProjectedStatCapRange(caps.utility),
    social: buildProjectedStatCapRange(caps.social),
  } satisfies Record<keyof StatBlock, AgentProjectedStatCapRange>
}

export function getAgentView(game: GameState, agentId: string): AgentView | undefined {
  const agent = game.agents[agentId]

  if (!agent) {
    return undefined
  }

  const teamRecord = Object.values(game.teams).find((team) =>
    getTeamMemberIds(team).includes(agentId)
  )
  const team = getAgentTeamContext(game, agentId)
  const assignedCase = team?.assignedCaseId ? game.cases[team.assignedCaseId] : undefined
  const trainingEntry = game.trainingQueue.find((entry) => entry.agentId === agentId)
  const materialized = buildMaterializedAgentState(
    game,
    agent,
    teamRecord,
    assignedCase,
    trainingEntry
  )

  return {
    agent,
    team,
    assignedCase,
    trainingEntry,
    assignmentLabel: getAgentAssignmentLabel(team, assignedCase, trainingEntry),
    capability: buildCapabilitySummary(materialized),
    traitLabels: (agent.traits ?? []).map(
      (trait: NonNullable<Agent['traits']>[number]) => trait.label
    ),
    domainTags: buildAgentDomainTags(agent),
    materialized,
    ...buildSquadBuilderState(game, agentId, team),
  }
}

export function getAgentViews(game: GameState): AgentView[] {
  return Object.keys(game.agents)
    .map((agentId) => getAgentView(game, agentId))
    .filter((agentView): agentView is AgentView => Boolean(agentView))
    .sort((left, right) => {
      const leftAssigned = Number(left.agent.assignment?.state === 'assigned')
      const rightAssigned = Number(right.agent.assignment?.state === 'assigned')
      const leftTraining = Number(left.agent.assignment?.state === 'training')
      const rightTraining = Number(right.agent.assignment?.state === 'training')

      return (
        rightAssigned - leftAssigned ||
        rightTraining - leftTraining ||
        right.agent.fatigue - left.agent.fatigue ||
        left.agent.name.localeCompare(right.agent.name)
      )
    })
}

function buildCapabilitySummary(materialized: MaterializedAgentState): AgentCapabilitySummary {
  const domainAverages = Object.fromEntries(
    materialized.domains.map((domain) => [domain.key, domain.effective])
  ) as Record<StatDomain, number>
  const topDomain =
    STAT_DOMAINS.reduce((best, domain) =>
      domainAverages[domain] > domainAverages[best] ? domain : best
    ) ?? 'insight'

  return {
    score: Math.round(materialized.performance.score),
    domainAverages,
    topDomain,
    fatigueBand: getFatigueBand(materialized.vitals.fatigue),
  }
}

function getAgentAssignmentLabel(
  team: AgentTeamContext | undefined,
  assignedCase: GameState['cases'][string] | undefined,
  trainingEntry: GameState['trainingQueue'][number] | undefined
) {
  if (trainingEntry) {
    return `${trainingEntry.trainingName} (${trainingEntry.remainingWeeks}w remaining)`
  }

  if (assignedCase) {
    return assignedCase.title
  }

  if (team) {
    return `Reserve Unit ${team.name}`
  }

  return 'Reserve pool'
}

function getFatigueBand(fatigue: number): FatigueBand {
  if (fatigue >= 45) {
    return 'critical'
  }

  if (fatigue >= 20) {
    return 'strained'
  }

  return 'steady'
}

function buildSquadBuilderState(
  game: GameState,
  agentId: string,
  team: AgentTeamContext | undefined
) {
  const moveEligibility = getTeamMoveEligibility(game, agentId, null)

  if (team) {
    return {
      squadBuilderLabel: moveEligibility.allowed
        ? `Reassignable from ${team.name}`
        : (moveEligibility.reasons[0] ?? `Locked in ${team.name}`),
      squadBuilderLink: APP_ROUTES.teamDetail(team.id),
      squadBuilderBlockedReason: moveEligibility.allowed ? undefined : moveEligibility.reasons[0],
    }
  }

  return {
    squadBuilderLabel: moveEligibility.allowed
      ? 'Reserve pool'
      : (moveEligibility.reasons[0] ?? 'Reserve pool'),
    squadBuilderLink: APP_ROUTES.teams,
    squadBuilderBlockedReason: moveEligibility.allowed ? undefined : moveEligibility.reasons[0],
  }
}

function buildMaterializedAgentState(
  game: GameState,
  agent: Agent,
  team: Team | undefined,
  assignedCase: CaseInstance | undefined,
  trainingEntry: GameState['trainingQueue'][number] | undefined
): MaterializedAgentState {
  const supportTags = assignedCase
    ? [...assignedCase.requiredTags, ...assignedCase.preferredTags]
    : undefined
  const teamTags = team?.tags ?? []
  const leaderId = team ? getTeamLeaderId(team, game.agents) : null
  const breakdown = evaluateAgentBreakdown(agent, {
    caseData: assignedCase,
    supportTags,
    teamTags,
    leaderId,
    protocolState: buildAgencyProtocolState(game),
  })
  const baseStats = getAgentDomainStats(agent)
  const defaultProgression = createDefaultAgentProgression(agent.level ?? 1)
  const progression = synchronizeProgressionState(
    {
      ...defaultProgression,
      ...(agent.progression ?? {}),
      growthStats: {
        ...(defaultProgression.growthStats ?? {}),
        ...(agent.progression?.growthStats ?? {}),
      },
      skillTree: {
        skillPoints:
          agent.progression?.skillTree?.skillPoints ??
          defaultProgression.skillTree?.skillPoints ??
          0,
        ...(agent.progression?.skillTree?.specialization
          ? { specialization: agent.progression.skillTree.specialization }
          : defaultProgression.skillTree?.specialization
            ? { specialization: defaultProgression.skillTree.specialization }
            : {}),
        trainedRelationships: {
          ...(defaultProgression.skillTree?.trainedRelationships ?? {}),
          ...(agent.progression?.skillTree?.trainedRelationships ?? {}),
        },
      },
    },
    agent.level ?? 1
  ) as NonNullable<Agent['progression']> & {
    skillTree: NonNullable<NonNullable<Agent['progression']>['skillTree']>
  }
  const progressionSnapshot = getProgressionSnapshot(progression)
  const actualPotentialTier = normalizePotentialTier(progression.potentialTier, agent.baseStats)
  const potentialIntel = normalizePotentialIntel(progression.potentialIntel, actualPotentialTier)
  const exactPotentialKnown = potentialIntel.exactKnown ?? false
  const potentialConfidence = potentialIntel.confidence ?? 'unknown'
  const discoveryProgress = potentialIntel.discoveryProgress ?? 0
  const visiblePotentialTier = exactPotentialKnown
    ? actualPotentialTier
    : potentialIntel.visibleTier
  const displayStatCaps = exactPotentialKnown
    ? buildAgentStatCaps(
        agent.baseStats,
        actualPotentialTier,
        progression.growthProfile,
        progression.statCaps
      )
    : undefined
  const projectedStatCapRanges =
    !exactPotentialKnown && visiblePotentialTier
      ? buildProjectedStatCapRanges(
          agent.baseStats,
          visiblePotentialTier,
          progression.growthProfile
        )
      : undefined
  const serviceRecord: AgentServiceRecord = agent.serviceRecord ?? {
    joinedWeek: 1,
  }
  const readinessProfile: AgentReadinessProfile = agent.readinessProfile ?? {
    state:
      agent.assignment?.state === 'assigned'
        ? 'assigned'
        : agent.assignment?.state === 'training'
          ? 'training'
          : agent.assignment?.state === 'recovery' || agent.status !== 'active'
            ? agent.status === 'dead' || agent.status === 'resigned'
              ? 'unavailable'
              : 'recovering'
            : 'ready',
    band:
      agent.status === 'dead' || agent.status === 'resigned'
        ? 'unavailable'
        : agent.fatigue >= 45
          ? 'critical'
          : agent.fatigue >= 20
            ? 'strained'
            : 'steady',
    deploymentEligible:
      agent.status === 'active' &&
      (agent.assignment?.state ?? 'idle') === 'idle' &&
      agent.fatigue < 45,
    recoveryRequired: agent.status !== 'active' || agent.fatigue >= 60,
    riskFlags: [],
  }
  const history = agent.history ?? {
    counters: {
      assignmentsCompleted: 0,
      casesResolved: 0,
      casesPartiallyResolved: 0,
      casesFailed: 0,
      anomaliesContained: 0,
      recoveryWeeks: 0,
      trainingWeeks: 0,
      trainingsCompleted: 0,
      stressSustained: 0,
      damageSustained: 0,
      anomalyExposures: 0,
      evidenceRecovered: 0,
    },
    casesCompleted: 0,
    trainingsDone: 0,
    bonds: {},
    performanceStats: {
      deployments: 0,
      totalContribution: 0,
      totalThreatHandled: 0,
      totalDamageTaken: 0,
      totalHealingPerformed: 0,
      totalEvidenceGathered: 0,
      totalContainmentActionsCompleted: 0,
      totalFieldPower: 0,
      totalContainment: 0,
      totalInvestigation: 0,
      totalSupport: 0,
      totalStressImpact: 0,
      totalEquipmentContributionDelta: 0,
      totalKitContributionDelta: 0,
      totalProtocolContributionDelta: 0,
      totalEquipmentScoreDelta: 0,
      totalKitScoreDelta: 0,
      totalProtocolScoreDelta: 0,
      totalKitEffectivenessDelta: 0,
      totalProtocolEffectivenessDelta: 0,
    },
    alliesWorkedWith: [],
    timeline: [],
    logs: [],
  }
  const assignmentCaseId =
    agent.assignment?.state === 'assigned' ? agent.assignment.caseId : undefined

  return {
    identity: {
      specialization: formatSchemaLabel(agent.specialization ?? agent.role),
      callsign: agent.identity?.callsign,
      codename: agent.identity?.codename,
      age: agent.identity?.age ?? agent.age,
      background: agent.identity?.background,
      operationalRole: agent.operationalRole
        ? OPERATIONAL_ROLE_LABELS[agent.operationalRole]
        : undefined,
    },
    assignment: {
      lifecycleState: agent.assignment?.state ?? agent.assignmentStatus?.state ?? 'idle',
      startedWeek: agent.assignment?.startedWeek ?? agent.assignmentStatus?.startedWeek,
      teamId: team?.id ?? agent.assignmentStatus?.teamId ?? agent.assignment?.teamId,
      caseId: assignedCase?.id ?? agent.assignmentStatus?.caseId ?? assignmentCaseId,
      trainingProgramId:
        agent.assignment?.state === 'training'
          ? (agent.assignment.trainingProgramId ?? trainingEntry?.trainingId)
          : trainingEntry?.trainingId,
      queueId: trainingEntry?.id,
    },
    service: {
      joinedWeek: serviceRecord.joinedWeek,
      lastAssignmentWeek: serviceRecord.lastAssignmentWeek,
      lastCaseWeek: serviceRecord.lastCaseWeek,
      lastTrainingWeek: serviceRecord.lastTrainingWeek,
      lastRecoveryWeek: serviceRecord.lastRecoveryWeek,
      readinessState: readinessProfile.state,
      readinessBand: readinessProfile.band,
      deploymentEligible: readinessProfile.deploymentEligible,
      recoveryRequired: readinessProfile.recoveryRequired,
      riskFlags: [...readinessProfile.riskFlags],
    },
    vitals: {
      health: agent.vitals?.health ?? (agent.status === 'dead' ? 0 : 100),
      stress: agent.vitals?.stress ?? agent.fatigue,
      fatigue: agent.fatigue,
      morale:
        agent.vitals?.morale ??
        (agent.status === 'resigned' ? 0 : Math.max(0, 100 - agent.fatigue)),
      wounds: agent.vitals?.wounds ?? (agent.status === 'dead' ? 100 : 0),
      statusFlags: [...(agent.vitals?.statusFlags ?? [])],
    },
    performance: {
      score: Number(breakdown.score.toFixed(2)),
      fieldPower: Number(breakdown.performance.fieldPower.toFixed(2)),
      containment: Number(breakdown.performance.containment.toFixed(2)),
      investigation: Number(breakdown.performance.investigation.toFixed(2)),
      support: Number(breakdown.performance.support.toFixed(2)),
      stressImpact: Number(breakdown.performance.stressImpact.toFixed(2)),
      contribution: Number(breakdown.performance.contribution.toFixed(2)),
      threatHandled: Number(breakdown.performance.threatHandled.toFixed(2)),
      damageTaken: Number(breakdown.performance.damageTaken.toFixed(2)),
      healingPerformed: Number(breakdown.performance.healingPerformed.toFixed(2)),
      evidenceGathered: Number(breakdown.performance.evidenceGathered.toFixed(2)),
      containmentActionsCompleted: Number(
        breakdown.performance.containmentActionsCompleted.toFixed(2)
      ),
    },
    assessments: evaluateTacticalAssessments(agent, {
      caseData: assignedCase,
      supportTags,
      teamTags,
      leaderId,
    }),
    domains: STAT_DOMAINS.map((domain) => ({
      key: domain,
      label: DOMAIN_LABELS[domain],
      base: Math.round(domainAverage(baseStats, domain)),
      effective: Math.round(breakdown.derived.domainProfile[domain]),
      weighted: Number(breakdown.contributionByDomain[domain].toFixed(2)),
    })),
    equipmentSummary: buildEquipmentSummary(agent, assignedCase, supportTags, teamTags),
    equipment: buildEquipmentItems(agent, assignedCase, supportTags, teamTags),
    abilities: buildAbilityItems(agent),
    traits: buildTraitItems(agent, assignedCase, supportTags, teamTags, leaderId),
    progression: {
      ...progression,
      actualPotentialTier,
      visiblePotentialTier,
      exactPotentialKnown,
      potentialConfidence,
      ...(potentialIntel.source ? { potentialSource: potentialIntel.source } : {}),
      discoveryProgress,
      displayStatCaps,
      projectedStatCapRanges,
      statCaps: displayStatCaps,
      ...progressionSnapshot,
    },
    history: {
      counters: history.counters,
      casesCompleted: history.casesCompleted,
      trainingsDone: history.trainingsDone,
      performanceStats: history.performanceStats,
      alliesWorkedWith: history.alliesWorkedWith,
      recentTimeline: [...history.timeline].slice(-6).reverse(),
      timelineCount: history.timeline.length,
      recentLogs: [...history.logs].slice(-6).reverse(),
      logCount: history.logs.length,
    },
  }
}

function buildAgentDomainTags(agent: Agent) {
  return [
    ...new Set(
      [
        ...(agent.tags ?? []),
        agent.role,
        agent.specialization,
        agent.operationalRole,
        ...(agent.traits ?? []).map((trait) => trait.label || trait.id),
      ]
        .filter((tag): tag is string => Boolean(tag))
        .map((tag) => formatSchemaLabel(tag))
    ),
  ]
}

function formatSchemaLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function buildEquipmentItems(
  agent: Agent,
  assignedCase: CaseInstance | undefined,
  supportTags: string[] | undefined,
  teamTags: string[]
): AgentEquipmentViewItem[] {
  const equippedItems = resolveEquippedItems(agent, {
    caseData: assignedCase,
    supportTags,
    teamTags,
  })
  const bySlot = new Map(equippedItems.map((item) => [item.slot, item]))

  return (Object.entries(EQUIPMENT_SLOT_LABELS) as [EquipmentSlotKind, string][]).map(
    ([slot, slotLabel]) => {
      const item = bySlot.get(slot)
      const baseSummary = item ? formatModifierSummary(item.baseModifiers) : 'No additive modifiers'
      const contextualSummary = item
        ? formatModifierSummary(item.activeModifiers)
        : 'No context bonus'
      const totalSummary = item ? formatModifierSummary(item.statModifiers) : 'No modifiers'
      const contextActive = item ? hasEquipmentStatModifiers(item.activeModifiers) : false

      return {
        slot,
        slotLabel,
        itemId: item?.id,
        itemLabel: item ? item.name : 'Empty slot',
        quality: item?.quality,
        qualityLabel: item ? `Quality ${item.quality}` : 'Empty',
        totalModifierSummary: totalSummary,
        baseModifierSummary: item ? baseSummary : 'No modifiers',
        contextualModifierSummary: item
          ? contextActive
            ? contextualSummary
            : 'No context bonus active'
          : 'No item slotted',
        contextActive,
        statusLabel: item ? (contextActive ? 'Context live' : 'Static only') : 'Empty',
        empty: !item,
      }
    }
  )
}

function buildEquipmentSummary(
  agent: Agent,
  assignedCase: CaseInstance | undefined,
  supportTags: string[] | undefined,
  teamTags: string[]
) {
  const summary = buildAgentEquipmentSummary(agent, {
    caseData: assignedCase,
    supportTags,
    teamTags,
  })

  return {
    equippedSlots: summary.equippedItemCount,
    emptySlots: summary.emptySlotCount,
    activeContextSlots: summary.activeContextItemCount,
    loadoutQuality: summary.loadoutQuality,
  }
}

function buildAbilityItems(agent: Agent): AgentAbilityViewItem[] {
  return (agent.abilities ?? []).map((ability) => {
    const effect = resolveAbilityEffect(ability, {
      agent,
      phase: 'evaluation',
    })

    return {
      id: ability.id,
      label: ability.label,
      description: ability.description,
      type: ability.type,
      trigger: formatAbilityTrigger(ability.trigger),
      effectSummary: formatAbilityEffectSummary(effect),
      contextHint: getAbilityContextHint(ability),
      activeInMvp: effect.activeInMvp,
    }
  })
}

function buildTraitItems(
  agent: Agent,
  assignedCase: CaseInstance | undefined,
  supportTags: string[] | undefined,
  teamTags: string[],
  leaderId: string | null
): AgentTraitViewItem[] {
  return (agent.traits ?? []).map((trait) => {
    const resolvedTrait = resolveTraitEffect(trait, {
      agent,
      phase: 'evaluation',
      caseData: assignedCase,
      supportTags,
      teamTags,
      leaderId,
    })
    const activeSummary = formatTraitEffectSummary(resolvedTrait.effect)

    return {
      id: trait.id,
      label: trait.label,
      description: trait.description,
      configuredSummary: formatModifierSummary(trait.modifiers),
      activeSummary,
      active: resolvedTrait.active && activeSummary !== 'No active modifiers',
    }
  })
}

function formatTraitEffectSummary(effect: TraitModifierResult) {
  const parts: string[] = []
  const statSummary = formatModifierSummary(effect.statModifiers)

  if (statSummary !== 'No active modifiers') {
    parts.push(statSummary)
  }

  if (effect.effectivenessMultiplier !== 1) {
    parts.push(`Effectiveness x${effect.effectivenessMultiplier.toFixed(2)}`)
  }

  if (effect.stressImpactMultiplier !== 1) {
    parts.push(`Stress impact x${effect.stressImpactMultiplier.toFixed(2)}`)
  }

  if (effect.moraleRecoveryDelta !== 0) {
    parts.push(`Morale recovery ${formatSigned(effect.moraleRecoveryDelta)}`)
  }

  return parts.length > 0 ? parts.join(' / ') : 'No active modifiers'
}

function formatAbilityEffectSummary(effect: AbilityEffectResult) {
  const parts: string[] = []
  const statSummary = formatModifierSummary(effect.modifiers)

  if (statSummary !== 'No active modifiers') {
    parts.push(statSummary)
  }

  if (effect.effectivenessMultiplier !== 1) {
    parts.push(`Effectiveness x${effect.effectivenessMultiplier.toFixed(2)}`)
  }

  if (effect.stressImpactMultiplier !== 1) {
    parts.push(`Stress impact x${effect.stressImpactMultiplier.toFixed(2)}`)
  }

  if (effect.moraleRecoveryDelta !== 0) {
    parts.push(`Morale recovery ${formatSigned(effect.moraleRecoveryDelta)}`)
  }

  return parts.length > 0 ? parts.join(' / ') : 'No active modifiers'
}

function formatModifierSummary(
  modifiers:
    | Partial<Record<AgentTraitModifierKey, number>>
    | Partial<Record<StatDomain | LegacyStatDomain, { [key: string]: number | undefined }>>
) {
  const domainModifiers = Object.entries(modifiers ?? {}).flatMap<[string, number]>(
    ([key, value]) => {
      if (!value) {
        return []
      }

      if (typeof value === 'number') {
        return [[key, value]]
      }

      const sum = Object.values(value)
        .filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
        .reduce((total, entry) => total + entry, 0)

      return sum !== 0 ? [[key, sum]] : []
    }
  )

  if (domainModifiers.length === 0) {
    return 'No active modifiers'
  }

  return domainModifiers
    .map(
      ([key, value]) =>
        `${formatModifierLabel(key as AgentTraitModifierKey)} ${formatSigned(value)}`
    )
    .join(' / ')
}

function formatModifierLabel(key: AgentTraitModifierKey) {
  if (key === 'overall') {
    return 'Overall'
  }

  return DOMAIN_LABELS[key as StatDomain] ?? LEGACY_DOMAIN_LABELS[key as LegacyStatDomain] ?? key
}

function formatSigned(value: number) {
  return value > 0 ? `+${value}` : String(value)
}
