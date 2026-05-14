import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { buildCourierNetworkCapacityGapReport } from '../domain/capabilityGap'
import { COURIER_NETWORK_CAPACITY_GAP_CALIBRATION } from '../domain/sim/calibration'
import {
  OFF_BOOKS_COURIER_LOCKOUT_TAG,
  OFF_BOOKS_COURIER_PAID_PREREQ_TAG,
} from '../domain/sim/downtimeSideWork'
import { openCourierShellFront } from '../domain/sim/frontBusiness'
import { normalizeGameState } from '../domain/teamSimulation'
import type { CourierShellFrontState, GameState } from '../domain/models'

function withPaidCourierAndFunding(base: GameState, funding: number): GameState {
  const agentId = Object.keys(base.agents)[0]!
  const agent = base.agents[agentId]!
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
        ...agent,
        tags: [...agent.tags, OFF_BOOKS_COURIER_PAID_PREREQ_TAG],
      },
    },
  })
}

describe('SPE-823a courier network capacity gap report', () => {
  it('computes deterministic inventory (same state → same report)', () => {
    const game = withPaidCourierAndFunding(createStartingState(), 9000)
    const a = buildCourierNetworkCapacityGapReport(game)
    const b = buildCourierNetworkCapacityGapReport(game)
    expect(a).toEqual(b)
    expect(a.family).toBe('courierNetworkCapacity')
    expect(a.scenarioId).toBe(COURIER_NETWORK_CAPACITY_GAP_CALIBRATION.scenarioId)
  })

  it('detects below-required gap when informal courier path only scores under threshold', () => {
    const game = withPaidCourierAndFunding(createStartingState(), 9000)
    expect(game.agency?.courierShellFront).toBeUndefined()
    const report = buildCourierNetworkCapacityGapReport(game)
    expect(report.current).toBeLessThan(report.required)
    expect(report.gapKind).toBe('below_required')
    expect(report.unresolved).toBe(true)
  })

  it('detects below-desired-only structural gap when immediate need is met', () => {
    const opened = openCourierShellFront(withPaidCourierAndFunding(createStartingState(), 12000))
    expect(opened.agency?.courierShellFront?.status).toBe('active')
    const agentId = Object.keys(opened.agents)[0]!
    const strainedWithLockout: GameState = normalizeGameState({
      ...opened,
      agency: {
        ...opened.agency!,
        courierShellFront: {
          ...(opened.agency!.courierShellFront as CourierShellFrontState),
          status: 'strained',
        },
      },
      agents: {
        ...opened.agents,
        [agentId]: {
          ...opened.agents[agentId]!,
          tags: [...opened.agents[agentId]!.tags, OFF_BOOKS_COURIER_LOCKOUT_TAG],
        },
      },
    })
    const report = buildCourierNetworkCapacityGapReport(strainedWithLockout)
    expect(report.current).toBeGreaterThanOrEqual(report.required)
    expect(report.current).toBeLessThan(report.desiredFuture)
    expect(report.gapKind).toBe('below_desired_only')
    expect(report.unresolved).toBe(true)
  })

  it('reports no gap when active shell clears structural target', () => {
    const opened = openCourierShellFront(withPaidCourierAndFunding(createStartingState(), 12000))
    const report = buildCourierNetworkCapacityGapReport(opened)
    expect(report.gapKind).toBe('none')
    expect(report.unresolved).toBe(false)
    expect(report.mitigationHooks).toEqual([])
    expect(report.current).toBeGreaterThanOrEqual(report.desiredFuture)
  })

  it('emits at least two mitigation hooks when a gap exists, with delayed payoff on investment hook', () => {
    const game = withPaidCourierAndFunding(createStartingState(), 9000)
    const report = buildCourierNetworkCapacityGapReport(game)
    expect(report.mitigationHooks.length).toBeGreaterThanOrEqual(2)
    const investment = report.mitigationHooks.find((h) => h.kind === 'front_business_investment')
    expect(investment).toBeDefined()
    expect(investment?.delayedPayoffWeeks).toBe(
      COURIER_NETWORK_CAPACITY_GAP_CALIBRATION.frontBusinessHookDelayedPayoffWeeks
    )
    expect(investment?.immediateCapacityDelta).toBe(0)
    expect(investment?.payoffTiming).toBe('delayed_weeks')
  })

  it('keeps unresolved true when mitigation hooks exist (hooks do not resolve)', () => {
    const game = withPaidCourierAndFunding(createStartingState(), 9000)
    const report = buildCourierNetworkCapacityGapReport(game)
    expect(report.mitigationHooks.length).toBeGreaterThan(0)
    expect(report.unresolved).toBe(true)
  })

  it('does not mutate input game state', () => {
    const game = createStartingState()
    const frozen = structuredClone(game)
    buildCourierNetworkCapacityGapReport(game)
    expect(game).toEqual(frozen)
  })
})
