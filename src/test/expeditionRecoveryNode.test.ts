import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { refreshContractBoard, getContractOffers, launchContract } from '../domain/contracts'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  ACTIVE_RECOVERY_DEPLOYED_SCALE,
  SANCTUARY_RECOVERY_DEPLOYED_SCALE,
  UNSAFE_PAUSE_DEPLOYED_FATIGUE_SURCHARGE,
  buildDeployedRecoveryModeByAgentId,
  parseFieldBaseQualityBands,
  resolveDeployedRecoveryModeForCase,
  resolveExpeditionRecoveryModeFromBands,
  scaleDeployedMissionFatigueDelta,
} from '../domain/sim/expeditionRecoveryNode'
import type { CaseInstance, GameState } from '../domain/models'

describe('expeditionRecoveryNode (SPE-99)', () => {
  it('parses only well-formed field base bands', () => {
    expect(parseFieldBaseQualityBands(null)).toBeNull()
    expect(parseFieldBaseQualityBands({ medical: 2, safety: 1 })).toBeNull()
    expect(parseFieldBaseQualityBands({ medical: 2, safety: 1, sustenance: 3 })).toBeNull()
    expect(parseFieldBaseQualityBands({ medical: 2, safety: 1, sustenance: 0 })).toEqual({
      medical: 2,
      safety: 1,
      sustenance: 0,
    })
  })

  it('classifies recovery modes from staging bands', () => {
    expect(
      resolveExpeditionRecoveryModeFromBands({ medical: 1, safety: 0, sustenance: 2 })
    ).toBe('unsafe_pause')
    expect(
      resolveExpeditionRecoveryModeFromBands({ medical: 2, safety: 1, sustenance: 2 })
    ).toBe('ordinary_rest')
    expect(
      resolveExpeditionRecoveryModeFromBands({ medical: 1, safety: 2, sustenance: 0 })
    ).toBe('active_recovery')
    expect(
      resolveExpeditionRecoveryModeFromBands({ medical: 2, safety: 2, sustenance: 1 })
    ).toBe('sanctuary_recovery')
  })

  it('resolves ordinary_rest for non-in-progress cases or missing field base', () => {
    const open: CaseInstance = {
      id: 'c1',
      templateId: 't1',
      title: '',
      description: '',
      mode: 'probability',
      kind: 'investigation',
      status: 'open',
      difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
      tags: [],
      requiredTags: [],
      preferredTags: [],
      stage: 1,
      durationWeeks: 2,
      deadlineWeeks: 4,
      deadlineRemaining: 4,
      assignedTeamIds: [],
      contract: { fieldBase: { medical: 2, safety: 2, sustenance: 1 } },
      onFail: { type: 'none' },
      onUnresolved: { type: 'none' },
    }
    expect(resolveDeployedRecoveryModeForCase(open)).toBe('ordinary_rest')

    const inProgressNoBase: CaseInstance = { ...open, status: 'in_progress', contract: {} }
    expect(resolveDeployedRecoveryModeForCase(inProgressNoBase)).toBe('ordinary_rest')
  })

  it('scales deployed mission fatigue deltas deterministically', () => {
    expect(scaleDeployedMissionFatigueDelta(10, 'ordinary_rest')).toBe(10)
    expect(scaleDeployedMissionFatigueDelta(10, 'unsafe_pause')).toBe(
      10 + UNSAFE_PAUSE_DEPLOYED_FATIGUE_SURCHARGE
    )
    expect(scaleDeployedMissionFatigueDelta(10, 'active_recovery')).toBe(
      Math.max(1, Math.round(10 * ACTIVE_RECOVERY_DEPLOYED_SCALE))
    )
    expect(scaleDeployedMissionFatigueDelta(10, 'sanctuary_recovery')).toBe(
      Math.max(1, Math.round(10 * SANCTUARY_RECOVERY_DEPLOYED_SCALE))
    )
  })

  it('maps active teams to per-agent recovery modes from case contracts', () => {
    const caseWithSanctuary: CaseInstance = {
      id: 'case-s',
      templateId: 't1',
      title: '',
      description: '',
      mode: 'probability',
      kind: 'investigation',
      status: 'in_progress',
      difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
      tags: [],
      requiredTags: [],
      preferredTags: [],
      stage: 1,
      durationWeeks: 2,
      deadlineWeeks: 4,
      deadlineRemaining: 4,
      assignedTeamIds: ['tm'],
      contract: { fieldBase: { medical: 2, safety: 2, sustenance: 1 } },
      onFail: { type: 'none' },
      onUnresolved: { type: 'none' },
    }
    const teams: GameState['teams'] = {
      tm: {
        id: 'tm',
        name: 'T',
        agentIds: ['a1', 'a2'],
        tags: [],
        assignedCaseId: 'case-s',
      },
    }
    const cases: GameState['cases'] = { 'case-s': caseWithSanctuary }
    const map = buildDeployedRecoveryModeByAgentId(teams, cases, ['tm'])
    expect(map.get('a1')).toBe('sanctuary_recovery')
    expect(map.get('a2')).toBe('sanctuary_recovery')
  })

  it('liturgy expedition with fieldBase lowers deployed fatigue gain versus same case without packet', () => {
    const base = createStartingState()
    const unlocked = refreshContractBoard({
      ...base,
      factions: {
        ...base.factions!,
        institutions: {
          ...base.factions!.institutions,
          reputation: 52,
          reputationTier: 'friendly',
        },
      },
      agency: {
        ...base.agency!,
        progressionUnlockIds: ['containment-liturgy'],
      },
      contracts: undefined,
    })
    const offer =
      getContractOffers(unlocked).find((o) => o.templateId === 'institutions-liturgy-expedition') ??
      null
    expect(offer?.fieldBase).toEqual({ medical: 2, safety: 2, sustenance: 1 })

    const launched = launchContract(unlocked, offer!.id, 't_nightwatch')
    const caseEntry = Object.values(launched.cases).find((c) => c.contract?.offerId === offer!.id)!
    expect(caseEntry.contract?.fieldBase).toEqual({ medical: 2, safety: 2, sustenance: 1 })

    const agentId = launched.teams.t_nightwatch.agentIds[0]!
    const fatigueBefore = launched.agents[agentId]!.fatigue

    const withSanctuary = advanceWeek({
      ...launched,
      config: { ...launched.config, durationModel: 'attrition', attritionPerWeek: 10 },
    })

    const strippedCase: CaseInstance = {
      ...caseEntry,
      contract: { ...caseEntry.contract, fieldBase: undefined },
    }
    const stripped = advanceWeek({
      ...launched,
      cases: { ...launched.cases, [caseEntry.id]: strippedCase },
      config: { ...launched.config, durationModel: 'attrition', attritionPerWeek: 10 },
    })

    const deltaSanctuary = withSanctuary.agents[agentId]!.fatigue - fatigueBefore
    const deltaStripped = stripped.agents[agentId]!.fatigue - fatigueBefore

    expect(deltaSanctuary).toBeLessThan(deltaStripped)
    expect(deltaStripped).toBe(10)
    expect(deltaSanctuary).toBe(Math.max(1, Math.round(10 * SANCTUARY_RECOVERY_DEPLOYED_SCALE)))
  })
})
