import {
  HISTORICAL_NONLOCAL_EDGE_CLASS,
  type HistoricalRouteActivationObservation,
  createHistoricalRouteMemoryGraph,
  readActiveHistoricalRouteEdges,
  readKnownHistoricalRouteEdges,
  reactivateHistoricalRouteEdges,
  recordHistoricalRouteContamination,
  rememberHistoricalRouteActivation,
  resolveActiveHistoricalRoutePath,
  updateHistoricalRouteKnowledge,
} from '../domain/historicalRouteMemory'

function graph() {
  const value = createHistoricalRouteMemoryGraph('site:old-coach-road')
  if (!value) throw new Error('fixture graph was not created')
  return value
}

describe('SPE-1392 historical route memory and nonlocal edge graph', () => {
  it('remembers prior anchor points and historical edges across activations', () => {
    const first = rememberHistoricalRouteActivation(graph(), {
      activationId: 'activation:01',
      anchors: [
        {
          id: 'anchor:moor',
          kind: 'activation_point',
          knowledgeState: 'verified',
          reconnaissanceConfidence: 0.8,
        },
        {
          id: 'anchor:crossroads',
          kind: 'landmark',
          knowledgeState: 'inferred',
          reconnaissanceConfidence: 0.55,
        },
        {
          id: 'anchor:precipice',
          kind: 'historical_exit',
          knowledgeState: 'verified',
          reconnaissanceConfidence: 0.9,
        },
      ],
      edges: [
        {
          id: 'edge:moor-crossroads',
          routeKind: 'recurring_site',
          fromAnchorId: 'anchor:moor',
          toAnchorId: 'anchor:crossroads',
          knowledgeState: 'inferred',
          reconnaissanceConfidence: 0.5,
        },
        {
          id: 'edge:crossroads-precipice',
          routeKind: 'historical_exit',
          fromAnchorId: 'anchor:crossroads',
          toAnchorId: 'anchor:precipice',
          knowledgeState: 'verified',
          reconnaissanceConfidence: 0.9,
        },
      ],
    })

    const second = rememberHistoricalRouteActivation(first, {
      activationId: 'activation:02',
      anchors: [
        {
          id: 'anchor:crossroads',
          kind: 'landmark',
          knowledgeState: 'verified',
          reconnaissanceConfidence: 0.88,
        },
      ],
      edges: [],
    })

    expect(second.anchors.map((anchor) => anchor.id)).toEqual([
      'anchor:crossroads',
      'anchor:moor',
      'anchor:precipice',
    ])
    expect(second.anchors.find((anchor) => anchor.id === 'anchor:crossroads')).toMatchObject({
      firstSeenActivationId: 'activation:01',
      lastSeenActivationId: 'activation:02',
      activationIds: ['activation:01', 'activation:02'],
      knowledgeState: 'verified',
      reconnaissanceConfidence: 0.88,
    })
    expect(second.edges[0]?.edgeClass).toBe(HISTORICAL_NONLOCAL_EDGE_CLASS)
  })

  it('reactivates remembered nonlocal edges in a later run without facility adjacency', () => {
    const remembered = rememberHistoricalRouteActivation(graph(), {
      activationId: 'activation:old',
      anchors: [
        { id: 'anchor:a', kind: 'activation_point' },
        { id: 'anchor:b', kind: 'historical_exit' },
      ],
      edges: [
        {
          id: 'edge:a-b',
          routeKind: 'historical_exit',
          fromAnchorId: 'anchor:a',
          toAnchorId: 'anchor:b',
        },
      ],
    })

    const reactivated = reactivateHistoricalRouteEdges(remembered, 'activation:new', ['edge:a-b'])
    expect(reactivated).not.toBe(remembered)
    expect(reactivated.activeActivationId).toBe('activation:new')
    expect(reactivated.activeEdgeIds).toEqual(['edge:a-b'])
    expect(readActiveHistoricalRouteEdges(reactivated, 'activation:new')).toHaveLength(1)
    expect(readActiveHistoricalRouteEdges(reactivated, 'activation:old')).toEqual([])
    expect(reactivated.edges[0]?.activationIds).toEqual(['activation:new', 'activation:old'])
  })

  it('keeps route knowledge separate so current knowledge can remain unknown or inferred', () => {
    const remembered = rememberHistoricalRouteActivation(graph(), {
      activationId: 'activation:01',
      anchors: [
        { id: 'anchor:a', kind: 'activation_point' },
        { id: 'anchor:b', kind: 'landmark' },
      ],
      edges: [
        {
          id: 'edge:a-b',
          routeKind: 'recurring_site',
          fromAnchorId: 'anchor:a',
          toAnchorId: 'anchor:b',
          knowledgeState: 'unknown',
          reconnaissanceConfidence: 0.2,
        },
      ],
    })

    expect(readKnownHistoricalRouteEdges(remembered)).toEqual([])

    const inferred = updateHistoricalRouteKnowledge(remembered, {
      edgeId: 'edge:a-b',
      knowledgeState: 'inferred',
      reconnaissanceConfidence: 0.58,
    })
    expect(readKnownHistoricalRouteEdges(inferred, 0.5)).toHaveLength(1)
    expect(readKnownHistoricalRouteEdges(inferred, 0.6)).toEqual([])

    const lowerConfidence = updateHistoricalRouteKnowledge(inferred, {
      edgeId: 'edge:a-b',
      knowledgeState: 'unknown',
      reconnaissanceConfidence: 0.1,
    })
    expect(lowerConfidence).toBe(inferred)
  })

  it('records contamination on existing historical edges without authoring a route', () => {
    const remembered = rememberHistoricalRouteActivation(graph(), {
      activationId: 'activation:01',
      anchors: [
        { id: 'anchor:a', kind: 'activation_point' },
        { id: 'anchor:b', kind: 'landmark' },
      ],
      edges: [
        {
          id: 'edge:contamination',
          routeKind: 'contamination_route',
          fromAnchorId: 'anchor:a',
          toAnchorId: 'anchor:b',
        },
      ],
    })

    const contaminated = recordHistoricalRouteContamination(remembered, {
      activationId: 'activation:02',
      edgeIds: ['edge:contamination'],
    })
    expect(contaminated.edges[0]?.contaminatedActivationIds).toEqual(['activation:02'])
    expect(contaminated.anchors.every((anchor) =>
      anchor.contaminatedActivationIds.includes('activation:02')
    )).toBe(true)

    const missing = recordHistoricalRouteContamination(contaminated, {
      activationId: 'activation:03',
      edgeIds: ['edge:not-real'],
    })
    expect(missing).toBe(contaminated)
  })

  it('resolves active historical paths deterministically in canonical edge order', () => {
    const remembered = rememberHistoricalRouteActivation(graph(), {
      activationId: 'activation:01',
      anchors: [
        { id: 'anchor:a', kind: 'activation_point' },
        { id: 'anchor:b', kind: 'landmark' },
        { id: 'anchor:c', kind: 'landmark' },
        { id: 'anchor:d', kind: 'historical_exit' },
      ],
      edges: [
        {
          id: 'edge:02-a-c',
          routeKind: 'recurring_site',
          fromAnchorId: 'anchor:a',
          toAnchorId: 'anchor:c',
        },
        {
          id: 'edge:01-a-b',
          routeKind: 'recurring_site',
          fromAnchorId: 'anchor:a',
          toAnchorId: 'anchor:b',
        },
        {
          id: 'edge:03-b-d',
          routeKind: 'historical_exit',
          fromAnchorId: 'anchor:b',
          toAnchorId: 'anchor:d',
        },
        {
          id: 'edge:04-c-d',
          routeKind: 'historical_exit',
          fromAnchorId: 'anchor:c',
          toAnchorId: 'anchor:d',
        },
      ],
    })

    const reactivated = reactivateHistoricalRouteEdges(remembered, 'activation:02', [
      'edge:04-c-d',
      'edge:02-a-c',
      'edge:03-b-d',
      'edge:01-a-b',
    ])

    expect(
      resolveActiveHistoricalRoutePath(
        reactivated,
        'activation:02',
        'anchor:a',
        'anchor:d'
      )
    ).toEqual({
      activationId: 'activation:02',
      anchorIds: ['anchor:a', 'anchor:b', 'anchor:d'],
      edgeIds: ['edge:01-a-b', 'edge:03-b-d'],
    })
  })

  it('updates remembered endpoint histories when an observed edge omits anchor observations', () => {
    const remembered = rememberHistoricalRouteActivation(graph(), {
      activationId: 'activation:01',
      anchors: [
        { id: 'anchor:a', kind: 'activation_point' },
        { id: 'anchor:b', kind: 'historical_exit' },
      ],
      edges: [
        {
          id: 'edge:a-b',
          routeKind: 'historical_exit',
          fromAnchorId: 'anchor:a',
          toAnchorId: 'anchor:b',
        },
      ],
    })

    const observedAgain = rememberHistoricalRouteActivation(remembered, {
      activationId: 'activation:02',
      anchors: [],
      edges: [
        {
          id: 'edge:a-b',
          routeKind: 'historical_exit',
          fromAnchorId: 'anchor:a',
          toAnchorId: 'anchor:b',
          contaminated: true,
        },
      ],
    })

    expect(observedAgain.edges[0]?.activationIds).toEqual(['activation:01', 'activation:02'])
    expect(observedAgain.edges[0]?.contaminatedActivationIds).toEqual(['activation:02'])
    expect(
      observedAgain.anchors.every(
        (anchor) =>
          anchor.lastSeenActivationId === 'activation:02' &&
          anchor.activationIds.includes('activation:02') &&
          anchor.contaminatedActivationIds.includes('activation:02')
      )
    ).toBe(true)
  })

  it('requires a remembered anchor to participate in the active route for a zero-edge path', () => {
    const remembered = rememberHistoricalRouteActivation(graph(), {
      activationId: 'activation:01',
      anchors: [
        { id: 'anchor:a', kind: 'activation_point' },
        { id: 'anchor:b', kind: 'landmark' },
        { id: 'anchor:c', kind: 'historical_exit' },
      ],
      edges: [
        {
          id: 'edge:a-b',
          routeKind: 'recurring_site',
          fromAnchorId: 'anchor:a',
          toAnchorId: 'anchor:b',
        },
      ],
    })

    const reactivated = reactivateHistoricalRouteEdges(remembered, 'activation:02', ['edge:a-b'])

    expect(
      resolveActiveHistoricalRoutePath(
        reactivated,
        'activation:02',
        'anchor:a',
        'anchor:a'
      )
    ).toEqual({
      activationId: 'activation:02',
      anchorIds: ['anchor:a'],
      edgeIds: [],
    })
    expect(
      resolveActiveHistoricalRoutePath(
        reactivated,
        'activation:02',
        'anchor:c',
        'anchor:c'
      )
    ).toBeNull()
  })

  it('rejects reused edge ids when endpoints or route kind change', () => {
    const remembered = rememberHistoricalRouteActivation(graph(), {
      activationId: 'activation:01',
      anchors: [
        { id: 'anchor:a', kind: 'activation_point' },
        { id: 'anchor:b', kind: 'landmark' },
        { id: 'anchor:c', kind: 'historical_exit' },
      ],
      edges: [
        {
          id: 'edge:stable',
          routeKind: 'recurring_site',
          fromAnchorId: 'anchor:a',
          toAnchorId: 'anchor:b',
        },
      ],
    })

    const endpointConflict = rememberHistoricalRouteActivation(remembered, {
      activationId: 'activation:02',
      anchors: [],
      edges: [
        {
          id: 'edge:stable',
          routeKind: 'recurring_site',
          fromAnchorId: 'anchor:a',
          toAnchorId: 'anchor:c',
        },
      ],
    })
    expect(endpointConflict).toBe(remembered)

    const routeKindConflict = rememberHistoricalRouteActivation(remembered, {
      activationId: 'activation:02',
      anchors: [],
      edges: [
        {
          id: 'edge:stable',
          routeKind: 'historical_exit',
          fromAnchorId: 'anchor:a',
          toAnchorId: 'anchor:b',
        },
      ],
    })
    expect(routeKindConflict).toBe(remembered)
  })

  it('fails closed for malformed observation entries before reading ids', () => {
    const initial = graph()

    const nullAnchor = rememberHistoricalRouteActivation(
      initial,
      {
        activationId: 'activation:malformed-anchor',
        anchors: [null],
        edges: [],
      } as unknown as HistoricalRouteActivationObservation
    )
    expect(nullAnchor).toBe(initial)

    const undefinedEdge = rememberHistoricalRouteActivation(
      initial,
      {
        activationId: 'activation:malformed-edge',
        anchors: [],
        edges: [undefined],
      } as unknown as HistoricalRouteActivationObservation
    )
    expect(undefinedEdge).toBe(initial)
  })

  it('fails closed for dangling historical edges and unknown reactivation ids', () => {
    const initial = graph()
    const dangling = rememberHistoricalRouteActivation(initial, {
      activationId: 'activation:01',
      anchors: [{ id: 'anchor:a', kind: 'activation_point' }],
      edges: [
        {
          id: 'edge:a-missing',
          routeKind: 'historical_exit',
          fromAnchorId: 'anchor:a',
          toAnchorId: 'anchor:missing',
        },
      ],
    })
    expect(dangling).toBe(initial)

    const remembered = rememberHistoricalRouteActivation(initial, {
      activationId: 'activation:01',
      anchors: [
        { id: 'anchor:a', kind: 'activation_point' },
        { id: 'anchor:b', kind: 'historical_exit' },
      ],
      edges: [
        {
          id: 'edge:a-b',
          routeKind: 'historical_exit',
          fromAnchorId: 'anchor:a',
          toAnchorId: 'anchor:b',
        },
      ],
    })

    const identityDrift = rememberHistoricalRouteActivation(remembered, {
      activationId: 'activation:02',
      anchors: [{ id: 'anchor:a', kind: 'historical_exit' }],
      edges: [],
    })
    expect(identityDrift).toBe(remembered)

    expect(
      reactivateHistoricalRouteEdges(remembered, 'activation:02', ['edge:not-real'])
    ).toBe(remembered)
    expect(
      resolveActiveHistoricalRoutePath(
        remembered,
        'activation:02',
        'anchor:a',
        'anchor:b'
      )
    ).toBeNull()
  })
})
