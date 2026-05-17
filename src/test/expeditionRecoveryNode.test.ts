import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { refreshContractBoard, getContractOffers, launchContract } from '../domain/contracts'
import { readFieldBaseFromCase } from '../domain/fieldBaseStaging'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { isExpeditionRecoveryMode } from '../domain/models'
import {
  ACTIVE_RECOVERY_DEPLOYED_SCALE,
  SANCTUARY_RECOVERY_DEPLOYED_SCALE,
  UNSAFE_PAUSE_DEPLOYED_FATIGUE_SURCHARGE,
  buildDeployedRecoveryLegibilityForCase,
  buildDeployedRecoveryModeByAgentId,
  formatExpeditionRecoveryLegibilityFromMode,
  resolveDeployedRecoveryModeForCase,
  resolveExpeditionRecoveryModeFromStagingQuality,
  scaleDeployedMissionFatigueDelta,
} from '../domain/sim/expeditionRecoveryNode'
import type { CaseInstance, GameState } from '../domain/models'

describe('expeditionRecoveryNode (SPE-99)', () => {
  it('isExpeditionRecoveryMode narrows persisted report values', () => {
    expect(isExpeditionRecoveryMode('sanctuary_recovery')).toBe(true)
    expect(isExpeditionRecoveryMode('invalid_mode')).toBe(false)
    expect(isExpeditionRecoveryMode(42)).toBe(false)
  })

  it('readFieldBaseFromCase rejects malformed staging blobs', () => {
    const missingLabel: CaseInstance = {
      id: 'c1',
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
      assignedTeamIds: [],
      contract: { fieldBase: { quality: { safety: 2, medical: 2, supply: 1, extractionAccess: 0 } } },
      onFail: { type: 'none' },
      onUnresolved: { type: 'none' },
    }
    expect(readFieldBaseFromCase(missingLabel)).toBeNull()
    expect(resolveDeployedRecoveryModeForCase(missingLabel)).toBe('ordinary_rest')
  })

  it('formats recovery legibility lines for sanctuary and unsafe pause', () => {
    expect(
      formatExpeditionRecoveryLegibilityFromMode('sanctuary_recovery', 'vault-approach-bivouac')
    ).toContain('vault-approach-bivouac')
    expect(
      formatExpeditionRecoveryLegibilityFromMode('sanctuary_recovery', 'vault-approach-bivouac')
    ).toContain('55%')
    expect(formatExpeditionRecoveryLegibilityFromMode('unsafe_pause')).toContain('Unsafe pause')
    expect(formatExpeditionRecoveryLegibilityFromMode('unsafe_pause')).toContain('+2')
    expect(
      formatExpeditionRecoveryLegibilityFromMode('active_recovery', 'camp', 'staging')
    ).toContain('if committed')
  })

  it('buildDeployedRecoveryLegibilityForCase surfaces missing staging on in-progress deployments', () => {
    const inProgressNoBase: CaseInstance = {
      id: 'c1',
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
      contract: { templateId: 'test' },
      onFail: { type: 'none' },
      onUnresolved: { type: 'none' },
    }
    const legibility = buildDeployedRecoveryLegibilityForCase(inProgressNoBase)
    expect(legibility?.deployedRecoveryMode).toBe('ordinary_rest')
    expect(legibility?.recoveryLegibility).toContain('No valid field staging packet')
  })

  it('buildDeployedRecoveryLegibilityForCase returns null without in-progress fieldBase', () => {
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
      contract: {
        fieldBase: {
          label: 'test-staging',
          quality: { safety: 2, medical: 2, supply: 1, extractionAccess: 0 },
        },
      },
      onFail: { type: 'none' },
      onUnresolved: { type: 'none' },
    }
    expect(buildDeployedRecoveryLegibilityForCase(open)).toBeNull()

    const inProgress: CaseInstance = { ...open, status: 'in_progress' }
    const legibility = buildDeployedRecoveryLegibilityForCase(inProgress)
    expect(legibility?.deployedRecoveryMode).toBe('sanctuary_recovery')
    expect(legibility?.recoveryLegibility).toContain('test-staging')
  })

  it('classifies recovery modes from normalized staging quality', () => {
    expect(
      resolveExpeditionRecoveryModeFromStagingQuality({
        safety: 0,
        medical: 2,
        supply: 2,
        extractionAccess: 1,
      })
    ).toBe('unsafe_pause')
    expect(
      resolveExpeditionRecoveryModeFromStagingQuality({
        safety: 1,
        medical: 3,
        supply: 3,
        extractionAccess: 2,
      })
    ).toBe('ordinary_rest')
    expect(
      resolveExpeditionRecoveryModeFromStagingQuality({
        safety: 2,
        medical: 1,
        supply: 0,
        extractionAccess: 0,
      })
    ).toBe('active_recovery')
    expect(
      resolveExpeditionRecoveryModeFromStagingQuality({
        safety: 2,
        medical: 2,
        supply: 1,
        extractionAccess: 0,
      })
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
      contract: {
        fieldBase: {
          label: 'test-staging',
          quality: { safety: 2, medical: 2, supply: 1, extractionAccess: 0 },
        },
      },
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
      contract: {
        fieldBase: {
          label: 'sanctuary-test',
          quality: { safety: 2, medical: 2, supply: 1, extractionAccess: 0 },
        },
      },
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
    expect(offer?.fieldBase).toEqual({
      label: 'vault-approach-bivouac',
      quality: { safety: 2, medical: 2, supply: 3, extractionAccess: 1 },
    })

    const launched = launchContract(unlocked, offer!.id, 't_nightwatch')
    const caseEntry = Object.values(launched.cases).find((c) => c.contract?.offerId === offer!.id)!
    expect(caseEntry.contract?.fieldBase).toEqual(offer!.fieldBase)

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

  it('fieldBase sanctuary scaling still applies on the final deployed week before case resolution', () => {
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
    const offer = getContractOffers(unlocked).find((o) => o.templateId === 'institutions-liturgy-expedition')!
    let state = launchContract(unlocked, offer.id, 't_nightwatch')
    state = {
      ...state,
      config: { ...state.config, durationModel: 'attrition', attritionPerWeek: 10 },
    }
    const caseEntry = Object.values(state.cases).find((c) => c.contract?.offerId === offer.id)!
    const agentId = state.teams.t_nightwatch.agentIds[0]!

    state = {
      ...state,
      cases: {
        ...state.cases,
        [caseEntry.id]: { ...caseEntry, weeksRemaining: 1 },
      },
    }
    const fatigueBefore = state.agents[agentId]!.fatigue
    const after = advanceWeek(state)
    const delta = after.agents[agentId]!.fatigue - fatigueBefore
    expect(delta).toBe(Math.max(1, Math.round(10 * SANCTUARY_RECOVERY_DEPLOYED_SCALE)))
  })
})
