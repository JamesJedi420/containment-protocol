import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { evaluateStealthLeaveBehindMissionPressure } from '../domain/stealthLeaveBehindRegistry'
import {
  applyStealthLeaveBehindSelection,
  canSelectStealthLeaveBehindOnCase,
  listSelectableStealthLeaveBehinds,
  readStealthLeaveBehindSelection,
} from '../domain/stealthLeaveBehindSelection'
import { STEALTH_LEAVE_BEHIND_KINDS } from '../domain/stealthLeaveBehindRegistry'
import { instantiateFromTemplate } from '../domain/sim/spawn'
import { caseTemplateMap } from '../domain/templates/caseTemplates'
import { createStarterCase } from '../domain/templates/startingCases'
import type { CaseInstance } from '../domain/models'

function createEligibleCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({ id: 'case-stealth-select', templateId: 'ops-003' }),
    status: 'in_progress',
    hiddenState: 'hidden',
    detectionConfidence: 0.25,
    counterDetection: false,
    tags: ['infiltration', 'archive', 'records'],
    requiredTags: [],
    preferredTags: [],
    stealthLeaveBehindId: 'leave-behind:leave-trace',
    ...overrides,
  }
}

describe('stealthLeaveBehindSelection', () => {
  it('lists all catalog rows only for in-progress eligible hidden cases', () => {
    const eligible = createEligibleCase()
    expect(listSelectableStealthLeaveBehinds(eligible)).toHaveLength(STEALTH_LEAVE_BEHIND_KINDS.length)
    expect(listSelectableStealthLeaveBehinds({ ...eligible, hiddenState: 'revealed' })).toEqual([])
    expect(listSelectableStealthLeaveBehinds({ ...eligible, status: 'open' })).toEqual([])
    expect(
      listSelectableStealthLeaveBehinds({
        ...eligible,
        tags: ['archive', 'records'],
      })
    ).toEqual([])
  })

  it('applies a valid selection to the case instance and rejects invalid input', () => {
    const state = createStartingState()
    state.cases['case-stealth-select'] = createEligibleCase()

    const applied = applyStealthLeaveBehindSelection(state, {
      caseId: 'case-stealth-select',
      leaveBehindId: 'leave-behind:risk-discovery',
    })

    expect(applied.applied).toBe(true)
    expect(applied.leaveBehindId).toBe('leave-behind:risk-discovery')
    expect(readStealthLeaveBehindSelection(applied.state, 'case-stealth-select')).toBe(
      'leave-behind:risk-discovery'
    )

    const unknown = applyStealthLeaveBehindSelection(applied.state, {
      caseId: 'case-stealth-select',
      leaveBehindId: 'leave-behind:missing',
    })
    expect(unknown.applied).toBe(false)
    expect(unknown.reason).toBe('unknown_id')

    const resolvedState = {
      ...state,
      cases: {
        ...state.cases,
        'case-stealth-select': { ...createEligibleCase(), status: 'resolved' as const },
      },
    }
    expect(
      applyStealthLeaveBehindSelection(resolvedState, {
        caseId: 'case-stealth-select',
        leaveBehindId: 'leave-behind:burn-tool',
      }).reason
    ).toBe('ineligible')

    expect(
      applyStealthLeaveBehindSelection(state, {
        caseId: 'missing-case',
        leaveBehindId: 'leave-behind:burn-tool',
      }).reason
    ).toBe('invalid_case')
  })

  it('drives mission pressure from the selected leave-behind id', () => {
    const state = createStartingState()
    state.cases['case-stealth-select'] = createEligibleCase({
      stealthLeaveBehindId: 'leave-behind:burn-tool',
    })

    const next = applyStealthLeaveBehindSelection(state, {
      caseId: 'case-stealth-select',
      leaveBehindId: 'leave-behind:expose-witness',
    }).state

    const caseData = next.cases['case-stealth-select']!
    const pressure = evaluateStealthLeaveBehindMissionPressure(caseData)

    expect(pressure.active).toBe(true)
    expect(pressure.leaveBehindId).toBe('leave-behind:expose-witness')
    expect(pressure.scoreAdjustment).toBe(2.8)
    expect(pressure.custodyLossRefs).toEqual(['custody:witness-credential'])
  })

  it('keeps template default on spawn when the player never selects', () => {
    const spawned = instantiateFromTemplate(caseTemplateMap['ops-003'], () => 0.2, new Set())

    expect(spawned.stealthLeaveBehindId).toBe('leave-behind:leave-trace')

    const state = createStartingState()
    state.cases[spawned.id] = spawned

    expect(readStealthLeaveBehindSelection(state, spawned.id)).toBe('leave-behind:leave-trace')
  })

  it('canSelectStealthLeaveBehindOnCase requires in_progress and concealment eligibility', () => {
    const eligible = createEligibleCase()
    expect(canSelectStealthLeaveBehindOnCase(eligible)).toBe(true)
    expect(canSelectStealthLeaveBehindOnCase({ ...eligible, status: 'open' })).toBe(false)
    expect(canSelectStealthLeaveBehindOnCase({ ...eligible, hiddenState: 'displaced' })).toBe(false)
  })
})
