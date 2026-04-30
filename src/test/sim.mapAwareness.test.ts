import { describe, expect, it } from 'vitest'
import {
  applyMapObservation,
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
})
