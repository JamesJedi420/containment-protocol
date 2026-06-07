import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  validateBranchContinuity,
  type BranchContinuityNode,
  type BranchCorrectedRecord,
  type BranchOfficialClaim,
  type BranchPathFacts,
} from '../domain/branchContinuity'
import { buildBranchContinuityAuditReport } from '../domain/branchContinuityAudit'
import {
  buildBranchContinuityNodesFromAuthoredGraph,
  type AuthoredBranchContinuityNode,
} from '../domain/branchContinuityAuthoring'
import { appendDeveloperLogEvent } from '../domain/developerLog'
import { setGlobalFlag } from '../domain/gameStateManager'

/**
 * SCP-9995 harvest reconciliation fixtures.
 * Maps batch-9995 themes to shipped warning classes — read-only; no validator changes.
 */
const PATH_ID = 'fixture:harvest-batch9995-institutional-path-a'

function createHarvestPathFacts(overrides: Partial<BranchPathFacts> = {}): BranchPathFacts {
  return {
    pathId: PATH_ID,
    acquiredItemIds: ['item:access-badge'],
    seedValues: { 'branch.seed.precisionAlign': 7 },
    roomOfOriginId: 'room:operations-briefing',
    companionStatusById: { 'npc:field-liaison': 'present' },
    injuryStatusBySubjectId: { 'agent:player': 'none' },
    witnessedEventIds: ['event:perimeter-scan'],
    learnedClueIds: ['clue:maintenance-route'],
    priorChoiceIds: ['choice:authorize-entry'],
    simulationTruth: {
      hiddenEventIds: ['event:internal-telemetry-anomaly'],
      hiddenLearnedClueIds: ['clue:unmodeled-zone-capacity'],
    },
    ...overrides,
  }
}

function createHarvestCorrectedRecords(): readonly BranchCorrectedRecord[] {
  return [
    {
      recordId: 'record:operational-map-correction',
      supersededClaimId: 'claim:wing-east-primary',
      revisionId: 'revision:wing-west-primary',
      effectiveFromChoiceId: 'choice:archive-correction-review',
      summary: 'Archive review corrected the east-wing routing claim.',
    },
  ]
}

function createHarvestOfficialClaims(): readonly BranchOfficialClaim[] {
  return [
    {
      claimId: 'claim:wing-east-primary',
      subjectId: 'archive:facility-map',
      summary: 'East wing remains the primary egress route.',
    },
  ]
}

function findWarning(
  report: ReturnType<typeof validateBranchContinuity>,
  nodeId: string,
  warningClass: string
) {
  return report.warnings.find(
    (warning) => warning.nodeId === nodeId && warning.warningClass === warningClass
  )
}

