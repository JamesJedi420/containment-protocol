import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_COUNTER_MEMETIC_BLAST,
  EXAMPLE_RUMOR_FORUM_OPERATION_PLATFORM,
  evaluatePlatformOperationDegrade,
  type PlatformOperationNode,
  type PlatformOperationRequest,
} from '../domain/platformOperationDegrade'

function platform(overrides: Partial<PlatformOperationNode> = {}): PlatformOperationNode {
  return {
    ...EXAMPLE_RUMOR_FORUM_OPERATION_PLATFORM,
    ...overrides,
  }
}

function operation(overrides: Partial<PlatformOperationRequest> = {}): PlatformOperationRequest {
  return {
    ...EXAMPLE_COUNTER_MEMETIC_BLAST,
    ...overrides,
  }
}

describe('platformOperationDegrade (SPE-2569 / SPE-947 AC row 4)', () => {
  it('returns ok when platform is online and available reach meets the requirement', () => {
    const decision = evaluatePlatformOperationDegrade({
      platform: platform({ uptimeState: 'online', availableReach: 40 }),
      operation: operation({ requiredReach: 25 }),
    })

    expect(decision.outcome).toBe('ok')
    expect(decision.reasonCodes).toEqual(['platform_operation_ok'])
    expect(decision).toEqual(
      expect.objectContaining({
        platformId: 'platform:rumor-forum',
        platformLabel: 'Local rumor forum',
        uptimeState: 'online',
        availableReach: 40,
        operationId: 'operation:counter-memetic-blast',
        requiredReach: 25,
      })
    )
  })

  it('fails when the platform is in outage', () => {
    const decision = evaluatePlatformOperationDegrade({
      platform: platform({ uptimeState: 'outage', availableReach: 100 }),
      operation: operation({ requiredReach: 10 }),
    })

    expect(decision.outcome).toBe('failed')
    expect(decision.reasonCodes).toEqual(['platform_outage'])
  })

  it('fails when the platform has crashed', () => {
    const decision = evaluatePlatformOperationDegrade({
      platform: platform({ uptimeState: 'crashed' }),
      operation: operation(),
    })

    expect(decision.outcome).toBe('failed')
    expect(decision.reasonCodes).toEqual(['platform_crashed'])
  })

  it('fails when the platform is deleted', () => {
    const decision = evaluatePlatformOperationDegrade({
      platform: platform({ uptimeState: 'deleted', availableReach: 0 }),
      operation: operation({ requiredReach: 5 }),
    })

    expect(decision.outcome).toBe('failed')
    expect(decision.reasonCodes).toEqual(['platform_deleted'])
  })

  it('degrades when platform uptime is degraded', () => {
    const decision = evaluatePlatformOperationDegrade({
      platform: platform({ uptimeState: 'degraded', availableReach: 40 }),
      operation: operation({ requiredReach: 25 }),
    })

    expect(decision.outcome).toBe('degraded')
    expect(decision.reasonCodes).toEqual(['platform_degraded'])
  })

  it('degrades when online but available reach is insufficient', () => {
    const decision = evaluatePlatformOperationDegrade({
      platform: platform({ uptimeState: 'online', availableReach: 10 }),
      operation: operation({ requiredReach: 25 }),
    })

    expect(decision.outcome).toBe('degraded')
    expect(decision.reasonCodes).toEqual(['insufficient_reach'])
  })

  it('adds insufficient_reach when degraded uptime also lacks required reach', () => {
    const decision = evaluatePlatformOperationDegrade({
      platform: platform({ uptimeState: 'degraded', availableReach: 5 }),
      operation: operation({ requiredReach: 25 }),
    })

    expect(decision.outcome).toBe('degraded')
    expect(decision.reasonCodes).toEqual(['insufficient_reach', 'platform_degraded'])
  })

  it('returns byte-stable decisions for the same inputs', () => {
    const input = {
      platform: platform(),
      operation: operation(),
    }

    const first = evaluatePlatformOperationDegrade(input)
    const second = evaluatePlatformOperationDegrade(input)

    expect(second).toEqual(first)
    expect(first.outcome).toBe('ok')
  })

  it('fails deterministically when evaluation input is missing', () => {
    const decision = evaluatePlatformOperationDegrade(undefined)

    expect(decision.outcome).toBe('failed')
    expect(decision.reasonCodes).toEqual(['missing_evaluation_input'])
    expect(decision.uptimeState).toBe('unknown')
  })

  it('fails when platform is missing', () => {
    const decision = evaluatePlatformOperationDegrade({
      operation: operation(),
    })

    expect(decision.outcome).toBe('failed')
    expect(decision.reasonCodes).toEqual(['missing_platform', 'platform_operation_failed'])
  })

  it('degrades when required reach is invalid on an otherwise online platform', () => {
    const decision = evaluatePlatformOperationDegrade({
      platform: platform({ uptimeState: 'online', availableReach: 40 }),
      operation: {
        id: 'operation:bad',
        label: 'Bad op',
        requiredReach: 0,
      },
    })

    expect(decision.outcome).toBe('degraded')
    expect(decision.reasonCodes).toEqual([
      'missing_or_invalid_required_reach',
      'platform_operation_degraded',
    ])
  })

  it('treats missing available reach as zero and degrades for insufficient reach', () => {
    const decision = evaluatePlatformOperationDegrade({
      platform: {
        id: 'platform:thin',
        label: 'Thin platform',
        uptimeState: 'online',
      },
      operation: operation({ requiredReach: 10 }),
    })

    expect(decision.availableReach).toBe(0)
    expect(decision.outcome).toBe('degraded')
    expect(decision.reasonCodes).toEqual(['insufficient_reach', 'missing_available_reach'])
  })

  it('fails when uptime state is invalid', () => {
    const decision = evaluatePlatformOperationDegrade({
      platform: {
        id: 'platform:weird',
        label: 'Weird',
        uptimeState: 'offline' as PlatformOperationNode['uptimeState'],
        availableReach: 50,
      },
      operation: operation(),
    })

    expect(decision.outcome).toBe('failed')
    expect(decision.uptimeState).toBe('unknown')
    expect(decision.reasonCodes).toEqual([
      'missing_or_invalid_uptime_state',
      'platform_operation_failed',
    ])
  })
})
