import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  activateHistoricalRouteReplayRegistryForCalendarWeek,
  type HistoricalRouteReplayActivationCandidate,
} from '../domain/historicalRouteReplayActivation'
import {
  createHistoricalRouteMemoryGraph,
  normalizeHistoricalRouteMemoryGraph,
  normalizeHistoricalRouteMemoryGraphRegistry,
  normalizeHistoricalRouteMemoryGraphsFromGameState,
  reactivateHistoricalRouteEdges,
  rememberHistoricalRouteActivation,
  type HistoricalRouteMemoryGraph,
} from '../domain/historicalRouteMemory'
import { normalizeGameState } from '../domain/teamSimulation'

function phantomCoachGraph(): HistoricalRouteMemoryGraph {
  const empty = createHistoricalRouteMemoryGraph('site:old-coach-road')
  if (!empty) throw new Error('fixture graph was not created')

  const remembered = rememberHistoricalRouteActivation(empty, {
    activationId: 'activation:historical-crash',
    anchors: [
      { id: 'anchor:moor-road', kind: 'activation_point' },
      { id: 'anchor:coach-road', kind: 'landmark' },
      { id: 'anchor:broken-parapet', kind: 'historical_exit' },
    ],
    edges: [
      {
        id: 'edge:moor-coach-road',
        routeKind: 'recurring_site',
        fromAnchorId: 'anchor:moor-road',
        toAnchorId: 'anchor:coach-road',
      },
      {
        id: 'edge:coach-road-parapet',
        routeKind: 'historical_exit',
        fromAnchorId: 'anchor:coach-road',
        toAnchorId: 'anchor:broken-parapet',
      },
    ],
  })

  return reactivateHistoricalRouteEdges(remembered, 'activation:current-night', [
    'edge:moor-coach-road',
    'edge:coach-road-parapet',
  ])
}

function secondSiteGraph(): HistoricalRouteMemoryGraph {
  const empty = createHistoricalRouteMemoryGraph('site:canal-viaduct')
  if (!empty) throw new Error('second fixture graph was not created')

  const remembered = rememberHistoricalRouteActivation(empty, {
    activationId: 'activation:canal-flood',
    anchors: [
      { id: 'anchor:towpath', kind: 'activation_point' },
      { id: 'anchor:viaduct-arch', kind: 'historical_exit' },
    ],
    edges: [
      {
        id: 'edge:towpath-viaduct',
        routeKind: 'contamination_route',
        fromAnchorId: 'anchor:towpath',
        toAnchorId: 'anchor:viaduct-arch',
      },
    ],
  })

  return reactivateHistoricalRouteEdges(remembered, 'activation:canal-night', [
    'edge:towpath-viaduct',
  ])
}

function coachCandidate(
  eventId: string,
  absoluteWeek: number
): HistoricalRouteReplayActivationCandidate {
  return {
    eventId,
    activationId: 'activation:current-night',
    originAnchorId: 'anchor:moor-road',
    terminalAnchorId: 'anchor:broken-parapet',
    startCondition: { kind: 'absolute_week', absoluteWeek },
  }
}

