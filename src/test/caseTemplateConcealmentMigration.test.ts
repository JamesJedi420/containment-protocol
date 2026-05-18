import { describe, expect, it } from 'vitest'
import { caseTemplateMap } from '../data/caseTemplates'
import { createStartingState } from '../data/startingState'
import { resolveConcealmentActivation } from '../domain/hiddenStateActivation'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { instantiateFromTemplate } from '../domain/sim/spawn'

const MIGRATED_TEMPLATE_IDS = ['ops-001', 'ops-002', 'ops-003', 'ops-004'] as const

describe('case template concealment migration', () => {
  it.each(MIGRATED_TEMPLATE_IDS)('catalog template %s carries normalized concealmentTriggers', (templateId) => {
    const template = caseTemplateMap[templateId]
    expect(template?.concealmentTriggers?.length).toBeGreaterThan(0)
  })

  it('activates hidden presence from migrated ops-004 without global conceal flags', () => {
    const state = createStartingState()
    const [teamId] = Object.keys(state.teams)
    const template = caseTemplateMap['ops-004']
    const spawned = instantiateFromTemplate(template, () => 0.42, new Set(Object.keys(state.cases)))

    state.reports = []
    state.agency!.supportAvailable = 3
    state.globalFlags = {}
    state.cases[spawned.id] = {
      ...spawned,
      mode: 'deterministic',
      status: 'in_progress',
      assignedTeamIds: [teamId],
      weeksRemaining: 1,
    }

    const activation = resolveConcealmentActivation(state.cases[spawned.id], {
      globalFlags: state.globalFlags,
    })
    expect(activation.applied).toBe(true)
    expect(activation.reason).toBe('authored-trigger:trigger:ops-004-briefing-cover')

    const nextState = advanceWeek(state)
    const resolved = nextState.cases[spawned.id]
    expect(resolved.hiddenState).toBe('hidden')
  })
})
