// cspell:words frontdesk
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildDeveloperLogSnapshot } from '../domain/developerLog'
import { listQueuedRuntimeEvents } from '../domain/eventQueue'
import { readPersistentFlag, setPersistentFlag } from '../domain/flagSystem'
import { getProgressClock, setUiDebugState } from '../domain/gameStateManager'
import {
  applyOutcomeBranching,
  selectOutcomeBranch,
  type OutcomeBranchDefinition,
} from '../domain/outcomeBranching'
import { PROGRESS_CLOCK_IDS } from '../domain/progressClocks'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'

const TEST_BRANCHES: OutcomeBranchDefinition[] = [
  {
    id: 'success-clean',
    outcome: 'success',
    effects: {
      followUpIds: ['aftermath.success.clean-brief'],
      flagEffects: {
        set: {
          'encounter.alpha.clean': true,
        },
      },
      progressEffects: [
        {
          clockId: PROGRESS_CLOCK_IDS.storyBreachDepth,
          delta: 1,
        },
      ],
      authoredContext: {
        activeContextId: 'frontdesk.notice.success-clean',
      },
    },
    summary: 'Clean handoff branch.',
  },
  {
    id: 'partial-mixed',
    outcome: 'partial',
    effects: {
      followUpIds: ['aftermath.partial.review'],
      flagEffects: {
        set: {
          'encounter.alpha.partial': true,
        },
      },
      progressEffects: [
        {
          clockId: PROGRESS_CLOCK_IDS.breachFollowUpPosture,
          delta: 1,
        },
      ],
    },
  },
  {
    id: 'failure-escalated',
    outcome: 'failure',
    when: {
      flags: {
        allFlags: ['encounter.alpha.escalation_enabled'],
      },
    },
    effects: {
      followUpIds: ['aftermath.failure.escalated'],
      queueEvents: [
        {
          type: 'encounter.escalation',
          targetId: 'escalation.alpha',
        },
      ],
      flagEffects: {
        set: {
          'encounter.alpha.escalated': true,
        },
      },
    },
  },
  {
    id: 'failure-lingering',
    outcome: 'failure',
    effects: {
      followUpIds: ['aftermath.failure.lingering'],
      flagEffects: {
        set: {
          'encounter.alpha.lingering': true,
        },
      },
    },
  },
]

describe('outcomeBranching', () => {
  it('selects success / partial / failure branches deterministically', () => {
    const state = createStartingState()

    const success = selectOutcomeBranch(state, {
      outcome: 'success',
      encounterId: 'encounter.alpha',
      resolutionId: 'encounter.alpha.1.success',
      week: 1,
      branches: TEST_BRANCHES,
    })
    const partial = selectOutcomeBranch(state, {
      outcome: 'partial',
      encounterId: 'encounter.alpha',
      resolutionId: 'encounter.alpha.1.partial',
      week: 1,
      branches: TEST_BRANCHES,
    })
    const failure = selectOutcomeBranch(state, {
      outcome: 'failure',
      encounterId: 'encounter.alpha',
      resolutionId: 'encounter.alpha.1.failure',
      week: 1,
      branches: TEST_BRANCHES,
    })

    expect(success).toMatchObject({
      outcomeId: 'success:success-clean',
      branchId: 'success-clean',
      branchIsFallback: true,
    })
    expect(partial).toMatchObject({
      outcomeId: 'partial:partial-mixed',
      branchId: 'partial-mixed',
      branchIsFallback: true,
    })
    expect(failure).toMatchObject({
      outcomeId: 'failure:failure-lingering',
      branchId: 'failure-lingering',
      branchIsFallback: true,
    })
  })

  it('supports state-conditioned branch variation', () => {
    let state = createStartingState()

    const baseline = selectOutcomeBranch(state, {
      outcome: 'failure',
      encounterId: 'encounter.alpha',
      resolutionId: 'encounter.alpha.2.failure',
      week: 2,
      branches: TEST_BRANCHES,
    })

    state = setPersistentFlag(state, 'encounter.alpha.escalation_enabled', true)

    const escalated = selectOutcomeBranch(state, {
      outcome: 'failure',
      encounterId: 'encounter.alpha',
      resolutionId: 'encounter.alpha.2.failure',
      week: 2,
      branches: TEST_BRANCHES,
    })

    expect(baseline.branchId).toBe('failure-lingering')
    expect(escalated.branchId).toBe('failure-escalated')
  })

  it('applies explicit aftermath outputs (queue, flags, clocks, authored context)', () => {
    let state = createStartingState()
    state = setUiDebugState(state, {
      authoring: {
        activeContextId: 'frontdesk.notice.pre',
      },
    })

    const selected = selectOutcomeBranch(state, {
      outcome: 'success',
      encounterId: 'encounter.alpha',
      resolutionId: 'encounter.alpha.3.success',
      week: 3,
      branches: TEST_BRANCHES,
      baseEffects: {
        followUpIds: ['aftermath.base.default'],
        queueEvents: [
          {
            type: 'encounter.follow_up',
            targetId: 'aftermath.base.default',
          },
        ],
      },
    })

    const applied = applyOutcomeBranching(state, selected)

    expect(readPersistentFlag(applied.state, 'encounter.alpha.clean')).toBe(true)
    expect(getProgressClock(applied.state, PROGRESS_CLOCK_IDS.storyBreachDepth)).toMatchObject({
      value: 1,
      max: 4,
    })
    expect(applied.state.runtimeState?.ui.authoring?.activeContextId).toBe(
      'frontdesk.notice.success-clean'
    )
    expect(applied.queueEvents.map((entry) => entry.targetId)).toEqual([
      'aftermath.base.default',
    ])
    expect(selected.effects.followUpIds).toEqual([
      'aftermath.base.default',
      'aftermath.success.clean-brief',
    ])

    const queued = listQueuedRuntimeEvents(applied.state)
    expect(queued.map((entry) => entry.targetId)).toEqual(['aftermath.base.default'])

    const snapshot = buildDeveloperLogSnapshot(applied.state)
    expect(snapshot.entries[0]).toMatchObject({
      type: 'route.selected',
      summary: 'Outcome branch selected: success:success-clean',
    })
  })

  it('round-trips applied branch aftermath through save/load', () => {
    const state = createStartingState()

    const selected = selectOutcomeBranch(state, {
      outcome: 'partial',
      encounterId: 'encounter.alpha',
      resolutionId: 'encounter.alpha.4.partial',
      week: 4,
      branches: TEST_BRANCHES,
      baseEffects: {
        queueEvents: [
          {
            type: 'encounter.follow_up',
            targetId: 'aftermath.partial.review',
          },
        ],
      },
    })

    const applied = applyOutcomeBranching(state, selected)
    const loaded = loadGameSave(serializeGameSave(applied.state))

    expect(readPersistentFlag(loaded, 'encounter.alpha.partial')).toBe(true)
    expect(getProgressClock(loaded, PROGRESS_CLOCK_IDS.breachFollowUpPosture)).toMatchObject({
      value: 1,
      max: 3,
    })
    expect(listQueuedRuntimeEvents(loaded).map((entry) => entry.targetId)).toEqual([
      'aftermath.partial.review',
    ])
    expect(buildDeveloperLogSnapshot(loaded).entries[0]).toMatchObject({
      summary: 'Outcome branch selected: partial:partial-mixed',
    })
  })
})
