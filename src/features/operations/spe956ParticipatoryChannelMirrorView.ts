/**
 * SPE-2637 / SPE-956: read-only planning mirror over persisted participatory channel maps.
 * Surfaces hydrated channel envelopes as labels only — does not call SPE-2620–2631 evaluators
 * or mutate GameState from UI paths.
 */

import type { GameState } from '../../domain/models'
import type {
  Spe956PersistedAsyncDiscussionSurface,
  Spe956PersistedCollectiveMemoryChannel,
  Spe956PersistedCommunityAdvisoryBody,
  Spe956PersistedHotlineChannel,
  Spe956PersistedSurvivorInformalRegistry,
} from '../../domain/spe956ParticipatoryChannelPersistence'
import {
  extractSpe956AsyncDiscussionSurfaceRecords,
  extractSpe956CollectiveMemoryChannelRecords,
  extractSpe956CommunityAdvisoryBodyRecords,
  extractSpe956HotlineChannelRecords,
  extractSpe956SurvivorInformalRegistryRecords,
} from '../../domain/spe956ParticipatoryChannelPersistence'
import { formatMirrorEnumLabel } from './mirrorFormatting'

export interface Spe956SurvivorInformalRegistryMirrorRow {
  readonly id: string
  readonly recognitionStanceLabel: string
  readonly catalogRuleLabel: string
  readonly supportKnowledgeBandLabel: string
  readonly credibilityCeilingLabel: string
}

export interface Spe956CollectiveMemoryChannelMirrorRow {
  readonly id: string
  readonly narrativeStanceLabel: string
  readonly recallWindowLabel: string
  readonly credibilityCeilingLabel: string
  readonly stabilizationRuleLabel: string
}

export interface Spe956HotlineChannelMirrorRow {
  readonly id: string
  readonly scriptQualityLabel: string
  readonly staffingCapacityLabel: string
  readonly languageSupportLabel: string
  readonly escalationRulesLabel: string
  readonly unansweredModeLabel: string
  readonly angerModeLabel: string
  readonly handleThresholdLabel: string
}

export interface Spe956AsyncDiscussionSurfaceMirrorRow {
  readonly id: string
  readonly participationWindowLabel: string
  readonly transcriptRetentionModeLabel: string
  readonly wideningRuleLabel: string
  readonly memoryStabilizationLabel: string
}

export interface Spe956CommunityAdvisoryBodyMirrorRow {
  readonly id: string
  readonly missionLabel: string
  readonly membershipRuleLabel: string
  readonly representedStakeholderClassesLabel: string
  readonly authorizedDecisionScopesLabel: string
  readonly influenceThresholdLabel: string
  readonly decisionCriteriaLabel: string
}

export interface Spe956ParticipatoryChannelMirrorSummaryView {
  readonly survivorRegistryCount: number
  readonly collectiveMemoryCount: number
  readonly hotlineCount: number
  readonly asyncDiscussionCount: number
  readonly communityAdvisoryCount: number
  readonly totalChannelCount: number
  readonly week: number
}

export interface Spe956ParticipatoryChannelMirrorView {
  readonly isEmpty: boolean
  readonly summary: Spe956ParticipatoryChannelMirrorSummaryView
  readonly survivorRegistries: readonly Spe956SurvivorInformalRegistryMirrorRow[]
  readonly collectiveMemoryChannels: readonly Spe956CollectiveMemoryChannelMirrorRow[]
  readonly hotlineChannels: readonly Spe956HotlineChannelMirrorRow[]
  readonly asyncDiscussionSurfaces: readonly Spe956AsyncDiscussionSurfaceMirrorRow[]
  readonly communityAdvisoryBodies: readonly Spe956CommunityAdvisoryBodyMirrorRow[]
}

/** Code-unit order (not localeCompare) keeps mirror output deterministic across runtimes. */
function compareIdsByCodeUnit(
  left: { readonly id: string },
  right: { readonly id: string }
): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
}

function formatBooleanLabel(value: boolean): string {
  return value ? 'Yes' : 'No'
}

function formatUnitIntervalLabel(value: number): string {
  return String(value)
}

function formatEnumListLabel(values: readonly string[]): string {
  if (values.length === 0) {
    return '—'
  }

  return values.map(formatMirrorEnumLabel).join(', ')
}

function listSortedEntries<T extends { readonly id: string }>(
  map: Record<string, T> | undefined
): T[] {
  if (!map) {
    return []
  }

  return Object.values(map)
    .filter((entry): entry is T => entry != null)
    .sort(compareIdsByCodeUnit)
}

function toSurvivorRegistryRow(
  record: Spe956PersistedSurvivorInformalRegistry
): Spe956SurvivorInformalRegistryMirrorRow {
  return Object.freeze({
    id: record.id,
    recognitionStanceLabel: formatMirrorEnumLabel(record.recognitionStance),
    catalogRuleLabel: formatMirrorEnumLabel(record.catalogRule),
    supportKnowledgeBandLabel: formatMirrorEnumLabel(record.supportKnowledgeBand),
    credibilityCeilingLabel: formatMirrorEnumLabel(record.credibilityCeiling),
  })
}

