/**
 * SPE-3186 — scene difficulty and mitigation resolver.
 *
 * Canonical deterministic projection of scene-level difficulty drivers and
 * accepted mitigations for action/phase/encounter consumers. Does not replace
 * SPE-62 / SPE-2217 / SPE-1489 / SPE-1910 / SPE-3044 / SPE-1366 / SPE-3107.
 *
 * No ICRPG Target/Easy/Hard/Effort/Hearts terminology. No GameState field.
 */

export const SCENE_DIFFICULTY_MITIGATION_OWNER = 'SPE-3186' as const
export const SCENE_DIFFICULTY_MITIGATION_SCHEMA_VERSION = 'spe-3186.v1' as const

export const SCENE_DIFFICULTY_DRIVERS = [
  'darkness',
  'crowding',
  'weather',
  'legal_pressure',
  'hostile_signal',
  'unstable_terrain',
  'noise',
  'confusion',
  'exposure',
  'access_friction',
] as const
export type SceneDifficultyDriver = (typeof SCENE_DIFFICULTY_DRIVERS)[number]

export const SCENE_MITIGATION_KINDS = [
  'lighting',
  'barricades',
  'stabilizers',
  'diagnostics',
  'maps',
  'scanners',
  'ppe',
  'social_access',
  'route_preparation',
  'environmental_controls',
] as const
export type SceneMitigationKind = (typeof SCENE_MITIGATION_KINDS)[number]

export const CONFIDENCE_BANDS = ['low', 'moderate', 'high', 'confirmed'] as const
export type ConfidenceBand = (typeof CONFIDENCE_BANDS)[number]

export const DIFFICULTY_BANDS = [
  'trivial',
  'routine',
  'elevated',
  'severe',
  'critical',
] as const
export type DifficultyBand = (typeof DIFFICULTY_BANDS)[number]

export const RESOLVER_REASON_CODES = [
  'resolved',
  'bypassed_no_stakes',
  'malformed_input',
  'unknown_driver',
  'unknown_mitigation',
  'unknown_confidence',
  'duplicate_driver',
  'duplicate_mitigation',
] as const
export type ResolverReasonCode = (typeof RESOLVER_REASON_CODES)[number]

const DRIVER_WEIGHT: Readonly<Record<SceneDifficultyDriver, number>> = Object.freeze({
  darkness: 2,
  crowding: 2,
  weather: 2,
  legal_pressure: 3,
  hostile_signal: 3,
  unstable_terrain: 2,
  noise: 1,
  confusion: 2,
  exposure: 3,
  access_friction: 2,
})

const MITIGATION_RELIEF: Readonly<Record<SceneMitigationKind, number>> = Object.freeze({
  lighting: 2,
  barricades: 2,
  stabilizers: 2,
  diagnostics: 1,
  maps: 1,
  scanners: 1,
  ppe: 2,
  social_access: 2,
  route_preparation: 2,
  environmental_controls: 2,
})

export interface ProvenanceRef {
  readonly sourceId: string
  readonly confidence: ConfidenceBand
}

export interface SceneDifficultyDriverInput {
  readonly driver: string
  readonly intensity: number
  readonly provenance?: ProvenanceRef | null
}

export interface SceneMitigationInput {
  readonly mitigationId: string
  readonly kind: string
  readonly strength: number
  readonly provenance?: ProvenanceRef | null
}

export interface SceneDifficultyResolveInput {
  readonly sceneId: string
  readonly drivers: readonly SceneDifficultyDriverInput[]
  readonly mitigations?: readonly SceneMitigationInput[]
  /** When true, skip difficulty projection (no meaningful stakes). */
  readonly noStakes?: boolean
}

export interface ResolvedDriver {
  readonly driver: SceneDifficultyDriver
  readonly intensity: number
  readonly weight: number
  readonly provenance: ProvenanceRef | null
}

export interface ResolvedMitigation {
  readonly mitigationId: string
  readonly kind: SceneMitigationKind
  readonly strength: number
  readonly relief: number
  readonly provenance: ProvenanceRef | null
}

