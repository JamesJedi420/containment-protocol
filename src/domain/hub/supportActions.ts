// SPE-38: Hub action to restore support pool
import type { GameState } from '../models'

/**
 * Deterministic hub action: "Rally Support Staff" restores supportAvailable by a fixed amount.
 * Returns updated GameState and a note for reporting.
 */
export function applyRallySupportStaffAction(state: GameState, amount: number = 2) {
  if (!state.agency) return { nextState: state, note: null }
  const prev = state.agency.supportAvailable ?? 0
  const next = prev + amount
  const nextState: GameState = {
    ...state,
    agency: {
      ...state.agency,
      supportAvailable: next,
    },
    supportAvailable: next, // legacy compatibility
  }
  const note = {
    id: `note-support-restored-${state.week}`,
    content: `Support staff rallied: +${amount} support restored (now ${next}).`,
    timestamp: Date.now(),
    type: 'support.restored',
    metadata: { prev, next, amount, week: state.week },
  }
  return { nextState, note }
}
