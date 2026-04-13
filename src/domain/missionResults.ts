// cspell:words cryptid medkits
import { inventoryItemLabels } from '../data/production'
import { getEquipmentDefinition } from './equipment'
import { getAgencyProgressionUnlockLabel } from './agencyProgression'
import {
  getContractFundingDelta,
  getContractInventoryRewardGrants,
  getContractResearchRewards,
} from './contracts'
import {
  applyFactionMissionOutcome,
  buildFactionMissionContext,
  buildFactionOutcomeGrants,
  buildFactionRewardInfluence,
  diffFactionRecruitUnlocks,
  FACTION_DEFINITIONS,
  getFactionDefinition,
  getFactionRecruitUnlocks,
} from './factions'
import { getAppliedMajorIncidentRewardPreview } from './majorIncidentOperations'
import type {
  CaseInstance,
  GameConfig,
  GameState,
  MissionFatigueChange,
  MissionFatalityRecord,
  MissionInjuryRecord,
  MissionPenaltyBreakdown,
  MissionResolutionKind,
  MissionResult,
  MissionRewardBreakdown,
  MissionRewardFactor,
  MissionRewardFactionStanding,
  MissionRewardInventoryGrant,
  MissionSpawnedConsequence,
  MissionTeamUsage,
  PerformanceMetricSummary,
  PowerImpactSummary,
} from './models'
import { FUNDING_CALIBRATION } from './sim/calibration'
import { computeRequiredScore } from './sim/scoring'

interface RewardCaseProfile {
  id: string
  label: string
  fundingBias: number
  reputationBias: number
  containmentBias: number
  primaryMaterial: string
  secondaryMaterial?: string
  equipmentReward?: string
}

interface OperationValueBreakdown {
  operationValue: number
  factors: MissionRewardFactor[]
  requiredScore: number
  stageBonusValue: number
}

interface FactionRewardValueBreakdown {
  rewardModifier: number
  modifierValue: number
  factor?: MissionRewardFactor
}

export interface MissionResultInput {
  caseId: string
  caseTitle: string
  teamsUsed: MissionTeamUsage[]
  outcome: MissionResolutionKind
  rewards: MissionRewardBreakdown
  performanceSummary?: PerformanceMetricSummary
  powerImpact?: PowerImpactSummary
  fatigueChanges?: MissionFatigueChange[]
  injuries?: MissionInjuryRecord[]
  fatalities?: MissionFatalityRecord[]
  spawnedConsequences?: MissionSpawnedConsequence[]
  resolutionReasons?: string[]
  explanationNotes?: string[]
  weakestLink?: MissionResult['weakestLink']
}

const PARTIAL_FUNDING_RATE = 0.48
const PARTIAL_CONTAINMENT_RATE = 0.42
const PARTIAL_REPUTATION_RATE = 0.4
const PARTIAL_STRATEGIC_RATE = 0.45
const FAIL_STRATEGIC_RATE = -0.55
const UNRESOLVED_STRATEGIC_RATE = -0.75
const RAID_VALUE_MULTIPLIER = 1.2
const STAGE_VALUE_STEP = 0.14
const DURATION_VALUE_STEP = 2
const DEADLINE_PRESSURE_VALUE_STEP = 1.5

const REWARD_CASE_PROFILES: readonly RewardCaseProfile[] = [
  {
    id: 'occult',
    label: 'Occult event',
    fundingBias: 3,
    reputationBias: 2,
    containmentBias: 1,
    primaryMaterial: 'occult_reagents',
    secondaryMaterial: 'warding_resin',
    equipmentReward: 'warding_kits',
  },
  {
    id: 'containment_breach',
    label: 'Containment breach',
    fundingBias: 2,
    reputationBias: 1,
    containmentBias: 2,
    primaryMaterial: 'warding_resin',
    secondaryMaterial: 'electronic_parts',
    equipmentReward: 'ward_seals',
  },
  {
    id: 'predator_hunt',
    label: 'Predatory anomaly',
    fundingBias: 2,
    reputationBias: 1,
    containmentBias: 0,
    primaryMaterial: 'ballistic_supplies',
    secondaryMaterial: 'medical_supplies',
    equipmentReward: 'silver_rounds',
  },
  {
    id: 'investigation',
    label: 'Investigation-heavy incident',
    fundingBias: 1,
    reputationBias: 2,
    containmentBias: 0,
    primaryMaterial: 'electronic_parts',
    secondaryMaterial: 'medical_supplies',
    equipmentReward: 'emf_sensors',
  },
  {
    id: 'technical',
    label: 'Technical anomaly',
    fundingBias: 2,
    reputationBias: 1,
    containmentBias: 0,
    primaryMaterial: 'electronic_parts',
    secondaryMaterial: 'ballistic_supplies',
    equipmentReward: 'signal_jammers',
  },
  {
    id: 'medical_support',
    label: 'Stabilization incident',
    fundingBias: 1,
    reputationBias: 1,
    containmentBias: 0,
    primaryMaterial: 'medical_supplies',
    secondaryMaterial: 'occult_reagents',
    equipmentReward: 'medkits',
  },
  {
    id: 'general',
    label: 'General incident',
    fundingBias: 0,
    reputationBias: 1,
    containmentBias: 0,
    primaryMaterial: 'electronic_parts',
    secondaryMaterial: 'medical_supplies',
    equipmentReward: 'ritual_components',
  },
] as const

