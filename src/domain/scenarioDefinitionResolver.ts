/**
 * SPE-3397 — versioned scenario definitions and resolved initialization
 * configuration under SPE-1734.
 *
 * Canonical typed definition + deterministic resolver. Emits validated
 * directives for existing subsystem owners; does not implement actor,
 * inventory, map, progression, or world-law engines. Softlock / override /
 * starting-grant legality follows SPE-3396. Consequential schema cutover
 * routes through SPE-2898. Stochastic init slots use identity-keyed
 * derivation (SPE-3162-compatible contract; SPE-3162 remains owner).
 */

import { getScenarioConfigurationViabilityDecision } from './scenarioConfigurationViabilityContradiction'
import {
  RULE_CHANGE_TRANSITION_OWNER,
  type TransitionDisposition,
} from './ruleChangeTransitionContract'

export const SCENARIO_DEFINITION_OWNER = 'SPE-3397' as const
export const SCENARIO_DEFINITION_SCHEMA_VERSION = 'spe-3397.v1' as const

export const SCENARIO_COMPONENT_KINDS = [
  'starting_roster',
  'starting_resource',
  'placement_intent',
  'persistent_rule',
  'research_start_grant',
  'prohibition',
  'content_pack',
  'starting_relationship',
] as const
export type ScenarioComponentKind = (typeof SCENARIO_COMPONENT_KINDS)[number]

export const PLACEMENT_INTENTS = [
  'possessed',
  'local',
  'distributed',
  'facility_bound',
  'hidden',
  'remote',
] as const
export type PlacementIntent = (typeof PLACEMENT_INTENTS)[number]

export type ScenarioSourceKind = 'preset' | 'custom'

export interface ScenarioComponentBase {
  readonly componentId: string
  readonly kind: ScenarioComponentKind
  /** Owning subsystem that consumes the validated directive (not this module). */
  readonly handoffOwnerIssueId: string
}

export interface StartingRosterComponent extends ScenarioComponentBase {
  readonly kind: 'starting_roster'
  readonly rosterRef: string
  readonly minCount: number
}

export interface StartingResourceComponent extends ScenarioComponentBase {
  readonly kind: 'starting_resource'
  readonly resourceRef: string
  readonly quantity: number
}

export interface PlacementIntentComponent extends ScenarioComponentBase {
  readonly kind: 'placement_intent'
  readonly subjectRef: string
  readonly intent: PlacementIntent
}

export interface PersistentRuleComponent extends ScenarioComponentBase {
  readonly kind: 'persistent_rule'
  readonly ruleRef: string
}

export interface ResearchStartGrantComponent extends ScenarioComponentBase {
  readonly kind: 'research_start_grant'
  /** Provenance tag required by SPE-3396 — never earned progression history. */
  readonly provenance: 'scenario_start_grant'
  readonly capabilityRef: string
}

export interface ProhibitionComponent extends ScenarioComponentBase {
  readonly kind: 'prohibition'
  readonly prohibitionId: string
  /** When true, SPE-3396 softlock rules require an alternate continuity route. */
  readonly removesMarketPurchases: boolean
  readonly hasAlternateProgressionResourceRoute: boolean
}

export interface ContentPackComponent extends ScenarioComponentBase {
  readonly kind: 'content_pack'
  readonly packRef: string
}

export interface StartingRelationshipComponent extends ScenarioComponentBase {
  readonly kind: 'starting_relationship'
  readonly relationshipRef: string
}

export type ScenarioComponent =
  | StartingRosterComponent
  | StartingResourceComponent
  | PlacementIntentComponent
  | PersistentRuleComponent
  | ResearchStartGrantComponent
  | ProhibitionComponent
  | ContentPackComponent
  | StartingRelationshipComponent

export interface ScenarioDefinition {
  readonly definitionId: string
  readonly definitionVersion: string
  readonly label: string
  readonly sourceKind: ScenarioSourceKind
  readonly components: readonly ScenarioComponent[]
}

