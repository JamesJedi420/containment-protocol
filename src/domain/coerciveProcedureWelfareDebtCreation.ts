/**
 * SPE-1888 slice 5: welfare-debt creation on coercive procedure execution.
 *
 * Creates persisted `WelfareDebtAccountingRecord` entries when a coercive procedure
 * executes and containment or security improves. Legitimacy cost is recorded
 * separately from operational containment benefit — high benefit does not erase debt.
 */

import type { CustodyStatusRecordsMap, CustodyStatusRecord } from './containedPersonCustodyStatusRegistry'
import type { MedicationRegimenRecordsMap, MedicationRegimenRecord } from './containedPersonMedicationRegimenRegistry'
import {
  COERCIVE_PROCEDURE_ANCHORS,
  resolveCoerciveProcedureAnchor,
  type CoerciveProcedureAnchor,
} from './coerciveProcedureRegistry'
import {
  resolveNextWelfareDebtSeverityBand,
  validateWelfareDebtAccountingRecord,
  type WelfareDebtAccountingRecord,
  type WelfareDebtAccountingRecordsMap,
  type WelfareDebtCategory,
  type WelfareDebtSeverityBand,
} from './welfareDebtAccountingRegistry'

// ---------------------------------------------------------------------------
// Execution draft
// ---------------------------------------------------------------------------

export interface CoerciveProcedureExecutionDraft {
  /** Stable idempotency key — one debt ledger entry per procedure execution instance. */
  readonly executionKey: string
  readonly subjectRef: string
  readonly procedureRef: string
  readonly priorContainmentScore: number
  readonly postContainmentScore: number
  readonly week: number
  readonly adverseReactionFlag?: boolean
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const CATEGORY_BASE_SEVERITY: Readonly<Record<WelfareDebtCategory, WelfareDebtSeverityBand>> = {
  harmful_restraint: 'high',
  coerced_medication: 'high',
  punitive_handling: 'high',
  high_risk_personnel_sourcing: 'high',
  forced_isolation: 'moderate',
  coercive_interview: 'moderate',
  privilege_deprivation: 'moderate',
  coerced_participation: 'low',
}

const BASELINE_INSECURITY_SCORE = 0.38
const ELEVATED_CUSTODY_IMPROVEMENT_SCORE = 0.71
const ADVERSE_REACTION_CONTAINMENT_PENALTY = 0.1

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function isValidUnitScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function clampUnitScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(1, Math.max(0, value))
}

function freezeRecord(record: WelfareDebtAccountingRecord): WelfareDebtAccountingRecord {
  return Object.freeze({ ...record })
}

function buildExecutionKey(procedureRef: string, subjectRef: string): string {
  return `${procedureRef}:${subjectRef}`
}

function buildWelfareDebtRecordId(executionKey: string): string {
  return `welfare-debt:${executionKey}`
}

// ---------------------------------------------------------------------------
// Public classification helpers
// ---------------------------------------------------------------------------

/** Whether containment or security improved between prior and post scores. */
export function hasContainmentOrSecurityImprovement(
  draft: CoerciveProcedureExecutionDraft
): boolean {
  return draft.postContainmentScore > draft.priorContainmentScore
}

/**
 * Operational containment benefit for the ledger entry.
 * Recorded alongside welfare debt — does not gate or erase debt creation.
 */
export function resolveContainmentBenefitScoreFromExecution(
  draft: CoerciveProcedureExecutionDraft
): number {
  return clampUnitScore(draft.postContainmentScore)
}

/**
 * Deterministic severity classification from debt category, coercion pressure,
 * and adverse-reaction signals. Independent of containment benefit magnitude.
 */
export function resolveWelfareDebtSeverityBandForCoerciveProcedure(
  anchor: CoerciveProcedureAnchor,
  draft: CoerciveProcedureExecutionDraft
): WelfareDebtSeverityBand {
  let severityBand = CATEGORY_BASE_SEVERITY[anchor.debtCategory]

  if (anchor.coercionPressureTier === 'high' && severityBand === 'moderate') {
    severityBand = 'high'
  }

  if (draft.adverseReactionFlag === true) {
    const escalated = resolveNextWelfareDebtSeverityBand(severityBand)
    if (escalated) {
      severityBand = escalated
    }
  }

  return severityBand
}

