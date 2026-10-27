/**
 * SPE-3343 — deterministic research capability-to-throughput execution.
 * Pure resolver over SPE-3470 project definitions; mutable runtime owned here.
 */

import type {
  MilestoneOutputKind,
  ResearchMilestoneDefinition,
  ResearchMilestoneOutput,
  ResearchProjectDefinition,
} from './researchProjectDefinition'
import { MILESTONE_OUTPUT_KINDS } from './researchProjectDefinition'

export const RESEARCH_EXECUTION_RUNTIME_SCHEMA_VERSION = 'spe-3343.v1' as const
export type ResearchExecutionRuntimeSchemaVersion =
  typeof RESEARCH_EXECUTION_RUNTIME_SCHEMA_VERSION

export const RESEARCH_EXECUTION_ENTRY_KINDS = [
  'trivial_information',
  'persistent_research',
] as const
export type ResearchExecutionEntryKind = (typeof RESEARCH_EXECUTION_ENTRY_KINDS)[number]

export const RESEARCH_EXECUTION_OUTCOMES = [
  'progressed',
  'degraded',
  'blocked',
  'completed',
  'interrupted',
  'rejected_malformed',
] as const
export type ResearchExecutionOutcome = (typeof RESEARCH_EXECUTION_OUTCOMES)[number]

/** Capability ratio below this blocks progress (unless degraded path applies). */
export const INSUFFICIENT_CAPABILITY_RATIO_THRESHOLD = 0.25 as const

/** Degraded throughput multiplier when capability is low but above hard block. */
export const DEGRADED_THROUGHPUT_MULTIPLIER = 0.35 as const

export interface ResearchFacilityGateInput {
  readonly gateId: string
  readonly satisfied: boolean
  readonly reasonCodes?: readonly string[]
}

export interface ResearchStaffCompetencyRef {
  readonly competencyId: string
  readonly score: number
}

export interface ResearchSourceInputRef {
  readonly sourceId: string
  readonly available: boolean
  readonly quality: number
  readonly priorKnowledgeBonus: number
}

export interface ResearchCapabilityPacket {
  readonly domainScores: Readonly<Record<string, number>>
  readonly requiredDomainIds?: readonly string[]
  readonly difficulty: number
  readonly facilityGates: readonly ResearchFacilityGateInput[]
  readonly staffCompetencyRefs: readonly ResearchStaffCompetencyRef[]
  readonly staffTimeCommitmentId?: string
  readonly staffTimeCommitmentConflict?: boolean
  readonly sourceInputRefs: readonly ResearchSourceInputRef[]
  readonly reproducibleRecordBonus?: number
  readonly materialRiskFlag?: boolean
}

export interface ResearchExecutionEntryClassificationInput {
  readonly definition?: ResearchProjectDefinition
  readonly capability: ResearchCapabilityPacket
  readonly hasExistingPartialProgress?: boolean
}

export interface ResearchExecutionEntryClassification {
  readonly kind: ResearchExecutionEntryKind
  readonly reasonCodes: readonly string[]
}

export interface ResearchExecutionRuntime {
  readonly schemaVersion: ResearchExecutionRuntimeSchemaVersion
  readonly projectId: string
  readonly sourceYieldRemaining: Readonly<Record<string, number>>
  readonly firedMilestoneIds: readonly string[]
  readonly analyticalSpend: number
  readonly progressUnits: number
  readonly commitmentId: string | null
  readonly interrupted: boolean
  readonly lastReasonCodes: readonly string[]
}

export interface ResearchThroughputResolveInput {
  readonly capability: ResearchCapabilityPacket
  readonly runtime?: ResearchExecutionRuntime | null
}

export interface ResearchThroughputResult {
  readonly progressDelta: number
  readonly outcome: ResearchExecutionOutcome
  readonly reasonCodes: readonly string[]
  readonly effectiveCapability: number
  readonly baseThroughput: number
  readonly throughputMultiplier: number
  readonly explanationSummary: string
}

export interface ResearchMilestoneFiredOutput {
  readonly milestoneId: string
  readonly findingId: string
  readonly outputs: readonly ResearchMilestoneOutput[]
}

