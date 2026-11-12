import { describe, expect, it } from 'vitest'

import {
  composeAllIntakeMinorAnomalyCrossLinks,
  composeIntakeMinorAnomalyCrossLinks,
  listIntakeReportsForMinorAnomalyItem,
  listMinorAnomalyItemsForIntakeTopic,
} from '../domain/informationIntakeMinorAnomalyCrossLink'
import { resolveIntakeExtranormalTopicKeys } from '../domain/informationIntakeExtranormalCrossLink'
import {
  FORMAL_ALERT_PARTIAL_FIXTURE,
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
} from '../domain/informationIntakeReport'
import {
  CANAL_BRIDGE_MINOR_ITEM_FIXTURE,
  DISPOSITION_CHAIN_ITEM_FIXTURE,
  validateMinorAnomalyRecord,
} from '../domain/minorAnomalyItemRegistry'

const CANAL_BRIDGE_TOPIC = 'topic:canal-bridge-incident'

const CANAL_BRIDGE_REPORTS = {
  [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  [PUBLIC_RUMOR_CONFLICT_FIXTURE.id]: PUBLIC_RUMOR_CONFLICT_FIXTURE,
  [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
}

const WARNING_ONLY_MINOR_ITEM = {
  ...CANAL_BRIDGE_MINOR_ITEM_FIXTURE,
  id: 'item:canal-warning-only',
  label: 'Canal warning-only shard',
  disposition: 'recovered' as const,
  status: 'stored',
}

describe('informationIntakeMinorAnomalyCrossLink (SPE-2355 slice 1)', () => {
  it('expands topic refs into stable match keys via shared resolver', () => {
    expect(resolveIntakeExtranormalTopicKeys('topic:canal-bridge-incident')).toEqual([
      'canal-bridge-incident',
      'topic:canal-bridge-incident',
    ])
  })

  it('links canal-bridge intake reports to minor items via intakeTopicRef', () => {
    const items = {
      [CANAL_BRIDGE_MINOR_ITEM_FIXTURE.id]: CANAL_BRIDGE_MINOR_ITEM_FIXTURE,
    }

    const summary = composeIntakeMinorAnomalyCrossLinks(
      CANAL_BRIDGE_REPORTS,
      items,
      CANAL_BRIDGE_TOPIC
    )

    expect(summary.linkedItemCount).toBe(1)
    expect(summary.linkedReportCount).toBe(3)
    expect(summary.links).toHaveLength(3)
    expect(summary.links.every((link) => link.matchKind === 'intake_topic_ref')).toBe(true)
    expect(summary.intakeSummary?.hasConflictingVerification).toBe(true)
    expect(summary.structuredReasons).toContain('match:intake_topic_ref')
  })

  it('includes warning-only hydrated minor items in linked summary', () => {
    expect(validateMinorAnomalyRecord(WARNING_ONLY_MINOR_ITEM).valid).toBe(true)
    expect(
      validateMinorAnomalyRecord(WARNING_ONLY_MINOR_ITEM).issues.some(
        (issue) => issue.severity === 'warning'
      )
    ).toBe(true)

    const items = {
      [WARNING_ONLY_MINOR_ITEM.id]: WARNING_ONLY_MINOR_ITEM,
    }

    const summary = composeIntakeMinorAnomalyCrossLinks(
      CANAL_BRIDGE_REPORTS,
      items,
      CANAL_BRIDGE_TOPIC
    )

    expect(summary.linkedItemCount).toBe(1)
    expect(summary.links).toHaveLength(3)
  })

  it('returns empty summary for empty maps without throw', () => {
    const summary = composeIntakeMinorAnomalyCrossLinks(undefined, undefined, CANAL_BRIDGE_TOPIC)

    expect(summary.links).toEqual([])
    expect(summary.linkedReportCount).toBe(0)
    expect(summary.linkedItemCount).toBe(0)
    expect(summary.intakeSummary).toBeNull()
    expect(summary.structuredReasons).toContain('link_count:0')
  })

  it('lists minor items for a topic in stable id order', () => {
    const items = {
      [CANAL_BRIDGE_MINOR_ITEM_FIXTURE.id]: CANAL_BRIDGE_MINOR_ITEM_FIXTURE,
    }

    expect(listMinorAnomalyItemsForIntakeTopic(items, CANAL_BRIDGE_TOPIC)).toEqual([
      CANAL_BRIDGE_MINOR_ITEM_FIXTURE,
    ])
  })

  it('lists intake reports for a minor item in stable id order', () => {
    const linkedReports = listIntakeReportsForMinorAnomalyItem(
      CANAL_BRIDGE_REPORTS,
      CANAL_BRIDGE_MINOR_ITEM_FIXTURE
    )

    expect(linkedReports).toHaveLength(3)
    expect(linkedReports.map((report) => report.id)).toEqual(
      [
        FORMAL_ALERT_PARTIAL_FIXTURE.id,
        IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id,
        PUBLIC_RUMOR_CONFLICT_FIXTURE.id,
      ].sort((left, right) => left.localeCompare(right))
    )
  })

  it('composeAllIntakeMinorAnomalyCrossLinks returns byte-stable summaries', () => {
    const items = {
      [CANAL_BRIDGE_MINOR_ITEM_FIXTURE.id]: CANAL_BRIDGE_MINOR_ITEM_FIXTURE,
    }

    const first = composeAllIntakeMinorAnomalyCrossLinks(CANAL_BRIDGE_REPORTS, items)
    const second = composeAllIntakeMinorAnomalyCrossLinks(CANAL_BRIDGE_REPORTS, items)

    expect(first).toEqual(second)
    expect(first).toHaveLength(1)
    expect(first[0]?.topicRef).toBe(CANAL_BRIDGE_TOPIC)
  })

  it('does not link items without topic anchors', () => {
    const items = {
      [DISPOSITION_CHAIN_ITEM_FIXTURE.id]: DISPOSITION_CHAIN_ITEM_FIXTURE,
    }

    const summary = composeIntakeMinorAnomalyCrossLinks(
      CANAL_BRIDGE_REPORTS,
      items,
      CANAL_BRIDGE_TOPIC
    )

    expect(summary.links).toEqual([])
  })

  it('is idempotent on repeated compose calls', () => {
    const items = {
      [CANAL_BRIDGE_MINOR_ITEM_FIXTURE.id]: CANAL_BRIDGE_MINOR_ITEM_FIXTURE,
    }

    const first = composeIntakeMinorAnomalyCrossLinks(
      CANAL_BRIDGE_REPORTS,
      items,
      CANAL_BRIDGE_TOPIC
    )
    const second = composeIntakeMinorAnomalyCrossLinks(
      CANAL_BRIDGE_REPORTS,
      items,
      CANAL_BRIDGE_TOPIC
    )

    expect(first).toEqual(second)
  })
})
