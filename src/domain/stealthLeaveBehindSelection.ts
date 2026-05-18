/**
 * SPE-2247 slice 5: player selection of stealth leave-behind tradeoffs on eligible cases.
 */

import type { CaseInstance, GameState } from './models'
import {
  DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY,
  getStealthLeaveBehindById,
  isStealthLeaveBehindMissionEligible,
  type StealthLeaveBehindDefinition,
  type StealthLeaveBehindRegistry,
} from './stealthLeaveBehindRegistry'

export type StealthLeaveBehindSelectionFailureReason =
  | 'invalid_case'
  | 'ineligible'
  | 'unknown_id'

export interface ApplyStealthLeaveBehindSelectionInput {
  readonly caseId: string
  readonly leaveBehindId: string
}

export interface ApplyStealthLeaveBehindSelectionResult {
  readonly state: GameState
  readonly applied: boolean
  readonly reason?: StealthLeaveBehindSelectionFailureReason
  readonly leaveBehindId?: string
}

function sanitizeCaseId(caseId: string) {
  return caseId.trim()
}

/** Case is open for weekly play and eligible for leave-behind mission pressure. */
export function canSelectStealthLeaveBehindOnCase(caseData: CaseInstance) {
  return caseData.status === 'in_progress' && isStealthLeaveBehindMissionEligible(caseData)
}

export function listSelectableStealthLeaveBehinds(
  caseData: CaseInstance,
  registry: StealthLeaveBehindRegistry = DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY
): readonly StealthLeaveBehindDefinition[] {
  if (!canSelectStealthLeaveBehindOnCase(caseData)) {
    return []
  }

  return registry.entries
}

export function readStealthLeaveBehindSelection(
  state: GameState,
  caseId: string
): string | undefined {
  const normalizedCaseId = sanitizeCaseId(caseId)
  if (normalizedCaseId.length === 0) {
    return undefined
  }

  const leaveBehindId = state.cases[normalizedCaseId]?.stealthLeaveBehindId?.trim()
  return leaveBehindId && leaveBehindId.length > 0 ? leaveBehindId : undefined
}

export function applyStealthLeaveBehindSelection(
  state: GameState,
  input: ApplyStealthLeaveBehindSelectionInput,
  registry: StealthLeaveBehindRegistry = DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY
): ApplyStealthLeaveBehindSelectionResult {
  const normalizedCaseId = sanitizeCaseId(input.caseId)
  const currentCase = normalizedCaseId.length > 0 ? state.cases[normalizedCaseId] : undefined

  if (!currentCase) {
    return {
      state,
      applied: false,
      reason: 'invalid_case',
    }
  }

  if (!canSelectStealthLeaveBehindOnCase(currentCase)) {
    return {
      state,
      applied: false,
      reason: 'ineligible',
    }
  }

  const definition = getStealthLeaveBehindById(registry, input.leaveBehindId)
  if (!definition) {
    return {
      state,
      applied: false,
      reason: 'unknown_id',
    }
  }

  return {
    state: {
      ...state,
      cases: {
        ...state.cases,
        [normalizedCaseId]: {
          ...currentCase,
          stealthLeaveBehindId: definition.id,
        },
      },
    },
    applied: true,
    leaveBehindId: definition.id,
  }
}
