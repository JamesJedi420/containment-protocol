import { describe, expect, it } from 'vitest'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import { evaluateSceneTrigger, type SceneTriggerDefinition } from '../domain/sceneTriggers'
import {
  PROGRESS_CLOCK_IDS,
  advanceDefinedProgressClock,
  doesProgressClockMeetThreshold,
  evaluateProgressClockCondition,
  isProgressClockComplete,
  listProgressClocks,
  readProgressClock,
  setDefinedProgressClock,
} from '../domain/progressClocks'

describe('progressClocks', () => {
  it('applies authored defaults and clamps deterministic advancement through completion', () => {
    let state = createStartingState()
    state = advanceDefinedProgressClock(state, PROGRESS_CLOCK_IDS.breachFollowUpPosture, 1)

    expect(readProgressClock(state, PROGRESS_CLOCK_IDS.breachFollowUpPosture)).toMatchObject({
      id: PROGRESS_CLOCK_IDS.breachFollowUpPosture,
      label: 'Breach Follow-Up Posture',
      value: 1,
      max: 3,
      completed: false,
      remaining: 2,
      visibility: 'visible',
    })
    expect(doesProgressClockMeetThreshold(state, PROGRESS_CLOCK_IDS.breachFollowUpPosture, 1)).toBe(true)
    expect(isProgressClockComplete(state, PROGRESS_CLOCK_IDS.breachFollowUpPosture)).toBe(false)

    state = advanceDefinedProgressClock(state, PROGRESS_CLOCK_IDS.breachFollowUpPosture, 8)

    expect(readProgressClock(state, PROGRESS_CLOCK_IDS.breachFollowUpPosture)).toMatchObject({
      value: 3,
      max: 3,
      completed: true,
      remaining: 0,
      completedAtWeek: 1,
    })
    expect(isProgressClockComplete(state, PROGRESS_CLOCK_IDS.breachFollowUpPosture)).toBe(true)
  })

  it('evaluates threshold, completion, and hidden visibility for routing and triggers', () => {
    let state = createStartingState()
    state = setDefinedProgressClock(
      state,
      {
        id: 'story.hidden-recon-depth',
        label: 'Hidden Recon Depth',
        max: 2,
        hidden: true,
      },
      {
        value: 1,
      }
    )

    expect(
      evaluateProgressClockCondition(state, {
        clockId: 'story.hidden-recon-depth',
        threshold: 1,
        hidden: true,
        completed: false,
      })
    ).toMatchObject({
      passes: true,
      exists: true,
      currentValue: 1,
      hidden: true,
      completed: false,
      failedChecks: [],
    })

    const trigger: SceneTriggerDefinition = {
      id: 'frontdesk.notice.hidden-recon-ready',
      targetId: 'frontdesk.notice.hidden-recon-ready',
      when: {
        progressClocks: [
          {
            clockId: 'story.hidden-recon-depth',
            threshold: 1,
            hidden: true,
          },
        ],
      },
    }

    expect(evaluateSceneTrigger(state, trigger)).toMatchObject({
      eligible: true,
      alreadyConsumed: false,
    })
  })

  it('keeps completion stable through save/load and snapshot building', () => {
    let state = createStartingState()
    state = advanceDefinedProgressClock(state, PROGRESS_CLOCK_IDS.incidentBreach, 9)

    const loaded = loadGameSave(serializeGameSave(state))
    const clock = readProgressClock(loaded, PROGRESS_CLOCK_IDS.incidentBreach)
    const clocks = listProgressClocks(loaded)

    expect(clock).toMatchObject({
      id: PROGRESS_CLOCK_IDS.incidentBreach,
      label: 'Breach Chain',
      value: 4,
      max: 4,
      completed: true,
      completedAtWeek: 1,
    })
    expect(clocks.some((entry) => entry.id === PROGRESS_CLOCK_IDS.incidentBreach)).toBe(true)
  })
})
