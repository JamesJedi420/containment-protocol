import { describe, expect, it } from 'vitest'
import {
  accumulateDegradationAcrossWindows,
  projectProgressiveDegradation,
} from './facilityProgressiveDegradation'

describe('SPE-3781 progressive facility dependency degradation', () => {
  it('affects at least two dependent services while leaving independent services ready', () => {
    const projections = projectProgressiveDegradation({
      disruptionId: 'hub-corruption',
      affectedNodeIds: ['alert-timing', 'logistics-freshness'],
      severity: 'partial',
      window: 'immediate',
    })

    const alert = projections.find((p) => p.nodeId === 'alert-timing')
    const logistics = projections.find((p) => p.nodeId === 'logistics-freshness')
    const archive = projections.find((p) => p.nodeId === 'archive-integrity')

    expect(alert?.availability).toBe('degraded')
    expect(logistics?.availability).toBe('degraded')
    expect(archive?.availability).toBe('ready')
    expect(alert?.blockedRecovery).toBe(false)
  })

  it('accumulates across windows and blocks recovery for full disruption after immediate window', () => {
    const accumulated = accumulateDegradationAcrossWindows({
      disruptionId: 'hub-corruption',
      affectedNodeIds: ['alert-timing'],
      severity: 'full',
    })

    const immediate = accumulated.find(
      (p) => p.nodeId === 'alert-timing' && p.window === 'immediate',
    )
    const later = accumulated.find(
      (p) => p.nodeId === 'alert-timing' && p.window === 'window_1',
    )

    expect(immediate?.blockedRecovery).toBe(false)
    expect(later?.blockedRecovery).toBe(true)
    expect(later?.availability).toBe('unavailable')
  })

  it('permits recovery through independent alternative when severity is partial', () => {
    const projections = projectProgressiveDegradation({
      disruptionId: 'hub-corruption',
      affectedNodeIds: ['logistics-freshness'],
      severity: 'partial',
      window: 'window_1',
    })

    const logistics = projections.find((p) => p.nodeId === 'logistics-freshness')
    expect(logistics?.alternativePathAvailable).toBe(true)
  })
})