const EMPTY_PERFORMANCE_METRIC_SUMMARY: PerformanceMetricSummary = {
  contribution: 0,
  threatHandled: 0,
  damageTaken: 0,
  healingPerformed: 0,
  evidenceGathered: 0,
  containmentActionsCompleted: 0,
}

function appendUniqueNote(notes: string[], note: string) {
  if (note.length === 0 || notes.includes(note)) {
    return
  }

  notes.push(note)
}

function collectCaseTags(currentCase: CaseInstance) {
  return [
    ...new Set([...currentCase.tags, ...currentCase.requiredTags, ...currentCase.preferredTags]),
  ]
}

function hasAnyTag(tags: readonly string[], candidates: readonly string[]) {
  return candidates.some((candidate) => tags.includes(candidate))
}

function classifyRewardCaseProfile(currentCase: CaseInstance) {
  const tags = collectCaseTags(currentCase)

  if (
    hasAnyTag(tags, [
      'occult',
      'ritual',
      'spirit',
      'haunt',
      'curse',
      'cult',
      'possession',
      'reliquary',
    ])
  ) {
    return REWARD_CASE_PROFILES.find((profile) => profile.id === 'occult')!
  }

  if (
    hasAnyTag(tags, [
      'breach',
      'containment',
      'perimeter',
      'hazmat',
      'chemical',
      'biological',
      'seal',
    ])
  ) {
    return REWARD_CASE_PROFILES.find((profile) => profile.id === 'containment_breach')!
  }

  if (hasAnyTag(tags, ['vampire', 'beast', 'cryptid', 'predator', 'feral', 'hunt'])) {
    return REWARD_CASE_PROFILES.find((profile) => profile.id === 'predator_hunt')!
  }

  if (hasAnyTag(tags, ['witness', 'archive', 'evidence', 'analysis', 'research', 'surveillance'])) {
    return REWARD_CASE_PROFILES.find((profile) => profile.id === 'investigation')!
  }

  if (hasAnyTag(tags, ['signal', 'relay', 'cyber', 'classified', 'information', 'tech'])) {
    return REWARD_CASE_PROFILES.find((profile) => profile.id === 'technical')!
  }

  if (hasAnyTag(tags, ['medical', 'triage', 'stabilization', 'hospital'])) {
    return REWARD_CASE_PROFILES.find((profile) => profile.id === 'medical_support')!
  }

  return REWARD_CASE_PROFILES.find((profile) => profile.id === 'general')!
}

function getOutcomeLabel(outcome: MissionResolutionKind) {
  switch (outcome) {
    case 'success':
      return 'Decisive success'
    case 'partial':
      return 'Partial containment'
    case 'fail':
      return 'Operational failure'
    default:
      return 'Unresolved escalation'
  }
}

