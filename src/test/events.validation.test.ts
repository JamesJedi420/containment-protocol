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
})
