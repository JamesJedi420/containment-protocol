import { describe, expect, it } from 'vitest'
import {
  CAMPAIGN_SCAR_IDS,
  isCampaignScarId,
  listCampaignScarIds,
  projectCampaignScarDegradedState,
} from '../domain/campaignScarDegradedState'
import {
  listLivingButLostMoraleMemoryKinds,
  projectLivingButLostMoraleMemory,
} from '../domain/livingButLostMoraleMemoryCatalog'
import { projectPostLossAdaptationUnlock } from '../domain/postLossAdaptationUnlock'
import {
  AFTER_ACTION_DEFAULT_TERMINAL_FAILURE_ID,
  AFTER_ACTION_HIDDEN_DEPENDENCY_IDS,
  AFTER_ACTION_INTERMEDIATE_BREAKDOWN_IDS,
  AFTER_ACTION_PRIMARY_CHAIN_ID,
  isAfterActionCauseChainId,
  isAfterActionCauseChainOutcomeKind,
  isAfterActionHiddenDependencyId,
  isAfterActionIntermediateBreakdownId,
  listAfterActionCauseChainIds,
  listAfterActionHiddenDependencyIds,
  projectAfterActionCauseChain,
  validateAfterActionCauseChainInput,
} from '../domain/afterActionCauseChain'