function buildOperationValueBreakdown(
  currentCase: CaseInstance,
  config: GameConfig
): OperationValueBreakdown {
  const requiredScore = computeRequiredScore(currentCase, config)
  const raidBonusValue =
    currentCase.kind === 'raid' ? Math.round(requiredScore * (RAID_VALUE_MULTIPLIER - 1)) : 0
  const stageBonusValue = Math.round(
    requiredScore * Math.max(0, currentCase.stage - 1) * STAGE_VALUE_STEP
  )
  const durationValue = currentCase.durationWeeks * DURATION_VALUE_STEP
  const deadlinePressureValue = Math.round(
    Math.max(0, Math.max(1, currentCase.deadlineWeeks) - currentCase.deadlineRemaining) *
      DEADLINE_PRESSURE_VALUE_STEP
  )

  const factors: MissionRewardFactor[] = [
    {
      id: 'required-score',
      label: 'Required score',
      value: requiredScore,
      detail: 'Derived from the case difficulty profile and domain weighting.',
    },
    {
      id: 'stage-pressure',
      label: 'Escalation pressure',
      value: stageBonusValue,
      detail: `Stage ${currentCase.stage} adds ${stageBonusValue} operation value.`,
    },
    {
      id: 'raid-pressure',
      label: 'Raid pressure',
      value: raidBonusValue,
      detail:
        currentCase.kind === 'raid'
          ? `Raid coordination stakes add ${raidBonusValue} operation value.`
          : 'Single-team operation adds no raid premium.',
    },
    {
      id: 'duration-weight',
      label: 'Duration weight',
      value: durationValue,
      detail: `${currentCase.durationWeeks} week assignment adds ${durationValue} operation value.`,
    },
    {
      id: 'deadline-pressure',
      label: 'Deadline pressure',
      value: deadlinePressureValue,
      detail: `Escalation urgency adds ${deadlinePressureValue} operation value.`,
    },
  ]

  return {
    requiredScore,
    stageBonusValue,
    factors,
    operationValue:
      requiredScore + stageBonusValue + raidBonusValue + durationValue + deadlinePressureValue,
  }
}

function clampRewardQuantity(value: number, max: number) {
  return Math.max(0, Math.min(max, Math.round(value)))
}

function buildInventoryGrant(
  kind: MissionRewardInventoryGrant['kind'],
  itemId: string,
  quantity: number
): MissionRewardInventoryGrant | null {
  if (quantity <= 0) {
    return null
  }

  const equipmentDefinition = getEquipmentDefinition(itemId)

  return {
    kind,
    itemId,
    label: inventoryItemLabels[itemId] ?? equipmentDefinition?.name ?? itemId,
    quantity,
    tags: equipmentDefinition?.tags ?? [itemId],
  }
}

function buildInventoryRewards(
  currentCase: CaseInstance,
  outcome: MissionResolutionKind,
  operationValue: number,
  profile: RewardCaseProfile
) {
  if (outcome === 'fail' || outcome === 'unresolved') {
    return []
  }

  const primaryQuantity =
    outcome === 'success'
      ? clampRewardQuantity(1 + operationValue / 32 + Math.max(0, currentCase.stage - 1) * 0.35, 4)
      : clampRewardQuantity(operationValue / 64 + Math.max(0, currentCase.stage - 1) * 0.2, 2)

  const secondaryQuantity =
    outcome === 'success' && profile.secondaryMaterial
      ? clampRewardQuantity(primaryQuantity - 1, 2)
      : 0

  const equipmentQuantity =
    outcome === 'success' &&
    profile.equipmentReward &&
    (currentCase.stage >= 2 || currentCase.kind === 'raid' || operationValue >= 55)
      ? 1
      : 0

  return [
    buildInventoryGrant('material', profile.primaryMaterial, primaryQuantity),
    profile.secondaryMaterial
      ? buildInventoryGrant('material', profile.secondaryMaterial, secondaryQuantity)
      : null,
    profile.equipmentReward
      ? buildInventoryGrant('equipment', profile.equipmentReward, equipmentQuantity)
      : null,
  ].filter((grant): grant is MissionRewardInventoryGrant => Boolean(grant))
}

