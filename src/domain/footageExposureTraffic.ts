/**
 * SPE-2571 / SPE-947 AC row 2: pure footage/post → civilian exposure / attraction-traffic evaluator.
 * Active spread vectors amplify; passive archival/documentation does not.
 * No GameState persistence, weekly mutation, store, or UI coupling.
 */

export const CONTENT_ARTIFACT_KINDS = ['footage', 'post'] as const

export type ContentArtifactKind = (typeof CONTENT_ARTIFACT_KINDS)[number]

export const CONTENT_ARTIFACT_ROLES = [
  'active_spread',
  'passive_documentation',
  'archival',
] as const

export type ContentArtifactRole = (typeof CONTENT_ARTIFACT_ROLES)[number]

export interface ContentPropagationArtifact {
  readonly id: string
  readonly label: string
  readonly kind: ContentArtifactKind
  /**
   * Mechanical role of the artifact:
   * - active_spread: footage/post acting as a propagation vector
   * - passive_documentation / archival: documentation only (no amplification)
   */
  readonly role: ContentArtifactRole
  /**
   * Civilian-exposure contribution weight when role is active_spread.
   * Must be a finite number >= 0 when valid.
   */
  readonly exposureWeight: number
  /**
   * Attraction-traffic contribution weight when role is active_spread.
   * Must be a finite number >= 0 when valid.
   */
  readonly attractionWeight: number
  /**
   * Intensity scale applied to both weights for active spread.
   * Defaults to 1 when omitted. Must be a finite number >= 0 when present.
   */
  readonly intensity?: number
}

export interface FootageExposureEvaluationInput {
  readonly artifact?: ContentPropagationArtifact | null
  /** Baseline civilian exposure before this artifact. Defaults to 0. */
  readonly baselineCivilianExposure?: number
  /** Baseline attraction traffic before this artifact. Defaults to 0. */
  readonly baselineAttractionTraffic?: number
}

export interface FootageExposureDecision {
  readonly artifactId: string
  readonly artifactLabel: string
  readonly kind: ContentArtifactKind | 'unknown'
  readonly role: ContentArtifactRole | 'unknown'
  readonly intensity: number
  readonly exposureWeight: number
  readonly attractionWeight: number
  readonly civilianExposureDelta: number
  readonly attractionTrafficDelta: number
  readonly resultingCivilianExposure: number
  readonly resultingAttractionTraffic: number
  readonly amplified: boolean
  readonly reasonCodes: readonly string[]
}

const DEFAULT_INTENSITY = 1
const FALLBACK_WEIGHT = 0

type ArtifactLike = Partial<ContentPropagationArtifact> & Record<string, unknown>

