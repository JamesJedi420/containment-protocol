import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTeamAssignableCaseViews } from '../features/teams/teamInsights'
import type { CaseInstance, GameState, PerformanceMetricSummary, Team } from '../domain/models'
import { createDefaultTeamEquipmentSummary } from '../domain/equipment'

const { previewCaseOutcomeMock } = vi.hoisted(() => ({
  previewCaseOutcomeMock: vi.fn(),
}))

vi.mock('../domain/sim/resolve', () => ({
  buildResolutionPreviewState: (state: GameState) => state,
  previewCaseOutcome: previewCaseOutcomeMock,
}))

const EMPTY_PERFORMANCE_SUMMARY: PerformanceMetricSummary = {
  contribution: 0,
  threatHandled: 0,
  damageTaken: 0,
  healingPerformed: 0,
  evidenceGathered: 0,
  containmentActionsCompleted: 0,
}

function makeCase(id: string, overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    id,
    templateId: id,
    title: `Case ${id}`,
    description: `Case ${id} description`,
    mode: 'threshold',
    kind: 'case',
    status: 'open',
    difficulty: {
      combat: 10,
      investigation: 10,
      utility: 10,
      social: 10,
    },
    weights: {
      combat: 0.25,
      investigation: 0.25,
      utility: 0.25,
      social: 0.25,
    },
    tags: [],
    requiredTags: [],
    preferredTags: [],
    stage: 1,
    durationWeeks: 2,
    weeksRemaining: undefined,
    deadlineWeeks: 12,
    deadlineRemaining: 12,
    intelConfidence: 1,
    intelUncertainty: 0,
    intelLastUpdatedWeek: 0,
    assignedTeamIds: [],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 0, max: 1 },
      spawnTemplateIds: [],
    },
    onUnresolved: {
      stageDelta: 1,
      spawnCount: { min: 0, max: 1 },
      spawnTemplateIds: [],
    },
    ...overrides,
  }
}

