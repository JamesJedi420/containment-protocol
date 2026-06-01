import { describe, expect, it } from 'vitest'
import {
  AUTHORIZATION_CLASSES,
  JURISDICTION_HANDOFFS,
  ONE_WAY_ROUTE_FIXTURE,
  OPTIONAL_RETURN_JURISDICTION_FIXTURE,
  RETURN_RULES,
  TRANSIT_RISKS,
  projectTransitAccountability,
  validateThresholdRouteRecord,
  type ThresholdRouteRecord,
} from '../domain/alternateRealityThresholdRouteRegistry'

function baseRecord(
  overrides: Partial<ThresholdRouteRecord> = {}
): ThresholdRouteRecord {
  return {
    id: 'threshold-route:test-base',
    label: 'Test threshold route',
    entryRef: 'site:test-entry-threshold',
    destinationLayerId: 'layer:test-destination',
    returnRule: 'mandatory',
    authorizationClass: 'public_threshold',
    jurisdictionHandoff: 'none',
    transitRisk: 'low',
    ...overrides,
  }
}

describe('alternateRealityThresholdRouteRegistry (SPE-2121 slice 1)', () => {
  it('validates optional return fixture with jurisdictionHandoff', () => {
    const result = validateThresholdRouteRecord(OPTIONAL_RETURN_JURISDICTION_FIXTURE)

    expect(result.valid).toBe(true)
    expect(OPTIONAL_RETURN_JURISDICTION_FIXTURE.returnRule).toBe('optional')
    expect(OPTIONAL_RETURN_JURISDICTION_FIXTURE.jurisdictionHandoff).toBe('partial')
  })

  it('validates one-way route fixture without return policy conflict', () => {
    const result = validateThresholdRouteRecord(ONE_WAY_ROUTE_FIXTURE)

    expect(result.valid).toBe(true)
    expect(ONE_WAY_ROUTE_FIXTURE.returnRule).toBe('one_way')
    expect(ONE_WAY_ROUTE_FIXTURE.roundTripScheduleRefs).toBeUndefined()
  })

  it('projects jurisdiction symptoms and accountability metadata', () => {
    const projection = projectTransitAccountability(OPTIONAL_RETURN_JURISDICTION_FIXTURE, {
      currentWeek: 3,
    })

    expect(projection.jurisdictionSymptoms).toHaveLength(2)
    expect(projection.jurisdictionSymptoms[0]?.symptomDescriptor).toContain(
      'Partial jurisdiction transfer observed at'
    )
    expect(projection.projectedPopulationRisk).not.toBeNull()
    expect(projection.projectedEvidenceRisk).not.toBeNull()
    expect(projection.accountabilityBand).not.toBeNull()
  })

  it('projects lost-person custody forecasts for one-way routes', () => {
    const projection = projectTransitAccountability(ONE_WAY_ROUTE_FIXTURE)

    expect(projection.lostPersonForecasts).toHaveLength(1)
    expect(projection.lostPersonForecasts[0]?.custodyDescriptor).toContain(
      'Unaccounted transit subject forecast for'
    )
  })

  it('errors when one_way route declares scheduled round-trip operations', () => {
    const result = validateThresholdRouteRecord(
      baseRecord({
        returnRule: 'one_way',
        roundTripScheduleRefs: ['schedule:return-window-alpha'],
      })
    )

    expect(result.valid).toBe(false)
    expect(
      result.issues.some((issue) => issue.code === 'one_way_with_mandatory_return_policy')
    ).toBe(true)
  })

  it('warns when unknown returnRule has scheduled round-trip operations', () => {
    const result = validateThresholdRouteRecord(
      baseRecord({
        returnRule: 'unknown',
        roundTripScheduleRefs: ['schedule:return-window-beta'],
      })
    )

    expect(result.valid).toBe(true)
    expect(
      result.issues.some((issue) => issue.code === 'unknown_return_with_scheduled_round_trip')
    ).toBe(true)
  })

  it('errors when entryRef is missing', () => {
    const result = validateThresholdRouteRecord(
      baseRecord({
        entryRef: '   ',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'missing_entry_ref')).toBe(true)
  })

  it('errors on franchise token in record id', () => {
    const result = validateThresholdRouteRecord(
      baseRecord({
        id: 'threshold-route:foundation-threshold',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_id')).toBe(true)
  })

  it('errors on branded object number in lostPersonRefs', () => {
    const result = validateThresholdRouteRecord(
      baseRecord({
        lostPersonRefs: ['person:SCP-049-transit-subject'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'branded_object_number_in_field')).toBe(
      true
    )
  })

  it('redacts jurisdiction symptoms when policy requests unknown redaction', () => {
    const projection = projectTransitAccountability(
      {
        ...OPTIONAL_RETURN_JURISDICTION_FIXTURE,
        unknownFields: ['jurisdictionHandoff'],
      },
      {
        redactUnknown: true,
      }
    )

    expect(projection.jurisdictionSymptoms).toHaveLength(0)
    expect(projection.redacted).toBe(true)
  })

  it('suppresses evidence gap hints when hidden conflict labels are suppressed', () => {
    const projection = projectTransitAccountability(ONE_WAY_ROUTE_FIXTURE, {
      suppressHiddenConflictLabels: true,
    })

    expect(projection.jurisdictionSymptoms.every((entry) => entry.evidenceGapHint === null)).toBe(
      true
    )
  })

  it('returns byte-stable validation results on repeated calls', () => {
    const first = validateThresholdRouteRecord(ONE_WAY_ROUTE_FIXTURE)
    const second = validateThresholdRouteRecord(ONE_WAY_ROUTE_FIXTURE)

    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('exports stable union catalogs', () => {
    expect(RETURN_RULES).toEqual(['mandatory', 'optional', 'one_way', 'unknown'])
    expect(AUTHORIZATION_CLASSES).toEqual([
      'public_threshold',
      'credential_gated',
      'clearance_bound',
      'containment_only',
    ])
    expect(JURISDICTION_HANDOFFS).toEqual(['none', 'partial', 'full', 'disputed'])
    expect(TRANSIT_RISKS).toEqual(['low', 'high', 'lossy'])
  })
})
