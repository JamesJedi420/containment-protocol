import { describe, expect, it } from 'vitest'
import {
  buildWeeklyIntakeCaseOutcomeMetadata,
  deriveWeeklyIntakeNarrativeSegments,
  extractWeeklyIntakeNarrativeSegmentsFromSourceRef,
  selectWeeklyIntakeCorroborationChannelToken,
  selectWeeklyIntakeCorroborationTraceToken,
} from '../domain/informationIntakeWeeklyNarrativeTemplates'

describe('informationIntakeWeeklyNarrativeTemplates (SPE-854 slice 9)', () => {
  it('builds outcome metadata from the primary linked case and merged topic tags', () => {
    const metadata = buildWeeklyIntakeCaseOutcomeMetadata(['case-beta', 'case-alpha'], [
      {
        id: 'case-alpha',
        stage: 3,
        status: 'in_progress',
        tags: ['occult'],
        requiredTags: ['investigation'],
        preferredTags: [],
      },
      {
        id: 'case-beta',
        stage: 1,
        status: 'open',
        tags: ['urban'],
        requiredTags: [],
        preferredTags: [],
      },
    ])

    expect(metadata).toEqual({
      primaryCaseId: 'case-alpha',
      stage: 3,
      resolution: 'in_progress',
      topicTags: ['investigation', 'occult', 'urban'],
    })
  })

  it('returns null metadata when no linked cases are provided', () => {
    expect(buildWeeklyIntakeCaseOutcomeMetadata([], [])).toBeNull()
  })

  it('selects stage-aware corroboration trace tokens for linked cases', () => {
    const earlyTrace = selectWeeklyIntakeCorroborationTraceToken({
      metadata: {
        primaryCaseId: 'case-1',
        stage: 1,
        resolution: 'open',
        topicTags: [],
      },
      hasLinkedCases: true,
      reportId: 'intake:formal-alert',
      week: 4,
      offset: 1,
    })
    const lateTrace = selectWeeklyIntakeCorroborationTraceToken({
      metadata: {
        primaryCaseId: 'case-1',
        stage: 6,
        resolution: 'open',
        topicTags: [],
      },
      hasLinkedCases: true,
      reportId: 'intake:formal-alert',
      week: 4,
      offset: 1,
    })

    expect(['initial-signal', 'emerging-pattern', 'first-contact']).toContain(earlyTrace)
    expect(['deep-corroboration', 'multi-source-lock', 'escalation-confirm']).toContain(lateTrace)
  })

  it('includes topic-tag channel tokens for in-progress linked cases', () => {
    const channel = selectWeeklyIntakeCorroborationChannelToken({
      metadata: {
        primaryCaseId: 'case-1',
        stage: 2,
        resolution: 'in_progress',
        topicTags: ['occult'],
      },
      hasLinkedCases: true,
      reportId: 'intake:linked-case',
      week: 2,
      offset: 3,
    })

    expect(['active-case-sync', 'field-routing', 'priority-channel', 'topic-occult']).toContain(channel)
  })

  it('derives narrative segments from sourceRef and falls back when segments are missing', () => {
    const sourceRef =
      'source:weekly-intake:formal-alert:case-001:trace-linked-case:channel-watchlist-match'
    const fromSourceRef = extractWeeklyIntakeNarrativeSegmentsFromSourceRef(sourceRef)

    expect(fromSourceRef).toEqual({
      trace: 'linked-case',
      channel: 'watchlist-match',
    })

    const derived = deriveWeeklyIntakeNarrativeSegments({
      sourceRef: 'source:weekly-intake:topic:case-001:trace-:channel-',
      eventKind: 'corroboration',
      metadata: {
        primaryCaseId: 'case-001',
        stage: 4,
        resolution: 'open',
        topicTags: ['occult'],
      },
      hasLinkedCases: true,
      reportId: 'intake:probe',
      week: 3,
    })

    expect(derived.trace).toBeTruthy()
    expect(derived.channel).toBeTruthy()
  })

  it('falls back to unlinked token pools when metadata is absent', () => {
    const trace = selectWeeklyIntakeCorroborationTraceToken({
      metadata: null,
      hasLinkedCases: false,
      reportId: 'intake:rumor',
      week: 1,
      offset: 0,
    })

    expect(['ambient-signal', 'community-thread', 'partner-check']).toContain(trace)
  })
})
