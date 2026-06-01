import { describe, expect, it } from 'vitest'
import {
  CONTAINMENT_SURFACES,
  EVENT_LOOP_STATES,
  HISTORICAL_DEVIATION_CUSTODY_FIXTURE,
  MEDIA_KINDS,
  REPEATING_FILTERED_VIEWING_FIXTURE,
  projectPlaybackExposureRisk,
  validateMediaContainedEventRecord,
  type MediaContainedEventRecord,
} from '../domain/mediaContainedEventRegistry'

function baseRecord(
  overrides: Partial<MediaContainedEventRecord> = {}
): MediaContainedEventRecord {
  return {
    id: 'media-contained:test-base',
    label: 'Test media-contained event',
    mediaKind: 'editorial_sequence',
    eventLoopState: 'linear',
    playbackPosition: 2,
    historicalDeviationFlag: false,
    custodyChainRefs: ['custody:test-chain-a'],
    publicExposureRisk: 0.25,
    containmentSurface: 'airgap',
    ...overrides,
  }
}

describe('mediaContainedEventRegistry (SPE-2120 slice 1)', () => {
  it('validates repeating loop fixture with filtered_viewing containment', () => {
    const result = validateMediaContainedEventRecord(REPEATING_FILTERED_VIEWING_FIXTURE)

    expect(result.valid).toBe(true)
    expect(REPEATING_FILTERED_VIEWING_FIXTURE.eventLoopState).toBe('repeating')
    expect(REPEATING_FILTERED_VIEWING_FIXTURE.containmentSurface).toBe('filtered_viewing')
  })

  it('validates historical deviation fixture with custody chain refs', () => {
    const result = validateMediaContainedEventRecord(HISTORICAL_DEVIATION_CUSTODY_FIXTURE)

    expect(result.valid).toBe(true)
    expect(HISTORICAL_DEVIATION_CUSTODY_FIXTURE.historicalDeviationFlag).toBe(true)
    expect(HISTORICAL_DEVIATION_CUSTODY_FIXTURE.custodyChainRefs).toHaveLength(2)
  })

  it('projects custody symptoms and risk metadata', () => {
    const projection = projectPlaybackExposureRisk(REPEATING_FILTERED_VIEWING_FIXTURE, {
      currentWeek: 4,
    })

    expect(projection.custodySymptoms).toHaveLength(2)
    expect(projection.custodySymptoms[0]?.symptomDescriptor).toContain(
      'Repeating loop recurrence observed for'
    )
    expect(projection.projectedExposureRisk).not.toBeNull()
    expect(projection.playbackStabilityScore).not.toBeNull()
  })

  it('errors when branching loop omits branchRules', () => {
    const result = validateMediaContainedEventRecord(
      baseRecord({
        eventLoopState: 'branching',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'branching_without_branch_rules')).toBe(true)
  })

  it('warns when no_playback still has active public exposure risk', () => {
    const result = validateMediaContainedEventRecord(
      baseRecord({
        containmentSurface: 'no_playback',
        publicExposureRisk: 0.74,
      })
    )

    expect(result.valid).toBe(true)
    expect(
      result.issues.some((issue) => issue.code === 'no_playback_with_unmitigated_exposure_risk')
    ).toBe(true)
  })

  it('errors when custodyChainRefs is empty', () => {
    const result = validateMediaContainedEventRecord(
      baseRecord({
        custodyChainRefs: [],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'invalid_custody_chain_refs')).toBe(true)
  })

  it('errors on franchise token in record id', () => {
    const result = validateMediaContainedEventRecord(
      baseRecord({
        id: 'media-contained:foundation-loop-file',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_id')).toBe(true)
  })

  it('errors on branded object number in custodyChainRefs', () => {
    const result = validateMediaContainedEventRecord(
      baseRecord({
        custodyChainRefs: ['custody:SCP-173-exhibit'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'branded_object_number_in_field')).toBe(true)
  })

  it('redacts custody symptoms when policy requests unknown redaction', () => {
    const projection = projectPlaybackExposureRisk(
      {
        ...REPEATING_FILTERED_VIEWING_FIXTURE,
        unknownFields: ['custodyChainRefs'],
      },
      {
        redactUnknown: true,
      }
    )

    expect(projection.custodySymptoms).toHaveLength(0)
    expect(projection.redacted).toBe(true)
  })

  it('suppresses visual trigger hooks when hidden conflict labels are suppressed', () => {
    const projection = projectPlaybackExposureRisk(REPEATING_FILTERED_VIEWING_FIXTURE, {
      suppressHiddenConflictLabels: true,
    })

    expect(projection.custodySymptoms.every((entry) => entry.visualTriggerHook === null)).toBe(true)
  })

  it('returns byte-stable validation results on repeated calls', () => {
    const first = validateMediaContainedEventRecord(HISTORICAL_DEVIATION_CUSTODY_FIXTURE)
    const second = validateMediaContainedEventRecord(HISTORICAL_DEVIATION_CUSTODY_FIXTURE)

    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('exports stable union catalogs', () => {
    expect(MEDIA_KINDS).toEqual(['digital_recording', 'broadcast_capture', 'editorial_sequence'])
    expect(EVENT_LOOP_STATES).toEqual(['linear', 'repeating', 'branching', 'frozen'])
    expect(CONTAINMENT_SURFACES).toEqual(['airgap', 'filtered_viewing', 'no_playback'])
  })
})
