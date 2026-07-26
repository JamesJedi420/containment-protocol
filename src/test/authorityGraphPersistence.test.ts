import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { AuthorityGraphState } from '../domain/authorityGraphPersistence'
import {
  applyAuthorityGraphWeekClose,
  AUTHORITY_GRAPH_MUTATION_HISTORY_LIMIT,
  sanitizeAuthorityGraphState,
} from '../domain/authorityGraphPersistence'
import { resolvePersistedAuthorityNegotiation } from '../domain/authorityNegotiation'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { hydrateGame } from '../app/store/runTransfer'

function createAuthorityGraphState(strength = 50): AuthorityGraphState {
  return {
    graph: {
      nodes: [
        { id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' },
        { id: 'regional-office', nodeType: 'public_office', label: 'Regional Office' },
      ],
      edges: [
        {
          id: 'permission-dependency',
          kind: 'dependency',
          fromNodeId: 'agency-core',
          toNodeId: 'regional-office',
          status: 'current',
          sourceConfidence: 'verified',
          provenance: { sourceTag: 'authority-fixture' },
          strength,
          pressureChannels: ['permission'],
        },
      ],
    },
    mutationHistory: [],
  }
}

describe('authority graph persisted week-close foundation (SPE-2720)', () => {
  it('applies one deterministic, bounded consequence-driven mutation', () => {
    const input = createAuthorityGraphState()

    const first = applyAuthorityGraphWeekClose(input, 7)
    const second = applyAuthorityGraphWeekClose(structuredClone(input), 7)

    expect(first).toEqual(second)
    expect(first.graph.edges[0]?.strength).toBe(55)
    expect(first.mutationHistory).toEqual([
      {
        id: 'authority-graph-mutation:7:permission-dependency',
        week: 7,
        edgeId: 'permission-dependency',
        priorStrength: 50,
        nextStrength: 55,
        channel: 'permission',
        consequenceReasonCode: 'dependency_permission',
        consequenceMagnitude: 25,
      },
    ])
    expect(input.graph.edges[0]?.strength).toBe(50)
  })

  it('does not apply or record the same week twice', () => {
    const once = applyAuthorityGraphWeekClose(createAuthorityGraphState(), 7)
    const twice = applyAuthorityGraphWeekClose(once, 7)
    const stale = applyAuthorityGraphWeekClose(once, 6)

    expect(twice).toEqual(once)
    expect(stale).toEqual(once)
    expect(twice.mutationHistory).toHaveLength(1)
  })

  it('retains only the newest bounded mutation history', () => {
    let state: AuthorityGraphState = {
      graph: {
        nodes: [
          { id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' },
          ...Array.from({ length: 7 }, (_, index) => ({
            id: `office-${index}`,
            nodeType: 'public_office' as const,
            label: `Regional Office ${index}`,
          })),
        ],
        edges: Array.from({ length: 7 }, (_, index) => ({
          id: `agenda-${index}`,
          kind: 'hidden_agenda' as const,
          fromNodeId: 'agency-core',
          toNodeId: `office-${index}`,
          status: 'current' as const,
          sourceConfidence: 'verified' as const,
          provenance: { sourceTag: 'authority-fixture' },
          strength: 0,
          pressureChannels: ['delay' as const],
        })),
      },
      mutationHistory: [],
    }
    for (let week = 1; week <= AUTHORITY_GRAPH_MUTATION_HISTORY_LIMIT + 8; week += 1) {
      state = applyAuthorityGraphWeekClose(state, week)
    }

    expect(state.mutationHistory).toHaveLength(AUTHORITY_GRAPH_MUTATION_HISTORY_LIMIT)
    expect(state.mutationHistory[0]?.week).toBe(9)
    expect(state.mutationHistory.at(-1)?.week).toBe(60)
  })

  it('sanitizes malformed persisted graph/history and unmatched week markers', () => {
    const sanitized = sanitizeAuthorityGraphState({
      graph: {
        nodes: [
          ...createAuthorityGraphState().graph.nodes,
          { id: '', nodeType: 'agency', label: 'Dropped malformed node' },
        ],
        edges: [
          ...createAuthorityGraphState().graph.edges,
          {
            id: 'invalid-unknown-node',
            kind: 'dependency',
            fromNodeId: 'agency-core',
            toNodeId: 'missing-node',
            status: 'current',
            sourceConfidence: 'verified',
            provenance: { sourceTag: 'malformed-fixture' },
            pressureChannels: ['permission'],
          },
        ],
      },
      mutationHistory: [
        {
          id: 'valid',
          week: 4,
          edgeId: 'permission-dependency',
          priorStrength: 40,
          nextStrength: 45,
          channel: 'permission',
          consequenceReasonCode: 'dependency_permission',
          consequenceMagnitude: 20,
        },
        {
          id: 'bad-edge',
          week: 5,
          edgeId: 'missing',
          priorStrength: 40,
          nextStrength: 45,
          channel: 'permission',
          consequenceReasonCode: 'dependency_permission',
          consequenceMagnitude: 20,
        },
      ],
      lastMutationWeek: 5,
    })

    expect(sanitized.graph.nodes).toHaveLength(2)
    expect(sanitized.graph.edges.map((edge) => edge.id)).toEqual(['permission-dependency'])
    expect(sanitized.mutationHistory.map((entry) => entry.week)).toEqual([4])
    expect(sanitized.lastMutationWeek).toBe(4)
    expect(sanitizeAuthorityGraphState({ graph: 'bad' })).toEqual({
      graph: { nodes: [], edges: [] },
      mutationHistory: [],
    })
  })

  it('hydrates canonical graph state and advances it without changing market or cover', () => {
    const fallback = createStartingState()
    const raw = {
      ...fallback,
      authorityGraphState: createAuthorityGraphState(),
      legitimacy: {
        sanctionLevel: 'sanctioned' as const,
        operationalCoverLevel: 'deniable' as const,
        institutionalLegitimacy: 40,
        publicTrust: 40,
        factionReputation: {},
      },
    }
    const hydrated = hydrateGame(raw, fallback)
    const marketBefore = structuredClone(hydrated.market)
    const coverBefore = hydrated.legitimacy?.operationalCoverLevel
    const graphBeforeNegotiation = structuredClone(hydrated.authorityGraphState)
    const negotiation = resolvePersistedAuthorityNegotiation(hydrated, {
      actorNodeId: 'agency-core',
      counterpartyNodeId: 'regional-office',
      channel: 'permission',
      asOfWeek: hydrated.week,
      stance: 'cooperate',
      offerStrength: 55,
    })

    const next = advanceWeek(hydrated, 1_700_000_000_000)

    expect(negotiation.outcome).toBe('partial_cooperation')
    expect(hydrated.authorityGraphState).toEqual(graphBeforeNegotiation)
    expect(next.authorityGraphState?.mutationHistory).toHaveLength(1)
    expect(next.authorityGraphState?.lastMutationWeek).toBe(next.week)
    expect(next.legitimacy?.operationalCoverLevel).toBe(coverBefore)
    expect(next.market.access).toEqual(marketBefore.access)
  })
})
