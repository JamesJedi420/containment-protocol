import type { CaseInstance, CaseTemplate } from '../models'
import {
  getPilotSitePacketForTemplate,
  type PilotSiteGenerationPacket,
  type SiteBuilderId,
  type SiteGenerationStageSnapshot,
  type SiteHazardId,
  type SiteInhabitantId,
  type SiteIngressId,
  type SiteLocationId,
  type SitePurposeId,
  type SiteTopologyId,
  type SiteTreasureId,
  type WeightedStageOption,
} from './packets'
import { resolveMapMetadata, type MapLayerResult } from './mapMetadata'

export type { SiteGenerationStageSnapshot } from './packets'

export interface SiteGenerationPipelineResult {
  packetId: string
  stages: SiteGenerationStageSnapshot
  tags: string[]
  spatial: {
    siteLayer: NonNullable<CaseInstance['siteLayer']>
    visibilityState: NonNullable<CaseInstance['visibilityState']>
    transitionType: NonNullable<CaseInstance['transitionType']>
    spatialFlags: string[]
  }
  mapLayer: MapLayerResult
}

function hashSeed(seedKey: string) {
  let hash = 2166136261

  for (let index = 0; index < seedKey.length; index += 1) {
    hash ^= seedKey.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function createDeterministicRng(seedKey: string) {
  let state = hashSeed(seedKey) || 1

  return () => {
    state = Math.imul(1664525, state) + 1013904223
    const unsigned = state >>> 0
    return unsigned / 0x100000000
  }
}

function resolveTotalWeight<T extends string>(options: readonly WeightedStageOption<T>[]) {
  const total = options.reduce((sum, option) => sum + Math.max(0, option.weight), 0)
  return total > 0 ? total : options.length
}

function pickWeightedOption<T extends string>(
  options: readonly WeightedStageOption<T>[],
  rng: () => number
): T {
  if (options.length === 0) {
    throw new Error('Cannot pick from an empty stage option list.')
  }

  const normalizedTotal = resolveTotalWeight(options)
  let remaining = rng() * normalizedTotal

  for (const option of options) {
    const weight = option.weight > 0 ? option.weight : normalizedTotal / options.length
    remaining -= weight
    if (remaining <= 0) {
      return option.id
    }
  }

  return options[options.length - 1]!.id
}

function pickWeightedDistinct<T extends string>(
  options: readonly WeightedStageOption<T>[],
  count: number,
  rng: () => number
): T[] {
  if (options.length === 0 || count <= 0) {
    return []
  }

  const mutable = [...options]
  const picks: T[] = []
  const max = Math.min(count, mutable.length)

  for (let index = 0; index < max; index += 1) {
    const next = pickWeightedOption(mutable, rng)
    picks.push(next)
    const pickedIndex = mutable.findIndex((entry) => entry.id === next)
    if (pickedIndex >= 0) {
      mutable.splice(pickedIndex, 1)
    }
  }

  return picks
}

function mergeUniquePreserveOrder(...lists: readonly string[][]) {
  const merged: string[] = []
  const seen = new Set<string>()

  for (const list of lists) {
    for (const entry of list) {
      if (!entry || seen.has(entry)) {
        continue
      }

      seen.add(entry)
      merged.push(entry)
    }
  }

  return merged
}

function resolveByKey<T extends string>(
  packet: PilotSiteGenerationPacket,
  collection: Readonly<Record<string, readonly WeightedStageOption<T>[]>>,
  key: string,
  fallback: readonly WeightedStageOption<T>[]
) {
  return collection[key] ?? fallback
}

function toPipelineTags(result: SiteGenerationPipelineResult) {
  return [
    `site:packet:${result.packetId}`,
    `site:purpose:${result.stages.purpose}`,
    `site:builder:${result.stages.builder}`,
    `site:location:${result.stages.location}`,
    `site:ingress:${result.stages.ingress}`,
    `site:topology:${result.stages.topology}`,
    ...result.stages.hazards.map((hazardId) => `site:hazard:${hazardId}`),
    ...result.stages.treasure.map((treasureId) => `site:treasure:${treasureId}`),
    ...result.stages.inhabitants.map((inhabitantId) => `site:inhabitant:${inhabitantId}`),
  ]
}

export function resolveSiteGenerationStages(
  templateId: string,
  rng: () => number
): SiteGenerationPipelineResult | null {
  const packet = getPilotSitePacketForTemplate(templateId)

  if (!packet) {
    return null
  }

  const purpose = pickWeightedOption(packet.purposes, rng)
  const fallbackBuilders = packet.buildersByPurpose[packet.purposes[0]!.id]
  const builders = packet.buildersByPurpose[purpose] ?? fallbackBuilders
  const builder = pickWeightedOption(builders, rng)

  const fallbackLocations = packet.locationsByPurpose[packet.purposes[0]!.id]
  const locations = packet.locationsByPurpose[purpose] ?? fallbackLocations
  const location = pickWeightedOption(locations, rng)

  const ingress = pickWeightedOption(
    resolveByKey(
      packet,
      packet.ingressByPurposeAndLocation,
      `${purpose}|${location}`,
      packet.ingressByPurposeAndLocation[`${packet.purposes[0]!.id}|${location}`] ??
        packet.ingressByPurposeAndLocation[
          `${packet.purposes[0]!.id}|${packet.locationsByPurpose[packet.purposes[0]!.id][0]!.id}`
        ]
    ),
    rng
  )

  const topology = pickWeightedOption(
    resolveByKey(
      packet,
      packet.topologyByIngressAndBuilder,
      `${ingress}|${builder}`,
      packet.topologyByIngressAndBuilder[
        `${ingress}|${packet.buildersByPurpose[packet.purposes[0]!.id][0]!.id}`
      ] ??
        packet.topologyByIngressAndBuilder[
          `${packet.ingressByPurposeAndLocation[`${packet.purposes[0]!.id}|${location}`]?.[0]?.id ?? ingress}|${packet.buildersByPurpose[packet.purposes[0]!.id][0]!.id}`
        ]
    ),
    rng
  )

  const hazards = pickWeightedDistinct(
    resolveByKey(
      packet,
      packet.hazardsByPurposeAndTopology,
      `${purpose}|${topology}`,
      packet.hazardsByPurposeAndTopology[`${packet.purposes[0]!.id}|${topology}`] ??
        packet.hazardsByPurposeAndTopology[
          `${packet.purposes[0]!.id}|${packet.topologyByIngressAndBuilder[`${ingress}|${builder}`]?.[0]?.id ?? topology}`
        ]
    ),
    2,
    rng
  )

  const treasure = pickWeightedDistinct(
    resolveByKey(
      packet,
      packet.treasureByPurposeAndLocation,
      `${purpose}|${location}`,
      packet.treasureByPurposeAndLocation[`${packet.purposes[0]!.id}|${location}`] ??
        packet.treasureByPurposeAndLocation[
          `${packet.purposes[0]!.id}|${packet.locationsByPurpose[packet.purposes[0]!.id][0]!.id}`
        ]
    ),
    2,
    rng
  )

  const inhabitants = pickWeightedDistinct(
    resolveByKey(
      packet,
      packet.inhabitantsByPurposeAndBuilder,
      `${purpose}|${builder}`,
      packet.inhabitantsByPurposeAndBuilder[
        `${packet.purposes[0]!.id}|${packet.buildersByPurpose[packet.purposes[0]!.id][0]!.id}`
      ]
    ),
    2,
    rng
  )

  const spatialProfile = packet.topologySpatialProfiles[topology]

  const result: SiteGenerationPipelineResult = {
    packetId: packet.id,
    stages: {
      purpose,
      builder,
      location,
      ingress,
      topology,
      hazards,
      treasure,
      inhabitants,
    },
    tags: [],
    spatial: {
      siteLayer: spatialProfile.siteLayer,
      visibilityState: spatialProfile.visibilityState,
      transitionType: spatialProfile.transitionType,
      spatialFlags: [...spatialProfile.spatialFlags, `ingress:${ingress}`],
    },
    mapLayer: resolveMapMetadata(
      { purpose, builder, location, ingress, topology, hazards, treasure, inhabitants },
      rng
    ),
  }

  result.tags = toPipelineTags(result)

  return result
}

export function applySiteGenerationToCase(input: {
  currentCase: CaseInstance
  template: Pick<CaseTemplate, 'templateId'>
  seedKey?: string
  rng?: () => number
}) {
  const stageRng = input.rng ?? createDeterministicRng(input.seedKey ?? input.currentCase.id)
  const generated = resolveSiteGenerationStages(input.template.templateId, stageRng)

  if (!generated) {
    return input.currentCase
  }

  const nextSpatialFlags = mergeUniquePreserveOrder(
    input.currentCase.spatialFlags ?? [],
    generated.spatial.spatialFlags
  )

  return {
    ...input.currentCase,
    tags: mergeUniquePreserveOrder(input.currentCase.tags, generated.tags),
    siteLayer: generated.spatial.siteLayer,
    visibilityState: generated.spatial.visibilityState,
    transitionType: generated.spatial.transitionType,
    spatialFlags: nextSpatialFlags,
    mapLayer: generated.mapLayer,
  }
}
