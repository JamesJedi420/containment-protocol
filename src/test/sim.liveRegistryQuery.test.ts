import { describe, expect, it } from 'vitest'
import {
  queryRegistryEntries,
  sortByTriagePriority,
  clusterByLocation,
  clusterByCertainty,
  computeEntryTriagePriority,
  buildRegistryDigest,
  type RegistryQueryFilter,
} from '../domain/liveRegistryQuery'
import { createLiveRegistryEntry } from '../domain/liveRegistry'
import type { LiveRegistryEntry } from '../domain/liveRegistry'

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<Parameters<typeof createLiveRegistryEntry>[0]> & { id: string }): LiveRegistryEntry {
  return createLiveRegistryEntry({
    entityId: overrides.id,
    entityClass: 'anomaly',
    label: overrides.id,
    operationalState: 'active',
    truthState: 'confirmed',
    confidence: 0.8,
    week: 10,
    ...overrides,
  })
}

const LOOSE_CONFIRMED_ANOMALY = makeEntry({
  id: 'reg-anom-loose',
  entityClass: 'anomaly',
  operationalState: 'loose',
  truthState: 'confirmed',
  confidence: 0.95,
  locationTag: 'sector-7',
  linkedCaseIds: ['case-alpha'],
})

const ACTIVE_SUSPECTED_ANOMALY = makeEntry({
  id: 'reg-anom-active-suspected',
  entityClass: 'anomaly',
  operationalState: 'active',
  truthState: 'suspected',
  confidence: 0.6,
  locationTag: 'sector-3',
  linkedCaseIds: ['case-beta'],
})

const CONTAINED_ANOMALY = makeEntry({
  id: 'reg-anom-contained',
  entityClass: 'anomaly',
  operationalState: 'contained',
  truthState: 'confirmed',
  confidence: 0.99,
  locationTag: 'sector-7',
})

const INFERRED_SIGNATURE = makeEntry({
  id: 'reg-sig-inferred',
  entityClass: 'signature',
  operationalState: 'active',
  truthState: 'inferred',
  confidence: 0.35,
  locationTag: 'sector-3',
})

const CONFIRMED_STAFF = makeEntry({
  id: 'reg-staff-1',
  entityClass: 'staff',
  operationalState: 'assigned',
  truthState: 'confirmed',
  confidence: 1.0,
  locationTag: 'hq',
  linkedCaseIds: ['case-alpha'],
})

const SUSPECTED_EXTERNAL = makeEntry({
  id: 'reg-ext-suspected',
  entityClass: 'external',
  operationalState: 'active',
  truthState: 'suspected',
  confidence: 0.65,
  locationTag: 'sector-7',
})

const ALL_ENTRIES: LiveRegistryEntry[] = [
  LOOSE_CONFIRMED_ANOMALY,
  ACTIVE_SUSPECTED_ANOMALY,
  CONTAINED_ANOMALY,
  INFERRED_SIGNATURE,
  CONFIRMED_STAFF,
  SUSPECTED_EXTERNAL,
]

// ---------------------------------------------------------------------------
// computeEntryTriagePriority
// ---------------------------------------------------------------------------

describe('computeEntryTriagePriority', () => {
  it('loose entry scores higher than contained entry of same class and certainty', () => {
    const looseScore = computeEntryTriagePriority(LOOSE_CONFIRMED_ANOMALY)
    const containedScore = computeEntryTriagePriority(CONTAINED_ANOMALY)
    expect(looseScore).toBeGreaterThan(containedScore)
  })

  it('anomaly scores higher than external at same operational state and certainty', () => {
    const anomalyScore = computeEntryTriagePriority(ACTIVE_SUSPECTED_ANOMALY)
    const externalScore = computeEntryTriagePriority(SUSPECTED_EXTERNAL)
    // Both active+suspected; anomaly has higher class weight
    expect(anomalyScore).toBeGreaterThan(externalScore)
  })

  it('is a deterministic integer', () => {
    const score = computeEntryTriagePriority(LOOSE_CONFIRMED_ANOMALY)
    expect(Number.isInteger(score)).toBe(true)
    expect(computeEntryTriagePriority(LOOSE_CONFIRMED_ANOMALY)).toBe(score)
  })

  it('staff scores lower than anomaly threat at similar operational state', () => {
    const staffScore = computeEntryTriagePriority(CONFIRMED_STAFF)
    const anomalyScore = computeEntryTriagePriority(LOOSE_CONFIRMED_ANOMALY)
    expect(anomalyScore).toBeGreaterThan(staffScore)
  })
})

// ---------------------------------------------------------------------------
// queryRegistryEntries
// ---------------------------------------------------------------------------

