import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { projectFacilityMaintenanceView } from './facilityMaintenanceView'

describe('facility maintenance preview', () => {
  it.each([
    [8, 'strained', 4, 2],
    [18, 'degraded', 10, 6],
    [30, 'critical', 20, 12],
  ] as const)('shows domain-owned pressure/cost for debt %i', (debt, pressure, hours, parts) => {
    const game = {
      ...createStartingState(),
      facilityMaintenanceState: { maintenanceDebt: debt, lastProcessedWeek: 0 },
      facilityMaintenanceRecoveryResources: { maintenanceHours: hours, partsReserve: parts },
    }
    const before = structuredClone(game)
    expect(projectFacilityMaintenanceView(game)).toMatchObject({
      debt,
      pressure,
      required: { maintenanceHours: hours, partsReserve: parts },
      canOrder: true,
    })
    expect(game).toEqual(before)
  })

  it('shows valid debt and budget independently when the other authority is unavailable', () => {
    const game = createStartingState()
    expect(projectFacilityMaintenanceView(game)).toMatchObject({
      pressure: 'unavailable',
      canOrder: false,
    })
    game.facilityMaintenanceState = { maintenanceDebt: 30, lastProcessedWeek: 0 }
    game.facilityMaintenanceRecoveryResources = undefined
    expect(projectFacilityMaintenanceView(game)).toMatchObject({
      debt: 30,
      pressure: 'critical',
      canOrder: false,
      required: { maintenanceHours: 20, partsReserve: 12 },
    })
  })

  it('distinguishes insufficient resources from no-required recovery', () => {
    const game = createStartingState()
    game.facilityMaintenanceState = { maintenanceDebt: 30, lastProcessedWeek: 0 }
    expect(projectFacilityMaintenanceView(game)).toMatchObject({
      canOrder: false,
      explanation: expect.stringContaining('Insufficient'),
    })
    game.facilityMaintenanceState = { maintenanceDebt: 7, lastProcessedWeek: 0 }
    expect(projectFacilityMaintenanceView(game)).toMatchObject({
      pressure: 'none',
      required: undefined,
      canOrder: false,
      explanation: 'No facility recovery is required.',
    })
  })
})
