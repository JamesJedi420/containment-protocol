import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type {
  BranchContinuityNode,
  BranchCorrectedRecord,
  BranchOfficialClaim,
} from '../domain/branchContinuity'
import { buildBranchContinuityAuditReport } from '../domain/branchContinuityAudit'
import { appendDeveloperLogEvent } from '../domain/developerLog'
import { setGlobalFlag } from '../domain/gameStateManager'
import type { GameState } from '../domain/models'

function createCorrectedRecords(): readonly BranchCorrectedRecord[] {
  return [
    {
      recordId: 'record:map-correction-1',
      supersededClaimId: 'claim:map-wing-east',
      revisionId: 'revision:map-wing-west',
      effectiveFromChoiceId: 'choice:archive-review',
      summary: 'Archive review corrected the east-wing map claim.',
    },
  ]
}

function createOfficialClaims(): readonly BranchOfficialClaim[] {
  return [
    {
      claimId: 'claim:map-wing-east',
      subjectId: 'archive:wing-map',
      summary: 'East wing is the primary escape route.',
    },
  ]
}

function createGameWithArchiveReviewChoice() {
  let game = createStartingState()
  game = setGlobalFlag(game, 'choice:archive-review', true)
  game = appendDeveloperLogEvent(game, {
    type: 'choice.executed',
    summary: 'Choice executed: choice:archive-review',
  })
  return game
}

