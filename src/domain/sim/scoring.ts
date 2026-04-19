import {
  type Agent,
  type AgentAbilityTrigger,
  type AgentPerformanceOutput,
  type CaseInstance,
  type GameConfig,
  type LeaderBonus,
  type PerformanceMetricSummary,
  type ResolutionOutcome,
  type TeamResolutionProfile,
  type ValidationIssue,
  type ValidationResult,
  type WeeklyReport,
} from '../models'
import { clamp, sigmoid } from '../math'
import {
  buildAgentSquadCompositionProfile,
  dotResolutionProfile,
  legacyStatsToResolutionProfile,
  legacyWeightsToResolutionProfile,
} from '../teamSimulation'
import { validateAgents } from '../validateTeam'
import { inventoryItemLabels } from '../../data/production'
import {
  type EquipmentLoadoutSummary,
  type TeamEquipmentSummary,
  createDefaultEquipmentLoadoutSummary,
  createDefaultTeamEquipmentSummary,
} from '../equipment'
import type { AgencyProtocolState } from '../protocols'
import { evaluateTeamCaseRecon, type CaseReconSummary } from '../recon'

const RESOLUTION_AXES = [
  'fieldPower',
  'containment',
  'investigation',
  'support',
] as const satisfies readonly (keyof TeamResolutionProfile)[]

const RESOLVE_POINTS = 100
const UNRESOLVED_PENALTY = -50
const FAIL_PENALTY = -30
const PARTIAL_PENALTY = -10
const PREFERRED_TAG_BONUS_PER_HIT = 1
const MAX_EQUIPMENT_STACK = 2
const MULTI_AGENT_READINESS_BONUS_RATE = 0.1
const MULTI_AGENT_SYNERGY_MIN = -2
const MULTI_AGENT_SYNERGY_MAX = 4
const MIN_SUCCESS_CHANCE = 0.05
const MAX_SUCCESS_CHANCE = 0.95
const NEAR_MISS_PARTIAL_CHANCE = 0.7
const DETERMINISTIC_BLOCK_DELTA = -999
const LEADER_EVENT_CHANCE_RATE = 0.08

const EQUIPMENT_SUPPORT_RULES = [
  {
    itemId: 'ward_seals',
    tags: ['occult', 'ritual', 'seal', 'holy', 'occultist', 'medium', 'anomaly', 'spirit'],
    bonusPerStock: 2,
  },
  {
    itemId: 'medkits',
    tags: ['medic', 'triage', 'medical', 'biological', 'contamination', 'hazmat'],
    bonusPerStock: 1.5,
  },
  {
    itemId: 'silver_rounds',
    tags: ['silver', 'combat', 'hunter', 'vampire', 'threat', 'raid', 'breach'],
    bonusPerStock: 2,
  },
  {
    itemId: 'signal_jammers',
    tags: ['tech', 'cyber', 'signal', 'information', 'relay', 'analyst', 'field-kit'],
    bonusPerStock: 1.5,
  },
] as const

function createDefaultPowerImpactSummary() {
  return {
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
    notes: [] as string[],
  }
}

export function createDefaultScoringSystemConfig(): ScoringSystemConfig {
  return {
    resolvePoints: RESOLVE_POINTS,
    unresolvedPenalty: UNRESOLVED_PENALTY,
    failPenalty: FAIL_PENALTY,
    partialPenalty: PARTIAL_PENALTY,
    preferredTagBonusPerHit: PREFERRED_TAG_BONUS_PER_HIT,
    maxEquipmentStack: MAX_EQUIPMENT_STACK,
    multiAgentReadinessBaseline: 50,
    minSuccessChance: MIN_SUCCESS_CHANCE,
    maxSuccessChance: MAX_SUCCESS_CHANCE,
    nearMissPartialChance: NEAR_MISS_PARTIAL_CHANCE,
    leaderEventChanceRate: LEADER_EVENT_CHANCE_RATE,
    equipmentSupportRules: EQUIPMENT_SUPPORT_RULES,
  }
}

export function sanitizeScoringSystemConfig(
  overrides: Partial<ScoringSystemConfig>
): ScoringSystemConfig {
  const defaults = createDefaultScoringSystemConfig()
  const minSuccessChance = clamp(overrides.minSuccessChance ?? defaults.minSuccessChance, 0, 1)
  const maxSuccessChance = clamp(overrides.maxSuccessChance ?? defaults.maxSuccessChance, 0, 1)
  const normalizedMax = maxSuccessChance < minSuccessChance ? minSuccessChance : maxSuccessChance

  return {
    ...defaults,
    ...overrides,
    maxEquipmentStack: Math.max(
      1,
      Math.trunc(overrides.maxEquipmentStack ?? defaults.maxEquipmentStack)
    ),
    multiAgentReadinessBaseline: clamp(
      overrides.multiAgentReadinessBaseline ?? defaults.multiAgentReadinessBaseline,
      0,
      100
    ),
    minSuccessChance,
    maxSuccessChance: normalizedMax,
    nearMissPartialChance: clamp(
      overrides.nearMissPartialChance ?? defaults.nearMissPartialChance,
      0,
      1
    ),
  }
}

