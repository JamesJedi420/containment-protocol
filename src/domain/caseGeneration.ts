// cspell:words cryptid psionic
import { buildMissionRewardPreviewSet } from './missionResults'
import type { CaseInstance, CaseSpawnTrigger, CaseTemplate, GameState } from './models'
import { applyTemplateDiversityWeight } from './caseGenerationPolicy'
import {
  buildFactionStates,
  getFactionHostileMissionTags,
  getFactionPressureSpawnThreshold,
  getFactionSupportiveMissionTags,
} from './factions'
import { getScheduleSnapshot } from './districtSchedule'
import {
  buildUrbanEncounterSignal,
  type UrbanEncounterSignal,
} from './urbanEncounterSignals'
import {
  createCompactRegionPacket,
  deriveRegionEcologyProfiles,
  surfaceThreatHabitatHints,
} from './regionPackets'
import { buildSimulationMapInterface } from './simulationMapInterface'
import {
  deriveTruthProfilePressureSurface,
  type TruthProfileId,
} from './folkloreTruthProfiles'
import {
  createCampaignEraProfilePacket,
  deriveCampaignEraOverlay,
} from './campaignEraProfiles'
import { instantiateFromTemplate, type SpawnedCaseRecord } from './sim/spawn'
import { starterCaseSeeds } from './templates/startingCases'
import {
  aggregateDistrictLocalPressure,
  type NeighborhoodIncidentPacket,
} from './urbanNeighborhoodIncidents'
import {
  deriveAuthorityTemplateWeightModifier,
  deriveCrossSiteAuthorityModifierForTargetSite,
  type CompactCivicAuthorityConsequencePacket,
} from './civicConsequenceNetwork'
import {
  aggregateSiteRumorPressureModifier,
  type CivicRumorPacket,
} from './civicRumorChannel'
import {
  aggregateSiteCreditPressureModifier,
  type CivicCreditPacket,
} from './civicCreditChannel'
  import {
    aggregateSiteAccessPressureModifier,
    type CivicAccessPacket,
  } from './civicAccessChannel'

export type EncounterType =
  | 'haunting'
  | 'possession'
  | 'cult_activity'
  | 'anomalous_breach'
  | 'cryptid_sighting'
  | 'biohazard'
  | 'cyber_intrusion'
  | 'hostile_incursion'
  | 'investigation'

export interface CaseOriginView {
  trigger: CaseSpawnTrigger | 'starter_seed'
  label: string
  detail: string
  parentCaseId?: string
  parentCaseTitle?: string
  factionId?: string
  factionLabel?: string
}

export interface CaseEscalationPreview {
  trigger: 'failure' | 'unresolved'
  nextStage: number
  convertsToRaid: boolean
  raidTeamRange?: string
  targets: Array<{
    templateId: string
    title: string
  }>
}

export interface CaseGenerationProfile {
  encounterType: EncounterType
  encounterTypeLabel: string
  origin: CaseOriginView
  causeSignals: string[]
  escalation: CaseEscalationPreview[]
  rewardProfile: ReturnType<typeof buildMissionRewardPreviewSet>
}

function getAgencyState(game: GameState) {
  return (
    game.agency ?? {
      containmentRating: game.containmentRating,
      clearanceLevel: game.clearanceLevel,
      funding: game.funding,
    }
  )
}

function getOpenCases(game: GameState) {
  return Object.values(game.cases).filter((currentCase) => currentCase.status !== 'resolved')
}

function getRecentUnresolvedMomentum(game: GameState) {
  return game.reports
    .slice(-3)
    .reduce((sum, report) => sum + report.unresolvedTriggers.length + report.failedCases.length, 0)
}

function getCasePressureTags(game: GameState) {
  const counts = new Map<string, number>()

  for (const currentCase of getOpenCases(game)) {
    for (const tag of [
      ...currentCase.tags,
      ...currentCase.requiredTags,
      ...currentCase.preferredTags,
    ]) {
      // Exclude pipeline-internal spatial metadata — site:* tags must not
      // inflate authored semantic tag counts or displace them from ranked slices
      if (tag.startsWith('site:')) continue
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([tag]) => tag)
}

function getCaseTagSet(
  templateOrCase:
    | Pick<CaseTemplate, 'tags'>
    | Pick<CaseInstance, 'tags' | 'requiredTags' | 'preferredTags'>
) {
  return new Set([
    ...templateOrCase.tags,
    ...('requiredTags' in templateOrCase ? templateOrCase.requiredTags : []),
    ...('preferredTags' in templateOrCase ? templateOrCase.preferredTags : []),
  ])
}

function matchesAnyTag(tagSet: Set<string>, tags: readonly string[]) {
  return tags.some((tag) => tagSet.has(tag))
}

function countMatchingTags(tagSet: Set<string>, tags: readonly string[]) {
  return tags.filter((tag) => tagSet.has(tag)).length
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number(value.toFixed(3))))
}

function uniqueSorted(values: readonly string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right))
}

function toDistrictEcologyToken(districtId: string) {
  const normalized = districtId.toLowerCase()
  if (normalized.includes('dock')) return 'district:old-docks'
  if (normalized.includes('cemetery') || normalized.includes('grave')) return 'district:cemetery-belt'
  if (normalized.includes('quarry')) return 'district:quarry-belt'
  if (normalized.includes('flood') || normalized.includes('river')) return 'district:floodplain'
  if (normalized.includes('mall')) return 'district:dead-mall'
  return ''
}

