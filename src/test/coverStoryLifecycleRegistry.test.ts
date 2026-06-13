import { describe, expect, it } from 'vitest'
import {
  COASTAL_CAMPUS_COVER_STORY_FIXTURES,
  COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
  COVER_STORY_COLLAPSED_FIXTURE,
  COVER_STORY_CONTRADICTION_CHANNEL_KINDS,
  COVER_STORY_LIFECYCLE_PHASES,
  COVER_STORY_LIFECYCLE_TRANSITIONS,
  COVER_STORY_STAGED_RESPONSES,
  COVER_STORY_STRESSED_FIXTURE,
  COVER_STORY_SUBJECT_KINDS,
  INSTITUTIONAL_FACE_SAVING_COVER_FIXTURE,
  MAX_COVER_STORY_RECORDS,
  DEFAULT_COVER_STORY_LIFECYCLE_PHASE,
  isValidCoverStoryLifecycleTransition,
  projectCoverStoryLifecycleView,
  sanitizeCoverStoryRecords,
  transitionCoverStoryLifecyclePhase,
  validateCoverStoryRecord,
  type CoverStoryRecord,
} from '../domain/coverStoryLifecycleRegistry'
import {
  COASTAL_CAMPUS_COVER_STORY_TRUTH_LAYER_ANCHOR_FIXTURES,
  resolveCoverStoryTruthLayerAnchor,
} from '../domain/coverStoryLifecycleTruthLayerAnchor'
import { COVER_NARRATIVE_TRUTH_LAYER_FIXTURE } from '../domain/truthLayerRecordRegistry'

function baseRecord(overrides: Partial<CoverStoryRecord> = {}): CoverStoryRecord {
  return {
    id: 'cover:test-base',
    label: 'Test base cover story',
    lifecyclePhase: 'drafted',
    subjectRef: 'event:test-incident',
    subjectKind: 'event',
    ...overrides,
  }
}

