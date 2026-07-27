import type { GameState } from './models'
import type { Candidate } from './recruitment'
import type { EntityWelfareReclassificationRecord } from './entityWelfareReclassificationRegistry'
import type { AffiliationPersonStatusRecord } from './affiliationPersonStatusRecords'

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

export type AffiliationFileWorkQueueEvidenceRepairReason =
  | 'applied'
  | 'unsupported-reason-code'
  | 'missing-person-status-record'
  | 'missing-candidate-ref'
  | 'missing-welfare-ref'
  | 'candidate-already-present'
  | 'welfare-record-already-present'
  | 'onboarding-already-present'
  | 'missing-evidence-resolution'

export interface AffiliationFileWorkQueueEvidenceRepairResult {
  readonly state: GameState
  readonly applied: boolean
  readonly reason: AffiliationFileWorkQueueEvidenceRepairReason
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

function hasRecordedWelfareEvidenceResolution(state: GameState, entryId: string) {
  return Object.values(state.affiliationFileWorkQueueEvidenceResolutionRecords ?? {}).some(
    (record) =>
      record.workQueueEntryId === entryId &&
      record.missingReasonCodes.includes('missing_entity_welfare_reclassification_ref')
  )
}

function hasRecordedOnboardingEvidenceResolution(state: GameState, entryId: string) {
  return Object.values(state.affiliationFileWorkQueueEvidenceResolutionRecords ?? {}).some(
    (record) =>
      record.workQueueEntryId === entryId &&
      record.missingReasonCodes.includes('missing_onboarding_clearance')
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

function buildRepairedWelfareEvidence(input: {
  readonly recordId: string
  readonly subjectLabel: string
  readonly week: number
}): EntityWelfareReclassificationRecord {
  return Object.freeze({
    id: input.recordId,
    label: `${input.subjectLabel} welfare link repair`,
    summary: 'Minimal restored welfare reclassification evidence from file work queue repair.',
    priorThreatLabel: 'unreviewed affiliation custody',
    proposedDisposition: 'unknown',
    reclassificationState: 'pending',
    evidenceBundleRefs: [`affiliation-file-work-queue-repair:${input.recordId}:week-${input.week}`],
    confidence: 0.5,
  })
}

function buildRepairedOnboardingCandidateId(record: AffiliationPersonStatusRecord) {
  return `candidate:${record.subjectId.replace(/[^a-zA-Z0-9:-]+/g, '-').toLowerCase()}:onboarding-repair`
}

function isOnboardingCleared(record: AffiliationPersonStatusRecord, candidate: Candidate) {
  return (
    candidate.funnelStage === 'hired' &&
    record.backgroundCleared === true &&
    record.trainingCompleted === true &&
    record.oathContractSigned === true
  )
}

function buildOnboardingRepairedRecord(input: {
  readonly record: AffiliationPersonStatusRecord
  readonly candidateId: string
}): AffiliationPersonStatusRecord {
  const { record, candidateId } = input

  return Object.freeze({
    ...record,
    candidateRef: candidateId,
    backgroundCleared: true,
    trainingCompleted: true,
    oathContractSigned: true,
  })
}

function buildOnboardingRepairedCandidate(candidate: Candidate, week: number): Candidate {
  return Object.freeze({
    ...candidate,
    hireStatus: candidate.hireStatus === 'expired' ? 'available' : candidate.hireStatus,
    revealLevel: candidate.revealLevel < 2 ? 2 : candidate.revealLevel,
    funnelStage: 'hired',
    lastUpdatedWeek: Math.max(1, week),
    roleInclination: candidate.roleInclination ?? 'field',
    skills: [...new Set([...(candidate.skills ?? []), 'affiliation-onboarding-repaired'])],
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

function replaceCandidateIfPresent(
  candidates: readonly Candidate[] | undefined,
  nextCandidate: Candidate
) {
  const current = candidates ?? []
  return current.map((candidate) => (candidate.id === nextCandidate.id ? nextCandidate : candidate))
}

function findCandidate(candidates: readonly Candidate[] | undefined, candidateId: string) {
  return (candidates ?? []).find((candidate) => candidate.id === candidateId)
}

function findCandidateAcrossPools(state: GameState, candidateId: string) {
  const candidates = state.candidates.length > 0 ? state.candidates : state.recruitmentPool
  return findCandidate(candidates, candidateId)
}

function upsertCandidate(candidates: readonly Candidate[] | undefined, nextCandidate: Candidate) {
  return hasCandidate(candidates, nextCandidate.id)
    ? replaceCandidateIfPresent(candidates, nextCandidate)
    : appendCandidateIfMissing(candidates, nextCandidate)
}

function buildCandidatePoolRepair(state: GameState, nextCandidate: Candidate) {
  const baseCandidates = state.candidates.length > 0 ? state.candidates : state.recruitmentPool
  const nextCandidates = upsertCandidate(baseCandidates, nextCandidate)

  return {
    candidates: nextCandidates,
    recruitmentPool: nextCandidates,
  }
}

export function applyAffiliationFileWorkQueueEvidenceRepair(input: {
  readonly state: GameState
  readonly workQueueEntryId: string
  readonly reasonCode: string
  readonly recordedWeek: number
}): AffiliationFileWorkQueueEvidenceRepairResult {
  const reasonCode = normalizeReasonCode(input.reasonCode)

  if (
    reasonCode !== 'missing_candidate_ref' &&
    reasonCode !== 'missing_entity_welfare_reclassification_ref' &&
    reasonCode !== 'missing_onboarding_clearance'
  ) {
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

  if (reasonCode === 'missing_entity_welfare_reclassification_ref') {
    const welfareRef = normalizeToken(record.entityWelfareReclassificationRef)
    if (!welfareRef) {
      return Object.freeze({
        state: input.state,
        applied: false,
        reason: 'missing-welfare-ref',
      })
    }

    if (!hasRecordedWelfareEvidenceResolution(input.state, input.workQueueEntryId)) {
      return Object.freeze({
        state: input.state,
        applied: false,
        reason: 'missing-evidence-resolution',
      })
    }

    if (input.state.entityWelfareReclassificationRecords?.[welfareRef]) {
      return Object.freeze({
        state: input.state,
        applied: false,
        reason: 'welfare-record-already-present',
      })
    }

    const welfareRecord = buildRepairedWelfareEvidence({
      recordId: welfareRef,
      subjectLabel: record.subjectLabel,
      week: input.recordedWeek,
    })

    return Object.freeze({
      state: {
        ...input.state,
        entityWelfareReclassificationRecords: {
          ...(input.state.entityWelfareReclassificationRecords ?? {}),
          [welfareRecord.id]: welfareRecord,
        },
      },
      applied: true,
      reason: 'applied',
    })
  }

  if (reasonCode === 'missing_onboarding_clearance') {
    if (!hasRecordedOnboardingEvidenceResolution(input.state, input.workQueueEntryId)) {
      return Object.freeze({
        state: input.state,
        applied: false,
        reason: 'missing-evidence-resolution',
      })
    }

    const candidateRef = normalizeToken(record.candidateRef)
    if (!candidateRef) {
      const candidate = buildRepairedCandidateEvidence({
        candidateId: buildRepairedOnboardingCandidateId(record),
        subjectLabel: record.subjectLabel,
        week: input.recordedWeek,
      })
      const nextRecord = buildOnboardingRepairedRecord({
        record,
        candidateId: candidate.id,
      })

      return Object.freeze({
        state: {
          ...input.state,
          affiliationPersonStatusRecords: {
            ...(input.state.affiliationPersonStatusRecords ?? {}),
            [nextRecord.id]: nextRecord,
          },
          ...buildCandidatePoolRepair(input.state, candidate),
        },
        applied: true,
        reason: 'applied',
      })
    }

    const currentCandidate = findCandidateAcrossPools(input.state, candidateRef)
    if (!currentCandidate) {
      return Object.freeze({
        state: input.state,
        applied: false,
        reason: 'missing-candidate-ref',
      })
    }

    if (isOnboardingCleared(record, currentCandidate)) {
      return Object.freeze({
        state: input.state,
        applied: false,
        reason: 'onboarding-already-present',
      })
    }

    const nextCandidate = buildOnboardingRepairedCandidate(currentCandidate, input.recordedWeek)
    const nextRecord = buildOnboardingRepairedRecord({
      record,
      candidateId: nextCandidate.id,
    })

    return Object.freeze({
      state: {
        ...input.state,
        affiliationPersonStatusRecords: {
          ...(input.state.affiliationPersonStatusRecords ?? {}),
          [nextRecord.id]: nextRecord,
        },
        ...buildCandidatePoolRepair(input.state, nextCandidate),
      },
      applied: true,
      reason: 'applied',
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
      ...buildCandidatePoolRepair(input.state, candidate),
    },
    applied: true,
    reason: 'applied',
  })
}

export const applyAffiliationFileWorkQueueCandidateEvidenceRepair =
  applyAffiliationFileWorkQueueEvidenceRepair

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
