import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  applyTutorialCommand,
  getTutorialLifecycle,
  normalizeRuntimeState,
  setGlobalFlag,
} from '../../domain/gameStateManager'
import type { GameState } from '../../domain/models'
import {
  createTutorialRegistry,
  type TutorialCommandType,
  type TutorialDefinition,
} from '../../domain/tutorialLifecycle'
import { normalizeTutorialRuntime, TUTORIAL_RECORD_LIMIT } from '../../domain/tutorialPersistence'
import { createRunExportPayload, hydrateGame } from './runTransfer'
import {
  GAME_SAVE_KIND,
  hydrateGameSavePayload,
  loadGameSave,
  serializeGameSave,
} from './saveSystem'
import { useGameStore } from './gameStore'

const definition = createTutorialRegistry([
  {
    id: 'test:persist',
    version: 1,
    kind: 'sequenced',
    allowBack: true,
    replayable: true,
    steps: [{ id: 'one', expectedActionId: 'production:inspect' }, { id: 'two' }],
  },
]).definitions[0]

function command(game: GameState, type: TutorialCommandType, currentDefinition = definition) {
  const current = getTutorialLifecycle(game, currentDefinition)
  if (!current) throw new Error('Expected resolved tutorial')
  return applyTutorialCommand(game, currentDefinition, {
    type,
    expectedRevision: current.revision,
    stepId: currentDefinition.steps[current.cursor].id,
  }).state
}
function active() {
  return command(command(createStartingState(), 'start'), 'advance')
}
const roundTrip = (game: GameState) => loadGameSave(serializeGameSave(game))
const upgraded = (steps = definition.steps): TutorialDefinition =>
  createTutorialRegistry([{ ...definition, version: 2, steps }]).definitions[0]

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('canonical tutorial persistence', () => {
  it('round-trips active progress through manual saves and run exports', () => {
    const game = active()
    for (const loaded of [roundTrip(game), hydrateGame(createRunExportPayload(game).game)]) {
      expect(getTutorialLifecycle(loaded, definition)).toEqual(
        getTutorialLifecycle(game, definition)
      )
      expect(getTutorialLifecycle(loaded, definition)?.cursor).toBe(1)
      expect(loaded.week).toBe(game.week)
      expect(loaded.inventory).toEqual(game.inventory)
      expect(loaded.runtimeState?.globalFlags).toEqual(game.runtimeState?.globalFlags)
    }
  })

  it('writes through the existing Zustand game and rejects duplicate commands', () => {
    const store = useGameStore.getState()
    const start = { type: 'start', expectedRevision: 0 } as const
    expect(store.applyTutorialCommand(definition, start)).toBe(true)
    const beforeDuplicate = useGameStore.getState()
    const game = beforeDuplicate.game
    expect(useGameStore.getState().applyTutorialCommand(definition, start)).toBe(false)
    expect(useGameStore.getState()).toBe(beforeDuplicate)
    expect(useGameStore.getState().game).toBe(game)
    expect(getTutorialLifecycle(roundTrip(game), definition)?.status).toBe('active')
  })

  it('preserves progress through ordinary managed runtime writes', () => {
    const game = active()
    const changed = setGlobalFlag(game, 'test:ordinary', true)
    expect(changed.runtimeState?.tutorials).toEqual(game.runtimeState?.tutorials)
    expect(changed.runtimeState?.globalFlags['test:ordinary']).toBe(true)
  })

  it('rehydrates the production Zustand persistence envelope', async () => {
    const options = useGameStore.persist.getOptions()
    const storage = options.storage
    const name = options.name
    if (!storage || !name) throw new Error('Expected canonical persistence storage')
    useGameStore.getState().applyTutorialCommand(definition, { type: 'start', expectedRevision: 0 })
    useGameStore
      .getState()
      .applyTutorialCommand(definition, { type: 'advance', expectedRevision: 1, stepId: 'one' })
    const saved = await storage.getItem(name)
    if (!saved) throw new Error('Expected stored game')
    useGameStore.setState({ game: createStartingState() })
    await storage.setItem(name, saved)
    await useGameStore.persist.rehydrate()
    expect(getTutorialLifecycle(useGameStore.getState().game, definition)).toMatchObject({
      status: 'active',
      cursor: 1,
      stepStatuses: ['completed', 'active'],
    })
  })

  it('resumes interrupted guidance at the saved step without repeating completed steps', () => {
    const interrupted = roundTrip(command(active(), 'interrupt'))
    const resumed = command(interrupted, 'resume')
    expect(getTutorialLifecycle(resumed, definition)).toMatchObject({
      status: 'active',
      cursor: 1,
      stepStatuses: ['completed', 'active'],
    })
    expect(getTutorialLifecycle(command(resumed, 'complete'), definition)?.status).toBe('completed')
  })

  it.each(['complete', 'dismiss', 'suppress', 'cancel'] as const)(
    'does not resurrect %s state after load',
    (type) => {
      const game = command(active(), type)
      const loaded = roundTrip(game)
      expect(getTutorialLifecycle(loaded, definition)).toEqual(
        getTutorialLifecycle(game, definition)
      )
      const current = getTutorialLifecycle(loaded, definition)!
      expect(
        applyTutorialCommand(loaded, definition, {
          type: 'start',
          expectedRevision: current.revision,
        }).state
      ).toBe(loaded)
    }
  )

  it('retains skipped outcomes and per-run entry history', () => {
    let game = command(createStartingState(), 'start')
    game = command(command(game, 'skip'), 'skip')
    expect(getTutorialLifecycle(roundTrip(game), definition)).toMatchObject({
      status: 'skipped',
      reachedCursor: 1,
      stepStatuses: ['skipped', 'skipped'],
    })
  })

  it('rejects a completion delivery from before save/load without changing the game', () => {
    const loaded = roundTrip(active())
    const duplicate = applyTutorialCommand(loaded, definition, {
      type: 'advance',
      expectedRevision: 1,
      stepId: 'one',
    })
    expect(duplicate.result?.reason).toBe('stale')
    expect(duplicate.state).toBe(loaded)
  })

  it('preserves an exhausted final completion counter across reload without allowing overflow', () => {
    const base = active()
    const tutorials = base.runtimeState!.tutorials!
    const record = tutorials.records[definition.id]
    const game: GameState = {
      ...base,
      runtimeState: {
        ...base.runtimeState!,
        tutorials: {
          ...tutorials,
          records: {
            ...tutorials.records,
            [definition.id]: {
              ...record,
              lifecycle: { ...record.lifecycle, revision: Number.MAX_SAFE_INTEGER - 1 },
            },
          },
        },
      },
    }
    const completed = applyTutorialCommand(game, definition, {
      type: 'complete',
      expectedRevision: Number.MAX_SAFE_INTEGER - 1,
      stepId: 'two',
    }).state
    const loaded = roundTrip(completed)
    expect(getTutorialLifecycle(loaded, definition)).toMatchObject({
      status: 'completed',
      revision: Number.MAX_SAFE_INTEGER,
    })
    expect(
      applyTutorialCommand(loaded, definition, {
        type: 'complete',
        expectedRevision: Number.MAX_SAFE_INTEGER - 1,
        stepId: 'two',
      }).result?.reason
    ).toBe('stale')
    expect(
      applyTutorialCommand(loaded, definition, {
        type: 'replay_start',
        expectedRevision: Number.MAX_SAFE_INTEGER,
      }).state
    ).toBe(loaded)
  })

  it('leaves legacy saves unbound even when a fallback contains tutorial progress', () => {
    const old = createStartingState()
    const loaded = hydrateGame(old, active())
    expect(loaded.runtimeState).not.toHaveProperty('tutorials')
    expect(normalizeRuntimeState(undefined, 1, active().runtimeState)).not.toHaveProperty(
      'tutorials'
    )
  })

  it('drops malformed siblings and future formats while preserving unrelated state', () => {
    const game = active()
    const records = game.runtimeState!.tutorials!.records
    const good = records[definition.id]
    const malformed = {
      ...good,
      lifecycle: { ...good.lifecycle, status: 'suppressed', resumeStatus: undefined },
    }
    const raw = {
      ...game,
      runtimeState: {
        ...game.runtimeState,
        tutorials: { schemaVersion: 1, records: { [definition.id]: good, bad: malformed } },
      },
    }
    const loaded = hydrateGameSavePayload({
      kind: GAME_SAVE_KIND,
      version: 1,
      savedAt: '2026-10-29T00:00:00.000Z',
      state: raw,
    })
    expect(Object.keys(loaded.runtimeState!.tutorials!.records)).toEqual([definition.id])
    const future = hydrateGameSavePayload({
      kind: GAME_SAVE_KIND,
      version: 1,
      savedAt: '2026-10-29T00:00:00.000Z',
      state: {
        ...raw,
        runtimeState: { ...raw.runtimeState, tutorials: { schemaVersion: 2, records } },
      },
    })
    expect(future.runtimeState).not.toHaveProperty('tutorials')
    expect(future.week).toBe(game.week)
    expect(future.inventory).toEqual(game.inventory)
    for (const value of [null, [], { schemaVersion: 0 }, { schemaVersion: 1, records: [] }])
      expect(normalizeTutorialRuntime(value)).toBeUndefined()
  })

  it('rejects invalid snapshot identities and lifecycle arrays', () => {
    const game = active()
    const record = game.runtimeState!.tutorials!.records[definition.id]
    for (const bad of [
      { ...record, stepIds: ['one', 'one'] },
      { ...record, stepIds: ['one', ''] },
      { ...record, stepIds: new Array(2) },
      { ...record, lifecycle: { ...record.lifecycle, stepStatuses: null } },
      { ...record, lifecycle: { ...record.lifecycle, tutorialId: 'other' } },
      { ...record, lifecycle: { ...record.lifecycle, definitionVersion: Infinity } },
    ])
      expect(
        Object.keys(
          normalizeTutorialRuntime({ schemaVersion: 1, records: { [definition.id]: bad } })!.records
        )
      ).toEqual([])
  })

  it('does not let malformed siblings consume the valid-record capacity', () => {
    const good = active().runtimeState!.tutorials!.records[definition.id]
    const records: Record<string, unknown> = Object.fromEntries(
      Array.from({ length: TUTORIAL_RECORD_LIMIT }, (_, index) => [
        `a-bad-${index}`,
        { stepIds: [] },
      ])
    )
    records[definition.id] = good
    expect(Object.keys(normalizeTutorialRuntime({ schemaVersion: 1, records })!.records)).toEqual([
      definition.id,
    ])
  })

  it('rejects inconsistent active or suppressed progress rather than replaying completed steps', () => {
    const record = active().runtimeState!.tutorials!.records[definition.id]
    for (const patch of [
      { stepStatuses: ['completed', 'completed'] },
      { stepStatuses: ['active', 'active'] },
      { stepStatuses: ['not_started', 'active'] },
      { status: 'completed' },
      { status: 'not_started' },
      { run: 0 },
      { revision: 0 },
      { status: 'suppressed', resumeStatus: 'active', stepStatuses: ['completed', 'completed'] },
    ]) {
      const runtime = normalizeTutorialRuntime({
        schemaVersion: 1,
        records: { [definition.id]: { ...record, lifecycle: { ...record.lifecycle, ...patch } } },
      })
      expect(Object.keys(runtime!.records)).toEqual([])
    }
  })
})

