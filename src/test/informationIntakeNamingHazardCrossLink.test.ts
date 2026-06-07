import { describe, expect, it } from 'vitest'

import {
  composeAllIntakeNamingHazardCrossLinks,
  composeIntakeNamingHazardCrossLinks,
  listIntakeReportsForNamingHazardDescriptor,
  listNamingHazardDescriptorsForIntakeTopic,
} from '../domain/informationIntakeNamingHazardCrossLink'
import { resolveIntakeExtranormalTopicKeys } from '../domain/informationIntakeExtranormalCrossLink'
import {
  FORMAL_ALERT_PARTIAL_FIXTURE,
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
} from '../domain/informationIntakeReport'
import {
  CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
  COMPULSIVE_PHRASE_BRIEFING_FIXTURE,
  validateNamingHazardDescriptorRecord,
} from '../domain/namingHazardDescriptorRegistry'

const CANAL_BRIDGE_TOPIC = 'topic:canal-bridge-incident'

const CANAL_BRIDGE_REPORTS = {
  [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  [PUBLIC_RUMOR_CONFLICT_FIXTURE.id]: PUBLIC_RUMOR_CONFLICT_FIXTURE,
  [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
}

describe('informationIntakeNamingHazardCrossLink (SPE-2358 slice 1)', () => {
  it('expands topic refs into stable match keys via shared resolver', () => {
    expect(resolveIntakeExtranormalTopicKeys('topic:canal-bridge-incident')).toEqual([
      'canal-bridge-incident',
      'topic:canal-bridge-incident',
    ])
  })

  it('links canal-bridge intake reports to naming-hazard descriptors via intakeTopicRef', () => {
    const descriptors = {
      [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    }

    const summary = composeIntakeNamingHazardCrossLinks(
      CANAL_BRIDGE_REPORTS,
      descriptors,
      CANAL_BRIDGE_TOPIC
    )

    expect(summary.linkedDescriptorCount).toBe(1)
    expect(summary.linkedReportCount).toBe(3)
    expect(summary.links).toHaveLength(3)
    expect(summary.links.every((link) => link.matchKind === 'intake_topic_ref')).toBe(true)
    expect(summary.intakeSummary?.hasConflictingVerification).toBe(true)
    expect(summary.structuredReasons).toContain('match:intake_topic_ref')
  })

  it('includes warning-only hydrated descriptors in linked summary', () => {
    const warningOnlyDescriptor = {
      ...CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
      id: 'naming-hazard:canal-warning-only',
      label: 'Canal warning-only naming hazard',
      referenceConstraints: ['compulsive_phrase_risk'] as const,
      compulsivePhraseWatchlist: undefined,
    }

    expect(validateNamingHazardDescriptorRecord(warningOnlyDescriptor).valid).toBe(true)
    expect(
      validateNamingHazardDescriptorRecord(warningOnlyDescriptor).issues.some(
        (issue) => issue.severity === 'warning'
      )
    ).toBe(true)

    const descriptors = {
      [warningOnlyDescriptor.id]: warningOnlyDescriptor,
    }

    const summary = composeIntakeNamingHazardCrossLinks(
      CANAL_BRIDGE_REPORTS,
      descriptors,
      CANAL_BRIDGE_TOPIC
    )

    expect(summary.linkedDescriptorCount).toBe(1)
    expect(summary.links).toHaveLength(3)
  })

  it('returns empty summary for empty maps without throw', () => {
    const summary = composeIntakeNamingHazardCrossLinks(
      undefined,
      undefined,
      CANAL_BRIDGE_TOPIC
    )

    expect(summary.links).toEqual([])
    expect(summary.linkedReportCount).toBe(0)
    expect(summary.linkedDescriptorCount).toBe(0)
    expect(summary.intakeSummary).toBeNull()
    expect(summary.structuredReasons).toContain('link_count:0')
  })

  it('lists naming-hazard descriptors for a topic in stable id order', () => {
    const descriptors = {
      [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    }

    expect(listNamingHazardDescriptorsForIntakeTopic(descriptors, CANAL_BRIDGE_TOPIC)).toEqual([
      CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    ])
  })

  it('lists intake reports for a naming-hazard descriptor in stable id order', () => {
    const linkedReports = listIntakeReportsForNamingHazardDescriptor(
      CANAL_BRIDGE_REPORTS,
      CANAL_BRIDGE_NAMING_HAZARD_FIXTURE
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

  it('composeAllIntakeNamingHazardCrossLinks returns byte-stable summaries', () => {
    const descriptors = {
      [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    }

    const first = composeAllIntakeNamingHazardCrossLinks(CANAL_BRIDGE_REPORTS, descriptors)
    const second = composeAllIntakeNamingHazardCrossLinks(CANAL_BRIDGE_REPORTS, descriptors)

    expect(first).toEqual(second)
    expect(first).toHaveLength(1)
    expect(first[0]?.topicRef).toBe(CANAL_BRIDGE_TOPIC)
  })

  it('does not link descriptors without topic anchors', () => {
    const descriptors = {
      [COMPULSIVE_PHRASE_BRIEFING_FIXTURE.id]: COMPULSIVE_PHRASE_BRIEFING_FIXTURE,
    }

    const summary = composeIntakeNamingHazardCrossLinks(
      CANAL_BRIDGE_REPORTS,
      descriptors,
      CANAL_BRIDGE_TOPIC
    )

    expect(summary.links).toEqual([])
  })

  it('is idempotent on repeated compose calls', () => {
    const descriptors = {
      [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    }

    const first = composeIntakeNamingHazardCrossLinks(
      CANAL_BRIDGE_REPORTS,
      descriptors,
      CANAL_BRIDGE_TOPIC
    )
    const second = composeIntakeNamingHazardCrossLinks(
      CANAL_BRIDGE_REPORTS,
      descriptors,
      CANAL_BRIDGE_TOPIC
    )

    expect(first).toEqual(second)
  })
})