function buildFactionStandingRewards(
  currentCase: CaseInstance,
  outcome: MissionResolutionKind,
  operationValue: number,
  game?: Pick<
    GameState,
    | 'agency'
    | 'containmentRating'
    | 'clearanceLevel'
    | 'funding'
    | 'cases'
    | 'factions'
    | 'reports'
    | 'market'
    | 'events'
  >
) {
  const tags = collectCaseTags(currentCase)
  const baseMagnitude =
    outcome === 'success'
      ? 1 + Math.max(0, currentCase.stage - 1) + Math.round(operationValue / 60)
      : outcome === 'partial'
        ? 1 + Math.round(operationValue / 120)
        : outcome === 'fail'
          ? -(1 + Math.max(0, currentCase.stage - 1) + Math.round(operationValue / 80))
          : -(2 + Math.max(0, currentCase.stage - 1) + Math.round(operationValue / 65))

  const matchingFactions = FACTION_DEFINITIONS.map((faction) => ({
    faction,
    overlapTags: faction.tags.filter((tag) => tags.includes(tag)),
  }))
    .filter((entry) => entry.overlapTags.length > 0)
    .sort(
      (left, right) =>
        right.overlapTags.length - left.overlapTags.length ||
        left.faction.label.localeCompare(right.faction.label)
    )

  const missionContext = game ? buildFactionMissionContext(currentCase, game) : undefined
  const targets: Array<{
    faction: { id: string; label: string }
    overlapTags: string[]
    contactId?: string
    contactName?: string
  }> =
    game
      ? buildFactionRewardInfluence(currentCase, game).matches.map((match) => {
          const contextMatch = missionContext?.matches.find(
            (entry) => entry.factionId === match.factionId
          )
          return {
            faction: {
              id: match.factionId,
              label: getFactionDefinition(match.factionId)?.label ?? match.label,
            },
            overlapTags: match.overlapTags,
            contactId: contextMatch?.contactId,
            contactName: contextMatch?.contactName,
          }
        })
      : matchingFactions.length > 0
      ? matchingFactions.slice(0, currentCase.kind === 'raid' ? 2 : 1)
      : [
          {
            faction: {
              id: 'oversight',
              label: FACTION_DEFINITIONS.find((faction) => faction.id === 'oversight')!.label,
            },
            overlapTags: ['oversight'],
          },
        ]

  return targets
    .map(({ faction, overlapTags, contactId, contactName }, index) => {
      const distributedDelta =
        index === 0
          ? baseMagnitude
          : Math.sign(baseMagnitude) * Math.max(1, Math.round(Math.abs(baseMagnitude) * 0.5))
      const contactDelta =
        outcome === 'success'
          ? 8
          : outcome === 'partial'
            ? 3
            : outcome === 'fail'
              ? -6
              : -10

      return {
        factionId: faction.id,
        label: faction.label,
        delta: distributedDelta,
        overlapTags,
        ...(contactId ? { contactId, contactName, contactDelta } : {}),
      } satisfies MissionRewardFactionStanding
    })
    .filter((entry) => entry.delta !== 0)
}

function buildFactionRewardValue(
  currentCase: CaseInstance,
  operationValue: number,
  game?: Pick<
    GameState,
    | 'agency'
    | 'containmentRating'
    | 'clearanceLevel'
    | 'funding'
    | 'cases'
    | 'factions'
    | 'reports'
    | 'market'
    | 'events'
  >
): FactionRewardValueBreakdown {
  if (!game) {
    return {
      rewardModifier: 0,
      modifierValue: 0,
    }
  }

  const influence = buildFactionRewardInfluence(currentCase, game)

  if (influence.matches.length === 0 || influence.rewardModifier === 0) {
    return {
      rewardModifier: influence.rewardModifier,
      modifierValue: 0,
    }
  }

  const modifierValue = Math.round(operationValue * influence.rewardModifier)
  const matchSummary = influence.matches
    .map(
      (match) =>
        `${match.label} (${match.rewardModifier >= 0 ? '+' : ''}${match.rewardModifier.toFixed(2)})`
    )
    .join(', ')

  return {
    rewardModifier: influence.rewardModifier,
    modifierValue,
    factor: {
      id: 'faction-influence',
      label: 'Faction influence',
      value: modifierValue,
      detail: `Standing modifiers applied from ${matchSummary}.`,
    },
  }
}

function getFundingDelta(
  currentCase: CaseInstance,
  outcome: MissionResolutionKind,
  config: GameConfig,
  operationValue: number,
  profile: RewardCaseProfile,
  factionModifierValue = 0
) {
  const difficultyBonus = Math.round(operationValue * 0.085)
  const stageBonus = Math.max(0, currentCase.stage - 1) * 2
  const factionFundingDelta = Math.round(factionModifierValue * 0.12)

  if (outcome === 'success') {
    return (
      config.fundingPerResolution +
      difficultyBonus +
      stageBonus +
      profile.fundingBias +
      factionFundingDelta
    )
  }

  if (outcome === 'partial') {
    return Math.max(
      0,
      Math.round(
        (config.fundingPerResolution + difficultyBonus + stageBonus + profile.fundingBias) *
          PARTIAL_FUNDING_RATE
      ) + factionFundingDelta
    )
  }

  if (outcome === 'fail') {
    return (
      -(
        config.fundingPenaltyPerFail +
        Math.round(operationValue * FUNDING_CALIBRATION.failOperationPenaltyRate) +
        stageBonus +
        Math.max(0, profile.fundingBias)
      ) + factionFundingDelta
    )
  }

  return (
      -(
        config.fundingPenaltyPerUnresolved +
        Math.round(operationValue * FUNDING_CALIBRATION.unresolvedOperationPenaltyRate) +
        stageBonus +
        Math.max(0, profile.fundingBias)
      ) + factionFundingDelta
  )
}

