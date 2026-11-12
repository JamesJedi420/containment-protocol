import { describe, expect, it } from 'vitest'

import { BRIEF_COVER_UP_EVENT_WITH_CLUSTER } from '../domain/extranormalEventRegistry'
import {
  formatExtranormalEventCrossLinkLabel,
  formatIntakeExtranormalCrossLinkNoteContent,
  formatIntakeReportCrossLinkLabel,
  listMissionIntakeExtranormalCrossLinkSummaries,
} from '../domain/informationIntakeExtranormalCrossLinkSurfacing'
import { composeIntakeExtranormalCrossLinks } from '../domain/informationIntakeExtranormalCrossLink'
import {
  FORMAL_ALERT_PARTIAL_FIXTURE,
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
} from '../domain/informationIntakeReport'
import { buildWeeklyIntakeExtranormalCrossLinkReportNotes } from '../domain/informationIntakeExtranormalCrossLinkWeeklyReportNotes'
import { createStarterCase } from '../domain/templates/startingCases'
import { createStartingState } from '../data/startingState'

const CANAL_BRIDGE_TOPIC = 'topic:canal-bridge-incident'

const CANAL_BRIDGE_REPORTS = {
  [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  [PUBLIC_RUMOR_CONFLICT_FIXTURE.id]: PUBLIC_RUMOR_CONFLICT_FIXTURE,
  [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
}

describe('informationIntakeExtranormalCrossLinkSurfacing (SPE-2470 slice 1)', () => {
  it('formats cross-link labels from persisted records', () => {
    expect(formatIntakeReportCrossLinkLabel(FORMAL_ALERT_PARTIAL_FIXTURE)).toBe(
      `${FORMAL_ALERT_PARTIAL_FIXTURE.id} (${FORMAL_ALERT_PARTIAL_FIXTURE.topicRef})`
    )

    const eventLabel = formatExtranormalEventCrossLinkLabel(BRIEF_COVER_UP_EVENT_WITH_CLUSTER)
    expect(eventLabel).toBe(
      `${BRIEF_COVER_UP_EVENT_WITH_CLUSTER.id} (${BRIEF_COVER_UP_EVENT_WITH_CLUSTER.label})`
    )
  })

  it('lists mission cross-link summaries for linked topic refs', () => {
    const state = createStartingState()
    state.informationIntakeReports = CANAL_BRIDGE_REPORTS
    state.extranormalEventRecords = {
      [BRIEF_COVER_UP_EVENT_WITH_CLUSTER.id]: BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
    }

    const mission = createStarterCase({
      id: 'case-extranormal-cross-link-surfacing',
      templateId: 'puzzle_whispering_archive',
      stage: 1,
    })
    mission.tags = [...mission.tags, CANAL_BRIDGE_TOPIC]

    const summaries = listMissionIntakeExtranormalCrossLinkSummaries({
      reports: state.informationIntakeReports,
      events: state.extranormalEventRecords,
      currentCase: mission,
    })

    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.linkedReportCount).toBe(3)
    expect(summaries[0]?.linkedEventCount).toBe(1)
  })

  it('builds weekly report notes when cross-linked maps coexist', () => {
    const events = {
      [BRIEF_COVER_UP_EVENT_WITH_CLUSTER.id]: BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
    }
    const summary = composeIntakeExtranormalCrossLinks(
      CANAL_BRIDGE_REPORTS,
      events,
      CANAL_BRIDGE_TOPIC
    )

    const notes = buildWeeklyIntakeExtranormalCrossLinkReportNotes({
      nextReports: CANAL_BRIDGE_REPORTS,
      nextEvents: events,
      week: 3,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('information_intake.extranormal_cross_link')
    expect(notes[0]?.content).toBe(
      formatIntakeExtranormalCrossLinkNoteContent({
        summary,
        reports: CANAL_BRIDGE_REPORTS,
        events,
      })
    )
    expect(notes[0]?.content).toContain('Intake cross-link')
  })

  it('no-ops weekly report notes when either map is empty', () => {
    const events = {
      [BRIEF_COVER_UP_EVENT_WITH_CLUSTER.id]: BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
    }

    expect(
      buildWeeklyIntakeExtranormalCrossLinkReportNotes({
        nextReports: {},
        nextEvents: events,
        week: 4,
        sequenceStart: 1,
      })
    ).toEqual([])

    expect(
      buildWeeklyIntakeExtranormalCrossLinkReportNotes({
        nextReports: CANAL_BRIDGE_REPORTS,
        nextEvents: {},
        week: 4,
        sequenceStart: 1,
      })
    ).toEqual([])
  })
})