describe('coverStoryLifecycleRegistry (SPE-1347 slice 1)', () => {
  it('defines lifecycle phases from drafted through terminal states', () => {
    expect(COVER_STORY_LIFECYCLE_PHASES).toEqual([
      'drafted',
      'maintained',
      'stressed',
      'collapsed',
      'repairing',
      'abandoned',
      'replaced',
    ])
    expect(DEFAULT_COVER_STORY_LIFECYCLE_PHASE).toBe('drafted')
  })

  it('defines the compact maintenance-through-collapse transition graph', () => {
    expect(COVER_STORY_LIFECYCLE_TRANSITIONS.drafted.cover_deployed).toBe('maintained')
    expect(COVER_STORY_LIFECYCLE_TRANSITIONS.maintained.contradiction_accumulated).toBe('stressed')
    expect(COVER_STORY_LIFECYCLE_TRANSITIONS.stressed.cover_collapsed).toBe('collapsed')
    expect(COVER_STORY_LIFECYCLE_TRANSITIONS.collapsed.repair_initiated).toBe('repairing')
    expect(COVER_STORY_LIFECYCLE_TRANSITIONS.repairing.repair_stabilized).toBe('maintained')
  })

  it('rejects invalid transitions by preserving the current phase', () => {
    expect(transitionCoverStoryLifecyclePhase('drafted', 'cover_collapsed')).toBe('drafted')
    expect(transitionCoverStoryLifecyclePhase('abandoned', 'repair_initiated')).toBe('abandoned')
    expect(isValidCoverStoryLifecycleTransition('maintained', 'repair_stabilized')).toBe(false)
  })

  it('validates maintained coastal campus fixture linked to truth-layer cover narrative', () => {
    const result = validateCoverStoryRecord(COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE)

    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
    expect(COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.linkedTruthLayerRef).toBe(
      COVER_NARRATIVE_TRUTH_LAYER_FIXTURE.id
    )
    expect(COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.lifecyclePhase).toBe('maintained')
  })

  it('validates institutional face-saving cover with non-paranormal political exposure', () => {
    const result = validateCoverStoryRecord(INSTITUTIONAL_FACE_SAVING_COVER_FIXTURE)

    expect(result.valid).toBe(true)
    expect(INSTITUTIONAL_FACE_SAVING_COVER_FIXTURE.coverMotivation).toBe('shame')
    expect(INSTITUTIONAL_FACE_SAVING_COVER_FIXTURE.exposureKind).toBe('political')
    expect(INSTITUTIONAL_FACE_SAVING_COVER_FIXTURE.subjectKind).toBe('institution')
  })

  it('validates stressed fixture with contradiction channels and pending repair', () => {
    const result = validateCoverStoryRecord(COVER_STORY_STRESSED_FIXTURE)

    expect(result.valid).toBe(true)
    expect(COVER_STORY_STRESSED_FIXTURE.contradictionChannels).toHaveLength(2)
    expect(COVER_STORY_STRESSED_FIXTURE.lifecyclePhase).toBe('stressed')
    expect(COVER_STORY_STRESSED_FIXTURE.activeStagedResponse).toBe('reinforcement')
  })

  it('validates collapsed fixture with stressed history and failed repair', () => {
    const result = validateCoverStoryRecord(COVER_STORY_COLLAPSED_FIXTURE)

    expect(result.valid).toBe(true)
    expect(COVER_STORY_COLLAPSED_FIXTURE.transitionHistory?.some((entry) => entry.toPhase === 'stressed')).toBe(
      true
    )
    expect(COVER_STORY_COLLAPSED_FIXTURE.repairActionHistory?.[0]?.outcome).toBe('worsened')
  })

  it('projects lifecycle view with contradiction channel hints without hidden operational truth', () => {
    const projection = projectCoverStoryLifecycleView(COVER_STORY_STRESSED_FIXTURE)

    expect(projection.coverStressActive).toBe(true)
    expect(projection.contradictionChannelHints).toEqual(['digital_traces', 'witness_testimony'])
    expect(projection.activeContradictionChannelCount).toBe(2)
    expect(projection.latestRepairAction).toBe('reinforcement')
    expect(projection.repairInProgress).toBe(false)
    expect(projection.label).not.toMatch(/foundation|scp|masquerade/i)
  })

  it('derives contradiction pressure from channel accumulation scores when scalar omitted', () => {
    const record = baseRecord({
      lifecyclePhase: 'stressed',
      contradictionChannels: [
        { channel: 'witness_testimony', accumulationScore: 0.8 },
        { channel: 'family_suspicion', accumulationScore: 0.4 },
      ],
    })

    const projection = projectCoverStoryLifecycleView(record)

    expect(projection.contradictionPressure).toBeCloseTo(0.6, 5)
  })

  it('errors on franchise token in record label', () => {
    const result = validateCoverStoryRecord(
      baseRecord({
        label: 'Foundation cover narrative maintenance',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })

  it('errors on invalid lifecycle transition in transitionHistory', () => {
    const result = validateCoverStoryRecord(
      baseRecord({
        lifecyclePhase: 'maintained',
        transitionHistory: [
          {
            fromPhase: 'drafted',
            toPhase: 'collapsed',
            week: 10,
          },
        ],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'invalid_lifecycle_transition')).toBe(true)
  })

  it('errors when lifecyclePhase does not match transitionHistory terminal phase', () => {
    const result = validateCoverStoryRecord(
      baseRecord({
        lifecyclePhase: 'maintained',
        transitionHistory: [
          {
            fromPhase: 'drafted',
            toPhase: 'stressed',
            week: 10,
          },
        ],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'lifecycle_phase_history_mismatch')).toBe(
      true
    )
  })

  it('warns when repair actions appear after abandonment in history', () => {
    const result = validateCoverStoryRecord(
      baseRecord({
        lifecyclePhase: 'abandoned',
        repairActionHistory: [
          { action: 'abandonment', week: 12, outcome: 'stabilized' },
          { action: 'revision', week: 13, outcome: 'pending' },
        ],
        transitionHistory: [
          { fromPhase: 'drafted', toPhase: 'maintained', week: 10 },
          { fromPhase: 'maintained', toPhase: 'abandoned', week: 12 },
        ],
      })
    )

    expect(result.valid).toBe(true)
    expect(result.issues.some((issue) => issue.code === 'repair_after_abandonment_in_history')).toBe(
      true
    )
  })

  it('returns fallback for empty sanitize input without throw', () => {
    expect(sanitizeCoverStoryRecords(undefined)).toEqual({})
    expect(sanitizeCoverStoryRecords(null)).toEqual({})
    expect(sanitizeCoverStoryRecords({})).toEqual({})
  })

  it('drops invalid entries and enforces MAX_COVER_STORY_RECORDS bound on sanitize', () => {
    const invalidPayload = {
      bad: { id: '', label: 'Bad', lifecyclePhase: 'drafted', subjectRef: 'x', subjectKind: 'event' },
      good: COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
      invalidPhase: {
        id: 'cover:invalid-phase',
        label: 'Invalid phase',
        lifecyclePhase: 'not-a-phase',
        subjectRef: 'event:test',
        subjectKind: 'event',
      },
    }

    const sanitized = sanitizeCoverStoryRecords(invalidPayload)

    expect(Object.keys(sanitized)).toEqual([COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id])

    const overflow: Record<string, CoverStoryRecord> = {}
    for (let index = 0; index < MAX_COVER_STORY_RECORDS + 5; index += 1) {
      overflow[`cover:overflow-${index}`] = baseRecord({
        id: `cover:overflow-${index}`,
        label: `Overflow ${index}`,
        lifecyclePhase: 'drafted',
      })
    }

    const bounded = sanitizeCoverStoryRecords(overflow)
    expect(Object.keys(bounded)).toHaveLength(MAX_COVER_STORY_RECORDS)
  })

  it('round-trips fixture map through sanitize', () => {
    const sanitized = sanitizeCoverStoryRecords(COASTAL_CAMPUS_COVER_STORY_FIXTURES)

    expect(sanitized).toEqual(COASTAL_CAMPUS_COVER_STORY_FIXTURES)
  })

  it('round-trips union vocabularies on validation', () => {
    const record = baseRecord({
      lifecyclePhase: 'stressed',
      subjectKind: 'relationship',
      coverMotivation: 'social_anxiety',
      exposureKind: 'personal',
      activeStagedResponse: 'suppression',
      contradictionChannels: COVER_STORY_CONTRADICTION_CHANNEL_KINDS.map((channel, index) => ({
        channel,
        accumulationScore: 0.1 * (index + 1),
      })),
    })

    const result = validateCoverStoryRecord(record)

    expect(result.valid).toBe(true)
    expect(COVER_STORY_SUBJECT_KINDS).toContain(record.subjectKind)
    expect(COVER_STORY_STAGED_RESPONSES).toContain(record.activeStagedResponse)
  })

  it('validates repeated validation byte-stable', () => {
    const first = validateCoverStoryRecord(COVER_STORY_COLLAPSED_FIXTURE)
    const second = validateCoverStoryRecord(COVER_STORY_COLLAPSED_FIXTURE)

    expect(first).toEqual(second)
  })
})

describe('coverStoryLifecycleTruthLayerAnchor (SPE-1347 slice 1)', () => {
  it('resolves dual-incident pairing anchor for coastal campus cover story', () => {
    const anchor = resolveCoverStoryTruthLayerAnchor(
      COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
      COASTAL_CAMPUS_COVER_STORY_TRUTH_LAYER_ANCHOR_FIXTURES.truthLayerRecords
    )

    expect(anchor.linkedTruthLayerRecord?.id).toBe(COVER_NARRATIVE_TRUTH_LAYER_FIXTURE.id)
    expect(anchor.dualIncidentPairing?.coverNarrativeRecord?.id).toBe(
      COVER_NARRATIVE_TRUTH_LAYER_FIXTURE.id
    )
    expect(anchor.dualIncidentPairing?.operationalRecord).not.toBeNull()
    expect(anchor.dualIncidentPairing?.coverNarrativeRecord?.claim.narrative).not.toBe(
      anchor.dualIncidentPairing?.operationalRecord?.verification.narrative
    )
  })

  it('returns null siblings for empty truth-layer map without throw', () => {
    const anchor = resolveCoverStoryTruthLayerAnchor(
      COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
      {}
    )

    expect(anchor.linkedTruthLayerRecord).toBeNull()
    expect(anchor.dualIncidentPairing).toBeNull()
  })
})