function getContainmentDelta(
  currentCase: CaseInstance,
  outcome: MissionResolutionKind,
  config: GameConfig,
  operationValue: number,
  profile: RewardCaseProfile
) {
  const stageBonus = Math.max(0, currentCase.stage - 1)
  const difficultyBonus = Math.round(operationValue / 90)

  if (outcome === 'success') {
    return (
      config.containmentDeltaPerResolution + stageBonus + difficultyBonus + profile.containmentBias
    )
  }

  if (outcome === 'partial') {
    return Math.max(
      0,
      Math.round(
        (config.containmentDeltaPerResolution +
          stageBonus +
          difficultyBonus +
          profile.containmentBias) *
          PARTIAL_CONTAINMENT_RATE
      )
    )
  }

  if (outcome === 'fail') {
    return config.containmentDeltaPerFail - stageBonus - Math.max(0, profile.containmentBias)
  }

  return (
    config.containmentDeltaPerUnresolved -
    stageBonus -
    Math.max(0, profile.containmentBias) -
    (currentCase.kind === 'raid' ? 1 : 0)
  )
}

function getReputationDelta(
  currentCase: CaseInstance,
  outcome: MissionResolutionKind,
  operationValue: number,
  profile: RewardCaseProfile,
  factionModifierValue = 0
) {
  const baseReputation =
    2 +
    Math.max(0, currentCase.stage - 1) +
    Math.round(operationValue * 0.065) +
    profile.reputationBias
  const factionReputationDelta = Math.round(factionModifierValue * 0.1)

  if (outcome === 'success') {
    return baseReputation + factionReputationDelta
  }

  if (outcome === 'partial') {
    return Math.max(
      1,
      Math.round(baseReputation * PARTIAL_REPUTATION_RATE) + factionReputationDelta
    )
  }

  if (outcome === 'fail') {
    return -Math.max(2, Math.round(baseReputation * 0.6)) + factionReputationDelta
  }

  return -Math.max(3, Math.round(baseReputation * 0.85)) + factionReputationDelta
}

function getStrategicValueDelta(
  operationValue: number,
  outcome: MissionResolutionKind,
  factionModifierValue = 0
) {
  if (outcome === 'success') {
    return operationValue + factionModifierValue
  }

  if (outcome === 'partial') {
    return Math.round(operationValue * PARTIAL_STRATEGIC_RATE) + factionModifierValue
  }

  if (outcome === 'fail') {
    return Math.round(operationValue * FAIL_STRATEGIC_RATE) + factionModifierValue
  }

  return Math.round(operationValue * UNRESOLVED_STRATEGIC_RATE) + factionModifierValue
}

function buildRewardReasons(
  breakdown: Pick<
    MissionRewardBreakdown,
    | 'operationValue'
    | 'caseTypeLabel'
    | 'fundingDelta'
    | 'reputationDelta'
  | 'inventoryRewards'
  | 'researchUnlocks'
  | 'progressionUnlocks'
  | 'factionStanding'
  | 'factionGrants'
  | 'factionUnlocks'
  | 'containmentDelta'
    | 'factors'
  >
) {
  const inventorySummary =
    breakdown.inventoryRewards.length > 0
      ? `Inventory rewards: ${breakdown.inventoryRewards
          .map(
            (reward: { label: string; quantity: number }) => `${reward.label} x${reward.quantity}`
          )
          .join(', ')}.`
      : 'No inventory rewards generated for this outcome.'
  const researchSummary =
    (breakdown.researchUnlocks?.length ?? 0) > 0
      ? `Research unlocked: ${breakdown.researchUnlocks!.map((entry) => entry.label).join(', ')}.`
      : 'No research unlocks generated for this outcome.'
  const progressionSummary =
    (breakdown.progressionUnlocks?.length ?? 0) > 0
      ? `Progression unlocks: ${breakdown.progressionUnlocks!
          .map((unlockId) => getAgencyProgressionUnlockLabel(unlockId))
          .join(', ')}.`
      : 'No progression unlocks generated for this outcome.'
  const factionSummary =
    breakdown.factionStanding.length > 0
      ? `Faction standing: ${breakdown.factionStanding
          .map(
            (entry: { label: string; delta: number }) =>
              `${entry.label} ${entry.delta > 0 ? '+' : ''}${entry.delta}`
          )
          .join(', ')}.`
      : 'No faction standing change.'
  const factionGrantSummary =
    (breakdown.factionGrants?.length ?? 0) > 0
      ? `Faction grants: ${breakdown.factionGrants!
          .map((entry: NonNullable<MissionRewardBreakdown['factionGrants']>[number]) =>
            entry.kind === 'funding'
              ? `${entry.label} +$${entry.amount ?? 0}`
              : entry.kind === 'inventory'
                ? `${entry.label} ${entry.itemId ?? 'gear'} x${entry.quantity ?? 0}`
                : `${entry.label} favor`
          )
          .join(', ')}.`
      : 'No faction grants unlocked.'
  const factionUnlockSummary =
    (breakdown.factionUnlocks?.length ?? 0) > 0
      ? `New recruit channels: ${breakdown.factionUnlocks!
          .map((entry) => `${entry.label}${entry.disposition === 'adversarial' ? ' (adversarial)' : ''}`)
          .join(', ')}.`
      : 'No recruit channels opened from this result.'
  const factionInfluence = breakdown.factors.find(
    (factor: { id: string }) => factor.id === 'faction-influence'
  )

  return [
    `Operation value ${breakdown.operationValue} came from difficulty, escalation pressure, duration, and deadline pressure.`,
    `${breakdown.caseTypeLabel} routing applies the deterministic reward table for this incident family.`,
    factionInfluence
      ? factionInfluence.detail
      : 'No faction influence modifier applied to this payout.',
    `Funding ${breakdown.fundingDelta > 0 ? '+' : ''}${breakdown.fundingDelta}, containment ${breakdown.containmentDelta > 0 ? '+' : ''}${breakdown.containmentDelta}, reputation ${breakdown.reputationDelta > 0 ? '+' : ''}${breakdown.reputationDelta}.`,
    inventorySummary,
    researchSummary,
    progressionSummary,
    factionSummary,
    factionGrantSummary,
    factionUnlockSummary,
  ]
}

