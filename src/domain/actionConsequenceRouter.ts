/**
 * SPE-2157 — action consequence router (escalation, denial, collateral, hard choices).
 *
 * Canonical deterministic contract that converts resolved operational actions into
 * traceable bounded consequences. Callers own domain mutations after routing.
 *
 * Does not resolve mission success, campaign defeat, or domain-specific recovery.
 * No GameState field, week-close hook, UI, or parallel feature consequence pipelines.
 */

export const ACTION_CONSEQUENCE_ROUTER_OWNER = 'SPE-2157' as const
export const ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION = 'spe-2157.v1' as const

/** Materially distinct consequence families routed through one interface. */
export const CONSEQUENCE_FAMILIES = [
  'status_change',
  'denied_asset',
  'collateral_effect',
  'clue_distortion',
  'scene_threat',
  'resource_burn',
  'exposure',
  'infrastructure_damage',
  'staff_effect',
  'public_trust_change',
  'cover_story_damage',
  'site_map_delta',
] as const
export type ConsequenceFamily = (typeof CONSEQUENCE_FAMILIES)[number]

/** Inspectable cause kinds — every emission must cite one. */
export const CAUSATION_KINDS = [
  'ignored_warning',
  'invalid_modifier',
  'scope_overrun',
  'countdown_transition',
  'failed_action',
  'partial_action',
  'unsafe_authorization',
  'uncontained_damage',
] as const
export type CausationKind = (typeof CAUSATION_KINDS)[number]

/** Affected domains for direct and collateral targets. */
export const CONSEQUENCE_DOMAINS = [
  'civilians',
  'evidence',
  'infrastructure',
  'staff',
  'public_state',
  'cover_systems',
  'sites',
] as const
export type ConsequenceDomain = (typeof CONSEQUENCE_DOMAINS)[number]

/**
 * Scale bands. Local emissions stay local unless an explicit escalation rule
 * or propagation vector widens them.
 */
export const SCALE_BANDS = ['local', 'adjacent', 'site', 'campaign'] as const
export type ScaleBand = (typeof SCALE_BANDS)[number]

const SCALE_RANK: Readonly<Record<ScaleBand, number>> = Object.freeze({
  local: 0,
  adjacent: 1,
  site: 2,
  campaign: 3,
})

/** Consumer-visible disposition without reconstructing cause. */
export const CONSEQUENCE_DISPOSITIONS = [
  'direct',
  'propagated',
  'mitigated',
  'denied',
  'unresolved',
] as const
export type ConsequenceDisposition = (typeof CONSEQUENCE_DISPOSITIONS)[number]

export const MITIGATION_STATES = ['none', 'partial', 'full'] as const
export type MitigationState = (typeof MITIGATION_STATES)[number]

export const ROUTER_REASON_CODES = [
  'routed_direct',
  'routed_propagated',
  'routed_mitigated',
  'routed_denied',
  'routed_unresolved',
  'local_scale_preserved',
  'escalation_applied',
  'invalid_causation',
  'missing_causation',
  'malformed_input',
  'hard_choice_emitted',
  'hard_choice_rejected_empty',
  'hard_choice_rejected_invalid',
  'unknown_family',
  'unknown_domain',
  'unknown_scale',
  'propagation_rejected',
  'escalation_rejected',
  'duplicate_intent',
] as const
export type RouterReasonCode = (typeof ROUTER_REASON_CODES)[number]

export interface CausationReference {
  readonly causationId: string
  readonly kind: CausationKind
  readonly sourceActionId: string
}

/**
 * Explicit bounded collateral edge. Propagation only occurs when a vector is
 * supplied; silent campaign-wide bleed is forbidden.
 */
export interface PropagationVector {
  readonly vectorId: string
  readonly fromDomain: ConsequenceDomain
  readonly toDomain: ConsequenceDomain
  readonly maxScaleBand: ScaleBand
}

/** Explicit scale widening — required to leave `local` for a direct emission. */
export interface EscalationRule {
  readonly ruleId: string
  readonly fromScale: ScaleBand
  readonly toScale: ScaleBand
}

export interface HardChoiceOption {
  readonly optionId: string
  readonly label: string
}

/** Mutually exclusive bounded options presented by canonical state. */
export interface HardChoiceSetInput {
  readonly choiceSetId: string
  readonly options: readonly HardChoiceOption[]
}

