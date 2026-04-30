import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildSimulationMapInterface } from '../domain/simulationMapInterface'
import { buildAgencyOverview } from '../domain/strategicState'
import type { OperationEvent } from '../domain/models'

function makeEvent<TType extends OperationEvent['type']>(
  type: TType,
  payload: Extract<OperationEvent, { type: TType }>['payload']
): OperationEvent {
  const inferSource = () => {
    if (type.startsWith('assignment.')) return 'assignment'
    if (type.startsWith('case.')) return 'incident'
    if (type.startsWith('intel.')) return 'intel'
    if (type.startsWith('agent.')) return 'agent'
    if (type.startsWith('production.') || type.startsWith('market.')) return 'production'
    if (type.startsWith('faction.')) return 'faction'
    return 'system'
  }

  return {
    id: `evt-${type.replace(/\./g, '-')}-${payload.week}`,
    schemaVersion: 1,
    type,
    sourceSystem: inferSource() as OperationEvent['sourceSystem'],
    timestamp: `2042-01-${String(payload.week).padStart(2, '0')}T00:00:00.001Z`,
    payload,
  } as OperationEvent
}

describe('simulationMapInterface', () => {
  it('builds deterministic fallible social visibility from relationships, rumors, and faction pressure', () => {
    const state = createStartingState()
    state.agents.a_ava.relationships.a_kellan = 2
    state.agents.a_kellan.relationships.a_ava = -1
    state.agents.a_casey.relationships.a_eli = 2
    state.agents.a_eli.relationships.a_casey = 0
    state.relationshipHistory = [
      {
        week: 1,
        agentAId: 'a_ava',
        agentBId: 'a_mina',
        value: 1,
        modifiers: [],
        reason: 'external_event',
      },
    ]
    state.events = [
      makeEvent('faction.standing_changed', {
        week: 1,
        factionId: 'occult_networks',
        factionName: 'Occult Networks',
        delta: -12,
        standingBefore: 0,
        standingAfter: -12,
        reason: 'case.failed',
        caseId: 'case-001',
        caseTitle: 'Midnight Trace',
      }),
    ]
    state.cases['case-003'] = {
      ...state.cases['case-003'],
      stage: 4,
      deadlineRemaining: 1,
      tags: ['occult', 'cult', 'anomaly'],
    }

    const first = buildSimulationMapInterface(state)
    const second = buildSimulationMapInterface(state)

    expect(second).toEqual(first)
    expect(first.uncertaintySummary).toEqual(second.uncertaintySummary)
    expect(
      first.socialFacts.some(
        (fact) =>
          fact.kind === 'leverage' &&
          fact.visibility === 'contradicted' &&
          fact.errorState === 'contradicted'
      )
    ).toBe(true)
    expect(
      first.socialFacts.some(
        (fact) =>
          fact.kind === 'alliance' &&
          fact.visibility === 'reported' &&
          fact.fromSubjectId === 'agent:a_casey'
      )
    ).toBe(true)
    expect(first.socialFacts.some((fact) => fact.kind === 'rumor_path')).toBe(true)
    expect(
      first.socialFacts.some(
        (fact) =>
          fact.kind === 'pressure_link' &&
          fact.fromSubjectId === 'faction:occult_networks' &&
          fact.toSubjectId === 'agency:containment'
      )
    ).toBe(true)
    expect(first.uncertaintySummary.contradictionHotspots.length).toBeGreaterThan(0)
    expect(first.uncertaintySummary.falseReadingHotspots.length).toBeGreaterThan(0)
    expect(
      first.uncertaintySummary.warningTags.includes('scope:relationship:contradiction-hotspot')
    ).toBe(true)
    expect(first.uncertaintySummary.transitions.persistentlyContradictedHotspots.length).toBeGreaterThan(0)
    expect(first.uncertaintySummary.groupedCounts.bySignalCategory.contradiction).toBeGreaterThan(0)
    expect(first.uncertaintySummary.recommendations.topVerificationTargets.length).toBeGreaterThan(0)
    expect(
      first.uncertaintySummary.recommendations.topVerificationTargets[0]?.rationaleTags.includes('action:verify')
    ).toBe(true)
    expect(
      ['contradiction', 'route_uncertainty', 'low_confidence', 'false_reading', 'remap_instability']
    ).toContain(first.uncertaintySummary.triage.highestRiskCategory)
    expect(
      ['investigate_contradiction', 'verify_route', 'verify_social', 'monitor_remap']
    ).toContain(first.uncertaintySummary.triage.topActionType)
    expect(
      first.uncertaintySummary.triage.priorityPostureTags.includes(
        `posture:action:${first.uncertaintySummary.triage.topActionType}`
      )
    ).toBe(true)
    expect(['improving', 'stable', 'degrading']).toContain(
      first.uncertaintySummary.stabilityOutlook.uncertaintyTrend
    )
    expect(
      ['verification', 'monitoring', 'rerouting', 'social_follow_up']
    ).toContain(first.uncertaintySummary.stabilityOutlook.favoredOperationalPosture)
    expect(
      first.uncertaintySummary.stabilityOutlook.rationaleTags.includes(
        `outlook:posture:${first.uncertaintySummary.stabilityOutlook.favoredOperationalPosture}`
      )
    ).toBe(true)
    expect(first.uncertaintySummary.watchlistSnapshot.remainingUrgent.length).toBeGreaterThan(0)
    expect(
      first.uncertaintySummary.watchlistSnapshot.newlyEnteringUrgent.length +
        first.uncertaintySummary.watchlistSnapshot.remainingUrgent.length
    ).toBeGreaterThan(0)
    const firstUrgentWatchEntry =
      first.uncertaintySummary.watchlistSnapshot.newlyEnteringUrgent[0] ??
      first.uncertaintySummary.watchlistSnapshot.remainingUrgent[0]
    expect(
      firstUrgentWatchEntry?.rationaleTags.some((tag) => tag.startsWith('watchlist:status:'))
    ).toBe(true)
  })

  it('remaps world zones under responder absence and hostile dominance', () => {
    const state = createStartingState()

    for (const agent of Object.values(state.agents)) {
      agent.status = 'recovering'
      agent.assignment = { state: 'recovery', startedWeek: state.week }
    }

    state.agents.a_ava.status = 'active'
    state.agents.a_ava.assignment = { state: 'idle' }

    state.events = [
      makeEvent('faction.standing_changed', {
        week: 1,
        factionId: 'oversight',
        factionName: 'Oversight Bureau',
        delta: -10,
        standingBefore: 0,
        standingAfter: -10,
        reason: 'case.failed',
        caseId: 'case-001',
        caseTitle: 'Midnight Trace',
      }),
      makeEvent('faction.standing_changed', {
        week: 1,
        factionId: 'corporate_supply',
        factionName: 'Corporate Supply Chains',
        delta: -9,
        standingBefore: 0,
        standingAfter: -9,
        reason: 'case.failed',
        caseId: 'case-002',
        caseTitle: 'Dry Vault',
      }),
      makeEvent('faction.standing_changed', {
        week: 1,
        factionId: 'occult_networks',
        factionName: 'Occult Networks',
        delta: -11,
        standingBefore: 0,
        standingAfter: -11,
        reason: 'case.failed',
        caseId: 'case-003',
        caseTitle: 'Red Choir',
      }),
    ]

    state.cases['case-pressure-a'] = {
      ...state.cases['case-001'],
      id: 'case-pressure-a',
      title: 'Curfew Cascade',
      stage: 5,
      deadlineRemaining: 0,
      tags: ['containment', 'critical', 'infrastructure'],
      requiredTags: [],
      preferredTags: [],
      assignedTeamIds: [],
      status: 'open',
    }
    state.cases['case-pressure-b'] = {
      ...state.cases['case-002'],
      id: 'case-pressure-b',
      title: 'Industrial Spillway',
      stage: 4,
      deadlineRemaining: 0,
      tags: ['chemical', 'hazmat', 'logistics'],
      requiredTags: [],
      preferredTags: [],
      assignedTeamIds: [],
      status: 'open',
    }
    state.cases['case-pressure-c'] = {
      ...state.cases['case-003'],
      id: 'case-pressure-c',
      title: 'Shadow Choir',
      stage: 5,
      deadlineRemaining: 1,
      tags: ['occult', 'cult', 'anomaly'],
      requiredTags: [],
      preferredTags: [],
      assignedTeamIds: [],
      status: 'open',
    }

    const simulationMap = buildSimulationMapInterface(state)
    const zoneById = new Map(simulationMap.worldZones.map((zone) => [zone.id, zone]))

    expect(zoneById.get('zone:agency-command')?.status).toBe('abandoned_hub')
    expect(zoneById.get('zone:civic-corridors')?.status).toBe('curfew_zone')
    expect(zoneById.get('zone:industrial-perimeter')?.status).toBe('industrial_kill_site')
    expect(zoneById.get('zone:shadow-network')?.status).toBe('hostile_territory')
    expect(zoneById.get('zone:mutual-aid-cells')?.status).toBe('resistance_pocket')
    expect(simulationMap.routeState.safeHubContinuity).toBe('broken')
    expect(simulationMap.routeState.severedRouteCount).toBeGreaterThan(0)
    expect(simulationMap.actionableSignals.length).toBeGreaterThan(0)
    expect(
      simulationMap.uncertaintySummary.warningTags.includes(
        'scope:agency-hub:continuity-broken'
      )
    ).toBe(true)
    expect(
      simulationMap.uncertaintySummary.warningTags.includes('scope:routes:low-confidence-cluster')
    ).toBe(true)
    expect(
      simulationMap.uncertaintySummary.lowConfidenceClusters.some(
        (cluster) => cluster.scope === 'route' && cluster.memberIds.length > 0
      )
    ).toBe(true)
    expect(simulationMap.uncertaintySummary.operationalPriority.length).toBeGreaterThan(0)
    expect(simulationMap.uncertaintySummary.transitions.newlyDegradedClusters.length).toBeGreaterThan(0)
    expect(simulationMap.uncertaintySummary.groupedCounts.bySignalCategory.routePriority).toBeGreaterThan(0)
    expect(simulationMap.uncertaintySummary.recommendations.topRouteRecheckTargets.length).toBeGreaterThan(0)
    expect(simulationMap.uncertaintySummary.recommendations.topRemapWatchZones.length).toBeGreaterThan(0)
    expect(
      simulationMap.uncertaintySummary.recommendations.topRemapWatchZones[0]?.rationaleTags.includes(
        'action:remap-watch'
      )
    ).toBe(true)
    expect(simulationMap.uncertaintySummary.triage.highestRiskCategory).toBe('route_uncertainty')
    expect(simulationMap.uncertaintySummary.triage.topActionType).toBe('verify_route')
    expect(simulationMap.uncertaintySummary.triage.urgentItemCount).toBeGreaterThan(0)
    expect(simulationMap.uncertaintySummary.triage.monitorOnlyItemCount).toBeGreaterThanOrEqual(0)
    expect(
      simulationMap.uncertaintySummary.triage.priorityPostureTags.includes('posture:safehub-fragility')
    ).toBe(true)
    expect(simulationMap.uncertaintySummary.stabilityOutlook.uncertaintyTrend).toBe('degrading')
    expect(simulationMap.uncertaintySummary.stabilityOutlook.likelyNextPressureSource).toBe(
      'route_network'
    )
    expect(simulationMap.uncertaintySummary.stabilityOutlook.uncertaintySpread).toBe('system_wide')
    expect(simulationMap.uncertaintySummary.stabilityOutlook.favoredOperationalPosture).toBe(
      'rerouting'
    )
    expect(
      simulationMap.uncertaintySummary.stabilityOutlook.rationaleTags.includes(
        'outlook:pressure:route_network'
      )
    ).toBe(true)
    expect(simulationMap.uncertaintySummary.watchlistSnapshot.newlyEnteringUrgent.length).toBeGreaterThan(0)
    expect(
      simulationMap.uncertaintySummary.watchlistSnapshot.topPersistentTargetsByCategory.route
        .length
    ).toBeGreaterThan(0)
    expect(
      simulationMap.uncertaintySummary.watchlistSnapshot.topPersistentTargetsByCategory.remap
        .length
    ).toBeGreaterThan(0)
  })

  it('derives false-reading and low-confidence social clusters from rumor-path uncertainty', () => {
    const state = createStartingState()
    state.relationshipHistory = [
      {
        week: 1,
        agentAId: 'a_ava',
        agentBId: 'a_mina',
        value: 1,
        modifiers: [],
        reason: 'external_event',
      },
    ]

    const simulationMap = buildSimulationMapInterface(state)

    expect(
      simulationMap.uncertaintySummary.falseReadingHotspots.some((hotspot) =>
        hotspot.sourceFactIds.some((factId) => factId.includes('social:rumor:'))
      )
    ).toBe(true)
    expect(
      simulationMap.uncertaintySummary.lowConfidenceClusters.some(
        (cluster) =>
          cluster.scope === 'social' &&
          cluster.memberIds.some((memberId) => memberId.includes('social:rumor:'))
      )
    ).toBe(true)
    expect(
      simulationMap.uncertaintySummary.warningTags.includes('scope:relationship:false-reading-risk')
    ).toBe(true)
  })

  it('separates recent contradiction transitions from persistent contradiction transitions', () => {
    const state = createStartingState()
    state.week = 3
    state.agents.a_ava.relationships.a_kellan = 2
    state.agents.a_kellan.relationships.a_ava = -1
    state.agents.a_ava.relationships.a_mina = -2
    state.agents.a_mina.relationships.a_ava = -1
    state.relationshipHistory = [
      {
        week: 3,
        agentAId: 'a_ava',
        agentBId: 'a_mina',
        value: 2,
        modifiers: [],
        reason: 'external_event',
      },
    ]

    const simulationMap = buildSimulationMapInterface(state)

    expect(simulationMap.uncertaintySummary.transitions.recentlyContradictedHotspots.length).toBe(1)
    expect(
      simulationMap.uncertaintySummary.transitions.recentlyContradictedHotspots[0]?.sourceFactIds.some(
        (factId) => factId.includes('social:rumor:')
      )
    ).toBe(true)
    expect(simulationMap.uncertaintySummary.transitions.persistentlyContradictedHotspots.length).toBeGreaterThan(0)
    expect(simulationMap.uncertaintySummary.groupedCounts.byScope.social).toBeGreaterThan(0)
    expect(simulationMap.uncertaintySummary.recommendations.topSocialRecheckTargets.length).toBeGreaterThan(0)
    expect(
      simulationMap.uncertaintySummary.recommendations.topSocialRecheckTargets.every((entry, index, entries) => {
        if (index === 0) {
          return true
        }

        return entries[index - 1]!.score >= entry.score
      })
    ).toBe(true)
    expect(simulationMap.uncertaintySummary.triage.priorityPostureTags.some((tag) => tag.startsWith('posture:risk:'))).toBe(true)
    expect(
      simulationMap.uncertaintySummary.stabilityOutlook.rationaleTags.some((tag) =>
        tag.startsWith('outlook:spread:')
      )
    ).toBe(true)
    expect(
      simulationMap.uncertaintySummary.watchlistSnapshot.newlyEnteringUrgent.some(
        (entry) => entry.category === 'contradiction'
      )
    ).toBe(true)
    expect(
      simulationMap.uncertaintySummary.watchlistSnapshot.topPersistentTargetsByCategory
        .contradiction.length
    ).toBeGreaterThan(0)
    expect(
      simulationMap.uncertaintySummary.watchlistSnapshot.improvingOutOfUrgent.every((entry) =>
        entry.rationaleTags.includes('watchlist:status:improving')
      )
    ).toBe(true)
  })

  it('threads the simulation map into agency overview as a derived surface', () => {
    const state = createStartingState()

    expect(buildAgencyOverview(state).simulationMap).toEqual(buildSimulationMapInterface(state))
  })
})
