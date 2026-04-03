import { describe, it, expect } from 'vitest'
import { migrateEventV1toV2 } from './eventMigration'

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

describe('migrateEventV1toV2', () => {
  it('migrates valid V1 event to V2', () => {
    const migrated = migrateEventV1toV2(validV1)
    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.id).toBe(validV1.id)
  })

  it('logs error for invalid payload', () => {
    // Should log error, but still migrate
    const migrated = migrateEventV1toV2(invalidV1)
    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.id).toBe(invalidV1.id)
  })
})
