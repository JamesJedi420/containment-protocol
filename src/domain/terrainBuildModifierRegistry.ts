/**
 * SPE-3356 slice 1: deterministic terrain-based build modifier registry.
 *
 * Compact buildability outputs for regional plots. Does not implement construction,
 * facility placement, or land-claim authority. Legal/ownership permission remains
 * separate (SPE-3355). Downstream consumers (SPE-1052) may read these modifiers.
 */

export type TerrainConditionId = string

export const BUILDABILITY_CLASSES = [
  'buildable',
  'no_build',
  'restricted_build',
  'contaminated',
  'unstable',
  'improved',
  'obstructed',
  'scarred',
  'costly',
  'requires_clearance',
] as const
export type BuildabilityClass = (typeof BUILDABILITY_CLASSES)[number]

export const SUPPORT_CAPABILITY_CLASSES = [
  'lightweight',
  'medium',
  'heavy',
  'specialized',
  'clearance_dependent',
] as const
export type SupportCapabilityClass = (typeof SUPPORT_CAPABILITY_CLASSES)[number]

export interface TerrainBuildModifier {
  readonly conditionId: TerrainConditionId
  readonly label: string
  readonly buildability: BuildabilityClass
  readonly supportCapabilities: readonly SupportCapabilityClass[]
  readonly costMultiplier: number
  readonly requiresClearance: boolean
  readonly isPermanentScar: boolean
  readonly notes?: string
}

export interface BuildabilityLookupResult {
  readonly conditionId: TerrainConditionId
  readonly buildability: BuildabilityClass
  readonly canBuildLightweight: boolean
  readonly canBuildMedium: boolean
  readonly canBuildHeavy: boolean
  readonly costMultiplier: number
  readonly blockedReason?: string
}

const REGISTRY: readonly TerrainBuildModifier[] = [
  {
    conditionId: 'open_ground',
    label: 'Open prepared ground',
    buildability: 'buildable',
    supportCapabilities: ['lightweight', 'medium', 'heavy'],
    costMultiplier: 1.0,
    requiresClearance: false,
    isPermanentScar: false,
  },
  {
    conditionId: 'contaminated_plot',
    label: 'Contaminated residual hazard',
    buildability: 'contaminated',
    supportCapabilities: ['clearance_dependent'],
    costMultiplier: 2.5,
    requiresClearance: true,
    isPermanentScar: true,
    notes: 'Prevents ordinary construction until clearance/remediation.',
  },
  {
    conditionId: 'unstable_marsh',
    label: 'Unstable marsh / bog',
    buildability: 'unstable',
    supportCapabilities: ['lightweight', 'clearance_dependent'],
    costMultiplier: 1.8,
    requiresClearance: true,
    isPermanentScar: false,
  },
  {
    conditionId: 'improved_land',
    label: 'Improved / prepared land',
    buildability: 'improved',
    supportCapabilities: ['lightweight', 'medium', 'heavy', 'specialized'],
    costMultiplier: 0.75,
    requiresClearance: false,
    isPermanentScar: false,
  },
  {
    conditionId: 'obstructed_route',
    label: 'Obstructed route edge',
    buildability: 'obstructed',
    supportCapabilities: [],
    costMultiplier: 3.0,
    requiresClearance: true,
    isPermanentScar: true,
  },
]

export function lookupBuildModifier(conditionId: TerrainConditionId): TerrainBuildModifier | undefined {
  return REGISTRY.find((entry) => entry.conditionId === conditionId)
}

export function resolveBuildability(conditionId: TerrainConditionId): BuildabilityLookupResult | undefined {
  const entry = lookupBuildModifier(conditionId)
  if (!entry) return undefined

  const supports = new Set(entry.supportCapabilities)
  const canBuildLightweight = supports.has('lightweight') || supports.has('medium') || supports.has('heavy')
  const canBuildMedium = supports.has('medium') || supports.has('heavy')
  const canBuildHeavy = supports.has('heavy')

  let blockedReason: string | undefined
  if (entry.buildability === 'no_build' || entry.buildability === 'obstructed') {
    blockedReason = entry.buildability
  } else if (entry.requiresClearance && entry.buildability !== 'improved') {
    blockedReason = 'requires_clearance'
  }

  return {
    conditionId: entry.conditionId,
    buildability: entry.buildability,
    canBuildLightweight,
    canBuildMedium,
    canBuildHeavy,
    costMultiplier: entry.costMultiplier,
    blockedReason,
  }
}

export function listTerrainConditions(): readonly TerrainBuildModifier[] {
  return REGISTRY
}
