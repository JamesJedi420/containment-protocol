import { describe, it, expect } from 'vitest'
import { createStartingState } from '../data/startingState'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { getMissionRoutingReportView } from '../features/report/operationsReportView'
import { routeMission } from '../domain/missionIntakeRouting'

function createOutcomeState() {
  const state = createStartingState()
  const caseId = Object.keys(state.cases)[0]!
  const teamId = Object.keys(state.teams)[0]!
  const currentCase = state.cases[caseId]!
  const team = state.teams[teamId]!

  state.cases[caseId] = {
    ...currentCase,
    mode: 'deterministic',
    status: 'in_progress',
    assignedTeamIds: [teamId],
    durationWeeks: 1,
    weeksRemaining: 1,
    requiredRoles: [],
    requiredTags: [],
  }
  state.teams[teamId] = {
    ...team,
    memberIds: [...(team.agentIds ?? team.memberIds ?? [])],
    agentIds: [...(team.agentIds ?? team.memberIds ?? [])],
    status: { state: 'deployed', assignedCaseId: caseId },
  }

  return advanceWeek(state)
}

describe('tmp debug: operations report view inputs', () => {
  it('logs mission-routing determinism after save/load', () => {
    const state = createOutcomeState()
    const raw = serializeGameSave(state)
    const loaded = loadGameSave(raw)

    const before = getMissionRoutingReportView(state)
    const after = getMissionRoutingReportView(loaded)

    // eslint-disable-next-line no-console
    console.log('before.orderedMissionIds', state.missionRouting?.orderedMissionIds)
    // eslint-disable-next-line no-console
    console.log('after.orderedMissionIds', loaded.missionRouting?.orderedMissionIds)
    // eslint-disable-next-line no-console
    console.log('before.view', JSON.stringify(before, null, 2))
    // eslint-disable-next-line no-console
    console.log('after.view', JSON.stringify(after, null, 2))

    // eslint-disable-next-line no-console
    console.log('case 0 requiredRoles', state.cases[Object.keys(state.cases)[0]!]?.requiredRoles)
    // eslint-disable-next-line no-console
    console.log(
      'case 0 assignedTeamIds (before/after)',
      state.cases[Object.keys(state.cases)[0]!]?.assignedTeamIds,
      loaded.cases[Object.keys(loaded.cases)[0]!]?.assignedTeamIds
    )
    // eslint-disable-next-line no-console
    console.log(
      'team status (before/after)',
      (() => {
        const teamId = Object.keys(state.teams)[0]!
        return { before: state.teams[teamId]?.status, after: loaded.teams[teamId]?.status }
      })()
    )

    const missionId = before[0]!.missionId
    // eslint-disable-next-line no-console
    console.log('diverging missionId', missionId)
    // eslint-disable-next-line no-console
    console.log(
      'mission case assignedTeamIds (before/after)',
      state.cases[missionId]?.assignedTeamIds,
      loaded.cases[missionId]?.assignedTeamIds
    )
    // eslint-disable-next-line no-console
    console.log(
      'mission case requiredRoles (before/after)',
      state.cases[missionId]?.requiredRoles,
      loaded.cases[missionId]?.requiredRoles
    )
    // eslint-disable-next-line no-console
    console.log('routeMission (before)', routeMission(state, missionId))
    // eslint-disable-next-line no-console
    console.log('routeMission (after)', routeMission(loaded, missionId))

    expect(after).toEqual(before)
  })
})

