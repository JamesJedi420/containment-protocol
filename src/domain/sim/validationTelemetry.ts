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

function createResultComponents() {
  return {
    recordedResults: 0,
    weeksWithoutCaseSnapshots: 0,
    withFundingChange: 0,
    withContainmentChange: 0,
    withStrategicValueChange: 0,
    withReputationChange: 0,
    withAgencyStandingChange: 0,
    withInventoryRecords: 0,
    withFactionStandingChange: 0,
    withInjuryRecords: 0,
    withFatalityRecords: 0,
    withSpawnedConsequenceRecords: 0,
  }
}

function accumulateResultComponents(
  counts: ReturnType<typeof createResultComponents>,
  results: SimulationValidationTelemetryEvent['missionResults']
) {
  requireTrace(results === null || Array.isArray(results), 'missing recorded mission results')
  if (results === null) counts.weeksWithoutCaseSnapshots += 1
  const caseIds = new Set<string>()
  for (const result of results ?? []) {
    requireTrace(!caseIds.has(result.caseId), 'duplicate mission result within a week')
    caseIds.add(result.caseId)
    const { rewards } = result
    requireTrace(
      [
        rewards.fundingDelta,
        rewards.containmentDelta,
        rewards.strategicValueDelta,
        rewards.reputationDelta,
        rewards.agencyStanding?.points ?? 0,
        ...rewards.factionStanding.map((entry) => entry.delta),
      ].every(Number.isFinite),
      'non-finite recorded reward component'
    )
    counts.recordedResults += 1
    counts.withFundingChange += Number(rewards.fundingDelta !== 0)
    counts.withContainmentChange += Number(rewards.containmentDelta !== 0)
    counts.withStrategicValueChange += Number(rewards.strategicValueDelta !== 0)
    counts.withReputationChange += Number(rewards.reputationDelta !== 0)
    counts.withAgencyStandingChange += Number((rewards.agencyStanding?.points ?? 0) !== 0)
    counts.withInventoryRecords += Number(rewards.inventoryRewards.length > 0)
    counts.withFactionStandingChange += Number(
      rewards.factionStanding.some((entry) => entry.delta !== 0)
    )
    counts.withInjuryRecords += Number(result.injuries.length > 0)
    counts.withFatalityRecords += Number((result.fatalities?.length ?? 0) > 0)
    counts.withSpawnedConsequenceRecords += Number(result.spawnedConsequences.length > 0)
  }
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
  type Contract = NonNullable<
    SimulationValidationTelemetryEvent['advanceInput']['committedOperations'][number]['contract']
  >
  const contractGroups = new Map<
    string,
    Contract & { cases: Set<string>; committedCaseWeeks: number }
  >()
  const outcomes = { success: 0, partial: 0, fail: 0, unresolved: 0 }
  const resultComponents = createResultComponents()
  const contractResultGroups = new Map<
    string,
    Contract & {
      outcomes: typeof outcomes
      resultComponents: ReturnType<typeof createResultComponents>
    }
  >()
  let resultsWithoutCommittedContract = 0

  const history = events.map((event, index) => {
    requireTrace(
      event.schemaVersion === 7 &&
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
    const weekContracts = new Map<string, Contract>()
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
      if (operation.contract) {
        weekContracts.set(operation.caseId, operation.contract)
        const key = JSON.stringify([operation.contract.templateId, operation.contract.riskLevel])
        const contractGroup = contractGroups.get(key) ?? {
          ...operation.contract,
          cases: new Set<string>(),
          committedCaseWeeks: 0,
        }
        contractGroup.cases.add(operation.caseId)
        contractGroup.committedCaseWeeks += 1
        contractGroups.set(key, contractGroup)
      }
    }
    requireTrace(
      weekCases.size === advanceInput.actionBudget.committedDemand,
      'commitment count differs from its action-budget source'
    )
    outcomes.success += snapshot.missionSuccesses
    outcomes.partial += snapshot.missionPartials
    outcomes.fail += snapshot.missionFailures
    outcomes.unresolved += snapshot.missionUnresolved
    accumulateResultComponents(resultComponents, event.missionResults)
    for (const result of event.missionResults ?? []) {
      // Same-week source only: past or future observations cannot establish the
      // authored contract context of this recorded result occurrence.
      const contract = weekContracts.get(result.caseId)
      if (!contract) {
        resultsWithoutCommittedContract += 1
        continue
      }
      const key = JSON.stringify([contract.templateId, contract.riskLevel])
      const group = contractResultGroups.get(key) ?? {
        ...contract,
        outcomes: { success: 0, partial: 0, fail: 0, unresolved: 0 },
        resultComponents: createResultComponents(),
      }
      requireTrace(Object.hasOwn(group.outcomes, result.outcome), 'invalid recorded outcome')
      group.outcomes[result.outcome] += 1
      accumulateResultComponents(group.resultComponents, [result])
      contractResultGroups.set(key, group)
    }
    return {
      week: advanceInput.week,
      fundingBeforeAdvance: advanceInput.funding,
      actionBudgetBeforeAdvance: structuredClone(advanceInput.actionBudget),
      missionIntakeBeforeAdvance: structuredClone(advanceInput.missionIntake),
      staffTimeBeforeAdvance: structuredClone(advanceInput.staffTime),
      informationReportsBeforeAdvance: structuredClone(advanceInput.informationReports),
      informationReportsAfterClose: structuredClone(event.informationReports),
      missionResultsAfterClose: structuredClone(event.missionResults),
      unresolvedCasesAfterClose: snapshot.unresolvedCaseCount,
      budgetPressureAfterClose: snapshot.budgetPressure,
    }
  })

  return {
    schemaVersion: 7 as const,
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
    contractGroups: [...contractGroups]
      .sort(([left], [right]) => {
        if (left < right) return -1
        if (left > right) return 1
        return 0
      })
      .map(([, group]) => ({
        templateId: group.templateId,
        riskLevel: group.riskLevel,
        distinctObservedCases: group.cases.size,
        committedCaseWeeks: group.committedCaseWeeks,
      })),
    resultComponents,
    contractResultGroups: [...contractResultGroups]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([, group]) => group),
    resultsWithoutCommittedContract,
    history,
  }
}
