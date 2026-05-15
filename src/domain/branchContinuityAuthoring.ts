/**
 * SPE-1811: map explicit authored continuity assumptions into SPE-1760 `BranchContinuityNode` inputs.
 *
 * Converts caller-supplied authored nodes into validator inputs for projected audits such as
 * `buildBranchContinuityAuditReport`. This module does not import or scan all authored content,
 * does not register CI lint, and does not wire runtime validation, encounters, contracts, reports,
 * developer overlays, or UI.
 *
 * Runtime branch selection (`contentBranching` / `AuthoredBranch`) remains separate from these
 * continuity-audit assumptions until a future integration explicitly connects them.
 *
 * Runtime hardening: authored payloads (for example from JSON) may use `null` for optional fields.
 * Those are treated like omissions; empty arrays and empty record fields are omitted from output.
 * Entries whose `id` is not a non-empty string after trim are omitted (no fallback ids) so `nodeId` is
 * always a valid string for SPE-1760 validation and reporting.
 * Array elements that are not non-null plain objects (e.g. `null`, primitives) are skipped so `.id` is
 * never read on invalid rows.
 */

import type {
  BranchContinuityNode,
  BranchNodeRequirements,
  BranchPlayerKnowledgeAssumption,
} from './branchContinuity'

export interface AuthoredBranchContinuityNode {
  id: string
  label?: string
  continuity?: AuthoredBranchContinuityAssumptions
}

export interface AuthoredBranchContinuityAssumptions {
  requires?: BranchNodeRequirements
  assumesPlayerKnows?: BranchPlayerKnowledgeAssumption
  citesOfficialClaimIds?: readonly string[]
}

