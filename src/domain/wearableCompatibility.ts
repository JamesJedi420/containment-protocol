/**
 * SPE-3394 — wearable layer × body-region compatibility resolver.
 *
 * Pure occupancy legality for simultaneous worn protective equipment. Consumes
 * SPE-120 body-region identifiers (and coverage-group expansion). Integrates
 * through canonical loadout assignment (SPE-2828 / SPE-2840); does not own
 * inventory, instance location, damage mitigation, or a second slot authority.
 */

import { expandCoveredRegionRefs, type BodyRegionId } from './bodyRegion'

export const WEARABLE_COMPATIBILITY_OWNER = 'SPE-3394' as const

/** Bounded wearable-layer occupancy vocabulary (C917). Not protection-order. */
export const WEARABLE_LAYER_IDS = ['skin', 'under', 'mid', 'shell', 'outer'] as const
export type WearableLayerId = (typeof WEARABLE_LAYER_IDS)[number]

const WEARABLE_LAYER_ID_SET = new Set<string>(WEARABLE_LAYER_IDS)

export function isWearableLayerId(value: string): value is WearableLayerId {
  return WEARABLE_LAYER_ID_SET.has(value)
}

export interface WearableOccupancy {
  readonly occupiedLayers: readonly WearableLayerId[]
  readonly coveredRegions: readonly BodyRegionId[]
}

export interface WearableOccupancyAuthoring {
  readonly occupiedLayers: readonly string[]
  readonly coveredRegions: readonly string[]
}

export type WearableOccupancyValidationIssue =
  | 'empty-layers'
  | 'empty-regions'
  | 'unknown-layer'
  | 'unknown-region'
  | 'duplicate-layer'
  | 'duplicate-region'

export interface WearableOccupancyValidationResult {
  readonly valid: boolean
  readonly occupancy?: WearableOccupancy
  readonly issues: WearableOccupancyValidationIssue[]
  readonly unknownLayers: string[]
  readonly unknownRegions: string[]
}

export interface WearableConflictReason {
  readonly code: 'layer_region_overlap'
  readonly blockingItemId: string
  readonly conflictingItemId: string
  readonly overlappingLayers: WearableLayerId[]
  readonly overlappingRegions: BodyRegionId[]
}

export interface WearableCompatibilityResult {
  readonly compatible: boolean
  readonly conflicts: WearableConflictReason[]
}

export interface WearableOccupiedItem {
  readonly itemId: string
  readonly occupancy: WearableOccupancy
}

function uniqueSortedLayers(layers: readonly WearableLayerId[]): WearableLayerId[] {
  const seen = new Set<WearableLayerId>()
  const out: WearableLayerId[] = []
  for (const layer of WEARABLE_LAYER_IDS) {
    if (layers.includes(layer) && !seen.has(layer)) {
      seen.add(layer)
      out.push(layer)
    }
  }
  return out
}

function uniqueSortedRegions(regions: readonly BodyRegionId[]): BodyRegionId[] {
  const order: BodyRegionId[] = [
    'head',
    'torso',
    'arm_left',
    'arm_right',
    'leg_left',
    'leg_right',
  ]
  const seen = new Set<BodyRegionId>()
  const out: BodyRegionId[] = []
  for (const region of order) {
    if (regions.includes(region) && !seen.has(region)) {
      seen.add(region)
      out.push(region)
    }
  }
  return out
}

function intersectSorted<T extends string>(left: readonly T[], right: readonly T[]): T[] {
  const rightSet = new Set(right)
  return left.filter((value) => rightSet.has(value))
}

/**
 * Validate and normalize authored occupancy. Coverage-group shorthand expands
 * through SPE-120; unknown layers/regions fail closed.
 */
