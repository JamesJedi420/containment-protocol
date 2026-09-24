import {
  HISTORICAL_ROUTE_CAUSAL_CLASSIFICATION,
  HISTORICAL_ROUTE_REPLAY_FAMILY,
  advanceHistoricalRouteReplay,
  createHistoricalRouteReplay,
  interceptHistoricalRouteReplay,
  revealHistoricalRoutePostContactObservation,
  resolveHistoricalRouteReplayTerminal,
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

describe('SPE-3009 historical route replay', () => {
  it('consumes an active SPE-1392 path and advances over ordered historical positions', () => {
    const replay = createHistoricalRouteReplay(phantomCoachGraph(), {
      eventId: 'event:phantom-coach',
      activationId: 'activation:current-night',
      originAnchorId: 'anchor:moor-road',
      terminalAnchorId: 'anchor:broken-parapet',
    })
    expect(replay).toBeDefined()
    if (!replay) return

    expect(replay).toMatchObject({
      propagationFamily: HISTORICAL_ROUTE_REPLAY_FAMILY,
      currentAnchorId: 'anchor:moor-road',
      phase: 'approaching',
      currentRouteIndex: 0,
      traversedAnchorIds: ['anchor:moor-road'],
      traversedEdgeIds: [],
      affectedAnchorIds: ['anchor:moor-road'],
      exposedAnchorIds: [],
    })

    const middle = advanceHistoricalRouteReplay(replay)
    expect(middle).toMatchObject({
      currentAnchorId: 'anchor:coach-road',
      phase: 'traversing',
      currentRouteIndex: 1,
      traversedAnchorIds: ['anchor:moor-road', 'anchor:coach-road'],
      traversedEdgeIds: ['edge:moor-coach-road'],
      affectedAnchorIds: ['anchor:moor-road', 'anchor:coach-road'],
    })

    const terminal = advanceHistoricalRouteReplay(middle)
    expect(terminal).toMatchObject({
      currentAnchorId: 'anchor:broken-parapet',
      phase: 'terminal',
      currentRouteIndex: 2,
      traversedAnchorIds: ['anchor:moor-road', 'anchor:coach-road', 'anchor:broken-parapet'],
      traversedEdgeIds: ['edge:moor-coach-road', 'edge:coach-road-parapet'],
      affectedAnchorIds: ['anchor:moor-road', 'anchor:coach-road', 'anchor:broken-parapet'],
    })
  })

  it('fails closed when the historical route is absent or inactive and never falls back', () => {
    const empty = createHistoricalRouteMemoryGraph('site:old-coach-road')
    if (!empty) throw new Error('fixture graph was not created')

    expect(
      createHistoricalRouteReplay(empty, {
        eventId: 'event:missing',
        activationId: 'activation:current-night',
        originAnchorId: 'anchor:moor-road',
        terminalAnchorId: 'anchor:broken-parapet',
      })
    ).toBeUndefined()

    const remembered = rememberHistoricalRouteActivation(empty, {
      activationId: 'activation:historical-crash',
      anchors: [
        { id: 'anchor:moor-road', kind: 'activation_point' },
        { id: 'anchor:broken-parapet', kind: 'historical_exit' },
      ],
      edges: [
        {
          id: 'edge:historical',
          routeKind: 'historical_exit',
          fromAnchorId: 'anchor:moor-road',
          toAnchorId: 'anchor:broken-parapet',
        },
      ],
    })

    expect(
      createHistoricalRouteReplay(remembered, {
        eventId: 'event:inactive',
        activationId: 'activation:current-night',
        originAnchorId: 'anchor:moor-road',
        terminalAnchorId: 'anchor:broken-parapet',
      })
    ).toBeUndefined()

    expect(
      createHistoricalRouteReplay(phantomCoachGraph(), {
        eventId: 'event:zero-length',
        activationId: 'activation:current-night',
        originAnchorId: 'anchor:moor-road',
        terminalAnchorId: 'anchor:moor-road',
      })
    ).toBeUndefined()
  })

  it('uses an explicit interception threshold and stronger post-contact observation state', () => {
    const replay = createHistoricalRouteReplay(phantomCoachGraph(), {
      eventId: 'event:phantom-coach',
      activationId: 'activation:current-night',
      originAnchorId: 'anchor:moor-road',
      terminalAnchorId: 'anchor:broken-parapet',
    })
    if (!replay) throw new Error('replay was not created')

    const wrongPosition = interceptHistoricalRouteReplay(
      replay,
      'observer:murray',
      'anchor:coach-road'
    )
    expect(wrongPosition).toBe(replay)

    const contacted = interceptHistoricalRouteReplay(
      replay,
      'observer:murray',
      'anchor:moor-road'
    )
    expect(contacted.observerExposures).toEqual([
      {
        observerId: 'observer:murray',
        contactAnchorId: 'anchor:moor-road',
        exposureState: 'contact',
        observationState: 'external',
      },
    ])
    expect(contacted.currentAnchorId).toBe(replay.currentAnchorId)
    expect(contacted.exposedAnchorIds).toEqual(['anchor:moor-road'])
    expect(contacted.affectedAnchorIds).toEqual(['anchor:moor-road'])
    expect(
      interceptHistoricalRouteReplay(contacted, 'observer:murray', 'anchor:moor-road')
    ).toBe(contacted)

    const altered = revealHistoricalRoutePostContactObservation(contacted, 'observer:murray')
    expect(altered.observerExposures[0]).toEqual({
      observerId: 'observer:murray',
      contactAnchorId: 'anchor:moor-road',
      exposureState: 'post_contact',
      observationState: 'altered',
    })
    expect(altered.routeAnchorIds).toEqual(contacted.routeAnchorIds)
    expect(altered.currentRouteIndex).toBe(contacted.currentRouteIndex)
    expect(altered.exposedAnchorIds).toEqual(contacted.exposedAnchorIds)
    expect('roleAssignments' in altered).toBe(false)
    expect('possession' in altered).toBe(false)
  })

  it('ends only at the historical terminal and keeps ordinary consequence separate from causality', () => {
    const replay = createHistoricalRouteReplay(phantomCoachGraph(), {
      eventId: 'event:phantom-coach',
      activationId: 'activation:current-night',
      originAnchorId: 'anchor:moor-road',
      terminalAnchorId: 'anchor:broken-parapet',
    })
    if (!replay) throw new Error('replay was not created')

    const premature = resolveHistoricalRouteReplayTerminal(replay, {
      consequenceId: 'consequence:fall-injury',
      kind: 'physical_injury',
      subjectId: 'observer:murray',
    })
    expect(premature).toBe(replay)

    const terminal = advanceHistoricalRouteReplay(advanceHistoricalRouteReplay(replay))
    expect(advanceHistoricalRouteReplay(terminal)).toBe(terminal)

    expect(
      resolveHistoricalRouteReplayTerminal(terminal, {
        consequenceId: '',
        kind: 'physical_injury',
        subjectId: 'observer:murray',
      })
    ).toBe(terminal)
    expect(
      resolveHistoricalRouteReplayTerminal(terminal, {
        consequenceId: 'consequence:fall-injury',
        kind: '',
        subjectId: 'observer:murray',
      })
    ).toBe(terminal)
    expect(
      resolveHistoricalRouteReplayTerminal(terminal, {
        consequenceId: 'consequence:fall-injury',
        kind: 'physical_injury',
        subjectId: '',
      })
    ).toBe(terminal)

    const ended = resolveHistoricalRouteReplayTerminal(terminal, {
      consequenceId: 'consequence:fall-injury',
      kind: 'physical_injury',
      subjectId: 'observer:murray',
    })

    expect(ended.phase).toBe('ended')
    expect(ended.currentAnchorId).toBe('anchor:broken-parapet')
    expect(ended.ordinaryConsequence).toEqual({
      consequenceId: 'consequence:fall-injury',
      kind: 'physical_injury',
      subjectId: 'observer:murray',
      persistence: 'ordinary_world',
    })
    expect(ended.causalClassification).toBe(HISTORICAL_ROUTE_CAUSAL_CLASSIFICATION)
    expect(ended.causalClassification).toBe('unresolved')
    expect(advanceHistoricalRouteReplay(ended)).toBe(ended)
  })
})