describe('SPE-1051 after-action cause-chain (slice 5)', () => {
  it('exposes the smallest authored cause-chain set with a hidden dependency', () => {
    expect(listAfterActionCauseChainIds()).toEqual(['recoverable_failure_systemic_collapse'])
    expect(AFTER_ACTION_PRIMARY_CHAIN_ID).toBe('recoverable_failure_systemic_collapse')
    expect(listAfterActionHiddenDependencyIds()).toEqual(['maintenance_routing_backlog'])
    expect(AFTER_ACTION_HIDDEN_DEPENDENCY_IDS).toEqual(['maintenance_routing_backlog'])
    expect(AFTER_ACTION_INTERMEDIATE_BREAKDOWN_IDS).toEqual([
      'site_access_degradation',
      'logistics_strain_escalation',
    ])
    expect(isAfterActionCauseChainId('recoverable_failure_systemic_collapse')).toBe(true)
    expect(isAfterActionCauseChainId('full_spe_868_review')).toBe(false)
    expect(isAfterActionCauseChainOutcomeKind('after_action_cause_chain')).toBe(true)
    expect(isAfterActionCauseChainOutcomeKind('game_over')).toBe(false)
    expect(isAfterActionCauseChainOutcomeKind('true_defeat')).toBe(false)
    expect(isAfterActionHiddenDependencyId('maintenance_routing_backlog')).toBe(true)
    expect(isAfterActionHiddenDependencyId('unknown_dep')).toBe(false)
    expect(isAfterActionIntermediateBreakdownId('site_access_degradation')).toBe(true)
    expect(isAfterActionIntermediateBreakdownId('unknown_breakdown')).toBe(false)
  })

  it('AC: after-action output explains a cause chain with hidden dependencies, not only the terminal', () => {
    const projection = projectAfterActionCauseChain({
      terminalFailureId: 'strained_logistics_collapse',
      priorScarIds: ['site_abandonment_scar', 'strained_logistics_scar'],
    })
    expect(projection).toBeDefined()
    if (!projection) throw new Error('missing projection')

    expect(projection.outcomeKind).toBe('after_action_cause_chain')
    expect(projection.chainId).toBe('recoverable_failure_systemic_collapse')
    expect(projection.terminalFailureId).toBe('strained_logistics_collapse')
    expect(projection.intermediateBreakdownIds.length).toBeGreaterThanOrEqual(1)
    expect(projection.hiddenDependencyIds.length).toBeGreaterThanOrEqual(1)
    expect(projection.hiddenDependencyIds).toContain('maintenance_routing_backlog')
    expect(projection.explainsBeyondTerminalResult).toBe(true)
    // Not merely the end result — intermediate + hidden present.
    expect(projection.intermediateBreakdownIds).not.toEqual([])
    expect(projection.hiddenDependencyIds).not.toEqual([projection.terminalFailureId])
    expect(projection.contributingScarIds).toEqual([
      'site_abandonment_scar',
      'strained_logistics_scar',
    ])
    expect(projection.contributingScarIds.every(isCampaignScarId)).toBe(true)
  })

  it('projects from scar history alone with default terminal and hidden dependency', () => {
    const projection = projectAfterActionCauseChain({
      priorScarIds: ['survivor_trauma_scar', 'site_abandonment_scar'],
    })
    expect(projection).toBeDefined()
    if (!projection) throw new Error('missing projection')

    expect(projection.terminalFailureId).toBe(AFTER_ACTION_DEFAULT_TERMINAL_FAILURE_ID)
    expect(projection.hiddenDependencyIds).toEqual(['maintenance_routing_backlog'])
    expect(projection.intermediateBreakdownIds).toEqual([
      'site_access_degradation',
      'logistics_strain_escalation',
    ])
    expect(projection.contributingScarIds).toEqual([
      'site_abandonment_scar',
      'survivor_trauma_scar',
    ])
    expect(projection.contributingMoraleMemoryKinds).toEqual([])
    expect(projection.explainsBeyondTerminalResult).toBe(true)
  })

  it('projects from catalog history alone with cause chain and hidden dependency', () => {
    const projection = projectAfterActionCauseChain({
      priorMoraleMemoryKinds: ['protective_custody', 'guilt'],
    })
    expect(projection).toBeDefined()
    if (!projection) throw new Error('missing projection')

    expect(projection.outcomeKind).toBe('after_action_cause_chain')
    expect(projection.chainId).toBe('recoverable_failure_systemic_collapse')
    expect(projection.terminalFailureId).toBe(AFTER_ACTION_DEFAULT_TERMINAL_FAILURE_ID)
    expect(projection.hiddenDependencyIds.length).toBeGreaterThanOrEqual(1)
    expect(projection.explainsBeyondTerminalResult).toBe(true)
    expect(projection.contributingScarIds).toEqual([])
    expect(projection.contributingMoraleMemoryKinds).toEqual(['guilt', 'protective_custody'])
  })

  it('projects from caller-owned failure id alone', () => {
    const projection = projectAfterActionCauseChain({
      terminalFailureId: 'site_breach_terminal',
    })
    expect(projection?.terminalFailureId).toBe('site_breach_terminal')
    expect(projection?.hiddenDependencyIds).toEqual(['maintenance_routing_backlog'])
    expect(projection?.intermediateBreakdownIds.length).toBeGreaterThanOrEqual(1)
    expect(projection?.explainsBeyondTerminalResult).toBe(true)
    expect(projection?.contributingScarIds).toEqual([])
    expect(projection?.contributingMoraleMemoryKinds).toEqual([])
  })

  it('combines failure, scar, and catalog history without inventing extra chains', () => {
    const projection = projectAfterActionCauseChain({
      terminalFailureId: 'compound_collapse',
      priorScarIds: ['compromised_doctrine_scar'],
      priorMoraleMemoryKinds: ['distrust', 'refusal'],
    })
    expect(projection?.chainId).toBe('recoverable_failure_systemic_collapse')
    expect(projection?.terminalFailureId).toBe('compound_collapse')
    expect(projection?.contributingScarIds).toEqual(['compromised_doctrine_scar'])
    expect(projection?.contributingMoraleMemoryKinds).toEqual(['distrust', 'refusal'])
    expect(listAfterActionCauseChainIds()).toHaveLength(1)
  })

  it('dedupes duplicate history ids deterministically', () => {
    const projection = projectAfterActionCauseChain({
      priorScarIds: ['strained_logistics_scar', 'strained_logistics_scar', 'site_abandonment_scar'],
      priorMoraleMemoryKinds: ['guilt', 'guilt', 'refusal'],
    })
    expect(projection?.contributingScarIds).toEqual([
      'site_abandonment_scar',
      'strained_logistics_scar',
    ])
    expect(projection?.contributingMoraleMemoryKinds).toEqual(['guilt', 'refusal'])
  })

  it('fail-closes omit, empty, unknown, and malformed inputs', () => {
    expect(projectAfterActionCauseChain(null)).toBeUndefined()
    expect(projectAfterActionCauseChain(undefined)).toBeUndefined()
    expect(projectAfterActionCauseChain({} as never)).toBeUndefined()
    expect(projectAfterActionCauseChain({ priorScarIds: [] })).toBeUndefined()
    expect(projectAfterActionCauseChain({ priorMoraleMemoryKinds: [] })).toBeUndefined()
    expect(projectAfterActionCauseChain({ terminalFailureId: '' })).toBeUndefined()
    expect(
      projectAfterActionCauseChain({
        priorScarIds: [],
        priorMoraleMemoryKinds: [],
      })
    ).toBeUndefined()
    expect(
      projectAfterActionCauseChain({
        priorScarIds: ['unknown_scar' as 'site_abandonment_scar'],
      })
    ).toBeUndefined()
    expect(
      projectAfterActionCauseChain({
        priorMoraleMemoryKinds: ['institutionalization' as 'guilt'],
      })
    ).toBeUndefined()
    expect(
      projectAfterActionCauseChain({
        priorScarIds: 'site_abandonment_scar' as unknown as readonly ['site_abandonment_scar'],
      })
    ).toBeUndefined()
    expect(
      projectAfterActionCauseChain({
        priorMoraleMemoryKinds: 'guilt' as unknown as readonly ['guilt'],
      })
    ).toBeUndefined()
    expect(
      projectAfterActionCauseChain({
        priorScarIds: [null as unknown as 'site_abandonment_scar'],
      })
    ).toBeUndefined()
    expect(
      projectAfterActionCauseChain({
        terminalFailureId: 42 as unknown as string,
      })
    ).toBeUndefined()
    expect(validateAfterActionCauseChainInput([])).toBe(false)
    expect(validateAfterActionCauseChainInput('strained_logistics_collapse')).toBe(false)
    expect(
      validateAfterActionCauseChainInput({
        priorScarIds: ['site_abandonment_scar'],
      })
    ).toBe(true)
    expect(
      validateAfterActionCauseChainInput({
        terminalFailureId: 'site_breach_terminal',
      })
    ).toBe(true)
  })

  it('is deterministic for identical history', () => {
    const input = {
      terminalFailureId: 'compound_collapse',
      priorScarIds: ['survivor_trauma_scar', 'site_abandonment_scar'] as const,
      priorMoraleMemoryKinds: ['guilt', 'protective_custody'] as const,
    }
    const a = projectAfterActionCauseChain(input)
    const b = projectAfterActionCauseChain(input)
    expect(a).toEqual(b)
    expect(a).toEqual({
      outcomeKind: 'after_action_cause_chain',
      chainId: 'recoverable_failure_systemic_collapse',
      terminalFailureId: 'compound_collapse',
      intermediateBreakdownIds: ['site_access_degradation', 'logistics_strain_escalation'],
      hiddenDependencyIds: ['maintenance_routing_backlog'],
      contributingScarIds: ['site_abandonment_scar', 'survivor_trauma_scar'],
      contributingMoraleMemoryKinds: ['guilt', 'protective_custody'],
      explainsBeyondTerminalResult: true,
    })
  })

  it('does not erase or rewrite prior SPE-1051 scar, catalog, or unlock projections', () => {
    const scarProjection = projectCampaignScarDegradedState({
      siteDamage: 80,
      priorScarIds: ['site_abandonment_scar'],
      personnelTurnoverCount: 3,
    })
    expect(scarProjection?.firedScarIds).toContain('site_abandonment_scar')
    expect(scarProjection?.cascadeContributorScarIds.length).toBeGreaterThanOrEqual(1)
    expect(scarProjection?.outcomeKind).toBe('degraded_survivable')

    const catalogProjection = projectLivingButLostMoraleMemory({
      effectKind: 'guilt',
      retainedByGroupId: 'survivor-cell-a',
      retainedByGroupKind: 'survivor',
      priorEffectKinds: ['guilt'],
      relatedScarId: 'survivor_trauma_scar',
    })
    expect(catalogProjection?.firedEffectKinds).toEqual(['guilt'])
    expect(catalogProjection?.outcomeKind).toBe('persistent_after_loss')

    const unlock = projectPostLossAdaptationUnlock({
      priorScarIds: scarProjection?.firedScarIds ?? [],
      priorMoraleMemoryKinds: catalogProjection?.firedEffectKinds ?? [],
    })
    expect(unlock?.unlockId).toBe('stricter_access_rules')

    const afterAction = projectAfterActionCauseChain({
      terminalFailureId: 'strained_logistics_collapse',
      priorScarIds: scarProjection?.firedScarIds ?? [],
      priorMoraleMemoryKinds: catalogProjection?.firedEffectKinds ?? [],
    })
    expect(afterAction?.explainsBeyondTerminalResult).toBe(true)
    expect(afterAction?.hiddenDependencyIds.length).toBeGreaterThanOrEqual(1)

    // Re-project originals after after-action — still intact (no shared mutation).
    const scarAgain = projectCampaignScarDegradedState({
      siteDamage: 80,
      priorScarIds: ['site_abandonment_scar'],
      personnelTurnoverCount: 3,
    })
    const catalogAgain = projectLivingButLostMoraleMemory({
      effectKind: 'guilt',
      retainedByGroupId: 'survivor-cell-a',
      retainedByGroupKind: 'survivor',
      priorEffectKinds: ['guilt'],
      relatedScarId: 'survivor_trauma_scar',
    })
    const unlockAgain = projectPostLossAdaptationUnlock({
      priorScarIds: scarProjection?.firedScarIds ?? [],
      priorMoraleMemoryKinds: catalogProjection?.firedEffectKinds ?? [],
    })
    expect(scarAgain).toEqual(scarProjection)
    expect(catalogAgain).toEqual(catalogProjection)
    expect(unlockAgain).toEqual(unlock)

    expect(listCampaignScarIds()).toEqual([...CAMPAIGN_SCAR_IDS])
    expect(listLivingButLostMoraleMemoryKinds()).toEqual([
      'guilt',
      'distrust',
      'refusal',
      'protective_custody',
    ])
  })
})
