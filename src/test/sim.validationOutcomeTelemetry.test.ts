import { beforeAll, describe, expect, it } from 'vitest'
import {
  captureSimulationValidationMissionResults,
  runSimulationValidationScenario,
} from '../domain/sim/validation'
import type {
  SimulationValidationRun,
  SimulationValidationTelemetryEvent,
} from '../domain/sim/validation'
import { analyzeSimulationValidationTelemetry } from '../domain/sim/validationTelemetry'

describe('recorded mission-result telemetry (SPE-1119)', () => {
  let run: SimulationValidationRun
  const events: SimulationValidationTelemetryEvent[] = []
  beforeAll(() => {
    run = runSimulationValidationScenario('baseline', { onSnapshot: (event) => events.push(event) })
  })

  it('copies actual weekly report components without recalculating their values', () => {
    expect(events.flatMap((event) => event.missionResults ?? []).length).toBeGreaterThan(0)
    for (const event of events) {
      const report = run.finalState.reports.find((entry) => entry.week === event.snapshot.week)
      expect(report).toBeDefined()
      const originals = Object.values(report?.caseSnapshots ?? {}).flatMap((snapshot) =>
        snapshot.missionResult ? [snapshot.missionResult] : []
      )
      expect(event.missionResults).toHaveLength(originals.length)
      for (const captured of event.missionResults ?? []) {
        const original = originals.find((result) => result.caseId === captured.caseId)
        expect(original).toBeDefined()
        expect(captured).toEqual({
          caseId: original!.caseId,
          outcome: original!.outcome,
          rewards: original!.rewards,
          penalties: original!.penalties,
          injuries: original!.injuries,
          fatalities: original!.fatalities ?? null,
          spawnedConsequences: original!.spawnedConsequences,
        })
      }
    }
    const analysis = analyzeSimulationValidationTelemetry(events, run.summary)
    expect(analysis.resultComponents.recordedResults).toBe(
      events.reduce((total, event) => total + (event.missionResults?.length ?? 0), 0)
    )
    expect(analysis.history.map((week) => week.missionResultsAfterClose)).toEqual(
      events.map((event) => event.missionResults)
    )
  })

  it('distinguishes unavailable snapshots from a recorded week with no results', () => {
    expect(captureSimulationValidationMissionResults(undefined)).toBeNull()
    expect(
      captureSimulationValidationMissionResults({
        ...run.finalState.reports[0],
        caseSnapshots: undefined,
      })
    ).toBeNull()
    expect(
      captureSimulationValidationMissionResults({ ...run.finalState.reports[0], caseSnapshots: {} })
    ).toEqual([])
    for (const results of [null, []]) {
      const event = structuredClone(events[0])
      event.missionResults = results
      const analysis = analyzeSimulationValidationTelemetry([event], {
        scenarioId: 'baseline',
        weeksSimulated: 1,
      })
      expect(analysis.resultComponents.recordedResults).toBe(0)
      expect(analysis.resultComponents.weeksWithoutCaseSnapshots).toBe(results === null ? 1 : 0)
      expect(analysis.history[0].missionResultsAfterClose).toEqual(results)
    }
  })

  it('detaches nested records and produces stable case order independently of snapshot insertion order', () => {
    const report = run.finalState.reports.find((entry) =>
      Object.values(entry.caseSnapshots ?? {}).some((snapshot) => snapshot.missionResult)
    )!
    const before = structuredClone(report)
    const captured = captureSimulationValidationMissionResults(report)!
    expect(captured.length).toBeGreaterThan(0)
    expect(
      captureSimulationValidationMissionResults({
        ...report,
        caseSnapshots: Object.fromEntries(Object.entries(report.caseSnapshots!).reverse()),
      })
    ).toEqual(captured)
    Object.assign(captured[0].rewards, { fundingDelta: -999, reasons: ['consumer-mutation'] })
    expect(report).toEqual(before)
  })

  it('counts recorded component presence per result, including losses, without an opaque score', () => {
    // Constructed component records isolate counting; this is not a player campaign.
    const seed = events.flatMap((event) => event.missionResults ?? [])[0]
    const standing = seed.rewards.agencyStanding
    expect(standing).toBeDefined()
    if (!standing) throw new Error('Expected canonical standing metadata on a new result')
    const fundingOnly = structuredClone(seed)
    fundingOnly.caseId = 'fixture-funding'
    Object.assign(fundingOnly.rewards, {
      fundingDelta: 5,
      containmentDelta: 0,
      strategicValueDelta: 0,
      reputationDelta: 0,
      agencyStanding: undefined,
      inventoryRewards: [],
      factionStanding: [],
    })
    fundingOnly.penalties = {
      fundingLoss: 0,
      containmentLoss: 0,
      reputationLoss: 0,
      strategicLoss: 0,
    }
    fundingOnly.injuries = []
    fundingOnly.fatalities = []
    fundingOnly.spawnedConsequences = []
    const broad = structuredClone(fundingOnly)
    broad.caseId = 'fixture-components'
    Object.assign(broad.rewards, {
      fundingDelta: -2,
      containmentDelta: 1,
      strategicValueDelta: 2,
      reputationDelta: 3,
      agencyStanding: { ...standing, points: 4 },
      inventoryRewards: [
        { kind: 'material', itemId: 'fixture', label: 'Fixture', quantity: 1, tags: [] },
      ],
      factionStanding: [{ factionId: 'fixture', label: 'Fixture', delta: -1, overlapTags: [] }],
    })
    broad.penalties.fundingLoss = 2
    broad.injuries = [
      { agentId: 'fixture-agent', agentName: 'Fixture', severity: 'minor', damage: 1 },
    ]
    broad.fatalities = [{ agentId: 'fixture-fatality' }]
    broad.spawnedConsequences = [
      { type: 'queued_follow_up', caseId: 'fixture-next', detail: 'Recorded fixture only' },
    ]
    const event = structuredClone(events[0])
    event.missionResults = [fundingOnly, broad]
    const before = structuredClone(event)
    const analyze = () =>
      analyzeSimulationValidationTelemetry([event], { scenarioId: 'baseline', weeksSimulated: 1 })
    const analysis = analyze()
    expect(analysis).toEqual(analyze())
    expect(analysis.resultComponents).toEqual({
      recordedResults: 2,
      weeksWithoutCaseSnapshots: 0,
      withFundingChange: 2,
      withContainmentChange: 1,
      withStrategicValueChange: 1,
      withReputationChange: 1,
      withAgencyStandingChange: 1,
      withInventoryRecords: 1,
      withFactionStandingChange: 1,
      withInjuryRecords: 1,
      withFatalityRecords: 1,
      withSpawnedConsequenceRecords: 1,
    })
    Object.assign(analysis.history[0].missionResultsAfterClose![0].rewards, { fundingDelta: 999 })
    expect(event).toEqual(before)
  })

  it.each(['duplicate', 'non-finite', 'missing'] as const)(
    'rejects %s recorded result data',
    (kind) => {
      const event = structuredClone(events[0])
      const result = structuredClone(events.flatMap((entry) => entry.missionResults ?? [])[0])
      event.missionResults = kind === 'duplicate' ? [result, structuredClone(result)] : [result]
      if (kind === 'non-finite') result.rewards.fundingDelta = Number.NaN
      if (kind === 'missing') Object.assign(event, { missionResults: undefined })
      expect(() =>
        analyzeSimulationValidationTelemetry([event], { scenarioId: 'baseline', weeksSimulated: 1 })
      ).toThrow(kind)
    }
  )
})
