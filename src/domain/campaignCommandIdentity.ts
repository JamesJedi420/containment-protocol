/**
 * SPE-3172 — campaign command-identity profile (presentation-only persona).
 *
 * Optional campaign-scoped managerial identity under SPE-1734. Not an actor,
 * operative, or gameplay modifier. Organization identity stays on
 * CampaignOperationalProfile.
 */

export const CAMPAIGN_COMMAND_IDENTITY_OWNER = 'SPE-3172' as const
export const CAMPAIGN_COMMAND_IDENTITY_SCHEMA_VERSION = 'spe-3172.v1' as const

export const CAMPAIGN_COMMAND_IDENTITY_MODES = [
  'anonymous',
  'preset',
  'custom',
] as const
export type CampaignCommandIdentityMode =
  (typeof CAMPAIGN_COMMAND_IDENTITY_MODES)[number]

const MAX_DISPLAY_NAME = 80
const MAX_TITLE = 80
const MAX_PRONOUNS = 48
const MAX_BIOGRAPHY = 480
const MAX_PRESET_ID = 64

export interface CampaignCommandIdentityPreset {
  readonly presetId: string
  readonly displayName: string
  readonly title: string
  readonly pronouns: string
  readonly biography: string
}

/** Built-in presets — presentation copy only; no mechanical modifiers. */
export const CAMPAIGN_COMMAND_IDENTITY_PRESETS: Readonly<
  Record<string, CampaignCommandIdentityPreset>
> = Object.freeze({
  'director-measured': Object.freeze({
    presetId: 'director-measured',
    displayName: 'Director Hale',
    title: 'Field Director',
    pronouns: 'they/them',
    biography:
      'A measured containment director who treats public denial as operational weather.',
  }),
  'founder-stern': Object.freeze({
    presetId: 'founder-stern',
    displayName: 'Founder Voss',
    title: 'Founding Director',
    pronouns: 'she/her',
    biography:
      'A stern founding director who prioritizes recoverable teams over spectacle.',
  }),
})

export interface CampaignCommandIdentityState {
  readonly schemaVersion: typeof CAMPAIGN_COMMAND_IDENTITY_SCHEMA_VERSION
  readonly owner: typeof CAMPAIGN_COMMAND_IDENTITY_OWNER
  readonly mode: CampaignCommandIdentityMode
  readonly presetId: string | null
  readonly displayName: string | null
  readonly title: string | null
  readonly pronouns: string | null
  readonly biography: string | null
}

export type CampaignCommandIdentityValidationResult =
  | { readonly ok: true; readonly identity: CampaignCommandIdentityState }
  | { readonly ok: false; readonly reason: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clampString(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

function optionalTrimmed(
  value: unknown,
  max: number
): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  return clampString(trimmed, max)
}

export function createAnonymousCommandIdentity(): CampaignCommandIdentityState {
  return Object.freeze({
    schemaVersion: CAMPAIGN_COMMAND_IDENTITY_SCHEMA_VERSION,
    owner: CAMPAIGN_COMMAND_IDENTITY_OWNER,
    mode: 'anonymous',
    presetId: null,
    displayName: null,
    title: null,
    pronouns: null,
    biography: null,
  })
}

export function resolvePresetCommandIdentity(
  presetId: string
): CampaignCommandIdentityState | null {
  if (
    !Object.prototype.hasOwnProperty.call(
      CAMPAIGN_COMMAND_IDENTITY_PRESETS,
      presetId
    )
  ) {
    return null
  }
  const preset = CAMPAIGN_COMMAND_IDENTITY_PRESETS[presetId]
  if (!preset) return null
  return Object.freeze({
    schemaVersion: CAMPAIGN_COMMAND_IDENTITY_SCHEMA_VERSION,
    owner: CAMPAIGN_COMMAND_IDENTITY_OWNER,
    mode: 'preset',
    presetId: preset.presetId,
    displayName: preset.displayName,
    title: preset.title,
    pronouns: preset.pronouns,
    biography: preset.biography,
  })
}

/**
 * Validate a caller-owned command-identity draft. Malformed drafts fail closed
 * without throwing; callers that need a hydrate fallback should use
 * `sanitizeCampaignCommandIdentity`.
 */
export function validateCampaignCommandIdentity(
  raw: unknown
): CampaignCommandIdentityValidationResult {
  if (raw == null) {
    return { ok: true, identity: createAnonymousCommandIdentity() }
  }
  if (!isRecord(raw)) {
    return { ok: false, reason: 'command identity must be an object' }
  }

  const mode = raw.mode
  if (
    mode !== 'anonymous' &&
    mode !== 'preset' &&
    mode !== 'custom'
  ) {
    return { ok: false, reason: 'unknown command identity mode' }
  }

  if (mode === 'anonymous') {
    return { ok: true, identity: createAnonymousCommandIdentity() }
  }

  if (mode === 'preset') {
    const presetId =
      typeof raw.presetId === 'string' ? raw.presetId.trim() : ''
    if (presetId.length === 0 || presetId.length > MAX_PRESET_ID) {
      return { ok: false, reason: 'presetId required for preset mode' }
    }
    const resolved = resolvePresetCommandIdentity(presetId)
    if (!resolved) {
      return { ok: false, reason: `unknown presetId ${presetId}` }
    }
    return { ok: true, identity: resolved }
  }

  const displayName = optionalTrimmed(raw.displayName, MAX_DISPLAY_NAME)
  if (displayName == null) {
    return { ok: false, reason: 'custom mode requires displayName' }
  }

  return {
    ok: true,
    identity: Object.freeze({
      schemaVersion: CAMPAIGN_COMMAND_IDENTITY_SCHEMA_VERSION,
      owner: CAMPAIGN_COMMAND_IDENTITY_OWNER,
      mode: 'custom',
      presetId: null,
      displayName,
      title: optionalTrimmed(raw.title, MAX_TITLE),
      pronouns: optionalTrimmed(raw.pronouns, MAX_PRONOUNS),
      biography: optionalTrimmed(raw.biography, MAX_BIOGRAPHY),
    }),
  }
}

/**
 * Hydration path: absent/malformed command identity becomes anonymous default.
 * Never throws; never invents custom persona fields from organization profile.
 */
export function sanitizeCampaignCommandIdentity(
  raw: unknown
): CampaignCommandIdentityState {
  const validated = validateCampaignCommandIdentity(raw)
  if (validated.ok) return validated.identity
  return createAnonymousCommandIdentity()
}

/** Presentation projection for agency-establishment and setup surfaces. */
export function projectCampaignCommandIdentity(
  identity: CampaignCommandIdentityState
): {
  readonly mode: CampaignCommandIdentityMode
  readonly presetId: string | null
  readonly displayName: string | null
  readonly title: string | null
  readonly pronouns: string | null
  readonly biography: string | null
  readonly isAnonymous: boolean
} {
  return Object.freeze({
    mode: identity.mode,
    presetId: identity.presetId,
    displayName: identity.displayName,
    title: identity.title,
    pronouns: identity.pronouns,
    biography: identity.biography,
    isAnonymous: identity.mode === 'anonymous',
  })
}
