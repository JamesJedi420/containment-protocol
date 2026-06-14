import { describe, expect, it } from 'vitest'
import {
  COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
  COVER_STORY_STRESSED_FIXTURE,
  projectCoverStoryLifecycleView,
  type CoverStoryRecord,
} from '../domain/coverStoryLifecycleRegistry'
import {
  applyCoverStoryContradictionTriggers,
  applyWeeklyCoverStoryContradictionAccumulationTick,
  advanceCoverStoryRecordContradictionForWeek,
  COVER_STORY_CONTRADICTION_COLLAPSE_THRESHOLD,
  COVER_STORY_CONTRADICTION_STRESS_THRESHOLD,
  resolveWeeklyCoverStoryContradictionTriggers,
  type CoverStoryContradictionTrigger,
} from '../domain/coverStoryContradictionAccumulation'
import { applyWeeklyCoverStoryTick } from '../domain/coverStoryWeeklyOrchestration'
import {
  COVER_NARRATIVE_TRUTH_LAYER_FIXTURE,
  type TruthLayerRecordsMap,
} from '../domain/truthLayerRecordRegistry'
import {
  createInformationIntakeReport,
  type InformationIntakeReportsMap,
} from '../domain/informationIntakeReport'

function baseRecord(overrides: Partial<CoverStoryRecord> = {}): CoverStoryRecord {
  return {
    id: 'cover:test-accumulation',
    label: 'Test accumulation cover story',
    lifecyclePhase: 'maintained',
    subjectRef: 'site:coastal-research-campus',
    subjectKind: 'site',
    parentCaseRef: 'case:containment-response-24',
    linkedTruthLayerRef: 'truth:regional-press-cover-24',
    ...overrides,
  }
}