export interface HardChoiceSet {
  readonly choiceSetId: string
  readonly options: readonly HardChoiceOption[]
  readonly reasonCode: RouterReasonCode
}

/**
 * Caller-declared consequence intent after action resolution.
 * The router validates, bounds, and labels — it does not mutate GameState.
 */
export interface ConsequenceIntent {
  readonly intentId: string
  readonly family: ConsequenceFamily
  readonly targetDomain: ConsequenceDomain
  readonly targetId: string
  /** Requested scale; clamped/widened only by explicit rules. */
  readonly requestedScaleBand: ScaleBand
  /** When set, emit a collateral consequence into `toDomain` via this vector. */
  readonly propagationVectorId?: string
  readonly mitigationState?: MitigationState
  /**
   * Force disposition when the intent cannot yet settle (caller-owned).
   * Defaults to direct / mitigated / denied derived from mitigation.
   */
  readonly forcedDisposition?: Extract<
    ConsequenceDisposition,
    'denied' | 'unresolved'
  >
  /** Optional escalation rule id that may widen scale beyond local. */
  readonly escalationRuleId?: string
}

export interface RouteActionConsequencesInput {
  readonly actionId: string
  readonly causation: CausationReference | null | undefined
  readonly intents: readonly ConsequenceIntent[]
  readonly propagationVectors?: readonly PropagationVector[]
  readonly escalationRules?: readonly EscalationRule[]
  /** Hard-choice sets already present in canonical state (validated here). */
  readonly hardChoiceSets?: readonly HardChoiceSetInput[]
}

export interface RoutedConsequence {
  readonly schemaVersion: typeof ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION
  readonly owner: typeof ACTION_CONSEQUENCE_ROUTER_OWNER
  readonly consequenceId: string
  readonly family: ConsequenceFamily
  readonly disposition: ConsequenceDisposition
  readonly causation: CausationReference
  readonly targetDomain: ConsequenceDomain
  readonly targetId: string
  readonly scaleBand: ScaleBand
  readonly reasonCode: RouterReasonCode
  readonly mitigationState: MitigationState
  readonly propagationVectorId?: string
  readonly sourceIntentId: string
  readonly parentConsequenceId?: string
}

export type RouteActionConsequencesResult =
  | {
      readonly ok: true
      readonly owner: typeof ACTION_CONSEQUENCE_ROUTER_OWNER
      readonly schemaVersion: typeof ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION
      readonly actionId: string
      readonly consequences: readonly RoutedConsequence[]
      readonly hardChoiceSets: readonly HardChoiceSet[]
    }
  | {
      readonly ok: false
      readonly owner: typeof ACTION_CONSEQUENCE_ROUTER_OWNER
      readonly schemaVersion: typeof ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION
      readonly reasonCode: RouterReasonCode
      readonly detail?: string
    }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function isConsequenceFamily(value: unknown): value is ConsequenceFamily {
  return CONSEQUENCE_FAMILIES.some((family) => family === value)
}

export function isCausationKind(value: unknown): value is CausationKind {
  return CAUSATION_KINDS.some((kind) => kind === value)
}

export function isConsequenceDomain(value: unknown): value is ConsequenceDomain {
  return CONSEQUENCE_DOMAINS.some((domain) => domain === value)
}

export function isScaleBand(value: unknown): value is ScaleBand {
  return SCALE_BANDS.some((band) => band === value)
}

export function isConsequenceDisposition(
  value: unknown
): value is ConsequenceDisposition {
  return CONSEQUENCE_DISPOSITIONS.some((disposition) => disposition === value)
}

export function isMitigationState(value: unknown): value is MitigationState {
  return MITIGATION_STATES.some((state) => state === value)
}

export function isRouterReasonCode(value: unknown): value is RouterReasonCode {
  return ROUTER_REASON_CODES.some((code) => code === value)
}

function freezeConsequence(consequence: RoutedConsequence): RoutedConsequence {
  return Object.freeze({ ...consequence })
}

function compareConsequences(a: RoutedConsequence, b: RoutedConsequence): number {
  if (a.consequenceId < b.consequenceId) return -1
  if (a.consequenceId > b.consequenceId) return 1
  return 0
}

