/**
 * SPE-3396 — contradiction check: scenario configuration viability,
 * override authority, and starting-grant legality.
 *
 * Frozen decision contract + scenario fixtures only. Does not implement
 * SPE-3397 scenario-definition resolver, mutate GameState, or create issues.
 */

export const SCENARIO_CONFIGURATION_VIABILITY_CHECK_ID = 'SPE-3396' as const
export const SCENARIO_CONFIGURATION_PARENT_ISSUE_ID = 'SPE-1734' as const
export const SCENARIO_DEFINITION_IMPLEMENTATION_OWNER = 'SPE-3397' as const

export type ScenarioConfigLayer =
  | 'world_law_base'
  | 'campaign_run_configuration'
  | 'scenario_configuration'
  | 'domain_local_rules'
  | 'progression_unlock_state'
  | 'persistent_conditions'
  | 'temporary_runtime_modifiers'

/** Lower index = higher authority (cannot be silently overridden by later layers). */
export const SCENARIO_CONFIG_PRECEDENCE: readonly ScenarioConfigLayer[] = Object.freeze([
  'world_law_base',
  'campaign_run_configuration',
  'scenario_configuration',
  'domain_local_rules',
  'progression_unlock_state',
  'persistent_conditions',
  'temporary_runtime_modifiers',
])

export type ScenarioFieldKind = 'configuration_input' | 'bounded_override' | 'forbidden_override'

export interface ScenarioFieldAuthorityRule {
  readonly fieldFamily: string
  readonly kind: ScenarioFieldKind
  readonly validationOwnerIssueId: string
  readonly notes: string
}

export interface SoftlockViabilityRule {
  readonly ruleId: string
  readonly summary: string
}

export interface StartingGrantRule {
  readonly ruleId: string
  readonly summary: string
}

export interface HardGateNeverBypassRule {
  readonly gateFamily: string
  readonly ownerIssueId: string
  readonly summary: string
}

export interface ScenarioConfigurationViabilityDecision {
  readonly checkId: typeof SCENARIO_CONFIGURATION_VIABILITY_CHECK_ID
  readonly parentIssueId: typeof SCENARIO_CONFIGURATION_PARENT_ISSUE_ID
  readonly implementationOwnerIssueId: typeof SCENARIO_DEFINITION_IMPLEMENTATION_OWNER
  readonly precedence: typeof SCENARIO_CONFIG_PRECEDENCE
  readonly softlockViabilityRules: readonly SoftlockViabilityRule[]
  readonly fieldAuthorityRules: readonly ScenarioFieldAuthorityRule[]
  readonly startingGrantRules: readonly StartingGrantRule[]
  readonly hardGateNeverBypassRules: readonly HardGateNeverBypassRule[]
  readonly survivingImplementationDisposition: 'fold_into_spe_3397_plus_existing_owners'
  readonly summary: string
}

