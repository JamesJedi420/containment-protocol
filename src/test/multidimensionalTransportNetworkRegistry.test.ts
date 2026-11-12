import { describe, expect, it } from 'vitest'
import {
  CONTRADICTORY_ACCESS_RULE_FIXTURE,
  LAYERED_ROUTE_GOVERNANCE_FIXTURE,
  MULTIDIMENSIONAL_TRANSPORT_NETWORK_OWNER,
  createMultidimensionalTransportNetworkRecord,
  insertLostPersonQueueEntry,
  orderLostPersonQueue,
  projectTransportNetworkRegistry,
  validateMultidimensionalTransportNetworkRecord,
  type LostPersonQueueEntry,
  type MultidimensionalTransportNetworkRecord,
} from '../domain/multidimensionalTransportNetworkRegistry'

describe('multidimensionalTransportNetworkRegistry (SPE-2149 slice 1)', () => {
  it('validates layered fixture with non-empty layers and legal fare rules', () => {
    const result = validateMultidimensionalTransportNetworkRecord(LAYERED_ROUTE_GOVERNANCE_FIXTURE)

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
    expect(LAYERED_ROUTE_GOVERNANCE_FIXTURE.networkLayerRefs.length).toBeGreaterThan(0)
    expect(LAYERED_ROUTE_GOVERNANCE_FIXTURE.fareAccessRules.length).toBeGreaterThan(0)
    expect(LAYERED_ROUTE_GOVERNANCE_FIXTURE.owner).toBe(MULTIDIMENSIONAL_TRANSPORT_NETWORK_OWNER)
  })

  it('rejects overlapping contradictory access rules on the same layer', () => {
    const result = validateMultidimensionalTransportNetworkRecord({
      ...CONTRADICTORY_ACCESS_RULE_FIXTURE,
      owner: MULTIDIMENSIONAL_TRANSPORT_NETWORK_OWNER,
    })

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'overlapping_contradictory_access')).toBe(
      true
    )
  })

  it('orders lost-person queue by priority then insertion sequence', () => {
    const ordered = orderLostPersonQueue(LAYERED_ROUTE_GOVERNANCE_FIXTURE.lostPersonQueue)

    expect(ordered.map((entry) => entry.id)).toEqual([
      'lost:queue-urgent-3',
      'lost:queue-elevated-5',
      'lost:queue-routine-7',
    ])
  })

  it('inserts lost-person entries with deterministic reordering', () => {
    const base = LAYERED_ROUTE_GOVERNANCE_FIXTURE.lostPersonQueue.filter(
      (entry) => entry.id !== 'lost:queue-elevated-5'
    )
    const inserted: LostPersonQueueEntry = {
      id: 'lost:queue-elevated-9',
      subjectRef: 'person:transit-subject-9',
      lastKnownStationRef: 'station:terminus-north',
      layerRefId: 'layer:surface-rail',
      priority: 'elevated',
      insertedAtSequence: 4,
    }

    const next = insertLostPersonQueueEntry(base, inserted)

    expect(next.map((entry) => entry.id)).toEqual([
      'lost:queue-urgent-3',
      'lost:queue-elevated-9',
      'lost:queue-routine-7',
    ])
  })

  it('projects registry metadata without traversal simulation', () => {
    const projection = projectTransportNetworkRegistry(LAYERED_ROUTE_GOVERNANCE_FIXTURE)

    expect(projection.networkId).toBe('transport-network:layered-hub-alpha')
    expect(projection.layerCount).toBe(2)
    expect(projection.orderedLayerIds).toEqual(['layer:surface-rail', 'layer:under-channel'])
    expect(projection.accessRuleCount).toBe(3)
    expect(projection.stationRiskCount).toBe(2)
    expect(projection.lostPersonQueueOrdered[0]?.priority).toBe('urgent')
    expect(projection.owner).toBe(MULTIDIMENSIONAL_TRANSPORT_NETWORK_OWNER)
  })

  it('rejects empty networkLayerRefs', () => {
    const result = validateMultidimensionalTransportNetworkRecord({
      id: 'transport-network:empty-layers',
      label: 'Empty layers',
      networkLayerRefs: [],
      fareAccessRules: [],
      stationRiskBands: [],
      lostPersonQueue: [],
      owner: MULTIDIMENSIONAL_TRANSPORT_NETWORK_OWNER,
    } satisfies MultidimensionalTransportNetworkRecord)

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'empty_network_layer_refs')).toBe(true)
  })

  it('rejects fare rules that reference unknown layers', () => {
    const result = validateMultidimensionalTransportNetworkRecord({
      id: 'transport-network:unknown-layer-rule',
      label: 'Unknown layer rule',
      networkLayerRefs: [{ id: 'layer:surface-rail', label: 'Surface rail', ordinal: 0 }],
      fareAccessRules: [
        {
          id: 'fare:ghost',
          layerRefId: 'layer:missing',
          mode: 'open',
          stationBandStart: 0,
          stationBandEnd: 10,
        },
      ],
      stationRiskBands: [],
      lostPersonQueue: [],
      owner: MULTIDIMENSIONAL_TRANSPORT_NETWORK_OWNER,
    })

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'unknown_layer_ref')).toBe(true)
  })

  it('does not overlap-check fare rules that reference unknown layers', () => {
    const result = validateMultidimensionalTransportNetworkRecord({
      id: 'transport-network:unknown-layer-overlap',
      label: 'Unknown layer overlap',
      networkLayerRefs: [{ id: 'layer:surface-rail', label: 'Surface rail', ordinal: 0 }],
      fareAccessRules: [
        {
          id: 'fare:ghost-open',
          layerRefId: 'layer:missing',
          mode: 'open',
          stationBandStart: 0,
          stationBandEnd: 50,
        },
        {
          id: 'fare:ghost-denied',
          layerRefId: 'layer:missing',
          mode: 'denied',
          stationBandStart: 40,
          stationBandEnd: 80,
        },
      ],
      stationRiskBands: [],
      lostPersonQueue: [],
      owner: MULTIDIMENSIONAL_TRANSPORT_NETWORK_OWNER,
    })

    expect(result.valid).toBe(false)
    expect(result.issues.filter((issue) => issue.code === 'unknown_layer_ref')).toHaveLength(2)
    expect(result.issues.some((issue) => issue.code === 'overlapping_contradictory_access')).toBe(
      false
    )
  })

  it('allows compatible overlapping rules with the same mode', () => {
    const record = createMultidimensionalTransportNetworkRecord({
      id: 'transport-network:compatible-overlap',
      label: 'Compatible overlap',
      networkLayerRefs: [{ id: 'layer:surface-rail', label: 'Surface rail', ordinal: 0 }],
      fareAccessRules: [
        {
          id: 'fare:open-a',
          layerRefId: 'layer:surface-rail',
          mode: 'open',
          stationBandStart: 0,
          stationBandEnd: 50,
        },
        {
          id: 'fare:open-b',
          layerRefId: 'layer:surface-rail',
          mode: 'open',
          stationBandStart: 40,
          stationBandEnd: 80,
        },
      ],
      stationRiskBands: [],
      lostPersonQueue: [],
    })

    expect(validateMultidimensionalTransportNetworkRecord(record).valid).toBe(true)
  })

  it('rejects duplicate lost-person queue ids on insert', () => {
    expect(() =>
      insertLostPersonQueueEntry(LAYERED_ROUTE_GOVERNANCE_FIXTURE.lostPersonQueue, {
        id: 'lost:queue-urgent-3',
        subjectRef: 'person:duplicate',
        lastKnownStationRef: 'station:rift-dock',
        layerRefId: 'layer:under-channel',
        priority: 'routine',
        insertedAtSequence: 9,
      })
    ).toThrow(/unique/)
  })
})
