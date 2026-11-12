import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { evaluateScreenRouteCondition } from './screenRouting'
import {
  createTutorialRegistry,
  createTutorialState,
  transitionTutorial,
  type TutorialCommandType,
  type TutorialDefinition,
  type TutorialEligibility,
  type TutorialLifecycleState,
} from './tutorialLifecycle'

const authored: TutorialDefinition = {
  id: 'test:guide',
  version: 1,
  kind: 'sequenced',
  allowBack: true,
  replayable: true,
  steps: [{ id: 'z-first', expectedActionId: 'production:inspect' }, { id: 'a-last' }],
}
const definition = createTutorialRegistry([authored]).definitions[0]
const apply = (
  state: TutorialLifecycleState,
  type: TutorialCommandType,
  input: TutorialEligibility = {}
) =>
  transitionTutorial(
    definition,
    state,
    { type, expectedRevision: state.revision, stepId: definition.steps[state.cursor]?.id },
    input
  )
const started = () => apply(createTutorialState(definition), 'start').state

describe('tutorial registry', () => {
  it('orders versioned identities without sorting authored steps', () => {
    const registry = createTutorialRegistry([
      { ...authored, version: 2 },
      { ...authored, id: 'a' },
      authored,
    ])
    expect(registry.definitions.map(({ id, version }) => [id, version])).toEqual([
      ['a', 1],
      ['test:guide', 1],
      ['test:guide', 2],
    ])
    expect(registry.get('test:guide', 1)?.steps.map(({ id }) => id)).toEqual(['z-first', 'a-last'])
    expect(registry.get('missing', 1)).toBeUndefined()
    expect(registry.get('test:guide', 3)).toBeUndefined()
  })

  it.each([
    { ...authored, id: ' bad' },
    { ...authored, version: 0 },
    { ...authored, version: NaN },
    { ...authored, version: 1.5 },
    { ...authored, steps: [] },
    { ...authored, steps: [{ id: 'same' }, { id: 'same' }] },
    { ...authored, steps: [{ id: 'bad id' }] },
    { ...authored, conditionIds: ['same', 'same'] },
    { ...authored, steps: [{ id: 'one', conditionIds: [''] }] },
    { ...authored, steps: [{ id: 'one', triggerId: ' ' }] },
    { ...authored, steps: [{ id: 'one', expectedActionId: '' }] },
  ])('rejects malformed definitions %#', (bad) => {
    expect(() => createTutorialRegistry([bad])).toThrow()
  })

  it('rejects duplicate id/version pairs', () => {
    expect(() => createTutorialRegistry([authored, authored])).toThrow('Duplicate')
  })

  it('rejects sparse definitions, steps and condition arrays', () => {
    expect(() => createTutorialRegistry(new Array<TutorialDefinition>(1))).toThrow()
    expect(() => createTutorialRegistry([{ ...authored, steps: new Array(1) }])).toThrow()
    expect(() =>
      createTutorialRegistry([{ ...authored, conditionIds: new Array<string>(1) }])
    ).toThrow()
  })

  it('copies and freezes all contract arrays and records', () => {
    const source = {
      ...authored,
      conditionIds: ['ready'],
      steps: [{ id: 'one', conditionIds: ['step-ready'] }],
    }
    const registry = createTutorialRegistry([source])
    source.conditionIds.push('later')
    source.steps[0].conditionIds.push('later')
    source.steps[0].id = 'changed'
    const copy = registry.definitions[0]
    expect(copy.conditionIds).toEqual(['ready'])
    expect(copy.steps[0]).toEqual({ id: 'one', conditionIds: ['step-ready'] })
    for (const value of [
      registry,
      registry.definitions,
      copy,
      copy.conditionIds,
      copy.steps,
      copy.steps[0],
      copy.steps[0].conditionIds,
    ])
      expect(Object.isFrozen(value)).toBe(true)
  })
})