// ---------------------------------------------------------------------------
// Record builder
// ---------------------------------------------------------------------------

export function buildWelfareDebtAccountingRecordForCoerciveProcedureExecution(
  draft: CoerciveProcedureExecutionDraft,
  anchor: CoerciveProcedureAnchor
): WelfareDebtAccountingRecord | undefined {
  if (!hasContainmentOrSecurityImprovement(draft)) {
    return undefined
  }

  const containmentBenefitScore = resolveContainmentBenefitScoreFromExecution(draft)
  const recordId = buildWelfareDebtRecordId(draft.executionKey)

  const candidate: WelfareDebtAccountingRecord = {
    id: recordId,
    label: `${anchor.sourceProcedureLabel} welfare debt`,
    summary:
      'Coercive procedure with documented containment benefit and unresolved welfare debt.',
    subjectRef: draft.subjectRef,
    debtCategory: anchor.debtCategory,
    severityBand: resolveWelfareDebtSeverityBandForCoerciveProcedure(anchor, draft),
    mitigationState: 'unresolved',
    sourceProcedureLabel: anchor.sourceProcedureLabel,
    reviewOwnerLabel: anchor.reviewOwnerLabel,
    mitigationPathLabel: anchor.mitigationPathLabel,
    containmentBenefitScore,
    confidence: containmentBenefitScore,
  }

  if (!validateWelfareDebtAccountingRecord(candidate).valid) {
    return undefined
  }

  return freezeRecord(candidate)
}

// ---------------------------------------------------------------------------
// Draft derivation
// ---------------------------------------------------------------------------

function resolvePostContainmentScoreFromMedicationRegimen(
  regimen: MedicationRegimenRecord
): number | undefined {
  if (regimen.consentStatus !== 'compelled') {
    return undefined
  }

  if (!normalizeToken(regimen.containmentPurposeLabel)) {
    return undefined
  }

  const confidence = isValidUnitScore(regimen.confidence) ? regimen.confidence : 0.5
  const penalty = regimen.adverseReactionFlag ? ADVERSE_REACTION_CONTAINMENT_PENALTY : 0

  return clampUnitScore(confidence - penalty)
}

function resolvePostContainmentScoreFromCustodyStatus(
  custody: CustodyStatusRecord
): number | undefined {
  if (custody.custodyStage !== 'contained_person') {
    return undefined
  }

  if (normalizeToken(custody.restrictionLevel) !== 'elevated') {
    return undefined
  }

  const confidence = isValidUnitScore(custody.confidence) ? custody.confidence : 0.5
  return clampUnitScore(Math.max(confidence, ELEVATED_CUSTODY_IMPROVEMENT_SCORE))
}

function pushMedicationRegimenDraft(
  drafts: CoerciveProcedureExecutionDraft[],
  anchor: CoerciveProcedureAnchor,
  regimen: MedicationRegimenRecord,
  week: number
) {
  const postContainmentScore = resolvePostContainmentScoreFromMedicationRegimen(regimen)
  if (postContainmentScore === undefined) {
    return
  }

  const priorContainmentScore = BASELINE_INSECURITY_SCORE
  if (postContainmentScore <= priorContainmentScore) {
    return
  }

  const subjectRef = normalizeToken(regimen.subjectRef)
  if (!subjectRef) {
    return
  }

  drafts.push({
    executionKey: buildExecutionKey(anchor.procedureRef, subjectRef),
    subjectRef,
    procedureRef: anchor.procedureRef,
    priorContainmentScore,
    postContainmentScore,
    week,
    adverseReactionFlag: regimen.adverseReactionFlag,
  })
}

function pushCustodyStatusDraft(
  drafts: CoerciveProcedureExecutionDraft[],
  anchor: CoerciveProcedureAnchor,
  custody: CustodyStatusRecord,
  week: number
) {
  const postContainmentScore = resolvePostContainmentScoreFromCustodyStatus(custody)
  if (postContainmentScore === undefined) {
    return
  }

  const priorContainmentScore = BASELINE_INSECURITY_SCORE
  if (postContainmentScore <= priorContainmentScore) {
    return
  }

  const subjectRef = normalizeToken(custody.subjectRef)
  if (!subjectRef) {
    return
  }

  drafts.push({
    executionKey: buildExecutionKey(anchor.procedureRef, subjectRef),
    subjectRef,
    procedureRef: anchor.procedureRef,
    priorContainmentScore,
    postContainmentScore,
    week,
  })
}