describe('tutorial definition migration', () => {
  it.each([Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER])(
    'keeps completed upgrades readable at revision %s without overflow',
    (revision) => {
      const base = command(active(), 'complete')
      const tutorials = base.runtimeState!.tutorials!
      const record = tutorials.records[definition.id]
      const game: GameState = {
        ...base,
        runtimeState: {
          ...base.runtimeState!,
          tutorials: {
            ...tutorials,
            records: {
              ...tutorials.records,
              [definition.id]: { ...record, lifecycle: { ...record.lifecycle, revision } },
            },
          },
        },
      }
      for (const next of [upgraded(), upgraded([{ id: 'new' }, ...definition.steps])]) {
        const migrated = getTutorialLifecycle(roundTrip(game), next)!
        expect(migrated).toMatchObject({
          status: 'completed',
          revision: Number.MAX_SAFE_INTEGER,
          definitionVersion: 2,
        })
        expect(
          applyTutorialCommand(game, next, {
            type: 'replay_start',
            expectedRevision: Number.MAX_SAFE_INTEGER,
          }).state
        ).toBe(game)
      }
    }
  )

  it('preserves same-layout progress and commits migration on the next successful command', () => {
    const game = roundTrip(command(active(), 'interrupt'))
    const next = upgraded()
    const before = getTutorialLifecycle(game, definition)!
    const migrated = getTutorialLifecycle(game, next)!
    expect(migrated).toMatchObject({
      definitionVersion: 2,
      revision: before.revision + 1,
      cursor: 1,
      status: 'interrupted',
      stepStatuses: ['completed', 'active'],
    })
    expect(getTutorialLifecycle(game, next)).toEqual(migrated)
    const resumed = command(game, 'resume', next)
    expect(resumed.runtimeState?.tutorials?.records[next.id].lifecycle.definitionVersion).toBe(2)
    expect(getTutorialLifecycle(roundTrip(resumed), next)).toEqual(
      getTutorialLifecycle(resumed, next)
    )
    expect(
      applyTutorialCommand(game, next, { type: 'resume', expectedRevision: before.revision }).result
        ?.reason
    ).toBe('stale')
  })

  it.each([
    { steps: [{ id: 'added' }, ...definition.steps] },
    { steps: [{ id: 'one' }] },
    { steps: [...definition.steps].reverse() },
  ])('cancels changed active layouts and retains matching completion history', ({ steps }) => {
    const game = active()
    const next = upgraded(steps)
    const migrated = getTutorialLifecycle(game, next)!
    expect(migrated.status).toBe('canceled')
    expect(migrated.stepStatuses[next.steps.findIndex(({ id }) => id === 'one')]).toBe('completed')
    expect(migrated.stepStatuses).not.toContain('active')
    const replay = command(game, 'replay_start', next)
    expect(getTutorialLifecycle(replay, next)?.run).toBe(2)
    expect(replay.week).toBe(game.week)
    expect(replay.inventory).toEqual(game.inventory)
    expect(replay.globalFlags).toEqual(game.globalFlags)
    expect({ ...replay, runtimeState: undefined }).toEqual({ ...game, runtimeState: undefined })
  })

  it.each(['complete', 'dismiss', 'suppress'] as const)(
    'preserves %s outcome across structural changes',
    (type) => {
      const game = roundTrip(command(active(), type))
      const next = upgraded([{ id: 'new' }, ...definition.steps])
      const migrated = getTutorialLifecycle(game, next)!
      expect(migrated.status).toBe(getTutorialLifecycle(game, definition)?.status)
      if (type === 'suppress') {
        expect(migrated.resumeStatus).toBe('canceled')
        expect(getTutorialLifecycle(command(game, 'unsuppress', next), next)?.status).toBe(
          'canceled'
        )
      }
      expect(migrated.stepStatuses[0]).toBe('not_started')
    }
  )

  it('rejects definition downgrade and same-version snapshot drift', () => {
    const current = command(createStartingState(), 'start', upgraded())
    expect(getTutorialLifecycle(roundTrip(current), definition)).toBeUndefined()
    expect(
      applyTutorialCommand(current, definition, { type: 'start', expectedRevision: 0 }).state
    ).toBe(current)
    const changed = createTutorialRegistry([{ ...definition, steps: [{ id: 'different' }] }])
      .definitions[0]
    expect(getTutorialLifecycle(active(), changed)).toBeUndefined()
  })

  it.each(['complete', 'dismiss', 'skip'] as const)(
    'keeps a suppressed %s outcome terminal after migration',
    (type) => {
      const terminal =
        type === 'skip'
          ? command(command(command(createStartingState(), 'start'), 'skip'), 'skip')
          : command(active(), type)
      const game = roundTrip(command(terminal, 'suppress'))
      const next = upgraded([{ id: 'new' }, ...definition.steps])
      const migrated = getTutorialLifecycle(game, next)!
      expect(migrated.status).toBe('suppressed')
      expect(migrated.resumeStatus).toBe(getTutorialLifecycle(terminal, definition)?.status)
      const restored = command(game, 'unsuppress', next)
      expect(getTutorialLifecycle(roundTrip(restored), next)?.status).toBe(migrated.resumeStatus)
    }
  )

  it('caps stored records and refuses writes that would evict another tutorial', () => {
    let game = createStartingState()
    for (let index = 0; index < TUTORIAL_RECORD_LIMIT; index++)
      game = command(game, 'start', {
        ...definition,
        id: `guide:${String(index).padStart(3, '0')}`,
      })
    expect(Object.keys(roundTrip(game).runtimeState!.tutorials!.records)).toHaveLength(
      TUTORIAL_RECORD_LIMIT
    )
    expect(
      applyTutorialCommand(game, definition, { type: 'start', expectedRevision: 0 }).state
    ).toBe(game)
  })
})