export function validateWearableOccupancyAuthoring(
  authoring: WearableOccupancyAuthoring | null | undefined
): WearableOccupancyValidationResult {
  const issues: WearableOccupancyValidationIssue[] = []
  const unknownLayers: string[] = []
  const unknownRegions: string[] = []

  if (!authoring) {
    return {
      valid: false,
      issues: ['empty-layers', 'empty-regions'],
      unknownLayers,
      unknownRegions,
    }
  }

  const rawLayers = Array.isArray(authoring.occupiedLayers) ? authoring.occupiedLayers : []
  const rawRegions = Array.isArray(authoring.coveredRegions) ? authoring.coveredRegions : []

  if (rawLayers.length === 0) {
    issues.push('empty-layers')
  }
  if (rawRegions.length === 0) {
    issues.push('empty-regions')
  }

  const layers: WearableLayerId[] = []
  const layerSeen = new Set<WearableLayerId>()
  for (const raw of rawLayers) {
    const value = typeof raw === 'string' ? raw.trim() : ''
    if (!isWearableLayerId(value)) {
      unknownLayers.push(String(raw))
      if (!issues.includes('unknown-layer')) {
        issues.push('unknown-layer')
      }
      continue
    }
    if (layerSeen.has(value)) {
      if (!issues.includes('duplicate-layer')) {
        issues.push('duplicate-layer')
      }
      continue
    }
    layerSeen.add(value)
    layers.push(value)
  }

  const normalizedRegionRefs = rawRegions.map((raw) =>
    typeof raw === 'string' ? raw.trim() : String(raw)
  )
  const regionRefSeen = new Set<string>()
  for (const ref of normalizedRegionRefs) {
    if (!ref) {
      continue
    }
    if (regionRefSeen.has(ref)) {
      if (!issues.includes('duplicate-region')) {
        issues.push('duplicate-region')
      }
      break
    }
    regionRefSeen.add(ref)
  }

  const regionExpansion = expandCoveredRegionRefs(normalizedRegionRefs)
  if (!regionExpansion.ok) {
    unknownRegions.push(...regionExpansion.unknownRefs)
    if (!issues.includes('unknown-region')) {
      issues.push('unknown-region')
    }
  }

  const regions =
    regionExpansion.ok && regionExpansion.regions.length > 0
      ? uniqueSortedRegions(regionExpansion.regions)
      : []

  if (issues.length > 0 || layers.length === 0 || regions.length === 0) {
    return {
      valid: false,
      issues,
      unknownLayers,
      unknownRegions,
    }
  }

  return {
    valid: true,
    occupancy: {
      occupiedLayers: uniqueSortedLayers(layers),
      coveredRegions: regions,
    },
    issues: [],
    unknownLayers: [],
    unknownRegions: [],
  }
}

/**
 * Two worn items conflict when occupied-layer sets intersect AND covered-region
 * sets intersect. Multi-layer items reserve every declared layer across every
 * declared region for this check.
 */
export function resolveWearableCompatibility(
  worn: readonly WearableOccupiedItem[]
): WearableCompatibilityResult {
  const conflicts: WearableConflictReason[] = []
  const items = worn.filter((entry) => entry.itemId && entry.occupancy)

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const left = items[i]
      const right = items[j]
      const overlappingLayers = intersectSorted(
        uniqueSortedLayers(left.occupancy.occupiedLayers),
        uniqueSortedLayers(right.occupancy.occupiedLayers)
      )
      if (overlappingLayers.length === 0) {
        continue
      }
      const overlappingRegions = intersectSorted(
        uniqueSortedRegions(left.occupancy.coveredRegions),
        uniqueSortedRegions(right.occupancy.coveredRegions)
      )
      if (overlappingRegions.length === 0) {
        continue
      }

      const [blockingItemId, conflictingItemId] =
        left.itemId < right.itemId
          ? [left.itemId, right.itemId]
          : [right.itemId, left.itemId]
      conflicts.push({
        code: 'layer_region_overlap',
        blockingItemId,
        conflictingItemId,
        overlappingLayers,
        overlappingRegions,
      })
    }
  }

  conflicts.sort((a, b) => {
    if (a.blockingItemId < b.blockingItemId) {
      return -1
    }
    if (a.blockingItemId > b.blockingItemId) {
      return 1
    }
    if (a.conflictingItemId < b.conflictingItemId) {
      return -1
    }
    if (a.conflictingItemId > b.conflictingItemId) {
      return 1
    }
    return 0
  })

  return {
    compatible: conflicts.length === 0,
    conflicts,
  }
}

export function formatWearableConflictDiagnostic(conflict: WearableConflictReason): string {
  return [
    `wearable-overlap:${conflict.blockingItemId}+${conflict.conflictingItemId}`,
    `layers=${conflict.overlappingLayers.join(',')}`,
    `regions=${conflict.overlappingRegions.join(',')}`,
  ].join(':')
}
