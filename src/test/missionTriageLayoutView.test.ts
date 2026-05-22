import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { getCaseListItemView, matchesCaseTriageTab } from '../features/cases/caseView'
import { MISSION_TRIAGE_DISPOSITION_LABELS } from '../data/copy'
import {
  buildMissionTriageCompactRowView,
  buildMissionTriageContextFooterView,
  buildMissionTriageListRowChips,
} from '../features/cases/missionTriageLayoutView'
import { buildMissionTriageDispositionView } from '../features/cases/missionTriageDispositionView'
import {
  applyMissionTriageDisposition,
  normalizeMissionRoutingState,
  recomputeMissionRouting,
  triageMission,
} from '../domain/missionIntakeRouting'
import type { CaseInstance } from '../domain/models'

function makeCase(id: string, overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    id,
    templateId: id,
    title: overrides.title ?? id,
    description: 'details',
    kind: overrides.kind ?? 'case',
    status: overrides.status ?? 'open',
    mode: overrides.mode ?? 'threshold',
    difficulty: { combat: 10, investigation: 10, utility: 10, social: 10 },
    weights: { combat: 0.25, investigation: 0.25, utility: 0.25, social: 0.25 },
    tags: overrides.tags ?? [],
    stage: overrides.stage ?? 1,
    durationWeeks: 2,
    deadlineWeeks: 3,
    deadlineRemaining: overrides.deadlineRemaining ?? 3,
    intelConfidence: 1,
    intelUncertainty: 0,
    intelLastUpdatedWeek: 0,
    assignedTeamIds: overrides.assignedTeamIds ?? [],
    requiredRoles: [],
    requiredTags: [],
    preferredTags: [],
    onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
    onUnresolved: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
    ...overrides,
  }
}