describe('branchContinuityAudit', () => {
  it('builds an audit report from createStartingState() and a supplied valid node', () => {
    const game = createStartingState()
    const nodes: BranchContinuityNode[] = [{ nodeId: 'node:valid-start' }]

    const report = buildBranchContinuityAuditReport({ game, nodes })

    expect(report.pathFacts.pathId).toMatch(/^run:/)
    expect(report.validation.warnings).toHaveLength(0)
    expect(report.summary.warningCount).toBe(0)
    expect(report.summary.errorCount).toBe(0)
    expect(report.summary.nodeCount).toBe(1)
  })

  it('uses projected path facts from GameState', () => {
    let game = createStartingState()
    game = setGlobalFlag(game, 'event:hall-ambush', true)

    const report = buildBranchContinuityAuditReport({
      game,
      nodes: [],
      projectionOptions: { pathId: 'fixture:projection-check' },
    })

    expect(report.pathFacts.pathId).toBe('fixture:projection-check')
    expect(report.pathFacts.witnessedEventIds).toContain('event:hall-ambush')
    expect(report.validation.pathId).toBe('fixture:projection-check')
  })

  it('surfaces at least one continuity warning from a supplied node', () => {
    const game = createStartingState()
    const report = buildBranchContinuityAuditReport({
      game,
      nodes: [
        {
          nodeId: 'node:needs-holy-symbol',
          requires: { allItemIds: ['item:holy-symbol'] },
        },
      ],
    })

    const warning = report.validation.warnings.find(
      (entry) =>
        entry.nodeId === 'node:needs-holy-symbol' && entry.warningClass === 'missing_item'
    )

    expect(warning).toMatchObject({ severity: 'error', audience: 'simulation' })
    expect(report.summary.warningCount).toBeGreaterThanOrEqual(1)
    expect(report.summary.errorCount).toBeGreaterThanOrEqual(1)
  })

  it('passes corrected records and official claims through to surface stale-claim behavior', () => {
    const game = createGameWithArchiveReviewChoice()
    const correctedRecords = createCorrectedRecords()
    const officialClaims = createOfficialClaims()

    const report = buildBranchContinuityAuditReport({
      game,
      nodes: [
        {
          nodeId: 'node:old-map-briefing',
          citesOfficialClaimIds: ['claim:map-wing-east'],
        },
      ],
      correctedRecords,
      officialClaims,
    })

    const warning = report.validation.warnings.find(
      (entry) =>
        entry.nodeId === 'node:old-map-briefing' && entry.warningClass === 'stale_official_claim'
    )

    expect(warning).toMatchObject({
      severity: 'warning',
      audience: 'institutional',
      relatedIds: ['claim:map-wing-east'],
    })
  })

  it('returns zero warnings and nodeCount 0 for an empty node list', () => {
    const report = buildBranchContinuityAuditReport({
      game: createStartingState(),
      nodes: [],
    })

    expect(report.validation.warnings).toHaveLength(0)
    expect(report.summary.warningCount).toBe(0)
    expect(report.summary.errorCount).toBe(0)
    expect(report.summary.nodeCount).toBe(0)
    expect(report.lines[3]).toBe('Branch continuity: 0 warnings (0 errors)')
  })

  it('does not throw for sparse or partial GameState input', () => {
    const sparse = {
      ...createStartingState(),
      runtimeState: undefined,
      knowledge: undefined,
      agents: undefined,
      campaignLedger: undefined,
      inventory: {},
    } as unknown as GameState

    expect(() =>
      buildBranchContinuityAuditReport({
        game: sparse,
        nodes: [],
      })
    ).not.toThrow()

    const report = buildBranchContinuityAuditReport({ game: sparse, nodes: [] })
    expect(report.pathFacts.pathId).toBe('game:week-1')
    expect(report.summary.nodeCount).toBe(0)
  })

  it('honors projectionOptions.pathId', () => {
    const report = buildBranchContinuityAuditReport({
      game: createStartingState(),
      nodes: [],
      projectionOptions: { pathId: 'fixture:custom-path' },
    })

    expect(report.pathFacts.pathId).toBe('fixture:custom-path')
    expect(report.auditId).toBe('branch-continuity:fixture:custom-path')
    expect(report.lines[1]).toBe('Path: fixture:custom-path')
  })

  it('honors auditId override', () => {
    const report = buildBranchContinuityAuditReport({
      game: createStartingState(),
      nodes: [],
      auditId: 'audit:manual-run-42',
    })

    expect(report.auditId).toBe('audit:manual-run-42')
    expect(report.lines[0]).toBe('Branch continuity audit: audit:manual-run-42')
  })

  it('formats lines with audit id, path id, node count, and warning detail', () => {
    const report = buildBranchContinuityAuditReport({
      game: createStartingState(),
      nodes: [
        {
          nodeId: 'node:needs-holy-symbol',
          requires: { allItemIds: ['item:holy-symbol'] },
        },
      ],
      auditId: 'audit:fixture-lines',
    })

    expect(report.lines[0]).toBe('Branch continuity audit: audit:fixture-lines')
    expect(report.lines[1]).toBe(`Path: ${report.pathFacts.pathId}`)
    expect(report.lines[2]).toBe('Nodes: 1')
    expect(report.lines[3]).toBe('Branch continuity: 1 warnings (1 errors)')
    expect(report.lines[4]).toContain('error · missing_item · node:needs-holy-symbol ·')
  })

  it('produces deterministic output across repeated calls', () => {
    let game = createStartingState()
    game = setGlobalFlag(game, 'event:z-last', true)
    game = setGlobalFlag(game, 'event:a-first', true)

    const nodes: BranchContinuityNode[] = [
      {
        nodeId: 'node:needs-holy-symbol',
        requires: { allItemIds: ['item:holy-symbol'] },
      },
    ]

    const first = buildBranchContinuityAuditReport({ game, nodes })
    const second = buildBranchContinuityAuditReport({ game, nodes })

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(first.lines).toEqual(second.lines)
  })

  it('does not mutate GameState, nodes, corrected records, or official claims', () => {
    const game = createStartingState()
    const nodes: BranchContinuityNode[] = [
      {
        nodeId: 'node:mutate-check',
        requires: { allItemIds: ['item:holy-symbol'] },
      },
    ]
    const correctedRecords = [...createCorrectedRecords()]
    const officialClaims = [...createOfficialClaims()]

    const gameBefore = JSON.stringify(game)
    const nodesBefore = JSON.stringify(nodes)
    const recordsBefore = JSON.stringify(correctedRecords)
    const claimsBefore = JSON.stringify(officialClaims)

    const report = buildBranchContinuityAuditReport({
      game,
      nodes,
      correctedRecords,
      officialClaims,
    })

    expect(JSON.stringify(game)).toBe(gameBefore)
    expect(JSON.stringify(nodes)).toBe(nodesBefore)
    expect(JSON.stringify(correctedRecords)).toBe(recordsBefore)
    expect(JSON.stringify(officialClaims)).toBe(claimsBefore)
    expect(JSON.stringify(report.pathFacts)).toBe(JSON.stringify(report.pathFacts))
  })

  it('stays a pure integration seam without runtime hooks, UI, or authored graph import', async () => {
    const auditModule = await import('../domain/branchContinuityAudit')

    expect(Object.keys(auditModule).sort()).toEqual(['buildBranchContinuityAuditReport'])

    const report = buildBranchContinuityAuditReport({
      game: createStartingState(),
      nodes: [{ nodeId: 'node:explicit-supply-only' }],
    })

    expect(report.summary.nodeCount).toBe(1)
    expect(report.pathFacts).toBeDefined()
    expect(report.validation).toBeDefined()
  })

  it('does not merge hidden simulation truth unless projection opts in', () => {
    let game = createStartingState()
    game = setGlobalFlag(game, 'sim.hidden.event.strahd-betrayal-reveal', true)

    const withoutTruth = buildBranchContinuityAuditReport({
      game,
      nodes: [
        {
          nodeId: 'node:betrayal-dialogue',
          assumesPlayerKnows: { witnessedEventIds: ['event:strahd-betrayal-reveal'] },
        },
      ],
    })

    expect(withoutTruth.pathFacts.simulationTruth).toBeUndefined()
    expect(
      withoutTruth.validation.warnings.find(
        (warning) => warning.warningClass === 'player_awareness_leak'
      )
    ).toBeUndefined()
    expect(
      withoutTruth.validation.warnings.find(
        (warning) => warning.warningClass === 'unwitnessed_event'
      )
    ).toBeDefined()

    const withTruth = buildBranchContinuityAuditReport({
      game,
      nodes: [
        {
          nodeId: 'node:betrayal-dialogue',
          assumesPlayerKnows: { witnessedEventIds: ['event:strahd-betrayal-reveal'] },
        },
      ],
      projectionOptions: { includeSimulationTruth: true },
    })

    expect(withTruth.pathFacts.simulationTruth?.hiddenEventIds).toContain(
      'event:strahd-betrayal-reveal'
    )
    expect(
      withTruth.validation.warnings.find(
        (warning) => warning.warningClass === 'player_awareness_leak'
      )
    ).toBeDefined()
  })
})
