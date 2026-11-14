/**
 * SPE-2238 slice 1: deterministic communication register profiles and pool selector.
 *
 * Compact register-profile records and context-keyed pool entries.
 * Pure domain only. No UI, no GameState, no live dialogue tree, no global replacement table.
 */

export const FORMALITY_BANDS = ['low', 'medium', 'high'] as const
export type FormalityBand = (typeof FORMALITY_BANDS)[number]

export const HOSTILITY_BANDS = ['low', 'medium', 'high'] as const
export type HostilityBand = (typeof HOSTILITY_BANDS)[number]

export const AUDIENCE_KINDS = ['public', 'private'] as const
export type AudienceKind = (typeof AUDIENCE_KINDS)[number]

export const SURVEILLANCE_BANDS = ['low', 'medium', 'high'] as const
export type SurveillanceBand = (typeof SURVEILLANCE_BANDS)[number]

export interface CommunicationRegisterProfile {
  readonly id: string
  readonly purpose: string
  readonly socialGroupTags: readonly string[]
  readonly formalityBand: FormalityBand
  readonly hostilityBand: HostilityBand
  readonly trustThreshold: number
  readonly insiderMarker: boolean
  readonly domainTags: readonly string[]
  readonly translationDifficulty: number
  readonly provenance: string
  readonly forbiddenImportNote: string
}

export interface CommunicationPoolEntry {
  readonly id: string
  readonly registerId: string
  readonly contextKey: string
  readonly reliabilityFlags: readonly string[]
  readonly phraseTriggerSeedKey?: string
}

export interface SelectionContext {
  readonly registerId: string
  readonly speakerRole: string
  readonly district?: string
  readonly trustBand: number
  readonly surveillanceBand: SurveillanceBand
  readonly audience: AudienceKind
  readonly recentActivityKey?: string
  readonly seed: number
}

export interface PoolSelection {
  readonly poolEntryId: string
  readonly reliabilityFlags: readonly string[]
  readonly phraseTriggerSeedKey?: string
}

export interface RegisterValidationIssue {
  readonly code: string
  readonly field: string
  readonly profileId?: string
}

export interface RegisterValidationResult {
  readonly valid: boolean
  readonly issues: readonly RegisterValidationIssue[]
}

const FORMALITY_SET = new Set(FORMALITY_BANDS)
const HOSTILITY_SET = new Set(HOSTILITY_BANDS)
const AUDIENCE_SET = new Set(AUDIENCE_KINDS)
const SURVEILLANCE_SET = new Set(SURVEILLANCE_BANDS)
const PROFILE_ID = /^register-profile:[a-z0-9]+(?:-[a-z0-9]+)*$/
const POOL_ID = /^pool-entry:[a-z0-9]+(?:-[a-z0-9]+)*$/

