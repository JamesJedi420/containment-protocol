/**
 * SPE-2362: read-only runtime validation hook surfacing for branch continuity audits.
 *
 * Wires explicit supplied authored nodes through the SPE-1811 adapter into
 * SPE-1762 `buildBranchContinuityAuditReport`. Does not import authored graphs,
 * persist branch-path state, mutate `GameState`, or surface player-facing UI.
 */

import type { BranchCorrectedRecord, BranchOfficialClaim } from './branchContinuity'
import { buildBranchContinuityAuditReport } from './branchContinuityAudit'
import {
  buildBranchContinuityNodesFromAuthoredGraph,
  type AuthoredBranchContinuityNode,
} from './branchContinuityAuthoring'
import type { BranchPathProjectionOptions } from './branchContinuityProjection'
import type { GameState } from './models'

export interface BranchContinuityRuntimeAuditInput {
  game: GameState
  authoredNodes: readonly AuthoredBranchContinuityNode[]
  projectionOptions?: BranchPathProjectionOptions
  correctedRecords?: readonly BranchCorrectedRecord[]
  officialClaims?: readonly BranchOfficialClaim[]
  auditId?: string
}

export interface BranchContinuityRuntimeAuditWarningView {
  nodeId: string
  warningClass: string
  severity: string
  summary: string
}

export interface BranchContinuityRuntimeAuditSnapshot {
  /** True when the caller supplied at least one valid authored node id. */
  active: boolean
  auditId: string | null
  pathId: string | null
  nodeCount: number
  warningCount: number
  errorCount: number
  reportLines: readonly string[]
  topWarnings: readonly BranchContinuityRuntimeAuditWarningView[]
}

const INACTIVE_REPORT_LINES = [
  'Branch continuity audit: inactive (no explicit supplied nodes)',
] as const

const TOP_WARNING_LIMIT = 8

export function buildBranchContinuityRuntimeAuditSnapshot(
  input: BranchContinuityRuntimeAuditInput
): BranchContinuityRuntimeAuditSnapshot {
  const nodes = buildBranchContinuityNodesFromAuthoredGraph(input.authoredNodes)

  if (nodes.length === 0) {
    return {
      active: false,
      auditId: null,
      pathId: null,
      nodeCount: 0,
      warningCount: 0,
      errorCount: 0,
      reportLines: INACTIVE_REPORT_LINES,
      topWarnings: [],
    }
  }

  const report = buildBranchContinuityAuditReport({
    game: input.game,
    nodes,
    projectionOptions: input.projectionOptions,
    correctedRecords: input.correctedRecords,
    officialClaims: input.officialClaims,
    auditId: input.auditId,
  })

  return {
    active: true,
    auditId: report.auditId,
    pathId: report.pathFacts.pathId,
    nodeCount: report.summary.nodeCount,
    warningCount: report.summary.warningCount,
    errorCount: report.summary.errorCount,
    reportLines: report.lines,
    topWarnings: report.validation.warnings.slice(0, TOP_WARNING_LIMIT).map((warning) => ({
      nodeId: warning.nodeId,
      warningClass: warning.warningClass,
      severity: warning.severity,
      summary: warning.summary,
    })),
  }
}
