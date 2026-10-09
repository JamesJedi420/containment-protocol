/**
 * SPE-3389 — facility core displacement residue.
 *
 * One authored transition on the representative hub `core:facility_hub`:
 * present to corrupted. The residue stays on the returned value. Restore
 * preserves that record and resolves the hub back to ready through SPE-3386.
 * This module does not persist GameState, read lifecycle or installed effects,
 * or complete an investigation.
 */

import {
  readRepresentativeFacilityDependencyGraph,
  validateFacilityDependencyGraph,
  type FacilityDependencyAvailabilityResult,
  type FacilityDependencyGraph,
  type FacilityDependencyRejection,
} from './facilityDependencyGraph'
import {
  resolveExplicitFacilityDependencyAvailability,
  type FacilityDependencyInputRejection,
} from './facilityDependencyInputs'

export const FACILITY_CORE_RESIDUE_COMMANDS = ['corrupt', 'restore'] as const
export type FacilityCoreResidueCommand = (typeof FACILITY_CORE_RESIDUE_COMMANDS)[number]

export const FACILITY_CORE_UNSUPPORTED_CONDITIONS = ['absent', 'displaced', 'stale'] as const
export type FacilityCoreUnsupportedCondition = (typeof FACILITY_CORE_UNSUPPORTED_CONDITIONS)[number]

export const FACILITY_CORE_RESIDUE_REJECTIONS = [
  'malformed_core_transition',
  'unsupported_core_condition',
  'unsupported_core',
  'malformed_residue',
] as const
export type FacilityCoreResidueLocalRejection = (typeof FACILITY_CORE_RESIDUE_REJECTIONS)[number]

export type FacilityCoreResidueRejection =
  FacilityCoreResidueLocalRejection | FacilityDependencyInputRejection | FacilityDependencyRejection

export const FACILITY_CORE_EVIDENCE_KIND = 'diagnostic_residue' as const
export const FACILITY_CORE_CAUSE_CATEGORY = 'corruption' as const

const SYMPTOM_NODE_ID = /^(service|capability):[a-z0-9_]+$/

function readRepresentativeCore(): {
  readonly coreId: 'core:facility_hub'
  readonly symptomNodeIds: ReadonlySet<string>
} {
  const graph = readRepresentativeFacilityDependencyGraph()
  const core = graph.nodes.find((node) => node.role === 'core')
  if (core?.id !== 'core:facility_hub') {
    throw new Error('SPE-3389 representative facility core is not core:facility_hub')
  }
  return {
    coreId: core.id,
    symptomNodeIds: new Set(
      graph.nodes.filter((node) => node.id !== core.id).map((node) => node.id)
    ),
  }
}

const REPRESENTATIVE_CORE = readRepresentativeCore()

export const FACILITY_CORE_NODE_ID = REPRESENTATIVE_CORE.coreId

export interface FacilityCoreResidue {
  readonly coreNodeId: typeof FACILITY_CORE_NODE_ID
  readonly fromCondition: 'present'
  readonly toCondition: 'corrupted'
  readonly causeCategory: typeof FACILITY_CORE_CAUSE_CATEGORY
  readonly provenanceRef: string
  readonly symptomNodeIds: readonly string[]
}

export interface FacilityCoreResidueEvidence {
  readonly evidenceKind: typeof FACILITY_CORE_EVIDENCE_KIND
  readonly coreNodeId: typeof FACILITY_CORE_NODE_ID
  readonly symptomNodeIds: readonly string[]
}

export type FacilityCoreResidueTransition =
  | {
      readonly ok: true
      readonly condition: 'present' | 'corrupted'
      readonly residue: FacilityCoreResidue
      readonly results: readonly FacilityDependencyAvailabilityResult[]
    }
  | {
      readonly ok: false
      readonly rejection: FacilityCoreResidueRejection
    }

export type FacilityCoreResidueEvidenceProjection =
  | { readonly ok: true; readonly evidence: FacilityCoreResidueEvidence }
  | { readonly ok: false; readonly rejection: 'malformed_residue' }

