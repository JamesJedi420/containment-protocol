/**
 * SPE-1757 — extranormal temporal event registry (bounded pure domain).
 *
 * Schedules and predicted windows use SPE-1071 authoritative campaign weeks only
 * (see SPE-3180: no second clock, no subjective-time keys on records). Consumes
 * the frozen subjective-vs-authoritative decision; does not invent calendar internals.
 */

export const EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_OWNER = 'SPE-1757' as const
export const EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_SCHEMA_VERSION = 'spe-1757.v1' as const
export const EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_MAX_EVENTS = 128 as const
export const PLANNING_RISK_DIVERGENCE_THRESHOLD = 35 as const

export const EXTRANORMAL_TEMPORAL_EVENT_TYPES = [
  'arrivals',
  'disappearances',
  'duplicate_appearances',
  'timeline_edits',
  'object_drops',
  'actor_incursions',
  'chronal_visions',
  'local_physics_inconsistencies',
] as const
export type ExtranormalTemporalEventType = (typeof EXTRANORMAL_TEMPORAL_EVENT_TYPES)[number]

export const CHRONOLOGY_CONFIDENCE_LEVELS = [
  'uncertain',
  'provisional',
  'stable_claim_forbidden',
] as const
export type ChronologyConfidence = (typeof CHRONOLOGY_CONFIDENCE_LEVELS)[number]

export interface AuthoritativeWeekWindow {
  readonly startWeek: number
  readonly endWeek: number
}

export interface LinkedIncidentRef {
  readonly family: string
  readonly id: string
}

export interface TemporalEventRecord {
  readonly id: string
  readonly type: ExtranormalTemporalEventType
  readonly zoneId: string
  readonly apparentSource: string
  readonly triggerNote: string
  readonly predictedWindow: AuthoritativeWeekWindow
  readonly scheduleDriftWeeks: number
  readonly researchValue: number
  readonly publicRisk: number
  readonly residualRisk: number
  readonly instabilityPulseActive: boolean
  readonly linkedIncidentRef?: LinkedIncidentRef
  readonly chronologyConfidence: ChronologyConfidence
}

export interface ExtranormalTemporalEventRegistry {
  readonly schemaVersion: typeof EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_SCHEMA_VERSION
  readonly events: Readonly<Record<string, TemporalEventRecord>>
}

export type PlanningPriorityBand = 'elevated' | 'standard' | 'suppressed'

export interface TemporalEventPlanningSignal {
  readonly eventId: string
  readonly zoneId: string
  readonly researchPriority: PlanningPriorityBand
  readonly publicResponsePriority: PlanningPriorityBand
  readonly divergentPlanning: boolean
  readonly note: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isRiskScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100
}

function isExtranormalTemporalEventType(value: unknown): value is ExtranormalTemporalEventType {
  return (
    typeof value === 'string' &&
    (EXTRANORMAL_TEMPORAL_EVENT_TYPES as readonly string[]).includes(value)
  )
}

function isChronologyConfidence(value: unknown): value is ChronologyConfidence {
  return (
    typeof value === 'string' &&
    (CHRONOLOGY_CONFIDENCE_LEVELS as readonly string[]).includes(value)
  )
}

function parseAuthoritativeWeekWindow(raw: unknown): AuthoritativeWeekWindow | null {
  if (!isRecord(raw)) return null
  if (!isNonNegativeInt(raw.startWeek) || !isNonNegativeInt(raw.endWeek)) return null
  if (raw.endWeek < raw.startWeek) return null
  return Object.freeze({ startWeek: raw.startWeek, endWeek: raw.endWeek })
}

function parseLinkedIncidentRef(raw: unknown): LinkedIncidentRef | null {
  if (!isRecord(raw)) return null
  if (!isNonEmptyString(raw.family) || !isNonEmptyString(raw.id)) return null
  return Object.freeze({ family: raw.family.trim(), id: raw.id.trim() })
}