export interface ScenarioDefinitionBinding {
  readonly definitionId: string
  readonly definitionVersion: string
  readonly sourceKind: ScenarioSourceKind
  /** Required for custom; ignored for known presets (registry supplies components). */
  readonly components?: readonly ScenarioComponent[]
}

export interface ScenarioStochasticDecisionInput {
  /** SPE-3162-compatible stable decision identity (not stream position). */
  readonly decisionId: string
  readonly optionCount: number
}

export interface ScenarioResolveInput {
  readonly binding: ScenarioDefinitionBinding
  readonly runSeed: number
  /** Optional identity-keyed stochastic slots (SPE-3162 contract). */
  readonly stochasticDecisions?: readonly ScenarioStochasticDecisionInput[]
}

export type ScenarioDiagnosticCode =
  | 'unknown_definition'
  | 'unknown_definition_version'
  | 'unsupported_component'
  | 'invalid_component'
  | 'invalid_reference'
  | 'softlock_viability'
  | 'forbidden_override'
  | 'malformed_binding'
  | 'version_mismatch_requires_transition'

export interface ScenarioDiagnostic {
  readonly code: ScenarioDiagnosticCode
  readonly message: string
  readonly componentId?: string
}

export interface ResolvedStochasticChoice {
  readonly decisionId: string
  readonly choiceIndex: number
}

export interface ResolvedScenarioHandoffDirective {
  readonly componentId: string
  readonly kind: ScenarioComponentKind
  readonly handoffOwnerIssueId: string
  readonly payload: Readonly<Record<string, string | number | boolean>>
}

export interface ResolvedScenarioInitialization {
  readonly schemaVersion: typeof SCENARIO_DEFINITION_SCHEMA_VERSION
  readonly owner: typeof SCENARIO_DEFINITION_OWNER
  readonly definitionId: string
  readonly definitionVersion: string
  readonly label: string
  readonly sourceKind: ScenarioSourceKind
  readonly runSeed: number
  readonly directives: readonly ResolvedScenarioHandoffDirective[]
  readonly stochasticChoices: readonly ResolvedStochasticChoice[]
  readonly diagnostics: readonly ScenarioDiagnostic[]
}

export type ResolveScenarioResult =
  | { readonly ok: true; readonly configuration: ResolvedScenarioInitialization }
  | { readonly ok: false; readonly diagnostics: readonly ScenarioDiagnostic[] }

export interface ScenarioVersionTransitionAssessment {
  readonly disposition: TransitionDisposition
  readonly transitionOwner: typeof RULE_CHANGE_TRANSITION_OWNER
  readonly message: string
}

const SUPPORTED_KIND_SET = new Set<string>(SCENARIO_COMPONENT_KINDS)