export interface ResearchExecutionTickInput {
  readonly definition: ResearchProjectDefinition
  readonly runtime: ResearchExecutionRuntime
  readonly capability: ResearchCapabilityPacket
  readonly runtimeConditionsSatisfied?: Readonly<Record<string, boolean>>
}

export interface ResearchExecutionTickResult {
  readonly outcome: ResearchExecutionOutcome
  readonly progressDelta: number
  readonly reasonCodes: readonly string[]
  readonly explanationSummary: string
  readonly updatedRuntime: ResearchExecutionRuntime | null
  readonly milestoneOutputs: readonly ResearchMilestoneFiredOutput[]
  readonly throughput: ResearchThroughputResult
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function round4(value: number): number {
  return Number(value.toFixed(4))
}

function sortedUnique(ids: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(ids.filter((id) => id.length > 0))].sort())
}

function freezeRuntime(runtime: ResearchExecutionRuntime): ResearchExecutionRuntime {
  return Object.freeze({
    ...runtime,
    sourceYieldRemaining: Object.freeze({ ...runtime.sourceYieldRemaining }),
    firedMilestoneIds: sortedUnique(runtime.firedMilestoneIds),
    lastReasonCodes: sortedUnique(runtime.lastReasonCodes),
  })
}

function meanDomainScores(
  domainScores: Readonly<Record<string, number>>,
  requiredDomainIds: readonly string[] | undefined,
): number {
  const ids =
    requiredDomainIds && requiredDomainIds.length > 0
      ? requiredDomainIds
      : Object.keys(domainScores)
  if (ids.length === 0) return 0
  let sum = 0
  for (const id of ids) {
    const score = domainScores[id]
    // Missing required domains count as 0 (fail closed), not omitted from the mean.
    sum +=
      typeof score === 'number' && Number.isFinite(score) ? clamp01(score) : 0
  }
  return round4(sum / ids.length)
}

function validateCapabilityPacket(
  capability: ResearchCapabilityPacket,
): readonly string[] {
  const reasons: string[] = []
  if (!Number.isFinite(capability.difficulty) || capability.difficulty <= 0) {
    reasons.push('invalid_difficulty')
  }
  for (const ref of capability.sourceInputRefs) {
    if (!ref.sourceId.trim()) reasons.push('invalid_source_ref')
    if (!Number.isFinite(ref.quality) || ref.quality < 0 || ref.quality > 1) {
      reasons.push('invalid_source_quality')
    }
    if (
      !Number.isFinite(ref.priorKnowledgeBonus) ||
      ref.priorKnowledgeBonus < 0 ||
      ref.priorKnowledgeBonus > 1
    ) {
      reasons.push('invalid_prior_knowledge_bonus')
    }
  }
  for (const staff of capability.staffCompetencyRefs) {
    if (
      !Number.isFinite(staff.score) ||
      staff.score < 0 ||
      staff.score > 1
    ) {
      reasons.push('invalid_staff_competency_score')
    }
  }
  if (
    capability.reproducibleRecordBonus !== undefined &&
    (!Number.isFinite(capability.reproducibleRecordBonus) ||
      capability.reproducibleRecordBonus < 0 ||
      capability.reproducibleRecordBonus > 1)
  ) {
    reasons.push('invalid_reproducible_record_bonus')
  }
  return sortedUnique(reasons)
}

function sourceQualityAverage(sources: readonly ResearchSourceInputRef[]): number {
  const available = sources.filter((s) => s.available)
  if (available.length === 0) return 0
  const sum = available.reduce((acc, s) => acc + clamp01(s.quality), 0)
  return round4(sum / available.length)
}

function priorKnowledgeAverage(sources: readonly ResearchSourceInputRef[]): number {
  const available = sources.filter((s) => s.available)
  if (available.length === 0) return 0
  const sum = available.reduce((acc, s) => acc + clamp01(s.priorKnowledgeBonus), 0)
  return round4(sum / available.length)
}

