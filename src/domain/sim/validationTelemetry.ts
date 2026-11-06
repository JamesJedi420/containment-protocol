import type { ResolvedDifficultyRunConfiguration } from '../difficultyProfileResolver'
import type { SimulationValidationSummary, SimulationValidationTelemetryEvent } from './validation'

// The current difficulty owner defines flat scalar records. Keep that assumption
// checked at compile time if its schema evolves, without order-sensitive JSON.
function sameFields<T extends Record<keyof T, string | number | boolean>>(left: T, right: T) {
  const leftEntries = Object.entries(left)
  const rightFields = new Map(Object.entries(right))
  return (
    leftEntries.length === rightFields.size &&
    leftEntries.every(([key, value]) => rightFields.has(key) && rightFields.get(key) === value)
  )
}

function sameDifficulty(
  left: ResolvedDifficultyRunConfiguration,
  right: ResolvedDifficultyRunConfiguration
) {
  const { multipliers: leftMultipliers, runOptions: leftOptions, ...leftIdentity } = left
  const { multipliers: rightMultipliers, runOptions: rightOptions, ...rightIdentity } = right
  return (
    sameFields(leftIdentity, rightIdentity) &&
    sameFields(leftMultipliers, rightMultipliers) &&
    sameFields(leftOptions, rightOptions)
  )
}

function requireTrace(condition: boolean, reason: string): asserts condition {
  if (!condition) throw new Error(`Validation telemetry: ${reason}`)
}

/**
 * Analyze one complete internal harness capture against its actual run summary.
 * Observed cases are not player selections; a continuing case is counted once
 * per template, while committedCaseWeeks retains its repeated weekly presence.
 */
export function analyzeSimulationValidationTelemetry(
  events: readonly SimulationValidationTelemetryEvent[],
  expected: Pick<SimulationValidationSummary, 'scenarioId' | 'weeksSimulated'>
) {
  requireTrace(
    Number.isSafeInteger(expected.weeksSimulated) &&
      expected.weeksSimulated >= 0 &&
      events.length === expected.weeksSimulated,
    'capture length does not match the run summary'
  )
  const difficulty = events[0]?.advanceInput.difficulty ?? null
  const templates = new Map<string, { cases: Set<string>; committedCaseWeeks: number }>()
  const allCases = new Set<string>()
  const outcomes = { success: 0, partial: 0, fail: 0, unresolved: 0 }

  const history = events.map((event, index) => {
    requireTrace(
      event.schemaVersion === 3 &&
        event.audience === 'internal-validation' &&
        event.source === 'simulation-validation-weekly-snapshot' &&
        event.phase === 'after-week-close' &&
        event.advanceInput.phase === 'before-week-close',
      'unsupported capture contract'
    )
    requireTrace(event.scenarioId === expected.scenarioId, 'mixed scenario capture')
    requireTrace(event.sequence === index + 1, 'missing, duplicate or reordered sequence')
    const { advanceInput, snapshot } = event
    requireTrace(
      Number.isSafeInteger(advanceInput.week) &&
        advanceInput.week >= 1 &&
        advanceInput.week === snapshot.week &&
        (index === 0 || advanceInput.week === events[index - 1].advanceInput.week + 1),
      'inconsistent week capture'
    )
    requireTrace(
      difficulty !== null && sameDifficulty(difficulty, advanceInput.difficulty),
      'mixed resolved difficulty configuration'
    )
    requireTrace(
      index === events.length - 1 || !snapshot.gameOver,
      'capture continues after game over'
    )
    requireTrace(
      Number.isFinite(advanceInput.funding) && Number.isFinite(snapshot.budgetPressure),
      'non-finite resource observation'
    )
    requireTrace(
      [
        snapshot.unresolvedCaseCount,
        snapshot.missionSuccesses,
        snapshot.missionPartials,
        snapshot.missionFailures,
        snapshot.missionUnresolved,
      ].every((count) => Number.isSafeInteger(count) && count >= 0),
      'invalid outcome or unresolved-case count'
    )
    const weekCases = new Set<string>()
    for (const operation of advanceInput.committedOperations) {
      requireTrace(!weekCases.has(operation.caseId), 'duplicate committed case within a week')
      weekCases.add(operation.caseId)
      allCases.add(operation.caseId)
      const group = templates.get(operation.templateId) ?? {
        cases: new Set<string>(),
        committedCaseWeeks: 0,
      }
      group.cases.add(operation.caseId)
      group.committedCaseWeeks += 1
      templates.set(operation.templateId, group)
    }
    requireTrace(
      weekCases.size === advanceInput.actionBudget.committedDemand,
      'commitment count differs from its action-budget source'
    )
    outcomes.success += snapshot.missionSuccesses
    outcomes.partial += snapshot.missionPartials
    outcomes.fail += snapshot.missionFailures
    outcomes.unresolved += snapshot.missionUnresolved
    return {
      week: advanceInput.week,
      fundingBeforeAdvance: advanceInput.funding,
      actionBudgetBeforeAdvance: structuredClone(advanceInput.actionBudget),
      missionIntakeBeforeAdvance: structuredClone(advanceInput.missionIntake),
      unresolvedCasesAfterClose: snapshot.unresolvedCaseCount,
      budgetPressureAfterClose: snapshot.budgetPressure,
    }
  })

  return {
    schemaVersion: 2 as const,
    audience: 'internal-validation' as const,
    scenarioId: expected.scenarioId,
    weeksObserved: events.length,
    difficulty: structuredClone(difficulty),
    distinctObservedCases: allCases.size,
    templates: [...templates]
      .map(([templateId, group]) => ({
        templateId,
        distinctObservedCases: group.cases.size,
        committedCaseWeeks: group.committedCaseWeeks,
      }))
      .sort((left, right) => {
        if (left.templateId < right.templateId) return -1
        if (left.templateId > right.templateId) return 1
        return 0
      }),
    outcomes,
    history,
  }
}
