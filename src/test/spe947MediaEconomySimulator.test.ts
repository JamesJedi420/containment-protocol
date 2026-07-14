import { describe, expect, it } from 'vitest'

import {
  sanitizeSpe947MediaEconomyContinuityBindings,
  sanitizeSpe947MediaEconomyWeights,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT,
  EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE,
} from '../domain/spe947MediaEconomyContinuity'
import {
  composeCommercializationActorMediaInput,
  composeSpe947CommercializationEconomySims,
  simulateSpe947CommercializationEconomyPath,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_SIM_FIXTURE,
} from '../domain/spe947MediaEconomySimulator'

describe('spe947MediaEconomySimulator (SPE-2611 / SPE-947)', () => {
  it('empty persisted economy maps do not throw or falsely satisfy residual-risk AC', () => {
    expect(() =>
      simulateSpe947CommercializationEconomyPath({
        actor: SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
        maps: {
          spe947MediaEconomyWeights: {},
          spe947MediaEconomyContinuityBindings: {},
          spe947PostCaseMediaCases: {},
        },
      })
    ).not.toThrow()

    const reading = simulateSpe947CommercializationEconomyPath({
      actor: SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
      maps: {
        spe947MediaEconomyWeights: {},
        spe947MediaEconomyContinuityBindings: {},
      },
    })

    expect(reading.status).toBe('empty_maps')
    expect(reading.remainsRisky).toBe(false)
    expect(reading.simDecision).toBeNull()
    expect(reading.reasonCodes).toContain('empty_persisted_maps')
  })

  it('empty actor list composes to an empty list without throwing', () => {
    expect(
      composeSpe947CommercializationEconomySims({
        actors: [],
        maps: SPE_947_EXAMPLE_MEDIA_ECONOMY_SIM_FIXTURE.maps,
      })
    ).toEqual([])
  })

  it('authored commercialization actor path worsens residual risk via persisted maps', () => {
    const reading = simulateSpe947CommercializationEconomyPath(
      SPE_947_EXAMPLE_MEDIA_ECONOMY_SIM_FIXTURE
    )

    expect(reading.status).toBe('worsened')
    expect(reading.baseDecision?.outcome).toBe('cleared')
    expect(reading.baseDecision?.remainsRisky).toBe(false)
    expect(reading.continuityDecision?.outcome).toBe('remains_risky')
    expect(reading.continuityDecision?.persistenceRiskScore).toBe(4)
    // adaptation 1 + commercialization 1 * continuity 3 * actor 2 = 7
    expect(reading.simDecision?.outcome).toBe('remains_risky')
    expect(reading.simDecision?.persistenceRiskScore).toBe(7)
    expect(reading.remainsRisky).toBe(true)
    expect(reading.reasonCodes).toContain('commercialization_actor_applied')
    expect(reading.reasonCodes).toContain('adaptation_untouched')
    expect(reading.reasonCodes).toContain('residual_risk_worsened')
    expect(reading.reasonCodes).toContain('media_persistence_remains_risky')
  })

  it('adaptation riskWeight stays untouched when actor worsens commercialization', () => {
    const composed = composeCommercializationActorMediaInput({
      caseRecord: EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE,
      binding: SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING,
      economyWeight: SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT,
      actorWorsenFactor:
        SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR.actorWorsenFactor,
    })

    expect(composed).not.toBeNull()
    const adaptation = composed!.mediaArtifacts!.find((a) => a.kind === 'adaptation')
    const commercialization = composed!.mediaArtifacts!.find(
      (a) => a.kind === 'commercialization'
    )
    expect(adaptation?.riskWeight).toBe(1)
    expect(commercialization?.riskWeight).toBe(6)
  })

  it('SPE-2610 sanitize round-trip of persisted maps remains valid for the sim path', () => {
    const sanitizedWeights = sanitizeSpe947MediaEconomyWeights(
      SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE.spe947MediaEconomyWeights
    )
    const sanitizedBindings = sanitizeSpe947MediaEconomyContinuityBindings(
      SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE.spe947MediaEconomyContinuityBindings
    )

    const reading = simulateSpe947CommercializationEconomyPath({
      actor: SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
      maps: {
        spe947PostCaseMediaCases: {
          [EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE.caseId!]:
            EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE,
        },
        spe947MediaEconomyWeights: sanitizedWeights,
        spe947MediaEconomyContinuityBindings: sanitizedBindings,
      },
    })

    expect(reading.status).toBe('worsened')
    expect(reading.remainsRisky).toBe(true)
    expect(sanitizedWeights).toEqual(
      SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE.spe947MediaEconomyWeights
    )
    expect(sanitizedBindings).toEqual(
      SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE.spe947MediaEconomyContinuityBindings
    )
  })

  it('missing continuity binding resolves without throw or false AC', () => {
    const reading = simulateSpe947CommercializationEconomyPath({
      actor: SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
      maps: {
        spe947MediaEconomyWeights: {
          [SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT.id]: SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT,
        },
        spe947MediaEconomyContinuityBindings: {
          'spe947-media-economy:other-binding': {
            id: 'spe947-media-economy:other-binding',
            caseId: EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE.caseId!,
            economyWeightId: SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT.id,
          },
        },
      },
    })

    expect(reading.status).toBe('missing_binding')
    expect(reading.remainsRisky).toBe(false)
    expect(reading.reasonCodes).toContain('missing_binding')
  })

  it('actorWorsenFactor 1 stays continuity_only when continuity already remains risky', () => {
    const reading = simulateSpe947CommercializationEconomyPath({
      actor: {
        ...SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
        actorWorsenFactor: 1,
      },
      maps: SPE_947_EXAMPLE_MEDIA_ECONOMY_SIM_FIXTURE.maps,
    })

    expect(reading.status).toBe('continuity_only')
    expect(reading.simDecision?.persistenceRiskScore).toBe(
      reading.continuityDecision?.persistenceRiskScore
    )
    expect(reading.reasonCodes).toContain('residual_risk_unchanged')
  })
})
