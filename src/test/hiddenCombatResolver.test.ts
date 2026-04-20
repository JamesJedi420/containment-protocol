// cspell:words frontdesk
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  applyHiddenCombatResolution,
  resolveAndApplyHiddenCombat,
  resolveHiddenCombat,
} from '../domain/hiddenCombatResolver'
import { listQueuedRuntimeEvents } from '../domain/eventQueue'
import { readPersistentFlag, setPersistentFlag } from '../domain/flagSystem'
import { getProgressClock, setEncounterRuntimeState } from '../domain/gameStateManager'
import { PROGRESS_CLOCK_IDS, setDefinedProgressClock } from '../domain/progressClocks'
import { buildDeveloperLogSnapshot } from '../domain/developerLog'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'

describe('hiddenCombatResolver', () => {
  it('resolves baseline outcomes deterministically (success / partial / failure)', () => {
    const state = createStartingState()

    const success = resolveHiddenCombat(state, {
      encounterId: 'encounter.alpha',
      basePower: 80,
      baseDifficulty: 70,
    })
    const partial = resolveHiddenCombat(state, {
      encounterId: 'encounter.beta',
      basePower: 50,
      baseDifficulty: 55,
    })
    const failure = resolveHiddenCombat(state, {
      encounterId: 'encounter.gamma',
      basePower: 30,
      baseDifficulty: 50,
    })

    expect(success.outcome).toBe('success')
    expect(partial.outcome).toBe('partial')
    expect(failure.outcome).toBe('failure')

    expect(success.encounterPatch.status).toBe('resolved')
    expect(partial.encounterPatch.status).toBe('active')
    expect(failure.encounterPatch.status).toBe('active')
  })

  it('applies flag/clock modifier conditions to change threshold outcomes', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'encounter.modifier.boost', true)
    state = setDefinedProgressClock(state, PROGRESS_CLOCK_IDS.breachFollowUpPosture, {
      value: 2,
      max: 3,
      label: 'Breach Follow-Up Posture',
    })

    const resolution = resolveHiddenCombat(state, {
      encounterId: 'encounter.modded',
      basePower: 45,
      baseDifficulty: 50,
      includeDebug: true,
      modifiers: [
        {
          id: 'flag-boost',
          when: {
            flags: {
              allFlags: ['encounter.modifier.boost'],
            },
          },
          powerDelta: 8,
        },
        {
          id: 'clock-drag',
          when: {
            progressClocks: [
              {
                clockId: PROGRESS_CLOCK_IDS.breachFollowUpPosture,
                threshold: 2,
              },
            ],
          },
          difficultyDelta: 3,
        },
      ],
    })

    expect(resolution.outcome).toBe('success')
    expect(resolution.debug).toMatchObject({
      appliedModifierIds: ['flag-boost', 'clock-drag'],
      effectivePower: 53,
      effectiveDifficulty: 53,
      score: 0,
    })
  })

  it('applies ally behavior scripting contributions to thresholds, follow-ups, and debug traces', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'ally.cautious.enabled', true)

    const resolution = resolveHiddenCombat(state, {
      encounterId: 'encounter.ally-test',
      basePower: 35,
      baseDifficulty: 50,
      followUpByOutcome: {
        partial: ['frontdesk.encounter.ally-test.partial-default'],
      },
      allyBehaviorProfiles: [
        {
          allyId: 'ally-cautious',
          branches: [
            {
              id: 'stabilize-threshold',
              when: {
                flags: {
                  allFlags: ['ally.cautious.enabled'],
                },
              },
              effects: {
                thresholdModifier: {
                  partialAt: -5,
                },
                followUpIds: ['frontdesk.encounter.ally-test.cautious-review'],
                flagEffects: {
                  set: {
                    'ally.cautious.applied': true,
                  },
                },
              },
              summary: 'Cautious ally lowers partial threshold and adds review follow-up.',
            },
          ],
        },
      ],
      includeDebug: true,
    })

    expect(resolution.outcome).toBe('partial')
    expect(resolution.followUpIds).toEqual([
      'frontdesk.encounter.ally-test.partial-default',
      'frontdesk.encounter.ally-test.cautious-review',
    ])
    expect(resolution.allyBehaviors).toMatchObject([
      {
        allyId: 'ally-cautious',
        behaviorId: 'stabilize-threshold',
        isFallback: false,
      },
    ])
    expect(resolution.debug).toMatchObject({
      allyScoreModifier: 0,
      thresholds: {
        successAt: 0,
        partialAt: -12,
      },
      allyAdjustedThresholds: {
        successAt: 0,
        partialAt: -17,
      },
      allyBehaviors: [
        {
          allyId: 'ally-cautious',
          behaviorId: 'stabilize-threshold',
        },
      ],
    })

    const applied = applyHiddenCombatResolution(state, resolution, {
      contextId: 'frontdesk.notice.encounter.ally-test',
    })

    expect(readPersistentFlag(applied.state, 'ally.cautious.applied')).toBe(true)
    expect(listQueuedRuntimeEvents(applied.state).map((entry) => entry.targetId)).toEqual([
      'frontdesk.encounter.ally-test.partial-default',
      'frontdesk.encounter.ally-test.cautious-review',
    ])
    expect(buildDeveloperLogSnapshot(applied.state).entries[0]).toMatchObject({
      type: 'encounter.patched',
      summary: 'Ally behaviors applied: ally-cautious:stabilize-threshold',
    })
  })

  it('generates structured state changes and queued follow-ups for integration', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'encounter.test.pending', true)
    state = setEncounterRuntimeState(state, 'encounter.test', {
      status: 'active',
      phase: 'prelude',
      flags: {
        pending: true,
      },
    })

    const resolution = resolveHiddenCombat(state, {
      encounterId: 'encounter.test',
      resolutionId: 'encounter.test.week-1',
      basePower: 70,
      baseDifficulty: 50,
      followUpByOutcome: {
        success: ['frontdesk.encounter.after-action'],
      },
      encounterPatchByOutcome: {
        success: {
          phase: 'resolved_success',
          flags: {
            pending: false,
            sealed: true,
          },
        },
      },
      flagEffectsByOutcome: {
        success: {
          set: {
            'encounter.test.victory': true,
          },
          clear: ['encounter.test.pending'],
        },
      },
      progressEffectsByOutcome: {
        success: [
          {
            clockId: 'encounter.test.clock',
            delta: 1,
            defaults: {
              label: 'Encounter Test Clock',
              max: 3,
            },
          },
        ],
      },
    })

    const applied = applyHiddenCombatResolution(state, resolution, {
      contextId: 'frontdesk.notice.encounter.test',
    })

    expect(readPersistentFlag(applied.state, 'encounter.test.victory')).toBe(true)
    expect(readPersistentFlag(applied.state, 'encounter.test.pending')).toBeUndefined()
    expect(getProgressClock(applied.state, 'encounter.test.clock')).toMatchObject({
      label: 'Encounter Test Clock',
      value: 1,
      max: 3,
    })
    expect(applied.state.runtimeState?.encounterState['encounter.test']).toMatchObject({
      status: 'resolved',
      phase: 'resolved_success',
      startedWeek: 1,
      resolvedWeek: 1,
      latestOutcome: 'success',
      lastResolutionId: 'encounter.test.week-1',
      followUpIds: ['frontdesk.encounter.after-action'],
      flags: {
        pending: false,
        sealed: true,
      },
    })

    expect(applied.queueEvents).toHaveLength(1)
    expect(applied.queueEvents[0]).toMatchObject({
      type: 'encounter.follow_up',
      targetId: 'frontdesk.encounter.after-action',
      contextId: 'frontdesk.notice.encounter.test',
    })

    const queued = listQueuedRuntimeEvents(applied.state)
    expect(queued).toHaveLength(1)
    expect(queued[0]).toMatchObject({
      type: 'encounter.follow_up',
      targetId: 'frontdesk.encounter.after-action',
      payload: {
        encounterId: 'encounter.test',
        outcome: 'success',
        resolutionId: 'encounter.test.week-1',
      },
    })
  })

  it('supports resolve+apply helper while preserving deterministic queue ordering', () => {
    const state = createStartingState()

    const first = resolveAndApplyHiddenCombat(state, {
      encounterId: 'encounter.alpha',
      basePower: 70,
      baseDifficulty: 60,
      followUpByOutcome: {
        success: ['followup.alpha'],
      },
    })

    const second = resolveAndApplyHiddenCombat(first.apply.state, {
      encounterId: 'encounter.beta',
      basePower: 71,
      baseDifficulty: 60,
      followUpByOutcome: {
        success: ['followup.beta'],
      },
    })

    expect(first.resolution.outcome).toBe('success')
    expect(second.resolution.outcome).toBe('success')
    expect(listQueuedRuntimeEvents(second.apply.state).map((entry) => entry.targetId)).toEqual([
      'followup.alpha',
      'followup.beta',
    ])
  })

  it('selects state-conditioned aftermath branches and persists tracking through save/load', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'encounter.alpha.escalate_on_failure', true)

    const execution = resolveAndApplyHiddenCombat(state, {
      encounterId: 'encounter.alpha',
      basePower: 30,
      baseDifficulty: 55,
      followUpByOutcome: {
        failure: ['frontdesk.encounter.alpha.default-failure'],
      },
      outcomeBranches: [
        {
          id: 'failure-escalated',
          outcome: 'failure',
          when: {
            flags: {
              allFlags: ['encounter.alpha.escalate_on_failure'],
            },
          },
          effects: {
            followUpIds: ['frontdesk.encounter.alpha.escalation-review'],
            queueEvents: [
              {
                type: 'encounter.escalation',
                targetId: 'encounter.alpha.escalation',
              },
            ],
            flagEffects: {
              set: {
                'encounter.alpha.escalated': true,
              },
            },
            progressEffects: [
              {
                clockId: PROGRESS_CLOCK_IDS.breachFollowUpPosture,
                delta: 1,
              },
            ],
            authoredContext: {
              activeContextId: 'frontdesk.notice.encounter.alpha.escalated',
              lastNextTargetId: 'frontdesk.notice.encounter.alpha.escalation-review',
              lastFollowUpIds: ['frontdesk.encounter.alpha.escalation-review'],
              updatedWeek: 1,
            },
          },
          summary: 'Escalation branch selected after failed encounter.',
        },
      ],
      includeDebug: true,
    })

    expect(execution.resolution).toMatchObject({
      outcome: 'failure',
      outcomeId: 'failure:failure-escalated',
      outcomeBranchId: 'failure-escalated',
      branchSummary: 'Escalation branch selected after failed encounter.',
      followUpIds: [
        'frontdesk.encounter.alpha.default-failure',
        'frontdesk.encounter.alpha.escalation-review',
      ],
    })
    expect(readPersistentFlag(execution.apply.state, 'encounter.alpha.escalated')).toBe(true)
    expect(getProgressClock(execution.apply.state, PROGRESS_CLOCK_IDS.breachFollowUpPosture)).toMatchObject({
      value: 1,
      max: 3,
    })
    expect(execution.apply.state.runtimeState?.ui.authoring).toMatchObject({
      activeContextId: 'frontdesk.notice.encounter.alpha.escalated',
      lastNextTargetId: 'frontdesk.notice.encounter.alpha.escalation-review',
      lastFollowUpIds: ['frontdesk.encounter.alpha.escalation-review'],
      updatedWeek: 1,
    })
    expect(listQueuedRuntimeEvents(execution.apply.state).map((entry) => entry.type)).toEqual([
      'encounter.follow_up',
      'encounter.follow_up',
      'encounter.escalation',
    ])

    const loaded = loadGameSave(serializeGameSave(execution.apply.state))
    expect(loaded.runtimeState?.encounterState['encounter.alpha']).toMatchObject({
      latestOutcome: 'failure',
      lastResolutionId: execution.resolution.resolutionId,
      followUpIds: [
        'frontdesk.encounter.alpha.default-failure',
        'frontdesk.encounter.alpha.escalation-review',
      ],
    })
    expect(buildDeveloperLogSnapshot(loaded).entries[0]).toMatchObject({
      summary: 'Outcome branch selected: failure:failure-escalated',
      type: 'route.selected',
    })
  })
})