export function buildMissionPenaltyBreakdown(
  rewardBreakdown: Pick<
    MissionRewardBreakdown,
    'fundingDelta' | 'containmentDelta' | 'reputationDelta' | 'strategicValueDelta'
  >
): MissionPenaltyBreakdown {
  return {
    fundingLoss: Math.max(0, -rewardBreakdown.fundingDelta),
    containmentLoss: Math.max(0, -rewardBreakdown.containmentDelta),
    reputationLoss: Math.max(0, -rewardBreakdown.reputationDelta),
    strategicLoss: Math.max(0, -rewardBreakdown.strategicValueDelta),
  }
}

function buildFatigueChangeNotes(fatigueChanges: readonly MissionFatigueChange[]) {
  return fatigueChanges
    .filter((change) => change.delta !== 0)
    .map((change) => {
      const label = change.teamName ?? change.teamId
      const deltaLabel = change.delta > 0 ? `+${change.delta}` : `${change.delta}`
      return `${label} fatigue ${deltaLabel} (${change.before} -> ${change.after}).`
    })
}

function buildInjuryNotes(injuries: readonly MissionInjuryRecord[]) {
  return injuries.map((injury) => {
    const damageLabel = injury.damage > 0 ? `, ${injury.damage} damage` : ''
    return `${injury.agentName} sustained a ${injury.severity} injury${damageLabel}.`
  })
}

function buildFatalityNotes(fatalities: readonly MissionFatalityRecord[]) {
  return fatalities.map((fatality) => {
    const damageLabel = fatality.damage > 0 ? ` after ${fatality.damage} damage` : ''
    return `${fatality.agentName} was killed during the operation${damageLabel}.`
  })
}

function buildConsequenceNotes(consequences: readonly MissionSpawnedConsequence[]) {
  return consequences.map((consequence) => consequence.detail)
}

function buildPowerImpactNotes(powerImpact: PowerImpactSummary | undefined) {
  return powerImpact?.notes ?? []
}

function buildProjectedRecruitUnlocks(
  factionStanding: MissionRewardBreakdown['factionStanding'],
  outcome: MissionResolutionKind,
  game?: Pick<GameState, 'factions'>
) {
  if (!game) {
    return []
  }

  const beforeUnlocks = getFactionRecruitUnlocks({ factions: game.factions ?? {} })
  let projectedFactions = game.factions ?? {}

  for (const standing of factionStanding) {
    projectedFactions = applyFactionMissionOutcome(
      projectedFactions,
      {
        factionId: standing.factionId,
        delta: standing.delta,
        contactId: standing.contactId,
        contactDelta: standing.contactDelta,
      },
      outcome
    )
  }

  return diffFactionRecruitUnlocks(
    beforeUnlocks,
    getFactionRecruitUnlocks({ factions: projectedFactions })
  )
}

