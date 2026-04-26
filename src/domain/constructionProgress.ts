// SPE-110: Construction progress and interference state — bounded domain helper.
// Reads CaseInstance site-generation outputs and progressClock state to expose compact
// construction modifiers consumed by readiness, battle, and the weekly simulation tick.
import { advanceDefinedProgressClock, doesProgressClockMeetThreshold, readProgressClock } from './progressClocks'
import type { GameState, CaseInstance } from './models'

// Maximum segments on a construction progress clock (4 = complete).
export const CONSTRUCTION_PROGRESS_MAX = 4

// Spatial flag written onto CaseInstance.spatialFlags while construction is incomplete.
export const CONSTRUCTION_INCOMPLETE_FLAG = 'construction.incomplete'

// Readiness score penalty applied when construction is incomplete.
export const CONSTRUCTION_READINESS_PENALTY = 8

/**
 * Returns the deterministic progress clock ID for a given case's construction state.
 * IDs are per-case and follow the pattern `construction.site.<caseId>.progress`.
 */
export function getConstructionProgressClockId(caseId: string): string {
  return `construction.site.${caseId}.progress`
}

/**
 * Returns true if the case has site-generation outputs (spatialFlags populated via SPE-395)
 * and is still within its active timeline (deadline has not expired).
 */
export function isCaseUnderConstruction(currentCase: CaseInstance): boolean {
  return (
    currentCase.status !== 'resolved' &&
    (currentCase.spatialFlags?.length ?? 0) > 0 &&
    currentCase.deadlineRemaining > 0
  )
}

/**
 * Deterministic logistics bonus: +1 if total inventory stock >= 3 items.
 * Does not consume stock — read-only.
 */
export function evaluateConstructionLogisticsBonus(state: GameState): number {
  const totalStock = Object.values(state.inventory).reduce((sum, qty) => sum + qty, 0)
  return totalStock >= 3 ? 1 : 0
}

/**
 * Advances the construction progress clock for a single case, respecting the completion cap.
 * Returns the updated GameState. Does not mutate the input state.
 */
export function advanceCaseConstructionClock(
  state: GameState,
  currentCase: CaseInstance,
  delta: number
): GameState {
  if (delta === 0) return state
  const clockId = getConstructionProgressClockId(currentCase.id)
  return advanceDefinedProgressClock(state, clockId, delta, {
    label: `Construction: ${currentCase.title}`,
    max: CONSTRUCTION_PROGRESS_MAX,
  })
}

/**
 * Returns true if the construction clock for a case has reached completion threshold.
 */
export function isConstructionComplete(state: GameState, caseId: string): boolean {
  return doesProgressClockMeetThreshold(
    state,
    getConstructionProgressClockId(caseId),
    CONSTRUCTION_PROGRESS_MAX
  )
}

/**
 * Deployment readiness burden for incomplete construction.
 * Returns CONSTRUCTION_READINESS_PENALTY if:
 * - The case exists and has site-generation data (spatialFlags)
 * - The construction.incomplete flag is set on the case (meaning the weekly tick has run once)
 * Returns 0 if construction is not tracked or already complete.
 */
export function evaluateConstructionReadinessBurden(state: GameState, caseId: string): number {
  const currentCase = state.cases[caseId]
  if (!currentCase) return 0
  if (!currentCase.spatialFlags?.includes(CONSTRUCTION_INCOMPLETE_FLAG)) return 0
  // Double-check clock state to confirm construction is genuinely incomplete.
  const clock = readProgressClock(state, getConstructionProgressClockId(caseId))
  if (clock !== null && clock.completed) return 0
  return CONSTRUCTION_READINESS_PENALTY
}
