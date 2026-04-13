// cspell:words overprepared overprepare telemetry
import { inventoryItemLabels } from '../data/production'
import { getEquipmentDefinition } from './equipment'
import { clamp, normalizeSeed, sigmoid } from './math'
import {
  buildMajorIncidentOperationalCase,
  buildMajorIncidentProfile,
  type MajorIncidentArchetypeId,
} from './majorIncidents'
import type {
  ActiveMajorIncidentRuntime,
  AgentSimulationPurpose,
  Agent,
  CaseInstance,
  ContractMaterialDrop,
  GameState,
  MajorIncidentProvisionType,
  MajorIncidentRewardItem,
  MajorIncidentStrategy,
  ResolutionOutcome,
  Team,
} from './models'
import { computeRequiredScore, computeTeamScore } from './sim/scoring'
import { buildAgencyProtocolState } from './protocols'
import { getRaidCoordinationAdjustment } from './sim/resolve'
import { buildMissionInjuryForecast, type MissionInjuryForecast } from './sim/injuryForecast'
import { isSecondEscalationBandWeek, PRESSURE_CALIBRATION } from './sim/calibration'
import { isTeamBlockedByTraining } from './sim/training'
import {
  buildAggregatedLeaderBonus,
  buildTeamCompositionProfile,
  getTeamAssignedCaseId,
  getTeamMemberIds,
} from './teamSimulation'
import { validateTeamIds } from './validateTeam'

export type MajorIncidentSuccessBand = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High'
export type MajorIncidentRiskBand = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High'

export interface MajorIncidentProvisionDefinition {
  type: MajorIncidentProvisionType
  label: string
  description: string
  itemId: string
  quantity: number
}

export interface MajorIncidentProvisionAvailability extends MajorIncidentProvisionDefinition {
  available: boolean
  stockOnHand: number
}

export interface MajorIncidentTeamPreview {
  team: Team
  overallOvr: number
  incidentOvr: number
  readiness: number
  comparisonDelta: number
}

export interface MajorIncidentRewardPreview {
  materials: ContractMaterialDrop[]
  gear: MajorIncidentRewardItem[]
  progressionUnlocks: string[]
}

export interface MajorIncidentEvaluation {
  runtime: ActiveMajorIncidentRuntime
  effectiveCase: CaseInstance
  selectedTeams: MajorIncidentTeamPreview[]
  requiredTeams: number
  valid: boolean
  issues: string[]
  missingTeamCount: number
  weakestTeam?: MajorIncidentTeamPreview
  weakestTeamWarning?: string
  averageIncidentOvr: number
  effectiveIncidentPower: number
  difficulty: number
  successChance: number
  successBand: MajorIncidentSuccessBand
  injuryRisk: number
  injuryRiskBand: MajorIncidentRiskBand
  deathRisk: number
  deathRiskBand: MajorIncidentRiskBand
  injuryForecast: MissionInjuryForecast
  rewardPreview: MajorIncidentRewardPreview
}

export interface MajorIncidentLaunchOptions {
  strategy?: MajorIncidentStrategy
  provisions?: MajorIncidentProvisionType[]
}

const DEFAULT_MAJOR_INCIDENT_STRATEGY: MajorIncidentStrategy = 'balanced'
const DEFAULT_MAJOR_INCIDENT_PROVISIONS: MajorIncidentProvisionType[] = []
const MIN_SUCCESS_CHANCE = 0.05
const MAX_SUCCESS_CHANCE = 0.95

const MAJOR_INCIDENT_PROVISION_DEFINITIONS: Record<
  MajorIncidentProvisionType,
  MajorIncidentProvisionDefinition
> = {
  medical_supplies: {
    type: 'medical_supplies',
    label: 'Medical Supplies',
    description: 'Pre-staged trauma stock lowers injury exposure during a bad turn.',
    itemId: 'medical_supplies',
    quantity: 2,
  },
  tactical_enhancers: {
    type: 'tactical_enhancers',
    label: 'Tactical Enhancers',
    description: 'Precision ammunition and breach tools increase execution reliability.',
    itemId: 'silver_rounds',
    quantity: 1,
  },
  extraction_tools: {
    type: 'extraction_tools',
    label: 'Extraction Tools',
    description: 'Signal disruption and route-prep shorten the operation cycle.',
    itemId: 'signal_jammers',
    quantity: 1,
  },
  optimization_kits: {
    type: 'optimization_kits',
    label: 'Optimization Kits',
    description: 'Recon calibration gear improves salvage and post-op recovery value.',
    itemId: 'emf_sensors',
    quantity: 1,
  },
}

const MAJOR_INCIDENT_STRATEGY_LABELS: Record<MajorIncidentStrategy, string> = {
  aggressive: 'Aggressive',
  balanced: 'Balanced',
  cautious: 'Cautious',
}

