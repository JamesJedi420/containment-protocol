import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import type { GameState } from '../../domain/models'
import { useGameStore } from './gameStore'

function makeCancellationState(): GameState {
  const state = createStartingState()
  const caseId = 'case-001'
  state.week = 4
  state.cases[caseId] = {
    ...state.cases[caseId],
    status: 'open',
    assignedTeamIds: [],
  }
  state.caseScopedPrerequisiteProcessingOrders = {
    'work:cancel-store': {
      workOrderId: 'work:cancel-store',
      caseId,
      processingRecipeId: 'recipe:cancel-store',
      inputMaterials: [{ materialId: 'medical_supplies', quantity: 1 }],
      outputMaterialId: 'warding_resin',
      outputQuantity: 1,
      departmentId: 'department:records-analysis',
      taskType: 'records_review',
      requiredWork: 3,
      prerequisiteWorkOrderIds: [],
    },
  }
  state.caseScopedPrerequisiteProcessingReservations = {
    'work:cancel-store': {
      workOrderId: 'work:cancel-store',
      caseId,
      inputMaterials: [{ materialId: 'medical_supplies', quantity: 1 }],
    },
  }
  state.caseScopedPrerequisiteProcessingTerminalSignals = {}
  state.departmentWorkshopWorkOrders = {
    'work:cancel-store': {
      id: 'work:cancel-store',
      caseId,
      departmentId: 'department:records-analysis',
      taskType: 'records_review',
      requiredWork: 3,
    },
  }
  state.departmentWorkshopCompletionOutcomes = {}
  return state
}

describe('gameStore canonical case cancellation (SPE-2763)', () => {
  beforeEach(() => {
    useGameStore.setState({ game: makeCancellationState() })
  })

  it('persists only lifecycle-producer terminal signals and returns the command result', () => {
    const before = useGameStore.getState().game
    const result = useGameStore.getState().cancelCase('case-001')
    const after = useGameStore.getState().game

    expect(result).toMatchObject({
      state: 'accepted',
      registeredWorkOrderIds: ['work:cancel-store'],
      reasons: [],
    })
    expect(after.caseScopedPrerequisiteProcessingTerminalSignals).toEqual({
      'work:cancel-store': {
        workOrderId: 'work:cancel-store',
        caseId: 'case-001',
        departmentId: 'department:records-analysis',
        taskType: 'records_review',
        terminalWeek: 4,
        reason: 'cancelled',
      },
    })
    expect(after.cases).toBe(before.cases)
    expect(after.inventory).toBe(before.inventory)
    expect(after.caseScopedPrerequisiteProcessingReservations).toBe(
      before.caseScopedPrerequisiteProcessingReservations
    )
    expect(after.departmentWorkshopWorkOrders).toBe(before.departmentWorkshopWorkOrders)
    expect(after.events).toBe(before.events)
  })

  it('preserves state identity for blocked and duplicate commands', () => {
    const initial = useGameStore.getState().game
    expect(useGameStore.getState().cancelCase('case:missing')).toEqual({
      state: 'blocked',
      reasons: ['missing-case'],
    })
    expect(useGameStore.getState().game).toBe(initial)

    const first = useGameStore.getState().cancelCase('case-001')
    expect(first.state).toBe('accepted')
    const afterFirst = useGameStore.getState().game
    const replay = useGameStore.getState().cancelCase('case-001')

    expect(replay).toMatchObject({
      state: 'accepted',
      registeredWorkOrderIds: [],
      reasons: [],
    })
    expect(useGameStore.getState().game).toBe(afterFirst)
  })

  it('rejects resolved cases without mutation', () => {
    const game = useGameStore.getState().game
    useGameStore.setState({
      game: {
        ...game,
        cases: {
          ...game.cases,
          'case-001': {
            ...game.cases['case-001'],
            status: 'resolved',
          },
        },
      },
    })
    const before = useGameStore.getState().game

    expect(useGameStore.getState().cancelCase('case-001')).toEqual({
      state: 'blocked',
      reasons: ['resolved-case'],
    })
    expect(useGameStore.getState().game).toBe(before)
  })

  it('retains cancellation proof across store export/import and replays as a no-op', () => {
    useGameStore.getState().cancelCase('case-001')
    const exported = useGameStore.getState().exportSave()

    useGameStore.getState().reset()
    useGameStore.getState().importSave(exported)

    expect(
      useGameStore.getState().game.caseScopedPrerequisiteProcessingTerminalSignals
    ).toMatchObject({
      'work:cancel-store': {
        reason: 'cancelled',
        terminalWeek: 4,
      },
    })
    const beforeReplay = useGameStore.getState().game
    const replay = useGameStore.getState().cancelCase('case-001')
    expect(replay).toMatchObject({
      state: 'accepted',
      registeredWorkOrderIds: [],
      reasons: [],
    })
    expect(useGameStore.getState().game).toBe(beforeReplay)
  })
})