const RESIDUE_KEYS = [
  'causeCategory',
  'coreNodeId',
  'fromCondition',
  'provenanceRef',
  'symptomNodeIds',
  'toCondition',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function compareCodeUnit(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function rejectTransition(rejection: FacilityCoreResidueRejection): FacilityCoreResidueTransition {
  return Object.freeze({ ok: false, rejection })
}

function isUnsupportedCondition(value: unknown): value is FacilityCoreUnsupportedCondition {
  return FACILITY_CORE_UNSUPPORTED_CONDITIONS.some((condition) => condition === value)
}

function isCommand(value: unknown): value is FacilityCoreResidueCommand {
  return FACILITY_CORE_RESIDUE_COMMANDS.some((command) => command === value)
}

function hubAvailability(command: FacilityCoreResidueCommand): 'degraded' | 'ready' {
  switch (command) {
    case 'corrupt':
      return 'degraded'
    case 'restore':
      return 'ready'
    default: {
      const exhaustive: never = command
      return exhaustive
    }
  }
}

function resultingCondition(command: FacilityCoreResidueCommand): 'corrupted' | 'present' {
  switch (command) {
    case 'corrupt':
      return 'corrupted'
    case 'restore':
      return 'present'
    default: {
      const exhaustive: never = command
      return exhaustive
    }
  }
}

function parseSymptomNodeIds(
  value: unknown,
  allowed: ReadonlySet<string> | undefined
): readonly string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined
  const ids: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string' || !SYMPTOM_NODE_ID.test(entry)) return undefined
    if (allowed && !allowed.has(entry)) return undefined
    ids.push(entry)
  }
  const sorted = [...ids].sort(compareCodeUnit)
  for (let index = 0; index < ids.length; index += 1) {
    if (ids[index] !== sorted[index]) return undefined
    if (index > 0 && ids[index] === ids[index - 1]) return undefined
  }
  if (Object.isFrozen(value)) return value as readonly string[]
  return Object.freeze(ids)
}

function parseResidue(
  value: unknown,
  allowed: ReadonlySet<string> | undefined
): FacilityCoreResidue | undefined {
  if (!isRecord(value)) return undefined
  const keys = Object.keys(value).sort(compareCodeUnit)
  if (keys.length !== RESIDUE_KEYS.length) return undefined
  for (let index = 0; index < RESIDUE_KEYS.length; index += 1) {
    if (keys[index] !== RESIDUE_KEYS[index]) return undefined
  }
  if (value.coreNodeId !== FACILITY_CORE_NODE_ID) return undefined
  if (value.fromCondition !== 'present') return undefined
  if (value.toCondition !== 'corrupted') return undefined
  if (value.causeCategory !== FACILITY_CORE_CAUSE_CATEGORY) return undefined
  if (typeof value.provenanceRef !== 'string' || value.provenanceRef.trim().length === 0) {
    return undefined
  }
  const symptomNodeIds = parseSymptomNodeIds(value.symptomNodeIds, allowed)
  if (!symptomNodeIds) return undefined
  if (Object.isFrozen(value) && symptomNodeIds === value.symptomNodeIds) {
    return value as FacilityCoreResidue
  }
  return Object.freeze({
    coreNodeId: FACILITY_CORE_NODE_ID,
    fromCondition: 'present',
    toCondition: 'corrupted',
    causeCategory: FACILITY_CORE_CAUSE_CATEGORY,
    provenanceRef: value.provenanceRef,
    symptomNodeIds,
  })
}

function sameResidue(left: FacilityCoreResidue, right: FacilityCoreResidue): boolean {
  if (left.provenanceRef !== right.provenanceRef) return false
  if (left.symptomNodeIds.length !== right.symptomNodeIds.length) return false
  return left.symptomNodeIds.every((id, index) => id === right.symptomNodeIds[index])
}

function nonCoreNodeIds(graph: FacilityDependencyGraph): ReadonlySet<string> {
  return new Set(
    graph.nodes.filter((node) => node.id !== FACILITY_CORE_NODE_ID).map((node) => node.id)
  )
}

function symptomNodeIds(
  results: readonly FacilityDependencyAvailabilityResult[]
): readonly string[] {
  return Object.freeze(
    results
      .filter(
        (result) =>
          (result.reason === 'upstream_degraded' || result.reason === 'upstream_unavailable') &&
          result.causeChain.includes(FACILITY_CORE_NODE_ID)
      )
      .map((result) => result.nodeId)
      .sort(compareCodeUnit)
  )
}

function packetWithHubAvailability(
  packet: unknown,
  availability: 'degraded' | 'ready',
  provenanceRef: string
): unknown {
  if (!isRecord(packet)) return packet
  const next: Record<string, unknown> = {}
  for (const key of Object.keys(packet)) {
    if (key === FACILITY_CORE_NODE_ID) continue
    next[key] = packet[key]
  }
  next[FACILITY_CORE_NODE_ID] = Object.freeze({
    availability,
    sourceRef: provenanceRef,
  })
  return next
}

interface ParsedCommand {
  readonly command: FacilityCoreResidueCommand
  readonly provenanceRef: string
  readonly residue: unknown
  readonly hasResidue: boolean
}