const MAJOR_INCIDENT_STRATEGY_EFFECTS: Record<
  MajorIncidentStrategy,
  {
    successMultiplier: number
    rewardMultiplier: number
    injuryDelta: number
    deathDelta: number
  }
> = {
  aggressive: {
    successMultiplier: 0.96,
    rewardMultiplier: 1.3,
    injuryDelta: 0.12,
    deathDelta: 0.05,
  },
  balanced: {
    successMultiplier: 1,
    rewardMultiplier: 1,
    injuryDelta: 0,
    deathDelta: 0,
  },
  cautious: {
    successMultiplier: 1.04,
    rewardMultiplier: 0.82,
    injuryDelta: -0.1,
    deathDelta: -0.04,
  },
}

interface MajorIncidentArchetypeRewardTemplate {
  materials: Array<{ itemId: string; quantityBase: number; quantityPerStage: number }>
  gearPool: string[]
  progressionUnlockPool: string[]
  rumors: Array<{
    description: string
    hiddenLootModifiers: MajorIncidentRewardItem[]
  }>
}

const MAJOR_INCIDENT_REWARD_TEMPLATES: Record<
  MajorIncidentArchetypeId,
  MajorIncidentArchetypeRewardTemplate
> = {
  possession_outbreak: {
    materials: [
      { itemId: 'occult_reagents', quantityBase: 3, quantityPerStage: 1 },
      { itemId: 'warding_resin', quantityBase: 2, quantityPerStage: 1 },
    ],
    gearPool: ['occult_detection_array', 'warding_kits'],
    progressionUnlockPool: ['containment-liturgy'],
    rumors: [
      {
        description: 'Rare containment artifact signatures were detected inside the outbreak core.',
        hiddenLootModifiers: [
          { itemId: 'occult_detection_array', label: 'Occult Detection Array', quantity: 1 },
          { itemId: 'occult_reagents', label: 'Occult Reagents', quantity: 2 },
        ],
      },
      {
        description: 'A surviving ward-cache may still be intact behind the outer cordon.',
        hiddenLootModifiers: [
          { itemId: 'warding_resin', label: 'Warding Resin', quantity: 3 },
          { itemId: 'warding_kits', label: 'Warding Kits', quantity: 1 },
        ],
      },
    ],
  },
  dimensional_breach: {
    materials: [
      { itemId: 'electronic_parts', quantityBase: 3, quantityPerStage: 1 },
      { itemId: 'warding_resin', quantityBase: 2, quantityPerStage: 1 },
    ],
    gearPool: ['advanced_recon_suite', 'breach_visor'],
    progressionUnlockPool: ['fracture-anchor-protocol'],
    rumors: [
      {
        description: 'Breach-core fragments are still stabilizing around the fracture heart.',
        hiddenLootModifiers: [
          { itemId: 'advanced_recon_suite', label: 'Advanced Recon Suite', quantity: 1 },
          { itemId: 'electronic_parts', label: 'Electronic Parts', quantity: 2 },
        ],
      },
      {
        description: 'A sealed anchor locker may be recoverable if the perimeter holds.',
        hiddenLootModifiers: [
          { itemId: 'breach_visor', label: 'Breach Visor', quantity: 1 },
          { itemId: 'warding_resin', label: 'Warding Resin', quantity: 2 },
        ],
      },
    ],
  },
  coordinated_cult_operation: {
    materials: [
      { itemId: 'occult_reagents', quantityBase: 3, quantityPerStage: 1 },
      { itemId: 'ballistic_supplies', quantityBase: 2, quantityPerStage: 1 },
    ],
    gearPool: ['occult_detection_array', 'signal_intercept_kit'],
    progressionUnlockPool: ['counter-cult-dossier'],
    rumors: [
      {
        description: 'Ritual archive caches may still be intact beneath the ceremonial site.',
        hiddenLootModifiers: [
          { itemId: 'signal_intercept_kit', label: 'Signal Intercept Kit', quantity: 1 },
          { itemId: 'occult_reagents', label: 'Occult Reagents', quantity: 2 },
        ],
      },
      {
        description: 'Recovered liturgy fragments point to a hidden reliquary vault.',
        hiddenLootModifiers: [
          { itemId: 'occult_detection_array', label: 'Occult Detection Array', quantity: 1 },
          { itemId: 'ballistic_supplies', label: 'Ballistic Supplies', quantity: 2 },
        ],
      },
    ],
  },
  anomaly_storm: {
    materials: [
      { itemId: 'electronic_parts', quantityBase: 4, quantityPerStage: 1 },
      { itemId: 'occult_reagents', quantityBase: 2, quantityPerStage: 1 },
    ],
    gearPool: ['advanced_recon_suite', 'signal_intercept_kit'],
    progressionUnlockPool: ['stormgrid-telemetry'],
    rumors: [
      {
        description: 'Signal ghosts are clustering around a dormant relay spine.',
        hiddenLootModifiers: [
          { itemId: 'signal_intercept_kit', label: 'Signal Intercept Kit', quantity: 1 },
          { itemId: 'electronic_parts', label: 'Electronic Parts', quantity: 2 },
        ],
      },
      {
        description: 'A psionic wake is masking an unusually rich salvage pocket.',
        hiddenLootModifiers: [
          { itemId: 'advanced_recon_suite', label: 'Advanced Recon Suite', quantity: 1 },
          { itemId: 'occult_reagents', label: 'Occult Reagents', quantity: 2 },
        ],
      },
    ],
  },
  containment_cascade: {
    materials: [
      { itemId: 'medical_supplies', quantityBase: 3, quantityPerStage: 1 },
      { itemId: 'electronic_parts', quantityBase: 3, quantityPerStage: 1 },
    ],
    gearPool: ['hazmat_suit', 'field_plate', 'advanced_recon_suite'],
    progressionUnlockPool: ['blacksite-retrofit'],
    rumors: [
      {
        description: 'A sealed retrofit locker may have survived the first collapse.',
        hiddenLootModifiers: [
          { itemId: 'field_plate', label: 'Field Plate', quantity: 1 },
          { itemId: 'medical_supplies', label: 'Medical Supplies', quantity: 3 },
        ],
      },
      {
        description: 'Emergency triage stores were never logged into the official inventory chain.',
        hiddenLootModifiers: [
          { itemId: 'hazmat_suit', label: 'Hazmat Suit', quantity: 1 },
          { itemId: 'electronic_parts', label: 'Electronic Parts', quantity: 2 },
        ],
      },
    ],
  },
}