export interface TeamScoreContext {
  inventory?: Record<string, number>
  protocolState?: AgencyProtocolState
  triggerEvent?: AgentAbilityTrigger
  supportTags?: string[]
  teamTags?: string[]
  leaderId?: string | null
  leaderBonusOverride?: LeaderBonus
  scoreAdjustment?: number
  scoreAdjustmentReason?: string
  partyCardScoreBonus?: number
  partyCardReasons?: string[]
  config?: GameConfig
  preflight?: {
    selectedTeamCount?: number
    minTeamCount?: number
  }
}

export interface TeamScoreModifierBreakdown {
  leaderBonus: number
  leaderEffectivenessMultiplier: number
  leaderEventModifier: number
  leaderXpBonus: number
  leaderStressModifier: number
  synergyBonus: number
  chemistryBonus: number
  readinessBonus: number
  preferredTagBonus: number
  equipmentBonus: number
  partyCardBonus: number
  contextAdjustment: number
}

export interface ResolutionAxisAssessment {
  provided: number
  required: number
  delta: number
  weight: number
  weightedDelta: number
  met: boolean
}

export interface ResolutionComparison {
  providedProfile: TeamResolutionProfile
  requiredProfile: TeamResolutionProfile
  axisAssessments: Record<keyof TeamResolutionProfile, ResolutionAxisAssessment>
  metAxes: (keyof TeamResolutionProfile)[]
  unmetAxes: (keyof TeamResolutionProfile)[]
  weightedProvidedScore: number
  weightedRequiredScore: number
  weightedDelta: number
  nonAxisModifierTotal: number
  finalDelta: number
}

export interface TeamScoreResult {
  score: number
  reasons: string[]
  agentPerformance: AgentPerformanceOutput[]
  performanceSummary: PerformanceMetricSummary
  powerSummary: ReturnType<typeof buildAgentSquadCompositionProfile>['powerSummary']
  powerImpactSummary: {
    activeEquipmentIds: string[]
    activeKitIds: string[]
    activeProtocolIds: string[]
    equipmentContributionDelta: number
    kitContributionDelta: number
    protocolContributionDelta: number
    equipmentScoreDelta: number
    kitScoreDelta: number
    protocolScoreDelta: number
    kitEffectivenessMultiplier: number
    protocolEffectivenessMultiplier: number
    notes: string[]
  }
  equipmentSummary: CaseEquipmentSummary
  resolutionProfile: TeamResolutionProfile
  leaderBonusModel: LeaderBonus
  modifierBreakdown: TeamScoreModifierBreakdown
  layerBreakdown: TeamScoreLayerBreakdown
  comparison: ResolutionComparison
  reconSummary: CaseReconSummary
}

export interface TeamScoreLayer {
  id:
    | 'leader'
    | 'synergy'
    | 'chemistry'
    | 'readiness'
    | 'preferred-tags'
    | 'equipment'
    | 'party-cards'
    | 'context-adjustment'
  label: string
  delta: number
}

export interface TeamScoreLayerBreakdown {
  baseScore: number
  finalScore: number
  layers: TeamScoreLayer[]
}

export interface CaseEquipmentSummary extends TeamEquipmentSummary {
  loadout: EquipmentLoadoutSummary
  reserveSupportBonus: number
  reserveReasons: string[]
}

export function createDefaultCaseEquipmentSummary(): CaseEquipmentSummary {
  const loadout = createDefaultEquipmentLoadoutSummary()

  return {
    ...createDefaultTeamEquipmentSummary(),
    loadout,
    reserveSupportBonus: 0,
    reserveReasons: [],
  }
}

export interface ScoringSystemConfig {
  resolvePoints: number
  unresolvedPenalty: number
  failPenalty: number
  partialPenalty: number
  preferredTagBonusPerHit: number
  maxEquipmentStack: number
  multiAgentReadinessBaseline: number
  minSuccessChance: number
  maxSuccessChance: number
  nearMissPartialChance: number
  leaderEventChanceRate: number
  equipmentSupportRules: typeof EQUIPMENT_SUPPORT_RULES
}

export interface EvaluateCaseResolutionContextInput {
  caseData: CaseInstance
  agents: Agent[]
  config: GameConfig
  context?: TeamScoreContext
  resolutionRoll?: number
}

