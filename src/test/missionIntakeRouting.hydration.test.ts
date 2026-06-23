import { describe, expect, it } from 'vitest'

import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import {
  FORMAL_ALERT_PARTIAL_FIXTURE,
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
} from '../domain/informationIntakeReport'
import { createStarterCase } from '../domain/templates/startingCases'
import { normalizeMissionRoutingState, triageMission } from '../domain/missionIntakeRouting'

const CANAL_BRIDGE_TOPIC = 'topic:canal-bridge-incident'

const canalBridgeFixtures = [
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
  FORMAL_ALERT_PARTIAL_FIXTURE,
]

describe('mission intake routing hydration (SPE-854 parent slice 2)', () => {
  it('refreshes stale triage score and intake reason codes after save round-trip when intake is linked', () => {
    const state = createStartingState()
    state.informationIntakeReports = Object.fromEntries(
      canalBridgeFixtures.map((report) => [report.id, report])
    )

    const mission = createStarterCase({
      id: 'case-hydrate-intake-linked',
      templateId: 'puzzle_whispering_archive',
      stage: 1,
    })
    mission.factionId = undefined
    mission.tags = [...mission.tags, CANAL_BRIDGE_TOPIC]
    state.cases[mission.id] = mission

    const liveTriage = triageMission(state, mission)
    expect(liveTriage.reasonCodes).toContain('intake-linked-reports')

    state.missionRouting = {
      orderedMissionIds: [mission.id],
      missions: {
        [mission.id]: {
          missionId: mission.id,
          templateId: mission.templateId,
          category: 'strategic_opportunity',
          kind: mission.kind,
          status: mission.status,
          generatedWeek: state.week,
          deadlineRemaining: mission.deadlineRemaining,
          durationWeeks: mission.durationWeeks,
          stage: mission.stage,
          difficulty: { ...mission.difficulty },
          weights: { ...mission.weights },
          requiredRoles: [...(mission.requiredRoles ?? [])],
          requiredTags: [...mission.requiredTags],
          preferredTags: [...mission.preferredTags],
          assignedTeamIds: [],
          intakeSource: 'scripted',
          priority: 'low',
          priorityReasonCodes: ['urgency-low'],
          triageScore: 1,
          routingState: 'pending_triage',
          routingBlockers: [],
          lastCandidateTeamIds: [],
          lastRejectedTeamIds: [],
        },
      },
      nextGeneratedSequence: 2,
    }

    const loaded = loadGameSave(serializeGameSave(state))
    const hydratedMission = loaded.missionRouting?.missions[mission.id]

    expect(hydratedMission?.triageScore).toBe(liveTriage.score)
    expect(hydratedMission?.priorityReasonCodes).toEqual(liveTriage.reasonCodes)
    expect(hydratedMission?.intakeSource).toBe('pressure')
    expect(hydratedMission?.priorityReasonCodes).toContain('intake-verification-conflict')
  })

  it('keeps persisted triage fields for missions without linked intake reports', () => {
    const state = createStartingState()
    const missionId = 'case-001'
    const staleScore = 3
    const staleReasonCodes = ['urgency-low', 'custom-stale-marker']

    state.missionRouting = normalizeMissionRoutingState(state)
    state.missionRouting = {
      ...state.missionRouting!,
      missions: {
        ...state.missionRouting!.missions,
        [missionId]: {
          ...state.missionRouting!.missions[missionId]!,
          triageScore: staleScore,
          priorityReasonCodes: staleReasonCodes,
          priority: 'low',
        },
      },
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.missionRouting?.missions[missionId]?.triageScore).toBe(staleScore)
    expect(loaded.missionRouting?.missions[missionId]?.priorityReasonCodes).toEqual(
      [...staleReasonCodes].sort((left, right) => left.localeCompare(right))
    )
  })

  it('hydrates explicit routing blockers and drops unknown blocker strings', () => {
    const state = createStartingState()
    const missionId = 'case-001'
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: ['site-clearance:alpha', 'dual-loyalty-clearance'],
      requiredRoles: [],
    }
    for (const team of Object.values(state.teams)) {
      team.tags = [...team.tags, 'dual-loyalty:criminal']
    }
    state.missionRouting = normalizeMissionRoutingState(state)
    state.missionRouting = {
      ...state.missionRouting!,
      missions: {
        ...state.missionRouting!.missions,
        [missionId]: {
          ...state.missionRouting!.missions[missionId]!,
          routingState: 'blocked',
          routingBlockers: [
            'site-clearance-required',
            'dual-loyalty-restricted',
            'not-a-real-blocker',
          ] as (typeof state.missionRouting.missions)[string]['routingBlockers'],
        },
      },
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.missionRouting?.missions[missionId]?.routingBlockers).toContain(
      'site-clearance-required'
    )
    expect(loaded.missionRouting?.missions[missionId]?.routingBlockers).toContain(
      'dual-loyalty-restricted'
    )
    expect(loaded.missionRouting?.missions[missionId]?.routingBlockers).not.toContain(
      'not-a-real-blocker'
    )
  })

  it('hydrates intake-linked triage through import parsing without clobbering player disposition', () => {
    const fallback = createStartingState()
    const mission = createStarterCase({
      id: 'case-hydrate-disposition',
      templateId: 'puzzle_whispering_archive',
      stage: 1,
    })
    mission.factionId = undefined
    mission.tags = [...mission.tags, CANAL_BRIDGE_TOPIC]

    const hydrated = hydrateGame(
      {
        ...fallback,
        templates: undefined,
        week: fallback.week,
        informationIntakeReports: Object.fromEntries(
          canalBridgeFixtures.map((report) => [report.id, report])
        ),
        cases: {
          ...fallback.cases,
          [mission.id]: mission,
        },
        missionRouting: {
          orderedMissionIds: [mission.id],
          missions: {
            [mission.id]: {
              missionId: mission.id,
              templateId: mission.templateId,
              category: 'strategic_opportunity',
              kind: mission.kind,
              status: mission.status,
              generatedWeek: fallback.week,
              deadlineRemaining: mission.deadlineRemaining,
              durationWeeks: mission.durationWeeks,
              stage: mission.stage,
              difficulty: { ...mission.difficulty },
              weights: { ...mission.weights },
              requiredRoles: [],
              requiredTags: [...mission.requiredTags],
              preferredTags: [...mission.preferredTags],
              assignedTeamIds: [],
              intakeSource: 'scripted',
              priority: 'low',
              priorityReasonCodes: [],
              triageScore: 0,
              routingState: 'deferred',
              routingBlockers: [],
              playerDisposition: 'defer',
              playerDispositionWeek: fallback.week,
              lastCandidateTeamIds: [],
              lastRejectedTeamIds: [],
            },
          },
          nextGeneratedSequence: 2,
        },
      },
      fallback
    )

    const liveTriage = triageMission(hydrated, mission)
    const record = hydrated.missionRouting?.missions[mission.id]

    expect(record?.triageScore).toBe(liveTriage.score)
    expect(record?.priorityReasonCodes).toEqual(liveTriage.reasonCodes)
    expect(record?.playerDisposition).toBe('defer')
    expect(record?.playerDispositionWeek).toBe(fallback.week)
    expect(record?.routingState).toBe('deferred')
  })
})