function hashString(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return normalizeSeed(hash >>> 0)
}

function buildMajorIncidentSeed(state: Pick<GameState, 'rngSeed'>, currentCase: CaseInstance) {
  return hashString(
    [
      state.rngSeed,
      currentCase.id,
      currentCase.templateId,
      currentCase.title,
      currentCase.stage,
      currentCase.factionId ?? 'neutral',
    ].join('::')
  )
}

function getReadyTeamsForMajorIncident(state: GameState, currentCase: CaseInstance) {
  return Object.values(state.teams)
    .filter((team) => {
      const assignedCaseId = getTeamAssignedCaseId(team)

      if (assignedCaseId && assignedCaseId !== currentCase.id) {
        return false
      }

      return !isTeamBlockedByTraining(team, state.agents)
    })
    .sort((left, right) => left.name.localeCompare(right.name))
}

function buildCombinedTeamScore(
  state: GameState,
  effectiveCase: CaseInstance,
  teamPreviews: MajorIncidentTeamPreview[]
) {
  const selectedTeams = teamPreviews.map((preview) => preview.team)
  const agents = [
    ...new Set(selectedTeams.flatMap((team) => getTeamMemberIds(team))),
  ]
    .map((agentId) => state.agents[agentId])
    .filter((agent): agent is NonNullable<GameState['agents'][string]> => Boolean(agent))
  const supportTags = [...new Set(selectedTeams.flatMap((team) => team.tags))]
  const coordination = getRaidCoordinationAdjustment(selectedTeams.length, state.config)
  const leaderBonusOverride =
    selectedTeams.length > 1 && selectedTeams.some((team) => getTeamMemberIds(team).length > 1)
      ? buildAggregatedLeaderBonus(selectedTeams, state.agents)
      : undefined

  return computeTeamScore(agents, effectiveCase, {
    inventory: state.inventory,
    supportTags,
    teamTags: supportTags,
    leaderId: null,
    protocolState: buildAgencyProtocolState(state),
    leaderBonusOverride,
    scoreAdjustment: coordination.scoreAdjustment,
    scoreAdjustmentReason: coordination.reason,
  })
}

function getSuccessBand(value: number): MajorIncidentSuccessBand {
  if (value >= 0.8) {
    return 'Very High'
  }
  if (value >= 0.62) {
    return 'High'
  }
  if (value >= 0.42) {
    return 'Moderate'
  }
  if (value >= 0.22) {
    return 'Low'
  }
  return 'Very Low'
}

function getRiskLevel(difficulty: number) {
  if (difficulty >= 105) {
    return 'extreme' as const
  }
  if (difficulty >= 82) {
    return 'high' as const
  }
  if (difficulty >= 60) {
    return 'medium' as const
  }
  return 'low' as const
}

