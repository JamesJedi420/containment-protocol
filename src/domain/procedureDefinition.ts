// Canonical procedure-definition schema and validation seam (SPE-1274)
// Covers anomalous actions, countermeasures, rituals, devices, and learned effects.
// Domain-only, deterministic, no RNG dependency.
import type { AgentRole } from './agent/models'

// ─── Taxonomy axes ────────────────────────────────────────────────────────────
// Overlapping classification surfaces: intent, effect domain, execution method,
// and origin tradition are kept as separate axes so that no single-axis taxonomy
// erases meaningful distinctions between procedure types.

export type ProcedureIntent =
  | 'suppression'
  | 'detection'
  | 'extraction'
  | 'transformation'
  | 'summoning'
  | 'protection'
  | 'disruption'
  | 'communication'

export type ProcedureEffectDomain =
  | 'physical'
  | 'psychic'
  | 'temporal'
  | 'spatial'
  | 'biological'
  | 'informational'
  | 'spiritual'

export type ProcedureExecutionMethod =
  | 'ritual'
  | 'device'
  | 'formula'
  | 'martial'
  | 'channeling'

export interface ProcedureTaxonomy {
  readonly intent: ProcedureIntent
  readonly effectDomain: ProcedureEffectDomain
  readonly executionMethod: ProcedureExecutionMethod
  /** null when procedure has no known cultural or methodological tradition */
  readonly originTradition: string | null
}

// ─── Tier ─────────────────────────────────────────────────────────────────────

export type ProcedureTier = 1 | 2 | 3 | 4 | 5

// ─── Availability ─────────────────────────────────────────────────────────────

export type AvailabilityRating =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'unique'
  | 'lost'
  | 'restricted'

export interface BoundedAvailability {
  readonly rating: AvailabilityRating
  /** How many distinct known sources exist. Omit when count is unknown. */
  readonly sourceCount?: number
  /** Prose description of gate or barrier to access, e.g. 'requires_faction_rank_3'. */
  readonly accessFriction?: string
}

// ─── Requirements ─────────────────────────────────────────────────────────────

export type SpeechRequirement = 'required' | 'trivial' | 'none'
export type GestureRequirement = 'required' | 'trivial' | 'none'

export interface ReagentRequirement {
  readonly tag: string
  readonly quantity: number
  /** Whether the reagent is destroyed on use (true) or merely present (false). */
  readonly consumable: boolean
}

export interface RequirementPacket {
  readonly speech: SpeechRequirement
  readonly gesture: GestureRequirement
  /** Item tags that must be present in the operator's loadout. */
  readonly toolTags: readonly string[]
  readonly reagents: readonly ReagentRequirement[]
  readonly requiresDiagram: boolean
  /** Device type tags that must be available at the scene. */
  readonly deviceTags: readonly string[]
  /** Scene-level environmental conditions required, e.g. 'night', 'ley_line'. */
  readonly environmentalConditions: readonly string[]
}

export type ActivationTiming =
  | 'instant'
  | 'one_action'
  | 'full_action'
  | 'ritual_hours'
  | 'ritual_days'

// ─── Duration ─────────────────────────────────────────────────────────────────

export type DurationUnit =
  | 'rounds'
  | 'minutes'
  | 'hours'
  | 'days'
  | 'permanent'
  | 'until_dismissed'

export interface ProcedureDuration {
  /** Numeric count. null when duration is indefinite (use 'until_dismissed' unit). */
  readonly value: number | null
  readonly unit: DurationUnit
  /** Whether the effect can be maintained by spending actions or resources. */
  readonly maintainable: boolean
}

// ─── Targeting ────────────────────────────────────────────────────────────────

export type TargetGeometry =
  | 'self'
  | 'single_target'
  | 'cone'
  | 'line'
  | 'burst'
  | 'zone'
  | 'global'

export type ResistanceHandling =
  | 'none'
  | 'contested_will'
  | 'contested_physical'
  | 'voluntary_only'
  | 'cover_sensitive'

export interface TargetingPacket {
  readonly geometry: TargetGeometry
  /** null = melee/contact range. Non-null must be ≥ 0. */
  readonly rangeMeters: number | null
  readonly resistance: ResistanceHandling
  /** Whether the target can choose to suppress their own resistance. */
  readonly voluntaryResistanceSuppression: boolean
  /** Whether cover degrades effect delivery. */
  readonly coverSensitive: boolean
}

// ─── Persistence ──────────────────────────────────────────────────────────────

export interface PersistencePacket {
  readonly duration: ProcedureDuration
  /** Whether an authorized operator can end the effect early. */
  readonly dismissible: boolean
  /** Description of what happens when the effect naturally expires. null if no special state. */
  readonly expiryState: string | null
}

// ─── Restrictions ─────────────────────────────────────────────────────────────

