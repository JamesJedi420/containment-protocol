import { beforeAll, describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { getContractOffers, launchContract } from '../domain/contracts'
import {
  captureSimulationValidationAdvanceInput,
  runSimulationValidationScenario,
} from '../domain/sim/validation'
import type { SimulationValidationTelemetryEvent } from '../domain/sim/validation'
import { analyzeSimulationValidationTelemetry } from '../domain/sim/validationTelemetry'

describe('authored contract-risk telemetry (SPE-1119)', () => {
  let baseline: SimulationValidationTelemetryEvent
  beforeAll(() => {
    runSimulationValidationScenario('baseline', {
      onSnapshot: (event) => {
        baseline ??= event
      },
    })
  })

  it('copies authored identity and risk through an actual contract launch', () => {
    const initial = createStartingState()
    const offer = getContractOffers(initial)[0]
    const state = launchContract(initial, offer.id, 't_nightwatch')
    const activeCase = Object.values(state.cases).find(
      (entry) => entry.contract?.offerId === offer.id
    )!
    expect(activeCase).toBeDefined()
    const captured = captureSimulationValidationAdvanceInput(state).committedOperations.find(
      (entry) => entry.caseId === activeCase.id
    )!
    expect(captured.contract).toEqual({ templateId: offer.templateId, riskLevel: offer.riskLevel })
    Object.assign(captured.contract!, { riskLevel: 'extreme', templateId: 'observer' })
    expect(activeCase.contract?.templateId).toBe(offer.templateId)
    expect(activeCase.contract?.riskLevel).toBe(offer.riskLevel)
    delete activeCase.contract!.riskLevel
    expect(
      captureSimulationValidationAdvanceInput(state).committedOperations.find(
        (entry) => entry.caseId === activeCase.id
      )?.contract?.riskLevel
    ).toBeNull()
    delete activeCase.contract
    expect(
      captureSimulationValidationAdvanceInput(state).committedOperations.find(
        (entry) => entry.caseId === activeCase.id
      )?.contract
    ).toBeNull()
  })

  function trace() {
    // Constructed trace isolates analytics; no claim that these player choices occurred.
    return [1, 2, 3].map((sequence) => {
      const event = structuredClone(baseline)
      event.sequence = sequence
      event.advanceInput.week = sequence
      event.snapshot.week = sequence
      event.snapshot.gameOver = false
      event.advanceInput.funding = 100 + sequence * 10
      event.advanceInput.committedOperations = [
        {
          caseId: `low-${sequence}`,
          templateId: 'shared-case-template',
          assignedTeamIds: ['a'],
          contract: { templateId: 'income-family', riskLevel: 'low' },
        },
        {
          caseId: 'continuing-high',
          templateId: 'shared-case-template',
          assignedTeamIds: ['b'],
          contract: { templateId: 'other-family', riskLevel: 'high' },
        },
        {
          caseId: 'legacy-unknown',
          templateId: 'shared-case-template',
          assignedTeamIds: ['c'],
          contract: { templateId: null, riskLevel: null },
        },
        { caseId: 'ordinary', templateId: 'ordinary-case', assignedTeamIds: ['d'], contract: null },
      ]
      event.advanceInput.actionBudget.committedDemand = 4
      return event
    })
  }

  it('exposes repeated low-risk work despite rising funding without counting duration as new choices', () => {
    const events = trace()
    const analysis = analyzeSimulationValidationTelemetry(events, {
      scenarioId: 'baseline',
      weeksSimulated: 3,
    })
    expect(analysis.history.map((week) => week.fundingBeforeAdvance)).toEqual([110, 120, 130])
    expect(analysis.contractGroups).toEqual([
      {
        templateId: 'income-family',
        riskLevel: 'low',
        distinctObservedCases: 3,
        committedCaseWeeks: 3,
      },
      {
        templateId: 'other-family',
        riskLevel: 'high',
        distinctObservedCases: 1,
        committedCaseWeeks: 3,
      },
      { templateId: null, riskLevel: null, distinctObservedCases: 1, committedCaseWeeks: 3 },
    ])
    expect(analysis.distinctObservedCases).toBe(6)
    const knownRisk = analysis.contractGroups.filter((group) => group.riskLevel !== null)
    const low = knownRisk
      .filter((group) => group.riskLevel === 'low')
      .reduce((sum, group) => sum + group.distinctObservedCases, 0)
    expect(low / knownRisk.reduce((sum, group) => sum + group.distinctObservedCases, 0)).toBe(0.75)
    // The explicit denominator excludes unknown risk and non-contract cases; it is not a universal dominance verdict.
  })

  it('keeps risk labels distinct and ordering stable when input operation order changes', () => {
    const events = trace()
    events[1].advanceInput.committedOperations[0].contract!.riskLevel = 'medium'
    events[2].advanceInput.committedOperations[0].contract!.riskLevel = 'moderate'
    const analyze = (items: SimulationValidationTelemetryEvent[]) =>
      analyzeSimulationValidationTelemetry(items, { scenarioId: 'baseline', weeksSimulated: 3 })
    const before = structuredClone(events)
    const first = analyze(events)
    const reversed = structuredClone(events)
    reversed.forEach((event) => event.advanceInput.committedOperations.reverse())
    expect(analyze(reversed)).toEqual(first)
    expect(
      first.contractGroups
        .filter((group) => group.templateId === 'income-family')
        .map((group) => group.riskLevel)
    ).toEqual(['low', 'medium', 'moderate'])
    expect(events).toEqual(before)
  })
})