function getProgressionFactor(state: GameState) {
  return clamp(
    0.08 +
      Math.max(0, state.week - 1) * 0.012 +
      Math.max(0, state.clearanceLevel - 1) * 0.04 +
      (state.academyTier ?? 0) * 0.03 +
      state.reports.length * 0.006,
    0.08,
    0.42
  )
}

function getAvailablePowerFactor(state: GameState, requiredTeams: number, currentCase: CaseInstance) {
  const profiles = getReadyTeamsForMajorIncident(state, currentCase)
    .map((team) => buildTeamCompositionProfile(team, state.agents))
    .sort((left, right) => right.derivedStats.overall - left.derivedStats.overall)
    .slice(0, Math.max(requiredTeams, 1))

  if (profiles.length === 0) {
    return 0.16
  }

  const averageOverall =
    profiles.reduce((sum, profile) => sum + profile.derivedStats.overall, 0) / profiles.length
  return clamp(averageOverall / 100, 0.16, 0.78)
}

function getRewardTemplate(archetypeId: MajorIncidentArchetypeId) {
  return MAJOR_INCIDENT_REWARD_TEMPLATES[archetypeId]
}

function buildRewardItem(itemId: string, quantity: number): MajorIncidentRewardItem {
  return {
    itemId,
    label: inventoryItemLabels[itemId] ?? getEquipmentDefinition(itemId)?.name ?? itemId,
    quantity,
  }
}

function buildBaseMaterials(
  template: MajorIncidentArchetypeRewardTemplate,
  stageIndex: number
): ContractMaterialDrop[] {
  return template.materials.map((material) => ({
    itemId: material.itemId,
    label: inventoryItemLabels[material.itemId] ?? material.itemId,
    quantity: Math.max(1, material.quantityBase + (stageIndex - 1) * material.quantityPerStage),
  }))
}

function buildBaseGear(
  template: MajorIncidentArchetypeRewardTemplate,
  stageIndex: number,
  incidentSeed: number
) {
  const gearCount = stageIndex >= 3 ? 2 : 1
  const startIndex = incidentSeed % template.gearPool.length
  const gearIds = Array.from({ length: gearCount }, (_, index) => {
    return template.gearPool[(startIndex + index) % template.gearPool.length]!
  })

  return [...new Set(gearIds)].map((itemId) => buildRewardItem(itemId, 1))
}

function buildRumor(
  template: MajorIncidentArchetypeRewardTemplate,
  stageIndex: number,
  incidentSeed: number
) {
  if (template.rumors.length === 0) {
    return undefined
  }

  if (stageIndex <= 1 && incidentSeed % 3 === 0) {
    return undefined
  }

  const rumor = template.rumors[incidentSeed % template.rumors.length]!
  return {
    description: rumor.description,
    hiddenLootModifiers: rumor.hiddenLootModifiers.map((modifier) => ({ ...modifier })),
  }
}

function getProvisionEffects(provisions: MajorIncidentProvisionType[]) {
  const selected = new Set(provisions)

  return {
    successBonus: selected.has('tactical_enhancers') ? 0.06 : 0,
    injuryReduction: selected.has('medical_supplies') ? 0.12 : 0,
    deathReduction: selected.has('medical_supplies') ? 0.05 : 0,
    rewardMultiplier: selected.has('optimization_kits') ? 1.18 : 1,
    durationReduction: selected.has('extraction_tools') ? 1 : 0,
  }
}

function scaleRewardQuantity(quantity: number, multiplier: number) {
  return Math.max(1, Math.round(quantity * multiplier))
}

function scaleMaterialRewards(materials: ContractMaterialDrop[], multiplier: number) {
  return materials.map((material) => ({
    ...material,
    quantity: scaleRewardQuantity(material.quantity, multiplier),
  }))
}

function buildTeamPreview(
  team: Team,
  state: GameState,
  effectiveCase: CaseInstance
): MajorIncidentTeamPreview {
  const composition = buildTeamCompositionProfile(team, state.agents)
  const teamMembers = getTeamMemberIds(team)
    .map((agentId) => state.agents[agentId])
    .filter((agent): agent is NonNullable<GameState['agents'][string]> => Boolean(agent))
  const teamScore = computeTeamScore(teamMembers, effectiveCase, {
    inventory: state.inventory,
    supportTags: [...team.tags],
    teamTags: [...team.tags],
    leaderId: composition.leaderId,
    protocolState: buildAgencyProtocolState(state),
  })
  const requiredScore = computeRequiredScore(effectiveCase, state.config)

  const incidentOvr = Math.max(0, Math.round(teamScore.score))
  return {
    team: {
      ...team,
      __majorIncidentComposition: composition,
    } as Team,
    overallOvr: composition.derivedStats.overall,
    incidentOvr,
    readiness: composition.derivedStats.readiness,
    comparisonDelta: Number((teamScore.score - requiredScore).toFixed(1)),
  }
}

