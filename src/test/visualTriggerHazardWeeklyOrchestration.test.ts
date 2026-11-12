import { describe, expect, it } from 'vitest'
import {
  ARTISTIC_EXEMPT_DERIVATIVE_FIXTURE,
  COVERED_PURSUIT_RESOLUTION_FIXTURE,
  DISPOSAL_DEADLINE_SWEEP_FIXTURE,
  SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE,
  type VisualTriggerHazardRecord,
} from '../domain/visualTriggerHazardRegistry'
import {
  advanceVisualTriggerHazardRecordForWeek,
  applyWeeklyVisualTriggerHazardTick,
  resolveNextObserverAwarenessBand,
  resolveNextSweepStatusForCompliancePosture,
  resolveVisualTriggerHazardScheduledAwarenessDueWeek,
} from '../domain/visualTriggerHazardWeeklyOrchestration'

function baseRecord(
  overrides: Partial<VisualTriggerHazardRecord> = {}
): VisualTriggerHazardRecord {
  return {
    id: 'visual-trigger:weekly-orchestration-test',
    label: 'Weekly orchestration test record',
    triggerMedium: 'photo',
    awarenessRequirement: 'conscious',
    derivativeHazardProfile: 'full',
    pursuitState: 'dormant',
    occlusionState: 'exposed',
    ...overrides,
  }
}

describe('visualTriggerHazardWeeklyOrchestration (SPE-2111 slice 3)', () => {
  it('is a no-op for an empty map without throwing', () => {
    expect(applyWeeklyVisualTriggerHazardTick({}, 12)).toEqual({})
    expect(applyWeeklyVisualTriggerHazardTick(undefined, 12)).toEqual({})
  })

  it('resolves scheduled awareness due week from exposurePathWeeks metadata', () => {
    expect(
      resolveVisualTriggerHazardScheduledAwarenessDueWeek(SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE)
    ).toBe(5)
    expect(resolveVisualTriggerHazardScheduledAwarenessDueWeek(COVERED_PURSUIT_RESOLUTION_FIXTURE)).toBeUndefined()
  })

  it('resolves next sweep status for compliance posture advance', () => {
    expect(resolveNextSweepStatusForCompliancePosture('none')).toBe('scheduled')
    expect(resolveNextSweepStatusForCompliancePosture('scheduled')).toBe('in_progress')
    expect(resolveNextSweepStatusForCompliancePosture('in_progress')).toBeUndefined()
  })

  it('resolves next observer awareness band on the ladder', () => {
    expect(resolveNextObserverAwarenessBand('unaware')).toBe('peripheral')
    expect(resolveNextObserverAwarenessBand('conscious')).toBe('heightened')
    expect(resolveNextObserverAwarenessBand('full')).toBeUndefined()
  })

  it('advances sweep status for disposal-deadline compliance posture', () => {
    const advanced = advanceVisualTriggerHazardRecordForWeek(DISPOSAL_DEADLINE_SWEEP_FIXTURE, 32)
    const mediaInstance = advanced.hazardousMediaInstances?.[0]

    expect(advanced).not.toBe(DISPOSAL_DEADLINE_SWEEP_FIXTURE)
    expect(mediaInstance?.sweepStatus).toBe('in_progress')
    expect(advanced.occlusionState).toBe(DISPOSAL_DEADLINE_SWEEP_FIXTURE.occlusionState)
    expect(advanced.pursuitState).toBe(DISPOSAL_DEADLINE_SWEEP_FIXTURE.pursuitState)
  })

  it('leaves disposal fixture unchanged after the compliance window closes', () => {
    const advanced = advanceVisualTriggerHazardRecordForWeek(DISPOSAL_DEADLINE_SWEEP_FIXTURE, 42)

    expect(advanced).toBe(DISPOSAL_DEADLINE_SWEEP_FIXTURE)
  })

  it('resolves pursuit state when occlusion is covered', () => {
    const advanced = advanceVisualTriggerHazardRecordForWeek(COVERED_PURSUIT_RESOLUTION_FIXTURE, 10)

    expect(advanced).not.toBe(COVERED_PURSUIT_RESOLUTION_FIXTURE)
    expect(advanced.pursuitState).toBe('resolved')
    expect(advanced.occlusionState).toBe('covered')
    expect(advanced.targetInstanceIds).toEqual(COVERED_PURSUIT_RESOLUTION_FIXTURE.targetInstanceIds)
  })

  it('applies scheduled awareness-band transition when week reaches exposurePathWeeks', () => {
    const advanced = advanceVisualTriggerHazardRecordForWeek(
      SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE,
      5
    )

    expect(advanced).not.toBe(SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE)
    expect(advanced.observerAwarenessBand).toBe('heightened')
    expect(advanced.pursuitState).toBe('distressed')
    expect(advanced.filterLatencyWeeks).toBe(
      SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE.filterLatencyWeeks
    )
  })

  it('leaves scheduled awareness unchanged before the due week', () => {
    const advanced = advanceVisualTriggerHazardRecordForWeek(
      SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE,
      4
    )

    expect(advanced).toBe(SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE)
  })

  it('is idempotent when re-applied after advance for the same week', () => {
    const once = advanceVisualTriggerHazardRecordForWeek(COVERED_PURSUIT_RESOLUTION_FIXTURE, 10)
    const twice = advanceVisualTriggerHazardRecordForWeek(once, 10)

    expect(twice).toBe(once)
    expect(twice.pursuitState).toBe('resolved')
  })

  it('does not mutate invalid post-tick records', () => {
    const record = baseRecord({
      pursuitState: 'active_pursuit',
      targetInstanceIds: ['target:viewer-1'],
      confidence: 2,
      exposurePathWeeks: 3,
      observerAwarenessBand: 'conscious',
    })

    const advanced = advanceVisualTriggerHazardRecordForWeek(record, 5)

    expect(advanced).toBe(record)
  })

  it('preserves artistic_exempt fixture without random pursuit escalation', () => {
    const advanced = advanceVisualTriggerHazardRecordForWeek(ARTISTIC_EXEMPT_DERIVATIVE_FIXTURE, 50)

    expect(advanced).not.toBe(ARTISTIC_EXEMPT_DERIVATIVE_FIXTURE)
    expect(advanced.hazardousMediaInstances?.[0]?.sweepStatus).toBe('in_progress')
    expect(advanced.pursuitState).toBe('dormant')
  })

  it('applies tick in stable id order without mutating unchanged records', () => {
    const covered = COVERED_PURSUIT_RESOLUTION_FIXTURE
    const disposal = DISPOSAL_DEADLINE_SWEEP_FIXTURE
    const map = {
      [disposal.id]: disposal,
      [covered.id]: covered,
    }

    const next = applyWeeklyVisualTriggerHazardTick(map, 32)

    expect(next[covered.id]?.pursuitState).toBe('resolved')
    expect(next[disposal.id]?.hazardousMediaInstances?.[0]?.sweepStatus).toBe('in_progress')
  })

  it('preserves warning-only validation records after tick', () => {
    const advanced = advanceVisualTriggerHazardRecordForWeek(
      SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE,
      5
    )

    expect(advanced).not.toBe(SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE)
    expect(advanced.presentationMismatchProfile).toEqual(
      SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE.presentationMismatchProfile
    )
  })
})
