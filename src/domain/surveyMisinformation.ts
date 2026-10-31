/**
 * SPE-313 — catastrophic survey misinformation (pure, caller-owned).
 *
 * Critical survey failures can imprint false absence or false richness beliefs
 * instead of informationally neutral nulls. Ordinary failures stay neutral.
 * A later reveal action clears the active misread without inventing geology.
 * SPE-311 owns confirmation; SPE-312 owns survey clocks.
 */

import { assertNonEmptyId } from './assertBoundedInteger'

export const SURVEY_MISINFORMATION_OWNER = 'SPE-313' as const

export type SurveyFailureSeverity = 'ordinary' | 'critical'

export type MisinformationBelief = 'none' | 'false_absence' | 'false_richness'

export interface SurveyFailureReport {
  readonly surveyId: string
  readonly severity: SurveyFailureSeverity
  /** Required when severity is `critical`; must be absent/false belief for ordinary. */
  readonly belief?: Exclude<MisinformationBelief, 'none'>
}

export interface SurveyMisinformationState {
  readonly surveyId: string
  readonly belief: MisinformationBelief
  readonly active: boolean
  readonly revealed: boolean
  readonly owner: typeof SURVEY_MISINFORMATION_OWNER
}

const SEVERITIES = new Set<SurveyFailureSeverity>(['ordinary', 'critical'])
const CATASTROPHIC_BELIEFS = new Set<Exclude<MisinformationBelief, 'none'>>([
  'false_absence',
  'false_richness',
])

export function resolveCatastrophicSurveyMisread(
  failure: SurveyFailureReport
): SurveyMisinformationState {
  if (typeof failure !== 'object' || failure === null || Array.isArray(failure)) {
    throw new Error('survey failure report is required')
  }
  const surveyId = assertNonEmptyId(failure.surveyId, 'surveyId')
  if (!SEVERITIES.has(failure.severity)) {
    throw new Error('survey failure severity is invalid')
  }
  if (failure.severity === 'ordinary') {
    if (failure.belief !== undefined) {
      throw new Error('ordinary survey failure must not carry a catastrophic belief')
    }
    return Object.freeze({
      surveyId,
      belief: 'none',
      active: false,
      revealed: false,
      owner: SURVEY_MISINFORMATION_OWNER,
    })
  }
  if (failure.belief === undefined || !CATASTROPHIC_BELIEFS.has(failure.belief)) {
    throw new Error('critical survey failure requires false_absence or false_richness')
  }
  return Object.freeze({
    surveyId,
    belief: failure.belief,
    active: true,
    revealed: false,
    owner: SURVEY_MISINFORMATION_OWNER,
  })
}

/** Later action that exposes the misread; fails closed if already revealed or inactive. */
export function revealSurveyMisinformation(
  state: SurveyMisinformationState
): SurveyMisinformationState {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) {
    throw new Error('survey misinformation state is required')
  }
  if (state.owner !== SURVEY_MISINFORMATION_OWNER) {
    throw new Error('survey misinformation owner mismatch')
  }
  if (!state.active || state.belief === 'none') {
    throw new Error('no active survey misinformation to reveal')
  }
  if (state.revealed) {
    throw new Error('survey misinformation already revealed')
  }
  return Object.freeze({
    surveyId: state.surveyId,
    belief: state.belief,
    active: false,
    revealed: true,
    owner: SURVEY_MISINFORMATION_OWNER,
  })
}

export function isActivelyMisleading(state: SurveyMisinformationState): boolean {
  return state.active && state.belief !== 'none' && !state.revealed
}