function buildIssuesForProvisionSelection(
  state: GameState,
  provisions: MajorIncidentProvisionType[]
) {
  return provisions.flatMap((provision) => {
    const definition = MAJOR_INCIDENT_PROVISION_DEFINITIONS[provision]
    const stockOnHand = state.inventory[definition.itemId] ?? 0
    return stockOnHand >= definition.quantity
      ? []
      : [`${definition.label} unavailable (${stockOnHand}/${definition.quantity}).`]
  })
}

function buildCombinedCaseTags(currentCase: CaseInstance, teams: Team[]) {
  return [
    ...new Set([
      ...currentCase.tags,
      ...currentCase.requiredTags,
      ...currentCase.preferredTags,
      ...teams.flatMap((team) => team.tags),
    ]),
  ]
}

function buildEvaluationIssues(
  currentCase: CaseInstance,
  state: GameState,
  teamIds: string[],
  requiredTeams: number,
  provisions: MajorIncidentProvisionType[]
) {
  const issues: string[] = []
  const validationPurpose: AgentSimulationPurpose =
    currentCase.status === 'in_progress' ? 'resolution' : 'assignment'

  if (teamIds.length !== requiredTeams) {
    issues.push(
      teamIds.length < requiredTeams
        ? `Assign ${requiredTeams - teamIds.length} more team${
            requiredTeams - teamIds.length === 1 ? '' : 's'
          } before launch.`
        : `Major incidents accept exactly ${requiredTeams} teams in this pass.`
    )
  }

  const validation = validateTeamIds(
    teamIds,
    currentCase,
    state.teams,
    state.agents,
    validationPurpose
  )
  for (const issue of validation.issues) {
    issues.push(issue.detail)
  }

  for (const teamId of teamIds) {
    const team = state.teams[teamId]
    if (!team) {
      issues.push(`Missing team record: ${teamId}.`)
      continue
    }

    const assignedCaseId = getTeamAssignedCaseId(team)
    if (assignedCaseId && assignedCaseId !== currentCase.id) {
      issues.push(`${team.name} is already committed elsewhere.`)
    }

    if (isTeamBlockedByTraining(team, state.agents)) {
      issues.push(`${team.name} is blocked by training.`)
    }
  }

  return [...new Set([...issues, ...buildIssuesForProvisionSelection(state, provisions)])]
}

function buildRewardPreview(
  runtime: ActiveMajorIncidentRuntime,
  strategy: MajorIncidentStrategy,
  provisions: MajorIncidentProvisionType[]
) {
  const strategyEffects = MAJOR_INCIDENT_STRATEGY_EFFECTS[strategy]
  const provisionEffects = getProvisionEffects(provisions)
  const rewardMultiplier = strategyEffects.rewardMultiplier * provisionEffects.rewardMultiplier

  return {
    materials: scaleMaterialRewards(runtime.rewards.materials, rewardMultiplier),
    gear: runtime.rewards.gear?.map((gear) => ({ ...gear })) ?? [],
    progressionUnlocks: [...(runtime.rewards.progressionUnlocks ?? [])],
  } satisfies MajorIncidentRewardPreview
}

function getRequiredTeamsForProfile(currentCase: CaseInstance, recommendedTeams: number) {
  const raidMinTeams = currentCase.raid?.minTeams ?? 2
  return Math.max(2, recommendedTeams, raidMinTeams)
}

function toComparableTeamNameSet(teamPreviews: MajorIncidentTeamPreview[]) {
  return teamPreviews.map((preview) => preview.team.name).sort().join(' / ')
}

function buildTeamCombinations(teams: Team[], size: number): Team[][] {
  if (size <= 0) {
    return [[]]
  }

  if (teams.length < size) {
    return []
  }

  const combinations: Team[][] = []

  function visit(startIndex: number, current: Team[]) {
    if (current.length === size) {
      combinations.push([...current])
      return
    }

    for (let index = startIndex; index < teams.length; index += 1) {
      current.push(teams[index]!)
      visit(index + 1, current)
      current.pop()
    }
  }

  visit(0, [])
  return combinations
}

export function isOperationalMajorIncidentCase(currentCase: CaseInstance) {
  if (currentCase.majorIncident) {
    return true
  }

  const profile = currentCase.kind === 'raid' ? buildMajorIncidentProfile(currentCase) : null
  return Boolean(profile && profile.currentStageIndex >= 2)
}

export function getMajorIncidentStrategyLabel(strategy: MajorIncidentStrategy) {
  return MAJOR_INCIDENT_STRATEGY_LABELS[strategy]
}