export interface CaseResolutionContextResult {
  deployableAgents: Agent[]
  validationResult: ValidationResult
  teamScore: TeamScoreResult | null
  requiredScore: number | null
  outcome: ResolutionOutcome
  modifiersApplied: TeamScoreModifierBreakdown
  delta: number
  blockedByRequiredTags: boolean
  blockedByRequiredRoles: boolean
  successChance: number | null
}

function createNeutralModifierBreakdown(): TeamScoreModifierBreakdown {
  return {
    leaderBonus: 0,
    leaderEffectivenessMultiplier: 1,
    leaderEventModifier: 0,
    leaderXpBonus: 0,
    leaderStressModifier: 0,
    synergyBonus: 0,
    chemistryBonus: 0,
    readinessBonus: 0,
    preferredTagBonus: 0,
    equipmentBonus: 0,
    partyCardBonus: 0,
    contextAdjustment: 0,
  }
}

function isDeployableResolutionAgent(agent: Agent | undefined): agent is Agent {
  return agent !== undefined && agent.status !== 'dead' && agent.assignment?.state !== 'training'
}

function getDeployableResolutionAgents(agents: Agent[]) {
  return agents.filter(isDeployableResolutionAgent)
}

function buildSelectionPreflightIssues(
  caseData: CaseInstance,
  preflight: TeamScoreContext['preflight']
): ValidationIssue[] {
  const selectedTeamCount = preflight?.selectedTeamCount

  if (selectedTeamCount === undefined) {
    return []
  }

  if (selectedTeamCount <= 0) {
    return [
      {
        code: 'no-selected-teams',
        detail: 'No teams selected for resolution.',
      },
    ]
  }

  const minTeamCount =
    preflight?.minTeamCount ??
    (caseData.kind === 'raid' ? (caseData.raid?.minTeams ?? 2) : undefined)

  if (minTeamCount !== undefined && selectedTeamCount < minTeamCount) {
    return [
      {
        code: 'insufficient-raid-teams',
        detail: `Insufficient raid coverage: ${selectedTeamCount}/${minTeamCount} teams assigned.`,
      },
    ]
  }

  return []
}

function mergeValidationIssues(
  validationResult: ValidationResult,
  extraIssues: ValidationIssue[]
): ValidationResult {
  if (extraIssues.length === 0) {
    return validationResult
  }

  return {
    ...validationResult,
    valid: false,
    issues: [...extraIssues, ...validationResult.issues],
  }
}

function usesNoSelectedTeamsBlock(validationResult: ValidationResult) {
  return validationResult.issues.some((issue) => issue.code === 'no-selected-teams')
}

function evaluateResolutionPreflight(
  caseData: CaseInstance,
  agents: Agent[],
  context: TeamScoreContext
) {
  const deployableAgents = getDeployableResolutionAgents(agents)
  const validationResult = mergeValidationIssues(
    validateAgents(
      agents,
      {
        requiredRoles: caseData.requiredRoles ?? [],
        requiredTags: caseData.requiredTags,
        supportTags: context.supportTags,
      },
      'resolution'
    ),
    buildSelectionPreflightIssues(caseData, context.preflight)
  )
  const noSelectedTeams = usesNoSelectedTeamsBlock(validationResult)

  return {
    deployableAgents,
    validationResult,
    blockedByRequiredTags: validationResult.missingTags.length > 0 || noSelectedTeams,
    blockedByRequiredRoles: validationResult.missingRoles.length > 0 || noSelectedTeams,
  }
}

function createBlockedResolutionOutcome(c: CaseInstance, reasons: string[]): ResolutionOutcome {
  return {
    caseId: c.id,
    mode: c.mode,
    kind: c.kind,
    delta: DETERMINISTIC_BLOCK_DELTA,
    result: 'fail',
    reasons,
    agentPerformance: [],
  }
}

function getValidationReasons(validationResult: ValidationResult) {
  return validationResult.issues.map((issue) => issue.detail)
}

function buildResolvedOutcome(
  caseData: CaseInstance,
  result: ResolutionOutcome['result'],
  delta: number,
  reasons: string[],
  teamScore: TeamScoreResult,
  successChance?: number
): ResolutionOutcome {
  return {
    caseId: caseData.id,
    mode: caseData.mode,
    kind: caseData.kind,
    delta,
    result,
    reasons,
    successChance,
    agentPerformance: teamScore.agentPerformance,
    performanceSummary: teamScore.performanceSummary,
  }
}

