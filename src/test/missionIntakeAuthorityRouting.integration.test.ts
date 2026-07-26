import { describe, expect, it } from 'vitest'

import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import type { AuthorityGraphState } from '../domain/authorityGraphPersistence'
import {
  normalizeMissionRoutingState,
  resolvePersistedMissionAccessAuthorityRoutingConsequence,
  routeMission,
  routeMissionToTeam,
  shortlistMissionCandidateTeams,
  triageMission,
} from '../domain/missionIntakeRouting'
import type { GameState } from '../domain/models'
import { advanceWeek } from '../domain/sim/advanceWeek'

interface AuthorityRoutingStateOptions {
  edgeId?: string
  edgeStrength?: number
  edgeStatus?: AuthorityGraphState['graph']['edges'][number]['status']
  edgeConfidence?: AuthorityGraphState['graph']['edges'][number]['sourceConfidence']
  hiddenUntilWeek?: number
  factionNodeId?: string
  factionAliasId?: string
  linkedFactionIds?: readonly string[]
}

function buildAuthorityGraphState(options: AuthorityRoutingStateOptions = {}): AuthorityGraphState {
  const factionNodeId = options.factionNodeId ?? 'authority:oversight'

  return {
    graph: {
      nodes: [
        {
          id: 'authority:agency',
          nodeType: 'agency',
          label: 'Containment Directorate',
        },
        {
          id: factionNodeId,
          nodeType: 'faction',
          label: 'Oversight Command',
          aliases: options.factionAliasId
            ? [
                {
                  aliasId: options.factionAliasId,
                  label: 'Oversight Alias',
                  confidence: 'verified',
                },
              ]
            : undefined,
          linkedFactionIds: options.linkedFactionIds ?? ['oversight'],
        },
      ],
      edges: [
        {
          id: options.edgeId ?? 'mission-access-dependency',
          kind: 'dependency',
          fromNodeId: 'authority:agency',
          toNodeId: factionNodeId,
          status: options.edgeStatus ?? 'current',
          sourceConfidence: options.edgeConfidence ?? 'verified',
          provenance: { sourceTag: 'spe-2725-test', recordedWeek: 1 },
          strength: options.edgeStrength ?? 50,
          pressureChannels: ['mission_access'],
          ...(options.hiddenUntilWeek !== undefined
            ? { hiddenUntilWeek: options.hiddenUntilWeek }
            : {}),
        },
      ],
    },
    mutationHistory: [],
  }
}

function createAuthorityRoutingState(options: AuthorityRoutingStateOptions = {}): GameState {
  const state = createStartingState()
  const mission = state.cases['case-001']
  state.cases[mission.id] = {
    ...mission,
    factionId: 'oversight',
    status: 'open',
    assignedTeamIds: [],
    requiredRoles: [],
    requiredTags: [],
  }
  state.authorityGraphState = buildAuthorityGraphState(options)
  return state
}

