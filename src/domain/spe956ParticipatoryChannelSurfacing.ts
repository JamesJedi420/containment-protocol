/**
 * SPE-2646 / SPE-956: read-only surfacing for participatory channel weekly transitions.
 *
 * Compares pre-tick vs post-tick persisted five-map channel envelopes and formats
 * transition summaries for weekly report notes — safe labels only; no evaluator calls.
 */

import type {
  Spe956AsyncDiscussionSurfaceRecordsMap,
  Spe956CollectiveMemoryChannelRecordsMap,
  Spe956CommunityAdvisoryBodyRecordsMap,
  Spe956HotlineChannelRecordsMap,
  Spe956ParticipatoryChannelWeeklyFields,
  Spe956SurvivorInformalRegistryRecordsMap,
} from './spe956ParticipatoryChannelPersistence'

export type Spe956ParticipatoryChannelWeeklyTransitionKind = 'channel_elapsed_weeks_advanced'

export type Spe956ParticipatoryChannelKind =
  | 'survivor_informal_registry'
  | 'collective_memory'
  | 'hotline'
  | 'async_discussion'
  | 'community_advisory'

export interface Spe956ParticipatoryChannelWeeklyTransitionSummary {
  readonly channelKind: Spe956ParticipatoryChannelKind
  readonly recordId: string
  readonly label: string
  readonly transitionKinds: readonly Spe956ParticipatoryChannelWeeklyTransitionKind[]
  readonly priorElapsedChannelWeeks: number
  readonly nextElapsedChannelWeeks: number
  readonly structuredReasons: readonly string[]
}

type ChannelMapBundle = {
  readonly spe956SurvivorInformalRegistryRecords: Spe956SurvivorInformalRegistryRecordsMap
  readonly spe956CollectiveMemoryChannelRecords: Spe956CollectiveMemoryChannelRecordsMap
  readonly spe956HotlineChannelRecords: Spe956HotlineChannelRecordsMap
  readonly spe956AsyncDiscussionSurfaceRecords: Spe956AsyncDiscussionSurfaceRecordsMap
  readonly spe956CommunityAdvisoryBodyRecords: Spe956CommunityAdvisoryBodyRecordsMap
}

const CHANNEL_KIND_LABELS: Record<Spe956ParticipatoryChannelKind, string> = {
  survivor_informal_registry: 'Survivor informal registry',
  collective_memory: 'Collective memory channel',
  hotline: 'Hotline channel',
  async_discussion: 'Async discussion surface',
  community_advisory: 'Community advisory body',
}

