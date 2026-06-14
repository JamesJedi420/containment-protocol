import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  DISCLOSURE_PROGRESSION_FIXTURE,
  type PublicDisclosureRecord,
} from '../domain/publicDisclosureStateRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

const SEGMENT_DIVERGENCE_FIXTURE: PublicDisclosureRecord = {
  ...DISCLOSURE_PROGRESSION_FIXTURE,
  id: 'disclosure:segment-divergence-test',
  label: 'Segment trust divergence campaign',
  trustByRegion: [
    { regionRef: 'population:general-public', trustScore: 0.72 },
    { regionRef: 'population:affected-residents', trustScore: 0.28 },
    { regionRef: 'channel:institutional-press', trustScore: 0.55 },
    { regionRef: 'channel:community-forums', trustScore: 0.18 },
  ],
}

describe('advanceWeek public disclosure segmented trust integration (SPE-861 slice 3)', () => {
  it('is a no-op for an empty public disclosure map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.publicDisclosureRecords = {}

    const nextState = advanceWeek(state)
    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const segmentNotes =
      weeklyReport?.notes?.filter(
        (note) => note.type === 'public_disclosure.segment_trust_divergence'
      ) ?? []

    expect(segmentNotes).toEqual([])
  })

  it('surfaces segment-divergence notes after post-tick disclosure records diverge', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.publicDisclosureRecords = {
      [SEGMENT_DIVERGENCE_FIXTURE.id]: SEGMENT_DIVERGENCE_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const segmentNotes =
      weeklyReport?.notes?.filter(
        (note) => note.type === 'public_disclosure.segment_trust_divergence'
      ) ?? []

    expect(segmentNotes).toHaveLength(1)
    expect(segmentNotes[0]?.content).toContain('Public disclosure segment trust divergence')
    expect(segmentNotes[0]?.content).toContain('Affected Residents (Low)')
    expect(segmentNotes[0]?.content).toContain('General Public (High)')
    expect(segmentNotes[0]?.metadata?.hasDivergence).toBe(true)
    expect(segmentNotes[0]?.metadata?.visibleSegmentCount).toBe(4)
  })

  it('does not emit segment-divergence notes when segment trust is uniform', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: {
        ...DISCLOSURE_PROGRESSION_FIXTURE,
        trustByRegion: [
          { regionRef: 'population:general-public', trustScore: 0.65 },
          { regionRef: 'channel:institutional-press', trustScore: 0.62 },
        ],
      },
    }

    const nextState = advanceWeek(state)
    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const segmentNotes =
      weeklyReport?.notes?.filter(
        (note) => note.type === 'public_disclosure.segment_trust_divergence'
      ) ?? []

    expect(segmentNotes).toEqual([])
  })
})
