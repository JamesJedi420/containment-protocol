/**
 * SPE-1225 slice 1: Ambiguous contaminant material classification.
 *
 * Bounded pure-domain support for samples that retain multiple plausible
 * material classes under explicit confidence, without forcing premature
 * taxonomic certainty or erasing contradictory evidence.
 */

export type MaterialClass =
  | 'organism'
  | 'carrier_medium'
  | 'secretion'
  | 'colony'
  | 'composite'
  | 'fluid'
  | 'blood_analogue'
  | 'residue'

export const MATERIAL_CLASSES: readonly MaterialClass[] = [
  'organism',
  'carrier_medium',
  'secretion',
  'colony',
  'composite',
  'fluid',
  'blood_analogue',
  'residue',
] as const

export type ConfidenceBand = 'low' | 'medium' | 'high'

export interface ClassificationHypothesis {
  readonly materialClass: MaterialClass
  readonly confidence: ConfidenceBand
  readonly supportingEvidenceRefs: readonly string[]
  readonly contradictingEvidenceRefs: readonly string[]
}

export interface AmbiguousContaminantSample {
  readonly sampleId: string
  readonly hypotheses: readonly ClassificationHypothesis[]
  readonly handlingNotes: string
}

export function isValidMaterialClass(value: string): value is MaterialClass {
  return (MATERIAL_CLASSES as readonly string[]).includes(value)
}

export function validateSample(sample: AmbiguousContaminantSample): string[] {
  const errors: string[] = []
  if (!sample.sampleId) errors.push('missing_sample_id')
  if (sample.hypotheses.length < 2) errors.push('requires_multiple_hypotheses')
  for (const h of sample.hypotheses) {
    if (!isValidMaterialClass(h.materialClass)) errors.push(`invalid_class:${h.materialClass}`)
    if (!['low', 'medium', 'high'].includes(h.confidence)) errors.push(`invalid_confidence:${h.confidence}`)
  }
  return errors
}

export function reviseClassification(
  sample: AmbiguousContaminantSample,
  newHypothesis: ClassificationHypothesis
): AmbiguousContaminantSample {
  // Preserve prior contradictory evidence; append revision without erasure.
  return {
    ...sample,
    hypotheses: [...sample.hypotheses, newHypothesis],
  }
}
