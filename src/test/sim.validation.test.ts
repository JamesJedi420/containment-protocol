import { describe, expect, it } from 'vitest'
import {
  formatSimulationValidationSummary,
  getSimulationValidationScenarios,
  runSimulationValidationScenario,
  runSimulationValidationSuite,
} from '../domain/sim/validation'

function toStableRunSnapshot(scenarioId: Parameters<typeof runSimulationValidationScenario>[0]) {
  const run = runSimulationValidationScenario(scenarioId)

  return {
    summary: run.summary,
    weekly: run.weekly,
  }
}

function toSummarySnapshot() {
  return runSimulationValidationSuite().map((run) => ({
    scenarioId: run.summary.scenarioId,
    weekOfFirstMajorFailure: run.summary.weekOfFirstMajorFailure,
    dominantPressureSource: run.summary.dominantPressureSource,
    dominantFactor: run.summary.dominantFactor,
    weeksSimulated: run.summary.weeksSimulated,
    endedByGameOver: run.summary.endedByGameOver,
    unresolvedCaseCountTrend: run.summary.unresolvedCaseCountTrend,
    attritionTrend: run.summary.attritionTrend,
    budgetPressureTrend: run.summary.budgetPressureTrend,
    escalationTrend: run.summary.escalationTrend,
    intelConfidenceTrend: run.summary.intelConfidenceTrend,
    missionOutcomeCounts: run.summary.missionOutcomeCounts,
    formatted: formatSimulationValidationSummary(run.summary),
  }))
}

