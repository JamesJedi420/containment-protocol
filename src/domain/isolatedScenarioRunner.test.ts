import { describe, expect, it } from 'vitest'
import {
  abortIsolatedScenario,
  finishIsolatedScenario,
  isolatedRunCommitsToCampaign,
  launchIsolatedScenario,
  restoreIsolatedScenario,
  sanitizeIsolatedScenarioRun,
} from './isolatedScenarioRunner'

describe('isolatedScenarioRunner (SPE-3459)', () => {
  it('launches a valid SPE-3397 preset with isolation provenance and handoff directives', () => {
    const launched = launchIsolatedScenario({
      binding: {
        definitionId: 'standard_containment_ops',
        definitionVersion: '1',
        sourceKind: 'preset',
      },
      runSeed: 11,
    })
    expect(launched.ok).toBe(true)
    if (!launched.ok) return
    expect(launched.run.phase).toBe('active')
    expect(launched.run.provenance.isolatesFromCampaign).toBe(true)
    expect(launched.run.provenance.eventSandboxMode).toBe(false)
    expect(launched.run.provenance.academyTrainingMode).toBe(false)
    expect(launched.run.resolved.directives.some((d) => d.kind === 'starting_roster')).toBe(
      true
    )
    expect(isolatedRunCommitsToCampaign(launched.run)).toBe(false)
  })

  it('rejects invalid and softlocked SPE-3397 configurations', () => {
    const invalid = launchIsolatedScenario({
      binding: {
        definitionId: 'missing_preset',
        definitionVersion: '1',
        sourceKind: 'preset',
      },
      runSeed: 1,
    })
    expect(invalid.ok).toBe(false)

    const softlock = launchIsolatedScenario({
      binding: {
        definitionId: 'soft',
        definitionVersion: '1',
        sourceKind: 'custom',
        components: [
          {
            componentId: 'r',
            kind: 'starting_roster',
            handoffOwnerIssueId: 'SPE-97',
            rosterRef: 'x',
            minCount: 1,
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
  })

  it('finishes and aborts idempotently without campaign commit', () => {
    const launched = launchIsolatedScenario({
      binding: {
        definitionId: 'austere_field_office',
        definitionVersion: '1',
        sourceKind: 'preset',
      },
      runSeed: 3,
    })
    expect(launched.ok).toBe(true)
    if (!launched.ok) return

    const finished = finishIsolatedScenario(launched.run)
    expect(finished.ok).toBe(true)
    if (!finished.ok) return
    expect(finished.run.phase).toBe('finished')
    expect(finishIsolatedScenario(finished.run).ok).toBe(true)
    expect(abortIsolatedScenario(finished.run).ok).toBe(false)

    const launched2 = launchIsolatedScenario({
      binding: {
        definitionId: 'austere_field_office',
        definitionVersion: '1',
        sourceKind: 'preset',
      },
      runSeed: 4,
    })
    expect(launched2.ok).toBe(true)
    if (!launched2.ok) return
    const aborted = abortIsolatedScenario(launched2.run)
    expect(aborted.ok).toBe(true)
    if (!aborted.ok) return
    expect(aborted.run.phase).toBe('aborted')
    expect(abortIsolatedScenario(aborted.run).ok).toBe(true)
    expect(finishIsolatedScenario(aborted.run).ok).toBe(false)
    expect(isolatedRunCommitsToCampaign(aborted.run)).toBe(false)
  })

  it('round-trips save/load and accepts SPE-561-shaped generator-backed custom definitions', () => {
    const launched = launchIsolatedScenario({
      binding: {
        definitionId: 'gen_short_01',
        definitionVersion: '1',
        sourceKind: 'custom',
        components: [
          {
            componentId: 'roster',
            kind: 'starting_roster',
            handoffOwnerIssueId: 'SPE-97',
            rosterRef: 'generated_roster',
            minCount: 2,
          },
          {
            componentId: 'funding',
            kind: 'starting_resource',
            handoffOwnerIssueId: 'SPE-1734',
            resourceRef: 'funding',
            quantity: 1000,
          },
          {
            componentId: 'place',
            kind: 'placement_intent',
            handoffOwnerIssueId: 'SPE-1104',
            subjectRef: 'site',
            intent: 'local',
          },
          {
            componentId: 'rule',
            kind: 'persistent_rule',
            handoffOwnerIssueId: 'SPE-1734',
            ruleRef: 'generated-rule',
          },
        ],
      },
      runSeed: 9,
      sourceChannel: 'generator_backed',
    })
    expect(launched.ok).toBe(true)
    if (!launched.ok) return
    expect(launched.run.provenance.sourceChannel).toBe('generator_backed')

    const json = JSON.parse(JSON.stringify(launched.run)) as unknown
    const restored = restoreIsolatedScenario(json)
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.run.binding.definitionId).toBe('gen_short_01')
    expect(restored.run.runSeed).toBe(9)
    expect(restored.run.resolved.definitionVersion).toBe('1')

    expect(sanitizeIsolatedScenarioRun({ version: 'nope' })).toBeUndefined()
    const presetLaunch = launchIsolatedScenario({
      binding: {
        definitionId: 'standard_containment_ops',
        definitionVersion: '1',
        sourceKind: 'preset',
      },
      runSeed: 2,
    })
    expect(presetLaunch.ok).toBe(true)
    if (!presetLaunch.ok) return
    const stalePreset = JSON.parse(JSON.stringify(presetLaunch.run)) as Record<string, unknown>
    stalePreset.binding = {
      ...(stalePreset.binding as object),
      definitionVersion: '999',
    }
    expect(restoreIsolatedScenario(stalePreset).ok).toBe(false)

    const mismatched = JSON.parse(JSON.stringify(presetLaunch.run)) as Record<string, unknown>
    mismatched.resolved = {
      ...(mismatched.resolved as object),
      definitionId: 'other_definition',
    }
    expect(restoreIsolatedScenario(mismatched).ok).toBe(false)
  })
})
