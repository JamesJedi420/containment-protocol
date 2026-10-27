/**
 * SPE-3470 — research project definition, source capacity, milestones,
 * and static solvability validation.
 *
 * Authored/static contract only. SPE-3343 owns mutable execution, yield
 * consumption, milestone firing, and save/load. Source analytical capacity
 * here is project-specific yield — not destruction, custody, authenticity,
 * or access of the underlying canonical source (SPE-3471 / SPE-58 owners).
 */

export const RESEARCH_PROJECT_DEFINITION_SCHEMA_VERSION = 'spe-3470.v1' as const
export type ResearchProjectDefinitionSchemaVersion =
  typeof RESEARCH_PROJECT_DEFINITION_SCHEMA_VERSION

export const MILESTONE_OUTPUT_KINDS = [
  'reveal_finding',
  'reveal_source_reference',
  'unlock_method_reference',
  'complete_phase',
  'request_owner_routed_state_change',
] as const
export type MilestoneOutputKind = (typeof MILESTONE_OUTPUT_KINDS)[number]

export const FINDING_KINDS = ['mandatory', 'optional'] as const
export type FindingKind = (typeof FINDING_KINDS)[number]

export const SOLVABILITY_STATUSES = ['feasible', 'infeasible', 'runtime_dependent'] as const
export type SolvabilityStatus = (typeof SOLVABILITY_STATUSES)[number]

export const RESEARCH_PROJECT_DEFINITION_DIAGNOSTICS = [
  'empty_project_id',
  'empty_label',
  'duplicate_source_id',
  'duplicate_milestone_id',
  'duplicate_finding_id',
  'invalid_source_capacity',
  'invalid_source_reference',
  'invalid_milestone_reference',
  'invalid_finding_reference',
  'invalid_output_kind',
  'invalid_timed_event_binding',
  'invalid_hard_window',
  'unreachable_mandatory',
  'hard_bounds_infeasible',
  'hard_window_infeasible',
  'runtime_dependent',
] as const
export type ResearchProjectDefinitionDiagnostic =
  (typeof RESEARCH_PROJECT_DEFINITION_DIAGNOSTICS)[number]

export interface ResearchSourceCapacityRef {
  readonly sourceId: string
  /** Finite project-specific analytical yield. Not custody/destruction. */
  readonly analyticalCapacity: number
  /** Optional authored cost to unlock findings from this source on a route. */
  readonly analysisCost?: number
}

export interface ResearchMilestoneOutput {
  readonly kind: MilestoneOutputKind
  /** Owner-routed target id — never mutates foreign state in this layer. */
  readonly targetRef: string
}

export interface ResearchMilestoneEligibility {
  readonly requiredSourceIds?: readonly string[]
  readonly prerequisiteMilestoneIds?: readonly string[]
  readonly minAnalyticalSpend?: number
  /**
   * When true, eligibility cannot be proven from authored definition alone
   * (staffing / facility / mutable world). Emits `runtime_dependent`.
   */
  readonly requiresRuntimeConditions?: boolean
}

export interface ResearchMilestoneDefinition {
  readonly milestoneId: string
  readonly findingId: string
  readonly findingKind: FindingKind
  readonly eligibility: ResearchMilestoneEligibility
  readonly outputs: readonly ResearchMilestoneOutput[]
  /** Discrete authored ordering index used for hard-window feasibility. */
  readonly orderIndex?: number
}

export interface ResearchHardOpportunityBounds {
  /** Cap on total analytical spend across mandatory routes. */
  readonly maxAnalyticalCapacityTotal?: number
  /** Inclusive authored availability window over orderIndex values. */
  readonly availabilityWindow?: {
    readonly startOrder: number
    readonly endOrder: number
  }
  readonly timedEventBindingIds?: readonly string[]
}

