import { describe, expect, it } from 'vitest'
import {
  CLUE_CLARITY_VALUES,
  DEFAULT_INVESTIGATION_EXPOSURE_CLUE_REGISTRY,
  EXPOSURE_RISK_BANDS,
  getInvestigationExposureClueById,
  isClueClarity,
  isExposureRiskBand,
  projectClueActionability,
  validateInvestigationExposureClueRecord,
  validateInvestigationExposureClueRegistry,
  type InvestigationExposureClueRecord,
} from '../domain/investigationExposureClueRegistry'

function baseRecord(
  overrides: Partial<InvestigationExposureClueRecord> = {}
): InvestigationExposureClueRecord {
  return {
    id: 'clue:test-base',
    clarity: 'true',
    exposureRiskBand: 'controlled',
    label: 'Test base clue',
    ...overrides,
  }
}

describe('investigationExposureClueRegistry (SPE-2159 slice 1)', () => {
  it('exposes the five canonical clue clarity values', () => {
    expect(CLUE_CLARITY_VALUES).toEqual([
      'true',
      'fuzzy',
      'incomplete',
      'partial_false',
      'misleading',
    ])
    expect(isClueClarity('true')).toBe(true)
    expect(isClueClarity('fuzzy')).toBe(true)
    expect(isClueClarity('incomplete')).toBe(true)
    expect(isClueClarity('partial_false')).toBe(true)
    expect(isClueClarity('misleading')).toBe(true)
    expect(isClueClarity('unknown')).toBe(false)
    expect(isClueClarity('')).toBe(false)
  })

  it('exposes the five canonical exposure risk bands', () => {
    expect(EXPOSURE_RISK_BANDS).toEqual([
      'controlled',
      'low',
      'moderate',
      'high',
      'critical',
    ])
    expect(isExposureRiskBand('controlled')).toBe(true)
    expect(isExposureRiskBand('critical')).toBe(true)
    expect(isExposureRiskBand('extreme')).toBe(false)
  })

  it('validates a well-formed clue record', () => {
    const result = validateInvestigationExposureClueRecord(baseRecord())

    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('rejects a record with invalid clarity', () => {
    const result = validateInvestigationExposureClueRecord(
      baseRecord({ clarity: 'certain' as InvestigationExposureClueRecord['clarity'] })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toContain('invalid_clarity')
  })

  it('rejects a record with invalid exposure risk band', () => {
    const result = validateInvestigationExposureClueRecord(
      baseRecord({
        exposureRiskBand: 'extreme' as InvestigationExposureClueRecord['exposureRiskBand'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toContain('invalid_exposure_risk_band')
  })

  it('rejects a record missing id and label', () => {
    const result = validateInvestigationExposureClueRecord(
      baseRecord({ id: '', label: '   ' })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code).sort()).toEqual(
      ['missing_id', 'missing_label'].sort()
    )
  })

  it('rejects all invalid fields together', () => {
    const result = validateInvestigationExposureClueRecord(
      baseRecord({
        id: '',
        label: '   ',
        clarity: 'certain' as InvestigationExposureClueRecord['clarity'],
        exposureRiskBand: 'extreme' as InvestigationExposureClueRecord['exposureRiskBand'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code).sort()).toEqual(
      ['invalid_clarity', 'invalid_exposure_risk_band', 'missing_id', 'missing_label'].sort()
    )
  })

  it('validates the default registry — all five clarity values covered and ids are unique', () => {
    const result = validateInvestigationExposureClueRegistry(
      DEFAULT_INVESTIGATION_EXPOSURE_CLUE_REGISTRY
    )

    expect(result.valid).toBe(true)

    for (const clarity of CLUE_CLARITY_VALUES) {
      const matches = DEFAULT_INVESTIGATION_EXPOSURE_CLUE_REGISTRY.entries.filter(
        (entry) => entry.clarity === clarity
      )
      expect(matches.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('rejects duplicate ids across registry entries', () => {
    const dup = baseRecord({ id: 'clue:dup' })
    const result = validateInvestigationExposureClueRegistry({
      entries: [dup, { ...dup, label: 'Second copy' }],
    })

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'duplicate_id')).toBe(true)
  })

  it('looks up entries by id', () => {
    const entry = getInvestigationExposureClueById(
      DEFAULT_INVESTIGATION_EXPOSURE_CLUE_REGISTRY,
      'clue:verified-document-trail'
    )

    expect(entry?.clarity).toBe('true')
    expect(entry?.exposureRiskBand).toBe('controlled')
    expect(
      getInvestigationExposureClueById(DEFAULT_INVESTIGATION_EXPOSURE_CLUE_REGISTRY, 'missing')
    ).toBe(undefined)
    expect(
      getInvestigationExposureClueById(DEFAULT_INVESTIGATION_EXPOSURE_CLUE_REGISTRY, '')
    ).toBe(undefined)
  })

  it('projects a true clue with controlled exposure as actionable, certain, non-hazardous', () => {
    const entry = getInvestigationExposureClueById(
      DEFAULT_INVESTIGATION_EXPOSURE_CLUE_REGISTRY,
      'clue:verified-document-trail'
    )!
    const projection = projectClueActionability(entry)

    expect(projection).toEqual({
      id: 'clue:verified-document-trail',
      isActionable: true,
      isUncertain: false,
      isHazardousToInvestigate: false,
    })
  })

  it('projects fuzzy and incomplete clues as actionable and uncertain', () => {
    const fuzzy = getInvestigationExposureClueById(
      DEFAULT_INVESTIGATION_EXPOSURE_CLUE_REGISTRY,
      'clue:partial-surveillance-window'
    )!
    const incomplete = getInvestigationExposureClueById(
      DEFAULT_INVESTIGATION_EXPOSURE_CLUE_REGISTRY,
      'clue:redacted-contact-log'
    )!

    expect(projectClueActionability(fuzzy)).toMatchObject({
      isActionable: true,
      isUncertain: true,
    })
    expect(projectClueActionability(incomplete)).toMatchObject({
      isActionable: true,
      isUncertain: true,
      isHazardousToInvestigate: true,
    })
  })

  it('projects a partial_false clue as actionable and uncertain — not discarded', () => {
    const entry = getInvestigationExposureClueById(
      DEFAULT_INVESTIGATION_EXPOSURE_CLUE_REGISTRY,
      'clue:planted-transaction-record'
    )!
    const projection = projectClueActionability(entry)

    expect(projection.isActionable).toBe(true)
    expect(projection.isUncertain).toBe(true)
  })

  it('projects a misleading clue as non-actionable but still retrievable and usable as pattern data', () => {
    const entry = getInvestigationExposureClueById(
      DEFAULT_INVESTIGATION_EXPOSURE_CLUE_REGISTRY,
      'clue:deliberate-decoy-signal'
    )!

    expect(entry).toBeDefined()
    expect(entry.clarity).toBe('misleading')

    const projection = projectClueActionability(entry)

    expect(projection.isActionable).toBe(false)
    expect(projection.isUncertain).toBe(true)
    expect(projection.isHazardousToInvestigate).toBe(true)
  })

  it('produces deterministic projection output for all default entries', () => {
    const projections = DEFAULT_INVESTIGATION_EXPOSURE_CLUE_REGISTRY.entries.map(
      projectClueActionability
    )

    expect(projections).toEqual([
      {
        id: 'clue:verified-document-trail',
        isActionable: true,
        isUncertain: false,
        isHazardousToInvestigate: false,
      },
      {
        id: 'clue:partial-surveillance-window',
        isActionable: true,
        isUncertain: true,
        isHazardousToInvestigate: false,
      },
      {
        id: 'clue:redacted-contact-log',
        isActionable: true,
        isUncertain: true,
        isHazardousToInvestigate: true,
      },
      {
        id: 'clue:planted-transaction-record',
        isActionable: true,
        isUncertain: true,
        isHazardousToInvestigate: false,
      },
      {
        id: 'clue:deliberate-decoy-signal',
        isActionable: false,
        isUncertain: true,
        isHazardousToInvestigate: true,
      },
    ])
  })
})
