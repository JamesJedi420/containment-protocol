/**
 * SPE-1365 slice 1: deterministic status effect registry.
 *
 * Typed records for operational status effects. Distinguishes actor conditions
 * from zone/environment conditions. Stores allowed targets, duration mode,
 * and removal paths. Not a combat subsystem, GameState field, or live effect
 * runtime. Mundane and anomalous families are both expressible through the
 * same schema without one-off prose.
 */

export const STATUS_EFFECT_SCOPES = ['actor', 'environment'] as const
export type StatusEffectScope = (typeof STATUS_EFFECT_SCOPES)[number]

export const STATUS_EFFECT_DURATION_MODES = [
  'elapsed_time',
  'trigger_count',
  'manual_removal',
  'condition_met',
] as const
export type StatusEffectDurationMode = (typeof STATUS_EFFECT_DURATION_MODES)[number]

export const STATUS_EFFECT_FAMILIES = ['mundane', 'anomalous'] as const
export type StatusEffectFamily = (typeof STATUS_EFFECT_FAMILIES)[number]

export interface StatusEffectRecord {
  readonly id: string
  readonly scope: StatusEffectScope
  readonly family: StatusEffectFamily
  /** Explicit allowed target categories (e.g. 'operative', 'zone', 'equipment'). */
  readonly allowedTargets: readonly string[]
  readonly durationMode: StatusEffectDurationMode
  /** Optional removal path codes that can clear the effect. */
  readonly removalPaths: readonly string[]
  /** Optional resistance hook identifier; absent means no resistance check. */
  readonly resistanceHook?: string
  /** Visibility for known-state projection. */
  readonly visibility: 'known' | 'hidden'
}

export interface StatusEffectValidationIssue {
  readonly code: string
  readonly field: string
  readonly effectId?: string
}

export interface StatusEffectValidationResult {
  readonly valid: boolean
  readonly issues: readonly StatusEffectValidationIssue[]
}

export type StatusEffectLookup =
  | { readonly status: 'found'; readonly effect: StatusEffectRecord }
  | { readonly status: 'unknown_effect_id' }
  | { readonly status: 'ambiguous_effect_id' }
  | { readonly status: 'invalid_effect_id' }
  | { readonly status: 'invalid_effect' }

const SCOPE_SET: ReadonlySet<string> = new Set(STATUS_EFFECT_SCOPES)
const DURATION_SET: ReadonlySet<string> = new Set(STATUS_EFFECT_DURATION_MODES)
const FAMILY_SET: ReadonlySet<string> = new Set(STATUS_EFFECT_FAMILIES)
const EFFECT_ID = /^status-effect:[a-z0-9]+(?:-[a-z0-9]+)*$/
const TARGET_TOKEN = /^[a-z][a-z0-9_-]*$/
const REMOVAL_TOKEN = /^[a-z][a-z0-9_-]*$/

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

function freezeEffect(input: StatusEffectRecord): StatusEffectRecord {
  return Object.freeze({
    id: input.id,
    scope: input.scope,
    family: input.family,
    allowedTargets: Object.freeze([...input.allowedTargets]),
    durationMode: input.durationMode,
    removalPaths: Object.freeze([...input.removalPaths]),
    ...(input.resistanceHook !== undefined ? { resistanceHook: input.resistanceHook } : {}),
    visibility: input.visibility,
  })
}

function issuesResult(issues: StatusEffectValidationIssue[]): StatusEffectValidationResult {
  const ordered = issues
    .slice()
    .sort(
      (a, b) =>
        compareStrings(a.code, b.code) ||
        compareStrings(a.field, b.field) ||
        compareStrings(a.effectId ?? '', b.effectId ?? '')
    )
  return Object.freeze({
    valid: ordered.length === 0,
    issues: Object.freeze(ordered.map((issue) => Object.freeze({ ...issue }))),
  })
}