function inferTruthProfileIdFromState(state: GameState): TruthProfileId {
  if (state.containmentRating <= 38 || state.globalThreatDrift !== undefined && state.globalThreatDrift >= 3) {
    return 'active_folklore'
  }

  if (
    state.market.pressure === 'tight' ||
    state.containmentRating <= 60 ||
    state.clearanceLevel >= 2
  ) {
    return 'veiled_intrusion'
  }

  return 'skeptical_modern'
}

function buildUrbanContextSourceFragment(input: {
  ecologyTokens: readonly string[]
  mapState?: string
  truthProfile: TruthProfileId
  eraSuppressionCount: number
}) {
  const ecologyFragment =
    input.ecologyTokens.length > 0 ? `ecology ${input.ecologyTokens.join(', ')}` : 'ecology baseline'
  const mapFragment = input.mapState ? `map ${input.mapState}` : 'map default'
  const eraFragment =
    input.eraSuppressionCount > 0
      ? `era suppression x${input.eraSuppressionCount}`
      : 'era unrestricted'
  return `${ecologyFragment}; ${mapFragment}; truth ${input.truthProfile}; ${eraFragment}`
}

function isAmbientEligibleTemplate(template: CaseTemplate) {
  return !template.templateId.startsWith('followup_') && template.kind === 'case'
}

function pickWeightedTemplate<T>(
  candidates: T[],
  getWeight: (candidate: T) => number,
  rng: () => number
) {
  const weightedCandidates = candidates
    .map((candidate) => ({ candidate, weight: getWeight(candidate) }))
    .filter((entry) => entry.weight > 0)

  const totalWeight = weightedCandidates.reduce((sum, entry) => sum + entry.weight, 0)

  if (totalWeight <= 0) {
    return undefined
  }

  let remaining = rng() * totalWeight

  for (const entry of weightedCandidates) {
    remaining -= entry.weight
    if (remaining <= 0) {
      return entry.candidate
    }
  }

  return weightedCandidates.at(-1)?.candidate
}

function getWorldTemplateWeight(template: CaseTemplate, game: GameState) {
  const agency = getAgencyState(game)
  const unresolvedMomentum = getRecentUnresolvedMomentum(game)
  const pressureTags = getCasePressureTags(game)
  const tagSet = getCaseTagSet(template)

  let weight = 1
  weight += countMatchingTags(tagSet, pressureTags.slice(0, 5)) * 0.75

  if (
    agency.containmentRating <= 45 &&
    matchesAnyTag(tagSet, ['anomaly', 'breach', 'occult', 'cult', 'biological', 'chemical'])
  ) {
    weight += 2
  }

  if (
    game.market.pressure === 'tight' &&
    matchesAnyTag(tagSet, ['chemical', 'biological', 'signal', 'hazmat', 'infrastructure'])
  ) {
    weight += 1
  }

  if (agency.clearanceLevel >= 2 && matchesAnyTag(tagSet, ['cyber', 'psionic', 'classified'])) {
    weight += 1
  }

  if (unresolvedMomentum >= 4 && (template.onUnresolved.spawnCount?.max ?? 0) > 0) {
    weight += 1
  }

  return applyTemplateDiversityWeight(template, weight, game)
}

/**
 * Incorporate district schedule context into template weighting (SPE-109).
 * Uses the live schedule snapshot so district identity and additive overlays
 * can both influence encounter output.
 */
function getDistrictScheduleWeightBonus(
  template: CaseTemplate,
  scheduleContext: NonNullable<ReturnType<typeof getScheduleSnapshot>>,
  urbanSignal?: UrbanEncounterSignal
): number {
  const tagSet = getCaseTagSet(template)
  const familyMatches = countMatchingTags(tagSet, scheduleContext.context.encounterFamilyTags)
  let weightBonus = 1 + Math.min(2.5, familyMatches * 0.5)

  if (
    scheduleContext.traffic.covertAdvantage &&
    matchesAnyTag(tagSet, ['night', 'occult', 'cult', 'criminal', 'smuggling', 'stealth'])
  ) {
    weightBonus += 0.75
  }

  if (
    scheduleContext.traffic.witnessModifier >= 0.7 &&
    matchesAnyTag(tagSet, ['signal', 'infrastructure', 'public', 'classified', 'information'])
  ) {
    weightBonus += 0.5
  }

  if (scheduleContext.traffic.appliedEvents.length > 0) {
    weightBonus += 0.25 * scheduleContext.traffic.appliedEvents.length
  }

  if (urbanSignal) {
    const authorityTags = ['authority', 'inspection', 'patrol', 'enforcement', 'checkpoint']
    const criminalTags = ['criminal', 'smuggling', 'gang', 'black_market']
    const occultTags = ['occult', 'cult', 'ritual', 'anomaly', 'haunt']
    const civilianTags = ['public', 'civilian', 'witness', 'market', 'crowd']
    const specialistTags = ['signal', 'infrastructure', 'classified', 'technical', 'scholar']
    const eliteTags = ['noble', 'elite', 'court', 'manor', 'academy']
    const streetTags = ['slum', 'dock', 'alley', 'backstreet', 'undercity']

    const roleWeightContribution =
      (countMatchingTags(tagSet, authorityTags) > 0 ? urbanSignal.roleWeights.authority - 1 : 0) +
      (countMatchingTags(tagSet, criminalTags) > 0 ? urbanSignal.roleWeights.criminal - 1 : 0) +
      (countMatchingTags(tagSet, occultTags) > 0 ? urbanSignal.roleWeights.occult - 1 : 0) +
      (countMatchingTags(tagSet, civilianTags) > 0 ? urbanSignal.roleWeights.civilian - 1 : 0) +
      (countMatchingTags(tagSet, specialistTags) > 0 ? urbanSignal.roleWeights.specialist - 1 : 0)

    const socialTierContribution =
      (countMatchingTags(tagSet, eliteTags) > 0 ? urbanSignal.socialTierWeights.elite - 1 : 0) +
      (countMatchingTags(tagSet, streetTags) > 0 ? urbanSignal.socialTierWeights.street - 1 : 0)

    const scalarBlend =
      (urbanSignal.weightModifiers.roleAxis - 1) * 0.35 +
      (urbanSignal.weightModifiers.socialTierAxis - 1) * 0.2 +
      (urbanSignal.weightModifiers.authorityResponse - 1) * 0.15 +
      (urbanSignal.weightModifiers.hostileResponse - 1) * 0.15 +
      (urbanSignal.weightModifiers.noncombatBias - 1) * 0.1 +
      (urbanSignal.weightModifiers.districtIdentity - 1) * 0.05

    const urbanBlend = clamp(1 + roleWeightContribution * 0.3 + socialTierContribution * 0.25 + scalarBlend, 0.8, 2)
    weightBonus *= urbanBlend
  }

  return weightBonus
}

