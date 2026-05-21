import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import type { CaseInstance } from '../../domain/models'
import {
  getCaseListItemView,
  getFilteredCaseViews,
  matchesCaseTriageTab,
  normalizeCaseListFilters,
  readCaseListFilters,
  writeCaseListFilters,
} from './caseView'

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

describe('caseView triage filters', () => {
  it('normalizeCaseListFilters drops selection hidden by active triage tab', () => {
    const game = createStartingState()
    game.cases = {
      open: makeCase('open', { title: 'Open Case' }),
      assigned: makeCase('assigned', {
        title: 'Assigned Case',
        status: 'in_progress',
        assignedTeamIds: [Object.keys(game.teams)[0]!],
      }),
    }

    const normalized = normalizeCaseListFilters(game, {
      q: '',
      status: 'all',
      mode: 'all',
      stage: 'all',
      sort: 'priority',
      risk: false,
      tab: 'assigned',
      selectedCaseId: 'open',
    })

    expect(normalized.selectedCaseId).toBe('')
  })

  it('writeCaseListFilters round-trips tab and case params', () => {
    const serialized = writeCaseListFilters({
      q: '',
      status: 'all',
      mode: 'all',
      stage: 'all',
      sort: 'priority',
      risk: false,
      tab: 'leads',
      selectedCaseId: 'case-lead-1',
    })

    expect(readCaseListFilters(serialized)).toMatchObject({
      tab: 'leads',
      selectedCaseId: 'case-lead-1',
    })
  })

  it('getFilteredCaseViews applies triage tab before status filters', () => {
    const game = createStartingState()
    const teamId = Object.keys(game.teams)[0]!
    game.cases = {
      open: makeCase('open', { title: 'Open Case' }),
      assigned: makeCase('assigned', {
        title: 'Assigned Case',
        status: 'in_progress',
        assignedTeamIds: [teamId],
      }),
    }

    const views = getFilteredCaseViews(game, {
      q: '',
      status: 'all',
      mode: 'all',
      stage: 'all',
      sort: 'title',
      risk: false,
      tab: 'assigned',
      selectedCaseId: '',
    })

    expect(views.map((view) => view.currentCase.id)).toEqual(['assigned'])
    expect(matchesCaseTriageTab(getCaseListItemView(game.cases.open!, game), 'assigned', game)).toBe(
      false
    )
  })
})
