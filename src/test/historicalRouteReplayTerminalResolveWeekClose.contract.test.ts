import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  advanceHistoricalRouteReplay,
  applyHistoricalRouteReplayRegistryAtWeekClose,
  createHistoricalRouteReplay,
  HISTORICAL_ROUTE_CAUSAL_CLASSIFICATION,
  HISTORICAL_ROUTE_WEEK_CLOSE_TERMINAL_CONSEQUENCE_KIND,
  interceptHistoricalRouteReplay,
  ownedHistoricalRouteReplayTerminalConsequence,
  resolveHistoricalRouteReplayRegistryTerminalsAtWeekClose,
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

function buildTerminal(eventId: string): HistoricalRouteReplayRecord {
  return advanceHistoricalRouteReplay(advanceHistoricalRouteReplay(createReplay(eventId)))
}

function buildEnded(eventId: string): HistoricalRouteReplayRecord {
  const terminal = buildTerminal(eventId)
  return resolveHistoricalRouteReplayTerminal(
    terminal,
    ownedHistoricalRouteReplayTerminalConsequence(terminal)
  )
}

function withoutHistoricalRouteReplays<T extends Record<string, unknown>>(state: T) {
  const { historicalRouteReplays: _replays, ...unrelated } = state
  void _replays
  return unrelated
}

