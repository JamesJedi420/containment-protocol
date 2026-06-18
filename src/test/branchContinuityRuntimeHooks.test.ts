import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildBranchContinuityRuntimeAuditSnapshot, buildBranchContinuityStabilityIssues } from '../domain/branchContinuityRuntimeHooks'
import { appendDeveloperLogEvent } from '../domain/developerLog'
import { setGlobalFlag } from '../domain/gameStateManager'
import { buildDeveloperOverlaySnapshot } from '../features/developer/developerOverlayView'

describe('branchContinuityRuntimeHooks (SPE-2362)', () => {
  it('returns inactive snapshot when no explicit authored nodes are supplied', () => {
    const game = createStartingState()
    const snapshot = buildBranchContinuityRuntimeAuditSnapshot({
      game,
      authoredNodes: [],
    })

    expect(snapshot).toEqual({
      active: false,
      auditId: null,
      pathId: null,
      nodeCount: 0,
      warningCount: 0,
      errorCount: 0,
      reportLines: ['Branch continuity audit: inactive (no explicit supplied nodes)'],
      topWarnings: [],
    })
  })

  it('surfaces audit report via explicit adapter path without mutating GameState', () => {
    let game = createStartingState()
    game = setGlobalFlag(game, 'branch.seed.precisionAlign', 3)
    game = appendDeveloperLogEvent(game, {
      type: 'choice.executed',
      summary: 'Choice executed: choice:authorize-entry',
    })

    const before = JSON.stringify(game)
    const snapshot = buildBranchContinuityRuntimeAuditSnapshot({
      game,
      authoredNodes: [
        {
          id: 'node:runtime-hook-precision-gate',
          continuity: {
            requires: { requiredSeedValues: { 'branch.seed.precisionAlign': 7 } },
          },
        },
      ],
    })

    expect(JSON.stringify(game)).toBe(before)
    expect(snapshot.active).toBe(true)
    expect(snapshot.nodeCount).toBe(1)
    expect(snapshot.errorCount).toBeGreaterThan(0)
    expect(
      snapshot.topWarnings.some(
        (warning) =>
          warning.nodeId === 'node:runtime-hook-precision-gate' &&
          warning.warningClass === 'missing_seed_prerequisite'
      )
    ).toBe(true)
    expect(snapshot.reportLines.some((line) => line.includes('Branch continuity audit:'))).toBe(true)
  })

  it('is deterministic for identical input', () => {
    let game = createStartingState()
    game = setGlobalFlag(game, 'branch.seed.precisionAlign', 3)

    const authoredNodes = [
      {
        id: 'node:runtime-hook-precision-gate',
        continuity: {
          requires: { requiredSeedValues: { 'branch.seed.precisionAlign': 7 } },
        },
      },
    ] as const

    const first = buildBranchContinuityRuntimeAuditSnapshot({ game, authoredNodes })
    const second = buildBranchContinuityRuntimeAuditSnapshot({ game, authoredNodes })

    expect(first).toEqual(second)
  })

  it('exports only the runtime audit snapshot builders', async () => {
    const runtimeHooksModule = await import('../domain/branchContinuityRuntimeHooks')

    expect(Object.keys(runtimeHooksModule).sort()).toEqual([
      'buildBranchContinuityRuntimeAuditSnapshot',
      'buildBranchContinuityStabilityIssues',
    ])
  })

  describe('stability-audit category projection', () => {
    it('returns no stability issues when snapshot is inactive', () => {
      const game = createStartingState()
      const snapshot = buildBranchContinuityRuntimeAuditSnapshot({
        game,
        authoredNodes: [],
      })

      expect(buildBranchContinuityStabilityIssues(snapshot)).toEqual([])
    })

    it('projects active snapshot warnings into branch-continuity stability issues', () => {
      let game = createStartingState()
      game = setGlobalFlag(game, 'branch.seed.precisionAlign', 3)

      const snapshot = buildBranchContinuityRuntimeAuditSnapshot({
        game,
        authoredNodes: [
          {
            id: 'node:stability-category-precision-gate',
            continuity: {
              requires: { requiredSeedValues: { 'branch.seed.precisionAlign': 7 } },
            },
          },
        ],
      })

      const issues = buildBranchContinuityStabilityIssues(snapshot)

      expect(issues).toHaveLength(snapshot.topWarnings.length)
      expect(issues).toEqual(
        snapshot.topWarnings.map((warning) => ({
          id: `branch-continuity.${warning.nodeId}.${warning.warningClass}`,
          category: 'branch-continuity',
          severity: warning.severity === 'error' ? 'error' : 'warning',
          summary: warning.summary,
          details: `node=${warning.nodeId} class=${warning.warningClass}`,
          recoveryActions: [],
        }))
      )
      expect(issues.some((issue) => issue.severity === 'error')).toBe(true)
    })

    it('is deterministic for identical snapshot input', () => {
      let game = createStartingState()
      game = setGlobalFlag(game, 'branch.seed.precisionAlign', 3)

      const snapshot = buildBranchContinuityRuntimeAuditSnapshot({
        game,
        authoredNodes: [
          {
            id: 'node:stability-category-precision-gate',
            continuity: {
              requires: { requiredSeedValues: { 'branch.seed.precisionAlign': 7 } },
            },
          },
        ],
      })

      expect(buildBranchContinuityStabilityIssues(snapshot)).toEqual(
        buildBranchContinuityStabilityIssues(snapshot)
      )
    })
  })

  describe('developer overlay seam', () => {
    it('surfaces inactive audit by default without mutating GameState', () => {
      const game = createStartingState()
      const before = JSON.stringify(game)

      const snapshot = buildDeveloperOverlaySnapshot(game)

      expect(JSON.stringify(game)).toBe(before)
      expect(snapshot.branchContinuityAudit.active).toBe(false)
      expect(snapshot.branchContinuityAudit.reportLines).toEqual([
        'Branch continuity audit: inactive (no explicit supplied nodes)',
      ])
      expect(snapshot.stability.categories).not.toContain('branch-continuity')
      expect(
        snapshot.stability.topIssues.every((issue) => issue.category !== 'branch-continuity')
      ).toBe(true)
    })

    it('surfaces active audit when explicit authored nodes are supplied via overlay options', () => {
      let game = createStartingState()
      game = setGlobalFlag(game, 'branch.seed.precisionAlign', 3)

      const before = JSON.stringify(game)
      const snapshot = buildDeveloperOverlaySnapshot(game, {
        branchContinuityAuthoredNodes: [
          {
            id: 'node:overlay-precision-gate',
            continuity: {
              requires: { requiredSeedValues: { 'branch.seed.precisionAlign': 7 } },
            },
          },
        ],
      })

      expect(JSON.stringify(game)).toBe(before)
      expect(snapshot.branchContinuityAudit.active).toBe(true)
      expect(snapshot.branchContinuityAudit.nodeCount).toBe(1)
      expect(
        snapshot.branchContinuityAudit.topWarnings.some(
          (warning) =>
            warning.nodeId === 'node:overlay-precision-gate' &&
            warning.warningClass === 'missing_seed_prerequisite'
        )
      ).toBe(true)
      expect(snapshot.stability.categories).toContain('branch-continuity')
      expect(
        snapshot.stability.topIssues.some(
          (issue) =>
            issue.category === 'branch-continuity' &&
            issue.id === 'branch-continuity.node:overlay-precision-gate.missing_seed_prerequisite'
        )
      ).toBe(true)
      expect(snapshot.stability.issueCount).toBeGreaterThan(0)
    })
  })
})
