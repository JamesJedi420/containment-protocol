import { type AgentSimulationProfile } from './agent/models'
import { buildAgentSimulationProfile } from './agent/simulation'
import { isAgentRecordNormalized, normalizeAgentRecord } from './agent/normalize'
import { clamp } from './math'
import {
  aggregateRuntimeModifierResults,
  createRuntimeModifierResult,
} from './modifierRuntime'
import {
  type Agent,
  type AgentAbilityTrigger,
  type AgentPerformanceOutput,
  type CaseInstance,
  type GameState,
  type Id,
  type LeaderBonus,
  type PerformanceMetricSummary,
  type PowerImpactSummary,
  type StatBlock,
  type StatDomain,
  type TeamChemistryProfile,
  type TeamSynergyProfile,
  type TeamResolutionProfile,
  type Team,
  type TeamDerivedStats,
  type TeamPowerSummary,
  type TeamStatus,
  type WeightBlock,
} from './models'
import { createDefaultTeamSynergyProfile, evaluateTeamSynergy } from './synergy'
import { calcTeamChemistry } from './sim/chemistry'
import { domainAverage } from './statDomains'
import { createDefaultTeamState, resolveTeamStatus } from './teamStateMachine'
import {
  buildTeamEquipmentSummary,
  createDefaultTeamEquipmentSummary,
  type TeamEquipmentSummary,
} from './equipment'
import type { AgencyProtocolState } from './protocols'

export interface TeamCompositionProfile {
  members: Agent[]
  agentProfiles: AgentSimulationProfile[]
  agentPerformance: AgentPerformanceOutput[]
  performanceSummary: PerformanceMetricSummary
  powerImpactSummary: PowerImpactSummary
  equipmentSummary: TeamEquipmentSummary
  powerSummary: TeamPowerSummary
  leaderId: Id | null
  derivedStats: TeamDerivedStats
  resolutionProfile: TeamResolutionProfile
  chemistryProfile: TeamChemistryProfile
  synergyProfile: TeamSynergyProfile
  leaderResolutionProfile: TeamResolutionProfile | null
  leaderBonus: LeaderBonus
  chemistryBonus: number
  projectedCaseStats: StatBlock
}

export interface TeamCompositionEvaluationContext {
  caseData?: CaseInstance
  inventory?: Record<string, number>
  supportTags?: string[]
  teamTags?: string[]
  leaderId?: Id | null
  protocolState?: AgencyProtocolState
  triggerEvent?: AgentAbilityTrigger
}

const RESOLUTION_PROFILE_KEYS = [
  'fieldPower',
  'containment',
  'investigation',
  'support',
] as const satisfies readonly (keyof TeamResolutionProfile)[]

const LEADER_EFFECTIVENESS_RANGE = 0.06
const LEADER_EVENT_RANGE = 0.15
const LEADER_XP_RANGE = 0.12
const LEADER_STRESS_RANGE = 0.18
const LEADER_EFFECTIVENESS_BASELINE = 35
const LEADER_EVENT_BASELINE = 42
const LEADER_XP_BASELINE = 55
const LEADER_STRESS_BASELINE = 52

const LEADER_EFFECTIVENESS_DOMAIN_WEIGHTS: Record<StatDomain, number> = {
  field: 0.3,
  resilience: 0.18,
  control: 0.18,
  insight: 0.12,
  presence: 0.12,
  anomaly: 0.1,
}

const LEADER_EVENT_DOMAIN_WEIGHTS: Record<StatDomain, number> = {
  field: 0.06,
  resilience: 0.1,
  control: 0.2,
  insight: 0.22,
  presence: 0.18,
  anomaly: 0.24,
}

const LEADER_XP_DOMAIN_WEIGHTS: Record<StatDomain, number> = {
  field: 0.08,
  resilience: 0.14,
  control: 0.18,
  insight: 0.22,
  presence: 0.26,
  anomaly: 0.12,
}

const LEADER_STRESS_DOMAIN_WEIGHTS: Record<StatDomain, number> = {
  field: 0.06,
  resilience: 0.32,
  control: 0.12,
  insight: 0.08,
  presence: 0.18,
  anomaly: 0.24,
}

const EMPTY_TEAM_RESOLUTION_PROFILE: TeamResolutionProfile = {
  fieldPower: 0,
  containment: 0,
  investigation: 0,
  support: 0,
}

const EMPTY_TEAM_DERIVED_STATS: TeamDerivedStats = {
  overall: 0,
  fieldPower: 0,
  containment: 0,
  investigation: 0,
  support: 0,
  cohesion: 0,
  chemistryScore: 0,
  readiness: 0,
}

const NEUTRAL_LEADER_BONUS: LeaderBonus = {
  effectivenessMultiplier: 1,
  eventModifier: 0,
  xpBonus: 0,
  stressModifier: 0,
}

const TEAM_DERIVED_STAT_KEYS = [
  'overall',
  'fieldPower',
  'containment',
  'investigation',
  'support',
  'cohesion',
  'chemistryScore',
  'readiness',
] as const satisfies readonly (keyof TeamDerivedStats)[]

const EMPTY_TEAM_MEMBER_SOURCE = {
  agentIds: [],
} satisfies Pick<Team, 'agentIds'>

const EMPTY_AGENT_PERFORMANCE: AgentPerformanceOutput[] = []

