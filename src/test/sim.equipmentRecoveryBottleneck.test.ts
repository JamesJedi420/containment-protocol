import { describe, it, expect } from 'vitest'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { createStartingState } from '../data/startingState'

describe('SPE-94: Equipment Recovery Bottleneck', () => {

  it('recovers up to maintenanceSpecialistsAvailable damaged items per week, delaying the rest (player-facing)', () => {
    const state = createStartingState()
    ;(state as any).damagedEquipmentQueue = [
      'itemA', 'itemB', 'itemC', 'itemD', 'itemE'
    ]
    state.agency.maintenanceSpecialistsAvailable = 2

    const next = advanceWeek(state)
    const report = next.reports[0]
    // Debug: print all report notes for inspection
    // eslint-disable-next-line no-console
    console.log('ALL REPORT NOTES:', JSON.stringify(report.notes, null, 2))
    const recoveryNote = report.notes.find((n: any) =>
      n.type === 'production.queue_completed' &&
      n.metadata && typeof n.metadata.recovered === 'number' && typeof n.metadata.delayed === 'number'
    )
    expect(recoveryNote).toBeDefined()
    expect(recoveryNote.metadata.recovered).toBe(2)
    expect(recoveryNote.metadata.delayed).toBe(3)
    expect(recoveryNote.metadata.maintenanceCapacity).toBe(2)
    expect(recoveryNote.metadata.damagedCount).toBe(5)
  })


  it('recovers all items if capacity >= queue length (player-facing)', () => {
    const state = createStartingState()
    ;(state as any).damagedEquipmentQueue = ['itemA', 'itemB']
    state.agency.maintenanceSpecialistsAvailable = 5

    const next = advanceWeek(state)
    const report = next.reports[0]
    // eslint-disable-next-line no-console
    console.log('ALL REPORT NOTES:', JSON.stringify(report.notes, null, 2))
    const recoveryNote = report.notes.find((n: any) =>
      n.type === 'production.queue_completed' &&
      n.metadata && typeof n.metadata.recovered === 'number' && typeof n.metadata.delayed === 'number'
    )
    expect(recoveryNote).toBeDefined()
    expect(recoveryNote.metadata.recovered).toBe(2)
    expect(recoveryNote.metadata.delayed).toBe(0)
    expect(recoveryNote.metadata.maintenanceCapacity).toBe(5)
    expect(recoveryNote.metadata.damagedCount).toBe(2)
  })

  it('delays all items if capacity is zero (player-facing)', () => {
    const state = createStartingState()
    ;(state as any).damagedEquipmentQueue = ['itemA', 'itemB', 'itemC']
    state.agency.maintenanceSpecialistsAvailable = 0

    const next = advanceWeek(state)
    const report = next.reports[0]
    // eslint-disable-next-line no-console
    console.log('ALL REPORT NOTES:', JSON.stringify(report.notes, null, 2))
    const recoveryNote = report.notes.find((n: any) =>
      n.type === 'production.queue_completed' &&
      n.metadata && typeof n.metadata.recovered === 'number' && typeof n.metadata.delayed === 'number'
    )
    expect(recoveryNote).toBeDefined()
    expect(recoveryNote.metadata.recovered).toBe(0)
    expect(recoveryNote.metadata.delayed).toBe(3)
    expect(recoveryNote.metadata.maintenanceCapacity).toBe(0)
    expect(recoveryNote.metadata.damagedCount).toBe(3)
  })
})