describe('historical-route memory graph multi-site persistence (SPE-3027)', () => {
  it('normalizes a multi-site registry in deterministic siteId order', () => {
    const coach = phantomCoachGraph()
    const canal = secondSiteGraph()
    const registry = normalizeHistoricalRouteMemoryGraphRegistry({
      'site:old-coach-road': coach,
      'site:canal-viaduct': canal,
    })

    expect(Object.keys(registry)).toEqual(['site:canal-viaduct', 'site:old-coach-road'])
    expect(registry['site:old-coach-road']).toEqual(normalizeHistoricalRouteMemoryGraph(coach))
    expect(registry['site:canal-viaduct']).toEqual(normalizeHistoricalRouteMemoryGraph(canal))
    expect(Object.isFrozen(registry)).toBe(true)
  })

  it('drops malformed, key-mismatched, and integer-index siblings fail-closed', () => {
    const coach = phantomCoachGraph()
    const registry = normalizeHistoricalRouteMemoryGraphRegistry({
      '0': coach,
      'site:wrong-key': coach,
      'site:old-coach-road': {
        ...coach,
        activeEdgeIds: ['edge:missing'],
      },
      'site:canal-viaduct': secondSiteGraph(),
      notAGraph: 'nope',
    })

    expect(Object.keys(registry)).toEqual(['site:canal-viaduct'])
    expect(normalizeHistoricalRouteMemoryGraphRegistry(undefined)).toEqual({})
    expect(normalizeHistoricalRouteMemoryGraphRegistry(null)).toEqual({})
  })

  it('migrates SPE-3024 single historicalRouteMemoryGraph into the registry', () => {
    const coach = phantomCoachGraph()
    const migrated = normalizeHistoricalRouteMemoryGraphsFromGameState({
      historicalRouteMemoryGraph: coach,
    })

    expect(Object.keys(migrated)).toEqual(['site:old-coach-road'])
    expect(migrated['site:old-coach-road']).toEqual(normalizeHistoricalRouteMemoryGraph(coach))
  })

  it('lets an existing registry sibling win over a colliding legacy single graph', () => {
    const coach = phantomCoachGraph()
    const canal = secondSiteGraph()
    const registryWins = normalizeHistoricalRouteMemoryGraphsFromGameState({
      historicalRouteMemoryGraphs: {
        'site:old-coach-road': coach,
        'site:canal-viaduct': canal,
      },
      historicalRouteMemoryGraph: {
        ...coach,
        activeActivationId: null,
        activeEdgeIds: [],
      },
    })

    expect(registryWins['site:old-coach-road']?.activeEdgeIds).toEqual([
      'edge:coach-road-parapet',
      'edge:moor-coach-road',
    ])
    expect(Object.keys(registryWins)).toEqual(['site:canal-viaduct', 'site:old-coach-road'])
  })

  it('round-trips multi-site graphs through hydrateGame and drops the legacy single field', () => {
    const coach = phantomCoachGraph()
    const canal = secondSiteGraph()
    const state = {
      ...createStartingState(),
      historicalRouteMemoryGraphs: {
        'site:old-coach-road': coach,
        'site:canal-viaduct': canal,
      },
      historicalRouteMemoryGraph: coach,
    }

    const hydrated = hydrateGame(structuredClone(state), createStartingState())
    expect(Object.keys(hydrated.historicalRouteMemoryGraphs ?? {})).toEqual([
      'site:canal-viaduct',
      'site:old-coach-road',
    ])
    expect(hydrated.historicalRouteMemoryGraph).toBeUndefined()
    expect(hydrated.historicalRouteMemoryGraphs?.['site:old-coach-road']).toEqual(
      normalizeHistoricalRouteMemoryGraph(coach)
    )

    const again = hydrateGame(structuredClone(hydrated), createStartingState())
    expect(again.historicalRouteMemoryGraphs).toEqual(hydrated.historicalRouteMemoryGraphs)
  })

  it('migrates legacy-only single-graph saves through hydrateGame', () => {
    const coach = phantomCoachGraph()
    const hydrated = hydrateGame(
      {
        ...createStartingState(),
        historicalRouteMemoryGraph: coach,
      },
      createStartingState()
    )

    expect(hydrated.historicalRouteMemoryGraphs?.['site:old-coach-road']).toEqual(
      normalizeHistoricalRouteMemoryGraph(coach)
    )
    expect(hydrated.historicalRouteMemoryGraph).toBeUndefined()
  })

  it('normalizeGameState canonicalizes into the registry and strips the legacy field', () => {
    const coach = phantomCoachGraph()
    const normalized = normalizeGameState({
      ...createStartingState(),
      historicalRouteMemoryGraph: coach,
    })

    expect(normalized.historicalRouteMemoryGraphs?.['site:old-coach-road']).toEqual(
      normalizeHistoricalRouteMemoryGraph(coach)
    )
    expect(normalized.historicalRouteMemoryGraph).toBeUndefined()
  })

  it('activates from the multi-site registry without a legacy single graph', () => {
    const result = activateHistoricalRouteReplayRegistryForCalendarWeek(
      {},
      {
        'site:canal-viaduct': secondSiteGraph(),
        'site:old-coach-road': phantomCoachGraph(),
      },
      [coachCandidate('event:phantom-coach', 3)],
      3
    )

    expect(Object.keys(result)).toEqual(['event:phantom-coach'])
    expect(result['event:phantom-coach']?.phase).toBe('approaching')
  })

  it('wires advanceWeek to persist the registry and activate from it', () => {
    const baseline = createStartingState()
    const campaignWeek = baseline.week
    const withRegistry = {
      ...structuredClone(baseline),
      historicalRouteMemoryGraphs: {
        'site:old-coach-road': phantomCoachGraph(),
      },
      historicalRouteReplayActivationCandidates: [
        coachCandidate('event:new-coach', campaignWeek),
      ],
    }

    const next = advanceWeek(withRegistry, 1_700_000_000_000)
    expect(next.historicalRouteMemoryGraphs?.['site:old-coach-road']?.siteId).toBe(
      'site:old-coach-road'
    )
    expect(next.historicalRouteMemoryGraph).toBeUndefined()
    expect(next.historicalRouteReplays?.['event:new-coach']?.phase).toBe('approaching')
  })

  it('migrates a legacy single graph through advanceWeek into the registry', () => {
    const baseline = createStartingState()
    const withLegacy = {
      ...structuredClone(baseline),
      historicalRouteMemoryGraph: phantomCoachGraph(),
      historicalRouteReplayActivationCandidates: [
        coachCandidate('event:legacy-coach', baseline.week),
      ],
    }

    const next = advanceWeek(withLegacy, 1_700_000_000_000)
    expect(next.historicalRouteMemoryGraphs?.['site:old-coach-road']?.siteId).toBe(
      'site:old-coach-road'
    )
    expect(next.historicalRouteMemoryGraph).toBeUndefined()
    expect(next.historicalRouteReplays?.['event:legacy-coach']?.phase).toBe('approaching')
  })
})
