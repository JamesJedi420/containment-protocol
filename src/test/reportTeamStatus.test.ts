import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { CaseInstance, Team } from '../domain/models'
import { buildReportTeamStatusEntry } from '../domain/sim/reportTeamStatus'

const SANCTUARY_PACKET = {
  label: 'vault-approach-bivouac',
  quality: { safety: 2, medical: 2, supply: 1, extractionAccess: 0 },
} as const

function makeInProgressCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    id: 'case_exp',
    templateId: 't1',
    title: 'Expedition',
    description: '',
    mode: 'probability',
    kind: 'investigation',
    status: 'in_progress',
    difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
    weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    tags: [],
    requiredTags: [],
    preferredTags: [],
    stage: 1,
    durationWeeks: 2,
    deadlineWeeks: 4,
    deadlineRemaining: 4,
    assignedTeamIds: ['tm'],
    contract: { fieldBase: SANCTUARY_PACKET },
    onFail: { type: 'none' },
    onUnresolved: { type: 'none' },
    ...overrides,
  }
}

describe('reportTeamStatus (SPE-99)', () => {
  it('uses recoveryLookup when post-week team assignment was cleared', () => {
    const shell = createStartingState()
    const sourceCase = makeInProgressCase()
    const resolvedCase: CaseInstance = {
      ...sourceCase,
      status: 'resolved',
      assignedTeamIds: [],
      weeksRemaining: 0,
    }
    const sourceTeam: Team = {
      ...shell.teams.t_nightwatch,
      assignedCaseId: 'case_exp',
    }
    const releasedTeam: Team = {
      ...shell.teams.t_nightwatch,
      assignedCaseId: undefined,
    }

    const entry = buildReportTeamStatusEntry(
      releasedTeam,
      shell.agents,
      { case_exp: resolvedCase },
      {
        recoveryLookup: {
          teams: { [sourceTeam.id]: sourceTeam },
          cases: { case_exp: sourceCase },
        },
      }
    )

    expect(entry.deployedRecoveryMode).toBe('sanctuary_recovery')
    expect(entry.recoveryLegibility).toContain('vault-approach-bivouac')
    expect(entry.assignedCaseId).toBe('case_exp')
    expect(entry.assignedCaseTitle).toBe('Expedition')
  })
})