export interface SceneDifficultyProjection {
  readonly schemaVersion: typeof SCENE_DIFFICULTY_MITIGATION_SCHEMA_VERSION
  readonly owner: typeof SCENE_DIFFICULTY_MITIGATION_OWNER
  readonly sceneId: string
  readonly bypassed: boolean
  readonly difficultyBand: DifficultyBand
  readonly rawPressure: number
  readonly mitigatedPressure: number
  readonly drivers: readonly ResolvedDriver[]
  readonly mitigations: readonly ResolvedMitigation[]
  readonly consumerHint: 'phase_action_encounter'
  readonly reasonCode: ResolverReasonCode
}

export type ResolveSceneDifficultyResult =
  | { readonly ok: true; readonly projection: SceneDifficultyProjection }
  | {
      readonly ok: false
      readonly reasonCode: ResolverReasonCode
      readonly detail: string
    }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isDriver(value: unknown): value is SceneDifficultyDriver {
  return (
    typeof value === 'string' &&
    (SCENE_DIFFICULTY_DRIVERS as readonly string[]).includes(value)
  )
}

function isMitigation(value: unknown): value is SceneMitigationKind {
  return (
    typeof value === 'string' &&
    (SCENE_MITIGATION_KINDS as readonly string[]).includes(value)
  )
}

function isConfidence(value: unknown): value is ConfidenceBand {
  return (
    typeof value === 'string' &&
    (CONFIDENCE_BANDS as readonly string[]).includes(value)
  )
}

function bandFromPressure(pressure: number): DifficultyBand {
  if (pressure <= 0) return 'trivial'
  if (pressure <= 2) return 'routine'
  if (pressure <= 5) return 'elevated'
  if (pressure <= 8) return 'severe'
  return 'critical'
}

function validateProvenance(
  provenance: ProvenanceRef | null | undefined
):
  | { readonly ok: true; readonly provenance: ProvenanceRef | null }
  | { readonly ok: false; readonly reasonCode: ResolverReasonCode; readonly detail: string } {
  if (provenance == null) return { ok: true, provenance: null }
  if (!isNonEmptyString(provenance.sourceId) || !isConfidence(provenance.confidence)) {
    return {
      ok: false,
      reasonCode: 'unknown_confidence',
      detail: 'provenance requires sourceId and confidence band',
    }
  }
  return {
    ok: true,
    provenance: Object.freeze({
      sourceId: provenance.sourceId.trim(),
      confidence: provenance.confidence,
    }),
  }
}

/**
 * Resolve scene difficulty from drivers + mitigations without mutating inputs.
 * Underlying driver records remain caller-owned scene truth.
 */
