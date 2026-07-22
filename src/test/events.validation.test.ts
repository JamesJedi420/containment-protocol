import { describe, expect, it } from 'vitest'
import {
  operationEventPayloadSchemas,
  validateOperationEventPayload,
} from '../domain/events/eventValidation'
import { EVENT_TYPE_TO_SOURCE_SYSTEM } from '../domain/events/types'
import { minimalOperationEventPayloads } from './fixtures/minimalOperationEventPayloads'

describe('event payload validation coverage', () => {
  it('provides a schema for every operation event type', () => {
    const schemaTypes = Object.keys(operationEventPayloadSchemas).sort()
    const eventTypes = Object.keys(EVENT_TYPE_TO_SOURCE_SYSTEM).sort()

    expect(schemaTypes).toEqual(eventTypes)
  })

  it('accepts agent.relationship_changed payloads with external_event reason', () => {
    const validation = validateOperationEventPayload('agent.relationship_changed', {
      week: 3,
      agentId: 'a_mina',
      agentName: 'Mina Park',
      counterpartId: 'a_sato',
      counterpartName: 'Dr. Sato',
      previousValue: 0.12,
      nextValue: 0.28,
      delta: 0.16,
      reason: 'external_event',
    })

    expect(validation.success).toBe(true)
  })

  it('rejects invalid relationship reasons', () => {
    const validation = validateOperationEventPayload('agent.relationship_changed', {
      week: 3,
      agentId: 'a_mina',
      agentName: 'Mina Park',
      counterpartId: 'a_sato',
      counterpartName: 'Dr. Sato',
      previousValue: 0.12,
      nextValue: 0.28,
      delta: 0.16,
      reason: 'unsupported_reason',
    })

    expect(validation.success).toBe(false)
    expect(validation.error).toBeTypeOf('string')
  })

  it('accepts consistent agent.relationship_changed payloads', () => {
    const validation = validateOperationEventPayload('agent.relationship_changed', {
      ...minimalOperationEventPayloads['agent.relationship_changed'],
    })

    expect(validation.success).toBe(true)
  })

  it('rejects agent.relationship_changed payloads with non-finite chemistry values', () => {
    const nanPrevious = validateOperationEventPayload('agent.relationship_changed', {
      ...minimalOperationEventPayloads['agent.relationship_changed'],
      previousValue: Number.NaN,
    })
    const infiniteNext = validateOperationEventPayload('agent.relationship_changed', {
      ...minimalOperationEventPayloads['agent.relationship_changed'],
      nextValue: Number.POSITIVE_INFINITY,
    })
    const infiniteDelta = validateOperationEventPayload('agent.relationship_changed', {
      ...minimalOperationEventPayloads['agent.relationship_changed'],
      delta: Number.NEGATIVE_INFINITY,
    })

    expect(nanPrevious.success).toBe(false)
    expect(infiniteNext.success).toBe(false)
    expect(infiniteDelta.success).toBe(false)
  })

  it('rejects agent.relationship_changed payloads with out-of-range chemistry values', () => {
    const highPrevious = validateOperationEventPayload('agent.relationship_changed', {
      ...minimalOperationEventPayloads['agent.relationship_changed'],
      previousValue: 2.01,
      nextValue: 2,
      delta: -0.01,
    })
    const lowNext = validateOperationEventPayload('agent.relationship_changed', {
      ...minimalOperationEventPayloads['agent.relationship_changed'],
      previousValue: -2,
      nextValue: -2.1,
      delta: -0.1,
    })

    expect(highPrevious.success).toBe(false)
    expect(lowNext.success).toBe(false)
  })

  it('rejects agent.relationship_changed payloads when delta mismatches nextValue - previousValue', () => {
    const validation = validateOperationEventPayload('agent.relationship_changed', {
      ...minimalOperationEventPayloads['agent.relationship_changed'],
      previousValue: 0.2,
      nextValue: 0.4,
      delta: 0.15,
    })

    expect(validation.success).toBe(false)
    expect(validation.error).toBeTypeOf('string')
  })

  it('accepts recruitment intel confirmation payloads with confirmed confidence', () => {
    const validation = validateOperationEventPayload('recruitment.intel_confirmed', {
      week: 4,
      candidateId: 'cand-scout-01',
      candidateName: 'Scout Target',
      fundingCost: 12,
      stage: 3,
      projectedTier: 'A',
      confirmedTier: 'A',
      confidence: 'confirmed',
      previousProjectedTier: 'B',
      previousConfidence: 'high',
      revealLevel: 2,
    })

    expect(validation.success).toBe(true)
  })

  it('accepts market.transaction_recorded payloads with licensed handling listing resource statuses', () => {
    const validation = validateOperationEventPayload('market.transaction_recorded', {
      week: 2,
      marketWeek: 2,
      transactionId: 'market-2-2-1',
      action: 'buy',
      listingId: 'gear:combat_stims',
      itemId: 'combat_stims',
      itemName: 'Combat Stims',
      category: 'equipment',
      quantity: 1,
      bundleCount: 1,
      unitPrice: 12,
      totalPrice: 12,
      remainingAvailability: 4,
      listingResourceStatuses: [
        {
          resourceClass: 'licensed_handling_capacity',
          sourceId: 'licensed_handling_desk',
          label: 'Licensed handling desk',
          capacity: 1,
          available: 0,
          allocations: ['market-2-2-1'],
        },
        { resourceClass: 'supplier_attention_slot', available: 2 },
        { resourceClass: 'reagent_stock', available: 10 },
      ],
    })

    expect(validation.success).toBe(true)
  })

  it('accepts market.emergency_gray_market_waiver_granted payloads', () => {
    const validation = validateOperationEventPayload(
      'market.emergency_gray_market_waiver_granted',
      {
        week: 4,
        marketWeek: 2,
        crisisPressureScore: 130,
        sanctionLevel: 'sanctioned',
        packetId: 'gray_market_broker',
        falloutRiskApplied: 'risk',
        waiverPrecedentCount: 1,
        institutionKey: 'containment_protocol',
        authorityRoute: 'crisis_director_self',
        authorityBasis:
          'Director institutional self-authorization under crisis procurement rules (baseline institution).',
        regulatoryArbitrageSignal: 'none',
        ruleConflictSignal: 'sanctioned_procurement_vs_crisis_waiver',
      }
    )

    expect(validation.success).toBe(true)
  })

  it('accepts market.emergency_gray_market_waiver_granted with cross_institution regulatory arbitrage signal', () => {
    const validation = validateOperationEventPayload(
      'market.emergency_gray_market_waiver_granted',
      {
        week: 4,
        marketWeek: 2,
        crisisPressureScore: 130,
        sanctionLevel: 'sanctioned',
        packetId: 'gray_market_broker',
        falloutRiskApplied: 'risk',
        waiverPrecedentCount: 1,
        institutionKey: 'joint_oversight_concordat',
        authorityRoute: 'joint_oversight_clearance_ratification',
        authorityBasis:
          'Joint Oversight Concordat emergency authorization ratified at clearanceLevel 3.',
        regulatoryArbitrageSignal: 'cross_institution_clearance_route',
        ruleConflictSignal: 'sanctioned_procurement_vs_crisis_waiver',
      }
    )

    expect(validation.success).toBe(true)
  })

  it('accepts market.emergency_gray_market_waiver_granted with ruleConflictSignal none', () => {
    const validation = validateOperationEventPayload(
      'market.emergency_gray_market_waiver_granted',
      {
        week: 4,
        marketWeek: 2,
        crisisPressureScore: 130,
        sanctionLevel: 'sanctioned',
        packetId: 'gray_market_broker',
        falloutRiskApplied: 'risk',
        waiverPrecedentCount: 1,
        institutionKey: 'containment_protocol',
        authorityRoute: 'crisis_director_self',
        authorityBasis:
          'Director institutional self-authorization under crisis procurement rules (baseline institution).',
        regulatoryArbitrageSignal: 'none',
        ruleConflictSignal: 'none',
      }
    )

    expect(validation.success).toBe(true)
  })

  it('accepts market.emergency_gray_market_waiver_accountability_closed payloads', () => {
    const validation = validateOperationEventPayload(
      'market.emergency_gray_market_waiver_accountability_closed',
      {
        week: 6,
        waiverGrantWeek: 5,
        institutionKey: 'containment_protocol',
      }
    )

    expect(validation.success).toBe(true)
  })

  it('accepts market.emergency_gray_market_fallout_tick payloads', () => {
    const validation = validateOperationEventPayload('market.emergency_gray_market_fallout_tick', {
      week: 7,
      outcome: 'escalated_pending_oversight',
      falloutRiskBefore: 'risk',
      falloutRiskAfter: 'costly',
      fundingBefore: 110,
      fundingAfter: 105,
      containmentRatingBefore: 72,
      containmentRatingAfter: 69,
      waiverPrecedentCount: 3,
      precedentPenaltyMultiplier: 1.12,
      institutionKey: 'containment_protocol',
    })

    expect(validation.success).toBe(true)
  })

  it('rejects case.aggregate_battle payloads missing battleId', () => {
    const payload: Record<string, unknown> = {
      ...minimalOperationEventPayloads['case.aggregate_battle'],
    }
    delete payload.battleId

    const validation = validateOperationEventPayload('case.aggregate_battle', payload)

    expect(validation.success).toBe(false)
  })

  it('rejects case.aggregate_battle payloads with negative rounds', () => {
    const validation = validateOperationEventPayload('case.aggregate_battle', {
      ...minimalOperationEventPayloads['case.aggregate_battle'],
      roundsResolved: -1,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects case.aggregate_battle payloads with invalid extraction pressure', () => {
    const validation = validateOperationEventPayload('case.aggregate_battle', {
      ...minimalOperationEventPayloads['case.aggregate_battle'],
      extractionRequired: true,
      extractionOutcome: 'contested',
      extractionPressure: 'severe',
      extractionResidualThreatUnits: 2,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects case.aggregate_battle payloads with routed and special damage count mismatches', () => {
    const routedMismatch = validateOperationEventPayload('case.aggregate_battle', {
      ...minimalOperationEventPayloads['case.aggregate_battle'],
      hostileRoutedCount: 1,
      hostileRoutedUnits: [],
    })

    const damageMismatch = validateOperationEventPayload('case.aggregate_battle', {
      ...minimalOperationEventPayloads['case.aggregate_battle'],
      specialDamageCount: 2,
      specialDamage: ['Reliquary Guardian 1/3'],
    })

    expect(routedMismatch.success).toBe(false)
    expect(damageMismatch.success).toBe(false)
  })

  it('rejects case.aggregate_battle payloads with malformed unit arrays', () => {
    const validation = validateOperationEventPayload('case.aggregate_battle', {
      ...minimalOperationEventPayloads['case.aggregate_battle'],
      friendlyRoutedCount: 1,
      friendlyRoutedUnits: [''],
    })

    expect(validation.success).toBe(false)
  })

  it('accepts detailed case.aggregate_battle payloads with optional follow-through fields', () => {
    const validation = validateOperationEventPayload('case.aggregate_battle', {
      ...minimalOperationEventPayloads['case.aggregate_battle'],
      roundsResolved: 3,
      winnerSideId: null,
      winnerLabel: null,
      movementDeniedCount: 2,
      hostileRoutedCount: 2,
      hostileRoutedUnits: ['Hostile Screen', 'Reserve Cell'],
      specialDamageCount: 1,
      specialDamage: ['Reliquary Guardian 2/3'],
      parallelObjectiveId: 'seal-threshold',
      parallelObjectiveOutcome: 'partial',
      parallelObjectiveProgress: '2/3',
      extractionRequired: true,
      extractionOutcome: 'contested',
      extractionPressure: 'medium',
      extractionResidualThreatUnits: 1,
      ceasefireApplied: true,
      ceasefireObjectiveId: 'seal-threshold',
      ceasefireTacticalValue: 'specialist_knowledge',
    })

    expect(validation.success, validation.error).toBe(true)
  })

  it('accepts consistent progression.xp_gained payloads', () => {
    const validation = validateOperationEventPayload('progression.xp_gained', {
      ...minimalOperationEventPayloads['progression.xp_gained'],
      xpAmount: 1,
      totalXp: 200,
      level: 2,
      levelsGained: 1,
    })

    expect(validation.success, validation.error).toBe(true)
  })

  it('rejects progression.xp_gained payloads with negative XP', () => {
    const validation = validateOperationEventPayload('progression.xp_gained', {
      ...minimalOperationEventPayloads['progression.xp_gained'],
      xpAmount: -1,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects progression.xp_gained payloads with fractional XP', () => {
    const fractionalXpAmount = validateOperationEventPayload('progression.xp_gained', {
      ...minimalOperationEventPayloads['progression.xp_gained'],
      xpAmount: 1.5,
    })
    const fractionalTotalXp = validateOperationEventPayload('progression.xp_gained', {
      ...minimalOperationEventPayloads['progression.xp_gained'],
      totalXp: 100.5,
    })

    expect(fractionalXpAmount.success).toBe(false)
    expect(fractionalTotalXp.success).toBe(false)
  })

  it('rejects progression.xp_gained payloads when totalXp is below xpAmount', () => {
    const validation = validateOperationEventPayload('progression.xp_gained', {
      ...minimalOperationEventPayloads['progression.xp_gained'],
      xpAmount: 50,
      totalXp: 20,
      level: 1,
      levelsGained: 0,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects progression.xp_gained payloads with level mismatch', () => {
    const validation = validateOperationEventPayload('progression.xp_gained', {
      ...minimalOperationEventPayloads['progression.xp_gained'],
      totalXp: 100,
      level: 2,
      levelsGained: 0,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects progression.xp_gained payloads with levelsGained mismatch', () => {
    const validation = validateOperationEventPayload('progression.xp_gained', {
      ...minimalOperationEventPayloads['progression.xp_gained'],
      xpAmount: 1,
      totalXp: 200,
      level: 2,
      levelsGained: 0,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects progression.xp_gained payloads with blank reason', () => {
    const validation = validateOperationEventPayload('progression.xp_gained', {
      ...minimalOperationEventPayloads['progression.xp_gained'],
      reason: '   ',
    })

    expect(validation.success).toBe(false)
  })

  it('rejects progression.xp_gained payloads with untrimmed reason', () => {
    const validation = validateOperationEventPayload('progression.xp_gained', {
      ...minimalOperationEventPayloads['progression.xp_gained'],
      reason: ' mission_success ',
    })

    expect(validation.success).toBe(false)
  })

  it('accepts consistent agent.promoted payloads', () => {
    const validation = validateOperationEventPayload('agent.promoted', {
      ...minimalOperationEventPayloads['agent.promoted'],
      previousLevel: 2,
      newLevel: 4,
      levelsGained: 2,
      skillPointsGranted: 2,
    })

    expect(validation.success, validation.error).toBe(true)
  })

  it('rejects agent.promoted payloads with negative levels', () => {
    const validation = validateOperationEventPayload('agent.promoted', {
      ...minimalOperationEventPayloads['agent.promoted'],
      previousLevel: -1,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects agent.promoted payloads with zero previousLevel', () => {
    const validation = validateOperationEventPayload('agent.promoted', {
      ...minimalOperationEventPayloads['agent.promoted'],
      previousLevel: 0,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects agent.promoted payloads with negative skillPointsGranted', () => {
    const validation = validateOperationEventPayload('agent.promoted', {
      ...minimalOperationEventPayloads['agent.promoted'],
      skillPointsGranted: -1,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects agent.promoted payloads with fractional levels', () => {
    const fractionalPrevious = validateOperationEventPayload('agent.promoted', {
      ...minimalOperationEventPayloads['agent.promoted'],
      previousLevel: 1.5,
    })
    const fractionalSkillPoints = validateOperationEventPayload('agent.promoted', {
      ...minimalOperationEventPayloads['agent.promoted'],
      skillPointsGranted: 0.5,
    })

    expect(fractionalPrevious.success).toBe(false)
    expect(fractionalSkillPoints.success).toBe(false)
  })

  it('rejects agent.promoted payloads when newLevel is below previousLevel', () => {
    const validation = validateOperationEventPayload('agent.promoted', {
      ...minimalOperationEventPayloads['agent.promoted'],
      previousLevel: 4,
      newLevel: 2,
      levelsGained: 0,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects agent.promoted payloads with levelsGained mismatch', () => {
    const validation = validateOperationEventPayload('agent.promoted', {
      ...minimalOperationEventPayloads['agent.promoted'],
      previousLevel: 2,
      newLevel: 4,
      levelsGained: 1,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects agent.promoted payloads with blank newRole', () => {
    const validation = validateOperationEventPayload('agent.promoted', {
      ...minimalOperationEventPayloads['agent.promoted'],
      newRole: '   ',
    })

    expect(validation.success).toBe(false)
  })

  it('rejects agent.promoted payloads with untrimmed newRole', () => {
    const validation = validateOperationEventPayload('agent.promoted', {
      ...minimalOperationEventPayloads['agent.promoted'],
      newRole: ' medic ',
    })

    expect(validation.success).toBe(false)
  })

  it('accepts consistent agent.betrayed payloads', () => {
    const validation = validateOperationEventPayload('agent.betrayed', {
      ...minimalOperationEventPayloads['agent.betrayed'],
      trustDamageDelta: 0.35,
      trustDamageTotal: 1.1,
      triggeredConsequences: ['benching'],
    })

    expect(validation.success).toBe(true)
  })

  it('rejects agent.betrayed payloads with negative trust damage', () => {
    const negativeDelta = validateOperationEventPayload('agent.betrayed', {
      ...minimalOperationEventPayloads['agent.betrayed'],
      trustDamageDelta: -0.1,
    })
    const negativeTotal = validateOperationEventPayload('agent.betrayed', {
      ...minimalOperationEventPayloads['agent.betrayed'],
      trustDamageTotal: -1,
    })

    expect(negativeDelta.success).toBe(false)
    expect(negativeTotal.success).toBe(false)
  })

  it('rejects agent.betrayed payloads with non-finite trust damage', () => {
    const nanDelta = validateOperationEventPayload('agent.betrayed', {
      ...minimalOperationEventPayloads['agent.betrayed'],
      trustDamageDelta: Number.NaN,
    })
    const infiniteTotal = validateOperationEventPayload('agent.betrayed', {
      ...minimalOperationEventPayloads['agent.betrayed'],
      trustDamageTotal: Number.POSITIVE_INFINITY,
    })

    expect(nanDelta.success).toBe(false)
    expect(infiniteTotal.success).toBe(false)
  })

  it('rejects agent.betrayed payloads when trustDamageTotal is below trustDamageDelta', () => {
    const validation = validateOperationEventPayload('agent.betrayed', {
      ...minimalOperationEventPayloads['agent.betrayed'],
      trustDamageDelta: 1.2,
      trustDamageTotal: 0.5,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects agent.betrayed payloads with invalid consequence entries', () => {
    const validation = validateOperationEventPayload('agent.betrayed', {
      ...minimalOperationEventPayloads['agent.betrayed'],
      triggeredConsequences: ['benching', 'not-a-consequence'],
    })

    expect(validation.success).toBe(false)
  })

  it.each(['agent.instructor_assigned', 'agent.instructor_unassigned'] as const)(
    'accepts consistent %s payloads',
    (eventType) => {
      const validation = validateOperationEventPayload(eventType, {
        ...minimalOperationEventPayloads[eventType],
      })

      expect(validation.success).toBe(true)
    }
  )

  it.each(['agent.instructor_assigned', 'agent.instructor_unassigned'] as const)(
    'rejects %s payloads with non-finite bonus',
    (eventType) => {
      const nanBonus = validateOperationEventPayload(eventType, {
        ...minimalOperationEventPayloads[eventType],
        bonus: Number.NaN,
      })
      const infiniteBonus = validateOperationEventPayload(eventType, {
        ...minimalOperationEventPayloads[eventType],
        bonus: Number.POSITIVE_INFINITY,
      })

      expect(nanBonus.success).toBe(false)
      expect(infiniteBonus.success).toBe(false)
    }
  )

  it.each(['agent.instructor_assigned', 'agent.instructor_unassigned'] as const)(
    'rejects %s payloads with negative bonus',
    (eventType) => {
      const validation = validateOperationEventPayload(eventType, {
        ...minimalOperationEventPayloads[eventType],
        bonus: -1,
      })

      expect(validation.success).toBe(false)
    }
  )

  it.each(['agent.instructor_assigned', 'agent.instructor_unassigned'] as const)(
    'rejects %s payloads with fractional bonus',
    (eventType) => {
      const validation = validateOperationEventPayload(eventType, {
        ...minimalOperationEventPayloads[eventType],
        bonus: 1.5,
      })

      expect(validation.success).toBe(false)
    }
  )

  it.each(['agent.instructor_assigned', 'agent.instructor_unassigned'] as const)(
    'rejects %s payloads with invalid instructorSpecialty',
    (eventType) => {
      const validation = validateOperationEventPayload(eventType, {
        ...minimalOperationEventPayloads[eventType],
        instructorSpecialty: 'not-a-stat',
      })

      expect(validation.success).toBe(false)
    }
  )

  it('accepts consistent agent.training_started payloads', () => {
    const validation = validateOperationEventPayload('agent.training_started', {
      ...minimalOperationEventPayloads['agent.training_started'],
    })

    expect(validation.success).toBe(true)
  })

  it('accepts consistent agent.training_completed payloads', () => {
    const validation = validateOperationEventPayload('agent.training_completed', {
      ...minimalOperationEventPayloads['agent.training_completed'],
    })

    expect(validation.success).toBe(true)
  })

  it('accepts consistent agent.training_cancelled payloads', () => {
    const validation = validateOperationEventPayload('agent.training_cancelled', {
      ...minimalOperationEventPayloads['agent.training_cancelled'],
    })

    expect(validation.success).toBe(true)
  })

  it('rejects agent.training_started payloads with non-finite numerics', () => {
    const nanEta = validateOperationEventPayload('agent.training_started', {
      ...minimalOperationEventPayloads['agent.training_started'],
      etaWeeks: Number.NaN,
    })
    const infiniteFunding = validateOperationEventPayload('agent.training_started', {
      ...minimalOperationEventPayloads['agent.training_started'],
      fundingCost: Number.POSITIVE_INFINITY,
    })

    expect(nanEta.success).toBe(false)
    expect(infiniteFunding.success).toBe(false)
  })

  it('rejects agent.training_started payloads with negative or zero etaWeeks', () => {
    const negative = validateOperationEventPayload('agent.training_started', {
      ...minimalOperationEventPayloads['agent.training_started'],
      etaWeeks: -1,
    })
    const zero = validateOperationEventPayload('agent.training_started', {
      ...minimalOperationEventPayloads['agent.training_started'],
      etaWeeks: 0,
    })

    expect(negative.success).toBe(false)
    expect(zero.success).toBe(false)
  })

  it('rejects agent.training_started payloads with negative fundingCost', () => {
    const validation = validateOperationEventPayload('agent.training_started', {
      ...minimalOperationEventPayloads['agent.training_started'],
      fundingCost: -1,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects agent.training_started payloads with fractional numerics', () => {
    const fractionalEta = validateOperationEventPayload('agent.training_started', {
      ...minimalOperationEventPayloads['agent.training_started'],
      etaWeeks: 1.5,
    })
    const fractionalFunding = validateOperationEventPayload('agent.training_started', {
      ...minimalOperationEventPayloads['agent.training_started'],
      fundingCost: 2.5,
    })

    expect(fractionalEta.success).toBe(false)
    expect(fractionalFunding.success).toBe(false)
  })

  it('rejects agent.training_started payloads with blank trainingId', () => {
    const validation = validateOperationEventPayload('agent.training_started', {
      ...minimalOperationEventPayloads['agent.training_started'],
      trainingId: '',
    })

    expect(validation.success).toBe(false)
  })

  it('rejects agent.training_started payloads with whitespace-only trainingId or trainingName', () => {
    const blankId = validateOperationEventPayload('agent.training_started', {
      ...minimalOperationEventPayloads['agent.training_started'],
      trainingId: '   ',
    })
    const blankName = validateOperationEventPayload('agent.training_started', {
      ...minimalOperationEventPayloads['agent.training_started'],
      trainingName: '   ',
    })
    const untrimmedId = validateOperationEventPayload('agent.training_started', {
      ...minimalOperationEventPayloads['agent.training_started'],
      trainingId: ' combat-drills ',
    })

    expect(blankId.success).toBe(false)
    expect(blankName.success).toBe(false)
    expect(untrimmedId.success).toBe(false)
  })

  it('rejects agent.training_cancelled payloads with non-finite refund', () => {
    const nanRefund = validateOperationEventPayload('agent.training_cancelled', {
      ...minimalOperationEventPayloads['agent.training_cancelled'],
      refund: Number.NaN,
    })
    const infiniteRefund = validateOperationEventPayload('agent.training_cancelled', {
      ...minimalOperationEventPayloads['agent.training_cancelled'],
      refund: Number.POSITIVE_INFINITY,
    })

    expect(nanRefund.success).toBe(false)
    expect(infiniteRefund.success).toBe(false)
  })

  it('rejects agent.training_cancelled payloads with negative refund', () => {
    const validation = validateOperationEventPayload('agent.training_cancelled', {
      ...minimalOperationEventPayloads['agent.training_cancelled'],
      refund: -1,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects agent.training_cancelled payloads with fractional refund', () => {
    const validation = validateOperationEventPayload('agent.training_cancelled', {
      ...minimalOperationEventPayloads['agent.training_cancelled'],
      refund: 1.5,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects agent.training_completed payloads with blank trainingName', () => {
    const validation = validateOperationEventPayload('agent.training_completed', {
      ...minimalOperationEventPayloads['agent.training_completed'],
      trainingName: '',
    })

    expect(validation.success).toBe(false)
  })

  it('accepts consistent production.queue_started payloads', () => {
    const validation = validateOperationEventPayload('production.queue_started', {
      ...minimalOperationEventPayloads['production.queue_started'],
    })

    expect(validation.success).toBe(true)
  })

  it('accepts consistent production.queue_completed payloads', () => {
    const validation = validateOperationEventPayload('production.queue_completed', {
      ...minimalOperationEventPayloads['production.queue_completed'],
    })

    expect(validation.success).toBe(true)
  })

  it('rejects production.queue_started payloads with non-finite numerics', () => {
    const nanEta = validateOperationEventPayload('production.queue_started', {
      ...minimalOperationEventPayloads['production.queue_started'],
      etaWeeks: Number.NaN,
    })
    const infiniteFunding = validateOperationEventPayload('production.queue_started', {
      ...minimalOperationEventPayloads['production.queue_started'],
      fundingCost: Number.POSITIVE_INFINITY,
    })
    const nanQuantity = validateOperationEventPayload('production.queue_started', {
      ...minimalOperationEventPayloads['production.queue_started'],
      outputQuantity: Number.NaN,
    })

    expect(nanEta.success).toBe(false)
    expect(infiniteFunding.success).toBe(false)
    expect(nanQuantity.success).toBe(false)
  })

  it('rejects production.queue_started payloads with negative or zero etaWeeks', () => {
    const negative = validateOperationEventPayload('production.queue_started', {
      ...minimalOperationEventPayloads['production.queue_started'],
      etaWeeks: -1,
    })
    const zero = validateOperationEventPayload('production.queue_started', {
      ...minimalOperationEventPayloads['production.queue_started'],
      etaWeeks: 0,
    })

    expect(negative.success).toBe(false)
    expect(zero.success).toBe(false)
  })

  it('rejects production.queue_started payloads with negative fundingCost', () => {
    const validation = validateOperationEventPayload('production.queue_started', {
      ...minimalOperationEventPayloads['production.queue_started'],
      fundingCost: -1,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects production.queue_started payloads with zero or negative outputQuantity', () => {
    const zero = validateOperationEventPayload('production.queue_started', {
      ...minimalOperationEventPayloads['production.queue_started'],
      outputQuantity: 0,
    })
    const negative = validateOperationEventPayload('production.queue_started', {
      ...minimalOperationEventPayloads['production.queue_started'],
      outputQuantity: -2,
    })

    expect(zero.success).toBe(false)
    expect(negative.success).toBe(false)
  })

  it('rejects production.queue_started payloads with fractional numerics', () => {
    const fractionalEta = validateOperationEventPayload('production.queue_started', {
      ...minimalOperationEventPayloads['production.queue_started'],
      etaWeeks: 1.5,
    })
    const fractionalFunding = validateOperationEventPayload('production.queue_started', {
      ...minimalOperationEventPayloads['production.queue_started'],
      fundingCost: 2.5,
    })
    const fractionalQuantity = validateOperationEventPayload('production.queue_started', {
      ...minimalOperationEventPayloads['production.queue_started'],
      outputQuantity: 1.25,
    })

    expect(fractionalEta.success).toBe(false)
    expect(fractionalFunding.success).toBe(false)
    expect(fractionalQuantity.success).toBe(false)
  })

  it('rejects production.queue_completed payloads with non-finite or invalid numerics', () => {
    const nanFunding = validateOperationEventPayload('production.queue_completed', {
      ...minimalOperationEventPayloads['production.queue_completed'],
      fundingCost: Number.NaN,
    })
    const infiniteQuantity = validateOperationEventPayload('production.queue_completed', {
      ...minimalOperationEventPayloads['production.queue_completed'],
      outputQuantity: Number.POSITIVE_INFINITY,
    })
    const negativeFunding = validateOperationEventPayload('production.queue_completed', {
      ...minimalOperationEventPayloads['production.queue_completed'],
      fundingCost: -1,
    })
    const fractionalFunding = validateOperationEventPayload('production.queue_completed', {
      ...minimalOperationEventPayloads['production.queue_completed'],
      fundingCost: 2.5,
    })
    const fractionalQuantity = validateOperationEventPayload('production.queue_completed', {
      ...minimalOperationEventPayloads['production.queue_completed'],
      outputQuantity: 0.5,
    })
    const zeroQuantity = validateOperationEventPayload('production.queue_completed', {
      ...minimalOperationEventPayloads['production.queue_completed'],
      outputQuantity: 0,
    })
    const negativeQuantity = validateOperationEventPayload('production.queue_completed', {
      ...minimalOperationEventPayloads['production.queue_completed'],
      outputQuantity: -3,
    })

    expect(nanFunding.success).toBe(false)
    expect(infiniteQuantity.success).toBe(false)
    expect(negativeFunding.success).toBe(false)
    expect(fractionalFunding.success).toBe(false)
    expect(fractionalQuantity.success).toBe(false)
    expect(zeroQuantity.success).toBe(false)
    expect(negativeQuantity.success).toBe(false)
  })

  it('accepts consistent market.shifted payloads for each pressure band', () => {
    const stable = validateOperationEventPayload('market.shifted', {
      ...minimalOperationEventPayloads['market.shifted'],
      pressure: 'stable',
      costMultiplier: 1,
    })
    const tight = validateOperationEventPayload('market.shifted', {
      ...minimalOperationEventPayloads['market.shifted'],
      pressure: 'tight',
      costMultiplier: 1.15,
    })
    const discounted = validateOperationEventPayload('market.shifted', {
      ...minimalOperationEventPayloads['market.shifted'],
      pressure: 'discounted',
      costMultiplier: 0.9,
    })

    expect(stable.success).toBe(true)
    expect(tight.success).toBe(true)
    expect(discounted.success).toBe(true)
  })

  it('rejects market.shifted payloads with non-finite or negative costMultiplier', () => {
    const nan = validateOperationEventPayload('market.shifted', {
      ...minimalOperationEventPayloads['market.shifted'],
      costMultiplier: Number.NaN,
    })
    const infinite = validateOperationEventPayload('market.shifted', {
      ...minimalOperationEventPayloads['market.shifted'],
      costMultiplier: Number.POSITIVE_INFINITY,
    })
    const negative = validateOperationEventPayload('market.shifted', {
      ...minimalOperationEventPayloads['market.shifted'],
      costMultiplier: -0.1,
    })

    expect(nan.success).toBe(false)
    expect(infinite.success).toBe(false)
    expect(negative.success).toBe(false)
  })

  it('rejects market.shifted payloads with pressure-inconsistent costMultiplier', () => {
    const stableMismatch = validateOperationEventPayload('market.shifted', {
      ...minimalOperationEventPayloads['market.shifted'],
      pressure: 'stable',
      costMultiplier: 1.15,
    })
    const tightMismatch = validateOperationEventPayload('market.shifted', {
      ...minimalOperationEventPayloads['market.shifted'],
      pressure: 'tight',
      costMultiplier: 0.9,
    })
    const discountedMismatch = validateOperationEventPayload('market.shifted', {
      ...minimalOperationEventPayloads['market.shifted'],
      pressure: 'discounted',
      costMultiplier: 1,
    })
    const outOfBand = validateOperationEventPayload('market.shifted', {
      ...minimalOperationEventPayloads['market.shifted'],
      pressure: 'stable',
      costMultiplier: 1.75,
    })

    expect(stableMismatch.success).toBe(false)
    expect(tightMismatch.success).toBe(false)
    expect(discountedMismatch.success).toBe(false)
    expect(outOfBand.success).toBe(false)
  })

  it('rejects market.shifted payloads with unknown featuredRecipeId', () => {
    const unknown = validateOperationEventPayload('market.shifted', {
      ...minimalOperationEventPayloads['market.shifted'],
      featuredRecipeId: 'phantom-recipe',
      featuredRecipeName: 'Phantom Recipe',
    })

    expect(unknown.success).toBe(false)
  })

  it('rejects market.shifted payloads with featuredRecipeId/name mismatch', () => {
    const mismatch = validateOperationEventPayload('market.shifted', {
      ...minimalOperationEventPayloads['market.shifted'],
      featuredRecipeId: 'ward-seals',
      featuredRecipeName: 'Wrong Label',
    })

    expect(mismatch.success).toBe(false)
  })

  it('accepts market.shifted payloads with catalog-valid featured recipe id and name', () => {
    const valid = validateOperationEventPayload('market.shifted', {
      ...minimalOperationEventPayloads['market.shifted'],
      featuredRecipeId: 'med-kits',
      featuredRecipeName: 'Emergency Medkits',
      pressure: 'stable',
      costMultiplier: 1,
    })

    expect(valid.success).toBe(true)
  })
})