export function getMajorIncidentProvisionDefinitions(state: GameState) {
  return Object.values(MAJOR_INCIDENT_PROVISION_DEFINITIONS).map((definition) => ({
    ...definition,
    available: (state.inventory[definition.itemId] ?? 0) >= definition.quantity,
    stockOnHand: state.inventory[definition.itemId] ?? 0,
  })) satisfies MajorIncidentProvisionAvailability[]
}

export function getMajorIncidentSelectableTeams(state: GameState, currentCase: CaseInstance) {
  return getReadyTeamsForMajorIncident(state, currentCase)
}

export function buildDerivedMajorIncidentRuntime(
  currentCase: CaseInstance,
  state: GameState
): ActiveMajorIncidentRuntime | null {
  if (!isOperationalMajorIncidentCase(currentCase)) {
    return null
  }

  if (currentCase.majorIncident) {
    return currentCase.majorIncident
  }

  const profile = buildMajorIncidentProfile(currentCase)
  if (!profile) {
    return null
  }

  const requiredTeams = getRequiredTeamsForProfile(profile.effectiveCase, profile.recommendedTeams)
  const incidentSeed = buildMajorIncidentSeed(state, currentCase)
  const rewardTemplate = getRewardTemplate(profile.archetypeId)
  const stageIndex = profile.currentStageIndex
  const baseDifficulty = computeRequiredScore(profile.effectiveCase, state.config)
  const durationWeeks = Math.max(
    1,
    Math.max(profile.effectiveCase.durationWeeks, stageIndex + 1) -
      (isSecondEscalationBandWeek(state.week)
        ? PRESSURE_CALIBRATION.secondEscalationMajorIncidentDurationReductionWeeks
        : 0)
  )
  const difficulty = Math.round(
    baseDifficulty *
      (1 +
        getProgressionFactor(state) * 0.32 +
        getAvailablePowerFactor(state, requiredTeams, currentCase) * 0.18)
  )

  return {
    incidentId: `${currentCase.id}:${profile.archetypeId}`,
    name: `${profile.archetypeLabel} Operation`,
    description: profile.currentStage.specialMechanics[0]?.detail ?? currentCase.description,
    requiredTeams,
    difficulty,
    riskLevel: getRiskLevel(difficulty),
    durationWeeks,
    rewards: {
      materials: buildBaseMaterials(rewardTemplate, stageIndex),
      gear: buildBaseGear(rewardTemplate, stageIndex, incidentSeed),
      progressionUnlocks: rewardTemplate.progressionUnlockPool.slice(0, Math.min(1, stageIndex)),
    },
    modifiers: profile.currentStage.modifiers.map((modifier) => ({ ...modifier })),
    rumor: buildRumor(rewardTemplate, stageIndex, incidentSeed),
    strategy: DEFAULT_MAJOR_INCIDENT_STRATEGY,
    provisions: [...DEFAULT_MAJOR_INCIDENT_PROVISIONS],
  }
}

export function buildPlannedMajorIncidentRuntime(
  currentCase: CaseInstance,
  state: GameState,
  options: MajorIncidentLaunchOptions = {}
) {
  const base = buildDerivedMajorIncidentRuntime(currentCase, state)
  if (!base) {
    return null
  }

  const strategy = options.strategy ?? base.strategy ?? DEFAULT_MAJOR_INCIDENT_STRATEGY
  const provisions = [
    ...new Set(options.provisions ?? base.provisions ?? DEFAULT_MAJOR_INCIDENT_PROVISIONS),
  ]
  const durationWeeks = Math.max(1, base.durationWeeks - getProvisionEffects(provisions).durationReduction)

  return {
    ...base,
    strategy,
    provisions,
    durationWeeks,
  } satisfies ActiveMajorIncidentRuntime
}

export function buildMajorIncidentEffectiveCase(
  currentCase: CaseInstance,
  runtime: ActiveMajorIncidentRuntime
) {
  const operationalCase = buildMajorIncidentOperationalCase(currentCase)
  return {
    ...operationalCase,
    kind: 'raid' as const,
    raid: {
      minTeams: runtime.requiredTeams,
      maxTeams: runtime.requiredTeams,
    },
    majorIncident: runtime,
  } satisfies CaseInstance
}