function hasMeaningfulStaffAllocation(capability: ResearchCapabilityPacket): boolean {
  if (capability.staffTimeCommitmentId && capability.staffTimeCommitmentId.trim()) {
    return true
  }
  return capability.staffCompetencyRefs.some((ref) => clamp01(ref.score) >= 0.4)
}

function hasStagedMilestones(definition: ResearchProjectDefinition | undefined): boolean {
  if (!definition) return false
  if (definition.milestones.length > 1) return true
  return definition.milestones.some(
    (m) =>
      (m.eligibility.prerequisiteMilestoneIds?.length ?? 0) > 0 ||
      m.eligibility.minAnalyticalSpend !== undefined,
  )
}

/**
 * Deterministic trivial vs persistent research entry classification.
 * Trivial work must not create persistent runtime state.
 */
export function classifyResearchExecutionEntry(
  input: ResearchExecutionEntryClassificationInput,
): ResearchExecutionEntryClassification {
  const reasonCodes: string[] = []
  const { capability, definition, hasExistingPartialProgress } = input

  if (hasExistingPartialProgress) {
    reasonCodes.push('partial_progress')
  }
  if (capability.sourceInputRefs.length > 1) {
    reasonCodes.push('multiple_sources')
  }
  if (hasMeaningfulStaffAllocation(capability)) {
    reasonCodes.push('staff_allocation')
  }
  if (hasStagedMilestones(definition)) {
    reasonCodes.push('staged_milestones')
  }
  if (capability.materialRiskFlag === true) {
    reasonCodes.push('material_risk')
  }

  const kind: ResearchExecutionEntryKind =
    reasonCodes.length === 0 ? 'trivial_information' : 'persistent_research'

  return Object.freeze({
    kind,
    reasonCodes: sortedUnique(reasonCodes),
  })
}

export function createEmptyResearchExecutionRuntime(
  projectId: string,
  definition?: ResearchProjectDefinition,
): ResearchExecutionRuntime {
  const trimmed = projectId.trim()
  const yieldRemaining: Record<string, number> = {}
  if (definition) {
    for (const source of definition.sources) {
      yieldRemaining[source.sourceId] = source.analyticalCapacity
    }
  }
  return freezeRuntime({
    schemaVersion: RESEARCH_EXECUTION_RUNTIME_SCHEMA_VERSION,
    projectId: trimmed,
    sourceYieldRemaining: yieldRemaining,
    firedMilestoneIds: [],
    analyticalSpend: 0,
    progressUnits: 0,
    commitmentId: null,
    interrupted: false,
    lastReasonCodes: [],
  })
}

export function serializeResearchExecutionRuntime(
  runtime: ResearchExecutionRuntime,
): string {
  const payload = {
    schemaVersion: runtime.schemaVersion,
    projectId: runtime.projectId,
    sourceYieldRemaining: runtime.sourceYieldRemaining,
    firedMilestoneIds: [...runtime.firedMilestoneIds],
    analyticalSpend: runtime.analyticalSpend,
    progressUnits: runtime.progressUnits,
    commitmentId: runtime.commitmentId,
    interrupted: runtime.interrupted,
    lastReasonCodes: [...runtime.lastReasonCodes],
  }
  return JSON.stringify(payload)
}

