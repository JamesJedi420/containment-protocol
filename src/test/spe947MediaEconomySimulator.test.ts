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
  composeSpe947CommercializationEconomyCrossPathAggregate,
  composeSpe947CommercializationEconomyMultiPath,
  composeSpe947CommercializationEconomySims,
  simulateSpe947CommercializationEconomyPath,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_CLIP_FARM_ACTOR,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTORS,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_CROSS_PATH_AGGREGATE_FIXTURE,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_LIVESTREAM_ACTOR,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_MULTI_ACTOR_SIM_FIXTURE,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_SIM_FIXTURE,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_ACTORS,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_AGGREGATE_FIXTURE,
} from '../domain/spe947MediaEconomySimulator'

describe('spe947MediaEconomySimulator (SPE-2611 / SPE-2612 / SPE-2613 / SPE-2614 / SPE-947)', () => {
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

  it('rejects actorWorsenFactor below 1 as invalid_actor', () => {
    const reading = simulateSpe947CommercializationEconomyPath({
      actor: {
        ...SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
        actorWorsenFactor: 0.5,
      },
      maps: SPE_947_EXAMPLE_MEDIA_ECONOMY_SIM_FIXTURE.maps,
    })

    expect(reading.status).toBe('invalid_actor')
    expect(reading.remainsRisky).toBe(false)
    expect(reading.reasonCodes).toContain('invalid_actor')
  })

  describe('SPE-2612 multi-actor media-economy growth', () => {
    it('empty multi-path actors do not throw or falsely satisfy residual-risk AC', () => {
      const multi = composeSpe947CommercializationEconomyMultiPath({
        actors: [],
        maps: SPE_947_EXAMPLE_MEDIA_ECONOMY_MULTI_ACTOR_SIM_FIXTURE.maps,
      })

      expect(multi.status).toBe('empty_actors')
      expect(multi.readings).toEqual([])
      expect(multi.anyRemainsRisky).toBe(false)
      expect(multi.anyWorsened).toBe(false)
    })

    it('empty persisted maps with ≥2 actors stay empty_maps without false AC', () => {
      const multi = composeSpe947CommercializationEconomyMultiPath({
        actors: SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTORS,
        maps: {
          spe947MediaEconomyWeights: {},
          spe947MediaEconomyContinuityBindings: {},
        },
      })

      expect(multi.status).toBe('empty_maps')
      expect(multi.readings).toHaveLength(2)
      expect(multi.anyRemainsRisky).toBe(false)
      expect(multi.readings.every((reading) => reading.status === 'empty_maps')).toBe(true)
    })

    it('≥2 authored commercialization actor paths worsen residual risk over the same maps', () => {
      const multi = composeSpe947CommercializationEconomyMultiPath(
        SPE_947_EXAMPLE_MEDIA_ECONOMY_MULTI_ACTOR_SIM_FIXTURE
      )

      expect(multi.status).toBe('multi_path')
      expect(multi.readings).toHaveLength(2)
      expect(multi.anyRemainsRisky).toBe(true)
      expect(multi.anyWorsened).toBe(true)

      const livestream = multi.readings.find(
        (reading) => reading.actorId === SPE_947_EXAMPLE_MEDIA_ECONOMY_LIVESTREAM_ACTOR.id
      )
      const merch = multi.readings.find(
        (reading) => reading.actorId === SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR.id
      )

      expect(livestream?.status).toBe('worsened')
      // adaptation 1 + commercialization 1 * continuity 3 * livestream 3 = 10
      expect(livestream?.simDecision?.persistenceRiskScore).toBe(10)
      expect(livestream?.remainsRisky).toBe(true)

      expect(merch?.status).toBe('worsened')
      // adaptation 1 + commercialization 1 * continuity 3 * merch 2 = 7
      expect(merch?.simDecision?.persistenceRiskScore).toBe(7)
      expect(merch?.remainsRisky).toBe(true)

      expect(livestream?.reasonCodes).toContain('adaptation_untouched')
      expect(merch?.reasonCodes).toContain('adaptation_untouched')
    })

    it('multi-path actor order is deterministic id code-unit order regardless of input order', () => {
      const reversed = [
        SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
        SPE_947_EXAMPLE_MEDIA_ECONOMY_LIVESTREAM_ACTOR,
      ]
      const forward = [
        SPE_947_EXAMPLE_MEDIA_ECONOMY_LIVESTREAM_ACTOR,
        SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
      ]

      const fromReversed = composeSpe947CommercializationEconomyMultiPath({
        actors: reversed,
        maps: SPE_947_EXAMPLE_MEDIA_ECONOMY_MULTI_ACTOR_SIM_FIXTURE.maps,
      })
      const fromForward = composeSpe947CommercializationEconomyMultiPath({
        actors: forward,
        maps: SPE_947_EXAMPLE_MEDIA_ECONOMY_MULTI_ACTOR_SIM_FIXTURE.maps,
      })

      expect(fromReversed.actorIdsInOrder).toEqual([
        'actor:livestream-tour-promoter',
        'actor:merch-attention-promoter',
      ])
      expect(fromForward.actorIdsInOrder).toEqual(fromReversed.actorIdsInOrder)
      expect(fromReversed.readings.map((r) => r.simDecision?.persistenceRiskScore)).toEqual([
        10, 7,
      ])
      expect(fromForward.readings.map((r) => r.simDecision?.persistenceRiskScore)).toEqual([
        10, 7,
      ])
    })
  })

  describe('SPE-2613 cross-path aggregate beyond two-actor compose', () => {
    it('empty cross-path actors do not throw or falsely satisfy residual-risk AC', () => {
      const aggregate = composeSpe947CommercializationEconomyCrossPathAggregate({
        actors: [],
        maps: SPE_947_EXAMPLE_MEDIA_ECONOMY_CROSS_PATH_AGGREGATE_FIXTURE.maps,
      })

      expect(aggregate.status).toBe('empty_actors')
      expect(aggregate.anyRemainsRisky).toBe(false)
      expect(aggregate.anyWorsened).toBe(false)
      expect(aggregate.worseReading).toBeNull()
      expect(aggregate.worseActorId).toBeNull()
      expect(aggregate.worsePersistenceRiskScore).toBeNull()
    })

    it('empty persisted maps with ≥2 actors stay empty_maps without false AC', () => {
      const aggregate = composeSpe947CommercializationEconomyCrossPathAggregate({
        actors: SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTORS,
        maps: {
          spe947MediaEconomyWeights: {},
          spe947MediaEconomyContinuityBindings: {},
        },
      })

      expect(aggregate.status).toBe('empty_maps')
      expect(aggregate.anyRemainsRisky).toBe(false)
      expect(aggregate.anyWorsened).toBe(false)
      expect(aggregate.worseReading).toBeNull()
      expect(aggregate.worseActorId).toBeNull()
      expect(aggregate.multiPath.status).toBe('empty_maps')
    })

    it('cross-path aggregate over ≥2 independent paths picks deterministic worse reading', () => {
      const aggregate = composeSpe947CommercializationEconomyCrossPathAggregate(
        SPE_947_EXAMPLE_MEDIA_ECONOMY_CROSS_PATH_AGGREGATE_FIXTURE
      )

      expect(aggregate.status).toBe('cross_path_aggregate')
      expect(aggregate.anyRemainsRisky).toBe(true)
      expect(aggregate.anyWorsened).toBe(true)
      expect(aggregate.multiPath.readings).toHaveLength(2)

      // Livestream factor 3 → score 10; merch factor 2 → score 7. Worse = livestream.
      expect(aggregate.worseActorId).toBe(SPE_947_EXAMPLE_MEDIA_ECONOMY_LIVESTREAM_ACTOR.id)
      expect(aggregate.worsePersistenceRiskScore).toBe(10)
      expect(aggregate.worseReading?.status).toBe('worsened')
      expect(aggregate.worseReading?.remainsRisky).toBe(true)
      expect(aggregate.worseReading?.reasonCodes).toContain('adaptation_untouched')
    })

    it('cross-path worse pick is stable under reversed actor input order', () => {
      const maps = SPE_947_EXAMPLE_MEDIA_ECONOMY_CROSS_PATH_AGGREGATE_FIXTURE.maps
      const fromReversed = composeSpe947CommercializationEconomyCrossPathAggregate({
        actors: [
          SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
          SPE_947_EXAMPLE_MEDIA_ECONOMY_LIVESTREAM_ACTOR,
        ],
        maps,
      })
      const fromForward = composeSpe947CommercializationEconomyCrossPathAggregate({
        actors: [
          SPE_947_EXAMPLE_MEDIA_ECONOMY_LIVESTREAM_ACTOR,
          SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
        ],
        maps,
      })

      expect(fromReversed.worseActorId).toBe(fromForward.worseActorId)
      expect(fromReversed.worsePersistenceRiskScore).toBe(fromForward.worsePersistenceRiskScore)
      expect(fromReversed.multiPath.actorIdsInOrder).toEqual(fromForward.multiPath.actorIdsInOrder)
    })

    it('cross-path aggregate does not sequentially mutate shared maps across actors', () => {
      const maps = SPE_947_EXAMPLE_MEDIA_ECONOMY_CROSS_PATH_AGGREGATE_FIXTURE.maps
      const caseId = EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE.caseId!
      const beforeArtifacts = maps.spe947PostCaseMediaCases![caseId]!.mediaArtifacts!.map(
        (artifact) => ({ id: artifact.id, kind: artifact.kind, riskWeight: artifact.riskWeight })
      )

      composeSpe947CommercializationEconomyCrossPathAggregate({
        actors: SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTORS,
        maps,
      })

      const afterArtifacts = maps.spe947PostCaseMediaCases![caseId]!.mediaArtifacts!.map(
        (artifact) => ({ id: artifact.id, kind: artifact.kind, riskWeight: artifact.riskWeight })
      )
      expect(afterArtifacts).toEqual(beforeArtifacts)
    })
  })

  describe('SPE-2614 third commercial path beyond cross-path aggregate', () => {
    it('empty three-path actors do not throw or falsely satisfy residual-risk AC', () => {
      const aggregate = composeSpe947CommercializationEconomyCrossPathAggregate({
        actors: [],
        maps: SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_AGGREGATE_FIXTURE.maps,
      })

      expect(aggregate.status).toBe('empty_actors')
      expect(aggregate.anyRemainsRisky).toBe(false)
      expect(aggregate.worseReading).toBeNull()
      expect(aggregate.worseActorId).toBeNull()
    })

    it('empty persisted maps with ≥3 actors stay empty_maps without false AC', () => {
      const aggregate = composeSpe947CommercializationEconomyCrossPathAggregate({
        actors: SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_ACTORS,
        maps: {
          spe947MediaEconomyWeights: {},
          spe947MediaEconomyContinuityBindings: {},
        },
      })

      expect(aggregate.status).toBe('empty_maps')
      expect(aggregate.anyRemainsRisky).toBe(false)
      expect(aggregate.anyWorsened).toBe(false)
      expect(aggregate.worseReading).toBeNull()
      expect(aggregate.worseActorId).toBeNull()
    })

    it('third commercialization path worsens residual risk beyond two-actor EXAMPLE', () => {
      const reading = simulateSpe947CommercializationEconomyPath({
        actor: SPE_947_EXAMPLE_MEDIA_ECONOMY_CLIP_FARM_ACTOR,
        maps: SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_AGGREGATE_FIXTURE.maps,
      })

      expect(reading.status).toBe('worsened')
      // adaptation 1 + commercialization 1 * continuity 3 * clip-farm 4 = 13
      expect(reading.simDecision?.persistenceRiskScore).toBe(13)
      expect(reading.remainsRisky).toBe(true)
      expect(reading.reasonCodes).toContain('adaptation_untouched')
      expect(reading.reasonCodes).toContain('residual_risk_worsened')
    })

    it('three-path aggregate picks deterministic worse reading beyond SPE-2613 two-actor EXAMPLE', () => {
      const twoPath = composeSpe947CommercializationEconomyCrossPathAggregate(
        SPE_947_EXAMPLE_MEDIA_ECONOMY_CROSS_PATH_AGGREGATE_FIXTURE
      )
      const threePath = composeSpe947CommercializationEconomyCrossPathAggregate(
        SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_AGGREGATE_FIXTURE
      )

      expect(twoPath.worseActorId).toBe(SPE_947_EXAMPLE_MEDIA_ECONOMY_LIVESTREAM_ACTOR.id)
      expect(twoPath.worsePersistenceRiskScore).toBe(10)
      expect(twoPath.multiPath.readings).toHaveLength(2)

      expect(threePath.status).toBe('cross_path_aggregate')
      expect(threePath.anyRemainsRisky).toBe(true)
      expect(threePath.anyWorsened).toBe(true)
      expect(threePath.multiPath.readings).toHaveLength(3)
      expect(threePath.multiPath.actorIdsInOrder).toEqual([
        'actor:clip-farm-reseller',
        'actor:livestream-tour-promoter',
        'actor:merch-attention-promoter',
      ])

      // Clip-farm factor 4 → score 13 beats livestream 10 / merch 7.
      expect(threePath.worseActorId).toBe(SPE_947_EXAMPLE_MEDIA_ECONOMY_CLIP_FARM_ACTOR.id)
      expect(threePath.worsePersistenceRiskScore).toBe(13)
      expect(threePath.worseReading?.status).toBe('worsened')
      expect(threePath.worseReading?.reasonCodes).toContain('adaptation_untouched')

      const clipFarm = threePath.multiPath.readings.find(
        (reading) => reading.actorId === SPE_947_EXAMPLE_MEDIA_ECONOMY_CLIP_FARM_ACTOR.id
      )
      const livestream = threePath.multiPath.readings.find(
        (reading) => reading.actorId === SPE_947_EXAMPLE_MEDIA_ECONOMY_LIVESTREAM_ACTOR.id
      )
      const merch = threePath.multiPath.readings.find(
        (reading) => reading.actorId === SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR.id
      )
      expect(clipFarm?.simDecision?.persistenceRiskScore).toBe(13)
      expect(livestream?.simDecision?.persistenceRiskScore).toBe(10)
      expect(merch?.simDecision?.persistenceRiskScore).toBe(7)
    })

    it('three-path worse pick is stable under reversed actor input order', () => {
      const maps = SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_AGGREGATE_FIXTURE.maps
      const reversed = [
        SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
        SPE_947_EXAMPLE_MEDIA_ECONOMY_LIVESTREAM_ACTOR,
        SPE_947_EXAMPLE_MEDIA_ECONOMY_CLIP_FARM_ACTOR,
      ]
      const forward = [
        SPE_947_EXAMPLE_MEDIA_ECONOMY_CLIP_FARM_ACTOR,
        SPE_947_EXAMPLE_MEDIA_ECONOMY_LIVESTREAM_ACTOR,
        SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
      ]

      const fromReversed = composeSpe947CommercializationEconomyCrossPathAggregate({
        actors: reversed,
        maps,
      })
      const fromForward = composeSpe947CommercializationEconomyCrossPathAggregate({
        actors: forward,
        maps,
      })

      expect(fromReversed.worseActorId).toBe(SPE_947_EXAMPLE_MEDIA_ECONOMY_CLIP_FARM_ACTOR.id)
      expect(fromForward.worseActorId).toBe(fromReversed.worseActorId)
      expect(fromForward.worsePersistenceRiskScore).toBe(fromReversed.worsePersistenceRiskScore)
      expect(fromReversed.multiPath.actorIdsInOrder).toEqual(fromForward.multiPath.actorIdsInOrder)
    })

    it('three-path aggregate does not sequentially mutate shared maps across actors', () => {
      const maps = SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_AGGREGATE_FIXTURE.maps
      const caseId = EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE.caseId!
      const beforeArtifacts = maps.spe947PostCaseMediaCases![caseId]!.mediaArtifacts!.map(
        (artifact) => ({ id: artifact.id, kind: artifact.kind, riskWeight: artifact.riskWeight })
      )

      composeSpe947CommercializationEconomyCrossPathAggregate({
        actors: SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_ACTORS,
        maps,
      })

      const afterArtifacts = maps.spe947PostCaseMediaCases![caseId]!.mediaArtifacts!.map(
        (artifact) => ({ id: artifact.id, kind: artifact.kind, riskWeight: artifact.riskWeight })
      )
      expect(afterArtifacts).toEqual(beforeArtifacts)
    })
  })
})
