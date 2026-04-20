import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  advanceTerritorialPowerState,
  getTerritorialConduitDraw,
  getTerritorialNodeYield,
  isTerritorialCastingEligible,
} from '../domain/territorialPower'

function createTerritorialPowerState() {
  return {
    nodes: [
      {
        id: 'node-ash',
        yield: 6,
        suppressed: false,
        controller: 'Containment Protocol',
      },
      {
        id: 'node-brine',
        yield: 4,
        suppressed: true,
        controller: 'Containment Protocol',
      },
    ],
    conduits: [
      {
        from: 'node-ash',
        to: 'ward-east',
        status: 'open' as const,
        capacity: 4,
      },
      {
        from: 'node-ash',
        to: 'ward-west',
        status: 'blocked' as const,
        capacity: 3,
      },
    ],
    castingEligibility: [
      {
        scopeId: 'node-ash',
        scopeType: 'node' as const,
        eligible: true,
      },
      {
        scopeId: 'delta-region',
        scopeType: 'region' as const,
        eligible: false,
      },
    ],
  }
}

describe('territorialPower', () => {
  it('returns node yield for normal terrain and zero for suppressed terrain', () => {
    const state = createTerritorialPowerState()

    expect(getTerritorialNodeYield(state.nodes[0])).toBe(6)
    expect(getTerritorialNodeYield(state.nodes[1])).toBe(0)
  })

  it('draws through open conduits and ignores blocked conduits', () => {
    const state = createTerritorialPowerState()

    expect(getTerritorialConduitDraw(state, 'node-ash')).toBe(4)
    expect(getTerritorialConduitDraw(state, 'node-brine')).toBe(0)
  })

  it('tracks casting eligibility through the canonical scope table', () => {
    const state = createTerritorialPowerState()

    expect(isTerritorialCastingEligible(state, 'node-ash')).toBe(true)
    expect(isTerritorialCastingEligible(state, 'delta-region', 'region')).toBe(false)
    expect(isTerritorialCastingEligible(state, 'node-brine')).toBe(false)
  })

  it('records a deterministic spent expenditure outcome when yield and conduit capacity are available', () => {
    const next = advanceTerritorialPowerState(createTerritorialPowerState())

    expect(next?.lastExpenditure).toMatchObject({
      scopeId: 'node-ash',
      result: 'spent',
      amount: 4,
      availableYield: 6,
      conduitCapacity: 4,
    })
  })

  it('records a blocked expenditure outcome when conduits are closed', () => {
    const state = createTerritorialPowerState()
    state.conduits = state.conduits.map((conduit) => ({
      ...conduit,
      status: 'blocked' as const,
    }))

    const next = advanceTerritorialPowerState(state)

    expect(next?.lastExpenditure).toMatchObject({
      scopeId: 'node-ash',
      result: 'blocked',
      amount: 0,
      conduitCapacity: 0,
    })
  })

  it('records a suppressed expenditure outcome for dead or corrupted terrain', () => {
    const state = createTerritorialPowerState()
    state.castingEligibility = [
      {
        scopeId: 'node-brine',
        scopeType: 'node',
        eligible: true,
      },
    ]

    const next = advanceTerritorialPowerState(state)

    expect(next?.lastExpenditure).toMatchObject({
      scopeId: 'node-brine',
      result: 'suppressed',
      amount: 0,
      availableYield: 0,
    })
  })

  it('records an ineligible expenditure outcome when no casting scope is armed', () => {
    const state = createTerritorialPowerState()
    state.castingEligibility = state.castingEligibility.map((entry) => ({
      ...entry,
      eligible: false,
    }))

    const next = advanceTerritorialPowerState(state)

    expect(next?.lastExpenditure).toMatchObject({
      scopeId: 'none',
      result: 'ineligible',
      amount: 0,
    })
  })

  it('projects territorial power into the weekly report and deterministic note output', () => {
    const game = createStartingState()
    game.territorialPower = createTerritorialPowerState()

    const next = advanceWeek(game, 2042000)
    const latestReport = next.reports.at(-1)

    expect(next.territorialPower?.lastExpenditure).toMatchObject({
      scopeId: 'node-ash',
      result: 'spent',
      amount: 4,
    })
    expect(latestReport?.territorialPower).toMatchObject({
      nodeCount: 2,
      availableYield: 6,
      eligibleScopeCount: 1,
    })
    expect(latestReport?.notes.some((note) => note.type === 'system.territorial_power')).toBe(true)
  })
})
