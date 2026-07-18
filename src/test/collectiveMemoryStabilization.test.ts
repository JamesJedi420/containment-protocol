import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_MEMORY_STABILIZATION_BASELINE,
  EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
  EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
  evaluateCollectiveMemoryStabilization,
  type CollectiveMemoryChannel,
  type CollectiveMemorySignal,
  type CollectiveMemoryBaseline,
} from '../domain/collectiveMemoryStabilization'

function channel(overrides: Partial<CollectiveMemoryChannel> = {}): CollectiveMemoryChannel {
  return {
    ...EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
    ...overrides,
  }
}

function signal(overrides: Partial<CollectiveMemorySignal> = {}): CollectiveMemorySignal {
  return {
    ...EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
    ...overrides,
  }
}

function baseline(overrides: Partial<CollectiveMemoryBaseline> = {}): CollectiveMemoryBaseline {
  return {
    ...EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    ...overrides,
  }
}

describe('collectiveMemoryStabilization (SPE-2631 / SPE-956 slice 1)', () => {
  it('stabilizes fragmented procedure memory for an open shared-narrative channel', () => {
    const result = evaluateCollectiveMemoryStabilization({
      channel: EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
      signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    })

    expect(result.outcome).toBe('stabilized')
    expect(result.reasonCodes).toEqual(['credibility_capped_weak', 'memory_stabilized'])
    expect(result.proposedAdjustment).toEqual({
      scope: 'procedure_memory',
      fromValue: 'fragmented_lockdown_steps',
      toValue: 'shared_lockdown_sequence',
    })
    expect(result.resolved.procedureMemory).toBe('shared_lockdown_sequence')
    expect(result.resolved.credibilityStance).toBe(
      EXAMPLE_MEMORY_STABILIZATION_BASELINE.credibilityStance
    )
    expect(result.baseline).toEqual(EXAMPLE_MEMORY_STABILIZATION_BASELINE)
    expect(result.channelId).toBe('channel:riverside-memory-circle')
    expect(result.signalId).toBe('signal:riverside-lockdown-recall')
  })

  it('stabilizes under procedure_fragments_only when intent is stabilize_recall', () => {
    const result = evaluateCollectiveMemoryStabilization({
      channel: channel({ stabilizationRule: 'procedure_fragments_only' }),
      signal: signal({
        signalId: 'signal:riverside-fragment-recall',
        intent: 'stabilize_recall',
        proposedValue: 'aligned_evac_order',
      }),
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    })

    expect(result.outcome).toBe('stabilized')
    expect(result.reasonCodes).toEqual(['credibility_capped_weak', 'memory_stabilized'])
    expect(result.proposedAdjustment).toEqual({
      scope: 'procedure_memory',
      fromValue: 'fragmented_lockdown_steps',
      toValue: 'aligned_evac_order',
    })
  })

  it('defers share_narrative under procedure_fragments_only (incomplete stabilization rule)', () => {
    const result = evaluateCollectiveMemoryStabilization({
      channel: channel({ stabilizationRule: 'procedure_fragments_only' }),
      signal: signal({
        signalId: 'signal:riverside-narrative-incomplete',
        intent: 'share_narrative',
        proposedValue: 'campfire_procedure_story',
      }),
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    })

    expect(result.outcome).toBe('deferred')
    expect(result.reasonCodes).toEqual(['incomplete_stabilization_rule'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_MEMORY_STABILIZATION_BASELINE)
  })

  it('defers when the stabilization rule is incomplete', () => {
    const result = evaluateCollectiveMemoryStabilization({
      channel: channel({ stabilizationRule: 'incomplete' }),
      signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    })

    expect(result.outcome).toBe('deferred')
    expect(result.reasonCodes).toEqual(['incomplete_stabilization_rule'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_MEMORY_STABILIZATION_BASELINE)
  })

  it('rejects when the recall window is closed', () => {
    const result = evaluateCollectiveMemoryStabilization({
      channel: channel({ recallWindow: 'closed' }),
      signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    })

    expect(result.outcome).toBe('rejected')
    expect(result.reasonCodes).toEqual(['memory_rejected', 'recall_window_closed'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_MEMORY_STABILIZATION_BASELINE)
  })

  it('returns weak_testimony when credibility_stance elevation is attempted', () => {
    const result = evaluateCollectiveMemoryStabilization({
      channel: EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
      signal: signal({
        signalId: 'signal:riverside-credibility-push',
        intent: 'elevate_testimony',
        proposedScope: 'credibility_stance',
        proposedValue: 'institutional',
      }),
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    })

    expect(result.outcome).toBe('weak_testimony')
    expect(result.reasonCodes).toEqual(['weak_testimony_ceiling'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_MEMORY_STABILIZATION_BASELINE)
    expect(result.resolved.credibilityStance).toBe('anecdotal')
  })

  it('returns a deterministic deferred no-op when evaluation input is missing', () => {
    const result = evaluateCollectiveMemoryStabilization(undefined)

    expect(result.outcome).toBe('deferred')
    expect(result.reasonCodes).toEqual(['missing_evaluation_input'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.channelId).toBeNull()
    expect(result.signalId).toBeNull()
    expect(result.resolved).toEqual(result.baseline)
  })

  it('returns a deferred no-op when channel, signal, or baseline is missing', () => {
    const missingChannel = evaluateCollectiveMemoryStabilization({
      channel: null,
      signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    })
    expect(missingChannel.outcome).toBe('deferred')
    expect(missingChannel.reasonCodes).toContain('missing_memory_channel')
    expect(missingChannel.proposedAdjustment).toBeNull()
    expect(missingChannel.resolved).toEqual(EXAMPLE_MEMORY_STABILIZATION_BASELINE)

    const missingSignal = evaluateCollectiveMemoryStabilization({
      channel: EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
      signal: null,
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    })
    expect(missingSignal.outcome).toBe('deferred')
    expect(missingSignal.reasonCodes).toContain('missing_memory_signal')
    expect(missingSignal.proposedAdjustment).toBeNull()

    const missingBaseline = evaluateCollectiveMemoryStabilization({
      channel: EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
      signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
      baseline: null,
    })
    expect(missingBaseline.outcome).toBe('deferred')
    expect(missingBaseline.reasonCodes).toContain('missing_memory_baseline')
    expect(missingBaseline.proposedAdjustment).toBeNull()
  })

  it('defers for an incomplete channel before applying adjustments', () => {
    const result = evaluateCollectiveMemoryStabilization({
      channel: {
        id: 'channel:incomplete',
        narrativeStance: 'shared_survivor',
        recallWindow: 'active_session',
        credibilityCeiling: 'clinical' as CollectiveMemoryChannel['credibilityCeiling'],
        stabilizationRule: 'open_shared',
      },
      signal: {
        ...EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
        channelId: 'channel:incomplete',
      },
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    })

    expect(result.outcome).toBe('deferred')
    expect(result.reasonCodes).toEqual(['incomplete_stabilization_rules'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_MEMORY_STABILIZATION_BASELINE)
  })

  it('rejects when signal channelId does not match the channel', () => {
    const result = evaluateCollectiveMemoryStabilization({
      channel: EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
      signal: signal({ channelId: 'channel:other' }),
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    })

    expect(result.outcome).toBe('rejected')
    expect(result.reasonCodes).toEqual(['channel_signal_mismatch', 'memory_rejected'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_MEMORY_STABILIZATION_BASELINE)
  })

  it('rejects stabilize_recall when proposed scope is credibility_stance', () => {
    const result = evaluateCollectiveMemoryStabilization({
      channel: EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
      signal: signal({
        intent: 'stabilize_recall',
        proposedScope: 'credibility_stance',
        proposedValue: 'anecdotal',
      }),
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    })

    expect(result.outcome).toBe('rejected')
    expect(result.reasonCodes).toEqual(['intent_scope_mismatch', 'memory_rejected'])
    expect(result.proposedAdjustment).toBeNull()
  })

  it('prefers recall_window_closed over channel_signal_mismatch when both apply', () => {
    const result = evaluateCollectiveMemoryStabilization({
      channel: channel({ recallWindow: 'closed' }),
      signal: signal({ channelId: 'channel:other' }),
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    })

    expect(result.outcome).toBe('rejected')
    expect(result.reasonCodes).toEqual(['memory_rejected', 'recall_window_closed'])
    expect(result.proposedAdjustment).toBeNull()
  })

  it('prefers incomplete_stabilization_rule over channel_signal_mismatch when both apply', () => {
    const result = evaluateCollectiveMemoryStabilization({
      channel: channel({ stabilizationRule: 'incomplete' }),
      signal: signal({
        signalId: 'signal:riverside-incomplete-mismatch',
        channelId: 'channel:other',
        proposedValue: 'campfire_procedure_story',
      }),
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    })

    expect(result.outcome).toBe('deferred')
    expect(result.reasonCodes).toEqual(['incomplete_stabilization_rule'])
    expect(result.proposedAdjustment).toBeNull()
  })

  it('keeps reason codes unique and sorted across paths', () => {
    const stabilized = evaluateCollectiveMemoryStabilization({
      channel: EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
      signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    })
    const rejected = evaluateCollectiveMemoryStabilization({
      channel: channel({ recallWindow: 'closed' }),
      signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    })

    expect(stabilized.reasonCodes).toEqual(
      [...stabilized.reasonCodes].sort((a, b) => a.localeCompare(b))
    )
    expect(rejected.reasonCodes).toEqual(
      [...new Set(rejected.reasonCodes)].sort((a, b) => a.localeCompare(b))
    )
  })

  it('freezes the result envelope and does not mutate the baseline input', () => {
    const inputBaseline = baseline()
    const result = evaluateCollectiveMemoryStabilization({
      channel: EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
      signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
      baseline: inputBaseline,
    })

    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.reasonCodes)).toBe(true)
    expect(Object.isFrozen(result.resolved)).toBe(true)
    expect(Object.isFrozen(result.baseline)).toBe(true)
    expect(result.proposedAdjustment).not.toBeNull()
    expect(Object.isFrozen(result.proposedAdjustment)).toBe(true)
    expect(inputBaseline.procedureMemory).toBe('fragmented_lockdown_steps')
    expect(result.resolved).not.toBe(inputBaseline)
    expect(result.baseline).not.toBe(inputBaseline)
  })

  it('returns byte-stable decisions for the same inputs', () => {
    const input = {
      channel: EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
      signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    }

    const first = evaluateCollectiveMemoryStabilization(input)
    const second = evaluateCollectiveMemoryStabilization(input)

    expect(second).toEqual(first)
  })

  it('exposes an authored channel with narrative stance, recall window, and credibility ceiling', () => {
    expect(EXAMPLE_MEMORY_STABILIZATION_CHANNEL.narrativeStance).toBe('shared_survivor')
    expect(EXAMPLE_MEMORY_STABILIZATION_CHANNEL.recallWindow).toBe('active_session')
    expect(EXAMPLE_MEMORY_STABILIZATION_CHANNEL.stabilizationRule).toBe('open_shared')
    expect(EXAMPLE_MEMORY_STABILIZATION_CHANNEL.credibilityCeiling).toBe('community_weak')
  })

  it('defers for a partial baseline instead of inventing missing fields', () => {
    const result = evaluateCollectiveMemoryStabilization({
      channel: EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
      signal: EXAMPLE_MEMORY_STABILIZATION_SIGNAL,
      baseline: {
        memberId: 'member:partial',
        procedureMemory: 'fragmented_lockdown_steps',
      } as CollectiveMemoryBaseline,
    })

    expect(result.outcome).toBe('deferred')
    expect(result.reasonCodes).toEqual(['invalid_memory_baseline'])
    expect(result.proposedAdjustment).toBeNull()
  })

  it('stabilizes a share_narrative signal under open_shared rule', () => {
    const result = evaluateCollectiveMemoryStabilization({
      channel: EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
      signal: signal({
        signalId: 'signal:riverside-shared-story',
        intent: 'share_narrative',
        proposedValue: 'peer_aligned_lockdown_steps',
      }),
      baseline: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
    })

    expect(result.outcome).toBe('stabilized')
    expect(result.reasonCodes).toEqual(['credibility_capped_weak', 'memory_stabilized'])
    expect(result.proposedAdjustment).toEqual({
      scope: 'procedure_memory',
      fromValue: 'fragmented_lockdown_steps',
      toValue: 'peer_aligned_lockdown_steps',
    })
  })
})
