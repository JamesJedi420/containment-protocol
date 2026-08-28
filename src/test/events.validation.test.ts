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

  it('strictly validates ordinary instance destruction provenance', () => {
    const valid = minimalOperationEventPayloads['equipment.instance_destroyed']
    expect(validateOperationEventPayload('equipment.instance_destroyed', valid).success).toBe(true)
    expect(
      validateOperationEventPayload('equipment.instance_destroyed', {
        ...valid,
        instanceId: 'constructor',
      }).success
    ).toBe(false)
    expect(
      validateOperationEventPayload('equipment.instance_destroyed', {
        ...valid,
        definitionName: 'Wrong name',
      }).success
    ).toBe(false)
    expect(
      validateOperationEventPayload('equipment.instance_destroyed', {
        ...valid,
        definitionId: 'combat_stims',
        definitionName: 'Combat Stims',
      }).success
    ).toBe(false)
    expect(
      validateOperationEventPayload('equipment.instance_destroyed', {
        ...valid,
        reason: 'recovery',
      }).success
    ).toBe(false)
    expect(
      validateOperationEventPayload('equipment.instance_destroyed', {
        ...valid,
        extra: true,
      }).success
    ).toBe(false)
  })

  it('strictly validates ordinary instance re-aggregation provenance', () => {
    const valid = minimalOperationEventPayloads['equipment.instance_reaggregated']
    expect(validateOperationEventPayload('equipment.instance_reaggregated', valid).success).toBe(
      true
    )
    for (const payload of [
      { ...valid, instanceId: 'constructor' },
      { ...valid, definitionName: 'Wrong name' },
      { ...valid, definitionId: 'combat_stims', definitionName: 'Combat Stims' },
      { ...valid, condition: 'damaged' },
      { ...valid, reason: 'manual_disposal' },
      { ...valid, extra: true },
    ]) {
      expect(
        validateOperationEventPayload('equipment.instance_reaggregated', payload).success
      ).toBe(false)
    }
  })

  it('strictly validates Combat Stim disposal provenance', () => {
    const valid = minimalOperationEventPayloads['equipment.combat_stim_disposed']
    expect(validateOperationEventPayload('equipment.combat_stim_disposed', valid).success).toBe(true)
    for (const payload of [
      { ...valid, instanceId: 'constructor' },
      { ...valid, definitionName: 'Wrong name' },
      { ...valid, remaining: 3 },
      { ...valid, capacity: 1 },
      { ...valid, reason: 'recovery' },
      { ...valid, extra: true },
    ]) {
      expect(validateOperationEventPayload('equipment.combat_stim_disposed', payload).success).toBe(
        false
      )
    }
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

  it.each([
    ['before the grant', 4, 5],
    ['during the grant week', 5, 5],
    ['later than the canonical next-week window', 7, 5],
  ])(
    'rejects market.emergency_gray_market_waiver_accountability_closed %s',
    (_case, week, waiverGrantWeek) => {
      const validation = validateOperationEventPayload(
        'market.emergency_gray_market_waiver_accountability_closed',
        {
          week,
          waiverGrantWeek,
          institutionKey: 'containment_protocol',
        }
      )

      expect(validation.success).toBe(false)
    }
  )

  it.each(['', '   ', ' Containment Protocol ', 'CONTAINMENT_PROTOCOL'])(
    'rejects market.emergency_gray_market_waiver_accountability_closed with noncanonical institutionKey %j',
    (institutionKey) => {
      const validation = validateOperationEventPayload(
        'market.emergency_gray_market_waiver_accountability_closed',
        {
          week: 6,
          waiverGrantWeek: 5,
          institutionKey,
        }
      )

      expect(validation.success).toBe(false)
    }
  )

  it.each([0, -1, 1.5])(
    'rejects market.emergency_gray_market_waiver_accountability_closed with waiverGrantWeek %s',
    (waiverGrantWeek) => {
      const validation = validateOperationEventPayload(
        'market.emergency_gray_market_waiver_accountability_closed',
        {
          week: 2,
          waiverGrantWeek,
          institutionKey: 'containment_protocol',
        }
      )

      expect(validation.success).toBe(false)
    }
  )

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
      rankingScore: 50,
      standingFalloutPenaltyScale: 1,
      institutionKey: 'containment_protocol',
    })

    expect(validation.success).toBe(true)
  })

  it('rejects market.emergency_gray_market_fallout_tick when standing scale does not match ranking', () => {
    const base = minimalOperationEventPayloads['market.emergency_gray_market_fallout_tick']
    const validation = validateOperationEventPayload('market.emergency_gray_market_fallout_tick', {
      ...base,
      rankingScore: 20,
      standingFalloutPenaltyScale: 1,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects market.emergency_gray_market_fallout_tick with a risk transition that contradicts the outcome', () => {
    const base = minimalOperationEventPayloads['market.emergency_gray_market_fallout_tick']
    const validation = validateOperationEventPayload('market.emergency_gray_market_fallout_tick', {
      ...base,
      outcome: 'escalated_pending_oversight',
      falloutRiskBefore: 'costly',
      falloutRiskAfter: 'none',
    })

    expect(validation.success).toBe(false)
  })

  it('rejects market.emergency_gray_market_fallout_tick when funding increases on a penalty tick', () => {
    const base = minimalOperationEventPayloads['market.emergency_gray_market_fallout_tick']
    const validation = validateOperationEventPayload('market.emergency_gray_market_fallout_tick', {
      ...base,
      fundingAfter: base.fundingBefore + 1,
    })

    expect(validation.success).toBe(false)
  })

  it('rejects market.emergency_gray_market_fallout_tick when containment increases on a penalty tick', () => {
    const base = minimalOperationEventPayloads['market.emergency_gray_market_fallout_tick']
    const validation = validateOperationEventPayload('market.emergency_gray_market_fallout_tick', {
      ...base,
      containmentRatingAfter: base.containmentRatingBefore + 1,
    })

    expect(validation.success).toBe(false)
  })

  it.each([
    ['funding', { fundingAfter: 100 }],
    ['containment', { containmentRatingAfter: 60 }],
  ])(
    'rejects market.emergency_gray_market_fallout_tick when positive %s does not decrease',
    (_metric, override) => {
      const validation = validateOperationEventPayload(
        'market.emergency_gray_market_fallout_tick',
        {
          ...minimalOperationEventPayloads['market.emergency_gray_market_fallout_tick'],
          ...override,
        }
      )

      expect(validation.success).toBe(false)
    }
  )

  it('rejects market.emergency_gray_market_fallout_tick with a multiplier not derived from precedent count', () => {
    const base = minimalOperationEventPayloads['market.emergency_gray_market_fallout_tick']
    const validation = validateOperationEventPayload('market.emergency_gray_market_fallout_tick', {
      ...base,
      waiverPrecedentCount: 3,
      precedentPenaltyMultiplier: 1.06,
    })

    expect(validation.success).toBe(false)
  })

  it.each(['', '   ', ' Containment Protocol ', 'CONTAINMENT_PROTOCOL'])(
    'rejects market.emergency_gray_market_fallout_tick with noncanonical institutionKey %j',
    (institutionKey) => {
      const validation = validateOperationEventPayload(
        'market.emergency_gray_market_fallout_tick',
        {
          ...minimalOperationEventPayloads['market.emergency_gray_market_fallout_tick'],
          institutionKey,
        }
      )

      expect(validation.success).toBe(false)
    }
  )

  it('rejects market.emergency_gray_market_waiver_granted payloads with invalid crisisPressureScore', () => {
    const base = minimalOperationEventPayloads['market.emergency_gray_market_waiver_granted']
    const nanScore = validateOperationEventPayload('market.emergency_gray_market_waiver_granted', {
      ...base,
      crisisPressureScore: Number.NaN,
    })
    const infiniteScore = validateOperationEventPayload(
      'market.emergency_gray_market_waiver_granted',
      {
        ...base,
        crisisPressureScore: Number.POSITIVE_INFINITY,
      }
    )
    const negativeScore = validateOperationEventPayload(
      'market.emergency_gray_market_waiver_granted',
      {
        ...base,
        crisisPressureScore: -1,
      }
    )
    const fractionalScore = validateOperationEventPayload(
      'market.emergency_gray_market_waiver_granted',
      {
        ...base,
        crisisPressureScore: 1.5,
      }
    )

    expect(nanScore.success).toBe(false)
    expect(infiniteScore.success).toBe(false)
    expect(negativeScore.success).toBe(false)
    expect(fractionalScore.success).toBe(false)
  })

  it('rejects market.emergency_gray_market_fallout_tick payloads with non-finite funding or containment', () => {
    const base = minimalOperationEventPayloads['market.emergency_gray_market_fallout_tick']
    const nanFunding = validateOperationEventPayload('market.emergency_gray_market_fallout_tick', {
      ...base,
      fundingBefore: Number.NaN,
    })
    const infiniteFundingAfter = validateOperationEventPayload(
      'market.emergency_gray_market_fallout_tick',
      {
        ...base,
        fundingAfter: Number.POSITIVE_INFINITY,
      }
    )
    const nanContainment = validateOperationEventPayload(
      'market.emergency_gray_market_fallout_tick',
      {
        ...base,
        containmentRatingBefore: Number.NaN,
      }
    )
    const infiniteContainmentAfter = validateOperationEventPayload(
      'market.emergency_gray_market_fallout_tick',
      {
        ...base,
        containmentRatingAfter: Number.NEGATIVE_INFINITY,
      }
    )
    const negativeFunding = validateOperationEventPayload(
      'market.emergency_gray_market_fallout_tick',
      {
        ...base,
        fundingAfter: -1,
      }
    )
    const negativeContainment = validateOperationEventPayload(
      'market.emergency_gray_market_fallout_tick',
      {
        ...base,
        containmentRatingBefore: -1,
      }
    )

    expect(nanFunding.success).toBe(false)
    expect(infiniteFundingAfter.success).toBe(false)
    expect(nanContainment.success).toBe(false)
    expect(infiniteContainmentAfter.success).toBe(false)
    expect(negativeFunding.success).toBe(false)
    expect(negativeContainment.success).toBe(false)
  })

  it('accepts agency.containment_updated producer-aligned payloads including negative deltas', () => {
    const positive = validateOperationEventPayload(
      'agency.containment_updated',
      minimalOperationEventPayloads['agency.containment_updated']
    )
    const negativeDeltas = validateOperationEventPayload('agency.containment_updated', {
      week: 3,
      containmentRatingBefore: 60,
      containmentRatingAfter: 55,
      containmentDelta: -5,
      clearanceLevelBefore: 2,
      clearanceLevelAfter: 2,
      fundingBefore: 200,
      fundingAfter: 175,
      fundingDelta: -25,
    })

    expect(positive.success).toBe(true)
    expect(negativeDeltas.success).toBe(true)
  })

  it('validates directive.applied against the weekly directive catalog', () => {
    const valid = validateOperationEventPayload('directive.applied', {
      week: 3,
      directiveId: 'intel-surge',
      directiveLabel: 'Intel Surge',
    })
    const unknownId = validateOperationEventPayload('directive.applied', {
      week: 3,
      directiveId: 'unknown-directive',
      directiveLabel: 'Unknown Directive',
    })
    const blankLabel = validateOperationEventPayload('directive.applied', {
      week: 3,
      directiveId: 'intel-surge',
      directiveLabel: '   ',
    })
    const mismatchedLabel = validateOperationEventPayload('directive.applied', {
      week: 3,
      directiveId: 'intel-surge',
      directiveLabel: 'Recovery Rotation',
    })

    expect(valid.success).toBe(true)
    expect(unknownId.success).toBe(false)
    expect(blankLabel.success).toBe(false)
    expect(mismatchedLabel.success).toBe(false)
  })

  it('rejects agency.containment_updated payloads with non-finite containment or funding fields', () => {
    const base = minimalOperationEventPayloads['agency.containment_updated']
    const nanContainment = validateOperationEventPayload('agency.containment_updated', {
      ...base,
      containmentRatingBefore: Number.NaN,
    })
    const infiniteContainmentDelta = validateOperationEventPayload('agency.containment_updated', {
      ...base,
      containmentDelta: Number.POSITIVE_INFINITY,
    })
    const nanFunding = validateOperationEventPayload('agency.containment_updated', {
      ...base,
      fundingAfter: Number.NaN,
    })
    const infiniteFundingDelta = validateOperationEventPayload('agency.containment_updated', {
      ...base,
      fundingDelta: Number.NEGATIVE_INFINITY,
    })

    expect(nanContainment.success).toBe(false)
    expect(infiniteContainmentDelta.success).toBe(false)
    expect(nanFunding.success).toBe(false)
    expect(infiniteFundingDelta.success).toBe(false)
  })

  it('rejects agency.containment_updated payloads with invalid clearanceLevel fields', () => {
    const base = minimalOperationEventPayloads['agency.containment_updated']
    const nanClearance = validateOperationEventPayload('agency.containment_updated', {
      ...base,
      clearanceLevelBefore: Number.NaN,
    })
    const infiniteClearance = validateOperationEventPayload('agency.containment_updated', {
      ...base,
      clearanceLevelAfter: Number.POSITIVE_INFINITY,
    })
    const negativeClearance = validateOperationEventPayload('agency.containment_updated', {
      ...base,
      clearanceLevelBefore: -1,
    })
    const fractionalClearance = validateOperationEventPayload('agency.containment_updated', {
      ...base,
      clearanceLevelAfter: 1.5,
    })

    expect(nanClearance.success).toBe(false)
    expect(infiniteClearance.success).toBe(false)
    expect(negativeClearance.success).toBe(false)
    expect(fractionalClearance.success).toBe(false)
  })

  it('accepts agency.front_business.* and system.academy_upgraded producer-aligned payloads including negative funding deltas', () => {
    const opened = validateOperationEventPayload(
      'agency.front_business.opened',
      minimalOperationEventPayloads['agency.front_business.opened']
    )
    const resolved = validateOperationEventPayload(
      'agency.front_business.resolved',
      minimalOperationEventPayloads['agency.front_business.resolved']
    )
    const negativeFundingDelta = validateOperationEventPayload('agency.front_business.resolved', {
      week: 3,
      kind: 'courierShell',
      statusBefore: 'active',
      statusAfter: 'strained',
      fundingDelta: -250,
      riskScore: 3,
      lockoutCount: 1,
      residueCount: 0,
      budgetPressure: 2,
    })
    const hydrateFloorFundingDelta = validateOperationEventPayload(
      'agency.front_business.resolved',
      {
        ...minimalOperationEventPayloads['agency.front_business.resolved'],
        fundingDelta: -10_000,
      }
    )
    const academy = validateOperationEventPayload(
      'system.academy_upgraded',
      minimalOperationEventPayloads['system.academy_upgraded']
    )

    expect(opened.success).toBe(true)
    expect(resolved.success).toBe(true)
    expect(negativeFundingDelta.success).toBe(true)
    expect(hydrateFloorFundingDelta.success).toBe(true)
    expect(academy.success).toBe(true)
  })

  it('rejects agency.front_business.opened payloads with non-finite funding or invalid startupCost', () => {
    const base = minimalOperationEventPayloads['agency.front_business.opened']
    const nanFunding = validateOperationEventPayload('agency.front_business.opened', {
      ...base,
      fundingBefore: Number.NaN,
    })
    const infiniteFundingAfter = validateOperationEventPayload('agency.front_business.opened', {
      ...base,
      fundingAfter: Number.POSITIVE_INFINITY,
    })
    const nanStartupCost = validateOperationEventPayload('agency.front_business.opened', {
      ...base,
      startupCost: Number.NaN,
    })
    const negativeStartupCost = validateOperationEventPayload('agency.front_business.opened', {
      ...base,
      startupCost: -1,
    })
    const fractionalStartupCost = validateOperationEventPayload('agency.front_business.opened', {
      ...base,
      startupCost: 1.5,
    })

    expect(nanFunding.success).toBe(false)
    expect(infiniteFundingAfter.success).toBe(false)
    expect(nanStartupCost.success).toBe(false)
    expect(negativeStartupCost.success).toBe(false)
    expect(fractionalStartupCost.success).toBe(false)
  })

  it('rejects agency.front_business.resolved payloads with non-finite fundingDelta or invalid score fields', () => {
    const base = minimalOperationEventPayloads['agency.front_business.resolved']
    const nanFundingDelta = validateOperationEventPayload('agency.front_business.resolved', {
      ...base,
      fundingDelta: Number.NaN,
    })
    const infiniteFundingDelta = validateOperationEventPayload('agency.front_business.resolved', {
      ...base,
      fundingDelta: Number.NEGATIVE_INFINITY,
    })
    const belowHydrateFloor = validateOperationEventPayload('agency.front_business.resolved', {
      ...base,
      fundingDelta: -10_001,
    })
    const nanRiskScore = validateOperationEventPayload('agency.front_business.resolved', {
      ...base,
      riskScore: Number.NaN,
    })
    const negativeLockoutCount = validateOperationEventPayload('agency.front_business.resolved', {
      ...base,
      lockoutCount: -1,
    })
    const fractionalBudgetPressure = validateOperationEventPayload(
      'agency.front_business.resolved',
      {
        ...base,
        budgetPressure: 1.5,
      }
    )
    const infiniteResidueCount = validateOperationEventPayload('agency.front_business.resolved', {
      ...base,
      residueCount: Number.POSITIVE_INFINITY,
    })

    expect(nanFundingDelta.success).toBe(false)
    expect(infiniteFundingDelta.success).toBe(false)
    expect(belowHydrateFloor.success).toBe(false)
    expect(nanRiskScore.success).toBe(false)
    expect(negativeLockoutCount.success).toBe(false)
    expect(fractionalBudgetPressure.success).toBe(false)
    expect(infiniteResidueCount.success).toBe(false)
  })

  it('rejects system.academy_upgraded payloads with non-finite funding or invalid cost/tier fields', () => {
    const base = minimalOperationEventPayloads['system.academy_upgraded']
    const nanFunding = validateOperationEventPayload('system.academy_upgraded', {
      ...base,
      fundingBefore: Number.NaN,
    })
    const infiniteFundingAfter = validateOperationEventPayload('system.academy_upgraded', {
      ...base,
      fundingAfter: Number.POSITIVE_INFINITY,
    })
    const nanCost = validateOperationEventPayload('system.academy_upgraded', {
      ...base,
      cost: Number.NaN,
    })
    const negativeCost = validateOperationEventPayload('system.academy_upgraded', {
      ...base,
      cost: -1,
    })
    const fractionalTier = validateOperationEventPayload('system.academy_upgraded', {
      ...base,
      tierAfter: 1.5,
    })
    const infiniteTier = validateOperationEventPayload('system.academy_upgraded', {
      ...base,
      tierBefore: Number.POSITIVE_INFINITY,
    })

    expect(nanFunding.success).toBe(false)
    expect(infiniteFundingAfter.success).toBe(false)
    expect(nanCost.success).toBe(false)
    expect(negativeCost.success).toBe(false)
    expect(fractionalTier.success).toBe(false)
    expect(infiniteTier.success).toBe(false)
  })

  it('accepts staff.side_work.resolved producer-aligned payloads including negative deltas', () => {
    const fixture = validateOperationEventPayload(
      'staff.side_work.resolved',
      minimalOperationEventPayloads['staff.side_work.resolved']
    )
    const negativeFunding = validateOperationEventPayload('staff.side_work.resolved', {
      ...minimalOperationEventPayloads['staff.side_work.resolved'],
      fundingDelta: -250,
      fatigueDelta: -10,
    })
    const hydrateFloorFunding = validateOperationEventPayload('staff.side_work.resolved', {
      ...minimalOperationEventPayloads['staff.side_work.resolved'],
      fundingDelta: -10_000,
    })
    const hydrateFloorFatigue = validateOperationEventPayload('staff.side_work.resolved', {
      ...minimalOperationEventPayloads['staff.side_work.resolved'],
      fatigueDelta: -100,
    })
    const copingUnchanged = validateOperationEventPayload(
      'staff.coping.misconduct',
      minimalOperationEventPayloads['staff.coping.misconduct']
    )

    expect(fixture.success).toBe(true)
    expect(negativeFunding.success).toBe(true)
    expect(hydrateFloorFunding.success).toBe(true)
    expect(hydrateFloorFatigue.success).toBe(true)
    expect(copingUnchanged.success).toBe(true)
  })

  it('rejects staff.side_work.resolved payloads with non-finite or below-floor deltas', () => {
    const base = minimalOperationEventPayloads['staff.side_work.resolved']
    const nanFundingDelta = validateOperationEventPayload('staff.side_work.resolved', {
      ...base,
      fundingDelta: Number.NaN,
    })
    const infiniteFundingDelta = validateOperationEventPayload('staff.side_work.resolved', {
      ...base,
      fundingDelta: Number.NEGATIVE_INFINITY,
    })
    const belowFundingFloor = validateOperationEventPayload('staff.side_work.resolved', {
      ...base,
      fundingDelta: -10_001,
    })
    const nanFatigueDelta = validateOperationEventPayload('staff.side_work.resolved', {
      ...base,
      fatigueDelta: Number.NaN,
    })
    const infiniteFatigueDelta = validateOperationEventPayload('staff.side_work.resolved', {
      ...base,
      fatigueDelta: Number.POSITIVE_INFINITY,
    })
    const belowFatigueFloor = validateOperationEventPayload('staff.side_work.resolved', {
      ...base,
      fatigueDelta: -101,
    })

    expect(nanFundingDelta.success).toBe(false)
    expect(infiniteFundingDelta.success).toBe(false)
    expect(belowFundingFloor.success).toBe(false)
    expect(nanFatigueDelta.success).toBe(false)
    expect(infiniteFatigueDelta.success).toBe(false)
    expect(belowFatigueFloor.success).toBe(false)
  })

  it('accepts infiltration probe fixtures with omitted or finite awareness/progress', () => {
    const fixture = validateOperationEventPayload(
      'infiltration.awareness_complication',
      minimalOperationEventPayloads['infiltration.awareness_complication']
    )
    const withFractions = validateOperationEventPayload('infiltration.weekly_encounter', {
      ...minimalOperationEventPayloads['infiltration.weekly_encounter'],
      infiltrationAwareness: 0.35,
      infiltrationProbeProgress: 0.8,
    })
    const withPercentStyle = validateOperationEventPayload('infiltration.cover_strain', {
      ...minimalOperationEventPayloads['infiltration.cover_strain'],
      infiltrationAwareness: 50,
      infiltrationProbeProgress: 100,
    })
    const withNegative = validateOperationEventPayload('infiltration.leave_behind_tradeoff', {
      ...minimalOperationEventPayloads['infiltration.leave_behind_tradeoff'],
      infiltrationAwareness: -0.1,
      infiltrationProbeProgress: -1,
    })
    const staffUnchanged = validateOperationEventPayload(
      'staff.side_work.resolved',
      minimalOperationEventPayloads['staff.side_work.resolved']
    )
    const concealmentUnchanged = validateOperationEventPayload(
      'concealment.activated',
      minimalOperationEventPayloads['concealment.activated']
    )

    expect(fixture.success).toBe(true)
    expect(withFractions.success).toBe(true)
    expect(withPercentStyle.success).toBe(true)
    expect(withNegative.success).toBe(true)
    expect(staffUnchanged.success).toBe(true)
    expect(concealmentUnchanged.success).toBe(true)
  })

  it('rejects infiltration probe payloads with non-finite awareness or progress when present', () => {
    const base = minimalOperationEventPayloads['infiltration.escalation_exposed']
    const nanAwareness = validateOperationEventPayload('infiltration.escalation_exposed', {
      ...base,
      infiltrationAwareness: Number.NaN,
    })
    const infiniteAwareness = validateOperationEventPayload('infiltration.escalation_violent', {
      ...minimalOperationEventPayloads['infiltration.escalation_violent'],
      infiltrationAwareness: Number.POSITIVE_INFINITY,
    })
    const nanProgress = validateOperationEventPayload('infiltration.awareness_complication', {
      ...minimalOperationEventPayloads['infiltration.awareness_complication'],
      infiltrationProbeProgress: Number.NaN,
    })
    const infiniteProgress = validateOperationEventPayload('infiltration.weekly_encounter', {
      ...minimalOperationEventPayloads['infiltration.weekly_encounter'],
      infiltrationProbeProgress: Number.NEGATIVE_INFINITY,
    })

    expect(nanAwareness.success).toBe(false)
    expect(infiniteAwareness.success).toBe(false)
    expect(nanProgress.success).toBe(false)
    expect(infiniteProgress.success).toBe(false)
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

  it('rejects production.queue_started payloads with unknown recipeId', () => {
    const unknown = validateOperationEventPayload('production.queue_started', {
      ...minimalOperationEventPayloads['production.queue_started'],
      recipeId: 'phantom-recipe',
      outputId: 'phantom-output',
      outputName: 'Phantom Output',
    })

    expect(unknown.success).toBe(false)
  })

  it('rejects production.queue_completed payloads with unknown recipeId', () => {
    const unknown = validateOperationEventPayload('production.queue_completed', {
      ...minimalOperationEventPayloads['production.queue_completed'],
      recipeId: 'phantom-recipe',
      outputId: 'phantom-output',
      outputName: 'Phantom Output',
    })

    expect(unknown.success).toBe(false)
  })

  it('rejects production.queue_started payloads with outputId/outputName mismatch', () => {
    const wrongOutputId = validateOperationEventPayload('production.queue_started', {
      ...minimalOperationEventPayloads['production.queue_started'],
      recipeId: 'ward-seals',
      outputId: 'wrong-output',
      outputName: 'Ward Seals',
    })
    const wrongOutputName = validateOperationEventPayload('production.queue_started', {
      ...minimalOperationEventPayloads['production.queue_started'],
      recipeId: 'ward-seals',
      outputId: 'ward_seals',
      outputName: 'Wrong Label',
    })
    // outputId must be catalog outputItemId — not the recipe id itself.
    const recipeIdAsOutput = validateOperationEventPayload('production.queue_started', {
      ...minimalOperationEventPayloads['production.queue_started'],
      recipeId: 'ward-seals',
      outputId: 'ward-seals',
      outputName: 'Ward Seals',
    })

    expect(wrongOutputId.success).toBe(false)
    expect(wrongOutputName.success).toBe(false)
    expect(recipeIdAsOutput.success).toBe(false)
  })

  it('rejects production.queue_completed payloads with outputId/outputName mismatch', () => {
    const wrongOutputId = validateOperationEventPayload('production.queue_completed', {
      ...minimalOperationEventPayloads['production.queue_completed'],
      recipeId: 'med-kits',
      outputId: 'wrong-output',
      outputName: 'Emergency Medkits',
    })
    const wrongOutputName = validateOperationEventPayload('production.queue_completed', {
      ...minimalOperationEventPayloads['production.queue_completed'],
      recipeId: 'med-kits',
      outputId: 'medkits',
      outputName: 'Wrong Label',
    })

    expect(wrongOutputId.success).toBe(false)
    expect(wrongOutputName.success).toBe(false)
  })

  it('accepts production.queue_* payloads with catalog-valid recipe and output fields', () => {
    const started = validateOperationEventPayload('production.queue_started', {
      ...minimalOperationEventPayloads['production.queue_started'],
      recipeId: 'med-kits',
      outputId: 'medkits',
      outputName: 'Emergency Medkits',
      queueName: 'Emergency Medkits',
    })
    const completedTrimmed = validateOperationEventPayload('production.queue_completed', {
      ...minimalOperationEventPayloads['production.queue_completed'],
      recipeId: 'med-kits',
      outputId: 'medkits',
      outputName: '  Emergency Medkits  ',
      queueName: 'Emergency Medkits',
    })

    expect(started.success).toBe(true)
    expect(completedTrimmed.success).toBe(true)
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
    const trimmedName = validateOperationEventPayload('market.shifted', {
      ...minimalOperationEventPayloads['market.shifted'],
      featuredRecipeId: 'med-kits',
      featuredRecipeName: '  Emergency Medkits  ',
      pressure: 'stable',
      costMultiplier: 1,
    })

    expect(valid.success).toBe(true)
    expect(trimmedName.success).toBe(true)
  })

  it('accepts consistent market.transaction_recorded payloads', () => {
    const validation = validateOperationEventPayload('market.transaction_recorded', {
      ...minimalOperationEventPayloads['market.transaction_recorded'],
    })
    const zeroFavor = validateOperationEventPayload('market.transaction_recorded', {
      ...minimalOperationEventPayloads['market.transaction_recorded'],
      action: 'favor_exchange',
      unitPrice: 0,
      totalPrice: 0,
      favorExchangeFactionId: 'faction-min',
      favorExchangeFavorId: 'favor-min',
      favorExchangeLabel: 'Minimal favor',
    })
    const zeroObligation = validateOperationEventPayload('market.transaction_recorded', {
      ...minimalOperationEventPayloads['market.transaction_recorded'],
      action: 'callable_obligation',
      unitPrice: 0,
      totalPrice: 0,
      callableObligationFactionId: 'faction-min',
      callableObligationFavorId: 'favor-min',
      callableObligationLabel: 'Minimal obligation',
    })
    // Producer multi-bundle: quantity already includes bundles; do not * bundleCount.
    const multiBundle = validateOperationEventPayload('market.transaction_recorded', {
      ...minimalOperationEventPayloads['market.transaction_recorded'],
      quantity: 3,
      bundleCount: 3,
      unitPrice: 10,
      totalPrice: 30,
    })
    // Producer cent unitPrice with listing buyPrice not divisible by bundleQuantity.
    const centUnitPrice = validateOperationEventPayload('market.transaction_recorded', {
      ...minimalOperationEventPayloads['market.transaction_recorded'],
      quantity: 3,
      bundleCount: 1,
      unitPrice: 8.33,
      totalPrice: 25,
    })
    // Multi-bundle + cent unitPrice: 3¢ drift from 8.33*9 vs bundles*buyPrice.
    const multiBundleCents = validateOperationEventPayload('market.transaction_recorded', {
      ...minimalOperationEventPayloads['market.transaction_recorded'],
      quantity: 9,
      bundleCount: 3,
      unitPrice: 8.33,
      totalPrice: 75,
    })

    expect(validation.success).toBe(true)
    expect(zeroFavor.success).toBe(true)
    expect(zeroObligation.success).toBe(true)
    expect(multiBundle.success).toBe(true)
    expect(centUnitPrice.success).toBe(true)
    expect(multiBundleCents.success).toBe(true)
  })

  it('rejects market.transaction_recorded payloads with non-finite or invalid numerics', () => {
    const base = minimalOperationEventPayloads['market.transaction_recorded']
    const nanQuantity = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      quantity: Number.NaN,
    })
    const infiniteUnitPrice = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      unitPrice: Number.POSITIVE_INFINITY,
      totalPrice: Number.POSITIVE_INFINITY,
    })
    const negativeRemaining = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      remainingAvailability: -1,
    })
    const fractionalRemaining = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      remainingAvailability: 1.5,
    })
    const zeroQuantity = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      quantity: 0,
      totalPrice: 0,
    })
    const zeroBundle = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      bundleCount: 0,
      totalPrice: 0,
    })
    const fractionalQuantity = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      quantity: 1.5,
      totalPrice: 15,
    })
    const fractionalBundle = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      bundleCount: 1.5,
      totalPrice: 15,
    })
    const negativeUnitPrice = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      unitPrice: -1,
      totalPrice: -1,
    })

    expect(nanQuantity.success).toBe(false)
    expect(infiniteUnitPrice.success).toBe(false)
    expect(negativeRemaining.success).toBe(false)
    expect(fractionalRemaining.success).toBe(false)
    expect(zeroQuantity.success).toBe(false)
    expect(zeroBundle.success).toBe(false)
    expect(fractionalQuantity.success).toBe(false)
    expect(fractionalBundle.success).toBe(false)
    expect(negativeUnitPrice.success).toBe(false)
  })

  it('rejects market.transaction_recorded payloads with totalPrice inconsistency', () => {
    const mismatch = validateOperationEventPayload('market.transaction_recorded', {
      ...minimalOperationEventPayloads['market.transaction_recorded'],
      unitPrice: 10,
      quantity: 1,
      bundleCount: 1,
      totalPrice: 999,
    })
    // Double-counting bundles would wrongly accept this if * bundleCount were used.
    const doubleCounted = validateOperationEventPayload('market.transaction_recorded', {
      ...minimalOperationEventPayloads['market.transaction_recorded'],
      unitPrice: 10,
      quantity: 3,
      bundleCount: 3,
      totalPrice: 90,
    })

    expect(mismatch.success).toBe(false)
    expect(mismatch.error).toMatch(/totalPrice must equal/)
    expect(doubleCounted.success).toBe(false)
    expect(doubleCounted.error).toMatch(/totalPrice must equal/)
  })

  it('rejects market.transaction_recorded payloads whose cent product overflows', () => {
    const overflow = validateOperationEventPayload('market.transaction_recorded', {
      ...minimalOperationEventPayloads['market.transaction_recorded'],
      unitPrice: 1e307,
      quantity: 2,
      bundleCount: 1,
      totalPrice: 1e307,
    })

    expect(overflow.success).toBe(false)
    expect(overflow.error).toMatch(/finite cent precision/)
  })

  it('accepts market.transaction_recorded allocation and listing bounds aligned with hydrate clamps', () => {
    const base = minimalOperationEventPayloads['market.transaction_recorded']
    const clampEdge = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      allocation: {
        ...base.allocation,
        priority: 10,
        delayWeeks: 52,
      },
      allocations: [
        {
          ...base.allocation,
          allocationId: 'alloc-edge',
          priority: 0,
          delayWeeks: 0,
        },
      ],
      listingResourceStatuses: [
        {
          resourceClass: 'licensed_handling_capacity',
          available: 0,
          capacity: 0,
        },
        {
          resourceClass: 'supplier_attention_slot',
          available: 2,
          capacity: 2,
        },
        // available without capacity is allowed (hydrate leaves available alone).
        { resourceClass: 'reagent_stock', available: 10 },
        { resourceClass: 'reagent_stock', capacity: 5 },
      ],
    })

    expect(clampEdge.success).toBe(true)
  })

  it('rejects market.transaction_recorded payloads with out-of-bounds allocation priority or delayWeeks', () => {
    const base = minimalOperationEventPayloads['market.transaction_recorded']
    const priorityTooHigh = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      allocation: { ...base.allocation, priority: 11 },
    })
    const delayTooHigh = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      allocation: { ...base.allocation, delayWeeks: 53 },
    })
    const negativePriority = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      allocation: { ...base.allocation, priority: -1 },
    })
    const fractionalDelay = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      allocation: { ...base.allocation, delayWeeks: 1.5 },
    })
    const nanPriority = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      allocation: { ...base.allocation, priority: Number.NaN },
    })
    const allocationsPriorityTooHigh = validateOperationEventPayload(
      'market.transaction_recorded',
      {
        ...base,
        allocations: [{ ...base.allocation, allocationId: 'alloc-bad', priority: 99 }],
      }
    )

    expect(priorityTooHigh.success).toBe(false)
    expect(delayTooHigh.success).toBe(false)
    expect(negativePriority.success).toBe(false)
    expect(fractionalDelay.success).toBe(false)
    expect(nanPriority.success).toBe(false)
    expect(allocationsPriorityTooHigh.success).toBe(false)
  })

  it('rejects market.transaction_recorded payloads with invalid listing available/capacity', () => {
    const base = minimalOperationEventPayloads['market.transaction_recorded']
    const availableOverCapacity = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      listingResourceStatuses: [
        { resourceClass: 'supplier_attention_slot', available: 3, capacity: 2 },
      ],
    })
    const negativeAvailable = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      listingResourceStatuses: [{ resourceClass: 'reagent_stock', available: -1 }],
    })
    const fractionalCapacity = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      listingResourceStatuses: [{ resourceClass: 'reagent_stock', capacity: 1.5 }],
    })
    const nanAvailable = validateOperationEventPayload('market.transaction_recorded', {
      ...base,
      listingResourceStatuses: [{ resourceClass: 'reagent_stock', available: Number.NaN }],
    })

    expect(availableOverCapacity.success).toBe(false)
    expect(availableOverCapacity.error).toMatch(/available must be <= capacity/)
    expect(negativeAvailable.success).toBe(false)
    expect(fractionalCapacity.success).toBe(false)
    expect(nanAvailable.success).toBe(false)
  })

  it('rejects faction.unlock_available payloads with unknown faction references', () => {
    const validation = validateOperationEventPayload('faction.unlock_available', {
      week: 3,
      factionId: 'unknown-faction',
      factionName: 'Unknown Faction',
      label: 'Unknown channel',
      summary: 'An unknown channel became available.',
      disposition: 'supportive',
    })

    expect(validation.success).toBe(false)
  })

  it('rejects faction.unlock_available payloads with stale contacts', () => {
    const validation = validateOperationEventPayload('faction.unlock_available', {
      week: 3,
      factionId: 'institutions',
      factionName: 'Academic Institutions',
      contactId: 'institutions-retired-contact',
      contactName: 'Retired Contact',
      label: 'Archive referral',
      summary: 'A stale archive referral became available.',
      disposition: 'supportive',
    })

    expect(validation.success).toBe(false)
  })

  it('rejects faction.unlock_available payloads with blank labels', () => {
    const validation = validateOperationEventPayload('faction.unlock_available', {
      week: 3,
      factionId: 'institutions',
      factionName: 'Academic Institutions',
      label: '   ',
      summary: 'A research channel became available.',
      disposition: 'supportive',
    })

    expect(validation.success).toBe(false)
  })

  it('rejects faction.unlock_available payloads with padded labels or summaries', () => {
    const base = {
      week: 3,
      factionId: 'institutions',
      factionName: 'Academic Institutions',
      label: 'Research fellowship',
      summary: 'A research fellowship became available.',
      disposition: 'supportive' as const,
    }

    expect(
      validateOperationEventPayload('faction.unlock_available', {
        ...base,
        label: '  Research fellowship  ',
      }).success
    ).toBe(false)
    expect(
      validateOperationEventPayload('faction.unlock_available', {
        ...base,
        summary: '  A research fellowship became available.  ',
      }).success
    ).toBe(false)
  })

  it('rejects faction.unlock_available payloads with overlong summaries', () => {
    const validation = validateOperationEventPayload('faction.unlock_available', {
      week: 3,
      factionId: 'institutions',
      factionName: 'Academic Institutions',
      label: 'Research fellowship',
      summary: 'x'.repeat(501),
      disposition: 'supportive',
    })

    expect(validation.success).toBe(false)
  })

  it('rejects faction.unlock_available payloads with invalid dispositions', () => {
    const validation = validateOperationEventPayload('faction.unlock_available', {
      week: 3,
      factionId: 'institutions',
      factionName: 'Academic Institutions',
      label: 'Research fellowship',
      summary: 'A research fellowship became available.',
      disposition: 'neutral',
    })

    expect(validation.success).toBe(false)
  })

  it('accepts a valid faction.unlock_available payload', () => {
    const validation = validateOperationEventPayload('faction.unlock_available', {
      week: 3,
      factionId: 'institutions',
      factionName: 'Academic Institutions',
      contactId: 'institutions-halden',
      contactName: 'Miren Halden',
      label: 'Research fellowship',
      summary: 'A fellowship referral channel is available through Halden.',
      disposition: 'supportive',
    })

    expect(validation.success).toBe(true)
  })

  it.each(['equipment.recovery_started', 'equipment.recovery_completed'] as const)(
    'rejects %s payloads with non-positive or fractional material quantities',
    (type) => {
      const base = {
        week: 1,
        queueId: 'recovery-1',
        itemId: 'signal_jammers',
        itemName: 'Signal Jammers',
        pathId: 'component_reclamation' as const,
        sourceGradeId: 'grade_2' as const,
        sourceCondition: 'operational' as const,
        outputMaterials: [
          { materialId: 'electronic_parts', materialName: 'Electronic Parts', quantity: 1 },
        ],
        wasteQuantity: 0,
        ...(type === 'equipment.recovery_started' ? { etaWeeks: 1 } : {}),
      }

      expect(
        validateOperationEventPayload(type, {
          ...base,
          outputMaterials: [{ ...base.outputMaterials[0], quantity: -1 }],
        }).success
      ).toBe(false)
      expect(
        validateOperationEventPayload(type, {
          ...base,
          outputMaterials: [{ ...base.outputMaterials[0], quantity: 0.5 }],
        }).success
      ).toBe(false)
    }
  )

  it.each(['equipment.recovery_started', 'equipment.recovery_completed'] as const)(
    'rejects %s instance provenance with a noncanonical Combat Stim grade',
    (type) => {
      const validation = validateOperationEventPayload(type, {
        week: 1,
        queueId: 'recovery-instance-1',
        itemId: 'combat_stims',
        itemName: 'Combat Stims',
        pathId: 'component_reclamation',
        sourceGradeId: 'grade_2',
        sourceEquipmentInstanceId: 'equipment-instance-empty',
        sourceEquipmentInstanceResourceId: 'combat_stim_dose',
        sourceEquipmentInstanceCapacity: 2,
        sourceEquipmentInstanceRemaining: 0,
        sourceCondition: 'operational',
        outputMaterials: [
          { materialId: 'medical_supplies', materialName: 'Medical Supplies', quantity: 1 },
        ],
        wasteQuantity: 1,
        ...(type === 'equipment.recovery_started' ? { etaWeeks: 1 } : {}),
      })

      expect(validation.success).toBe(false)
    }
  )

  it.each(['equipment.recovery_started', 'equipment.recovery_completed'] as const)(
    'accepts %s ID-only ordinary instance provenance',
    (type) => {
      const payload = {
        week: 1,
        queueId: 'recovery-ordinary-1',
        itemId: 'signal_jammers',
        itemName: 'Signal Jammers',
        pathId: 'component_reclamation',
        sourceGradeId: 'grade_2',
        sourceEquipmentInstanceId: 'equipment-instance-ordinary',
        sourceCondition: 'damaged',
        outputMaterials: [
          { materialId: 'electronic_parts', materialName: 'Electronic Parts', quantity: 1 },
        ],
        wasteQuantity: 2,
        ...(type === 'equipment.recovery_started' ? { etaWeeks: 1 } : {}),
      }

      expect(validateOperationEventPayload(type, payload).success).toBe(true)
      expect(
        validateOperationEventPayload(type, {
          ...payload,
          sourceEquipmentInstanceResourceId: 'unsupported_charge',
        }).success
      ).toBe(false)
      expect(
        validateOperationEventPayload(type, {
          ...payload,
          sourceFabricationQueueId: 'batch',
        }).success
      ).toBe(false)
      expect(
        validateOperationEventPayload(type, {
          ...payload,
          sourceEquipmentInstanceId: '__proto__',
        }).success
      ).toBe(false)
      expect(
        validateOperationEventPayload(type, {
          ...payload,
          itemId: 'diplomatic_kit',
          itemName: 'Diplomatic Kit',
        }).success
      ).toBe(false)
    }
  )
})
