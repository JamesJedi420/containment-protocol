import { describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store/gameStore'
import { resetGameStoreFixture } from '../../test/storeFixtures'
import {
  buildCreateProtectedRemoteWorkCommand,
  buildNextProtectedRemoteWorkCommand,
  getDefaultProtectedRemoteWorkStartRequest,
  getProtectedRemoteWorkRecord,
  projectProtectedRemoteWorkGameplayView,
} from './protectedRemoteWorkGameplayView'

describe('SPE-3501 protected remote-work Agency gameplay consumer', () => {
  it('projects empty cells and a startable default create command', () => {
    resetGameStoreFixture({ week: 6 })
    const game = useGameStore.getState().game
    const view = projectProtectedRemoteWorkGameplayView(game)
    expect(view.rows).toEqual([])
    expect(view.canStart).toBe(true)

    const start = getDefaultProtectedRemoteWorkStartRequest(game.week)
    expect(start.workId).toBe('rw-agency-6')
    expect(buildCreateProtectedRemoteWorkCommand(start).kind).toBe('create')
  })

  it('Agency consumer path: create → preflight → begin → complete exposes actions, hazards, blockers', () => {
    resetGameStoreFixture({ week: 6 })
    const start = getDefaultProtectedRemoteWorkStartRequest(6)
    const created = useGameStore
      .getState()
      .applyProtectedRemoteWorkStep(buildCreateProtectedRemoteWorkCommand(start))
    expect(created.ok).toBe(true)
    expect(created.work?.stage).toBe('requested')

    let game = useGameStore.getState().game
    let view = projectProtectedRemoteWorkGameplayView(game)
    expect(view.canStart).toBe(false)
    expect(view.rows[0]).toMatchObject({
      workId: start.workId,
      stage: 'requested',
      nextStep: 'preflight',
      exposureCleared: false,
    })
    expect(view.rows[0]?.allowedActions).toEqual(['preflight', 'abort'])
    expect(view.rows[0]?.hazards.length).toBeGreaterThan(0)

    const afterCreate = getProtectedRemoteWorkRecord(game, start.workId)!
    const preflight = buildNextProtectedRemoteWorkCommand(afterCreate, game.week)
    expect(preflight?.kind).toBe('preflight')
    expect(useGameStore.getState().applyProtectedRemoteWorkStep(preflight!).ok).toBe(true)

    game = useGameStore.getState().game
    const authorized = getProtectedRemoteWorkRecord(game, start.workId)!
    expect(authorized.stage).toBe('authorized')
    const begin = buildNextProtectedRemoteWorkCommand(authorized, game.week)
    expect(begin?.kind).toBe('begin')
    expect(useGameStore.getState().applyProtectedRemoteWorkStep(begin!).ok).toBe(true)

    game = useGameStore.getState().game
    const inProgress = getProtectedRemoteWorkRecord(game, start.workId)!
    expect(inProgress.stage).toBe('in_progress')
    const complete = buildNextProtectedRemoteWorkCommand(inProgress, game.week)
    expect(complete?.kind).toBe('complete')
    expect(useGameStore.getState().applyProtectedRemoteWorkStep(complete!).ok).toBe(true)

    view = projectProtectedRemoteWorkGameplayView(useGameStore.getState().game)
    expect(view.rows[0]).toMatchObject({
      stage: 'completed',
      outcome: 'completed',
      nextStep: null,
      exposureCleared: false,
    })
    expect(view.rows[0]?.blockers).toEqual([])
  })
})