/** Derive coercive procedure execution drafts from persisted medication regimen records. */
export function resolveCoerciveProcedureExecutionDraftsFromMedicationRegimens(
  regimens: MedicationRegimenRecordsMap | null | undefined,
  week: number
): readonly CoerciveProcedureExecutionDraft[] {
  const safeRegimens = regimens ?? {}
  const normalizedWeek = normalizeWeek(week)
  const drafts: CoerciveProcedureExecutionDraft[] = []

  for (const anchor of COERCIVE_PROCEDURE_ANCHORS) {
    const regimenRef = anchor.regimenRef
    if (!regimenRef) {
      continue
    }

    const regimen = safeRegimens[regimenRef]
    if (!regimen) {
      continue
    }

    pushMedicationRegimenDraft(drafts, anchor, regimen, normalizedWeek)
  }

  return Object.freeze(
    drafts.sort((left, right) => left.executionKey.localeCompare(right.executionKey))
  )
}

/** Derive coercive procedure execution drafts from persisted custody status records. */
export function resolveCoerciveProcedureExecutionDraftsFromCustodyStatus(
  custodyRecords: CustodyStatusRecordsMap | null | undefined,
  week: number
): readonly CoerciveProcedureExecutionDraft[] {
  const safeRecords = custodyRecords ?? {}
  const normalizedWeek = normalizeWeek(week)
  const drafts: CoerciveProcedureExecutionDraft[] = []

  for (const anchor of COERCIVE_PROCEDURE_ANCHORS) {
    const custodyStatusRef = anchor.custodyStatusRef
    if (!custodyStatusRef) {
      continue
    }

    const custody = safeRecords[custodyStatusRef]
    if (!custody) {
      continue
    }

    pushCustodyStatusDraft(drafts, anchor, custody, normalizedWeek)
  }

  return Object.freeze(
    drafts.sort((left, right) => left.executionKey.localeCompare(right.executionKey))
  )
}

/** Merge medication-regimen and custody-status derived execution drafts. */
export function resolveCoerciveProcedureExecutionDrafts(
  regimens: MedicationRegimenRecordsMap | null | undefined,
  custodyRecords: CustodyStatusRecordsMap | null | undefined,
  week: number
): readonly CoerciveProcedureExecutionDraft[] {
  const merged = new Map<string, CoerciveProcedureExecutionDraft>()

  for (const draft of resolveCoerciveProcedureExecutionDraftsFromMedicationRegimens(regimens, week)) {
    merged.set(draft.executionKey, draft)
  }

  for (const draft of resolveCoerciveProcedureExecutionDraftsFromCustodyStatus(custodyRecords, week)) {
    merged.set(draft.executionKey, draft)
  }

  return Object.freeze(
    [...merged.values()].sort((left, right) => left.executionKey.localeCompare(right.executionKey))
  )
}

// ---------------------------------------------------------------------------
// Creation tick
// ---------------------------------------------------------------------------

/**
 * Applies one coercive-procedure welfare-debt creation pass over persisted records.
 * Empty drafts is a no-op. Re-applying with the same execution keys is idempotent.
 */
export function applyCoerciveProcedureWelfareDebtCreationTick(
  records: WelfareDebtAccountingRecordsMap | null | undefined,
  drafts: readonly CoerciveProcedureExecutionDraft[]
): WelfareDebtAccountingRecordsMap {
  const safeRecords = records ?? {}
  if (drafts.length === 0) {
    return safeRecords
  }

  const next: WelfareDebtAccountingRecordsMap = { ...safeRecords }
  let changed = false

  for (const draft of [...drafts].sort((left, right) =>
    left.executionKey.localeCompare(right.executionKey)
  )) {
    const recordId = buildWelfareDebtRecordId(draft.executionKey)
    if (next[recordId]) {
      continue
    }

    const anchor = resolveCoerciveProcedureAnchor(draft.procedureRef)
    if (!anchor) {
      continue
    }

    const created = buildWelfareDebtAccountingRecordForCoerciveProcedureExecution(draft, anchor)
    if (!created) {
      continue
    }

    next[recordId] = created
    changed = true
  }

  return changed ? next : safeRecords
}
