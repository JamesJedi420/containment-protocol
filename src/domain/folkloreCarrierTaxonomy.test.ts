import { describe, expect, it } from 'vitest'
import { hasMixedCarrier, normalizeFolkloreCarriers } from './folkloreCarrierTaxonomy'

describe('folkloreCarrierTaxonomy', () => {
  it('normalizes and deduplicates carriers deterministically', () => {
    const result = normalizeFolkloreCarriers({
      caseId: ' case-1 ',
      carriers: [
        { carrierType: 'spoken_phrase', confidence: 0.8 },
        { carrierType: 'material_object', confidence: 0.6 },
        { carrierType: 'spoken_phrase', confidence: 0.9 },
        { carrierType: 'unknown_fragment', confidence: 0 },
      ],
    })

    expect(result.caseId).toBe('case-1')
    expect(result.carriers).toEqual([
      { carrierType: 'material_object', confidence: 0.6 },
      { carrierType: 'spoken_phrase', confidence: 0.9 },
    ])
  })

  it('detects mixed carriers', () => {
    expect(hasMixedCarrier([{ carrierType: 'mixed_carrier', confidence: 1 }])).toBe(true)
    expect(hasMixedCarrier([{ carrierType: 'song', confidence: 1 }, { carrierType: 'song', confidence: 0.5 }])).toBe(false)
    expect(hasMixedCarrier([{ carrierType: 'song', confidence: 1 }, { carrierType: 'customary_action', confidence: 0.7 }])).toBe(true)
  })
})