const EMPTY_PERFORMANCE_METRIC_SUMMARY: PerformanceMetricSummary = {
  contribution: 0,
  threatHandled: 0,
  damageTaken: 0,
  healingPerformed: 0,
  evidenceGathered: 0,
  containmentActionsCompleted: 0,
}

const EMPTY_TEAM_POWER_SUMMARY: TeamPowerSummary = {
  inventory: [],
  kits: [],
  protocols: [],
  statModifiers: {},
  effectivenessMultiplier: 1,
  stressImpactMultiplier: 1,
  moraleRecoveryDelta: 0,
}

const EMPTY_POWER_IMPACT_SUMMARY: PowerImpactSummary = {
  activeEquipmentIds: [],
  activeKitIds: [],
  activeProtocolIds: [],
  equipmentContributionDelta: 0,
  kitContributionDelta: 0,
  protocolContributionDelta: 0,
  equipmentScoreDelta: 0,
  kitScoreDelta: 0,
  protocolScoreDelta: 0,
  kitEffectivenessMultiplier: 1,
  protocolEffectivenessMultiplier: 1,
  notes: [],
}

function toFiniteNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

function toRoundedFinite(value: number, digits = 2) {
  const finiteValue = toFiniteNumber(value)
  if (digits <= 0) {
    return Math.round(finiteValue)
  }

  return Number(finiteValue.toFixed(digits))
}

export function createDefaultTeamDerivedStats(): TeamDerivedStats {
  return { ...EMPTY_TEAM_DERIVED_STATS }
}

export function createDefaultTeamResolutionProfile(): TeamResolutionProfile {
  return { ...EMPTY_TEAM_RESOLUTION_PROFILE }
}

export function createNeutralLeaderBonus(): LeaderBonus {
  return { ...NEUTRAL_LEADER_BONUS }
}

export function createDefaultTeamChemistryProfile(): TeamChemistryProfile {
  return {
    relationships: [],
    raw: 0,
    bonus: 0,
    pairs: 0,
    average: 0,
  }
}

export function createDefaultPerformanceMetricSummary(): PerformanceMetricSummary {
  return { ...EMPTY_PERFORMANCE_METRIC_SUMMARY }
}

export function createDefaultTeamPowerSummary(): TeamPowerSummary {
  return {
    ...EMPTY_TEAM_POWER_SUMMARY,
    inventory: [],
    kits: [],
    protocols: [],
    statModifiers: {},
  }
}

export function createDefaultPowerImpactSummary(): PowerImpactSummary {
  return {
    ...EMPTY_POWER_IMPACT_SUMMARY,
    activeEquipmentIds: [],
    activeKitIds: [],
    activeProtocolIds: [],
    notes: [],
  }
}

export function createDefaultTeamStatus(assignedCaseId: Id | null = null): TeamStatus {
  return {
    state: createDefaultTeamState(assignedCaseId),
    assignedCaseId,
  }
}

function buildResolutionProfileFromAgentPerformance(
  agentPerformance: readonly Pick<
    AgentPerformanceOutput,
    'fieldPower' | 'containment' | 'investigation' | 'support'
  >[]
): TeamResolutionProfile {
  return agentPerformance.reduce<TeamResolutionProfile>((profile, performance) => {
    profile.fieldPower += toFiniteNumber(performance.fieldPower)
    profile.containment += toFiniteNumber(performance.containment)
    profile.investigation += toFiniteNumber(performance.investigation)
    profile.support += toFiniteNumber(performance.support)
    return profile
  }, createDefaultTeamResolutionProfile())
}

function buildPerformanceMetricSummary(
  agentPerformance: readonly Pick<
    AgentPerformanceOutput,
    | 'contribution'
    | 'threatHandled'
    | 'damageTaken'
    | 'healingPerformed'
    | 'evidenceGathered'
    | 'containmentActionsCompleted'
  >[]
): PerformanceMetricSummary {
  return agentPerformance.reduce<PerformanceMetricSummary>(
    (summary, performance) => {
      summary.contribution += toFiniteNumber(performance.contribution)
      summary.threatHandled += toFiniteNumber(performance.threatHandled)
      summary.damageTaken += toFiniteNumber(performance.damageTaken)
      summary.healingPerformed += toFiniteNumber(performance.healingPerformed)
      summary.evidenceGathered += toFiniteNumber(performance.evidenceGathered)
      summary.containmentActionsCompleted += toFiniteNumber(
        performance.containmentActionsCompleted
      )
      return summary
    },
    createDefaultPerformanceMetricSummary()
  )
}