function buildProbabilityOutcome(
  caseData: CaseInstance,
  config: GameConfig,
  delta: number,
  teamScore: TeamScoreResult,
  resolutionRoll?: number
) {
  const baseChance = clamp(
    sigmoid(delta * config.probabilityK),
    MIN_SUCCESS_CHANCE,
    MAX_SUCCESS_CHANCE
  )
  const leaderChanceModifier = teamScore.leaderBonusModel.eventModifier * LEADER_EVENT_CHANCE_RATE
  const reconChanceModifier = teamScore.reconSummary.probabilityBonus
  const chance = clamp(
    baseChance + leaderChanceModifier + reconChanceModifier,
    MIN_SUCCESS_CHANCE,
    MAX_SUCCESS_CHANCE
  )

  if (resolutionRoll === undefined) {
    const previewReasons = [
      ...teamScore.reasons,
      `Delta=${delta.toFixed(1)} (probability-preview)`,
      ...(leaderChanceModifier !== 0
        ? [`Leader event control: ${(leaderChanceModifier * 100).toFixed(1)}%`]
        : []),
      ...(reconChanceModifier !== 0
        ? [`Recon certainty: ${(reconChanceModifier * 100).toFixed(1)}%`]
        : []),
      `Chance=${(chance * 100).toFixed(0)}%`,
    ]
    const previewResult =
      delta >= 0 ? 'success' : delta >= -config.partialMargin ? 'partial' : 'fail'

    return {
      successChance: chance,
      outcome: buildResolvedOutcome(
        caseData,
        previewResult,
        delta,
        previewReasons,
        teamScore,
        chance
      ),
    }
  }

  const normalizedRoll = clamp(resolutionRoll, 0, 1)
  const reasons = [
    ...teamScore.reasons,
    `Delta=${delta.toFixed(1)} (probability)`,
    ...(leaderChanceModifier !== 0
      ? [`Leader event control: ${(leaderChanceModifier * 100).toFixed(1)}%`]
      : []),
    ...(reconChanceModifier !== 0
      ? [`Recon certainty: ${(reconChanceModifier * 100).toFixed(1)}%`]
      : []),
    `Chance=${(chance * 100).toFixed(0)}% roll=${(normalizedRoll * 100).toFixed(0)}%`,
  ]

  if (normalizedRoll < chance) {
    return {
      successChance: chance,
      outcome: buildResolvedOutcome(caseData, 'success', delta, reasons, teamScore, chance),
    }
  }

  if (chance >= NEAR_MISS_PARTIAL_CHANCE) {
    return {
      successChance: chance,
      outcome: buildResolvedOutcome(caseData, 'partial', delta, reasons, teamScore, chance),
    }
  }

  return {
    successChance: chance,
    outcome: buildResolvedOutcome(caseData, 'fail', delta, reasons, teamScore, chance),
  }
}

export function evaluateCaseResolutionContext(
  input: EvaluateCaseResolutionContextInput
): CaseResolutionContextResult {
  const { caseData, agents, config, context = {}, resolutionRoll } = input
  const { deployableAgents, validationResult, blockedByRequiredTags, blockedByRequiredRoles } =
    evaluateResolutionPreflight(caseData, agents, context)
  const validationReasons = getValidationReasons(validationResult)

  if (validationReasons.length > 0) {
    return {
      deployableAgents,
      validationResult,
      teamScore: null,
      requiredScore: null,
      outcome: createBlockedResolutionOutcome(caseData, validationReasons),
      modifiersApplied: createNeutralModifierBreakdown(),
      delta: DETERMINISTIC_BLOCK_DELTA,
      blockedByRequiredTags,
      blockedByRequiredRoles,
      successChance: null,
    }
  }

  const teamScore = computeTeamScore(deployableAgents, caseData, { ...context, config })
  const requiredScore = computeRequiredScore(caseData, config)
  const delta = teamScore.score - requiredScore

  if (caseData.mode === 'probability') {
    const probability = buildProbabilityOutcome(caseData, config, delta, teamScore, resolutionRoll)

    // SPE-38: Apply supportShortfall penalty if present
    let outcome = probability.outcome
    if (caseData.supportShortfall) {
      // Degrade outcome by one level and add explanation
      if (outcome.result === 'success') {
        outcome = { ...outcome, result: 'partial', reasons: [...outcome.reasons, 'Support shortfall: degraded to partial.'] }
      } else if (outcome.result === 'partial') {
        outcome = { ...outcome, result: 'fail', reasons: [...outcome.reasons, 'Support shortfall: degraded to fail.'] }
      } else {
        outcome = { ...outcome, reasons: [...outcome.reasons, 'Support shortfall: no further degradation.'] }
      }
    }

    return {
      deployableAgents,
      validationResult,
      teamScore,
      requiredScore,
      outcome,
      modifiersApplied: teamScore.modifierBreakdown,
      delta,
      blockedByRequiredTags,
      blockedByRequiredRoles,
      successChance: probability.successChance,
    }
  }

  const thresholdReasons = [...teamScore.reasons, `Delta=${delta.toFixed(1)} (threshold)`]
  let thresholdOutcome =
    delta >= 0
      ? buildResolvedOutcome(caseData, 'success', delta, thresholdReasons, teamScore)
      : delta >= -config.partialMargin
        ? buildResolvedOutcome(
            caseData,
            'partial',
            delta,
            [...thresholdReasons, 'Partial containment: fallout remains.'],
            teamScore
          )
        : buildResolvedOutcome(caseData, 'fail', delta, thresholdReasons, teamScore)

  // SPE-38: Apply supportShortfall penalty if present
  if (caseData.supportShortfall) {
    if (thresholdOutcome.result === 'success') {
      thresholdOutcome = { ...thresholdOutcome, result: 'partial', reasons: [...thresholdOutcome.reasons, 'Support shortfall: degraded to partial.'] }
    } else if (thresholdOutcome.result === 'partial') {
      thresholdOutcome = { ...thresholdOutcome, result: 'fail', reasons: [...thresholdOutcome.reasons, 'Support shortfall: degraded to fail.'] }
    } else {
      thresholdOutcome = { ...thresholdOutcome, reasons: [...thresholdOutcome.reasons, 'Support shortfall: no further degradation.'] }
    }
  }

  return {
    deployableAgents,
    validationResult,
    teamScore,
    requiredScore,
    outcome: thresholdOutcome,
    modifiersApplied: teamScore.modifierBreakdown,
    delta,
    blockedByRequiredTags,
    blockedByRequiredRoles,
    successChance: null,
  }
}

