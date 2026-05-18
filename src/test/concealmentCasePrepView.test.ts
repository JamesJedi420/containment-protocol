import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildConcealCaseFlagId,
  canShowConcealmentCasePrepOnCase,
} from '../domain/concealmentCasePrep'
import { setPersistentFlag } from '../domain/flagSystem'
import { buildConcealmentCasePrepView } from '../features/cases/concealmentCasePrepView'
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

describe('concealmentCasePrepView', () => {
  it('is visible only for in-progress cases without hidden state', () => {
    const open = createOpenCase()
    expect(canShowConcealmentCasePrepOnCase(open)).toBe(true)
    expect(canShowConcealmentCasePrepOnCase({ ...open, status: 'resolved' })).toBe(false)
    expect(canShowConcealmentCasePrepOnCase({ ...open, hiddenState: 'hidden' })).toBe(false)

    const hidden = buildConcealmentCasePrepView(
      { ...open, hiddenState: 'hidden' },
      createStartingState()
    )
    expect(hidden.visible).toBe(false)
  })

  it('previews case-tag activation', () => {
    const view = buildConcealmentCasePrepView(createOpenCase(), createStartingState())

    expect(view.visible).toBe(true)
    expect(view.previewApplied).toBe(true)
    expect(view.previewReason).toBe('case-tag')
    expect(view.previewReasonLabel).toContain('tags')
    expect(view.activationTags).toContain('infiltration')
  })

  it('previews per-case conceal flag', () => {
    let state = createStartingState()
    state.cases['case-conceal-prep'] = createOpenCase({ tags: [] })

    state = setPersistentFlag(state, buildConcealCaseFlagId('case-conceal-prep'), true)

    const view = buildConcealmentCasePrepView(state.cases['case-conceal-prep']!, state)

    expect(view.previewApplied).toBe(true)
    expect(view.previewReason).toContain('conceal.case.')
    expect(view.playerConcealFlagActive).toBe(true)
  })

  it('lists authored triggers and allows flag toggle when triggers exist', () => {
    const caseData = createOpenCase({
      tags: [],
      concealmentTriggers: [
        {
          id: 'trigger:test-cover',
          mode: 'hidden',
          when: { anyTag: ['media'] },
        },
      ],
    })

    const view = buildConcealmentCasePrepView(caseData, createStartingState())

    expect(view.triggerRows).toHaveLength(1)
    expect(view.triggerRows[0]?.id).toBe('trigger:test-cover')
    expect(view.canToggleConcealFlag).toBe(true)
  })
})
