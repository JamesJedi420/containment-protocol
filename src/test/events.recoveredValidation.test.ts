import { describe, expect, it } from 'vitest'
import { migrateEventV1toV2 } from '../domain/events/eventMigration'
import { validateOperationEventPayload } from '../domain/events/eventValidation'
import { minimalOperationEventPayloads } from './fixtures/minimalOperationEventPayloads'

describe('recovered operation event validation', () => {
  it('bounds assignment counts and rejects impossible assignments', () => {
    const base = minimalOperationEventPayloads['assignment.team_assigned']

    expect(
      validateOperationEventPayload('assignment.team_assigned', {
        ...base,
        assignedTeamCount: -1,
      }).success
    ).toBe(false)
    expect(
      validateOperationEventPayload('assignment.team_assigned', {
        ...base,
        assignedTeamCount: 3,
        maxTeams: 2,
      }).success
    ).toBe(false)
    expect(validateOperationEventPayload('assignment.team_assigned', base).success).toBe(true)
  })

  it('validates case enums, stages, transitions, deadlines, and raid team bounds', () => {
    const partial = minimalOperationEventPayloads['case.partially_resolved']
    const escalated = minimalOperationEventPayloads['case.escalated']
    const raid = minimalOperationEventPayloads['case.raid_converted']

    expect(
      validateOperationEventPayload('case.partially_resolved', {
        ...partial,
        mode: 'freeform',
      }).success
    ).toBe(false)
    expect(
      validateOperationEventPayload('case.partially_resolved', {
        ...partial,
        fromStage: 2,
        toStage: 1,
      }).success
    ).toBe(false)
    expect(
      validateOperationEventPayload('case.escalated', {
        ...escalated,
        deadlineRemaining: -1,
      }).success
    ).toBe(false)
    expect(
      validateOperationEventPayload('case.raid_converted', {
        ...raid,
        minTeams: 3,
        maxTeams: 2,
      }).success
    ).toBe(false)
    expect(validateOperationEventPayload('case.partially_resolved', partial).success).toBe(true)
  })

  it('validates recruitment tiers, reveal gates, and confirmed-tier presence', () => {
    const initiated = minimalOperationEventPayloads['recruitment.scouting_initiated']
    const confirmed = minimalOperationEventPayloads['recruitment.intel_confirmed']

    expect(
      validateOperationEventPayload('recruitment.scouting_initiated', {
        ...initiated,
        projectedTier: 'legendary',
      }).success
    ).toBe(false)
    expect(
      validateOperationEventPayload('recruitment.scouting_refined', {
        ...minimalOperationEventPayloads['recruitment.scouting_refined'],
        revealLevel: 1,
      }).success
    ).toBe(false)
    expect(
      validateOperationEventPayload('recruitment.intel_confirmed', {
        ...confirmed,
        confirmedTier: undefined,
      }).success
    ).toBe(false)
    expect(validateOperationEventPayload('recruitment.intel_confirmed', confirmed).success).toBe(
      true
    )
  })

  it('validates faction standing references, ranges, and delta arithmetic', () => {
    const base = minimalOperationEventPayloads['faction.standing_changed']

    expect(
      validateOperationEventPayload('faction.standing_changed', {
        ...base,
        factionId: 'unknown-faction',
      }).success
    ).toBe(false)
    expect(
      validateOperationEventPayload('faction.standing_changed', {
        ...base,
        standingAfter: 21,
      }).success
    ).toBe(false)
    expect(
      validateOperationEventPayload('faction.standing_changed', {
        ...base,
        delta: 2,
      }).success
    ).toBe(false)
    expect(validateOperationEventPayload('faction.standing_changed', base).success).toBe(true)
  })

  it('drops recovered invalid payload classes during v1 migration', () => {
    const invalidPayloads = [
      {
        type: 'case.failed',
        payload: {
          ...minimalOperationEventPayloads['case.failed'],
          fromStage: 2,
          toStage: 1,
        },
      },
      {
        type: 'recruitment.intel_confirmed',
        payload: {
          ...minimalOperationEventPayloads['recruitment.intel_confirmed'],
          confirmedTier: undefined,
        },
      },
      {
        type: 'faction.standing_changed',
        payload: {
          ...minimalOperationEventPayloads['faction.standing_changed'],
          delta: 99,
        },
      },
    ] as const

    for (const [index, event] of invalidPayloads.entries()) {
      expect(
        migrateEventV1toV2({
          id: `recovered-invalid-${index}`,
          schemaVersion: 1,
          type: event.type,
          timestamp: '2026-07-23T00:00:00.000Z',
          sourceSystem: 'system',
          payload: event.payload,
        })
      ).toBeNull()
    }
  })
})
