import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildConcealCaseFlagId } from '../domain/concealmentCasePrep'
import { buildConcealmentPrepActivationPreviewNotes } from '../domain/concealmentPrepActivationPreviewNotes'
import { setPersistentFlag } from '../domain/flagSystem'
import { TELL_THERMAL_RESIDUAL_TAG } from '../domain/hiddenStateModalityTells'
import { createStarterCase } from '../domain/templates/startingCases'

function createOpenCase(overrides: Record<string, unknown> = {}) {
  return {
    ...createStarterCase({ id: 'case-conceal-prep', templateId: 'ops-003' }),
    status: 'in_progress' as const,
    tags: ['infiltration'],
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: [],
    ...overrides,
  }
}

describe('buildConcealmentPrepActivationPreviewNotes', () => {
  it('returns empty notes for resolved or concealed cases', () => {
    const open = createOpenCase()
    const game = createStartingState()

    expect(
      buildConcealmentPrepActivationPreviewNotes({ ...open, status: 'resolved' }, game)
    ).toEqual([])
    expect(
      buildConcealmentPrepActivationPreviewNotes({ ...open, hiddenState: 'hidden' }, game)
    ).toEqual([])
  })

  it('includes future-tense activation preview for case-tag eligibility', () => {
    const notes = buildConcealmentPrepActivationPreviewNotes(
      createOpenCase(),
      createStartingState()
    )

    expect(notes[0]).toContain('Next weekly tick will apply hidden presence')
    expect(notes[0]).toContain('concealment activation tags')
  })

  it('includes covert-flag activation preview', () => {
    let state = createStartingState()
    state.cases['case-conceal-prep'] = createOpenCase({ tags: [] })
    state = setPersistentFlag(state, buildConcealCaseFlagId('case-conceal-prep'), true)

    const notes = buildConcealmentPrepActivationPreviewNotes(
      state.cases['case-conceal-prep']!,
      state
    )

    expect(notes.some((note) => note.includes('covert posture flag'))).toBe(true)
  })

  it('includes authored tell preview when tell tags are present without assigned teams', () => {
    const notes = buildConcealmentPrepActivationPreviewNotes(
      createOpenCase({
        tags: ['concealment', TELL_THERMAL_RESIDUAL_TAG],
      }),
      createStartingState()
    )

    expect(notes.some((note) => note.includes('Concealment tell readout:'))).toBe(true)
  })

  it('includes illusion preview for false-entity cases', () => {
    const notes = buildConcealmentPrepActivationPreviewNotes(
      createOpenCase({
        tags: ['false-entity'],
      }),
      createStartingState()
    )

    expect(notes.some((note) => note.includes('False-entity overlay'))).toBe(true)
  })
})
