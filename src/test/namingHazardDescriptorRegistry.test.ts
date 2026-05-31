import { describe, expect, it } from 'vitest'
import {
  COMPULSIVE_PHRASE_BRIEFING_FIXTURE,
  DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE,
  MAP_LABEL_MODES,
  REFERENCE_CONSTRAINTS,
  SAFE_LABEL_SURFACES,
  UI_SUBSTITUTION_POLICIES,
  projectSafeLabel,
  validateNamingHazardDescriptorRecord,
  type NamingHazardDescriptorRecord,
} from '../domain/namingHazardDescriptorRegistry'

function baseRecord(
  overrides: Partial<NamingHazardDescriptorRecord> = {}
): NamingHazardDescriptorRecord {
  return {
    id: 'naming-hazard:test-base',
    label: 'Test naming hazard record',
    trueNameForbidden: true,
    safeDescriptorPool: ['Approved surrogate label'],
    uiSubstitutionPolicy: 'pool_descriptor',
    mapLabelMode: 'descriptor_only',
    ...overrides,
  }
}

describe('namingHazardDescriptorRegistry (SPE-2116 slice 1)', () => {
  it('validates descriptor_only map fixture with safe descriptor pool', () => {
    const result = validateNamingHazardDescriptorRecord(DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE)

    expect(result.valid).toBe(true)
    expect(DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE.mapLabelMode).toBe('descriptor_only')
    expect(DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE.uiSubstitutionPolicy).toBe('pool_with_grid_fallback')
  })

  it('projects descriptor_only map labels with grid_ref fallback', () => {
    const descriptorProjection = projectSafeLabel(DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE, {
      surface: 'map',
    })

    expect(descriptorProjection.safeLabel).toBe('North quarry overlook')
    expect(descriptorProjection.usedGridFallback).toBe(false)
    expect(descriptorProjection.redacted).toBe(false)

    const gridFallbackRecord = baseRecord({
      trueNameForbidden: false,
      safeDescriptorPool: [],
      uiSubstitutionPolicy: 'pool_with_grid_fallback',
      mapLabelMode: 'descriptor_only',
    })

    const fallbackProjection = projectSafeLabel(gridFallbackRecord, {
      surface: 'map',
      gridRef: 'GRID-NE-14',
    })

    expect(fallbackProjection.safeLabel).toBe('GRID-NE-14')
    expect(fallbackProjection.usedGridFallback).toBe(true)
  })

  it('warns when compulsive_phrase_risk briefing template contains watchlisted phrase', () => {
    const result = validateNamingHazardDescriptorRecord(COMPULSIVE_PHRASE_BRIEFING_FIXTURE)

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'compulsive_phrase_in_briefing_template',
        severity: 'warning',
      }),
    ])
  })

  it('errors when trueNameForbidden with empty safeDescriptorPool', () => {
    const result = validateNamingHazardDescriptorRecord(
      baseRecord({
        safeDescriptorPool: [],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'empty_safe_descriptor_pool_when_forbidden',
        severity: 'error',
      }),
    ])
  })

  it('warns when compulsive_phrase_risk is declared without watchlist', () => {
    const result = validateNamingHazardDescriptorRecord(
      baseRecord({
        referenceConstraints: ['compulsive_phrase_risk'],
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'compulsive_phrase_risk_without_watchlist',
        severity: 'warning',
      }),
    ])
  })

  it('projects briefing surface from safe descriptor pool', () => {
    const projection = projectSafeLabel(COMPULSIVE_PHRASE_BRIEFING_FIXTURE, {
      surface: 'briefing',
    })

    expect(projection.safeLabel).toBe('Reading room annex B')
    expect(projection.redacted).toBe(false)
  })

  it('restricts mapLabelMode redacted to map surface only', () => {
    const record = baseRecord({
      mapLabelMode: 'redacted',
      uiSubstitutionPolicy: 'pool_descriptor',
    })

    const mapProjection = projectSafeLabel(record, { surface: 'map' })
    const briefingProjection = projectSafeLabel(record, { surface: 'briefing' })

    expect(mapProjection.safeLabel).toBe('[REDACTED]')
    expect(mapProjection.redacted).toBe(true)
    expect(briefingProjection.safeLabel).toBe('Approved surrogate label')
    expect(briefingProjection.redacted).toBe(false)
  })

  it('errors on wiki token in safe descriptor pool entry', () => {
    const result = validateNamingHazardDescriptorRecord(
      baseRecord({
        safeDescriptorPool: ['See wiki.scpfoundation.net for details'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_field')).toBe(true)
  })

  it('errors on franchise token in record label', () => {
    const result = validateNamingHazardDescriptorRecord(
      baseRecord({
        label: 'Foundation naming hazard record',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })

  it('errors on branded object number in record id', () => {
    const result = validateNamingHazardDescriptorRecord(
      baseRecord({
        id: 'naming-hazard:SCP-096-site',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'branded_object_number_in_id')).toBe(true)
  })

  it('returns byte-stable validation results on repeated calls', () => {
    const first = validateNamingHazardDescriptorRecord(DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE)
    const second = validateNamingHazardDescriptorRecord(DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE)

    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('exports stable union catalogs', () => {
    expect(REFERENCE_CONSTRAINTS).toEqual([
      'no_titles',
      'no_designations',
      'no_proper_nouns',
      'compulsive_phrase_risk',
    ])
    expect(UI_SUBSTITUTION_POLICIES).toEqual([
      'pool_descriptor',
      'pool_with_grid_fallback',
      'grid_ref',
      'redacted',
    ])
    expect(MAP_LABEL_MODES).toEqual(['descriptor_only', 'grid_ref', 'redacted'])
    expect(SAFE_LABEL_SURFACES).toEqual(['dossier', 'map', 'briefing', 'file_label'])
  })
})