describe('missionTriageLayoutView', () => {
  it('matches triage tabs by contract, assignment, lead tags, and escalation', () => {
    const game = createStartingState()
    game.cases = {
      contract: makeCase('contract', { contract: { templateId: 'c-1' }, tags: ['contract'] }),
      lead: makeCase('lead', { tags: ['investigation', 'analysis'] }),
      assigned: makeCase('assigned', { assignedTeamIds: [Object.keys(game.teams)[0]!] }),
      escalating: makeCase('escalating', { stage: 4, deadlineRemaining: 1 }),
      plain: makeCase('plain', { tags: ['facility'] }),
    }

    const views = Object.values(game.cases).map((entry) => getCaseListItemView(entry, game))

    expect(matchesCaseTriageTab(views.find((v) => v.currentCase.id === 'contract')!, 'contracts', game)).toBe(
      true
    )
    expect(matchesCaseTriageTab(views.find((v) => v.currentCase.id === 'lead')!, 'leads', game)).toBe(true)
    expect(matchesCaseTriageTab(views.find((v) => v.currentCase.id === 'assigned')!, 'assigned', game)).toBe(
      true
    )
    expect(matchesCaseTriageTab(views.find((v) => v.currentCase.id === 'escalating')!, 'escalating', game)).toBe(
      true
    )
    expect(matchesCaseTriageTab(views.find((v) => v.currentCase.id === 'plain')!, 'incidents', game)).toBe(
      true
    )
    expect(matchesCaseTriageTab(views.find((v) => v.currentCase.id === 'contract')!, 'incidents', game)).toBe(
      false
    )
  })

  it('builds compact row priority from triage result', () => {
    const game = createStartingState()
    game.cases = {
      urgent: makeCase('urgent', { stage: 4, deadlineRemaining: 1 }),
    }

    const view = getCaseListItemView(game.cases.urgent!, game)
    const triage = triageMission(game, view.currentCase)
    const row = buildMissionTriageCompactRowView(view, triage, '', game)

    expect(row.priority).toBe(triage.priority)
    expect(row.priorityScore).toBe(triage.score)
    expect(row.priorityScore).toBeGreaterThan(0)
  })

  it('puts disposition chip first on compact row chips', () => {
    const starter = createStartingState()
    const openCase = makeCase('open-defer', { status: 'open', title: 'Defer scan' })
    const game = applyMissionTriageDisposition(
      {
        ...starter,
        cases: { 'open-defer': openCase },
        missionRouting: normalizeMissionRoutingState({ ...starter, cases: { 'open-defer': openCase } }),
      },
      'open-defer',
      'defer'
    )

    const view = getCaseListItemView(game.cases['open-defer']!, game, {
      includeCovertPrepSignals: true,
    })
    const disposition = buildMissionTriageDispositionView(view, game)
    const chips = buildMissionTriageListRowChips(view, disposition)

    expect(chips[0]?.id).toBe('disposition:defer')
    expect(chips[0]?.label).toBe(MISSION_TRIAGE_DISPOSITION_LABELS.activeDefer)

    const row = buildMissionTriageCompactRowView(
      view,
      triageMission(game, view.currentCase),
      '',
      game
    )
    expect(row.chips[0]?.label).toBe(MISSION_TRIAGE_DISPOSITION_LABELS.activeDefer)
  })

  it('omits disposition chip on list row when case is assigned', () => {
    const game = createStartingState()
    const teamId = Object.keys(game.teams)[0]!
    const assignedCase = makeCase('assigned-defer', {
      status: 'in_progress',
      assignedTeamIds: [teamId],
    })
    const withDisposition = applyMissionTriageDisposition(
      {
        ...game,
        cases: { 'assigned-defer': assignedCase },
        missionRouting: normalizeMissionRoutingState({ ...game, cases: { 'assigned-defer': assignedCase } }),
      },
      'assigned-defer',
      'defer'
    )

    const view = getCaseListItemView(withDisposition.cases['assigned-defer']!, withDisposition)
    const chips = buildMissionTriageListRowChips(
      view,
      buildMissionTriageDispositionView(view, withDisposition)
    )

    expect(chips.some((chip) => chip.id.startsWith('disposition:'))).toBe(false)
  })

  it('caps list row chips at five signals', () => {
    const game = createStartingState()
    game.cases = {
      busy: makeCase('busy', {
        status: 'open',
        stage: 4,
        deadlineRemaining: 1,
        requiredRoles: ['investigator'],
        requiredTags: ['stealth'],
        tags: ['infiltration', 'concealment'],
        infiltrationProbePlan: {
          plannedAction: 'probe_access',
          coverRole: 'maintenance',
          coverTier: 2,
        },
        stealthLeaveBehindId: 'leave-behind:risk-discovery',
      }),
    }

    const withDisposition = applyMissionTriageDisposition(
      {
        ...game,
        missionRouting: normalizeMissionRoutingState(game),
      },
      'busy',
      'route'
    )
    const dispositionView = buildMissionTriageDispositionView(
      getCaseListItemView(withDisposition.cases.busy!, withDisposition, {
        includeCovertPrepSignals: true,
      }),
      withDisposition
    )
    const chips = buildMissionTriageListRowChips(
      getCaseListItemView(withDisposition.cases.busy!, withDisposition, {
        includeCovertPrepSignals: true,
      }),
      dispositionView
    )

    expect(chips.length).toBe(5)
    expect(chips[0]?.id).toBe('disposition:route')
  })

  it('drops stale disposition chips after the planning week advances', () => {
    const starter = createStartingState()
    const openCase = makeCase('stale-disposition', { status: 'open' })
    const weekOne = applyMissionTriageDisposition(
      {
        ...starter,
        cases: { 'stale-disposition': openCase },
        missionRouting: normalizeMissionRoutingState({ ...starter, cases: { 'stale-disposition': openCase } }),
      },
      'stale-disposition',
      'defer'
    )

    const nextWeek = weekOne.week + 1
    const weekTwo = {
      ...weekOne,
      week: nextWeek,
      missionRouting: recomputeMissionRouting({ ...weekOne, week: nextWeek }, nextWeek),
    }
    const view = getCaseListItemView(weekTwo.cases['stale-disposition']!, weekTwo)
    const chips = buildMissionTriageListRowChips(
      view,
      buildMissionTriageDispositionView(view, weekTwo)
    )

    expect(chips.some((chip) => chip.id.startsWith('disposition:'))).toBe(false)
  })

  it('returns empty chips when no urgency, covert, or disposition signals apply', () => {
    const game = createStartingState()
    game.cases = {
      assigned: makeCase('assigned', {
        status: 'in_progress',
        assignedTeamIds: [Object.keys(game.teams)[0]!],
      }),
    }

    const view = getCaseListItemView(game.cases.assigned!, game)
    const chips = buildMissionTriageListRowChips(
      view,
      buildMissionTriageDispositionView(view, game)
    )

    expect(chips).toEqual([])
  })

  it('includes urgency and covert-prep chips after disposition on compact row', () => {
    const game = createStartingState()
    game.cases = {
      urgent: makeCase('urgent', {
        status: 'open',
        stage: 4,
        deadlineRemaining: 1,
        tags: ['infiltration', 'concealment'],
        infiltrationProbePlan: {
          plannedAction: 'probe_access',
          coverRole: 'maintenance',
          coverTier: 2,
        },
      }),
    }

    const view = getCaseListItemView(game.cases.urgent!, game, { includeCovertPrepSignals: true })
    const chips = buildMissionTriageListRowChips(
      view,
      buildMissionTriageDispositionView(view, game)
    )

    expect(chips.some((chip) => chip.id.startsWith('urgency:'))).toBe(true)
    expect(chips.length).toBeGreaterThan(1)
  })

  it('builds context footer with zero active cases', () => {
    const game = createStartingState()
    game.cases = {
      resolved: makeCase('resolved', { status: 'resolved', stage: 5 }),
    }

    const views = Object.values(game.cases).map((entry) => getCaseListItemView(entry, game))
    const footer = buildMissionTriageContextFooterView(views, game)

    expect(footer.projectedSupportLoad).toBe('low')
    expect(footer.urgentIfDeferred).toBe(0)
    expect(footer.escalationCarryoverRisk).toBe(0)
    expect(footer.routableCount).toBe(0)
  })

  it('maps global capacity-medium to medium support load, not high', () => {
    const game = createStartingState()
    const teamId = Object.keys(game.teams)[0]!
    game.cases = {
      openA: makeCase('openA', { status: 'open' }),
      openB: makeCase('openB', { status: 'open' }),
      active: makeCase('active', { status: 'in_progress', assignedTeamIds: [teamId] }),
    }

    const views = Object.values(game.cases).map((entry) => getCaseListItemView(entry, game))
    const sampleTriage = triageMission(game, game.cases.openA!)
    expect(sampleTriage.reasonCodes).toContain('capacity-medium')
    expect(sampleTriage.reasonCodes).not.toContain('capacity-high')

    const footer = buildMissionTriageContextFooterView(views, game)

    expect(footer.projectedSupportLoad).toBe('medium')
  })

  it('builds context footer counts from active triage views', () => {
    const game = createStartingState()
    game.cases = {
      urgent: makeCase('urgent', { stage: 4, deadlineRemaining: 1 }),
      assigned: makeCase('assigned', {
        status: 'in_progress',
        assignedTeamIds: [Object.keys(game.teams)[0]!],
      }),
      resolved: makeCase('resolved', { status: 'resolved', stage: 5 }),
    }

    const views = Object.values(game.cases).map((entry) =>
      getCaseListItemView(entry, game, { includeCovertPrepSignals: true })
    )
    const footer = buildMissionTriageContextFooterView(views, game)

    expect(footer.teamsAvailable).toBeGreaterThan(0)
    expect(footer.urgentIfDeferred).toBeGreaterThanOrEqual(1)
    expect(footer.routableCount).toBeGreaterThanOrEqual(1)
  })

  it('excludes ignored cases from urgent-if-deferred footer count', () => {
    const starter = createStartingState()
    const urgentCase = makeCase('urgent', { stage: 4, deadlineRemaining: 1 })
    const game = applyMissionTriageDisposition(
      {
        ...starter,
        cases: { urgent: urgentCase },
        missionRouting: normalizeMissionRoutingState({ ...starter, cases: { urgent: urgentCase } }),
      },
      'urgent',
      'ignore'
    )

    const views = Object.values(game.cases).map((entry) =>
      getCaseListItemView(entry, game, { includeCovertPrepSignals: true })
    )
    const footer = buildMissionTriageContextFooterView(views, game)

    expect(footer.urgentIfDeferred).toBe(0)
  })
})
