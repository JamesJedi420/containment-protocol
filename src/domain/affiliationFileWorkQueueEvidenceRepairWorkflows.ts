export type AffiliationFileWorkQueueEvidenceRepairWorkflowId = string

export type AffiliationFileWorkQueueEvidenceRepairEvidenceType =
  'missing_entity_welfare_reclassification_ref'

export interface AffiliationFileWorkQueueEvidenceRepairWorkflow {
  readonly id: AffiliationFileWorkQueueEvidenceRepairWorkflowId
  readonly workQueueEntryId: string
  readonly evidenceType: AffiliationFileWorkQueueEvidenceRepairEvidenceType
  readonly subjectId: string
  readonly subjectLabel: string
  readonly repairLabel: string
  readonly repairRef: string
  readonly recordedWeek: number
}

export type AffiliationFileWorkQueueEvidenceRepairWorkflowsMap = Record<
  AffiliationFileWorkQueueEvidenceRepairWorkflowId,
  AffiliationFileWorkQueueEvidenceRepairWorkflow
>

export interface AffiliationFileWorkQueueEvidenceRepairWorkflowInput {
  readonly workQueueEntryId: string
  readonly evidenceType: AffiliationFileWorkQueueEvidenceRepairEvidenceType
  readonly subjectId: string
  readonly subjectLabel: string
  readonly repairLabel: string
  readonly recordedWeek: number
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeRecordedWeek(value: unknown): number | undefined {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value === Math.trunc(value)
    ? value
    : undefined
}

function normalizeEvidenceType(
  value: unknown
): AffiliationFileWorkQueueEvidenceRepairEvidenceType | undefined {
  return value === 'missing_entity_welfare_reclassification_ref' ? value : undefined
}

export function buildAffiliationFileWorkQueueEvidenceRepairWorkflowId(input: {
  readonly workQueueEntryId: string
  readonly evidenceType: AffiliationFileWorkQueueEvidenceRepairEvidenceType
}) {
  return `affiliation-file-work-queue-evidence-repair:${input.workQueueEntryId}:${input.evidenceType}`
}

function buildEvidenceRepairRef(input: {
  readonly workQueueEntryId: string
  readonly evidenceType: AffiliationFileWorkQueueEvidenceRepairEvidenceType
}) {
  return `evidence-repair:${input.workQueueEntryId}:${input.evidenceType}`
}

export function buildAffiliationFileWorkQueueEvidenceRepairWorkflow(
  input: AffiliationFileWorkQueueEvidenceRepairWorkflowInput
): AffiliationFileWorkQueueEvidenceRepairWorkflow {
  const repairRef = buildEvidenceRepairRef({
    workQueueEntryId: input.workQueueEntryId,
    evidenceType: input.evidenceType,
  })

  return Object.freeze({
    id: buildAffiliationFileWorkQueueEvidenceRepairWorkflowId({
      workQueueEntryId: input.workQueueEntryId,
      evidenceType: input.evidenceType,
    }),
    workQueueEntryId: input.workQueueEntryId,
    evidenceType: input.evidenceType,
    subjectId: input.subjectId,
    subjectLabel: input.subjectLabel,
    repairLabel: input.repairLabel,
    repairRef,
    recordedWeek: input.recordedWeek,
  })
}

function sanitizeEvidenceRepairWorkflowEntry(
  value: unknown
): AffiliationFileWorkQueueEvidenceRepairWorkflow | undefined {
  if (!isPlainRecord(value)) {
    return undefined
  }

  const id = normalizeToken(value.id)
  const workQueueEntryId = normalizeToken(value.workQueueEntryId)
  const subjectId = normalizeToken(value.subjectId)
  const subjectLabel = normalizeToken(value.subjectLabel)
  const repairLabel = normalizeToken(value.repairLabel)
  const repairRef = normalizeToken(value.repairRef)
  const evidenceType = normalizeEvidenceType(value.evidenceType)
  const recordedWeek = normalizeRecordedWeek(value.recordedWeek)

  if (
    !id ||
    !workQueueEntryId ||
    !subjectId ||
    !subjectLabel ||
    !repairLabel ||
    !repairRef ||
    !evidenceType ||
    recordedWeek === undefined
  ) {
    return undefined
  }

  return Object.freeze({
    id,
    workQueueEntryId,
    evidenceType,
    subjectId,
    subjectLabel,
    repairLabel,
    repairRef,
    recordedWeek,
  })
}

export function sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows(
  records: unknown
): AffiliationFileWorkQueueEvidenceRepairWorkflowsMap {
  if (!isPlainRecord(records)) {
    return {}
  }

  const seen = new Set<string>()
  const result: AffiliationFileWorkQueueEvidenceRepairWorkflowsMap = {}

  const entries = Object.entries(records)
    .map(([, entry]) => sanitizeEvidenceRepairWorkflowEntry(entry))
    .filter((entry): entry is AffiliationFileWorkQueueEvidenceRepairWorkflow => entry !== undefined)

  // Dedup by (workQueueEntryId, evidenceType), keep first occurrence
  for (const entry of entries) {
    const key = `${entry.workQueueEntryId}:${entry.evidenceType}`
    if (!seen.has(key)) {
      seen.add(key)
      result[entry.id] = entry
    }
  }

  return result
}
