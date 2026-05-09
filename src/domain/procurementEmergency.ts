// SPE-1524: Crisis gray-market waiver (sanctioned posture) + audit event + legitimacy fallout trace.
import { appendOperationEventDrafts } from './events'
import type { GameState } from './models'
import { buildMajorIncidentState } from './strategicState'
import { normalizeGameState } from './teamSimulation'

function isSanctionedPosture(game: Pick<GameState, 'legitimacy'>): boolean {
  return (game.legitimacy?.sanctionLevel ?? 'tolerated') === 'sanctioned'
}

/** True when crisis pressure qualifies and posture is sanctioned; waiver not yet granted this week. */
export function canInvokeEmergencyGrayMarketWaiver(game: GameState): boolean {
  if (buildMajorIncidentState(game).severity !== 'crisis') {
    return false
  }
  if (!isSanctionedPosture(game)) {
    return false
  }
  if (game.emergencyGrayMarketWaiverWeek === game.week) {
    return false
  }
  return true
}

/**
 * Grants a single-week emergency waiver unlocking gray-market broker listings for sanctioned posture.
 * Appends an audit event and marks legitimacy fallout. No-op when `canInvokeEmergencyGrayMarketWaiver` is false.
 */
export function invokeEmergencyGrayMarketWaiver(game: GameState): GameState {
  if (!canInvokeEmergencyGrayMarketWaiver(game)) {
    return game
  }

  const incidentState = buildMajorIncidentState(game)

  return normalizeGameState(
    appendOperationEventDrafts(
      {
        ...game,
        emergencyGrayMarketWaiverWeek: game.week,
        legitimacy: {
          ...game.legitimacy,
          sanctionLevel: 'sanctioned',
          falloutRisk: 'risk',
        },
      },
      [
        {
          type: 'market.emergency_gray_market_waiver_granted',
          sourceSystem: 'production',
          payload: {
            week: game.week,
            marketWeek: game.market.week,
            crisisPressureScore: incidentState.pressureScore,
            sanctionLevel: 'sanctioned',
            packetId: 'gray_market_broker',
            falloutRiskApplied: 'risk',
          },
        },
      ]
    )
  )
}
