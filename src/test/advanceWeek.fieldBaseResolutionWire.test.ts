import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { CaseInstance, GameState } from '../domain/models'
import { advanceWeek } from '../domain/sim/advanceWeek'

const { previewStatesForCaseExp } = vi.hoisted(() => ({
  previewStatesForCaseExp: [] as GameState[],
}))

vi.mock('../domain/sim/resolve', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../domain/sim/resolve')>()
  return {
    ...actual,
    previewResolutionForTeamIds(
      ...args: Parameters<typeof actual.previewResolutionForTeamIds>
    ) {
      const [caseData, state] = args
      if (caseData.id === 'case_exp') {
        previewStatesForCaseExp.push(state)
      }
      return actual.previewResolutionForTeamIds(...args)
    },
  }
})

describe('advanceWeek field-base + mission resolution roster (SPE-1654)', () => {
  beforeEach(() => {
    previewStatesForCaseExp.length = 0
  })

  it('uses week-open nextState (post field-base rotation) for previewResolutionForTeamIds on resolve', () => {
    const shell = createStartingState()
    const deployedTeamId = 't_nightwatch'
    const sansSato = shell.teams.t_greentape!.agentIds.filter((id) => id !== 'a_sato')

    const baseCase: CaseInstance = {
      id: 'case_exp',
      templateId: 'occult-005',
      title: 'Expedition',
      description: 'd',
      mode: 'probability',
      kind: 'case',
      status: 'in_progress',
      difficulty: { combat: 10, investigation: 10, utility: 10, social: 10 },
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
      tags: [],
      requiredTags: [],
      preferredTags: [],
      stage: 1,
      durationWeeks: 3,
      deadlineWeeks: 4,
      deadlineRemaining: 3,
      weeksRemaining: 1,
      assignedTeamIds: [deployedTeamId],
      onFail: { type: 'none' },
      onUnresolved: { type: 'none' },
      contract: {
        templateId: 'institutions-liturgy-expedition',
        fieldBase: {
          label: 'test-bivouac',
          quality: { safety: 2, medical: 2, supply: 3, extractionAccess: 1 },
        },
      },
    }

    const assignedToExp = {
      state: 'assigned' as const,
      caseId: 'case_exp',
      teamId: deployedTeamId,
      startedWeek: 1,
    }

    const game: GameState = {
      ...shell,
      cases: {
        ...shell.cases,
        case_exp: baseCase,
      },
      teams: {
        ...shell.teams,
        t_greentape: {
          ...shell.teams.t_greentape!,
          agentIds: sansSato,
          memberIds: sansSato,
        },
        [deployedTeamId]: {
          ...shell.teams[deployedTeamId]!,
          assignedCaseId: 'case_exp',
        },
      },
      agents: {
        ...shell.agents,
        a_ava: {
          ...shell.agents.a_ava!,
          fatigue: 85,
          assignment: assignedToExp,
        },
        a_kellan: { ...shell.agents.a_kellan!, assignment: assignedToExp },
        a_mina: { ...shell.agents.a_mina!, assignment: assignedToExp },
        a_rook: { ...shell.agents.a_rook!, assignment: assignedToExp },
        a_casey: { ...shell.agents.a_casey!, assignment: { state: 'idle' } },
      },
    }

    advanceWeek(game)

    expect(previewStatesForCaseExp.length).toBeGreaterThan(0)
    for (const s of previewStatesForCaseExp) {
      const team = s.teams[deployedTeamId]
      const members = team?.agentIds ?? team?.memberIds ?? []
      expect(members).toContain('a_casey')
      expect(members).not.toContain('a_ava')
    }
  })
})
