/**
 * SPE-3076 — major-incident terminal resolution and settlement handoff.
 *
 * Pure idempotent settlement receipt over final authoritative outcome.
 * Does not own casualty, assignment release, aftermath, or report UI.
 */

import { getAppliedMajorIncidentRewardPreview } from './majorIncidentOperations'
import type {
  ActiveMajorIncidentRuntime,
  CaseInstance,
  ContractMaterialDrop,
  ContractModifier,
  MajorIncidentRewardItem,
  ResolutionOutcome,
} from './models'

export const MAJOR_INCIDENT_TERMINAL_SETTLEMENT_OWNER = 'SPE-3076' as const
export const MAJOR_INCIDENT_TERMINAL_SETTLEMENT_SCHEMA = 'spe-3076.v1' as const

export type MajorIncidentTerminalOutcome = 'success' | 'partial' | 'fail'

export interface MajorIncidentRewardEligibility {
  readonly materials: ContractMaterialDrop[]
  readonly gear: MajorIncidentRewardItem[]
  readonly progressionUnlocks: string[]
  readonly rumorLoot: ContractModifier[]
}

export interface MajorIncidentTerminalSettlementReceipt {
  readonly schemaVersion: typeof MAJOR_INCIDENT_TERMINAL_SETTLEMENT_SCHEMA
  readonly receiptId: string
  readonly caseId: string
  readonly incidentId: string
  readonly finalOutcome: MajorIncidentTerminalOutcome
  readonly terminalObjectiveState: {
    readonly stage: number
    readonly durationWeeks: number
    readonly requiredTeams: number
  }
  readonly settlementReason: string
  readonly settledAtWeek: number
  readonly rewardEligibility: MajorIncidentRewardEligibility
  /** Opaque handoff refs — downstream systems remain authoritative. */
  readonly consequenceRefs: {
    readonly casualtyRef?: string
    readonly assignmentClaimRef?: string
    readonly aftermathRef?: string
    readonly unlockSignalId?: string
  }
  readonly reportableOutcome: {
    readonly outcome: MajorIncidentTerminalOutcome
    readonly summary: string
  }
}

export type MajorIncidentTerminalSettlementResult =
  | {
      readonly kind: 'settled'
      readonly receipt: MajorIncidentTerminalSettlementReceipt
    }
  | {
      readonly kind: 'idempotent_replay'
      readonly receipt: MajorIncidentTerminalSettlementReceipt
    }
  | {
      readonly kind: 'rejected'
      readonly reasonCode: 'missing_runtime' | 'invalid_outcome' | 'receipt_conflict'
      readonly message: string
    }

export type MajorIncidentSettlementReceiptMap = Readonly<
  Record<string, MajorIncidentTerminalSettlementReceipt>
>

function isTerminalOutcome(value: unknown): value is MajorIncidentTerminalOutcome {
  return value === 'success' || value === 'partial' || value === 'fail'
}

export function buildMajorIncidentSettlementReceiptId(caseId: string, incidentId: string): string {
  return `mi-settle:${caseId}:${incidentId}`
}

function cloneRewardEligibility(
  eligibility: MajorIncidentRewardEligibility,
): MajorIncidentRewardEligibility {
  return {
    materials: eligibility.materials.map((entry) => ({ ...entry })),
    gear: eligibility.gear.map((entry) => ({ ...entry })),
    progressionUnlocks: [...eligibility.progressionUnlocks],
    rumorLoot: eligibility.rumorLoot.map((entry) => ({ ...entry })),
  }
}

/**
 * Evaluate terminal settlement from the final outcome + current runtime.
 * Rewards come from the final authoritative state, never a stale preview snapshot.
 */
