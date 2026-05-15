import type { GameState } from '../../domain/models'
import { OFF_BOOKS_COURIER_PAID_PREREQ_TAG } from '../../domain/sim/downtimeSideWork'
import { normalizeGameState } from '../../domain/teamSimulation'

/** Test fixture: first agent gets paid-courier prerequisite; mirrors capability-gap hub scenarios. */
export function withPaidCourierAndFunding(base: GameState, funding: number): GameState {
  const agentId = Object.keys(base.agents)[0]!
  return normalizeGameState({
    ...base,
    funding,
    agency: {
      ...base.agency!,
      funding,
    },
    agents: {
      ...base.agents,
      [agentId]: {
        ...base.agents[agentId]!,
        tags: [...base.agents[agentId]!.tags, OFF_BOOKS_COURIER_PAID_PREREQ_TAG],
      },
    },
  })
}
