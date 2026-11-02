import type { GameState } from '../../domain/models'

/**
 * SPE-3117 — keep fixtures on the absent-field campaign roster path.
 *
 * Starter roster includes an investigator; with slots still absent that
 * materializes the one-slot archive_analyst list and stalls
 * containment_response. Remap investigators and clear analysis staff so
 * week-close resolves CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS instead.
 * Use only in tests that need operable containment_response and are not
 * asserting personnel materialization.
 */
export function withoutMappedArchiveAnalystPersonnel(state: GameState): GameState {
  if (state.agents) {
    state.agents = Object.fromEntries(
      Object.entries(state.agents).map(([id, agent]): [string, GameState['agents'][string]] => [
        id,
        {
          ...agent,
          role: agent.role === 'investigator' ? 'hunter' : agent.role,
        },
      ])
    )
  }
  state.staff = {}
  return state
}
