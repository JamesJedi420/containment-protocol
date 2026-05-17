import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type {
  AuthorityGraph,
  AuthorityGraphEdge,
  AuthorityGraphNode,
  AuthorityGraphQuery,
} from '../domain/authorityGraph'
import {
  authorityGraphTokensContainFranchiseReferences,
  collectAuthorityGraphTokens,
  normalizeAuthorityNodeId,
  resolveAuthorityGraphConsequences,
  validateAuthorityGraph,
} from '../domain/authorityGraph'

function provenance(sourceTag: string) {
  return { sourceTag }
}

function node(overrides: Partial<AuthorityGraphNode> & Pick<AuthorityGraphNode, 'id' | 'nodeType' | 'label'>): AuthorityGraphNode {
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

function edge(overrides: Partial<AuthorityGraphEdge> & Pick<AuthorityGraphEdge, 'id' | 'kind' | 'fromNodeId' | 'toNodeId'>): AuthorityGraphEdge {
  return {
    status: 'current',
    sourceConfidence: 'verified',
    ...overrides,
    provenance: overrides.provenance ?? provenance('field_report'),
  }
}

function query(overrides: Partial<AuthorityGraphQuery> & Pick<AuthorityGraphQuery, 'actorNodeId' | 'channel'>): AuthorityGraphQuery {
  return {
    asOfWeek: 10,
    ...overrides,
  }
}

describe('authorityGraph slice 1 (SPE-788)', () => {
  it('1. dependency edge changes mission access or permission', () => {
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
          sourceConfidence: 'rumor',
        }),
      ],
    }

    const access = resolveAuthorityGraphConsequences(
      graph,
      query({ actorNodeId: 'agency-core', counterpartyNodeId: 'inst-partner', channel: 'mission_access' })
    )

    expect(access.length).toBeGreaterThan(0)
    expect(access[0]?.channel).toBe('mission_access')
    expect(['deny', 'delay']).toContain(access[0]?.effect)

    const permission = resolveAuthorityGraphConsequences(
      graph,
      query({ actorNodeId: 'agency-core', counterpartyNodeId: 'inst-partner', channel: 'permission' })
    )

    expect(permission.some((item) => item.reasonCode === 'dependency_permission')).toBe(true)
  })

  it('2. rivalry edge increases hostility or blocks aid', () => {
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
        }),
      ],
    }

    const hostility = resolveAuthorityGraphConsequences(
      graph,
      query({ actorNodeId: 'faction-a', counterpartyNodeId: 'faction-b', channel: 'hostility' })
    )

    expect(hostility[0]?.magnitude).toBeGreaterThan(0)

    const aid = resolveAuthorityGraphConsequences(
      graph,
      query({ actorNodeId: 'faction-a', counterpartyNodeId: 'faction-b', channel: 'aid' })
    )

    expect(aid[0]?.effect).toBe('deny')
    expect(aid[0]?.reasonCode).toBe('rivalry_blocks_aid')
  })

  it('3. hidden agenda / hidden network edge produces delayed or contradicted consequences', () => {
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
          hiddenUntilWeek: 12,
          sourceConfidence: 'hostile_dossier',
        }),
      ],
    }

    const early = resolveAuthorityGraphConsequences(
      graph,
      query({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'net-veil',
        channel: 'information_flow',
        asOfWeek: 8,
      })
    )

    expect(early.some((item) => item.delayed && item.effect === 'delay')).toBe(true)

    const late = resolveAuthorityGraphConsequences(
      graph,
      query({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'net-veil',
        channel: 'information_flow',
        asOfWeek: 14,
      })
    )

    expect(late.some((item) => !item.delayed)).toBe(true)
    expect(late.some((item) => item.confidenceApplied === 'hostile_dossier')).toBe(true)
  })

  it('4. proxy-representation edge routes consequence through represented constituency or bloc', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'proxy-liaison', nodeType: 'proxy', label: 'District Liaison Proxy' }),
        node({ id: 'constituency-ward', nodeType: 'constituency', label: 'Industrial Ward Bloc' }),
        node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
      ],
      edges: [
        edge({
          id: 'proxy-1',
          kind: 'proxy_representation',
          fromNodeId: 'proxy-liaison',
          toNodeId: 'agency-core',
          representsNodeId: 'constituency-ward',
        }),
      ],
    }

    const consequences = resolveAuthorityGraphConsequences(
      graph,
      query({
        actorNodeId: 'proxy-liaison',
        counterpartyNodeId: 'agency-core',
        channel: 'permission',
      })
    )

    expect(consequences.some((item) => item.reasonCode === 'proxy_routes_constituency')).toBe(true)
  })

  it('5. shared-authority edge changes permission, secrecy, or local compliance', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
        node({ id: 'regime-host', nodeType: 'external_regime', label: 'Host Perimeter Authority' }),
        node({ id: 'site-alpha', nodeType: 'site', label: 'Co-managed Site Alpha' }),
      ],
      edges: [
        edge({
          id: 'shared-1',
          kind: 'shared_authority',
          fromNodeId: 'agency-core',
          toNodeId: 'site-alpha',
          strength: 70,
        }),
        edge({
          id: 'shared-2',
          kind: 'shared_authority',
          fromNodeId: 'regime-host',
          toNodeId: 'site-alpha',
          strength: 70,
        }),
      ],
    }

    const permission = resolveAuthorityGraphConsequences(
      graph,
      query({ actorNodeId: 'agency-core', counterpartyNodeId: 'site-alpha', channel: 'permission' })
    )
    const secrecy = resolveAuthorityGraphConsequences(
      graph,
      query({ actorNodeId: 'agency-core', counterpartyNodeId: 'site-alpha', channel: 'secrecy' })
    )
    const compliance = resolveAuthorityGraphConsequences(
      graph,
      query({ actorNodeId: 'agency-core', counterpartyNodeId: 'site-alpha', channel: 'local_compliance' })
    )

    expect(permission.some((item) => item.reasonCode === 'shared_authority_permission')).toBe(true)
    expect(secrecy.some((item) => item.reasonCode === 'shared_authority_secrecy')).toBe(true)
    expect(compliance.some((item) => item.reasonCode === 'shared_authority_compliance')).toBe(true)
  })

  it('6. internal splinter/front edge makes an organization nonmonolithic', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'faction-umbrella', nodeType: 'faction', label: 'Unified Research Coalition' }),
        node({ id: 'cell-pragmatic', nodeType: 'faction', label: 'Pragmatic Operations Cell' }),
      ],
      edges: [
        edge({
          id: 'spl-1',
          kind: 'splinter',
          fromNodeId: 'cell-pragmatic',
          toNodeId: 'faction-umbrella',
        }),
        edge({
          id: 'front-1',
          kind: 'front',
          fromNodeId: 'faction-umbrella',
          toNodeId: 'cell-pragmatic',
        }),
      ],
    }

    const permission = resolveAuthorityGraphConsequences(
      graph,
      query({ actorNodeId: 'faction-umbrella', channel: 'permission' })
    )

    expect(permission.some((item) => item.reasonCode.includes('nonmonolithic'))).toBe(true)
  })

  it('7. alias/provenance/confidence fields prevent treating the graph as perfect truth', () => {
    const nodes = [
      node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
      node({ id: 'inst-partner', nodeType: 'institution', label: 'Regional Oversight Institute' }),
    ]

    const rumorGraph: AuthorityGraph = {
      nodes,
      edges: [
        edge({
          id: 'dep-rumor',
          kind: 'dependency',
          fromNodeId: 'agency-core',
          toNodeId: 'inst-partner',
          sourceConfidence: 'rumor',
          strength: 80,
        }),
      ],
    }

    const verifiedGraph: AuthorityGraph = {
      nodes,
      edges: [
        edge({
          id: 'dep-verified',
          kind: 'dependency',
          fromNodeId: 'agency-core',
          toNodeId: 'inst-partner',
          sourceConfidence: 'verified',
          strength: 80,
        }),
      ],
    }

    const rumorView = resolveAuthorityGraphConsequences(
      rumorGraph,
      query({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'inst-partner',
        channel: 'mission_access',
      })
    )

    const verifiedView = resolveAuthorityGraphConsequences(
      verifiedGraph,
      query({
        actorNodeId: 'agency-core',
        counterpartyNodeId: 'inst-partner',
        channel: 'mission_access',
      })
    )

    expect(rumorView[0]?.confidenceApplied).toBe('rumor')
    expect(verifiedView[0]?.confidenceApplied).toBe('verified')
    expect(Math.abs(verifiedView[0]?.magnitude ?? 0)).toBeGreaterThan(
      Math.abs(rumorView[0]?.magnitude ?? 0)
    )

    expect(validateAuthorityGraph(verifiedGraph).issues.some((issue) => issue.code === 'perfect_dossier_unlikely')).toBe(
      true
    )
  })

  it('8. conflicting current claims produce a contradiction flag', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'dept-a', nodeType: 'department', label: 'Records Directorate' }),
        node({ id: 'dept-b', nodeType: 'department', label: 'Field Operations Directorate' }),
        node({ id: 'dept-c', nodeType: 'department', label: 'Strategic Review Directorate' }),
      ],
      edges: [
        edge({
          id: 'sub-1',
          kind: 'subordination',
          fromNodeId: 'dept-a',
          toNodeId: 'dept-b',
          sourceConfidence: 'verified',
        }),
        edge({
          id: 'sub-2',
          kind: 'subordination',
          fromNodeId: 'dept-a',
          toNodeId: 'dept-c',
          sourceConfidence: 'probable',
        }),
      ],
    }

    const flags = resolveAuthorityGraphConsequences(
      graph,
      query({ actorNodeId: 'dept-a', channel: 'contradiction_flag' })
    )

    expect(flags.some((item) => item.channel === 'contradiction_flag')).toBe(true)
    expect(validateAuthorityGraph(graph).issues.some((issue) => issue.code === 'contradictory_current_claims')).toBe(
      true
    )
  })

  it('9. group sponsor can narrow to a specific patron without losing group context', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({
          id: 'sponsor-bloc',
          nodeType: 'sponsor_group',
          label: 'Industrial Patron Bloc',
          aliases: [{ aliasId: 'alias-bloc', label: 'Industrial Patron Bloc', confidence: 'probable' }],
        }),
        node({ id: 'patron-veldt', nodeType: 'patron', label: 'Patron Veldt' }),
        node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
      ],
      edges: [
        edge({
          id: 'patronage-1',
          kind: 'patronage',
          fromNodeId: 'sponsor-bloc',
          toNodeId: 'patron-veldt',
        }),
        edge({
          id: 'patronage-2',
          kind: 'patronage',
          fromNodeId: 'patron-veldt',
          toNodeId: 'agency-core',
        }),
      ],
    }

    expect(normalizeAuthorityNodeId(graph, 'alias-bloc')).toBe('sponsor-bloc')
    expect(normalizeAuthorityNodeId(graph, 'patron-veldt')).toBe('patron-veldt')

    const fromPatron = resolveAuthorityGraphConsequences(
      graph,
      query({ actorNodeId: 'patron-veldt', counterpartyNodeId: 'agency-core', channel: 'aid' })
    )

    expect(fromPatron.some((item) => item.reasonCode === 'patronage_aid')).toBe(true)
    expect(graph.nodes.some((item) => item.id === 'sponsor-bloc')).toBe(true)
  })

  it('10. deterministic sorting for equivalent edges/consequences', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'faction-a', nodeType: 'faction', label: 'Archive Bloc' }),
        node({ id: 'faction-b', nodeType: 'faction', label: 'Security Bloc' }),
      ],
      edges: [
        edge({
          id: 'z-edge',
          kind: 'rivalry',
          fromNodeId: 'faction-a',
          toNodeId: 'faction-b',
        }),
        edge({
          id: 'a-edge',
          kind: 'alliance',
          fromNodeId: 'faction-a',
          toNodeId: 'faction-b',
          status: 'outdated',
        }),
      ],
    }

    const q = query({ actorNodeId: 'faction-a', counterpartyNodeId: 'faction-b', channel: 'hostility' })
    const first = resolveAuthorityGraphConsequences(graph, q)
    const second = resolveAuthorityGraphConsequences(graph, q)

    expect(first).toEqual(second)
  })

  it('11. inputs are not mutated', () => {
    const graph: AuthorityGraph = structuredClone({
      nodes: [node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' })],
      edges: [],
    })
    const graphBefore = structuredClone(graph)
    const q = query({ actorNodeId: 'agency-core', channel: 'aid' })
    const qBefore = structuredClone(q)

    resolveAuthorityGraphConsequences(graph, q)

    expect(graph).toEqual(graphBefore)
    expect(q).toEqual(qBefore)
  })

  it('12. no source-specific faction names or lore strings', () => {
    const graph: AuthorityGraph = {
      nodes: [
        node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
        node({ id: 'faction-a', nodeType: 'faction', label: 'Regional Oversight Bloc' }),
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

    const tokens = collectAuthorityGraphTokens(graph)
    expect(authorityGraphTokensContainFranchiseReferences(tokens)).toBe(false)
  })

  it('13. module does not import GameState/UI/runtime mission modules', () => {
    const source = readFileSync(resolve('src/domain/authorityGraph.ts'), 'utf8')

    expect(source).not.toMatch(/from ['"]\.\/models['"]/)
    expect(source).not.toMatch(/from ['"]\.\/missionIntakeRouting['"]/)
    expect(source).not.toMatch(/from ['"]\.\/sim\/advanceWeek['"]/)
    expect(source).not.toMatch(/from ['"]react/)
  })

  it('14. validateAuthorityGraph happy path and core validation failures', () => {
    const valid: AuthorityGraph = {
      nodes: [
        node({ id: 'agency-core', nodeType: 'agency', label: 'Containment Directorate' }),
        node({ id: 'inst-partner', nodeType: 'institution', label: 'Regional Oversight Institute' }),
      ],
      edges: [
        edge({
          id: 'all-1',
          kind: 'alliance',
          fromNodeId: 'agency-core',
          toNodeId: 'inst-partner',
          sourceConfidence: 'probable',
        }),
      ],
    }

    expect(validateAuthorityGraph(valid).valid).toBe(true)

    const invalid: AuthorityGraph = {
      nodes: [
        node({ id: 'dup', nodeType: 'faction', label: 'Bloc A' }),
        node({ id: 'dup', nodeType: 'faction', label: 'Bloc B' }),
        node({ id: 'population-x', nodeType: 'population_group_reference', label: 'Assimilated Cohort' }),
      ],
      edges: [
        edge({
          id: 'dup-edge',
          kind: 'alliance',
          fromNodeId: 'dup',
          toNodeId: 'missing-node',
          provenance: { sourceTag: '' },
        }),
        edge({
          id: 'dup-edge',
          kind: 'proxy_representation',
          fromNodeId: 'population-x',
          toNodeId: 'dup',
        }),
        edge({
          id: 'cell-deferred',
          kind: 'cell',
          fromNodeId: 'dup',
          toNodeId: 'population-x',
          status: 'current',
        }),
        edge({
          id: 'pop-political',
          kind: 'alliance',
          fromNodeId: 'population-x',
          toNodeId: 'dup',
          status: 'current',
        }),
      ],
    }

    const validation = validateAuthorityGraph(invalid)
    expect(validation.valid).toBe(false)
    expect(validation.issues.some((issue) => issue.code === 'population_faction_collapse')).toBe(true)
    expect(validation.issues.some((issue) => issue.code === 'duplicate_node_id')).toBe(true)
    expect(validation.issues.some((issue) => issue.code === 'duplicate_edge_id')).toBe(true)
    expect(validation.issues.some((issue) => issue.code === 'unknown_to_node')).toBe(true)
    expect(validation.issues.some((issue) => issue.code === 'missing_provenance_source_tag')).toBe(true)
    expect(validation.issues.some((issue) => issue.code === 'missing_proxy_represents_node')).toBe(true)
    expect(validation.issues.some((issue) => issue.code === 'unmapped_relationship_kind')).toBe(true)
  })
})