describe('branchContinuityHarvestReconciliation', () => {
  describe('layered operational truth → player_awareness_leak', () => {
    it('flags dialogue that assumes player knowledge of simulation-only telemetry', () => {
      const report = validateBranchContinuity({
        pathFacts: createHarvestPathFacts(),
        nodes: [
          {
            nodeId: 'node:telemetry-briefing',
            assumesPlayerKnows: {
              witnessedEventIds: ['event:internal-telemetry-anomaly'],
            },
          },
        ],
      })

      const warning = findWarning(report, 'node:telemetry-briefing', 'player_awareness_leak')
      expect(warning).toMatchObject({
        severity: 'warning',
        audience: 'player',
        relatedIds: ['event:internal-telemetry-anomaly'],
      })
      expect(findWarning(report, 'node:telemetry-briefing', 'unwitnessed_event')).toBeUndefined()
    })
  })

  describe('access edge cases → missing_seed_prerequisite', () => {
    it('flags precision-align seed gate when required value is absent', () => {
      const report = validateBranchContinuity({
        pathFacts: createHarvestPathFacts({
          seedValues: { 'branch.seed.precisionAlign': 3 },
        }),
        nodes: [
          {
            nodeId: 'node:precision-gate',
            requires: { requiredSeedValues: { 'branch.seed.precisionAlign': 7 } },
          },
        ],
      })

      const warning = findWarning(report, 'node:precision-gate', 'missing_seed_prerequisite')
      expect(warning).toMatchObject({
        severity: 'error',
        audience: 'simulation',
        relatedIds: ['branch.seed.precisionAlign'],
      })
      expect(warning?.summary).toContain('branch.seed.precisionAlign=7')
    })
  })

  describe('branch contradictions → stale_official_claim', () => {
    it('flags institutional claim citation superseded on the active path', () => {
      const report = validateBranchContinuity({
        pathFacts: createHarvestPathFacts({
          priorChoiceIds: ['choice:authorize-entry', 'choice:archive-correction-review'],
        }),
        nodes: [
          {
            nodeId: 'node:legacy-map-briefing',
            citesOfficialClaimIds: ['claim:wing-east-primary'],
          },
        ],
        correctedRecords: createHarvestCorrectedRecords(),
        officialClaims: createHarvestOfficialClaims(),
      })

      const warning = findWarning(report, 'node:legacy-map-briefing', 'stale_official_claim')
      expect(warning).toMatchObject({
        severity: 'warning',
        audience: 'institutional',
        relatedIds: ['claim:wing-east-primary'],
      })
    })
  })

  describe('valid path regression guard', () => {
    it('returns zero warnings when path facts satisfy node requires and assumptions', () => {
      const report = validateBranchContinuity({
        pathFacts: createHarvestPathFacts(),
        nodes: [
          {
            nodeId: 'node:valid-continuation',
            requires: {
              allItemIds: ['item:access-badge'],
              roomOfOriginId: 'room:operations-briefing',
              witnessedEventIds: ['event:perimeter-scan'],
              learnedClueIds: ['clue:maintenance-route'],
              priorChoiceIds: ['choice:authorize-entry'],
              requiredSeedValues: { 'branch.seed.precisionAlign': 7 },
            },
            assumesPlayerKnows: {
              witnessedEventIds: ['event:perimeter-scan'],
              learnedClueIds: ['clue:maintenance-route'],
            },
          },
        ],
      })

      expect(report.warnings).toHaveLength(0)
      expect(report.summary.warningCount).toBe(0)
      expect(report.summary.errorCount).toBe(0)
    })
  })

  describe('audit report seam (authored adapter → projection → validator)', () => {
    it('surfaces harvest seed gate via buildBranchContinuityAuditReport without mutating GameState', () => {
      let game = createStartingState()
      game = setGlobalFlag(game, 'branch.seed.precisionAlign', 3)
      game = appendDeveloperLogEvent(game, {
        type: 'choice.executed',
        summary: 'Choice executed: choice:authorize-entry',
      })

      const before = JSON.stringify(game)
      const authored: AuthoredBranchContinuityNode[] = [
        {
          id: 'node:audit-precision-gate',
          continuity: {
            requires: { requiredSeedValues: { 'branch.seed.precisionAlign': 7 } },
          },
        },
      ]

      const report = buildBranchContinuityAuditReport({
        game,
        nodes: buildBranchContinuityNodesFromAuthoredGraph(authored),
      })

      expect(JSON.stringify(game)).toBe(before)
      expect(
        report.validation.warnings.some(
          (entry) =>
            entry.nodeId === 'node:audit-precision-gate' &&
            entry.warningClass === 'missing_seed_prerequisite'
        )
      ).toBe(true)
    })
  })

  describe('deterministic ordering', () => {
    it('orders harvest-theme warnings by nodeId then warning class rank', () => {
      const nodes: BranchContinuityNode[] = [
        {
          nodeId: 'node:z-stale-claim',
          citesOfficialClaimIds: ['claim:wing-east-primary'],
        },
        {
          nodeId: 'node:a-awareness-leak',
          assumesPlayerKnows: { witnessedEventIds: ['event:internal-telemetry-anomaly'] },
        },
        {
          nodeId: 'node:m-seed-gate',
          requires: { requiredSeedValues: { 'branch.seed.precisionAlign': 99 } },
        },
      ]

      const report = validateBranchContinuity({
        pathFacts: createHarvestPathFacts({
          priorChoiceIds: ['choice:authorize-entry', 'choice:archive-correction-review'],
        }),
        nodes,
        correctedRecords: createHarvestCorrectedRecords(),
      })

      expect(report.warnings.map((warning) => warning.nodeId)).toEqual([
        'node:a-awareness-leak',
        'node:m-seed-gate',
        'node:z-stale-claim',
      ])
      expect(report.warnings.map((warning) => warning.warningClass)).toEqual([
        'player_awareness_leak',
        'missing_seed_prerequisite',
        'stale_official_claim',
      ])
    })
  })

  it('does not mutate harvest fixture inputs', () => {
    const pathFacts = createHarvestPathFacts()
    const nodes: BranchContinuityNode[] = [
      {
        nodeId: 'node:mutate-check',
        requires: { requiredSeedValues: { 'branch.seed.precisionAlign': 99 } },
      },
    ]
    const correctedRecords = [...createHarvestCorrectedRecords()]

    const pathBefore = JSON.stringify(pathFacts)
    const nodesBefore = JSON.stringify(nodes)
    const recordsBefore = JSON.stringify(correctedRecords)

    validateBranchContinuity({ pathFacts, nodes, correctedRecords })

    expect(JSON.stringify(pathFacts)).toBe(pathBefore)
    expect(JSON.stringify(nodes)).toBe(nodesBefore)
    expect(JSON.stringify(correctedRecords)).toBe(recordsBefore)
  })
})
