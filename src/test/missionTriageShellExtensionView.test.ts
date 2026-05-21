import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { APP_ROUTES } from '../app/routes'
import {
  buildMissionTriageBoardViews,
  getCaseListItemView,
} from '../features/cases/caseView'
import { buildMissionTriageShellExtensionSignals } from '../features/cases/missionTriageShellExtensionView'
import { buildMissionTriageContextFooterView } from '../features/cases/missionTriageLayoutView'
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

describe('missionTriageShellExtensionView', () => {
  it('excludes resolved cases from supplied board views', () => {
    const game = createStartingState()
    game.cases = {
      open: makeCase('open', { status: 'open' }),
      resolved: makeCase('resolved', { status: 'resolved', stage: 5 }),
    }

    const views = Object.values(game.cases).map((entry) => getCaseListItemView(entry, game))
    const signals = buildMissionTriageShellExtensionSignals(
      game,
      views,
      `${APP_ROUTES.cases}?status=open&tab=all`
    )

    expect(signals.find((signal) => signal.id === 'triage-queue')).toMatchObject({ value: '1' })
  })

  it('builds queue and routable signals aligned with context footer', () => {
    const game = createStartingState()
    game.cases = {
      urgent: makeCase('urgent', { stage: 4, deadlineRemaining: 1 }),
      assigned: makeCase('assigned', {
        status: 'in_progress',
        assignedTeamIds: [Object.keys(game.teams)[0]!],
      }),
    }

    const views = Object.values(game.cases).map((entry) => getCaseListItemView(entry, game))
    const footer = buildMissionTriageContextFooterView(views, game)
    const signals = buildMissionTriageShellExtensionSignals(
      game,
      views,
      `${APP_ROUTES.cases}?status=open&tab=all`
    )

    expect(signals.find((signal) => signal.id === 'triage-queue')).toMatchObject({
      label: 'Queue',
      value: '2',
      href: `${APP_ROUTES.cases}?status=open&tab=all`,
    })
    expect(signals.find((signal) => signal.id === 'triage-routable')).toMatchObject({
      label: 'Routable',
      value: String(footer.routableCount),
      href: `${APP_ROUTES.cases}?status=open&tab=all`,
    })
    expect(signals.find((signal) => signal.id === 'triage-urgent')).toMatchObject({
      label: 'Urgent',
      value: String(footer.urgentIfDeferred),
      tone: 'warning',
    })
  })

  it('omits urgent chip when no unassigned urgent cases', () => {
    const game = createStartingState()
    const teamId = Object.keys(game.teams)[0]!
    game.cases = {
      assigned: makeCase('assigned', {
        status: 'in_progress',
        assignedTeamIds: [teamId],
        stage: 1,
        deadlineRemaining: 3,
      }),
    }

    const views = Object.values(game.cases).map((entry) => getCaseListItemView(entry, game))
    const signals = buildMissionTriageShellExtensionSignals(
      game,
      views,
      `${APP_ROUTES.cases}?status=open&tab=all`
    )

    expect(signals.map((signal) => signal.id)).toEqual(['triage-queue', 'triage-routable'])
  })

  it('respects the same status filters as the triage board footer', () => {
    const game = createStartingState()
    game.cases = {
      open: makeCase('open', { status: 'open' }),
      active: makeCase('active', { status: 'in_progress' }),
    }

    const allViews = Object.values(game.cases).map((entry) => getCaseListItemView(entry, game))
    const openOnlyViews = buildMissionTriageBoardViews(
      game,
      {
        q: '',
        status: 'open',
        mode: 'all',
        stage: 'all',
        sort: 'priority',
        risk: false,
        tab: 'all',
        selectedCaseId: '',
      },
      { includeCovertPrepSignals: true }
    )

    expect(buildMissionTriageShellExtensionSignals(game, allViews).find((s) => s.id === 'triage-queue'))
      .toMatchObject({ value: '2' })
    expect(buildMissionTriageShellExtensionSignals(game, openOnlyViews).find((s) => s.id === 'triage-queue'))
      .toMatchObject({ value: '1' })
  })

  it('returns zero-valued queue and routable chips for an empty board view list', () => {
    const game = createStartingState()
    game.cases = {}

    expect(buildMissionTriageShellExtensionSignals(game, [])).toEqual([
      expect.objectContaining({ id: 'triage-queue', value: '0' }),
      expect.objectContaining({ id: 'triage-routable', value: '0' }),
    ])
  })
})
