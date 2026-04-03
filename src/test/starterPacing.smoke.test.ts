import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { assignTeam } from '../domain/sim/assign'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { type CaseInstance } from '../domain/models'
import { caseTemplateMap, starterRoster, starterTeams } from '../domain/templates'
import { validateTeam } from '../domain/validateTeam'

function hasStarterTeamForRequirements(
  currentCase: Pick<CaseInstance, 'requiredTags' | 'requiredRoles'>
) {
  return Object.values(starterTeams).some((team) => {
    const teamCapabilitySet = new Set([
      ...team.tags.map((tag) => tag.toLowerCase()),
      ...team.agentIds
        .flatMap((agentId) => starterRoster[agentId]?.tags ?? [])
        .map((tag) => tag.toLowerCase()),
    ])

    if (
      currentCase.requiredTags.some(
        (requiredTag) => !teamCapabilitySet.has(requiredTag.toLowerCase())
      )
    ) {
      return false
    }

    return validateTeam(team, currentCase, starterRoster).valid
  })
}

describe('starter pacing smoke', () => {
  it('keeps a fixed-seed starter run alive over two weeks without immediate pacing collapse', () => {
    let state = createStartingState()
    state.rngSeed = 20260325
    state.rngState = 20260325

    for (const currentCase of Object.values(state.cases)) {
      currentCase.deadlineRemaining += 3
      currentCase.weeksRemaining = (currentCase.weeksRemaining ?? currentCase.durationWeeks) + 3
    }

    const startingCaseCount = Object.keys(state.cases).length

    for (let week = 0; week < 2; week++) {
      state = advanceWeek(state)

      expect(state.gameOver).toBe(false)
      expect(state.reports).toHaveLength(week + 1)
      expect(
        Object.values(state.cases).every((currentCase) =>
          hasStarterTeamForRequirements(currentCase)
        )
      ).toBe(true)
    }

    expect(Object.keys(state.cases).length).toBeGreaterThanOrEqual(startingCaseCount)
    expect(
      Object.values(state.cases).some((currentCase) => currentCase.status !== 'resolved')
    ).toBe(true)
  })

  it('spawns only catalog-backed templates during a fixed-seed starter escalation chain', () => {
    let state = createStartingState()
    state.rngSeed = 20260325
    state.rngState = 20260325

    state.cases['case-003'] = {
      ...state.cases['case-003'],
      weeksRemaining: 1,
      difficulty: { combat: 999, investigation: 999, utility: 999, social: 999 },
      onFail: {
        ...state.cases['case-003'].onFail,
        spawnCount: { min: 1, max: 1 },
        spawnTemplateIds: ['chem-001'],
      },
      onUnresolved: {
        ...state.cases['case-003'].onUnresolved,
        spawnCount: { min: 1, max: 1 },
        spawnTemplateIds: ['bio-001'],
      },
    }

    state = assignTeam(state, 'case-003', 't_nightwatch')

    const spawnedCaseIds = new Set<string>()

    for (let week = 0; week < 4; week++) {
      state = advanceWeek(state)
      const report = state.reports.at(-1)

      expect(report).toBeDefined()
      expect(
        Object.values(state.cases).every((currentCase) =>
          hasStarterTeamForRequirements(currentCase)
        )
      ).toBe(true)

      for (const spawnedCaseId of report?.spawnedCases ?? []) {
        const spawnedCase = state.cases[spawnedCaseId]

        expect(spawnedCase).toBeDefined()
        expect(caseTemplateMap[spawnedCase!.templateId]).toBeDefined()
        spawnedCaseIds.add(spawnedCaseId)
      }
    }

    expect(spawnedCaseIds.size).toBeGreaterThan(0)
  })
})
