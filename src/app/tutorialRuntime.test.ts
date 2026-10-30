import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { clearDeveloperLog } from '../domain/developerLog'
import {
  ensureManagedGameState,
  getTutorialLifecycle,
  setGlobalFlag,
} from '../domain/gameStateManager'
import type { GameState } from '../domain/models'
import { createOperationalExplanationRecord } from '../domain/operationalExplanation'
import type { TutorialCommandType, TutorialDefinition } from '../domain/tutorialLifecycle'
import { createTutorialRegistry } from '../domain/tutorialLifecycle'
import { useGameStore } from './store/gameStore'
import { loadGameSave, serializeGameSave } from './store/saveSystem'
import { createTutorialRuntime } from './tutorialRuntime'

const definitions: readonly TutorialDefinition[] = createTutorialRegistry([
  {
    id: 'sequence',
    version: 1,
    kind: 'sequenced',
    allowBack: true,
    replayable: true,
    steps: [{ id: 'one' }, { id: 'two' }],
  },
  {
    id: 'context',
    version: 1,
    kind: 'contextual',
    allowBack: false,
    replayable: true,
    steps: [{ id: 'inspect', expectedActionId: 'inspect' }],
  },
  {
    id: 'hidden',
    version: 1,
    kind: 'contextual',
    allowBack: false,
    replayable: false,
    steps: [{ id: 'secret' }],
  },
]).definitions
const runtime = createTutorialRuntime(definitions)
const game = () => useGameStore.getState().game
const lifecycle = (id = 'sequence') => getTutorialLifecycle(game(), runtime.definition(id)!)!
function command(type: TutorialCommandType, id = 'sequence') {
  const before = lifecycle(id)
  return runtime.dispatch(id, {
    type,
    expectedRevision: before.revision,
    stepId: runtime.definition(id)!.steps[before.cursor].id,
  })
}
const traces = () =>
  game().runtimeState!.ui.debug.eventLog!.filter((entry) => entry.type === 'tutorial.lifecycle')
const roundTrip = () => useGameStore.setState({ game: loadGameSave(serializeGameSave(game())) })
function production(state: GameState) {
  const snapshot = JSON.parse(JSON.stringify(state))
  delete snapshot.runtimeState.tutorials
  snapshot.runtimeState.ui.debug.eventLog = []
  snapshot.runtimeState.ui.debug.nextEventSequence = 1
  return snapshot
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: ensureManagedGameState(createStartingState()) })
})

