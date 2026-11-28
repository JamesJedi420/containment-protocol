/**
 * SPE-3514 slice 1: authoritative outcome-to-reward settlement contract.
 *
 * Pure registry for terminal settlement records. Validates terminality of source
 * outcome, resolves disposition from authored policy mapping, and enforces
 * stable settlement identity for exactly-once semantics.
 * Does not mutate reward domains or become a universal calculator.
 */

export const SETTLEMENT_DISPOSITIONS = [
  'full_reward',
  'partial_reward',
  'no_reward',
  'penalty',
  'mixed',
] as const
export type SettlementDisposition = (typeof SETTLEMENT_DISPOSITIONS)[number]

export interface OutcomeClassMapping {
  readonly outcomeClass: string
  readonly disposition: SettlementDisposition
}

export interface SettlementPolicy {
  readonly policyId: string
  readonly mappings: readonly OutcomeClassMapping[]
}

export interface SettlementReceipt {
  readonly settlementId: string
  readonly sourceOutcomeId: string
  readonly sourceOutcomeClass: string
  readonly policyId: string
  readonly disposition: SettlementDisposition
  readonly terminal: true
}

export interface SettlementValidationIssue {
  readonly code: string
  readonly field: string
  readonly settlementId?: string
}

export interface SettlementValidationResult {
  readonly valid: boolean
  readonly issues: readonly SettlementValidationIssue[]
}

const DISPOSITION_SET: ReadonlySet<string> = new Set(SETTLEMENT_DISPOSITIONS)
const SETTLEMENT_ID = /^settlement:[a-z0-9]+(?:-[a-z0-9]+)*$/
const OUTCOME_ID = /^outcome:[a-z0-9]+(?:-[a-z0-9]+)*$/
const POLICY_ID = /^policy:[a-z0-9]+(?:-[a-z0-9]+)*$/
const CLASS_TOKEN = /^[a-z][a-z0-9_]{0,63}$/

function token(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function freezeReceipt(input: SettlementReceipt): SettlementReceipt {
  return Object.freeze({ ...input })
}

function issuesResult(issues: SettlementValidationIssue[]): SettlementValidationResult {
  const ordered = issues
    .slice()
    .sort(
      (a, b) =>
        compareStrings(a.code, b.code) ||
        compareStrings(a.field, b.field) ||
        compareStrings(a.settlementId ?? '', b.settlementId ?? '')
    )
  return Object.freeze({
    valid: ordered.length === 0,
    issues: Object.freeze(ordered.map((issue) => Object.freeze({ ...issue }))),
  })
}

function validateReceipt(
  input: unknown,
  index: number,
  issues: SettlementValidationIssue[],
  seenIds: Set<string>
): SettlementReceipt | null {
  const field = `receipts[${index}]`
  if (!isPlainRecord(input)) {
    issues.push({ code: 'invalid_receipt', field })
    return null
  }

  const settlementId = token(input.settlementId)
  const sourceOutcomeId = token(input.sourceOutcomeId)
  const sourceOutcomeClass = token(input.sourceOutcomeClass)
  const policyId = token(input.policyId)
  const disposition = token(input.disposition)
  const terminal = input.terminal
  let legal = true

  if (!SETTLEMENT_ID.test(settlementId)) {
    issues.push({
      code: 'invalid_settlement_id',
      field: `${field}.settlementId`,
      ...(settlementId ? { settlementId } : {}),
    })
    legal = false
  } else if (seenIds.has(settlementId)) {
    issues.push({ code: 'duplicate_settlement_id', field: `${field}.settlementId`, settlementId })
  }
  seenIds.add(settlementId)

  if (!OUTCOME_ID.test(sourceOutcomeId)) {
    issues.push({
      code: 'invalid_source_outcome_id',
      field: `${field}.sourceOutcomeId`,
      ...(settlementId ? { settlementId } : {}),
    })
    legal = false
  }
  if (!CLASS_TOKEN.test(sourceOutcomeClass)) {
    issues.push({
      code: 'invalid_outcome_class',
      field: `${field}.sourceOutcomeClass`,
      ...(settlementId ? { settlementId } : {}),
    })
    legal = false
  }
  if (!POLICY_ID.test(policyId)) {
    issues.push({
      code: 'invalid_policy_id',
      field: `${field}.policyId`,
      ...(settlementId ? { settlementId } : {}),
    })
    legal = false
  }
  if (!DISPOSITION_SET.has(disposition)) {
    issues.push({
      code: 'unknown_disposition',
      field: `${field}.disposition`,
      ...(settlementId ? { settlementId } : {}),
    })
    legal = false
  }
  if (terminal !== true) {
    issues.push({
      code: 'nonterminal_settlement',
      field: `${field}.terminal`,
      ...(settlementId ? { settlementId } : {}),
    })
    legal = false
  }

  if (!legal) return null

  return freezeReceipt({
    settlementId,
    sourceOutcomeId,
    sourceOutcomeClass,
    policyId,
    disposition: disposition as SettlementDisposition,
    terminal: true,
  })
}

export function validateOutcomeToRewardSettlementReceipts(
  input: unknown
): SettlementValidationResult {
  if (!Array.isArray(input)) {
    return issuesResult([{ code: 'invalid_registry', field: 'receipts' }])
  }

  const issues: SettlementValidationIssue[] = []
  const seenIds = new Set<string>()

  for (let index = 0; index < input.length; index += 1) {
    validateReceipt(input[index], index, issues, seenIds)
  }

  return issuesResult(issues)
}

export function normalizeOutcomeToRewardSettlementReceipts(
  input: readonly SettlementReceipt[]
): readonly SettlementReceipt[] | null {
  const validation = validateOutcomeToRewardSettlementReceipts(input)
  if (!validation.valid) return null
  const ordered = input
    .map((r, i) => {
      const issues: SettlementValidationIssue[] = []
      return validateReceipt(r, i, issues, new Set())!
    })
    .sort((a, b) => compareStrings(a.settlementId, b.settlementId))
  return Object.freeze(ordered)
}

/** Resolve disposition from policy for a terminal outcome class. Returns null if no mapping. */
export function resolveSettlementDisposition(
  policy: SettlementPolicy,
  outcomeClass: string
): SettlementDisposition | null {
  const cls = token(outcomeClass)
  if (!CLASS_TOKEN.test(cls)) return null
  const mapping = policy.mappings.find((m) => m.outcomeClass === cls)
  return mapping ? mapping.disposition : null
}

/** Authored slice-1 fixtures. Not live campaign state. */
export const OUTCOME_TO_REWARD_SETTLEMENT_FIXTURES: readonly SettlementReceipt[] = Object.freeze([
  Object.freeze({
    settlementId: 'settlement:raid-success-01',
    sourceOutcomeId: 'outcome:raid-01',
    sourceOutcomeClass: 'full_success',
    policyId: 'policy:raid-rewards',
    disposition: 'full_reward',
    terminal: true,
  }),
  Object.freeze({
    settlementId: 'settlement:raid-partial-02',
    sourceOutcomeId: 'outcome:raid-02',
    sourceOutcomeClass: 'partial_success',
    policyId: 'policy:raid-rewards',
    disposition: 'partial_reward',
    terminal: true,
  }),
])