function validateCausation(
  causation: CausationReference | null | undefined
):
  | { readonly ok: true; readonly causation: CausationReference }
  | { readonly ok: false; readonly reasonCode: RouterReasonCode; readonly detail: string } {
  if (causation == null) {
    return {
      ok: false,
      reasonCode: 'missing_causation',
      detail: 'causation reference is required',
    }
  }
  if (
    !isNonEmptyString(causation.causationId) ||
    !isNonEmptyString(causation.sourceActionId) ||
    !isCausationKind(causation.kind)
  ) {
    return {
      ok: false,
      reasonCode: 'invalid_causation',
      detail: 'causationId, kind, and sourceActionId must be valid',
    }
  }
  return {
    ok: true,
    causation: Object.freeze({
      causationId: causation.causationId.trim(),
      kind: causation.kind,
      sourceActionId: causation.sourceActionId.trim(),
    }),
  }
}

function clampScaleToMax(requested: ScaleBand, max: ScaleBand): ScaleBand {
  return SCALE_RANK[requested] <= SCALE_RANK[max] ? requested : max
}

/**
 * Resolve scale. Without a matching widening escalation rule, always clamp to
 * `local` — never leak a non-local requested band through mismatched/narrowing rules.
 */
function resolveScaleBand(
  intent: ConsequenceIntent,
  escalationById: ReadonlyMap<string, EscalationRule>
):
  | { readonly ok: true; readonly scaleBand: ScaleBand; readonly escalated: boolean }
  | { readonly ok: false; readonly reasonCode: RouterReasonCode; readonly detail: string } {
  const requested = intent.requestedScaleBand
  if (!intent.escalationRuleId) {
    return { ok: true, scaleBand: 'local', escalated: false }
  }
  const rule = escalationById.get(intent.escalationRuleId.trim())
  if (!rule) {
    return {
      ok: false,
      reasonCode: 'escalation_rejected',
      detail: `unknown escalation rule ${intent.escalationRuleId}`,
    }
  }
  // Narrowing rules are not escalations — fail closed to local.
  if (SCALE_RANK[rule.toScale] < SCALE_RANK[rule.fromScale]) {
    return { ok: true, scaleBand: 'local', escalated: false }
  }
  // Rule applies only when fromScale matches the requested origin (local widen
  // or exact non-local step). Otherwise clamp to local — never preserve a wider request.
  if (rule.fromScale !== requested) {
    return { ok: true, scaleBand: 'local', escalated: false }
  }
  return {
    ok: true,
    scaleBand: rule.toScale,
    escalated: SCALE_RANK[rule.toScale] > SCALE_RANK.local,
  }
}

function dispositionForIntent(
  intent: ConsequenceIntent,
  mitigation: MitigationState
): {
  readonly disposition: ConsequenceDisposition
  readonly reasonCode: RouterReasonCode
} {
  if (intent.forcedDisposition === 'denied') {
    return { disposition: 'denied', reasonCode: 'routed_denied' }
  }
  if (intent.forcedDisposition === 'unresolved') {
    return { disposition: 'unresolved', reasonCode: 'routed_unresolved' }
  }
  if (mitigation === 'full' || mitigation === 'partial') {
    return { disposition: 'mitigated', reasonCode: 'routed_mitigated' }
  }
  return { disposition: 'direct', reasonCode: 'routed_direct' }
}

function validateHardChoiceSet(
  input: HardChoiceSetInput | null | undefined
):
  | { readonly ok: true; readonly set: HardChoiceSet }
  | { readonly ok: false; readonly reasonCode: RouterReasonCode; readonly detail: string } {
  if (input == null) {
    return {
      ok: false,
      reasonCode: 'hard_choice_rejected_invalid',
      detail: 'hard choice set entry is null',
    }
  }
  if (!isNonEmptyString(input.choiceSetId)) {
    return {
      ok: false,
      reasonCode: 'hard_choice_rejected_invalid',
      detail: 'choiceSetId required',
    }
  }
  if (!Array.isArray(input.options) || input.options.length === 0) {
    return {
      ok: false,
      reasonCode: 'hard_choice_rejected_empty',
      detail: `empty options for ${input.choiceSetId}`,
    }
  }
  const seen = new Set<string>()
  const options: HardChoiceOption[] = []
  for (const option of input.options) {
    if (!isNonEmptyString(option?.optionId) || !isNonEmptyString(option?.label)) {
      return {
        ok: false,
        reasonCode: 'hard_choice_rejected_invalid',
        detail: `invalid option in ${input.choiceSetId}`,
      }
    }
    const optionId = option.optionId.trim()
    if (seen.has(optionId)) {
      return {
        ok: false,
        reasonCode: 'hard_choice_rejected_invalid',
        detail: `duplicate optionId ${optionId}`,
      }
    }
    seen.add(optionId)
    options.push(Object.freeze({ optionId, label: option.label.trim() }))
  }
  if (options.length < 2) {
    // Mutually exclusive hard choices require at least two bounded options.
    return {
      ok: false,
      reasonCode: 'hard_choice_rejected_invalid',
      detail: `hard choice set ${input.choiceSetId} needs at least two options`,
    }
  }
  return {
    ok: true,
    set: Object.freeze({
      choiceSetId: input.choiceSetId.trim(),
      options: Object.freeze(options),
      reasonCode: 'hard_choice_emitted' as const,
    }),
  }
}

