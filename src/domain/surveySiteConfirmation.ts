/**
 * SPE-311 — survey success versus actual site confirmation (pure, caller-owned).
 *
 * Successful surveys do not imply a viable exploit site. Confirmation is a
 * separate downstream step that distinguishes no-site, false-positive traces,
 * and misinformation from actionable viable nodes. No geology simulator,
 * GameState, or week-close ownership.
 */

export const SURVEY_SITE_CONFIRMATION_OWNER = 'SPE-311' as const

export type SurveyOutcome = 'success' | 'failure'

export type SiteConfirmationKind =
  'viable_site' | 'no_site' | 'false_positive_traces' | 'misinformation'

export interface SurveyReport {
  readonly surveyId: string
  readonly outcome: SurveyOutcome
  /** Caller-owned 0–100 signal strength from the survey pass. */
  readonly claimedSignalStrength: number
}

export interface ConfirmationEvidence {
  readonly kind: SiteConfirmationKind
  /** Required when kind is `viable_site`; ignored otherwise. */
  readonly siteNodeId?: string
}

export interface SurveySiteResolution {
  readonly surveySucceeded: boolean
  readonly actionable: boolean
  readonly confirmation: SiteConfirmationKind | 'survey_failed'
  readonly siteNodeId: string | null
  readonly reason: string
  readonly owner: typeof SURVEY_SITE_CONFIRMATION_OWNER
}

const SURVEY_OUTCOMES = new Set<SurveyOutcome>(['success', 'failure'])
const CONFIRMATION_KINDS = new Set<SiteConfirmationKind>([
  'viable_site',
  'no_site',
  'false_positive_traces',
  'misinformation',
])

function assertSafeIntegerInRange(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be a safe integer ${min}–${max}`)
  }
  return value
}

function assertNonEmptyId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required`)
  }
  return value.trim()
}

export function createSurveyReport(input: SurveyReport): SurveyReport {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('survey report is required')
  }
  const surveyId = assertNonEmptyId(input.surveyId, 'surveyId')
  if (!SURVEY_OUTCOMES.has(input.outcome)) {
    throw new Error('survey outcome must be success or failure')
  }
  const claimedSignalStrength = assertSafeIntegerInRange(
    input.claimedSignalStrength,
    'claimedSignalStrength',
    0,
    100
  )
  return Object.freeze({ surveyId, outcome: input.outcome, claimedSignalStrength })
}

export function createConfirmationEvidence(input: ConfirmationEvidence): ConfirmationEvidence {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('confirmation evidence is required')
  }
  if (!CONFIRMATION_KINDS.has(input.kind)) {
    throw new Error('confirmation kind is invalid')
  }
  if (input.kind === 'viable_site') {
    const siteNodeId = assertNonEmptyId(input.siteNodeId, 'siteNodeId')
    return Object.freeze({ kind: 'viable_site', siteNodeId })
  }
  if (input.siteNodeId !== undefined && input.siteNodeId !== null) {
    throw new Error(`${input.kind} must not include a siteNodeId`)
  }
  return Object.freeze({ kind: input.kind })
}

/**
 * Resolve whether a surveyed target is truly actionable after confirmation.
 * Survey success alone never yields an actionable site.
 */
export function resolveSurveySiteConfirmation(
  surveyInput: SurveyReport,
  confirmationInput: ConfirmationEvidence
): SurveySiteResolution {
  const survey = createSurveyReport(surveyInput)
  const confirmation = createConfirmationEvidence(confirmationInput)

  if (survey.outcome === 'failure') {
    return Object.freeze({
      surveySucceeded: false,
      actionable: false,
      confirmation: 'survey_failed',
      siteNodeId: null,
      reason: 'survey_failed_before_confirmation',
      owner: SURVEY_SITE_CONFIRMATION_OWNER,
    })
  }

  switch (confirmation.kind) {
    case 'viable_site':
      return Object.freeze({
        surveySucceeded: true,
        actionable: true,
        confirmation: 'viable_site',
        siteNodeId: confirmation.siteNodeId ?? null,
        reason: 'survey_success_with_viable_site',
        owner: SURVEY_SITE_CONFIRMATION_OWNER,
      })
    case 'no_site':
      return Object.freeze({
        surveySucceeded: true,
        actionable: false,
        confirmation: 'no_site',
        siteNodeId: null,
        reason: 'survey_success_without_site',
        owner: SURVEY_SITE_CONFIRMATION_OWNER,
      })
    case 'false_positive_traces':
      return Object.freeze({
        surveySucceeded: true,
        actionable: false,
        confirmation: 'false_positive_traces',
        siteNodeId: null,
        reason: 'survey_success_false_positive_traces',
        owner: SURVEY_SITE_CONFIRMATION_OWNER,
      })
    case 'misinformation':
      return Object.freeze({
        surveySucceeded: true,
        actionable: false,
        confirmation: 'misinformation',
        siteNodeId: null,
        reason: 'survey_success_misinformation',
        owner: SURVEY_SITE_CONFIRMATION_OWNER,
      })
    default: {
      const _exhaustive: never = confirmation.kind
      throw new Error(`unhandled confirmation kind: ${_exhaustive}`)
    }
  }
}

/** True when confirmation is a non-actionable success distinct from survey failure. */
export function isSuccessfulSurveyWithoutViableSite(resolution: SurveySiteResolution): boolean {
  return (
    resolution.surveySucceeded &&
    !resolution.actionable &&
    (resolution.confirmation === 'no_site' ||
      resolution.confirmation === 'false_positive_traces' ||
      resolution.confirmation === 'misinformation')
  )
}