export function evaluateMajorIncidentPlan(
  state: GameState,
  currentCase: CaseInstance,
  teamIds: string[],
  options: MajorIncidentLaunchOptions = {}
): MajorIncidentEvaluation | null {
  const runtime = buildPlannedMajorIncidentRuntime(currentCase, state, options)
  if (!runtime) {
    return null
  }

  const uniqueTeamIds = [...new Set(teamIds)].filter((teamId) => Boolean(state.teams[teamId]))
  const effectiveCase = buildMajorIncidentEffectiveCase(currentCase, runtime)
  const issues = buildEvaluationIssues(
    effectiveCase,
    state,
    uniqueTeamIds,
    runtime.requiredTeams,
    runtime.provisions
  )
  const selectedTeams = uniqueTeamIds.map((teamId) =>
    buildTeamPreview(state.teams[teamId]!, state, effectiveCase)
  )
  const weakestTeam = [...selectedTeams].sort(
    (left, right) =>
      left.incidentOvr - right.incidentOvr || left.team.name.localeCompare(right.team.name)
  )[0]
  const selectedAgents: Agent[] = [
    ...new Set(selectedTeams.flatMap((preview) => getTeamMemberIds(preview.team))),
  ]
    .map((agentId) => state.agents[agentId])
    .filter((agent): agent is Agent => Boolean(agent))
  const averageIncidentOvr =
    selectedTeams.length > 0
      ? selectedTeams.reduce((sum, preview) => sum + preview.incidentOvr, 0) / selectedTeams.length
      : 0
  const effectiveIncidentPower =
    weakestTeam !== undefined
      ? weakestTeam.incidentOvr + Math.max(0, averageIncidentOvr - weakestTeam.incidentOvr) * 0.2
      : 0
  const combinedTeamScore =
    selectedTeams.length > 0 ? buildCombinedTeamScore(state, effectiveCase, selectedTeams) : null
  const combinedRequiredScore =
    selectedTeams.length > 0 ? computeRequiredScore(effectiveCase, state.config) : null
  const combinedComparison =
    combinedTeamScore && combinedRequiredScore !== null
      ? {
          finalDelta: combinedTeamScore.score - combinedRequiredScore,
        }
      : null
  const preferredTagMatches = buildCombinedCaseTags(
    effectiveCase,
    selectedTeams.map((preview) => preview.team)
  ).filter((tag) => effectiveCase.preferredTags.includes(tag)).length
  const compositionFitModifier = clamp(
    1 + (combinedComparison?.finalDelta ?? 0) / 220 + Math.min(preferredTagMatches, 4) * 0.01,
    0.9,
    1.14
  )
  const baseSuccess = clamp(
    sigmoid(
      ((effectiveIncidentPower - runtime.difficulty) / Math.max(12, runtime.difficulty * 0.18)) *
        (state.config.probabilityK / 2.4)
    ),
    MIN_SUCCESS_CHANCE,
    MAX_SUCCESS_CHANCE
  )
  const strategyEffects = MAJOR_INCIDENT_STRATEGY_EFFECTS[runtime.strategy]
  const provisionEffects = getProvisionEffects(runtime.provisions)
  const successChance = clamp(
    baseSuccess * compositionFitModifier * strategyEffects.successMultiplier +
      provisionEffects.successBonus,
    MIN_SUCCESS_CHANCE,
    MAX_SUCCESS_CHANCE
  )
  const injuryForecast = buildMissionInjuryForecast({
    currentCase: effectiveCase,
    agents: selectedAgents,
    successChance,
    performanceSummary: combinedTeamScore?.performanceSummary,
    agentPerformance: combinedTeamScore?.agentPerformance,
    comparison: combinedTeamScore?.comparison,
  })

  return {
    runtime,
    effectiveCase,
    selectedTeams,
    requiredTeams: runtime.requiredTeams,
    valid: issues.length === 0,
    issues,
    missingTeamCount: Math.max(0, runtime.requiredTeams - uniqueTeamIds.length),
    ...(weakestTeam ? { weakestTeam } : {}),
    ...(weakestTeam && selectedTeams.length > 1
      ? {
          weakestTeamWarning: `${weakestTeam.team.name} is bottlenecking the operation at incident OVR ${weakestTeam.incidentOvr}.`,
        }
      : {}),
    averageIncidentOvr: Number(averageIncidentOvr.toFixed(1)),
    effectiveIncidentPower: Number(effectiveIncidentPower.toFixed(1)),
    difficulty: runtime.difficulty,
    successChance,
    successBand: getSuccessBand(successChance),
    injuryRisk: injuryForecast.injuryChance,
    injuryRiskBand: injuryForecast.injuryRiskBand,
    deathRisk: injuryForecast.deathChance,
    deathRiskBand: injuryForecast.deathRiskBand,
    injuryForecast,
    rewardPreview: buildRewardPreview(runtime, runtime.strategy, runtime.provisions),
  }
}

