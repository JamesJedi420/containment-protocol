import { describe, it, expect } from 'vitest'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { createStartingState } from '../data/startingState'

type RuntimeStateWithDamagedQueue = ReturnType<typeof createStartingState> & {
  damagedEquipmentQueue?: string[]
}

describe('SPE-94: Equipment Recovery Bottleneck', () => {

  it('recovers up to maintenanceSpecialistsAvailable damaged items per week, delaying the rest (player-facing)', () => {
    const state = createStartingState()
    ;(state as RuntimeStateWithDamagedQueue).damagedEquipmentQueue = [
      'itemA', 'itemB', 'itemC', 'itemD', 'itemE'
    ]
    state.agency!.maintenanceSpecialistsAvailable = 2

    const next = advanceWeek(state)
    const report = next.reports[0]
    const recoveryNote = report.notes.find((note) =>
      note.type === 'system.equipment_recovered'
    )
    expect(recoveryNote).toBeDefined()
    expect(recoveryNote?.metadata?.recoveredCount).toBe(2)
    expect(recoveryNote?.metadata?.delayedCount).toBe(3)
    expect(recoveryNote?.metadata?.maintenanceCapacity).toBe(2)
    expect(recoveryNote?.metadata?.damagedCount).toBe(5)
  })


  it('recovers all items if capacity >= queue length (player-facing)', () => {
    const state = createStartingState()
    ;(state as RuntimeStateWithDamagedQueue).damagedEquipmentQueue = ['itemA', 'itemB']
    state.agency!.maintenanceSpecialistsAvailable = 5

    const next = advanceWeek(state)
    const report = next.reports[0]
    const recoveryNote = report.notes.find((note) =>
      note.type === 'system.equipment_recovered'
    )
    expect(recoveryNote).toBeDefined()
    expect(recoveryNote?.metadata?.recoveredCount).toBe(2)
    expect(recoveryNote?.metadata?.delayedCount).toBe(0)
    expect(recoveryNote?.metadata?.maintenanceCapacity).toBe(5)
    expect(recoveryNote?.metadata?.damagedCount).toBe(2)
  })

  it('delays all items if capacity is zero (player-facing)', () => {
    const state = createStartingState()
    ;(state as RuntimeStateWithDamagedQueue).damagedEquipmentQueue = ['itemA', 'itemB', 'itemC']
    state.agency!.maintenanceSpecialistsAvailable = 0

    const next = advanceWeek(state)
    const report = next.reports[0]
    const recoveryNote = report.notes.find((note) =>
      note.type === 'system.equipment_recovered'
    )
    expect(recoveryNote).toBeDefined()
    expect(recoveryNote?.metadata?.recoveredCount).toBe(0)
    expect(recoveryNote?.metadata?.delayedCount).toBe(3)
    expect(recoveryNote?.metadata?.maintenanceCapacity).toBe(0)
    expect(recoveryNote?.metadata?.damagedCount).toBe(3)
  })
})