function freezeTemporalEventRecord(record: TemporalEventRecord): TemporalEventRecord {
  return Object.freeze({
    id: record.id,
    type: record.type,
    zoneId: record.zoneId,
    apparentSource: record.apparentSource,
    triggerNote: record.triggerNote,
    predictedWindow: Object.freeze({ ...record.predictedWindow }),
    scheduleDriftWeeks: record.scheduleDriftWeeks,
    researchValue: record.researchValue,
    publicRisk: record.publicRisk,
    residualRisk: record.residualRisk,
    instabilityPulseActive: record.instabilityPulseActive,
    ...(record.linkedIncidentRef !== undefined
      ? { linkedIncidentRef: Object.freeze({ ...record.linkedIncidentRef }) }
      : {}),
    chronologyConfidence: record.chronologyConfidence,
  })
}

export function parseTemporalEventRecord(raw: unknown): TemporalEventRecord | null {
  if (!isRecord(raw)) return null
  if (!isNonEmptyString(raw.id) || !isNonEmptyString(raw.zoneId)) return null
  if (!isExtranormalTemporalEventType(raw.type)) return null
  if (!isNonEmptyString(raw.apparentSource) || !isNonEmptyString(raw.triggerNote)) return null
  const predictedWindow = parseAuthoritativeWeekWindow(raw.predictedWindow)
  if (!predictedWindow) return null
  if (!Number.isInteger(raw.scheduleDriftWeeks)) return null
  if (!isRiskScore(raw.researchValue) || !isRiskScore(raw.publicRisk) || !isRiskScore(raw.residualRisk)) {
    return null
  }
  if (typeof raw.instabilityPulseActive !== 'boolean') return null
  if (!isChronologyConfidence(raw.chronologyConfidence)) return null

  let linkedIncidentRef: LinkedIncidentRef | undefined
  if (raw.linkedIncidentRef !== undefined) {
    const parsedRef = parseLinkedIncidentRef(raw.linkedIncidentRef)
    if (!parsedRef) return null
    linkedIncidentRef = parsedRef
  }

  return freezeTemporalEventRecord({
    id: raw.id.trim(),
    type: raw.type,
    zoneId: raw.zoneId.trim(),
    apparentSource: raw.apparentSource.trim(),
    triggerNote: raw.triggerNote.trim(),
    predictedWindow,
    scheduleDriftWeeks: raw.scheduleDriftWeeks,
    researchValue: raw.researchValue,
    publicRisk: raw.publicRisk,
    residualRisk: raw.residualRisk,
    instabilityPulseActive: raw.instabilityPulseActive,
    ...(linkedIncidentRef !== undefined ? { linkedIncidentRef } : {}),
    chronologyConfidence: raw.chronologyConfidence,
  })
}

function freezeRegistry(registry: ExtranormalTemporalEventRegistry): ExtranormalTemporalEventRegistry {
  const events: Record<string, TemporalEventRecord> = {}
  for (const [key, record] of Object.entries(registry.events)) {
    events[key] = freezeTemporalEventRecord(record)
  }
  return Object.freeze({
    schemaVersion: EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_SCHEMA_VERSION,
    events: Object.freeze(events),
  })
}

export function createEmptyExtranormalTemporalEventRegistry(): ExtranormalTemporalEventRegistry {
  return freezeRegistry({
    schemaVersion: EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_SCHEMA_VERSION,
    events: Object.freeze({}),
  })
}

export function parseExtranormalTemporalEventRegistry(
  raw: unknown,
): ExtranormalTemporalEventRegistry | null {
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      return null
    }
  }
  if (!isRecord(parsed)) return null
  if (parsed.schemaVersion !== EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_SCHEMA_VERSION) return null
  if (!isRecord(parsed.events)) return null

  const events: Record<string, TemporalEventRecord> = {}
  const ids = Object.keys(parsed.events).sort((a, b) => a.localeCompare(b))
  if (ids.length > EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_MAX_EVENTS) return null

  for (const key of ids) {
    const record = parseTemporalEventRecord(parsed.events[key])
    if (!record) return null
    if (record.id !== key) return null
    if (events[key] !== undefined) return null
    events[key] = record
  }

  return freezeRegistry({
    schemaVersion: EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_SCHEMA_VERSION,
    events: Object.freeze(events),
  })
}