export interface ResearchProjectDefinition {
  readonly schemaVersion: ResearchProjectDefinitionSchemaVersion
  readonly projectId: string
  readonly label: string
  readonly sources: readonly ResearchSourceCapacityRef[]
  readonly milestones: readonly ResearchMilestoneDefinition[]
  readonly closureRequirement: {
    readonly mandatoryFindingIds: readonly string[]
  }
  readonly hardOpportunityBounds?: ResearchHardOpportunityBounds
  /** Structural SPE-1287 bindings only — lifecycle stays with SPE-1287. */
  readonly timedEventBindingIds?: readonly string[]
}

export interface ResearchProjectDefinitionDiagnosticRecord {
  readonly code: ResearchProjectDefinitionDiagnostic
  readonly field: string
  readonly message: string
}

export type ResearchProjectDefinitionValidationResult =
  | {
      readonly ok: true
      readonly definition: ResearchProjectDefinition
      readonly solvability: SolvabilityStatus
      readonly diagnostics: readonly ResearchProjectDefinitionDiagnosticRecord[]
    }
  | {
      readonly ok: false
      readonly solvability: Exclude<SolvabilityStatus, 'feasible'>
      readonly diagnostics: readonly ResearchProjectDefinitionDiagnosticRecord[]
    }

const OUTPUT_KIND_SET: ReadonlySet<string> = new Set(MILESTONE_OUTPUT_KINDS)

function diagnostic(
  code: ResearchProjectDefinitionDiagnostic,
  field: string,
  message: string
): ResearchProjectDefinitionDiagnosticRecord {
  return { code, field, message }
}

