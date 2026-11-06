import { describe, expect, it } from 'vitest'
import { getResolvedDifficultyRunConfiguration } from '../domain/campaignLedger'
import { resolveDifficultyRunConfiguration } from '../domain/difficultyProfileResolver'
import {
  runSimulationValidationScenario,
  runSimulationValidationSuite,
} from '../domain/sim/validation'
import type { SimulationValidationTelemetryEvent } from '../domain/sim/validation'
import { analyzeSimulationValidationTelemetry } from '../domain/sim/validationTelemetry'

function capture(profileId: 'cozy' | 'normal') {
  const events: SimulationValidationTelemetryEvent[] = []
  const run = runSimulationValidationScenario('baseline', {
    difficulty: { profileId, profileVersion: '1' },
    onSnapshot: (event) => events.push(event),
  })
  return { run, events, analysis: analyzeSimulationValidationTelemetry(events, run.summary) }
}

describe('profile-segmented validation telemetry (SPE-1119)', () => {
  it('compares actual repeatable multi-week outcomes under two canonical configurations', () => {
    const captures = (['cozy', 'normal'] as const).map((profileId) => {
      const captured = capture(profileId)
      expect(captured).toEqual(capture(profileId))
      expect(captured.events.length).toBeGreaterThan(1)
      const resolved = resolveDifficultyRunConfiguration({ profileId, profileVersion: '1' })
      expect(resolved.ok).toBe(true)
      if (!resolved.ok) throw new Error(resolved.reason)
      expect(captured.analysis.difficulty).toEqual(resolved.configuration)
      expect(
        captured.events.every((event) => event.advanceInput.difficulty.profileId === profileId)
      ).toBe(true)
      expect(captured.analysis.outcomes).toEqual(captured.run.summary.missionOutcomeCounts)
      expect(getResolvedDifficultyRunConfiguration(captured.run.finalState)).toEqual(
        resolved.configuration
      )
      return captured
    })
    // Segmentation must retain distinct source configurations even when a producer
    // does not consume their modifiers yet. Divergent outcomes are not fabricated.
    expect(captures[0].analysis.difficulty).not.toEqual(captures[1].analysis.difficulty)
  })

  it('preserves the default run when no explicit configuration is provided', () => {
    expect(runSimulationValidationScenario('baseline', { difficulty: undefined })).toEqual(
      runSimulationValidationScenario('baseline')
    )
  })

  it('detaches custom inputs before the observer can mutate caller-owned configuration', () => {
    const difficulty = { profileId: 'custom', custom: { multipliers: { upkeep: 1.2 } } }
    const events: SimulationValidationTelemetryEvent[] = []
    const run = runSimulationValidationScenario('baseline', {
      difficulty,
      onSnapshot: (event) => {
        events.push(event)
        difficulty.custom.multipliers.upkeep = 2
      },
    })
    expect(events.length).toBeGreaterThan(1)
    expect(events.every((event) => event.advanceInput.difficulty.multipliers.upkeep === 1.2)).toBe(
      true
    )
    expect(getResolvedDifficultyRunConfiguration(run.finalState).multipliers.upkeep).toBe(1.2)
    expect(
      analyzeSimulationValidationTelemetry(events, run.summary).difficulty?.multipliers.upkeep
    ).toBe(1.2)
  })

  it.each([
    { profileId: 'unknown' },
    { profileId: 'normal', profileVersion: '999' },
    { profileId: 'custom', custom: { multipliers: { upkeep: -1 } } },
  ])('rejects invalid explicit configuration without emitting telemetry: %j', (difficulty) => {
    const events: SimulationValidationTelemetryEvent[] = []
    expect(() =>
      runSimulationValidationSuite({ difficulty, onSnapshot: (event) => events.push(event) })
    ).toThrow('Validation difficulty:')
    expect(events).toHaveLength(0)
  })
})
