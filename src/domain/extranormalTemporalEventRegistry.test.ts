import { describe, expect, it } from 'vitest'
import {
  DEMO_EXTRANORMAL_TEMPORAL_EVENT_REGISTRY,
  DEMO_ZONE_CANAL_SPILLWAY,
  EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_OWNER,
  EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_SCHEMA_VERSION,
  EXTRANORMAL_TEMPORAL_EVENT_TYPES,
  TEMPORAL_EVENT_ARRIVAL_FIXTURE,
  TEMPORAL_EVENT_TIMELINE_EDIT_FIXTURE,
  applyScheduleDrift,
  createEmptyExtranormalTemporalEventRegistry,
  isInstabilityWindowActive,
  linkIncidentRef,
  listEventsForZone,
  parseExtranormalTemporalEventRegistry,
  parseTemporalEventRecord,
  projectEffectivePredictedWindow,
  projectPlanningSignals,
  upsertEvent,
} from './extranormalTemporalEventRegistry'

describe('SPE-1757 extranormal temporal event registry', () => {
  it('exports frozen contract metadata and exhaustive event typing', () => {
    expect(EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_OWNER).toBe('SPE-1757')
    expect(EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_SCHEMA_VERSION).toBe('spe-1757.v1')
    expect(EXTRANORMAL_TEMPORAL_EVENT_TYPES).toContain('timeline_edits')
    expect(EXTRANORMAL_TEMPORAL_EVENT_TYPES).toContain('local_physics_inconsistencies')
  })

  it('stores multiple typed temporal events for one zone in the demo registry', () => {
    const zoneEvents = listEventsForZone(DEMO_EXTRANORMAL_TEMPORAL_EVENT_REGISTRY, DEMO_ZONE_CANAL_SPILLWAY)
    expect(zoneEvents.length).toBeGreaterThan(1)
    const types = zoneEvents.map((event) => event.type)
    expect(new Set(types).size).toBeGreaterThan(1)
    expect(zoneEvents.map((event) => event.id)).toEqual([
      'temporal:canal-chronal-vision',
      'temporal:canal-late-arrival',
      'temporal:canal-timeline-edit',
    ])
  })

  it('parses and round-trips registry storage deterministically', () => {
    const serialized = JSON.stringify(DEMO_EXTRANORMAL_TEMPORAL_EVENT_REGISTRY)
    const reparsed = parseExtranormalTemporalEventRegistry(serialized)
    expect(reparsed).not.toBeNull()
    expect(reparsed).toEqual(DEMO_EXTRANORMAL_TEMPORAL_EVENT_REGISTRY)
    expect(parseTemporalEventRecord(TEMPORAL_EVENT_ARRIVAL_FIXTURE)?.type).toBe('arrivals')
  })

  it('rejects malformed registry siblings fail-closed', () => {
    expect(
      parseExtranormalTemporalEventRegistry({
        schemaVersion: EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_SCHEMA_VERSION,
        events: {
          'temporal:key-mismatch': TEMPORAL_EVENT_ARRIVAL_FIXTURE,
        },
      }),
    ).toBeNull()
    expect(
      parseExtranormalTemporalEventRegistry({
        schemaVersion: EXTRANORMAL_TEMPORAL_EVENT_REGISTRY_SCHEMA_VERSION,
        events: { 'temporal:bad': { type: 'not-a-type' } },
      }),
    ).toBeNull()
    expect(parseTemporalEventRecord({ ...TEMPORAL_EVENT_ARRIVAL_FIXTURE, id: '__proto__' })).toBeNull()
    expect(parseTemporalEventRecord({ ...TEMPORAL_EVENT_ARRIVAL_FIXTURE, scheduleDriftWeeks: -99 })).toBeNull()
  })

  it('rejects over-capacity upsert and negative projected windows from drift', () => {
    let registry = createEmptyExtranormalTemporalEventRegistry()
    for (let i = 0; i < 128; i += 1) {
      const next = upsertEvent(registry, {
        ...TEMPORAL_EVENT_ARRIVAL_FIXTURE,
        id: `temporal:cap-${String(i).padStart(3, '0')}`,
      })
      expect(next).not.toBeNull()
      registry = next!
    }
    expect(
      upsertEvent(registry, {
        ...TEMPORAL_EVENT_ARRIVAL_FIXTURE,
        id: 'temporal:cap-overflow',
      }),
    ).toBeNull()

    expect(
      applyScheduleDrift(DEMO_EXTRANORMAL_TEMPORAL_EVENT_REGISTRY, TEMPORAL_EVENT_ARRIVAL_FIXTURE.id, -50),
    ).toBeNull()
  })

  it('applies schedule drift to predicted windows without a second clock', () => {
    const before = projectEffectivePredictedWindow(TEMPORAL_EVENT_TIMELINE_EDIT_FIXTURE)
    expect(before).toEqual({ startWeek: 13, endWeek: 15 })

    const drifted = applyScheduleDrift(
      DEMO_EXTRANORMAL_TEMPORAL_EVENT_REGISTRY,
      TEMPORAL_EVENT_TIMELINE_EDIT_FIXTURE.id,
      3,
    )
    expect(drifted).not.toBeNull()
    const record = drifted!.events[TEMPORAL_EVENT_TIMELINE_EDIT_FIXTURE.id]
    expect(record.scheduleDriftWeeks).toBe(5)
    expect(projectEffectivePredictedWindow(record)).toEqual({ startWeek: 16, endWeek: 18 })
  })

  it('flags instability windows from drift-adjusted authoritative weeks', () => {
    const arrival = TEMPORAL_EVENT_ARRIVAL_FIXTURE
    expect(isInstabilityWindowActive(arrival, 12)).toBe(true)
    expect(isInstabilityWindowActive(arrival, 15)).toBe(false)

    const driftedRegistry = applyScheduleDrift(
      DEMO_EXTRANORMAL_TEMPORAL_EVENT_REGISTRY,
      arrival.id,
      2,
    )!
    const driftedArrival = driftedRegistry.events[arrival.id]
    expect(isInstabilityWindowActive(driftedArrival, 14)).toBe(true)
    expect(isInstabilityWindowActive(driftedArrival, 11)).toBe(false)
  })

  it('changes planning when research value and public risk diverge', () => {
    const signals = projectPlanningSignals(DEMO_EXTRANORMAL_TEMPORAL_EVENT_REGISTRY)
    const arrivalSignal = signals.find((signal) => signal.eventId === TEMPORAL_EVENT_ARRIVAL_FIXTURE.id)
    const editSignal = signals.find((signal) => signal.eventId === TEMPORAL_EVENT_TIMELINE_EDIT_FIXTURE.id)

    expect(arrivalSignal?.divergentPlanning).toBe(true)
    expect(arrivalSignal?.researchPriority).toBe('elevated')
    expect(arrivalSignal?.publicResponsePriority).toBe('suppressed')

    expect(editSignal?.divergentPlanning).toBe(true)
    expect(editSignal?.researchPriority).toBe('suppressed')
    expect(editSignal?.publicResponsePriority).toBe('elevated')
  })

  it('links incident refs without implying a stable chronology claim', () => {
    expect(TEMPORAL_EVENT_TIMELINE_EDIT_FIXTURE.linkedIncidentRef).toEqual({
      family: 'extranormal_incident',
      id: 'incident:canal-covert-intake-041',
    })
    expect(TEMPORAL_EVENT_TIMELINE_EDIT_FIXTURE.chronologyConfidence).toBe('stable_claim_forbidden')

    const empty = createEmptyExtranormalTemporalEventRegistry()
    const seeded = upsertEvent(empty, TEMPORAL_EVENT_ARRIVAL_FIXTURE)!
    const linked = linkIncidentRef(seeded, TEMPORAL_EVENT_ARRIVAL_FIXTURE.id, {
      family: 'extranormal_incident',
      id: 'incident:canal-arrival-intake-012',
    })
    expect(linked?.events[TEMPORAL_EVENT_ARRIVAL_FIXTURE.id].linkedIncidentRef).toEqual({
      family: 'extranormal_incident',
      id: 'incident:canal-arrival-intake-012',
    })
    expect(linked?.events[TEMPORAL_EVENT_ARRIVAL_FIXTURE.id].chronologyConfidence).toBe('uncertain')
  })
})