function buildTeamPowerSummary(
  agentProfiles: readonly AgentSimulationProfile[],
  equipmentSummary: TeamEquipmentSummary,
  inventory: Record<string, number> = {}
): TeamPowerSummary {
  const kitMap = new Map<string, TeamPowerSummary['kits'][number]>()
  const protocolMap = new Map<string, TeamPowerSummary['protocols'][number]>()
  const inventoryMap = new Map<string, TeamPowerSummary['inventory'][number]>()

  for (const profile of agentProfiles) {
    for (const kit of profile.powerLayer.kits) {
      const current = kitMap.get(kit.id)

      if (!current) {
        kitMap.set(kit.id, {
          id: kit.id,
          label: kit.label,
          contributorIds: [profile.agentId],
          contributorCount: 1,
          matchedItemIds: [...kit.matchedItemIds],
          matchedTags: [...kit.matchedTags],
          activeThresholds: [...kit.activeThresholds],
          highestActiveThreshold: kit.highestActiveThreshold,
          statModifiers: { ...kit.statModifiers },
          effectivenessMultiplier: kit.effectivenessMultiplier,
          stressImpactMultiplier: kit.stressImpactMultiplier,
          moraleRecoveryDelta: kit.moraleRecoveryDelta,
        })
        continue
      }

      current.contributorIds = [...new Set([...current.contributorIds, profile.agentId])]
      current.contributorCount = current.contributorIds.length
      current.matchedItemIds = [...new Set([...current.matchedItemIds, ...kit.matchedItemIds])].sort(
        (left, right) => left.localeCompare(right)
      )
      current.matchedTags = [...new Set([...current.matchedTags, ...kit.matchedTags])].sort(
        (left, right) => left.localeCompare(right)
      )
      current.activeThresholds = [...new Set([...current.activeThresholds, ...kit.activeThresholds])].sort(
        (left, right) => left - right
      )
      current.highestActiveThreshold = Math.max(
        current.highestActiveThreshold,
        kit.highestActiveThreshold
      )
      current.effectivenessMultiplier = Number(
        (current.effectivenessMultiplier * kit.effectivenessMultiplier).toFixed(4)
      )
      current.stressImpactMultiplier = Number(
        (current.stressImpactMultiplier * kit.stressImpactMultiplier).toFixed(4)
      )
      current.moraleRecoveryDelta = Number(
        (current.moraleRecoveryDelta + kit.moraleRecoveryDelta).toFixed(4)
      )
      const mergedModifiers = aggregateRuntimeModifierResults([
        createRuntimeModifierResult({ statModifiers: current.statModifiers }),
        createRuntimeModifierResult({ statModifiers: kit.statModifiers }),
      ])
      current.statModifiers = { ...mergedModifiers.statModifiers }
    }

    for (const protocol of profile.powerLayer.protocols) {
      const current = protocolMap.get(protocol.id)

      if (!current) {
        protocolMap.set(protocol.id, {
          id: protocol.id,
          label: protocol.label,
          type: protocol.type,
          tier: protocol.tier,
          scope: protocol.scope,
          contributorIds: [profile.agentId],
          contributorCount: 1,
          unlockReasons: [protocol.unlockReason],
          globalModifiers: { ...protocol.globalModifiers },
          statModifiers: { ...protocol.statModifiers },
          effectivenessMultiplier: protocol.effectivenessMultiplier,
          stressImpactMultiplier: protocol.stressImpactMultiplier,
          moraleRecoveryDelta: protocol.moraleRecoveryDelta,
        })
        continue
      }

      current.contributorIds = [...new Set([...current.contributorIds, profile.agentId])]
      current.contributorCount = current.contributorIds.length
      current.unlockReasons = [...new Set([...current.unlockReasons, protocol.unlockReason])]
      current.effectivenessMultiplier = Number(
        (current.effectivenessMultiplier * protocol.effectivenessMultiplier).toFixed(4)
      )
      current.stressImpactMultiplier = Number(
        (current.stressImpactMultiplier * protocol.stressImpactMultiplier).toFixed(4)
      )
      current.moraleRecoveryDelta = Number(
        (current.moraleRecoveryDelta + protocol.moraleRecoveryDelta).toFixed(4)
      )
      const mergedModifiers = aggregateRuntimeModifierResults([
        createRuntimeModifierResult({ statModifiers: current.statModifiers }),
        createRuntimeModifierResult({ statModifiers: protocol.statModifiers }),
      ])
      current.statModifiers = { ...mergedModifiers.statModifiers }
    }
  }

  for (const item of equipmentSummary.equippedItems) {
    const current = inventoryMap.get(item.id)

    if (!current) {
      inventoryMap.set(item.id, {
        itemId: item.id,
        name: item.name,
        equippedCount: 1,
        activeContextCount: item.contextActive ? 1 : 0,
        stockOnHand: Math.max(0, Math.trunc(inventory[item.id] ?? 0)),
        totalQuality: item.quality,
        tags: [...item.tags].sort((left, right) => left.localeCompare(right)),
      })
      continue
    }

    current.equippedCount += 1
    current.activeContextCount += item.contextActive ? 1 : 0
    current.totalQuality += item.quality
    current.tags = [...new Set([...current.tags, ...item.tags])].sort((left, right) =>
      left.localeCompare(right)
    )
  }

  const aggregateEffects = aggregateRuntimeModifierResults([
    ...Array.from(kitMap.values()).map((kit) =>
      createRuntimeModifierResult({
        statModifiers: kit.statModifiers,
        effectivenessMultiplier: kit.effectivenessMultiplier,
        stressImpactMultiplier: kit.stressImpactMultiplier,
        moraleRecoveryDelta: kit.moraleRecoveryDelta,
      })
    ),
    ...Array.from(protocolMap.values()).map((protocol) =>
      createRuntimeModifierResult({
        statModifiers: protocol.statModifiers,
        effectivenessMultiplier: protocol.effectivenessMultiplier,
        stressImpactMultiplier: protocol.stressImpactMultiplier,
        moraleRecoveryDelta: protocol.moraleRecoveryDelta,
      })
    ),
  ])

  return {
    inventory: Array.from(inventoryMap.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    ),
    kits: Array.from(kitMap.values()).sort((left, right) => left.label.localeCompare(right.label)),
    protocols: Array.from(protocolMap.values()).sort((left, right) =>
      left.label.localeCompare(right.label)
    ),
    statModifiers: { ...aggregateEffects.statModifiers },
    effectivenessMultiplier: Number(aggregateEffects.effectivenessMultiplier.toFixed(4)),
    stressImpactMultiplier: Number(aggregateEffects.stressImpactMultiplier.toFixed(4)),
    moraleRecoveryDelta: Number(aggregateEffects.moraleRecoveryDelta.toFixed(4)),
  }
}