function buildUrbanSignalReasonFragment(urbanSignal: UrbanEncounterSignal) {
  const branches = urbanSignal.escalationHints.likelyBranches.slice(0, 2)
  const branchFragment = branches.length > 0 ? `; branches ${branches.join(', ')}` : ''
  const roleAxis = urbanSignal.weightModifiers.roleAxis.toFixed(3)
  const socialAxis = urbanSignal.weightModifiers.socialTierAxis.toFixed(3)
  return `urban signal ${urbanSignal.escalationHints.authorityResponseHint}/${urbanSignal.escalationHints.hostileResponseHint} (${urbanSignal.escalationHints.socialEscalationRisk} social risk; role-axis ${roleAxis}; social-axis ${socialAxis}${branchFragment})`
}

function buildScheduleReasonFragment(
  scheduleContext: NonNullable<ReturnType<typeof getScheduleSnapshot>>,
  game: GameState
) {
  const districtLabel =
    game.districtScheduleState?.districts[scheduleContext.context.districtId]?.label ??
    scheduleContext.context.districtId
  const timeBandLabel =
    game.districtScheduleState?.timeBands[scheduleContext.context.timeBandId]?.label ??
    scheduleContext.context.timeBandId
  const timeStateSummary = scheduleContext.traffic.covertAdvantage
    ? 'covert window active'
    : scheduleContext.traffic.witnessModifier >= 0.7
      ? 'high witness density'
      : 'normal witness density'
  const overlaySummary =
    scheduleContext.traffic.appliedEvents.length > 0
      ? ` overlays: ${scheduleContext.traffic.appliedEvents.join(', ')}`
      : ''

  return `${districtLabel} / ${timeBandLabel} / ${timeStateSummary}${overlaySummary}`
}

function buildWorldActivityReason(template: CaseTemplate, game: GameState) {
  const pressureTags = getCasePressureTags(game)
  const tagSet = getCaseTagSet(template)
  const matchedTags = pressureTags.filter((tag) => tagSet.has(tag)).slice(0, 3)

  if (matchedTags.length > 0) {
    return `Baseline world activity aligned with active pressure tags: ${matchedTags.join(', ')}.`
  }

  return `Baseline world activity surfaced a new ${getEncounterTypeLabel(classifyEncounterType(template))}.`
}

function getFactionTemplateWeight(
  template: CaseTemplate,
  faction: ReturnType<typeof buildFactionStates>[number],
  tags: readonly string[],
  mode: 'supportive' | 'hostile'
) {
  const tagSet = getCaseTagSet(template)
  const factionTagMatches = countMatchingTags(tagSet, tags)

  if (factionTagMatches === 0) {
    return 0
  }

  let weight = 1 + factionTagMatches * 3

  if (mode === 'hostile') {
    if ((template.onFail.spawnCount?.max ?? 0) > 0 || (template.onUnresolved.spawnCount?.max ?? 0) > 0) {
      weight += 0.5
    }

    if (faction.pressureScore >= 180) {
      weight += 1
    }
  } else {
    if (template.kind === 'case') {
      weight += 0.75
    }

    if ((template.onFail.spawnCount?.max ?? 0) === 0 && (template.onUnresolved.spawnCount?.max ?? 0) === 0) {
      weight += 0.5
    }

    if (faction.reputationTier === 'allied') {
      weight += 1
    } else if (faction.reputationTier === 'friendly') {
      weight += 0.4
    }

    weight += Math.max(0, faction.influenceModifiers.opportunityAccess) * 0.25
  }

  return weight * faction.influenceModifiers.caseGenerationWeight
}

function getFactionTemplateWeightForState(
  template: CaseTemplate,
  faction: ReturnType<typeof buildFactionStates>[number],
  tags: readonly string[],
  mode: 'supportive' | 'hostile',
  game: GameState
) {
  const baseWeight = getFactionTemplateWeight(template, faction, tags, mode)
  return applyTemplateDiversityWeight(template, baseWeight, game)
}

function buildFactionPressureReason(
  template: CaseTemplate,
  faction: ReturnType<typeof buildFactionStates>[number]
) {
  const tagSet = getCaseTagSet(template)
  const matchedTags = getFactionHostileMissionTags(faction.id)
    .filter((tag) => tagSet.has(tag))
    .slice(0, 3)
  const standingFragment =
    faction.standing !== 0
      ? ` Standing ${faction.standing >= 0 ? '+' : ''}${faction.standing} shifted the pressure window.`
      : ''

  if (matchedTags.length > 0) {
    return `${faction.label} pressure elevated ${matchedTags.join(', ')} incident activity.${standingFragment}`
  }

  return `${faction.label} pressure surfaced a new incident chain.${standingFragment}`
}

