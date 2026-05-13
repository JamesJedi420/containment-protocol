import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  applyFieldBaseStagingRotationAtWeekOpen,
  applyFieldBaseSupplyToInventoryRewards,
  fieldBaseMaterialSupplyMultiplier,
  fieldBaseRotationFatigueRelief,
  formatFieldBaseStagingLegibilityLine,
  readFieldBaseFromCase,
} from '../domain/fieldBaseStaging'
import type { CaseInstance, GameState } from '../domain/models'

const SAMPLE_PACKET = {
  label: 'test-bivouac',
  quality: { safety: 2, medical: 2, supply: 3, extractionAccess: 1 },
} as const

describe('field base staging (SPE-1654)', () => {
  it('computes deterministic supply multiplier from supply band', () => {
    expect(fieldBaseMaterialSupplyMultiplier(SAMPLE_PACKET)).toBeCloseTo(1.21, 5)
    expect(
      fieldBaseMaterialSupplyMultiplier({
        label: 'x',
        quality: { safety: 0, medical: 0, supply: 0, extractionAccess: 0 },
      })
    ).toBe(1)
  })

  it('scales material inventory grants deterministically', () => {
    const grants = [
      { kind: 'material' as const, itemId: 'occult_reagents', label: 'Reagents', quantity: 10, tags: [] },
    ]
    const scaled = applyFieldBaseSupplyToInventoryRewards(SAMPLE_PACKET, grants)
    expect(scaled[0]!.quantity).toBe(12)
  })

  it('computes bounded rotation fatigue relief from medical and safety', () => {
    expect(fieldBaseRotationFatigueRelief(SAMPLE_PACKET)).toBe(24)
  })

  it('reads field base from case contract runtime', () => {
    const c: CaseInstance = {
      id: 'c1',
      templateId: 'occult-005',
      title: 't',
      description: 'd',
      mode: 'probability',
      kind: 'case',
      status: 'open',
      difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
      tags: [],
      requiredTags: [],
      preferredTags: [],
      stage: 1,
      durationWeeks: 3,
      deadlineWeeks: 4,
      deadlineRemaining: 4,
      assignedTeamIds: [],
      onFail: { type: 'none' },
      onUnresolved: { type: 'none' },
      contract: {
        templateId: 'institutions-liturgy-expedition',
        fieldBase: { label: 'vault', quality: { safety: 1, medical: 2, supply: 1, extractionAccess: 0 } },
      },
    }
    expect(readFieldBaseFromCase(c)?.quality.medical).toBe(2)
  })

  it('rotates exhausted operative out for fresher reserve on field-base in-progress contract', () => {
    const shell = createStartingState()
    const deployedTeamId = 't_nightwatch'
    const sansSato = shell.teams.t_greentape!.agentIds.filter((id) => id !== 'a_sato')

    const baseCase: CaseInstance = {
      id: 'case_exp',
      templateId: 'occult-005',
      title: 'Expedition',
      description: 'd',
      mode: 'probability',
      kind: 'case',
      status: 'in_progress',
      difficulty: { combat: 10, investigation: 10, utility: 10, social: 10 },
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
      tags: [],
      requiredTags: [],
      preferredTags: [],
      stage: 1,
      durationWeeks: 3,
      deadlineWeeks: 4,
      deadlineRemaining: 3,
      assignedTeamIds: [deployedTeamId],
      onFail: { type: 'none' },
      onUnresolved: { type: 'none' },
      contract: {
        templateId: 'institutions-liturgy-expedition',
        fieldBase: { ...SAMPLE_PACKET },
      },
    }

    const game: GameState = {
      ...shell,
      cases: {
        ...shell.cases,
        case_exp: baseCase,
      },
      teams: {
        ...shell.teams,
        t_greentape: {
          ...shell.teams.t_greentape!,
          agentIds: sansSato,
          memberIds: sansSato,
        },
        [deployedTeamId]: {
          ...shell.teams[deployedTeamId]!,
          assignedCaseId: 'case_exp',
        },
      },
      agents: {
        ...shell.agents,
        a_ava: {
          ...shell.agents.a_ava!,
          fatigue: 85,
        },
      },
    }

    const next = applyFieldBaseStagingRotationAtWeekOpen(game)
    const members = next.teams[deployedTeamId]!.memberIds ?? next.teams[deployedTeamId]!.agentIds
    expect(members).toContain('a_casey')
    expect(members).not.toContain('a_ava')
    expect(next.agents.a_ava!.fatigue).toBeLessThan(85)
    expect(formatFieldBaseStagingLegibilityLine(SAMPLE_PACKET)).toContain('test-bivouac')
  })
})
