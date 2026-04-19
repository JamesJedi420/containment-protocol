// --- Fusion Explanation ---


export function explainFusion(ks: KnowledgeState): string {
  if (ks.fusedFrom && ks.fusedFrom.length > 1) {
    return `Fused from ${ks.fusedFrom.join(', ')} (week ${ks.lastFusedWeek ?? '?'})`;
  }
  return '';
}
// --- Decay Explanation ---


export function explainDecay(ks: KnowledgeState): string {
  if (ks.decayed && ks.tier === 'partial') {
    return `Decayed from confirmed (week ${ks.lastDecayedWeek ?? '?'})`;
  }
  if (ks.decayed && ks.tier === 'unknown') {
    return `Decayed from partial (week ${ks.lastDecayedWeek ?? '?'})`;
  }
  return '';
}
// --- Multi-hop/Relay Explanation ---


export function explainRelayChain(ks: KnowledgeState): string {
  if (ks.relayFailed) {
    return `Relay failed (week ${ks.lastRelayFailedWeek ?? '?'})`;
  }
  if (ks.tier === 'relayed') {
    return `Relayed from ${ks.relaySource ?? '?'} (week ${ks.lastRelayedWeek ?? '?'})`;
  }
  return '';
}
// --- Hazard Knowledge Explanation ---


export function explainHazardKnowledge(ks: KnowledgeState): string {
  if (ks.tier === 'confirmed') {
    return `Hazard detected (week ${ks.lastConfirmedWeek ?? '?'})`;
  }
  if (ks.masked) {
    return `Hazard is masked/obscured (week ${ks.lastMaskedWeek ?? '?'})`;
  }
  return 'No hazard knowledge.';
}
import { hasDefeatConditionCertainty, type DefeatConditionCertainty, type KnowledgeStateMap } from './knowledge'
// --- Knowledge/Relay Explanation Utility ---
// Returns a human-readable explanation for defeat-condition certainty and relay status
export function explainDefeatConditionKnowledge(
  knowledge: KnowledgeStateMap,
  teamId: string,
  anomalyId: string
): string {
  const key = `${teamId}::${anomalyId}`
  const entry = knowledge[key]
  if (!entry) return 'No knowledge of defeat condition.'
  switch (entry.defeatConditionCertainty) {
    case 'exact':
      return 'Exact defeat/neutralization condition is known.'
    case 'family':
      return 'Bypass method family is suspected.'
    case 'suspected':
      return 'Possible bypass exists, but details are unclear.'
    default:
      return 'Defeat/neutralization condition is unknown.'
  }
}

export function explainRelayStatus(
  knowledge: KnowledgeStateMap,
  teamId: string,
  anomalyId: string,
  currentWeek: number
): string {
  const key = `${teamId}::${anomalyId}`
  const entry = knowledge[key]
  if (!entry || entry.relayAvailableWeek === undefined) return ''
  if (currentWeek < entry.relayAvailableWeek) {
    return `Relay in progress, knowledge will be available week ${entry.relayAvailableWeek}.`
  }
  return ''
}
import { previewResolutionPartyCards } from './partyCards/engine'
import { buildAgencyProtocolState } from './protocols'
import { buildMissionRewardBreakdown } from './missionResults'
import {
  createDefaultCaseEquipmentSummary,
  evaluateCaseResolutionContext,
  computeRequiredResolutionProfile,
  computeRequiredScore,
  type CaseEquipmentSummary,
  type ResolutionComparison,
  type TeamScoreContext,
  type TeamScoreLayerBreakdown,
} from './sim/scoring'
import { getRaidCoordinationAdjustment, type OutcomeOdds } from './sim/resolve'
import {
  buildAggregatedLeaderBonus,
  buildAgentSquadCompositionProfile,
  getTeamMemberIds,
  getUniqueTeamMembers,
  legacyWeightsToResolutionProfile,
} from './teamSimulation'
import { EQUIPMENT_SLOT_LABELS, type EquipmentItem } from './equipment'
import type {
  Agent,
  CaseInstance,
  GameConfig,
  GameState,
  Id,
  MissionResolutionKind,
  MissionRewardFactor,
  MissionRewardFactionStanding,
  MissionRewardInventoryGrant,
  PerformanceMetricSummary,
  Relationship,
  Team,
  TeamChemistryProfile,
  TeamPowerSummary,
  TeamResolutionProfile,
  ValidationIssue,
} from './models'