describe('SPE-2725 persisted mission_access authority routing', () => {
  it('maps one sanitized denying edge to a blocked route without changing candidate ranking', () => {
    const state = createAuthorityRoutingState()
    const baseline = {
      ...state,
      authorityGraphState: undefined,
    }

    const baselineTriage = triageMission(baseline, baseline.cases['case-001'])
    const baselineCandidates = shortlistMissionCandidateTeams(baseline, 'case-001')
    const consequence = resolvePersistedMissionAccessAuthorityRoutingConsequence(
      state,
      state.cases['case-001']
    )
    const routed = routeMission(state, 'case-001')

    expect(consequence).toEqual({
      missionId: 'case-001',
      factionId: 'oversight',
      authorityNodeId: 'authority:oversight',
      edgeId: 'mission-access-dependency',
      routingState: 'blocked',
      blockerCode: 'authority-mission-access-restricted',
      reasonCode: 'dependency_access',
      magnitude: -50,
    })
    expect(routed.routingState).toBe('blocked')
    expect(routed.routingBlockers).toEqual(['authority-mission-access-restricted'])
    expect(routed.candidateTeamIds).toEqual(
      baselineCandidates.filter((candidate) => candidate.valid).map((candidate) => candidate.teamId)
    )
    expect(routed.rankedCandidates).toEqual(baselineCandidates)
    expect(triageMission(state, state.cases['case-001'])).toEqual(baselineTriage)
    expect(routeMissionToTeam(state, 'case-001', routed.candidateTeamIds[0]!).assigned).toBe(false)
  })

  it('maps a current low-strength delay to deferred while grants remain an empty fallback', () => {
    const deferred = createAuthorityRoutingState({ edgeStrength: 30 })
    const granted = createAuthorityRoutingState({ edgeStrength: 70 })

    expect(routeMission(deferred, 'case-001')).toMatchObject({
      routingState: 'deferred',
      routingBlockers: ['authority-mission-access-restricted'],
    })
    expect(
      resolvePersistedMissionAccessAuthorityRoutingConsequence(granted, granted.cases['case-001'])
    ).toBeNull()
    expect(routeMission(granted, 'case-001').routingState).toBe('shortlisted')
  })

  it('retains the recognized authority route blocker through save hydration', () => {
    const state = createAuthorityRoutingState()
    state.missionRouting = normalizeMissionRoutingState(state)

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.missionRouting?.missions['case-001']).toMatchObject({
      routingState: 'blocked',
      routingBlockers: ['authority-mission-access-restricted'],
    })
    expect(routeMission(loaded, 'case-001').rankedCandidates).toEqual(
      routeMission(state, 'case-001').rankedCandidates
    )
  })

  it('uses the existing route for empty, malformed, and missing faction/node references', () => {
    const baseline = createAuthorityRoutingState()
    baseline.authorityGraphState = undefined
    const baselineRoute = routeMission(baseline, 'case-001')

    const malformed = createAuthorityRoutingState()
    malformed.authorityGraphState = { graph: 'legacy-shape' } as unknown as AuthorityGraphState

    const missingFaction = createAuthorityRoutingState()
    missingFaction.cases['case-001'] = {
      ...missingFaction.cases['case-001'],
      factionId: 'missing-faction',
    }

    const missingLiveFaction = createAuthorityRoutingState({
      linkedFactionIds: ['missing-faction'],
    })

    for (const state of [malformed, missingFaction, missingLiveFaction]) {
      expect(
        resolvePersistedMissionAccessAuthorityRoutingConsequence(state, state.cases['case-001'])
      ).toBeNull()
      expect(routeMission(state, 'case-001')).toEqual(baselineRoute)
    }
  })

  it('resolves a mission faction through a persisted authority alias and linked live faction', () => {
    const state = createAuthorityRoutingState({
      factionNodeId: 'authority:oversight-canonical',
      factionAliasId: 'oversight-command-alias',
      linkedFactionIds: ['oversight'],
    })
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      factionId: 'oversight-command-alias',
    }

    expect(
      resolvePersistedMissionAccessAuthorityRoutingConsequence(state, state.cases['case-001'])
    ).toMatchObject({
      factionId: 'oversight',
      authorityNodeId: 'authority:oversight-canonical',
      edgeId: 'mission-access-dependency',
      routingState: 'blocked',
    })
  })

  it('ignores unrevealed hidden and contradicted mission_access claims', () => {
    const hidden = createAuthorityRoutingState({
      edgeStatus: 'hidden',
      hiddenUntilWeek: 10_000,
    })
    const contradicted = createAuthorityRoutingState({
      edgeStatus: 'contradicted',
      edgeConfidence: 'contradicted',
    })
    const conflictingCurrent = createAuthorityRoutingState()
    conflictingCurrent.authorityGraphState = {
      ...conflictingCurrent.authorityGraphState!,
      graph: {
        ...conflictingCurrent.authorityGraphState!.graph,
        edges: [
          ...conflictingCurrent.authorityGraphState!.graph.edges,
          {
            ...conflictingCurrent.authorityGraphState!.graph.edges[0]!,
            id: 'mission-access-conflicting-claim',
            sourceConfidence: 'rumor',
          },
        ],
      },
    }

    for (const state of [hidden, contradicted, conflictingCurrent]) {
      expect(
        resolvePersistedMissionAccessAuthorityRoutingConsequence(state, state.cases['case-001'])
      ).toBeNull()
      expect(routeMission(state, 'case-001').routingState).toBe('shortlisted')
    }
  })

  it('selects the first eligible edge in code-unit order and replays without input mutation', () => {
    const state = createAuthorityRoutingState({ edgeId: 'z-deny' })
    state.authorityGraphState = {
      ...state.authorityGraphState!,
      graph: {
        ...state.authorityGraphState!.graph,
        edges: [
          ...state.authorityGraphState!.graph.edges,
          {
            ...state.authorityGraphState!.graph.edges[0]!,
            id: 'a-delay',
            strength: 30,
          },
        ],
      },
    }
    const before = structuredClone(state)

    const first = resolvePersistedMissionAccessAuthorityRoutingConsequence(
      state,
      state.cases['case-001']
    )
    const second = resolvePersistedMissionAccessAuthorityRoutingConsequence(
      state,
      state.cases['case-001']
    )

    expect(first).toEqual(second)
    expect(first).toMatchObject({ edgeId: 'a-delay', routingState: 'deferred' })
    expect(state).toEqual(before)
  })

  it('does not rewrite persisted routing mid-week and recomputes it at the week boundary', () => {
    const state = createAuthorityRoutingState()
    const withoutGraph = { ...state, authorityGraphState: undefined }
    state.missionRouting = normalizeMissionRoutingState(withoutGraph)
    const persistedBefore = structuredClone(state.missionRouting)

    expect(routeMission(state, 'case-001').routingState).toBe('blocked')
    expect(state.missionRouting).toEqual(persistedBefore)
    expect(state.missionRouting?.missions['case-001']?.routingState).toBe('shortlisted')

    const first = advanceWeek(structuredClone(state), 1_000)
    const replay = advanceWeek(structuredClone(state), 1_000)

    expect(first.missionRouting?.missions['case-001']).toMatchObject({
      routingState: 'blocked',
      routingBlockers: ['authority-mission-access-restricted'],
    })
    expect(first.missionRouting?.missions['case-001']?.lastCandidateTeamIds).toEqual(
      replay.missionRouting?.missions['case-001']?.lastCandidateTeamIds
    )
    expect(first.authorityGraphState).toEqual(replay.authorityGraphState)
  })

  it('does not retroactively reroute an assigned mission', () => {
    const state = createAuthorityRoutingState()
    const teamId = Object.keys(state.teams)[0]!
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      status: 'in_progress',
      assignedTeamIds: [teamId],
    }

    expect(
      resolvePersistedMissionAccessAuthorityRoutingConsequence(state, state.cases['case-001'])
    ).toBeNull()
    expect(routeMission(state, 'case-001').routingState).toBe('assigned')
  })

  it('preserves market, operational cover, and team readiness across week-close', () => {
    const state = createAuthorityRoutingState()
    state.legitimacy = {
      sanctionLevel: 'sanctioned',
      operationalCoverLevel: 'deniable',
      falloutRisk: 'none',
    }
    const baseline = structuredClone(state)
    baseline.authorityGraphState = undefined

    const baselineCandidates = shortlistMissionCandidateTeams(baseline, 'case-001')
    const authorityCandidates = shortlistMissionCandidateTeams(state, 'case-001')
    const baselineNext = advanceWeek(baseline, 2_000)
    const authorityNext = advanceWeek(structuredClone(state), 2_000)

    expect(authorityCandidates).toEqual(baselineCandidates)
    expect(authorityNext.market).toEqual(baselineNext.market)
    expect(authorityNext.legitimacy).toEqual(baselineNext.legitimacy)
  })
})
