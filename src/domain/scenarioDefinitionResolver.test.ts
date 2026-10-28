import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  getResolvedScenarioInitialization,
  sanitizeCampaignLedger,
} from './campaignLedger'
import {
  SCENARIO_DEFINITION_SCHEMA_VERSION,
  SCENARIO_PRESET_REGISTRY,
  assessScenarioDefinitionVersionTransition,
  deriveScenarioStochasticChoiceIndex,
  listScenarioPresetIds,
  resolveScenarioInitialization,
  sanitizeScenarioDefinitionBinding,
} from './scenarioDefinitionResolver'

describe('scenarioDefinitionResolver (SPE-3397)', () => {
  it('resolves two materially different presets through the same path', () => {
    const a = resolveScenarioInitialization({
      binding: {
        definitionId: 'standard_containment_ops',
        definitionVersion: '1',
        sourceKind: 'preset',
      },
      runSeed: 42,
    })
    const b = resolveScenarioInitialization({
      binding: {
        definitionId: 'austere_field_office',
        definitionVersion: '1',
        sourceKind: 'preset',
      },
      runSeed: 42,
    })
    expect(a.ok).toBe(true)
    expect(b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    expect(a.configuration.schemaVersion).toBe(SCENARIO_DEFINITION_SCHEMA_VERSION)
    expect(b.configuration.schemaVersion).toBe(SCENARIO_DEFINITION_SCHEMA_VERSION)
    expect(a.configuration.definitionId).not.toBe(b.configuration.definitionId)
    expect(a.configuration.directives.some((d) => d.kind === 'starting_roster')).toBe(true)
    expect(a.configuration.directives.some((d) => d.kind === 'starting_resource')).toBe(true)
    expect(a.configuration.directives.some((d) => d.kind === 'placement_intent')).toBe(true)
    expect(a.configuration.directives.some((d) => d.kind === 'persistent_rule')).toBe(true)
    expect(b.configuration.directives.some((d) => d.kind === 'prohibition')).toBe(true)
    expect(b.configuration.directives.some((d) => d.kind === 'research_start_grant')).toBe(true)
    expect(listScenarioPresetIds()).toEqual(
      Object.keys(SCENARIO_PRESET_REGISTRY).sort()
    )
  })

  it('is deterministic for the same binding/seed and supports custom via the same contract', () => {
    const input = {
      binding: {
        definitionId: 'custom_ops',
        definitionVersion: '1',
        sourceKind: 'custom' as const,
        components: [
          {
            componentId: 'r1',
            kind: 'starting_roster' as const,
            handoffOwnerIssueId: 'SPE-97',
            rosterRef: 'custom_roster',
            minCount: 3,
          },
          {
            componentId: 'f1',
            kind: 'starting_resource' as const,
            handoffOwnerIssueId: 'SPE-1734',
            resourceRef: 'funding',
            quantity: 500,
          },
          {
            componentId: 'p1',
            kind: 'placement_intent' as const,
            handoffOwnerIssueId: 'SPE-1104',
            subjectRef: 'site_a',
            intent: 'local' as const,
          },
          {
            componentId: 'rule1',
            kind: 'persistent_rule' as const,
            handoffOwnerIssueId: 'SPE-1734',
            ruleRef: 'custom-rule',
          },
        ],
      },
      runSeed: 99,
    }
    const first = resolveScenarioInitialization(input)
    const second = resolveScenarioInitialization(input)
    expect(first).toEqual(second)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.configuration.sourceKind).toBe('custom')
    expect(first.configuration.directives).toHaveLength(4)
  })

  it('keeps stochastic choices stable when unrelated decision ids are added', () => {
    const seed = 12345
    const first = deriveScenarioStochasticChoiceIndex(seed, 'roster_pick', 4)
    const withExtra = resolveScenarioInitialization({
      binding: {
        definitionId: 'standard_containment_ops',
        definitionVersion: '1',
        sourceKind: 'preset',
      },
      runSeed: seed,
      stochasticDecisions: [
        { decisionId: 'roster_pick', optionCount: 4 },
        { decisionId: 'unrelated_flavor', optionCount: 8 },
      ],
    })
    expect(withExtra.ok).toBe(true)
    if (!withExtra.ok) return
    const roster = withExtra.configuration.stochasticChoices.find(
      (c) => c.decisionId === 'roster_pick'
    )
    expect(roster?.choiceIndex).toBe(first)
    const alone = resolveScenarioInitialization({
      binding: {
        definitionId: 'standard_containment_ops',
        definitionVersion: '1',
        sourceKind: 'preset',
      },
      runSeed: seed,
      stochasticDecisions: [{ decisionId: 'roster_pick', optionCount: 4 }],
    })
    expect(alone.ok).toBe(true)
    if (!alone.ok) return
    expect(alone.configuration.stochasticChoices[0]?.choiceIndex).toBe(first)
  })

  it('fails closed on invalid reference, unsupported component, softlock, and unknown version', () => {
    const badRef = resolveScenarioInitialization({
      binding: {
        definitionId: 'broken',
        definitionVersion: '1',
        sourceKind: 'custom',
        components: [
          {
            componentId: 'x',
            kind: 'starting_roster',
            handoffOwnerIssueId: 'SPE-97',
            rosterRef: '',
            minCount: 1,
          },
        ],
      },
      runSeed: 1,
    })
    expect(badRef.ok).toBe(false)
    if (badRef.ok) return
    expect(badRef.diagnostics.some((d) => d.code === 'invalid_reference')).toBe(true)

    const unsupported = resolveScenarioInitialization({
      binding: {
        definitionId: 'broken',
        definitionVersion: '1',
        sourceKind: 'custom',
        components: [
          {
            componentId: 'script',
            kind: 'freeform_script',
            handoffOwnerIssueId: 'SPE-3397',
          } as never,
        ],
      },
      runSeed: 1,
    })
    expect(unsupported.ok).toBe(false)
    if (unsupported.ok) return
    expect(unsupported.diagnostics.some((d) => d.code === 'unsupported_component')).toBe(true)

    const softlock = resolveScenarioInitialization({
      binding: {
        definitionId: 'softlock',
        definitionVersion: '1',
        sourceKind: 'custom',
        components: [
          {
            componentId: 'r1',
            kind: 'starting_roster',
            handoffOwnerIssueId: 'SPE-97',
            rosterRef: 'ops',
            minCount: 1,
          },
          {
            componentId: 'res',
            kind: 'starting_resource',
            handoffOwnerIssueId: 'SPE-1734',
            resourceRef: 'funding',
            quantity: 0,
          },
          {
            componentId: 'place',
            kind: 'placement_intent',
            handoffOwnerIssueId: 'SPE-1104',
            subjectRef: 'hq',
            intent: 'local',
          },
          {
            componentId: 'rule',
            kind: 'persistent_rule',
            handoffOwnerIssueId: 'SPE-1734',
            ruleRef: 'x',
          },
          {
            componentId: 'ban',
            kind: 'prohibition',
            handoffOwnerIssueId: 'SPE-3044',
            prohibitionId: 'no_market_purchases',
            removesMarketPurchases: true,
            hasAlternateProgressionResourceRoute: false,
          },
        ],
      },
      runSeed: 1,
    })
    expect(softlock.ok).toBe(false)
    if (softlock.ok) return
    expect(softlock.diagnostics.some((d) => d.code === 'softlock_viability')).toBe(true)

    const unknownVersion = resolveScenarioInitialization({
      binding: {
        definitionId: 'standard_containment_ops',
        definitionVersion: '999',
        sourceKind: 'preset',
      },
      runSeed: 1,
    })
    expect(unknownVersion.ok).toBe(false)
    if (unknownVersion.ok) return
    expect(unknownVersion.diagnostics.some((d) => d.code === 'unknown_definition_version')).toBe(
      true
    )
  })

  it('sanitizes ledger bindings and refuses silent version reinterpretation', () => {
    const preset = sanitizeScenarioDefinitionBinding({
      definitionId: 'standard_containment_ops',
      definitionVersion: '1',
      sourceKind: 'preset',
    })
    expect(preset).toEqual({
      definitionId: 'standard_containment_ops',
      definitionVersion: '1',
      sourceKind: 'preset',
    })
    expect(sanitizeScenarioDefinitionBinding({ definitionId: 'nope' })).toBeUndefined()
    expect(sanitizeScenarioDefinitionBinding(null)).toBeUndefined()

    const roundTrip = resolveScenarioInitialization({
      binding: preset!,
      runSeed: 7,
    })
    expect(roundTrip.ok).toBe(true)

    const transition = assessScenarioDefinitionVersionTransition({
      boundDefinitionId: 'standard_containment_ops',
      boundDefinitionVersion: '1',
      liveDefinitionVersion: '2',
    })
    expect(transition.disposition).toBe('await_boundary')
    expect(transition.transitionOwner).toBe('SPE-2898')
    expect(
      assessScenarioDefinitionVersionTransition({
        boundDefinitionId: 'standard_containment_ops',
        boundDefinitionVersion: '1',
        liveDefinitionVersion: '1',
      }).disposition
    ).toBe('unchanged_prior_semantics')
  })

  it('persists scenario binding on the campaign ledger and reconstructs resolution', () => {
    const game = createStartingState()
    expect(getResolvedScenarioInitialization(game)).toBeNull()
    const seed = createStartingState().campaignLedger!
    game.campaignLedger = sanitizeCampaignLedger(
      {
        ...seed,
        scenarioDefinition: {
          definitionId: 'austere_field_office',
          definitionVersion: '1',
          sourceKind: 'preset',
        },
      },
      seed
    )
    const resolved = getResolvedScenarioInitialization(game, 55)
    expect(resolved?.definitionId).toBe('austere_field_office')
    expect(resolved?.runSeed).toBe(55)
    expect(
      sanitizeCampaignLedger(
        {
          ...seed,
          scenarioDefinition: {
            definitionId: 'austere_field_office',
            definitionVersion: '999',
            sourceKind: 'preset',
          },
        },
        seed
      ).scenarioDefinition
    ).toBeUndefined()
  })
})