/**
 * Route resolved action consequence intents into a stable, inspectable result set.
 * Rejects missing/invalid causation and invalid/empty hard-choice sets.
 */
export function routeActionConsequences(
  input: RouteActionConsequencesInput
): RouteActionConsequencesResult {
  if (!isNonEmptyString(input?.actionId) || !Array.isArray(input.intents)) {
    return Object.freeze({
      ok: false,
      owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
      schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
      reasonCode: 'malformed_input',
      detail: 'actionId and intents[] required',
    })
  }

  const causationResult = validateCausation(input.causation)
  if (!causationResult.ok) {
    return Object.freeze({
      ok: false,
      owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
      schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
      reasonCode: causationResult.reasonCode,
      detail: causationResult.detail,
    })
  }
  const { causation } = causationResult

  const vectorById = new Map<string, PropagationVector>()
  for (const vector of input.propagationVectors ?? []) {
    if (
      !isNonEmptyString(vector?.vectorId) ||
      !isConsequenceDomain(vector.fromDomain) ||
      !isConsequenceDomain(vector.toDomain) ||
      !isScaleBand(vector.maxScaleBand) ||
      vector.fromDomain === vector.toDomain
    ) {
      return Object.freeze({
        ok: false,
        owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
        schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
        reasonCode: 'propagation_rejected',
        detail: `invalid propagation vector ${String(vector?.vectorId)}`,
      })
    }
    vectorById.set(
      vector.vectorId.trim(),
      Object.freeze({
        vectorId: vector.vectorId.trim(),
        fromDomain: vector.fromDomain,
        toDomain: vector.toDomain,
        maxScaleBand: vector.maxScaleBand,
      })
    )
  }

  const escalationById = new Map<string, EscalationRule>()
  for (const rule of input.escalationRules ?? []) {
    if (
      !isNonEmptyString(rule?.ruleId) ||
      !isScaleBand(rule.fromScale) ||
      !isScaleBand(rule.toScale)
    ) {
      return Object.freeze({
        ok: false,
        owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
        schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
        reasonCode: 'escalation_rejected',
        detail: `invalid escalation rule ${String(rule?.ruleId)}`,
      })
    }
    if (SCALE_RANK[rule.toScale] < SCALE_RANK[rule.fromScale]) {
      return Object.freeze({
        ok: false,
        owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
        schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
        reasonCode: 'escalation_rejected',
        detail: `narrowing escalation rule ${rule.ruleId.trim()}`,
      })
    }
    const ruleId = rule.ruleId.trim()
    if (escalationById.has(ruleId)) {
      return Object.freeze({
        ok: false,
        owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
        schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
        reasonCode: 'escalation_rejected',
        detail: `duplicate escalation rule ${ruleId}`,
      })
    }
    escalationById.set(
      ruleId,
      Object.freeze({
        ruleId,
        fromScale: rule.fromScale,
        toScale: rule.toScale,
      })
    )
  }

  const hardChoiceSets: HardChoiceSet[] = []
  for (const rawSet of input.hardChoiceSets ?? []) {
    const validated = validateHardChoiceSet(rawSet)
    if (!validated.ok) {
      return Object.freeze({
        ok: false,
        owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
        schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
        reasonCode: validated.reasonCode,
        detail: validated.detail,
      })
    }
    hardChoiceSets.push(validated.set)
  }
  hardChoiceSets.sort((a, b) =>
    a.choiceSetId < b.choiceSetId ? -1 : a.choiceSetId > b.choiceSetId ? 1 : 0
  )

  const consequences: RoutedConsequence[] = []
  const seenIntentIds = new Set<string>()

  for (const intent of input.intents) {
    if (!isNonEmptyString(intent?.intentId)) {
      return Object.freeze({
        ok: false,
        owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
        schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
        reasonCode: 'malformed_input',
        detail: 'intentId required',
      })
    }
    const intentId = intent.intentId.trim()
    if (seenIntentIds.has(intentId)) {
      return Object.freeze({
        ok: false,
        owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
        schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
        reasonCode: 'duplicate_intent',
        detail: `duplicate intentId ${intentId}`,
      })
    }
    seenIntentIds.add(intentId)
    if (!isConsequenceFamily(intent.family)) {
      return Object.freeze({
        ok: false,
        owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
        schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
        reasonCode: 'unknown_family',
        detail: String(intent.family),
      })
    }
    if (!isConsequenceDomain(intent.targetDomain) || !isNonEmptyString(intent.targetId)) {
      return Object.freeze({
        ok: false,
        owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
        schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
        reasonCode: 'unknown_domain',
        detail: `invalid target for ${intentId}`,
      })
    }
    if (!isScaleBand(intent.requestedScaleBand)) {
      return Object.freeze({
        ok: false,
        owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
        schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
        reasonCode: 'unknown_scale',
        detail: String(intent.requestedScaleBand),
      })
    }

    const mitigation: MitigationState = isMitigationState(intent.mitigationState)
      ? intent.mitigationState
      : 'none'

    const scaleResult = resolveScaleBand(intent, escalationById)
    if (!scaleResult.ok) {
      return Object.freeze({
        ok: false,
        owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
        schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
        reasonCode: scaleResult.reasonCode,
        detail: scaleResult.detail,
      })
    }
    const { scaleBand, escalated } = scaleResult
    const { disposition, reasonCode: baseReason } = dispositionForIntent(intent, mitigation)
    const reasonCode: RouterReasonCode =
      disposition === 'direct' && !escalated && scaleBand === 'local'
        ? 'local_scale_preserved'
        : escalated && disposition === 'direct'
          ? 'escalation_applied'
          : baseReason

    const directId = `consequence:${intentId}:direct`
    const direct = freezeConsequence({
      schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
      owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
      consequenceId: directId,
      family: intent.family,
      disposition,
      causation,
      targetDomain: intent.targetDomain,
      targetId: intent.targetId.trim(),
      scaleBand,
      reasonCode,
      mitigationState: mitigation,
      sourceIntentId: intentId,
    })
    consequences.push(direct)

    // Denied / unresolved outcomes do not spawn collateral children.
    if (
      intent.propagationVectorId &&
      disposition !== 'denied' &&
      disposition !== 'unresolved'
    ) {
      const vector = vectorById.get(intent.propagationVectorId.trim())
      if (!vector) {
        return Object.freeze({
          ok: false,
          owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
          schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
          reasonCode: 'propagation_rejected',
          detail: `unknown vector ${intent.propagationVectorId}`,
        })
      }
      if (vector.fromDomain !== intent.targetDomain) {
        return Object.freeze({
          ok: false,
          owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
          schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
          reasonCode: 'propagation_rejected',
          detail: `vector ${vector.vectorId} fromDomain mismatch`,
        })
      }
      const propagatedScale = clampScaleToMax(scaleBand, vector.maxScaleBand)
      consequences.push(
        freezeConsequence({
          schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
          owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
          consequenceId: `consequence:${intentId}:propagated:${vector.vectorId}`,
          family: 'collateral_effect',
          disposition: 'propagated',
          causation,
          targetDomain: vector.toDomain,
          targetId: `${intent.targetId.trim()}→${vector.toDomain}`,
          scaleBand: propagatedScale,
          reasonCode: 'routed_propagated',
          mitigationState: mitigation === 'full' ? 'partial' : mitigation,
          propagationVectorId: vector.vectorId,
          sourceIntentId: intentId,
          parentConsequenceId: directId,
        })
      )
    }
  }

  consequences.sort(compareConsequences)

  return Object.freeze({
    ok: true,
    owner: ACTION_CONSEQUENCE_ROUTER_OWNER,
    schemaVersion: ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
    actionId: input.actionId.trim(),
    consequences: Object.freeze(consequences),
    hardChoiceSets: Object.freeze(hardChoiceSets),
  })
}

/** Discriminate disposition for consumers without cause reconstruction. */
export function classifyConsequenceDisposition(
  consequence: Pick<RoutedConsequence, 'disposition'>
): ConsequenceDisposition {
  return consequence.disposition
}
