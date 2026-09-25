import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  advanceHistoricalRouteReplay,
  advanceHistoricalRouteReplayRegistryAtWeekClose,
  createHistoricalRouteReplay,
  resolveHistoricalRouteReplayTerminal,
  type HistoricalRouteReplayRecord,
} from '../domain/historicalRouteReplay'
import {
  createHistoricalRouteMemoryGraph,
  reactivateHistoricalRouteEdges,
  rememberHistoricalRouteActivation,
  type HistoricalRouteMemoryGraph,
} from '../domain/historicalRouteMemory'
import { advanceWeek } from '../domain/sim/advanceWeek'

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

function buildEndedReplay(eventId: string): HistoricalRouteReplayRecord {
  const approaching = createReplay(eventId)
  const middle = advanceHistoricalRouteReplay(approaching)
  const terminal = advanceHistoricalRouteReplay(middle)
  return resolveHistoricalRouteReplayTerminal(terminal, {
    consequenceId: `consequence:${eventId}`,
    kind: 'injury',
    subjectId: 'observer:traveler',
  })
}

function withoutHistoricalRouteReplays<T extends Record<string, unknown>>(state: T) {
  const { historicalRouteReplays: _replays, ...unrelated } = state
  void _replays
  return unrelated
}

describe('historical-route replay week-close (SPE-3018)', () => {
  it('advances multiple replays once in deterministic eventId order without inventing edges', () => {
    const bravo = createReplay('event:bravo')
    const alpha = createReplay('event:alpha')
    const frozenAlphaRoute = [...alpha.routeAnchorIds]
    const frozenAlphaEdges = [...alpha.routeEdgeIds]
    const frozenBravoRoute = [...bravo.routeAnchorIds]
    const frozenBravoEdges = [...bravo.routeEdgeIds]

    const result = advanceHistoricalRouteReplayRegistryAtWeekClose({
      'event:bravo': bravo,
      'event:alpha': alpha,
    })

    expect(Object.keys(result)).toEqual(['event:alpha', 'event:bravo'])
    expect(result['event:alpha']).toEqual(advanceHistoricalRouteReplay(alpha))
    expect(result['event:bravo']).toEqual(advanceHistoricalRouteReplay(bravo))
    expect(result['event:alpha']?.routeAnchorIds).toEqual(frozenAlphaRoute)
    expect(result['event:alpha']?.routeEdgeIds).toEqual(frozenAlphaEdges)
    expect(result['event:bravo']?.routeAnchorIds).toEqual(frozenBravoRoute)
    expect(result['event:bravo']?.routeEdgeIds).toEqual(frozenBravoEdges)
    expect(Object.isFrozen(result['event:alpha']?.routeAnchorIds)).toBe(true)
    expect(Object.isFrozen(result['event:alpha']?.routeEdgeIds)).toBe(true)

    const reordered = advanceHistoricalRouteReplayRegistryAtWeekClose({
      'event:alpha': alpha,
      'event:bravo': bravo,
    })
    expect(JSON.stringify(reordered)).toBe(JSON.stringify(result))
  })

  it('leaves terminal and ended records idempotent across repeated week-close calls', () => {
    const approaching = createReplay('event:active')
    const middle = advanceHistoricalRouteReplay(approaching)
    const terminal = advanceHistoricalRouteReplay(middle)
    const ended = buildEndedReplay('event:ended')

    const first = advanceHistoricalRouteReplayRegistryAtWeekClose({
      'event:ended': ended,
      'event:active': terminal,
    })
    expect(first['event:active']).toEqual(terminal)
    expect(first['event:ended']).toEqual(ended)
    expect(first['event:active']?.phase).toBe('terminal')
    expect(first['event:ended']?.phase).toBe('ended')

    const second = advanceHistoricalRouteReplayRegistryAtWeekClose(first)
    expect(second).toEqual(first)
    expect(second['event:active']?.currentRouteIndex).toBe(terminal.currentRouteIndex)
    expect(second['event:ended']?.ordinaryConsequence).toEqual(ended.ordinaryConsequence)
  })

  it('hydrates empty/omitted registries to empty after week-close and drops malformed siblings', () => {
    expect(advanceHistoricalRouteReplayRegistryAtWeekClose(undefined)).toEqual({})
    expect(advanceHistoricalRouteReplayRegistryAtWeekClose(null)).toEqual({})
    expect(advanceHistoricalRouteReplayRegistryAtWeekClose({})).toEqual({})

    const alpha = createReplay('event:alpha')
    const mixed = advanceHistoricalRouteReplayRegistryAtWeekClose({
      'event:alpha': alpha,
      malformed: { eventId: '' },
      'wrong-key': alpha,
    })
    expect(Object.keys(mixed)).toEqual(['event:alpha'])
    expect(mixed['event:alpha']).toEqual(advanceHistoricalRouteReplay(alpha))
  })

  it('wires advanceWeek once to match direct SPE-3009 advance without changing unrelated state', () => {
    const baseline = createStartingState()
    const alpha = createReplay('event:alpha')
    const bravo = createReplay('event:bravo')
    const directAlpha = advanceHistoricalRouteReplay(alpha)
    const directBravo = advanceHistoricalRouteReplay(bravo)

    const withReplays = {
      ...structuredClone(baseline),
      historicalRouteReplays: {
        'event:bravo': bravo,
        'event:alpha': alpha,
      },
    }

    const baselineNext = advanceWeek(structuredClone(baseline), 1_700_000_000_000)
    const replayNext = advanceWeek(withReplays, 1_700_000_000_000)

    expect(replayNext.week).toBe(baseline.week + 1)
    expect(Object.keys(replayNext.historicalRouteReplays ?? {})).toEqual([
      'event:alpha',
      'event:bravo',
    ])
    expect(replayNext.historicalRouteReplays?.['event:alpha']).toEqual(directAlpha)
    expect(replayNext.historicalRouteReplays?.['event:bravo']).toEqual(directBravo)
    expect(withReplays.historicalRouteReplays['event:alpha']).toEqual(alpha)
    expect(withReplays.historicalRouteReplays['event:bravo']).toEqual(bravo)
    expect(withoutHistoricalRouteReplays(replayNext)).toEqual(
      withoutHistoricalRouteReplays(baselineNext)
    )
  })

  it('keeps empty replay registries empty through advanceWeek isolation', () => {
    const baseline = createStartingState()
    const withEmpty = {
      ...structuredClone(baseline),
      historicalRouteReplays: {},
    }

    const baselineNext = advanceWeek(structuredClone(baseline), 1_700_000_000_000)
    const emptyNext = advanceWeek(withEmpty, 1_700_000_000_000)

    expect(emptyNext.historicalRouteReplays).toEqual({})
    expect(withoutHistoricalRouteReplays(emptyNext)).toEqual(
      withoutHistoricalRouteReplays(baselineNext)
    )
  })
})
