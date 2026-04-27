import { getCasePressureValue, getCasePressureWithBelief, getCaseRegionTag, getResponseGridConfig } from '../pressure'
import { type CaseInstance, type GameState } from '../models'
import { getAgencyProgressionPressureTemplateIds } from '../agencyProgression'
import { instantiateFromTemplate, type SpawnedCaseRecord } from './spawn'
import { isSecondEscalationBandWeek, PRESSURE_CALIBRATION } from './calibration'

const MAX_PRESSURE_INCIDENTS_PER_TICK = PRESSURE_CALIBRATION.maxPressureIncidentsPerTick

interface PressurePipelineInput {
  sourceState: GameState
  nextState: GameState
  initialCaseIds: string[]
  unresolvedTriggers: string[]
}

interface PressurePipelineResult {
  nextState: GameState
  spawnedCases: SpawnedCaseRecord[]
}

type LegacyPressureState = GameState & {
  globalPressure?: number
  responseGrid?: ReturnType<typeof getResponseGridConfig>
}

function filterExistingAssignedTeamIds(caseData: CaseInstance, teams: GameState['teams']) {
  return caseData.assignedTeamIds.filter((teamId) => Boolean(teams[teamId]))
}

function selectPressureMajorIncidentTemplate(state: GameState, rng: () => number) {
  const responseGrid = getResponseGridConfig(state)
  const configuredTemplates = getAgencyProgressionPressureTemplateIds(
    state,
    responseGrid.majorIncidentTemplateIds
  )
    .map((templateId: string) => state.templates[templateId])
    .filter(Boolean)

  if (configuredTemplates.length > 0) {
    const index = Math.floor(rng() * configuredTemplates.length)
    return configuredTemplates[Math.min(index, configuredTemplates.length - 1)]
  }

  const fallbackTemplates = Object.values(state.templates).filter(
    (template) => template.kind === 'raid' || template.templateId.includes('raid')
  )

  if (fallbackTemplates.length > 0) {
    const index = Math.floor(rng() * fallbackTemplates.length)
    return fallbackTemplates[Math.min(index, fallbackTemplates.length - 1)]
  }

  const allTemplates = Object.values(state.templates)
  if (allTemplates.length === 0) {
    return undefined
  }

  const index = Math.floor(rng() * allTemplates.length)
  return allTemplates[Math.min(index, allTemplates.length - 1)]
}

export function executePressurePipeline(
  input: PressurePipelineInput,
  rng: () => number
): PressurePipelineResult {
  const secondEscalationBand = isSecondEscalationBandWeek(input.sourceState.week)
  const sourceState = input.sourceState as LegacyPressureState
  const projectedState = input.nextState as LegacyPressureState
  const unresolvedPressureDeltaRaw = input.unresolvedTriggers.reduce((sum, caseId) => {
    const currentCase = input.sourceState.cases[caseId]
    if (!currentCase) {
      return sum
    }

    return sum + getCasePressureWithBelief(currentCase, currentCase.beliefTracks)
  }, 0)
  const unresolvedPressureDelta = secondEscalationBand
    ? Math.ceil(
        unresolvedPressureDeltaRaw * PRESSURE_CALIBRATION.secondEscalationUnresolvedPressureWeight
      )
    : unresolvedPressureDeltaRaw

  const ambientPressureDeltaRaw = input.initialCaseIds.reduce((sum, caseId) => {
    const currentCase = input.sourceState.cases[caseId]
    const assignedTeamIds = currentCase
      ? filterExistingAssignedTeamIds(currentCase, input.sourceState.teams)
      : []

    if (
      !currentCase ||
      currentCase.status !== 'open' ||
      assignedTeamIds.length > 0 ||
      input.unresolvedTriggers.includes(caseId)
    ) {
      return sum
    }

    return sum + 1
  }, 0)
  const ambientPressureDelta = secondEscalationBand
    ? Math.ceil(ambientPressureDeltaRaw * PRESSURE_CALIBRATION.secondEscalationAmbientPressureWeight)
    : ambientPressureDeltaRaw

  const startingGlobalPressure = sourceState.globalPressure ?? 0
  const responseGrid = getResponseGridConfig(projectedState)
  const maxPressureIncidentsPerTick = secondEscalationBand
    ? PRESSURE_CALIBRATION.secondEscalationMaxPressureIncidentsPerTick
    : MAX_PRESSURE_INCIDENTS_PER_TICK
  const pressureAfterDecay = Math.max(
    0,
    startingGlobalPressure - (responseGrid.pressureDecayPerWeek ?? 0)
  )

  let currentPressure = Math.max(
    0,
    pressureAfterDecay + unresolvedPressureDelta + ambientPressureDelta
  )
  let nextState: LegacyPressureState = {
    ...projectedState,
    globalPressure: currentPressure,
    responseGrid,
  }
  const spawnedCases: SpawnedCaseRecord[] = []

  while (
    currentPressure > responseGrid.majorIncidentThreshold &&
    spawnedCases.length < maxPressureIncidentsPerTick
  ) {
    const template = selectPressureMajorIncidentTemplate(nextState, rng)
    if (!template) {
      break
    }

    const unresolvedSourceCases = input.unresolvedTriggers
      .map((caseId) => input.sourceState.cases[caseId])
      .filter((currentCase): currentCase is CaseInstance => Boolean(currentCase))
    const dominantPressureSource = unresolvedSourceCases.sort(
      (left, right) => getCasePressureValue(right) - getCasePressureValue(left)
    )[0]
    const regionTag = dominantPressureSource
      ? getCaseRegionTag(dominantPressureSource)
      : getCaseRegionTag({
          tags: template.tags,
          requiredTags: template.requiredTags ?? [],
          preferredTags: template.preferredTags ?? [],
        })

    const usedIds = new Set(Object.keys(nextState.cases))
    const spawnedBase = instantiateFromTemplate(template, rng, usedIds, input.sourceState.week)
    const majorIncidentCase = {
      ...spawnedBase,
      title: `Major Incident — ${spawnedBase.title}`,
      kind: 'raid',
      stage: Math.max(3, spawnedBase.stage),
      deadlineWeeks: Math.max(1, Math.min(spawnedBase.deadlineWeeks, 2)),
      deadlineRemaining: Math.max(1, Math.min(spawnedBase.deadlineRemaining, 2)),
      regionTag,
      raid: spawnedBase.raid ?? { minTeams: 2, maxTeams: 4 },
    } as CaseInstance

    nextState = {
      ...nextState,
      cases: {
        ...nextState.cases,
        [majorIncidentCase.id]: majorIncidentCase,
      },
    }

    const pressureThatTriggeredIncident = currentPressure
    currentPressure = Math.max(0, currentPressure - responseGrid.majorIncidentThreshold)
    spawnedCases.push({
      caseId: majorIncidentCase.id,
      trigger: 'pressure_threshold',
      sourceReason: `Global pressure reached ${pressureThatTriggeredIncident}, breaching threshold ${responseGrid.majorIncidentThreshold}.`,
    })
  }

  return {
    nextState: {
      ...nextState,
      globalPressure: currentPressure,
    } as GameState,
    spawnedCases,
  }
}