export function settleMajorIncidentTerminal(args: {
  readonly currentCase: CaseInstance
  readonly outcome: Pick<ResolutionOutcome, 'result' | 'reasons'>
  readonly week: number
  readonly existingReceipts?: MajorIncidentSettlementReceiptMap | null
}): MajorIncidentTerminalSettlementResult {
  const runtime = args.currentCase.majorIncident
  if (!runtime) {
    return {
      kind: 'rejected',
      reasonCode: 'missing_runtime',
      message: 'major incident runtime is required for terminal settlement',
    }
  }

  if (!isTerminalOutcome(args.outcome.result)) {
    return {
      kind: 'rejected',
      reasonCode: 'invalid_outcome',
      message: 'outcome must be success, partial, or fail',
    }
  }

  const caseId = args.currentCase.id
  const incidentId =
    typeof runtime.incidentId === 'string' && runtime.incidentId.trim().length > 0
      ? runtime.incidentId.trim()
      : caseId
  const receiptId = buildMajorIncidentSettlementReceiptId(caseId, incidentId)
  const existing = args.existingReceipts?.[receiptId]

  if (existing) {
    if (
      existing.caseId !== caseId ||
      existing.incidentId !== incidentId ||
      existing.finalOutcome !== args.outcome.result
    ) {
      return {
        kind: 'rejected',
        reasonCode: 'receipt_conflict',
        message: 'existing settlement receipt conflicts with this terminalization',
      }
    }
    return { kind: 'idempotent_replay', receipt: existing }
  }

  const rewardEligibility = cloneRewardEligibility(
    getAppliedMajorIncidentRewardPreview(runtime, args.outcome.result),
  )

  // Case stage is authoritative for normal launch paths; runtime.stage is optional.
  const stage =
    typeof args.currentCase.stage === 'number' && Number.isFinite(args.currentCase.stage)
      ? Math.max(0, Math.trunc(args.currentCase.stage))
      : typeof runtime.stage === 'number' && Number.isFinite(runtime.stage)
        ? Math.max(0, Math.trunc(runtime.stage))
        : 0
  const unlockSignalId =
    args.outcome.result === 'success' && rewardEligibility.progressionUnlocks.length > 0
      ? `mi-unlock:${receiptId}`
      : undefined

  const receipt: MajorIncidentTerminalSettlementReceipt = Object.freeze({
    schemaVersion: MAJOR_INCIDENT_TERMINAL_SETTLEMENT_SCHEMA,
    receiptId,
    caseId,
    incidentId,
    finalOutcome: args.outcome.result,
    terminalObjectiveState: Object.freeze({
      stage,
      durationWeeks: Math.max(0, Math.trunc(runtime.durationWeeks)),
      requiredTeams: Math.max(0, Math.trunc(runtime.requiredTeams)),
    }),
    settlementReason:
      args.outcome.reasons[0] ??
      `Major incident ${incidentId} terminalized as ${args.outcome.result}`,
    settledAtWeek: Math.trunc(args.week),
    rewardEligibility: Object.freeze(rewardEligibility),
    consequenceRefs: Object.freeze({
      ...(unlockSignalId ? { unlockSignalId } : {}),
    }),
    reportableOutcome: Object.freeze({
      outcome: args.outcome.result,
      summary: `${runtime.name ?? 'Major incident'} settled as ${args.outcome.result}`,
    }),
  })

  return { kind: 'settled', receipt }
}

/** Append a receipt into an immutable map (exactly-once by receiptId). */
export function rememberMajorIncidentSettlementReceipt(
  existing: MajorIncidentSettlementReceiptMap | null | undefined,
  receipt: MajorIncidentTerminalSettlementReceipt,
): MajorIncidentSettlementReceiptMap {
  if (existing?.[receipt.receiptId]) {
    return existing
  }
  return Object.freeze({
    ...(existing ?? {}),
    [receipt.receiptId]: receipt,
  })
}

/** Stamp receipt onto runtime without regenerating rewards from a stale preview. */
export function attachMajorIncidentSettlementReceipt(
  runtime: ActiveMajorIncidentRuntime,
  receipt: MajorIncidentTerminalSettlementReceipt,
): ActiveMajorIncidentRuntime {
  return {
    ...runtime,
    settlementReceiptId: receipt.receiptId,
    settlementReceipt: receipt,
  }
}

export function isValidMajorIncidentSettlementReceipt(
  value: unknown,
): value is MajorIncidentTerminalSettlementReceipt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const raw = value as Record<string, unknown>
  return (
    raw.schemaVersion === MAJOR_INCIDENT_TERMINAL_SETTLEMENT_SCHEMA &&
    typeof raw.receiptId === 'string' &&
    raw.receiptId.trim().length > 0 &&
    typeof raw.caseId === 'string' &&
    raw.caseId.trim().length > 0 &&
    typeof raw.incidentId === 'string' &&
    raw.incidentId.trim().length > 0 &&
    isTerminalOutcome(raw.finalOutcome) &&
    typeof raw.settledAtWeek === 'number' &&
    Number.isFinite(raw.settledAtWeek)
  )
}