function computeEquipmentSupportBonus(agents: Agent[], c: CaseInstance, context: TeamScoreContext) {
  const inventory = context.inventory ?? {}
  const supportTags = new Set([
    ...c.tags,
    ...c.requiredTags,
    ...c.preferredTags,
    ...(context.supportTags ?? []),
    ...agents.flatMap((agent) => agent.tags),
  ])
  const reasons: string[] = []

  const score = EQUIPMENT_SUPPORT_RULES.reduce((total, rule) => {
    const quantity = Math.max(0, Math.trunc(inventory[rule.itemId] ?? 0))

    if (quantity === 0 || !rule.tags.some((tag) => supportTags.has(tag))) {
      return total
    }

    const appliedStock = Math.min(quantity, MAX_EQUIPMENT_STACK)
    const bonus = appliedStock * rule.bonusPerStock
    reasons.push(`${inventoryItemLabels[rule.itemId] ?? rule.itemId}: +${bonus.toFixed(1)}`)

    return total + bonus
  }, 0)

  return { score, reasons }
}

function createModifierBreakdown(input: {
  leaderBonus: number
  leaderBonusModel: LeaderBonus
  synergyBonus: number
  chemistryBonus: number
  readinessBonus: number
  preferredTagBonus: number
  equipmentBonus: number
  partyCardBonus: number
  contextAdjustment: number
}): TeamScoreModifierBreakdown {
  return {
    leaderBonus: input.leaderBonus,
    leaderEffectivenessMultiplier: input.leaderBonusModel.effectivenessMultiplier,
    leaderEventModifier: input.leaderBonusModel.eventModifier,
    leaderXpBonus: input.leaderBonusModel.xpBonus,
    leaderStressModifier: input.leaderBonusModel.stressModifier,
    synergyBonus: input.synergyBonus,
    chemistryBonus: input.chemistryBonus,
    readinessBonus: input.readinessBonus,
    preferredTagBonus: input.preferredTagBonus,
    equipmentBonus: input.equipmentBonus,
    partyCardBonus: input.partyCardBonus,
    contextAdjustment: input.contextAdjustment,
  }
}

function computeNonAxisModifierTotal(input: {
  leaderBonus: number
  synergyBonus: number
  chemistryBonus: number
  readinessBonus: number
  preferredBonus: number
  equipmentScore: number
  partyCardScore: number
  contextAdjustment: number
}) {
  return (
    input.leaderBonus +
    input.synergyBonus +
    input.chemistryBonus +
    input.readinessBonus +
    input.preferredBonus +
    input.equipmentScore +
    input.partyCardScore +
    input.contextAdjustment
  )
}

function computeTotalScore(base: number, nonAxisModifierTotal: number) {
  return base + nonAxisModifierTotal
}