describe('application tutorial runtime', () => {
  it('registers immutable versions and reads the latest version without a second store', () => {
    const next = createTutorialRuntime([
      ...definitions,
      { ...runtime.definition('sequence')!, version: 2 },
    ])
    expect(next.definition('sequence')?.version).toBe(2)
    expect(next.definition('sequence', 1)?.version).toBe(1)
    expect(next.definition('unknown')).toBeUndefined()
    expect(Object.isFrozen(next.registry.definitions)).toBe(true)
    expect(next.dispatch('unknown', { type: 'start', expectedRevision: 0 }).changed).toBe(false)
    expect(traces()).toEqual([])
  })

  it('provides a visibility-filtered archive including durable outcomes and replay eligibility', () => {
    command('start')
    command('advance')
    command('complete')
    command('start', 'context')
    command('dismiss', 'context')
    roundTrip()
    const archive = runtime.archive((_game, definition) => definition.id !== 'hidden')
    expect(archive.map((entry) => entry.tutorialId)).toEqual(['context', 'sequence'])
    expect(archive[0]).toMatchObject({ status: 'dismissed', run: 1, canReplay: true })
    expect(archive[1]).toMatchObject({
      status: 'completed',
      completedSteps: 2,
      skippedSteps: 0,
      canReplay: true,
    })
    expect(runtime.archive(() => false)).toEqual([])
    expect(Object.isFrozen(archive[0])).toBe(true)
  })

  it('delivers both contextual and sequenced definitions through current owner adapters', () => {
    for (const id of ['context', 'sequence']) {
      let label = 'Mapped control'
      const read = () =>
        runtime.read(id, {
          context: {},
          accessibility: {
            inputMethod: 'controller',
            supportedInputs: ['controller'],
            reducedMotion: true,
            textScale: 2,
          },
          adapters: {
            resolveContent: () => ['Visible instruction'],
            resolveAction: () => ({ visible: true, label: 'Inspect', available: true }),
            resolveBinding: () => ({ label }),
          },
        })!
      command('start', id)
      expect(read().guidance.semanticText).toContain('Visible instruction')
      expect(read().guidance.accessibility.textScale).toBe(2)
      if (id === 'context') {
        expect(read().guidance.action?.bindingLabel).toBe('Mapped control')
        label = 'Remapped now'
        expect(read().guidance.action?.bindingLabel).toBe('Remapped now')
      }
    }
  })

  it('persists interruption, resumes at the current step and keeps selectors pure', () => {
    command('start')
    command('advance')
    command('interrupt')
    roundTrip()
    const before = game()
    expect(
      runtime.read('sequence', { context: {}, adapters: { resolveContent: () => ['Step two'] } })
    ).toBeUndefined()
    expect(game()).toBe(before)
    command('resume')
    const read = runtime.read('sequence', {
      context: {},
      adapters: { resolveContent: () => ['Step two'] },
    })!
    expect(read.guidance.stepId).toBe('two')
    expect(read.revision).toBe(lifecycle().revision)
    expect(traces().map((entry) => entry.details?.kind)).toContain('resumed')
  })

  it.each(['suppress', 'dismiss'] as const)(
    'keeps %s guidance nonblocking for ordinary managed commands',
    (type) => {
      command('start')
      command(type)
      roundTrip()
      expect(
        runtime.read('sequence', {
          context: {},
          adapters: { resolveContent: () => ['Instruction'] },
        })
      ).toBeUndefined()
      const before = lifecycle()
      useGameStore.setState({ game: setGlobalFlag(game(), 'ordinary.play', true) })
      expect(game().runtimeState?.globalFlags['ordinary.play']).toBe(true)
      expect(lifecycle()).toEqual(before)
    }
  )

  it('replays only guidance/debug state, never production simulation', () => {
    const before = production(game())
    command('start')
    command('advance')
    const completed = command('complete')
    expect(completed.completion).toMatchObject({ tutorialId: 'sequence', run: 1 })
    command('replay_start')
    expect(lifecycle()).toMatchObject({ status: 'active', run: 2, cursor: 0 })
    expect(production(game())).toEqual(before)
    expect(traces().map((entry) => entry.details?.kind)).toContain('replayed')
  })

  it('emits one completion per new completed run and no stale duplicates even after log clearing', () => {
    command('start', 'context')
    const complete = {
      type: 'complete',
      stepId: 'inspect',
      expectedRevision: lifecycle('context').revision,
    } as const
    const result = runtime.dispatch('context', complete)
    expect(result.events.map((event) => event.kind)).toEqual(['step_completed', 'completed'])
    expect(result.completion).toBeDefined()
    const state = useGameStore.getState()
    expect(runtime.dispatch('context', complete)).toMatchObject({
      changed: false,
      reason: 'stale',
      events: [],
    })
    expect(useGameStore.getState()).toBe(state)
    useGameStore.setState({ game: clearDeveloperLog(game()) })
    expect(runtime.dispatch('context', complete).events).toEqual([])
    command('suppress', 'context')
    const restored = command('unsuppress', 'context')
    expect(restored.completion).toBeUndefined()
    expect(restored.events.map((event) => event.kind)).toEqual(['unsuppressed'])
    command('replay_start', 'context')
    expect(command('complete', 'context').completion?.run).toBe(2)
  })

  it('distinguishes skipped steps, skipped flows and mixed completion', () => {
    command('start')
    expect(command('skip').events.map((event) => event.kind)).toEqual(['skipped', 'step_entered'])
    const skipped = command('skip')
    expect(skipped.events.filter((event) => event.kind === 'skipped')).toHaveLength(2)
    expect(skipped.completion).toBeUndefined()
    expect(
      runtime.archive(() => true).find((entry) => entry.tutorialId === 'sequence')
    ).toMatchObject({
      status: 'skipped',
      skippedSteps: 2,
      canReplay: true,
    })
    command('replay_start')
    command('advance')
    expect(command('skip').completion).toBeDefined()
  })

  it('represents inaccessible-action recovery without exposing hidden explanations or blocking dismissal', () => {
    const record = createOperationalExplanationRecord({
      source: {
        system: 'department_workshop',
        recordType: 'work_order',
        recordId: 'visible-order',
      },
      subjectId: 'visible-order',
      reasonCode: 'work.waiting',
      severity: 'blocked',
      lifecycle: 'active',
      summary: 'Review needed',
      cause: 'Hidden cause',
      currentEffect: 'Hidden detail',
      confidence: 'limited',
    })
    command('start', 'context')
    const input = {
      context: {},
      adapters: {
        resolveContent: () => ['Inspect'],
        resolveAction: () => ({
          visible: true as const,
          label: 'Inspect',
          available: false,
          explanations: [{ record, permittedDepth: 'summary' as const }],
        }),
      },
    }
    const read = runtime.read('context', input)!
    expect(read.recoveryNeeded).toBe(true)
    expect(JSON.stringify(read)).not.toContain('Hidden')
    const recovery = { type: 'report_recovery', expectedRevision: read.revision } as const
    expect(runtime.dispatch('context', recovery).events[0].kind).toBe('recovery_needed')
    const state = game()
    expect(runtime.dispatch('context', recovery)).toMatchObject({ changed: false, events: [] })
    expect(game()).toBe(state)
    roundTrip()
    expect(runtime.dispatch('context', recovery).events).toEqual([])
    expect(
      runtime.read('context', {
        ...input,
        adapters: { ...input.adapters, resolveAction: () => ({ visible: false }) },
      })
    ).toBeUndefined()
    expect(command('dismiss', 'context').lifecycleChanged).toBe(true)
    expect(JSON.stringify(traces())).not.toContain('Hidden')
  })

  it('records bounded duplicate-safe failure diagnostics without changing lifecycle', () => {
    const blocked = createTutorialRuntime([
      { ...runtime.definition('context')!, conditionIds: ['blocked'] },
    ])
    const start = { type: 'start', expectedRevision: 0 } as const
    const first = blocked.dispatch('context', start)
    expect(first).toMatchObject({ changed: true, lifecycleChanged: false, reason: 'ineligible' })
    expect(first.events[0]).toMatchObject({ kind: 'failed', reason: 'ineligible' })
    const state = game()
    expect(blocked.dispatch('context', start).events).toEqual([])
    expect(game()).toBe(state)
    expect(lifecycle('context').status).toBe('not_started')
    expect(
      blocked.dispatch('context', start, { conditions: { blocked: { passes: true } } })
        .lifecycleChanged
    ).toBe(true)
  })

  it('distinguishes failure reasons on the same revision without recording untrusted requested steps', () => {
    const blocked = createTutorialRuntime([
      { ...runtime.definition('context')!, conditionIds: ['open'] },
    ])
    blocked.dispatch(
      'context',
      { type: 'start', expectedRevision: 0 },
      {
        conditions: { open: { passes: true } },
      }
    )
    const revision = lifecycle('context').revision
    const wrong = {
      type: 'advance',
      expectedRevision: revision,
      stepId: 'untrusted-payload',
    } as const
    const unavailable = { ...wrong, stepId: 'inspect' }
    const illegal = blocked.dispatch('context', wrong)
    const ineligible = blocked.dispatch('context', unavailable)
    expect(illegal.events[0]).toMatchObject({
      kind: 'failed',
      reason: 'illegal',
      stepId: 'inspect',
    })
    expect(ineligible.events[0]).toMatchObject({
      kind: 'failed',
      reason: 'ineligible',
      stepId: 'inspect',
    })
    expect(illegal.events[0].id).not.toBe(ineligible.events[0].id)
    expect(blocked.dispatch('context', wrong).events).toEqual([])
    expect(blocked.dispatch('context', unavailable).events).toEqual([])
    expect(JSON.stringify(traces())).not.toContain('untrusted-payload')
  })

  it('emits migration only when a new version is durably written and never reactivates obsolete steps', () => {
    command('start')
    command('advance')
    const upgraded = createTutorialRuntime([
      { ...runtime.definition('sequence')!, version: 2, steps: [{ id: 'replacement' }] },
    ])
    const before = game()
    const archive = upgraded.archive(() => true)
    expect(archive[0]).toMatchObject({ status: 'canceled', completedSteps: 0, canReplay: true })
    expect(game()).toBe(before)
    const result = upgraded.dispatch('sequence', {
      type: 'replay_start',
      expectedRevision: archive[0].revision!,
    })
    expect(result.events.map((event) => event.kind)).toEqual([
      'migrated',
      'replayed',
      'step_entered',
    ])
    expect(result.events[0].fromVersion).toBe(1)
    roundTrip()
    expect(upgraded.archive(() => true)[0]).toMatchObject({ status: 'active', run: 2 })
    expect(
      upgraded
        .dispatch('sequence', {
          type: 'complete',
          stepId: 'replacement',
          expectedRevision: upgraded.archive(() => true)[0].revision!,
        })
        .events.map((event) => event.kind)
    ).not.toContain('migrated')
  })

  it('shows incompatible future saves as unavailable without overwriting them', () => {
    const newer = createTutorialRuntime([{ ...runtime.definition('sequence')!, version: 2 }])
    newer.dispatch('sequence', { type: 'start', expectedRevision: 0 })
    const before = game()
    expect(
      runtime.archive(() => true).find((entry) => entry.tutorialId === 'sequence')
    ).toMatchObject({
      status: 'unavailable',
      canReplay: false,
    })
    expect(runtime.dispatch('sequence', { type: 'start', expectedRevision: 0 }).reason).toBe(
      'unavailable_definition'
    )
    expect(game()).toBe(before)
  })

  it('produces identical typed events and saved traces for identical command sequences', () => {
    const initial = game()
    const run = () => {
      const events = [command('start'), command('advance'), command('complete')].flatMap(
        (result) => result.events
      )
      return { events, traces: traces() }
    }
    const first = run()
    useGameStore.setState({ game: initial })
    expect(run()).toEqual(first)
    expect(new Set(first.events.map((event) => event.id)).size).toBe(first.events.length)
  })

  it('rehydrates delivery telemetry and its deduplication through the production storage envelope', async () => {
    command('start', 'context')
    const recovery = {
      type: 'report_recovery',
      expectedRevision: lifecycle('context').revision,
    } as const
    runtime.dispatch('context', recovery)
    const expectedTraces = traces()
    const options = useGameStore.persist.getOptions()
    const storage = options.storage
    const name = options.name
    if (!storage || !name) throw new Error('Expected canonical persistence storage')
    const saved = await storage.getItem(name)
    if (!saved) throw new Error('Expected stored game')
    useGameStore.setState({ game: createStartingState() })
    await storage.setItem(name, saved)
    await useGameStore.persist.rehydrate()
    expect(lifecycle('context').status).toBe('active')
    expect(traces()).toEqual(expectedTraces)
    expect(runtime.dispatch('context', recovery).events).toEqual([])
  })

  it('retains the existing bounded debug log and rejects stale recovery reports', () => {
    command('start', 'context')
    for (let index = 0; index < 65; index++) {
      command('suppress', 'context')
      command('unsuppress', 'context')
    }
    expect(game().runtimeState!.ui.debug.eventLog).toHaveLength(120)
    const before = game()
    expect(
      runtime.dispatch('context', { type: 'report_recovery', expectedRevision: 1 })
    ).toMatchObject({
      changed: false,
      reason: 'stale',
      events: [],
    })
    expect(game()).toBe(before)
    expect(production(game())).toEqual(production(ensureManagedGameState(createStartingState())))
  })
})
