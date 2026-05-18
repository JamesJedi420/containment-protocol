/**
 * SPE-521 deferred UX: player override for weekly infiltration probe action on case prep.
 */

import type { CaseInstance, GameState } from './models'
import {
  isInfiltrationProbeAction,
  isInfiltrationProbeEligible,
  type InfiltrationProbeAction,
} from './infiltrationProbe'

export type InfiltrationWeeklyProbeActionOverrideFailureReason =
  | 'invalid_case'
  | 'ineligible'
  | 'invalid_action'

export interface ApplyInfiltrationWeeklyProbeActionOverrideInput {
  readonly caseId: string
  /** `null` clears the override and restores authored plan resolution. */
  readonly action: InfiltrationProbeAction | null
}

export interface ApplyInfiltrationWeeklyProbeActionOverrideResult {
  readonly state: GameState
  readonly applied: boolean
  readonly reason?: InfiltrationWeeklyProbeActionOverrideFailureReason
  readonly action?: InfiltrationProbeAction
}

function sanitizeCaseId(caseId: string) {
  return caseId.trim()
}

export function canConfigureInfiltrationWeeklyProbeOnCase(caseData: CaseInstance) {
  return caseData.status === 'in_progress' && isInfiltrationProbeEligible(caseData)
}

export function readInfiltrationWeeklyProbeActionOverride(
  caseData: CaseInstance | undefined
): InfiltrationProbeAction | undefined {
  const action = caseData?.infiltrationWeeklyProbeActionOverride
  return action !== undefined && isInfiltrationProbeAction(action) ? action : undefined
}

export function applyInfiltrationWeeklyProbeActionOverride(
  state: GameState,
  input: ApplyInfiltrationWeeklyProbeActionOverrideInput
): ApplyInfiltrationWeeklyProbeActionOverrideResult {
  const normalizedCaseId = sanitizeCaseId(input.caseId)
  const currentCase = normalizedCaseId.length > 0 ? state.cases[normalizedCaseId] : undefined

  if (!currentCase) {
    return { state, applied: false, reason: 'invalid_case' }
  }

  if (!canConfigureInfiltrationWeeklyProbeOnCase(currentCase)) {
    return { state, applied: false, reason: 'ineligible' }
  }

  if (input.action !== null && !isInfiltrationProbeAction(input.action)) {
    return { state, applied: false, reason: 'invalid_action' }
  }

  const prior = readInfiltrationWeeklyProbeActionOverride(currentCase)

  if (input.action === null) {
    if (prior === undefined) {
      return { state, applied: false }
    }

    const rest = { ...currentCase }
    delete rest.infiltrationWeeklyProbeActionOverride

    return {
      state: {
        ...state,
        cases: {
          ...state.cases,
          [normalizedCaseId]: rest,
        },
      },
      applied: true,
    }
  }

  if (prior === input.action) {
    return { state, applied: false, action: input.action }
  }

  return {
    state: {
      ...state,
      cases: {
        ...state.cases,
        [normalizedCaseId]: {
          ...currentCase,
          infiltrationWeeklyProbeActionOverride: input.action,
        },
      },
    },
    applied: true,
    action: input.action,
  }
}