function buildFactionOfferReason(
  template: CaseTemplate,
  faction: ReturnType<typeof buildFactionStates>[number]
) {
  const tagSet = getCaseTagSet(template)
  const matchedTags = getFactionSupportiveMissionTags(faction.id)
    .filter((tag) => tagSet.has(tag))
    .slice(0, 3)

  if (matchedTags.length > 0) {
    return `${faction.label} opened a cooperative mission window around ${matchedTags.join(', ')} work.`
  }

  return `${faction.label} opened a cooperative mission window this week.`
}

function createSpawnRecord(
  currentCase: CaseInstance,
  trigger: CaseSpawnTrigger,
  extras: Partial<SpawnedCaseRecord> = {}
): SpawnedCaseRecord {
  return {
    caseId: currentCase.id,
    trigger,
    ...extras,
  }
}

export function generateAmbientCases(
  state: GameState,
  rng: () => number,
  context?: {
    neighborhoodPackets?: readonly NeighborhoodIncidentPacket[]
    civicConsequencePackets?: readonly CompactCivicAuthorityConsequencePacket[]
    rumorPackets?: readonly CivicRumorPacket[]
    creditPackets?: readonly CivicCreditPacket[]
    accessPackets?: readonly CivicAccessPacket[]
  }
): {
  state: GameState
  spawnedCaseIds: string[]
  spawnedCases: SpawnedCaseRecord[]
} {
  const openSlots = Math.max(0, state.config.maxActiveCases - getOpenCases(state).length)

  if (openSlots <= 0) {
    return { state, spawnedCaseIds: [], spawnedCases: [] }
  }

  const agency = getAgencyState(state)
  const unresolvedMomentum = getRecentUnresolvedMomentum(state)
  const factions = buildFactionStates(state)
  const usedIds = new Set(Object.keys(state.cases))
  const eligibleTemplates = Object.values(state.templates).filter(isAmbientEligibleTemplate)
  const spawnedEntries: Array<{ currentCase: CaseInstance; record: SpawnedCaseRecord }> = []
  const topPressureFaction = factions
    .filter(
      (faction) =>
        faction.stance !== 'supportive' &&
        faction.reputationTier !== 'friendly' &&
        faction.reputationTier !== 'allied' &&
        faction.pressureScore >= getFactionPressureSpawnThreshold(faction)
    )
    .sort(
      (left, right) =>
        right.pressureScore - left.pressureScore ||
        left.reputation - right.reputation ||
        left.label.localeCompare(right.label)
    )
    .at(0)
  const topSupportiveFaction = factions
    .filter(
      (faction) =>
        (faction.reputationTier === 'friendly' || faction.reputationTier === 'allied') &&
        faction.stance === 'supportive' &&
        faction.matchingCases < 2
    )
    .sort(
      (left, right) =>
        right.reputation - left.reputation ||
        right.influenceModifiers.opportunityAccess - left.influenceModifiers.opportunityAccess ||
        right.standing - left.standing ||
        left.label.localeCompare(right.label)
    )
    .at(0)

  const spawnPlans: Array<{
    priority: number
    trigger: CaseSpawnTrigger
    template: CaseTemplate
    factionId?: string
    factionLabel?: string
    districtId?: string
    timeBandId?: string
    scheduleCovertAdvantage?: boolean
    scheduleWitnessBand?: 'high' | 'low' | 'normal'
    appliedScheduleEvents?: string[]
    reason: string
    neighborhoodPressureDistrictId?: string
    neighborhoodPressureBoost?: number
    rumorPressureSiteId?: string
    rumorPressureBoost?: number
    creditPressureSiteId?: string
    creditPressureBoost?: number
      accessPressureSiteId?: string
      accessPressureBoost?: number
  }> = []

  if (topSupportiveFaction) {
    const supportiveTags = getFactionSupportiveMissionTags(topSupportiveFaction.id)
    const factionTemplate = pickWeightedTemplate(
      eligibleTemplates,
      (template) =>
        getFactionTemplateWeightForState(
          template,
          topSupportiveFaction,
          supportiveTags,
          'supportive',
          state
        ),
      rng
    )

    if (factionTemplate) {
      spawnPlans.push({
        priority:
          70 +
          topSupportiveFaction.reputation +
          topSupportiveFaction.influenceModifiers.opportunityAccess * 8 +
          topSupportiveFaction.standing * 2,
        trigger: 'faction_offer',
        template: factionTemplate,
        factionId: topSupportiveFaction.id,
        factionLabel: topSupportiveFaction.label,
        reason: buildFactionOfferReason(factionTemplate, topSupportiveFaction),
      })
    }
  }

  if (topPressureFaction) {
    const hostileTags = getFactionHostileMissionTags(topPressureFaction.id)
    const factionTemplate = pickWeightedTemplate(
      eligibleTemplates,
      (template) =>
        getFactionTemplateWeightForState(
          template,
          topPressureFaction,
          hostileTags,
          'hostile',
          state
        ),
      rng
    )

    if (factionTemplate) {
      spawnPlans.push({
        priority:
          50 +
          Math.max(
            0,
            topPressureFaction.pressureScore - getFactionPressureSpawnThreshold(topPressureFaction)
          ) +
          Math.max(0, -topPressureFaction.reputation),
        trigger: 'faction_pressure',
        template: factionTemplate,
        factionId: topPressureFaction.id,
        factionLabel: topPressureFaction.label,
        reason: buildFactionPressureReason(factionTemplate, topPressureFaction),
      })
    }
  }

  if (agency.containmentRating <= 45 || unresolvedMomentum >= 4) {
    // SPE-109: Select district + time band when a schedule exists and derive
    // a live snapshot (baseline + additive overlays) for weighting/output.
    const schedule = state.districtScheduleState
    const selectedDistrictId = schedule
      ? Object.keys(schedule.districts)[Math.floor(rng() * Object.keys(schedule.districts).length)]
      : undefined
    const selectedTimeBandId = schedule
      ? Object.keys(schedule.timeBands)[Math.floor(rng() * Object.keys(schedule.timeBands).length)]
      : undefined
    const scheduleContext =
      schedule && selectedDistrictId && selectedTimeBandId
        ? getScheduleSnapshot(schedule, selectedDistrictId, selectedTimeBandId, state.week, state.rngState)
        : null
    const simulationMap = buildSimulationMapInterface(state)
    const districtEcologyToken = scheduleContext
      ? toDistrictEcologyToken(scheduleContext.context.districtId)
      : ''
    const ecologyTokens = uniqueSorted([
      ...(districtEcologyToken ? [districtEcologyToken] : []),
      ...(scheduleContext ? [`district:${scheduleContext.context.districtId}`] : []),
    ])
    const ecologyPacket = createCompactRegionPacket({
      regionId: `region:auto:${scheduleContext?.context.districtId ?? 'unknown'}`,
      label: `Auto region for ${scheduleContext?.context.districtId ?? 'unknown'}`,
      factions: [],
      externalPressure: {
        actorId: 'pressure:auto',
        label: 'Auto pressure',
        pressureType: 'subversion',
        severity: 'low',
        targetFactionIds: [],
      },
      supraFactionOrder: {
        orderId: 'order:auto',
        label: 'Auto order',
        doctrine: 'civil_protection',
        memberFactionIds: [],
      },
      keyNpcs: [],
      threatPool: Object.values(state.cases)
        .filter((currentCase) => currentCase.status !== 'resolved')
        .slice(0, 4)
        .map((currentCase, index) => ({
          threatId: `threat:auto:${index}`,
          label: currentCase.title,
          category: matchesAnyTag(new Set(currentCase.tags), ['cult', 'ritual'])
            ? 'cult'
            : matchesAnyTag(new Set(currentCase.tags), ['cryptid', 'beast', 'vampire'])
              ? 'cryptid'
              : 'anomalous_hazard',
          districtTokens: [...ecologyTokens],
        })),
      objectives: [],
      districtEcologyTokens: ecologyTokens,
      ecologyZones: scheduleContext
        ? [{
            zoneId: `zone:auto:${scheduleContext.context.districtId}`,
            label: `${scheduleContext.context.districtId} zone`,
            ecologyTokens,
          }]
        : [],
    })
    const ecologyProfiles = deriveRegionEcologyProfiles(ecologyPacket)
    const threatHabitatHints = surfaceThreatHabitatHints(ecologyPacket)
      .flatMap((surface) => surface.habitatHints)
    const mapState = simulationMap.routeState.dominantWorldState
    const truthProfileId = inferTruthProfileIdFromState(state)
    const truthPressureSurface = deriveTruthProfilePressureSurface(truthProfileId)
    const eraOverlay = deriveCampaignEraOverlay(
      createCampaignEraProfilePacket({
        profileId: `auto-era-${state.market.pressure}`,
        label: 'Auto era surface',
        eraLayers: state.market.pressure === 'tight' ? ['colonial', 'renaissance'] : ['medieval'],
        allowedRoles: ['officer', 'scholar', 'forester'],
        suppressedRoles: state.market.pressure === 'tight' ? ['bard'] : [],
        availableEquipmentCategories: state.market.pressure === 'tight'
          ? ['blackpowder', 'field_medicine']
          : ['plate_armor', 'ritual_implements'],
        suppressedEquipmentCategories: state.market.pressure === 'tight' ? ['printing_press'] : [],
        enabledPowerFamilies: state.clearanceLevel >= 2 ? ['alchemy', 'folk_rite', 'miracle'] : ['folk_rite'],
        suppressedPowerFamilies: state.market.pressure === 'tight' ? ['arcane'] : [],
        moneyModel: state.market.pressure === 'tight' ? 'mercantile_credit' : 'coinage',
        prevalentMonsterFamilies: ['urban_anomaly'],
        settlementStyleHints: ['fortified_market_town'],
        suppressedInteractionSurfaces: state.market.pressure === 'tight'
          ? ['wizard_colleges']
          : [],
      })
    )
    const urbanSignal = scheduleContext
      ? buildUrbanEncounterSignal({
          schedule: {
            districtId: scheduleContext.context.districtId,
            timeBandId: scheduleContext.context.timeBandId,
            encounterFamilyTags: scheduleContext.context.encounterFamilyTags,
            authorityResponseProfile: scheduleContext.context.authorityResponseProfile,
            witnessModifier: scheduleContext.traffic.witnessModifier,
            covertAdvantage: scheduleContext.traffic.covertAdvantage,
            appliedEvents: scheduleContext.traffic.appliedEvents,
          },
          ecology: {
            districtEcologyTokens: ecologyTokens,
            operationalModifierHints: ecologyProfiles.flatMap((profile) => profile.operationalModifierHints),
            threatHabitatHints,
          },
          map: {
            dominantWorldState: simulationMap.routeState.dominantWorldState,
            safeHubContinuity: simulationMap.routeState.safeHubContinuity,
            actionableSignals: simulationMap.actionableSignals,
          },
          truth: {
            anomalyEncounterPressure: truthPressureSurface.anomalyEncounterPressure,
            witnessReliability: truthPressureSurface.witnessReliability,
            institutionalResponsePosture: truthPressureSurface.institutionalResponsePosture,
            publicLegibility: truthPressureSurface.publicLegibility,
          },
          era: {
            mixedEra: eraOverlay.mixedEra,
            suppressedInteractionSurfaces: eraOverlay.suppressedInteractionSurfaces,
            powerAvailability: eraOverlay.powerAvailability,
          },
        })
      : undefined
    const crossSiteAuthorityModifier =
      selectedDistrictId && context?.civicConsequencePackets && context.civicConsequencePackets.length > 0
        ? deriveCrossSiteAuthorityModifierForTargetSite(
            context.civicConsequencePackets,
            selectedDistrictId,
            state.week
          )
        : undefined

    const worldTemplate = pickWeightedTemplate(
      eligibleTemplates,
      (template) => {
        const baseWeight = getWorldTemplateWeight(template, state)
        const districtBonus = scheduleContext
          ? getDistrictScheduleWeightBonus(template, scheduleContext, urbanSignal)
          : 1
        const crossSiteAuthorityTemplateModifier = crossSiteAuthorityModifier
          ? deriveAuthorityTemplateWeightModifier(template.tags, crossSiteAuthorityModifier.totalDelta)
          : 1
        return baseWeight * districtBonus * crossSiteAuthorityTemplateModifier
      },
      rng
    )

    if (worldTemplate) {
      const witnessBand = scheduleContext
        ? scheduleContext.traffic.witnessModifier >= 0.7
          ? 'high'
          : scheduleContext.traffic.witnessModifier <= 0.35
            ? 'low'
            : 'normal'
        : undefined

      // SPE-539 slice-2: aggregate local pressure only for the selected district.
      const neighborhoodPressure =
        selectedDistrictId && context?.neighborhoodPackets && context.neighborhoodPackets.length > 0
          ? aggregateDistrictLocalPressure(context.neighborhoodPackets, selectedDistrictId, state.week)
          : undefined
      const neighborhoodPriorityBonus = neighborhoodPressure
        ? Math.round(neighborhoodPressure.pressureBoost * 10)
        : 0

      // SPE-1265: aggregate rumor pressure for the selected district
      const rumorPressure =
        selectedDistrictId && context?.rumorPackets && context.rumorPackets.length > 0
          ? aggregateSiteRumorPressureModifier(context.rumorPackets, selectedDistrictId)
          : undefined
      const rumorPriorityBonus = rumorPressure
        ? Math.round(rumorPressure.pressureBoost * 10)
        : 0

      // SPE-1266: aggregate credit pressure for the selected district
      const creditPressure =
        selectedDistrictId && context?.creditPackets && context.creditPackets.length > 0
          ? aggregateSiteCreditPressureModifier(context.creditPackets, selectedDistrictId)
          : undefined
      const creditPriorityBonus = creditPressure
        ? Math.round(creditPressure.pressureBoost * 10)
        : 0

        // SPE-1267: aggregate access pressure for the selected district
        const accessPressure =
          selectedDistrictId && context?.accessPackets && context.accessPackets.length > 0
            ? aggregateSiteAccessPressureModifier(context.accessPackets, selectedDistrictId)
            : undefined
        const accessPriorityBonus = accessPressure
          ? Math.round(accessPressure.pressureBoost * 10)
          : 0

      spawnPlans.push({
        priority: 25 + Math.max(0, 50 - agency.containmentRating) + unresolvedMomentum * 4 + neighborhoodPriorityBonus + rumorPriorityBonus + creditPriorityBonus + accessPriorityBonus,
        trigger: 'world_activity',
        template: worldTemplate,
        districtId: selectedDistrictId,
        timeBandId: selectedTimeBandId,
        scheduleCovertAdvantage: scheduleContext?.traffic.covertAdvantage,
        scheduleWitnessBand: witnessBand,
        appliedScheduleEvents: scheduleContext?.traffic.appliedEvents ?? [],
        neighborhoodPressureDistrictId:
          neighborhoodPressure && neighborhoodPressure.pressureBoost > 0
            ? selectedDistrictId
            : undefined,
        neighborhoodPressureBoost: neighborhoodPressure?.pressureBoost,
        rumorPressureSiteId:
          rumorPressure && rumorPressure.pressureBoost !== 0
            ? selectedDistrictId
            : undefined,
        rumorPressureBoost: rumorPressure?.pressureBoost,
        creditPressureSiteId:
          creditPressure && creditPressure.pressureBoost !== 0
            ? selectedDistrictId
            : undefined,
        creditPressureBoost: creditPressure?.pressureBoost,
          accessPressureSiteId:
            accessPressure && accessPressure.pressureBoost !== 0
              ? selectedDistrictId
              : undefined,
          accessPressureBoost: accessPressure?.pressureBoost,
        reason:
          buildWorldActivityReason(worldTemplate, state) +
          (scheduleContext ? ` Schedule: ${buildScheduleReasonFragment(scheduleContext, state)}.` : '') +
          (urbanSignal
            ? ` Urban: ${buildUrbanSignalReasonFragment(urbanSignal)}.` +
              ` Inputs: ${buildUrbanContextSourceFragment({
                ecologyTokens,
                mapState,
                truthProfile: truthProfileId,
                eraSuppressionCount: eraOverlay.suppressedInteractionSurfaces.length + eraOverlay.powerAvailability.suppressed.length,
              })}.`
            : '') +
          (neighborhoodPressure && neighborhoodPressure.pressureBoost > 0
            ? ` Neighborhood: ${neighborhoodPressure.reasonFragment}.`
            : '') +
          (rumorPressure && rumorPressure.pressureBoost !== 0
            ? ` Rumor: ${rumorPressure.reasonFragment}.`
            : '') +
          (creditPressure && creditPressure.pressureBoost !== 0
            ? ` Credit: ${creditPressure.reasonFragment}.`
            : '') +
            (accessPressure && accessPressure.pressureBoost !== 0
              ? ` Access: ${accessPressure.reasonFragment}.`
              : '') +
          (crossSiteAuthorityModifier && crossSiteAuthorityModifier.totalDelta !== 0
            ? ` Authority exchange: ${crossSiteAuthorityModifier.reasonFragment}.`
            : ''),
      })
    }
  }

  for (const plan of spawnPlans
    .sort((left, right) => right.priority - left.priority)
    .slice(0, openSlots)) {
    const instantiatedCase = instantiateFromTemplate(plan.template, rng, usedIds, state.week)
    const currentCase =
      plan.factionId && instantiatedCase.factionId !== plan.factionId
        ? {
            ...instantiatedCase,
            factionId: plan.factionId,
          }
         : instantiatedCase

      // SPE-109: Add district/time-state tags when case was generated in a schedule context.
      const taggedCase = plan.districtId
        ? {
            ...currentCase,
            tags: [
              ...currentCase.tags,
              `district:${plan.districtId}`,
              ...(plan.timeBandId ? [`timeband:${plan.timeBandId}`] : []),
              ...(plan.scheduleCovertAdvantage ? ['schedule:covert-advantage'] : []),
              ...(plan.scheduleWitnessBand ? [`schedule:witness-${plan.scheduleWitnessBand}`] : []),
              ...((plan.appliedScheduleEvents ?? []).map((eventId) => `schedule-event:${eventId}`)),
              ...(plan.neighborhoodPressureDistrictId
                ? [`neighborhood-pressure:${plan.neighborhoodPressureDistrictId}`]
                : []),
              ...(plan.rumorPressureSiteId
                ? [`rumor-pressure:${plan.rumorPressureSiteId}`]
                : []),
              ...(plan.creditPressureSiteId
                ? [`credit-pressure:${plan.creditPressureSiteId}`]
                : []),
                ...(plan.accessPressureSiteId
                  ? [`access-pressure:${plan.accessPressureSiteId}`]
                  : []),
            ],
          }
        : currentCase

    spawnedEntries.push({
       currentCase: taggedCase,
        record: createSpawnRecord(taggedCase, plan.trigger, {
         factionId: plan.factionId,
        factionLabel: plan.factionLabel,
        sourceReason: plan.reason,
      }),
    })
  }

  if (spawnedEntries.length === 0) {
    return { state, spawnedCaseIds: [], spawnedCases: [] }
  }

  return {
    state: {
      ...state,
      cases: {
        ...state.cases,
        ...Object.fromEntries(
          spawnedEntries.map(({ currentCase }) => [currentCase.id, currentCase])
        ),
      },
    },
    spawnedCaseIds: spawnedEntries.map(({ currentCase }) => currentCase.id),
    spawnedCases: spawnedEntries.map(({ record }) => record),
  }
}

