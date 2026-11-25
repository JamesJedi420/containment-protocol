import { describe, expect, it } from 'vitest'
import {
  createPoweredSurface,
  resolveBackupPowerAccess,
  type PoweredSurface,
} from './backupPowerEvidenceAccessTimers'

describe('SPE-1431 backup-power evidence access timers', () => {
  const records: PoweredSurface = createPoweredSurface({
    surfaceId: 'medical-records',
    label: 'Medical records terminal',
    drainPerMinute: 1,
    degradeBelowMinutes: 5,
    failBelowMinutes: 2,
    evidenceIntegrityLossOnFail: true,
  })

  const fridge: PoweredSurface = createPoweredSurface({
    surfaceId: 'cold-storage',
    label: 'Sample refrigerator',
    drainPerMinute: 2,
    selectiveReserveMinutes: 10,
    degradeBelowMinutes: 4,
    failBelowMinutes: 1,
    evidenceIntegrityLossOnFail: true,
  })

  const lights: PoweredSurface = createPoweredSurface({
    surfaceId: 'emergency-lights',
    label: 'Emergency lighting',
    drainPerMinute: 0.5,
    degradeBelowMinutes: 3,
    failBelowMinutes: 0,
    evidenceIntegrityLossOnFail: false,
  })

  it('degrades and loses a critical evidence surface when shared reserve crosses thresholds', () => {
    const result = resolveBackupPowerAccess({
      surfaces: [records],
      sharedReserveMinutes: 6,
      elapsedMinutes: 2,
    })
    expect(result.surfaces[0]?.accessBand).toBe('degraded')
    expect(result.surfaces[0]?.evidenceIntegrityLost).toBe(false)

    const failed = resolveBackupPowerAccess({
      surfaces: [records],
      sharedReserveMinutes: 3,
      elapsedMinutes: 2,
    })
    expect(failed.surfaces[0]?.accessBand).toBe('inaccessible')
    expect(failed.surfaces[0]?.evidenceIntegrityLost).toBe(true)
  })

  it('keeps a selective surface partially usable while shared reserve is exhausted', () => {
    const result = resolveBackupPowerAccess({
      surfaces: [records, fridge],
      sharedReserveMinutes: 1,
      elapsedMinutes: 1,
    })
    const rec = result.surfaces.find((s) => s.surfaceId === 'medical-records')
    const fr = result.surfaces.find((s) => s.surfaceId === 'cold-storage')
    expect(rec?.accessBand).toBe('inaccessible')
    expect(fr?.accessBand).toBe('degraded')
    expect(fr?.remainingMinutes).toBe(8)
  })

  it('reports priority preservation without reallocating drain', () => {
    const result = resolveBackupPowerAccess({
      surfaces: [records, lights],
      sharedReserveMinutes: 10,
      elapsedMinutes: 1,
      priorityOrder: ['medical-records'],
    })
    expect(result.surfaces.find((s) => s.surfaceId === 'medical-records')?.preservedByPriority).toBe(
      true,
    )
    expect(result.surfaces.find((s) => s.surfaceId === 'emergency-lights')?.preservedByPriority).toBe(
      false,
    )
  })

  it('is deterministic for identical inputs', () => {
    const input = {
      surfaces: [records, fridge, lights],
      sharedReserveMinutes: 8,
      elapsedMinutes: 3,
      priorityOrder: ['cold-storage'],
    }
    const a = resolveBackupPowerAccess(input)
    const b = resolveBackupPowerAccess(input)
    expect(a).toEqual(b)
  })

  it('rejects invalid thresholds', () => {
    expect(() =>
      createPoweredSurface({
        surfaceId: 'bad',
        label: 'Bad',
        drainPerMinute: 1,
        degradeBelowMinutes: 1,
        failBelowMinutes: 5,
        evidenceIntegrityLossOnFail: false,
      }),
    ).toThrow(/failBelowMinutes/)
  })
})