export function getBestMajorIncidentPlanSuggestion(
  state: GameState,
  currentCase: CaseInstance,
  options: MajorIncidentLaunchOptions = {}
) {
  const runtime = buildPlannedMajorIncidentRuntime(currentCase, state, options)
  if (!runtime) {
    return null
  }

  const candidates = buildTeamCombinations(
    getReadyTeamsForMajorIncident(state, currentCase),
    runtime.requiredTeams
  )
    .map((teams) =>
      evaluateMajorIncidentPlan(state, currentCase, teams.map((team) => team.id), options)
    )
    .filter((evaluation): evaluation is MajorIncidentEvaluation => Boolean(evaluation))
    .filter((evaluation) => evaluation.valid)
    .sort(
      (left, right) =>
        right.successChance - left.successChance ||
        (right.weakestTeam?.comparisonDelta ?? Number.NEGATIVE_INFINITY) -
          (left.weakestTeam?.comparisonDelta ?? Number.NEGATIVE_INFINITY) ||
        right.effectiveIncidentPower - left.effectiveIncidentPower ||
        right.averageIncidentOvr - left.averageIncidentOvr ||
        toComparableTeamNameSet(left.selectedTeams).localeCompare(
          toComparableTeamNameSet(right.selectedTeams)
        )
    )

  return candidates[0] ?? null
}

export function getProvisionInventoryCost(provisions: MajorIncidentProvisionType[]) {
  return [...new Set(provisions)].map(
    (provision) => MAJOR_INCIDENT_PROVISION_DEFINITIONS[provision]
  )
}

export function getAppliedMajorIncidentRewardPreview(
  runtime: ActiveMajorIncidentRuntime,
  outcome: 'success' | 'partial' | 'fail'
) {
  if (outcome === 'fail') {
    return {
      materials: [],
      gear: [],
      progressionUnlocks: [],
      rumorLoot: [],
    }
  }

  const strategyEffects = MAJOR_INCIDENT_STRATEGY_EFFECTS[runtime.strategy]
  const provisionEffects = getProvisionEffects(runtime.provisions)
  const rewardMultiplier = strategyEffects.rewardMultiplier * provisionEffects.rewardMultiplier
  const materialScale = outcome === 'success' ? rewardMultiplier : rewardMultiplier * 0.55
  const materials = scaleMaterialRewards(runtime.rewards.materials, materialScale)
  const gear = outcome === 'success' ? runtime.rewards.gear?.map((entry) => ({ ...entry })) ?? [] : []
  const progressionUnlocks = outcome === 'success' ? [...(runtime.rewards.progressionUnlocks ?? [])] : []
  const rumorLoot =
    runtime.rumor && outcome === 'success'
      ? runtime.rumor.hiddenLootModifiers.map((modifier) => ({ ...modifier }))
      : []

  return {
    materials,
    gear,
    progressionUnlocks,
    rumorLoot,
  }
}

export function resolveMajorIncidentOutcome(
  state: GameState,
  currentCase: CaseInstance,
  teamIds: string[],
  rngRoll: number
): ResolutionOutcome | null {
  const evaluation = evaluateMajorIncidentPlan(state, currentCase, teamIds, {
    strategy: currentCase.majorIncident?.strategy,
    provisions: currentCase.majorIncident?.provisions,
  })

  if (!evaluation) {
    return null
  }

  const normalizedRoll = clamp(rngRoll, 0, 1)
  const reasons = [
    `${evaluation.runtime.name} engaged.`,
    `Weakest team: ${evaluation.weakestTeam?.team.name ?? 'n/a'} (${evaluation.weakestTeam?.incidentOvr ?? 0} incident OVR).`,
    `Effective incident power ${evaluation.effectiveIncidentPower.toFixed(1)} vs difficulty ${evaluation.difficulty}.`,
    `Strategy: ${getMajorIncidentStrategyLabel(evaluation.runtime.strategy)}.`,
    `Provisions: ${
      evaluation.runtime.provisions.length > 0
        ? evaluation.runtime.provisions
            .map((provision) => MAJOR_INCIDENT_PROVISION_DEFINITIONS[provision].label)
            .join(', ')
        : 'None'
    }.`,
    ...(evaluation.runtime.rumor ? [`Rumor: ${evaluation.runtime.rumor.description}`] : []),
    `Chance=${(evaluation.successChance * 100).toFixed(0)}% roll=${(normalizedRoll * 100).toFixed(0)}%.`,
  ]

  const result: ResolutionOutcome['result'] =
    normalizedRoll < evaluation.successChance
      ? 'success'
      : evaluation.successChance >= 0.62 && normalizedRoll < evaluation.successChance + 0.18
        ? 'partial'
        : 'fail'

  return {
    caseId: currentCase.id,
    mode: 'probability' as const,
    kind: 'raid' as const,
    delta: Number((evaluation.effectiveIncidentPower - evaluation.difficulty).toFixed(1)),
    successChance: evaluation.successChance,
    result,
    reasons,
  }
}
