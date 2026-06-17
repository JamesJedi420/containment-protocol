import { describe, expect, it } from 'vitest'

import { BRIEF_COVER_UP_EVENT_WITH_CLUSTER } from '../domain/extranormalEventRegistry'
import { composeInformationIntakeCrossLinkBundle } from '../domain/informationIntakeCrossLinkBundle'
import {
  FORMAL_ALERT_PARTIAL_FIXTURE,
  IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
} from '../domain/informationIntakeReport'
import { CANAL_BRIDGE_MINOR_ITEM_FIXTURE } from '../domain/minorAnomalyItemRegistry'
import { CANAL_BRIDGE_NAMING_HAZARD_FIXTURE } from '../domain/namingHazardDescriptorRegistry'
import { CANAL_BRIDGE_LOCATION_FIXTURE } from '../domain/unexplainedLocationRegistry'

const CANAL_BRIDGE_TOPIC = 'topic:canal-bridge-incident'

const CANAL_BRIDGE_REPORTS = {
  [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
  [PUBLIC_RUMOR_CONFLICT_FIXTURE.id]: PUBLIC_RUMOR_CONFLICT_FIXTURE,
  [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
}

describe('informationIntakeCrossLinkBundle (SPE-2473 slice 1)', () => {
  it('returns empty grouped links for empty maps without throw', () => {
    const summary = composeInformationIntakeCrossLinkBundle({
      reports: undefined,
      namingHazardDescriptors: undefined,
      extranormalEvents: undefined,
      minorAnomalyItems: undefined,
      unexplainedLocations: undefined,
    })

    expect(summary.namingHazard).toEqual([])
    expect(summary.extranormal).toEqual([])
    expect(summary.minorAnomaly).toEqual([])
    expect(summary.unexplainedLocation).toEqual([])
  })

  it('composes all four intake cross-link groups in one canal-bridge chain call', () => {
    const summary = composeInformationIntakeCrossLinkBundle({
      reports: CANAL_BRIDGE_REPORTS,
      namingHazardDescriptors: {
        [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
      },
      extranormalEvents: {
        [BRIEF_COVER_UP_EVENT_WITH_CLUSTER.id]: BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
      },
      minorAnomalyItems: {
        [CANAL_BRIDGE_MINOR_ITEM_FIXTURE.id]: CANAL_BRIDGE_MINOR_ITEM_FIXTURE,
      },
      unexplainedLocations: {
        [CANAL_BRIDGE_LOCATION_FIXTURE.id]: CANAL_BRIDGE_LOCATION_FIXTURE,
      },
    })

    expect(summary.namingHazard).toHaveLength(1)
    expect(summary.extranormal).toHaveLength(1)
    expect(summary.minorAnomaly).toHaveLength(1)
    expect(summary.unexplainedLocation).toHaveLength(1)

    expect(summary.namingHazard[0]?.topicRef).toBe(CANAL_BRIDGE_TOPIC)
    expect(summary.extranormal[0]?.topicRef).toBe(CANAL_BRIDGE_TOPIC)
    expect(summary.minorAnomaly[0]?.topicRef).toBe(CANAL_BRIDGE_TOPIC)
    expect(summary.unexplainedLocation[0]?.topicRef).toBe(CANAL_BRIDGE_TOPIC)

    expect(summary.namingHazard[0]?.links).toHaveLength(3)
    expect(summary.extranormal[0]?.links).toHaveLength(3)
    expect(summary.minorAnomaly[0]?.links).toHaveLength(3)
    expect(summary.unexplainedLocation[0]?.links).toHaveLength(3)
  })

  it('returns byte-stable output on repeated compose calls', () => {
    const input = {
      reports: CANAL_BRIDGE_REPORTS,
      namingHazardDescriptors: {
        [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
      },
      extranormalEvents: {
        [BRIEF_COVER_UP_EVENT_WITH_CLUSTER.id]: BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
      },
      minorAnomalyItems: {
        [CANAL_BRIDGE_MINOR_ITEM_FIXTURE.id]: CANAL_BRIDGE_MINOR_ITEM_FIXTURE,
      },
      unexplainedLocations: {
        [CANAL_BRIDGE_LOCATION_FIXTURE.id]: CANAL_BRIDGE_LOCATION_FIXTURE,
      },
    } as const

    const first = composeInformationIntakeCrossLinkBundle(input)
    const second = composeInformationIntakeCrossLinkBundle(input)

    expect(first).toEqual(second)
  })
})
