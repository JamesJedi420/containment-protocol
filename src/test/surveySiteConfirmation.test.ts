import { describe, expect, it } from 'vitest'
import {
  createConfirmationEvidence,
  createSurveyReport,
  isSuccessfulSurveyWithoutViableSite,
  resolveSurveySiteConfirmation,
} from '../domain/surveySiteConfirmation'

describe('SPE-311 survey success versus site confirmation', () => {
  it('allows a successful survey that does not produce a viable site', () => {
    const resolution = resolveSurveySiteConfirmation(
      { surveyId: 'survey-a', outcome: 'success', claimedSignalStrength: 72 },
      { kind: 'no_site' }
    )
    expect(resolution.surveySucceeded).toBe(true)
    expect(resolution.actionable).toBe(false)
    expect(resolution.confirmation).toBe('no_site')
    expect(resolution.siteNodeId).toBeNull()
    expect(isSuccessfulSurveyWithoutViableSite(resolution)).toBe(true)
  })

  it('resolves actionable status only after viable-site confirmation', () => {
    const actionable = resolveSurveySiteConfirmation(
      { surveyId: 'survey-b', outcome: 'success', claimedSignalStrength: 40 },
      { kind: 'viable_site', siteNodeId: 'node-ridge-7' }
    )
    expect(actionable.actionable).toBe(true)
    expect(actionable.confirmation).toBe('viable_site')
    expect(actionable.siteNodeId).toBe('node-ridge-7')
    expect(actionable.reason).toBe('survey_success_with_viable_site')

    const failedSurvey = resolveSurveySiteConfirmation(
      { surveyId: 'survey-c', outcome: 'failure', claimedSignalStrength: 10 },
      { kind: 'viable_site', siteNodeId: 'node-should-not-apply' }
    )
    expect(failedSurvey.surveySucceeded).toBe(false)
    expect(failedSurvey.actionable).toBe(false)
    expect(failedSurvey.confirmation).toBe('survey_failed')
  })

  it('distinguishes no-site, false-positive traces, and misinformation', () => {
    const noSite = resolveSurveySiteConfirmation(
      { surveyId: 's1', outcome: 'success', claimedSignalStrength: 55 },
      { kind: 'no_site' }
    )
    const falsePositive = resolveSurveySiteConfirmation(
      { surveyId: 's2', outcome: 'success', claimedSignalStrength: 55 },
      { kind: 'false_positive_traces' }
    )
    const misinformation = resolveSurveySiteConfirmation(
      { surveyId: 's3', outcome: 'success', claimedSignalStrength: 55 },
      { kind: 'misinformation' }
    )
    expect(noSite.confirmation).toBe('no_site')
    expect(falsePositive.confirmation).toBe('false_positive_traces')
    expect(misinformation.confirmation).toBe('misinformation')
    expect(noSite.reason).not.toBe(falsePositive.reason)
    expect(falsePositive.reason).not.toBe(misinformation.reason)
    expect(noSite.reason).not.toBe(misinformation.reason)
    expect([noSite, falsePositive, misinformation].every(isSuccessfulSurveyWithoutViableSite)).toBe(
      true
    )
  })

  it('is deterministic and does not mutate caller inputs', () => {
    const survey = { surveyId: 'survey-d', outcome: 'success' as const, claimedSignalStrength: 33 }
    const confirmation = { kind: 'false_positive_traces' as const }
    const beforeSurvey = structuredClone(survey)
    const beforeConfirmation = structuredClone(confirmation)
    const first = resolveSurveySiteConfirmation(survey, confirmation)
    const second = resolveSurveySiteConfirmation(survey, confirmation)
    expect(first).toEqual(second)
    expect(Object.isFrozen(first)).toBe(true)
    expect(survey).toEqual(beforeSurvey)
    expect(confirmation).toEqual(beforeConfirmation)
  })

  it('rejects malformed survey and confirmation packets', () => {
    expect(() =>
      createSurveyReport({ surveyId: '', outcome: 'success', claimedSignalStrength: 1 })
    ).toThrow(/surveyId/)
    expect(() =>
      createSurveyReport({ surveyId: 'x', outcome: 'success', claimedSignalStrength: 101 })
    ).toThrow(/0–100/)
    expect(() => createConfirmationEvidence({ kind: 'viable_site' })).toThrow(/siteNodeId/)
    expect(() => createConfirmationEvidence({ kind: 'no_site', siteNodeId: 'should-not' })).toThrow(
      /must not include/
    )
  })
})
