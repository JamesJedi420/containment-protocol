import { describe, expect, it } from 'vitest'
import {
  isActivelyMisleading,
  resolveCatastrophicSurveyMisread,
  revealSurveyMisinformation,
} from '../domain/surveyMisinformation'

describe('SPE-313 catastrophic survey misinformation', () => {
  it('generates a false belief from a critical survey failure', () => {
    const falseAbsence = resolveCatastrophicSurveyMisread({
      surveyId: 'survey-x',
      severity: 'critical',
      belief: 'false_absence',
    })
    expect(falseAbsence.belief).toBe('false_absence')
    expect(falseAbsence.active).toBe(true)
    expect(isActivelyMisleading(falseAbsence)).toBe(true)

    const falseRichness = resolveCatastrophicSurveyMisread({
      surveyId: 'survey-y',
      severity: 'critical',
      belief: 'false_richness',
    })
    expect(falseRichness.belief).toBe('false_richness')
    expect(isActivelyMisleading(falseRichness)).toBe(true)
  })

  it('keeps ordinary survey failure informationally neutral', () => {
    const ordinary = resolveCatastrophicSurveyMisread({
      surveyId: 'survey-z',
      severity: 'ordinary',
    })
    expect(ordinary.belief).toBe('none')
    expect(ordinary.active).toBe(false)
    expect(isActivelyMisleading(ordinary)).toBe(false)
    expect(() =>
      resolveCatastrophicSurveyMisread({
        surveyId: 'survey-z',
        severity: 'ordinary',
        belief: 'false_absence',
      })
    ).toThrow(/must not carry/)
  })

  it('allows a later reveal action to expose the misinformation state', () => {
    const active = resolveCatastrophicSurveyMisread({
      surveyId: 'survey-r',
      severity: 'critical',
      belief: 'false_richness',
    })
    const revealed = revealSurveyMisinformation(active)
    expect(revealed.revealed).toBe(true)
    expect(revealed.active).toBe(false)
    expect(revealed.belief).toBe('false_richness')
    expect(isActivelyMisleading(revealed)).toBe(false)
    expect(() => revealSurveyMisinformation(revealed)).toThrow(/already revealed/)
  })

  it('is deterministic and does not mutate inputs', () => {
    const failure = {
      surveyId: 'survey-d',
      severity: 'critical' as const,
      belief: 'false_absence' as const,
    }
    const before = structuredClone(failure)
    const first = resolveCatastrophicSurveyMisread(failure)
    const second = resolveCatastrophicSurveyMisread(failure)
    expect(first).toEqual(second)
    expect(Object.isFrozen(first)).toBe(true)
    expect(failure).toEqual(before)
  })

  it('rejects malformed critical failures without a belief', () => {
    expect(() => resolveCatastrophicSurveyMisread({ surveyId: 's', severity: 'critical' })).toThrow(
      /false_absence or false_richness/
    )
    expect(() => resolveCatastrophicSurveyMisread({ surveyId: '', severity: 'ordinary' })).toThrow(
      /surveyId/
    )
  })
})
