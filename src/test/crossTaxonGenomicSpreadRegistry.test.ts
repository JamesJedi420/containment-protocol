import { describe, expect, it } from 'vitest'
import {
  CROSS_TAXON_GENOMIC_SPREAD_FIXTURES,
  lookupCrossTaxonGenomicSpreadRecord,
  normalizeCrossTaxonGenomicSpreadRecords,
  validateCrossTaxonGenomicSpreadRecords,
} from '../domain/crossTaxonGenomicSpreadRegistry'

describe('crossTaxonGenomicSpreadRegistry', () => {
  it('accepts fixture records with the four documented fields', () => {
    const result = validateCrossTaxonGenomicSpreadRecords(CROSS_TAXON_GENOMIC_SPREAD_FIXTURES)
    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('distinguishes target taxon class from spread vector', () => {
    const [first] = CROSS_TAXON_GENOMIC_SPREAD_FIXTURES
    expect(first.targetTaxonClass).not.toBe(first.spreadVector)
    expect(first.targetTaxonClass).toBe('vertebrate')
    expect(first.spreadVector).toBe('contact')
  })

  it('rejects unknown target taxon class', () => {
    const result = validateCrossTaxonGenomicSpreadRecords([
      {
        id: 'spread-record:bad',
        targetTaxonClass: 'alien',
        spreadVector: 'contact',
        containmentCeiling: 'open',
        humanGenomeRiskFlag: false,
      },
    ])
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'unknown_target_taxon_class')).toBe(true)
  })

  it('rejects unknown spread vector', () => {
    const result = validateCrossTaxonGenomicSpreadRecords([
      {
        id: 'spread-record:bad',
        targetTaxonClass: 'plant',
        spreadVector: 'telepathy',
        containmentCeiling: 'open',
        humanGenomeRiskFlag: false,
      },
    ])
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'unknown_spread_vector')).toBe(true)
  })

  it('rejects non-boolean humanGenomeRiskFlag', () => {
    const result = validateCrossTaxonGenomicSpreadRecords([
      {
        id: 'spread-record:bad',
        targetTaxonClass: 'fungal',
        spreadVector: 'contact',
        containmentCeiling: 'restricted',
        humanGenomeRiskFlag: 'yes',
      },
    ])
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'invalid_human_genome_risk_flag')).toBe(true)
  })

  it('rejects duplicate record ids', () => {
    const result = validateCrossTaxonGenomicSpreadRecords([
      ...CROSS_TAXON_GENOMIC_SPREAD_FIXTURES,
      CROSS_TAXON_GENOMIC_SPREAD_FIXTURES[0],
    ])
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'duplicate_record_id')).toBe(true)
  })

  it('normalizes and looks up deterministically', () => {
    const normalized = normalizeCrossTaxonGenomicSpreadRecords(CROSS_TAXON_GENOMIC_SPREAD_FIXTURES)
    expect(normalized).not.toBeNull()
    expect(normalized![0].id).toBe('spread-record:microbial-aerosol')
    expect(normalized![1].id).toBe('spread-record:vertebrate-contact')

    const found = lookupCrossTaxonGenomicSpreadRecord(
      normalized!,
      'spread-record:vertebrate-contact'
    )
    expect(found.status).toBe('found')
    if (found.status === 'found') {
      expect(found.record.humanGenomeRiskFlag).toBe(false)
    }

    expect(lookupCrossTaxonGenomicSpreadRecord(normalized!, 'spread-record:missing').status).toBe(
      'unknown_record_id'
    )
  })

  it('fails closed on non-array input', () => {
    const result = validateCrossTaxonGenomicSpreadRecords({ not: 'array' })
    expect(result.valid).toBe(false)
    expect(result.issues[0].code).toBe('invalid_registry')
  })
})