/** Two materially different presets sharing the same schema/resolver path. */
export const SCENARIO_PRESET_REGISTRY: Readonly<Record<string, ScenarioDefinition>> =
  Object.freeze({
    standard_containment_ops: Object.freeze({
      definitionId: 'standard_containment_ops',
      definitionVersion: '1',
      label: 'Standard containment operations',
      sourceKind: 'preset' as const,
      components: Object.freeze([
        Object.freeze({
          componentId: 'roster_core',
          kind: 'starting_roster' as const,
          handoffOwnerIssueId: 'SPE-97',
          rosterRef: 'ops_starter_roster',
          minCount: 4,
        }),
        Object.freeze({
          componentId: 'funding_seed',
          kind: 'starting_resource' as const,
          handoffOwnerIssueId: 'SPE-1734',
          resourceRef: 'funding',
          quantity: 10_000,
        }),
        Object.freeze({
          componentId: 'hq_placement',
          kind: 'placement_intent' as const,
          handoffOwnerIssueId: 'SPE-1104',
          subjectRef: 'home_base',
          intent: 'facility_bound' as const,
        }),
        Object.freeze({
          componentId: 'baseline_rules',
          kind: 'persistent_rule' as const,
          handoffOwnerIssueId: 'SPE-1734',
          ruleRef: 'baseline-standard',
        }),
        Object.freeze({
          componentId: 'pack_core',
          kind: 'content_pack' as const,
          handoffOwnerIssueId: 'SPE-1510',
          packRef: 'core_ops_v1',
        }),
      ]),
    }),
    austere_field_office: Object.freeze({
      definitionId: 'austere_field_office',
      definitionVersion: '1',
      label: 'Austere field office',
      sourceKind: 'preset' as const,
      components: Object.freeze([
        Object.freeze({
          componentId: 'roster_skeleton',
          kind: 'starting_roster' as const,
          handoffOwnerIssueId: 'SPE-97',
          rosterRef: 'field_skeleton_roster',
          minCount: 2,
        }),
        Object.freeze({
          componentId: 'funding_thin',
          kind: 'starting_resource' as const,
          handoffOwnerIssueId: 'SPE-1734',
          resourceRef: 'funding',
          quantity: 2_500,
        }),
        Object.freeze({
          componentId: 'remote_post',
          kind: 'placement_intent' as const,
          handoffOwnerIssueId: 'SPE-1104',
          subjectRef: 'field_post',
          intent: 'remote' as const,
        }),
        Object.freeze({
          componentId: 'austere_rules',
          kind: 'persistent_rule' as const,
          handoffOwnerIssueId: 'SPE-1734',
          ruleRef: 'austere-field',
        }),
        Object.freeze({
          componentId: 'no_market',
          kind: 'prohibition' as const,
          handoffOwnerIssueId: 'SPE-3044',
          prohibitionId: 'no_market_purchases',
          removesMarketPurchases: true,
          hasAlternateProgressionResourceRoute: true,
        }),
        Object.freeze({
          componentId: 'starter_recon',
          kind: 'research_start_grant' as const,
          handoffOwnerIssueId: 'SPE-27',
          provenance: 'scenario_start_grant' as const,
          capabilityRef: 'field_recon_basic',
        }),
        Object.freeze({
          componentId: 'liaison_link',
          kind: 'starting_relationship' as const,
          handoffOwnerIssueId: 'SPE-3103',
          relationshipRef: 'local_liaison',
        }),
      ]),
    }),
  })

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function isPlacementIntent(value: unknown): value is PlacementIntent {
  return typeof value === 'string' && (PLACEMENT_INTENTS as readonly string[]).includes(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Identity-keyed unit in [0, 1). Adding unrelated decisionIds must not change
 * results for an existing decisionId (SPE-3162-compatible; not stream position).
 */
export function deriveScenarioStochasticUnit(runSeed: number, decisionId: string): number {
  let h = (runSeed | 0) >>> 0
  const id = decisionId
  for (let i = 0; i < id.length; i += 1) {
    h = Math.imul(h ^ id.charCodeAt(i), 0x01000193) >>> 0
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x7feb352d) >>> 0
  h ^= h >>> 15
  h = Math.imul(h, 0x846ca68b) >>> 0
  h ^= h >>> 16
  return (h >>> 0) / 0x1_0000_0000
}

export function deriveScenarioStochasticChoiceIndex(
  runSeed: number,
  decisionId: string,
  optionCount: number
): number {
  if (!Number.isInteger(optionCount) || optionCount < 1) return 0
  const unit = deriveScenarioStochasticUnit(runSeed, decisionId)
  return Math.min(optionCount - 1, Math.floor(unit * optionCount))
}

function validateComponent(
  raw: unknown
): { ok: true; value: ScenarioComponent } | { ok: false; diagnostic: ScenarioDiagnostic } {
  if (!isRecord(raw)) {
    return {
      ok: false,
      diagnostic: { code: 'invalid_component', message: 'component must be an object' },
    }
  }
  const componentId = typeof raw.componentId === 'string' ? raw.componentId.trim() : ''
  if (componentId.length === 0) {
    return {
      ok: false,
      diagnostic: { code: 'invalid_component', message: 'componentId required' },
    }
  }
  const kind = raw.kind
  if (typeof kind !== 'string' || !SUPPORTED_KIND_SET.has(kind)) {
    return {
      ok: false,
      diagnostic: {
        code: 'unsupported_component',
        message: `unsupported component kind: ${String(kind)}`,
        componentId,
      },
    }
  }
  const handoffOwnerIssueId =
    typeof raw.handoffOwnerIssueId === 'string' ? raw.handoffOwnerIssueId.trim() : ''
  if (handoffOwnerIssueId.length === 0) {
    return {
      ok: false,
      diagnostic: {
        code: 'invalid_component',
        message: 'handoffOwnerIssueId required',
        componentId,
      },
    }
  }

  switch (kind as ScenarioComponentKind) {
    case 'starting_roster': {
      if (!isNonEmptyString(raw.rosterRef)) {
        return {
          ok: false,
          diagnostic: {
            code: 'invalid_reference',
            message: 'rosterRef required',
            componentId,
          },
        }
      }
      if (typeof raw.minCount !== 'number' || !Number.isInteger(raw.minCount) || raw.minCount < 1) {
        return {
          ok: false,
          diagnostic: {
            code: 'invalid_component',
            message: 'minCount must be integer ≥ 1',
            componentId,
          },
        }
      }
      return {
        ok: true,
        value: {
          componentId,
          kind: 'starting_roster',
          handoffOwnerIssueId,
          rosterRef: raw.rosterRef.trim(),
          minCount: raw.minCount,
        },
      }
    }
    case 'starting_resource': {
      if (!isNonEmptyString(raw.resourceRef)) {
        return {
          ok: false,
          diagnostic: {
            code: 'invalid_reference',
            message: 'resourceRef required',
            componentId,
          },
        }
      }
      if (typeof raw.quantity !== 'number' || !Number.isFinite(raw.quantity) || raw.quantity < 0) {
        return {
          ok: false,
          diagnostic: {
            code: 'invalid_component',
            message: 'quantity must be finite ≥ 0',
            componentId,
          },
        }
      }
      return {
        ok: true,
        value: {
          componentId,
          kind: 'starting_resource',
          handoffOwnerIssueId,
          resourceRef: raw.resourceRef.trim(),
          quantity: raw.quantity,
        },
      }
    }
    case 'placement_intent': {
      if (!isNonEmptyString(raw.subjectRef) || !isPlacementIntent(raw.intent)) {
        return {
          ok: false,
          diagnostic: {
            code: 'invalid_reference',
            message: 'subjectRef and valid placement intent required',
            componentId,
          },
        }
      }
      return {
        ok: true,
        value: {
          componentId,
          kind: 'placement_intent',
          handoffOwnerIssueId,
          subjectRef: raw.subjectRef.trim(),
          intent: raw.intent,
        },
      }
    }
    case 'persistent_rule': {
      if (!isNonEmptyString(raw.ruleRef)) {
        return {
          ok: false,
          diagnostic: {
            code: 'invalid_reference',
            message: 'ruleRef required',
            componentId,
          },
        }
      }
      return {
        ok: true,
        value: {
          componentId,
          kind: 'persistent_rule',
          handoffOwnerIssueId,
          ruleRef: raw.ruleRef.trim(),
        },
      }
    }
    case 'research_start_grant': {
      if (raw.provenance !== 'scenario_start_grant' || !isNonEmptyString(raw.capabilityRef)) {
        return {
          ok: false,
          diagnostic: {
            code: 'invalid_component',
            message: 'research grant requires scenario_start_grant provenance and capabilityRef',
            componentId,
          },
        }
      }
      return {
        ok: true,
        value: {
          componentId,
          kind: 'research_start_grant',
          handoffOwnerIssueId,
          provenance: 'scenario_start_grant',
          capabilityRef: raw.capabilityRef.trim(),
        },
      }
    }
    case 'prohibition': {
      if (!isNonEmptyString(raw.prohibitionId)) {
        return {
          ok: false,
          diagnostic: {
            code: 'invalid_reference',
            message: 'prohibitionId required',
            componentId,
          },
        }
      }
      if (typeof raw.removesMarketPurchases !== 'boolean') {
        return {
          ok: false,
          diagnostic: {
            code: 'invalid_component',
            message: 'removesMarketPurchases must be boolean',
            componentId,
          },
        }
      }
      if (typeof raw.hasAlternateProgressionResourceRoute !== 'boolean') {
        return {
          ok: false,
          diagnostic: {
            code: 'invalid_component',
            message: 'hasAlternateProgressionResourceRoute must be boolean',
            componentId,
          },
        }
      }
      return {
        ok: true,
        value: {
          componentId,
          kind: 'prohibition',
          handoffOwnerIssueId,
          prohibitionId: raw.prohibitionId.trim(),
          removesMarketPurchases: raw.removesMarketPurchases,
          hasAlternateProgressionResourceRoute: raw.hasAlternateProgressionResourceRoute,
        },
      }
    }
    case 'content_pack': {
      if (!isNonEmptyString(raw.packRef)) {
        return {
          ok: false,
          diagnostic: {
            code: 'invalid_reference',
            message: 'packRef required',
            componentId,
          },
        }
      }
      return {
        ok: true,
        value: {
          componentId,
          kind: 'content_pack',
          handoffOwnerIssueId,
          packRef: raw.packRef.trim(),
        },
      }
    }
    case 'starting_relationship': {
      if (!isNonEmptyString(raw.relationshipRef)) {
        return {
          ok: false,
          diagnostic: {
            code: 'invalid_reference',
            message: 'relationshipRef required',
            componentId,
          },
        }
      }
      return {
        ok: true,
        value: {
          componentId,
          kind: 'starting_relationship',
          handoffOwnerIssueId,
          relationshipRef: raw.relationshipRef.trim(),
        },
      }
    }
    default: {
      const _exhaustive: never = kind as never
      return {
        ok: false,
        diagnostic: {
          code: 'unsupported_component',
          message: String(_exhaustive),
          componentId,
        },
      }
    }
  }
}

function directiveFromComponent(component: ScenarioComponent): ResolvedScenarioHandoffDirective {
  const base = {
    componentId: component.componentId,
    kind: component.kind,
    handoffOwnerIssueId: component.handoffOwnerIssueId,
  }
  switch (component.kind) {
    case 'starting_roster':
      return {
        ...base,
        payload: Object.freeze({
          rosterRef: component.rosterRef,
          minCount: component.minCount,
        }),
      }
    case 'starting_resource':
      return {
        ...base,
        payload: Object.freeze({
          resourceRef: component.resourceRef,
          quantity: component.quantity,
        }),
      }
    case 'placement_intent':
      return {
        ...base,
        payload: Object.freeze({
          subjectRef: component.subjectRef,
          intent: component.intent,
        }),
      }
    case 'persistent_rule':
      return {
        ...base,
        payload: Object.freeze({ ruleRef: component.ruleRef }),
      }
    case 'research_start_grant':
      return {
        ...base,
        payload: Object.freeze({
          provenance: component.provenance,
          capabilityRef: component.capabilityRef,
        }),
      }
    case 'prohibition':
      return {
        ...base,
        payload: Object.freeze({
          prohibitionId: component.prohibitionId,
          removesMarketPurchases: component.removesMarketPurchases,
          hasAlternateProgressionResourceRoute: component.hasAlternateProgressionResourceRoute,
        }),
      }
    case 'content_pack':
      return {
        ...base,
        payload: Object.freeze({ packRef: component.packRef }),
      }
    case 'starting_relationship':
      return {
        ...base,
        payload: Object.freeze({ relationshipRef: component.relationshipRef }),
      }
    default: {
      const _exhaustive: never = component
      return {
        componentId: 'unreachable',
        kind: 'persistent_rule',
        handoffOwnerIssueId: 'SPE-3397',
        payload: Object.freeze({ error: String(_exhaustive) }),
      }
    }
  }
}

function applyViabilityGates(
  components: readonly ScenarioComponent[]
): readonly ScenarioDiagnostic[] {
  const diagnostics: ScenarioDiagnostic[] = []
  // Touch frozen SPE-3396 decision so this gate stays coupled to the check owner.
  if (getScenarioConfigurationViabilityDecision().checkId !== 'SPE-3396') {
    diagnostics.push({
      code: 'softlock_viability',
      message: 'SPE-3396 viability decision missing',
    })
    return diagnostics
  }

  for (const component of components) {
    if (component.kind === 'prohibition') {
      if (
        component.removesMarketPurchases &&
        !component.hasAlternateProgressionResourceRoute
      ) {
        diagnostics.push({
          code: 'softlock_viability',
          message:
            'prohibition removes market purchases without alternate progression resource route (SPE-3396/SPE-3044)',
          componentId: component.componentId,
        })
      }
    }
    if (component.kind === 'research_start_grant' && component.provenance !== 'scenario_start_grant') {
      diagnostics.push({
        code: 'forbidden_override',
        message: 'starting grant missing scenario_start_grant provenance (SPE-3396)',
        componentId: component.componentId,
      })
    }
  }
  return diagnostics
}

function loadDefinition(
  binding: ScenarioDefinitionBinding
): { ok: true; definition: ScenarioDefinition } | { ok: false; diagnostics: ScenarioDiagnostic[] } {
  if (!isNonEmptyString(binding.definitionId) || !isNonEmptyString(binding.definitionVersion)) {
    return {
      ok: false,
      diagnostics: [
        {
          code: 'malformed_binding',
          message: 'definitionId and definitionVersion required',
        },
      ],
    }
  }

  if (binding.sourceKind === 'preset') {
    const preset = SCENARIO_PRESET_REGISTRY[binding.definitionId]
    if (preset == null) {
      return {
        ok: false,
        diagnostics: [
          {
            code: 'unknown_definition',
            message: `unknown preset definitionId: ${binding.definitionId}`,
          },
        ],
      }
    }
    if (binding.definitionVersion !== preset.definitionVersion) {
      return {
        ok: false,
        diagnostics: [
          {
            code: 'unknown_definition_version',
            message: `unknown definition version for ${binding.definitionId}: ${binding.definitionVersion}`,
          },
        ],
      }
    }
    return { ok: true, definition: preset }
  }

  if (binding.sourceKind !== 'custom') {
    return {
      ok: false,
      diagnostics: [{ code: 'malformed_binding', message: 'sourceKind must be preset or custom' }],
    }
  }

  const rawComponents = binding.components
  if (!Array.isArray(rawComponents) || rawComponents.length === 0) {
    return {
      ok: false,
      diagnostics: [
        {
          code: 'malformed_binding',
          message: 'custom scenario requires non-empty components',
        },
      ],
    }
  }

  const components: ScenarioComponent[] = []
  const diagnostics: ScenarioDiagnostic[] = []
  for (const raw of rawComponents) {
    const parsed = validateComponent(raw)
    if (!parsed.ok) {
      diagnostics.push(parsed.diagnostic)
      continue
    }
    components.push(parsed.value)
  }
  if (diagnostics.length > 0) {
    return { ok: false, diagnostics }
  }

  return {
    ok: true,
    definition: {
      definitionId: binding.definitionId.trim(),
      definitionVersion: binding.definitionVersion.trim(),
      label: binding.definitionId.trim(),
      sourceKind: 'custom',
      components,
    },
  }
}

/** Resolve authored/custom scenario binding into one validated initialization snapshot. */
export function resolveScenarioInitialization(
  input: ScenarioResolveInput | null | undefined
): ResolveScenarioResult {
  if (input == null || !isRecord(input.binding as unknown)) {
    return {
      ok: false,
      diagnostics: [{ code: 'malformed_binding', message: 'binding required' }],
    }
  }
  if (typeof input.runSeed !== 'number' || !Number.isFinite(input.runSeed)) {
    return {
      ok: false,
      diagnostics: [{ code: 'malformed_binding', message: 'runSeed must be finite number' }],
    }
  }

  const loaded = loadDefinition(input.binding)
  if (!loaded.ok) return loaded

  const viabilityDiagnostics = applyViabilityGates(loaded.definition.components)
  if (viabilityDiagnostics.length > 0) {
    return { ok: false, diagnostics: viabilityDiagnostics }
  }

  const directives = loaded.definition.components.map(directiveFromComponent)
  const stochasticChoices: ResolvedStochasticChoice[] = []
  for (const decision of input.stochasticDecisions ?? []) {
    if (!isNonEmptyString(decision.decisionId)) continue
    if (!Number.isInteger(decision.optionCount) || decision.optionCount < 1) continue
    stochasticChoices.push({
      decisionId: decision.decisionId,
      choiceIndex: deriveScenarioStochasticChoiceIndex(
        input.runSeed,
        decision.decisionId,
        decision.optionCount
      ),
    })
  }
  stochasticChoices.sort((a, b) => a.decisionId.localeCompare(b.decisionId))

  return {
    ok: true,
    configuration: Object.freeze({
      schemaVersion: SCENARIO_DEFINITION_SCHEMA_VERSION,
      owner: SCENARIO_DEFINITION_OWNER,
      definitionId: loaded.definition.definitionId,
      definitionVersion: loaded.definition.definitionVersion,
      label: loaded.definition.label,
      sourceKind: loaded.definition.sourceKind,
      runSeed: input.runSeed,
      directives: Object.freeze(directives.map((d) => Object.freeze(d))),
      stochasticChoices: Object.freeze(stochasticChoices),
      diagnostics: Object.freeze([] as ScenarioDiagnostic[]),
    }),
  }
}

/**
 * Bound campaign definition version must not silently follow a newer live
 * preset. Callers route cutover through SPE-2898.
 */
export function assessScenarioDefinitionVersionTransition(input: {
  readonly boundDefinitionId: string
  readonly boundDefinitionVersion: string
  readonly liveDefinitionVersion: string
}): ScenarioVersionTransitionAssessment {
  if (input.boundDefinitionVersion === input.liveDefinitionVersion) {
    return {
      disposition: 'unchanged_prior_semantics',
      transitionOwner: RULE_CHANGE_TRANSITION_OWNER,
      message: 'bound definition version matches live registry',
    }
  }
  return {
    disposition: 'await_boundary',
    transitionOwner: RULE_CHANGE_TRANSITION_OWNER,
    message: `definition ${input.boundDefinitionId} bound at ${input.boundDefinitionVersion}; live is ${input.liveDefinitionVersion} — require SPE-2898 transition before reinterpretation`,
  }
}

/** Normalize optional ledger binding; invalid present data → undefined (fail closed). */
export function sanitizeScenarioDefinitionBinding(
  raw: unknown
): ScenarioDefinitionBinding | undefined {
  if (!isRecord(raw)) return undefined
  const definitionId = typeof raw.definitionId === 'string' ? raw.definitionId.trim() : ''
  const definitionVersion =
    typeof raw.definitionVersion === 'string' ? raw.definitionVersion.trim() : ''
  const sourceKind = raw.sourceKind
  if (
    definitionId.length === 0 ||
    definitionVersion.length === 0 ||
    (sourceKind !== 'preset' && sourceKind !== 'custom')
  ) {
    return undefined
  }

  if (sourceKind === 'preset') {
    const resolved = resolveScenarioInitialization({
      binding: { definitionId, definitionVersion, sourceKind: 'preset' },
      runSeed: 0,
    })
    if (!resolved.ok) return undefined
    return { definitionId, definitionVersion, sourceKind: 'preset' }
  }

  if (!Array.isArray(raw.components)) return undefined
  const components: ScenarioComponent[] = []
  for (const entry of raw.components) {
    const parsed = validateComponent(entry)
    if (!parsed.ok) return undefined
    components.push(parsed.value)
  }
  if (components.length === 0) return undefined
  const resolved = resolveScenarioInitialization({
    binding: {
      definitionId,
      definitionVersion,
      sourceKind: 'custom',
      components,
    },
    runSeed: 0,
  })
  if (!resolved.ok) return undefined
  return {
    definitionId,
    definitionVersion,
    sourceKind: 'custom',
    components: Object.freeze(components),
  }
}

export function listScenarioPresetIds(): readonly string[] {
  return Object.freeze(Object.keys(SCENARIO_PRESET_REGISTRY).sort())
}