describe('simulation validation pass', () => {
  it('registers the requested bounded validation scenarios', () => {
    expect(getSimulationValidationScenarios()).toEqual([
      {
        id: 'baseline',
        label: 'Baseline campaign progression',
        maxWeeks: 12,
      },
      {
        id: 'low-intel',
        label: 'Low-intel campaign',
        maxWeeks: 12,
      },
      {
        id: 'high-escalation',
        label: 'High-escalation campaign',
        maxWeeks: 12,
      },
      {
        id: 'high-budget-pressure',
        label: 'High-budget-pressure campaign',
        maxWeeks: 12,
      },
      {
        id: 'high-attrition',
        label: 'High-attrition campaign',
        maxWeeks: 12,
      },
      {
        id: 'mixed-pressure',
        label: 'Mixed-pressure campaign',
        maxWeeks: 12,
      },
    ])
  })

  it('reproduces deterministic long-run validation runs', () => {
    expect(toStableRunSnapshot('mixed-pressure')).toEqual(toStableRunSnapshot('mixed-pressure'))
  })

  it('keeps scenario summaries stable across repeated suite runs', () => {
    expect(toSummarySnapshot()).toEqual(toSummarySnapshot())
  })

  it('identifies dominant failure sources in representative pressure scenarios', () => {
    expect(runSimulationValidationScenario('low-intel').summary.dominantPressureSource).toBe('intel')
    expect(runSimulationValidationScenario('low-intel').summary.dominantFactor).toBe('intel')
    expect(runSimulationValidationScenario('high-escalation').summary.dominantPressureSource).toBe(
      'escalation'
    )
    expect(
      runSimulationValidationScenario('high-budget-pressure').summary.dominantPressureSource
    ).toBe('budget')
    expect(runSimulationValidationScenario('high-attrition').summary.dominantPressureSource).toBe(
      'attrition'
    )
  })

  it('avoids immediate runaway collapse in the baseline scenario', () => {
    const baseline = runSimulationValidationScenario('baseline').summary

    expect(baseline.weekOfFirstMajorFailure === null || baseline.weekOfFirstMajorFailure > 4).toBe(
      true
    )
    expect(baseline.weeksSimulated).toBeGreaterThanOrEqual(5)
  })

  it('keeps neglect-heavy scenarios failing in expected ways', () => {
    const scenarios = ['low-intel', 'high-escalation', 'high-budget-pressure', 'mixed-pressure'] as const

    for (const scenarioId of scenarios) {
      const summary = runSimulationValidationScenario(scenarioId).summary

      expect(summary.weekOfFirstMajorFailure).not.toBeNull()
      expect(summary.dominantPressureSource).not.toBe('stable')
    }
  })

  it('captures compact stable summaries for the first validation pass', () => {
    expect(toSummarySnapshot()).toMatchInlineSnapshot(`
      [
        {
          "attritionTrend": [
            0,
            0,
            0,
            0,
            0,
          ],
          "budgetPressureTrend": [
            0,
            0,
            0,
            0,
            1,
          ],
          "dominantFactor": "case-load",
          "dominantPressureSource": "case-load",
          "endedByGameOver": true,
          "escalationTrend": [
            0,
            0,
            0,
            3,
            12,
          ],
          "formatted": "baseline | firstFailure=5 | dominant=case-load | weeks=5 | unresolved=[3, 1, 1, 5, 15] | attrition=[0, 0, 0, 0, 0] | budget=[0, 0, 0, 0, 1] | escalation=[0, 0, 0, 3, 12] | intel=[1, 0.96, 0.88, 0.95, 0.93] | missions=success:2, partial:0, fail:0, unresolved:4",
          "intelConfidenceTrend": [
            1,
            0.96,
            0.88,
            0.95,
            0.93,
          ],
          "missionOutcomeCounts": {
            "fail": 0,
            "partial": 0,
            "success": 2,
            "unresolved": 4,
          },
          "scenarioId": "baseline",
          "unresolvedCaseCountTrend": [
            3,
            1,
            1,
            5,
            15,
          ],
          "weekOfFirstMajorFailure": 5,
          "weeksSimulated": 5,
        },
        {
          "attritionTrend": [
            0,
            0,
            0,
          ],
          "budgetPressureTrend": [
            0,
            0,
            2,
          ],
          "dominantFactor": "intel",
          "dominantPressureSource": "intel",
          "endedByGameOver": true,
          "escalationTrend": [
            0,
            3,
            12,
          ],
          "formatted": "low-intel | firstFailure=1 | dominant=intel | weeks=3 | unresolved=[3, 4, 11] | attrition=[0, 0, 0] | budget=[0, 0, 2] | escalation=[0, 3, 12] | intel=[0.18, 0.57, 0.75] | missions=success:2, partial:0, fail:0, unresolved:4",
          "intelConfidenceTrend": [
            0.18,
            0.57,
            0.75,
          ],
          "missionOutcomeCounts": {
            "fail": 0,
            "partial": 0,
            "success": 2,
            "unresolved": 4,
          },
          "scenarioId": "low-intel",
          "unresolvedCaseCountTrend": [
            3,
            4,
            11,
          ],
          "weekOfFirstMajorFailure": 1,
          "weeksSimulated": 3,
        },
        {
          "attritionTrend": [
            0,
            0,
          ],
          "budgetPressureTrend": [
            0,
            4,
          ],
          "dominantFactor": "escalation",
          "dominantPressureSource": "escalation",
          "endedByGameOver": true,
          "escalationTrend": [
            15,
            39,
          ],
          "formatted": "high-escalation | firstFailure=1 | dominant=escalation | weeks=2 | unresolved=[6, 14] | attrition=[0, 0] | budget=[0, 4] | escalation=[15, 39] | intel=[1, 0.99] | missions=success:1, partial:0, fail:0, unresolved:5",
          "intelConfidenceTrend": [
            1,
            0.99,
          ],
          "missionOutcomeCounts": {
            "fail": 0,
            "partial": 0,
            "success": 1,
            "unresolved": 5,
          },
          "scenarioId": "high-escalation",
          "unresolvedCaseCountTrend": [
            6,
            14,
          ],
          "weekOfFirstMajorFailure": 1,
          "weeksSimulated": 2,
        },
        {
          "attritionTrend": [
            0,
            0,
            0,
          ],
          "budgetPressureTrend": [
            3,
            4,
            4,
          ],
          "dominantFactor": "budget",
          "dominantPressureSource": "budget",
          "endedByGameOver": true,
          "escalationTrend": [
            0,
            3,
            12,
          ],
          "formatted": "high-budget-pressure | firstFailure=1 | dominant=budget | weeks=3 | unresolved=[3, 4, 13] | attrition=[0, 0, 0] | budget=[3, 4, 4] | escalation=[0, 3, 12] | intel=[1, 0.98, 0.98] | missions=success:2, partial:0, fail:0, unresolved:4",
          "intelConfidenceTrend": [
            1,
            0.98,
            0.98,
          ],
          "missionOutcomeCounts": {
            "fail": 0,
            "partial": 0,
            "success": 2,
            "unresolved": 4,
          },
          "scenarioId": "high-budget-pressure",
          "unresolvedCaseCountTrend": [
            3,
            4,
            13,
          ],
          "weekOfFirstMajorFailure": 1,
          "weeksSimulated": 3,
        },
        {
          "attritionTrend": [
            3,
            3,
          ],
          "budgetPressureTrend": [
            0,
            4,
          ],
          "dominantFactor": "attrition",
          "dominantPressureSource": "attrition",
          "endedByGameOver": true,
          "escalationTrend": [
            3,
            18,
          ],
          "formatted": "high-attrition | firstFailure=1 | dominant=attrition | weeks=2 | unresolved=[6, 17] | attrition=[3, 3] | budget=[0, 4] | escalation=[3, 18] | intel=[1, 0.99] | missions=success:0, partial:0, fail:0, unresolved:6",
          "intelConfidenceTrend": [
            1,
            0.99,
          ],
          "missionOutcomeCounts": {
            "fail": 0,
            "partial": 0,
            "success": 0,
            "unresolved": 6,
          },
          "scenarioId": "high-attrition",
          "unresolvedCaseCountTrend": [
            6,
            17,
          ],
          "weekOfFirstMajorFailure": 1,
          "weeksSimulated": 2,
        },
        {
          "attritionTrend": [
            3,
          ],
          "budgetPressureTrend": [
            4,
          ],
          "dominantFactor": "escalation",
          "dominantPressureSource": "escalation",
          "endedByGameOver": true,
          "escalationTrend": [
            21,
          ],
          "formatted": "mixed-pressure | firstFailure=1 | dominant=escalation | weeks=1 | unresolved=[12] | attrition=[3] | budget=[4] | escalation=[21] | intel=[0.79] | missions=success:0, partial:0, fail:0, unresolved:3",
          "intelConfidenceTrend": [
            0.79,
          ],
          "missionOutcomeCounts": {
            "fail": 0,
            "partial": 0,
            "success": 0,
            "unresolved": 3,
          },
          "scenarioId": "mixed-pressure",
          "unresolvedCaseCountTrend": [
            12,
          ],
          "weekOfFirstMajorFailure": 1,
          "weeksSimulated": 1,
        },
      ]
    `)
  })
})