function isNonEmptyId(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeId(value: string): string {
  return value.trim()
}

function sourceSpend(source: ResearchSourceCapacityRef): number {
  if (source.analysisCost !== undefined) return source.analysisCost
  return source.analyticalCapacity
}

function collectMandatoryMilestones(
  definition: ResearchProjectDefinition
): ResearchMilestoneDefinition[] {
  const mandatoryIds = new Set(definition.closureRequirement.mandatoryFindingIds)
  return definition.milestones.filter(
    (milestone) => milestone.findingKind === 'mandatory' || mandatoryIds.has(milestone.findingId)
  )
}

function milestoneSpend(
  milestone: ResearchMilestoneDefinition,
  sourcesById: ReadonlyMap<string, ResearchSourceCapacityRef>
): number {
  if (milestone.eligibility.minAnalyticalSpend !== undefined) {
    return milestone.eligibility.minAnalyticalSpend
  }
  const required = milestone.eligibility.requiredSourceIds ?? []
  let total = 0
  for (const sourceId of required) {
    const source = sourcesById.get(sourceId)
    if (source) total += sourceSpend(source)
  }
  return total
}

/**
 * Static solvability over authored sources, milestone DAG, and hard bounds.
 * Does not simulate campaign runtime or invent opportunity points.
 */
export function analyzeResearchProjectSolvability(definition: ResearchProjectDefinition): {
  readonly status: SolvabilityStatus
  readonly diagnostics: readonly ResearchProjectDefinitionDiagnosticRecord[]
} {
  const diagnostics: ResearchProjectDefinitionDiagnosticRecord[] = []
  const sourcesById = new Map(
    definition.sources.map((source) => [source.sourceId, source] as const)
  )
  const milestonesById = new Map(
    definition.milestones.map((milestone) => [milestone.milestoneId, milestone] as const)
  )
  const findingToMilestone = new Map(
    definition.milestones.map((milestone) => [milestone.findingId, milestone] as const)
  )

  const mandatoryFindings = [...new Set(definition.closureRequirement.mandatoryFindingIds)]
  for (const findingId of mandatoryFindings) {
    if (!findingToMilestone.has(findingId)) {
      diagnostics.push(
        diagnostic(
          'invalid_finding_reference',
          'closureRequirement.mandatoryFindingIds',
          `Mandatory finding ${findingId} has no milestone.`
        )
      )
    }
  }

  const reachableMilestoneIds = new Set<string>()
  const visiting = new Set<string>()
  const runtimeBlockedMilestoneIds = new Set<string>()
  const staticallyBlockedMilestoneIds = new Set<string>()

  const tryReach = (milestoneId: string): 'reachable' | 'runtime_blocked' | 'static_blocked' => {
    if (reachableMilestoneIds.has(milestoneId)) return 'reachable'
    if (staticallyBlockedMilestoneIds.has(milestoneId)) return 'static_blocked'
    if (runtimeBlockedMilestoneIds.has(milestoneId)) return 'runtime_blocked'
    if (visiting.has(milestoneId)) {
      staticallyBlockedMilestoneIds.add(milestoneId)
      return 'static_blocked'
    }
    const milestone = milestonesById.get(milestoneId)
    if (!milestone) return 'static_blocked'
    visiting.add(milestoneId)

    let hasStaticBlock = false
    let hasRuntimeBlock = milestone.eligibility.requiresRuntimeConditions === true

    for (const sourceId of milestone.eligibility.requiredSourceIds ?? []) {
      if (!sourcesById.has(sourceId)) {
        hasStaticBlock = true
      }
    }

    for (const prerequisiteId of milestone.eligibility.prerequisiteMilestoneIds ?? []) {
      const prerequisiteReach = tryReach(prerequisiteId)
      if (prerequisiteReach === 'static_blocked') {
        hasStaticBlock = true
      } else if (prerequisiteReach === 'runtime_blocked') {
        hasRuntimeBlock = true
      }
    }

    visiting.delete(milestoneId)
    if (hasStaticBlock) {
      staticallyBlockedMilestoneIds.add(milestoneId)
      return 'static_blocked'
    }
    if (hasRuntimeBlock) {
      runtimeBlockedMilestoneIds.add(milestoneId)
      return 'runtime_blocked'
    }
    reachableMilestoneIds.add(milestoneId)
    return 'reachable'
  }

  for (const milestone of definition.milestones) {
    void tryReach(milestone.milestoneId)
  }

  const mandatoryMilestones = collectMandatoryMilestones(definition)
  const runtimeDependent = mandatoryMilestones.some((milestone) =>
    runtimeBlockedMilestoneIds.has(milestone.milestoneId)
  )
  const unreachableMandatory = mandatoryMilestones.filter(
    (milestone) =>
      !reachableMilestoneIds.has(milestone.milestoneId) &&
      !runtimeBlockedMilestoneIds.has(milestone.milestoneId)
  )

  if (unreachableMandatory.length > 0) {
    for (const milestone of unreachableMandatory) {
      diagnostics.push(
        diagnostic(
          'unreachable_mandatory',
          `milestones.${milestone.milestoneId}`,
          `Mandatory finding ${milestone.findingId} is unreachable from authored sources/prerequisites.`
        )
      )
    }
  }

  const mandatorySpend = mandatoryMilestones.reduce(
    (sum, milestone) => sum + milestoneSpend(milestone, sourcesById),
    0
  )

  const totalCapacity = definition.sources.reduce(
    (sum, source) => sum + source.analyticalCapacity,
    0
  )

  if (mandatorySpend > totalCapacity) {
    diagnostics.push(
      diagnostic(
        'unreachable_mandatory',
        'sources',
        'Mandatory analytical spend exceeds total authored source capacity.'
      )
    )
  }

  const hardCap = definition.hardOpportunityBounds?.maxAnalyticalCapacityTotal
  if (hardCap !== undefined && mandatorySpend > hardCap) {
    diagnostics.push(
      diagnostic(
        'hard_bounds_infeasible',
        'hardOpportunityBounds.maxAnalyticalCapacityTotal',
        `Mandatory spend ${mandatorySpend} exceeds hard capacity bound ${hardCap}.`
      )
    )
  }

  const window = definition.hardOpportunityBounds?.availabilityWindow
  if (window) {
    const mandatoryOutsideWindow = mandatoryMilestones.filter((milestone) => {
      const order = milestone.orderIndex
      if (order === undefined) return false
      return order < window.startOrder || order > window.endOrder
    })
    if (mandatoryOutsideWindow.length > 0) {
      diagnostics.push(
        diagnostic(
          'hard_window_infeasible',
          'hardOpportunityBounds.availabilityWindow',
          'At least one mandatory milestone orderIndex falls outside the authored availability window.'
        )
      )
    }
  }

  const hasStaticInfeasibility = diagnostics.some((entry) => entry.code !== 'runtime_dependent')

  if (runtimeDependent && !hasStaticInfeasibility) {
    diagnostics.push(
      diagnostic(
        'runtime_dependent',
        'milestones.eligibility.requiresRuntimeConditions',
        'Mandatory completion depends on mutable runtime conditions not fixed by the authored definition.'
      )
    )
    return { status: 'runtime_dependent', diagnostics }
  }

  if (hasStaticInfeasibility) {
    return { status: 'infeasible', diagnostics }
  }

  return { status: 'feasible', diagnostics: [] }
}

export function validateResearchProjectDefinition(
  input: ResearchProjectDefinition
): ResearchProjectDefinitionValidationResult {
  const diagnostics: ResearchProjectDefinitionDiagnosticRecord[] = []

  const projectId = isNonEmptyId(input.projectId) ? normalizeId(input.projectId) : ''
  const label = isNonEmptyId(input.label) ? normalizeId(input.label) : ''
  if (projectId === '') {
    diagnostics.push(diagnostic('empty_project_id', 'projectId', 'projectId is required.'))
  }
  if (label === '') {
    diagnostics.push(diagnostic('empty_label', 'label', 'label is required.'))
  }

  const sourceIds = new Set<string>()
  for (const [index, source] of input.sources.entries()) {
    if (!isNonEmptyId(source.sourceId)) {
      diagnostics.push(
        diagnostic(
          'invalid_source_reference',
          `sources[${index}].sourceId`,
          'sourceId must be a non-empty string.'
        )
      )
      continue
    }
    const sourceId = normalizeId(source.sourceId)
    if (sourceIds.has(sourceId)) {
      diagnostics.push(
        diagnostic(
          'duplicate_source_id',
          `sources[${index}].sourceId`,
          `Duplicate sourceId ${sourceId}.`
        )
      )
    }
    sourceIds.add(sourceId)
    if (
      !Number.isFinite(source.analyticalCapacity) ||
      source.analyticalCapacity < 0 ||
      !Number.isInteger(source.analyticalCapacity)
    ) {
      diagnostics.push(
        diagnostic(
          'invalid_source_capacity',
          `sources[${index}].analyticalCapacity`,
          'analyticalCapacity must be a non-negative integer.'
        )
      )
    }
    if (
      source.analysisCost !== undefined &&
      (!Number.isFinite(source.analysisCost) ||
        source.analysisCost < 0 ||
        !Number.isInteger(source.analysisCost))
    ) {
      diagnostics.push(
        diagnostic(
          'invalid_source_capacity',
          `sources[${index}].analysisCost`,
          'analysisCost must be a non-negative integer when present.'
        )
      )
    }
  }

  const milestoneIds = new Set<string>()
  const findingIds = new Set<string>()
  for (const [index, milestone] of input.milestones.entries()) {
    if (!isNonEmptyId(milestone.milestoneId)) {
      diagnostics.push(
        diagnostic(
          'invalid_milestone_reference',
          `milestones[${index}].milestoneId`,
          'milestoneId must be a non-empty string.'
        )
      )
      continue
    }
    const milestoneId = normalizeId(milestone.milestoneId)
    if (milestoneIds.has(milestoneId)) {
      diagnostics.push(
        diagnostic(
          'duplicate_milestone_id',
          `milestones[${index}].milestoneId`,
          `Duplicate milestoneId ${milestoneId}.`
        )
      )
    }
    milestoneIds.add(milestoneId)

    if (!isNonEmptyId(milestone.findingId)) {
      diagnostics.push(
        diagnostic(
          'invalid_finding_reference',
          `milestones[${index}].findingId`,
          'findingId must be a non-empty string.'
        )
      )
    } else {
      const findingId = normalizeId(milestone.findingId)
      if (findingIds.has(findingId)) {
        diagnostics.push(
          diagnostic(
            'duplicate_finding_id',
            `milestones[${index}].findingId`,
            `Duplicate findingId ${findingId}.`
          )
        )
      }
      findingIds.add(findingId)
    }

    for (const sourceId of milestone.eligibility.requiredSourceIds ?? []) {
      if (!sourceIds.has(normalizeId(sourceId))) {
        diagnostics.push(
          diagnostic(
            'invalid_source_reference',
            `milestones[${index}].eligibility.requiredSourceIds`,
            `Unknown sourceId ${sourceId}.`
          )
        )
      }
    }

    if (milestone.outputs.length === 0) {
      diagnostics.push(
        diagnostic(
          'invalid_output_kind',
          `milestones[${index}].outputs`,
          'At least one typed milestone output is required.'
        )
      )
    }
    for (const [outputIndex, output] of milestone.outputs.entries()) {
      if (!OUTPUT_KIND_SET.has(output.kind)) {
        diagnostics.push(
          diagnostic(
            'invalid_output_kind',
            `milestones[${index}].outputs[${outputIndex}].kind`,
            `Unknown output kind ${String(output.kind)}.`
          )
        )
      }
      if (!isNonEmptyId(output.targetRef)) {
        diagnostics.push(
          diagnostic(
            'invalid_output_kind',
            `milestones[${index}].outputs[${outputIndex}].targetRef`,
            'targetRef must be a non-empty string.'
          )
        )
      }
    }
  }

  // Second pass: prerequisite ids that appear later are allowed; unknown after full set.
  for (const [index, milestone] of input.milestones.entries()) {
    for (const prerequisiteId of milestone.eligibility.prerequisiteMilestoneIds ?? []) {
      if (!milestoneIds.has(normalizeId(prerequisiteId))) {
        diagnostics.push(
          diagnostic(
            'invalid_milestone_reference',
            `milestones[${index}].eligibility.prerequisiteMilestoneIds`,
            `Unknown prerequisite milestone ${prerequisiteId}.`
          )
        )
      }
    }
  }

  for (const bindingId of input.timedEventBindingIds ?? []) {
    if (!isNonEmptyId(bindingId)) {
      diagnostics.push(
        diagnostic(
          'invalid_timed_event_binding',
          'timedEventBindingIds',
          'Timed-event binding ids must be non-empty strings.'
        )
      )
    }
  }
  for (const bindingId of input.hardOpportunityBounds?.timedEventBindingIds ?? []) {
    if (!isNonEmptyId(bindingId)) {
      diagnostics.push(
        diagnostic(
          'invalid_timed_event_binding',
          'hardOpportunityBounds.timedEventBindingIds',
          'Hard-bound timed-event binding ids must be non-empty strings.'
        )
      )
    }
  }

  const window = input.hardOpportunityBounds?.availabilityWindow
  if (window && window.startOrder > window.endOrder) {
    diagnostics.push(
      diagnostic(
        'invalid_hard_window',
        'hardOpportunityBounds.availabilityWindow',
        'availabilityWindow.startOrder must be <= endOrder.'
      )
    )
  }

  const schemaDiagnostics = diagnostics.filter(
    (entry) =>
      entry.code !== 'unreachable_mandatory' &&
      entry.code !== 'hard_bounds_infeasible' &&
      entry.code !== 'hard_window_infeasible' &&
      entry.code !== 'runtime_dependent'
  )

  if (schemaDiagnostics.length > 0) {
    return {
      ok: false,
      solvability: 'infeasible',
      diagnostics: schemaDiagnostics,
    }
  }

  const normalized: ResearchProjectDefinition = {
    ...input,
    schemaVersion: RESEARCH_PROJECT_DEFINITION_SCHEMA_VERSION,
    projectId,
    label,
    sources: input.sources.map((source) => ({
      ...source,
      sourceId: normalizeId(source.sourceId),
    })),
    milestones: input.milestones.map((milestone) => ({
      ...milestone,
      milestoneId: normalizeId(milestone.milestoneId),
      findingId: normalizeId(milestone.findingId),
      eligibility: {
        ...milestone.eligibility,
        requiredSourceIds: milestone.eligibility.requiredSourceIds?.map(normalizeId),
        prerequisiteMilestoneIds: milestone.eligibility.prerequisiteMilestoneIds?.map(normalizeId),
      },
      outputs: milestone.outputs.map((output) => ({
        ...output,
        targetRef: normalizeId(output.targetRef),
      })),
    })),
    closureRequirement: {
      mandatoryFindingIds: input.closureRequirement.mandatoryFindingIds.map(normalizeId),
    },
  }

  const solvability = analyzeResearchProjectSolvability(normalized)
  if (solvability.status === 'feasible') {
    return {
      ok: true,
      definition: normalized,
      solvability: 'feasible',
      diagnostics: [],
    }
  }
  if (solvability.status === 'runtime_dependent') {
    return {
      ok: true,
      definition: normalized,
      solvability: 'runtime_dependent',
      diagnostics: solvability.diagnostics,
    }
  }
  return {
    ok: false,
    solvability: 'infeasible',
    diagnostics: solvability.diagnostics,
  }
}

/** Representative authored fixture: two sources, mandatory + optional findings. */
export const ARCHIVE_LEAD_RESEARCH_PROJECT: ResearchProjectDefinition = {
  schemaVersion: RESEARCH_PROJECT_DEFINITION_SCHEMA_VERSION,
  projectId: 'research.archive-lead.v1',
  label: 'Archive Lead Pattern',
  sources: [
    { sourceId: 'source.archive-index', analyticalCapacity: 4, analysisCost: 2 },
    { sourceId: 'source.field-notes', analyticalCapacity: 3, analysisCost: 1 },
  ],
  milestones: [
    {
      milestoneId: 'milestone.catalog-hit',
      findingId: 'finding.catalog-hit',
      findingKind: 'mandatory',
      orderIndex: 1,
      eligibility: { requiredSourceIds: ['source.archive-index'] },
      outputs: [
        { kind: 'reveal_finding', targetRef: 'finding.catalog-hit' },
        { kind: 'complete_phase', targetRef: 'phase.intake' },
      ],
    },
    {
      milestoneId: 'milestone.corroboration',
      findingId: 'finding.corroboration',
      findingKind: 'mandatory',
      orderIndex: 2,
      eligibility: {
        requiredSourceIds: ['source.field-notes'],
        prerequisiteMilestoneIds: ['milestone.catalog-hit'],
      },
      outputs: [
        { kind: 'reveal_finding', targetRef: 'finding.corroboration' },
        { kind: 'request_owner_routed_state_change', targetRef: 'owner.research-rollout' },
      ],
    },
    {
      milestoneId: 'milestone.side-channel',
      findingId: 'finding.side-channel',
      findingKind: 'optional',
      orderIndex: 3,
      eligibility: { requiredSourceIds: ['source.field-notes'] },
      outputs: [{ kind: 'reveal_source_reference', targetRef: 'source.rumor-ledger' }],
    },
  ],
  closureRequirement: {
    mandatoryFindingIds: ['finding.catalog-hit', 'finding.corroboration'],
  },
  timedEventBindingIds: ['timed.research-archive-window'],
}