export function classifyEncounterType(
  templateOrCase:
    | Pick<CaseTemplate, 'tags'>
    | Pick<CaseInstance, 'tags' | 'requiredTags' | 'preferredTags'>
): EncounterType {
  const tagSet = getCaseTagSet(templateOrCase)

  if (matchesAnyTag(tagSet, ['haunting', 'haunt', 'spirit'])) {
    return 'haunting'
  }

  if (matchesAnyTag(tagSet, ['possession', 'medium'])) {
    return 'possession'
  }

  if (matchesAnyTag(tagSet, ['cult', 'ritual'])) {
    return 'cult_activity'
  }

  if (matchesAnyTag(tagSet, ['vampire', 'cryptid', 'beast', 'feral'])) {
    return 'cryptid_sighting'
  }

  if (matchesAnyTag(tagSet, ['anomaly', 'breach', 'containment'])) {
    return 'anomalous_breach'
  }

  if (matchesAnyTag(tagSet, ['biological', 'chemical', 'hazmat'])) {
    return 'biohazard'
  }

  if (matchesAnyTag(tagSet, ['cyber', 'signal', 'information', 'classified', 'relay'])) {
    return 'cyber_intrusion'
  }

  if (matchesAnyTag(tagSet, ['combat', 'threat', 'perimeter'])) {
    return 'hostile_incursion'
  }

  return 'investigation'
}

