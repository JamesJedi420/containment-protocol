// cspell:words greentape
import { describe, expect, it } from 'vitest'
import {
  getCaseAssignmentTimeline,
  getTeamDeploymentHistory,
} from '../features/deployment/deploymentEventSelectors'
import { type OperationEvent } from '../domain/models'

function buildEvents(): OperationEvent[] {
  return [
    {
      id: 'evt-1',
      schemaVersion: 1,
      type: 'assignment.team_assigned',
      sourceSystem: 'assignment',
      timestamp: '2042-01-01T00:00:00.000Z',
      payload: {
        week: 1,
        caseId: 'case-001',
        caseTitle: 'Vampire Nest in the Stockyards',
        caseKind: 'case',
        teamId: 't_nightwatch',
        teamName: 'Night Watch',
        assignedTeamCount: 1,
        maxTeams: 1,
      },
    },
    {
      id: 'evt-2',
      schemaVersion: 1,
      type: 'assignment.team_unassigned',
      sourceSystem: 'assignment',
      timestamp: '2042-01-02T00:00:00.000Z',
      payload: {
        week: 2,
        caseId: 'case-001',
        caseTitle: 'Vampire Nest in the Stockyards',
        teamId: 't_nightwatch',
        teamName: 'Night Watch',
        remainingTeamCount: 0,
      },
    },
    {
      id: 'evt-3',
      schemaVersion: 1,
      type: 'case.resolved',
      sourceSystem: 'incident',
      timestamp: '2042-01-03T00:00:00.000Z',
      payload: {
        week: 3,
        caseId: 'case-001',
        caseTitle: 'Vampire Nest in the Stockyards',
        mode: 'threshold',
        kind: 'case',
        stage: 2,
        teamIds: ['t_nightwatch'],
      },
    },
    {
      id: 'evt-4',
      schemaVersion: 1,
      type: 'assignment.team_assigned',
      sourceSystem: 'assignment',
      timestamp: '2042-01-04T00:00:00.000Z',
      payload: {
        week: 4,
        caseId: 'case-002',
        caseTitle: 'The Whispering Archive',
        caseKind: 'case',
        teamId: 't_greentape',
        teamName: 'Green Tape',
        assignedTeamCount: 1,
        maxTeams: 1,
      },
    },
  ]
}

describe('deploymentEventSelectors', () => {
  it('returns team deployment history filtered to the selected team and sorted descending by week', () => {
    const history = getTeamDeploymentHistory('t_nightwatch', buildEvents())

    expect(history).toHaveLength(3)
    expect(history.map((entry) => entry.id)).toEqual(['evt-3', 'evt-2', 'evt-1'])
    expect(history[0]?.label).toMatch(/resolved/i)
    expect(history.every((entry) => entry.caseId === 'case-001')).toBe(true)
  })

  it('returns case assignment timeline filtered to one case with team links where available', () => {
    const timeline = getCaseAssignmentTimeline('case-001', buildEvents())

    expect(timeline).toHaveLength(3)
    expect(timeline.map((entry) => entry.id)).toEqual(['evt-3', 'evt-2', 'evt-1'])
    expect(timeline[1]?.teamId).toBe('t_nightwatch')
    expect(timeline[2]?.teamName).toBe('Night Watch')
    expect(timeline.some((entry) => entry.caseTitle === 'The Whispering Archive')).toBe(false)
  })
})
