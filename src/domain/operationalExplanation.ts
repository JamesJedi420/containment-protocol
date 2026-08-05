export const OPERATIONAL_EXPLANATION_SEVERITIES = [
  'routine',
  'pending',
  'uncertain',
  'degraded',
  'blocked',
  'critical',
] as const

export type OperationalExplanationSeverity =
  (typeof OPERATIONAL_EXPLANATION_SEVERITIES)[number]

export const OPERATIONAL_EXPLANATION_LIFECYCLES = [
  'active',
  'resolved',
  'superseded',
] as const

export type OperationalExplanationLifecycle =
  (typeof OPERATIONAL_EXPLANATION_LIFECYCLES)[number]

export const OPERATIONAL_EXPLANATION_CONFIDENCES = [
  'confirmed',
  'supported',
  'limited',
  'unknown',
] as const

export type OperationalExplanationConfidence =
  (typeof OPERATIONAL_EXPLANATION_CONFIDENCES)[number]

export const OPERATIONAL_EXPLANATION_DEPTHS = ['summary', 'detail', 'diagnostic'] as const
export type OperationalExplanationDepth = (typeof OPERATIONAL_EXPLANATION_DEPTHS)[number]

export interface OperationalExplanationSource {
  readonly system: 'department_workshop' | 'deployable_readiness'
  readonly recordType: 'work_order' | 'completion_outcome' | 'readiness_composition'
  readonly recordId: string
}

export interface OperationalExplanationRecord {
  readonly id: string
  readonly source: OperationalExplanationSource
  readonly subjectId: string
  readonly reasonCode: string
  readonly severity: OperationalExplanationSeverity
  readonly lifecycle: OperationalExplanationLifecycle
  readonly summary: string
  readonly cause: string
  readonly currentEffect: string
  readonly projectedConsequence?: string
  readonly correctionCondition?: string
  readonly correctiveAction?: {
    readonly label: string
    readonly route?: string
  }
  readonly confidence: OperationalExplanationConfidence
  readonly provenance: readonly string[]
  readonly blockerCodes: readonly string[]
}

export interface OperationalExplanationProjection {
  readonly id: string
  readonly depth: OperationalExplanationDepth
  readonly source: OperationalExplanationSource
  readonly subjectId: string
  readonly reasonCode: string
  readonly severity: OperationalExplanationSeverity
  readonly lifecycle: OperationalExplanationLifecycle
  readonly summary: string
  readonly reasonText: string
  readonly cause?: string
  readonly currentEffect?: string
  readonly projectedConsequence?: string
  readonly correctionCondition?: string
  readonly correctiveAction?: OperationalExplanationRecord['correctiveAction']
  readonly confidence?: OperationalExplanationConfidence
  readonly provenance?: readonly string[]
  readonly blockerCodes?: readonly string[]
}

export interface OperationalExplanationValidationResult {
  readonly valid: boolean
  readonly issues: readonly string[]
}

const LIFECYCLE_PRIORITY: Record<OperationalExplanationLifecycle, number> = {
  active: 0,
  resolved: 1,
  superseded: 2,
}

const SEVERITY_PRIORITY: Record<OperationalExplanationSeverity, number> = {
  critical: 0,
  blocked: 1,
  degraded: 2,
  uncertain: 3,
  pending: 4,
  routine: 5,
}

export function compareOperationalExplanationCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function normalizeStringList(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.filter((value) => typeof value === 'string' && value.trim().length > 0))]
      .sort(compareOperationalExplanationCodeUnits)
  )
}

export function createOperationalExplanationId(
  source: OperationalExplanationSource,
  reasonCode: string
): string {
  return `${source.system}:${source.recordType}:${source.recordId}:${reasonCode}`
}

export function createOperationalExplanationRecord(
  input: Omit<OperationalExplanationRecord, 'id' | 'provenance' | 'blockerCodes'> & {
    readonly provenance?: readonly string[]
    readonly blockerCodes?: readonly string[]
  }
): OperationalExplanationRecord {
  const source = Object.freeze({ ...input.source })
  return Object.freeze({
    ...input,
    source,
    id: createOperationalExplanationId(source, input.reasonCode),
    correctiveAction: input.correctiveAction
      ? Object.freeze({ ...input.correctiveAction })
      : undefined,
    provenance: normalizeStringList(input.provenance ?? []),
    blockerCodes: normalizeStringList(input.blockerCodes ?? []),
  })
}

export function compareOperationalExplanationRecords(
  left: OperationalExplanationRecord,
  right: OperationalExplanationRecord
): number {
  return (
    LIFECYCLE_PRIORITY[left.lifecycle] - LIFECYCLE_PRIORITY[right.lifecycle] ||
    SEVERITY_PRIORITY[left.severity] - SEVERITY_PRIORITY[right.severity] ||
    compareOperationalExplanationCodeUnits(left.source.system, right.source.system) ||
    compareOperationalExplanationCodeUnits(left.subjectId, right.subjectId) ||
    compareOperationalExplanationCodeUnits(left.reasonCode, right.reasonCode) ||
    compareOperationalExplanationCodeUnits(left.id, right.id)
  )
}