/** Alias for slice doc / call-site ergonomics. */
export const parseRegistry = parseExtranormalTemporalEventRegistry

export function upsertEvent(
  registry: ExtranormalTemporalEventRegistry,
  record: TemporalEventRecord | unknown,
): ExtranormalTemporalEventRegistry | null {
  const parsed = parseTemporalEventRecord(record)
  if (!parsed) return null
  const isNew = registry.events[parsed.id] === undefined
  const nextCount = Object.keys(registry.events).length + (isNew ? 1 : 0)
  if (nextCount > EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_MAX_EVENTS) return null

  return freezeRegistry({
    schemaVersion: EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_SCHEMA_VERSION,
    events: Object.freeze({
      ...registry.events,
      [parsed.id]: parsed,
    }),
  })
}

export function listEventsForZone(
  registry: ExtranormalTemporalEventRegistry,
  zoneId: string,
): readonly TemporalEventRecord[] {
  const trimmed = zoneId.trim()
  if (trimmed === '') return Object.freeze([])
  const matches = Object.values(registry.events).filter((event) => event.zoneId === trimmed)
  matches.sort((left, right) => left.id.localeCompare(right.id))
  return Object.freeze(matches.map((event) => freezeTemporalEventRecord(event)))
}

export function projectEffectivePredictedWindow(
  record: TemporalEventRecord,
): AuthoritativeWeekWindow {
  const drift = record.scheduleDriftWeeks
  return Object.freeze({
    startWeek: record.predictedWindow.startWeek + drift,
    endWeek: record.predictedWindow.endWeek + drift,
  })
}

export function applyScheduleDrift(
  registry: ExtranormalTemporalEventRegistry,
  eventId: string,
  additionalDriftWeeks: number,
): ExtranormalTemporalEventRegistry | null {
  if (!isNonEmptyString(eventId) || !Number.isInteger(additionalDriftWeeks)) return null
  const existing = registry.events[eventId.trim()]
  if (!existing) return null
  return upsertEvent(registry, {
    ...existing,
    scheduleDriftWeeks: existing.scheduleDriftWeeks + additionalDriftWeeks,
  })
}

export function isInstabilityWindowActive(
  record: TemporalEventRecord,
  authoritativeWeek: number,
): boolean {
  if (!record.instabilityPulseActive || !isNonNegativeInt(authoritativeWeek)) return false
  const window = projectEffectivePredictedWindow(record)
  return authoritativeWeek >= window.startWeek && authoritativeWeek <= window.endWeek
}

function priorityBand(score: number, elevated: boolean, suppressed: boolean): PlanningPriorityBand {
  if (suppressed) return 'suppressed'
  if (elevated) return 'elevated'
  if (score >= 55) return 'elevated'
  if (score <= 20) return 'suppressed'
  return 'standard'
}

export function projectPlanningSignals(
  registry: ExtranormalTemporalEventRegistry,
): readonly TemporalEventPlanningSignal[] {
  const signals: TemporalEventPlanningSignal[] = []
  const ids = Object.keys(registry.events).sort((a, b) => a.localeCompare(b))

  for (const eventId of ids) {
    const event = registry.events[eventId]
    const gap = event.researchValue - event.publicRisk
    const divergent = Math.abs(gap) >= PLANNING_RISK_DIVERGENCE_THRESHOLD

    let researchPriority: PlanningPriorityBand = priorityBand(event.researchValue, false, false)
    let publicResponsePriority: PlanningPriorityBand = priorityBand(event.publicRisk, false, false)
    let note = 'Research and public-risk posture aligned within threshold.'

    if (divergent) {
      if (gap > 0) {
        researchPriority = 'elevated'
        publicResponsePriority = 'suppressed'
        note =
          'High research value with lower public risk — prioritize observation and sampling over public mobilization.'
      } else {
        researchPriority = 'suppressed'
        publicResponsePriority = 'elevated'
        note =
          'Elevated public risk with lower research yield — prioritize containment narrative and exposure control over deep study.'
      }
    }

    signals.push(
      Object.freeze({
        eventId: event.id,
        zoneId: event.zoneId,
        researchPriority,
        publicResponsePriority,
        divergentPlanning: divergent,
        note,
      }),
    )
  }

  return Object.freeze(signals)
}

