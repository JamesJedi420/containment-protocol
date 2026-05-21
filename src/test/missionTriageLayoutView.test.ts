import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { getCaseListItemView, matchesCaseTriageTab } from '../features/cases/caseView'
import {
  buildMissionTriageCompactRowView,
  buildMissionTriageContextFooterView,
} from '../features/cases/missionTriageLayoutView'
import { triageMission } from '../domain/missionIntakeRouting'
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
    const row = buildMissionTriageCompactRowView(view, triage, '', '')

    expect(row.priority).toBe(triage.priority)
    expect(row.priorityScore).toBe(triage.score)
    expect(row.priorityScore).toBeGreaterThan(0)
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
})
