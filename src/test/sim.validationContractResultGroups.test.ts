import { beforeAll, describe, expect, it } from 'vitest'
import { runSimulationValidationScenario } from '../domain/sim/validation'
import type { SimulationValidationTelemetryEvent } from '../domain/sim/validation'
import { analyzeSimulationValidationTelemetry } from '../domain/sim/validationTelemetry'

describe('same-week contract result groups (SPE-1119)', () => {
  let seed: SimulationValidationTelemetryEvent
  let resultSeed: NonNullable<SimulationValidationTelemetryEvent['missionResults']>[number]
  beforeAll(() => {
    const events: SimulationValidationTelemetryEvent[] = []
    runSimulationValidationScenario('baseline', { onSnapshot: (event) => events.push(event) })
    expect(events.length).toBeGreaterThan(0)
    seed = events[0]
    const result = events.flatMap((event) => event.missionResults ?? [])[0]
    expect(result).toBeDefined()
    resultSeed = result
  })

  function result(caseId: string) {
    const record = structuredClone(resultSeed)
    record.caseId = caseId
    record.outcome = 'success'
    Object.assign(record.rewards, {
      fundingDelta: 5,
      containmentDelta: 0,
      strategicValueDelta: 0,
      reputationDelta: 0,
      agencyStanding: undefined,
      inventoryRewards: [],
      factionStanding: [],
    })
    record.injuries = []
    record.fatalities = []
    record.spawnedConsequences = []
    return record
  }

  function operation(caseId: string, riskLevel: string | null) {
    return {
      caseId,
      templateId: 'case-template',
      assignedTeamIds: ['fixture-team'],
      contract: { templateId: 'contract-family', riskLevel },
    }
  }

  function event(sequence = 1) {
    const captured = structuredClone(seed)
    captured.sequence = sequence
    captured.advanceInput.week = sequence
    captured.snapshot.week = sequence
    captured.snapshot.gameOver = false
    captured.advanceInput.committedOperations = []
    captured.advanceInput.actionBudget.committedDemand = 0
    captured.missionResults = []
    return captured
  }

  function analyze(events: SimulationValidationTelemetryEvent[]) {
    return analyzeSimulationValidationTelemetry(events, {
      scenarioId: 'baseline',
      weeksSimulated: events.length,
    })
  }

  it('separates component breadth and outcomes by authored risk without assigning unmatched records', () => {
    // Constructed packet isolates the join/counting contract, not gameplay balance.
    const captured = event()
    const unknown = operation('unknown', null)
    Object.assign(unknown.contract, { templateId: null })
    captured.advanceInput.committedOperations = [
      operation('low', 'low'),
      operation('high', 'high'),
      unknown,
      { ...operation('ordinary', 'low'), contract: null },
    ]
    captured.advanceInput.actionBudget.committedDemand = 4
    const high = result('high')
    high.outcome = 'fail'
    high.rewards.fundingDelta = -5
    high.rewards.reputationDelta = -2
    high.injuries = [{ agentId: 'fixture', agentName: 'Fixture', severity: 'minor', damage: 1 }]
    captured.missionResults = [
      result('low'),
      high,
      result('unknown'),
      result('ordinary'),
      result('absent'),
    ]
    const before = structuredClone(captured)
    const analysis = analyze([captured])
    expect(analysis.resultsWithoutCommittedContract).toBe(2)
    expect(analysis.contractResultGroups).toHaveLength(3)
    const lowGroup = analysis.contractResultGroups.find((group) => group.riskLevel === 'low')!
    const highGroup = analysis.contractResultGroups.find((group) => group.riskLevel === 'high')!
    expect(lowGroup.outcomes).toEqual({ success: 1, partial: 0, fail: 0, unresolved: 0 })
    expect(highGroup.outcomes).toEqual({ success: 0, partial: 0, fail: 1, unresolved: 0 })
    expect(lowGroup.resultComponents).toMatchObject({
      recordedResults: 1,
      withFundingChange: 1,
      withReputationChange: 0,
      withInjuryRecords: 0,
    })
    expect(highGroup.resultComponents).toMatchObject({
      recordedResults: 1,
      withFundingChange: 1,
      withReputationChange: 1,
      withInjuryRecords: 1,
    })
    expect(analysis.contractResultGroups).toContainEqual(
      expect.objectContaining({ templateId: null, riskLevel: null })
    )
    expect(
      analysis.contractResultGroups.reduce(
        (sum, group) => sum + group.resultComponents.recordedResults,
        analysis.resultsWithoutCommittedContract
      )
    ).toBe(analysis.resultComponents.recordedResults)
    const reversed = structuredClone(captured)
    reversed.advanceInput.committedOperations.reverse()
    reversed.missionResults!.reverse()
    expect(analyze([reversed]).contractResultGroups).toEqual(analysis.contractResultGroups)
    lowGroup.resultComponents.recordedResults = 999
    expect(captured).toEqual(before)
  })

  it('never borrows contract metadata from earlier or later weeks', () => {
    const first = event(1)
    first.advanceInput.committedOperations = [operation('past', 'low')]
    first.advanceInput.actionBudget.committedDemand = 1
    first.missionResults = [result('future')]
    const second = event(2)
    second.missionResults = [result('past')]
    const third = event(3)
    third.advanceInput.committedOperations = [operation('future', 'high')]
    third.advanceInput.actionBudget.committedDemand = 1
    third.missionResults = [result('future')]
    const analysis = analyze([first, second, third])
    expect(analysis.resultsWithoutCommittedContract).toBe(2)
    expect(analysis.contractResultGroups).toHaveLength(1)
    expect(analysis.contractResultGroups[0]).toMatchObject({
      riskLevel: 'high',
      resultComponents: { recordedResults: 1 },
    })
  })

  it('counts repeated result occurrences without calling them distinct completions', () => {
    const events = [1, 2].map((sequence) => {
      const captured = event(sequence)
      captured.advanceInput.committedOperations = [operation('continuing', 'low')]
      captured.advanceInput.actionBudget.committedDemand = 1
      captured.missionResults = [result('continuing')]
      return captured
    })
    const analysis = analyze(events)
    expect(analysis.contractGroups[0].distinctObservedCases).toBe(1)
    expect(analysis.contractResultGroups[0].resultComponents.recordedResults).toBe(2)
    expect(analysis.contractResultGroups[0].outcomes.success).toBe(2)
  })
})