export function sortOperationalExplanationRecords(
  records: readonly OperationalExplanationRecord[]
): readonly OperationalExplanationRecord[] {
  return Object.freeze([...records].sort(compareOperationalExplanationRecords))
}

export function projectOperationalExplanation(
  record: OperationalExplanationRecord,
  depth: OperationalExplanationDepth
): OperationalExplanationProjection {
  if (!OPERATIONAL_EXPLANATION_DEPTHS.includes(depth)) {
    throw new Error(`Unsupported operational explanation depth: ${String(depth)}`)
  }

  const base = {
    id: record.id,
    depth,
    source: record.source,
    subjectId: record.subjectId,
    reasonCode: record.reasonCode,
    severity: record.severity,
    lifecycle: record.lifecycle,
    summary: record.summary,
    reasonText: `${record.severity}: ${record.summary}`,
  } as const

  if (depth === 'summary') return Object.freeze(base)

  const detail = {
    ...base,
    cause: record.cause,
    currentEffect: record.currentEffect,
    correctionCondition: record.correctionCondition,
    correctiveAction: record.correctiveAction,
    confidence: record.confidence,
  } as const

  if (depth === 'detail') return Object.freeze(detail)

  return Object.freeze({
    ...detail,
    projectedConsequence: record.projectedConsequence,
    provenance: record.provenance,
    blockerCodes: record.blockerCodes,
  })
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNormalizedStringList(value: unknown): value is readonly string[] {
  if (!Array.isArray(value) || value.some((item) => !isNonEmptyString(item))) return false
  return JSON.stringify(value) === JSON.stringify(normalizeStringList(value))
}

export function validateOperationalExplanationRecord(
  value: unknown
): OperationalExplanationValidationResult {
  const issues: string[] = []
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { valid: false, issues: Object.freeze(['record-required']) }
  }

  const record = value as Partial<OperationalExplanationRecord>
  const source = record.source
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    issues.push('source-required')
  } else {
    if (!['department_workshop', 'deployable_readiness'].includes(source.system as string)) {
      issues.push('invalid-source-system')
    }
    if (!['work_order', 'completion_outcome', 'readiness_composition'].includes(source.recordType as string)) {
      issues.push('invalid-record-type')
    }
    if (!isNonEmptyString(source.recordId)) issues.push('source-record-id-required')
  }

  if (!isNonEmptyString(record.subjectId)) issues.push('subject-id-required')
  if (!isNonEmptyString(record.reasonCode) || !record.reasonCode?.includes('.')) {
    issues.push('namespaced-reason-code-required')
  }
  if (!OPERATIONAL_EXPLANATION_SEVERITIES.includes(record.severity as OperationalExplanationSeverity)) {
    issues.push('invalid-severity')
  }
  if (!OPERATIONAL_EXPLANATION_LIFECYCLES.includes(record.lifecycle as OperationalExplanationLifecycle)) {
    issues.push('invalid-lifecycle')
  }
  if (!OPERATIONAL_EXPLANATION_CONFIDENCES.includes(record.confidence as OperationalExplanationConfidence)) {
    issues.push('invalid-confidence')
  }
  if (!isNonEmptyString(record.summary)) issues.push('summary-required')
  if (!isNonEmptyString(record.cause)) issues.push('cause-required')
  if (!isNonEmptyString(record.currentEffect)) issues.push('current-effect-required')
  if (!isNormalizedStringList(record.provenance)) issues.push('provenance-not-normalized')
  if (!isNormalizedStringList(record.blockerCodes)) issues.push('blocker-codes-not-normalized')

  if (issues.length === 0 && source && record.reasonCode) {
    const expectedId = createOperationalExplanationId(
      source as OperationalExplanationSource,
      record.reasonCode
    )
    if (record.id !== expectedId) issues.push('id-mismatch')
  }

  return { valid: issues.length === 0, issues: Object.freeze(issues) }
}

export function validateOperationalExplanationRegistry(
  records: unknown
): OperationalExplanationValidationResult {
  if (!Array.isArray(records)) {
    return { valid: false, issues: Object.freeze(['registry-array-required']) }
  }

  const issues: string[] = []
  const ids = new Set<string>()
  for (const [index, record] of records.entries()) {
    const result = validateOperationalExplanationRecord(record)
    issues.push(...result.issues.map((issue) => `${index}:${issue}`))
    if (typeof record === 'object' && record !== null && 'id' in record) {
      const id = (record as { id?: unknown }).id
      if (typeof id === 'string') {
        if (ids.has(id)) issues.push(`${index}:duplicate-id`)
        ids.add(id)
      }
    }
  }

  return { valid: issues.length === 0, issues: Object.freeze(issues) }
}
