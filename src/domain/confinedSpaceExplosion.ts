/**
 * SPE-263 — confined-space explosion propagation.
 *
 * Pure caller-owned ignition and blast shaping: volatile buildup can warn
 * then ignite, and confined tunnel/shaft/corridor geometry amplifies or
 * channels the blast differently from open space. No GameState field.
 * No fluid-dynamics simulator.
 */

export const CONFINED_SPACE_EXPLOSION_OWNER = 'SPE-263' as const

export type SpaceGeometryKind = 'open' | 'tunnel' | 'shaft' | 'corridor'

export type IgnitionState = 'stable' | 'warning' | 'ignited'

export type BlastShape = 'radial_open' | 'channeled_axial' | 'amplified_confined'

export interface VolatileBuildupSnapshot {
  readonly spaceId: string
  readonly geometry: SpaceGeometryKind
  readonly volatileLevel: number
  readonly warningThreshold: number
  readonly ignitionThreshold: number
  readonly ignitionSourcePresent: boolean
}

export interface ConfinedSpaceExplosionState {
  readonly spaceId: string
  readonly geometry: SpaceGeometryKind
  readonly ignitionState: IgnitionState
  readonly warningVisible: boolean
  readonly ignited: boolean
  readonly blastShape: BlastShape | 'none'
  readonly blastIntensity: number
  readonly reasons: readonly string[]
}

function requireNonEmpty(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`confined-space explosion ${label} is required`)
  return trimmed
}

function compareAscii(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function requireFiniteNonNegative(value: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`confined-space explosion ${label} must be a finite number >= 0`)
  }
  return value
}

function requireGeometry(value: string): SpaceGeometryKind {
  if (value === 'open' || value === 'tunnel' || value === 'shaft' || value === 'corridor') {
    return value
  }
  throw new Error('confined-space explosion geometry is invalid')
}

function isConfined(geometry: SpaceGeometryKind): boolean {
  return geometry !== 'open'
}

function blastShapeFor(geometry: SpaceGeometryKind): BlastShape {
  switch (geometry) {
    case 'open':
      return 'radial_open'
    case 'tunnel':
    case 'corridor':
      return 'channeled_axial'
    case 'shaft':
      return 'amplified_confined'
    default: {
      const _exhaustive: never = geometry
      throw new Error(`confined-space explosion unexpected geometry: ${_exhaustive}`)
    }
  }
}

function intensityFor(geometry: SpaceGeometryKind, volatileLevel: number): number {
  const base = volatileLevel
  switch (geometry) {
    case 'open':
      return base
    case 'corridor':
      return base * 1.25
    case 'tunnel':
      return base * 1.5
    case 'shaft':
      return base * 2
    default: {
      const _exhaustive: never = geometry
      throw new Error(`confined-space explosion unexpected geometry: ${_exhaustive}`)
    }
  }
}

/**
 * Fail-closed create for one volatile-buildup snapshot.
 */
export function createVolatileBuildupSnapshot(
  input: VolatileBuildupSnapshot,
): VolatileBuildupSnapshot {
  const warningThreshold = requireFiniteNonNegative(input.warningThreshold, 'warningThreshold')
  const ignitionThreshold = requireFiniteNonNegative(input.ignitionThreshold, 'ignitionThreshold')
  if (ignitionThreshold < warningThreshold) {
    throw new Error(
      'confined-space explosion ignitionThreshold must be >= warningThreshold',
    )
  }
  return Object.freeze({
    spaceId: requireNonEmpty(input.spaceId, 'spaceId'),
    geometry: requireGeometry(input.geometry),
    volatileLevel: requireFiniteNonNegative(input.volatileLevel, 'volatileLevel'),
    warningThreshold,
    ignitionThreshold,
    ignitionSourcePresent: Boolean(input.ignitionSourcePresent),
  })
}

/**
 * Evaluate pre-ignition warning and confined vs open blast shaping.
 */
export function evaluateConfinedSpaceExplosion(
  input: VolatileBuildupSnapshot,
): ConfinedSpaceExplosionState {
  const snapshot = createVolatileBuildupSnapshot(input)
  const reasons: string[] = []

  const atWarning = snapshot.volatileLevel >= snapshot.warningThreshold
  const atIgnition =
    snapshot.volatileLevel >= snapshot.ignitionThreshold && snapshot.ignitionSourcePresent

  if (atWarning && !atIgnition) {
    reasons.push('warning:volatile-threshold')
  }
  if (snapshot.volatileLevel >= snapshot.ignitionThreshold && !snapshot.ignitionSourcePresent) {
    reasons.push('ignition-deferred:no-source')
  }

  if (!atIgnition) {
    return Object.freeze({
      spaceId: snapshot.spaceId,
      geometry: snapshot.geometry,
      ignitionState: atWarning ? 'warning' : 'stable',
      warningVisible: atWarning,
      ignited: false,
      blastShape: 'none',
      blastIntensity: 0,
      reasons: Object.freeze([...reasons].sort(compareAscii)),
    })
  }

  const shape = blastShapeFor(snapshot.geometry)
  const intensity = intensityFor(snapshot.geometry, snapshot.volatileLevel)
  reasons.push(`ignited:${snapshot.geometry}`)
  reasons.push(`blast:${shape}`)
  if (isConfined(snapshot.geometry)) {
    reasons.push('confined-amplification')
  } else {
    reasons.push('open-radial')
  }

  return Object.freeze({
    spaceId: snapshot.spaceId,
    geometry: snapshot.geometry,
    ignitionState: 'ignited',
    warningVisible: true,
    ignited: true,
    blastShape: shape,
    blastIntensity: intensity,
    reasons: Object.freeze([...reasons].sort(compareAscii)),
  })
}