function compareIdsByCodeUnit(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function elapsedWeeks(channel: Spe956ParticipatoryChannelWeeklyFields | undefined): number {
  return channel?.elapsedChannelWeeks ?? 0
}

function composeChannelWeeklyTransitionSummary(input: {
  channelKind: Spe956ParticipatoryChannelKind
  recordId: string
  prior: Spe956ParticipatoryChannelWeeklyFields
  next: Spe956ParticipatoryChannelWeeklyFields
}): Spe956ParticipatoryChannelWeeklyTransitionSummary | undefined {
  const priorElapsed = elapsedWeeks(input.prior)
  const nextElapsed = elapsedWeeks(input.next)

  if (priorElapsed === nextElapsed) {
    return undefined
  }

  return Object.freeze({
    channelKind: input.channelKind,
    recordId: input.recordId,
    label: `${CHANNEL_KIND_LABELS[input.channelKind]} (${input.recordId})`,
    transitionKinds: Object.freeze(['channel_elapsed_weeks_advanced'] as const),
    priorElapsedChannelWeeks: priorElapsed,
    nextElapsedChannelWeeks: nextElapsed,
    structuredReasons: Object.freeze([`elapsed:${priorElapsed}->${nextElapsed}`]),
  })
}

function composeMapWeeklyTransitionSummaries<T extends Spe956ParticipatoryChannelWeeklyFields>(input: {
  channelKind: Spe956ParticipatoryChannelKind
  priorMap: Record<string, T>
  nextMap: Record<string, T>
}): Spe956ParticipatoryChannelWeeklyTransitionSummary[] {
  const summaries: Spe956ParticipatoryChannelWeeklyTransitionSummary[] = []

  for (const recordId of Object.keys(input.nextMap).sort(compareIdsByCodeUnit)) {
    const next = input.nextMap[recordId]
    const prior = input.priorMap[recordId]
    if (!next || !prior) {
      continue
    }

    const summary = composeChannelWeeklyTransitionSummary({
      channelKind: input.channelKind,
      recordId,
      prior,
      next,
    })
    if (summary) {
      summaries.push(summary)
    }
  }

  return summaries
}

/**
 * Builds transition summaries for participatory channel records that changed during the weekly tick.
 * Empty maps and unchanged records yield []. Sort is byte-stable by recordId then channelKind.
 */
export function composeSpe956ParticipatoryChannelWeeklyTransitionSummaries(input: {
  priorMaps: ChannelMapBundle | null | undefined
  nextMaps: ChannelMapBundle | null | undefined
}): readonly Spe956ParticipatoryChannelWeeklyTransitionSummary[] {
  const priorMaps = input.priorMaps ?? {
    spe956SurvivorInformalRegistryRecords: {},
    spe956CollectiveMemoryChannelRecords: {},
    spe956HotlineChannelRecords: {},
    spe956AsyncDiscussionSurfaceRecords: {},
    spe956CommunityAdvisoryBodyRecords: {},
  }
  const nextMaps = input.nextMaps ?? {
    spe956SurvivorInformalRegistryRecords: {},
    spe956CollectiveMemoryChannelRecords: {},
    spe956HotlineChannelRecords: {},
    spe956AsyncDiscussionSurfaceRecords: {},
    spe956CommunityAdvisoryBodyRecords: {},
  }

  const summaries: Spe956ParticipatoryChannelWeeklyTransitionSummary[] = [
    ...composeMapWeeklyTransitionSummaries({
      channelKind: 'survivor_informal_registry',
      priorMap: priorMaps.spe956SurvivorInformalRegistryRecords,
      nextMap: nextMaps.spe956SurvivorInformalRegistryRecords,
    }),
    ...composeMapWeeklyTransitionSummaries({
      channelKind: 'collective_memory',
      priorMap: priorMaps.spe956CollectiveMemoryChannelRecords,
      nextMap: nextMaps.spe956CollectiveMemoryChannelRecords,
    }),
    ...composeMapWeeklyTransitionSummaries({
      channelKind: 'hotline',
      priorMap: priorMaps.spe956HotlineChannelRecords,
      nextMap: nextMaps.spe956HotlineChannelRecords,
    }),
    ...composeMapWeeklyTransitionSummaries({
      channelKind: 'async_discussion',
      priorMap: priorMaps.spe956AsyncDiscussionSurfaceRecords,
      nextMap: nextMaps.spe956AsyncDiscussionSurfaceRecords,
    }),
    ...composeMapWeeklyTransitionSummaries({
      channelKind: 'community_advisory',
      priorMap: priorMaps.spe956CommunityAdvisoryBodyRecords,
      nextMap: nextMaps.spe956CommunityAdvisoryBodyRecords,
    }),
  ]

  return Object.freeze(
    [...summaries].sort((left, right) => {
      const byId = compareIdsByCodeUnit(left.recordId, right.recordId)
      if (byId !== 0) {
        return byId
      }
      return compareIdsByCodeUnit(left.channelKind, right.channelKind)
    })
  )
}

export function formatSpe956ParticipatoryChannelWeeklyTransitionKindLabel(
  kind: Spe956ParticipatoryChannelWeeklyTransitionKind
): string {
  switch (kind) {
    case 'channel_elapsed_weeks_advanced':
      return 'Channel elapsed weeks advanced'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

export function formatSpe956ParticipatoryChannelWeeklyTransitionNoteContent(
  summary: Spe956ParticipatoryChannelWeeklyTransitionSummary
): string {
  const kindLabels = summary.transitionKinds.map((kind) =>
    formatSpe956ParticipatoryChannelWeeklyTransitionKindLabel(kind)
  )

  return `Participatory channel weekly transition — ${summary.label}: ${kindLabels.join('; ')}. Elapsed ${String(summary.priorElapsedChannelWeeks)} → ${String(summary.nextElapsedChannelWeeks)}.`
}