type ExplanationTone = 'positive' | 'neutral' | 'negative'
type ResolutionAxis = keyof TeamResolutionProfile

export interface ExplanationMetric {
  id: string
  label: string
  value: number | string
  detail: string
  tone: ExplanationTone
}

export interface CaseDifficultyAxisExplanation {
  axis: ResolutionAxis
  label: string
  required: number
  weight: number
  weightedRequired: number
  detail: string
}

export interface CaseDifficultyExplanation {
  caseId: string
  title: string
  mode: CaseInstance['mode']
  kind: CaseInstance['kind']
  stage: number
  durationWeeks: number
  deadlineRemaining: number
  requiredScore: number
  factors: ExplanationMetric[]
  axes: CaseDifficultyAxisExplanation[]
  summary: string
}

export interface TeamEffectivenessExplanation {
  teamIds: string[]
  deployableAgentIds: string[]
  requiredScore: number | null
  finalScore: number | null
  delta: number
  odds: OutcomeOdds
  validationIssues: ValidationIssue[]
  layerBreakdown: TeamScoreLayerBreakdown | null
  comparison: ResolutionComparison | null
  performanceSummary: PerformanceMetricSummary
  reasons: string[]
  summary: string
}

export interface ChemistryRelationshipExplanation {
  agentAId: string
  agentBId: string
  value: number
  modifiers: string[]
  detail: string
  tone: ExplanationTone
}

export interface ChemistryExplanation {
  teamIds: string[]
  raw: number
  bonus: number
  pairs: number
  average: number
  relationships: ChemistryRelationshipExplanation[]
  summary: string
}

export interface GearItemExplanation {
  itemId: string
  name: string
  slot: string
  quality: number
  contextActive: boolean
  baseModifierTotal: number
  contextModifierTotal: number
  totalModifierTotal: number
  tags: string[]
  detail: string
}

export interface GearImpactExplanation {
  teamIds: string[]
  equippedItemCount: number
  activeContextItemCount: number
  loadoutQuality: number
  reserveSupportBonus: number
  reserveReasons: string[]
  items: GearItemExplanation[]
  summary: string
}

export interface PowerLayerInventoryExplanation {
  itemId: string
  name: string
  equippedCount: number
  activeContextCount: number
  stockOnHand: number
  totalQuality: number
  tags: string[]
  detail: string
}

export interface PowerLayerKitExplanation {
  id: string
  label: string
  contributorCount: number
  contributorIds: string[]
  matchedItemIds: string[]
  matchedTags: string[]
  activeThresholds: number[]
  highestActiveThreshold: number
  effectivenessMultiplier: number
  stressImpactMultiplier: number
  moraleRecoveryDelta: number
  statModifiers: string[]
  detail: string
}

export interface PowerLayerProtocolExplanation {
  id: string
  label: string
  tier: string
  contributorCount: number
  contributorIds: string[]
  unlockReasons: string[]
  effectivenessMultiplier: number
  stressImpactMultiplier: number
  moraleRecoveryDelta: number
  statModifiers: string[]
  detail: string
}

export interface PowerLayerExplanation {
  teamIds: string[]
  inventory: PowerLayerInventoryExplanation[]
  kits: PowerLayerKitExplanation[]
  protocols: PowerLayerProtocolExplanation[]
  aggregateModifiers: string[]
  effectivenessMultiplier: number
  stressImpactMultiplier: number
  moraleRecoveryDelta: number
  summary: string
}

export interface RewardCalculationExplanation {
  caseId: string
  outcome: MissionResolutionKind
  operationValue: number
  deltas: {
    funding: number
    containment: number
    reputation: number
    strategicValue: number
  }
  factors: ExplanationMetric[]
  inventoryRewards: MissionRewardInventoryGrant[]
  factionStanding: MissionRewardFactionStanding[]
  reasons: string[]
  summary: string
}

export interface OperationExplanationBundle {
  caseDifficulty: CaseDifficultyExplanation
  teamEffectiveness: TeamEffectivenessExplanation
  chemistry: ChemistryExplanation
  gearImpact: GearImpactExplanation
  powerLayer: PowerLayerExplanation
  rewardCalculation: RewardCalculationExplanation
}

