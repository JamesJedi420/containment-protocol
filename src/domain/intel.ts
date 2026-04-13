import { clamp } from './math'
import type { CaseInstance, GameState, Id } from './models'
import { INTEL_CALIBRATION } from './sim/calibration'

export const DEFAULT_INTEL_CONFIDENCE = 1
export const DEFAULT_INTEL_UNCERTAINTY = 0
export const INTEL_CONFIDENCE_DECAY_PER_WEEK = INTEL_CALIBRATION.confidenceDecayPerWeek
export const INTEL_UNCERTAINTY_GROWTH_PER_WEEK = INTEL_CALIBRATION.uncertaintyGrowthPerWeek

export interface IntelUpdateDelta {
  confidenceGain?: number
  uncertaintyReduction?: number
}

export interface MissionIntelSummary {
  confidence: number
  uncertainty: number
  age: number
}

export interface IntelDegradationModifiers {
  confidenceDecayMultiplier?: number
  uncertaintyGrowthMultiplier?: number
}

function normalizeWeek(week: number | undefined, fallbackWeek: number) {
  if (typeof week !== 'number' || !Number.isFinite(week)) {
    return Math.max(1, Math.trunc(fallbackWeek))
  }

  return Math.max(1, Math.trunc(week))
}

function normalizePositiveDelta(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, value)
}

function normalizeRateMultiplier(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1
  }

  return clamp(value, 0, 1)
}

export function createMissionIntelState(week: number) {
  const normalizedWeek = normalizeWeek(week, 1)

  return {
    intelConfidence: DEFAULT_INTEL_CONFIDENCE,
    intelUncertainty: DEFAULT_INTEL_UNCERTAINTY,
    intelLastUpdatedWeek: normalizedWeek,
  }
}

export function normalizeMissionIntel(mission: CaseInstance, fallbackWeek: number): CaseInstance {
  return {
    ...mission,
    intelConfidence: clamp(
      typeof mission.intelConfidence === 'number' && Number.isFinite(mission.intelConfidence)
        ? mission.intelConfidence
        : DEFAULT_INTEL_CONFIDENCE,
      0,
      1
    ),
    intelUncertainty: clamp(
      typeof mission.intelUncertainty === 'number' && Number.isFinite(mission.intelUncertainty)
        ? mission.intelUncertainty
        : DEFAULT_INTEL_UNCERTAINTY,
      0,
      1
    ),
    intelLastUpdatedWeek: normalizeWeek(mission.intelLastUpdatedWeek, fallbackWeek),
  }
}

export function normalizeMissionIntelRecord(
  cases: GameState['cases'],
  fallbackWeek: number
): GameState['cases'] {
  return Object.fromEntries(
    Object.entries(cases).map(([caseId, currentCase]) => [
      caseId,
      normalizeMissionIntel(currentCase, fallbackWeek),
    ])
  )
}

export function applyIntelUpdate(
  state: GameState,
  missionId: Id,
  delta: IntelUpdateDelta,
  week: number
): GameState {
  const currentMission = state.cases[missionId]

  if (!currentMission) {
    return state
  }

  const normalizedMission = normalizeMissionIntel(currentMission, state.week)
  const nextMission = {
    ...normalizedMission,
    intelConfidence: clamp(
      normalizedMission.intelConfidence + normalizePositiveDelta(delta.confidenceGain),
      0,
      1
    ),
    intelUncertainty: clamp(
      normalizedMission.intelUncertainty - normalizePositiveDelta(delta.uncertaintyReduction),
      0,
      1
    ),
    intelLastUpdatedWeek: normalizeWeek(week, state.week),
  }

  return {
    ...state,
    cases: {
      ...state.cases,
      [missionId]: nextMission,
    },
  }
}

export function degradeMissionIntel(
  mission: CaseInstance,
  currentWeek: number,
  modifiers: IntelDegradationModifiers = {}
): CaseInstance {
  const normalizedMission = normalizeMissionIntel(mission, currentWeek)
  const normalizedWeek = normalizeWeek(currentWeek, normalizedMission.intelLastUpdatedWeek)
  const elapsedWeeks = Math.max(0, normalizedWeek - normalizedMission.intelLastUpdatedWeek)
  const confidenceDecayMultiplier = normalizeRateMultiplier(modifiers.confidenceDecayMultiplier)
  const uncertaintyGrowthMultiplier = normalizeRateMultiplier(modifiers.uncertaintyGrowthMultiplier)

  if (elapsedWeeks === 0 || normalizedMission.status === 'resolved') {
    return normalizedMission
  }

  return {
    ...normalizedMission,
    intelConfidence: clamp(
      normalizedMission.intelConfidence -
        elapsedWeeks * INTEL_CONFIDENCE_DECAY_PER_WEEK * confidenceDecayMultiplier,
      0,
      1
    ),
    intelUncertainty: clamp(
      normalizedMission.intelUncertainty +
        elapsedWeeks * INTEL_UNCERTAINTY_GROWTH_PER_WEEK * uncertaintyGrowthMultiplier,
      0,
      1
    ),
  }
}

export function degradeMissionIntelRecord(
  cases: GameState['cases'],
  currentWeek: number,
  modifiers: IntelDegradationModifiers = {}
): GameState['cases'] {
  return Object.fromEntries(
    Object.entries(cases).map(([caseId, currentCase]) => [
      caseId,
      degradeMissionIntel(currentCase, currentWeek, modifiers),
    ])
  )
}

export function getMissionIntelSummary(
  mission: Pick<CaseInstance, 'intelConfidence' | 'intelUncertainty' | 'intelLastUpdatedWeek'>,
  currentWeek = mission.intelLastUpdatedWeek
): MissionIntelSummary {
  const lastUpdatedWeek = normalizeWeek(mission.intelLastUpdatedWeek, currentWeek)
  const normalizedCurrentWeek = normalizeWeek(currentWeek, lastUpdatedWeek)

  return {
    confidence: clamp(mission.intelConfidence, 0, 1),
    uncertainty: clamp(mission.intelUncertainty, 0, 1),
    age: Math.max(0, normalizedCurrentWeek - lastUpdatedWeek),
  }
}

export function getMissionIntelRisk(
  mission: Pick<CaseInstance, 'intelConfidence' | 'intelUncertainty' | 'intelLastUpdatedWeek'>,
  currentWeek = mission.intelLastUpdatedWeek
) {
  const summary = getMissionIntelSummary(mission, currentWeek)

  return clamp(((1 - summary.confidence) + summary.uncertainty) / 2, 0, 1)
}
