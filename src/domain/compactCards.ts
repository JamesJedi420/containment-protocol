/** Presentation records consume already-authorized projections, never raw simulation state. */
export type CompactCardValue =
  | {
      readonly state: 'known' | 'estimated'
      readonly value: string | number | boolean
      readonly confidence?: 'confirmed' | 'supported' | 'limited' | 'unknown'
      readonly provenance?: readonly string[]
    }
  | { readonly state: 'redacted' }
  | { readonly state: 'unavailable' }

export interface CompactCardField {
  /** Authored field identity/label must be safe to disclose even when its value is redacted. */
  readonly id: string
  readonly label: string
  readonly value: CompactCardValue
  readonly depth: 'browse' | 'inspect'
}

export type CompactActorMode =
  | { readonly kind: 'live' }
  | {
      readonly kind: 'historical' | 'memorial'
      readonly week: number
      /** A player-visible immutable snapshot or versioned reconstruction reference. */
      readonly recordRef: string
      readonly reconstruction: 'snapshot' | 'versioned'
    }
  | { readonly kind: 'unavailable'; readonly reason: 'missing' | 'legacy' }

export const COMPACT_ACTOR_FIELDS = Object.freeze({
  personnelStatus: 'Personnel status',
  role: 'Role or discipline',
  assignment: 'Assignment',
  availability: 'Availability',
  readiness: 'Operational readiness',
  medical: 'Medical state',
  fatigue: 'Fatigue',
  stress: 'Stress',
  blockers: 'Operational blockers',
  traits: 'Visible traits',
  relationships: 'Visible relationships',
} as const)

interface CompactCardBase {
  /** Public presentation key, not a hidden target identifier. */
  readonly id: string
  readonly name: CompactCardValue
  readonly hook?: CompactCardValue
  readonly sourceTags?: readonly string[]
  /** Only already-visible canonical references; never used to look up current state here. */
  readonly subjectRef?: CompactCardValue
  readonly fields: readonly CompactCardField[]
}

export type CompactCardRecord = CompactCardBase &
  (
    | {
        readonly category: 'actor'
        readonly mode: CompactActorMode
        readonly personnel?: Readonly<
          Partial<Record<keyof typeof COMPACT_ACTOR_FIELDS, CompactCardValue>>
        >
      }
    | { readonly category: 'anomaly' | 'item' | 'vehicle' | 'location' | 'effect' }
  )

export interface CompactCardProjection {
  readonly id: string
  readonly category: CompactCardRecord['category']
  readonly name: CompactCardValue
  readonly subjectRef?: CompactCardValue
  readonly hook?: CompactCardValue
  readonly sourceTags: readonly string[]
  readonly mode?: CompactActorMode
  /** Actor mode applies to every displayed field; no lookup/substitution from a live actor. */
  readonly qualifier?: string
  readonly browse: readonly CompactCardField[]
  readonly inspect: readonly CompactCardField[]
}

