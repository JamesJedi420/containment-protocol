import { describe, expect, it } from 'vitest'
import {
  applyMapObservation,
  applyMapUpdateEvents,
  createPlayerMapState,
  getActiveLayerView,
  getConfidenceLabel,
  selectMapLayer,
  type RealityMapGraph,
} from '../domain/mapAwareness'

function buildReality(): RealityMapGraph {
  return {
    nodes: [
      { id: 'room-a', label: 'Room A', layerTags: ['structural', 'security'] },
      { id: 'room-b', label: 'Room B', layerTags: ['structural', 'anomaly'] },
      { id: 'room-c', label: 'Room C', layerTags: ['structural', 'anomaly'] },
      { id: 'security-hub', label: 'Security Hub', layerTags: ['security'] },
    ],
    edges: [
      {
        id: 'a-b-door',
        fromNodeId: 'room-a',
        toNodeId: 'room-b',
        layerType: 'structural',
        hidden: false,
      },
      {
        id: 'b-c-tunnel',
        fromNodeId: 'room-b',
        toNodeId: 'room-c',
        layerType: 'structural',
        hidden: true,
      },
      {
        id: 'a-hub-camera',
        fromNodeId: 'room-a',
        toNodeId: 'security-hub',
        layerType: 'security',
        hidden: false,
      },
      {
        id: 'a-b-influence',
        fromNodeId: 'room-a',
        toNodeId: 'room-b',
        layerType: 'relationship',
        hidden: false,
      },
    ],
    entityPositions: [
      {
        entityId: 'anomaly-x',
        entityType: 'anomaly',
        nodeId: 'room-c',
      },
    ],
  }
}