function parseRequest(value: unknown): ParsedCommand | FacilityCoreResidueLocalRejection {
  if (!isRecord(value)) return 'malformed_core_transition'
  for (const key of Object.keys(value)) {
    if (key !== 'command' && key !== 'provenanceRef' && key !== 'residue') {
      return 'malformed_core_transition'
    }
  }
  if (!hasOwn(value, 'command')) return 'malformed_core_transition'
  if (isUnsupportedCondition(value.command)) return 'unsupported_core_condition'
  if (!isCommand(value.command)) return 'malformed_core_transition'
  if (!hasOwn(value, 'provenanceRef')) return 'malformed_core_transition'
  if (typeof value.provenanceRef !== 'string' || value.provenanceRef.trim().length === 0) {
    return 'malformed_core_transition'
  }
  return {
    command: value.command,
    provenanceRef: value.provenanceRef,
    residue: value.residue,
    hasResidue: hasOwn(value, 'residue'),
  }
}

function buildResidue(provenanceRef: string, symptoms: readonly string[]): FacilityCoreResidue {
  return Object.freeze({
    coreNodeId: FACILITY_CORE_NODE_ID,
    fromCondition: 'present',
    toCondition: 'corrupted',
    causeCategory: FACILITY_CORE_CAUSE_CATEGORY,
    provenanceRef,
    symptomNodeIds: symptoms,
  })
}

/**
 * Apply the one authored hub transition, or restore it.
 * `corrupt` writes hub `degraded` and emits one residue. `restore` writes hub
 * `ready` and returns the same residue. `absent`, `displaced`, and `stale`
 * reject before resolution. A rejected graph or source packet returns that
 * existing rejection and no residue.
 */
export function applyFacilityCoreResidueTransition(
  graph: unknown,
  packet: unknown,
  request: unknown
): FacilityCoreResidueTransition {
  const parsed = parseRequest(request)
  if (typeof parsed === 'string') return rejectTransition(parsed)

  const validated = validateFacilityDependencyGraph(graph)
  if (!validated.ok) return validated
  const core = validated.graph.nodes.find((node) => node.role === 'core')
  if (core?.id !== FACILITY_CORE_NODE_ID) return rejectTransition('unsupported_core')

  const allowed = nonCoreNodeIds(validated.graph)
  let supplied: FacilityCoreResidue | undefined
  if (parsed.command === 'restore' || parsed.hasResidue) {
    if (!parsed.hasResidue) return rejectTransition('malformed_residue')
    supplied = parseResidue(parsed.residue, allowed)
    if (!supplied || supplied.provenanceRef !== parsed.provenanceRef) {
      return rejectTransition('malformed_residue')
    }
  }

  const resolved = resolveExplicitFacilityDependencyAvailability(
    validated.graph,
    packetWithHubAvailability(packet, hubAvailability(parsed.command), parsed.provenanceRef)
  )
  if (!resolved.ok) return resolved

  if (parsed.command === 'restore') {
    if (!supplied) return rejectTransition('malformed_residue')
    return Object.freeze({
      ok: true,
      condition: resultingCondition(parsed.command),
      residue: supplied,
      results: resolved.results,
    })
  }

  const symptoms = symptomNodeIds(resolved.results)
  if (symptoms.length === 0) return rejectTransition('malformed_residue')
  const canonical = buildResidue(parsed.provenanceRef, symptoms)
  if (supplied) {
    if (!sameResidue(supplied, canonical)) return rejectTransition('malformed_residue')
    return Object.freeze({
      ok: true,
      condition: resultingCondition(parsed.command),
      residue: supplied,
      results: resolved.results,
    })
  }

  return Object.freeze({
    ok: true,
    condition: resultingCondition(parsed.command),
    residue: canonical,
    results: resolved.results,
  })
}

/**
 * Read-only evidence candidate. Copies the core id and symptom ids only.
 * Cause, provenance, prior condition, and investigation fields stay off this object.
 */
export function projectFacilityCoreResidueEvidence(
  residue: unknown
): FacilityCoreResidueEvidenceProjection {
  const parsed = parseResidue(residue, REPRESENTATIVE_CORE.symptomNodeIds)
  if (!parsed) return Object.freeze({ ok: false, rejection: 'malformed_residue' })
  return Object.freeze({
    ok: true,
    evidence: Object.freeze({
      evidenceKind: FACILITY_CORE_EVIDENCE_KIND,
      coreNodeId: parsed.coreNodeId,
      symptomNodeIds: parsed.symptomNodeIds,
    }),
  })
}
