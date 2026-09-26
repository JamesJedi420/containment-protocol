import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  advanceHistoricalRouteReplay,
  applyHistoricalRouteReplayRegistryAtWeekClose,
  createHistoricalRouteReplay,
  normalizeHistoricalRouteReplayRegistry,
  resolveHistoricalRouteReplayTerminal,
  type HistoricalRouteReplayRecord,
} from '../domain/historicalRouteReplay'
import {
  activateHistoricalRouteReplayRegistryForCalendarWeek,
  normalizeHistoricalRouteReplayActivationCandidates,
  type HistoricalRouteReplayActivationCandidate,
} from '../domain/historicalRouteReplayActivation'
import {
  createHistoricalRouteMemoryGraph,
  normalizeHistoricalRouteMemoryGraph,
  reactivateHistoricalRouteEdges,
  rememberHistoricalRouteActivation,
  type HistoricalRouteMemoryGraph,
} from '../domain/historicalRouteMemory'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { hydrateGame } from '../app/store/runTransfer'

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

function phantomCoachCandidate(
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

function createReplay(eventId: string): HistoricalRouteReplayRecord {
  const replay = createHistoricalRouteReplay(phantomCoachGraph(), {
    eventId,
    activationId: 'activation:current-night',
    originAnchorId: 'anchor:moor-road',
    terminalAnchorId: 'anchor:broken-parapet',
  })
  if (!replay) throw new Error(`fixture replay ${eventId} was not created`)
  return replay
}

function withoutHistoricalRouteActivationFields<T extends Record<string, unknown>>(state: T) {
  const {
    historicalRouteReplays: _replays,
    historicalRouteReplayActivationCandidates: _candidates,
    historicalRouteMemoryGraph: _graph,
    historicalRouteMemoryGraphs: _graphs,
    ...unrelated
  } = state
  void _replays
  void _candidates
  void _graph
  void _graphs
  return unrelated
}

describe('historical-route replay calendar activation (SPE-3024)', () => {
  it('activates an approaching record when calendar start condition matches an active SPE-1392 path', () => {
    const graph = phantomCoachGraph()
    const result = activateHistoricalRouteReplayRegistryForCalendarWeek(
      {},
      graph,
      [phantomCoachCandidate('event:phantom-coach', 3)],
      3
    )

    expect(Object.keys(result)).toEqual(['event:phantom-coach'])
    expect(result['event:phantom-coach']?.phase).toBe('approaching')
    expect(result['event:phantom-coach']?.routeEdgeIds).toEqual([
      'edge:moor-coach-road',
      'edge:coach-road-parapet',
    ])
    expect(Object.isFrozen(result['event:phantom-coach']?.routeAnchorIds)).toBe(true)
  })

  it('fail-closes when the SPE-1392 path is inactive or missing', () => {
    const empty = createHistoricalRouteMemoryGraph('site:old-coach-road')
    if (!empty) throw new Error('empty graph missing')

    const rememberedOnly = rememberHistoricalRouteActivation(empty, {
      activationId: 'activation:historical-crash',
      anchors: [
        { id: 'anchor:moor-road', kind: 'activation_point' },
        { id: 'anchor:broken-parapet', kind: 'historical_exit' },
      ],
      edges: [
        {
          id: 'edge:moor-parapet',
          routeKind: 'historical_exit',
          fromAnchorId: 'anchor:moor-road',
          toAnchorId: 'anchor:broken-parapet',
        },
      ],
    })

    expect(
      activateHistoricalRouteReplayRegistryForCalendarWeek(
        {},
        rememberedOnly,
        [phantomCoachCandidate('event:phantom-coach', 3)],
        3
      )
    ).toEqual({})

    expect(
      activateHistoricalRouteReplayRegistryForCalendarWeek(
        {},
        undefined,
        [phantomCoachCandidate('event:phantom-coach', 3)],
        3
      )
    ).toEqual({})
  })

  it('is idempotent when re-activating an existing eventId', () => {
    const existing = advanceHistoricalRouteReplay(createReplay('event:phantom-coach'))
    const result = activateHistoricalRouteReplayRegistryForCalendarWeek(
      { 'event:phantom-coach': existing },
      phantomCoachGraph(),
      [phantomCoachCandidate('event:phantom-coach', 4)],
      4
    )

    expect(result['event:phantom-coach']).toEqual(existing)
    expect(result['event:phantom-coach']?.phase).toBe('traversing')
  })

  it('skips candidates whose absolute week does not match', () => {
    const result = activateHistoricalRouteReplayRegistryForCalendarWeek(
      {},
      phantomCoachGraph(),
      [phantomCoachCandidate('event:phantom-coach', 9)],
      3
    )
    expect(result).toEqual({})
  })

  it('activates matching candidates in deterministic eventId order via SPE-3017 normalize', () => {
    const result = activateHistoricalRouteReplayRegistryForCalendarWeek(
      {},
      phantomCoachGraph(),
      [
        phantomCoachCandidate('event:bravo', 2),
        phantomCoachCandidate('event:alpha', 2),
        phantomCoachCandidate('event:later', 9),
      ],
      2
    )

    expect(Object.keys(result)).toEqual(['event:alpha', 'event:bravo'])
    expect(result['event:alpha']?.phase).toBe('approaching')
    expect(result['event:bravo']?.phase).toBe('approaching')
  })

  it('sanitizes activation candidates fail-closed', () => {
    expect(
      normalizeHistoricalRouteReplayActivationCandidates([
        phantomCoachCandidate('event:ok', 1),
        { eventId: '1', activationId: 'a', originAnchorId: 'o', terminalAnchorId: 't' },
        {
          eventId: 'event:bad-kind',
          activationId: 'activation:current-night',
          originAnchorId: 'anchor:moor-road',
          terminalAnchorId: 'anchor:broken-parapet',
          startCondition: { kind: 'interaction', absoluteWeek: 1 },
        },
        phantomCoachCandidate('event:ok', 99),
      ])
    ).toEqual([phantomCoachCandidate('event:ok', 1)])
  })

  it('sanitizes activation graph fail-closed without inventing edges', () => {
    const valid = normalizeHistoricalRouteMemoryGraph(phantomCoachGraph())
    expect(valid?.siteId).toBe('site:old-coach-road')
    expect(valid?.activeEdgeIds).toEqual(['edge:coach-road-parapet', 'edge:moor-coach-road'])

    expect(
      normalizeHistoricalRouteMemoryGraph({
        ...phantomCoachGraph(),
        activeEdgeIds: ['edge:missing'],
      })
    ).toBeUndefined()
    expect(normalizeHistoricalRouteMemoryGraph(undefined)).toBeUndefined()
  })

  it('wires advanceWeek to activate after advance/resolve without changing unrelated state', () => {
    const baseline = createStartingState()
    const campaignWeek = baseline.week
    const approachingExisting = createReplay('event:already')
    const graph = phantomCoachGraph()
    const candidates = [
      phantomCoachCandidate('event:new-coach', campaignWeek),
      phantomCoachCandidate('event:already', campaignWeek),
    ]

    const withActivation = {
      ...structuredClone(baseline),
      historicalRouteReplays: {
        'event:already': approachingExisting,
      },
      historicalRouteReplayActivationCandidates: candidates,
      historicalRouteMemoryGraphs: {
        [graph.siteId]: graph,
      },
    }

    const baselineNext = advanceWeek(structuredClone(baseline), 1_700_000_000_000)
    const activatedNext = advanceWeek(withActivation, 1_700_000_000_000)

    expect(activatedNext.week).toBe(baseline.week + 1)
    expect(Object.keys(activatedNext.historicalRouteReplays ?? {})).toEqual([
      'event:already',
      'event:new-coach',
    ])
    // Existing approaching advanced once (SPE-3018) in the same close.
    expect(activatedNext.historicalRouteReplays?.['event:already']?.phase).toBe('traversing')
    // Newly activated stays approaching until the next week-close advance.
    expect(activatedNext.historicalRouteReplays?.['event:new-coach']?.phase).toBe('approaching')
    expect(activatedNext.historicalRouteReplays?.['event:new-coach']?.ordinaryConsequence).toBeNull()
    expect(activatedNext.historicalRouteMemoryGraphs?.[graph.siteId]?.siteId).toBe(graph.siteId)
    expect(activatedNext.historicalRouteMemoryGraph).toBeUndefined()

    expect(withoutHistoricalRouteActivationFields(activatedNext)).toEqual(
      withoutHistoricalRouteActivationFields(baselineNext)
    )
  })

  it('keeps week-close advance/resolve behavior and empty activation isolation', () => {
    const baseline = createStartingState()
    const penultimate = advanceHistoricalRouteReplay(createReplay('event:alpha'))
    const ended = resolveHistoricalRouteReplayTerminal(
      advanceHistoricalRouteReplay(advanceHistoricalRouteReplay(createReplay('event:ended'))),
      {
        consequenceId: 'consequence:ended',
        kind: 'injury',
      }
    )

    const withReplays = {
      ...structuredClone(baseline),
      historicalRouteReplays: {
        'event:alpha': penultimate,
        'event:ended': ended,
      },
      historicalRouteReplayActivationCandidates: [],
    }

    const replayNext = advanceWeek(withReplays, 1_700_000_000_000)
    expect(replayNext.historicalRouteReplays?.['event:alpha']?.phase).toBe('ended')
    expect(replayNext.historicalRouteReplays?.['event:ended']).toEqual(ended)

    const withEmpty = {
      ...structuredClone(baseline),
      historicalRouteReplays: {},
      historicalRouteReplayActivationCandidates: [
        phantomCoachCandidate('event:no-graph', baseline.week),
      ],
    }
    const emptyNext = advanceWeek(withEmpty, 1_700_000_000_000)
    expect(emptyNext.historicalRouteReplays).toEqual({})

    const direct = applyHistoricalRouteReplayRegistryAtWeekClose({
      'event:alpha': penultimate,
    })
    expect(direct['event:alpha']?.phase).toBe('ended')
  })

  it('drops malformed activation graphs through advanceWeek instead of preserving them', () => {
    const baseline = createStartingState()
    const withMalformed = {
      ...structuredClone(baseline),
      historicalRouteMemoryGraph: {
        siteId: 'site:bad',
        anchors: [],
        edges: [],
        activeActivationId: 'activation:orphan',
        activeEdgeIds: ['edge:missing'],
      },
      historicalRouteMemoryGraphs: {
        'site:bad': {
          siteId: 'site:bad',
          anchors: [],
          edges: [],
          activeActivationId: 'activation:orphan',
          activeEdgeIds: ['edge:missing'],
        },
      },
    }

    const next = advanceWeek(withMalformed, 1_700_000_000_000)
    expect(next.historicalRouteMemoryGraph).toBeUndefined()
    expect(next.historicalRouteMemoryGraphs).toEqual({})
  })

  it('hydrates activation candidates and multi-site graphs fail-closed through save round-trip', () => {
    const graph = phantomCoachGraph()
    const state = {
      ...createStartingState(),
      historicalRouteReplayActivationCandidates: [
        phantomCoachCandidate('event:phantom-coach', 5),
        { eventId: '9', activationId: 'bad' },
      ],
      historicalRouteMemoryGraph: graph,
    }

    const hydrated = hydrateGame(structuredClone(state), createStartingState())
    expect(hydrated.historicalRouteReplayActivationCandidates).toEqual([
      phantomCoachCandidate('event:phantom-coach', 5),
    ])
    expect(hydrated.historicalRouteMemoryGraphs?.[graph.siteId]).toEqual(
      normalizeHistoricalRouteMemoryGraph(graph)
    )
    expect(hydrated.historicalRouteMemoryGraph).toBeUndefined()
    expect(normalizeHistoricalRouteReplayRegistry(hydrated.historicalRouteReplays)).toEqual({})
  })
})
