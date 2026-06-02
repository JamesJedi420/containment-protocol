import { describe, expect, it } from 'vitest'
import {
  BLIND_SPOT_COVERAGE_REQUEST,
  CRAWLER_REACH_BANDS,
  INFERENCE_MODEL_BANDS,
  INSTITUTIONAL_ONLY_COVERAGE_REQUEST,
  PARTIAL_PUBLIC_COVERAGE_REQUEST,
  PUBLIC_SIGNAL_COVERAGE_BANDS,
  evaluatePublicSignalCoverage,
  isCrawlerReachBand,
  isInferenceModelBand,
  isPublicSignalCoverageBand,
} from '../domain/publicSignalCoverage'

describe('publicSignalCoverage (SPE-2092 slice 1)', () => {
  it('exposes canonical coverage, crawler, and inference unions', () => {
    expect(PUBLIC_SIGNAL_COVERAGE_BANDS).toEqual([
      'institutional_only',
      'partial_public',
      'public_led',
      'blind_spot',
    ])
    expect(CRAWLER_REACH_BANDS).toEqual(['none', 'low', 'medium', 'high'])
    expect(INFERENCE_MODEL_BANDS).toEqual(['opaque', 'low', 'moderate', 'high'])
    expect(isPublicSignalCoverageBand('blind_spot')).toBe(true)
    expect(isPublicSignalCoverageBand('unknown')).toBe(false)
    expect(isCrawlerReachBand('medium')).toBe(true)
    expect(isInferenceModelBand('opaque')).toBe(true)
  })

  it('flags blind spot when public activity is high and institutional channels are absent', () => {
    const result = evaluatePublicSignalCoverage(BLIND_SPOT_COVERAGE_REQUEST)

    expect(result.coverageBand).toBe('blind_spot')
    expect(result.falseNegativeRisk).toBeGreaterThan(0)
    expect(result.confidencePenalty).toBeGreaterThan(0)
    expect(result.structuredReasons).toContain('institutional_channel_gap')
    expect(result.structuredReasons).toContain('crawler_blind_spot')
    expect(result.summary.publicActivityWeight).toBeGreaterThan(0)
    expect(result.summary.institutionalChannelCount).toBe(0)
  })

  it('returns institutional_only with minimal penalty when only institutional channels are active', () => {
    const result = evaluatePublicSignalCoverage(INSTITUTIONAL_ONLY_COVERAGE_REQUEST)

    expect(result.coverageBand).toBe('institutional_only')
    expect(result.confidencePenalty).toBeLessThanOrEqual(0.05)
    expect(result.falseNegativeRisk).toBeLessThanOrEqual(0.1)
    expect(result.summary.institutionalChannelCount).toBe(4)
    expect(result.summary.publicChannelCount).toBe(0)
  })

  it('returns partial_public with bounded confidence penalty for mixed channel coverage', () => {
    const result = evaluatePublicSignalCoverage(PARTIAL_PUBLIC_COVERAGE_REQUEST)

    expect(result.coverageBand).toBe('partial_public')
    expect(result.confidencePenalty).toBeGreaterThan(0)
    expect(result.confidencePenalty).toBeLessThanOrEqual(0.45)
    expect(result.summary.institutionalChannelCount).toBeGreaterThan(0)
    expect(result.summary.publicChannelCount).toBeGreaterThan(0)
  })

  it('defaults safely for sparse or invalid input without throwing', () => {
    const sparse = evaluatePublicSignalCoverage({})
    const invalidBands = evaluatePublicSignalCoverage({
      topicId: 'topic:test',
      districtId: 'district:test',
      crawlerReachBand: 'invalid' as 'none',
      inferenceModelBand: 'invalid' as 'opaque',
    })

    expect(sparse.coverageBand).toBe('partial_public')
    expect(sparse.structuredReasons).toContain('sparse_input_defaults')
    expect(sparse.confidencePenalty).toBeLessThanOrEqual(0.15)
    expect(sparse.falseNegativeRisk).toBeLessThanOrEqual(0.2)

    expect(invalidBands.coverageBand).toBe('partial_public')
    expect(invalidBands.structuredReasons.some((reason) => reason.startsWith('crawler:'))).toBe(
      true
    )
    expect(
      invalidBands.structuredReasons.some((reason) => reason.startsWith('inference:'))
    ).toBe(true)
  })

  it('classifies public_led when public activity dominates institutional channels', () => {
    const result = evaluatePublicSignalCoverage({
      topicId: 'topic:warehouse-cluster',
      districtId: 'district:industrial-north',
      institutionalChannels: { formalAlert: true },
      publicChannels: {
        communityPatternMatching: true,
        ambientSocialSignal: true,
        mediaTrace: true,
        rumorChain: true,
        grassrootsDensityHigh: true,
      },
      crawlerReachBand: 'low',
      inferenceModelBand: 'low',
    })

    expect(result.coverageBand).toBe('public_led')
    expect(result.falseNegativeRisk).toBeGreaterThan(result.confidencePenalty * 0.5)
  })

  it('returns byte-stable output across repeated evaluation', () => {
    const first = evaluatePublicSignalCoverage(PARTIAL_PUBLIC_COVERAGE_REQUEST)
    const second = evaluatePublicSignalCoverage(PARTIAL_PUBLIC_COVERAGE_REQUEST)

    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
  })

  it('sorts structured reasons deterministically', () => {
    const result = evaluatePublicSignalCoverage(BLIND_SPOT_COVERAGE_REQUEST)
    const sorted = [...result.structuredReasons].sort((left, right) => left.localeCompare(right))

    expect(result.structuredReasons).toEqual(sorted)
  })
})
