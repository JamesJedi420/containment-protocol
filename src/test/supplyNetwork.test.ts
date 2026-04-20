import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { assignTeam } from '../domain/sim/assign'
import {
  advanceSupplyNetworkState,
  createStartingSupplyNetworkState,
  getCaseSupplyTrace,
} from '../domain/supplyNetwork'

function createSupplyCase(regionTag: string) {
  return {
    ...createStartingState().cases['case-001'],
    regionTag,
    assignedTeamIds: ['t_nightwatch'],
  }
}

function createIsolatedSupplyGame(options?: {
  weeksRemaining?: number
  blockCorridor?: boolean
  disruptTransport?: boolean
}) {
  const game = createStartingState()

  game.reports = []
  game.events = []
  game.agency = {
    ...game.agency,
    supportAvailable: 5,
    containmentRating: 90,
    clearanceLevel: 2,
    funding: 200,
  }
  game.containmentRating = 90
  game.clearanceLevel = 2
  game.funding = 200

  for (const [caseId, currentCase] of Object.entries(game.cases)) {
    game.cases[caseId] =
      caseId === 'case-001'
        ? {
            ...currentCase,
            status: 'open',
            mode: 'threshold',
            regionTag: 'occult_district',
            assignedTeamIds: [],
            tags: ['occult', 'anomaly', 'containment'],
            requiredTags: [],
            preferredTags: [],
            difficulty: {
              combat: 1,
              investigation: 0,
              utility: 0,
              social: 0,
            },
            weights: {
              combat: 1,
              investigation: 0,
              utility: 0,
              social: 0,
            },
          }
        : {
            ...currentCase,
            status: 'resolved',
            assignedTeamIds: [],
            weeksRemaining: 0,
          }
  }

  game.supplyNetwork = createStartingSupplyNetworkState()

  if (options?.blockCorridor) {
    game.supplyNetwork.links = game.supplyNetwork.links.map((link) =>
      link.id === 'link-depot-corridor' ? { ...link, status: 'blocked' } : link
    )
  }

  if (options?.disruptTransport) {
    game.supplyNetwork.transportAssets = game.supplyNetwork.transportAssets.map((asset) => ({
      ...asset,
      status: 'disrupted',
    }))
  }

  const assigned = assignTeam(game, 'case-001', 't_nightwatch')

  assigned.cases['case-001'] = {
    ...assigned.cases['case-001'],
    status: 'in_progress',
    durationWeeks: Math.max(options?.weeksRemaining ?? 2, 2),
    weeksRemaining: options?.weeksRemaining ?? 2,
  }

  return assigned
}

describe('supplyNetwork', () => {
  it('traces connected support from an active source through an open route', () => {
    const currentCase = createSupplyCase('occult_district')
    const next = advanceSupplyNetworkState(createStartingSupplyNetworkState(), [currentCase])
    const trace = getCaseSupplyTrace(next, currentCase)

    expect(trace).toMatchObject({
      regionTag: 'occult_district',
      state: 'supported',
      sourceId: 'source-command',
      targetNodeId: 'node-corridor',
      transportAssetId: 'transport-main-column',
      pathNodeIds: ['node-command', 'node-depot', 'node-corridor'],
      pathLinkIds: ['link-command-depot', 'link-depot-corridor'],
      deliveredLift: 1,
    })
  })

  it('marks blocked support paths with a deterministic explanation', () => {
    const state = createStartingSupplyNetworkState()
    state.links = state.links.map((link) =>
      link.id === 'link-depot-corridor' ? { ...link, status: 'blocked' } : link
    )

    const currentCase = createSupplyCase('occult_district')
    const next = advanceSupplyNetworkState(state, [currentCase])
    const trace = getCaseSupplyTrace(next, currentCase)

    expect(trace).toMatchObject({
      regionTag: 'occult_district',
      state: 'unsupported',
      blockedReason: 'path_blocked',
    })
    expect(trace?.explanation).toMatch(/no open route reached occult transit corridor/i)
  })

  it('treats disrupted transport as a distinct vulnerable logistics failure', () => {
    const state = createStartingSupplyNetworkState()
    state.transportAssets = state.transportAssets.map((asset) => ({
      ...asset,
      status: 'disrupted',
    }))

    const currentCase = createSupplyCase('occult_district')
    const next = advanceSupplyNetworkState(state, [currentCase])
    const trace = getCaseSupplyTrace(next, currentCase)

    expect(trace).toMatchObject({
      regionTag: 'occult_district',
      state: 'unsupported',
      blockedReason: 'transport_disrupted',
    })
  })

  it('stalls multi-week operations when traced supply is unavailable and reports the blockage', () => {
    const next = advanceWeek(createIsolatedSupplyGame({ weeksRemaining: 2, blockCorridor: true }))
    const currentCase = next.cases['case-001']
    const latestReport = next.reports.at(-1)
    const supplyEvent = next.events.find((event) => event.type === 'system.supply_network_updated')

    expect(currentCase.status).toBe('in_progress')
    expect(currentCase.weeksRemaining).toBe(2)
    expect(currentCase.supportShortfall).toBe(true)
    expect(latestReport?.supplyNetwork?.unsupportedRegionCount).toBe(1)
    expect(latestReport?.supplyNetwork?.blockedRegions).toContain('occult_district')
    expect(latestReport?.notes.some((note) => note.type === 'system.supply_network_updated')).toBe(
      true
    )
    expect(supplyEvent).toMatchObject({
      type: 'system.supply_network_updated',
      payload: expect.objectContaining({
        unsupportedRegionCount: 1,
        blockedRegions: ['occult_district'],
      }),
    })
  })

  it('degrades final-week resolution when traced supply is unavailable', () => {
    const supported = advanceWeek(createIsolatedSupplyGame({ weeksRemaining: 1 }))
    const blocked = advanceWeek(
      createIsolatedSupplyGame({ weeksRemaining: 1, blockCorridor: true })
    )

    expect(supported.reports.at(-1)?.resolvedCases).toEqual(['case-001'])
    expect(supported.reports.at(-1)?.partialCases).toEqual([])
    expect(blocked.reports.at(-1)?.resolvedCases).toEqual([])
    expect(blocked.reports.at(-1)?.partialCases).toEqual(['case-001'])
  })
})
