import { describe, expect, it } from 'vitest'
import { caseTemplateMap } from '../data/caseTemplates'
import { createStartingState } from '../data/startingState'
import { resolveConcealmentActivation } from '../domain/hiddenStateActivation'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { createStarterCase } from '../domain/templates/startingCases'
import { instantiateFromTemplate } from '../domain/sim/spawn'

const BATCH_ONE_TEMPLATE_IDS = ['ops-001', 'ops-002', 'ops-003', 'ops-004'] as const

const BATCH_TWO_TEMPLATE_IDS = [
  'occult-003',
  'occult-006',
  'occult-008',
  'psi-002',
  'psi-003',
  'psi-occ-001',
  'psi-007',
  'ops-007',
  'ops-008',
] as const

const BATCH_THREE_STARTER_CHAIN_TEMPLATE_IDS = [
  'combat_vampire_nest',
  'puzzle_whispering_archive',
  'mixed_eclipse_ritual',
  'followup_missing_persons',
  'followup_false_memories',
  'followup_campus_outbreak',
  'followup_blackout',
  'followup_targeted_abductions',
] as const

const BATCH_FOUR_TEMPLATE_IDS = [
  'ops-005',
  'bio-forensics-001',
  'info-001',
  'occult-001',
  'occult-002',
  'occult-004',
  'occult-005',
  'occult-007',
  'psi-001',
  'psi-004',
  'psi-006',
  'followup_psi_aftermath',
] as const

describe('case template concealment migration', () => {
  it.each([
    ...BATCH_ONE_TEMPLATE_IDS,
    ...BATCH_TWO_TEMPLATE_IDS,
    ...BATCH_THREE_STARTER_CHAIN_TEMPLATE_IDS,
    ...BATCH_FOUR_TEMPLATE_IDS,
  ])(
    'catalog template %s carries normalized concealmentTriggers',
    (templateId) => {
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

  it('copies starter-chain triggers onto cases created via createStarterCase', () => {
    const starterCase = createStarterCase({
      id: 'case-starter-test',
      templateId: 'puzzle_whispering_archive',
    })

    expect(starterCase.concealmentTriggers).toEqual([
      {
        id: 'trigger:puzzle-archive-basement-infiltration',
        mode: 'hidden',
        when: { anyTag: ['haunting', 'research'] },
      },
    ])
  })

  it('activates hidden presence from migrated occult-006 procession blend trigger', () => {
    const template = caseTemplateMap['occult-006']
    const caseData = instantiateFromTemplate(template, () => 0.33, new Set())

    const activation = resolveConcealmentActivation(caseData, { globalFlags: {} })
    expect(activation.applied).toBe(true)
    expect(activation.reason).toBe('authored-trigger:trigger:occult-006-procession-blend')
  })

  it('activates hidden presence from migrated ops-005 black chamber trigger', () => {
    const state = createStartingState()
    const [teamId] = Object.keys(state.teams)
    const template = caseTemplateMap['ops-005']
    const spawned = instantiateFromTemplate(template, () => 0.42, new Set(Object.keys(state.cases)))

    state.reports = []
    state.agency!.supportAvailable = 3
    state.globalFlags = {}
    state.cases[spawned.id] = {
      ...spawned,
      mode: 'probability',
      status: 'in_progress',
      assignedTeamIds: [teamId],
      weeksRemaining: 1,
    }

    const activation = resolveConcealmentActivation(state.cases[spawned.id], {
      globalFlags: state.globalFlags,
    })
    expect(activation.applied).toBe(true)
    expect(activation.reason).toBe('authored-trigger:trigger:ops-005-chamber-approach')

    const nextState = advanceWeek(state)
    expect(nextState.cases[spawned.id].hiddenState).toBe('hidden')
  })
})
