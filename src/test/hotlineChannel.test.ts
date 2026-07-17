import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_HOTLINE_CALL,
  EXAMPLE_HOTLINE_CHANNEL,
  EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
  evaluateHotlineCall,
  type HotlineCall,
  type HotlineChannel,
  type HotlineGuidanceBaseline,
} from '../domain/hotlineChannel'

function channel(overrides: Partial<HotlineChannel> = {}): HotlineChannel {
  return {
    ...EXAMPLE_HOTLINE_CHANNEL,
    ...overrides,
  }
}

function call(overrides: Partial<HotlineCall> = {}): HotlineCall {
  return {
    ...EXAMPLE_HOTLINE_CALL,
    ...overrides,
  }
}

function baseline(overrides: Partial<HotlineGuidanceBaseline> = {}): HotlineGuidanceBaseline {
  return {
    ...EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    ...overrides,
  }
}

describe('hotlineChannel (SPE-2628 / SPE-956 slice 1)', () => {
  it('handles an in-threshold call and changes support routing', () => {
    const result = evaluateHotlineCall({
      channel: EXAMPLE_HOTLINE_CHANNEL,
      call: EXAMPLE_HOTLINE_CALL,
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    })

    expect(result.outcome).toBe('handled')
    expect(result.reasonCodes).toEqual(['hotline_handled'])
    expect(result.proposedAdjustment).toEqual({
      scope: 'support_routing',
      fromValue: 'standard_ops_desk',
      toValue: 'hotline_priority_callback',
    })
    expect(result.resolved.supportRouting).toBe('hotline_priority_callback')
    expect(result.resolved.guidance).toBe(EXAMPLE_HOTLINE_GUIDANCE_BASELINE.guidance)
    expect(result.baseline).toEqual(EXAMPLE_HOTLINE_GUIDANCE_BASELINE)
    expect(result.channelId).toBe('hotline:riverside-direct')
    expect(result.callId).toBe('call:riverside-support-routing')
  })

  it('handles a guidance-scope call when staffing and script quality meet the threshold', () => {
    const result = evaluateHotlineCall({
      channel: EXAMPLE_HOTLINE_CHANNEL,
      call: call({
        callId: 'call:riverside-guidance',
        proposedScope: 'guidance',
        proposedValue: 'clarify_evacuation_window',
      }),
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    })

    expect(result.outcome).toBe('handled')
    expect(result.proposedAdjustment).toEqual({
      scope: 'guidance',
      fromValue: 'broadcast_hold_message',
      toValue: 'clarify_evacuation_window',
    })
    expect(result.resolved.guidance).toBe('clarify_evacuation_window')
    expect(result.resolved.supportRouting).toBe(EXAMPLE_HOTLINE_GUIDANCE_BASELINE.supportRouting)
  })

  it('escalates when staffing and script quality fall below the handle threshold', () => {
    const result = evaluateHotlineCall({
      channel: channel({
        scriptQuality: 0.3,
        staffingCapacity: 0.4,
        handleThreshold: 0.5,
        unansweredMode: 'queue_callback',
      }),
      call: EXAMPLE_HOTLINE_CALL,
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    })

    expect(result.outcome).toBe('escalated')
    expect(result.reasonCodes).toEqual(['below_handle_threshold', 'hotline_escalated'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_HOTLINE_GUIDANCE_BASELINE)
    expect(result.handleScore).toBeLessThan(result.handleThreshold)
  })

  it('marks unanswered when below threshold and unansweredMode is mark_unanswered', () => {
    const result = evaluateHotlineCall({
      channel: channel({
        scriptQuality: 0.2,
        staffingCapacity: 0.2,
        handleThreshold: 0.5,
        unansweredMode: 'mark_unanswered',
      }),
      call: EXAMPLE_HOTLINE_CALL,
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    })

    expect(result.outcome).toBe('unanswered')
    expect(result.reasonCodes).toEqual(['below_handle_threshold', 'hotline_unanswered'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_HOTLINE_GUIDANCE_BASELINE)
  })

  it('returns anger_only without adjusting guidance when angerMode is anger_only', () => {
    const result = evaluateHotlineCall({
      channel: EXAMPLE_HOTLINE_CHANNEL,
      call: call({
        callId: 'call:riverside-anger',
        callerMode: 'anger',
      }),
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    })

    expect(result.outcome).toBe('anger_only')
    expect(result.reasonCodes).toEqual(['anger_only_mode'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_HOTLINE_GUIDANCE_BASELINE)
  })

  it('escalates when the caller requires language support the channel lacks', () => {
    const result = evaluateHotlineCall({
      channel: channel({ languageSupport: false }),
      call: call({ requiresLanguageSupport: true }),
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    })

    expect(result.outcome).toBe('escalated')
    expect(result.reasonCodes).toEqual(['hotline_escalated', 'language_unsupported'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_HOTLINE_GUIDANCE_BASELINE)
  })

  it('returns a deterministic unanswered no-op when evaluation input is missing', () => {
    const result = evaluateHotlineCall(undefined)

    expect(result.outcome).toBe('unanswered')
    expect(result.reasonCodes).toEqual(['missing_evaluation_input'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.channelId).toBeNull()
    expect(result.callId).toBeNull()
    expect(result.resolved).toEqual(result.baseline)
  })

  it('returns an unanswered no-op when channel, call, or baseline is missing', () => {
    const missingChannel = evaluateHotlineCall({
      channel: null,
      call: EXAMPLE_HOTLINE_CALL,
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    })
    expect(missingChannel.outcome).toBe('unanswered')
    expect(missingChannel.reasonCodes).toContain('missing_hotline_channel')
    expect(missingChannel.proposedAdjustment).toBeNull()
    expect(missingChannel.resolved).toEqual(EXAMPLE_HOTLINE_GUIDANCE_BASELINE)

    const missingCall = evaluateHotlineCall({
      channel: EXAMPLE_HOTLINE_CHANNEL,
      call: null,
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    })
    expect(missingCall.outcome).toBe('unanswered')
    expect(missingCall.reasonCodes).toContain('missing_hotline_call')
    expect(missingCall.proposedAdjustment).toBeNull()

    const missingBaseline = evaluateHotlineCall({
      channel: EXAMPLE_HOTLINE_CHANNEL,
      call: EXAMPLE_HOTLINE_CALL,
      baseline: null,
    })
    expect(missingBaseline.outcome).toBe('unanswered')
    expect(missingBaseline.reasonCodes).toContain('missing_guidance_baseline')
    expect(missingBaseline.proposedAdjustment).toBeNull()
  })

  it('returns unanswered when call channelId does not match the hotline channel', () => {
    const result = evaluateHotlineCall({
      channel: EXAMPLE_HOTLINE_CHANNEL,
      call: call({ channelId: 'hotline:other' }),
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    })

    expect(result.outcome).toBe('unanswered')
    expect(result.reasonCodes).toEqual(['channel_call_mismatch', 'hotline_unanswered'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_HOTLINE_GUIDANCE_BASELINE)
  })

  it('keeps reason codes unique and sorted across paths', () => {
    const handled = evaluateHotlineCall({
      channel: EXAMPLE_HOTLINE_CHANNEL,
      call: EXAMPLE_HOTLINE_CALL,
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    })
    const escalated = evaluateHotlineCall({
      channel: channel({
        scriptQuality: 0.3,
        staffingCapacity: 0.4,
        handleThreshold: 0.5,
      }),
      call: EXAMPLE_HOTLINE_CALL,
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    })

    expect(handled.reasonCodes).toEqual([...handled.reasonCodes].sort((a, b) => a.localeCompare(b)))
    expect(escalated.reasonCodes).toEqual(
      [...new Set(escalated.reasonCodes)].sort((a, b) => a.localeCompare(b))
    )
  })

  it('freezes the result envelope and does not mutate the baseline input', () => {
    const inputBaseline = baseline()
    const result = evaluateHotlineCall({
      channel: EXAMPLE_HOTLINE_CHANNEL,
      call: EXAMPLE_HOTLINE_CALL,
      baseline: inputBaseline,
    })

    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.reasonCodes)).toBe(true)
    expect(Object.isFrozen(result.resolved)).toBe(true)
    expect(Object.isFrozen(result.baseline)).toBe(true)
    expect(result.proposedAdjustment).not.toBeNull()
    expect(Object.isFrozen(result.proposedAdjustment)).toBe(true)
    expect(inputBaseline.supportRouting).toBe('standard_ops_desk')
    expect(result.resolved).not.toBe(inputBaseline)
    expect(result.baseline).not.toBe(inputBaseline)
  })

  it('returns byte-stable decisions for the same inputs', () => {
    const input = {
      channel: EXAMPLE_HOTLINE_CHANNEL,
      call: EXAMPLE_HOTLINE_CALL,
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    }

    const first = evaluateHotlineCall(input)
    const second = evaluateHotlineCall(input)

    expect(second).toEqual(first)
  })

  it('exposes an authored channel with script, staffing, escalation, and handling modes', () => {
    expect(EXAMPLE_HOTLINE_CHANNEL.scriptQuality).toBeGreaterThan(0)
    expect(EXAMPLE_HOTLINE_CHANNEL.staffingCapacity).toBeGreaterThan(0)
    expect(EXAMPLE_HOTLINE_CHANNEL.escalationRules.length).toBeGreaterThan(0)
    expect(EXAMPLE_HOTLINE_CHANNEL.unansweredMode).toBe('queue_callback')
    expect(EXAMPLE_HOTLINE_CHANNEL.angerMode).toBe('anger_only')
    expect(EXAMPLE_HOTLINE_CHANNEL.handleThreshold).toBeGreaterThan(0)
    expect(EXAMPLE_HOTLINE_CHANNEL.languageSupport).toBe(true)
  })

  it('returns unanswered for a partial baseline instead of inventing missing fields', () => {
    const result = evaluateHotlineCall({
      channel: EXAMPLE_HOTLINE_CHANNEL,
      call: EXAMPLE_HOTLINE_CALL,
      baseline: {
        incidentId: 'incident:partial',
        guidance: 'hold',
      } as HotlineGuidanceBaseline,
    })

    expect(result.outcome).toBe('unanswered')
    expect(result.reasonCodes).toEqual(['invalid_guidance_baseline'])
    expect(result.proposedAdjustment).toBeNull()
  })

  it('handles a call when handleThreshold is zero within the inclusive unit interval', () => {
    const result = evaluateHotlineCall({
      channel: channel({
        scriptQuality: 0.1,
        staffingCapacity: 0.1,
        handleThreshold: 0,
      }),
      call: EXAMPLE_HOTLINE_CALL,
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    })

    expect(result.outcome).toBe('handled')
    expect(result.handleThreshold).toBe(0)
    expect(result.proposedAdjustment).toEqual({
      scope: 'support_routing',
      fromValue: 'standard_ops_desk',
      toValue: 'hotline_priority_callback',
    })
  })

  it('returns unanswered for an incomplete channel before applying adjustments', () => {
    const result = evaluateHotlineCall({
      channel: {
        id: 'hotline:incomplete',
        scriptQuality: 0.9,
        staffingCapacity: 0.9,
        languageSupport: true,
        escalationRules: '',
        unansweredMode: 'queue_callback',
        angerMode: 'anger_only',
        handleThreshold: 0.5,
      },
      call: {
        ...EXAMPLE_HOTLINE_CALL,
        channelId: 'hotline:incomplete',
      },
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    })

    expect(result.outcome).toBe('unanswered')
    expect(result.reasonCodes).toEqual(['incomplete_hotline_channel'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_HOTLINE_GUIDANCE_BASELINE)
  })

  it('returns unanswered for malformed call fields before a channel mismatch reject path', () => {
    const result = evaluateHotlineCall({
      channel: EXAMPLE_HOTLINE_CHANNEL,
      call: call({
        channelId: 'hotline:other',
        proposedScope: 'invalid' as HotlineCall['proposedScope'],
      }),
      baseline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
    })

    expect(result.outcome).toBe('unanswered')
    expect(result.reasonCodes).toEqual(['missing_or_invalid_proposed_scope'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_HOTLINE_GUIDANCE_BASELINE)
  })
})
