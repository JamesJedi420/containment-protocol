import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_RESISTING_CONTENT_OWNER,
  EXAMPLE_YIELDING_CONTENT_OWNER,
  evaluateContentOwnerTakedownResistance,
  type ContentOwner,
} from '../domain/contentOwnerTakedownResistance'

function owner(overrides: Partial<ContentOwner> = {}): ContentOwner {
  return {
    ...EXAMPLE_RESISTING_CONTENT_OWNER,
    ...overrides,
    incentives: {
      ...EXAMPLE_RESISTING_CONTENT_OWNER.incentives,
      ...(overrides.incentives ?? {}),
    },
  }
}

describe('contentOwnerTakedownResistance (SPE-2572 / SPE-947 AC row 5)', () => {
  it('resists when audience/status incentives meet the resist threshold', () => {
    const decision = evaluateContentOwnerTakedownResistance({
      owner: EXAMPLE_RESISTING_CONTENT_OWNER,
      resistThreshold: 8,
      contestedThreshold: 4,
    })

    expect(decision.outcome).toBe('resists')
    expect(decision.reasonCodes).toEqual(['incentive_resistance'])
    expect(decision).toEqual(
      expect.objectContaining({
        ownerId: 'owner:viral-streamer',
        ownerLabel: 'Viral anomaly streamer',
        audienceIncentive: 4,
        statusIncentive: 3,
        profitIncentive: 1,
        identityIncentive: 1,
        resistanceScore: 9,
        resistThreshold: 8,
        contestedThreshold: 4,
      })
    )
  })

  it('yields when incentive score is below the contested band', () => {
    const decision = evaluateContentOwnerTakedownResistance({
      owner: EXAMPLE_YIELDING_CONTENT_OWNER,
      resistThreshold: 8,
      contestedThreshold: 4,
    })

    expect(decision.outcome).toBe('yields')
    expect(decision.reasonCodes).toEqual(['incentive_yield'])
    expect(decision.resistanceScore).toBe(0.5)
  })

  it('returns contested when score is in the contested band', () => {
    const decision = evaluateContentOwnerTakedownResistance({
      owner: owner({
        incentives: { audience: 2, status: 2, profit: 0, identity: 1 },
      }),
      resistThreshold: 8,
      contestedThreshold: 4,
    })

    expect(decision.outcome).toBe('contested')
    expect(decision.reasonCodes).toEqual(['incentive_contested'])
    expect(decision.resistanceScore).toBe(5)
  })

  it('defaults contestedThreshold to resistThreshold / 2 when omitted', () => {
    const decision = evaluateContentOwnerTakedownResistance({
      owner: owner({
        incentives: { audience: 3, status: 2, profit: 0, identity: 0 },
      }),
      resistThreshold: 10,
    })

    expect(decision.contestedThreshold).toBe(5)
    expect(decision.outcome).toBe('contested')
    expect(decision.reasonCodes).toEqual(['incentive_contested'])
  })

  it('returns byte-stable decisions for the same inputs', () => {
    const input = {
      owner: EXAMPLE_RESISTING_CONTENT_OWNER,
      resistThreshold: 8,
      contestedThreshold: 4,
    }

    const first = evaluateContentOwnerTakedownResistance(input)
    const second = evaluateContentOwnerTakedownResistance(input)

    expect(second).toEqual(first)
    expect(first.outcome).toBe('resists')
  })

  it('yields deterministically when evaluation input is missing', () => {
    const decision = evaluateContentOwnerTakedownResistance(undefined)

    expect(decision.outcome).toBe('yields')
    expect(decision.reasonCodes).toEqual(['missing_evaluation_input'])
    expect(decision.ownerId).toBe('owner:unknown')
  })

  it('yields when owner is missing', () => {
    const decision = evaluateContentOwnerTakedownResistance({
      owner: null,
      resistThreshold: 8,
    })

    expect(decision.outcome).toBe('yields')
    expect(decision.reasonCodes).toEqual(['missing_owner', 'takedown_yields'])
  })

  it('yields when incentives are missing (incomplete config never resists)', () => {
    const decision = evaluateContentOwnerTakedownResistance({
      owner: {
        id: 'owner:blank',
        label: 'Blank owner',
        incentives: {},
      },
      resistThreshold: 8,
      contestedThreshold: 4,
    })

    expect(decision.outcome).toBe('yields')
    expect(decision.reasonCodes).toEqual([
      'missing_incentives',
      'owner_config_incomplete',
      'takedown_yields',
    ])
    expect(decision.resistanceScore).toBe(0)
  })

  it('yields when resistThreshold is missing or invalid', () => {
    const decision = evaluateContentOwnerTakedownResistance({
      owner: EXAMPLE_RESISTING_CONTENT_OWNER,
      resistThreshold: 0,
    })

    expect(decision.outcome).toBe('yields')
    expect(decision.reasonCodes).toContain('missing_or_invalid_resist_threshold')
    expect(decision.reasonCodes).toContain('takedown_yields')
  })

  it('yields when an incentive field is invalid', () => {
    const decision = evaluateContentOwnerTakedownResistance({
      owner: {
        id: 'owner:bad-incentive',
        label: 'Bad incentive owner',
        incentives: {
          audience: Number.NaN,
          status: -1,
        },
      },
      resistThreshold: 8,
      contestedThreshold: 4,
    })

    expect(decision.outcome).toBe('yields')
    expect(decision.reasonCodes).toEqual([
      'invalid_audience_incentive',
      'invalid_status_incentive',
      'missing_incentives',
      'owner_config_incomplete',
      'takedown_yields',
    ])
  })

  it('yields when mixed valid and invalid incentives are present (never resists)', () => {
    const decision = evaluateContentOwnerTakedownResistance({
      owner: {
        id: 'owner:mixed-incentive',
        label: 'Mixed incentive owner',
        incentives: {
          audience: 10,
          status: Number.NaN,
        },
      },
      resistThreshold: 8,
      contestedThreshold: 4,
    })

    expect(decision.outcome).toBe('yields')
    expect(decision.reasonCodes).toEqual([
      'invalid_status_incentive',
      'owner_config_incomplete',
      'takedown_yields',
    ])
    expect(decision.resistanceScore).toBe(0)
  })

  it('yields when contestedThreshold is not below resistThreshold', () => {
    const decision = evaluateContentOwnerTakedownResistance({
      owner: EXAMPLE_RESISTING_CONTENT_OWNER,
      resistThreshold: 8,
      contestedThreshold: 8,
    })

    expect(decision.outcome).toBe('yields')
    expect(decision.reasonCodes).toContain('contested_threshold_not_below_resist')
    expect(decision.reasonCodes).toContain('takedown_yields')
  })

  it('treats a single valid incentive as complete config', () => {
    const decision = evaluateContentOwnerTakedownResistance({
      owner: {
        id: 'owner:status-only',
        label: 'Status-only creator',
        incentives: { status: 9 },
      },
      resistThreshold: 8,
      contestedThreshold: 4,
    })

    expect(decision.outcome).toBe('resists')
    expect(decision.reasonCodes).toEqual(['incentive_resistance'])
    expect(decision.statusIncentive).toBe(9)
    expect(decision.resistanceScore).toBe(9)
  })
})
