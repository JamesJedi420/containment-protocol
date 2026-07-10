import { describe, it, expect } from 'vitest'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { createStartingState } from '../data/startingState'

describe('SPE-94: Equipment Recovery Bottleneck', () => {
  it('recovers up to maintenanceSpecialistsAvailable damaged items per week, delaying the rest (player-facing)', () => {
    const state = createStartingState()
    state.inventory.medkits = 1
    state.inventory.ward_seals = 1
    state.inventory.silver_rounds = 1
    state.inventory.signal_jammers = 1
    state.inventory.emf_sensors = 1
    state.damagedEquipmentQueue = [
      'medkits',
      'ward_seals',
      'silver_rounds',
      'signal_jammers',
      'emf_sensors',
    ]
    state.agency!.maintenanceSpecialistsAvailable = 2

    const next = advanceWeek(state)
    const report = next.reports[0]
    const recoveryNote = report.notes.find((note) => note.type === 'system.equipment_recovered')
    expect(recoveryNote).toBeDefined()
    expect(recoveryNote?.metadata?.recoveredCount).toBe(2)
    expect(recoveryNote?.metadata?.delayedCount).toBe(3)
    expect(recoveryNote?.metadata?.maintenanceCapacity).toBe(2)
    expect(recoveryNote?.metadata?.damagedCount).toBe(5)
    expect(next.damagedEquipmentQueue).toEqual(['silver_rounds', 'signal_jammers', 'emf_sensors'])
  })

  it('recovers all items if capacity >= queue length (player-facing)', () => {
    const state = createStartingState()
    state.inventory.medkits = 1
    state.inventory.ward_seals = 1
    state.damagedEquipmentQueue = ['medkits', 'ward_seals']
    state.agency!.maintenanceSpecialistsAvailable = 5

    const next = advanceWeek(state)
    const report = next.reports[0]
    const recoveryNote = report.notes.find((note) => note.type === 'system.equipment_recovered')
    expect(recoveryNote).toBeDefined()
    expect(recoveryNote?.metadata?.recoveredCount).toBe(2)
    expect(recoveryNote?.metadata?.delayedCount).toBe(0)
    expect(recoveryNote?.metadata?.maintenanceCapacity).toBe(5)
    expect(recoveryNote?.metadata?.damagedCount).toBe(2)
    expect(next.damagedEquipmentQueue).toEqual([])
  })

  it('delays all items if capacity is zero (player-facing)', () => {
    const state = createStartingState()
    state.inventory.medkits = 1
    state.inventory.ward_seals = 1
    state.inventory.silver_rounds = 1
    state.damagedEquipmentQueue = ['medkits', 'ward_seals', 'silver_rounds']
    state.agency!.maintenanceSpecialistsAvailable = 0

    const next = advanceWeek(state)
    const report = next.reports[0]
    const recoveryNote = report.notes.find((note) => note.type === 'system.equipment_recovered')
    expect(recoveryNote).toBeDefined()
    expect(recoveryNote?.metadata?.recoveredCount).toBe(0)
    expect(recoveryNote?.metadata?.delayedCount).toBe(3)
    expect(recoveryNote?.metadata?.maintenanceCapacity).toBe(0)
    expect(recoveryNote?.metadata?.damagedCount).toBe(3)
    expect(next.damagedEquipmentQueue).toEqual(['medkits', 'ward_seals', 'silver_rounds'])
  })

  it('ignores malformed, duplicate, unknown, and unowned damaged queue entries before recovery', () => {
    const state = createStartingState()
    state.inventory.medkits = 1
    state.inventory.ward_seals = 1
    state.inventory.silver_rounds = 0
    ;(state as unknown as { damagedEquipmentQueue: unknown[] }).damagedEquipmentQueue = [
      ' medkits ',
      'medkits',
      '',
      'unknown_equipment',
      'silver_rounds',
      'ward_seals',
    ]
    state.agency!.maintenanceSpecialistsAvailable = 1

    const next = advanceWeek(state)
    const report = next.reports[0]
    const recoveryNote = report.notes.find((note) => note.type === 'system.equipment_recovered')

    expect(recoveryNote).toBeDefined()
    expect(recoveryNote?.metadata?.recovered).toEqual(['medkits'])
    expect(recoveryNote?.metadata?.delayed).toEqual(['ward_seals'])
    expect(recoveryNote?.metadata?.damagedCount).toBe(2)
    expect(next.damagedEquipmentQueue).toEqual(['ward_seals'])
  })
})