function isRecord(value: unknown): value is ArtifactLike {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
      (left, right) => left.localeCompare(right)
    )
  )
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function normalizeId(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function normalizeLabel(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function isKind(value: unknown): value is ContentArtifactKind {
  return typeof value === 'string' && (CONTENT_ARTIFACT_KINDS as readonly string[]).includes(value)
}

function isRole(value: unknown): value is ContentArtifactRole {
  return typeof value === 'string' && (CONTENT_ARTIFACT_ROLES as readonly string[]).includes(value)
}

function roundMetric(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  const scaled = value * 1_000_000
  if (!Number.isFinite(scaled)) {
    return 0
  }

  return Math.round(scaled) / 1_000_000
}

function normalizeBaseline(
  value: unknown,
  negativeClampCode: string,
  invalidCode: string
): { baseline: number; reasonCodes: string[] } {
  if (value === undefined || value === null) {
    return { baseline: 0, reasonCodes: [] }
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { baseline: 0, reasonCodes: [invalidCode] }
  }

  if (value < 0) {
    return { baseline: 0, reasonCodes: [negativeClampCode] }
  }

  return { baseline: value, reasonCodes: [] }
}

function freezeDecision(decision: FootageExposureDecision): FootageExposureDecision {
  return Object.freeze({
    ...decision,
    reasonCodes: uniqueSorted(decision.reasonCodes),
  })
}

function emptyDecision(
  reasonCodes: readonly string[],
  baselines: { civilian: number; attraction: number }
): FootageExposureDecision {
  return freezeDecision({
    artifactId: 'artifact:unknown',
    artifactLabel: 'Unknown Artifact',
    kind: 'unknown',
    role: 'unknown',
    intensity: 0,
    exposureWeight: FALLBACK_WEIGHT,
    attractionWeight: FALLBACK_WEIGHT,
    civilianExposureDelta: 0,
    attractionTrafficDelta: 0,
    resultingCivilianExposure: roundMetric(baselines.civilian),
    resultingAttractionTraffic: roundMetric(baselines.attraction),
    amplified: false,
    reasonCodes,
  })
}

/**
 * Evaluates whether a footage/post artifact increases civilian exposure or
 * attraction traffic as an active spread vector, or remains passive documentation.
 *
 * Active path:
 *   intensity = configured intensity (default 1 when omitted)
 *   civilianExposureDelta = exposureWeight * intensity
 *   attractionTrafficDelta = attractionWeight * intensity
 *   amplified when either delta > 0
 *
 * Passive / archival roles never amplify. Missing/invalid config → zero deltas.
 */
export function evaluateFootageExposureTraffic(
  input: FootageExposureEvaluationInput | null | undefined
): FootageExposureDecision {
  const reasonCodes: string[] = []

  const civilianBaseline = normalizeBaseline(
    input?.baselineCivilianExposure,
    'negative_baseline_civilian_exposure_clamped',
    'invalid_baseline_civilian_exposure'
  )
  reasonCodes.push(...civilianBaseline.reasonCodes)

  const attractionBaseline = normalizeBaseline(
    input?.baselineAttractionTraffic,
    'negative_baseline_attraction_traffic_clamped',
    'invalid_baseline_attraction_traffic'
  )
  reasonCodes.push(...attractionBaseline.reasonCodes)

  const baselines = {
    civilian: civilianBaseline.baseline,
    attraction: attractionBaseline.baseline,
  }

  if (input === null || input === undefined) {
    reasonCodes.push('missing_evaluation_input')
    return emptyDecision(reasonCodes, baselines)
  }

  const artifact = input.artifact

  if (artifact === null || artifact === undefined) {
    reasonCodes.push('missing_artifact')
    return emptyDecision(reasonCodes, baselines)
  }

  if (!isRecord(artifact)) {
    reasonCodes.push('invalid_artifact')
    return emptyDecision(reasonCodes, baselines)
  }

  const artifactId = normalizeId(artifact.id, 'artifact:unknown')
  const artifactLabel = normalizeLabel(artifact.label, artifactId)

  let kind: ContentArtifactKind | 'unknown' = 'unknown'
  if (!isKind(artifact.kind)) {
    reasonCodes.push('missing_or_invalid_kind')
  } else {
    kind = artifact.kind
  }

  let role: ContentArtifactRole | 'unknown' = 'unknown'
  if (!isRole(artifact.role)) {
    reasonCodes.push('missing_or_invalid_role')
  } else {
    role = artifact.role
  }

  let exposureWeight = FALLBACK_WEIGHT
  let hasValidExposureWeight = false
  if (!isNonNegativeFinite(artifact.exposureWeight)) {
    reasonCodes.push('missing_or_invalid_exposure_weight')
  } else {
    exposureWeight = artifact.exposureWeight
    hasValidExposureWeight = true
  }

  let attractionWeight = FALLBACK_WEIGHT
  let hasValidAttractionWeight = false
  if (!isNonNegativeFinite(artifact.attractionWeight)) {
    reasonCodes.push('missing_or_invalid_attraction_weight')
  } else {
    attractionWeight = artifact.attractionWeight
    hasValidAttractionWeight = true
  }

  let intensity = DEFAULT_INTENSITY
  let hasValidIntensity = true
  if (artifact.intensity === undefined || artifact.intensity === null) {
    // Default intensity applies only on the active path; passive paths ignore it.
  } else if (!isNonNegativeFinite(artifact.intensity)) {
    reasonCodes.push('invalid_intensity')
    intensity = 0
    hasValidIntensity = false
  } else {
    intensity = artifact.intensity
  }

  if (kind === 'unknown' || role === 'unknown') {
    reasonCodes.push('artifact_config_incomplete')
    return freezeDecision({
      artifactId,
      artifactLabel,
      kind,
      role,
      intensity: 0,
      exposureWeight,
      attractionWeight,
      civilianExposureDelta: 0,
      attractionTrafficDelta: 0,
      resultingCivilianExposure: roundMetric(baselines.civilian),
      resultingAttractionTraffic: roundMetric(baselines.attraction),
      amplified: false,
      reasonCodes,
    })
  }

  if (role === 'passive_documentation') {
    reasonCodes.push('passive_documentation_no_amplification')
    return freezeDecision({
      artifactId,
      artifactLabel,
      kind,
      role,
      intensity: 0,
      exposureWeight,
      attractionWeight,
      civilianExposureDelta: 0,
      attractionTrafficDelta: 0,
      resultingCivilianExposure: roundMetric(baselines.civilian),
      resultingAttractionTraffic: roundMetric(baselines.attraction),
      amplified: false,
      reasonCodes,
    })
  }

  if (role === 'archival') {
    reasonCodes.push('archival_no_amplification')
    return freezeDecision({
      artifactId,
      artifactLabel,
      kind,
      role,
      intensity: 0,
      exposureWeight,
      attractionWeight,
      civilianExposureDelta: 0,
      attractionTrafficDelta: 0,
      resultingCivilianExposure: roundMetric(baselines.civilian),
      resultingAttractionTraffic: roundMetric(baselines.attraction),
      amplified: false,
      reasonCodes,
    })
  }

  // active_spread
  if (!hasValidExposureWeight || !hasValidAttractionWeight || !hasValidIntensity) {
    reasonCodes.push('artifact_config_incomplete')
  }

  const civilianExposureDelta =
    hasValidExposureWeight && hasValidIntensity ? roundMetric(exposureWeight * intensity) : 0
  const attractionTrafficDelta =
    hasValidAttractionWeight && hasValidIntensity ? roundMetric(attractionWeight * intensity) : 0

  const amplified = civilianExposureDelta > 0 || attractionTrafficDelta > 0
  if (amplified) {
    reasonCodes.push('active_spread_amplified')
  } else if (hasValidExposureWeight && hasValidAttractionWeight && hasValidIntensity) {
    reasonCodes.push('active_spread_zero_weights')
  }

  return freezeDecision({
    artifactId,
    artifactLabel,
    kind,
    role,
    intensity: hasValidIntensity ? intensity : 0,
    exposureWeight,
    attractionWeight,
    civilianExposureDelta,
    attractionTrafficDelta,
    resultingCivilianExposure: roundMetric(baselines.civilian + civilianExposureDelta),
    resultingAttractionTraffic: roundMetric(baselines.attraction + attractionTrafficDelta),
    amplified,
    reasonCodes,
  })
}

/** Compact fixture: active footage post that amplifies exposure and traffic. */
export const EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT: ContentPropagationArtifact = Object.freeze({
  id: 'artifact:leak-footage-clip',
  label: 'Leaked containment footage clip',
  kind: 'footage',
  role: 'active_spread',
  exposureWeight: 2,
  attractionWeight: 3,
  intensity: 1.5,
})

/** Compact fixture: archival documentation that must not amplify. */
export const EXAMPLE_PASSIVE_DOC_ARTIFACT: ContentPropagationArtifact = Object.freeze({
  id: 'artifact:case-file-still',
  label: 'Case-file archival still',
  kind: 'footage',
  role: 'passive_documentation',
  exposureWeight: 2,
  attractionWeight: 3,
  intensity: 1.5,
})
