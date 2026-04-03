import { type OperationEvent } from '../../domain/models'

export interface DeploymentTimelineEntry {
  id: string
  week: number
  label: string
  caseId?: string
  caseTitle?: string
  teamId?: string
  teamName?: string
}

export function getTeamDeploymentHistory(teamId: string, events: OperationEvent[]) {
  return events
    .filter((event) => {
      if (event.type === 'assignment.team_assigned' || event.type === 'assignment.team_unassigned') {
        return event.payload.teamId === teamId
      }

      if (
        event.type === 'case.resolved' ||
        event.type === 'case.partially_resolved' ||
        event.type === 'case.failed'
      ) {
        return (event.payload.teamIds ?? []).includes(teamId)
      }

      return false
    })
    .map((event): DeploymentTimelineEntry => {
      if (event.type === 'assignment.team_assigned') {
        return {
          id: event.id,
          week: event.payload.week,
          caseId: event.payload.caseId,
          caseTitle: event.payload.caseTitle,
          teamId: event.payload.teamId,
          teamName: event.payload.teamName,
          label: `Assigned to ${event.payload.caseTitle}`,
        }
      }

      if (event.type === 'assignment.team_unassigned') {
        return {
          id: event.id,
          week: event.payload.week,
          caseId: event.payload.caseId,
          caseTitle: event.payload.caseTitle,
          teamId: event.payload.teamId,
          teamName: event.payload.teamName,
          label: `Unassigned from ${event.payload.caseTitle}`,
        }
      }

      if (event.type === 'case.resolved') {
        return {
          id: event.id,
          week: event.payload.week,
          caseId: event.payload.caseId,
          caseTitle: event.payload.caseTitle,
          label: `Resolved ${event.payload.caseTitle}`,
        }
      }

      if (event.type === 'case.partially_resolved') {
        return {
          id: event.id,
          week: event.payload.week,
          caseId: event.payload.caseId,
          caseTitle: event.payload.caseTitle,
          label: `Partially resolved ${event.payload.caseTitle}`,
        }
      }

      return {
        id: event.id,
        week: event.payload.week,
        caseId: event.payload.caseId,
        caseTitle: event.payload.caseTitle,
        label: `Failed ${event.payload.caseTitle}`,
      }
    })
    .sort((left, right) => right.week - left.week)
}

export function getCaseAssignmentTimeline(caseId: string, events: OperationEvent[]) {
  return events
    .filter((event) => {
      if (
        event.type === 'assignment.team_assigned' ||
        event.type === 'assignment.team_unassigned' ||
        event.type === 'case.resolved' ||
        event.type === 'case.partially_resolved' ||
        event.type === 'case.failed'
      ) {
        return event.payload.caseId === caseId
      }

      return false
    })
    .map((event): DeploymentTimelineEntry => {
      if (event.type === 'assignment.team_assigned') {
        return {
          id: event.id,
          week: event.payload.week,
          teamId: event.payload.teamId,
          teamName: event.payload.teamName,
          caseId: event.payload.caseId,
          caseTitle: event.payload.caseTitle,
          label: `${event.payload.teamName} assigned`,
        }
      }

      if (event.type === 'assignment.team_unassigned') {
        return {
          id: event.id,
          week: event.payload.week,
          teamId: event.payload.teamId,
          teamName: event.payload.teamName,
          caseId: event.payload.caseId,
          caseTitle: event.payload.caseTitle,
          label: `${event.payload.teamName} unassigned`,
        }
      }

      if (event.type === 'case.resolved') {
        return {
          id: event.id,
          week: event.payload.week,
          caseId: event.payload.caseId,
          caseTitle: event.payload.caseTitle,
          label: `${event.payload.caseTitle} resolved`,
        }
      }

      if (event.type === 'case.partially_resolved') {
        return {
          id: event.id,
          week: event.payload.week,
          caseId: event.payload.caseId,
          caseTitle: event.payload.caseTitle,
          label: `${event.payload.caseTitle} partially resolved`,
        }
      }

      return {
        id: event.id,
        week: event.payload.week,
        caseId: event.payload.caseId,
        caseTitle: event.payload.caseTitle,
        label: `${event.payload.caseTitle} failed`,
      }
    })
    .sort((left, right) => right.week - left.week)
}
