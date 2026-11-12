import { describe, expect, it } from 'vitest'

import {
  BRIEF_COVER_UP_EVENT_FIXTURE,
  BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
} from '../domain/extranormalEventRegistry'
import {
  FORMAL_ALERT_PARTIAL_FIXTURE,
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
} from '../domain/informationIntakeReport'
import {
  composeAllIntakeExtranormalCrossLinks,
  composeIntakeExtranormalCrossLinks,
  listExtranormalEventsForIntakeTopic,
  listIntakeReportsForExtranormalEvent,
  resolveIntakeExtranormalTopicKeys,
} from '../domain/informationIntakeExtranormalCrossLink'

const CANAL_BRIDGE_TOPIC = 'topic:canal-bridge-incident'

const CANAL_BRIDGE_REPORTS = {
  [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  [PUBLIC_RUMOR_CONFLICT_FIXTURE.id]: PUBLIC_RUMOR_CONFLICT_FIXTURE,
  [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
}

describe('informationIntakeExtranormalCrossLink (SPE-2354 slice 1)', () => {
  it('expands topic refs into stable match keys', () => {
    expect(resolveIntakeExtranormalTopicKeys('topic:canal-bridge-incident')).toEqual([
      'canal-bridge-incident',
      'topic:canal-bridge-incident',
    ])
  })

  it('links canal-bridge intake reports to extranormal events via intakeTopicRef', () => {
    const events = {
      [BRIEF_COVER_UP_EVENT_WITH_CLUSTER.id]: BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
    }

    const summary = composeIntakeExtranormalCrossLinks(
      CANAL_BRIDGE_REPORTS,
      events,
      CANAL_BRIDGE_TOPIC
    )

    expect(summary.linkedEventCount).toBe(1)
    expect(summary.linkedReportCount).toBe(3)
    expect(summary.links).toHaveLength(3)
    expect(summary.links.every((link) => link.matchKind === 'intake_topic_ref')).toBe(true)
    expect(summary.intakeSummary?.hasConflictingVerification).toBe(true)
    expect(summary.structuredReasons).toContain('match:intake_topic_ref')
  })

  it('links via escalatedCaseRef when intakeTopicRef is absent', () => {
    const event = {
      ...BRIEF_COVER_UP_EVENT_FIXTURE,
      intakeTopicRef: undefined,
      escalatedCaseRef: 'topic:canal-bridge-incident',
    }
    const events = { [event.id]: event }

    const linkedReports = listIntakeReportsForExtranormalEvent(CANAL_BRIDGE_REPORTS, event)
    expect(linkedReports).toHaveLength(3)

    const summary = composeIntakeExtranormalCrossLinks(
      CANAL_BRIDGE_REPORTS,
      events,
      CANAL_BRIDGE_TOPIC
    )
    expect(summary.links.every((link) => link.matchKind === 'escalated_case_topic')).toBe(true)
    expect(summary.structuredReasons).toContain('match:escalated_case_topic')
  })

  it('returns empty summary for empty maps without throw', () => {
    const summary = composeIntakeExtranormalCrossLinks(undefined, undefined, CANAL_BRIDGE_TOPIC)

    expect(summary.links).toEqual([])
    expect(summary.linkedReportCount).toBe(0)
    expect(summary.linkedEventCount).toBe(0)
    expect(summary.intakeSummary).toBeNull()
    expect(summary.structuredReasons).toContain('link_count:0')
  })

  it('lists extranormal events for a topic in stable id order', () => {
    const events = {
      [BRIEF_COVER_UP_EVENT_WITH_CLUSTER.id]: BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
    }

    expect(listExtranormalEventsForIntakeTopic(events, CANAL_BRIDGE_TOPIC)).toEqual([
      BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
    ])
  })

  it('composeAllIntakeExtranormalCrossLinks returns byte-stable summaries', () => {
    const events = {
      [BRIEF_COVER_UP_EVENT_WITH_CLUSTER.id]: BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
    }

    const first = composeAllIntakeExtranormalCrossLinks(CANAL_BRIDGE_REPORTS, events)
    const second = composeAllIntakeExtranormalCrossLinks(CANAL_BRIDGE_REPORTS, events)

    expect(first).toEqual(second)
    expect(first).toHaveLength(1)
    expect(first[0]?.topicRef).toBe(CANAL_BRIDGE_TOPIC)
  })

  it('does not link events without topic anchors', () => {
    const events = {
      [BRIEF_COVER_UP_EVENT_FIXTURE.id]: BRIEF_COVER_UP_EVENT_FIXTURE,
    }

    const summary = composeIntakeExtranormalCrossLinks(
      CANAL_BRIDGE_REPORTS,
      events,
      CANAL_BRIDGE_TOPIC
    )

    expect(summary.links).toEqual([])
  })
})