interface ExplanationSelection {
  teamIds: string[]
  teams: Team[]
  agents: Agent[]
  context: TeamScoreContext
  profile: ReturnType<typeof buildAgentSquadCompositionProfile>
  evaluation: ReturnType<typeof evaluateCaseResolutionContext>
  odds: OutcomeOdds
}

const RESOLUTION_AXIS_ORDER: readonly ResolutionAxis[] = [
  'fieldPower',
  'containment',
  'investigation',
  'support',
] as const

const AXIS_LABELS: Record<ResolutionAxis, string> = {
  fieldPower: 'Field',
  containment: 'Containment',
  investigation: 'Investigation',
  support: 'Support',
}

function formatSignedNumber(value: number, digits = 1) {
  const rounded = Number(value.toFixed(digits))
  return `${rounded >= 0 ? '+' : ''}${rounded.toFixed(digits)}`
}

function formatSignedInteger(value: number) {
  return `${value >= 0 ? '+' : ''}${value}`
}

function formatPowerModifierEntries(modifiers: TeamPowerSummary['statModifiers']) {
  return Object.entries(modifiers)
    .filter(([, value]) => typeof value === 'number' && value !== 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key} ${formatSignedNumber(value as number, 2)}`)
}

function formatPowerAggregateEntries(summary: TeamPowerSummary) {
  const aggregateEntries = formatPowerModifierEntries(summary.statModifiers)

  if (summary.effectivenessMultiplier !== 1) {
    aggregateEntries.push(`effectiveness x${summary.effectivenessMultiplier.toFixed(2)}`)
  }

  if (summary.stressImpactMultiplier !== 1) {
    aggregateEntries.push(`stress impact x${summary.stressImpactMultiplier.toFixed(2)}`)
  }

  if (summary.moraleRecoveryDelta !== 0) {
    aggregateEntries.push(`morale recovery ${formatSignedNumber(summary.moraleRecoveryDelta, 2)}`)
  }

  return aggregateEntries
}

function toExplanationTone(value: number): ExplanationTone {
  if (value > 0) {
    return 'positive'
  }

  if (value < 0) {
    return 'negative'
  }

  return 'neutral'
}

function getSupportTags(state: GameState, teamIds: string[]) {
  return [...new Set(teamIds.flatMap((teamId) => state.teams[teamId]?.tags ?? []))]
}

function buildOutcomeOddsFromEvaluation(
  evaluation: ReturnType<typeof evaluateCaseResolutionContext>
): OutcomeOdds {
  if (!evaluation.teamScore || evaluation.requiredScore === null) {
    return {
      chemistry: 0,
      success: 0,
      partial: 0,
      fail: 1,
      blockedByRequiredTags: evaluation.blockedByRequiredTags,
      blockedByRequiredRoles: evaluation.blockedByRequiredRoles,
    }
  }

  const chemistry =
    evaluation.requiredScore <= 0
      ? 1
      : Math.max(0, Math.min(2, evaluation.teamScore.score / evaluation.requiredScore))

  if (evaluation.successChance !== null) {
    const chance = Math.max(0.05, Math.min(0.95, evaluation.successChance))

    return {
      chemistry,
      success: chance,
      partial: chance >= 0.7 ? 1 - chance : 0,
      fail: chance >= 0.7 ? 0 : 1 - chance,
      blockedByRequiredTags: evaluation.blockedByRequiredTags,
      blockedByRequiredRoles: evaluation.blockedByRequiredRoles,
    }
  }

  if (evaluation.outcome.result === 'success') {
    return {
      chemistry,
      success: 1,
      partial: 0,
      fail: 0,
      blockedByRequiredTags: evaluation.blockedByRequiredTags,
      blockedByRequiredRoles: evaluation.blockedByRequiredRoles,
    }
  }

  if (evaluation.outcome.result === 'partial') {
    return {
      chemistry,
      success: 0,
      partial: 1,
      fail: 0,
      blockedByRequiredTags: evaluation.blockedByRequiredTags,
      blockedByRequiredRoles: evaluation.blockedByRequiredRoles,
    }
  }

  return {
    chemistry,
    success: 0,
    partial: 0,
    fail: 1,
    blockedByRequiredTags: evaluation.blockedByRequiredTags,
    blockedByRequiredRoles: evaluation.blockedByRequiredRoles,
  }
}

function buildExplanationSelection(
  currentCase: CaseInstance,
  state: GameState,
  requestedTeamIds: Id[]
): ExplanationSelection {
  const teamIds = [...new Set(requestedTeamIds)].filter((teamId) => Boolean(state.teams[teamId]))
  const teams = teamIds.map((teamId) => state.teams[teamId]).filter(Boolean)
  const agents = getUniqueTeamMembers(teamIds, state.teams, state.agents)
  const supportTags = getSupportTags(state, teamIds)
  const coordination =
    currentCase.kind === 'raid' && teamIds.length > 1
      ? getRaidCoordinationAdjustment(teamIds.length, state.config)
      : undefined
  const partyCardBonus = state.partyCards
    ? previewResolutionPartyCards(state.partyCards, {
        caseId: currentCase.id,
        caseTags: currentCase.tags,
        teamIds,
      })
    : null
  const leaderId = teamIds.length === 1 ? (state.teams[teamIds[0]]?.leaderId ?? null) : null
  const teamTags = supportTags

  const context: TeamScoreContext = {
    inventory: state.inventory,
    supportTags,
    teamTags,
    preflight: {
      selectedTeamCount: teamIds.length,
      minTeamCount: currentCase.kind === 'raid' ? (currentCase.raid?.minTeams ?? 2) : undefined,
    },
    leaderId,
    scoreAdjustment: coordination?.scoreAdjustment,
    scoreAdjustmentReason: coordination?.reason,
    partyCardScoreBonus: partyCardBonus?.scoreAdjustment,
    partyCardReasons:
      partyCardBonus && partyCardBonus.scoreAdjustment !== 0
        ? [`Party cards: ${partyCardBonus.scoreAdjustment.toFixed(1)}`]
        : undefined,
    leaderBonusOverride:
      teamIds.length > 1 && teams.some((team) => getTeamMemberIds(team).length > 1)
        ? buildAggregatedLeaderBonus(teams, state.agents)
        : undefined,
    protocolState: buildAgencyProtocolState(state),
    config: state.config,
  }

  const profile = buildAgentSquadCompositionProfile(agents, leaderId, teamTags, {
    caseData: currentCase,
    inventory: state.inventory,
    supportTags,
    teamTags,
    leaderId,
    protocolState: context.protocolState,
  })
  const evaluation = evaluateCaseResolutionContext({
    caseData: currentCase,
    agents,
    config: state.config,
    context,
  })

  return {
    teamIds,
    teams,
    agents,
    context,
    profile,
    evaluation,
    odds: buildOutcomeOddsFromEvaluation(evaluation),
  }
}

function sumRelationshipModifierText(relationship: Relationship) {
  if (relationship.modifiers.length === 0) {
    return 'No active chemistry modifiers.'
  }

  return `Modifiers: ${relationship.modifiers.join(', ')}.`
}

function sumEquipmentModifierTotal(item: EquipmentItem, kind: 'base' | 'active' | 'total') {
  const source =
    kind === 'base'
      ? item.baseModifiers
      : kind === 'active'
        ? item.activeModifiers
        : item.statModifiers

  return Object.values(source).reduce((domainTotal, domainBlock) => {
    if (!domainBlock) {
      return domainTotal
    }

    return (
      domainTotal +
      Object.values(domainBlock).reduce((subTotal, value) => subTotal + (value ?? 0), 0)
    )
  }, 0)
}

function buildCaseDifficultyFactors(
  currentCase: CaseInstance,
  config: GameConfig
): ExplanationMetric[] {
  const stageMultiplier = 1 + Math.max(0, currentCase.stage - 1) * config.stageScalar
  const overdueWeeks = Math.max(
    0,
    Math.max(1, currentCase.deadlineWeeks) - currentCase.deadlineRemaining
  )

  return [
    {
      id: 'stage',
      label: 'Escalation stage',
      value: currentCase.stage,
      detail: `Stage multiplier is x${stageMultiplier.toFixed(2)} at stage ${currentCase.stage}.`,
      tone: currentCase.stage > 1 ? 'negative' : 'neutral',
    },
    {
      id: 'duration',
      label: 'Assignment length',
      value: currentCase.durationWeeks,
      detail: `${currentCase.durationWeeks} week duration feeds directly into attrition-mode demand.`,
      tone: currentCase.durationWeeks > 2 ? 'negative' : 'neutral',
    },
    {
      id: 'deadline',
      label: 'Deadline pressure',
      value: currentCase.deadlineRemaining,
      detail:
        overdueWeeks > 0
          ? `Deadline pressure is active after ${overdueWeeks} delayed week(s).`
          : `Deadline remains at ${currentCase.deadlineRemaining} week(s).`,
      tone: currentCase.deadlineRemaining <= 1 ? 'negative' : 'neutral',
    },
    {
      id: 'kind',
      label: 'Operation scale',
      value: currentCase.kind,
      detail:
        currentCase.kind === 'raid'
          ? 'Raid incidents expect multi-team coordination and higher aggregate score.'
          : 'Standard cases score as a single-team operation.',
      tone: currentCase.kind === 'raid' ? 'negative' : 'neutral',
    },
  ]
}

export function explainCaseDifficulty(
  currentCase: CaseInstance,
  config: GameConfig
): CaseDifficultyExplanation {
  const requiredProfile = computeRequiredResolutionProfile(currentCase, config)
  const weightProfile = legacyWeightsToResolutionProfile(currentCase.weights)
  const requiredScore = computeRequiredScore(currentCase, config)
  const axes = RESOLUTION_AXIS_ORDER.map((axis) => ({
    axis,
    label: AXIS_LABELS[axis],
    required: Number(requiredProfile[axis].toFixed(2)),
    weight: Number(weightProfile[axis].toFixed(2)),
    weightedRequired: Number((requiredProfile[axis] * weightProfile[axis]).toFixed(2)),
    detail: `${AXIS_LABELS[axis]} requires ${requiredProfile[axis].toFixed(2)} at weight ${weightProfile[axis].toFixed(2)}.`,
  }))

  return {
    caseId: currentCase.id,
    title: currentCase.title,
    mode: currentCase.mode,
    kind: currentCase.kind,
    stage: currentCase.stage,
    durationWeeks: currentCase.durationWeeks,
    deadlineRemaining: currentCase.deadlineRemaining,
    requiredScore: Number(requiredScore.toFixed(2)),
    factors: buildCaseDifficultyFactors(currentCase, config),
    axes,
    summary: `Required score ${requiredScore.toFixed(2)} is built from staged case demand across the weighted resolution axes.`,
  }
}

export function explainTeamEffectiveness(
  currentCase: CaseInstance,
  state: GameState,
  teamIds: Id[]
): TeamEffectivenessExplanation {
  const selection = buildExplanationSelection(currentCase, state, teamIds)
  const { evaluation } = selection

  if (!evaluation.teamScore || evaluation.requiredScore === null) {
    return {
      teamIds: selection.teamIds,
      deployableAgentIds: evaluation.deployableAgents.map((agent) => agent.id),
      requiredScore: null,
      finalScore: null,
      delta: evaluation.delta,
      odds: selection.odds,
      validationIssues: evaluation.validationResult.issues,
      layerBreakdown: null,
      comparison: null,
      performanceSummary: {
        contribution: 0,
        threatHandled: 0,
        damageTaken: 0,
        healingPerformed: 0,
        evidenceGathered: 0,
        containmentActionsCompleted: 0,
      },
      reasons: evaluation.outcome.reasons,
      summary: `Resolution is blocked: ${evaluation.validationResult.issues.map((issue) => issue.detail).join(' ')}`,
    }
  }

  return {
    teamIds: selection.teamIds,
    deployableAgentIds: evaluation.deployableAgents.map((agent) => agent.id),
    requiredScore: Number(evaluation.requiredScore.toFixed(2)),
    finalScore: Number(evaluation.teamScore.score.toFixed(2)),
    delta: Number(evaluation.delta.toFixed(2)),
    odds: selection.odds,
    validationIssues: evaluation.validationResult.issues,
    layerBreakdown: evaluation.teamScore.layerBreakdown,
    comparison: evaluation.teamScore.comparison,
    performanceSummary: evaluation.teamScore.performanceSummary,
    reasons: evaluation.outcome.reasons,
    summary: `Final score ${evaluation.teamScore.score.toFixed(2)} versus required ${evaluation.requiredScore.toFixed(2)} leaves a delta of ${formatSignedNumber(evaluation.delta, 2)}.`,
  }
}

export function explainChemistry(
  currentCase: CaseInstance,
  state: GameState,
  teamIds: Id[]
): ChemistryExplanation {
  const selection = buildExplanationSelection(currentCase, state, teamIds)
  const chemistry: TeamChemistryProfile = selection.profile.chemistryProfile
  const relationships = chemistry.relationships.map((relationship) => ({
    agentAId: relationship.agentAId,
    agentBId: relationship.agentBId,
    value: Number(relationship.value.toFixed(2)),
    modifiers: [...relationship.modifiers],
    detail: `${relationship.agentAId} / ${relationship.agentBId}: ${sumRelationshipModifierText(relationship)}`,
    tone: toExplanationTone(relationship.value),
  }))

  return {
    teamIds: selection.teamIds,
    raw: Number(chemistry.raw.toFixed(2)),
    bonus: Number(chemistry.bonus.toFixed(2)),
    pairs: chemistry.pairs,
    average: Number(chemistry.average.toFixed(2)),
    relationships,
    summary:
      chemistry.pairs === 0
        ? 'No chemistry is applied because the selection has fewer than two active operatives.'
        : `Chemistry bonus ${formatSignedNumber(chemistry.bonus, 2)} comes from ${chemistry.pairs} pairings with an average relationship value of ${chemistry.average.toFixed(2)}.`,
  }
}

function buildGearItemExplanation(item: EquipmentItem): GearItemExplanation {
  const baseModifierTotal = sumEquipmentModifierTotal(item, 'base')
  const contextModifierTotal = sumEquipmentModifierTotal(item, 'active')
  const totalModifierTotal = sumEquipmentModifierTotal(item, 'total')

  return {
    itemId: item.id,
    name: item.name,
    slot: EQUIPMENT_SLOT_LABELS[item.slot],
    quality: item.quality,
    contextActive: item.contextActive,
    baseModifierTotal: Number(baseModifierTotal.toFixed(2)),
    contextModifierTotal: Number(contextModifierTotal.toFixed(2)),
    totalModifierTotal: Number(totalModifierTotal.toFixed(2)),
    tags: [...item.tags],
    detail: `${item.name} contributes ${totalModifierTotal.toFixed(2)} additive stat points${item.contextActive ? `, including ${contextModifierTotal.toFixed(2)} from live case context` : ''}.`,
  }
}

export function explainGearImpact(
  currentCase: CaseInstance,
  state: GameState,
  teamIds: Id[]
): GearImpactExplanation {
  const selection = buildExplanationSelection(currentCase, state, teamIds)
  const equipmentSummary: CaseEquipmentSummary = selection.evaluation.teamScore
    ?.equipmentSummary ?? {
    ...createDefaultCaseEquipmentSummary(),
    ...selection.profile.equipmentSummary,
    loadout: { ...selection.profile.equipmentSummary },
    reserveSupportBonus: 0,
    reserveReasons: [],
  }

  return {
    teamIds: selection.teamIds,
    equippedItemCount: equipmentSummary.loadout.equippedItemCount,
    activeContextItemCount: equipmentSummary.loadout.activeContextItemCount,
    loadoutQuality: equipmentSummary.loadout.loadoutQuality,
    reserveSupportBonus: Number(equipmentSummary.reserveSupportBonus.toFixed(2)),
    reserveReasons: [...equipmentSummary.reserveReasons],
    items: selection.profile.equipmentSummary.equippedItems.map(buildGearItemExplanation),
    summary: `${equipmentSummary.loadout.equippedItemCount} equipped item(s), ${equipmentSummary.loadout.activeContextItemCount} context-active, reserve gear bonus ${formatSignedNumber(equipmentSummary.reserveSupportBonus, 2)}.`,
  }
}

export function explainPowerLayerImpact(
  currentCase: CaseInstance,
  state: GameState,
  teamIds: Id[]
): PowerLayerExplanation {
  const selection = buildExplanationSelection(currentCase, state, teamIds)
  const powerSummary =
    selection.evaluation.teamScore?.powerSummary ?? selection.profile.powerSummary
  const aggregateModifiers = formatPowerAggregateEntries(powerSummary)

  return {
    teamIds: selection.teamIds,
    inventory: powerSummary.inventory.map((entry) => ({
      ...entry,
      detail: `${entry.name}: ${entry.equippedCount} equipped, ${entry.activeContextCount} context-active, ${entry.stockOnHand} in inventory reserve.`,
    })),
    kits: powerSummary.kits.map((kit) => ({
      id: kit.id,
      label: kit.label,
      contributorCount: kit.contributorCount,
      contributorIds: [...kit.contributorIds],
      matchedItemIds: [...kit.matchedItemIds],
      matchedTags: [...kit.matchedTags],
      activeThresholds: [...kit.activeThresholds],
      highestActiveThreshold: kit.highestActiveThreshold,
      effectivenessMultiplier: kit.effectivenessMultiplier,
      stressImpactMultiplier: kit.stressImpactMultiplier,
      moraleRecoveryDelta: kit.moraleRecoveryDelta,
      statModifiers: formatPowerModifierEntries(kit.statModifiers),
      detail: `${kit.label} is active at ${kit.highestActiveThreshold}-piece across ${kit.contributorCount} operative(s) from ${kit.matchedItemIds.join(', ')}.`,
    })),
    protocols: powerSummary.protocols.map((protocol) => ({
      id: protocol.id,
      label: protocol.label,
      tier: protocol.tier,
      contributorCount: protocol.contributorCount,
      contributorIds: [...protocol.contributorIds],
      unlockReasons: [...protocol.unlockReasons],
      effectivenessMultiplier: protocol.effectivenessMultiplier,
      stressImpactMultiplier: protocol.stressImpactMultiplier,
      moraleRecoveryDelta: protocol.moraleRecoveryDelta,
      statModifiers: formatPowerModifierEntries(protocol.statModifiers),
      detail: `${protocol.label} (${protocol.tier}) is active across ${protocol.contributorCount} operative(s).`,
    })),
    aggregateModifiers,
    effectivenessMultiplier: powerSummary.effectivenessMultiplier,
    stressImpactMultiplier: powerSummary.stressImpactMultiplier,
    moraleRecoveryDelta: powerSummary.moraleRecoveryDelta,
    summary: `${powerSummary.inventory.length} active inventory line(s), ${powerSummary.kits.length} kit bonus(es), and ${powerSummary.protocols.length} protocol bonus(es) produce ${aggregateModifiers.length > 0 ? aggregateModifiers.join(', ') : 'no extra stat modifiers'}.`,
  }
}

export function explainRewardCalculation(
  currentCase: CaseInstance,
  outcome: MissionResolutionKind,
  config: GameConfig,
  game?: Pick<
    GameState,
    | 'agency'
    | 'containmentRating'
    | 'clearanceLevel'
    | 'funding'
    | 'cases'
    | 'reports'
    | 'market'
    | 'events'
  >
): RewardCalculationExplanation {
  const rewardBreakdown = buildMissionRewardBreakdown(currentCase, outcome, config, game)
  const factors = rewardBreakdown.factors.map((factor: MissionRewardFactor) => ({
    id: factor.id,
    label: factor.label,
    value: factor.value,
    detail: factor.detail,
    tone: toExplanationTone(factor.value),
  }))

  return {
    caseId: currentCase.id,
    outcome,
    operationValue: rewardBreakdown.operationValue,
    deltas: {
      funding: rewardBreakdown.fundingDelta,
      containment: rewardBreakdown.containmentDelta,
      reputation: rewardBreakdown.reputationDelta,
      strategicValue: rewardBreakdown.strategicValueDelta,
    },
    factors,
    inventoryRewards: [...rewardBreakdown.inventoryRewards],
    factionStanding: [...rewardBreakdown.factionStanding],
    reasons: [...rewardBreakdown.reasons],
    summary: `Reward profile ${rewardBreakdown.label}: funding ${formatSignedInteger(rewardBreakdown.fundingDelta)}, reputation ${formatSignedInteger(rewardBreakdown.reputationDelta)}, containment ${formatSignedInteger(rewardBreakdown.containmentDelta)}.`,
  }
}

export function buildOperationExplanationBundle(
  currentCase: CaseInstance,
  state: GameState,
  teamIds: Id[],
  rewardOutcome: MissionResolutionKind = 'success'
): OperationExplanationBundle {
  return {
    caseDifficulty: explainCaseDifficulty(currentCase, state.config),
    teamEffectiveness: explainTeamEffectiveness(currentCase, state, teamIds),
    chemistry: explainChemistry(currentCase, state, teamIds),
    gearImpact: explainGearImpact(currentCase, state, teamIds),
    powerLayer: explainPowerLayerImpact(currentCase, state, teamIds),
    rewardCalculation: explainRewardCalculation(currentCase, rewardOutcome, state.config, state),
  }
}
