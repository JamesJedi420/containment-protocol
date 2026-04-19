import type { GameState } from '../../domain/models'
import type { CaseListItemView } from '../cases/caseView'
import type { TeamListItemView } from '../teams/teamView'
import { getCaseListItemView, DEFAULT_CASE_LIST_FILTERS } from '../cases/caseView'
import { getTeamListItemView, DEFAULT_TEAM_LIST_FILTERS } from '../teams/teamView'

export { DEFAULT_CASE_LIST_FILTERS, DEFAULT_TEAM_LIST_FILTERS }

export function getDashboardCaseViews(game: GameState, limit = 5): CaseListItemView[] {
  // Rebuild filtered case views using only stable projection interface
  return Object.values(game.cases)
    .map((currentCase) => getCaseListItemView(currentCase, game))
    .filter((view) => view.currentCase.status !== 'resolved')
    .slice(0, limit)
}

export function getDashboardTeamViews(game: GameState, limit = 5): TeamListItemView[] {
  // Rebuild filtered team views using only stable projection interface
  return Object.values(game.teams)
    .map((team) => getTeamListItemView(team, game))
    .filter((view) => view.assignedCase || view.fatigueBand !== 'steady')
    .slice(0, limit)
}
