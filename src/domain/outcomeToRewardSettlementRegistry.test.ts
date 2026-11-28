import { describe, expect, it } from 'vitest'
import {
  OUTCOME_TO_REWARD_SETTLEMENT_FIXTURES,
  resolveSettlementDisposition,
  validateOutcomeToRewardSettlementReceipts,
  normalizeOutcomeToRewardSettlementReceipts,
  type SettlementPolicy,
} from './outcomeToRewardSettlementRegistry'

describe('outcomeToRewardSettlementRegistry', () => {
  it('validates fixtures', () => {
    const result = validateOutcomeToRewardSettlementReceipts(OUTCOME_TO_REWARD_SETTLEMENT_FIXTURES)
    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('rejects nonterminal settlement', () => {
    const bad = [
      {
        ...OUTCOME_TO_REWARD_SETTLEMENT_FIXTURES[0],
        terminal: false,
      },
    ]
    const result = validateOutcomeToRewardSettlementReceipts(bad)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'nonterminal_settlement')).toBe(true)
  })

  it('rejects duplicate settlement id', () => {
    const bad = [
      OUTCOME_TO_REWARD_SETTLEMENT_FIXTURES[0],
      { ...OUTCOME_TO_REWARD_SETTLEMENT_FIXTURES[0] },
    ]
    const result = validateOutcomeToRewardSettlementReceipts(bad)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'duplicate_settlement_id')).toBe(true)
  })

  it('normalizes and sorts', () => {
    const normalized = normalizeOutcomeToRewardSettlementReceipts(OUTCOME_TO_REWARD_SETTLEMENT_FIXTURES)
    expect(normalized).not.toBeNull()
    expect(normalized![0].settlementId).toBe('settlement:raid-partial-02')
  })

  it('resolves disposition from policy', () => {
    const policy: SettlementPolicy = {
      policyId: 'policy:raid-rewards',
      mappings: [
        { outcomeClass: 'full_success', disposition: 'full_reward' },
        { outcomeClass: 'partial_success', disposition: 'partial_reward' },
        { outcomeClass: 'failure', disposition: 'no_reward' },
      ],
    }
    expect(resolveSettlementDisposition(policy, 'full_success')).toBe('full_reward')
    expect(resolveSettlementDisposition(policy, 'unknown')).toBeNull()
  })
})
