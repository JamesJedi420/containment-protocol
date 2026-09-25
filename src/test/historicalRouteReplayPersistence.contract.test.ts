import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { hydrateGame, stripGameTemplates } from '../app/store/runTransfer'
import {
  createGameSavePayload,
  GAME_SAVE_VERSION,
  loadGameSave,
  serializeGameSave,
} from '../app/store/saveSystem'
import { normalizeGameState } from '../domain/teamSimulation'
import {
  HISTORICAL_ROUTE_CAUSAL_CLASSIFICATION,
  advanceHistoricalRouteReplay,
  createHistoricalRouteReplay,
  interceptHistoricalRouteReplay,
  normalizeHistoricalRouteReplayRecord,
  normalizeHistoricalRouteReplayRegistry,
  revealHistoricalRoutePostContactObservation,
  resolveHistoricalRouteReplayTerminal,
  type HistoricalRouteReplayRecord,
} from '../domain/historicalRouteReplay'
import {
  createHistoricalRouteMemoryGraph,
  reactivateHistoricalRouteEdges,
  rememberHistoricalRouteActivation,
  type HistoricalRouteMemoryGraph,
} from '../domain/historicalRouteMemory'

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

function buildEndedReplay(): HistoricalRouteReplayRecord {
  const created = createHistoricalRouteReplay(phantomCoachGraph(), {
    eventId: 'event:phantom-coach',
    activationId: 'activation:current-night',
    originAnchorId: 'anchor:moor-road',
    terminalAnchorId: 'anchor:broken-parapet',
  })
  if (!created) throw new Error('fixture replay was not created')

  const contacted = interceptHistoricalRouteReplay(created, 'observer:traveler', 'anchor:moor-road')
  const altered = revealHistoricalRoutePostContactObservation(contacted, 'observer:traveler')
  const middle = advanceHistoricalRouteReplay(altered)
  const terminal = advanceHistoricalRouteReplay(middle)
  return resolveHistoricalRouteReplayTerminal(terminal, {
    consequenceId: 'consequence:broken-arm',
    kind: 'injury',
    subjectId: 'observer:traveler',
  })
}

describe('SPE-3017 historical route replay persistence', () => {
  it('round-trips a frozen replay registry through normalize, hydrate, and save', () => {
    const ended = buildEndedReplay()
    const approaching = createHistoricalRouteReplay(phantomCoachGraph(), {
      eventId: 'event:approaching-coach',
      activationId: 'activation:current-night',
      originAnchorId: 'anchor:moor-road',
      terminalAnchorId: 'anchor:broken-parapet',
    })
    if (!approaching) throw new Error('approaching fixture missing')

    const registry = normalizeHistoricalRouteReplayRegistry({
      'event:phantom-coach': ended,
      'event:approaching-coach': approaching,
    })
    expect(Object.keys(registry)).toEqual(['event:approaching-coach', 'event:phantom-coach'])
    expect(Object.isFrozen(registry)).toBe(true)
    expect(Object.isFrozen(registry['event:phantom-coach'])).toBe(true)
    expect(Object.isFrozen(registry['event:phantom-coach'].routeAnchorIds)).toBe(true)
    expect(registry['event:phantom-coach'].causalClassification).toBe(
      HISTORICAL_ROUTE_CAUSAL_CLASSIFICATION
    )

    const state = normalizeGameState({
      ...createStartingState(),
      historicalRouteReplays: {
        'event:phantom-coach': ended,
        'event:approaching-coach': approaching,
      },
    })
    expect(Object.keys(state.historicalRouteReplays ?? {})).toEqual([
      'event:approaching-coach',
      'event:phantom-coach',
    ])

    expect(createGameSavePayload(state).version).toBe(GAME_SAVE_VERSION)
    expect(GAME_SAVE_VERSION).toBe(1)

    const loaded = loadGameSave(serializeGameSave(state), createStartingState())
    expect(loaded.historicalRouteReplays).toEqual(state.historicalRouteReplays)
    expect(loaded.historicalRouteReplays?.['event:phantom-coach'].routeEdgeIds).toEqual([
      'edge:moor-coach-road',
      'edge:coach-road-parapet',
    ])
  })

  it('hydrates legacy omit to empty and drops malformed/orphan siblings fail-closed', () => {
    const fallback = createStartingState()
    const legacy = stripGameTemplates(fallback) as Record<string, unknown>
    delete legacy.historicalRouteReplays

    const hydratedLegacy = hydrateGame(legacy, fallback)
    expect(hydratedLegacy.historicalRouteReplays).toEqual({})

    const valid = buildEndedReplay()
    const incompleteEdges = {
      ...valid,
      eventId: 'event:incomplete-edges',
      routeEdgeIds: ['edge:moor-coach-road'],
    }
    const inventedAdjacencyShape = {
      ...valid,
      eventId: 'event:invented-adjacency',
      routeEdgeIds: [],
      facilityAdjacency: [{ from: 'a', to: 'b' }],
      route_link: [{ fromNodeId: 'a', toNodeId: 'b' }],
    }
    const wrongCausal = {
      ...valid,
      eventId: 'event:wrong-causal',
      causalClassification: 'confirmed_paranormal',
    }
    const keyMismatch = {
      ...valid,
      eventId: 'event:key-mismatch',
    }
    const integerIndexReplay = {
      ...valid,
      eventId: '2',
    }

    const hydratedMixed = hydrateGame(
      {
        ...legacy,
        historicalRouteReplays: {
          malformed: { eventId: '' },
          'event:incomplete-edges': incompleteEdges,
          'event:invented-adjacency': inventedAdjacencyShape,
          'event:wrong-causal': wrongCausal,
          'wrong-key': keyMismatch,
          '2': integerIndexReplay,
          'event:phantom-coach': valid,
        },
      },
      fallback
    )

    expect(Object.keys(hydratedMixed.historicalRouteReplays ?? {})).toEqual(['event:phantom-coach'])
    expect(hydratedMixed.historicalRouteReplays?.['event:phantom-coach']).toEqual(valid)
    expect(Object.isFrozen(hydratedMixed.historicalRouteReplays)).toBe(true)
  })

  it('preserves freeze semantics and never invents route edges on hydrate', () => {
    const valid = buildEndedReplay()
    const withoutEdges = {
      ...valid,
      eventId: 'event:missing-edges',
      routeEdgeIds: undefined,
    }

    expect(normalizeHistoricalRouteReplayRecord(withoutEdges)).toBeNull()
    expect(
      normalizeHistoricalRouteReplayRegistry({
        'event:missing-edges': withoutEdges,
        'event:phantom-coach': valid,
      })
    ).toEqual({ 'event:phantom-coach': valid })

    const mutated = structuredClone(valid) as HistoricalRouteReplayRecord & {
      routeEdgeIds: string[]
    }
    mutated.routeEdgeIds.push('edge:invented-facility-link')
    expect(normalizeHistoricalRouteReplayRecord(mutated)).toBeNull()

    const frozenAgain = normalizeHistoricalRouteReplayRecord(valid)
    expect(frozenAgain).toEqual(valid)
    expect(() => {
      ;(frozenAgain as { phase: string }).phase = 'approaching'
    }).toThrow()
  })
})
