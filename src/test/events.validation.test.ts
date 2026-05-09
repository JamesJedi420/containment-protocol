import { describe, expect, it } from 'vitest'
import { operationEventPayloadSchemas, validateOperationEventPayload } from '../domain/events/eventValidation'
import { EVENT_TYPE_TO_SOURCE_SYSTEM } from '../domain/events/types'

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
})