export function parseResearchExecutionRuntime(
  raw: unknown,
): ResearchExecutionRuntime | null {
  if (raw === null || raw === undefined) return null
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      return null
    }
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const record = parsed as Record<string, unknown>
  if (record.schemaVersion !== RESEARCH_EXECUTION_RUNTIME_SCHEMA_VERSION) return null
  if (typeof record.projectId !== 'string' || record.projectId.trim() === '') return null
  if (typeof record.sourceYieldRemaining !== 'object' || record.sourceYieldRemaining === null) {
    return null
  }
  const yieldMap: Record<string, number> = {}
  for (const [key, value] of Object.entries(record.sourceYieldRemaining)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
    yieldMap[key] = value
  }
  if (!Array.isArray(record.firedMilestoneIds)) return null
  for (const id of record.firedMilestoneIds) {
    if (typeof id !== 'string') return null
  }
  if (typeof record.analyticalSpend !== 'number' || !Number.isFinite(record.analyticalSpend)) {
    return null
  }
  if (typeof record.progressUnits !== 'number' || !Number.isFinite(record.progressUnits)) {
    return null
  }
  if (record.commitmentId !== null && typeof record.commitmentId !== 'string') return null
  if (typeof record.interrupted !== 'boolean') return null
  if (!Array.isArray(record.lastReasonCodes)) return null
  for (const code of record.lastReasonCodes) {
    if (typeof code !== 'string' || code.trim() === '') return null
  }

  return freezeRuntime({
    schemaVersion: RESEARCH_EXECUTION_RUNTIME_SCHEMA_VERSION,
    projectId: record.projectId.trim(),
    sourceYieldRemaining: yieldMap,
    firedMilestoneIds: sortedUnique(record.firedMilestoneIds as string[]),
    analyticalSpend: Math.max(0, record.analyticalSpend),
    progressUnits: Math.max(0, record.progressUnits),
    commitmentId: record.commitmentId as string | null,
    interrupted: record.interrupted,
    lastReasonCodes: sortedUnique(record.lastReasonCodes as string[]),
  })
}

/**
 * Resolve deterministic throughput from capability vs difficulty and bounded modifiers.
 * Modifiers accelerate only; hard gates cannot be bypassed.
 */
export function resolveResearchThroughput(
  input: ResearchThroughputResolveInput,
): ResearchThroughputResult {
  const { capability } = input
  const malformed = validateCapabilityPacket(capability)
  if (malformed.length > 0) {
    return Object.freeze({
      progressDelta: 0,
      outcome: 'rejected_malformed',
      reasonCodes: sortedUnique(['rejected_malformed', ...malformed]),
      effectiveCapability: 0,
      baseThroughput: 0,
      throughputMultiplier: 0,
      explanationSummary: 'Malformed capability packet.',
    })
  }

  if (input.runtime?.interrupted) {
    return Object.freeze({
      progressDelta: 0,
      outcome: 'interrupted',
      reasonCodes: sortedUnique(['execution_interrupted']),
      effectiveCapability: 0,
      baseThroughput: 0,
      throughputMultiplier: 0,
      explanationSummary: 'Research execution is interrupted.',
    })
  }

  if (capability.staffTimeCommitmentConflict === true) {
    return Object.freeze({
      progressDelta: 0,
      outcome: 'blocked',
      reasonCodes: sortedUnique(['staff_time_conflict']),
      effectiveCapability: 0,
      baseThroughput: 0,
      throughputMultiplier: 0,
      explanationSummary: 'Staff time commitment conflict blocks research.',
    })
  }

  const unsatisfiedGate = capability.facilityGates.find((gate) => !gate.satisfied)
  if (unsatisfiedGate) {
    const gateReasons = unsatisfiedGate.reasonCodes ?? [`facility_gate_unsatisfied:${unsatisfiedGate.gateId}`]
    return Object.freeze({
      progressDelta: 0,
      outcome: 'blocked',
      reasonCodes: sortedUnique(['facility_gate_unsatisfied', ...gateReasons]),
      effectiveCapability: 0,
      baseThroughput: 0,
      throughputMultiplier: 0,
      explanationSummary: `Facility gate ${unsatisfiedGate.gateId} is unsatisfied.`,
    })
  }

  const unavailableRequired = capability.sourceInputRefs.filter((ref) => !ref.available)
  if (
    capability.sourceInputRefs.length > 0 &&
    unavailableRequired.length === capability.sourceInputRefs.length
  ) {
    return Object.freeze({
      progressDelta: 0,
      outcome: 'blocked',
      reasonCodes: sortedUnique(['required_source_unavailable']),
      effectiveCapability: 0,
      baseThroughput: 0,
      throughputMultiplier: 0,
      explanationSummary: 'All required source inputs are unavailable.',
    })
  }

  for (const ref of capability.sourceInputRefs) {
    if (!ref.available) {
      return Object.freeze({
        progressDelta: 0,
        outcome: 'blocked',
        reasonCodes: sortedUnique([`source_unavailable:${ref.sourceId}`]),
        effectiveCapability: 0,
        baseThroughput: 0,
        throughputMultiplier: 0,
        explanationSummary: `Source ${ref.sourceId} is unavailable.`,
      })
    }
  }

  const effectiveCapability = meanDomainScores(
    capability.domainScores,
    capability.requiredDomainIds,
  )
  const baseThroughput = round4(effectiveCapability / capability.difficulty)

  const qualityFactor = 0.5 + 0.5 * sourceQualityAverage(capability.sourceInputRefs)
  const knowledgeFactor = 1 + 0.25 * priorKnowledgeAverage(capability.sourceInputRefs)
  const reproducibleFactor =
    1 + (capability.reproducibleRecordBonus !== undefined ? capability.reproducibleRecordBonus * 0.2 : 0)

  const throughputMultiplier = round4(qualityFactor * knowledgeFactor * reproducibleFactor)
  const capabilityRatio = round4(effectiveCapability / capability.difficulty)

  if (capabilityRatio < INSUFFICIENT_CAPABILITY_RATIO_THRESHOLD) {
    return Object.freeze({
      progressDelta: 0,
      outcome: 'blocked',
      reasonCodes: sortedUnique(['insufficient_capability']),
      effectiveCapability,
      baseThroughput,
      throughputMultiplier,
      explanationSummary: 'Capability versus difficulty is below the minimum threshold.',
    })
  }

  let outcome: ResearchExecutionOutcome = 'progressed'
  let progressDelta = round4(baseThroughput * throughputMultiplier)
  const reasonCodes: string[] = []

  if (capabilityRatio < INSUFFICIENT_CAPABILITY_RATIO_THRESHOLD * 2) {
    outcome = 'degraded'
    progressDelta = round4(progressDelta * DEGRADED_THROUGHPUT_MULTIPLIER)
    reasonCodes.push('degraded_throughput')
  }

  if (progressDelta <= 0) {
    outcome = 'blocked'
    reasonCodes.push('zero_throughput')
    progressDelta = 0
  }

  return Object.freeze({
    progressDelta,
    outcome,
    reasonCodes: sortedUnique(reasonCodes),
    effectiveCapability,
    baseThroughput,
    throughputMultiplier,
    explanationSummary:
      outcome === 'degraded'
        ? 'Research progresses at degraded throughput.'
        : 'Research throughput resolved from capability and modifiers.',
  })
}

