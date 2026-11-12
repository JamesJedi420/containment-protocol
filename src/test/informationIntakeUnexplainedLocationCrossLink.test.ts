import { describe, expect, it } from 'vitest'

import {
  composeAllIntakeUnexplainedLocationCrossLinks,
  composeIntakeUnexplainedLocationCrossLinks,
  listIntakeReportsForUnexplainedLocation,
  listUnexplainedLocationsForIntakeTopic,
} from '../domain/informationIntakeUnexplainedLocationCrossLink'
import { resolveIntakeExtranormalTopicKeys } from '../domain/informationIntakeExtranormalCrossLink'
import {
  FORMAL_ALERT_PARTIAL_FIXTURE,
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
} from '../domain/informationIntakeReport'
import {
  CANAL_BRIDGE_LOCATION_FIXTURE,
  LIFECYCLE_CHAIN_LOCATION_FIXTURE,
  validateUnexplainedLocationRecord,
} from '../domain/unexplainedLocationRegistry'

const CANAL_BRIDGE_TOPIC = 'topic:canal-bridge-incident'

const CANAL_BRIDGE_REPORTS = {
  [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  [PUBLIC_RUMOR_CONFLICT_FIXTURE.id]: PUBLIC_RUMOR_CONFLICT_FIXTURE,
  [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
}

const WARNING_ONLY_LOCATION = {
  ...CANAL_BRIDGE_LOCATION_FIXTURE,
  id: 'location:canal-warning-only',
  label: 'Canal warning-only annex',
  lifecycleState: 'public_managed' as const,
  latentSeverityScore: 0,
  lowPriority: true,
}

describe('informationIntakeUnexplainedLocationCrossLink (SPE-2356 slice 1)', () => {
  it('expands topic refs into stable match keys via shared resolver', () => {
    expect(resolveIntakeExtranormalTopicKeys('topic:canal-bridge-incident')).toEqual([
      'canal-bridge-incident',
      'topic:canal-bridge-incident',
    ])
  })

  it('links canal-bridge intake reports to locations via intakeTopicRef', () => {
    const locations = {
      [CANAL_BRIDGE_LOCATION_FIXTURE.id]: CANAL_BRIDGE_LOCATION_FIXTURE,
    }

    const summary = composeIntakeUnexplainedLocationCrossLinks(
      CANAL_BRIDGE_REPORTS,
      locations,
      CANAL_BRIDGE_TOPIC
    )

    expect(summary.linkedLocationCount).toBe(1)
    expect(summary.linkedReportCount).toBe(3)
    expect(summary.links).toHaveLength(3)
    expect(summary.links.every((link) => link.matchKind === 'intake_topic_ref')).toBe(true)
    expect(summary.intakeSummary?.hasConflictingVerification).toBe(true)
    expect(summary.structuredReasons).toContain('match:intake_topic_ref')
  })

  it('includes warning-only hydrated locations in linked summary', () => {
    expect(validateUnexplainedLocationRecord(WARNING_ONLY_LOCATION).valid).toBe(true)
    expect(
      validateUnexplainedLocationRecord(WARNING_ONLY_LOCATION).issues.some(
        (issue) => issue.severity === 'warning'
      )
    ).toBe(true)

    const locations = {
      [WARNING_ONLY_LOCATION.id]: WARNING_ONLY_LOCATION,
    }

    const summary = composeIntakeUnexplainedLocationCrossLinks(
      CANAL_BRIDGE_REPORTS,
      locations,
      CANAL_BRIDGE_TOPIC
    )

    expect(summary.linkedLocationCount).toBe(1)
    expect(summary.links).toHaveLength(3)
  })

  it('returns empty summary for empty maps without throw', () => {
    const summary = composeIntakeUnexplainedLocationCrossLinks(
      undefined,
      undefined,
      CANAL_BRIDGE_TOPIC
    )

    expect(summary.links).toEqual([])
    expect(summary.linkedReportCount).toBe(0)
    expect(summary.linkedLocationCount).toBe(0)
    expect(summary.intakeSummary).toBeNull()
    expect(summary.structuredReasons).toContain('link_count:0')
  })

  it('lists locations for a topic in stable id order', () => {
    const locations = {
      [CANAL_BRIDGE_LOCATION_FIXTURE.id]: CANAL_BRIDGE_LOCATION_FIXTURE,
    }

    expect(listUnexplainedLocationsForIntakeTopic(locations, CANAL_BRIDGE_TOPIC)).toEqual([
      CANAL_BRIDGE_LOCATION_FIXTURE,
    ])
  })

  it('lists intake reports for a location in stable id order', () => {
    const linkedReports = listIntakeReportsForUnexplainedLocation(
      CANAL_BRIDGE_REPORTS,
      CANAL_BRIDGE_LOCATION_FIXTURE
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

  it('composeAllIntakeUnexplainedLocationCrossLinks returns byte-stable summaries', () => {
    const locations = {
      [CANAL_BRIDGE_LOCATION_FIXTURE.id]: CANAL_BRIDGE_LOCATION_FIXTURE,
    }

    const first = composeAllIntakeUnexplainedLocationCrossLinks(CANAL_BRIDGE_REPORTS, locations)
    const second = composeAllIntakeUnexplainedLocationCrossLinks(CANAL_BRIDGE_REPORTS, locations)

    expect(first).toEqual(second)
    expect(first).toHaveLength(1)
    expect(first[0]?.topicRef).toBe(CANAL_BRIDGE_TOPIC)
  })

  it('does not link locations without topic anchors', () => {
    const locations = {
      [LIFECYCLE_CHAIN_LOCATION_FIXTURE.id]: LIFECYCLE_CHAIN_LOCATION_FIXTURE,
    }

    const summary = composeIntakeUnexplainedLocationCrossLinks(
      CANAL_BRIDGE_REPORTS,
      locations,
      CANAL_BRIDGE_TOPIC
    )

    expect(summary.links).toEqual([])
  })

  it('is idempotent on repeated compose calls', () => {
    const locations = {
      [CANAL_BRIDGE_LOCATION_FIXTURE.id]: CANAL_BRIDGE_LOCATION_FIXTURE,
    }

    const first = composeIntakeUnexplainedLocationCrossLinks(
      CANAL_BRIDGE_REPORTS,
      locations,
      CANAL_BRIDGE_TOPIC
    )
    const second = composeIntakeUnexplainedLocationCrossLinks(
      CANAL_BRIDGE_REPORTS,
      locations,
      CANAL_BRIDGE_TOPIC
    )

    expect(first).toEqual(second)
  })
})