export interface ProcedureRestrictions {
  readonly forbiddenRoles: readonly AgentRole[]
  readonly requiredCertifications: readonly string[]
  readonly requiresSpecialistAccess: boolean
  /** Max uses per operation. null = unlimited. */
  readonly usageCap: number | null
}

// ─── Provenance ───────────────────────────────────────────────────────────────

export interface ProcedureProvenance {
  /** Identifier for the source corpus or system, e.g. 'hermetic_codex', 'field_manual'. */
  readonly sourceSystem: string
  /** Whether this procedure is obtained through the research system. */
  readonly acquiredViaResearch: boolean
  /** Research discipline that unlocks this, if any. */
  readonly researchDiscipline: string | null
  /** Faction that controls access, if any. */
  readonly restrictedFaction: string | null
}

// ─── Entity payload ───────────────────────────────────────────────────────────
// Present only when a procedure creates, summons, animates, or transforms a
// non-standard actor. Required when taxonomy.intent === 'summoning'.

export type EntityDisposition = 'neutral' | 'hostile' | 'controlled'

export interface EntityPayload {
  readonly entityTypeTag: string
  readonly tier: number
  readonly dispositionDefault: EntityDisposition
  readonly boundToOperator: boolean
}

// ─── Procedure definition ─────────────────────────────────────────────────────

export interface ProcedureDefinition {
  readonly procedureId: string
  readonly canonicalName: string
  readonly aliases: readonly string[]
  readonly taxonomy: ProcedureTaxonomy
  readonly tier: ProcedureTier
  readonly requirements: RequirementPacket
  readonly activationTiming: ActivationTiming
  readonly targeting: TargetingPacket
  readonly persistence: PersistencePacket
  readonly restrictions: ProcedureRestrictions
  readonly provenance: ProcedureProvenance
  readonly availability: BoundedAvailability
  readonly entityPayload?: EntityPayload
}

// ─── Validation ───────────────────────────────────────────────────────────────

export type ProcedureDefinitionValidationFailure =
  | 'empty_procedure_id'
  | 'empty_canonical_name'
  | 'invalid_tier'
  | 'invalid_taxonomy_combination'
  | 'invalid_reagent_quantity'
  | 'negative_range'
  | 'invalid_source_count'
  | 'missing_entity_payload'

export type ProcedureDefinitionValidationResult =
  | { ok: true; definition: ProcedureDefinition }
  | { ok: false; error: ProcedureDefinitionValidationFailure; field: string }

const VALID_TIERS: ReadonlySet<number> = new Set([1, 2, 3, 4, 5])

export function validateProcedureDefinition(
  input: ProcedureDefinition
): ProcedureDefinitionValidationResult {
  const normalizedProcedureId = input.procedureId?.trim() ?? ''
  const normalizedCanonicalName = input.canonicalName?.trim() ?? ''

  if (normalizedProcedureId === '') {
    return { ok: false, error: 'empty_procedure_id', field: 'procedureId' }
  }
  if (normalizedCanonicalName === '') {
    return { ok: false, error: 'empty_canonical_name', field: 'canonicalName' }
  }
  if (!VALID_TIERS.has(input.tier)) {
    return { ok: false, error: 'invalid_tier', field: 'tier' }
  }
  // Constraint: 'martial' execution cannot require spoken incantation —
  // the physical execution model is incompatible with obligatory speech.
  if (
    input.taxonomy.executionMethod === 'martial' &&
    input.requirements.speech === 'required'
  ) {
    return {
      ok: false,
      error: 'invalid_taxonomy_combination',
      field: 'taxonomy.executionMethod',
    }
  }
  // Constraint: summoning intent must declare an entity payload to ensure
  // simulation consumers can read actor properties without re-deriving them.
  if (input.taxonomy.intent === 'summoning' && input.entityPayload === undefined) {
    return { ok: false, error: 'missing_entity_payload', field: 'entityPayload' }
  }
  for (const reagent of input.requirements.reagents) {
    if (reagent.quantity < 0) {
      return { ok: false, error: 'invalid_reagent_quantity', field: 'requirements.reagents' }
    }
  }
  if (input.targeting.rangeMeters !== null && input.targeting.rangeMeters < 0) {
    return { ok: false, error: 'negative_range', field: 'targeting.rangeMeters' }
  }
  if (
    input.availability.sourceCount !== undefined &&
    input.availability.sourceCount < 0
  ) {
    return { ok: false, error: 'invalid_source_count', field: 'availability.sourceCount' }
  }
  return {
    ok: true,
    definition: {
      ...input,
      procedureId: normalizedProcedureId,
      canonicalName: normalizedCanonicalName,
    },
  }
}

// ─── Downstream consumer: activation field summary ───────────────────────────
// Reads procedure geometry, duration, targeting, and resistance fields directly
// from the definition record — no prose re-derivation.