export function buildMissionResult(input: MissionResultInput): MissionResult {
  const performanceSummary = input.performanceSummary ?? EMPTY_PERFORMANCE_METRIC_SUMMARY
  const powerImpact = input.powerImpact
  const fatigueChanges = input.fatigueChanges ?? []
  const injuries = input.injuries ?? []
  const fatalities = input.fatalities ?? []
  const spawnedConsequences = input.spawnedConsequences ?? []
  const explanationNotes: string[] = []

  for (const reason of input.resolutionReasons ?? []) {
    appendUniqueNote(explanationNotes, reason)
  }

  for (const reason of input.rewards.reasons) {
    appendUniqueNote(explanationNotes, reason)
  }

  for (const note of input.explanationNotes ?? []) {
    appendUniqueNote(explanationNotes, note)
  }

  for (const note of buildPowerImpactNotes(powerImpact)) {
    appendUniqueNote(explanationNotes, note)
  }

  for (const note of buildFatigueChangeNotes(fatigueChanges)) {
    appendUniqueNote(explanationNotes, note)
  }

  for (const note of buildInjuryNotes(injuries)) {
    appendUniqueNote(explanationNotes, note)
  }

  for (const note of buildFatalityNotes(fatalities)) {
    appendUniqueNote(explanationNotes, note)
  }

  for (const note of buildConsequenceNotes(spawnedConsequences)) {
    appendUniqueNote(explanationNotes, note)
  }

  return {
    caseId: input.caseId,
    caseTitle: input.caseTitle,
    teamsUsed: [...input.teamsUsed],
    outcome: input.outcome,
    performanceSummary: { ...performanceSummary },
    ...(powerImpact
      ? {
          powerImpact: {
            ...powerImpact,
            activeEquipmentIds: [...powerImpact.activeEquipmentIds],
            activeKitIds: [...powerImpact.activeKitIds],
            activeProtocolIds: [...powerImpact.activeProtocolIds],
            notes: [...powerImpact.notes],
          },
        }
      : {}),
    rewards: {
      ...input.rewards,
      factors: [...input.rewards.factors],
      inventoryRewards: [...input.rewards.inventoryRewards],
      ...(input.rewards.researchUnlocks
        ? { researchUnlocks: [...input.rewards.researchUnlocks] }
        : {}),
      ...(input.rewards.progressionUnlocks
        ? { progressionUnlocks: [...input.rewards.progressionUnlocks] }
        : {}),
      factionStanding: [...input.rewards.factionStanding],
      ...(input.rewards.factionGrants ? { factionGrants: [...input.rewards.factionGrants] } : {}),
      ...(input.rewards.factionUnlocks ? { factionUnlocks: [...input.rewards.factionUnlocks] } : {}),
      reasons: [...input.rewards.reasons],
    },
    penalties: buildMissionPenaltyBreakdown(input.rewards),
    fatigueChanges: fatigueChanges.map((change) => ({ ...change })),
    injuries: injuries.map((injury) => ({ ...injury })),
    ...(fatalities.length > 0 ? { fatalities: fatalities.map((fatality) => ({ ...fatality })) } : {}),
    spawnedConsequences: spawnedConsequences.map((consequence) => ({ ...consequence })),
    explanationNotes,
    ...(input.weakestLink ? { weakestLink: { ...input.weakestLink } } : {}),
  }
}