export function linkIncidentRef(
  registry: ExtranormalTemporalEventRegistry,
  eventId: string,
  incidentRef: LinkedIncidentRef | unknown,
): ExtranormalTemporalEventRegistry | null {
  if (!isNonEmptyString(eventId)) return null
  const existing = registry.events[eventId.trim()]
  if (!existing) return null
  const parsedRef = parseLinkedIncidentRef(incidentRef)
  if (!parsedRef) return null
  return upsertEvent(registry, {
    ...existing,
    linkedIncidentRef: parsedRef,
  })
}

// ---------------------------------------------------------------------------
// Deterministic fixtures (Linear acceptance coverage)
// ---------------------------------------------------------------------------

export const DEMO_ZONE_CANAL_SPILLWAY = 'zone:old-canal-spillway' as const

export const TEMPORAL_EVENT_ARRIVAL_FIXTURE: TemporalEventRecord = Object.freeze({
  id: 'temporal:canal-late-arrival',
  type: 'arrivals',
  zoneId: DEMO_ZONE_CANAL_SPILLWAY,
  apparentSource: 'witness-grid:canal-north',
  triggerNote: 'Coordinated mass arrival reported one week before instruments registered displacement.',
  predictedWindow: Object.freeze({ startWeek: 12, endWeek: 14 }),
  scheduleDriftWeeks: 0,
  researchValue: 72,
  publicRisk: 28,
  residualRisk: 41,
  instabilityPulseActive: true,
  chronologyConfidence: 'uncertain',
})

export const TEMPORAL_EVENT_CHRONAL_VISION_FIXTURE: TemporalEventRecord = Object.freeze({
  id: 'temporal:canal-chronal-vision',
  type: 'chronal_visions',
  zoneId: DEMO_ZONE_CANAL_SPILLWAY,
  apparentSource: 'sensor:chronal-diffuser-3',
  triggerNote: 'Overlapping future-state glimpses without a stable anchor week.',
  predictedWindow: Object.freeze({ startWeek: 13, endWeek: 16 }),
  scheduleDriftWeeks: 0,
  researchValue: 81,
  publicRisk: 36,
  residualRisk: 52,
  instabilityPulseActive: false,
  chronologyConfidence: 'provisional',
})

export const TEMPORAL_EVENT_TIMELINE_EDIT_FIXTURE: TemporalEventRecord = Object.freeze({
  id: 'temporal:canal-timeline-edit',
  type: 'timeline_edits',
  zoneId: DEMO_ZONE_CANAL_SPILLWAY,
  apparentSource: 'record:city-archive-microfilm',
  triggerNote: 'Municipal logs retroactively insert a maintenance closure that never occurred on-site.',
  predictedWindow: Object.freeze({ startWeek: 11, endWeek: 13 }),
  scheduleDriftWeeks: 2,
  researchValue: 42,
  publicRisk: 80,
  residualRisk: 63,
  instabilityPulseActive: true,
  linkedIncidentRef: Object.freeze({
    family: 'extranormal_incident',
    id: 'incident:canal-covert-intake-041',
  }),
  chronologyConfidence: 'stable_claim_forbidden',
})

export const DEMO_EXTRANORMAL_TEMPORAL_EVENT_REGISTRY: ExtranormalTemporalEventRegistry =
  freezeRegistry({
    schemaVersion: EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_SCHEMA_VERSION,
    events: Object.freeze({
      [TEMPORAL_EVENT_ARRIVAL_FIXTURE.id]: TEMPORAL_EVENT_ARRIVAL_FIXTURE,
      [TEMPORAL_EVENT_CHRONAL_VISION_FIXTURE.id]: TEMPORAL_EVENT_CHRONAL_VISION_FIXTURE,
      [TEMPORAL_EVENT_TIMELINE_EDIT_FIXTURE.id]: TEMPORAL_EVENT_TIMELINE_EDIT_FIXTURE,
    }),
  })