describe('getTeamAssignableCaseViews', () => {
  beforeEach(() => {
    previewCaseOutcomeMock.mockReset()
  })

  it('returns an empty list when no cases exist', () => {
    const game = { cases: {} } as unknown as GameState

    const views = getTeamAssignableCaseViews({ id: 'team-1' } as Team, game, 4)

    expect(views).toEqual([])
    expect(previewCaseOutcomeMock).not.toHaveBeenCalled()
  })

  it('returns an empty list when all cases are blocked', () => {
    const game = {
      cases: {
        a: makeCase('a'),
        b: makeCase('b'),
      },
    } as unknown as GameState

    previewCaseOutcomeMock.mockImplementation(() => ({
      blockedReason: 'resolved',
      odds: undefined,
      preview: undefined,
    }))

    const views = getTeamAssignableCaseViews({ id: 'team-1' } as Team, game, 4)

    expect(views).toEqual([])
  })

  it('blends urgency and viability when ranking assignable cases', () => {
    const urgentCase = makeCase('urgent', {
      title: 'Urgent Signal Loss',
      stage: 5,
      deadlineRemaining: 1,
    })
    const highViabilityCase = makeCase('viable', {
      title: 'Routine Patrol Sweep',
      stage: 1,
      deadlineRemaining: 12,
    })

    const game = {
      cases: {
        [urgentCase.id]: urgentCase,
        [highViabilityCase.id]: highViabilityCase,
      },
    } as unknown as GameState

    previewCaseOutcomeMock.mockImplementation((_team: Team, currentCase: CaseInstance) => {
      if (currentCase.id === 'urgent') {
        return {
          blockedReason: undefined,
          odds: { success: 0.4, partial: 0.2, fail: 0.4 },
          preview: {
            performanceSummary: EMPTY_PERFORMANCE_SUMMARY,
            equipmentSummary: createDefaultTeamEquipmentSummary(),
          },
        }
      }

      return {
        blockedReason: undefined,
        odds: { success: 0.9, partial: 0, fail: 0.1 },
        preview: {
          performanceSummary: EMPTY_PERFORMANCE_SUMMARY,
          equipmentSummary: createDefaultTeamEquipmentSummary(),
        },
      }
    })

    const views = getTeamAssignableCaseViews({ id: 'team-1' } as Team, game, 4)

    expect(views.map((view) => view.currentCase.id)).toEqual(['urgent', 'viable'])
  })

  it('uses success odds as deterministic tie-breaker when prioritization score is equal', () => {
    const higherSuccess = makeCase('alpha', {
      title: 'Alpha Case',
      stage: 2,
      deadlineRemaining: 5,
    })
    const lowerSuccess = makeCase('beta', {
      title: 'Beta Case',
      stage: 2,
      deadlineRemaining: 5,
    })

    const game = {
      cases: {
        [higherSuccess.id]: higherSuccess,
        [lowerSuccess.id]: lowerSuccess,
      },
    } as unknown as GameState

    previewCaseOutcomeMock.mockImplementation((_team: Team, currentCase: CaseInstance) => {
      if (currentCase.id === 'alpha') {
        return {
          blockedReason: undefined,
          odds: { success: 0.8, partial: 0, fail: 0.2 },
          preview: {
            performanceSummary: EMPTY_PERFORMANCE_SUMMARY,
            equipmentSummary: createDefaultTeamEquipmentSummary(),
          },
        }
      }

      return {
        blockedReason: undefined,
        odds: { success: 0.7, partial: 0.2, fail: 0.1 },
        preview: {
          performanceSummary: EMPTY_PERFORMANCE_SUMMARY,
          equipmentSummary: createDefaultTeamEquipmentSummary(),
        },
      }
    })

    const views = getTeamAssignableCaseViews({ id: 'team-1' } as Team, game, 4)

    expect(views.map((view) => view.currentCase.id)).toEqual(['alpha', 'beta'])
  })

  it('filters blocked outcomes and respects the requested limit', () => {
    const ids = ['a', 'b', 'c', 'd', 'e']
    const cases = Object.fromEntries(
      ids.map((id, index) => [
        id,
        makeCase(id, {
          title: `Case ${id.toUpperCase()}`,
          stage: 3,
          deadlineRemaining: index + 1,
        }),
      ])
    )

    const game = { cases } as unknown as GameState

    previewCaseOutcomeMock.mockImplementation((_team: Team, currentCase: CaseInstance) => {
      if (currentCase.id === 'c') {
        return {
          blockedReason: 'resolved',
          odds: undefined,
          preview: undefined,
        }
      }

      return {
        blockedReason: undefined,
        odds: {
          success: 0.4 + (6 - currentCase.deadlineRemaining) * 0.05,
          partial: 0.1,
          fail: 0.5 - (6 - currentCase.deadlineRemaining) * 0.05,
        },
        preview: {
          performanceSummary: EMPTY_PERFORMANCE_SUMMARY,
          equipmentSummary: createDefaultTeamEquipmentSummary(),
        },
      }
    })

    const views = getTeamAssignableCaseViews({ id: 'team-1' } as Team, game, 2)

    expect(views).toHaveLength(2)
    expect(views.map((view) => view.currentCase.id)).toEqual(['a', 'b'])
    expect(views.some((view) => view.currentCase.id === 'c')).toBe(false)
  })

  it('keeps deterministic ordering for out-of-range stage and deadline values', () => {
    const cases = {
      bounded: makeCase('bounded', {
        title: 'Bounded Baseline',
        stage: 5,
        deadlineRemaining: 12,
      }),
      outOfRange: makeCase('out-of-range', {
        title: 'Out Of Range',
        stage: 10,
        deadlineRemaining: 100,
      }),
      negative: makeCase('negative', {
        title: 'Negative Deadline',
        stage: 0,
        deadlineRemaining: -3,
      }),
    }

    const game = { cases } as unknown as GameState

    previewCaseOutcomeMock.mockImplementation(() => ({
      blockedReason: undefined,
      odds: { success: 0.4, partial: 0.2, fail: 0.4 },
      preview: {
        performanceSummary: EMPTY_PERFORMANCE_SUMMARY,
        equipmentSummary: createDefaultTeamEquipmentSummary(),
      },
    }))

    const views = getTeamAssignableCaseViews({ id: 'team-1' } as Team, game, 4)

    expect(views.map((view) => view.currentCase.id)).toEqual([
      'out-of-range',
      'bounded',
      'negative',
    ])
  })

  it('falls back to raw deadline and title tie-breakers when score surfaces are equivalent', () => {
    const fasterDeadline = makeCase('faster', {
      title: 'Alpha Deadline',
      stage: 5,
      deadlineRemaining: 12,
    })
    const slowerDeadline = makeCase('slower', {
      title: 'Zulu Deadline',
      stage: 5,
      deadlineRemaining: 100,
    })
    const titleOnlyA = makeCase('title-a', {
      title: 'Alpha Title',
      stage: 4,
      deadlineRemaining: 20,
    })
    const titleOnlyZ = makeCase('title-z', {
      title: 'Zulu Title',
      stage: 4,
      deadlineRemaining: 20,
    })

    const game = {
      cases: {
        [fasterDeadline.id]: fasterDeadline,
        [slowerDeadline.id]: slowerDeadline,
        [titleOnlyA.id]: titleOnlyA,
        [titleOnlyZ.id]: titleOnlyZ,
      },
    } as unknown as GameState

    previewCaseOutcomeMock.mockImplementation(() => ({
      blockedReason: undefined,
      odds: { success: 0.5, partial: 0.2, fail: 0.3 },
      preview: {
        performanceSummary: EMPTY_PERFORMANCE_SUMMARY,
        equipmentSummary: createDefaultTeamEquipmentSummary(),
      },
    }))

    const views = getTeamAssignableCaseViews({ id: 'team-1' } as Team, game, 4)

    expect(views.map((view) => view.currentCase.id)).toEqual([
      'faster',
      'slower',
      'title-a',
      'title-z',
    ])
  })

  it('returns no results when limit is zero', () => {
    const game = {
      cases: {
        a: makeCase('a'),
        b: makeCase('b'),
      },
    } as unknown as GameState

    previewCaseOutcomeMock.mockImplementation((_team: Team, currentCase: CaseInstance) => ({
      blockedReason: undefined,
      odds: { success: currentCase.id === 'a' ? 0.8 : 0.7, partial: 0.1, fail: 0.1 },
      preview: {
        performanceSummary: EMPTY_PERFORMANCE_SUMMARY,
        equipmentSummary: createDefaultTeamEquipmentSummary(),
      },
    }))

    const views = getTeamAssignableCaseViews({ id: 'team-1' } as Team, game, 0)

    expect(views).toEqual([])
  })

  it('respects small and oversized limits deterministically', () => {
    const game = {
      cases: {
        a: makeCase('a', { title: 'Alpha', stage: 3, deadlineRemaining: 4 }),
        b: makeCase('b', { title: 'Bravo', stage: 2, deadlineRemaining: 5 }),
        c: makeCase('c', { title: 'Charlie', stage: 1, deadlineRemaining: 6 }),
      },
    } as unknown as GameState

    previewCaseOutcomeMock.mockImplementation((_team: Team, currentCase: CaseInstance) => ({
      blockedReason: undefined,
      odds: {
        success: currentCase.id === 'a' ? 0.8 : currentCase.id === 'b' ? 0.7 : 0.6,
        partial: 0.1,
        fail: 0.1,
      },
      preview: {
        performanceSummary: EMPTY_PERFORMANCE_SUMMARY,
        equipmentSummary: createDefaultTeamEquipmentSummary(),
      },
    }))

    const one = getTeamAssignableCaseViews({ id: 'team-1' } as Team, game, 1)
    const oversized = getTeamAssignableCaseViews({ id: 'team-1' } as Team, game, 999)

    expect(one).toHaveLength(1)
    expect(one[0]?.currentCase.id).toBe('a')
    expect(oversized).toHaveLength(3)
    expect(oversized.map((view) => view.currentCase.id)).toEqual(['a', 'b', 'c'])
  })
})
