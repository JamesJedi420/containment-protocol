import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  DISCLOSURE_PROGRESSION_FIXTURE,
  NORMALIZATION_INPUT_FIXTURE,
} from '../../domain/publicDisclosureStateRegistry'
import {
  formatPublicDisclosureEnumLabel,
  getPublicDisclosureMirrorView,
} from './publicDisclosureMirrorView'

describe('publicDisclosureMirrorView (SPE-2109 slice 4)', () => {
  it('returns empty mirror when publicDisclosureRecords map is empty', () => {
    const game = createStartingState()

    expect(game.publicDisclosureRecords).toEqual({})

    const view = getPublicDisclosureMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors awareness, fallout, and regional trust without re-validating dropped records', () => {
    const game = createStartingState()
    game.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }

    const view = getPublicDisclosureMirrorView(game)
    const record = view.records[0]

    expect(view.isEmpty).toBe(false)
    expect(view.summary.disclosureActiveCount).toBe(1)
    expect(record?.awarenessLevelLabel).toBe('Official Disclosure')
    expect(record?.falloutPhaseLabel).toBe('Disclosure')
    expect(record?.regionalTrustViews).toHaveLength(2)
    expect(record?.regionalTrustViews[0]?.regionRef).toBe('region:coastal-metro')
    expect(record?.regionalTrustViews[0]?.trustScoreLabel).toBe('0.31')
    expect(record?.transitionHistoryLabels).toEqual([
      'W18: Secrecy Intact → Credible Leak (Leak)',
      'W21: Credible Leak → Public Scandal (Disclosure)',
      'W24: Public Scandal → Official Disclosure (Disclosure)',
    ])
    expect(record?.linkedContractCount).toBe(1)
    expect(record?.confidenceLabel).toBe('0.58')
  })

  it('projects normalization inputs for normalization fixture', () => {
    const game = createStartingState()
    game.publicDisclosureRecords = {
      [NORMALIZATION_INPUT_FIXTURE.id]: NORMALIZATION_INPUT_FIXTURE,
    }

    const view = getPublicDisclosureMirrorView(game)
    const record = view.records[0]

    expect(view.summary.normalizationInputCount).toBe(1)
    expect(record?.awarenessLevelLabel).toBe('Normalization')
    expect(record?.falloutPhaseLabel).toBe('Commerce')
    expect(record?.campaignObjectivePivotLabel).toBe('Adaptation')
    expect(record?.normalizationInputLabels[0]).toContain('Anomaly Tourism')
    expect(record?.normalizationInputLabels[0]).toContain('Guided weekend tours')
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatPublicDisclosureEnumLabel('official_disclosure')).toBe('Official Disclosure')
    expect(formatPublicDisclosureEnumLabel('media_saturation')).toBe('Media Saturation')
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
      [NORMALIZATION_INPUT_FIXTURE.id]: NORMALIZATION_INPUT_FIXTURE,
    }

    const first = JSON.stringify(getPublicDisclosureMirrorView(game))
    const second = JSON.stringify(getPublicDisclosureMirrorView(game))

    expect(first).toBe(second)
  })
})
