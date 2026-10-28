import { describe, expect, it } from 'vitest'
import {
  projectSceneDifficultyForConsumers,
  resolveSceneDifficulty,
} from './sceneDifficultyMitigationResolver'

describe('resolveSceneDifficulty (SPE-3186)', () => {
  it('resolves multiple drivers into a deterministic scene-difficulty state', () => {
    const input = {
      sceneId: 'scene:warehouse',
      drivers: [
        {
          driver: 'darkness',
          intensity: 2,
          provenance: { sourceId: 'assess:night-ops', confidence: 'moderate' as const },
        },
        { driver: 'crowding', intensity: 1 },
        { driver: 'hostile_signal', intensity: 2 },
      ],
    }
    const first = resolveSceneDifficulty(input)
    const second = resolveSceneDifficulty(input)
    expect(first).toEqual(second)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.projection.drivers).toHaveLength(3)
    expect(first.projection.rawPressure).toBeGreaterThan(0)
    expect(first.projection.difficultyBand).not.toBe('trivial')
    expect(first.projection.consumerHint).toBe('phase_action_encounter')
  })

  it('applies mitigation without mutating underlying driver truth', () => {
    const drivers = [
      { driver: 'exposure', intensity: 3 },
      { driver: 'access_friction', intensity: 2 },
    ] as const
    const without = resolveSceneDifficulty({
      sceneId: 'scene:roof',
      drivers: [...drivers],
    })
    const withMitigation = resolveSceneDifficulty({
      sceneId: 'scene:roof',
      drivers: [...drivers],
      mitigations: [
        {
          mitigationId: 'mit:ppe',
          kind: 'ppe',
          strength: 2,
          provenance: { sourceId: 'kit:field-ppe', confidence: 'high' },
        },
      ],
    })
    expect(without.ok && withMitigation.ok).toBe(true)
    if (!without.ok || !withMitigation.ok) return
    expect(without.projection.drivers).toEqual(withMitigation.projection.drivers)
    expect(withMitigation.projection.mitigatedPressure).toBeLessThan(
      without.projection.mitigatedPressure
    )
    expect(withMitigation.projection.mitigations[0]?.provenance?.confidence).toBe('high')
  })

  it('bypasses no-stakes scenes and rejects invalid input', () => {
    const bypass = resolveSceneDifficulty({
      sceneId: 'scene:briefing',
      drivers: [],
      noStakes: true,
    })
    expect(bypass.ok).toBe(true)
    if (!bypass.ok) return
    expect(bypass.projection.bypassed).toBe(true)
    expect(bypass.projection.reasonCode).toBe('bypassed_no_stakes')

    const bad = resolveSceneDifficulty({
      sceneId: 'scene:x',
      drivers: [{ driver: 'magic', intensity: 1 }],
    })
    expect(bad.ok).toBe(false)
    expect(!bad.ok && bad.reasonCode).toBe('unknown_driver')
  })

  it('projects a consumer-safe view without leaking internal intensity tables', () => {
    const resolved = resolveSceneDifficulty({
      sceneId: 'scene:lobby',
      drivers: [{ driver: 'legal_pressure', intensity: 2 }],
    })
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    const consumer = projectSceneDifficultyForConsumers(resolved.projection)
    const serialized = JSON.stringify(consumer)
    expect(serialized).not.toMatch(/intensity|weight|rawPressure/i)
    expect(consumer.difficultyBand).toBe(resolved.projection.difficultyBand)
    expect(serialized).not.toMatch(/ICRPG|Easy\/Hard|Hearts|Target/i)
  })
})
