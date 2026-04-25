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
import { instantiateFromTemplate, type SpawnedCaseRecord } from './sim/spawn'
import { starterCaseSeeds } from './templates/startingCases'

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
  rng: () => number
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
    reason: string
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
    const worldTemplate = pickWeightedTemplate(
      eligibleTemplates,
      (template) => getWorldTemplateWeight(template, state),
      rng
    )

    if (worldTemplate) {
      spawnPlans.push({
        priority: 25 + Math.max(0, 50 - agency.containmentRating) + unresolvedMomentum * 4,
        trigger: 'world_activity',
        template: worldTemplate,
        reason: buildWorldActivityReason(worldTemplate, state),
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

    spawnedEntries.push({
      currentCase,
      record: createSpawnRecord(currentCase, plan.trigger, {
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
