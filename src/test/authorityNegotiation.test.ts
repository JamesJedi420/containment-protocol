import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { AuthorityBargainingOutcome, AuthorityNegotiationRequest } from '../domain/authorityNegotiation'
import { resolveAuthorityNegotiation } from '../domain/authorityNegotiation'
import type { AuthorityGraph, AuthorityGraphEdge, AuthorityGraphNode } from '../domain/authorityGraph'
import {
  authorityGraphTokensContainFranchiseReferences,
  collectAuthorityGraphTokens,
} from '../domain/authorityGraph'

function provenance(sourceTag: string) {
  return { sourceTag }
}

function node(
  overrides: Partial<AuthorityGraphNode> & Pick<AuthorityGraphNode, 'id' | 'nodeType' | 'label'>
): AuthorityGraphNode {
  return {
    id: overrides.id,
    nodeType: overrides.nodeType,
    label: overrides.label,
    aliases: overrides.aliases,
    factionClass: overrides.factionClass,
    linkedFactionIds: overrides.linkedFactionIds,
    linkedPopulationIds: overrides.linkedPopulationIds,
    linkedDepartmentIds: overrides.linkedDepartmentIds,
    linkedSiteIds: overrides.linkedSiteIds,
    metadata: overrides.metadata,
  }
}

function edge(
  overrides: Partial<AuthorityGraphEdge> & Pick<AuthorityGraphEdge, 'id' | 'kind' | 'fromNodeId' | 'toNodeId'>
): AuthorityGraphEdge {
  return {
    status: 'current',
    sourceConfidence: 'verified',
    ...overrides,
    provenance: overrides.provenance ?? provenance('field_report'),
  }
}

function negotiation(
  overrides: Partial<AuthorityNegotiationRequest> &
    Pick<AuthorityNegotiationRequest, 'actorNodeId' | 'counterpartyNodeId' | 'channel' | 'stance'>
): AuthorityNegotiationRequest {
  return {
    asOfWeek: 10,
    ...overrides,
  }
}

function channelMagnitude(
  consequences: readonly { channel: string; magnitude: number }[],
  channel: string
) {
  return consequences
    .filter((item) => item.channel === channel)
    .reduce((sum, item) => sum + item.magnitude, 0)
}

