// Dashboard hub projection: surfaces canonical hub opportunities and rumors for dashboard/operations panels
import { generateHubState } from '../../../domain/hub/hubState'
import type { GameState } from '../../../domain/models'

export function getDashboardHubProjection(game: GameState) {
  const hub = generateHubState(game)
  return {
    opportunities: hub.opportunities,
    rumors: hub.rumors,
    factionPresence: hub.factionPresence,
    districtKey: hub.districtKey,
  }
}