function sourceYieldConsumed(
  definition: ResearchProjectDefinition,
  runtime: ResearchExecutionRuntime,
  sourceId: string,
): number {
  const authored = definition.sources.find((source) => source.sourceId === sourceId)
  if (!authored) return 0
  const remaining = runtime.sourceYieldRemaining[sourceId] ?? authored.analyticalCapacity
  return round4(Math.max(0, authored.analyticalCapacity - remaining))
}

function milestoneEligible(
  definition: ResearchProjectDefinition,
  milestone: ResearchMilestoneDefinition,
  runtime: ResearchExecutionRuntime,
  runtimeConditionsSatisfied: Readonly<Record<string, boolean>> | undefined,
): boolean {
  if (runtime.firedMilestoneIds.includes(milestone.milestoneId)) return false

  for (const prerequisiteId of milestone.eligibility.prerequisiteMilestoneIds ?? []) {
    if (!runtime.firedMilestoneIds.includes(prerequisiteId)) return false
  }

  if (milestone.eligibility.requiresRuntimeConditions) {
    const ok = runtimeConditionsSatisfied?.[milestone.milestoneId] === true
    if (!ok) return false
  }

  if (
    milestone.eligibility.minAnalyticalSpend !== undefined &&
    runtime.analyticalSpend < milestone.eligibility.minAnalyticalSpend
  ) {
    return false
  }

  const requiredSources = milestone.eligibility.requiredSourceIds ?? []
  if (requiredSources.length > 0) {
    if (milestone.eligibility.minAnalyticalSpend !== undefined) {
      if (runtime.analyticalSpend + 1e-6 < milestone.eligibility.minAnalyticalSpend) {
        return false
      }
    }
    for (const sourceId of requiredSources) {
      const authored = definition.sources.find((s) => s.sourceId === sourceId)
      const needed = authored?.analysisCost ?? Math.min(1, authored?.analyticalCapacity ?? 1)
      if (sourceYieldConsumed(definition, runtime, sourceId) + 1e-6 < needed) {
        return false
      }
    }
  }

  return true
}