const categories = ['actor', 'anomaly', 'item', 'vehicle', 'location', 'effect']
const confidences = ['confirmed', 'supported', 'limited', 'unknown']
const text = (value: unknown, limit: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= limit
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const stringList = (value: unknown, count: number): boolean =>
  Array.isArray(value) &&
  value.length <= count &&
  Array.from(value).every((entry) => text(entry, 160))

function validValue(value: unknown): boolean {
  if (!object(value)) return false
  // Suppressed values have no renderable payload, even if a malformed caller attached one.
  if (value.state === 'redacted' || value.state === 'unavailable') return true
  if (value.state !== 'known' && value.state !== 'estimated') return false
  return (
    (text(value.value, 320) ||
      typeof value.value === 'boolean' ||
      (typeof value.value === 'number' && Number.isFinite(value.value))) &&
    (value.confidence === undefined ||
      (typeof value.confidence === 'string' && confidences.includes(value.confidence))) &&
    (value.provenance === undefined || stringList(value.provenance, 8))
    // Estimates must retain an explicit qualification; their state is always projected.
  )
}

/** Structural admission only. Source owners perform clearance, historical and knowledge filtering. */
export function validateCompactCard(record: unknown): readonly string[] {
  if (!object(record)) return Object.freeze(['record-required'])
  const issues: string[] = []
  if (!text(record.id, 160)) issues.push('public-id-required')
  if (typeof record.category !== 'string' || !categories.includes(record.category))
    issues.push('category-invalid')
  if (!validValue(record.name)) issues.push('name-invalid')
  if (record.hook !== undefined && !validValue(record.hook)) issues.push('hook-invalid')
  if (record.subjectRef !== undefined && !validValue(record.subjectRef))
    issues.push('subject-invalid')
  if (record.sourceTags !== undefined && !stringList(record.sourceTags, 12))
    issues.push('source-tags-invalid')
  if (!Array.isArray(record.fields) || record.fields.length > 24) issues.push('fields-invalid')
  else {
    const ids = new Set<string>()
    for (const field of record.fields) {
      if (
        !object(field) ||
        !text(field.id, 80) ||
        !text(field.label, 120) ||
        !validValue(field.value) ||
        (field.depth !== 'browse' && field.depth !== 'inspect')
      ) {
        issues.push('field-invalid')
        continue
      }
      if (ids.has(field.id) || field.id.startsWith('actor.')) issues.push('field-id-conflict')
      ids.add(field.id)
    }
  }
  if (record.category === 'actor') {
    const mode = record.mode
    if (!object(mode)) issues.push('actor-mode-required')
    else if (mode.kind === 'historical' || mode.kind === 'memorial') {
      if (
        !Number.isSafeInteger(mode.week) ||
        Number(mode.week) < 0 ||
        !text(mode.recordRef, 160) ||
        (mode.reconstruction !== 'snapshot' && mode.reconstruction !== 'versioned')
      )
        issues.push('historical-source-required')
    } else if (mode.kind === 'unavailable') {
      if (mode.reason !== 'missing' && mode.reason !== 'legacy')
        issues.push('unavailable-reason-required')
      if (
        (Array.isArray(record.fields) && record.fields.length) ||
        record.personnel !== undefined ||
        record.hook !== undefined
      ) {
        issues.push('unavailable-operational-data-forbidden')
      }
    } else if (mode.kind !== 'live') issues.push('actor-mode-invalid')
    if (record.personnel !== undefined) {
      if (
        !object(record.personnel) ||
        Object.entries(record.personnel).some(
          ([key, value]) => !Object.hasOwn(COMPACT_ACTOR_FIELDS, key) || !validValue(value)
        )
      )
        issues.push('personnel-invalid')
    }
  } else if (record.mode !== undefined || record.personnel !== undefined)
    issues.push('actor-fields-on-non-actor')
  return Object.freeze([...new Set(issues)])
}

function projectValue(value: CompactCardValue): CompactCardValue {
  if (value.state === 'redacted' || value.state === 'unavailable')
    return Object.freeze({ state: value.state })
  return Object.freeze({
    state: value.state,
    value: value.value,
    ...(value.confidence === undefined ? {} : { confidence: value.confidence }),
    ...(value.provenance === undefined
      ? {}
      : {
          provenance: Object.freeze([...new Set(value.provenance)].sort()),
        }),
  })
}

function projectMode(mode: CompactActorMode): CompactActorMode {
  if (mode.kind === 'live') return Object.freeze({ kind: 'live' })
  if (mode.kind === 'unavailable')
    return Object.freeze({ kind: 'unavailable', reason: mode.reason })
  return Object.freeze({
    kind: mode.kind,
    week: mode.week,
    recordRef: mode.recordRef,
    reconstruction: mode.reconstruction,
  })
}

/** Copies only admitted public fields; invalid data returns codes, never raw input or hidden values. */
export function projectCompactCard(
  record: unknown
):
  | { readonly status: 'invalid'; readonly issues: readonly string[] }
  | { readonly status: 'ready'; readonly card: CompactCardProjection } {
  const issues = validateCompactCard(record)
  if (issues.length) return Object.freeze({ status: 'invalid', issues })
  const input = record as CompactCardRecord
  const fields: CompactCardField[] = input.fields.map((field) =>
    Object.freeze({
      id: field.id,
      label: field.label,
      depth: field.depth,
      value: projectValue(field.value),
    })
  )
  let mode: CompactActorMode | undefined
  let qualifier: string | undefined
  if (input.category === 'actor') {
    mode = projectMode(input.mode)
    qualifier =
      mode.kind === 'live'
        ? 'Current operative record'
        : mode.kind === 'unavailable'
          ? `Unavailable ${mode.reason} record — no current-state substitution`
          : `${mode.kind === 'memorial' ? 'Final or archived personnel record' : 'Historical personnel record'} — week ${mode.week} (${mode.reconstruction})`
    for (const key of Object.keys(COMPACT_ACTOR_FIELDS) as (keyof typeof COMPACT_ACTOR_FIELDS)[]) {
      const value =
        input.personnel && Object.hasOwn(input.personnel, key) ? input.personnel[key] : undefined
      if (value !== undefined)
        fields.push(
          Object.freeze({
            id: `actor.${key}`,
            label: COMPACT_ACTOR_FIELDS[key],
            depth: 'browse',
            value: projectValue(value),
          })
        )
    }
  }
  const card: CompactCardProjection = Object.freeze({
    id: input.id,
    category: input.category,
    name: projectValue(input.name),
    ...(input.subjectRef === undefined ? {} : { subjectRef: projectValue(input.subjectRef) }),
    ...(input.hook === undefined ? {} : { hook: projectValue(input.hook) }),
    sourceTags: Object.freeze([...new Set(input.sourceTags ?? [])].sort()),
    ...(mode ? { mode, qualifier } : {}),
    browse: Object.freeze(fields.filter((field) => field.depth === 'browse')),
    inspect: Object.freeze(fields.filter((field) => field.depth === 'inspect')),
  })
  return Object.freeze({ status: 'ready', card })
}