export function getEncounterTypeLabel(type: EncounterType) {
  switch (type) {
    case 'haunting':
      return 'Haunting'
    case 'possession':
      return 'Possession'
    case 'cult_activity':
      return 'Cult activity'
    case 'anomalous_breach':
      return 'Anomalous breach'
    case 'cryptid_sighting':
      return 'Cryptid sighting'
    case 'biohazard':
      return 'Biohazard'
    case 'cyber_intrusion':
      return 'Cyber intrusion'
    case 'hostile_incursion':
      return 'Hostile incursion'
    default:
      return 'Investigation'
  }
}

function buildCaseOrigin(currentCase: CaseInstance, game: GameState): CaseOriginView {
  const spawnEvent = [...game.events]
    .reverse()
    .find((event) => event.type === 'case.spawned' && event.payload.caseId === currentCase.id)

  if (spawnEvent?.type === 'case.spawned') {
    const { trigger } = spawnEvent.payload

    if (trigger === 'failure') {
      return {
        trigger,
        label: 'Failure chain',
        detail: spawnEvent.payload.parentCaseTitle
          ? `Spawned because ${spawnEvent.payload.parentCaseTitle} failed.`
          : 'Spawned from a failed operation.',
        parentCaseId: spawnEvent.payload.parentCaseId,
        parentCaseTitle: spawnEvent.payload.parentCaseTitle,
      }
    }

    if (trigger === 'unresolved') {
      return {
        trigger,
        label: 'Unresolved escalation',
        detail: spawnEvent.payload.parentCaseTitle
          ? `Spawned because ${spawnEvent.payload.parentCaseTitle} was left unresolved.`
          : 'Spawned by unresolved escalation pressure.',
        parentCaseId: spawnEvent.payload.parentCaseId,
        parentCaseTitle: spawnEvent.payload.parentCaseTitle,
      }
    }

    if (trigger === 'raid_pressure') {
      return {
        trigger,
        label: 'Raid pressure',
        detail: spawnEvent.payload.parentCaseTitle
          ? `Spawned from raid pressure created by ${spawnEvent.payload.parentCaseTitle}.`
          : 'Spawned from accumulated raid pressure.',
        parentCaseId: spawnEvent.payload.parentCaseId,
        parentCaseTitle: spawnEvent.payload.parentCaseTitle,
      }
    }

    if (trigger === 'faction_pressure') {
      return {
        trigger,
        label: 'Faction pressure',
        detail:
          spawnEvent.payload.sourceReason ??
          (spawnEvent.payload.factionLabel
            ? `${spawnEvent.payload.factionLabel} pressure surfaced this incident.`
            : 'Faction pressure surfaced this incident.'),
        factionId: spawnEvent.payload.factionId,
        factionLabel: spawnEvent.payload.factionLabel,
      }
    }

    if (trigger === 'faction_offer') {
      return {
        trigger,
        label: 'Faction offer',
        detail:
          spawnEvent.payload.sourceReason ??
          (spawnEvent.payload.factionLabel
            ? `${spawnEvent.payload.factionLabel} offered this operation through an active channel.`
            : 'A faction offered this operation through an active channel.'),
        factionId: spawnEvent.payload.factionId,
        factionLabel: spawnEvent.payload.factionLabel,
      }
    }

    if (trigger === 'pressure_threshold') {
      return {
        trigger,
        label: 'Global pressure threshold',
        detail:
          spawnEvent.payload.sourceReason ??
          'A major incident was opened by accumulated unresolved global pressure.',
      }
    }

    return {
      trigger,
      label: 'Baseline world activity',
      detail: spawnEvent.payload.sourceReason ?? 'Baseline world activity surfaced this incident.',
    }
  }

  if (starterCaseSeeds.some((seed) => seed.id === currentCase.id)) {
    return {
      trigger: 'starter_seed',
      label: 'Baseline world activity',
      detail: 'Seeded from baseline world activity at campaign start.',
    }
  }

  return {
    trigger: 'starter_seed',
    label: 'World activity',
    detail: 'Origin not explicitly recorded. Treated as ambient world activity.',
  }
}