describe('historical-route replay terminal resolve week-close (SPE-3020)', () => {
  it('owns a deterministic consequence-id policy from eventId and first exposed observer', () => {
    const terminal = buildTerminal('event:policy')
    expect(ownedHistoricalRouteReplayTerminalConsequence(terminal)).toEqual({
      consequenceId: 'historical-route-replay:event:policy:terminal-ordinary-consequence',
      kind: HISTORICAL_ROUTE_WEEK_CLOSE_TERMINAL_CONSEQUENCE_KIND,
    })

    const approaching = createReplay('event:observed')
    const contacted = interceptHistoricalRouteReplay(
      interceptHistoricalRouteReplay(approaching, 'observer:zeta', 'anchor:moor-road'),
      'observer:alpha',
      'anchor:moor-road'
    )
    const terminalObserved = advanceHistoricalRouteReplay(advanceHistoricalRouteReplay(contacted))
    expect(ownedHistoricalRouteReplayTerminalConsequence(terminalObserved)).toEqual({
      consequenceId: 'historical-route-replay:event:observed:terminal-ordinary-consequence',
      kind: HISTORICAL_ROUTE_WEEK_CLOSE_TERMINAL_CONSEQUENCE_KIND,
      subjectId: 'observer:alpha',
    })
  })

  it('resolves terminal → ended after advance in the same week-close apply', () => {
    const approaching = createReplay('event:lands')
    // One advance leaves traversing; two advances reach terminal. Week-close apply
    // advances once then resolves — start at the penultimate anchor so one advance lands terminal.
    const penultimate = advanceHistoricalRouteReplay(approaching)
    expect(penultimate.phase).toBe('traversing')

    const result = applyHistoricalRouteReplayRegistryAtWeekClose({
      'event:lands': penultimate,
    })

    const ended = result['event:lands']
    expect(ended?.phase).toBe('ended')
    expect(ended?.currentAnchorId).toBe('anchor:broken-parapet')
    expect(ended?.ordinaryConsequence).toEqual({
      consequenceId: 'historical-route-replay:event:lands:terminal-ordinary-consequence',
      kind: HISTORICAL_ROUTE_WEEK_CLOSE_TERMINAL_CONSEQUENCE_KIND,
      persistence: 'ordinary_world',
    })
    expect(ended?.causalClassification).toBe(HISTORICAL_ROUTE_CAUSAL_CLASSIFICATION)
  })

  it('resolves records already at terminal without requiring a further advance', () => {
    const terminal = buildTerminal('event:already-terminal')
    expect(terminal.phase).toBe('terminal')

    const result = applyHistoricalRouteReplayRegistryAtWeekClose({
      'event:already-terminal': terminal,
    })

    expect(result['event:already-terminal']?.phase).toBe('ended')
    expect(result['event:already-terminal']?.ordinaryConsequence).toEqual({
      consequenceId: 'historical-route-replay:event:already-terminal:terminal-ordinary-consequence',
      kind: HISTORICAL_ROUTE_WEEK_CLOSE_TERMINAL_CONSEQUENCE_KIND,
      persistence: 'ordinary_world',
    })
  })

  it('leaves already-ended records idempotent across repeated resolve and apply calls', () => {
    const ended = buildEnded('event:ended')
    const first = resolveHistoricalRouteReplayRegistryTerminalsAtWeekClose({
      'event:ended': ended,
    })
    expect(first['event:ended']).toEqual(ended)

    const second = applyHistoricalRouteReplayRegistryAtWeekClose(first)
    expect(second['event:ended']).toEqual(ended)
    expect(second['event:ended']?.ordinaryConsequence).toEqual(ended.ordinaryConsequence)
  })

  it('resolves multiple terminals in deterministic eventId order', () => {
    const bravo = buildTerminal('event:bravo')
    const alpha = buildTerminal('event:alpha')

    const result = applyHistoricalRouteReplayRegistryAtWeekClose({
      'event:bravo': bravo,
      'event:alpha': alpha,
    })

    expect(Object.keys(result)).toEqual(['event:alpha', 'event:bravo'])
    expect(result['event:alpha']?.phase).toBe('ended')
    expect(result['event:bravo']?.phase).toBe('ended')
    expect(result['event:alpha']?.ordinaryConsequence?.consequenceId).toBe(
      'historical-route-replay:event:alpha:terminal-ordinary-consequence'
    )
    expect(result['event:bravo']?.ordinaryConsequence?.consequenceId).toBe(
      'historical-route-replay:event:bravo:terminal-ordinary-consequence'
    )

    const reordered = applyHistoricalRouteReplayRegistryAtWeekClose({
      'event:alpha': alpha,
      'event:bravo': bravo,
    })
    expect(JSON.stringify(reordered)).toBe(JSON.stringify(result))
  })

  it('does not resolve approaching/traversing before they reach terminal', () => {
    const approaching = createReplay('event:early')
    const result = applyHistoricalRouteReplayRegistryAtWeekClose({
      'event:early': approaching,
    })
    expect(result['event:early']?.phase).toBe('traversing')
    expect(result['event:early']?.ordinaryConsequence).toBeNull()
  })

  it('wires advanceWeek to advance-then-resolve without changing unrelated state', () => {
    const baseline = createStartingState()
    const penultimate = advanceHistoricalRouteReplay(createReplay('event:alpha'))
    const terminal = buildTerminal('event:terminal')
    const ended = buildEnded('event:ended')

    const withReplays = {
      ...structuredClone(baseline),
      historicalRouteReplays: {
        'event:ended': ended,
        'event:terminal': terminal,
        'event:alpha': penultimate,
      },
    }

    const baselineNext = advanceWeek(structuredClone(baseline), 1_700_000_000_000)
    const replayNext = advanceWeek(withReplays, 1_700_000_000_000)

    expect(replayNext.week).toBe(baseline.week + 1)
    expect(Object.keys(replayNext.historicalRouteReplays ?? {})).toEqual([
      'event:alpha',
      'event:ended',
      'event:terminal',
    ])
    expect(replayNext.historicalRouteReplays?.['event:alpha']?.phase).toBe('ended')
    expect(replayNext.historicalRouteReplays?.['event:terminal']?.phase).toBe('ended')
    expect(replayNext.historicalRouteReplays?.['event:ended']).toEqual(ended)
    expect(withReplays.historicalRouteReplays['event:alpha']).toEqual(penultimate)
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
