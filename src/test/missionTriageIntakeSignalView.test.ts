import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { createStarterCase } from '../domain/templates/startingCases'
import { BRIEF_COVER_UP_EVENT_WITH_CLUSTER } from '../domain/extranormalEventRegistry'
import {
  FORMAL_ALERT_PARTIAL_FIXTURE,
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
} from '../domain/informationIntakeReport'
import { CANAL_BRIDGE_NAMING_HAZARD_FIXTURE } from '../domain/namingHazardDescriptorRegistry'
import { CANAL_BRIDGE_MINOR_ITEM_FIXTURE } from '../domain/minorAnomalyItemRegistry'
import { CANAL_BRIDGE_LOCATION_FIXTURE } from '../domain/unexplainedLocationRegistry'
import { getCaseListItemView } from '../features/cases/caseView'
import { buildMissionTriageDispositionView } from '../features/cases/missionTriageDispositionView'
import { buildMissionTriageIntakeSignals } from '../features/cases/missionTriageIntakeSignalView'
import { buildMissionTriageListRowChips } from '../features/cases/missionTriageLayoutView'

const CANAL_BRIDGE_TOPIC = 'topic:canal-bridge-incident'

const canalBridgeFixtures = [
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
  FORMAL_ALERT_PARTIAL_FIXTURE,
]

