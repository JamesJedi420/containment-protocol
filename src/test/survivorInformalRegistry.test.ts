import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_SURVIVOR_REGISTRY,
  EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
  EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
  evaluateSurvivorInformalRegistrySignal,
  type SurvivorInformalRegistry,
  type SurvivorRegistrySignal,
  type SurvivorSupportBaseline,
} from '../domain/survivorInformalRegistry'

function registry(overrides: Partial<SurvivorInformalRegistry> = {}): SurvivorInformalRegistry {
  return {
    ...EXAMPLE_SURVIVOR_REGISTRY,
    ...overrides,
  }
}

function signal(overrides: Partial<SurvivorRegistrySignal> = {}): SurvivorRegistrySignal {
  return {
    ...EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
    ...overrides,
  }
}

function baseline(overrides: Partial<SurvivorSupportBaseline> = {}): SurvivorSupportBaseline {
  return {
    ...EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    ...overrides,
  }
}

describe('survivorInformalRegistry (SPE-2630 / SPE-956 slice 1)', () => {
  it('records nonofficial support-knowledge for an open community registry signal', () => {
    const result = evaluateSurvivorInformalRegistrySignal({
      registry: EXAMPLE_SURVIVOR_REGISTRY,
      signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
      baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    })

    expect(result.outcome).toBe('recorded')
    expect(result.reasonCodes).toEqual(['credibility_capped_weak', 'registry_recorded'])
    expect(result.proposedAdjustment).toEqual({
      scope: 'support_knowledge',
      fromValue: 'none',
      toValue: 'recurrence_peer_notes',
    })
    expect(result.resolved.supportKnowledge).toBe('recurrence_peer_notes')
    expect(result.resolved.credibilityStance).toBe(
      EXAMPLE_SURVIVOR_REGISTRY_BASELINE.credibilityStance
    )
    expect(result.baseline).toEqual(EXAMPLE_SURVIVOR_REGISTRY_BASELINE)
    expect(result.registryId).toBe('registry:riverside-survivor-circle')
    expect(result.signalId).toBe('signal:riverside-recurrence-notes')
  })

  it('records a recurrence signal under pattern_only catalog', () => {
    const result = evaluateSurvivorInformalRegistrySignal({
      registry: registry({ catalogRule: 'pattern_only' }),
      signal: signal({
        signalId: 'signal:riverside-recurrence-pattern',
        intent: 'record_recurrence',
        proposedValue: 'seasonal_flare_cluster',
      }),
      baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    })

    expect(result.outcome).toBe('recorded')
    expect(result.reasonCodes).toEqual(['credibility_capped_weak', 'registry_recorded'])
    expect(result.proposedAdjustment).toEqual({
      scope: 'support_knowledge',
      fromValue: 'none',
      toValue: 'seasonal_flare_cluster',
    })
  })

  it('defers record_symptom under pattern_only catalog (incomplete catalog rule)', () => {
    const result = evaluateSurvivorInformalRegistrySignal({
      registry: registry({ catalogRule: 'pattern_only' }),
      signal: signal({
        signalId: 'signal:riverside-symptom-incomplete',
        intent: 'record_symptom',
        proposedValue: 'night_tremor_note',
      }),
      baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    })

    expect(result.outcome).toBe('deferred')
    expect(result.reasonCodes).toEqual(['incomplete_catalog_rule'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_SURVIVOR_REGISTRY_BASELINE)
  })

  it('rejects when the catalog rule is closed', () => {
    const result = evaluateSurvivorInformalRegistrySignal({
      registry: registry({ catalogRule: 'closed' }),
      signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
      baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    })

    expect(result.outcome).toBe('rejected')
    expect(result.reasonCodes).toEqual(['catalog_closed', 'registry_rejected'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_SURVIVOR_REGISTRY_BASELINE)
  })

  it('returns weak_testimony when credibility_stance elevation is attempted', () => {
    const result = evaluateSurvivorInformalRegistrySignal({
      registry: EXAMPLE_SURVIVOR_REGISTRY,
      signal: signal({
        signalId: 'signal:riverside-credibility-push',
        intent: 'contribute_support',
        proposedScope: 'credibility_stance',
        proposedValue: 'institutional',
      }),
      baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    })

    expect(result.outcome).toBe('weak_testimony')
    expect(result.reasonCodes).toEqual(['weak_testimony_ceiling'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_SURVIVOR_REGISTRY_BASELINE)
    expect(result.resolved.credibilityStance).toBe('unrecognized')
  })

  it('returns a deterministic deferred no-op when evaluation input is missing', () => {
    const result = evaluateSurvivorInformalRegistrySignal(undefined)

    expect(result.outcome).toBe('deferred')
    expect(result.reasonCodes).toEqual(['missing_evaluation_input'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.registryId).toBeNull()
    expect(result.signalId).toBeNull()
    expect(result.resolved).toEqual(result.baseline)
  })

  it('returns a deferred no-op when registry, signal, or baseline is missing', () => {
    const missingRegistry = evaluateSurvivorInformalRegistrySignal({
      registry: null,
      signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
      baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    })
    expect(missingRegistry.outcome).toBe('deferred')
    expect(missingRegistry.reasonCodes).toContain('missing_survivor_registry')
    expect(missingRegistry.proposedAdjustment).toBeNull()
    expect(missingRegistry.resolved).toEqual(EXAMPLE_SURVIVOR_REGISTRY_BASELINE)

    const missingSignal = evaluateSurvivorInformalRegistrySignal({
      registry: EXAMPLE_SURVIVOR_REGISTRY,
      signal: null,
      baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    })
    expect(missingSignal.outcome).toBe('deferred')
    expect(missingSignal.reasonCodes).toContain('missing_registry_signal')
    expect(missingSignal.proposedAdjustment).toBeNull()

    const missingBaseline = evaluateSurvivorInformalRegistrySignal({
      registry: EXAMPLE_SURVIVOR_REGISTRY,
      signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
      baseline: null,
    })
    expect(missingBaseline.outcome).toBe('deferred')
    expect(missingBaseline.reasonCodes).toContain('missing_support_baseline')
    expect(missingBaseline.proposedAdjustment).toBeNull()
  })

  it('defers for an incomplete registry before applying adjustments', () => {
    const result = evaluateSurvivorInformalRegistrySignal({
      registry: {
        id: 'registry:incomplete',
        recognitionStance: 'informal_only',
        catalogRule: 'open_community',
        supportKnowledgeBand: 'peer_shared',
        credibilityCeiling: 'clinical' as SurvivorInformalRegistry['credibilityCeiling'],
      },
      signal: {
        ...EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
        registryId: 'registry:incomplete',
      },
      baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    })

    expect(result.outcome).toBe('deferred')
    expect(result.reasonCodes).toEqual(['incomplete_registry_rules'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_SURVIVOR_REGISTRY_BASELINE)
  })

  it('rejects when signal registryId does not match the registry', () => {
    const result = evaluateSurvivorInformalRegistrySignal({
      registry: EXAMPLE_SURVIVOR_REGISTRY,
      signal: signal({ registryId: 'registry:other' }),
      baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    })

    expect(result.outcome).toBe('rejected')
    expect(result.reasonCodes).toEqual(['registry_rejected', 'registry_signal_mismatch'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_SURVIVOR_REGISTRY_BASELINE)
  })

  it('rejects contribute_support when proposed scope is not support_knowledge', () => {
    // credibility_stance is handled as weak_testimony; other scopes reject
    const result = evaluateSurvivorInformalRegistrySignal({
      registry: EXAMPLE_SURVIVOR_REGISTRY,
      signal: signal({
        intent: 'record_symptom',
        proposedScope: 'credibility_stance',
        proposedValue: 'anecdotal',
      }),
      baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    })

    expect(result.outcome).toBe('rejected')
    expect(result.reasonCodes).toEqual(['intent_scope_mismatch', 'registry_rejected'])
    expect(result.proposedAdjustment).toBeNull()
  })

  it('keeps reason codes unique and sorted across paths', () => {
    const recorded = evaluateSurvivorInformalRegistrySignal({
      registry: EXAMPLE_SURVIVOR_REGISTRY,
      signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
      baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    })
    const rejected = evaluateSurvivorInformalRegistrySignal({
      registry: registry({ catalogRule: 'closed' }),
      signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
      baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    })

    expect(recorded.reasonCodes).toEqual(
      [...recorded.reasonCodes].sort((a, b) => a.localeCompare(b))
    )
    expect(rejected.reasonCodes).toEqual(
      [...new Set(rejected.reasonCodes)].sort((a, b) => a.localeCompare(b))
    )
  })

  it('freezes the result envelope and does not mutate the baseline input', () => {
    const inputBaseline = baseline()
    const result = evaluateSurvivorInformalRegistrySignal({
      registry: EXAMPLE_SURVIVOR_REGISTRY,
      signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
      baseline: inputBaseline,
    })

    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.reasonCodes)).toBe(true)
    expect(Object.isFrozen(result.resolved)).toBe(true)
    expect(Object.isFrozen(result.baseline)).toBe(true)
    expect(result.proposedAdjustment).not.toBeNull()
    expect(Object.isFrozen(result.proposedAdjustment)).toBe(true)
    expect(inputBaseline.supportKnowledge).toBe('none')
    expect(result.resolved).not.toBe(inputBaseline)
    expect(result.baseline).not.toBe(inputBaseline)
  })

  it('returns byte-stable decisions for the same inputs', () => {
    const input = {
      registry: EXAMPLE_SURVIVOR_REGISTRY,
      signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
      baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    }

    const first = evaluateSurvivorInformalRegistrySignal(input)
    const second = evaluateSurvivorInformalRegistrySignal(input)

    expect(second).toEqual(first)
  })

  it('exposes an authored registry with recognition, catalog, and credibility ceiling', () => {
    expect(EXAMPLE_SURVIVOR_REGISTRY.recognitionStance).toBe('institution_refused')
    expect(EXAMPLE_SURVIVOR_REGISTRY.catalogRule).toBe('open_community')
    expect(EXAMPLE_SURVIVOR_REGISTRY.supportKnowledgeBand).toBe('peer_shared')
    expect(EXAMPLE_SURVIVOR_REGISTRY.credibilityCeiling).toBe('community_weak')
  })

  it('defers for a partial baseline instead of inventing missing fields', () => {
    const result = evaluateSurvivorInformalRegistrySignal({
      registry: EXAMPLE_SURVIVOR_REGISTRY,
      signal: EXAMPLE_SURVIVOR_REGISTRY_SIGNAL,
      baseline: {
        communityId: 'community:partial',
        supportKnowledge: 'none',
      } as SurvivorSupportBaseline,
    })

    expect(result.outcome).toBe('deferred')
    expect(result.reasonCodes).toEqual(['invalid_support_baseline'])
    expect(result.proposedAdjustment).toBeNull()
  })

  it('records a symptom signal under open_community catalog', () => {
    const result = evaluateSurvivorInformalRegistrySignal({
      registry: EXAMPLE_SURVIVOR_REGISTRY,
      signal: signal({
        signalId: 'signal:riverside-symptom',
        intent: 'record_symptom',
        proposedValue: 'night_tremor_cluster',
      }),
      baseline: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
    })

    expect(result.outcome).toBe('recorded')
    expect(result.reasonCodes).toEqual(['credibility_capped_weak', 'registry_recorded'])
    expect(result.proposedAdjustment).toEqual({
      scope: 'support_knowledge',
      fromValue: 'none',
      toValue: 'night_tremor_cluster',
    })
  })
})
