import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  applyMissionTriageDisposition,
  normalizeMissionRoutingState,
} from '../domain/missionIntakeRouting'
import { getCaseListItemView } from '../features/cases/caseView'
import { buildMissionTriageDispositionView } from '../features/cases/missionTriageDispositionView'
import { MISSION_TRIAGE_DISPOSITION_LABELS } from '../data/copy'

describe('missionTriageDispositionView', () => {
  it('shows disposition controls for open unassigned non-major cases', () => {
    const game = {
      ...createStartingState(),
      missionRouting: normalizeMissionRoutingState(createStartingState()),
    }
    const view = getCaseListItemView(game.cases['case-001']!, game, {
      includeCovertPrepSignals: true,
    })
    const disposition = buildMissionTriageDispositionView(view, game)

    expect(disposition.visible).toBe(true)
    expect(disposition.routeEnabled).toBe(true)
    expect(disposition.active).toBeNull()
  })

  it('shows defer consequence detail only when defer is active', () => {
    const game = {
      ...createStartingState(),
      missionRouting: normalizeMissionRoutingState(createStartingState()),
    }
    const view = getCaseListItemView(game.cases['case-001']!, game, {
      includeCovertPrepSignals: true,
    })
    const beforeDefer = buildMissionTriageDispositionView(view, game)

    expect(beforeDefer.consequenceDetail).toBeNull()

    const deferred = applyMissionTriageDisposition(game, 'case-001', 'defer')
    const deferredView = getCaseListItemView(deferred.cases['case-001']!, deferred, {
      includeCovertPrepSignals: true,
    })
    const afterDefer = buildMissionTriageDispositionView(deferredView, deferred)

    expect(afterDefer.consequenceDetail).toBeTruthy()
  })

  it('reflects active defer disposition and consequence detail', () => {
    const base = {
      ...createStartingState(),
      missionRouting: normalizeMissionRoutingState(createStartingState()),
    }
    const game = applyMissionTriageDisposition(base, 'case-001', 'defer')
    const view = getCaseListItemView(game.cases['case-001']!, game, {
      includeCovertPrepSignals: true,
    })
    const disposition = buildMissionTriageDispositionView(view, game)

    expect(disposition.active).toBe('defer')
    expect(disposition.activeLabel).toBe(MISSION_TRIAGE_DISPOSITION_LABELS.activeDefer)
    expect(disposition.consequenceDetail).toBeTruthy()
  })

  it('hides disposition controls when a team is already assigned', () => {
    const game = createStartingState()
    const assignedCase = {
      ...game.cases['case-001']!,
      assignedTeamIds: [Object.keys(game.teams)[0]!],
      status: 'in_progress' as const,
    }
    const state = {
      ...game,
      cases: { ...game.cases, 'case-001': assignedCase },
    }
    const view = getCaseListItemView(assignedCase, state, { includeCovertPrepSignals: true })
    const disposition = buildMissionTriageDispositionView(view, state)

    expect(disposition.visible).toBe(false)
  })
})
