// cspell:words psionic
import type { CaseInstance, CaseTemplate, GameState } from './models'
import { isSecondEscalationBandWeek, PRESSURE_CALIBRATION } from './sim/calibration'
import { getBeliefDrivenCasePressure } from './beliefTracks'
import type { BeliefTrackState } from './beliefTracks'

export interface ResponseGridConfig {
  majorIncidentThreshold: number
  majorIncidentTemplateIds: string[]
  pressureDecayPerWeek?: number
}

export const DEFAULT_RESPONSE_GRID: ResponseGridConfig = {
  majorIncidentThreshold: PRESSURE_CALIBRATION.defaultMajorIncidentThreshold,
  majorIncidentTemplateIds: ['raid-001', 'anomaly-raid-001', 'cyber-raid-001'],
  pressureDecayPerWeek: PRESSURE_CALIBRATION.defaultPressureDecayPerWeek,
}

export const DEFAULT_CASE_REGION_TAG = 'global'

function getSourceTags(
  source: Pick<CaseTemplate, 'tags'> | Pick<CaseInstance, 'tags' | 'requiredTags' | 'preferredTags'>
) {
  return [
    ...source.tags,
    ...('requiredTags' in source ? source.requiredTags : []),
    ...('preferredTags' in source ? source.preferredTags : []),
  ]
}

export function inferCaseRegionTag(
  source: Pick<CaseTemplate, 'tags'> | Pick<CaseInstance, 'tags' | 'requiredTags' | 'preferredTags'>
) {
  const tags = new Set(getSourceTags(source))

  if (
    ['cyber', 'information', 'signal', 'relay', 'classified', 'infrastructure'].some((tag) =>
      tags.has(tag)
    )
  ) {
    return 'network_grid'
  }

  if (['biological', 'chemical', 'hazmat', 'lab', 'forensics'].some((tag) => tags.has(tag))) {
    return 'bio_containment'
  }

  if (
    ['cult', 'occult', 'ritual', 'spirit', 'haunting', 'possession', 'psionic'].some((tag) =>
      tags.has(tag)
    )
  ) {
    return 'occult_district'
  }

  if (['combat', 'perimeter', 'breach', 'hostile', 'raid', 'threat'].some((tag) => tags.has(tag))) {
    return 'perimeter_sector'
  }

  return DEFAULT_CASE_REGION_TAG
}

export function inferCasePressureValue(
  source: Pick<
    CaseTemplate,
    'difficulty' | 'weights' | 'deadlineWeeks' | 'durationWeeks' | 'kind' | 'onUnresolved' | 'tags'
  >
) {
  const weightedDifficulty =
    source.difficulty.combat * source.weights.combat +
    source.difficulty.investigation * source.weights.investigation +
    source.difficulty.utility * source.weights.utility +
    source.difficulty.social * source.weights.social
  const difficultyBand = Math.max(1, Math.round(weightedDifficulty / 18))
  const urgencyBand = Math.max(1, 5 - Math.min(source.deadlineWeeks, 4))
  const escalationBand = Math.max(0, (source.onUnresolved.stageDelta ?? 0) - 1)
  const durationBand = Math.max(0, source.durationWeeks - 1)
  const kindBand = source.kind === 'raid' ? 3 : 0

  return Math.max(1, difficultyBand + urgencyBand + escalationBand + durationBand + kindBand)
}

export function getCasePressureValue(
  currentCase: Pick<
    CaseInstance,
    'difficulty' | 'weights' | 'deadlineWeeks' | 'durationWeeks' | 'kind' | 'onUnresolved' | 'tags'
  > & {
    pressureValue?: number
  }
) {
  if (typeof currentCase.pressureValue === 'number' && Number.isFinite(currentCase.pressureValue)) {
    return Math.max(1, Math.trunc(currentCase.pressureValue))
  }

  return inferCasePressureValue(currentCase)
}

export function getCaseRegionTag(
  currentCase: Pick<CaseInstance, 'tags' | 'requiredTags' | 'preferredTags'> & {
    regionTag?: string
  }
) {
  if (typeof currentCase.regionTag === 'string' && currentCase.regionTag.length > 0) {
    return currentCase.regionTag
  }

  return inferCaseRegionTag(currentCase)
}

export function getResponseGridConfig(
  state: GameState | { responseGrid?: Partial<ResponseGridConfig> }
): ResponseGridConfig {
  const responseGrid = state && 'responseGrid' in state ? state.responseGrid : undefined
  const week = state && 'week' in state && typeof state.week === 'number' ? state.week : undefined
  const secondEscalationBand = week !== undefined && isSecondEscalationBandWeek(week)
  const threshold =
    typeof responseGrid?.majorIncidentThreshold === 'number' &&
    Number.isFinite(responseGrid.majorIncidentThreshold)
      ? Math.max(1, Math.trunc(responseGrid.majorIncidentThreshold))
      : DEFAULT_RESPONSE_GRID.majorIncidentThreshold
  const templateIds =
    responseGrid?.majorIncidentTemplateIds
      ?.filter((templateId) => typeof templateId === 'string')
      .map((templateId) => templateId.trim())
      .filter((templateId) => templateId.length > 0) ?? []
  const decayPerWeek =
    typeof responseGrid?.pressureDecayPerWeek === 'number' &&
    Number.isFinite(responseGrid.pressureDecayPerWeek)
      ? Math.max(0, Math.trunc(responseGrid.pressureDecayPerWeek))
      : (DEFAULT_RESPONSE_GRID.pressureDecayPerWeek ?? 0)

  return {
    majorIncidentThreshold: threshold,
    majorIncidentTemplateIds:
      templateIds.length > 0
        ? [...new Set(templateIds)]
        : DEFAULT_RESPONSE_GRID.majorIncidentTemplateIds,
    pressureDecayPerWeek: secondEscalationBand
      ? decayPerWeek + PRESSURE_CALIBRATION.secondEscalationPressureDecayBonus
      : decayPerWeek,
  }
}

/**
 * Returns the effective case pressure value, augmented by external-party belief
 * state when available.  The belief bonus is driven by institutionalJudgment and
 * crowdConsensus only — factTruth is intentionally excluded.
 *
 * Falls back to getCasePressureValue when no beliefTracks are supplied.
 */
export function getCasePressureWithBelief(
  currentCase: Pick<
    CaseInstance,
    'difficulty' | 'weights' | 'deadlineWeeks' | 'durationWeeks' | 'kind' | 'onUnresolved' | 'tags'
  > & {
    pressureValue?: number
  },
  beliefTracks?: BeliefTrackState
): number {
  const base = getCasePressureValue(currentCase)
  if (beliefTracks === undefined) {
    return base
  }

  return base + getBeliefDrivenCasePressure(beliefTracks)
}
