/**
 * SPE-2226 — scenario operational artifact bundle registry (slice 1).
 *
 * Pure schema + composition/validation for distinct operational artifacts
 * (maps, handouts, time sheets, rosters, evidence sheets, internal notes).
 * Child of SPE-48; reuses template/validation conventions. No GameState,
 * rendering, or sensing behavior.
 */

export const SCENARIO_OPERATIONAL_ARTIFACT_BUNDLE_SCHEMA_VERSION =
  'spe-2226.v1' as const
export type ScenarioOperationalArtifactBundleSchemaVersion =
  typeof SCENARIO_OPERATIONAL_ARTIFACT_BUNDLE_SCHEMA_VERSION

export type ArtifactKindId =
  | 'map'
  | 'handout'
  | 'time_sheet'
  | 'roster'
  | 'evidence_sheet'
  | 'internal_note'

export const ARTIFACT_KINDS: readonly ArtifactKindId[] = Object.freeze([
  'map',
  'handout',
  'time_sheet',
  'roster',
  'evidence_sheet',
  'internal_note',
])

/** Scenario-policy required kinds for a valid operational bundle. */
export const REQUIRED_ARTIFACT_KINDS: readonly ArtifactKindId[] = Object.freeze([
  'map',
  'time_sheet',
  'roster',
])

/** Optional kinds. */
export const OPTIONAL_ARTIFACT_KINDS: readonly ArtifactKindId[] = Object.freeze([
  'handout',
  'evidence_sheet',
  'internal_note',
])

/** Incompatible pairs (sorted for deterministic lookup). */
const INCOMPATIBLE_PAIRS: readonly [ArtifactKindId, ArtifactKindId][] =
  Object.freeze([
    ['evidence_sheet', 'internal_note'], // evidence sheets cannot coexist with freeform internal notes in the same bundle
  ])

export interface ArtifactRef {
  readonly kind: ArtifactKindId
  readonly artifactId: string
  readonly label: string
}

export interface ScenarioOperationalArtifactBundle {
  readonly schemaVersion: ScenarioOperationalArtifactBundleSchemaVersion
  readonly bundleId: string
  readonly scenarioId: string
  readonly artifacts: readonly ArtifactRef[]
}

export type BundleValidationCode =
  | 'missing_required'
  | 'incompatible_combination'
  | 'unknown_kind'
  | 'duplicate_kind'
  | 'ok'

export interface BundleValidationResult {
  readonly ok: boolean
  readonly code: BundleValidationCode
  readonly message: string
  readonly missing?: readonly ArtifactKindId[]
  readonly conflicting?: readonly [ArtifactKindId, ArtifactKindId]
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function isArtifactKind(value: string): value is ArtifactKindId {
  return (ARTIFACT_KINDS as readonly string[]).includes(value)
}

export function createEmptyScenarioOperationalArtifactBundle(
  bundleId: string,
  scenarioId: string,
): ScenarioOperationalArtifactBundle {
  return Object.freeze({
    schemaVersion: SCENARIO_OPERATIONAL_ARTIFACT_BUNDLE_SCHEMA_VERSION,
    bundleId: bundleId.trim(),
    scenarioId: scenarioId.trim(),
    artifacts: Object.freeze([] as ArtifactRef[]),
  })
}

export function addArtifact(
  bundle: ScenarioOperationalArtifactBundle,
  artifact: ArtifactRef,
): ScenarioOperationalArtifactBundle {
  const kind = artifact.kind
  const next = [...bundle.artifacts, Object.freeze({ ...artifact, kind, artifactId: artifact.artifactId.trim(), label: artifact.label.trim() })]
  next.sort((a, b) => compareStrings(a.kind, b.kind) || compareStrings(a.artifactId, b.artifactId))
  return Object.freeze({
    ...bundle,
    artifacts: Object.freeze(next),
  })
}

export function validateScenarioOperationalArtifactBundle(
  bundle: ScenarioOperationalArtifactBundle,
): BundleValidationResult {
  const kinds = bundle.artifacts.map((a) => a.kind)
  const uniqueKinds = new Set(kinds)

  if (kinds.length !== uniqueKinds.size) {
    return Object.freeze({
      ok: false,
      code: 'duplicate_kind' as const,
      message: 'Duplicate artifact kinds are not allowed in a single bundle',
    })
  }

  for (const kind of kinds) {
    if (!isArtifactKind(kind)) {
      return Object.freeze({
        ok: false,
        code: 'unknown_kind' as const,
        message: `Unknown artifact kind ${kind}`,
      })
    }
  }

  const missing: ArtifactKindId[] = []
  for (const required of REQUIRED_ARTIFACT_KINDS) {
    if (!uniqueKinds.has(required)) {
      missing.push(required)
    }
  }
  if (missing.length > 0) {
    missing.sort(compareStrings)
    return Object.freeze({
      ok: false,
      code: 'missing_required' as const,
      message: `Missing required artifact kinds: ${missing.join(', ')}`,
      missing: Object.freeze(missing),
    })
  }

  for (const [left, right] of INCOMPATIBLE_PAIRS) {
    if (uniqueKinds.has(left) && uniqueKinds.has(right)) {
      return Object.freeze({
        ok: false,
        code: 'incompatible_combination' as const,
        message: `Incompatible artifact combination: ${left} + ${right}`,
        conflicting: Object.freeze([left, right] as [ArtifactKindId, ArtifactKindId]),
      })
    }
  }

  return Object.freeze({
    ok: true,
    code: 'ok' as const,
    message: 'Bundle composition is valid',
  })
}

export function sanitizeScenarioOperationalArtifactBundle(
  input: unknown,
): ScenarioOperationalArtifactBundle | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return null
  }
  const record = input as Record<string, unknown>
  if (record.schemaVersion !== SCENARIO_OPERATIONAL_ARTIFACT_BUNDLE_SCHEMA_VERSION) {
    return null
  }
  if (typeof record.bundleId !== 'string' || typeof record.scenarioId !== 'string') {
    return null
  }
  if (!Array.isArray(record.artifacts)) {
    return null
  }
  let bundle = createEmptyScenarioOperationalArtifactBundle(record.bundleId, record.scenarioId)
  for (const raw of record.artifacts) {
    if (typeof raw !== 'object' || raw === null) continue
    const entry = raw as Record<string, unknown>
    if (
      typeof entry.kind !== 'string' ||
      !isArtifactKind(entry.kind) ||
      typeof entry.artifactId !== 'string' ||
      typeof entry.label !== 'string'
    ) {
      continue
    }
    bundle = addArtifact(bundle, {
      kind: entry.kind,
      artifactId: entry.artifactId,
      label: entry.label,
    })
  }
  return bundle
}
