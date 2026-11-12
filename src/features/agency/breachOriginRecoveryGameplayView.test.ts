import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../../app/store/runTransfer'
import { useGameStore } from '../../app/store/gameStore'
import { resetGameStoreFixture } from '../../test/storeFixtures'
import {
  buildCreateBreachOriginRecoveryCommand,
  buildNextBreachOriginRecoveryCommand,
  getDefaultBreachOriginRecoveryStartRequest,
  getRecoveryRecord,
  projectBreachOriginRecoveryGameplayView,
} from './breachOriginRecoveryGameplayView'

describe('SPE-3735 breach-origin recovery Agency gameplay consumer', () => {
  it('projects empty recoveries and a startable default create command', () => {
    resetGameStoreFixture({ week: 6 })
    const game = useGameStore.getState().game
    const view = projectBreachOriginRecoveryGameplayView(game)
    expect(view.rows).toEqual([])
    expect(view.canStart).toBe(true)

    const start = getDefaultBreachOriginRecoveryStartRequest(game.week)
    expect(start.recoveryId).toBe('rec-agency-breach-w6')
    const create = buildCreateBreachOriginRecoveryCommand(start)
    expect(create?.kind).toBe('create')
  })

  it('Agency consumer path: create → assign → locate mutates durable recoveries', () => {
    resetGameStoreFixture({ week: 6 })
    const start = getDefaultBreachOriginRecoveryStartRequest(6)
    const create = buildCreateBreachOriginRecoveryCommand(start)
    expect(create).toBeDefined()

    const created = useGameStore.getState().applyBreachOriginRecoveryStep(create!)
    expect(created.ok).toBe(true)
    expect(created.recovery?.stage).toBe('escape_reported')

    let game = useGameStore.getState().game
    let view = projectBreachOriginRecoveryGameplayView(game)
    expect(view.canStart).toBe(false)
    expect(view.rows[0]).toMatchObject({
      recoveryId: start.recoveryId,
      stage: 'escape_reported',
      nextStep: 'assign',
    })

    const recovery = getRecoveryRecord(game, start.recoveryId)!
    const assign = buildNextBreachOriginRecoveryCommand(recovery, game.week)
    expect(assign?.kind).toBe('assign')
    const assigned = useGameStore.getState().applyBreachOriginRecoveryStep(assign!)
    expect(assigned.ok).toBe(true)
    expect(assigned.recovery?.stage).toBe('recovery_assigned')
    expect(assigned.recovery?.assignmentClaimRef).toBe(`claim:response-${start.recoveryId}`)

    game = useGameStore.getState().game
    const afterAssign = getRecoveryRecord(game, start.recoveryId)!
    const locate = buildNextBreachOriginRecoveryCommand(afterAssign, game.week)
    expect(locate?.kind).toBe('locate')
    const located = useGameStore.getState().applyBreachOriginRecoveryStep(locate!)
    expect(located.ok).toBe(true)
    expect(located.recovery?.stage).toBe('subject_located')

    view = projectBreachOriginRecoveryGameplayView(useGameStore.getState().game)
    expect(view.rows[0]?.stage).toBe('subject_located')
    expect(view.rows[0]?.nextStep).toBe('capture')
  })

  it('Agency consumer path: full §1 create → assign → locate → capture → move → admit → verify', () => {
    resetGameStoreFixture({ week: 6 })
    const start = getDefaultBreachOriginRecoveryStartRequest(6)
    const create = buildCreateBreachOriginRecoveryCommand(start)!
    expect(useGameStore.getState().applyBreachOriginRecoveryStep(create).ok).toBe(true)

    const advanceUntil = (stage: string) => {
      const game = useGameStore.getState().game
      const recovery = getRecoveryRecord(game, start.recoveryId)
      expect(recovery).toBeDefined()
      const command = buildNextBreachOriginRecoveryCommand(recovery!, game.week)
      expect(command).toBeDefined()
      const result = useGameStore.getState().applyBreachOriginRecoveryStep(command!)
      expect(result.ok).toBe(true)
      expect(result.recovery?.stage).toBe(stage)
    }

    advanceUntil('recovery_assigned')
    advanceUntil('subject_located')
    advanceUntil('capture_secured')
    advanceUntil('admission_pending')
    advanceUntil('containment_verification')
    advanceUntil('completed')

    const durable = useGameStore.getState().game.facilityBreachOriginRecoveries?.[start.recoveryId]
    expect(durable?.stage).toBe('completed')
    expect(durable?.terminalOutcomeReported).toBe(true)

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(useGameStore.getState().game)))
    expect(hydrated.facilityBreachOriginRecoveries?.[start.recoveryId]?.stage).toBe('completed')
    expect(
      hydrated.facilityBreachOriginRecoveries?.[start.recoveryId]?.terminalOutcomeReported
    ).toBe(true)

    const view = projectBreachOriginRecoveryGameplayView(useGameStore.getState().game)
    expect(view.rows[0]?.nextStep).toBeNull()
    expect(view.rows[0]?.outcome).toBe('completed')
  })
})