describe('mapAwareness reality-vs-map separation', () => {
  it('starts with known room and unknown adjacent projection while keeping reality separate', () => {
    const reality = buildReality()
    const mapState = createPlayerMapState(reality, {
      seed: 2026,
      knownNodeIds: ['room-a'],
      activeLayer: 'structural',
    })

    expect(mapState.nodes.some((node) => node.id === 'node:room-a')).toBe(true)
    expect(mapState.nodes.some((node) => node.knowledge === 'unknown_adjacent')).toBe(true)
    expect(mapState.edges.some((edge) => edge.visibility === 'known_connection')).toBe(true)

    // True reality entity position is not exposed directly in map state.
    expect(mapState.nodes.some((node) => node.realityNodeId === 'room-c' && node.knowledge === 'known')).toBe(
      false
    )
  })

  it('reveals hidden connection only after qualifying scan observation', () => {
    const reality = buildReality()
    const initial = createPlayerMapState(reality, {
      seed: 2026,
      knownNodeIds: ['room-a', 'room-b'],
    })

    expect(initial.edges.some((edge) => edge.realityEdgeId === 'b-c-tunnel')).toBe(false)

    const updated = applyMapObservation(reality, initial, {
      observationId: 'obs-scan-1',
      week: 5,
      type: 'scan_connection',
      source: 'sensor',
      confidence: 0.82,
      realityEdgeId: 'b-c-tunnel',
    })

    expect(updated.edges.some((edge) => edge.realityEdgeId === 'b-c-tunnel')).toBe(true)
    expect(
      updated.edges.some(
        (edge) => edge.realityEdgeId === 'b-c-tunnel' && edge.visibility === 'hidden_connection'
      )
    ).toBe(true)
  })

  it('supports sensor-inferred hazard without exposing true entity position', () => {
    const reality = buildReality()
    const initial = createPlayerMapState(reality, {
      seed: 2026,
      knownNodeIds: ['room-a', 'room-b'],
      activeLayer: 'anomaly',
    })

    const withHazard = applyMapObservation(reality, initial, {
      observationId: 'obs-anom-1',
      week: 5,
      type: 'sensor_inferred_hazard',
      source: 'sensor',
      confidence: 0.58,
      hazardId: 'instability-pulse',
      nodeHintId: 'room-b',
    })

    expect(withHazard.nodes.some((node) => node.id.includes('inferred-hazard:instability-pulse:room-b'))).toBe(
      true
    )
    expect(withHazard.nodes.some((node) => node.realityNodeId === 'room-c' && node.knowledge === 'known')).toBe(
      false
    )
  })

  it('applies contradiction correction with confidence degradation', () => {
    const reality = buildReality()
    const withHazard = applyMapObservation(
      reality,
      createPlayerMapState(reality, { seed: 7, knownNodeIds: ['room-a'] }),
      {
        observationId: 'obs-anom-2',
        week: 6,
        type: 'sensor_inferred_hazard',
        source: 'sensor',
        confidence: 0.9,
        hazardId: 'ghost-heat',
        nodeHintId: 'room-a',
      }
    )

    const hazardId = withHazard.inferredHazards[0]!.id
    const corrected = applyMapObservation(reality, withHazard, {
      observationId: 'obs-correct-1',
      week: 7,
      type: 'contradiction_correction',
      source: 'record',
      confidence: 1,
      targetMapId: hazardId,
      correctionErrorState: 'contradicted',
    })

    const correctedHazard = corrected.inferredHazards.find((entry) => entry.id === hazardId)
    expect(correctedHazard).toBeDefined()
    expect(correctedHazard!.errorState).toBe('contradicted')
    expect(correctedHazard!.confidence).toBeLessThan(0.9)
    expect(getConfidenceLabel(correctedHazard!.confidence)).toBe('medium')
  })

  it('switches between structural/security/anomaly layers deterministically', () => {
    const reality = buildReality()
    const base = createPlayerMapState(reality, {
      seed: 900,
      knownNodeIds: ['room-a', 'room-b', 'security-hub'],
      activeLayer: 'structural',
    })

    const structuralView = getActiveLayerView(base)
    const securityView = getActiveLayerView(selectMapLayer(base, 'security'))
    const anomalyView = getActiveLayerView(selectMapLayer(base, 'anomaly'))

    expect(structuralView.layerType).toBe('structural')
    expect(securityView.layerType).toBe('security')
    expect(anomalyView.layerType).toBe('anomaly')
    expect(structuralView).not.toEqual(securityView)
  })

  it('represents non-geometric relationship links on a dedicated layer', () => {
    const reality = buildReality()
    const state = createPlayerMapState(reality, {
      seed: 1104,
      knownNodeIds: ['room-a', 'room-b'],
      activeLayer: 'relationship',
    })

    const relationshipView = getActiveLayerView(state)
    expect(relationshipView.layerType).toBe('relationship')
    expect(
      relationshipView.edges.some(
        (edge) => edge.realityEdgeId === 'a-b-influence' && edge.layerType === 'relationship'
      )
    ).toBe(true)
  })

  it('is repeatable for identical initialization and observation sequence', () => {
    const reality = buildReality()
    const applySequence = () => {
      let state = createPlayerMapState(reality, { seed: 333, knownNodeIds: ['room-a'] })
      state = applyMapObservation(reality, state, {
        observationId: 'obs-e1',
        week: 1,
        type: 'exploration_room',
        source: 'exploration',
        confidence: 1,
        realityNodeId: 'room-b',
      })
      state = applyMapObservation(reality, state, {
        observationId: 'obs-e2',
        week: 2,
        type: 'scan_connection',
        source: 'sensor',
        confidence: 0.75,
        realityEdgeId: 'b-c-tunnel',
      })
      state = applyMapObservation(reality, state, {
        observationId: 'obs-e3',
        week: 2,
        type: 'sensor_inferred_hazard',
        source: 'sensor',
        confidence: 0.42,
        hazardId: 'thermal-anomaly',
        nodeHintId: 'room-b',
      })
      return state
    }

    expect(applySequence()).toEqual(applySequence())
  })

  it('applies scan + exploration + system route-state map update events deterministically', () => {
    const reality = buildReality()
    const initial = createPlayerMapState(reality, {
      seed: 1105,
      knownNodeIds: ['room-a', 'room-b'],
      activeLayer: 'structural',
    })

    const updated = applyMapUpdateEvents(reality, initial, [
      {
        eventId: 'evt-explore-room-c',
        week: 3,
        type: 'exploration_event',
        source: 'exploration',
        confidence: 1,
        realityNodeId: 'room-c',
      },
      {
        eventId: 'evt-scan-tunnel',
        week: 3,
        type: 'scan_event',
        source: 'sensor',
        confidence: 0.8,
        realityEdgeId: 'b-c-tunnel',
      },
      {
        eventId: 'evt-door-lock',
        week: 4,
        type: 'system_route_state_event',
        source: 'system',
        confidence: 0.94,
        realityEdgeId: 'a-b-door',
        doorState: 'locked',
      },
    ])

    expect(updated.nodes.some((node) => node.id === 'node:room-c')).toBe(true)
    expect(updated.edges.some((edge) => edge.realityEdgeId === 'b-c-tunnel')).toBe(true)
    expect(
      updated.edges.some(
        (edge) => edge.realityEdgeId === 'a-b-door' && edge.doorState === 'locked'
      )
    ).toBe(true)
  })

  it('supports route invalidation and later contradiction correction on displayed map fact', () => {
    const reality = buildReality()
    const initial = createPlayerMapState(reality, {
      seed: 1106,
      knownNodeIds: ['room-a', 'room-b'],
    })

    const invalidated = applyMapUpdateEvents(reality, initial, [
      {
        eventId: 'evt-route-invalidated',
        week: 2,
        type: 'system_route_state_event',
        source: 'system',
        confidence: 0.66,
        realityEdgeId: 'a-b-door',
        invalidated: true,
      },
    ])

    const invalidatedEdge = invalidated.edges.find((edge) => edge.realityEdgeId === 'a-b-door')
    expect(invalidatedEdge).toBeDefined()
    expect(invalidatedEdge!.visibility).toBe('inferred_connection')
    expect(invalidatedEdge!.errorState).toBe('outdated')

    const corrected = applyMapUpdateEvents(reality, invalidated, [
      {
        eventId: 'evt-route-contradiction',
        week: 3,
        type: 'contradiction_event',
        source: 'record',
        confidence: 0.7,
        realityEdgeId: 'a-b-door',
        correctionErrorState: 'contradicted',
      },
    ])

    const correctedEdge = corrected.edges.find((edge) => edge.realityEdgeId === 'a-b-door')
    expect(correctedEdge).toBeDefined()
    expect(correctedEdge!.errorState).toBe('contradicted')
    expect(correctedEdge!.confidence).toBeLessThanOrEqual(invalidatedEdge!.confidence)
  })

  it('preserves inferred-hazard non-omniscience after map update events', () => {
    const reality = buildReality()
    const initial = applyMapObservation(
      reality,
      createPlayerMapState(reality, {
        seed: 1107,
        knownNodeIds: ['room-a', 'room-b'],
        activeLayer: 'anomaly',
      }),
      {
        observationId: 'obs-hazard-inference',
        week: 1,
        type: 'sensor_inferred_hazard',
        source: 'sensor',
        confidence: 0.58,
        hazardId: 'instability-pulse',
        nodeHintId: 'room-b',
      }
    )

    const updated = applyMapUpdateEvents(reality, initial, [
      {
        eventId: 'evt-hazard-scan',
        week: 1,
        type: 'scan_event',
        source: 'sensor',
        confidence: 0.8,
        realityEdgeId: 'b-c-tunnel',
      },
      {
        eventId: 'evt-hazard-inference',
        week: 1,
        type: 'contradiction_event',
        source: 'record',
        confidence: 0.7,
        targetMapId: 'non-existent-hazard-target',
      },
    ])

    expect(updated.nodes.some((node) => node.id.includes('inferred-hazard:instability-pulse:room-b'))).toBe(
      true
    )

    // Non-omniscience guard: true anomaly location in room-c should not become a known room implicitly.
    expect(updated.nodes.some((node) => node.realityNodeId === 'room-c' && node.knowledge === 'known')).toBe(
      false
    )
  })

  it('map update event application is repeatable for identical event streams', () => {
    const reality = buildReality()
    const run = () =>
      applyMapUpdateEvents(
        reality,
        createPlayerMapState(reality, { seed: 2222, knownNodeIds: ['room-a', 'room-b'] }),
        [
          {
            eventId: 'evt-1',
            week: 4,
            type: 'scan_event',
            source: 'sensor',
            confidence: 0.81,
            realityEdgeId: 'b-c-tunnel',
          },
          {
            eventId: 'evt-2',
            week: 5,
            type: 'system_route_state_event',
            source: 'system',
            confidence: 0.77,
            realityEdgeId: 'a-b-door',
            doorState: 'sealed',
            invalidated: true,
          },
          {
            eventId: 'evt-3',
            week: 6,
            type: 'exploration_event',
            source: 'exploration',
            confidence: 1,
            realityNodeId: 'room-c',
          },
        ]
      )

    expect(run()).toEqual(run())
  })
})
