/**
 * SPE-1762: projected branch continuity audit report for supplied authored nodes.
 *
 * Combines SPE-1761 `projectBranchPathFactsFromGameState` with SPE-1760
 * `validateBranchContinuity` and `formatBranchContinuityReportLines` for a
 * deterministic read-only developer/audit report.
 *
 * Does not run runtime story validation, import authored graphs automatically,
 * persist branch-path state, or surface player-facing UI.
 */

import type {
  BranchContinuityNode,
  BranchContinuityValidationReport,
  BranchCorrectedRecord,
  BranchOfficialClaim,
  BranchPathFacts,
} from './branchContinuity'
import {
  formatBranchContinuityReportLines,
  validateBranchContinuity,
} from './branchContinuity'
import {
  projectBranchPathFactsFromGameState,
  type BranchPathProjectionOptions,
} from './branchContinuityProjection'
import type { GameState } from './models'

export interface BranchContinuityAuditInput {
  game: GameState
  nodes: readonly BranchContinuityNode[]
  projectionOptions?: BranchPathProjectionOptions
  correctedRecords?: readonly BranchCorrectedRecord[]
  officialClaims?: readonly BranchOfficialClaim[]
  auditId?: string
}

export interface BranchContinuityAuditReport {
  auditId: string
  pathFacts: BranchPathFacts
  validation: BranchContinuityValidationReport
  lines: readonly string[]
  summary: {
    warningCount: number
    errorCount: number
    nodeCount: number
  }
}

function resolveAuditId(pathFacts: BranchPathFacts, auditId: string | undefined): string {
  const normalized = typeof auditId === 'string' ? auditId.trim() : ''
  if (normalized.length > 0) {
    return normalized
  }

  return `branch-continuity:${pathFacts.pathId}`
}

export function buildBranchContinuityAuditReport(
  input: BranchContinuityAuditInput
): BranchContinuityAuditReport {
  const pathFacts = projectBranchPathFactsFromGameState(input.game, input.projectionOptions)
  const nodes = input.nodes

  const validation = validateBranchContinuity({
    pathFacts,
    nodes,
    correctedRecords: input.correctedRecords,
    officialClaims: input.officialClaims,
  })

  const auditId = resolveAuditId(pathFacts, input.auditId)
  const nodeCount = nodes.length

  const lines = [
    `Branch continuity audit: ${auditId}`,
    `Path: ${pathFacts.pathId}`,
    `Nodes: ${nodeCount}`,
    ...formatBranchContinuityReportLines(validation),
  ]

  return {
    auditId,
    pathFacts,
    validation,
    lines,
    summary: {
      warningCount: validation.summary.warningCount,
      errorCount: validation.summary.errorCount,
      nodeCount,
    },
  }
}