function compareStrings(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function token(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function freezeProfile(input: CommunicationRegisterProfile): CommunicationRegisterProfile {
  return Object.freeze({
    id: input.id,
    purpose: input.purpose,
    socialGroupTags: Object.freeze([...input.socialGroupTags]),
    formalityBand: input.formalityBand,
    hostilityBand: input.hostilityBand,
    trustThreshold: input.trustThreshold,
    insiderMarker: input.insiderMarker,
    domainTags: Object.freeze([...input.domainTags]),
    translationDifficulty: input.translationDifficulty,
    provenance: input.provenance,
    forbiddenImportNote: input.forbiddenImportNote,
  })
}

function issuesResult(issues: RegisterValidationIssue[]): RegisterValidationResult {
  const ordered = issues.slice().sort((a, b) => compareStrings(a.code, b.code) || compareStrings(a.field, b.field))
  return Object.freeze({
    valid: ordered.length === 0,
    issues: Object.freeze(ordered.map((issue) => Object.freeze({ ...issue }))),
  })
}

function validateProfile(input: unknown, index: number, issues: RegisterValidationIssue[]): CommunicationRegisterProfile | null {
  const field = `profiles[${index}]`
  if (!isPlainRecord(input)) {
    issues.push({ code: 'invalid_profile', field })
    return null
  }

  const id = token(input.id)
  let legal = true

  if (!PROFILE_ID.test(id)) {
    issues.push({ code: 'invalid_profile_id', field: `${field}.id`, ...(id ? { profileId: id } : {}) })
    legal = false
  }

  const purpose = token(input.purpose)
  if (!purpose) {
    issues.push({ code: 'missing_purpose', field: `${field}.purpose`, ...(id ? { profileId: id } : {}) })
    legal = false
  }

  const formalityBand = token(input.formalityBand)
  if (!FORMALITY_SET.has(formalityBand as FormalityBand)) {
    issues.push({ code: 'unknown_formality_band', field: `${field}.formalityBand`, ...(id ? { profileId: id } : {}) })
    legal = false
  }

  const hostilityBand = token(input.hostilityBand)
  if (!HOSTILITY_SET.has(hostilityBand as HostilityBand)) {
    issues.push({ code: 'unknown_hostility_band', field: `${field}.hostilityBand`, ...(id ? { profileId: id } : {}) })
    legal = false
  }

  const trustThreshold = typeof input.trustThreshold === 'number' ? input.trustThreshold : NaN
  if (!Number.isFinite(trustThreshold) || trustThreshold < 0 || trustThreshold > 1) {
    issues.push({ code: 'invalid_trust_threshold', field: `${field}.trustThreshold`, ...(id ? { profileId: id } : {}) })
    legal = false
  }

  if (typeof input.insiderMarker !== 'boolean') {
    issues.push({ code: 'invalid_insider_marker', field: `${field}.insiderMarker`, ...(id ? { profileId: id } : {}) })
    legal = false
  }

  const domainTags = Array.isArray(input.domainTags) ? input.domainTags.map(token).filter(Boolean) : []
  if (domainTags.length === 0) {
    issues.push({ code: 'missing_domain_tags', field: `${field}.domainTags`, ...(id ? { profileId: id } : {}) })
    legal = false
  }

  const translationDifficulty = typeof input.translationDifficulty === 'number' ? input.translationDifficulty : NaN
  if (!Number.isFinite(translationDifficulty) || translationDifficulty < 0) {
    issues.push({ code: 'invalid_translation_difficulty', field: `${field}.translationDifficulty`, ...(id ? { profileId: id } : {}) })
    legal = false
  }

  const provenance = token(input.provenance)
  if (!provenance) {
    issues.push({ code: 'missing_provenance', field: `${field}.provenance`, ...(id ? { profileId: id } : {}) })
    legal = false
  }

  const forbiddenImportNote = token(input.forbiddenImportNote)
  if (!forbiddenImportNote || forbiddenImportNote.toLowerCase().includes('global replacement')) {
    issues.push({ code: 'forbidden_global_replacement', field: `${field}.forbiddenImportNote`, ...(id ? { profileId: id } : {}) })
    legal = false
  }

  if (!legal) return null

  return freezeProfile({
    id,
    purpose,
    socialGroupTags: Array.isArray(input.socialGroupTags) ? input.socialGroupTags.map(token).filter(Boolean) : [],
    formalityBand: formalityBand as FormalityBand,
    hostilityBand: hostilityBand as HostilityBand,
    trustThreshold,
    insiderMarker: input.insiderMarker as boolean,
    domainTags,
    translationDifficulty,
    provenance,
    forbiddenImportNote,
  })
}

export function validateCommunicationRegisterProfiles(input: unknown): RegisterValidationResult {
  if (!Array.isArray(input)) {
    return issuesResult([{ code: 'invalid_registry', field: 'profiles' }])
  }

  const issues: RegisterValidationIssue[] = []
  const seenIds = new Set<string>()

  for (let index = 0; index < input.length; index += 1) {
    const profile = validateProfile(input[index], index, issues)
    if (!profile) continue
    if (seenIds.has(profile.id)) {
      issues.push({ code: 'duplicate_profile_id', field: `profiles[${index}].id`, profileId: profile.id })
    }
    seenIds.add(profile.id)
  }

  return issuesResult(issues)
}

function contextKey(ctx: SelectionContext): string {
  return [
    ctx.registerId,
    ctx.speakerRole,
    ctx.district ?? '',
    String(ctx.trustBand),
    ctx.surveillanceBand,
    ctx.audience,
    ctx.recentActivityKey ?? '',
  ].join('|')
}

function stableHash(seed: number, key: string): number {
  let h = seed
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0
  }
  return h
}

export function selectCommunicationPoolEntry(
  entries: readonly CommunicationPoolEntry[],
  context: SelectionContext
): PoolSelection | null {
  const key = contextKey(context)
  const eligible = entries.filter((entry) => entry.registerId === context.registerId && entry.contextKey === key)
  if (eligible.length === 0) return null
  const sorted = eligible.slice().sort((a, b) => compareStrings(a.id, b.id))
  const index = stableHash(context.seed, key) % sorted.length
  const chosen = sorted[index]!
  return Object.freeze({
    poolEntryId: chosen.id,
    reliabilityFlags: Object.freeze([...chosen.reliabilityFlags]),
    ...(chosen.phraseTriggerSeedKey ? { phraseTriggerSeedKey: chosen.phraseTriggerSeedKey } : {}),
  })
}

export const COMMUNICATION_REGISTER_PROFILE_FIXTURES: readonly CommunicationRegisterProfile[] = Object.freeze([
  freezeProfile({
    id: 'register-profile:street-informal',
    purpose: 'low-formality street-level briefing',
    socialGroupTags: ['field-ops'],
    formalityBand: 'low',
    hostilityBand: 'low',
    trustThreshold: 0.3,
    insiderMarker: true,
    domainTags: ['operational', 'urban'],
    translationDifficulty: 0.2,
    provenance: 'authored-slice-1',
    forbiddenImportNote: 'no global dialect table; no franchise slang',
  }),
])

export const COMMUNICATION_POOL_ENTRY_FIXTURES: readonly CommunicationPoolEntry[] = Object.freeze([
  Object.freeze({
    id: 'pool-entry:street-brief-low-trust',
    registerId: 'register-profile:street-informal',
    contextKey: 'register-profile:street-informal|field|north|0.2|low|private|',
    reliabilityFlags: ['variance:low'],
    phraseTriggerSeedKey: 'seed:phrase:street-brief',
  }),
  Object.freeze({
    id: 'pool-entry:street-brief-high-surveillance',
    registerId: 'register-profile:street-informal',
    contextKey: 'register-profile:street-informal|field|north|0.2|high|private|',
    reliabilityFlags: ['variance:high', 'deception-stub'],
    phraseTriggerSeedKey: 'seed:phrase:street-cautious',
  }),
])
