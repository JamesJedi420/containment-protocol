/**
 * SPE-2211 — scene geometry registry (slice 1).
 *
 * Pure caller-owned geometry facts: concealment vs cover, line of effect,
 * high ground, flanking, observation volumes, and occlusion/blind areas.
 * Condition/state for cover providers is caller-owned (SPE-1727 or feature
 * owners); this module only maps configured condition → coverBand.
 * No hit resolution, damage, armor, sensing confidence, or GameState field.
 */

export const SCENE_GEOMETRY_REGISTRY_OWNER = 'SPE-2211' as const

export type GeometryBand = 'none' | 'light' | 'medium' | 'heavy'

export type RelativeFacing = 'front' | 'flank' | 'rear'

export interface SceneGeometryFeature {
  readonly featureId: string
  readonly label: string
  /** Baseline concealment when no condition override applies. */
  readonly concealmentBand: GeometryBand
  /** Baseline cover when no condition override applies. */
  readonly coverBand: GeometryBand
  readonly lineOfEffectBlocked: boolean
  readonly highGroundEdge: boolean
  readonly flankEdge: boolean
  readonly difficultTerrain: boolean
  readonly solidBarrier: boolean
  /** Optional observation / coverage volume tag for sensing consumers. */
  readonly observationVolumeId?: string
  /** Optional occlusion / blind-area tag. */
  readonly occlusionRegionId?: string
  /**
   * Caller-owned condition → cover mapping. Condition authority stays outside
   * this registry (SPE-1727 / feature owners).
   */
  readonly coverByCondition?: Readonly<Record<string, GeometryBand>>
}

export interface SceneGeometryResolutionInput {
  readonly feature: SceneGeometryFeature
  /** Authoritative condition/state from SPE-1727 or feature owner. */
  readonly conditionState?: string
  /** Optional relative facing for bounded front/flank/rear exposure facts. */
  readonly relativeFacing?: RelativeFacing
}

export interface SceneGeometryFacts {
  readonly featureId: string
  readonly concealmentBand: GeometryBand
  readonly coverBand: GeometryBand
  readonly lineOfEffectBlocked: boolean
  readonly highGroundEdge: boolean
  readonly flankEdge: boolean
  readonly difficultTerrain: boolean
  readonly solidBarrier: boolean
  readonly observationVolumeId?: string
  readonly occlusionRegionId?: string
  readonly relativeExposureBand?: GeometryBand
  readonly conditionStateApplied?: string
}

const BANDS: readonly GeometryBand[] = ['none', 'light', 'medium', 'heavy']

function isGeometryBand(value: unknown): value is GeometryBand {
  return typeof value === 'string' && (BANDS as readonly string[]).includes(value)
}

function requireNonEmpty(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`scene geometry ${label} is required`)
  return trimmed
}

function bandRank(band: GeometryBand): number {
  switch (band) {
    case 'none':
      return 0
    case 'light':
      return 1
    case 'medium':
      return 2
    case 'heavy':
      return 3
    default: {
      const _exhaustive: never = band
      return _exhaustive
    }
  }
}

function degradeBand(band: GeometryBand, steps: number): GeometryBand {
  const next = Math.max(0, bandRank(band) - Math.max(0, Math.trunc(steps)))
  return BANDS[next]!
}

/**
 * Fail-closed create for one scene-geometry feature.
 */
export function createSceneGeometryFeature(
  input: SceneGeometryFeature,
): SceneGeometryFeature {
  const featureId = requireNonEmpty(input.featureId, 'featureId')
  const label = requireNonEmpty(input.label, 'label')
  if (!isGeometryBand(input.concealmentBand)) {
    throw new Error('scene geometry concealmentBand is invalid')
  }
  if (!isGeometryBand(input.coverBand)) {
    throw new Error('scene geometry coverBand is invalid')
  }

  const coverByConditionEntries = Object.entries(input.coverByCondition ?? {})
  const coverByCondition: Record<string, GeometryBand> = {}
  for (const [rawKey, band] of coverByConditionEntries) {
    const key = rawKey.trim()
    if (!key) throw new Error('scene geometry coverByCondition keys must be non-empty')
    if (!isGeometryBand(band)) {
      throw new Error(`scene geometry coverByCondition[${key}] is invalid`)
    }
    coverByCondition[key] = band
  }

  const observationVolumeId = input.observationVolumeId?.trim() || undefined
  const occlusionRegionId = input.occlusionRegionId?.trim() || undefined

  return Object.freeze({
    featureId,
    label,
    concealmentBand: input.concealmentBand,
    coverBand: input.coverBand,
    lineOfEffectBlocked: input.lineOfEffectBlocked === true,
    highGroundEdge: input.highGroundEdge === true,
    flankEdge: input.flankEdge === true,
    difficultTerrain: input.difficultTerrain === true,
    solidBarrier: input.solidBarrier === true,
    ...(observationVolumeId ? { observationVolumeId } : {}),
    ...(occlusionRegionId ? { occlusionRegionId } : {}),
    ...(Object.keys(coverByCondition).length > 0
      ? { coverByCondition: Object.freeze({ ...coverByCondition }) }
      : {}),
  })
}

