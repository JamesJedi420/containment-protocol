import { describe, expect, it } from 'vitest'
import type { OperationEvent } from '../domain/models'
import { buildEventQueryIndex, queryEvents } from '../domain/events'

function inferSource(type: string): string {
  if (type.startsWith('assignment.')) return 'assignment'
  if (type.startsWith('case.')) return 'incident'
  if (type.startsWith('intel.')) return 'intel'
  if (type.startsWith('agent.')) return 'agent'
  if (type.startsWith('production.') || type.startsWith('market.')) return 'production'
  if (type.startsWith('faction.')) return 'faction'
  return 'system'
}

function makeEvent<TType extends OperationEvent['type']>(
  type: TType,
  payload: Extract<OperationEvent, { type: TType }>['payload'],
  overrides: Partial<OperationEvent> = {}
): OperationEvent {
  return {
    id: `evt-${type.replace(/\./g, '-')}`,
    schemaVersion: 1,
    type,
    sourceSystem: (overrides.sourceSystem ?? inferSource(type)) as OperationEvent['sourceSystem'],
    timestamp: overrides.timestamp ?? '2042-01-08T00:00:00.001Z',
    payload,
    ...overrides,
  } as OperationEvent
}

describe('event query index', () => {
  it('indexes and queries by type/source/week/entity id', () => {
    const assigned = makeEvent(
      'assignment.team_assigned',
      {
        week: 2,
        caseId: 'case-001',
        caseTitle: 'Vampire Nest',
        caseKind: 'case',
        teamId: 't_alpha',
        teamName: 'Alpha Team',
        assignedTeamCount: 1,
        maxTeams: 1,
      },
      { id: 'evt-assign', timestamp: '2042-01-10T00:00:00.001Z' }
    )

    const failed = makeEvent(
      'case.failed',
      {
        week: 4,
        caseId: 'case-002',
        caseTitle: 'Outbreak Vector',
        mode: 'threshold',
        kind: 'case',
        fromStage: 1,
        toStage: 2,
        teamIds: [],
      },
      { id: 'evt-fail', timestamp: '2042-01-24T00:00:00.001Z' }
    )

    const report = makeEvent(
      'intel.report_generated',
      {
        week: 4,
        resolvedCount: 0,
        failedCount: 1,
        partialCount: 0,
        unresolvedCount: 0,
        spawnedCount: 1,
        noteCount: 2,
        score: -3,
      },
      { id: 'evt-report', timestamp: '2042-01-24T00:00:00.999Z' }
    )

    const index = buildEventQueryIndex([assigned, failed, report])

    expect(index.all.map((event) => event.id)).toEqual(['evt-report', 'evt-fail', 'evt-assign'])
    expect((index.byType.get('case.failed') ?? []).map((event) => event.id)).toEqual(['evt-fail'])
    expect((index.bySourceSystem.get('intel') ?? []).map((event) => event.id)).toEqual([
      'evt-report',
    ])
    expect((index.byEntityId.get('case-001') ?? []).map((event) => event.id)).toEqual([
      'evt-assign',
    ])

    const queryByWeek = queryEvents(index, { weekMin: 4, weekMax: 4 })
    expect(queryByWeek.map((event) => event.id)).toEqual(['evt-report', 'evt-fail'])

    const queryByEntity = queryEvents(index, { entityId: 't_alpha' })
    expect(queryByEntity.map((event) => event.id)).toEqual(['evt-assign'])
  })

  it('applies free-text query matching against type/source and payload string values', () => {
    const assigned = makeEvent(
      'assignment.team_assigned',
      {
        week: 2,
        caseId: 'case-001',
        caseTitle: 'Vampire Nest',
        caseKind: 'case',
        teamId: 't_alpha',
        teamName: 'Alpha Team',
        assignedTeamCount: 1,
        maxTeams: 1,
      },
      { id: 'evt-assign', timestamp: '2042-01-10T00:00:00.001Z' }
    )

    const report = makeEvent(
      'intel.report_generated',
      {
        week: 4,
        resolvedCount: 0,
        failedCount: 1,
        partialCount: 0,
        unresolvedCount: 0,
        spawnedCount: 1,
        noteCount: 2,
        score: -3,
      },
      { id: 'evt-report', timestamp: '2042-01-24T00:00:00.999Z' }
    )

    const index = buildEventQueryIndex([assigned, report])

    expect(queryEvents(index, { query: 'vampire' }).map((event) => event.id)).toEqual([
      'evt-assign',
    ])
    expect(queryEvents(index, { query: 'assignment.team_assigned' }).map((event) => event.id)).toEqual([
      'evt-assign',
    ])
    expect(queryEvents(index, { query: 'intel' }).map((event) => event.id)).toEqual([
      'evt-report',
    ])
    expect(queryEvents(index, { query: 'no-match' })).toEqual([])
  })

  it('supports combined filters deterministically', () => {
    const assignmentA = makeEvent(
      'assignment.team_assigned',
      {
        week: 3,
        caseId: 'case-101',
        caseTitle: 'Shoreline Signal',
        caseKind: 'case',
        teamId: 't_alpha',
        teamName: 'Alpha Team',
        assignedTeamCount: 1,
        maxTeams: 1,
      },
      { id: 'evt-assign-a', timestamp: '2042-01-17T00:00:00.001Z' }
    )

    const assignmentB = makeEvent(
      'assignment.team_assigned',
      {
        week: 3,
        caseId: 'case-202',
        caseTitle: 'Warehouse Echo',
        caseKind: 'case',
        teamId: 't_bravo',
        teamName: 'Bravo Team',
        assignedTeamCount: 1,
        maxTeams: 1,
      },
      { id: 'evt-assign-b', timestamp: '2042-01-17T00:00:00.002Z' }
    )

    const incident = makeEvent(
      'case.failed',
      {
        week: 3,
        caseId: 'case-101',
        caseTitle: 'Shoreline Signal',
        mode: 'threshold',
        kind: 'case',
        fromStage: 1,
        toStage: 2,
        teamIds: ['t_alpha'],
      },
      { id: 'evt-fail', timestamp: '2042-01-17T00:00:00.003Z' }
    )

    const index = buildEventQueryIndex([assignmentA, assignmentB, incident])

    const filtered = queryEvents(index, {
      type: 'assignment.team_assigned',
      sourceSystem: 'assignment',
      entityId: 't_alpha',
      weekMin: 3,
      weekMax: 3,
      query: 'shoreline',
    })

    expect(filtered.map((event) => event.id)).toEqual(['evt-assign-a'])
  })

  it('treats weekMin/weekMax boundaries as inclusive', () => {
    const week2 = makeEvent(
      'intel.report_generated',
      {
        week: 2,
        resolvedCount: 1,
        failedCount: 0,
        partialCount: 0,
        unresolvedCount: 0,
        spawnedCount: 0,
        noteCount: 1,
        score: 2,
      },
      { id: 'evt-week2', timestamp: '2042-01-10T00:00:00.001Z' }
    )
    const week3 = makeEvent(
      'intel.report_generated',
      {
        week: 3,
        resolvedCount: 0,
        failedCount: 1,
        partialCount: 0,
        unresolvedCount: 0,
        spawnedCount: 1,
        noteCount: 2,
        score: -1,
      },
      { id: 'evt-week3', timestamp: '2042-01-17T00:00:00.001Z' }
    )
    const week4 = makeEvent(
      'intel.report_generated',
      {
        week: 4,
        resolvedCount: 2,
        failedCount: 0,
        partialCount: 0,
        unresolvedCount: 0,
        spawnedCount: 0,
        noteCount: 1,
        score: 3,
      },
      { id: 'evt-week4', timestamp: '2042-01-24T00:00:00.001Z' }
    )

    const index = buildEventQueryIndex([week2, week3, week4])

    expect(queryEvents(index, { weekMin: 3 }).map((event) => event.id)).toEqual([
      'evt-week4',
      'evt-week3',
    ])
    expect(queryEvents(index, { weekMax: 3 }).map((event) => event.id)).toEqual([
      'evt-week3',
      'evt-week2',
    ])
    expect(queryEvents(index, { weekMin: 3, weekMax: 3 }).map((event) => event.id)).toEqual([
      'evt-week3',
    ])
  })
})
