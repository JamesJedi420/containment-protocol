/**
 * SPE-2167 slice 1: scene atmosphere modifier registry.
 *
 * Bounded environmental scene facts (lighting, weather, noise, odor,
 * visibility, crowding) that may be consumed by perception, sensing or
 * scene contexts. Does not own attack-resolution, civic simulation, or
 * scene-difficulty authority.
 */

export type AtmosphereModifierId = string

export const LIGHTING_LEVELS = ['dark', 'dim', 'normal', 'bright', 'glaring'] as const
export type LightingLevel = (typeof LIGHTING_LEVELS)[number]

export const WEATHER_CONDITIONS = ['clear', 'fog', 'rain', 'storm', 'snow', 'haze'] as const
export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number]

export const NOISE_LEVELS = ['silent', 'quiet', 'normal', 'loud', 'deafening'] as const
export type NoiseLevel = (typeof NOISE_LEVELS)[number]

export const ODOR_INTENSITIES = ['none', 'faint', 'noticeable', 'strong', 'overpowering'] as const
export type OdorIntensity = (typeof ODOR_INTENSITIES)[number]

export const VISIBILITY_LEVELS = ['clear', 'reduced', 'obscured', 'blocked'] as const
export type VisibilityLevel = (typeof VISIBILITY_LEVELS)[number]

export const CROWDING_LEVELS = ['empty', 'sparse', 'normal', 'crowded', 'packed'] as const
export type CrowdingLevel = (typeof CROWDING_LEVELS)[number]

export interface SceneAtmosphereModifierEntry {
  readonly id: AtmosphereModifierId
  readonly label: string
  readonly lighting: LightingLevel
  readonly weather: WeatherCondition
  readonly noise: NoiseLevel
  readonly odor: OdorIntensity
  readonly visibility: VisibilityLevel
  readonly crowding: CrowdingLevel
  readonly notes?: string
}

export type AtmosphereValidationSeverity = 'error' | 'warning'

export interface AtmosphereValidationIssue {
  readonly code: string
  readonly severity: AtmosphereValidationSeverity
  readonly field: string
}

export interface AtmosphereValidationResult {
  readonly valid: boolean
  readonly issues: readonly AtmosphereValidationIssue[]
}

const LIGHTING_SET = new Set(LIGHTING_LEVELS)
const WEATHER_SET = new Set(WEATHER_CONDITIONS)
const NOISE_SET = new Set(NOISE_LEVELS)
const ODOR_SET = new Set(ODOR_INTENSITIES)
const VISIBILITY_SET = new Set(VISIBILITY_LEVELS)
const CROWDING_SET = new Set(CROWDING_LEVELS)

function token(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function issuesResult(issues: AtmosphereValidationIssue[]): AtmosphereValidationResult {
  const ordered = issues
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code) || a.field.localeCompare(b.field))
  return Object.freeze({
    valid: !ordered.some((issue) => issue.severity === 'error'),
    issues: Object.freeze(ordered.map((issue) => Object.freeze(issue))),
  })
}

/**
 * Validate a scene atmosphere modifier entry.
 * Returns structured issues; valid only when no errors are present.
 */
export function validateSceneAtmosphereModifier(
  input: unknown
): AtmosphereValidationResult {
  if (!isPlainRecord(input)) {
    return issuesResult([{ code: 'invalid_entry', severity: 'error', field: 'entry' }])
  }

  const issues: AtmosphereValidationIssue[] = []

  if (!token(input.id)) {
    issues.push({ code: 'missing_id', severity: 'error', field: 'id' })
  }
  if (!token(input.label)) {
    issues.push({ code: 'missing_label', severity: 'error', field: 'label' })
  }

  if (!LIGHTING_SET.has(token(input.lighting) as LightingLevel)) {
    issues.push({ code: 'invalid_lighting', severity: 'error', field: 'lighting' })
  }
  if (!WEATHER_SET.has(token(input.weather) as WeatherCondition)) {
    issues.push({ code: 'invalid_weather', severity: 'error', field: 'weather' })
  }
  if (!NOISE_SET.has(token(input.noise) as NoiseLevel)) {
    issues.push({ code: 'invalid_noise', severity: 'error', field: 'noise' })
  }
  if (!ODOR_SET.has(token(input.odor) as OdorIntensity)) {
    issues.push({ code: 'invalid_odor', severity: 'error', field: 'odor' })
  }
  if (!VISIBILITY_SET.has(token(input.visibility) as VisibilityLevel)) {
    issues.push({ code: 'invalid_visibility', severity: 'error', field: 'visibility' })
  }
  if (!CROWDING_SET.has(token(input.crowding) as CrowdingLevel)) {
    issues.push({ code: 'invalid_crowding', severity: 'error', field: 'crowding' })
  }

  if (input.notes !== undefined && typeof input.notes !== 'string') {
    issues.push({ code: 'invalid_notes', severity: 'error', field: 'notes' })
  }

  return issuesResult(issues)
}
