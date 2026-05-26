import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStartingState } from '../data/startingState'
import { getCampaignDate, resolveCalendarConfig } from '../domain/campaignCalendar'
import { buildSupportRestoredNote } from '../domain/reportNotes.support'
import { applyRallySupportStaffAction } from '../domain/hub/supportActions'
import type { WeeklyReport } from '../domain/models'
import { buildReportKnowledgeView } from '../features/report/reportKnowledgeView'
import { buildWeeklyReport } from '../domain/sim/weeklyReport'
import { getAverageRosterFatigue, isRosterFatigueAgent } from '../domain/sim/rosterFatigue'
import {
  clearPendingWeeklyReportInvariantViolations,
  enforceWeeklyReportInvariant,
  shouldStrictWeeklyReportInvariants,
  takePendingWeeklyReportInvariantViolations,
} from '../domain/sim/weeklyReportInvariants'
import { createStarterAgent } from '../domain/templates/classTables'

describe('weekly report build (264–269)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    clearPendingWeeklyReportInvariantViolations()
  })

  it('264: stamps WeeklyReport.date from source week via getCampaignDate', () => {
    const sourceState = createStartingState()
    sourceState.week = 3
    const nextState = { ...sourceState, week: 4, rngState: sourceState.rngState + 1 }

    const { report } = buildWeeklyReport({
      sourceState,
      nextState,
      spawnedCaseIds: [],
      progressedCases: [],
      resolvedCases: [],
      failedCases: [],
      partialCases: [],
      unresolvedTriggers: [],
      performanceByCaseId: {},
      rewardByCaseId: {},
      missionResultByCaseId: {},
    })

    expect(report.date).toEqual(getCampaignDate(3, resolveCalendarConfig(sourceState.config)))
    expect(report.date?.absoluteWeek).toBe(3)
    expect(report.week).toBe(3)
  })

  it('264: legacy persisted reports without date remain valid', () => {
    const legacy: WeeklyReport = {
      week: 2,
      rngStateBefore: 1,
      rngStateAfter: 2,
      newCases: [],
      progressedCases: [],
      resolvedCases: [],
      failedCases: [],
      partialCases: [],
      unresolvedTriggers: [],
      spawnedCases: [],
      maxStage: 1,
      avgFatigue: 0,
      teamStatus: [],
      notes: [],
    }

    expect(legacy.date).toBeUndefined()
    expect(legacy.week).toBe(2)
  })

  it('265: avgFatigue excludes dead, resigned, training, and unavailable agents', () => {
    const deployable = createStarterAgent({
      id: 'a_live',
      name: 'Live',
      role: 'hunter',
      fatigue: 40,
      tags: [],
      relationships: {},
      baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
    })
    const dead = createStarterAgent({
      id: 'a_dead',
      name: 'Dead',
      role: 'hunter',
      fatigue: 100,
      tags: [],
      relationships: {},
      baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
    })
    dead.status = 'dead'

    const resigned = createStarterAgent({
      id: 'a_resigned',
      name: 'Resigned',
      role: 'hunter',
      fatigue: 90,
      tags: [],
      relationships: {},
      baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
    })
    resigned.status = 'resigned'

    const training = createStarterAgent({
      id: 'a_training',
      name: 'Training',
      role: 'hunter',
      fatigue: 80,
      tags: [],
      relationships: {},
      baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
    })
    training.assignment = { state: 'training', caseId: null, teamId: null }

    const unavailable = createStarterAgent({
      id: 'a_unavailable',
      name: 'Unavailable',
      role: 'hunter',
      fatigue: 70,
      tags: [],
      relationships: {},
      baseStats: { combat: 1, investigation: 1, utility: 1, social: 1 },
    })
    unavailable.attritionState = {
      attritionStatus: 'temporarily_unavailable',
      lossReasonCodes: ['test'],
      replacementPriority: 0,
      retentionPressure: 0,
    }

    const agents = {
      [deployable.id]: deployable,
      [dead.id]: dead,
      [resigned.id]: resigned,
      [training.id]: training,
      [unavailable.id]: unavailable,
    }

    expect(isRosterFatigueAgent(deployable)).toBe(true)
    expect(isRosterFatigueAgent(dead)).toBe(false)
    expect(isRosterFatigueAgent(resigned)).toBe(false)
    expect(isRosterFatigueAgent(training)).toBe(false)
    expect(isRosterFatigueAgent(unavailable)).toBe(false)
    expect(getAverageRosterFatigue(agents)).toBe(40)
  })

  it('266: throws alignment violations in test mode', () => {
    expect(shouldStrictWeeklyReportInvariants()).toBe(true)
    expect(() => enforceWeeklyReportInvariant(false, 'weekly report invariant')).toThrow(
      /weekly report invariant/
    )
  })

  it('266: records violations and continues outside test mode', () => {
    vi.stubEnv('MODE', 'production')
    clearPendingWeeklyReportInvariantViolations()

    expect(shouldStrictWeeklyReportInvariants()).toBe(false)
    expect(() => enforceWeeklyReportInvariant(false, 'recorded drift')).not.toThrow()
    expect(takePendingWeeklyReportInvariantViolations()).toEqual(['recorded drift'])
  })

  it('268: rally support uses the canonical support.restored builder', () => {
    const state = createStartingState()
    state.agency = { ...state.agency!, supportAvailable: 0 }

    const { note: rallyNote } = applyRallySupportStaffAction(state, 2)
    const canonical = buildSupportRestoredNote(2, 0, 2, state.week)

    expect(rallyNote?.type).toBe('support.restored')
    expect(rallyNote?.id).toBe(canonical.id)
    expect(rallyNote?.content).toMatch(/restored/i)
  })

  it('269: case snapshots capture durable knowledge and report detail prefers snapshot', () => {
    const sourceState = createStartingState()
    const teamId = 't_nightwatch'
    const caseId = 'case-001'
    const caseInstance = {
      ...sourceState.cases[caseId],
      assignedTeamIds: [teamId],
    }
    sourceState.cases[caseId] = caseInstance

    sourceState.knowledge[`${teamId}::${caseId}`] = {
      entityId: teamId,
      entityType: 'team',
      subjectId: caseId,
      subjectType: 'anomaly',
      tier: 'observed',
      notes: 'Live knowledge after report',
    }

    const snapshotTitle = caseInstance.title
    const nextState = {
      ...sourceState,
      week: 2,
      cases: {
        ...sourceState.cases,
        [caseId]: { ...caseInstance },
      },
    }

    const { report } = buildWeeklyReport({
      sourceState,
      nextState,
      spawnedCaseIds: [],
      progressedCases: [],
      resolvedCases: [],
      failedCases: [],
      partialCases: [],
      unresolvedTriggers: [],
      performanceByCaseId: {},
      rewardByCaseId: {},
      missionResultByCaseId: {},
    })

    const snapshot = report.caseSnapshots?.[caseId]
    expect(snapshot?.title).toBe(snapshotTitle)
    expect(snapshot?.knowledge?.[teamId]?.tier).toBe('observed')
    expect(snapshot?.revealExplanation).toMatch(/observed/i)

    const liveKnowledge = {
      ...nextState.knowledge,
      [`${teamId}::${caseId}`]: {
        entityId: teamId,
        entityType: 'team',
        subjectId: caseId,
        subjectType: 'anomaly',
        tier: 'confirmed',
        notes: 'Live knowledge after report',
      },
    }

    expect(liveKnowledge[`${teamId}::${caseId}`]?.tier).toBe('confirmed')
    const mergedKnowledge = buildReportKnowledgeView(liveKnowledge, report.caseSnapshots)
    expect(mergedKnowledge[`${teamId}::${caseId}`]?.tier).toBe('observed')
  })
})
