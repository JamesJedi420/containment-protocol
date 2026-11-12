import { describe, expect, it } from 'vitest'

import {
  formatIntakeMinorAnomalyCrossLinkNoteContent,
  formatIntakeReportCrossLinkLabel,
  formatMinorAnomalyItemCrossLinkLabel,
  listMissionIntakeMinorAnomalyCrossLinkSummaries,
} from '../domain/informationIntakeMinorAnomalyCrossLinkSurfacing'
import { composeIntakeMinorAnomalyCrossLinks } from '../domain/informationIntakeMinorAnomalyCrossLink'
import {
  FORMAL_ALERT_PARTIAL_FIXTURE,
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
} from '../domain/informationIntakeReport'
import { buildWeeklyIntakeMinorAnomalyCrossLinkReportNotes } from '../domain/informationIntakeMinorAnomalyCrossLinkWeeklyReportNotes'
import { CANAL_BRIDGE_MINOR_ITEM_FIXTURE } from '../domain/minorAnomalyItemRegistry'
import { createStarterCase } from '../domain/templates/startingCases'
import { createStartingState } from '../data/startingState'

const CANAL_BRIDGE_TOPIC = 'topic:canal-bridge-incident'

const CANAL_BRIDGE_REPORTS = {
  [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  [PUBLIC_RUMOR_CONFLICT_FIXTURE.id]: PUBLIC_RUMOR_CONFLICT_FIXTURE,
  [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
}

describe('informationIntakeMinorAnomalyCrossLinkSurfacing (slice 1)', () => {
  it('formats cross-link labels from persisted records', () => {
    expect(formatIntakeReportCrossLinkLabel(FORMAL_ALERT_PARTIAL_FIXTURE)).toBe(
      `${FORMAL_ALERT_PARTIAL_FIXTURE.id} (${FORMAL_ALERT_PARTIAL_FIXTURE.topicRef})`
    )

    const itemLabel = formatMinorAnomalyItemCrossLinkLabel(CANAL_BRIDGE_MINOR_ITEM_FIXTURE)
    expect(itemLabel).toBe(
      `${CANAL_BRIDGE_MINOR_ITEM_FIXTURE.id} (${CANAL_BRIDGE_MINOR_ITEM_FIXTURE.label})`
    )
  })

  it('lists mission cross-link summaries for linked topic refs', () => {
    const state = createStartingState()
    state.informationIntakeReports = CANAL_BRIDGE_REPORTS
    state.minorAnomalyItemRecords = {
      [CANAL_BRIDGE_MINOR_ITEM_FIXTURE.id]: CANAL_BRIDGE_MINOR_ITEM_FIXTURE,
    }

    const mission = createStarterCase({
      id: 'case-minor-anomaly-cross-link-surfacing',
      templateId: 'puzzle_whispering_archive',
      stage: 1,
    })
    mission.tags = [...mission.tags, CANAL_BRIDGE_TOPIC]

    const summaries = listMissionIntakeMinorAnomalyCrossLinkSummaries({
      reports: state.informationIntakeReports,
      items: state.minorAnomalyItemRecords,
      currentCase: mission,
    })

    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.linkedReportCount).toBe(3)
    expect(summaries[0]?.linkedItemCount).toBe(1)
  })

  it('builds weekly report notes when cross-linked maps coexist', () => {
    const items = {
      [CANAL_BRIDGE_MINOR_ITEM_FIXTURE.id]: CANAL_BRIDGE_MINOR_ITEM_FIXTURE,
    }
    const summary = composeIntakeMinorAnomalyCrossLinks(
      CANAL_BRIDGE_REPORTS,
      items,
      CANAL_BRIDGE_TOPIC
    )

    const notes = buildWeeklyIntakeMinorAnomalyCrossLinkReportNotes({
      nextReports: CANAL_BRIDGE_REPORTS,
      nextItems: items,
      week: 3,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('information_intake.minor_anomaly_cross_link')
    expect(notes[0]?.content).toBe(
      formatIntakeMinorAnomalyCrossLinkNoteContent({
        summary,
        reports: CANAL_BRIDGE_REPORTS,
        items,
      })
    )
    expect(notes[0]?.content).toContain('Intake cross-link')
  })

  it('no-ops weekly report notes when either map is empty', () => {
    const items = {
      [CANAL_BRIDGE_MINOR_ITEM_FIXTURE.id]: CANAL_BRIDGE_MINOR_ITEM_FIXTURE,
    }

    expect(
      buildWeeklyIntakeMinorAnomalyCrossLinkReportNotes({
        nextReports: {},
        nextItems: items,
        week: 4,
        sequenceStart: 1,
      })
    ).toEqual([])

    expect(
      buildWeeklyIntakeMinorAnomalyCrossLinkReportNotes({
        nextReports: CANAL_BRIDGE_REPORTS,
        nextItems: {},
        week: 4,
        sequenceStart: 1,
      })
    ).toEqual([])
  })
})