export interface ProcedureActivationSummary {
  readonly procedureId: string
  readonly canonicalName: string
  readonly geometry: TargetGeometry
  readonly effectiveRangeMeters: number | null
  readonly resistance: ResistanceHandling
  readonly durationLabel: string
  readonly isInstant: boolean
  readonly requiresSpecialistAccess: boolean
}

export function deriveProcedureActivationSummary(
  definition: ProcedureDefinition
): ProcedureActivationSummary {
  const { duration } = definition.persistence
  let durationLabel: string
  if (duration.unit === 'permanent') {
    durationLabel = 'permanent'
  } else if (duration.unit === 'until_dismissed') {
    durationLabel = 'until dismissed'
  } else if (duration.value !== null) {
    durationLabel = `${duration.value} ${duration.unit}`
  } else {
    durationLabel = 'indefinite'
  }

  return {
    procedureId: definition.procedureId,
    canonicalName: definition.canonicalName,
    geometry: definition.targeting.geometry,
    effectiveRangeMeters: definition.targeting.rangeMeters,
    resistance: definition.targeting.resistance,
    durationLabel,
    isInstant: definition.activationTiming === 'instant',
    requiresSpecialistAccess: definition.restrictions.requiresSpecialistAccess,
  }
}

// ─── Exemplar: BINDING_SIGIL ──────────────────────────────────────────────────
// A suppression ritual from the hermetic tradition. Uses bounded availability
// metadata (uncommon, 3 known sources, requires research completion).

export const BINDING_SIGIL: ProcedureDefinition = {
  procedureId: 'binding_sigil',
  canonicalName: 'Binding Sigil',
  aliases: ['iron_ward', 'containment_glyph'],
  taxonomy: {
    intent: 'suppression',
    effectDomain: 'spiritual',
    executionMethod: 'ritual',
    originTradition: 'hermetic',
  },
  tier: 3,
  requirements: {
    speech: 'trivial',
    gesture: 'required',
    toolTags: [],
    reagents: [{ tag: 'iron_filings', quantity: 1, consumable: true }],
    requiresDiagram: true,
    deviceTags: [],
    environmentalConditions: [],
  },
  activationTiming: 'ritual_hours',
  targeting: {
    geometry: 'single_target',
    rangeMeters: 5,
    resistance: 'contested_will',
    voluntaryResistanceSuppression: false,
    coverSensitive: false,
  },
  persistence: {
    duration: { value: 24, unit: 'hours', maintainable: true },
    dismissible: true,
    expiryState: 'target_released',
  },
  restrictions: {
    forbiddenRoles: [],
    requiredCertifications: ['occult_theory_2'],
    requiresSpecialistAccess: false,
    usageCap: null,
  },
  provenance: {
    sourceSystem: 'hermetic_codex',
    acquiredViaResearch: true,
    researchDiscipline: 'occult_theory',
    restrictedFaction: null,
  },
  availability: {
    rating: 'uncommon',
    sourceCount: 3,
    accessFriction: 'requires_research_completion',
  },
}

// ─── Exemplar: RESONANCE_CONSTRUCT ───────────────────────────────────────────
// A summoning device procedure with entity-specific payload and restricted
// faction access. Demonstrates both entityPayload and restricted availability.

export const RESONANCE_CONSTRUCT: ProcedureDefinition = {
  procedureId: 'resonance_construct',
  canonicalName: 'Resonance Construct',
  aliases: ['field_golem'],
  taxonomy: {
    intent: 'summoning',
    effectDomain: 'physical',
    executionMethod: 'device',
    originTradition: 'technical',
  },
  tier: 4,
  requirements: {
    speech: 'none',
    gesture: 'trivial',
    toolTags: ['construct_core'],
    reagents: [{ tag: 'resonance_crystal', quantity: 2, consumable: true }],
    requiresDiagram: false,
    deviceTags: ['fabrication_rig'],
    environmentalConditions: ['stable_power_source'],
  },
  activationTiming: 'full_action',
  targeting: {
    geometry: 'self',
    rangeMeters: null,
    resistance: 'none',
    voluntaryResistanceSuppression: false,
    coverSensitive: false,
  },
  persistence: {
    duration: { value: null, unit: 'until_dismissed', maintainable: false },
    dismissible: true,
    expiryState: 'construct_deactivated',
  },
  restrictions: {
    forbiddenRoles: [],
    requiredCertifications: ['engineering_3'],
    requiresSpecialistAccess: true,
    usageCap: 1,
  },
  provenance: {
    sourceSystem: 'technical_manual',
    acquiredViaResearch: true,
    researchDiscipline: 'engineering',
    restrictedFaction: 'tech_division',
  },
  availability: {
    rating: 'restricted',
    sourceCount: 1,
    accessFriction: 'requires_tech_division_clearance',
  },
  entityPayload: {
    entityTypeTag: 'animate_construct',
    tier: 3,
    dispositionDefault: 'controlled',
    boundToOperator: true,
  },
}