function toCollectiveMemoryRow(
  record: Spe956PersistedCollectiveMemoryChannel
): Spe956CollectiveMemoryChannelMirrorRow {
  return Object.freeze({
    id: record.id,
    narrativeStanceLabel: formatMirrorEnumLabel(record.narrativeStance),
    recallWindowLabel: formatMirrorEnumLabel(record.recallWindow),
    credibilityCeilingLabel: formatMirrorEnumLabel(record.credibilityCeiling),
    stabilizationRuleLabel: formatMirrorEnumLabel(record.stabilizationRule),
  })
}

function toHotlineRow(record: Spe956PersistedHotlineChannel): Spe956HotlineChannelMirrorRow {
  return Object.freeze({
    id: record.id,
    scriptQualityLabel: formatUnitIntervalLabel(record.scriptQuality),
    staffingCapacityLabel: formatUnitIntervalLabel(record.staffingCapacity),
    languageSupportLabel: formatBooleanLabel(record.languageSupport),
    escalationRulesLabel: record.escalationRules,
    unansweredModeLabel: formatMirrorEnumLabel(record.unansweredMode),
    angerModeLabel: formatMirrorEnumLabel(record.angerMode),
    handleThresholdLabel: formatUnitIntervalLabel(record.handleThreshold),
  })
}

function toAsyncDiscussionRow(
  record: Spe956PersistedAsyncDiscussionSurface
): Spe956AsyncDiscussionSurfaceMirrorRow {
  const { startWeek, endWeek } = record.participationWindow

  return Object.freeze({
    id: record.id,
    participationWindowLabel: `W${startWeek}–W${endWeek}`,
    transcriptRetentionModeLabel: formatMirrorEnumLabel(record.transcriptRetentionMode),
    wideningRuleLabel: formatMirrorEnumLabel(record.wideningRule),
    memoryStabilizationLabel: formatBooleanLabel(record.memoryStabilization),
  })
}

function toCommunityAdvisoryRow(
  record: Spe956PersistedCommunityAdvisoryBody
): Spe956CommunityAdvisoryBodyMirrorRow {
  return Object.freeze({
    id: record.id,
    missionLabel: record.mission,
    membershipRuleLabel: record.membershipRule,
    representedStakeholderClassesLabel: formatEnumListLabel(
      record.representedStakeholderClasses
    ),
    authorizedDecisionScopesLabel: formatEnumListLabel(record.authorizedDecisionScopes),
    influenceThresholdLabel: formatUnitIntervalLabel(record.influenceThreshold),
    decisionCriteriaLabel: record.decisionCriteria,
  })
}

/** Read-only mirror over hydrated SPE-956 participatory channel maps; does not run evaluators. */
export function getSpe956ParticipatoryChannelMirrorView(
  game: GameState
): Spe956ParticipatoryChannelMirrorView {
  const survivorRegistries = listSortedEntries(
    extractSpe956SurvivorInformalRegistryRecords(game)
  ).map(toSurvivorRegistryRow)
  const collectiveMemoryChannels = listSortedEntries(
    extractSpe956CollectiveMemoryChannelRecords(game)
  ).map(toCollectiveMemoryRow)
  const hotlineChannels = listSortedEntries(extractSpe956HotlineChannelRecords(game)).map(
    toHotlineRow
  )
  const asyncDiscussionSurfaces = listSortedEntries(
    extractSpe956AsyncDiscussionSurfaceRecords(game)
  ).map(toAsyncDiscussionRow)
  const communityAdvisoryBodies = listSortedEntries(
    extractSpe956CommunityAdvisoryBodyRecords(game)
  ).map(toCommunityAdvisoryRow)

  const survivorRegistryCount = survivorRegistries.length
  const collectiveMemoryCount = collectiveMemoryChannels.length
  const hotlineCount = hotlineChannels.length
  const asyncDiscussionCount = asyncDiscussionSurfaces.length
  const communityAdvisoryCount = communityAdvisoryBodies.length
  const totalChannelCount =
    survivorRegistryCount +
    collectiveMemoryCount +
    hotlineCount +
    asyncDiscussionCount +
    communityAdvisoryCount

  return Object.freeze({
    isEmpty: totalChannelCount === 0,
    summary: Object.freeze({
      survivorRegistryCount,
      collectiveMemoryCount,
      hotlineCount,
      asyncDiscussionCount,
      communityAdvisoryCount,
      totalChannelCount,
      week: game.week,
    }),
    survivorRegistries: Object.freeze(survivorRegistries),
    collectiveMemoryChannels: Object.freeze(collectiveMemoryChannels),
    hotlineChannels: Object.freeze(hotlineChannels),
    asyncDiscussionSurfaces: Object.freeze(asyncDiscussionSurfaces),
    communityAdvisoryBodies: Object.freeze(communityAdvisoryBodies),
  })
}
