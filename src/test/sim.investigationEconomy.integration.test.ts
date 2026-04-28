import { describe, expect, it } from 'vitest'
import { createAgent } from '../domain/agent/factory'
import { readPersistentFlag } from '../domain/flagSystem'
import {
  buildInvestigationBudgetClockId,
  buildInvestigationProgressRewardClockId,
} from '../domain/investigationEconomy'
import { readProgressClock } from '../domain/progressClocks'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { createStartingState } from '../data/startingState'

function isolateResolvedCaseSet(state: ReturnType<typeof createStartingState>) {
  return Object.fromEntries(
    Object.entries(state.cases).map(([caseId, currentCase]) => [
      caseId,
      {
        ...currentCase,
        status: 'resolved' as const,
        assignedTeamIds: [],
        weeksRemaining: 0,
      },
    ])
  )
}

describe('SPE-626 tactical-read live integration', () => {
  it('grants tactical budget and applies leverage/progress via weekly tactical recon success flow', () => {
    const state = createStartingState()
    const caseId = 'case-tactical-read'
    const teamId = 'team-recon'
    const agentId = 'agent-recon'

    state.rngSeed = 9123
    state.rngState = 9123
    state.cases = {
      ...isolateResolvedCaseSet(state),
      [caseId]: {
        ...state.cases['case-002'],
        id: caseId,
        templateId: 'case-tactical-read-template',
        status: 'in_progress',
        mode: 'threshold',
        stage: 4,
        weeksRemaining: 1,
        durationWeeks: 1,
        deadlineRemaining: 3,
        assignedTeamIds: [teamId],
        tags: ['signal', 'anomaly', 'evidence', 'breach', 'witness'],
        requiredTags: [],
        preferredTags: [],
        difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
        weights: { combat: 0.1, investigation: 0.6, utility: 0.2, social: 0.1 },
      },
    }

    state.agents[agentId] = createAgent({
      id: agentId,
      name: 'Recon Lead',
      role: 'field_recon',
      baseStats: { combat: 55, investigation: 95, utility: 92, social: 38 },
      tags: ['recon', 'surveillance', 'pathfinding', 'field-kit', 'signal-hunter'],
      equipmentSlots: {
        secondary: 'anomaly_scanner',
        headgear: 'advanced_recon_suite',
        utility1: 'signal_intercept_kit',
        utility2: 'occult_detection_array',
      },
    })

    state.teams[teamId] = {
      id: teamId,
      name: 'Recon Team',
      agentIds: [agentId],
      memberIds: [agentId],
      leaderId: agentId,
      assignedCaseId: caseId,
      tags: ['recon', 'surveillance'],
    }

    const next = advanceWeek(state)

    expect(next.reports.at(-1)?.resolvedCases).toContain(caseId)

    expect(readProgressClock(next, buildInvestigationBudgetClockId(caseId, 'tactical', 'granted'))).toMatchObject({
      value: 1,
      max: 6,
    })
    expect(readProgressClock(next, buildInvestigationBudgetClockId(caseId, 'tactical', 'spent'))).toMatchObject({
      value: 1,
      max: 6,
    })
    expect(readProgressClock(next, buildInvestigationProgressRewardClockId(caseId))).toMatchObject({
      value: 1,
      max: 1,
      completed: true,
    })

    expect(readPersistentFlag(next, `investigation.case.${caseId}.reward.progress-applied`)).toBe(true)
    expect(
      readPersistentFlag(next, `investigation.case.${caseId}.leverage.staged-ingress-advantage`)
    ).toBe(true)

    expect(
      next.reports
        .at(-1)
        ?.caseSnapshots?.[caseId]
        ?.missionResult?.explanationNotes.some((note) => note.includes('Tactical read leverage'))
    ).toBe(true)
  })
})
