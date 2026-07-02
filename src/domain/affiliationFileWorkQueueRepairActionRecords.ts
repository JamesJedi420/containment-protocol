import type { GameState } from './models'
import type { Candidate } from './recruitment'

export type AffiliationFileWorkQueueRepairActionRecordId = string

export interface AffiliationFileWorkQueueRepairActionRecord {
  readonly id: AffiliationFileWorkQueueRepairActionRecordId
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly reasonCode: string
  readonly repairLabel: string
  readonly recordedWeek: number
}

export type AffiliationFileWorkQueueRepairActionRecordsMap = Record<
  AffiliationFileWorkQueueRepairActionRecordId,
  AffiliationFileWorkQueueRepairActionRecord
>

export interface AffiliationFileWorkQueueRepairActionRecordInput {
  readonly workQueueEntryId: string
  readonly subjectId: string
  readonly subjectLabel: string
  readonly reasonCode: string
  readonly repairLabel: string
  readonly recordedWeek: number
}

export type AffiliationFileWorkQueueCandidateEvidenceRepairReason =
  | 'applied'
  | 'unsupported-reason-code'
  | 'missing-person-status-record'
  | 'missing-candidate-ref'
  | 'candidate-already-present'
  | 'missing-evidence-resolution'

export interface AffiliationFileWorkQueueCandidateEvidenceRepairResult {
  readonly state: GameState
  readonly applied: boolean
  readonly reason: AffiliationFileWorkQueueCandidateEvidenceRepairReason
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

function normalizeReasonCode(value: unknown) {
  const reasonCode = normalizeToken(value)
  return reasonCode.startsWith('missing_') ? reasonCode : ''
}

function hasCandidate(candidates: readonly Candidate[] | undefined, candidateId: string) {
  return (candidates ?? []).some((candidate) => candidate.id === candidateId)
}

function hasRecordedCandidateEvidenceResolution(state: GameState, entryId: string) {
  return Object.values(state.affiliationFileWorkQueueEvidenceResolutionRecords ?? {}).some(
    (record) =>
      record.workQueueEntryId === entryId &&
      record.missingReasonCodes.includes('missing_candidate_ref')
  )
}

function buildRepairedCandidateEvidence(input: {
  readonly candidateId: string
  readonly subjectLabel: string
  readonly week: number
}): Candidate {
  return Object.freeze({
    id: input.candidateId,
    name: input.subjectLabel,
    age: 30,
    category: 'agent',
    hireStatus: 'available',
    weeklyCost: 0,
    weeklyWage: 0,
    revealLevel: 2,
    expiryWeek: Math.max(1, input.week + 8),
    origin: 'affiliation-file-work-queue-repair',
    roleInclination: 'field',
    skills: ['affiliation-evidence-repaired'],
    liabilities: [],
    funnelStage: 'hired',
    createdWeek: Math.max(1, input.week),
    lastUpdatedWeek: Math.max(1, input.week),
    evaluation: {
      overallVisible: true,
      overall: 50,
      overallValue: 50,
      potentialVisible: true,
      potentialTier: 'mid',
      rumorTags: ['affiliation-evidence-repaired'],
    },
    agentData: {
      role: 'field',
      specialization: 'affiliation evidence repair',
      stats: {
        combat: 50,
        investigation: 50,
        utility: 50,
        social: 50,
      },
      traits: ['affiliation-evidence-repaired'],
    },
  })
}

function appendCandidateIfMissing(
  candidates: readonly Candidate[] | undefined,
  candidate: Candidate
) {
  return hasCandidate(candidates, candidate.id)
    ? [...(candidates ?? [])]
    : [...(candidates ?? []), candidate]
}

export function applyAffiliationFileWorkQueueCandidateEvidenceRepair(input: {
  readonly state: GameState
  readonly workQueueEntryId: string
  readonly reasonCode: string
  readonly recordedWeek: number
}): AffiliationFileWorkQueueCandidateEvidenceRepairResult {
  const reasonCode = normalizeReasonCode(input.reasonCode)

  if (reasonCode !== 'missing_candidate_ref') {
    return Object.freeze({
      state: input.state,
      applied: false,
      reason: 'unsupported-reason-code',
    })
  }

  const record = input.state.affiliationPersonStatusRecords?.[input.workQueueEntryId]
  if (!record) {
    return Object.freeze({
      state: input.state,
      applied: false,
      reason: 'missing-person-status-record',
    })
  }

  const candidateRef = normalizeToken(record.candidateRef)
  if (!candidateRef) {
    return Object.freeze({
      state: input.state,
      applied: false,
      reason: 'missing-candidate-ref',
    })
  }

  if (!hasRecordedCandidateEvidenceResolution(input.state, input.workQueueEntryId)) {
    return Object.freeze({
      state: input.state,
      applied: false,
      reason: 'missing-evidence-resolution',
    })
  }

  if (
    hasCandidate(input.state.candidates, candidateRef) &&
    hasCandidate(input.state.recruitmentPool, candidateRef)
  ) {
    return Object.freeze({
      state: input.state,
      applied: false,
      reason: 'candidate-already-present',
    })
  }

  const candidate = buildRepairedCandidateEvidence({
    candidateId: candidateRef,
    subjectLabel: record.subjectLabel,
    week: input.recordedWeek,
  })

  return Object.freeze({
    state: {
      ...input.state,
      candidates: appendCandidateIfMissing(input.state.candidates, candidate),
      recruitmentPool: appendCandidateIfMissing(input.state.recruitmentPool, candidate),
    },
    applied: true,
    reason: 'applied',
  })
}

export function buildAffiliationFileWorkQueueRepairActionRecordId(input: {
  readonly workQueueEntryId: string
  readonly reasonCode: string
}) {
  return `affiliation-file-repair-action:${input.workQueueEntryId}:${input.reasonCode}`
}

export function buildAffiliationFileWorkQueueRepairActionRecord(
  input: AffiliationFileWorkQueueRepairActionRecordInput
): AffiliationFileWorkQueueRepairActionRecord {
  const reasonCode = normalizeReasonCode(input.reasonCode)

  return Object.freeze({
    id: buildAffiliationFileWorkQueueRepairActionRecordId({
      workQueueEntryId: input.workQueueEntryId,
      reasonCode,
    }),
    workQueueEntryId: input.workQueueEntryId,
    subjectId: input.subjectId,
    subjectLabel: input.subjectLabel,
    reasonCode,
    repairLabel: input.repairLabel,
    recordedWeek: input.recordedWeek,
  })
}

function sanitizeRepairActionRecordEntry(
  value: unknown,
  expectedKey?: string
): AffiliationFileWorkQueueRepairActionRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const workQueueEntryId = normalizeToken(value.workQueueEntryId)
  const subjectId = normalizeToken(value.subjectId)
  const subjectLabel = normalizeToken(value.subjectLabel)
  const reasonCode = normalizeReasonCode(value.reasonCode)
  const repairLabel = normalizeToken(value.repairLabel)
  const recordedWeek = normalizeRecordedWeek(value.recordedWeek)

  if (
    !id ||
    !workQueueEntryId ||
    !subjectId ||
    !subjectLabel ||
    !reasonCode ||
    !repairLabel ||
    recordedWeek === undefined ||
    (expectedKey !== undefined && expectedKey !== id) ||
    id !== buildAffiliationFileWorkQueueRepairActionRecordId({ workQueueEntryId, reasonCode })
  ) {
    return null
  }

  return Object.freeze({
    id,
    workQueueEntryId,
    subjectId,
    subjectLabel,
    reasonCode,
    repairLabel,
    recordedWeek,
  })
}

/** Hydration: canonical repair-action ledger keyed by deterministic action record id. */
export function sanitizeAffiliationFileWorkQueueRepairActionRecords(
  value: unknown,
  fallback: AffiliationFileWorkQueueRepairActionRecordsMap = {}
): AffiliationFileWorkQueueRepairActionRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: AffiliationFileWorkQueueRepairActionRecordsMap = {}
  const seenIds = new Set<string>()

  for (const [key, entry] of Object.entries(value)) {
    const record = sanitizeRepairActionRecordEntry(entry, key)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}
