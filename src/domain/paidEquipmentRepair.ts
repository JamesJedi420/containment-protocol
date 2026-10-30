import type { GameState } from './models'
import {
  getStoredEquipmentInstanceConditionRepairReasonLabel,
  repairStoredEquipmentInstanceCondition,
  resolveStoredEquipmentInstanceConditionRepair,
  type EquipmentInstanceConditionRepairReasonCode,
  type EquipmentInstanceFailureCode,
} from './equipmentInstance'
import { applyFundingExpense, getCanonicalFundingState, recomputeBudgetPressure } from './funding'

/** Deliberately fixed until repair pricing is balanced; confirmation must carry this quote. */
export const EQUIPMENT_REPAIR_COST = 100

export type PaidRepairFailure =
  | EquipmentInstanceFailureCode
  | 'invalid_funding'
  | 'invalid_agency'
  | 'invalid_week'
  | 'insufficient_funding'
  | 'stale_quote'

export interface PaidRepairQuote {
  instanceId: string
  eligible: boolean
  quotedCost: number
  conditionLabel: string
  failure?: PaidRepairFailure
}

export type PaidRepairResult = PaidRepairQuote & {
  state: GameState
  payment: 'paid' | 'not_charged'
  charged: number
  resultingCondition: 'operational' | 'damaged' | undefined
}

export function quotePaidEquipmentRepair(
  state: GameState,
  instanceId: string,
  sparePartId?: unknown
): PaidRepairQuote {
  const preview = resolveStoredEquipmentInstanceConditionRepair(state, instanceId, sparePartId)
  let failure: PaidRepairFailure | undefined = preview.reasonCode
  if (!failure && (!Number.isSafeInteger(state.funding) || state.funding < 0)) {
    failure = 'invalid_funding'
  }
  if (!failure && (!Number.isSafeInteger(state.week) || state.week < 1)) failure = 'invalid_week'
  if (!failure && getCanonicalFundingState(state).funding < EQUIPMENT_REPAIR_COST)
    failure = 'insufficient_funding'
  return {
    instanceId,
    eligible: !failure && preview.canRepairCondition,
    quotedCost: EQUIPMENT_REPAIR_COST,
    conditionLabel: preview.conditionLabel,
    ...(failure ? { failure } : {}),
  }
}

export function getPaidRepairFailureLabel(code: PaidRepairFailure): string {
  if (code === 'invalid_funding') return 'Repair unavailable: funding is invalid.'
  if (code === 'invalid_agency') return 'Repair unavailable: agency state is invalid.'
  if (code === 'invalid_week') return 'Repair unavailable: campaign week is invalid.'
  if (code === 'insufficient_funding') return 'Insufficient funds for this repair.'
  if (code === 'stale_quote') return 'The repair quote changed. Review the current price.'
  const known: EquipmentInstanceConditionRepairReasonCode[] = [
    'invalid_instance_id',
    'stale_transition',
    'instance_not_stored',
    'condition_already_operational',
    'recovery_claimed',
    'missing_part',
    'unsuitable_part',
    'stock_unavailable',
    'invalid_containment_class',
    'malformed_containment_integrity',
  ]
  return known.includes(code as EquipmentInstanceConditionRepairReasonCode)
    ? getStoredEquipmentInstanceConditionRepairReasonLabel(
        code as EquipmentInstanceConditionRepairReasonCode
      )
    : 'Repair unavailable: equipment state changed.'
}

export function settlePaidEquipmentRepair(
  state: GameState,
  instanceId: string,
  sparePartId?: unknown,
  expectedCost = EQUIPMENT_REPAIR_COST
): PaidRepairResult {
  const quote = quotePaidEquipmentRepair(state, instanceId, sparePartId)
  const failureResult = (failure: PaidRepairFailure): PaidRepairResult => ({
    ...quote,
    eligible: false,
    failure,
    state,
    payment: 'not_charged',
    charged: 0,
    resultingCondition:
      state.equipmentInstances && Object.hasOwn(state.equipmentInstances, instanceId)
        ? state.equipmentInstances[instanceId]?.condition
        : undefined,
  })
  if (expectedCost !== quote.quotedCost) return failureResult('stale_quote')
  if (!quote.eligible) return failureResult(quote.failure ?? 'stale_transition')
  const repaired = repairStoredEquipmentInstanceCondition(state, instanceId, sparePartId)
  if (!repaired.ok) return failureResult(repaired.code)
  if (!repaired.state.agency) return failureResult('invalid_agency')
  const fundingState = recomputeBudgetPressure(
    applyFundingExpense(
      getCanonicalFundingState(state),
      quote.quotedCost,
      'equipment_repair',
      state.week,
      instanceId
    ),
    state.week
  )
  return {
    ...quote,
    state: {
      ...repaired.state,
      funding: fundingState.funding,
      agency: {
        ...repaired.state.agency,
        funding: fundingState.funding,
        fundingState,
      },
    },
    payment: 'paid',
    charged: quote.quotedCost,
    resultingCondition: repaired.instance.condition,
  }
}