describe('queryRegistryEntries', () => {
  it('no filter returns all entries sorted by priority', () => {
    const result = queryRegistryEntries(ALL_ENTRIES)
    expect(result).toHaveLength(ALL_ENTRIES.length)
    // First entry should be highest priority (loose confirmed anomaly)
    expect(result[0].id).toBe('reg-anom-loose')
  })

  it('filters by entityClass', () => {
    const filter: RegistryQueryFilter = { entityClasses: ['staff'] }
    const result = queryRegistryEntries(ALL_ENTRIES, filter)
    expect(result).toHaveLength(1)
    expect(result[0].entityClass).toBe('staff')
  })

  it('filters by operationalState', () => {
    const filter: RegistryQueryFilter = { operationalStates: ['contained'] }
    const result = queryRegistryEntries(ALL_ENTRIES, filter)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('reg-anom-contained')
  })

  it('filters by truthState', () => {
    const filter: RegistryQueryFilter = { truthStates: ['suspected'] }
    const result = queryRegistryEntries(ALL_ENTRIES, filter)
    expect(result.every((e) => e.truthState === 'suspected')).toBe(true)
    expect(result).toHaveLength(2) // anomaly + external
  })

  it('filters by minimumConfidence', () => {
    const filter: RegistryQueryFilter = { minimumConfidence: 0.9 }
    const result = queryRegistryEntries(ALL_ENTRIES, filter)
    expect(result.every((e) => e.confidence >= 0.9)).toBe(true)
    // LOOSE_CONFIRMED_ANOMALY (0.95), CONTAINED_ANOMALY (0.99), CONFIRMED_STAFF (1.0)
    expect(result).toHaveLength(3)
  })

  it('filters by locationTag', () => {
    const filter: RegistryQueryFilter = { locationTag: 'sector-7' }
    const result = queryRegistryEntries(ALL_ENTRIES, filter)
    expect(result.every((e) => e.locationTag === 'sector-7')).toBe(true)
    expect(result).toHaveLength(3) // loose anomaly + contained anomaly + external
  })

  it('filters by linkedCaseId', () => {
    const filter: RegistryQueryFilter = { linkedCaseId: 'case-alpha' }
    const result = queryRegistryEntries(ALL_ENTRIES, filter)
    expect(result.every((e) => e.linkedCaseIds.includes('case-alpha'))).toBe(true)
    expect(result).toHaveLength(2) // loose anomaly + staff
  })

  it('combines multiple filters (intersection)', () => {
    const filter: RegistryQueryFilter = {
      locationTag: 'sector-7',
      truthStates: ['confirmed'],
    }
    const result = queryRegistryEntries(ALL_ENTRIES, filter)
    // sector-7 confirmed: loose anomaly + contained anomaly
    expect(result).toHaveLength(2)
    expect(result.every((e) => e.locationTag === 'sector-7' && e.truthState === 'confirmed')).toBe(true)
  })

  it('is deterministic — same result on repeat calls', () => {
    const a = queryRegistryEntries(ALL_ENTRIES, { locationTag: 'sector-7' })
    const b = queryRegistryEntries(ALL_ENTRIES, { locationTag: 'sector-7' })
    expect(a).toEqual(b)
  })

  it('returns empty array when no entries match', () => {
    const filter: RegistryQueryFilter = { locationTag: 'nonexistent-zone' }
    const result = queryRegistryEntries(ALL_ENTRIES, filter)
    expect(result).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// sortByTriagePriority
// ---------------------------------------------------------------------------

describe('sortByTriagePriority', () => {
  it('puts loose anomaly before active anomaly before contained', () => {
    const sorted = sortByTriagePriority([CONTAINED_ANOMALY, LOOSE_CONFIRMED_ANOMALY, ACTIVE_SUSPECTED_ANOMALY])
    expect(sorted[0].id).toBe('reg-anom-loose')
    expect(sorted[2].id).toBe('reg-anom-contained')
  })

  it('does not mutate the input array', () => {
    const input = [CONTAINED_ANOMALY, LOOSE_CONFIRMED_ANOMALY]
    const originalFirst = input[0].id
    sortByTriagePriority(input)
    expect(input[0].id).toBe(originalFirst)
  })

  it('is stable for equal-priority entries (sorted by id)', () => {
    const a = makeEntry({ id: 'aaa', operationalState: 'active', truthState: 'confirmed', confidence: 0.8 })
    const b = makeEntry({ id: 'bbb', operationalState: 'active', truthState: 'confirmed', confidence: 0.8 })
    const sorted = sortByTriagePriority([b, a])
    expect(sorted[0].id).toBe('aaa')
    expect(sorted[1].id).toBe('bbb')
  })
})

// ---------------------------------------------------------------------------
// clusterByLocation
// ---------------------------------------------------------------------------

describe('clusterByLocation', () => {
  it('groups entries by locationTag', () => {
    const clusters = clusterByLocation(ALL_ENTRIES)
    expect(Object.keys(clusters).sort()).toEqual(['hq', 'sector-3', 'sector-7'])
  })

  it('entries without locationTag go to (unknown) key', () => {
    const entry = makeEntry({ id: 'no-location' })
    const clusters = clusterByLocation([entry])
    expect(clusters['(unknown)']).toHaveLength(1)
  })

  it('each cluster is sorted by triage priority', () => {
    const clusters = clusterByLocation(ALL_ENTRIES)
    const sector7 = clusters['sector-7']
    expect(sector7[0].id).toBe('reg-anom-loose') // loose > contained, external
  })

  it('is deterministic', () => {
    const a = clusterByLocation(ALL_ENTRIES)
    const b = clusterByLocation(ALL_ENTRIES)
    expect(a).toEqual(b)
  })
})

// ---------------------------------------------------------------------------
// clusterByCertainty
// ---------------------------------------------------------------------------

describe('clusterByCertainty', () => {
  it('separates confirmed, suspected, and unresolved entries', () => {
    const cluster = clusterByCertainty(ALL_ENTRIES)
    // confirmed: loose anomaly, contained anomaly, staff
    expect(cluster.confirmed.every((e) => e.truthState === 'confirmed')).toBe(true)
    // suspected: active anomaly, external
    expect(cluster.suspected.every((e) => e.truthState === 'suspected')).toBe(true)
    // unresolved: inferred signature
    expect(cluster.unresolved.every((e) => e.truthState === 'inferred' || e.truthState === 'false_positive' || e.truthState === 'missing')).toBe(true)
  })

  it('each tier sorted by triage priority', () => {
    const cluster = clusterByCertainty(ALL_ENTRIES)
    // Among confirmed: loose anomaly should rank first (loose > contained > staff)
    expect(cluster.confirmed[0].id).toBe('reg-anom-loose')
  })

  it('is deterministic', () => {
    const a = clusterByCertainty(ALL_ENTRIES)
    const b = clusterByCertainty(ALL_ENTRIES)
    expect(a).toEqual(b)
  })
})

// ---------------------------------------------------------------------------
// buildRegistryDigest
// ---------------------------------------------------------------------------

describe('buildRegistryDigest', () => {
  it('groups entries into the correct buckets', () => {
    const digest = buildRegistryDigest(ALL_ENTRIES, 10)
    // confirmedThreats: anomaly + confirmed = loose + contained
    expect(digest.confirmedThreats.every((e) => e.entityClass === 'anomaly' && e.truthState === 'confirmed')).toBe(true)
    expect(digest.confirmedThreats).toHaveLength(2)
    // suspectedThreats: anomaly suspected
    expect(digest.suspectedThreats).toHaveLength(1)
    expect(digest.suspectedThreats[0].entityClass).toBe('anomaly')
    // inferredSignatures: signature entries
    expect(digest.inferredSignatures).toHaveLength(1)
    expect(digest.inferredSignatures[0].entityClass).toBe('signature')
    // staff
    expect(digest.staffEntries).toHaveLength(1)
    // external
    expect(digest.externalEntries).toHaveLength(1)
  })

  it('activeThreatCount excludes contained and transferred entries', () => {
    const digest = buildRegistryDigest(ALL_ENTRIES, 10)
    // confirmedThreats: loose(active), contained(excluded) = 1
    // suspectedThreats: active suspected anomaly = 1
    // inferredSignatures: active inferred signature = 1
    // total active = 3
    expect(digest.activeThreatCount).toBe(3)
  })

  it('overloadFlag is false when below threshold', () => {
    const digest = buildRegistryDigest(ALL_ENTRIES, 10)
    expect(digest.overloadFlag).toBe(false) // 3 < 5
  })

  it('overloadFlag is true when activeThreatCount >= overloadThreshold (5)', () => {
    const extras: LiveRegistryEntry[] = []
    for (let i = 0; i < 5; i++) {
      extras.push(makeEntry({
        id: `extra-${i}`,
        entityClass: 'anomaly',
        operationalState: 'active',
        truthState: 'confirmed',
        confidence: 0.8,
      }))
    }
    const digest = buildRegistryDigest(extras, 10)
    expect(digest.activeThreatCount).toBe(5)
    expect(digest.overloadFlag).toBe(true)
  })

  it('topPriorityEntries has at most digestTopN (5) entries', () => {
    const digest = buildRegistryDigest(ALL_ENTRIES, 10)
    expect(digest.topPriorityEntries.length).toBeLessThanOrEqual(5)
    // First entry should be highest priority overall
    expect(digest.topPriorityEntries[0].id).toBe('reg-anom-loose')
  })

  it('empty input produces empty digest with no overload', () => {
    const digest = buildRegistryDigest([], 1)
    expect(digest.confirmedThreats).toHaveLength(0)
    expect(digest.activeThreatCount).toBe(0)
    expect(digest.overloadFlag).toBe(false)
    expect(digest.topPriorityEntries).toHaveLength(0)
  })

  it('is deterministic', () => {
    const a = buildRegistryDigest(ALL_ENTRIES, 10)
    const b = buildRegistryDigest(ALL_ENTRIES, 10)
    expect(a).toEqual(b)
  })
})
