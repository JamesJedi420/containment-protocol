import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  getCurrentCampaignRulesLedger,
  getResolvedDifficultyRunConfiguration,
} from '../domain/campaignLedger'
import { getContractOffers, launchContract } from '../domain/contracts'
import { resolveDifficultyRunConfiguration } from '../domain/difficultyProfileResolver'
import { runSimulationValidationScenario } from '../domain/sim/validation'
import type { SimulationValidationTelemetryEvent } from '../domain/sim/validation'
import { analyzeSimulationValidationTelemetry } from '../domain/sim/validationTelemetry'

describe('profile-segmented contract outcome fixtures (SPE-1119)', () => {
  it('retains authored risk and actual recorded consequences under two canonical profiles', () => {
    const comparisons = (['cozy', 'normal'] as const).map((profileId) => {
      const initial = createStartingState()
      const resolved = resolveDifficultyRunConfiguration({ profileId, profileVersion: '1' })
      expect(resolved.ok).toBe(true)
      if (!resolved.ok) throw new Error(resolved.reason)
      initial.campaignLedger = {
        ...getCurrentCampaignRulesLedger(initial),
        difficultyProfile: { profileId, profileVersion: '1' },
      }
      const offer = getContractOffers(initial)[0]
      expect(offer).toBeDefined()
      const startingState = launchContract(initial, offer.id, 't_nightwatch')
      const contractCase = Object.values(startingState.cases).find(
        (entry) => entry.contract?.offerId === offer.id
      )
      expect(contractCase).toBeDefined()
      if (!contractCase) throw new Error('Expected launched contract case')
      const before = structuredClone(startingState)
      const capture = () => {
        const events: SimulationValidationTelemetryEvent[] = []
        const run = runSimulationValidationScenario('baseline', {
          startingState,
          onSnapshot: (event) => events.push(event),
        })
        return { run, events, analysis: analyzeSimulationValidationTelemetry(events, run.summary) }
      }
      const captured = capture()
      expect(captured.events.length).toBeGreaterThan(0)
      expect(captured.analysis.difficulty).toEqual(resolved.configuration)
      expect(getResolvedDifficultyRunConfiguration(captured.run.finalState)).toEqual(
        resolved.configuration
      )
      expect(captured.analysis.contractGroups).toContainEqual(
        expect.objectContaining({
          templateId: offer.templateId,
          riskLevel: offer.riskLevel,
          distinctObservedCases: 1,
        })
      )
      const observedResults = captured.analysis.history.flatMap(
        (week) => week.missionResultsAfterClose ?? []
      )
      const contractResults = captured.analysis.history.flatMap((week) =>
        (week.missionResultsAfterClose ?? [])
          .filter((result) => result.caseId === contractCase.id)
          .map((result) => ({ week: week.week, result }))
      )
      expect(contractResults.length).toBeGreaterThan(0)
      for (const { week, result } of contractResults) {
        const report = captured.run.finalState.reports.find((entry) => entry.week === week)
        const source = Object.values(report?.caseSnapshots ?? {}).find(
          (snapshot) => snapshot.caseId === result.caseId && snapshot.missionResult
        )?.missionResult
        expect(source).toBeDefined()
        expect(result.rewards).toEqual(source?.rewards)
        expect(result.penalties).toEqual(source?.penalties)
        expect(result.spawnedConsequences).toEqual(source?.spawnedConsequences)
      }
      expect(captured.analysis.resultComponents.recordedResults).toBe(observedResults.length)
      expect(captured.analysis.outcomes).toEqual(captured.run.summary.missionOutcomeCounts)
      expect(startingState).toEqual(before)
      expect(captured).toEqual(capture())
      expect(startingState).toEqual(before)
      return captured.analysis
    })
    // Profile segmentation is not proof that every gameplay producer consumes its
    // modifiers. Equal consequences remain valid evidence; never fabricate divergence.
    expect(comparisons[0].difficulty).not.toEqual(comparisons[1].difficulty)
  })
})