/**
 * Validate uniqueness and band integrity across a registry set.
 */
export function validateSceneGeometryRegistry(
  features: readonly SceneGeometryFeature[],
): string[] {
  const errors: string[] = []
  const seen = new Set<string>()
  for (const feature of features) {
    if (seen.has(feature.featureId)) {
      errors.push(`duplicate featureId: ${feature.featureId}`)
    }
    seen.add(feature.featureId)
    if (!feature.featureId.trim()) errors.push('missing featureId')
    if (!feature.label.trim()) errors.push(`${feature.featureId}: missing label`)
    if (!isGeometryBand(feature.concealmentBand)) {
      errors.push(`${feature.featureId}: invalid concealmentBand`)
    }
    if (!isGeometryBand(feature.coverBand)) {
      errors.push(`${feature.featureId}: invalid coverBand`)
    }
  }
  return errors
}

function resolveCoverBand(
  feature: SceneGeometryFeature,
  conditionState: string | undefined,
): { coverBand: GeometryBand; conditionStateApplied?: string } {
  if (!conditionState) {
    return { coverBand: feature.coverBand }
  }
  const key = conditionState.trim()
  if (!key) {
    return { coverBand: feature.coverBand }
  }
  const mapping = feature.coverByCondition
  if (!mapping || !Object.prototype.hasOwnProperty.call(mapping, key)) {
    return { coverBand: feature.coverBand }
  }
  const mapped = mapping[key]
  if (!isGeometryBand(mapped)) {
    return { coverBand: feature.coverBand }
  }
  return { coverBand: mapped, conditionStateApplied: key }
}

function resolveRelativeExposure(
  coverBand: GeometryBand,
  relativeFacing: RelativeFacing | undefined,
  flankEdge: boolean,
): GeometryBand | undefined {
  if (!relativeFacing) return undefined
  switch (relativeFacing) {
    case 'front':
      return coverBand
    case 'flank':
      return degradeBand(coverBand, flankEdge ? 1 : 2)
    case 'rear':
      return degradeBand(coverBand, 2)
    default: {
      const _exhaustive: never = relativeFacing
      return _exhaustive
    }
  }
}

/**
 * Resolve geometry facts for one feature. Reads caller-owned condition state
 * without mutating or persisting it.
 */
export function resolveSceneGeometryFacts(
  input: SceneGeometryResolutionInput,
): SceneGeometryFacts {
  const feature = input.feature
  const { coverBand, conditionStateApplied } = resolveCoverBand(
    feature,
    input.conditionState,
  )
  const relativeExposureBand = resolveRelativeExposure(
    coverBand,
    input.relativeFacing,
    feature.flankEdge,
  )

  return Object.freeze({
    featureId: feature.featureId,
    concealmentBand: feature.concealmentBand,
    coverBand,
    lineOfEffectBlocked: feature.lineOfEffectBlocked,
    highGroundEdge: feature.highGroundEdge,
    flankEdge: feature.flankEdge,
    difficultTerrain: feature.difficultTerrain,
    solidBarrier: feature.solidBarrier,
    ...(feature.observationVolumeId
      ? { observationVolumeId: feature.observationVolumeId }
      : {}),
    ...(feature.occlusionRegionId ? { occlusionRegionId: feature.occlusionRegionId } : {}),
    ...(relativeExposureBand !== undefined ? { relativeExposureBand } : {}),
    ...(conditionStateApplied ? { conditionStateApplied } : {}),
  })
}
