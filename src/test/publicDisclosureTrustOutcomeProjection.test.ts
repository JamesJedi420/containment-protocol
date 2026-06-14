import { describe, expect, it } from 'vitest'
import {
  DISCLOSURE_PROGRESSION_FIXTURE,
  NORMALIZATION_INPUT_FIXTURE,
  type PublicDisclosureRecord,
} from '../domain/publicDisclosureStateRegistry'
import {
  formatPublicDisclosureTrustOutcomeNoteContent,
  projectPublicDisclosureTrustOutcome,
} from '../domain/publicDisclosureTrustOutcomeProjection'

describe('publicDisclosureTrustOutcomeProjection (SPE-861 slice 2)', () => {
  it('returns inactive projection for an empty disclosure map', () => {
    const projection = projectPublicDisclosureTrustOutcome({})

    expect(projection.isEmpty).toBe(true)
    expect(projection.activeCampaignCount).toBe(0)
    expect(projection.cooperationBand).toBe('inactive')
    expect(projection.aggregateRegionalTrustBand).toBeNull()
    expect(projection.frontDeskAttentionTone).toBe('info')
  })

  it('projects opposed cooperation for official disclosure with low regional trust', () => {
    const projection = projectPublicDisclosureTrustOutcome({
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    })

    expect(projection.activeCampaignCount).toBe(1)
    expect(projection.dominantAwarenessLevel).toBe('official_disclosure')
    expect(projection.aggregateRegionalTrustBand).toBe('low')
    expect(projection.cooperationBand).toBe('opposed')
    expect(projection.cooperationBandLabel).toBe('Opposed posture')
    expect(projection.frontDeskAttentionTone).toBe('danger')
    expect(projection.frontDeskAttentionSummary).toContain('opposed posture')
  })

  it('projects aligned cooperation for normalization with moderate regional trust', () => {
    const projection = projectPublicDisclosureTrustOutcome({
      [NORMALIZATION_INPUT_FIXTURE.id]: NORMALIZATION_INPUT_FIXTURE,
    })

    expect(projection.activeCampaignCount).toBe(1)
    expect(projection.dominantAwarenessLevel).toBe('normalization')
    expect(projection.aggregateRegionalTrustBand).toBe('moderate')
    expect(projection.cooperationBand).toBe('aligned')
    expect(projection.frontDeskAttentionTone).toBe('info')
  })

  it('derives dominant awareness and watchful cooperation across mixed records', () => {
    const projection = projectPublicDisclosureTrustOutcome({
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
      [NORMALIZATION_INPUT_FIXTURE.id]: NORMALIZATION_INPUT_FIXTURE,
    })

    expect(projection.activeCampaignCount).toBe(2)
    expect(projection.dominantAwarenessLevel).toBe('normalization')
    expect(projection.aggregateRegionalTrustBand).toBe('low')
    expect(projection.cooperationBand).toBe('watchful')
    expect(projection.frontDeskAttentionTone).toBe('warning')
  })

  it('ignores redacted regional trust scores when aggregating trust band', () => {
    const redactedRecord: PublicDisclosureRecord = {
      ...DISCLOSURE_PROGRESSION_FIXTURE,
      trustByRegion: [{ regionRef: 'region:coastal-metro', trustScore: 0.12 }],
      redactedFields: ['trustByRegion'],
    }

    const projection = projectPublicDisclosureTrustOutcome({
      [redactedRecord.id]: redactedRecord,
    })

    expect(projection.aggregateRegionalTrustBand).toBeNull()
    expect(projection.cooperationBand).toBe('watchful')
  })

  it('formats weekly trust-outcome note content deterministically', () => {
    const projection = projectPublicDisclosureTrustOutcome({
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    })

    expect(formatPublicDisclosureTrustOutcomeNoteContent(projection, 24)).toBe(
      'Public disclosure trust outcome — W24: 1 active campaign(s); dominant awareness Official Disclosure; Opposed posture; Low regional trust.'
    )
  })

  it('is byte-stable for repeated projections', () => {
    const records = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
      [NORMALIZATION_INPUT_FIXTURE.id]: NORMALIZATION_INPUT_FIXTURE,
    }

    const first = JSON.stringify(projectPublicDisclosureTrustOutcome(records))
    const second = JSON.stringify(projectPublicDisclosureTrustOutcome(records))

    expect(first).toBe(second)
  })
})