export const SCENARIO_CONFIGURATION_VIABILITY_DECISION: ScenarioConfigurationViabilityDecision =
  Object.freeze({
    checkId: SCENARIO_CONFIGURATION_VIABILITY_CHECK_ID,
    parentIssueId: SCENARIO_CONFIGURATION_PARENT_ISSUE_ID,
    implementationOwnerIssueId: SCENARIO_DEFINITION_IMPLEMENTATION_OWNER,
    precedence: SCENARIO_CONFIG_PRECEDENCE,
    softlockViabilityRules: Object.freeze([
      Object.freeze({
        ruleId: 'mandatory_continuity_route_required',
        summary:
          'A scenario configuration that removes every legal route to a mandatory campaign resource, capability, or progression prerequisite fails reconciliation (SPE-3044 precedent) rather than loading an impossible campaign.',
      }),
      Object.freeze({
        ruleId: 'aggregate_owner_failures',
        summary:
          'SPE-3397 must aggregate fail-closed validation results from world-law (SPE-151/2098), run-config (SPE-3044), competency (SPE-1059/2267), and research rollout (SPE-27) before initialization commits.',
      }),
    ]),
    fieldAuthorityRules: Object.freeze([
      Object.freeze({
        fieldFamily: 'starting_resources_and_roster_seeds',
        kind: 'configuration_input' as const,
        validationOwnerIssueId: 'SPE-1734',
        notes: 'Scenario may supply starting entitlements as configuration inputs, not as silent overrides of world law.',
      }),
      Object.freeze({
        fieldFamily: 'run_option_bounds',
        kind: 'bounded_override' as const,
        validationOwnerIssueId: 'SPE-3044',
        notes: 'Custom difficulty/run options stay inside SPE-3044 bounds; scenario cannot invent a parallel difficulty path.',
      }),
      Object.freeze({
        fieldFamily: 'world_law_compatibility',
        kind: 'forbidden_override' as const,
        validationOwnerIssueId: 'SPE-151',
        notes: 'Scenario cannot weaken SPE-151/2098 hard compatibility merely to load.',
      }),
      Object.freeze({
        fieldFamily: 'domain_rule_overrides',
        kind: 'bounded_override' as const,
        validationOwnerIssueId: 'SPE-883',
        notes: 'Domain overrides route through SPE-883; temporary locals through SPE-1499 — not unrestricted scenario overrides.',
      }),
      Object.freeze({
        fieldFamily: 'competency_progression_history',
        kind: 'forbidden_override' as const,
        validationOwnerIssueId: 'SPE-1059',
        notes: 'Scenario cannot mint earned progression history (SPE-3081 precedent).',
      }),
    ]),
    startingGrantRules: Object.freeze([
      Object.freeze({
        ruleId: 'explicit_inherited_entitlement',
        summary:
          'A scenario may begin with research/capabilities/assets/roles only as explicit starting entitlements with distinct provenance (`scenario_start_grant`), never as fabricated earned progression rows.',
      }),
      Object.freeze({
        ruleId: 'hard_gates_still_apply',
        summary:
          'Hard compatibility, competency activation, and research rollout gates still apply at start unless an owning domain explicitly models an inherited entitlement path.',
      }),
      Object.freeze({
        ruleId: 'no_second_capability_authority',
        summary:
          'Starting grants do not create a parallel capability or progression authority beside SPE-27 / SPE-1059 / SPE-2267.',
      }),
    ]),
    hardGateNeverBypassRules: Object.freeze([
      Object.freeze({
        gateFamily: 'world_law_hard_incompatibility',
        ownerIssueId: 'SPE-151',
        summary: 'Hard world-law incompatibility cannot be scenario-bypassed.',
      }),
      Object.freeze({
        gateFamily: 'competency_activation',
        ownerIssueId: 'SPE-1059',
        summary: 'Competency activation gates cannot be scenario-bypassed into parallel earned history.',
      }),
      Object.freeze({
        gateFamily: 'run_configuration_viability',
        ownerIssueId: 'SPE-3044',
        summary: 'Invalid run configuration (e.g. noMarketPurchases without alternate route) fails closed.',
      }),
    ]),
    survivingImplementationDisposition: 'fold_into_spe_3397_plus_existing_owners',
    summary:
      'Scenario configuration is a bounded configuration/input layer under SPE-1734 precedence, not an unrestricted override engine. Softlocks fail closed; starting grants are explicit entitlements with provenance; hard gates stay with existing owners. SPE-3397 encodes this contract; no additional bounded issue is required by this check.',
  })

export type ScenarioViabilityScenarioId =
  | 'mandatory_resource_softlock'
  | 'conflicting_world_law_override'
  | 'starting_grant_vs_earned_progression'

export interface ScenarioViabilityScenario {
  readonly scenarioId: ScenarioViabilityScenarioId
  readonly description: string
  readonly expectedDisposition: 'reject_fail_closed' | 'route_to_owner' | 'allow_with_grant_provenance'
  readonly ownerIssueId: string
}

export const SCENARIO_VIABILITY_SCENARIOS: readonly ScenarioViabilityScenario[] = Object.freeze([
  Object.freeze({
    scenarioId: 'mandatory_resource_softlock' as const,
    description:
      'Scenario disables market purchases and every alternate progression-resource route, leaving mandatory continuity unobtainable.',
    expectedDisposition: 'reject_fail_closed' as const,
    ownerIssueId: 'SPE-3044',
  }),
  Object.freeze({
    scenarioId: 'conflicting_world_law_override' as const,
    description:
      'Scenario attempts to override a SPE-151 hard world-law incompatibility to force-load.',
    expectedDisposition: 'route_to_owner' as const,
    ownerIssueId: 'SPE-151',
  }),
  Object.freeze({
    scenarioId: 'starting_grant_vs_earned_progression' as const,
    description:
      'Scenario grants a research capability at start with scenario_start_grant provenance without writing earned progression history.',
    expectedDisposition: 'allow_with_grant_provenance' as const,
    ownerIssueId: 'SPE-27',
  }),
])

export type ScenarioViabilityEvaluation =
  | { readonly ok: true; readonly disposition: ScenarioViabilityScenario['expectedDisposition'] }
  | { readonly ok: false; readonly reason: string }

/** Evaluate a named fixture against the frozen decision (deterministic). */
export function evaluateScenarioViabilityScenario(
  scenarioId: ScenarioViabilityScenarioId
): ScenarioViabilityEvaluation {
  const scenario = SCENARIO_VIABILITY_SCENARIOS.find((s) => s.scenarioId === scenarioId)
  if (!scenario) {
    return { ok: false, reason: 'unknown scenario' }
  }
  // Exhaustive id check keeps newly added fixtures compile-fail until handled here.
  switch (scenario.scenarioId) {
    case 'mandatory_resource_softlock':
    case 'conflicting_world_law_override':
    case 'starting_grant_vs_earned_progression':
      return { ok: true, disposition: scenario.expectedDisposition }
    default: {
      const _exhaustive: never = scenario.scenarioId
      return { ok: false, reason: String(_exhaustive) }
    }
  }
}

export function getScenarioConfigurationViabilityDecision(): ScenarioConfigurationViabilityDecision {
  return SCENARIO_CONFIGURATION_VIABILITY_DECISION
}
