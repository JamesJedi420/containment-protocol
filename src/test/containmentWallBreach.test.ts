import { describe, expect, it } from 'vitest'
import {
  advanceContainmentWallBreach,
  createContainmentWallBarrier,
  createContainmentWallBreachPlan,
  initiateContainmentWallBreach,
  isCatastrophicWallBreach,
} from '../domain/containmentWallBreach'

const submergedShell = createContainmentWallBarrier({
  id: 'shell-a',
  heldMedium: 'water',
  intact: true,
  pressureBoundary: true,
})

describe('SPE-471 catastrophic containment-wall breach states', () => {
  it('holds a real environmental medium behind an intact barrier', () => {
    expect(submergedShell.heldMedium).toBe('water')
    expect(submergedShell.intact).toBe(true)
  })

  it('spreads into multiple zones after the breach timer elapses', () => {
    const plan = createContainmentWallBreachPlan({
      barrierId: 'shell-a',
      eventKind: 'catastrophic_wall_breach',
      spreadMode: 'flood',
      adjacentZoneIds: ['zone-1', 'zone-2'],
      spreadDelayTicks: 2,
      actuation: 'seal',
    })
    const open = initiateContainmentWallBreach(submergedShell, plan)
    expect(open.complete).toBe(false)
    expect(open.floodedZoneIds).toEqual([])
    expect(open.actuationHandoff).toBe('seal')
    expect(isCatastrophicWallBreach(open)).toBe(true)

    const mid = advanceContainmentWallBreach(open, plan.adjacentZoneIds, 1)
    expect(mid.ticksRemaining).toBe(1)
    expect(mid.complete).toBe(false)

    const done = advanceContainmentWallBreach(mid, plan.adjacentZoneIds, 1)
    expect(done.complete).toBe(true)
    expect(done.floodedZoneIds).toEqual(['zone-1', 'zone-2'])
  })

  it('couples submerged/pressure breaches to flow-loss or power-loss', () => {
    const waterPlan = createContainmentWallBreachPlan({
      barrierId: 'shell-a',
      eventKind: 'catastrophic_wall_breach',
      spreadMode: 'inundate',
      adjacentZoneIds: ['wet'],
      spreadDelayTicks: 1,
      actuation: 'lockdown',
    })
    expect(initiateContainmentWallBreach(submergedShell, waterPlan).coupling).toBe('flow_loss')

    const vacuumShell = createContainmentWallBarrier({
      id: 'vac-1',
      heldMedium: 'vacuum',
      intact: true,
      pressureBoundary: true,
    })
    const vacPlan = createContainmentWallBreachPlan({
      barrierId: 'vac-1',
      eventKind: 'catastrophic_wall_breach',
      spreadMode: 'vent',
      adjacentZoneIds: ['bay'],
      spreadDelayTicks: 1,
      actuation: 'vent',
    })
    expect(initiateContainmentWallBreach(vacuumShell, vacPlan).coupling).toBe('power_loss')
  })

  it('distinguishes ordinary trap discharge from catastrophic wall breach', () => {
    const trap = createContainmentWallBreachPlan({
      barrierId: 'shell-a',
      eventKind: 'ordinary_trap_discharge',
      spreadMode: 'flood',
      adjacentZoneIds: ['zone-1'],
      spreadDelayTicks: 1,
      actuation: 'seal',
    })
    const result = initiateContainmentWallBreach(submergedShell, trap)
    expect(result.catastrophic).toBe(false)
    expect(result.actuationHandoff).toBeNull()
    expect(result.floodedZoneIds).toEqual([])
    expect(() => advanceContainmentWallBreach(result, ['zone-1'])).toThrow(/ordinary trap/)
  })

  it('is deterministic and does not mutate inputs', () => {
    const barrier = {
      id: 'shell-b',
      heldMedium: 'pressure' as const,
      intact: true,
      pressureBoundary: true,
    }
    const plan = {
      barrierId: 'shell-b',
      eventKind: 'catastrophic_wall_breach' as const,
      spreadMode: 'vent' as const,
      adjacentZoneIds: ['a', 'b'],
      spreadDelayTicks: 1,
      actuation: 'vent' as const,
    }
    const beforeB = structuredClone(barrier)
    const beforeP = structuredClone(plan)
    const first = initiateContainmentWallBreach(barrier, plan)
    const second = initiateContainmentWallBreach(barrier, plan)
    expect(first).toEqual(second)
    expect(Object.isFrozen(first)).toBe(true)
    expect(barrier).toEqual(beforeB)
    expect(plan).toEqual(beforeP)
  })
})