function buildCaseEscalationPreview(
  currentCase: CaseInstance,
  templates: GameState['templates']
): CaseEscalationPreview[] {
  return [
    {
      trigger: 'failure',
      nextStage: Math.min(currentCase.stage + (currentCase.onFail.stageDelta ?? 0), 5),
      convertsToRaid:
        currentCase.onFail.convertToRaidAtStage !== undefined &&
        currentCase.stage + (currentCase.onFail.stageDelta ?? 0) >=
          currentCase.onFail.convertToRaidAtStage,
      raidTeamRange: currentCase.raid
        ? `${currentCase.raid.minTeams}-${currentCase.raid.maxTeams}`
        : undefined,
      targets: [...new Set(currentCase.onFail.spawnTemplateIds ?? [])]
        .map((templateId) => ({
          templateId,
          title: templates[templateId]?.title ?? templateId,
        }))
        .sort((left, right) => left.title.localeCompare(right.title)),
    },
    {
      trigger: 'unresolved',
      nextStage: Math.min(currentCase.stage + (currentCase.onUnresolved.stageDelta ?? 0), 5),
      convertsToRaid:
        currentCase.onUnresolved.convertToRaidAtStage !== undefined &&
        currentCase.stage + (currentCase.onUnresolved.stageDelta ?? 0) >=
          currentCase.onUnresolved.convertToRaidAtStage,
      raidTeamRange: currentCase.raid
        ? `${currentCase.raid.minTeams}-${currentCase.raid.maxTeams}`
        : undefined,
      targets: [...new Set(currentCase.onUnresolved.spawnTemplateIds ?? [])]
        .map((templateId) => ({
          templateId,
          title: templates[templateId]?.title ?? templateId,
        }))
        .sort((left, right) => left.title.localeCompare(right.title)),
    },
  ]
}

function buildCauseSignals(currentCase: CaseInstance) {
  // site:* tags are pipeline-internal spatial metadata and must not appear as
  // authored cause signals — they carry no semantic meaning for case generation.
  const semanticTags = [
    ...currentCase.tags,
    ...currentCase.requiredTags,
    ...currentCase.preferredTags,
  ].filter((tag) => !tag.startsWith('site:'))

  return [...new Set(semanticTags)]
    .sort((left, right) => left.localeCompare(right))
    .slice(0, 8)
}

export function buildCaseGenerationProfile(
  currentCase: CaseInstance,
  game: GameState
): CaseGenerationProfile {
  const encounterType = classifyEncounterType(currentCase)

  return {
    encounterType,
    encounterTypeLabel: getEncounterTypeLabel(encounterType),
    origin: buildCaseOrigin(currentCase, game),
    causeSignals: buildCauseSignals(currentCase),
    escalation: buildCaseEscalationPreview(currentCase, game.templates),
    rewardProfile: buildMissionRewardPreviewSet(currentCase, game.config, game),
  }
}