describe('authorityNegotiation slice 2 (SPE-788)', () => {
  it('1. dependency + cooperate produces partial_cooperation and improves effective consequence', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
        node({ id: 'inst-partner', nodeType: 'institution', label: 'Regional Oversight Institute' }),
      ],
      edges: [
        edge({
          id: 'dep-1',
          kind: 'dependency',
          fromNodeId: 'agency-core',
          toNodeId: 'inst-partner',
          sourceConfidence: 'verified',
          strength: 70,
        }),
      ],
    }

    const request = negotiation({
      actorNodeId: 'agency-core',
      counterpartyNodeId: 'inst-partner',
      channel: 'permission',
      stance: 'cooperate',
      offerStrength: 55,
    })

    const result = resolveAuthorityNegotiation(graph, request)

    expect(result.outcome).toBe('partial_cooperation')
    expect(result.baselineConsequences.length).toBeGreaterThan(0)
    const baselineMag = channelMagnitude(result.baselineConsequences, 'permission')
    const effectiveMag = channelMagnitude(result.effectiveConsequences, 'permission')
    expect(effectiveMag).toBeGreaterThan(baselineMag)
  })

  it('2. rivalry + extract_concession with low concession cost produces delayed_retaliation', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'faction-a', nodeType: 'faction', label: 'North Archive Bloc' }),
        node({ id: 'faction-b', nodeType: 'faction', label: 'Perimeter Security Bloc' }),
      ],
      edges: [
        edge({
          id: 'riv-1',
          kind: 'rivalry',
          fromNodeId: 'faction-a',
          toNodeId: 'faction-b',
          strength: 80,
          volatility: 45,
        }),
      ],
    }

    const result = resolveAuthorityNegotiation(
      graph,
      negotiation({
        actorNodeId: 'faction-a',
        counterpartyNodeId: 'faction-b',
        channel: 'hostility',
        stance: 'extract_concession',
        concessionCost: 20,
        offerStrength: 55,
      })
    )

    expect(result.outcome).toBe('delayed_retaliation')
    expect(result.retaliationDueWeek).toBeGreaterThan(10)
    expect(result.retaliationDueWeek).toBeLessThanOrEqual(18)
    expect(result.delayed).toBe(true)
  })

  it('3. block_procedure on permission produces procedural_block', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
        node({ id: 'faction-a', nodeType: 'faction', label: 'Archive Bloc' }),
      ],
      edges: [
        edge({
          id: 'all-1',
          kind: 'alliance',
          fromNodeId: 'agency-core',
          toNodeId: 'faction-a',
        }),
      ],
    }

    const result = resolveAuthorityNegotiation(
      graph,
      negotiation({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'faction-a',
        channel: 'permission',
        stance: 'block_procedure',
      })
    )

    expect(result.outcome).toBe('procedural_block')
    expect(
      result.effectiveConsequences.some(
        (item) => item.channel === 'permission' && item.effect === 'deny'
      )
    ).toBe(true)
  })

  it('4. hidden agenda or information gate context produces agenda_dilution', () => {
    const hiddenGraph: AuthorityGraph = {
      nodes: [
        node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
        node({ id: 'net-veil', nodeType: 'hidden_network', label: 'Veil Broker Network' }),
      ],
      edges: [
        edge({
          id: 'hid-1',
          kind: 'hidden_agenda',
          fromNodeId: 'agency-core',
          toNodeId: 'net-veil',
          status: 'hidden',
          hiddenUntilWeek: 12,
        }),
      ],
    }

    const hiddenResult = resolveAuthorityNegotiation(
      hiddenGraph,
      negotiation({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'net-veil',
        channel: 'information_flow',
        stance: 'cooperate',
        offerStrength: 55,
        asOfWeek: 8,
      })
    )

    expect(hiddenResult.outcome).toBe('agenda_dilution')

    const gateGraph: AuthorityGraph = {
      nodes: [
        node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
        node({ id: 'inst-gate', nodeType: 'institution', label: 'Records Gate Institute' }),
      ],
      edges: [
        edge({
          id: 'gate-1',
          kind: 'information_gate',
          fromNodeId: 'inst-gate',
          toNodeId: 'agency-core',
          strength: 60,
        }),
      ],
    }

    const gateResult = resolveAuthorityNegotiation(
      gateGraph,
      negotiation({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'inst-gate',
        channel: 'information_flow',
        stance: 'cooperate',
        offerStrength: 55,
      })
    )

    expect(gateResult.outcome).toBe('agenda_dilution')
  })

  it('5. shared authority or contradicted baseline produces grudging_alignment', () => {
    const sharedGraph: AuthorityGraph = {
      nodes: [
        node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
        node({ id: 'regime-host', nodeType: 'external_regime', label: 'Host Perimeter Authority' }),
      ],
      edges: [
        edge({
          id: 'shared-1',
          kind: 'shared_authority',
          fromNodeId: 'agency-core',
          toNodeId: 'regime-host',
          strength: 70,
        }),
      ],
    }

    const sharedResult = resolveAuthorityNegotiation(
      sharedGraph,
      negotiation({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'regime-host',
        channel: 'permission',
        stance: 'cooperate',
        offerStrength: 55,
      })
    )

    expect(sharedResult.outcome).toBe('grudging_alignment')

    const contradictionGraph: AuthorityGraph = {
      nodes: [
        node({ id: 'faction-a', nodeType: 'faction', label: 'Archive Bloc' }),
        node({ id: 'faction-b', nodeType: 'faction', label: 'Security Bloc' }),
      ],
      edges: [
        edge({
          id: 'front-1',
          kind: 'front',
          fromNodeId: 'faction-a',
          toNodeId: 'faction-b',
          sourceConfidence: 'verified',
        }),
        edge({
          id: 'all-1',
          kind: 'alliance',
          fromNodeId: 'faction-a',
          toNodeId: 'faction-b',
          sourceConfidence: 'rumor',
        }),
      ],
    }

    const contradictionResult = resolveAuthorityNegotiation(
      contradictionGraph,
      negotiation({
        actorNodeId: 'faction-a',
        counterpartyNodeId: 'faction-b',
        channel: 'permission',
        stance: 'cooperate',
        offerStrength: 55,
      })
    )

    expect(contradictionResult.outcome).toBe('grudging_alignment')
    expect(contradictionResult.contradicted).toBe(true)
  })

  it('6. high offer plus weak baseline produces symbolic_concession', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
        node({ id: 'patron-desk', nodeType: 'patron', label: 'Desk Liaison Patron' }),
      ],
      edges: [
        edge({
          id: 'outdated-1',
          kind: 'alliance',
          fromNodeId: 'agency-core',
          toNodeId: 'patron-desk',
          status: 'outdated',
        }),
      ],
    }

    const result = resolveAuthorityNegotiation(
      graph,
      negotiation({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'patron-desk',
        channel: 'aid',
        stance: 'cooperate',
        offerStrength: 60,
      })
    )

    expect(result.baselineConsequences).toEqual([])
    expect(result.outcome).toBe('symbolic_concession')
    expect(result.effectiveConsequences.some((item) => item.effect === 'grant')).toBe(true)
  })

  it('7. unknown counterparty produces safe outcome without unrelated baseline consequences', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'faction-a', nodeType: 'faction', label: 'Archive Bloc' }),
        node({ id: 'faction-b', nodeType: 'faction', label: 'Security Bloc' }),
      ],
      edges: [
        edge({
          id: 'riv-1',
          kind: 'rivalry',
          fromNodeId: 'faction-a',
          toNodeId: 'faction-b',
        }),
      ],
    }

    const result = resolveAuthorityNegotiation(
      graph,
      negotiation({
        actorNodeId: 'faction-a',
        counterpartyNodeId: 'stale-alias-typo',
        channel: 'hostility',
        stance: 'cooperate',
      })
    )

    expect(result.outcome).toBe('procedural_block')
    expect(result.baselineConsequences).toEqual([])
    expect(result.effectiveConsequences.every((item) => item.edgeIds.length === 0)).toBe(true)
  })

  it('8. same inputs produce identical result', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'faction-a', nodeType: 'faction', label: 'Archive Bloc' }),
        node({ id: 'faction-b', nodeType: 'faction', label: 'Security Bloc' }),
      ],
      edges: [
        edge({
          id: 'riv-1',
          kind: 'rivalry',
          fromNodeId: 'faction-a',
          toNodeId: 'faction-b',
        }),
      ],
    }

    const request = negotiation({
      actorNodeId: 'faction-a',
      counterpartyNodeId: 'faction-b',
      channel: 'hostility',
      stance: 'extract_concession',
      concessionCost: 15,
    })

    expect(resolveAuthorityNegotiation(graph, request)).toEqual(
      resolveAuthorityNegotiation(graph, request)
    )
  })

  it('9. graph and request are not mutated', () => {
    const graph: AuthorityGraph = structuredClone({
      nodes: [node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' })],
      edges: [],
    })
    const graphBefore = structuredClone(graph)
    const request = negotiation({
      actorNodeId: 'agency-core',
      counterpartyNodeId: 'agency-core',
      channel: 'aid',
      stance: 'symbolic_only',
    })
    const requestBefore = structuredClone(request)

    resolveAuthorityNegotiation(graph, request)

    expect(graph).toEqual(graphBefore)
    expect(request).toEqual(requestBefore)
  })

  it('10. module does not import GameState, mission routing, advanceWeek, React, or out-of-scope domains', () => {
    const source = readFileSync(resolve('src/domain/authorityNegotiation.ts'), 'utf8')

    expect(source).not.toMatch(/from ['"]\.\/models['"]/)
    expect(source).not.toMatch(/from ['"]\.\/missionIntakeRouting['"]/)
    expect(source).not.toMatch(/from ['"]\.\/sim\/advanceWeek['"]/)
    expect(source).not.toMatch(/from ['"]react/)
  })

  it('11. token/franchise lint using graph fixtures', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
        node({ id: 'inst-partner', nodeType: 'institution', label: 'Regional Oversight Institute' }),
      ],
      edges: [
        edge({
          id: 'dep-1',
          kind: 'dependency',
          fromNodeId: 'agency-core',
          toNodeId: 'inst-partner',
        }),
      ],
    }

    const tokens = collectAuthorityGraphTokens(graph)
    expect(authorityGraphTokensContainFranchiseReferences(tokens)).toBe(false)

    const result = resolveAuthorityNegotiation(
      graph,
      negotiation({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'inst-partner',
        channel: 'permission',
        stance: 'cooperate',
      })
    )

    expect(
      authorityGraphTokensContainFranchiseReferences([
        ...result.reasonCodes,
        ...result.adjustments.map((item) => item.reasonCode),
      ])
    ).toBe(false)
  })

  it('12. each AuthorityBargainingOutcome enum value is covered at least once', () => {
    const scenarios: Array<{ label: string; outcome: AuthorityBargainingOutcome; run: () => AuthorityBargainingOutcome }> = [
      {
        label: 'partial_cooperation',
        outcome: 'partial_cooperation',
        run: () =>
          resolveAuthorityNegotiation(
            {
              nodes: [
                node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
                node({ id: 'inst-partner', nodeType: 'institution', label: 'Regional Partner' }),
              ],
              edges: [
                edge({
                  id: 'dep-1',
                  kind: 'dependency',
                  fromNodeId: 'agency-core',
                  toNodeId: 'inst-partner',
                  strength: 70,
                }),
              ],
            },
            negotiation({
              actorNodeId: 'agency-core',
              counterpartyNodeId: 'inst-partner',
              channel: 'permission',
              stance: 'cooperate',
              offerStrength: 55,
            })
          ).outcome,
      },
      {
        label: 'symbolic_concession',
        outcome: 'symbolic_concession',
        run: () =>
          resolveAuthorityNegotiation(
            {
              nodes: [
                node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
                node({ id: 'patron-desk', nodeType: 'patron', label: 'Desk Patron' }),
              ],
              edges: [],
            },
            negotiation({
              actorNodeId: 'agency-core',
              counterpartyNodeId: 'patron-desk',
              channel: 'aid',
              stance: 'symbolic_only',
              offerStrength: 60,
            })
          ).outcome,
      },
      {
        label: 'grudging_alignment',
        outcome: 'grudging_alignment',
        run: () =>
          resolveAuthorityNegotiation(
            {
              nodes: [
                node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
                node({ id: 'regime-host', nodeType: 'external_regime', label: 'Host Authority' }),
              ],
              edges: [
                edge({
                  id: 'shared-1',
                  kind: 'shared_authority',
                  fromNodeId: 'agency-core',
                  toNodeId: 'regime-host',
                }),
              ],
            },
            negotiation({
              actorNodeId: 'agency-core',
              counterpartyNodeId: 'regime-host',
              channel: 'permission',
              stance: 'cooperate',
              offerStrength: 55,
            })
          ).outcome,
      },
      {
        label: 'procedural_block',
        outcome: 'procedural_block',
        run: () =>
          resolveAuthorityNegotiation(
            {
              nodes: [
                node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
                node({ id: 'faction-a', nodeType: 'faction', label: 'Archive Bloc' }),
              ],
              edges: [],
            },
            negotiation({
              actorNodeId: 'agency-core',
              counterpartyNodeId: 'faction-a',
              channel: 'permission',
              stance: 'block_procedure',
            })
          ).outcome,
      },
      {
        label: 'delayed_retaliation',
        outcome: 'delayed_retaliation',
        run: () =>
          resolveAuthorityNegotiation(
            {
              nodes: [
                node({ id: 'faction-a', nodeType: 'faction', label: 'Archive Bloc' }),
                node({ id: 'faction-b', nodeType: 'faction', label: 'Security Bloc' }),
              ],
              edges: [
                edge({
                  id: 'riv-1',
                  kind: 'rivalry',
                  fromNodeId: 'faction-a',
                  toNodeId: 'faction-b',
                  volatility: 30,
                }),
              ],
            },
            negotiation({
              actorNodeId: 'faction-a',
              counterpartyNodeId: 'faction-b',
              channel: 'hostility',
              stance: 'extract_concession',
              concessionCost: 10,
            })
          ).outcome,
      },
      {
        label: 'agenda_dilution',
        outcome: 'agenda_dilution',
        run: () =>
          resolveAuthorityNegotiation(
            {
              nodes: [
                node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
                node({ id: 'net-veil', nodeType: 'hidden_network', label: 'Veil Network' }),
              ],
              edges: [
                edge({
                  id: 'hid-1',
                  kind: 'hidden_agenda',
                  fromNodeId: 'agency-core',
                  toNodeId: 'net-veil',
                  status: 'hidden',
                  hiddenUntilWeek: 12,
                }),
              ],
            },
            negotiation({
              actorNodeId: 'agency-core',
              counterpartyNodeId: 'net-veil',
              channel: 'information_flow',
              stance: 'stall',
              asOfWeek: 8,
            })
          ).outcome,
      },
    ]

    for (const scenario of scenarios) {
      expect(scenario.run(), scenario.label).toBe(scenario.outcome)
    }
  })

  it('13. effective consequences are deterministic and sorted', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'faction-a', nodeType: 'faction', label: 'Archive Bloc' }),
        node({ id: 'faction-b', nodeType: 'faction', label: 'Security Bloc' }),
        node({ id: 'faction-c', nodeType: 'faction', label: 'Logistics Bloc' }),
      ],
      edges: [
        edge({
          id: 'all-ab',
          kind: 'alliance',
          fromNodeId: 'faction-a',
          toNodeId: 'faction-b',
        }),
        edge({
          id: 'riv-ac',
          kind: 'rivalry',
          fromNodeId: 'faction-a',
          toNodeId: 'faction-c',
        }),
      ],
    }

    const request = negotiation({
      actorNodeId: 'faction-a',
      counterpartyNodeId: 'faction-b',
      channel: 'aid',
      stance: 'cooperate',
      offerStrength: 55,
    })

    const first = resolveAuthorityNegotiation(graph, request)
    const second = resolveAuthorityNegotiation(graph, request)

    expect(first.effectiveConsequences).toEqual(second.effectiveConsequences)

    const channels = first.effectiveConsequences.map((item) => item.channel)
    expect(channels).toEqual([...channels].sort((a, b) => a.localeCompare(b)))
  })

  it('14. contradicted and delayed flags propagate from baseline into result', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
        node({ id: 'net-veil', nodeType: 'hidden_network', label: 'Veil Broker Network' }),
      ],
      edges: [
        edge({
          id: 'hid-1',
          kind: 'hidden_agenda',
          fromNodeId: 'agency-core',
          toNodeId: 'net-veil',
          status: 'hidden',
          hiddenUntilWeek: 14,
          sourceConfidence: 'hostile_dossier',
        }),
      ],
    }

    const result = resolveAuthorityNegotiation(
      graph,
      negotiation({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'net-veil',
        channel: 'information_flow',
        stance: 'cooperate',
        offerStrength: 55,
        asOfWeek: 8,
      })
    )

    expect(result.delayed).toBe(true)
    expect(result.baselineConsequences.some((item) => item.delayed)).toBe(true)

    const contradictedGraph: AuthorityGraph = {
      nodes: [
        node({ id: 'faction-a', nodeType: 'faction', label: 'Archive Bloc' }),
        node({ id: 'faction-b', nodeType: 'faction', label: 'Security Bloc' }),
      ],
      edges: [
        edge({
          id: 'front-1',
          kind: 'front',
          fromNodeId: 'faction-a',
          toNodeId: 'faction-b',
          sourceConfidence: 'verified',
        }),
        edge({
          id: 'all-1',
          kind: 'alliance',
          fromNodeId: 'faction-a',
          toNodeId: 'faction-b',
          sourceConfidence: 'rumor',
        }),
      ],
    }

    const contradicted = resolveAuthorityNegotiation(
      contradictedGraph,
      negotiation({
        actorNodeId: 'faction-a',
        counterpartyNodeId: 'faction-b',
        channel: 'permission',
        stance: 'cooperate',
        offerStrength: 55,
      })
    )

    expect(contradicted.contradicted).toBe(true)
    expect(contradicted.baselineConsequences.some((item) => item.contradicted)).toBe(true)
  })

  it('15. pair hints respect pressureChannels for the requested channel', () => {
    const nodes = [
      node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
      node({ id: 'regime-host', nodeType: 'external_regime', label: 'Host Perimeter Authority' }),
      node({ id: 'net-veil', nodeType: 'hidden_network', label: 'Veil Network' }),
    ]

    const hiddenAgendaGraph: AuthorityGraph = {
      nodes,
      edges: [
        edge({
          id: 'hid-1',
          kind: 'hidden_agenda',
          fromNodeId: 'agency-core',
          toNodeId: 'net-veil',
          pressureChannels: ['information_flow'],
        }),
      ],
    }

    const hiddenWrongChannel = resolveAuthorityNegotiation(
      hiddenAgendaGraph,
      negotiation({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'net-veil',
        channel: 'permission',
        stance: 'cooperate',
        offerStrength: 55,
      })
    )

    expect(hiddenWrongChannel.outcome).not.toBe('agenda_dilution')
    expect(hiddenWrongChannel.reasonCodes).not.toContain('negotiation_agenda_pressure')

    const hiddenMatchingChannel = resolveAuthorityNegotiation(
      hiddenAgendaGraph,
      negotiation({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'net-veil',
        channel: 'information_flow',
        stance: 'cooperate',
        offerStrength: 55,
      })
    )

    expect(hiddenMatchingChannel.outcome).toBe('agenda_dilution')
    expect(hiddenMatchingChannel.reasonCodes).toContain('negotiation_agenda_pressure')

    const sharedAuthorityGraph: AuthorityGraph = {
      nodes,
      edges: [
        edge({
          id: 'shared-1',
          kind: 'shared_authority',
          fromNodeId: 'agency-core',
          toNodeId: 'regime-host',
          pressureChannels: ['secrecy'],
        }),
      ],
    }

    const sharedWrongChannel = resolveAuthorityNegotiation(
      sharedAuthorityGraph,
      negotiation({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'regime-host',
        channel: 'aid',
        stance: 'cooperate',
        offerStrength: 55,
      })
    )

    expect(sharedWrongChannel.outcome).not.toBe('grudging_alignment')
    expect(sharedWrongChannel.reasonCodes).not.toContain('negotiation_shared_authority')

    const sharedMatchingChannel = resolveAuthorityNegotiation(
      sharedAuthorityGraph,
      negotiation({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'regime-host',
        channel: 'secrecy',
        stance: 'cooperate',
        offerStrength: 55,
      })
    )

    expect(sharedMatchingChannel.outcome).toBe('grudging_alignment')
    expect(sharedMatchingChannel.reasonCodes).toContain('negotiation_shared_authority')
  })

  it('16. agenda dilution without aid grant does not emit negative grant consequences', () => {
    const result = resolveAuthorityNegotiation(
      {
        nodes: [
          node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
          node({ id: 'faction-a', nodeType: 'faction', label: 'Archive Bloc' }),
        ],
        edges: [],
      },
      negotiation({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'faction-a',
        channel: 'permission',
        stance: 'stall',
      })
    )

    expect(result.outcome).toBe('agenda_dilution')
    expect(
      result.effectiveConsequences.some(
        (item) => item.channel === 'aid' && item.effect === 'grant' && item.magnitude < 0
      )
    ).toBe(false)

    const crossChannelDelay = result.effectiveConsequences.find(
      (item) => item.channel === 'information_flow' && item.effect === 'delay'
    )

    expect(crossChannelDelay).toBeDefined()
    expect(crossChannelDelay?.edgeIds).toEqual([])
  })

  it('15b. new effective consequences inherit edgeIds only from same-channel baseline', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
        node({ id: 'inst-partner', nodeType: 'institution', label: 'Regional Partner' }),
      ],
      edges: [
        edge({
          id: 'dep-1',
          kind: 'dependency',
          fromNodeId: 'agency-core',
          toNodeId: 'inst-partner',
          strength: 70,
        }),
      ],
    }

    const result = resolveAuthorityNegotiation(
      graph,
      negotiation({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'inst-partner',
        channel: 'permission',
        stance: 'cooperate',
        offerStrength: 55,
      })
    )

    const permissionConsequence = result.effectiveConsequences.find(
      (item) => item.channel === 'permission'
    )

    expect(permissionConsequence?.edgeIds).toEqual(['dep-1'])

    const aidGrant = result.effectiveConsequences.find(
      (item) => item.channel === 'aid' && item.effect === 'grant'
    )

    if (aidGrant) {
      expect(aidGrant.edgeIds).toEqual([])
    }
  })

  it('17. stall agenda dilution sets top-level delayed when effective consequences delay', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
        node({ id: 'net-veil', nodeType: 'hidden_network', label: 'Veil Network' }),
      ],
      edges: [
        edge({
          id: 'hid-1',
          kind: 'hidden_agenda',
          fromNodeId: 'agency-core',
          toNodeId: 'net-veil',
          status: 'hidden',
          hiddenUntilWeek: 12,
          pressureChannels: ['information_flow'],
        }),
      ],
    }

    const result = resolveAuthorityNegotiation(
      graph,
      negotiation({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'net-veil',
        channel: 'permission',
        stance: 'stall',
        asOfWeek: 8,
      })
    )

    expect(result.outcome).toBe('agenda_dilution')
    expect(result.delayed).toBe(true)
    expect(result.effectiveConsequences.some((item) => item.effect === 'delay')).toBe(true)
  })

  it('18. unrelated graph contradictions do not force grudging alignment', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'faction-a', nodeType: 'faction', label: 'Archive Bloc' }),
        node({ id: 'faction-b', nodeType: 'faction', label: 'Security Bloc' }),
        node({ id: 'faction-c', nodeType: 'faction', label: 'Logistics Bloc' }),
      ],
      edges: [
        edge({
          id: 'front-ab',
          kind: 'front',
          fromNodeId: 'faction-a',
          toNodeId: 'faction-b',
          sourceConfidence: 'verified',
        }),
        edge({
          id: 'all-ab',
          kind: 'alliance',
          fromNodeId: 'faction-a',
          toNodeId: 'faction-b',
          sourceConfidence: 'rumor',
        }),
        edge({
          id: 'dep-ac',
          kind: 'dependency',
          fromNodeId: 'faction-a',
          toNodeId: 'faction-c',
          strength: 70,
        }),
      ],
    }

    const result = resolveAuthorityNegotiation(
      graph,
      negotiation({
        actorNodeId: 'faction-a',
        counterpartyNodeId: 'faction-c',
        channel: 'permission',
        stance: 'cooperate',
        offerStrength: 55,
      })
    )

    expect(result.outcome).toBe('partial_cooperation')
    expect(result.contradicted).toBe(false)
  })
})
