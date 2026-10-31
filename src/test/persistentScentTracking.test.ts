import { beforeEach, describe, expect, it } from 'vitest'
import {
  acquireDurableScentLock,
  advanceScentMasking,
  applyScentContamination,
  createMaskingPreparation,
  isDurableScentLock,
  openScentPursuit,
  type MaskingPreparation,
  type ScentLock,
} from '../domain/persistentScentTracking'

describe('SPE-953 persistent scent tracking and masking', () => {
  let lock: ScentLock
  let prep: MaskingPreparation

  beforeEach(() => {
    lock = acquireDurableScentLock({
      id: 'lock-1',
      hostileId: 'predator-a',
      targetId: 'op-1',
      source: 'target_contact',
      persistenceTicks: 40,
    })
    prep = createMaskingPreparation({
      id: 'mask-oil',
      agent: 'oils',
      surface: 'clothing',
      quality: 5,
      durationTicks: 3,
    })
  })

  it('acquires a durable scent-based tracking lock', () => {
    expect(isDurableScentLock(lock)).toBe(true)
    expect(lock.channel).toBe('durable_scent_lock')
    expect(lock.persistenceTicks).toBe(40)
  })

  it('reduces pursuit reliability while masking is active', () => {
    const bare = openScentPursuit(lock, null)
    expect(bare.pursuitReliability).toBe(80)
    expect(bare.preEncounterPrepApplied).toBe(false)

    const masked = openScentPursuit(lock, prep)
    expect(masked.preEncounterPrepApplied).toBe(true)
    expect(masked.pursuitReliability).toBe(50)
    expect(masked.masking?.surface).toBe('clothing')
  })

  it('expires masking after its duration window', () => {
    const masked = openScentPursuit(lock, prep)
    const mid = advanceScentMasking(masked, 2)
    expect(mid.masking?.durationTicks).toBe(1)
    expect(mid.pursuitReliability).toBe(50)
    const done = advanceScentMasking(mid, 1)
    expect(done.masking).toBeNull()
    expect(done.pursuitReliability).toBe(80)
  })

  it('requires a plan change when contamination raises reacquisition risk', () => {
    const masked = openScentPursuit(lock, prep)
    const contaminated = applyScentContamination(masked, 'injury')
    expect(contaminated.reacquisitionRisk).toBe(true)
    expect(contaminated.planChangeRequired).toBe(true)
    expect(contaminated.planChangeReason).toMatch(/injury/)
    expect(contaminated.pursuitReliability).toBeGreaterThan(masked.pursuitReliability)
    expect(contaminated.contaminationBonus).toBe(15)

    const afterTick = advanceScentMasking(contaminated, 1)
    expect(afterTick.contaminationBonus).toBe(15)
    expect(afterTick.pursuitReliability).toBe(contaminated.pursuitReliability)
  })

  it('expires the durable lock when persistence ticks reach zero', () => {
    const short = acquireDurableScentLock({
      id: 'lock-short',
      hostileId: 'predator-a',
      targetId: 'op-1',
      source: 'object',
      persistenceTicks: 2,
    })
    const open = openScentPursuit(short, null)
    const mid = advanceScentMasking(open, 1)
    expect(mid.lock.active).toBe(true)
    expect(mid.lock.persistenceTicks).toBe(1)
    const done = advanceScentMasking(mid, 1)
    expect(done.lock.active).toBe(false)
    expect(done.lock.persistenceTicks).toBe(0)
    expect(done.pursuitReliability).toBe(0)
  })

  it('supports pre-encounter prep on gear and route surfaces', () => {
    const gear = createMaskingPreparation({
      id: 'mask-gear',
      agent: 'smoke',
      surface: 'gear',
      quality: 4,
      durationTicks: 2,
    })
    const route = createMaskingPreparation({
      id: 'mask-route',
      agent: 'ash',
      surface: 'route',
      quality: 3,
      durationTicks: 2,
    })
    expect(openScentPursuit(lock, gear).preEncounterPrepApplied).toBe(true)
    expect(openScentPursuit(lock, route).masking?.surface).toBe('route')
  })

  it('is deterministic and does not mutate inputs', () => {
    const input = {
      id: 'lock-2',
      hostileId: 'h',
      targetId: 't',
      source: 'object' as const,
      persistenceTicks: 10,
    }
    const before = structuredClone(input)
    const first = acquireDurableScentLock(input)
    const second = acquireDurableScentLock(input)
    expect(first).toEqual(second)
    expect(Object.isFrozen(first)).toBe(true)
    expect(input).toEqual(before)
  })
})