function buildPowerImpactNotes(summary: Omit<PowerImpactSummary, 'notes'>): string[] {
  const notes: string[] = []

  if (summary.activeEquipmentIds.length > 0) {
    notes.push(
      `Gear shifted contribution by ${summary.equipmentContributionDelta >= 0 ? '+' : ''}${toRoundedFinite(
        summary.equipmentContributionDelta
      )} and score by ${summary.equipmentScoreDelta >= 0 ? '+' : ''}${toRoundedFinite(
        summary.equipmentScoreDelta
      )}.`
    )
  }

  if (summary.activeKitIds.length > 0) {
    notes.push(
      `Kits applied x${toRoundedFinite(summary.kitEffectivenessMultiplier, 4)} effectiveness and ${summary.kitScoreDelta >= 0 ? '+' : ''}${toRoundedFinite(
        summary.kitScoreDelta
      )} score.`
    )
  }

  if (summary.activeProtocolIds.length > 0) {
    notes.push(
      `Protocols shifted contribution by ${summary.protocolContributionDelta >= 0 ? '+' : ''}${toRoundedFinite(
        summary.protocolContributionDelta
      )} and score by ${summary.protocolScoreDelta >= 0 ? '+' : ''}${toRoundedFinite(
        summary.protocolScoreDelta
      )}.`
    )
  }

  return notes
}

function buildPowerImpactSummary(
  agentPerformance: readonly AgentPerformanceOutput[],
  powerSummary: TeamPowerSummary
): PowerImpactSummary {
  const summary = agentPerformance.reduce<Omit<PowerImpactSummary, 'notes'>>(
    (current, performance) => {
      const powerImpact = performance.powerImpact

      if (!powerImpact) {
        return current
      }

      current.equipmentContributionDelta += toFiniteNumber(
        powerImpact.equipmentContributionDelta
      )
      current.kitContributionDelta += toFiniteNumber(powerImpact.kitContributionDelta)
      current.protocolContributionDelta += toFiniteNumber(
        powerImpact.protocolContributionDelta
      )
      current.equipmentScoreDelta += toFiniteNumber(powerImpact.equipmentScoreDelta)
      current.kitScoreDelta += toFiniteNumber(powerImpact.kitScoreDelta)
      current.protocolScoreDelta += toFiniteNumber(powerImpact.protocolScoreDelta)
      current.kitEffectivenessMultiplier = Number(
        (current.kitEffectivenessMultiplier *
          toFiniteNumber(powerImpact.kitEffectivenessMultiplier, 1)).toFixed(4)
      )
      current.protocolEffectivenessMultiplier = Number(
        (current.protocolEffectivenessMultiplier *
          toFiniteNumber(powerImpact.protocolEffectivenessMultiplier, 1)).toFixed(4)
      )
      return current
    },
    {
      activeEquipmentIds: [],
      activeKitIds: [],
      activeProtocolIds: [],
      equipmentContributionDelta: 0,
      kitContributionDelta: 0,
      protocolContributionDelta: 0,
      equipmentScoreDelta: 0,
      kitScoreDelta: 0,
      protocolScoreDelta: 0,
      kitEffectivenessMultiplier: 1,
      protocolEffectivenessMultiplier: 1,
    }
  )

  summary.activeEquipmentIds = [...new Set(powerSummary.inventory.map((entry) => entry.itemId))].sort(
    (left, right) => left.localeCompare(right)
  )
  summary.activeKitIds = [...new Set(powerSummary.kits.map((kit) => kit.id))].sort((left, right) =>
    left.localeCompare(right)
  )
  summary.activeProtocolIds = [...new Set(powerSummary.protocols.map((protocol) => protocol.id))].sort(
    (left, right) => left.localeCompare(right)
  )

  return {
    ...summary,
    equipmentContributionDelta: toRoundedFinite(summary.equipmentContributionDelta),
    kitContributionDelta: toRoundedFinite(summary.kitContributionDelta),
    protocolContributionDelta: toRoundedFinite(summary.protocolContributionDelta),
    equipmentScoreDelta: toRoundedFinite(summary.equipmentScoreDelta),
    kitScoreDelta: toRoundedFinite(summary.kitScoreDelta),
    protocolScoreDelta: toRoundedFinite(summary.protocolScoreDelta),
    kitEffectivenessMultiplier: toRoundedFinite(summary.kitEffectivenessMultiplier, 4),
    protocolEffectivenessMultiplier: toRoundedFinite(
      summary.protocolEffectivenessMultiplier,
      4
    ),
    notes: buildPowerImpactNotes(summary),
  }
}

function averageResolutionProfile(
  profile: TeamResolutionProfile,
  memberCount: number
): TeamResolutionProfile {
  if (memberCount <= 0) {
    return createDefaultTeamResolutionProfile()
  }

  return {
    fieldPower: profile.fieldPower / memberCount,
    containment: profile.containment / memberCount,
    investigation: profile.investigation / memberCount,
    support: profile.support / memberCount,
  }
}