function mandatoryFindingsComplete(
  definition: ResearchProjectDefinition,
  firedMilestoneIds: readonly string[],
): boolean {
  const firedFindings = new Set<string>()
  for (const milestone of definition.milestones) {
    if (firedMilestoneIds.includes(milestone.milestoneId)) {
      firedFindings.add(milestone.findingId)
    }
  }
  const mandatoryIds = new Set(definition.closureRequirement.mandatoryFindingIds)
  for (const milestone of definition.milestones) {
    if (milestone.findingKind === 'mandatory') {
      mandatoryIds.add(milestone.findingId)
    }
  }
  return [...mandatoryIds].every((id) => firedFindings.has(id))
}

function consumeSourceYield(
  runtime: ResearchExecutionRuntime,
  spendAmount: number,
  sourceIds: readonly string[],
): Readonly<Record<string, number>> {
  if (spendAmount <= 0 || sourceIds.length === 0) {
    return runtime.sourceYieldRemaining
  }
  const next = { ...runtime.sourceYieldRemaining }
  const perSource = spendAmount / sourceIds.length
  for (const sourceId of sourceIds) {
    const current = next[sourceId] ?? 0
    next[sourceId] = round4(Math.max(0, current - perSource))
  }
  return Object.freeze(next)
}

function emitMilestoneOutputKind(kind: MilestoneOutputKind): void {
  switch (kind) {
    case 'reveal_finding':
    case 'reveal_source_reference':
    case 'unlock_method_reference':
    case 'complete_phase':
    case 'request_owner_routed_state_change':
      return
    default: {
      const _exhaustive: never = kind
      throw new Error(`Unhandled milestone output kind: ${String(_exhaustive)}`)
    }
  }
}

/**
 * One deterministic execution tick: throughput, yield consumption, milestone firing.
 */
