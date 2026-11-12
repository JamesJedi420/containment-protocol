import { describe, expect, it } from 'vitest'
import {
  DISCLOSURE_PROGRESSION_FIXTURE,
  NORMALIZATION_INPUT_FIXTURE,
  type PublicDisclosureRecord,
} from '../domain/publicDisclosureStateRegistry'
import {
  formatPublicDisclosureSegmentedTrustOutcomeNoteContent,
  projectPublicDisclosureSegmentedTrustOutcome,
} from '../domain/publicDisclosureSegmentedTrustOutcomeProjection'

const SEGMENT_DIVERGENCE_FIXTURE: PublicDisclosureRecord = {
  ...DISCLOSURE_PROGRESSION_FIXTURE,
  id: 'disclosure:segment-divergence-test',
  label: 'Segment trust divergence campaign',
  trustByRegion: [
    { regionRef: 'population:general-public', trustScore: 0.72 },
    { regionRef: 'population:affected-residents', trustScore: 0.28 },
    { regionRef: 'channel:institutional-press', trustScore: 0.55 },
    { regionRef: 'channel:community-forums', trustScore: 0.18 },
  ],
}

const UNIFORM_SEGMENT_FIXTURE: PublicDisclosureRecord = {
  ...DISCLOSURE_PROGRESSION_FIXTURE,
  id: 'disclosure:uniform-segment-test',
  label: 'Uniform segment trust campaign',
  trustByRegion: [
    { regionRef: 'population:general-public', trustScore: 0.65 },
    { regionRef: 'channel:institutional-press', trustScore: 0.62 },
  ],
}

describe('publicDisclosureSegmentedTrustOutcomeProjection (SPE-861 slice 3)', () => {
  it('returns inactive projection for an empty disclosure map', () => {
    const projection = projectPublicDisclosureSegmentedTrustOutcome({})

    expect(projection.isEmpty).toBe(true)
    expect(projection.isInactive).toBe(true)
    expect(projection.activeCampaignCount).toBe(0)
    expect(projection.visibleSegmentCount).toBe(0)
    expect(projection.hasDivergence).toBe(false)
    expect(projection.segmentEntries).toEqual([])
    expect(projection.frontDeskDivergenceSummary).toBeNull()
  })

  it('classifies region refs as population segments and sorts deterministically', () => {
    const projection = projectPublicDisclosureSegmentedTrustOutcome({
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    })

    expect(projection.activeCampaignCount).toBe(1)
    expect(projection.segmentEntries).toHaveLength(2)
    expect(projection.segmentEntries[0]?.segmentKind).toBe('population')
    expect(projection.segmentEntries[0]?.segmentLabel).toBe('Coastal Metro')
    expect(projection.segmentEntries[0]?.trustBand).toBe('low')
    expect(projection.segmentEntries[1]?.segmentLabel).toBe('Inland Corridor')
    expect(projection.hasDivergence).toBe(true)
    expect(projection.divergenceLabel).toBe('Segment trust diverges')
  })

  it('detects divergent population and channel segment trust bands', () => {
    const projection = projectPublicDisclosureSegmentedTrustOutcome({
      [SEGMENT_DIVERGENCE_FIXTURE.id]: SEGMENT_DIVERGENCE_FIXTURE,
    })

    expect(projection.visibleSegmentCount).toBe(4)
    expect(projection.hasDivergence).toBe(true)
    expect(projection.segmentEntries.map((entry) => entry.segmentKind)).toEqual([
      'population',
      'population',
      'channel',
      'channel',
    ])
    expect(projection.frontDeskDivergenceSummary).toContain('Segment trust diverges')
    expect(projection.frontDeskDivergenceTone).toBe('warning')
  })

  it('reports uniform segment trust when visible bands align', () => {
    const projection = projectPublicDisclosureSegmentedTrustOutcome({
      [UNIFORM_SEGMENT_FIXTURE.id]: UNIFORM_SEGMENT_FIXTURE,
    })

    expect(projection.visibleSegmentCount).toBe(2)
    expect(projection.hasDivergence).toBe(false)
    expect(projection.divergenceLabel).toBe('Uniform segment trust')
    expect(projection.frontDeskDivergenceSummary).toBeNull()
  })

  it('ignores redacted regional scores in divergence and segment breakdown', () => {
    const redactedRecord: PublicDisclosureRecord = {
      ...SEGMENT_DIVERGENCE_FIXTURE,
      redactedFields: ['trustByRegion'],
    }

    const projection = projectPublicDisclosureSegmentedTrustOutcome({
      [redactedRecord.id]: redactedRecord,
    })

    expect(projection.segmentEntries.every((entry) => entry.redacted)).toBe(true)
    expect(projection.visibleSegmentCount).toBe(0)
    expect(projection.hasDivergence).toBe(false)
    expect(projection.segmentEntries[0]?.trustBandLabel).toBe('—')
  })

  it('aggregates minimum trust score for duplicate segment refs across records', () => {
    const secondRecord: PublicDisclosureRecord = {
      ...NORMALIZATION_INPUT_FIXTURE,
      trustByRegion: [{ regionRef: 'region:coastal-metro', trustScore: 0.12 }],
    }

    const projection = projectPublicDisclosureSegmentedTrustOutcome({
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
      [secondRecord.id]: secondRecord,
    })

    const coastalEntry = projection.segmentEntries.find(
      (entry) => entry.segmentRef === 'region:coastal-metro'
    )

    expect(coastalEntry?.trustBand).toBe('low')
    expect(projection.activeCampaignCount).toBe(2)
  })

  it('formats weekly segment-divergence note content deterministically', () => {
    const projection = projectPublicDisclosureSegmentedTrustOutcome({
      [SEGMENT_DIVERGENCE_FIXTURE.id]: SEGMENT_DIVERGENCE_FIXTURE,
    })

    expect(formatPublicDisclosureSegmentedTrustOutcomeNoteContent(projection, 24)).toBe(
      'Public disclosure segment trust divergence — W24: 1 active campaign(s); Affected Residents (Low); General Public (High); Community Forums (Low); Institutional Press (Moderate).'
    )
  })

  it('is byte-stable for repeated projections', () => {
    const records = {
      [SEGMENT_DIVERGENCE_FIXTURE.id]: SEGMENT_DIVERGENCE_FIXTURE,
      [NORMALIZATION_INPUT_FIXTURE.id]: NORMALIZATION_INPUT_FIXTURE,
    }

    const first = JSON.stringify(projectPublicDisclosureSegmentedTrustOutcome(records))
    const second = JSON.stringify(projectPublicDisclosureSegmentedTrustOutcome(records))

    expect(first).toBe(second)
  })

  it('applies post-exposure trust delta to segment bands (SPE-2701)', () => {
    const records = { [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE }
    const baseline = projectPublicDisclosureSegmentedTrustOutcome(records)
    const protective = projectPublicDisclosureSegmentedTrustOutcome(records, null, {
      postExposureTrustDelta: 0.08,
    })
    const coastalBaseline = baseline.segmentEntries.find(
      (entry) => entry.segmentLabel === 'Coastal Metro'
    )
    const coastalProtective = protective.segmentEntries.find(
      (entry) => entry.segmentLabel === 'Coastal Metro'
    )

    expect(coastalBaseline?.trustBandLabel).toBe('Low')
    expect(coastalProtective?.trustBandLabel).toBe('Moderate')
  })
})