export function getTeamMemberIds(team: Pick<Team, 'memberIds' | 'agentIds'>): Id[] {
  const memberIds = Array.isArray(team.memberIds) ? team.memberIds : undefined
  const agentIds = Array.isArray(team.agentIds) ? team.agentIds : undefined

  if (memberIds && agentIds) {
    const sameMembers =
      memberIds.length === agentIds.length &&
      memberIds.every((memberId) => agentIds.includes(memberId))

    return [...new Set(sameMembers ? memberIds : agentIds)]
  }

  return [...new Set(memberIds ?? agentIds ?? [])]
}

export function getTeamMembers(
  team: Pick<Team, 'memberIds' | 'agentIds'> | undefined,
  agentsById: GameState['agents']
): Agent[] {
  return getTeamMemberIds(team ?? EMPTY_TEAM_MEMBER_SOURCE)
    .map((agentId) => agentsById[agentId])
    .filter((agent): agent is Agent => Boolean(agent))
}

export function getUniqueTeamMemberIds(
  teamIds: readonly Id[],
  teams: GameState['teams']
): Id[] {
  return [...new Set(teamIds.flatMap((teamId) => getTeamMemberIds(teams[teamId] ?? EMPTY_TEAM_MEMBER_SOURCE)))]
}

export function getUniqueTeamMembers(
  teamIds: readonly Id[],
  teams: GameState['teams'],
  agentsById: GameState['agents']
): Agent[] {
  return getUniqueTeamMemberIds(teamIds, teams)
    .map((agentId) => agentsById[agentId])
    .filter((agent): agent is Agent => Boolean(agent))
}

export function getTeamAssignedCaseId(team: Pick<Team, 'status' | 'assignedCaseId'>): Id | null {
  const statusAssignedCaseId = team.status?.assignedCaseId ?? null

  if (statusAssignedCaseId !== null) {
    return statusAssignedCaseId
  }

  if (Object.prototype.hasOwnProperty.call(team, 'assignedCaseId')) {
    return team.assignedCaseId ?? null
  }

  return null
}

export function getTeamLeaderId(
  team: Pick<Team, 'leaderId' | 'memberIds' | 'agentIds'>,
  agents: GameState['agents']
): Id | null {
  const memberIds = getTeamMemberIds(team)

  if (team.leaderId && memberIds.includes(team.leaderId)) {
    return team.leaderId
  }

  return memberIds.find((agentId) => agents[agentId] && agents[agentId].status !== 'dead') ?? null
}

