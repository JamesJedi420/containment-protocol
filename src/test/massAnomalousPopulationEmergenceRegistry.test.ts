import { describe, expect, it } from 'vitest'
import {
  COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
  EMERGENCE_MAGNITUDE_BANDS,
  GOVERNANCE_MODES,
  GOVERNANCE_SURGE_BANDS,
  MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
  projectGovernanceSurge,
  validatePopulationEmergenceRecord,
  type PopulationEmergenceRecord,
} from '../domain/massAnomalousPopulationEmergenceRegistry'

function baseRecord(
  overrides: Partial<PopulationEmergenceRecord> = {}
): PopulationEmergenceRecord {
  return {
    id: 'population-emergence:test-base',
    label: 'Test population emergence',
    emergenceMagnitudeBand: 'local',
    newlyAnomalousCountEstimate: 1200,
    registrationBacklogWeeks: 2,
    governanceMode: 'managed_disclosure',
    triageLanes: ['lane:registration-intake'],
    publicEducationBurden: 0.3,
    ...overrides,
  }
}

describe('massAnomalousPopulationEmergenceRegistry (SPE-2122 slice 1)', () => {
  it('validates managed disclosure fixture with registration backlog and triage lanes', () => {
    const result = validatePopulationEmergenceRecord(MANAGED_DISCLOSURE_BACKLOG_FIXTURE)

    expect(result.valid).toBe(true)
    expect(MANAGED_DISCLOSURE_BACKLOG_FIXTURE.governanceMode).toBe('managed_disclosure')
    expect(MANAGED_DISCLOSURE_BACKLOG_FIXTURE.registrationBacklogWeeks).toBeGreaterThan(0)
    expect(MANAGED_DISCLOSURE_BACKLOG_FIXTURE.triageLanes.length).toBeGreaterThan(0)
  })

  it('projects governance surge with triage lane symptoms for managed disclosure', () => {
    const projection = projectGovernanceSurge(MANAGED_DISCLOSURE_BACKLOG_FIXTURE, {
      currentWeek: 4,
    })

    expect(projection.triageLaneSymptoms.length).toBe(3)
    expect(projection.triageLaneSymptoms[0]?.symptomDescriptor).toContain(
      'Institutional triage lane pressure observed at'
    )
    expect(projection.projectedRegistrationPressure).not.toBeNull()
    expect(projection.governanceSurgeBand).not.toBeNull()
  })

  it('elevates publicEducationBurden under collapsed_masquerade in projection', () => {
    const projection = projectGovernanceSurge(COLLAPSED_MASQUERADE_EDUCATION_FIXTURE)

    expect(projection.recordedPublicEducationBurden).toBe(0.55)
    expect(projection.effectivePublicEducationBurden).not.toBeNull()
    expect(projection.effectivePublicEducationBurden!).toBeGreaterThan(
      projection.recordedPublicEducationBurden!
    )
    expect(COLLAPSED_MASQUERADE_EDUCATION_FIXTURE.governanceMode).toBe('collapsed_masquerade')
  })

  it('validates collapsed masquerade fixture', () => {
    const result = validatePopulationEmergenceRecord(COLLAPSED_MASQUERADE_EDUCATION_FIXTURE)

    expect(result.valid).toBe(true)
  })

  it('warns when national magnitude has no securitySurgeRefs', () => {
    const result = validatePopulationEmergenceRecord(
      baseRecord({
        emergenceMagnitudeBand: 'national',
        securitySurgeRefs: undefined,
      })
    )

    expect(result.valid).toBe(true)
    expect(
      result.issues.some((issue) => issue.code === 'national_magnitude_without_security_surge')
    ).toBe(true)
  })

  it('warns when global magnitude uses secrecy_restore governance', () => {
    const result = validatePopulationEmergenceRecord(
      baseRecord({
        emergenceMagnitudeBand: 'global',
        governanceMode: 'secrecy_restore',
      })
    )

    expect(result.valid).toBe(true)
    expect(
      result.issues.some((issue) => issue.code === 'global_magnitude_with_secrecy_restore')
    ).toBe(true)
  })

  it('errors when id is missing', () => {
    const result = validatePopulationEmergenceRecord(
      baseRecord({
        id: '   ',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'missing_id')).toBe(true)
  })

  it('errors when triageLanes is not an array', () => {
    const result = validatePopulationEmergenceRecord(
      baseRecord({
        triageLanes: 'lane:registration-intake' as unknown as readonly string[],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'invalid_triage_lanes')).toBe(true)
  })

  it('errors on franchise token in record id', () => {
    const result = validatePopulationEmergenceRecord(
      baseRecord({
        id: 'population-emergence:foundation-surge',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_id')).toBe(true)
  })

  it('errors on branded object number in rightsReviewQueueRefs', () => {
    const result = validatePopulationEmergenceRecord(
      baseRecord({
        rightsReviewQueueRefs: ['queue:SCP-173-rights-review'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'branded_object_number_in_field')).toBe(
      true
    )
  })

  it('redacts capacity pressures when emergenceMagnitudeBand is unknown to policy', () => {
    const projection = projectGovernanceSurge(
      {
        ...MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
        unknownFields: ['emergenceMagnitudeBand'],
      },
      {
        redactUnknown: true,
      }
    )

    expect(projection.projectedRegistrationPressure).toBeNull()
    expect(projection.projectedRightsReviewPressure).toBeNull()
    expect(projection.governanceSurgeBand).toBeNull()
  })

  it('redacts triage lane symptoms when policy requests unknown redaction', () => {
    const projection = projectGovernanceSurge(
      {
        ...MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
        unknownFields: ['triageLanes'],
      },
      {
        redactUnknown: true,
      }
    )

    expect(projection.triageLaneSymptoms).toHaveLength(0)
    expect(projection.redacted).toBe(true)
  })

  it('suppresses capacity gap hints when hidden conflict labels are suppressed', () => {
    const projection = projectGovernanceSurge(MANAGED_DISCLOSURE_BACKLOG_FIXTURE, {
      suppressHiddenConflictLabels: true,
    })

    expect(projection.triageLaneSymptoms.every((entry) => entry.capacityGapHint === null)).toBe(
      true
    )
  })

  it('returns byte-stable validation results on repeated calls', () => {
    const first = validatePopulationEmergenceRecord(COLLAPSED_MASQUERADE_EDUCATION_FIXTURE)
    const second = validatePopulationEmergenceRecord(COLLAPSED_MASQUERADE_EDUCATION_FIXTURE)

    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('exports stable union catalogs', () => {
    expect(EMERGENCE_MAGNITUDE_BANDS).toEqual(['local', 'regional', 'national', 'global'])
    expect(GOVERNANCE_MODES).toEqual([
      'secrecy_restore',
      'managed_disclosure',
      'collapsed_masquerade',
    ])
    expect(GOVERNANCE_SURGE_BANDS).toEqual(['low', 'elevated', 'critical'])
  })
})
