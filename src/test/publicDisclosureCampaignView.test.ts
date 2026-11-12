import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  DISCLOSURE_PROGRESSION_FIXTURE,
  NORMALIZATION_INPUT_FIXTURE,
  type PublicDisclosureRecord,
} from '../domain/publicDisclosureStateRegistry'
import { COASTAL_RESEARCH_CAMPUS_DUAL_INCIDENT_TRUTH_LAYER_FIXTURES } from '../domain/truthLayerCoverNarrativePairing'
import { COVER_NARRATIVE_TRUTH_LAYER_FIXTURE } from '../domain/truthLayerRecordRegistry'
import { getPublicDisclosureCampaignView } from '../features/operations/publicDisclosureCampaignView'
import { applyPublicDisclosurePostureChoice } from '../domain/publicDisclosurePostureChoice'

describe('publicDisclosureCampaignView (SPE-861 slice 1)', () => {
  it('returns empty campaign view when publicDisclosureRecords map is empty', () => {
    const game = createStartingState()

    expect(game.publicDisclosureRecords).toEqual({})

    const view = getPublicDisclosureCampaignView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.activeDisclosureCount).toBe(0)
    expect(view.summary.dominantAwarenessBandLabel).toBe('No active disclosure posture')
    expect(view.records).toEqual([])
  })

  it('projects progression fixture with institutional labels and regional trust bands', () => {
    const game = createStartingState()
    game.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }

    const view = getPublicDisclosureCampaignView(game)
    const record = view.records[0]

    expect(view.isEmpty).toBe(false)
    expect(view.summary.activeDisclosureCount).toBe(1)
    expect(view.summary.dominantAwarenessBandLabel).toBe('Official Disclosure')
    expect(view.summary.cooperationBandLabel).toBe('Opposed posture')
    expect(record?.label).toBe(DISCLOSURE_PROGRESSION_FIXTURE.label)
    expect(record?.awarenessLevelLabel).toBe('Official Disclosure')
    expect(record?.falloutPhaseLabel).toBe('Disclosure')
    expect(record?.regionalBandViews).toHaveLength(2)
    expect(record?.regionalBandViews[0]?.regionLabel).toBe('Coastal Metro')
    expect(record?.regionalBandViews[0]?.trustBandLabel).toBe('Low')
    expect(record?.confidenceBandLabel).toBe('Moderate confidence')
  })

  it('suppresses redacted summary and confidence for player copy', () => {
    const game = createStartingState()
    const redactedRecord: PublicDisclosureRecord = {
      ...DISCLOSURE_PROGRESSION_FIXTURE,
      summary: 'Internal escalation memo with restricted detail.',
      redactedFields: ['summary', 'confidence'],
    }

    game.publicDisclosureRecords = {
      [redactedRecord.id]: redactedRecord,
    }

    const record = getPublicDisclosureCampaignView(game).records[0]

    expect(record?.summaryLabel).toBe('Briefing summary withheld pending review.')
    expect(record?.confidenceBandLabel).toBe('Withheld')
    expect(record?.redacted).toBe(true)
  })

  it('resolves optional cover-narrative context label without operational record text', () => {
    const game = createStartingState()
    game.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }
    game.truthLayerRecords = { ...COASTAL_RESEARCH_CAMPUS_DUAL_INCIDENT_TRUTH_LAYER_FIXTURES }

    const record = getPublicDisclosureCampaignView(game).records[0]

    expect(record?.coverNarrativeContextLabel).toBe(COVER_NARRATIVE_TRUTH_LAYER_FIXTURE.label)
  })

  it('derives dominant awareness band across multiple records', () => {
    const game = createStartingState()
    game.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
      [NORMALIZATION_INPUT_FIXTURE.id]: NORMALIZATION_INPUT_FIXTURE,
    }

    const view = getPublicDisclosureCampaignView(game)

    expect(view.summary.activeDisclosureCount).toBe(2)
    expect(view.summary.dominantAwarenessBandLabel).toBe('Normalization')
  })

  it('surfaces segment trust chips and divergence label in campaign summary', () => {
    const game = createStartingState()
    game.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }

    const view = getPublicDisclosureCampaignView(game)

    expect(view.summary.segmentDivergenceLabel).toBe('Segment trust diverges')
    expect(view.summary.segmentTrustChips).toHaveLength(2)
    expect(view.summary.segmentTrustChips[0]?.segmentLabel).toBe('Coastal Metro')
    expect(view.summary.segmentTrustChips[0]?.segmentKindLabel).toBe('Population')
  })

  it('is byte-stable for repeated campaign builds', () => {
    const game = createStartingState()
    game.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
      [NORMALIZATION_INPUT_FIXTURE.id]: NORMALIZATION_INPUT_FIXTURE,
    }

    const first = JSON.stringify(getPublicDisclosureCampaignView(game))
    const second = JSON.stringify(getPublicDisclosureCampaignView(game))

    expect(first).toBe(second)
  })

  it('surfaces posture choice options and shifts cooperation band from selected posture', () => {
    const game = createStartingState()
    game.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }

    const baseline = getPublicDisclosureCampaignView(game)
    const record = baseline.records[0]

    expect(record?.recordId).toBe(DISCLOSURE_PROGRESSION_FIXTURE.id)
    expect(record?.allowsPostureChoice).toBe(true)
    expect(record?.postureChoiceOptions).toHaveLength(3)
    expect(record?.selectedPostureChoice).toBeNull()
    expect(baseline.summary.cooperationBandLabel).toBe('Opposed posture')

    const withTransparent = applyPublicDisclosurePostureChoice(game, {
      recordId: DISCLOSURE_PROGRESSION_FIXTURE.id,
      posture: 'transparent',
    }).state
    const adjusted = getPublicDisclosureCampaignView(withTransparent)

    expect(adjusted.records[0]?.selectedPostureChoice).toBe('transparent')
    expect(adjusted.records[0]?.selectedPostureChoiceLabel).toBe('Transparent posture')
    expect(adjusted.summary.cooperationBandLabel).toBe('Watchful compliance')
  })

  it('aligns campaign regional bands with standing-shaped post-exposure trust (SPE-2701)', () => {
    const game = createStartingState()
    game.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }
    game.reports = [
      {
        week: 1,
        rngStateBefore: 1,
        rngStateAfter: 2,
        newCases: [],
        progressedCases: [],
        resolvedCases: Array.from({ length: 10 }, (_, index) => `resolved-a-${index}`),
        failedCases: [],
        partialCases: [],
        unresolvedTriggers: [],
        spawnedCases: [],
        maxStage: 1,
        avgFatigue: 0,
        teamStatus: [],
        notes: [],
      },
      {
        week: 2,
        rngStateBefore: 2,
        rngStateAfter: 3,
        newCases: [],
        progressedCases: [],
        resolvedCases: Array.from({ length: 10 }, (_, index) => `resolved-b-${index}`),
        failedCases: [],
        partialCases: [],
        unresolvedTriggers: [],
        spawnedCases: [],
        maxStage: 1,
        avgFatigue: 0,
        teamStatus: [],
        notes: [],
      },
    ]

    const view = getPublicDisclosureCampaignView(game)
    const coastal = view.records[0]?.regionalBandViews.find(
      (entry) => entry.regionLabel === 'Coastal Metro'
    )
    const coastalChip = view.summary.segmentTrustChips.find(
      (entry) => entry.segmentLabel === 'Coastal Metro'
    )

    expect(view.summary.cooperationBandLabel).toBe('Watchful compliance')
    expect(coastal?.trustBandLabel).toBe('Moderate')
    expect(coastalChip?.trustBandLabel).toBe('Moderate')
  })
})