function toTitleCaseLabel(value: string) {
  return value
    .split(' ')
    .map((part) => (part.length > 0 ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ')
}

function normalizeDisplayLabel(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) {
    return 'Unknown'
  }

  return toTitleCaseLabel(value)
}

export function computeTeamScore(agents: Agent[], c: CaseInstance, context: TeamScoreContext = {}) {
  const reasons: string[] = []
  // Niche-driven containment specialist bonus/penalty
  let containmentNicheBonus = 0;
  // Hybrid penalty: agent with both recon-specialist and containment-specialist
  if (agents.some(a => a.tags?.includes('containment-specialist') && a.tags?.includes('recon-specialist'))) {
    containmentNicheBonus -= 2;
    reasons.push('Hybrid specialist penalty: recon + containment -2.');
  } else if (agents.some(a => a.tags?.includes('containment-specialist'))) {
    containmentNicheBonus += 2;
    reasons.push('Containment specialist present: +2 containment bonus.');
  } else if (agents.some(a => a.tags?.includes('recon-specialist'))) {
    containmentNicheBonus -= 1;
    reasons.push('Recon specialist substituted: -1 containment penalty.');
  } else if (agents.some(a => a.tags?.includes('recovery-support'))) {
    containmentNicheBonus -= 2;
    reasons.push('Recovery specialist substituted: -2 containment penalty.');
  } else {
    reasons.push('No specialist present: reduced reliability in containment.');
  }
  const profile = buildAgentSquadCompositionProfile(
    agents,
    context.leaderId ?? null,
    context.teamTags ?? context.supportTags ?? [],
    {
      caseData: c,
      inventory: context.inventory,
      supportTags: context.supportTags,
      teamTags: context.teamTags ?? context.supportTags,
      leaderId: context.leaderId ?? null,
      protocolState: context.protocolState,
    }
  )

  // Apply containment niche bonus directly to the containment axis
  if (containmentNicheBonus !== 0) {
    profile.resolutionProfile.containment += containmentNicheBonus;
  }
  const caseWeights = legacyWeightsToResolutionProfile(c.weights)
  // Resolution is driven by bucketed outputs plus explicit modifiers.
  // `derivedStats.overall` is a summary metric for UI surfaces only.
  const base = dotResolutionProfile(profile.resolutionProfile, caseWeights)
  const chemistryBonus = profile.chemistryBonus
  const leaderBonusModel = context.leaderBonusOverride ?? profile.leaderBonus
  const leaderBonus = base * (leaderBonusModel.effectivenessMultiplier - 1)
  const synergyResolutionBonus = dotResolutionProfile(
    profile.synergyProfile.resolutionBonus,
    caseWeights
  )
  const synergyBonus = clamp(
    synergyResolutionBonus +
      profile.synergyProfile.scoreBonus +
      (profile.synergyProfile.bondDepthBonus ?? 0),
    MULTI_AGENT_SYNERGY_MIN,
    MULTI_AGENT_SYNERGY_MAX
  )
  const readinessBonus =
    agents.length > 1
      ? base * ((profile.derivedStats.readiness - 50) / 100) * MULTI_AGENT_READINESS_BONUS_RATE
      : 0

  if (leaderBonus !== 0) {
    reasons.push(
      `Leader bonus: ${leaderBonus.toFixed(1)} (x${leaderBonusModel.effectivenessMultiplier.toFixed(3)})`
    )
  }

  if (synergyBonus !== 0) {
    const synergyLabels = profile.synergyProfile.active.map((synergy) => synergy.label).join(', ')
    reasons.push(`Synergy: ${synergyBonus.toFixed(1)}${synergyLabels ? ` (${synergyLabels})` : ''}`)
  }

  if (readinessBonus !== 0) {
    reasons.push(`Readiness: ${readinessBonus.toFixed(1)}`)
  }

  if (chemistryBonus !== 0) {
    reasons.push(`Chemistry: ${chemistryBonus.toFixed(1)}`)
  }

  // Soft preference: +1 per preferred tag hit (placeholder default)
  const tagSet = new Set([...(context.supportTags ?? []), ...agents.flatMap((a) => a.tags)])
  const preferredHits = c.preferredTags.filter((t) => tagSet.has(t)).length
  const preferredBonus = preferredHits * PREFERRED_TAG_BONUS_PER_HIT
  if (preferredHits) reasons.push(`Preferred tags: +${preferredBonus.toFixed(1)}`)
  const equipment = computeEquipmentSupportBonus(agents, c, context)
  reasons.push(...equipment.reasons)
  const reconSummary = evaluateTeamCaseRecon(agents, c, {
    supportTags: context.supportTags,
    teamTags: context.teamTags ?? context.supportTags,
    leaderId: context.leaderId ?? null,
    protocolState: context.protocolState,
  })
  reasons.push(...reconSummary.reasons)
  const partyCardBonus = context.partyCardScoreBonus ?? 0
  if (partyCardBonus !== 0) {
    reasons.push(...(context.partyCardReasons ?? [`Party cards: ${partyCardBonus.toFixed(1)}`]))
  }
  const externalContextAdjustment = context.scoreAdjustment ?? 0
  if (externalContextAdjustment !== 0 || context.scoreAdjustmentReason) {
    reasons.push(
      context.scoreAdjustmentReason ?? `Context adjustment: ${externalContextAdjustment.toFixed(1)}`
    )
  }
  const contextAdjustment = externalContextAdjustment + reconSummary.scoreAdjustment
  const nonAxisModifierTotal = computeNonAxisModifierTotal({
    leaderBonus,
    synergyBonus,
    chemistryBonus,
    readinessBonus,
    preferredBonus,
    equipmentScore: equipment.score,
    partyCardScore: partyCardBonus,
    contextAdjustment,
  })
  const comparison = compareResolutionAgainstCase(
    profile.resolutionProfile,
    c,
    nonAxisModifierTotal,
    context.config
  )

  if (profile.powerSummary.kits.length > 0) {
    const kitLabels = profile.powerSummary.kits
      .map(
        (kit: (typeof profile.powerSummary.kits)[number]) =>
          `${normalizeDisplayLabel((kit as { label?: string; name?: string }).label ?? (kit as { label?: string; name?: string }).name ?? kit.id)} (${kit.highestActiveThreshold}-piece)`
      )
      .join(', ')
    reasons.push(`Equipment kits: ${kitLabels}`)
  }

  if (profile.powerSummary.protocols.length > 0) {
    const protocolLabels = profile.powerSummary.protocols
      .map((protocol: (typeof profile.powerSummary.protocols)[number]) =>
        normalizeDisplayLabel(
          (protocol as { label?: string; name?: string }).label ??
            (protocol as { label?: string; name?: string }).name ??
            protocol.id
        )
      )
      .join(', ')
    reasons.push(`Protocols: ${protocolLabels}`)
  }

  const score = computeTotalScore(base, nonAxisModifierTotal)
  const layerBreakdown: TeamScoreLayerBreakdown = {
    baseScore: base,
    finalScore: score,
    layers: [
      { id: 'leader', label: 'Leader', delta: leaderBonus },
      { id: 'synergy', label: 'Synergy', delta: synergyBonus },
      { id: 'chemistry', label: 'Chemistry', delta: chemistryBonus },
      { id: 'readiness', label: 'Readiness', delta: readinessBonus },
      { id: 'preferred-tags', label: 'Preferred tags', delta: preferredBonus },
      { id: 'equipment', label: 'Equipment', delta: equipment.score },
      { id: 'party-cards', label: 'Party cards', delta: partyCardBonus },
      { id: 'context-adjustment', label: 'Context adjustment', delta: contextAdjustment },
    ],
  }

  return {
    score,
    reasons,
    agentPerformance: profile.agentPerformance,
    performanceSummary: profile.performanceSummary,
    powerSummary: profile.powerSummary,
    powerImpactSummary: profile.powerImpactSummary ?? createDefaultPowerImpactSummary(),
    equipmentSummary: {
      ...profile.equipmentSummary,
      loadout: {
        slotCount: profile.equipmentSummary.slotCount,
        equippedItemCount: profile.equipmentSummary.equippedItemCount,
        emptySlotCount: profile.equipmentSummary.emptySlotCount,
        activeContextItemCount: profile.equipmentSummary.activeContextItemCount,
        loadoutQuality: profile.equipmentSummary.loadoutQuality,
        equippedItemIds: [...profile.equipmentSummary.equippedItemIds],
        equippedTags: [...profile.equipmentSummary.equippedTags],
      },
      reserveSupportBonus: equipment.score,
      reserveReasons: [...equipment.reasons],
    },
    resolutionProfile: profile.resolutionProfile,
    leaderBonusModel,
    modifierBreakdown: createModifierBreakdown({
      leaderBonus,
      leaderBonusModel,
      synergyBonus,
      chemistryBonus,
      readinessBonus,
      preferredTagBonus: preferredBonus,
      equipmentBonus: equipment.score,
      partyCardBonus,
      contextAdjustment,
    }),
    layerBreakdown,
    comparison,
    reconSummary,
  }
}

/**
 * Build the case-demand profile in the same four resolution buckets used by team composition.
 * This keeps the engine abstract and multi-axis without introducing tactical combat logic.
 */
export function computeRequiredResolutionProfile(c: CaseInstance, config: GameConfig) {
  const difficultyProfile = legacyStatsToResolutionProfile(c.difficulty)
  const stageMultiplier = 1 + (c.stage - 1) * config.stageScalar
  const baseProfile = RESOLUTION_AXES.reduce<TeamResolutionProfile>((profile, axis) => {
    profile[axis] = difficultyProfile[axis] * stageMultiplier
    return profile
  }, createEmptyResolutionProfile())

  if (config.durationModel !== 'attrition') {
    return baseProfile
  }

  const durationPenalty = c.durationWeeks * config.attritionPerWeek
  if (durationPenalty <= 0) {
    return baseProfile
  }

  const weightProfile = legacyWeightsToResolutionProfile(c.weights)
  const relevantAxes = RESOLUTION_AXES.filter((axis) => weightProfile[axis] > 0)
  const weightSum = relevantAxes.reduce((sum, axis) => sum + weightProfile[axis], 0)

  if (weightSum <= 0) {
    return baseProfile
  }

  const durationDemandPerAxis = durationPenalty / weightSum

  return RESOLUTION_AXES.reduce<TeamResolutionProfile>((profile, axis) => {
    profile[axis] = baseProfile[axis] + (weightProfile[axis] > 0 ? durationDemandPerAxis : 0)
    return profile
  }, createEmptyResolutionProfile())
}

export function computeRequiredScore(c: CaseInstance, config: GameConfig) {
  return dotResolutionProfile(
    computeRequiredResolutionProfile(c, config),
    legacyWeightsToResolutionProfile(c.weights)
  )
}

/**
 * Compare provided team buckets against case demands axis by axis.
 * The final score can still include non-axis modifiers such as chemistry/readiness,
 * but the case demand side remains an explicit multi-axis profile.
 */
export function compareResolutionAgainstCase(
  providedProfile: TeamResolutionProfile,
  c: CaseInstance,
  nonAxisModifierTotal = 0,
  config: GameConfig = createDefaultScoringConfig()
): ResolutionComparison {
  const weightProfile = legacyWeightsToResolutionProfile(c.weights)
  const requiredProfile = computeRequiredResolutionProfile(c, config)
  const axisAssessments = RESOLUTION_AXES.reduce<
    Record<keyof TeamResolutionProfile, ResolutionAxisAssessment>
  >(
    (assessments, axis) => {
      const provided = providedProfile[axis]
      const required = requiredProfile[axis]
      const delta = provided - required
      const weight = weightProfile[axis]

      assessments[axis] = {
        provided,
        required,
        delta,
        weight,
        weightedDelta: delta * weight,
        met: weight <= 0 || delta >= 0,
      }

      return assessments
    },
    {} as Record<keyof TeamResolutionProfile, ResolutionAxisAssessment>
  )
  const metAxes = RESOLUTION_AXES.filter((axis) => axisAssessments[axis].met)
  const unmetAxes = RESOLUTION_AXES.filter((axis) => !axisAssessments[axis].met)
  const weightedProvidedScore = dotResolutionProfile(providedProfile, weightProfile)
  const weightedRequiredScore = dotResolutionProfile(requiredProfile, weightProfile)
  const weightedDelta = weightedProvidedScore - weightedRequiredScore

  return {
    providedProfile,
    requiredProfile,
    axisAssessments,
    metAxes,
    unmetAxes,
    weightedProvidedScore,
    weightedRequiredScore,
    weightedDelta,
    nonAxisModifierTotal,
    finalDelta: weightedDelta + nonAxisModifierTotal,
  }
}

/**
 * Compute a numeric score for a weekly report.
 * Not stored in WeeklyReport itself; use as a helper for cumulative display.
 */
export function calcWeekScore(
  report: WeeklyReport,
  systemConfig: ScoringSystemConfig = createDefaultScoringSystemConfig()
): number {
  return (
    report.resolvedCases.length * systemConfig.resolvePoints +
    report.unresolvedTriggers.length * systemConfig.unresolvedPenalty +
    report.failedCases.length * systemConfig.failPenalty +
    report.partialCases.length * systemConfig.partialPenalty
  )
}

function createEmptyResolutionProfile(): TeamResolutionProfile {
  return {
    fieldPower: 0,
    containment: 0,
    investigation: 0,
    support: 0,
  }
}

function createDefaultScoringConfig(): GameConfig {
  return {
    maxActiveCases: 7,
    trainingSlots: 4,
    partialMargin: 15,
    stageScalar: 1.15,
    challengeModeEnabled: false,
    durationModel: 'capacity',
    attritionPerWeek: 4,
    probabilityK: 2.4,
    raidCoordinationPenaltyPerExtraTeam: 0.08,
    weeksPerYear: 52,
    fundingBasePerWeek: 10,
    fundingPerResolution: 8,
    fundingPenaltyPerFail: 6,
    fundingPenaltyPerUnresolved: 10,
    containmentWeeklyDecay: 2,
    containmentDeltaPerResolution: 3,
    containmentDeltaPerFail: -4,
    containmentDeltaPerUnresolved: -6,
    clearanceThresholds: [0, 180, 420, 760, 1200],
  }
}