describe('coverStoryContradictionAccumulation (SPE-1347 slice 4)', () => {
  it('clamps channel accumulation scores to the unit interval', () => {
    const triggers: CoverStoryContradictionTrigger[] = [
      {
        kind: 'intake_witness_contradiction',
        channel: 'witness_testimony',
        delta: 0.9,
        sourceRef: 'witness:test-a',
      },
      {
        kind: 'intake_witness_contradiction',
        channel: 'witness_testimony',
        delta: 0.9,
        sourceRef: 'witness:test-b',
      },
    ]

    const next = applyCoverStoryContradictionTriggers(baseRecord(), triggers, 4)

    expect(next.contradictionChannels).toHaveLength(1)
    expect(next.contradictionChannels?.[0]?.accumulationScore).toBe(1)
  })

  it('is idempotent when the same trigger sourceRef is re-applied', () => {
    const trigger: CoverStoryContradictionTrigger = {
      kind: 'truth_layer_divergence',
      channel: 'institutional_records',
      delta: 0.15,
      sourceRef: 'truth-layer:divergence:truth:regional-press-cover-24:w5',
    }
    const record = baseRecord()

    const once = applyCoverStoryContradictionTriggers(record, [trigger], 5)
    const twice = applyCoverStoryContradictionTriggers(once, [trigger], 5)

    expect(twice).toBe(once)
  })

  it('resolves truth-layer divergence triggers for linked cover stories', () => {
    const truthLayerRecords: TruthLayerRecordsMap = {
      [COVER_NARRATIVE_TRUTH_LAYER_FIXTURE.id]: COVER_NARRATIVE_TRUTH_LAYER_FIXTURE,
    }

    const triggers = resolveWeeklyCoverStoryContradictionTriggers(baseRecord(), {
      week: 6,
      truthLayerRecords,
    })

    expect(triggers).toEqual([
      {
        kind: 'truth_layer_divergence',
        channel: 'institutional_records',
        delta: 0.15,
        sourceRef: 'truth-layer:divergence:truth:regional-press-cover-24:w6',
      },
    ])
  })

  it('resolves intake contradiction triggers from newly added weekly events', () => {
    const report = createInformationIntakeReport({
      id: 'intake:coastal-campus-witness',
      label: 'Coastal campus witness intake',
      topicRef: 'site:coastal-research-campus',
      initialSourceClass: 'field_witness',
      credibility: 'plausible',
      plausibility: 'plausible',
      rumorRisk: 'low',
    })
    const priorReports: InformationIntakeReportsMap = {
      [report.id]: report,
    }
    const nextReports: InformationIntakeReportsMap = {
      [report.id]: {
        ...report,
        contradictionHistory: [
          {
            eventId: 'weekly-intake:contradiction:intake:coastal-campus-witness:w7',
            week: 7,
            sourceRef: 'audit:weekly-intake:witness-mismatch',
            severity: 'major',
          },
        ],
      },
    }

    const triggers = resolveWeeklyCoverStoryContradictionTriggers(baseRecord(), {
      week: 7,
      priorIntakeReports: priorReports,
      nextIntakeReports: nextReports,
    })

    expect(triggers).toEqual([
      {
        kind: 'intake_witness_contradiction',
        channel: 'witness_testimony',
        delta: 0.22,
        sourceRef: 'audit:weekly-intake:witness-mismatch',
      },
    ])
  })

  it('returns no triggers for terminal lifecycle phases', () => {
    const triggers = resolveWeeklyCoverStoryContradictionTriggers(
      baseRecord({ lifecyclePhase: 'collapsed' }),
      {
        week: 3,
        truthLayerRecords: {
          [COVER_NARRATIVE_TRUTH_LAYER_FIXTURE.id]: COVER_NARRATIVE_TRUTH_LAYER_FIXTURE,
        },
      }
    )

    expect(triggers).toEqual([])
  })

  it('transitions maintained cover stories to stressed at the stress threshold', () => {
    const record = baseRecord({
      contradictionChannels: [
        {
          channel: 'witness_testimony',
          accumulationScore: COVER_STORY_CONTRADICTION_STRESS_THRESHOLD,
          sourceRef: 'witness:threshold',
        },
      ],
      contradictionPressure: COVER_STORY_CONTRADICTION_STRESS_THRESHOLD,
    })

    const next = advanceCoverStoryRecordContradictionForWeek(record, { week: 8 })

    expect(next.lifecyclePhase).toBe('stressed')
    expect(next.transitionHistory?.at(-1)?.event).toBe('contradiction_accumulated')
  })

  it('transitions stressed cover stories to collapsed at the collapse threshold', () => {
    const record = baseRecord({
      lifecyclePhase: 'stressed',
      contradictionChannels: [
        {
          channel: 'witness_testimony',
          accumulationScore: 0.9,
          sourceRef: 'witness:heavy',
        },
        {
          channel: 'institutional_records',
          accumulationScore: 0.82,
          sourceRef: 'record:heavy',
        },
      ],
      contradictionPressure: COVER_STORY_CONTRADICTION_COLLAPSE_THRESHOLD,
      transitionHistory: [
        {
          fromPhase: 'drafted',
          toPhase: 'maintained',
          week: 1,
          event: 'cover_deployed',
        },
        {
          fromPhase: 'maintained',
          toPhase: 'stressed',
          week: 2,
          event: 'contradiction_accumulated',
        },
      ],
    })

    const next = advanceCoverStoryRecordContradictionForWeek(record, { week: 9 })

    expect(next.lifecyclePhase).toBe('collapsed')
    expect(next.transitionHistory?.at(-1)?.event).toBe('cover_collapsed')
  })

  it('does not reveal hidden operational truth in post-accumulation projections', () => {
    const trigger: CoverStoryContradictionTrigger = {
      kind: 'intake_digital_trace',
      channel: 'digital_traces',
      delta: 0.14,
      sourceRef: 'trace:forum-post-metadata',
    }
    const next = applyCoverStoryContradictionTriggers(COVER_STORY_STRESSED_FIXTURE, [trigger], 24)
    const projection = projectCoverStoryLifecycleView(next)

    expect(projection.contradictionChannelHints).toContain('digital_traces')
    expect(projection.summary).toBe(COVER_STORY_STRESSED_FIXTURE.summary ?? null)
    expect(JSON.stringify(projection)).not.toMatch(/foundation|scp|masquerade/i)
  })

  it('applies weekly accumulation across records in stable id order', () => {
    const records = {
      [COVER_STORY_STRESSED_FIXTURE.id]: COVER_STORY_STRESSED_FIXTURE,
      [COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id]: COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
    }

    const next = applyWeeklyCoverStoryContradictionAccumulationTick(records, {
      week: 10,
      truthLayerRecords: {
        [COVER_NARRATIVE_TRUTH_LAYER_FIXTURE.id]: COVER_NARRATIVE_TRUTH_LAYER_FIXTURE,
      },
    })

    expect(next[COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id]).not.toBe(
      COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE
    )
    expect(
      next[COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id]?.contradictionChannels?.length
    ).toBeGreaterThan(0)
  })

  it('keeps orchestration idempotent when contradiction accumulation re-ticks the same week', () => {
    const records = {
      [COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id]: COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
    }
    const contradictionInput = {
      truthLayerRecords: {
        [COVER_NARRATIVE_TRUTH_LAYER_FIXTURE.id]: COVER_NARRATIVE_TRUTH_LAYER_FIXTURE,
      },
    }

    const once = applyWeeklyCoverStoryTick(records, 11, {}, { contradictionInput })
    const twice = applyWeeklyCoverStoryTick(once.records, 11, once.snapshots, {
      contradictionInput,
    })

    expect(twice.records).toBe(once.records)
    expect(twice.snapshots).toBe(once.snapshots)
  })

  it('preserves records byte-stable when no contradiction triggers resolve', () => {
    const records = {
      [COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id]: COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
    }

    const next = applyWeeklyCoverStoryTick(records, 4, {}, { contradictionInput: {} })

    expect(next.records).toBe(records)
  })
})