export function resolveSceneDifficulty(
  input: SceneDifficultyResolveInput | null | undefined
): ResolveSceneDifficultyResult {
  if (input == null || !isNonEmptyString(input.sceneId)) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      detail: 'sceneId required',
    }
  }

  if (input.noStakes === true) {
    return {
      ok: true,
      projection: Object.freeze({
        schemaVersion: SCENE_DIFFICULTY_MITIGATION_SCHEMA_VERSION,
        owner: SCENE_DIFFICULTY_MITIGATION_OWNER,
        sceneId: input.sceneId.trim(),
        bypassed: true,
        difficultyBand: 'trivial',
        rawPressure: 0,
        mitigatedPressure: 0,
        drivers: Object.freeze([]),
        mitigations: Object.freeze([]),
        consumerHint: 'phase_action_encounter',
        reasonCode: 'bypassed_no_stakes',
      }),
    }
  }

  if (!Array.isArray(input.drivers) || input.drivers.length === 0) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      detail: 'drivers required unless noStakes',
    }
  }

  const seenDrivers = new Set<string>()
  const drivers: ResolvedDriver[] = []
  let rawPressure = 0

  for (const raw of input.drivers) {
    if (!isDriver(raw?.driver)) {
      return {
        ok: false,
        reasonCode: 'unknown_driver',
        detail: String(raw?.driver),
      }
    }
    if (seenDrivers.has(raw.driver)) {
      return {
        ok: false,
        reasonCode: 'duplicate_driver',
        detail: raw.driver,
      }
    }
    if (
      typeof raw.intensity !== 'number' ||
      !Number.isInteger(raw.intensity) ||
      raw.intensity < 1 ||
      raw.intensity > 3
    ) {
      return {
        ok: false,
        reasonCode: 'malformed_input',
        detail: `intensity for ${raw.driver} must be integer 1–3`,
      }
    }
    const provenance = validateProvenance(raw.provenance)
    if (!provenance.ok) return provenance
    seenDrivers.add(raw.driver)
    const weight = DRIVER_WEIGHT[raw.driver] * raw.intensity
    rawPressure += weight
    drivers.push(
      Object.freeze({
        driver: raw.driver,
        intensity: raw.intensity,
        weight,
        provenance: provenance.provenance,
      })
    )
  }

  if (input.mitigations != null && !Array.isArray(input.mitigations)) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      detail: 'mitigations must be an array',
    }
  }

  const seenMitigations = new Set<string>()
  const mitigations: ResolvedMitigation[] = []
  let reliefTotal = 0

  for (const raw of input.mitigations ?? []) {
    if (!isNonEmptyString(raw?.mitigationId)) {
      return {
        ok: false,
        reasonCode: 'malformed_input',
        detail: 'mitigationId required',
      }
    }
    const mitigationId = raw.mitigationId.trim()
    if (seenMitigations.has(mitigationId)) {
      return {
        ok: false,
        reasonCode: 'duplicate_mitigation',
        detail: mitigationId,
      }
    }
    if (!isMitigation(raw.kind)) {
      return {
        ok: false,
        reasonCode: 'unknown_mitigation',
        detail: String(raw.kind),
      }
    }
    if (
      typeof raw.strength !== 'number' ||
      !Number.isInteger(raw.strength) ||
      raw.strength < 1 ||
      raw.strength > 3
    ) {
      return {
        ok: false,
        reasonCode: 'malformed_input',
        detail: `strength for ${mitigationId} must be integer 1–3`,
      }
    }
    const provenance = validateProvenance(raw.provenance)
    if (!provenance.ok) return provenance
    seenMitigations.add(mitigationId)
    const relief = MITIGATION_RELIEF[raw.kind] * raw.strength
    reliefTotal += relief
    mitigations.push(
      Object.freeze({
        mitigationId,
        kind: raw.kind,
        strength: raw.strength,
        relief,
        provenance: provenance.provenance,
      })
    )
  }

  drivers.sort((a, b) => (a.driver < b.driver ? -1 : a.driver > b.driver ? 1 : 0))
  mitigations.sort((a, b) =>
    a.mitigationId < b.mitigationId ? -1 : a.mitigationId > b.mitigationId ? 1 : 0
  )

  const mitigatedPressure = Math.max(0, rawPressure - reliefTotal)

  return {
    ok: true,
    projection: Object.freeze({
      schemaVersion: SCENE_DIFFICULTY_MITIGATION_SCHEMA_VERSION,
      owner: SCENE_DIFFICULTY_MITIGATION_OWNER,
      sceneId: input.sceneId.trim(),
      bypassed: false,
      difficultyBand: bandFromPressure(mitigatedPressure),
      rawPressure,
      mitigatedPressure,
      drivers: Object.freeze(drivers),
      mitigations: Object.freeze(mitigations),
      consumerHint: 'phase_action_encounter',
      reasonCode: 'resolved',
    }),
  }
}

/** Consumer-facing band only — does not expose internal driver intensities as player truth. */
export function projectSceneDifficultyForConsumers(
  projection: SceneDifficultyProjection
): {
  readonly sceneId: string
  readonly difficultyBand: DifficultyBand
  readonly bypassed: boolean
  readonly consumerHint: 'phase_action_encounter'
} {
  return Object.freeze({
    sceneId: projection.sceneId,
    difficultyBand: projection.difficultyBand,
    bypassed: projection.bypassed,
    consumerHint: projection.consumerHint,
  })
}
