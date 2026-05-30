import type { GameState } from '../models'

let pendingInvariantViolations: string[] = []

/** Throw alignment violations in Vitest; record and continue in production sim ticks. */
export function shouldStrictWeeklyReportInvariants() {
  return import.meta.env.MODE === 'test'
}

export function clearPendingWeeklyReportInvariantViolations() {
  pendingInvariantViolations = []
}

export function takePendingWeeklyReportInvariantViolations() {
  const violations = [...pendingInvariantViolations]
  pendingInvariantViolations = []
  return violations
}

export function enforceWeeklyReportInvariant(condition: boolean, message: string) {
  if (condition) {
    return
  }

  if (shouldStrictWeeklyReportInvariants()) {
    throw new Error(message)
  }

  pendingInvariantViolations.push(message)
}

export function appendWeeklyReportIntegrityIssue(state: GameState, message: string): GameState {
  const existing = state.weeklyReportIntegrityIssues ?? []

  return {
    ...state,
    weeklyReportIntegrityIssues: [...existing, message],
  }
}

export function clearWeeklyReportIntegrityIssues(state: GameState): GameState {
  if (!state.weeklyReportIntegrityIssues?.length) {
    return state
  }

  const { weeklyReportIntegrityIssues, ...rest } = state
  void weeklyReportIntegrityIssues

  return rest
}
