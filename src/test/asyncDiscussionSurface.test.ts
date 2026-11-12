import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_DISCUSSION_BASELINE,
  EXAMPLE_DISCUSSION_SESSION,
  EXAMPLE_DISCUSSION_SURFACE,
  evaluateAsyncDiscussionSession,
  type DiscussionMemoryBaseline,
  type DiscussionSession,
  type DiscussionSurface,
} from '../domain/asyncDiscussionSurface'

function surface(overrides: Partial<DiscussionSurface> = {}): DiscussionSurface {
  return {
    ...EXAMPLE_DISCUSSION_SURFACE,
    ...overrides,
    participationWindow: {
      ...EXAMPLE_DISCUSSION_SURFACE.participationWindow,
      ...(overrides.participationWindow ?? {}),
    },
  }
}

function session(overrides: Partial<DiscussionSession> = {}): DiscussionSession {
  return {
    ...EXAMPLE_DISCUSSION_SESSION,
    ...overrides,
  }
}

function baseline(overrides: Partial<DiscussionMemoryBaseline> = {}): DiscussionMemoryBaseline {
  return {
    ...EXAMPLE_DISCUSSION_BASELINE,
    ...overrides,
  }
}

describe('asyncDiscussionSurface (SPE-2629 / SPE-956 slice 1)', () => {
  it('widens participation for an in-window open_async session', () => {
    const result = evaluateAsyncDiscussionSession({
      surface: EXAMPLE_DISCUSSION_SURFACE,
      session: EXAMPLE_DISCUSSION_SESSION,
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })

    expect(result.outcome).toBe('widened')
    expect(result.reasonCodes).toEqual(['discussion_widened'])
    expect(result.proposedAdjustment).toEqual({
      scope: 'participation',
      fromValue: 'live_meeting_only',
      toValue: 'async_resident_thread',
    })
    expect(result.resolved.participation).toBe('async_resident_thread')
    expect(result.resolved.institutionalMemory).toBe(
      EXAMPLE_DISCUSSION_BASELINE.institutionalMemory
    )
    expect(result.baseline).toEqual(EXAMPLE_DISCUSSION_BASELINE)
    expect(result.surfaceId).toBe('discussion:riverside-async-board')
    expect(result.sessionId).toBe('session:riverside-widen-async')
  })

  it('records institutional memory when retention and stabilization allow it', () => {
    const result = evaluateAsyncDiscussionSession({
      surface: surface({
        transcriptRetentionMode: 'institutional',
        memoryStabilization: true,
      }),
      session: session({
        sessionId: 'session:riverside-stabilize-memory',
        intent: 'stabilize_memory',
        proposedScope: 'institutional_memory',
        proposedValue: 'retain_evac_consensus_notes',
      }),
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })

    expect(result.outcome).toBe('recorded')
    expect(result.reasonCodes).toEqual(['discussion_recorded', 'memory_stabilized'])
    expect(result.proposedAdjustment).toEqual({
      scope: 'institutional_memory',
      fromValue: 'meeting_minutes_volatile',
      toValue: 'retain_evac_consensus_notes',
    })
    expect(result.resolved.institutionalMemory).toBe('retain_evac_consensus_notes')
    expect(result.resolved.participation).toBe(EXAMPLE_DISCUSSION_BASELINE.participation)
  })

  it('defers when the session week is outside the participation window', () => {
    const result = evaluateAsyncDiscussionSession({
      surface: EXAMPLE_DISCUSSION_SURFACE,
      session: session({ week: 40 }),
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })

    expect(result.outcome).toBe('deferred')
    expect(result.reasonCodes).toEqual(['outside_participation_window'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_DISCUSSION_BASELINE)
  })

  it('defers under incomplete transcript retention for record intent', () => {
    const result = evaluateAsyncDiscussionSession({
      surface: surface({ transcriptRetentionMode: 'ephemeral' }),
      session: session({
        sessionId: 'session:riverside-record-ephemeral',
        intent: 'record',
        proposedScope: 'institutional_memory',
        proposedValue: 'scratch_note',
      }),
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })

    expect(result.outcome).toBe('deferred')
    expect(result.reasonCodes).toEqual(['incomplete_transcript_retention'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_DISCUSSION_BASELINE)
  })

  it('rejects widen intent when the surface widening rule is closed', () => {
    const result = evaluateAsyncDiscussionSession({
      surface: surface({ wideningRule: 'closed' }),
      session: EXAMPLE_DISCUSSION_SESSION,
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })

    expect(result.outcome).toBe('rejected')
    expect(result.reasonCodes).toEqual(['discussion_rejected', 'widening_not_allowed'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_DISCUSSION_BASELINE)
  })

  it('widens participation when the surface widening rule is invite_extend', () => {
    const result = evaluateAsyncDiscussionSession({
      surface: surface({ wideningRule: 'invite_extend' }),
      session: EXAMPLE_DISCUSSION_SESSION,
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })

    expect(result.outcome).toBe('widened')
    expect(result.reasonCodes).toEqual(['discussion_widened'])
    expect(result.proposedAdjustment).toEqual({
      scope: 'participation',
      fromValue: 'live_meeting_only',
      toValue: 'async_resident_thread',
    })
  })

  it('defers stabilize_memory when retention is not institutional', () => {
    const result = evaluateAsyncDiscussionSession({
      surface: surface({
        transcriptRetentionMode: 'session_bound',
        memoryStabilization: true,
      }),
      session: session({
        intent: 'stabilize_memory',
        proposedScope: 'institutional_memory',
        proposedValue: 'retain_evac_consensus_notes',
      }),
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })

    expect(result.outcome).toBe('deferred')
    expect(result.reasonCodes).toEqual(['incomplete_transcript_retention'])
    expect(result.proposedAdjustment).toBeNull()
  })

  it('rejects stabilize_memory when memoryStabilization is disabled', () => {
    const result = evaluateAsyncDiscussionSession({
      surface: surface({
        transcriptRetentionMode: 'institutional',
        memoryStabilization: false,
      }),
      session: session({
        intent: 'stabilize_memory',
        proposedScope: 'institutional_memory',
        proposedValue: 'retain_evac_consensus_notes',
      }),
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })

    expect(result.outcome).toBe('rejected')
    expect(result.reasonCodes).toEqual(['discussion_rejected', 'memory_stabilization_disabled'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_DISCUSSION_BASELINE)
  })

  it('returns a deterministic deferred no-op when evaluation input is missing', () => {
    const result = evaluateAsyncDiscussionSession(undefined)

    expect(result.outcome).toBe('deferred')
    expect(result.reasonCodes).toEqual(['missing_evaluation_input'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.surfaceId).toBeNull()
    expect(result.sessionId).toBeNull()
    expect(result.resolved).toEqual(result.baseline)
  })

  it('returns a deferred no-op when surface, session, or baseline is missing', () => {
    const missingSurface = evaluateAsyncDiscussionSession({
      surface: null,
      session: EXAMPLE_DISCUSSION_SESSION,
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })
    expect(missingSurface.outcome).toBe('deferred')
    expect(missingSurface.reasonCodes).toContain('missing_discussion_surface')
    expect(missingSurface.proposedAdjustment).toBeNull()
    expect(missingSurface.resolved).toEqual(EXAMPLE_DISCUSSION_BASELINE)

    const missingSession = evaluateAsyncDiscussionSession({
      surface: EXAMPLE_DISCUSSION_SURFACE,
      session: null,
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })
    expect(missingSession.outcome).toBe('deferred')
    expect(missingSession.reasonCodes).toContain('missing_discussion_session')
    expect(missingSession.proposedAdjustment).toBeNull()

    const missingBaseline = evaluateAsyncDiscussionSession({
      surface: EXAMPLE_DISCUSSION_SURFACE,
      session: EXAMPLE_DISCUSSION_SESSION,
      baseline: null,
    })
    expect(missingBaseline.outcome).toBe('deferred')
    expect(missingBaseline.reasonCodes).toContain('missing_discussion_baseline')
    expect(missingBaseline.proposedAdjustment).toBeNull()
  })

  it('rejects when session surfaceId does not match the discussion surface', () => {
    const result = evaluateAsyncDiscussionSession({
      surface: EXAMPLE_DISCUSSION_SURFACE,
      session: session({ surfaceId: 'discussion:other' }),
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })

    expect(result.outcome).toBe('rejected')
    expect(result.reasonCodes).toEqual(['discussion_rejected', 'surface_session_mismatch'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_DISCUSSION_BASELINE)
  })

  it('rejects widen intent when proposed scope is not participation', () => {
    const result = evaluateAsyncDiscussionSession({
      surface: EXAMPLE_DISCUSSION_SURFACE,
      session: session({
        proposedScope: 'institutional_memory',
        proposedValue: 'retain_evac_consensus_notes',
      }),
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })

    expect(result.outcome).toBe('rejected')
    expect(result.reasonCodes).toEqual(['discussion_rejected', 'intent_scope_mismatch'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_DISCUSSION_BASELINE)
  })

  it('rejects stabilize_memory when proposed scope is not institutional_memory', () => {
    const result = evaluateAsyncDiscussionSession({
      surface: surface({
        transcriptRetentionMode: 'institutional',
        memoryStabilization: true,
      }),
      session: session({
        intent: 'stabilize_memory',
        proposedScope: 'participation',
        proposedValue: 'async_resident_thread',
      }),
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })

    expect(result.outcome).toBe('rejected')
    expect(result.reasonCodes).toEqual(['discussion_rejected', 'intent_scope_mismatch'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_DISCUSSION_BASELINE)
  })

  it('keeps reason codes unique and sorted across paths', () => {
    const widened = evaluateAsyncDiscussionSession({
      surface: EXAMPLE_DISCUSSION_SURFACE,
      session: EXAMPLE_DISCUSSION_SESSION,
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })
    const rejected = evaluateAsyncDiscussionSession({
      surface: surface({ wideningRule: 'closed' }),
      session: EXAMPLE_DISCUSSION_SESSION,
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })

    expect(widened.reasonCodes).toEqual([...widened.reasonCodes].sort((a, b) => a.localeCompare(b)))
    expect(rejected.reasonCodes).toEqual(
      [...new Set(rejected.reasonCodes)].sort((a, b) => a.localeCompare(b))
    )
  })

  it('freezes the result envelope and does not mutate the baseline input', () => {
    const inputBaseline = baseline()
    const result = evaluateAsyncDiscussionSession({
      surface: EXAMPLE_DISCUSSION_SURFACE,
      session: EXAMPLE_DISCUSSION_SESSION,
      baseline: inputBaseline,
    })

    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.reasonCodes)).toBe(true)
    expect(Object.isFrozen(result.resolved)).toBe(true)
    expect(Object.isFrozen(result.baseline)).toBe(true)
    expect(result.proposedAdjustment).not.toBeNull()
    expect(Object.isFrozen(result.proposedAdjustment)).toBe(true)
    expect(inputBaseline.participation).toBe('live_meeting_only')
    expect(result.resolved).not.toBe(inputBaseline)
    expect(result.baseline).not.toBe(inputBaseline)
  })

  it('returns byte-stable decisions for the same inputs', () => {
    const input = {
      surface: EXAMPLE_DISCUSSION_SURFACE,
      session: EXAMPLE_DISCUSSION_SESSION,
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    }

    const first = evaluateAsyncDiscussionSession(input)
    const second = evaluateAsyncDiscussionSession(input)

    expect(second).toEqual(first)
  })

  it('exposes an authored surface with window, retention, and widening rules', () => {
    expect(EXAMPLE_DISCUSSION_SURFACE.participationWindow.startWeek).toBeLessThanOrEqual(
      EXAMPLE_DISCUSSION_SURFACE.participationWindow.endWeek
    )
    expect(EXAMPLE_DISCUSSION_SURFACE.transcriptRetentionMode).toBe('session_bound')
    expect(EXAMPLE_DISCUSSION_SURFACE.wideningRule).toBe('open_async')
    expect(EXAMPLE_DISCUSSION_SURFACE.memoryStabilization).toBe(false)
  })

  it('defers for an incomplete surface before applying adjustments', () => {
    const result = evaluateAsyncDiscussionSession({
      surface: {
        id: 'discussion:incomplete',
        participationWindow: { startWeek: 5, endWeek: 1 },
        transcriptRetentionMode: 'session_bound',
        wideningRule: 'open_async',
        memoryStabilization: false,
      },
      session: {
        ...EXAMPLE_DISCUSSION_SESSION,
        surfaceId: 'discussion:incomplete',
      },
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })

    expect(result.outcome).toBe('deferred')
    expect(result.reasonCodes).toEqual(['incomplete_discussion_surface'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_DISCUSSION_BASELINE)
  })

  it('defers for a partial baseline instead of inventing missing fields', () => {
    const result = evaluateAsyncDiscussionSession({
      surface: EXAMPLE_DISCUSSION_SURFACE,
      session: EXAMPLE_DISCUSSION_SESSION,
      baseline: {
        topicId: 'topic:partial',
        participation: 'live_meeting_only',
      } as DiscussionMemoryBaseline,
    })

    expect(result.outcome).toBe('deferred')
    expect(result.reasonCodes).toEqual(['invalid_discussion_baseline'])
    expect(result.proposedAdjustment).toBeNull()
  })

  it('records a valid session_bound record intent without widening', () => {
    const result = evaluateAsyncDiscussionSession({
      surface: EXAMPLE_DISCUSSION_SURFACE,
      session: session({
        sessionId: 'session:riverside-record',
        intent: 'record',
        proposedScope: 'participation',
        proposedValue: 'thread_note_logged',
      }),
      baseline: EXAMPLE_DISCUSSION_BASELINE,
    })

    expect(result.outcome).toBe('recorded')
    expect(result.reasonCodes).toEqual(['discussion_recorded'])
    expect(result.proposedAdjustment).toEqual({
      scope: 'participation',
      fromValue: 'live_meeting_only',
      toValue: 'thread_note_logged',
    })
  })
})
