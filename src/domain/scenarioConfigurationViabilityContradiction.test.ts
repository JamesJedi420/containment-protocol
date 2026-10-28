import { describe, expect, it } from 'vitest'
import {
  SCENARIO_CONFIG_PRECEDENCE,
  SCENARIO_CONFIGURATION_VIABILITY_DECISION,
  SCENARIO_VIABILITY_SCENARIOS,
  evaluateScenarioViabilityScenario,
  getScenarioConfigurationViabilityDecision,
} from './scenarioConfigurationViabilityContradiction'

describe('scenarioConfigurationViabilityContradiction (SPE-3396)', () => {
  it('records softlock, precedence, and starting-grant rules with SPE-3397 fold disposition', () => {
    const decision = getScenarioConfigurationViabilityDecision()
    expect(decision).toBe(SCENARIO_CONFIGURATION_VIABILITY_DECISION)
    expect(decision.softlockViabilityRules.length).toBeGreaterThan(0)
    expect(decision.startingGrantRules.some((r) => r.ruleId === 'explicit_inherited_entitlement')).toBe(
      true
    )
    expect(decision.precedence).toEqual(SCENARIO_CONFIG_PRECEDENCE)
    expect(decision.precedence[0]).toBe('world_law_base')
    expect(decision.survivingImplementationDisposition).toBe(
      'fold_into_spe_3397_plus_existing_owners'
    )
    expect(decision.implementationOwnerIssueId).toBe('SPE-3397')
  })

  it('reconciles softlock, override, and starting-grant fixtures against owners', () => {
    expect(SCENARIO_VIABILITY_SCENARIOS).toHaveLength(3)
    for (const fixture of SCENARIO_VIABILITY_SCENARIOS) {
      expect(evaluateScenarioViabilityScenario(fixture.scenarioId)).toEqual({
        ok: true,
        disposition: fixture.expectedDisposition,
      })
      expect(fixture.ownerIssueId.length).toBeGreaterThan(0)
    }
    expect(evaluateScenarioViabilityScenario('mandatory_resource_softlock')).toEqual({
      ok: true,
      disposition: 'reject_fail_closed',
    })
    expect(evaluateScenarioViabilityScenario('conflicting_world_law_override')).toEqual({
      ok: true,
      disposition: 'route_to_owner',
    })
    expect(evaluateScenarioViabilityScenario('starting_grant_vs_earned_progression')).toEqual({
      ok: true,
      disposition: 'allow_with_grant_provenance',
    })

    expect(decisionHasForbiddenOverride('world_law_compatibility')).toBe(true)
    expect(decisionHasForbiddenOverride('competency_progression_history')).toBe(true)
  })

  it('rejects unknown fixtures and does not invent parallel progression authority', () => {
    expect(evaluateScenarioViabilityScenario('not-a-real-id' as never).ok).toBe(false)
    const grantRule = SCENARIO_CONFIGURATION_VIABILITY_DECISION.startingGrantRules.find(
      (r) => r.ruleId === 'no_second_capability_authority'
    )
    expect(grantRule).toBeDefined()
  })
})

function decisionHasForbiddenOverride(fieldFamily: string): boolean {
  return SCENARIO_CONFIGURATION_VIABILITY_DECISION.fieldAuthorityRules.some(
    (r) => r.fieldFamily === fieldFamily && r.kind === 'forbidden_override'
  )
}
