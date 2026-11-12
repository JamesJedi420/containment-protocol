import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  REDISCOVERY_LOOP_RECORD_FIXTURE,
  STUDY_BLOCKED_ARCHIVE_FIXTURE,
} from '../../domain/selfCensoringInformationRegistry'
import {
  formatSelfCensoringEnumLabel,
  getSelfCensoringInformationMirrorView,
} from './selfCensoringInformationMirrorView'

describe('selfCensoringInformationMirrorView (SPE-2108 slice 4)', () => {
  it('returns empty mirror when selfCensoringInformationRecords map is empty', () => {
    const game = createStartingState()

    expect(game.selfCensoringInformationRecords).toEqual({})

    const view = getSelfCensoringInformationMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors negative facts and rediscovery loop without re-validating hidden truth', () => {
    const game = createStartingState()
    game.selfCensoringInformationRecords = {
      [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE,
    }

    const view = getSelfCensoringInformationMirrorView(game)
    const record = view.records[0]

    expect(view.isEmpty).toBe(false)
    expect(view.summary.retentionTimerActiveCount).toBe(1)
    expect(view.summary.rediscoveryLoopActiveCount).toBe(1)
    expect(record?.negativeFactLabels).toEqual([
      'assigned_supervisor_present (wing-c-east)',
      'budget_line_allocated (wing-c-east)',
    ])
    expect(record?.rediscoveryLoopCountLabel).toBe('2')
    expect(record?.lastAlarmWeekLabel).toBe('W41')
    expect(record?.forgottenWarningRefCount).toBe(2)
    expect(record?.contradictionSignalLabels.some((signal) => signal.includes('Unverified absence'))).toBe(
      true
    )
    expect(record?.contradictionSignalLabels.some((signal) => signal.includes('Rediscovery loop count 2'))).toBe(
      true
    )
  })

  it('projects contradiction signals for study-blocked archive fixture', () => {
    const game = createStartingState()
    game.selfCensoringInformationRecords = {
      [STUDY_BLOCKED_ARCHIVE_FIXTURE.id]: STUDY_BLOCKED_ARCHIVE_FIXTURE,
    }

    const view = getSelfCensoringInformationMirrorView(game)
    const record = view.records[0]

    expect(record?.usableArchiveStateLabel).toBe('Study Blocked')
    expect(record?.informationFailureModeLabel).toBe('Record Ok Cognition Fail')
    expect(record?.confidenceLabel).toBe('0.52')
    expect(record?.contradictionSignalLabels.some((signal) => signal.includes('Archive intact'))).toBe(
      true
    )
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatSelfCensoringEnumLabel('record_ok_cognition_fail')).toBe('Record Ok Cognition Fail')
    expect(formatSelfCensoringEnumLabel('transmission_block')).toBe('Transmission Block')
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.selfCensoringInformationRecords = {
      [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE,
    }

    const first = JSON.stringify(getSelfCensoringInformationMirrorView(game))
    const second = JSON.stringify(getSelfCensoringInformationMirrorView(game))

    expect(first).toBe(second)
  })
})