export function buildAgentSquadCompositionProfile(
  agents: Agent[],
  leaderId: Id | null = null,
  teamTags: string[] = [],
  evaluationContext: TeamCompositionEvaluationContext = {}
): TeamCompositionProfile {
  if (agents.length === 0) {
    return {
      members: [],
      agentProfiles: [],
      agentPerformance: EMPTY_AGENT_PERFORMANCE,
      performanceSummary: createDefaultPerformanceMetricSummary(),
      powerImpactSummary: createDefaultPowerImpactSummary(),
      equipmentSummary: createDefaultTeamEquipmentSummary(),
      powerSummary: createDefaultTeamPowerSummary(),
      leaderId,
      derivedStats: createDefaultTeamDerivedStats(),
      resolutionProfile: createDefaultTeamResolutionProfile(),
      chemistryProfile: createDefaultTeamChemistryProfile(),
      synergyProfile: createDefaultTeamSynergyProfile(),
      leaderResolutionProfile: null,
      leaderBonus: createNeutralLeaderBonus(),
      chemistryBonus: 0,
      projectedCaseStats: { combat: 0, investigation: 0, utility: 0, social: 0 },
    }
  }

  const agentProfiles = agents.map((agent) =>
    buildAgentSimulationProfile(agent, {
      caseData: evaluationContext.caseData,
      supportTags: evaluationContext.supportTags,
      teamTags: evaluationContext.teamTags ?? teamTags,
      leaderId: evaluationContext.leaderId ?? leaderId,
      protocolState: evaluationContext.protocolState,
      triggerEvent: evaluationContext.triggerEvent,
    })
  )
  const members = agentProfiles.map((profile) => profile.agent)
  const agentPerformance = agentProfiles.map((profile) => profile.performance)
  const performanceSummary = buildPerformanceMetricSummary(agentPerformance)
  const equipmentSummary = buildTeamEquipmentSummary(members, evaluationContext)
  const powerSummary = buildTeamPowerSummary(
    agentProfiles,
    equipmentSummary,
    evaluationContext.inventory
  )
  const powerImpactSummary = buildPowerImpactSummary(agentPerformance, powerSummary)
  const chemistry = calcTeamChemistry(members)
  const synergyProfile = evaluateTeamSynergy(members, teamTags)
  const leader = leaderId ? members.find((agent) => agent.id === leaderId) : members[0]
  const leaderProfile = leader
    ? agentProfiles.find((profile) => profile.agentId === leader.id) ?? null
    : null
  const averageFatigue = Math.round(
    members.reduce((sum, agent) => sum + toFiniteNumber(agent.fatigue), 0) /
      Math.max(members.length, 1)
  )
  const inactivePenalty = members.filter((agent) => agent.status !== 'active').length * 12
  const trainingPenalty =
    members.filter((agent) => agent.assignment?.state === 'training').length * 18
  const trustPenalty = members.reduce((sum, agent) => {
    const multiplier = agent.performancePenaltyMultiplier

    if (multiplier === undefined || multiplier >= 1) {
      return sum
    }

    return sum + Math.round((1 - multiplier) * 20)
  }, 0)
  const readiness = clamp(
    100 - averageFatigue - inactivePenalty - trainingPenalty - trustPenalty,
    0,
    100
  )
  const leaderBonus = leaderProfile
    ? deriveLeaderBonus(leaderProfile, members.length)
    : createNeutralLeaderBonus()
  const leadershipScore = leaderProfile
    ? clamp(
        Math.round(
          (computeLeadershipDomainScore(
            leaderProfile,
            LEADER_EFFECTIVENESS_DOMAIN_WEIGHTS
          ) +
            computeLeadershipDomainScore(leaderProfile, LEADER_STRESS_DOMAIN_WEIGHTS)) /
            2
        ),
        0,
        100
      )
    : 0

  const resolutionProfile = buildResolutionProfileFromAgentPerformance(agentPerformance)
  const averagePerformanceProfile = averageResolutionProfile(resolutionProfile, agents.length)
  const fieldPower = Math.round(toFiniteNumber(averagePerformanceProfile.fieldPower))
  const containment = Math.round(toFiniteNumber(averagePerformanceProfile.containment))
  const investigation = Math.round(toFiniteNumber(averagePerformanceProfile.investigation))
  const support = Math.round(toFiniteNumber(averagePerformanceProfile.support))
  const chemistryScore = clamp(Math.round(50 + chemistry.bonus * 8), 0, 100)
  const cohesion = clamp(
    Math.round((chemistryScore + leadershipScore + readiness) / 3 + synergyProfile.cohesionBonus),
    0,
    100
  )
  const overall = Math.round(
    toFiniteNumber(
      ((fieldPower + containment + investigation + support) / 4) * (0.65 + readiness / 200)
    )
  )
  const leaderResolutionProfile = leaderProfile
    ? {
        fieldPower: toRoundedFinite(leaderProfile.performance.fieldPower),
        containment: toRoundedFinite(leaderProfile.performance.containment),
        investigation: toRoundedFinite(leaderProfile.performance.investigation),
        support: toRoundedFinite(leaderProfile.performance.support),
      }
    : null

  return {
    members,
    agentProfiles,
    agentPerformance,
    performanceSummary,
    powerImpactSummary,
    equipmentSummary,
    powerSummary,
    leaderId: leader?.id ?? null,
    derivedStats: {
      overall,
      fieldPower,
      containment,
      investigation,
      support,
      cohesion,
      chemistryScore,
      readiness,
    },
    resolutionProfile,
    chemistryProfile: chemistry,
    synergyProfile,
    leaderResolutionProfile,
    leaderBonus,
    chemistryBonus: chemistry.bonus,
    projectedCaseStats: resolutionProfileToLegacyStats(resolutionProfile),
  }
}

export function buildTeamCompositionProfile(
  team: Team,
  agentsById: GameState['agents']
): TeamCompositionProfile {
  const members = getTeamMembers(team, agentsById).filter(
    (agent) => agent.status !== 'dead' && agent.status !== 'resigned'
  )
  const leaderId = getTeamLeaderId(team, agentsById)

  return buildAgentSquadCompositionProfile(members, leaderId, team.tags)
}

export function buildAggregatedLeaderBonus(
  teams: Team[],
  agentsById: GameState['agents']
): LeaderBonus {
  const profiles = teams
    .map((team) => buildTeamCompositionProfile(team, agentsById))
    .filter((profile) => profile.members.length > 0)

  if (profiles.length === 0) {
    return createNeutralLeaderBonus()
  }

  const weights = profiles.map((profile) => Math.max(1, sumResolutionProfile(profile.resolutionProfile)))
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

  if (totalWeight <= 0) {
    return createNeutralLeaderBonus()
  }

  const effectivenessOffset = profiles.reduce(
    (sum, profile, index) =>
      sum + (profile.leaderBonus.effectivenessMultiplier - 1) * (weights[index] / totalWeight),
    0
  )
  const eventModifier = profiles.reduce(
    (sum, profile, index) => sum + profile.leaderBonus.eventModifier * (weights[index] / totalWeight),
    0
  )
  const xpBonus = profiles.reduce(
    (sum, profile, index) => sum + profile.leaderBonus.xpBonus * (weights[index] / totalWeight),
    0
  )
  const stressModifier = profiles.reduce(
    (sum, profile, index) =>
      sum + profile.leaderBonus.stressModifier * (weights[index] / totalWeight),
    0
  )

  return {
    effectivenessMultiplier: 1 + effectivenessOffset,
    eventModifier,
    xpBonus,
    stressModifier,
  }
}

export function syncTeamSimulationTeam(
  team: Team,
  agents: GameState['agents'],
  cases: GameState['cases']
): Team {
  const memberIds = getTeamMemberIds(team)
  const assignedCaseId = getTeamAssignedCaseId(team)
  const profile = buildTeamCompositionProfile(
    {
      ...team,
      memberIds,
      agentIds: memberIds,
    },
    agents
  )

  return {
    ...team,
    memberIds,
    leaderId: profile.leaderId,
    derivedStats: profile.derivedStats,
    status: resolveTeamStatus({
      currentState: team.status?.state,
      assignedCaseId,
      caseStatus: assignedCaseId ? cases[assignedCaseId]?.status : undefined,
      weeksRemaining: assignedCaseId ? cases[assignedCaseId]?.weeksRemaining : undefined,
      readiness: profile.derivedStats.readiness,
      memberCount: memberIds.length,
    }),
    agentIds: memberIds,
    assignedCaseId: assignedCaseId ?? undefined,
  }
}

