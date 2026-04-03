import { describe, expect, it } from 'vitest'
import { SIM_NOTES } from '../data/copy'
import { EVENT_NOTE_BUILDERS } from '../domain/sim/eventNoteBuilders'

describe('EVENT_NOTE_BUILDERS', () => {
  it('builds resolved notes with case metadata', () => {
    const note = EVENT_NOTE_BUILDERS.resolved('case-001', 'Ritual at the Docks', 2)

    expect(note).toEqual({
      content: SIM_NOTES.resolved('Ritual at the Docks'),
      type: 'case.resolved',
      metadata: {
        caseId: 'case-001',
        caseTitle: 'Ritual at the Docks',
        stage: 2,
      },
    })
  })

  it('builds partial notes with from/to stage metadata', () => {
    const note = EVENT_NOTE_BUILDERS.partial('case-002', 'Signal Interference', 2, 3)

    expect(note).toEqual({
      content: SIM_NOTES.partial('Signal Interference'),
      type: 'case.partially_resolved',
      metadata: {
        caseId: 'case-002',
        caseTitle: 'Signal Interference',
        fromStage: 2,
        toStage: 3,
      },
    })
  })

  it('builds failed notes using next stage in content and metadata', () => {
    const note = EVENT_NOTE_BUILDERS.failed('case-003', 'Eclipse Ritual', 3, 4)

    expect(note).toEqual({
      content: SIM_NOTES.failed('Eclipse Ritual', 4),
      type: 'case.failed',
      metadata: {
        caseId: 'case-003',
        caseTitle: 'Eclipse Ritual',
        fromStage: 3,
        toStage: 4,
      },
    })
  })

  it('builds escalated notes and preserves trigger source', () => {
    const deadline = EVENT_NOTE_BUILDERS.escalated(
      'case-004',
      'Unwatched Breach',
      1,
      2,
      'deadline'
    )
    const failure = EVENT_NOTE_BUILDERS.escalated(
      'case-004',
      'Unwatched Breach',
      2,
      3,
      'failure'
    )

    expect(deadline.type).toBe('case.escalated')
    expect(deadline.metadata).toMatchObject({
      caseId: 'case-004',
      fromStage: 1,
      toStage: 2,
      trigger: 'deadline',
    })
    expect(deadline.content).toBe(SIM_NOTES.deadline('Unwatched Breach', 2))

    expect(failure.type).toBe('case.escalated')
    expect(failure.metadata).toMatchObject({
      caseId: 'case-004',
      fromStage: 2,
      toStage: 3,
      trigger: 'failure',
    })
    expect(failure.content).toBe(SIM_NOTES.deadline('Unwatched Breach', 3))
  })

  it('builds week delta notes with numeric delta metadata', () => {
    const note = EVENT_NOTE_BUILDERS.weekDelta(-18)

    expect(note).toEqual({
      content: SIM_NOTES.weekDelta(-18),
      type: 'system.week_delta',
      metadata: {
        delta: -18,
      },
    })
  })

  it('builds recruitment pipeline notes for expired and generated candidates', () => {
    const expired = EVENT_NOTE_BUILDERS.recruitmentExpired(2)
    const generated = EVENT_NOTE_BUILDERS.recruitmentGenerated(5)

    expect(expired).toEqual({
      content: 'Recruitment pipeline expired 2 candidate(s).',
      type: 'system.recruitment_expired',
      metadata: {
        count: 2,
      },
    })
    expect(generated).toEqual({
      content: 'Recruitment pipeline generated 5 candidate(s).',
      type: 'system.recruitment_generated',
      metadata: {
        count: 5,
      },
    })
  })

  it('builds follow-up spawn notes with source case metadata', () => {
    const note = EVENT_NOTE_BUILDERS.spawnFollowUp('case-007', 'Fogbound Relay', 3)

    expect(note).toEqual({
      content: `Fogbound Relay: ${SIM_NOTES.spawnFollowUp(3)}`,
      type: 'case.spawned',
      metadata: {
        sourceCaseId: 'case-007',
        sourceCaseTitle: 'Fogbound Relay',
        count: 3,
      },
    })
  })

  it('builds raid conversion notes with source case metadata', () => {
    const note = EVENT_NOTE_BUILDERS.raidConverted('case-009', 'Rupture Protocol')

    expect(note).toEqual({
      content: `Rupture Protocol: ${SIM_NOTES.convertedToRaid()}`,
      type: 'case.raid_converted',
      metadata: {
        sourceCaseId: 'case-009',
        sourceCaseTitle: 'Rupture Protocol',
      },
    })
  })

  it('returns structured notes for every builder', () => {
    const notes = [
      EVENT_NOTE_BUILDERS.resolved('a', 'A', 1),
      EVENT_NOTE_BUILDERS.partial('b', 'B', 1, 2),
      EVENT_NOTE_BUILDERS.failed('c', 'C', 2, 3),
      EVENT_NOTE_BUILDERS.escalated('d', 'D', 1, 2, 'deadline'),
      EVENT_NOTE_BUILDERS.weekDelta(4),
      EVENT_NOTE_BUILDERS.recruitmentExpired(1),
      EVENT_NOTE_BUILDERS.recruitmentGenerated(2),
      EVENT_NOTE_BUILDERS.spawnFollowUp('e', 'E', 1),
      EVENT_NOTE_BUILDERS.raidConverted('f', 'F'),
    ]

    for (const note of notes) {
      expect(typeof note.content).toBe('string')
      expect(typeof note.type).toBe('string')
      expect(note.metadata).toBeTypeOf('object')
      expect(note.metadata).not.toBeNull()
    }
  })
})
