import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type {
  BranchContinuityNode,
  BranchCorrectedRecord,
  BranchNodeRequirements,
  BranchOfficialClaim,
} from '../domain/branchContinuity'
import { buildBranchContinuityAuditReport } from '../domain/branchContinuityAudit'
import {
  buildBranchContinuityNodesFromAuthoredGraph,
  type AuthoredBranchContinuityNode,
} from '../domain/branchContinuityAuthoring'
import { appendDeveloperLogEvent } from '../domain/developerLog'
import { setGlobalFlag } from '../domain/gameStateManager'

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

describe('branchContinuityAuthoring', () => {
  it('returns an empty array for empty authored input', () => {
    expect(buildBranchContinuityNodesFromAuthoredGraph([])).toEqual([])
  })

  it('maps a minimal authored node to a BranchContinuityNode', () => {
    const authored: AuthoredBranchContinuityNode[] = [{ id: 'node:minimal' }]
    expect(buildBranchContinuityNodesFromAuthoredGraph(authored)).toEqual([
      { nodeId: 'node:minimal' },
    ])
  })

  it('preserves label when defined', () => {
    const authored: AuthoredBranchContinuityNode[] = [{ id: 'node:l', label: 'Lab brief' }]
    expect(buildBranchContinuityNodesFromAuthoredGraph(authored)).toEqual([
      { nodeId: 'node:l', label: 'Lab brief' },
    ])
  })

  it('maps a full continuity payload to match a hand-built BranchContinuityNode', () => {
    const requires: BranchNodeRequirements = {
      allItemIds: ['item:alpha'],
      anyItemIds: ['item:beta'],
      witnessedEventIds: ['event:gate'],
      learnedClueIds: ['clue:hint'],
      priorChoiceIds: ['choice:open'],
    }
    const authored: AuthoredBranchContinuityNode[] = [
      {
        id: 'node:full',
        label: 'Full',
        continuity: {
          requires,
          assumesPlayerKnows: { learnedClueIds: ['clue:other'] },
          citesOfficialClaimIds: ['claim:x'],
        },
      },
    ]

    const expected: BranchContinuityNode[] = [
      {
        nodeId: 'node:full',
        label: 'Full',
        requires: {
          allItemIds: ['item:alpha'],
          anyItemIds: ['item:beta'],
          witnessedEventIds: ['event:gate'],
          learnedClueIds: ['clue:hint'],
          priorChoiceIds: ['choice:open'],
        },
        assumesPlayerKnows: { learnedClueIds: ['clue:other'] },
        citesOfficialClaimIds: ['claim:x'],
      },
    ]

    expect(buildBranchContinuityNodesFromAuthoredGraph(authored)).toEqual(expected)
  })

  it('does not throw when continuity is missing or empty', () => {
    const withMissingContinuity: AuthoredBranchContinuityNode[] = [{ id: 'a' }]
    const withEmptyContinuity: AuthoredBranchContinuityNode[] = [{ id: 'b', continuity: {} }]

    expect(() => buildBranchContinuityNodesFromAuthoredGraph(withMissingContinuity)).not.toThrow()
    expect(() => buildBranchContinuityNodesFromAuthoredGraph(withEmptyContinuity)).not.toThrow()
    expect(buildBranchContinuityNodesFromAuthoredGraph(withEmptyContinuity)).toEqual([
      { nodeId: 'b' },
    ])
  })

  it('omits optional nested branches when empty or undefined after slimming', () => {
    const slimEmptyRequires: AuthoredBranchContinuityNode[] = [
      { id: 'node:slim', continuity: { requires: {} } },
    ]
    expect(buildBranchContinuityNodesFromAuthoredGraph(slimEmptyRequires)).toEqual([
      { nodeId: 'node:slim' },
    ])

    const partialRequires: AuthoredBranchContinuityNode[] = [
      {
        id: 'node:partial',
        continuity: {
          requires: { allItemIds: ['item:only'] },
        },
      },
    ]
    expect(buildBranchContinuityNodesFromAuthoredGraph(partialRequires)).toEqual([
      {
        nodeId: 'node:partial',
        requires: { allItemIds: ['item:only'] },
      },
    ])
  })

  it('produces deterministic output and preserves authored order', () => {
    const authored: AuthoredBranchContinuityNode[] = [
      { id: 'node:z' },
      { id: 'node:a', label: 'A' },
    ]
    const first = buildBranchContinuityNodesFromAuthoredGraph(authored)
    const second = buildBranchContinuityNodesFromAuthoredGraph(authored)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(first.map((node) => node.nodeId)).toEqual(['node:z', 'node:a'])
  })

  it('does not mutate authored graph arrays or objects', () => {
    const itemIds = ['item:holy-symbol']
    const authored: AuthoredBranchContinuityNode[] = [
      {
        id: 'node:mutate',
        continuity: { requires: { allItemIds: itemIds } },
      },
    ]
    const beforeAuthored = JSON.stringify(authored)
    const beforeItems = JSON.stringify(itemIds)

    const nodes = buildBranchContinuityNodesFromAuthoredGraph(authored)

    expect(JSON.stringify(authored)).toBe(beforeAuthored)
    expect(JSON.stringify(itemIds)).toBe(beforeItems)
    expect(nodes[0]?.requires?.allItemIds).not.toBe(itemIds)
    itemIds.push('item:other')
    expect(nodes[0]?.requires?.allItemIds).toEqual(['item:holy-symbol'])
  })

  it('drops unknown requires properties instead of forwarding them', () => {
    const requiresWithUnknown = {
      allItemIds: ['item:keep'],
      unknownField: 'strip',
    } as unknown as BranchNodeRequirements
    const [node] = buildBranchContinuityNodesFromAuthoredGraph([
      { id: 'node:req', continuity: { requires: requiresWithUnknown } },
    ])
    expect(node.requires).toEqual({ allItemIds: ['item:keep'] })
    expect(node.requires).not.toHaveProperty('unknownField')
  })

  it('ignores unknown top-level keys on authored nodes at runtime', () => {
    const rogue = {
      id: 'node:rogue',
      extraTopLevel: true,
    } as AuthoredBranchContinuityNode & { extraTopLevel?: boolean }
    const [node] = buildBranchContinuityNodesFromAuthoredGraph([rogue])
    expect(node).toEqual({ nodeId: 'node:rogue' })
    expect(node).not.toHaveProperty('extraTopLevel')
  })

  it('feeds adapter output into buildBranchContinuityAuditReport', () => {
    const game = createStartingState()
    const nodes = buildBranchContinuityNodesFromAuthoredGraph([{ id: 'node:audit-feed' }])

    const report = buildBranchContinuityAuditReport({ game, nodes })

    expect(report.summary.nodeCount).toBe(1)
    expect(report.validation.pathId).toBe(report.pathFacts.pathId)
  })

  it('surfaces missing_item when adapter nodes require inventory absent from the path', () => {
    const game = createStartingState()
    const nodes = buildBranchContinuityNodesFromAuthoredGraph([
      {
        id: 'node:needs-holy-symbol',
        continuity: { requires: { allItemIds: ['item:holy-symbol'] } },
      },
    ])

    const report = buildBranchContinuityAuditReport({ game, nodes })
    const warning = report.validation.warnings.find(
      (entry) =>
        entry.nodeId === 'node:needs-holy-symbol' && entry.warningClass === 'missing_item'
    )

    expect(warning).toMatchObject({ severity: 'error', audience: 'simulation' })
  })

  it('produces zero warnings when requires match starting inventory projection', () => {
    const game = createStartingState()
    expect(game.inventory.electronic_parts).toBeGreaterThan(0)

    const nodes = buildBranchContinuityNodesFromAuthoredGraph([
      {
        id: 'node:stock-check',
        continuity: { requires: { allItemIds: ['electronic_parts'] } },
      },
    ])

    const report = buildBranchContinuityAuditReport({ game, nodes })
    expect(report.validation.warnings).toHaveLength(0)
  })

  it('passes corrected records and official claims for stale_official_claim via adapter', () => {
    const game = createGameWithArchiveReviewChoice()
    const nodes = buildBranchContinuityNodesFromAuthoredGraph([
      {
        id: 'node:old-map-briefing',
        continuity: { citesOfficialClaimIds: ['claim:map-wing-east'] },
      },
    ])

    const report = buildBranchContinuityAuditReport({
      game,
      nodes,
      correctedRecords: createCorrectedRecords(),
      officialClaims: createOfficialClaims(),
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

  it('remains an explicit supplied-node adapter without runtime graph import hooks', async () => {
    const authoringModule = await import('../domain/branchContinuityAuthoring')
    expect(Object.keys(authoringModule).sort()).toEqual(['buildBranchContinuityNodesFromAuthoredGraph'])

    const game = createStartingState()
    const report = buildBranchContinuityAuditReport({
      game,
      nodes: buildBranchContinuityNodesFromAuthoredGraph([{ id: 'node:explicit-only' }]),
    })
    expect(report.summary.nodeCount).toBe(1)
  })

  it('does not mutate GameState when running an audit with adapter output', () => {
    const game = createStartingState()
    const before = JSON.stringify(game)
    buildBranchContinuityAuditReport({
      game,
      nodes: buildBranchContinuityNodesFromAuthoredGraph([
        { id: 'node:g', continuity: { requires: { allItemIds: ['item:ghost'] } } },
      ]),
    })
    expect(JSON.stringify(game)).toBe(before)
  })
})
