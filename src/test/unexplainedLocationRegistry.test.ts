import { describe, expect, it } from 'vitest'
import {
  EFFECT_DOMAIN_TAGS,
  EFFECT_GEOMETRIES,
  LIFECYCLE_CHAIN_LOCATION_FIXTURE,
  POPULATION_SELECTOR_KINDS,
  REMOTE_MONITOR_SITE_FIXTURE,
  projectUnexplainedLocationForMap,
  validateUnexplainedLocationRecord,
  type UnexplainedLocationRecord,
} from '../domain/unexplainedLocationRegistry'

function baseRecord(
  overrides: Partial<UnexplainedLocationRecord> = {}
): UnexplainedLocationRecord {
  return {
    id: 'location:test-base',
    label: 'Test base location',
    effectGeometry: 'room',
    effectDomainTags: ['spatial'],
    populationSelectors: [{ kind: 'location', value: 'test-room' }],
    lifecycleState: 'active',
    latentSeverityScore: 15,
    ...overrides,
  }
}

describe('unexplainedLocationRegistry (SPE-2106 slice 1)', () => {
  it('validates remote site fixture with monitor_only, map suppression, and low accessProbability', () => {
    const result = validateUnexplainedLocationRecord(REMOTE_MONITOR_SITE_FIXTURE)

    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
    expect(REMOTE_MONITOR_SITE_FIXTURE.lifecycleState).toBe('monitor_only')
    expect(REMOTE_MONITOR_SITE_FIXTURE.securityControlTags).toContain('map_manipulation')
    expect(REMOTE_MONITOR_SITE_FIXTURE.accessProbability).toBe(0.08)
    expect(REMOTE_MONITOR_SITE_FIXTURE.mapLayerPolicy).toBeTruthy()
  })

  it('preserves lifecycle statusHistory for active → utility_use → archived chain', () => {
    const result = validateUnexplainedLocationRecord(LIFECYCLE_CHAIN_LOCATION_FIXTURE)

    expect(result.valid).toBe(true)
    expect(LIFECYCLE_CHAIN_LOCATION_FIXTURE.lifecycleState).toBe('archived')
    expect(LIFECYCLE_CHAIN_LOCATION_FIXTURE.statusHistory).toEqual([
      { fromState: 'active', toState: 'utility_use', week: 14, note: 'Repurposed under utility cover.' },
      { fromState: 'utility_use', toState: 'archived', week: 52, note: 'Monitoring cadence retired.' },
    ])
  })

  it('round-trips effectGeometry and populationSelectors on validation', () => {
    const record = baseRecord({
      effectGeometry: 'route',
      effectDomainTags: [...EFFECT_DOMAIN_TAGS],
      populationSelectors: POPULATION_SELECTOR_KINDS.map((kind) => ({
        kind,
        value: `${kind}-value`,
      })),
    })

    const result = validateUnexplainedLocationRecord(record)

    expect(result.valid).toBe(true)
    expect(record.effectGeometry).toBe('route')
    expect(record.effectDomainTags).toEqual([...EFFECT_DOMAIN_TAGS])
    expect(record.populationSelectors).toHaveLength(POPULATION_SELECTOR_KINDS.length)
  })

  it('warns on severity_underestimate for low_priority with latentSeverityScore 0 under public_managed', () => {
    const result = validateUnexplainedLocationRecord(
      baseRecord({
        lowPriority: true,
        latentSeverityScore: 0,
        lifecycleState: 'public_managed',
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'severity_underestimate',
        severity: 'warning',
      }),
    ])
  })

  it('warns when disputed lifecycle lacks contradiction refs', () => {
    const result = validateUnexplainedLocationRecord(
      baseRecord({
        lifecycleState: 'disputed',
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'disputed_without_contradiction_refs',
        severity: 'warning',
      }),
    ])
  })

  it('accepts disputed lifecycle when contradiction refs are present', () => {
    const result = validateUnexplainedLocationRecord(
      baseRecord({
        lifecycleState: 'disputed',
        contradictionRefs: ['contradiction:sensor-vs-witness'],
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues.some((issue) => issue.code === 'disputed_without_contradiction_refs')).toBe(
      false
    )
  })

  it('errors on neutralized without authorization when policy requires it', () => {
    const result = validateUnexplainedLocationRecord(
      baseRecord({
        lifecycleState: 'neutralized',
      }),
      { requireNeutralizationAuthorization: true }
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'neutralized_without_authorization',
        severity: 'error',
      }),
    ])
  })

  it('accepts neutralized when authorization ref is present under strict policy', () => {
    const result = validateUnexplainedLocationRecord(
      baseRecord({
        lifecycleState: 'neutralized',
        neutralizationAuthorizationRef: 'auth:field-neutralization-12',
      }),
      { requireNeutralizationAuthorization: true }
    )

    expect(result.valid).toBe(true)
  })

  it('warns when map_manipulation tag is declared without mapLayerPolicy', () => {
    const result = validateUnexplainedLocationRecord(
      baseRecord({
        securityControlTags: ['map_manipulation'],
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'map_suppression_without_layer_policy',
        severity: 'warning',
      }),
    ])
  })

  it('exposes canonical effect geometry values including orbital_zone and volume', () => {
    expect(EFFECT_GEOMETRIES).toContain('orbital_zone')
    expect(EFFECT_GEOMETRIES).toContain('volume')
  })

  it('projects public, agency, sensor, and inferred route layers with record-derived confidence', () => {
    const projection = projectUnexplainedLocationForMap(REMOTE_MONITOR_SITE_FIXTURE)

    expect(projection.locationId).toBe('location:remote-ridge-station')
    expect(projection.layers).toHaveLength(4)

    const byLayer = Object.fromEntries(projection.layers.map((layer) => [layer.layer, layer]))

    expect(byLayer.public.suppressed).toBe(true)
    expect(byLayer.public.locationTag).toBeNull()
    expect(byLayer.agency.locationTag).toBe('site:north-ridge-relay')
    expect(byLayer.agency.confidence).toBe(0.54)
    expect(byLayer.sensor.locationTag).toBe('site:north-ridge-relay')
    expect(byLayer.inferred_route.locationTag).toBeNull()
  })

  it('projects inferred route layer when geometry is route and accessProbability is positive', () => {
    const projection = projectUnexplainedLocationForMap(
      baseRecord({
        effectGeometry: 'route',
        accessProbability: 0.2,
        locationTag: 'route:maintenance-corridor',
        confidence: 0.44,
        securityControlTags: ['sensor_monitoring'],
      })
    )

    const inferred = projection.layers.find((layer) => layer.layer === 'inferred_route')
    expect(inferred?.locationTag).toBe('route:maintenance-corridor')
    expect(inferred?.confidence).toBe(0.44)
  })

  it('respects map projection policy minimum confidence and redaction', () => {
    const redactedRecord = baseRecord({
      locationTag: 'site:restricted',
      confidence: 0.4,
      redactedFields: ['locationTag'],
      unknownFields: ['confidence'],
      securityControlTags: ['public_cover'],
    })

    const projection = projectUnexplainedLocationForMap(redactedRecord, {
      minimumConfidence: 0.5,
      redactUnknown: true,
      suppressRedactedLocation: true,
    })

    const agency = projection.layers.find((layer) => layer.layer === 'agency')
    expect(agency?.locationTag).toBeNull()
    expect(agency?.confidence).toBeNull()
  })

  it('validates untrusted payloads without throwing when fields are missing or nullish', () => {
    const result = validateUnexplainedLocationRecord({} as UnexplainedLocationRecord)

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code).sort()).toEqual(
      [
        'invalid_effect_geometry',
        'invalid_latent_severity_score',
        'invalid_lifecycle_state',
        'missing_id',
        'missing_label',
      ].sort()
    )
  })

  it('validates malformed array fields without throwing on untrusted payloads', () => {
    const result = validateUnexplainedLocationRecord({
      id: 'location:malformed',
      label: 'Malformed payload',
      effectGeometry: 'point',
      effectDomainTags: 'spatial' as unknown as UnexplainedLocationRecord['effectDomainTags'],
      populationSelectors: null as unknown as UnexplainedLocationRecord['populationSelectors'],
      securityControlTags: 'map_manipulation' as unknown as UnexplainedLocationRecord['securityControlTags'],
      lifecycleState: 'active',
      latentSeverityScore: 10,
      statusHistory: 'invalid' as unknown as UnexplainedLocationRecord['statusHistory'],
      contradictionRefs: 42 as unknown as UnexplainedLocationRecord['contradictionRefs'],
    })

    expect(result.valid).toBe(true)
  })

  it('projects map layers without throwing when array metadata is malformed', () => {
    const projection = projectUnexplainedLocationForMap({
      id: 'location:malformed-map',
      label: 'Malformed map payload',
      effectGeometry: 'point',
      effectDomainTags: [],
      populationSelectors: [],
      lifecycleState: 'active',
      latentSeverityScore: 10,
      redactedFields: 'confidence' as unknown as UnexplainedLocationRecord['redactedFields'],
      unknownFields: null as unknown as UnexplainedLocationRecord['unknownFields'],
      securityControlTags: null as unknown as UnexplainedLocationRecord['securityControlTags'],
    })

    expect(projection.locationId).toBe('location:malformed-map')
    expect(projection.layers).toHaveLength(4)
  })

  it('produces byte-stable validation output on repeated runs', () => {
    const record = baseRecord({
      lowPriority: true,
      latentSeverityScore: 0,
      lifecycleState: 'public_managed',
      securityControlTags: ['map_manipulation'],
    })

    const first = JSON.stringify(validateUnexplainedLocationRecord(record))
    const second = JSON.stringify(validateUnexplainedLocationRecord(record))

    expect(first).toBe(second)
  })
})
