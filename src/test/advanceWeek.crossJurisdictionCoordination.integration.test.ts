import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE } from '../domain/informationIntakeReport'
import { advanceWeek } from '../domain/sim/advanceWeek'
import type { CaseInstance } from '../domain/models'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function makeLinkedCase(
  overrides: Partial<CaseInstance> & Pick<CaseInstance, 'id' | 'title' | 'status' | 'regionTag'>
): CaseInstance {
  return {
    templateId: 'tpl-coord',
    description: 'coordination probe',
    mode: 'standard',
    kind: 'standard',
    difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
    weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    tags: ['topic:canal-bridge-incident'],
    requiredTags: [],
    preferredTags: [],
    stage: 1,
    durationWeeks: 2,
    deadlineWeeks: 4,
    deadlineRemaining: 4,
    assignedTeamIds: [],
    ...overrides,
  } as CaseInstance
}

describe('advanceWeek cross-jurisdiction coordination integration (SPE-2702)', () => {
  it('emits a coordination note when archive_signature intake pairs with distant regionTags', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)

    const prior = makeLinkedCase({
      id: 'case-coord-prior',
      title: 'Canal archive case',
      status: 'resolved',
      regionTag: 'region:canal-west',
    })
    const current = makeLinkedCase({
      id: 'case-coord-current',
      title: 'Harbor reappearance',
      status: 'open',
      regionTag: 'region:harbor-east',
    })

    state.cases = { ...state.cases, [prior.id]: prior, [current.id]: current }
    state.informationIntakeReports = {
      [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const lastReport = nextState.reports[nextState.reports.length - 1]
    const coordinationNotes =
      lastReport?.notes?.filter((note) => note.type === 'agency.cross_jurisdiction_coordination') ?? []

    expect(coordinationNotes.length).toBeGreaterThanOrEqual(1)
    expect(coordinationNotes[0]?.content).toMatch(/region:canal-west/)
    expect(coordinationNotes[0]?.content).toMatch(/region:harbor-east/)
  })

  it('does not emit a coordination note for same-jurisdiction signature reappearance', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)

    const prior = makeLinkedCase({
      id: 'case-coord-prior-same',
      title: 'Canal archive case',
      status: 'resolved',
      regionTag: 'region:canal-west',
    })
    const current = makeLinkedCase({
      id: 'case-coord-current-same',
      title: 'Canal follow-up',
      status: 'open',
      regionTag: 'region:canal-west',
    })

    state.cases = { ...state.cases, [prior.id]: prior, [current.id]: current }
    state.informationIntakeReports = {
      [IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE.id]: IMPOSSIBLE_ARCHIVED_SIGNATURE_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const lastReport = nextState.reports[nextState.reports.length - 1]
    const coordinationNotes =
      lastReport?.notes?.filter((note) => note.type === 'agency.cross_jurisdiction_coordination') ?? []

    expect(coordinationNotes).toHaveLength(0)
  })
})
