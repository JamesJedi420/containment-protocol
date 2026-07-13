import { describe, expect, it } from 'vitest'

import {
  evaluatePostCaseMediaPersistence,
  EXAMPLE_ADAPTATION_COMMERCIALIZATION_POST_CASE_MEDIA,
} from '../domain/postCaseMediaPersistence'
import {
  composeCommercializationContinuityMediaInput,
  composeSpe947MediaEconomyContinuityReadings,
  EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE,
  resolveSpe947MediaEconomyContinuity,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT,
} from '../domain/spe947MediaEconomyContinuity'

describe('spe947MediaEconomyContinuity (SPE-2609 / SPE-947)', () => {
  it('empty bindings compose to an empty list without throwing', () => {
    expect(
      composeSpe947MediaEconomyContinuityReadings({
        maps: {
          spe947MediaEconomyContinuityBindings: {},
          spe947MediaEconomyWeights: {},
          spe947PostCaseMediaCases: {},
        },
      })
    ).toEqual([])

    expect(composeSpe947MediaEconomyContinuityReadings({ maps: {} })).toEqual([])
  })

  it('missing case resolves as missing_case without throw or false AC', () => {
    const reading = resolveSpe947MediaEconomyContinuity({
      binding: SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING,
      maps: {
        spe947MediaEconomyWeights: {
          [SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT.id]: SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT,
        },
        spe947PostCaseMediaCases: {},
      },
    })

    expect(reading.status).toBe('missing_case')
    expect(reading.remainsRisky).toBe(false)
    expect(reading.baseDecision).toBeNull()
    expect(reading.modulatedDecision).toBeNull()
    expect(reading.reasonCodes).toContain('missing_case')
    expect(reading.reasonCodes).toContain('unresolved_link')
  })

  it('missing economy weight resolves as missing_economy_weight without throw', () => {
    const reading = resolveSpe947MediaEconomyContinuity({
      binding: SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING,
      maps: {
        spe947PostCaseMediaCases: {
          [EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE.caseId!]:
            EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE,
        },
        spe947MediaEconomyWeights: {},
      },
    })

    expect(reading.status).toBe('missing_economy_weight')
    expect(reading.remainsRisky).toBe(false)
    expect(reading.reasonCodes).toContain('missing_economy_weight')
    expect(reading.reasonCodes).toContain('unresolved_link')
  })

  it('invalid economy weight factors resolve as invalid without throw', () => {
    const reading = resolveSpe947MediaEconomyContinuity({
      binding: SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING,
      maps: {
        spe947PostCaseMediaCases: {
          [EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE.caseId!]:
            EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE,
        },
        spe947MediaEconomyWeights: {
          [SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT.id]: {
            ...SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT,
            continuityFactor: Number.NaN,
          },
        },
      },
    })

    expect(reading.status).toBe('invalid_economy_weight')
    expect(reading.remainsRisky).toBe(false)
    expect(reading.reasonCodes).toContain('invalid_economy_weight')
  })

  it('base weak case clears and does not falsely satisfy parent AC without continuity', () => {
    const base = evaluatePostCaseMediaPersistence(EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE)
    expect(base.outcome).toBe('cleared')
    expect(base.remainsRisky).toBe(false)
    expect(base.persistenceRiskScore).toBe(2)
  })

  it('authored commercialization continuity path modulates residual risk after containment', () => {
    const readings = composeSpe947MediaEconomyContinuityReadings({
      maps: {
        spe947PostCaseMediaCases: {
          [EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE.caseId!]:
            EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE,
        },
        spe947MediaEconomyWeights: {
          [SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT.id]: SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT,
        },
        spe947MediaEconomyContinuityBindings: {
          [SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING.id]:
            SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING,
        },
      },
    })

    expect(readings).toHaveLength(1)
    const reading = readings[0]!
    expect(reading.status).toBe('modulated')
    expect(reading.effectiveContinuityFactor).toBe(3)
    expect(reading.baseDecision?.outcome).toBe('cleared')
    expect(reading.baseDecision?.remainsRisky).toBe(false)
    expect(reading.modulatedDecision?.outcome).toBe('remains_risky')
    expect(reading.modulatedDecision?.remainsRisky).toBe(true)
    // adaptation 1 + commercialization 1*3 = 4
    expect(reading.modulatedDecision?.persistenceRiskScore).toBe(4)
    expect(reading.remainsRisky).toBe(true)
    expect(reading.reasonCodes).toContain('commercialization_continuity_applied')
    expect(reading.reasonCodes).toContain('adaptation_untouched')
    expect(reading.reasonCodes).toContain('media_persistence_remains_risky')
  })

  it('valid case + weight with no commercialization target yields no_commercialization', () => {
    const adaptationOnlyCase = Object.freeze({
      caseId: 'case:adaptation-only',
      caseLabel: 'Adaptation-only residue',
      localContainmentSucceeded: true,
      riskThreshold: 3,
      mediaArtifacts: Object.freeze([
        Object.freeze({
          id: 'media:adaptation-only',
          label: 'Adaptation cut only',
          kind: 'adaptation' as const,
          persistsAfterContainment: true,
          riskWeight: 2,
        }),
      ]),
    })

    const reading = resolveSpe947MediaEconomyContinuity({
      binding: {
        id: 'spe947-media-economy:adaptation-only',
        caseId: adaptationOnlyCase.caseId,
        economyWeightId: SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT.id,
      },
      maps: {
        spe947PostCaseMediaCases: {
          [adaptationOnlyCase.caseId]: adaptationOnlyCase,
        },
        spe947MediaEconomyWeights: {
          [SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT.id]: SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT,
        },
      },
    })

    expect(reading.status).toBe('no_commercialization')
    expect(reading.reasonCodes).toContain('no_commercialization_target')
    expect(reading.reasonCodes).toContain('adaptation_untouched')
    expect(reading.modulatedDecision?.persistenceRiskScore).toBe(
      reading.baseDecision?.persistenceRiskScore
    )
  })

  it('blocked base media persistence short-circuits without compose', () => {
    const malformedCase = Object.freeze({
      caseId: 'case:malformed-media',
      caseLabel: 'Malformed media list',
      localContainmentSucceeded: true,
      riskThreshold: 3,
      mediaArtifacts: null,
    })

    const reading = resolveSpe947MediaEconomyContinuity({
      binding: {
        id: 'spe947-media-economy:malformed',
        caseId: malformedCase.caseId,
        economyWeightId: SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT.id,
      },
      maps: {
        spe947PostCaseMediaCases: {
          [malformedCase.caseId]: malformedCase,
        },
        spe947MediaEconomyWeights: {
          [SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT.id]: SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT,
        },
      },
    })

    expect(reading.status).toBe('media_blocked')
    expect(reading.remainsRisky).toBe(false)
    expect(reading.baseDecision?.outcome).toBe('blocked')
    expect(reading.modulatedDecision?.outcome).toBe('blocked')
    expect(reading.reasonCodes).toContain('media_persistence_blocked')
  })

  it('adaptation riskWeight stays untouched when commercialization is modulated', () => {
    const composed = composeCommercializationContinuityMediaInput({
      caseRecord: EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE,
      economyWeight: SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT,
      binding: SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING,
    })

    expect(composed).not.toBeNull()
    const adaptation = composed!.mediaArtifacts!.find((a) => a.kind === 'adaptation')
    const commercialization = composed!.mediaArtifacts!.find((a) => a.kind === 'commercialization')
    expect(adaptation?.riskWeight).toBe(1)
    expect(commercialization?.riskWeight).toBe(3)
  })

  it('strong SPE-2606 fixture without bindings does not invent continuity readings', () => {
    expect(
      composeSpe947MediaEconomyContinuityReadings({
        maps: {
          spe947PostCaseMediaCases: {
            [EXAMPLE_ADAPTATION_COMMERCIALIZATION_POST_CASE_MEDIA.caseId!]:
              EXAMPLE_ADAPTATION_COMMERCIALIZATION_POST_CASE_MEDIA,
          },
          spe947MediaEconomyWeights: {
            [SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT.id]: SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT,
          },
        },
      })
    ).toEqual([])
  })
})
