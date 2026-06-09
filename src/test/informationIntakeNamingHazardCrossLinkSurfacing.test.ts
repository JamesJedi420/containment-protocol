import { describe, expect, it } from 'vitest'

import {
  formatIntakeNamingHazardCrossLinkNoteContent,
  formatIntakeReportCrossLinkLabel,
  formatNamingHazardDescriptorCrossLinkLabel,
  listMissionIntakeNamingHazardCrossLinkSummaries,
} from '../domain/informationIntakeNamingHazardCrossLinkSurfacing'
import { composeIntakeNamingHazardCrossLinks } from '../domain/informationIntakeNamingHazardCrossLink'
import { FORMAL_ALERT_PARTIAL_FIXTURE } from '../domain/informationIntakeReport'
import { createStarterCase } from '../domain/templates/startingCases'
import {
  CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
  projectSafeLabel,
} from '../domain/namingHazardDescriptorRegistry'
import { buildWeeklyIntakeNamingHazardCrossLinkReportNotes } from '../domain/informationIntakeNamingHazardCrossLinkWeeklyReportNotes'
import { createStartingState } from '../data/startingState'

const CANAL_BRIDGE_TOPIC = 'topic:canal-bridge-incident'

const CANAL_BRIDGE_REPORTS = {
  [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
}

describe('informationIntakeNamingHazardCrossLinkSurfacing (SPE-2406 slice 1)', () => {
  it('formats safe cross-link labels without raw forbidden names', () => {
    expect(formatIntakeReportCrossLinkLabel(FORMAL_ALERT_PARTIAL_FIXTURE)).toBe(
      `${FORMAL_ALERT_PARTIAL_FIXTURE.id} (${FORMAL_ALERT_PARTIAL_FIXTURE.topicRef})`
    )

    const descriptorLabel = formatNamingHazardDescriptorCrossLinkLabel(
      CANAL_BRIDGE_NAMING_HAZARD_FIXTURE
    )
    const safeBriefingLabel = projectSafeLabel(CANAL_BRIDGE_NAMING_HAZARD_FIXTURE, {
      surface: 'briefing',
    }).label

    expect(descriptorLabel).toBe(`${CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id} (${safeBriefingLabel})`)
    expect(descriptorLabel).not.toContain(CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.label)
  })

  it('lists mission cross-link summaries for linked topic refs', () => {
    const state = createStartingState()
    state.informationIntakeReports = CANAL_BRIDGE_REPORTS
    state.namingHazardDescriptorRecords = {
      [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    }

    const mission = createStarterCase({
      id: 'case-cross-link-surfacing',
      templateId: 'puzzle_whispering_archive',
      stage: 1,
    })
    mission.tags = [...mission.tags, CANAL_BRIDGE_TOPIC]

    const summaries = listMissionIntakeNamingHazardCrossLinkSummaries({
      reports: state.informationIntakeReports,
      descriptors: state.namingHazardDescriptorRecords,
      currentCase: mission,
    })

    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.linkedReportCount).toBe(1)
    expect(summaries[0]?.linkedDescriptorCount).toBe(1)
  })

  it('builds weekly report notes when cross-linked maps coexist', () => {
    const descriptors = {
      [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    }
    const summary = composeIntakeNamingHazardCrossLinks(
      CANAL_BRIDGE_REPORTS,
      descriptors,
      CANAL_BRIDGE_TOPIC
    )

    const notes = buildWeeklyIntakeNamingHazardCrossLinkReportNotes({
      nextReports: CANAL_BRIDGE_REPORTS,
      nextDescriptors: descriptors,
      week: 3,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('information_intake.naming_hazard_cross_link')
    expect(notes[0]?.content).toBe(
      formatIntakeNamingHazardCrossLinkNoteContent({
        summary,
        reports: CANAL_BRIDGE_REPORTS,
        descriptors,
      })
    )
    expect(notes[0]?.content).toContain('Intake cross-link')
  })

  it('no-ops weekly report notes when either map is empty', () => {
    const descriptors = {
      [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    }

    expect(
      buildWeeklyIntakeNamingHazardCrossLinkReportNotes({
        nextReports: {},
        nextDescriptors: descriptors,
        week: 4,
        sequenceStart: 1,
      })
    ).toEqual([])

    expect(
      buildWeeklyIntakeNamingHazardCrossLinkReportNotes({
        nextReports: CANAL_BRIDGE_REPORTS,
        nextDescriptors: {},
        week: 4,
        sequenceStart: 1,
      })
    ).toEqual([])
  })
})