export function applyResearchExecutionTick(
  input: ResearchExecutionTickInput,
): ResearchExecutionTickResult {
  const { definition, runtime, capability, runtimeConditionsSatisfied } = input

  if (runtime.projectId !== definition.projectId) {
    const throughput = resolveResearchThroughput({ capability, runtime })
    return Object.freeze({
      outcome: 'rejected_malformed',
      progressDelta: 0,
      reasonCodes: sortedUnique(['project_id_mismatch']),
      explanationSummary: 'Runtime projectId does not match definition.',
      updatedRuntime: runtime,
      milestoneOutputs: [],
      throughput,
    })
  }

  const throughput = resolveResearchThroughput({ capability, runtime })
  if (
    throughput.outcome === 'rejected_malformed' ||
    throughput.outcome === 'blocked' ||
    throughput.outcome === 'interrupted'
  ) {
    return Object.freeze({
      outcome: throughput.outcome,
      progressDelta: 0,
      reasonCodes: throughput.reasonCodes,
      explanationSummary: throughput.explanationSummary,
      updatedRuntime: freezeRuntime({
        ...runtime,
        lastReasonCodes: throughput.reasonCodes,
      }),
      milestoneOutputs: [],
      throughput,
    })
  }

  const activeSourceIds =
    capability.sourceInputRefs.length > 0
      ? capability.sourceInputRefs.map((ref) => ref.sourceId)
      : definition.sources.map((s) => s.sourceId)

  const remainingYield = activeSourceIds.reduce(
    (sum, id) => sum + (runtime.sourceYieldRemaining[id] ?? 0),
    0,
  )
  if (activeSourceIds.length > 0 && remainingYield <= 1e-9) {
    return Object.freeze({
      outcome: 'blocked' as const,
      progressDelta: 0,
      reasonCodes: sortedUnique(['source_yield_exhausted', ...throughput.reasonCodes]),
      explanationSummary: 'Project-specific source analytical yield is exhausted.',
      updatedRuntime: freezeRuntime({
        ...runtime,
        lastReasonCodes: sortedUnique(['source_yield_exhausted', ...throughput.reasonCodes]),
      }),
      milestoneOutputs: [],
      throughput,
    })
  }

  const spendIncrement = round4(
    Math.min(
      throughput.progressDelta,
      remainingYield > 0 ? remainingYield : throughput.progressDelta,
    ),
  )
  if (spendIncrement <= 0) {
    return Object.freeze({
      outcome: 'blocked' as const,
      progressDelta: 0,
      reasonCodes: sortedUnique(['zero_progress_delta', ...throughput.reasonCodes]),
      explanationSummary: 'Throughput produced no spendable progress this tick.',
      updatedRuntime: freezeRuntime({
        ...runtime,
        lastReasonCodes: sortedUnique(['zero_progress_delta', ...throughput.reasonCodes]),
      }),
      milestoneOutputs: [],
      throughput,
    })
  }

  let nextRuntime = freezeRuntime({
    ...runtime,
    progressUnits: round4(runtime.progressUnits + spendIncrement),
    analyticalSpend: round4(runtime.analyticalSpend + spendIncrement),
    sourceYieldRemaining: consumeSourceYield(runtime, spendIncrement, activeSourceIds),
    commitmentId: capability.staffTimeCommitmentId ?? runtime.commitmentId,
    lastReasonCodes: throughput.reasonCodes,
  })

  const milestoneOutputs: ResearchMilestoneFiredOutput[] = []
  const newlyFired: string[] = [...nextRuntime.firedMilestoneIds]

  const orderedMilestones = [...definition.milestones].sort((a, b) =>
    a.milestoneId.localeCompare(b.milestoneId),
  )

  for (const milestone of orderedMilestones) {
    if (!milestoneEligible(definition, milestone, nextRuntime, runtimeConditionsSatisfied)) {
      continue
    }
    for (const output of milestone.outputs) {
      emitMilestoneOutputKind(output.kind)
    }
    milestoneOutputs.push(
      Object.freeze({
        milestoneId: milestone.milestoneId,
        findingId: milestone.findingId,
        outputs: Object.freeze([...milestone.outputs]),
      }),
    )
    newlyFired.push(milestone.milestoneId)
    nextRuntime = freezeRuntime({
      ...nextRuntime,
      firedMilestoneIds: sortedUnique(newlyFired),
    })
  }

  let outcome: ResearchExecutionOutcome = throughput.outcome
  if (mandatoryFindingsComplete(definition, nextRuntime.firedMilestoneIds)) {
    outcome = 'completed'
  }

  return Object.freeze({
    outcome,
    progressDelta: throughput.progressDelta,
    reasonCodes: sortedUnique([
      ...throughput.reasonCodes,
      ...(milestoneOutputs.length > 0 ? ['milestones_fired'] : []),
      ...(outcome === 'completed' ? ['project_completed'] : []),
    ]),
    explanationSummary:
      outcome === 'completed'
        ? 'Mandatory findings complete; project execution completed.'
        : throughput.explanationSummary,
    updatedRuntime: nextRuntime,
    milestoneOutputs: Object.freeze(milestoneOutputs),
    throughput,
  })
}

export function interruptResearchExecution(
  runtime: ResearchExecutionRuntime,
): ResearchExecutionRuntime {
  return freezeRuntime({
    ...runtime,
    commitmentId: null,
    interrupted: true,
    lastReasonCodes: sortedUnique(['execution_interrupted']),
  })
}

export function resumeResearchExecution(
  runtime: ResearchExecutionRuntime,
  staffTimeCommitmentId?: string,
): ResearchExecutionRuntime {
  return freezeRuntime({
    ...runtime,
    interrupted: false,
    commitmentId: staffTimeCommitmentId ?? null,
    lastReasonCodes: sortedUnique(['execution_resumed']),
  })
}

export function assertMilestoneOutputKindExhaustive(kind: MilestoneOutputKind): void {
  if (!MILESTONE_OUTPUT_KINDS.includes(kind)) {
    throw new Error(`Unknown milestone output kind: ${kind}`)
  }
}
