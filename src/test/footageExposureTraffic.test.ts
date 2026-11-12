import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT,
  EXAMPLE_PASSIVE_DOC_ARTIFACT,
  evaluateFootageExposureTraffic,
  type ContentPropagationArtifact,
} from '../domain/footageExposureTraffic'

function artifact(overrides: Partial<ContentPropagationArtifact> = {}): ContentPropagationArtifact {
  return {
    ...EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT,
    ...overrides,
  }
}

describe('footageExposureTraffic (SPE-2571 / SPE-947 AC row 2)', () => {
  it('increases civilian exposure and attraction traffic for an active spread footage artifact', () => {
    const decision = evaluateFootageExposureTraffic({
      artifact: artifact(),
      baselineCivilianExposure: 10,
      baselineAttractionTraffic: 4,
    })

    // deltas = weight * intensity → 2*1.5=3, 3*1.5=4.5
    expect(decision.civilianExposureDelta).toBe(3)
    expect(decision.attractionTrafficDelta).toBe(4.5)
    expect(decision.resultingCivilianExposure).toBe(13)
    expect(decision.resultingAttractionTraffic).toBe(8.5)
    expect(decision.amplified).toBe(true)
    expect(decision.reasonCodes).toEqual(['active_spread_amplified'])
    expect(decision).toEqual(
      expect.objectContaining({
        artifactId: 'artifact:leak-footage-clip',
        artifactLabel: 'Leaked containment footage clip',
        kind: 'footage',
        role: 'active_spread',
        intensity: 1.5,
        exposureWeight: 2,
        attractionWeight: 3,
      })
    )
  })

  it('increases traffic for an active spread post artifact', () => {
    const decision = evaluateFootageExposureTraffic({
      artifact: artifact({
        id: 'artifact:rumor-post',
        label: 'Rumor forum post',
        kind: 'post',
        exposureWeight: 1,
        attractionWeight: 5,
        intensity: 2,
      }),
      baselineCivilianExposure: 0,
      baselineAttractionTraffic: 1,
    })

    expect(decision.kind).toBe('post')
    expect(decision.civilianExposureDelta).toBe(2)
    expect(decision.attractionTrafficDelta).toBe(10)
    expect(decision.resultingAttractionTraffic).toBe(11)
    expect(decision.amplified).toBe(true)
    expect(decision.reasonCodes).toEqual(['active_spread_amplified'])
  })

  it('does not amplify passive documentation even when weights are positive', () => {
    const decision = evaluateFootageExposureTraffic({
      artifact: EXAMPLE_PASSIVE_DOC_ARTIFACT,
      baselineCivilianExposure: 7,
      baselineAttractionTraffic: 9,
    })

    expect(decision.amplified).toBe(false)
    expect(decision.civilianExposureDelta).toBe(0)
    expect(decision.attractionTrafficDelta).toBe(0)
    expect(decision.resultingCivilianExposure).toBe(7)
    expect(decision.resultingAttractionTraffic).toBe(9)
    expect(decision.reasonCodes).toEqual(['passive_documentation_no_amplification'])
  })

  it('does not amplify archival footage', () => {
    const decision = evaluateFootageExposureTraffic({
      artifact: artifact({ role: 'archival' }),
      baselineCivilianExposure: 2,
      baselineAttractionTraffic: 3,
    })

    expect(decision.amplified).toBe(false)
    expect(decision.civilianExposureDelta).toBe(0)
    expect(decision.attractionTrafficDelta).toBe(0)
    expect(decision.reasonCodes).toEqual(['archival_no_amplification'])
  })

  it('defaults intensity to 1 when omitted on an active spread path', () => {
    const decision = evaluateFootageExposureTraffic({
      artifact: artifact({ intensity: undefined, exposureWeight: 4, attractionWeight: 1 }),
    })

    expect(decision.intensity).toBe(1)
    expect(decision.civilianExposureDelta).toBe(4)
    expect(decision.attractionTrafficDelta).toBe(1)
    expect(decision.amplified).toBe(true)
    expect(decision.reasonCodes).toEqual(['active_spread_amplified'])
  })

  it('reports zero-weight active spread without amplification', () => {
    const decision = evaluateFootageExposureTraffic({
      artifact: artifact({ exposureWeight: 0, attractionWeight: 0, intensity: 5 }),
    })

    expect(decision.amplified).toBe(false)
    expect(decision.civilianExposureDelta).toBe(0)
    expect(decision.attractionTrafficDelta).toBe(0)
    expect(decision.reasonCodes).toEqual(['active_spread_zero_weights'])
  })

  it('returns byte-stable decisions for the same inputs', () => {
    const buildInput = () => ({
      artifact: artifact(),
      baselineCivilianExposure: 1,
      baselineAttractionTraffic: 2,
    })

    const first = evaluateFootageExposureTraffic(buildInput())
    const second = evaluateFootageExposureTraffic(buildInput())

    expect(second).toEqual(first)
    expect(first.amplified).toBe(true)
  })

  it('falls back deterministically when evaluation input is missing', () => {
    const decision = evaluateFootageExposureTraffic(null)

    expect(decision.amplified).toBe(false)
    expect(decision.civilianExposureDelta).toBe(0)
    expect(decision.attractionTrafficDelta).toBe(0)
    expect(decision.artifactId).toBe('artifact:unknown')
    expect(decision.reasonCodes).toEqual(['missing_evaluation_input'])
  })

  it('falls back deterministically when artifact is missing', () => {
    const decision = evaluateFootageExposureTraffic({
      artifact: null,
      baselineCivilianExposure: 5,
    })

    expect(decision.amplified).toBe(false)
    expect(decision.resultingCivilianExposure).toBe(5)
    expect(decision.reasonCodes).toEqual(['missing_artifact'])
  })

  it('falls back when kind or role is invalid', () => {
    const decision = evaluateFootageExposureTraffic({
      artifact: artifact({
        kind: 'broadcast' as ContentPropagationArtifact['kind'],
        role: 'viral' as ContentPropagationArtifact['role'],
      }),
    })

    expect(decision.amplified).toBe(false)
    expect(decision.kind).toBe('unknown')
    expect(decision.role).toBe('unknown')
    expect(decision.civilianExposureDelta).toBe(0)
    expect(decision.reasonCodes).toEqual([
      'artifact_config_incomplete',
      'missing_or_invalid_kind',
      'missing_or_invalid_role',
    ])
  })

  it('does not amplify when either exposure or attraction weight is invalid', () => {
    const decision = evaluateFootageExposureTraffic({
      artifact: artifact({
        exposureWeight: Number.NaN,
        attractionWeight: 5,
        intensity: 3,
      }),
    })

    expect(decision.amplified).toBe(false)
    expect(decision.civilianExposureDelta).toBe(0)
    expect(decision.attractionTrafficDelta).toBe(0)
    expect(decision.reasonCodes).toEqual([
      'artifact_config_incomplete',
      'missing_or_invalid_exposure_weight',
    ])
  })

  it('does not amplify when both weights are invalid', () => {
    const decision = evaluateFootageExposureTraffic({
      artifact: artifact({
        exposureWeight: Number.NaN,
        attractionWeight: -1,
        intensity: 3,
      }),
    })

    expect(decision.amplified).toBe(false)
    expect(decision.civilianExposureDelta).toBe(0)
    expect(decision.attractionTrafficDelta).toBe(0)
    expect(decision.reasonCodes).toEqual([
      'artifact_config_incomplete',
      'missing_or_invalid_attraction_weight',
      'missing_or_invalid_exposure_weight',
    ])
  })

  it('does not amplify when intensity is invalid', () => {
    const decision = evaluateFootageExposureTraffic({
      artifact: artifact({ intensity: Number.POSITIVE_INFINITY }),
    })

    expect(decision.amplified).toBe(false)
    expect(decision.intensity).toBe(0)
    expect(decision.civilianExposureDelta).toBe(0)
    expect(decision.attractionTrafficDelta).toBe(0)
    expect(decision.reasonCodes).toEqual(['artifact_config_incomplete', 'invalid_intensity'])
  })

  it('treats null intensity as invalid rather than defaulting', () => {
    const decision = evaluateFootageExposureTraffic({
      artifact: {
        ...artifact(),
        intensity: null as unknown as number,
      },
    })

    expect(decision.amplified).toBe(false)
    expect(decision.civilianExposureDelta).toBe(0)
    expect(decision.attractionTrafficDelta).toBe(0)
    expect(decision.reasonCodes).toEqual(['artifact_config_incomplete', 'invalid_intensity'])
  })

  it('preserves finite metrics when micro-scale rounding would overflow', () => {
    const huge = 1e308
    const decision = evaluateFootageExposureTraffic({
      artifact: artifact({ exposureWeight: huge, attractionWeight: 0, intensity: 1 }),
      baselineCivilianExposure: 0,
      baselineAttractionTraffic: 0,
    })

    expect(decision.amplified).toBe(true)
    expect(decision.civilianExposureDelta).toBe(huge)
    expect(decision.resultingCivilianExposure).toBe(huge)
    expect(decision.reasonCodes).toEqual(['active_spread_amplified'])
  })

  it('still amplifies when a positive raw delta rounds to zero at micro precision', () => {
    const decision = evaluateFootageExposureTraffic({
      artifact: artifact({
        exposureWeight: 1e-10,
        attractionWeight: 0,
        intensity: 1,
      }),
    })

    expect(decision.amplified).toBe(true)
    expect(decision.civilianExposureDelta).toBe(0)
    expect(decision.reasonCodes).toEqual(['active_spread_amplified'])
  })

  it('clamps negative baselines and rejects non-finite baselines', () => {
    const decision = evaluateFootageExposureTraffic({
      artifact: artifact({ intensity: 1, exposureWeight: 1, attractionWeight: 1 }),
      baselineCivilianExposure: -3,
      baselineAttractionTraffic: Number.NaN,
    })

    expect(decision.resultingCivilianExposure).toBe(1)
    expect(decision.resultingAttractionTraffic).toBe(1)
    expect(decision.reasonCodes).toEqual([
      'active_spread_amplified',
      'invalid_baseline_attraction_traffic',
      'negative_baseline_civilian_exposure_clamped',
    ])
  })
})