export function buildMissionRewardBreakdown(
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
    | 'factions'
    | 'reports'
    | 'market'
    | 'events'
  >
): MissionRewardBreakdown {
  const operationValue = buildOperationValueBreakdown(currentCase, config)
  const profile = classifyRewardCaseProfile(currentCase)
  const factionRewardValue = buildFactionRewardValue(
    currentCase,
    operationValue.operationValue,
    game
  )
  const factionOutcomeGrants = game
    ? buildFactionOutcomeGrants(currentCase, outcome, game)
    : {
        fundingFlat: 0,
        inventoryRewards: [],
        favorGrants: [],
        recruitUnlocks: [],
        reasons: [],
        grants: [],
      }
  const inventoryRewards = [
    ...buildInventoryRewards(currentCase, outcome, operationValue.operationValue, profile),
    ...factionOutcomeGrants.inventoryRewards,
    ...getContractInventoryRewardGrants(currentCase.contract, outcome),
  ]
  const contractResearchRewards = getContractResearchRewards(currentCase.contract, outcome)
  const factionStanding = buildFactionStandingRewards(
    currentCase,
    outcome,
    operationValue.operationValue,
    game
  )
  const projectedRecruitUnlocks = buildProjectedRecruitUnlocks(factionStanding, outcome, game)
  const majorIncidentRewards = currentCase.majorIncident
    ? getAppliedMajorIncidentRewardPreview(currentCase.majorIncident, outcome === 'unresolved' ? 'fail' : outcome)
    : null

  const breakdown: MissionRewardBreakdown = {
    outcome,
    caseType: profile.id,
    caseTypeLabel: profile.label,
    operationValue: operationValue.operationValue,
    factors: factionRewardValue.factor
      ? [...operationValue.factors, factionRewardValue.factor]
      : operationValue.factors,
    fundingDelta: getFundingDelta(
      currentCase,
      outcome,
      config,
      operationValue.operationValue,
      profile,
      factionRewardValue.modifierValue
    ) *
      (currentCase.majorIncident ? 0.3 : 1) +
      factionOutcomeGrants.fundingFlat +
      getContractFundingDelta(currentCase.contract, outcome),
    containmentDelta: getContainmentDelta(
      currentCase,
      outcome,
      config,
      operationValue.operationValue,
      profile
    ),
    strategicValueDelta: getStrategicValueDelta(
      operationValue.operationValue,
      outcome,
      factionRewardValue.modifierValue
    ),
    reputationDelta: getReputationDelta(
      currentCase,
      outcome,
      operationValue.operationValue,
      profile,
      factionRewardValue.modifierValue
    ),
    inventoryRewards: majorIncidentRewards
      ? [
          ...majorIncidentRewards.materials.map((material) =>
            buildInventoryGrant('material', material.itemId, material.quantity)
          ),
          ...majorIncidentRewards.gear.map((gear) =>
            buildInventoryGrant('equipment', gear.itemId, gear.quantity)
          ),
          ...majorIncidentRewards.rumorLoot.map((loot) =>
            buildInventoryGrant(
              getEquipmentDefinition(loot.itemId) ? 'equipment' : 'material',
              loot.itemId,
              loot.quantity
            )
          ),
          ...factionOutcomeGrants.inventoryRewards,
          ...getContractInventoryRewardGrants(currentCase.contract, outcome),
        ].filter((grant): grant is MissionRewardInventoryGrant => Boolean(grant))
      : inventoryRewards,
    ...(contractResearchRewards.length > 0 ? { researchUnlocks: contractResearchRewards } : {}),
    ...(majorIncidentRewards && majorIncidentRewards.progressionUnlocks.length > 0
      ? { progressionUnlocks: majorIncidentRewards.progressionUnlocks }
      : {}),
    factionStanding,
    ...(factionOutcomeGrants.grants.length > 0
      ? { factionGrants: factionOutcomeGrants.grants }
      : {}),
    ...(projectedRecruitUnlocks.length > 0
      ? {
          factionUnlocks: projectedRecruitUnlocks.map((unlock) => ({
            factionId: unlock.factionId,
            contactId: unlock.contactId,
            kind: 'recruit' as const,
            label: unlock.label,
            summary: unlock.summary,
            disposition: unlock.disposition,
          })),
        }
      : {}),
    label: getOutcomeLabel(outcome),
    reasons: [],
  }

  return {
    ...breakdown,
    reasons: buildRewardReasons(breakdown),
  }
}

export function buildMissionRewardPreviewSet(
  currentCase: CaseInstance,
  config: GameConfig,
  game?: Pick<
    GameState,
    | 'agency'
    | 'containmentRating'
    | 'clearanceLevel'
    | 'funding'
    | 'cases'
    | 'factions'
    | 'reports'
    | 'market'
    | 'events'
  >
) {
  return {
    success: buildMissionRewardBreakdown(currentCase, 'success', config, game),
    partial: buildMissionRewardBreakdown(currentCase, 'partial', config, game),
    fail: buildMissionRewardBreakdown(currentCase, 'fail', config, game),
    unresolved: buildMissionRewardBreakdown(currentCase, 'unresolved', config, game),
  }
}

export function getMissionRewardInventoryTotals(
  reward: Pick<MissionRewardBreakdown, 'inventoryRewards'>
) {
  return reward.inventoryRewards.reduce(
    (
      totals: { materials: number; equipment: number },
      currentReward: { kind: 'equipment' | 'material'; quantity: number }
    ) => {
      if (currentReward.kind === 'equipment') {
        totals.equipment += currentReward.quantity
      } else {
        totals.materials += currentReward.quantity
      }

      return totals
    },
    { materials: 0, equipment: 0 }
  )
}

export function getMissionRewardFactionStandingNet(
  reward: Pick<MissionRewardBreakdown, 'factionStanding'>
) {
  return reward.factionStanding.reduce(
    (sum: number, entry: { delta: number }) => sum + entry.delta,
    0
  )
}