function validateEffect(
  input: unknown,
  index: number,
  issues: StatusEffectValidationIssue[]
): StatusEffectRecord | null {
  const field = `effects[${index}]`
  if (!isPlainRecord(input)) {
    issues.push({ code: 'invalid_effect', field })
    return null
  }

  const id = token(input.id)
  const scope = token(input.scope)
  const family = token(input.family)
  const durationMode = token(input.durationMode)
  const visibility = token(input.visibility)
  let legal = true

  if (!EFFECT_ID.test(id)) {
    issues.push({
      code: 'invalid_effect_id',
      field: `${field}.id`,
      ...(id ? { effectId: id } : {}),
    })
    legal = false
  }
  if (!SCOPE_SET.has(scope)) {
    issues.push({
      code: 'unknown_scope',
      field: `${field}.scope`,
      ...(id ? { effectId: id } : {}),
    })
    legal = false
  }
  if (!FAMILY_SET.has(family)) {
    issues.push({
      code: 'unknown_family',
      field: `${field}.family`,
      ...(id ? { effectId: id } : {}),
    })
    legal = false
  }
  if (!DURATION_SET.has(durationMode)) {
    issues.push({
      code: 'unknown_duration_mode',
      field: `${field}.durationMode`,
      ...(id ? { effectId: id } : {}),
    })
    legal = false
  }
  if (visibility !== 'known' && visibility !== 'hidden') {
    issues.push({
      code: 'invalid_visibility',
      field: `${field}.visibility`,
      ...(id ? { effectId: id } : {}),
    })
    legal = false
  }

  const rawTargets = input.allowedTargets
  if (!Array.isArray(rawTargets) || rawTargets.length === 0) {
    issues.push({
      code: 'invalid_allowed_targets',
      field: `${field}.allowedTargets`,
      ...(id ? { effectId: id } : {}),
    })
    legal = false
  } else {
    for (let t = 0; t < rawTargets.length; t += 1) {
      const target = token(rawTargets[t])
      if (!TARGET_TOKEN.test(target)) {
        issues.push({
          code: 'invalid_target_token',
          field: `${field}.allowedTargets[${t}]`,
          ...(id ? { effectId: id } : {}),
        })
        legal = false
      }
    }
  }

  const rawRemoval = input.removalPaths
  if (!Array.isArray(rawRemoval)) {
    issues.push({
      code: 'invalid_removal_paths',
      field: `${field}.removalPaths`,
      ...(id ? { effectId: id } : {}),
    })
    legal = false
  } else {
    for (let r = 0; r < rawRemoval.length; r += 1) {
      const path = token(rawRemoval[r])
      if (!REMOVAL_TOKEN.test(path)) {
        issues.push({
          code: 'invalid_removal_token',
          field: `${field}.removalPaths[${r}]`,
          ...(id ? { effectId: id } : {}),
        })
        legal = false
      }
    }
  }

  const resistance = input.resistanceHook
  if (resistance !== undefined && (typeof resistance !== 'string' || !REMOVAL_TOKEN.test(token(resistance)))) {
    issues.push({
      code: 'invalid_resistance_hook',
      field: `${field}.resistanceHook`,
      ...(id ? { effectId: id } : {}),
    })
    legal = false
  }

  if (!legal || !SCOPE_SET.has(scope) || !FAMILY_SET.has(family) || !DURATION_SET.has(durationMode)) {
    return null
  }

  const targets = Array.isArray(rawTargets)
    ? rawTargets.map((t) => token(t)).filter((t) => TARGET_TOKEN.test(t))
    : []
  const removals = Array.isArray(rawRemoval)
    ? rawRemoval.map((r) => token(r)).filter((r) => REMOVAL_TOKEN.test(r))
    : []

  return freezeEffect({
    id,
    scope: scope as StatusEffectScope,
    family: family as StatusEffectFamily,
    allowedTargets: targets,
    durationMode: durationMode as StatusEffectDurationMode,
    removalPaths: removals,
    ...(resistance !== undefined && typeof resistance === 'string'
      ? { resistanceHook: token(resistance) }
      : {}),
    visibility: visibility as 'known' | 'hidden',
  })
}

/**
 * Accept a list of status effect records. Duplicate ids fail closed.
 * Malformed ids, unknown scopes/families/duration modes, and invalid tokens
 * fail closed. Input order is not significant for validity.
 */
export function validateStatusEffects(input: unknown): StatusEffectValidationResult {
  if (!Array.isArray(input)) {
    return issuesResult([{ code: 'invalid_registry', field: 'effects' }])
  }

  const issues: StatusEffectValidationIssue[] = []
  const seenIds = new Set<string>()

  for (let index = 0; index < input.length; index += 1) {
    const effect = validateEffect(input[index], index, issues)
    if (!effect) continue
    if (seenIds.has(effect.id)) {
      issues.push({
        code: 'duplicate_effect_id',
        field: `effects[${index}].id`,
        effectId: effect.id,
      })
    }
    seenIds.add(effect.id)
  }

  return issuesResult(issues)
}

/** Frozen copy sorted by effect id. Returns null when validation fails. */
export function normalizeStatusEffects(
  input: readonly StatusEffectRecord[]
): readonly StatusEffectRecord[] | null {
  const validation = validateStatusEffects(input)
  if (!validation.valid) return null
  const ordered = input
    .map((effect, index) => validateEffect(effect, index, [])!)
    .sort((a, b) => compareStrings(a.id, b.id))
  return Object.freeze(ordered)
}

export function lookupStatusEffect(
  effects: readonly StatusEffectRecord[],
  effectId: string
): StatusEffectLookup {
  const id = token(effectId)
  if (!EFFECT_ID.test(id)) {
    return Object.freeze({ status: 'invalid_effect_id' })
  }
  const matches = effects.filter((effect) => token(effect.id) === id)
  if (matches.length === 0) return Object.freeze({ status: 'unknown_effect_id' })
  if (matches.length > 1) return Object.freeze({ status: 'ambiguous_effect_id' })
  const effect = validateEffect(matches[0], 0, [])
  if (!effect) return Object.freeze({ status: 'invalid_effect' })
  return Object.freeze({ status: 'found', effect })
}

/** Authored slice-1 fixtures. Not live effects and not a second condition registry. */
export const STATUS_EFFECT_FIXTURE_RECORDS: readonly StatusEffectRecord[] = Object.freeze([
  Object.freeze({
    id: 'status-effect:fatigued',
    scope: 'actor',
    family: 'mundane',
    allowedTargets: Object.freeze(['operative']),
    durationMode: 'elapsed_time',
    removalPaths: Object.freeze(['rest', 'medical_intervention']),
    visibility: 'known',
  }),
  Object.freeze({
    id: 'status-effect:stunned',
    scope: 'actor',
    family: 'mundane',
    allowedTargets: Object.freeze(['operative', 'hostile']),
    durationMode: 'trigger_count',
    removalPaths: Object.freeze(['time_elapsed', 'counter_action']),
    resistanceHook: 'fortitude',
    visibility: 'known',
  }),
  Object.freeze({
    id: 'status-effect:suppressed-zone',
    scope: 'environment',
    family: 'anomalous',
    allowedTargets: Object.freeze(['zone']),
    durationMode: 'manual_removal',
    removalPaths: Object.freeze(['countermeasure_activation', 'anomaly_resolution']),
    visibility: 'hidden',
  }),
])
