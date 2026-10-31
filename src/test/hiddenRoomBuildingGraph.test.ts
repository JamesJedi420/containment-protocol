import { beforeEach, describe, expect, it } from 'vitest'
import {
  activateConcealedTrigger,
  bootHiddenBuildingDiscovery,
  createHiddenBuildingGraph,
  inspectRevealedHiddenRoom,
  reachableRoomIds,
  type HiddenBuildingDiscoveryState,
  type HiddenBuildingGraph,
} from '../domain/hiddenRoomBuildingGraph'

describe('SPE-992 hidden-room building graph', () => {
  let graph: HiddenBuildingGraph
  let state: HiddenBuildingDiscoveryState

  beforeEach(() => {
    graph = createHiddenBuildingGraph({
      id: 'manor-a',
      rooms: [
        { id: 'library', visibility: 'visible', purpose: 'ordinary' },
        { id: 'passage', visibility: 'visible', purpose: 'ordinary' },
        {
          id: 'hidden-study',
          visibility: 'hidden',
          purpose: 'long_term_habitation',
        },
      ],
      triggers: [
        {
          id: 'trig-book',
          kind: 'book',
          matchingMechanismId: 'family-crest-tome',
          fromRoomId: 'library',
          toHiddenRoomId: 'hidden-study',
        },
      ],
      edges: [
        {
          fromRoomId: 'library',
          toRoomId: 'passage',
          alternateRoute: false,
          requiresTriggerId: null,
        },
        {
          fromRoomId: 'library',
          toRoomId: 'hidden-study',
          alternateRoute: true,
          requiresTriggerId: 'trig-book',
        },
      ],
      contentsByRoomId: {
        'hidden-study': { activeResident: true, concealedBody: false },
      },
    })
    state = bootHiddenBuildingDiscovery(graph)
  })

  it('uses a concealed access trigger that is not a normal keyed door', () => {
    expect(graph.triggers[0]?.kind).toBe('book')
    expect(graph.triggers[0]?.matchingMechanismId).toBe('family-crest-tome')
    expect(reachableRoomIds(graph, state, 'library')).toEqual(['passage'])
  })

  it('supports a long-term habitation hidden room and alternate route after trigger', () => {
    const hidden = graph.rooms.find((r) => r.id === 'hidden-study')
    expect(hidden?.purpose).toBe('long_term_habitation')
    const opened = activateConcealedTrigger(graph, state, 'trig-book', 'family-crest-tome')
    expect(opened.discoveryByHiddenRoomId['hidden-study']).toBe('room_revealed')
    expect(reachableRoomIds(graph, opened, 'library')).toEqual(['passage', 'hidden-study'])
  })

  it('discovers an active resident in the revealed secret space', () => {
    const opened = activateConcealedTrigger(graph, state, 'trig-book', 'family-crest-tome')
    const inspected = inspectRevealedHiddenRoom(graph, opened, 'hidden-study')
    expect(inspected.discoveryByHiddenRoomId['hidden-study']).toBe('occupant_or_body_found')
  })

  it('fail-closes wrong matching mechanism and ordinary door assumptions', () => {
    expect(() => activateConcealedTrigger(graph, state, 'trig-book', 'wrong-key')).toThrow(
      /matching mechanism/
    )
  })

  it('accumulates alternate routes across multiple trigger activations', () => {
    const multi = createHiddenBuildingGraph({
      id: 'manor-b',
      rooms: [
        { id: 'hall', visibility: 'visible', purpose: 'ordinary' },
        { id: 'cellar-hidden', visibility: 'hidden', purpose: 'body_concealment' },
        { id: 'attic-hidden', visibility: 'hidden', purpose: 'supply_storage' },
      ],
      triggers: [
        {
          id: 'trig-panel',
          kind: 'panel',
          matchingMechanismId: 'panel-latch',
          fromRoomId: 'hall',
          toHiddenRoomId: 'cellar-hidden',
        },
        {
          id: 'trig-clock',
          kind: 'clock',
          matchingMechanismId: 'clock-key',
          fromRoomId: 'hall',
          toHiddenRoomId: 'attic-hidden',
        },
      ],
      edges: [
        {
          fromRoomId: 'hall',
          toRoomId: 'cellar-hidden',
          alternateRoute: true,
          requiresTriggerId: 'trig-panel',
        },
        {
          fromRoomId: 'hall',
          toRoomId: 'attic-hidden',
          alternateRoute: true,
          requiresTriggerId: 'trig-clock',
        },
      ],
      contentsByRoomId: {
        'cellar-hidden': { activeResident: false, concealedBody: true },
        'attic-hidden': { activeResident: false, concealedBody: false },
      },
    })
    const boot = bootHiddenBuildingDiscovery(multi)
    const afterPanel = activateConcealedTrigger(multi, boot, 'trig-panel', 'panel-latch')
    const afterBoth = activateConcealedTrigger(multi, afterPanel, 'trig-clock', 'clock-key')
    expect(afterBoth.openAlternateRouteIds).toEqual(['hall->cellar-hidden', 'hall->attic-hidden'])
    expect(reachableRoomIds(multi, afterBoth, 'hall')).toEqual(['cellar-hidden', 'attic-hidden'])
  })

  it('is deterministic and does not mutate inputs', () => {
    const input = {
      id: 'b',
      rooms: [
        { id: 'a', visibility: 'visible' as const, purpose: 'ordinary' as const },
        { id: 'h', visibility: 'hidden' as const, purpose: 'body_concealment' as const },
      ],
      triggers: [
        {
          id: 't',
          kind: 'panel' as const,
          matchingMechanismId: 'm',
          fromRoomId: 'a',
          toHiddenRoomId: 'h',
        },
      ],
      edges: [
        {
          fromRoomId: 'a',
          toRoomId: 'h',
          alternateRoute: true,
          requiresTriggerId: 't',
        },
      ],
      contentsByRoomId: { h: { activeResident: false, concealedBody: true } },
    }
    const before = structuredClone(input)
    const first = createHiddenBuildingGraph(input)
    const second = createHiddenBuildingGraph(input)
    expect(first).toEqual(second)
    expect(Object.isFrozen(first)).toBe(true)
    expect(input).toEqual(before)
  })
})
