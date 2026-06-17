import { describe, expect, it } from 'vitest'

import {
  formatIntakeReportCrossLinkLabel,
  formatIntakeUnexplainedLocationCrossLinkNoteContent,
  formatUnexplainedLocationCrossLinkLabel,
  listMissionIntakeUnexplainedLocationCrossLinkSummaries,
} from '../domain/informationIntakeUnexplainedLocationCrossLinkSurfacing'
import { composeIntakeUnexplainedLocationCrossLinks } from '../domain/informationIntakeUnexplainedLocationCrossLink'
import {
  FORMAL_ALERT_PARTIAL_FIXTURE,
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
} from '../domain/informationIntakeReport'
import { buildWeeklyIntakeUnexplainedLocationCrossLinkReportNotes } from '../domain/informationIntakeUnexplainedLocationCrossLinkWeeklyReportNotes'
import { CANAL_BRIDGE_LOCATION_FIXTURE } from '../domain/unexplainedLocationRegistry'
import { createStarterCase } from '../domain/templates/startingCases'
import { createStartingState } from '../data/startingState'

const CANAL_BRIDGE_TOPIC = 'topic:canal-bridge-incident'

const CANAL_BRIDGE_REPORTS = {
  [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  [PUBLIC_RUMOR_CONFLICT_FIXTURE.id]: PUBLIC_RUMOR_CONFLICT_FIXTURE,
  [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
}

describe('informationIntakeUnexplainedLocationCrossLinkSurfacing (slice 1)', () => {
  it('formats cross-link labels from persisted records', () => {
    expect(formatIntakeReportCrossLinkLabel(FORMAL_ALERT_PARTIAL_FIXTURE)).toBe(
      `${FORMAL_ALERT_PARTIAL_FIXTURE.id} (${FORMAL_ALERT_PARTIAL_FIXTURE.topicRef})`
    )

    const locationLabel = formatUnexplainedLocationCrossLinkLabel(CANAL_BRIDGE_LOCATION_FIXTURE)
    expect(locationLabel).toBe(
      `${CANAL_BRIDGE_LOCATION_FIXTURE.id} (${CANAL_BRIDGE_LOCATION_FIXTURE.label})`
    )
  })

  it('lists mission cross-link summaries for linked topic refs', () => {
    const state = createStartingState()
    state.informationIntakeReports = CANAL_BRIDGE_REPORTS
    state.unexplainedLocationRecords = {
      [CANAL_BRIDGE_LOCATION_FIXTURE.id]: CANAL_BRIDGE_LOCATION_FIXTURE,
    }

    const mission = createStarterCase({
      id: 'case-unexplained-location-cross-link-surfacing',
      templateId: 'puzzle_whispering_archive',
      stage: 1,
    })
    mission.tags = [...mission.tags, CANAL_BRIDGE_TOPIC]

    const summaries = listMissionIntakeUnexplainedLocationCrossLinkSummaries({
      reports: state.informationIntakeReports,
      locations: state.unexplainedLocationRecords,
      currentCase: mission,
    })

    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.linkedReportCount).toBe(3)
    expect(summaries[0]?.linkedLocationCount).toBe(1)
  })

  it('builds weekly report notes when cross-linked maps coexist', () => {
    const locations = {
      [CANAL_BRIDGE_LOCATION_FIXTURE.id]: CANAL_BRIDGE_LOCATION_FIXTURE,
    }
    const summary = composeIntakeUnexplainedLocationCrossLinks(
      CANAL_BRIDGE_REPORTS,
      locations,
      CANAL_BRIDGE_TOPIC
    )

    const notes = buildWeeklyIntakeUnexplainedLocationCrossLinkReportNotes({
      nextReports: CANAL_BRIDGE_REPORTS,
      nextLocations: locations,
      week: 3,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('information_intake.unexplained_location_cross_link')
    expect(notes[0]?.content).toBe(
      formatIntakeUnexplainedLocationCrossLinkNoteContent({
        summary,
        reports: CANAL_BRIDGE_REPORTS,
        locations,
      })
    )
    expect(notes[0]?.content).toContain('Intake cross-link')
  })

  it('no-ops weekly report notes when either map is empty', () => {
    const locations = {
      [CANAL_BRIDGE_LOCATION_FIXTURE.id]: CANAL_BRIDGE_LOCATION_FIXTURE,
    }

    expect(
      buildWeeklyIntakeUnexplainedLocationCrossLinkReportNotes({
        nextReports: {},
        nextLocations: locations,
        week: 4,
        sequenceStart: 1,
      })
    ).toEqual([])

    expect(
      buildWeeklyIntakeUnexplainedLocationCrossLinkReportNotes({
        nextReports: CANAL_BRIDGE_REPORTS,
        nextLocations: {},
        week: 4,
        sequenceStart: 1,
      })
    ).toEqual([])
  })
})