describe('tutorial lifecycle', () => {
  it('consumes canonical screen-route evaluations without changing production state', () => {
    const game = createStartingState()
    const snapshot = JSON.stringify(game)
    const contextual = createTutorialRegistry([{ ...authored, conditionIds: ['route:context'] }])
      .definitions[0]
    const initial = createTutorialState(contextual)
    const command = { type: 'start', expectedRevision: 0 } as const
    const condition = { activeContexts: ['agency'] }
    const blocked = evaluateScreenRouteCondition(game, condition, { activeContextId: 'other' })
    const allowed = evaluateScreenRouteCondition(game, condition, { activeContextId: 'agency' })
    expect(
      transitionTutorial(contextual, initial, command, { conditions: { 'route:context': blocked } })
        .changed
    ).toBe(false)
    expect(
      transitionTutorial(contextual, initial, command, { conditions: { 'route:context': allowed } })
        .state.status
    ).toBe('active')
    expect(JSON.stringify(game)).toBe(snapshot)
  })
  it('starts, progresses in authored order and completes without changing its inputs', () => {
    const initial = createTutorialState(definition)
    expect(initial.status).toBe('not_started')
    const first = apply(initial, 'start')
    const next = apply(first.state, 'advance')
    expect(first.state.cursor).toBe(0)
    expect(next.state.cursor).toBe(1)
    expect(next.state.stepStatuses).toEqual(['completed', 'active'])
    const final = apply(next.state, 'complete')
    expect(final.state.status).toBe('completed')
    expect(final.state.stepStatuses).toEqual(['completed', 'completed'])
    expect(initial.revision).toBe(0)
    expect(Object.isFrozen(final.state.stepStatuses)).toBe(true)
    expect(first.events).toEqual(['start'])
    expect(definition.steps[0].expectedActionId).toBe('production:inspect')
  })

  it('rejects stale/duplicate deliveries and previous-run commands', () => {
    const initial = started()
    const command = {
      type: 'advance',
      expectedRevision: initial.revision,
      stepId: 'z-first',
    } as const
    const next = transitionTutorial(definition, initial, command).state
    const duplicate = transitionTutorial(definition, next, command)
    expect(duplicate).toMatchObject({ changed: false, reason: 'stale', events: [] })
    expect(duplicate.state).toBe(next)
    const completed = apply(next, 'complete').state
    const replay = apply(completed, 'replay_start').state
    expect(replay.run).toBe(2)
    expect(transitionTutorial(definition, replay, command).reason).toBe('stale')
    expect(apply(completed, 'complete').changed).toBe(false)
  })

  it('requires current step identity and does not complete early', () => {
    const state = started()
    expect(apply(state, 'complete').reason).toBe('illegal')
    expect(
      transitionTutorial(definition, state, {
        type: 'advance',
        expectedRevision: state.revision,
        stepId: 'a-last',
      }).changed
    ).toBe(false)
  })

  it('uses explicit authoritative conditions and event references for contextual guidance', () => {
    const contextual = createTutorialRegistry([
      {
        ...authored,
        kind: 'contextual',
        conditionIds: ['route:visible'],
        steps: [{ id: 'one', conditionIds: ['route:allowed'], triggerId: 'event:inspect' }],
      },
    ]).definitions[0]
    const initial = createTutorialState(contextual)
    const command = { type: 'start', expectedRevision: 0 } as const
    const conditions = { 'route:visible': { passes: true }, 'route:allowed': { passes: true } }
    expect(transitionTutorial(contextual, initial, command).reason).toBe('ineligible')
    expect(transitionTutorial(contextual, initial, command, { conditions }).reason).toBe(
      'ineligible'
    )
    expect(
      transitionTutorial(contextual, initial, command, {
        conditions: { ...conditions, 'route:allowed': { passes: false } },
        triggerIds: ['event:inspect'],
      }).reason
    ).toBe('ineligible')
    const active = transitionTutorial(contextual, initial, command, {
      conditions,
      triggerIds: ['event:inspect'],
    }).state
    expect(active.status).toBe('active')
    const finish = { type: 'complete', expectedRevision: 1, stepId: 'one' } as const
    expect(transitionTutorial(contextual, active, finish).reason).toBe('ineligible')
    const interrupted = transitionTutorial(contextual, active, {
      type: 'interrupt',
      expectedRevision: 1,
    }).state
    expect(
      transitionTutorial(
        contextual,
        interrupted,
        { type: 'resume', expectedRevision: 2 },
        { conditions }
      ).state.status
    ).toBe('active')
    expect(
      transitionTutorial(
        contextual,
        active,
        { type: 'complete', expectedRevision: 1, stepId: 'one' },
        { conditions }
      ).state.status
    ).toBe('completed')
  })

  it('fails closed when the next step is unavailable and can recover with new eligibility', () => {
    const conditional = createTutorialRegistry([
      { ...authored, steps: [{ id: 'one' }, { id: 'two', conditionIds: ['ready'] }] },
    ]).definitions[0]
    const first = transitionTutorial(conditional, createTutorialState(conditional), {
      type: 'start',
      expectedRevision: 0,
    }).state
    const command = { type: 'advance', expectedRevision: 1, stepId: 'one' } as const
    expect(transitionTutorial(conditional, first, command).state).toBe(first)
    expect(
      transitionTutorial(conditional, first, command, { conditions: { ready: { passes: true } } })
        .state.cursor
    ).toBe(1)
  })

  it('supports back only where permitted', () => {
    const first = started()
    expect(apply(first, 'back').changed).toBe(false)
    const next = apply(first, 'advance').state
    const back = apply(next, 'back').state
    expect(back.cursor).toBe(0)
    expect(back.stepStatuses).toEqual(['active', 'not_started'])
    expect(
      transitionTutorial({ ...definition, allowBack: false }, next, {
        type: 'back',
        expectedRevision: next.revision,
        stepId: 'a-last',
      }).changed
    ).toBe(false)
  })

  it('returns to a previously triggered step without repeating its entry event', () => {
    const triggered = createTutorialRegistry([
      {
        ...authored,
        steps: [{ id: 'one', triggerId: 'event:open', conditionIds: ['visible'] }, { id: 'two' }],
      },
    ]).definitions[0]
    const conditions = { visible: { passes: true } }
    const first = transitionTutorial(
      triggered,
      createTutorialState(triggered),
      { type: 'start', expectedRevision: 0 },
      { conditions, triggerIds: ['event:open'] }
    ).state
    const next = transitionTutorial(
      triggered,
      first,
      { type: 'advance', expectedRevision: 1, stepId: 'one' },
      { conditions }
    ).state
    const back = { type: 'back', expectedRevision: 2, stepId: 'two' } as const
    expect(transitionTutorial(triggered, next, back, { conditions }).state.cursor).toBe(0)
    expect(
      transitionTutorial(triggered, next, back, { conditions: { visible: { passes: false } } })
        .reason
    ).toBe('ineligible')
  })

  it('skips steps, dismisses flows and requires explicit replay', () => {
    const firstSkip = apply(started(), 'skip').state
    expect(firstSkip.stepStatuses).toEqual(['skipped', 'active'])
    const allSkipped = apply(firstSkip, 'skip').state
    expect(allSkipped.status).toBe('skipped')
    const dismissed = apply(started(), 'dismiss').state
    expect(dismissed.status).toBe('dismissed')
    expect(apply(dismissed, 'start').changed).toBe(false)
    expect(apply(dismissed, 'replay_start').state.cursor).toBe(0)
    expect(
      transitionTutorial({ ...definition, replayable: false }, dismissed, {
        type: 'replay_start',
        expectedRevision: dismissed.revision,
      }).changed
    ).toBe(false)
  })

  it('requires entry events once per run, retaining them across back/forward navigation', () => {
    const triggered = createTutorialRegistry([
      {
        ...authored,
        steps: [{ id: 'one' }, { id: 'two', triggerId: 'event:once', conditionIds: ['visible'] }],
      },
    ]).definitions[0]
    const conditions = { visible: { passes: true } }
    const first = transitionTutorial(triggered, createTutorialState(triggered), {
      type: 'start',
      expectedRevision: 0,
    }).state
    const forward = { type: 'advance', expectedRevision: 1, stepId: 'one' } as const
    expect(transitionTutorial(triggered, first, forward, { conditions }).reason).toBe('ineligible')
    const second = transitionTutorial(triggered, first, forward, {
      conditions,
      triggerIds: ['event:once'],
    }).state
    const back = transitionTutorial(triggered, second, {
      type: 'back',
      expectedRevision: 2,
      stepId: 'two',
    }).state
    expect(back.reachedCursor).toBe(1)
    const again = { type: 'advance', expectedRevision: 3, stepId: 'one' } as const
    expect(
      transitionTutorial(triggered, back, again, { conditions: { visible: { passes: false } } })
        .reason
    ).toBe('ineligible')
    const revisited = transitionTutorial(triggered, back, again, { conditions }).state
    expect(revisited.cursor).toBe(1)
    const completed = transitionTutorial(
      triggered,
      revisited,
      { type: 'complete', expectedRevision: 4, stepId: 'two' },
      { conditions }
    ).state
    const replay = transitionTutorial(triggered, completed, {
      type: 'replay_start',
      expectedRevision: 5,
    }).state
    expect(replay.reachedCursor).toBe(0)
    expect(
      transitionTutorial(
        triggered,
        replay,
        { type: 'advance', expectedRevision: 6, stepId: 'one' },
        { conditions }
      ).reason
    ).toBe('ineligible')
  })

  it('skips only the current step and preserves new destination eligibility', () => {
    const triggered = createTutorialRegistry([
      {
        ...authored,
        steps: [{ id: 'one' }, { id: 'two', triggerId: 'event:once', conditionIds: ['visible'] }],
      },
    ]).definitions[0]
    const first = transitionTutorial(triggered, createTutorialState(triggered), {
      type: 'start',
      expectedRevision: 0,
    }).state
    const command = { type: 'skip', expectedRevision: 1, stepId: 'one' } as const
    const conditions = { visible: { passes: true } }
    const blocked = transitionTutorial(triggered, first, command, { conditions })
    expect(blocked.state).toBe(first)
    expect(blocked.reason).toBe('ineligible')
    expect(
      transitionTutorial(triggered, first, { type: 'dismiss', expectedRevision: 1 }).state.status
    ).toBe('dismissed')
    const entered = transitionTutorial(triggered, first, command, {
      conditions,
      triggerIds: ['event:once'],
    }).state
    expect(entered.stepStatuses).toEqual(['skipped', 'active'])
    expect(
      transitionTutorial(triggered, first, command, {
        conditions: { visible: { passes: false } },
        triggerIds: ['event:once'],
      }).reason
    ).toBe('ineligible')
  })

  it('suppresses and restores both unstarted and active guidance without losing cursor', () => {
    for (const state of [createTutorialState(definition), apply(started(), 'advance').state]) {
      const suppressed = apply(state, 'suppress').state
      expect(suppressed.status).toBe('suppressed')
      expect(apply(suppressed, 'suppress').changed).toBe(false)
      expect(apply(suppressed, 'advance').changed).toBe(false)
      const restored = apply(suppressed, 'unsuppress').state
      expect(restored.status).toBe(state.status)
      expect(restored.cursor).toBe(state.cursor)
      expect(restored.stepStatuses).toEqual(state.stepStatuses)
    }
  })

  it('interrupts, resumes, or cancels without resetting progress', () => {
    const next = apply(started(), 'advance').state
    const interrupted = apply(next, 'interrupt').state
    expect(interrupted.status).toBe('interrupted')
    expect(apply(interrupted, 'advance').changed).toBe(false)
    expect(apply(interrupted, 'resume').state.cursor).toBe(1)
    const canceled = apply(interrupted, 'cancel').state
    expect(canceled.status).toBe('canceled')
    expect(apply(canceled, 'resume').changed).toBe(false)
    expect(apply(canceled, 'replay_start').state.cursor).toBe(0)
  })

  it('rejects mismatched versions, cursors and revision overflow', () => {
    for (const patch of [
      { definitionVersion: 2 },
      { tutorialId: 'other' },
      { cursor: -1 },
      { cursor: 2 },
      { revision: Number.MAX_SAFE_INTEGER },
      { stepStatuses: [] },
    ]) {
      expect(apply({ ...started(), ...patch }, 'advance').reason).toBe('invalid_state')
    }
  })

  it('replays identical commands deterministically', () => {
    const run = () => {
      let state = createTutorialState(definition)
      for (const command of [
        'start',
        'advance',
        'interrupt',
        'resume',
        'back',
        'skip',
        'complete',
        'replay_start',
      ] as const)
        state = apply(state, command).state
      return state
    }
    expect(run()).toEqual(run())
  })

  it('rejects malformed lifecycle vocabulary and arrays without throwing or emitting events', () => {
    const malformed: readonly (readonly [string, unknown])[] = [
      ['status', 'unknown'],
      ['status', 'suppressed'],
      ['resumeStatus', 'active'],
      ['stepStatuses', undefined],
      ['stepStatuses', { length: 2 }],
      ['stepStatuses', ['unknown', 'not_started']],
      ['stepStatuses', new Array(2)],
    ]
    for (const [key, value] of malformed) {
      const state = { ...started() }
      Reflect.set(state, key, value)
      const result = apply(state, 'unsuppress')
      expect(result).toMatchObject({ changed: false, reason: 'invalid_state', events: [] })
      expect(result.state).toBe(state)
    }
    const suppressed = { ...apply(started(), 'suppress').state }
    Reflect.set(suppressed, 'resumeStatus', 'suppressed')
    expect(apply(suppressed, 'unsuppress').reason).toBe('invalid_state')
  })
})
