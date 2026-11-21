/** SPE-3025: canonical operational-assessment record with contradiction preservation. Schema only; no simulation truth, persistence, or consumer wiring. */

export const ASSESSMENT_CONFIDENCE = Object.freeze([
  'confirmed',
  'supported',
  'uncertain',
  'unknown',
  'not-observed',
] as const)
export type AssessmentConfidence = (typeof ASSESSMENT_CONFIDENCE)[number]

export interface AssessmentProvenance {
  readonly sourceType: 'staff-recollection' | 'institutional-record' | 'machine-observation' | 'physical-evidence' | 'other'
  readonly sourceRef: string
  readonly originRef?: string // for shared-origin derivative tracking
}

export interface OperationalAssessmentRecord {
  readonly id: string
  readonly subjectId: string
  readonly claim: string
  readonly provenance: readonly AssessmentProvenance[]
  readonly confidence: AssessmentConfidence
  readonly precision?: string
  readonly freshness?: number // week or timestamp proxy
  readonly modelVersion?: string
  readonly downstreamUseRisk?: 'low' | 'medium' | 'high'
  readonly contradictionIds?: readonly string[]
  readonly corroborationIds?: readonly string[]
}

export type AssessmentRelationship = {
  readonly fromId: string
  readonly toId: string
  readonly type: 'contradiction' | 'corroboration'
  readonly note?: string
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)
const isText = (v: unknown, max = 512): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max
const confidenceSet = new Set<string>(ASSESSMENT_CONFIDENCE)
const sourceTypes = new Set([
  'staff-recollection',
  'institutional-record',
  'machine-observation',
  'physical-evidence',
  'other',
])

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value as object)) freeze(child)
    Object.freeze(value)
  }
  return value
}

export function normalizeAssessment(
  input: unknown
): { status: 'ok'; record: OperationalAssessmentRecord } | { status: 'invalid'; reason: string } {
  if (!isObject(input) || !isText(input.id) || !isText(input.subjectId) || !isText(input.claim))
    return { status: 'invalid', reason: 'missing-identity' }
  if (!confidenceSet.has(input.confidence as string))
    return { status: 'invalid', reason: 'invalid-confidence' }
  if (!Array.isArray(input.provenance) || input.provenance.length === 0)
    return { status: 'invalid', reason: 'missing-provenance' }
  const provenance: AssessmentProvenance[] = []
  for (const p of input.provenance) {
    if (!isObject(p) || !sourceTypes.has(p.sourceType as string) || !isText(p.sourceRef))
      return { status: 'invalid', reason: 'invalid-provenance' }
    provenance.push({
      sourceType: p.sourceType as AssessmentProvenance['sourceType'],
      sourceRef: p.sourceRef,
      ...(isText(p.originRef) ? { originRef: p.originRef } : {}),
    })
  }
  const record: OperationalAssessmentRecord = {
    id: input.id,
    subjectId: input.subjectId,
    claim: input.claim,
    provenance: Object.freeze(provenance),
    confidence: input.confidence as AssessmentConfidence,
    ...(isText(input.precision) ? { precision: input.precision } : {}),
    ...(typeof input.freshness === 'number' && Number.isSafeInteger(input.freshness)
      ? { freshness: input.freshness }
      : {}),
    ...(isText(input.modelVersion) ? { modelVersion: input.modelVersion } : {}),
    ...(input.downstreamUseRisk === 'low' ||
    input.downstreamUseRisk === 'medium' ||
    input.downstreamUseRisk === 'high'
      ? { downstreamUseRisk: input.downstreamUseRisk }
      : {}),
    ...(Array.isArray(input.contradictionIds)
      ? { contradictionIds: Object.freeze(input.contradictionIds.filter(isText)) }
      : {}),
    ...(Array.isArray(input.corroborationIds)
      ? { corroborationIds: Object.freeze(input.corroborationIds.filter(isText)) }
      : {}),
  }
  return { status: 'ok', record: freeze(record) }
}

/** Preserve parallel records; never overwrite. Relationships are explicit and independent. */
export function collectAssessments(
  inputs: readonly unknown[]
): {
  status: 'ok'
  records: readonly OperationalAssessmentRecord[]
  relationships: readonly AssessmentRelationship[]
} | { status: 'invalid'; reason: string } {
  const records: OperationalAssessmentRecord[] = []
  const seen = new Set<string>()
  for (const input of inputs) {
    const result = normalizeAssessment(input)
    if (result.status === 'invalid') return result
    if (seen.has(result.record.id)) return { status: 'invalid', reason: 'duplicate-id' }
    seen.add(result.record.id)
    records.push(result.record)
  }
  // Derive explicit relationships from fields if present (minimal)
  const relationships: AssessmentRelationship[] = []
  for (const r of records) {
    for (const id of r.contradictionIds ?? []) {
      relationships.push({ fromId: r.id, toId: id, type: 'contradiction' })
    }
    for (const id of r.corroborationIds ?? []) {
      relationships.push({ fromId: r.id, toId: id, type: 'corroboration' })
    }
  }
  return {
    status: 'ok',
    records: Object.freeze(records),
    relationships: Object.freeze(relationships),
  }
}

/** Shared-origin check: derivatives of same originRef do not count as independent corroboration. */
export function isIndependentCorroboration(
  a: OperationalAssessmentRecord,
  b: OperationalAssessmentRecord
): boolean {
  const originsA = new Set(a.provenance.map((p) => p.originRef ?? p.sourceRef))
  const originsB = new Set(b.provenance.map((p) => p.originRef ?? p.sourceRef))
  for (const o of originsA) if (originsB.has(o)) return false
  return true
}