function normalizeAgencyMirrors(state: GameState): {
  agency: NonNullable<GameState['agency']>
  containmentRating: number
  clearanceLevel: number
  funding: number
} {
  const agency = {
    containmentRating: state.containmentRating,
    clearanceLevel: state.clearanceLevel,
    funding: state.funding,
  }

  return {
    agency,
    containmentRating: agency.containmentRating,
    clearanceLevel: agency.clearanceLevel,
    funding: agency.funding,
  }
}

function normalizeRecruitmentPoolMirror(state: GameState): GameState['candidates'] {
  if (!Array.isArray(state.candidates)) {
    return []
  }

  return [...state.candidates]
}

function normalizeCaseQueueMirror(state: GameState): NonNullable<GameState['caseQueue']> {
  const queuedCaseIds = Array.isArray(state.caseQueue?.queuedCaseIds)
    ? [...state.caseQueue!.queuedCaseIds]
    : []
  const priorities = { ...(state.caseQueue?.priorities ?? {}) }

  return {
    queuedCaseIds,
    priorities,
  }
}

function hasTeamMirrorParity(team: Team) {
  const memberIds = getTeamMemberIds(team)
  const statusAssignedCaseId = team.status?.assignedCaseId ?? null
  const assignedCaseMirror = team.assignedCaseId ?? null

  return (
    areIdListsEqual(team.memberIds, memberIds) &&
    areIdListsEqual(team.agentIds, memberIds) &&
    statusAssignedCaseId === assignedCaseMirror
  )
}

export function hasGameStateMirrorParity(state: GameState) {
  const agencyMirrors = normalizeAgencyMirrors(state)
  const recruitmentPool = normalizeRecruitmentPoolMirror(state)

  return (
    state.containmentRating === agencyMirrors.containmentRating &&
    state.clearanceLevel === agencyMirrors.clearanceLevel &&
    state.funding === agencyMirrors.funding &&
    areIdListsEqual(
      state.recruitmentPool?.map((candidate) => candidate.id),
      recruitmentPool.map((candidate) => candidate.id)
    ) &&
    Object.values(state.teams).every((team) => hasTeamMirrorParity(team))
  )
}

function normalizeCaseAssignmentTeamIds(
  cases: GameState['cases'],
  teams: GameState['teams']
): GameState['cases'] {
  const existingTeamIds = new Set(Object.keys(teams))

  return Object.fromEntries(
    Object.entries(cases).map(([caseId, currentCase]) => [
      caseId,
      {
        ...currentCase,
        assignedTeamIds: [
          ...new Set(
            currentCase.assignedTeamIds.filter((teamId) => existingTeamIds.has(teamId))
          ),
        ],
      },
    ])
  )
}

function clearDanglingTeamCasePointers(
  teams: GameState['teams'],
  cases: GameState['cases']
): GameState['teams'] {
  return Object.fromEntries(
    Object.entries(teams).map(([teamId, team]) => {
      const assignedCaseId = getTeamAssignedCaseId(team)
      const assignedCase = assignedCaseId ? cases[assignedCaseId] : undefined

      if (!assignedCaseId || (assignedCase && assignedCase.assignedTeamIds.includes(teamId))) {
        return [teamId, team]
      }

      return [
        teamId,
        {
          ...team,
          assignedCaseId: undefined,
          status: team.status
            ? { ...team.status, assignedCaseId: null }
            : team.status,
        },
      ]
    })
  )
}

export function syncTeamSimulationState(state: GameState): GameState {
  const agents = normalizeAgentRecord(state.agents)
  const cases = normalizeCaseAssignmentTeamIds(state.cases, state.teams)
  const baseTeams = clearDanglingTeamCasePointers(state.teams, cases)
  const teams = Object.fromEntries(
    Object.entries(baseTeams).map(([teamId, team]) => [
      teamId,
      syncTeamSimulationTeam(team, agents, cases),
    ])
  )
  const agencyMirrors = normalizeAgencyMirrors(state)
  const recruitmentPool = normalizeRecruitmentPoolMirror(state)
  const caseQueue = normalizeCaseQueueMirror(state)

  return {
    ...state,
    agents,
    cases,
    teams,
    agency: agencyMirrors.agency,
    containmentRating: agencyMirrors.containmentRating,
    clearanceLevel: agencyMirrors.clearanceLevel,
    funding: agencyMirrors.funding,
    candidates: [...state.candidates],
    recruitmentPool,
    caseQueue,
  }
}

function areIdListsEqual(left: Id[] | undefined, right: Id[] | undefined) {
  const safeLeft = left ?? []
  const safeRight = right ?? []

  return (
    safeLeft.length === safeRight.length &&
    safeLeft.every((value, index) => value === safeRight[index])
  )
}

function areDerivedStatsEqual(
  left: TeamDerivedStats | undefined,
  right: TeamDerivedStats | undefined
) {
  if (!left || !right) {
    return false
  }

  return TEAM_DERIVED_STAT_KEYS.every((key) => left[key] === right[key])
}

