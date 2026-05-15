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

function copyStringList(values: readonly string[]) {
  return [...values]
}

function slimRequires(requires: BranchNodeRequirements | undefined): BranchNodeRequirements | undefined {
  if (requires === undefined) {
    return undefined
  }

  const out: BranchNodeRequirements = {}

  if (requires.anyItemIds !== undefined) {
    out.anyItemIds = copyStringList(requires.anyItemIds)
  }
  if (requires.allItemIds !== undefined) {
    out.allItemIds = copyStringList(requires.allItemIds)
  }
  if (requires.injuryBySubjectId !== undefined) {
    out.injuryBySubjectId = { ...requires.injuryBySubjectId }
  }
  if (requires.companionStatusById !== undefined) {
    out.companionStatusById = { ...requires.companionStatusById }
  }
  if (requires.roomOfOriginId !== undefined) {
    out.roomOfOriginId = requires.roomOfOriginId
  }
  if (requires.witnessedEventIds !== undefined) {
    out.witnessedEventIds = copyStringList(requires.witnessedEventIds)
  }
  if (requires.learnedClueIds !== undefined) {
    out.learnedClueIds = copyStringList(requires.learnedClueIds)
  }
  if (requires.priorChoiceIds !== undefined) {
    out.priorChoiceIds = copyStringList(requires.priorChoiceIds)
  }
  if (requires.requiredRecordRevisionIds !== undefined) {
    out.requiredRecordRevisionIds = copyStringList(requires.requiredRecordRevisionIds)
  }

  return Object.keys(out).length > 0 ? out : undefined
}

function slimAssumesPlayerKnows(
  assumption: BranchPlayerKnowledgeAssumption | undefined
): BranchPlayerKnowledgeAssumption | undefined {
  if (assumption === undefined) {
    return undefined
  }

  const out: BranchPlayerKnowledgeAssumption = {}

  if (assumption.witnessedEventIds !== undefined) {
    out.witnessedEventIds = copyStringList(assumption.witnessedEventIds)
  }
  if (assumption.learnedClueIds !== undefined) {
    out.learnedClueIds = copyStringList(assumption.learnedClueIds)
  }

  return Object.keys(out).length > 0 ? out : undefined
}

function slimAuthoredContinuity(
  continuity: AuthoredBranchContinuityAssumptions
): Pick<BranchContinuityNode, 'requires' | 'assumesPlayerKnows' | 'citesOfficialClaimIds'> {
  const requires = slimRequires(continuity.requires)
  const assumesPlayerKnows = slimAssumesPlayerKnows(continuity.assumesPlayerKnows)
  const citesOfficialClaimIds =
    continuity.citesOfficialClaimIds !== undefined
      ? copyStringList(continuity.citesOfficialClaimIds)
      : undefined

  const out: Pick<BranchContinuityNode, 'requires' | 'assumesPlayerKnows' | 'citesOfficialClaimIds'> =
    {}

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
  return authoredNodes.map((authored) => {
    const node: BranchContinuityNode = {
      nodeId: authored.id,
    }

    if (authored.label !== undefined) {
      node.label = authored.label
    }

    if (authored.continuity !== undefined) {
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

    return node
  })
}
