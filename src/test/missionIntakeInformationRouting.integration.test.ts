import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { createStarterCase } from '../domain/templates/startingCases'
import {
  FORMAL_ALERT_PARTIAL_FIXTURE,
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
} from '../domain/informationIntakeReport'
import {
  deriveMissionIntakeInformationSignals,
  listInformationIntakeReportsForMission,
} from '../domain/missionIntakeInformationRouting'
import {
  deriveMissionIntakeSource,
  recomputeMissionRouting,
  triageMission,
} from '../domain/missionIntakeRouting'

const CANAL_BRIDGE_TOPIC = 'topic:canal-bridge-incident'

const canalBridgeFixtures = [
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
  FORMAL_ALERT_PARTIAL_FIXTURE,
]

describe('mission intake information routing integration (SPE-854 parent slice 1)', () => {
  it('links intake reports to missions via topic tags', () => {
    const state = createStartingState()
    state.informationIntakeReports = Object.fromEntries(
      canalBridgeFixtures.map((report) => [report.id, report])
    )

    const mission = {
      ...state.cases['case-001'],
      tags: [...state.cases['case-001'].tags, CANAL_BRIDGE_TOPIC],
    }

    const linked = listInformationIntakeReportsForMission(state, mission)
    expect(linked).toHaveLength(3)
    expect(linked.map((report) => report.id).sort()).toEqual(
      canalBridgeFixtures.map((report) => report.id).sort()
    )
  })

  it('raises triage score and surfaces intake reason codes for mixed-source canal-bridge intake', () => {
    const state = createStartingState()
    const baselineMission = createStarterCase({
      id: 'case-intake-triage-baseline',
      templateId: 'puzzle_whispering_archive',
      stage: 1,
    })
    baselineMission.factionId = undefined
    const baseline = triageMission(state, baselineMission)

    state.informationIntakeReports = Object.fromEntries(
      canalBridgeFixtures.map((report) => [report.id, report])
    )
    const linkedMission = {
      ...baselineMission,
      tags: [...baselineMission.tags, CANAL_BRIDGE_TOPIC],
    }

    const withIntake = triageMission(state, linkedMission)

    expect(withIntake.score).toBeGreaterThan(baseline.score)
    expect(withIntake.reasonCodes).toContain('intake-linked-reports')
    expect(withIntake.reasonCodes).toContain('intake-verification-conflict')
    expect(withIntake.reasonCodes).toContain('intake-incomplete')
    expect(withIntake.reasonCodes).toContain('intake-rumor-separated')
    expect(withIntake.reasonCodes).toContain('intake-nonstandard-hook')
  })

  it('maps conflicting public-led intake to pressure intake source for scripted missions', () => {
    const state = createStartingState()
    state.informationIntakeReports = Object.fromEntries(
      canalBridgeFixtures.map((report) => [report.id, report])
    )

    const mission = createStarterCase({
      id: 'case-intake-source-routing',
      templateId: 'puzzle_whispering_archive',
      stage: 1,
    })
    mission.factionId = undefined
    mission.tags = [...mission.tags, CANAL_BRIDGE_TOPIC]

    expect(deriveMissionIntakeSource(mission)).toBe('scripted')
    expect(deriveMissionIntakeSource(mission, state)).toBe('pressure')

    const routing = recomputeMissionRouting({
      ...state,
      cases: {
        ...state.cases,
        [mission.id]: mission,
      },
    })

    expect(routing.missions[mission.id]?.intakeSource).toBe('pressure')
    expect(routing.missions[mission.id]?.priorityReasonCodes).toContain('intake-linked-reports')
  })

  it('returns neutral signals when no reports link to the mission', () => {
    const state = createStartingState()
    state.informationIntakeReports = {
      [PUBLIC_RUMOR_CONFLICT_FIXTURE.id]: PUBLIC_RUMOR_CONFLICT_FIXTURE,
    }

    const mission = state.cases['case-001']
    const signals = deriveMissionIntakeInformationSignals(state, mission)

    expect(signals).toEqual({
      linkedReportCount: 0,
      coverageBand: null,
      scoreAdjustment: 0,
      reasonCodes: [],
      intakeSourceOverride: null,
    })
    expect(triageMission(state, mission)).toEqual(triageMission({ ...state, informationIntakeReports: {} }, mission))
  })
})
