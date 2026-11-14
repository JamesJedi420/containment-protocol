/**
 * SPE-2270 — message reliability and confidence model (slice 1).
 *
 * Bounded deterministic projection of message reliability.
 * Truth band, distortion vector, trust inputs, contamination refs → confidence projection.
 * Does not implement full communication payload selection, GameState, or live routing.
 */

export const MESSAGE_RELIABILITY_SCHEMA_VERSION = 'spe-2270.v1' as const
export type MessageReliabilitySchemaVersion = typeof MESSAGE_RELIABILITY_SCHEMA_VERSION

export type TruthBand = 'truthful' | 'omission' | 'distorted' | 'false' | 'contaminated'

export type DistortionVector = readonly string[]

export interface MessageReliabilityRecord {
  readonly schemaVersion: MessageReliabilitySchemaVersion
  readonly sourceId: string
  readonly truthBand: TruthBand
  readonly distortionVector: DistortionVector
  readonly trustInputs: readonly number[]
  readonly contaminationRefs: readonly string[]
  readonly confidenceProjection: number
}

const TRUTH_BAND_BASE: Readonly<Record<TruthBand, number>> = Object.freeze({
  truthful: 90,
  omission: 70,
  distorted: 50,
  false: 20,
  contaminated: 10,
})

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Deterministic confidence projection from reliability inputs.
 * Same inputs always produce the same record.
 */
export function projectMessageReliability(input: {
  readonly sourceId: string
  readonly truthBand: TruthBand
  readonly distortionVector: DistortionVector
  readonly trustInputs: readonly number[]
  readonly contaminationRefs: readonly string[]
}): MessageReliabilityRecord {
  const sourceId = input.sourceId.trim()
  const bandBase = TRUTH_BAND_BASE[input.truthBand]
  const distortionPenalty = input.distortionVector.length * 5
  const contaminationPenalty = input.contaminationRefs.length * 10
  const avgTrust =
    input.trustInputs.length === 0
      ? 50
      : input.trustInputs.reduce((sum, value) => sum + value, 0) / input.trustInputs.length
  const raw =
    bandBase -
    distortionPenalty -
    contaminationPenalty +
    (avgTrust - 50) * 0.2
  const confidenceProjection = Math.round(clamp(raw, 0, 100))

  return Object.freeze({
    schemaVersion: MESSAGE_RELIABILITY_SCHEMA_VERSION,
    sourceId,
    truthBand: input.truthBand,
    distortionVector: Object.freeze([...input.distortionVector].sort()),
    trustInputs: Object.freeze([...input.trustInputs]),
    contaminationRefs: Object.freeze([...input.contaminationRefs].sort()),
    confidenceProjection,
  })
}

export type CommunicationRoutingTarget = 'caseboard' | 'archive' | 'discard'

/**
 * Bounded routing decision from projected reliability.
 * High confidence → caseboard; medium → archive; low → discard.
 * Slice-1 stand-in for communication payload selection integration.
 */
export function routeCommunicationByReliability(
  record: MessageReliabilityRecord,
): CommunicationRoutingTarget {
  if (record.confidenceProjection >= 70) return 'caseboard'
  if (record.confidenceProjection >= 40) return 'archive'
  return 'discard'
}

export function validateMessageReliabilityRecord(
  record: MessageReliabilityRecord,
): readonly string[] {
  const issues: string[] = []
  if (record.schemaVersion !== MESSAGE_RELIABILITY_SCHEMA_VERSION) {
    issues.push('schema-version-mismatch')
  }
  if (!record.sourceId.trim()) {
    issues.push('source-id-required')
  }
  if (!(record.truthBand in TRUTH_BAND_BASE)) {
    issues.push('unknown-truth-band')
  }
  if (
    !Number.isInteger(record.confidenceProjection) ||
    record.confidenceProjection < 0 ||
    record.confidenceProjection > 100
  ) {
    issues.push('confidence-projection-out-of-range')
  }
  for (const trust of record.trustInputs) {
    if (!Number.isFinite(trust) || trust < 0 || trust > 100) {
      issues.push('trust-input-out-of-range')
      break
    }
  }
  return Object.freeze(issues)
}