/** Each authored row must be a non-null, non-array object before reading fields (JSON arrays may contain nulls). */
function isAuthoredContinuityRecord(value: unknown): value is Partial<AuthoredBranchContinuityNode> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Trims and validates `id` from runtime payloads; returns undefined for non-strings and whitespace-only. */
function normalizeAuthoredNodeId(id: unknown): string | undefined {
  if (typeof id !== 'string') {
    return undefined
  }

  const trimmed = id.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Non-empty copy of string list entries; rejects null, non-arrays, empty arrays, and all-non-string elements. */
function copyNonEmptyStringList(values: unknown): string[] | undefined {
  if (!Array.isArray(values) || values.length === 0) {
    return undefined
  }

  const strings = values.filter((entry): entry is string => typeof entry === 'string')
  if (strings.length === 0) {
    return undefined
  }

  return [...strings]
}

function copyRecordIfNonEmpty(value: unknown): Record<string, unknown> | undefined {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const record = value as Record<string, unknown>
  if (Object.keys(record).length === 0) {
    return undefined
  }

  return { ...record }
}

function slimRequires(requires: BranchNodeRequirements | null | undefined): BranchNodeRequirements | undefined {
  if (requires == null) {
    return undefined
  }

  const out: BranchNodeRequirements = {}

  const anyItemIds = copyNonEmptyStringList(requires.anyItemIds)
  if (anyItemIds !== undefined) {
    out.anyItemIds = anyItemIds
  }

  const allItemIds = copyNonEmptyStringList(requires.allItemIds)
  if (allItemIds !== undefined) {
    out.allItemIds = allItemIds
  }

  const injuryBySubjectId = copyRecordIfNonEmpty(requires.injuryBySubjectId) as
    | BranchNodeRequirements['injuryBySubjectId']
    | undefined
  if (injuryBySubjectId !== undefined) {
    out.injuryBySubjectId = injuryBySubjectId
  }

  const companionStatusById = copyRecordIfNonEmpty(requires.companionStatusById) as
    | BranchNodeRequirements['companionStatusById']
    | undefined
  if (companionStatusById !== undefined) {
    out.companionStatusById = companionStatusById
  }

  const room = requires.roomOfOriginId
  if (typeof room === 'string' && room.trim().length > 0) {
    out.roomOfOriginId = room.trim()
  }

  const witnessedEventIds = copyNonEmptyStringList(requires.witnessedEventIds)
  if (witnessedEventIds !== undefined) {
    out.witnessedEventIds = witnessedEventIds
  }

  const learnedClueIds = copyNonEmptyStringList(requires.learnedClueIds)
  if (learnedClueIds !== undefined) {
    out.learnedClueIds = learnedClueIds
  }

  const priorChoiceIds = copyNonEmptyStringList(requires.priorChoiceIds)
  if (priorChoiceIds !== undefined) {
    out.priorChoiceIds = priorChoiceIds
  }

  const requiredRecordRevisionIds = copyNonEmptyStringList(requires.requiredRecordRevisionIds)
  if (requiredRecordRevisionIds !== undefined) {
    out.requiredRecordRevisionIds = requiredRecordRevisionIds
  }

  return Object.keys(out).length > 0 ? out : undefined
}

function slimAssumesPlayerKnows(
  assumption: BranchPlayerKnowledgeAssumption | null | undefined
): BranchPlayerKnowledgeAssumption | undefined {
  if (assumption == null) {
    return undefined
  }

  const out: BranchPlayerKnowledgeAssumption = {}

  const witnessedEventIds = copyNonEmptyStringList(assumption.witnessedEventIds)
  if (witnessedEventIds !== undefined) {
    out.witnessedEventIds = witnessedEventIds
  }

  const learnedClueIds = copyNonEmptyStringList(assumption.learnedClueIds)
  if (learnedClueIds !== undefined) {
    out.learnedClueIds = learnedClueIds
  }

  return Object.keys(out).length > 0 ? out : undefined
}

function slimAuthoredContinuity(
  continuity: AuthoredBranchContinuityAssumptions
): Pick<BranchContinuityNode, 'requires' | 'assumesPlayerKnows' | 'citesOfficialClaimIds'> {
  const requires = slimRequires(continuity.requires)
  const assumesPlayerKnows = slimAssumesPlayerKnows(continuity.assumesPlayerKnows)
  const citesOfficialClaimIds = copyNonEmptyStringList(continuity.citesOfficialClaimIds)

  const out: Pick<BranchContinuityNode, 'requires' | 'assumesPlayerKnows' | 'citesOfficialClaimIds'> = {}

  if (requires !== undefined) {
    out.requires = requires
  }
  if (assumesPlayerKnows !== undefined) {
    out.assumesPlayerKnows = assumesPlayerKnows
  }
  if (citesOfficialClaimIds !== undefined) {
    out.citesOfficialClaimIds = citesOfficialClaimIds
  }

  return out
}

export function buildBranchContinuityNodesFromAuthoredGraph(
  authoredNodes: readonly AuthoredBranchContinuityNode[]
): BranchContinuityNode[] {
  const result: BranchContinuityNode[] = []

  for (const entry of authoredNodes) {
    if (!isAuthoredContinuityRecord(entry)) {
      continue
    }

    const authored = entry
    const nodeId = normalizeAuthoredNodeId((authored as { id: unknown }).id)
    if (nodeId === undefined) {
      continue
    }

    const node: BranchContinuityNode = {
      nodeId,
    }

    if (typeof authored.label === 'string') {
      node.label = authored.label
    }

    if (authored.continuity != null) {
      const slimmed = slimAuthoredContinuity(authored.continuity)
      if (slimmed.requires !== undefined) {
        node.requires = slimmed.requires
      }
      if (slimmed.assumesPlayerKnows !== undefined) {
        node.assumesPlayerKnows = slimmed.assumesPlayerKnows
      }
      if (slimmed.citesOfficialClaimIds !== undefined) {
        node.citesOfficialClaimIds = slimmed.citesOfficialClaimIds
      }
    }

    result.push(node)
  }

  return result
}
