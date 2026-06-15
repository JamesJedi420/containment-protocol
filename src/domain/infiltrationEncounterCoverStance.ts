/**
 * SPE-521 follow-up: player cover stance write path for infiltration encounter-state prep.
 */

import { isInfiltrationProbeEligible } from './infiltrationProbe'
import type { CaseInstance, GameState } from './models'

function canConfigureInfiltrationEncounterCoverStance(caseData: CaseInstance) {
  return (
    caseData.status === 'in_progress' &&
    isInfiltrationProbeEligible(caseData) &&
    caseData.infiltrationCoverProfile !== undefined
  )
}

export type InfiltrationEncounterCoverStance = 'maintain' | 'reinforce' | 'low_profile'

const INFILTRATION_ENCOUNTER_COVER_STANCES: readonly InfiltrationEncounterCoverStance[] = [
  'maintain',
  'reinforce',
  'low_profile',
]

export function isInfiltrationEncounterCoverStance(
  value: string
): value is InfiltrationEncounterCoverStance {
  return (INFILTRATION_ENCOUNTER_COVER_STANCES as readonly string[]).includes(value)
}

export type InfiltrationEncounterCoverStanceFailureReason =
  | 'invalid_case'
  | 'ineligible'
  | 'invalid_stance'

export interface ApplyInfiltrationEncounterCoverStanceInput {
  readonly caseId: string
  /** `null` clears the stance and restores maintain posture. */
  readonly stance: InfiltrationEncounterCoverStance | null
}

export interface ApplyInfiltrationEncounterCoverStanceResult {
  readonly state: GameState
  readonly applied: boolean
  readonly reason?: InfiltrationEncounterCoverStanceFailureReason
  readonly stance?: InfiltrationEncounterCoverStance
}

function sanitizeCaseId(caseId: string) {
  return caseId.trim()
}

export function readInfiltrationEncounterCoverStance(
  caseData: CaseInstance | undefined
): InfiltrationEncounterCoverStance {
  const stance = caseData?.infiltrationEncounterCoverStance
  return stance !== undefined && isInfiltrationEncounterCoverStance(stance) ? stance : 'maintain'
}

export function applyInfiltrationEncounterCoverStance(
  state: GameState,
  input: ApplyInfiltrationEncounterCoverStanceInput
): ApplyInfiltrationEncounterCoverStanceResult {
  const normalizedCaseId = sanitizeCaseId(input.caseId)
  const currentCase = normalizedCaseId.length > 0 ? state.cases[normalizedCaseId] : undefined

  if (!currentCase) {
    return { state, applied: false, reason: 'invalid_case' }
  }

  if (!canConfigureInfiltrationEncounterCoverStance(currentCase)) {
    return { state, applied: false, reason: 'ineligible' }
  }

  if (input.stance !== null && !isInfiltrationEncounterCoverStance(input.stance)) {
    return { state, applied: false, reason: 'invalid_stance' }
  }

  const prior = readInfiltrationEncounterCoverStance(currentCase)

  if (input.stance === null || input.stance === 'maintain') {
    if (prior === 'maintain' && currentCase.infiltrationEncounterCoverStance === undefined) {
      return { state, applied: false, stance: 'maintain' }
    }

    const rest = { ...currentCase }
    delete rest.infiltrationEncounterCoverStance

    return {
      state: {
        ...state,
        cases: {
          ...state.cases,
          [normalizedCaseId]: rest,
        },
      },
      applied: true,
      stance: 'maintain',
    }
  }

  if (prior === input.stance && currentCase.infiltrationEncounterCoverStance === input.stance) {
    return { state, applied: false, stance: input.stance }
  }

  return {
    state: {
      ...state,
      cases: {
        ...state.cases,
        [normalizedCaseId]: {
          ...currentCase,
          infiltrationEncounterCoverStance: input.stance,
        },
      },
    },
    applied: true,
    stance: input.stance,
  }
}