function areStatusesEqual(left: TeamStatus | undefined, right: TeamStatus | undefined) {
  return (
    left?.state === right?.state &&
    (left?.assignedCaseId ?? null) === (right?.assignedCaseId ?? null)
  )
}

function isTeamSimulationTeamNormalized(
  team: Team,
  agents: GameState['agents'],
  cases: GameState['cases']
) {
  const normalizedTeam = syncTeamSimulationTeam(team, agents, cases)

  return (
    areIdListsEqual(team.memberIds, normalizedTeam.memberIds) &&
    areIdListsEqual(team.agentIds, normalizedTeam.agentIds) &&
    team.leaderId === normalizedTeam.leaderId &&
    areDerivedStatsEqual(team.derivedStats, normalizedTeam.derivedStats) &&
    areStatusesEqual(team.status, normalizedTeam.status) &&
    getTeamAssignedCaseId(team) === getTeamAssignedCaseId(normalizedTeam)
  )
}

export function ensureNormalizedGameState(state: GameState): GameState {
  const isNormalized =
    isAgentRecordNormalized(state.agents) &&
    hasGameStateMirrorParity(state) &&
    Object.values(state.teams).every((team) =>
      isTeamSimulationTeamNormalized(team, state.agents, state.cases)
    )

  return isNormalized ? state : syncTeamSimulationState(state)
}

/**
 * Canonical runtime normalization pass for team-derived state.
 * Public domain mutators should return through this helper so callers do not
 * need to remember external post-processing.
 */
export function normalizeGameState(state: GameState): GameState {
  return syncTeamSimulationState(state)
}

function computeLeadershipDomainScore(
  profile: Pick<AgentSimulationProfile, 'effectiveStats' | 'effectiveWeights'>,
  emphasis: Record<StatDomain, number>
) {
  const weighted = Object.entries(emphasis).reduce(
    (total, [domain, emphasisWeight]) =>
      total +
      domainAverage(profile.effectiveStats, domain as StatDomain) *
        getLeadershipWeight(emphasisWeight, profile.effectiveWeights[domain as StatDomain]),
    0
  )
  const weightTotal = Object.entries(emphasis).reduce(
    (total, [domain, emphasisWeight]) =>
      total + getLeadershipWeight(emphasisWeight, profile.effectiveWeights[domain as StatDomain]),
    0
  )

  if (weightTotal <= 0) {
    return 50
  }

  return clamp(weighted / weightTotal, 0, 100)
}

function deriveLeaderBonus(
  profile: Pick<AgentSimulationProfile, 'effectiveStats' | 'effectiveWeights'>,
  memberCount: number
): LeaderBonus {
  if (memberCount <= 1) {
    return createNeutralLeaderBonus()
  }

  const effectivenessScore = computeLeadershipDomainScore(
    profile,
    LEADER_EFFECTIVENESS_DOMAIN_WEIGHTS
  )
  const eventScore = computeLeadershipDomainScore(profile, LEADER_EVENT_DOMAIN_WEIGHTS)
  const xpScore = computeLeadershipDomainScore(profile, LEADER_XP_DOMAIN_WEIGHTS)
  const stressScore = computeLeadershipDomainScore(profile, LEADER_STRESS_DOMAIN_WEIGHTS)

  return {
    effectivenessMultiplier:
      1 +
      normalizeLeadershipAdvantage(effectivenessScore, LEADER_EFFECTIVENESS_BASELINE) *
        LEADER_EFFECTIVENESS_RANGE,
    eventModifier:
      normalizeLeadershipAdvantage(eventScore, LEADER_EVENT_BASELINE) * LEADER_EVENT_RANGE,
    xpBonus: normalizeLeadershipAdvantage(xpScore, LEADER_XP_BASELINE) * LEADER_XP_RANGE,
    stressModifier:
      normalizeLeadershipAdvantage(stressScore, LEADER_STRESS_BASELINE) * -LEADER_STRESS_RANGE,
  }
}

function getLeadershipWeight(emphasisWeight: number, roleWeight: number) {
  return emphasisWeight * (0.5 + roleWeight)
}

function normalizeLeadershipAdvantage(score: number, baseline: number) {
  if (score <= baseline) {
    return 0
  }

  return clamp((score - baseline) / Math.max(1, 100 - baseline), 0, 1)
}

export function resolutionProfileToLegacyStats(profile: TeamResolutionProfile): StatBlock {
  return {
    combat: profile.fieldPower,
    investigation: profile.investigation,
    utility: profile.containment,
    social: profile.support,
  }
}

export function legacyStatsToResolutionProfile(profile: StatBlock): TeamResolutionProfile {
  return {
    fieldPower: profile.combat,
    containment: profile.utility,
    investigation: profile.investigation,
    support: profile.social,
  }
}

export function legacyWeightsToResolutionProfile(weights: WeightBlock): TeamResolutionProfile {
  return {
    fieldPower: weights.combat,
    containment: weights.utility,
    investigation: weights.investigation,
    support: weights.social,
  }
}

export function dotResolutionProfile(
  profile: TeamResolutionProfile,
  weights: TeamResolutionProfile
) {
  return RESOLUTION_PROFILE_KEYS.reduce((total, key) => total + profile[key] * weights[key], 0)
}

function sumResolutionProfile(profile: TeamResolutionProfile) {
  return RESOLUTION_PROFILE_KEYS.reduce((total, key) => total + profile[key], 0)
}
