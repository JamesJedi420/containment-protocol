import { describe, expect, it } from 'vitest'
import {
  validateSample,
  reviseClassification,
  type AmbiguousContaminantSample,
  type ClassificationHypothesis,
} from './ambiguousContaminantClassification'

describe('SPE-1225 ambiguous contaminant classification', () => {
  const baseHypothesis = (cls: string, conf: string): ClassificationHypothesis => ({
    materialClass: cls as any,
    confidence: conf as any,
    supportingEvidenceRefs: ['ev-1'],
    contradictingEvidenceRefs: [],
  })

  it('retains multiple plausible classes under explicit confidence', () => {
    const sample: AmbiguousContaminantSample = {
      sampleId: 'samp-001',
      hypotheses: [
        baseHypothesis('organism', 'medium'),
        baseHypothesis('secretion', 'low'),
      ],
      handlingNotes: 'uncertain identity; isolate pending further assay',
    }
    expect(validateSample(sample)).toEqual([])
    expect(sample.hypotheses).toHaveLength(2)
  })

  it('revises classification without erasing prior contradictory record', () => {
    const sample: AmbiguousContaminantSample = {
      sampleId: 'samp-002',
      hypotheses: [baseHypothesis('fluid', 'high')],
      handlingNotes: '',
    }
    const revised = reviseClassification(sample, baseHypothesis('composite', 'medium'))
    expect(revised.hypotheses).toHaveLength(2)
    expect(revised.hypotheses[0].materialClass).toBe('fluid')
  })

  it('rejects insufficient hypotheses', () => {
    const sample: AmbiguousContaminantSample = {
      sampleId: 'samp-003',
      hypotheses: [baseHypothesis('residue', 'low')],
      handlingNotes: '',
    }
    expect(validateSample(sample)).toContain('requires_multiple_hypotheses')
  })
})
