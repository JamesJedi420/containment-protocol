import { describe, it, expect } from 'vitest'
import { OPERATION_EVENT_TYPES } from '../../app/store/runTransfer'
import { operationEventPayloadSchemas } from './eventValidation'
import type { OperationEventType } from './types'
import { getEventMigrator, migrateEventV1toV2 } from './eventMigration'
import { minimalOperationEventPayloads } from '../../test/fixtures/minimalOperationEventPayloads'

const validV1 = {
  id: 'evt-001',
  schemaVersion: 1,
  type: 'assignment.team_assigned',
  payload: {
    week: 1,
    caseId: 'case-001',
    caseTitle: 'Test Case',
    caseKind: 'case',
    teamId: 'team-001',
    teamName: 'Alpha',
    assignedTeamCount: 1,
    maxTeams: 2,
  },
}

const invalidV1 = {
  id: 'evt-002',
  schemaVersion: 1,
  type: 'assignment.team_assigned',
  payload: {
    week: 'not-a-number', // invalid
    caseId: 123, // invalid
    caseTitle: 'Test Case',
    caseKind: 'case',
    teamId: 'team-001',
    teamName: 'Alpha',
    assignedTeamCount: 1,
    maxTeams: 2,
  },
}

describe('hydration allowlists (501-502)', () => {
  it('501 keeps OPERATION_EVENT_TYPES aligned with operationEventPayloadSchemas + legacy faction.activity', () => {
    const schemaTypes = Object.keys(operationEventPayloadSchemas).sort() as OperationEventType[]
    const hydrationTypes = [...OPERATION_EVENT_TYPES]
      .filter((type) => type !== 'faction.activity')
      .sort()

    expect(hydrationTypes).toEqual(schemaTypes)
    expect(OPERATION_EVENT_TYPES).toContain('case.aggregate_battle')
    expect(OPERATION_EVENT_TYPES).toContain('agent.killed')
    expect(OPERATION_EVENT_TYPES).toContain('faction.activity')
    expect(OPERATION_EVENT_TYPES).toContain('agency.front_business.opened')
    expect(OPERATION_EVENT_TYPES).toContain('staff.coping.applied')
    expect(OPERATION_EVENT_TYPES).toContain('system.equipment_recovered')
  })
})

describe('hydration problems 519-526 (schema migration)', () => {
  it('migrates agency, staff, and equipment operation events to schema v2', () => {
    const types = [
      'agency.front_business.opened',
      'agency.front_business.resolved',
      'staff.coping.applied',
      'staff.coping.misconduct',
      'staff.side_work.resolved',
      'system.equipment_recovered',
    ] as const satisfies readonly OperationEventType[]

    for (const type of types) {
      const migrated = migrateEventV1toV2({
        id: `evt-${type}`,
        schemaVersion: 1,
        type,
        payload: minimalOperationEventPayloads[type],
      })

      expect(migrated?.schemaVersion).toBe(2)
      expect(migrated?.type).toBe(type)
    }
  })
})

describe('hydration problems 527-534 (schema migration)', () => {
  it('migrates infiltration and concealment operation events to schema v2', () => {
    const types = [
      'infiltration.awareness_complication',
      'infiltration.escalation_exposed',
      'infiltration.escalation_violent',
      'infiltration.cover_strain',
      'infiltration.weekly_encounter',
      'infiltration.leave_behind_tradeoff',
      'concealment.activated',
    ] as const satisfies readonly OperationEventType[]

    for (const type of types) {
      const migrated = migrateEventV1toV2({
        id: `evt-${type}`,
        schemaVersion: 1,
        type,
        payload: minimalOperationEventPayloads[type],
      })

      expect(migrated?.schemaVersion).toBe(2)
      expect(migrated?.type).toBe(type)
    }
  })
})

describe('hydration problems 535-542 (schema migration)', () => {
  it('542 passes through schema v2 events unchanged', () => {
    const v2 = migrateEventV1toV2({
      ...validV1,
      schemaVersion: 2,
    })

    expect(v2?.schemaVersion).toBe(2)
    expect(v2?.id).toBe(validV1.id)
    expect(v2?.type).toBe(validV1.type)
  })

  it('542 getEventMigrator exposes v1→v2 step targeting schema 2', () => {
    const migrator = getEventMigrator()
    expect(migrator['1']?.target).toBe(2)
    expect(migrator['1']?.migrate(validV1)?.schemaVersion).toBe(2)
  })
})

describe('hydration problems 583-590 (schema migration)', () => {
  it('migrates case, market, progression, and academy operation events to schema v2', () => {
    const types = [
      'case.resolved',
      'case.partially_resolved',
      'case.failed',
      'case.spawned',
      'case.aggregate_battle',
      'case.raid_converted',
      'market.shifted',
      'market.emergency_gray_market_fallout_tick',
      'progression.xp_gained',
      'system.academy_upgraded',
    ] as const satisfies readonly OperationEventType[]

    for (const type of types) {
      const migrated = migrateEventV1toV2({
        id: `evt-${type}`,
        schemaVersion: 1,
        type,
        payload: minimalOperationEventPayloads[type],
      })

      expect(migrated?.schemaVersion).toBe(2)
      expect(migrated?.type).toBe(type)
    }
  })
})

describe('migrateEventV1toV2', () => {
  it('migrates valid V1 event to V2', () => {
    const migrated = migrateEventV1toV2(validV1)
    expect(migrated?.schemaVersion).toBe(2)
    expect(migrated?.id).toBe(validV1.id)
  })

  it('drops invalid known-type payloads instead of carrying them into canonical history', () => {
    const migrated = migrateEventV1toV2(invalidV1)
    expect(migrated).toBeNull()
  })

  it('drops known-type events with missing payloads', () => {
    const migrated = migrateEventV1toV2({
      id: 'evt-missing-payload',
      schemaVersion: 1,
      type: 'assignment.team_assigned',
    })

    expect(migrated).toBeNull()
  })

  it('passes through valid V2 events unchanged after validation', () => {
    const validV2 = {
      ...validV1,
      schemaVersion: 2,
    }

    const migrated = migrateEventV1toV2(validV2)

    expect(migrated).toBe(validV2)
  })
})