describe('missionTriageIntakeSignalView', () => {
  it('surfaces prioritized intake markers for linked canal-bridge intake', () => {
    const state = createStartingState()
    state.informationIntakeReports = Object.fromEntries(
      canalBridgeFixtures.map((report) => [report.id, report])
    )

    const mission = createStarterCase({
      id: 'case-intake-chip-canal-bridge',
      templateId: 'puzzle_whispering_archive',
      stage: 1,
    })
    mission.factionId = undefined
    mission.tags = [...mission.tags, CANAL_BRIDGE_TOPIC]
    state.cases[mission.id] = mission

    const signals = buildMissionTriageIntakeSignals(mission, state)

    expect(signals.visible).toBe(true)
    expect(signals.markers.map((marker) => marker.label)).toEqual([
      'Intake: conflict',
      'Intake: incomplete',
    ])
    expect(signals.markers[0]?.title).toContain('disagree')
  })

  it('returns neutral markers when no intake reports link to the mission', () => {
    const state = createStartingState()
    state.informationIntakeReports = {
      [PUBLIC_RUMOR_CONFLICT_FIXTURE.id]: PUBLIC_RUMOR_CONFLICT_FIXTURE,
    }

    const mission = state.cases['case-001']
    const signals = buildMissionTriageIntakeSignals(mission, state)

    expect(signals).toEqual({ visible: false, markers: [] })
  })

  it('hides intake markers on resolved cases', () => {
    const state = createStartingState()
    state.informationIntakeReports = Object.fromEntries(
      canalBridgeFixtures.map((report) => [report.id, report])
    )

    const mission = createStarterCase({
      id: 'case-intake-chip-resolved',
      templateId: 'puzzle_whispering_archive',
      stage: 1,
      status: 'resolved',
    })
    mission.factionId = undefined
    mission.tags = [...mission.tags, CANAL_BRIDGE_TOPIC]
    state.cases[mission.id] = mission

    expect(buildMissionTriageIntakeSignals(mission, state).visible).toBe(false)
  })

  it('surfaces naming-hazard cross-link marker when intake and descriptors share topic refs', () => {
    const state = createStartingState()
    state.informationIntakeReports = {
      [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
    }
    state.namingHazardDescriptorRecords = {
      [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    }

    const mission = createStarterCase({
      id: 'case-intake-naming-hazard-chip',
      templateId: 'puzzle_whispering_archive',
      stage: 1,
    })
    mission.factionId = undefined
    mission.tags = [...mission.tags, CANAL_BRIDGE_TOPIC]
    state.cases[mission.id] = mission

    const signals = buildMissionTriageIntakeSignals(mission, state)

    expect(signals.visible).toBe(true)
    expect(signals.markers.some((marker) => marker.label === 'Intake: naming hazard')).toBe(true)
    expect(
      signals.markers.find((marker) => marker.label === 'Intake: naming hazard')?.title
    ).toContain(CANAL_BRIDGE_TOPIC)
  })

  it('surfaces extranormal cross-link marker when intake and events share topic refs', () => {
    const state = createStartingState()
    state.informationIntakeReports = {
      [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
    }
    state.extranormalEventRecords = {
      [BRIEF_COVER_UP_EVENT_WITH_CLUSTER.id]: BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
    }

    const mission = createStarterCase({
      id: 'case-intake-extranormal-chip',
      templateId: 'puzzle_whispering_archive',
      stage: 1,
    })
    mission.factionId = undefined
    mission.tags = [...mission.tags, CANAL_BRIDGE_TOPIC]
    state.cases[mission.id] = mission

    const signals = buildMissionTriageIntakeSignals(mission, state)

    expect(signals.visible).toBe(true)
    expect(signals.markers.some((marker) => marker.label === 'Intake: extranormal')).toBe(true)
    expect(
      signals.markers.find((marker) => marker.label === 'Intake: extranormal')?.title
    ).toContain(CANAL_BRIDGE_TOPIC)
  })

  it('surfaces minor anomaly cross-link marker when intake and items share topic refs', () => {
    const state = createStartingState()
    state.informationIntakeReports = {
      [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
    }
    state.minorAnomalyItemRecords = {
      [CANAL_BRIDGE_MINOR_ITEM_FIXTURE.id]: CANAL_BRIDGE_MINOR_ITEM_FIXTURE,
    }

    const mission = createStarterCase({
      id: 'case-intake-minor-anomaly-chip',
      templateId: 'puzzle_whispering_archive',
      stage: 1,
    })
    mission.factionId = undefined
    mission.tags = [...mission.tags, CANAL_BRIDGE_TOPIC]
    state.cases[mission.id] = mission

    const signals = buildMissionTriageIntakeSignals(mission, state)

    expect(signals.visible).toBe(true)
    expect(signals.markers.some((marker) => marker.label === 'Intake: minor anomaly')).toBe(true)
    expect(
      signals.markers.find((marker) => marker.label === 'Intake: minor anomaly')?.title
    ).toContain(CANAL_BRIDGE_TOPIC)
  })

  it('surfaces unexplained location cross-link marker when intake and locations share topic refs', () => {
    const state = createStartingState()
    state.informationIntakeReports = {
      [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
    }
    state.unexplainedLocationRecords = {
      [CANAL_BRIDGE_LOCATION_FIXTURE.id]: CANAL_BRIDGE_LOCATION_FIXTURE,
    }

    const mission = createStarterCase({
      id: 'case-intake-unexplained-location-chip',
      templateId: 'puzzle_whispering_archive',
      stage: 1,
    })
    mission.factionId = undefined
    mission.tags = [...mission.tags, CANAL_BRIDGE_TOPIC]
    state.cases[mission.id] = mission

    const signals = buildMissionTriageIntakeSignals(mission, state)

    expect(signals.visible).toBe(true)
    expect(signals.markers.some((marker) => marker.label === 'Intake: location')).toBe(true)
    expect(
      signals.markers.find((marker) => marker.label === 'Intake: location')?.title
    ).toContain(CANAL_BRIDGE_TOPIC)
  })

  it('integrates intake chips into list row chip builder', () => {
    const state = createStartingState()
    state.informationIntakeReports = Object.fromEntries(
      canalBridgeFixtures.map((report) => [report.id, report])
    )

    const mission = createStarterCase({
      id: 'case-intake-chip-row',
      templateId: 'puzzle_whispering_archive',
      stage: 1,
    })
    mission.factionId = undefined
    mission.tags = [...mission.tags, CANAL_BRIDGE_TOPIC]
    state.cases[mission.id] = mission

    const view = getCaseListItemView(mission, state, {
      includeCovertPrepSignals: true,
      includeIntakeSignals: true,
      includeModalitySignals: true,
    })
    const chips = buildMissionTriageListRowChips(
      view,
      buildMissionTriageDispositionView(view, state)
    )

    expect(chips.some((chip) => chip.label === 'Intake: conflict')).toBe(true)
    expect(chips.some((chip) => chip.label === 'Intake: incomplete')).toBe(true)
  })
})
