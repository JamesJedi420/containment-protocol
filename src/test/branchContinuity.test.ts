import { describe, expect, it } from 'vitest'
import {
  formatBranchContinuityReportLines,
  validateBranchContinuity,
  type BranchContinuityNode,
  type BranchContinuityValidationInput,
  type BranchCorrectedRecord,
  type BranchPathFacts,
} from '../domain/branchContinuity'

const PATH_ID = 'fixture:ravenloft-escape-path-a'

function createRavenloftPathFacts(
  overrides: Partial<BranchPathFacts> = {}
): BranchPathFacts {
  return {
    pathId: PATH_ID,
    acquiredItemIds: ['item:silver-key'],
    seedValues: { doorCode: 417 },
    roomOfOriginId: 'room:great-hall',
    companionStatusById: { 'npc:irena': 'present' },
    injuryStatusBySubjectId: { 'agent:player': 'none' },
    witnessedEventIds: ['event:hall-ambush'],
    learnedClueIds: ['clue:secret-passage'],
    priorChoiceIds: ['choice:barricade-door'],
    simulationTruth: {
      hiddenEventIds: ['event:strahd-betrayal-reveal'],
      hiddenLearnedClueIds: ['clue:strahd-motive'],
    },
    ...overrides,
  }
}

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

function validateNodes(
  nodes: readonly BranchContinuityNode[],
  pathFacts: BranchPathFacts = createRavenloftPathFacts(),
  correctedRecords: readonly BranchCorrectedRecord[] = createCorrectedRecords()
) {
  const input: BranchContinuityValidationInput = {
    pathFacts,
    nodes,
    correctedRecords,
  }
  return validateBranchContinuity(input)
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

describe('branchContinuity', () => {
  it('flags a missing item assumed by a node', () => {
    const report = validateNodes([
      {
        nodeId: 'node:needs-holy-symbol',
        requires: { allItemIds: ['item:holy-symbol'] },
      },
    ])

    const warning = findWarning(report, 'node:needs-holy-symbol', 'missing_item')
    expect(warning).toMatchObject({
      severity: 'error',
      audience: 'simulation',
      relatedIds: ['item:holy-symbol'],
    })
    expect(report.summary.byClass.missing_item).toBe(1)
  })

  it('flags wounded requirement when the path records healed instead of wounded', () => {
    const report = validateNodes(
      [
        {
          nodeId: 'node:needs-active-wound',
          requires: { injuryBySubjectId: { 'agent:player': 'wounded' } },
        },
      ],
      createRavenloftPathFacts({
        injuryStatusBySubjectId: { 'agent:player': 'healed' },
      })
    )

    const warning = findWarning(report, 'node:needs-active-wound', 'injury_contradiction')
    expect(warning).toMatchObject({
      severity: 'error',
      audience: 'simulation',
      relatedIds: ['agent:player'],
    })
    expect(warning?.id).toContain('wounded-mismatch:agent:player')
  })

  it('flags healed-never-inflicted injury contradiction', () => {
    const report = validateNodes([
      {
        nodeId: 'node:healed-dialogue',
        requires: { injuryBySubjectId: { 'agent:player': 'healed' } },
      },
    ])

    const warning = findWarning(report, 'node:healed-dialogue', 'injury_contradiction')
    expect(warning).toMatchObject({
      severity: 'error',
      audience: 'simulation',
      relatedIds: ['agent:player'],
    })
    expect(warning?.id).toContain('healed-never-inflicted:agent:player')
  })

  it('flags unwitnessed event player-awareness assumptions', () => {
    const report = validateNodes([
      {
        nodeId: 'node:balcony-reference',
        assumesPlayerKnows: { witnessedEventIds: ['event:balcony-fall'] },
      },
    ])

    const warning = findWarning(report, 'node:balcony-reference', 'unwitnessed_event')
    expect(warning).toMatchObject({
      severity: 'warning',
      audience: 'player',
      relatedIds: ['event:balcony-fall'],
    })
  })

  it('flags unlearned clue player-awareness assumptions', () => {
    const report = validateNodes([
      {
        nodeId: 'node:rival-motive',
        assumesPlayerKnows: { learnedClueIds: ['clue:rival-motive'] },
      },
    ])

    const warning = findWarning(report, 'node:rival-motive', 'unlearned_clue')
    expect(warning).toMatchObject({
      severity: 'warning',
      audience: 'player',
      relatedIds: ['clue:rival-motive'],
    })
  })

  it('flags impossible branch origin', () => {
    const report = validateNodes([
      {
        nodeId: 'node:chapel-escape',
        requires: { roomOfOriginId: 'room:chapel-crypt' },
      },
    ])

    const warning = findWarning(report, 'node:chapel-escape', 'impossible_origin')
    expect(warning).toMatchObject({
      severity: 'error',
      audience: 'simulation',
    })
  })

  it('flags stale official claims only when the correction is active on the path', () => {
    const report = validateNodes(
      [
        {
          nodeId: 'node:old-map-briefing',
          citesOfficialClaimIds: ['claim:map-wing-east'],
        },
      ],
      createRavenloftPathFacts({
        priorChoiceIds: ['choice:barricade-door', 'choice:archive-review'],
      })
    )

    const warning = findWarning(report, 'node:old-map-briefing', 'stale_official_claim')
    expect(warning).toMatchObject({
      severity: 'warning',
      audience: 'institutional',
      relatedIds: ['claim:map-wing-east'],
    })
  })

  it('does not flag stale official claims when the correction is inactive on the path', () => {
    const report = validateNodes([
      {
        nodeId: 'node:old-map-briefing',
        citesOfficialClaimIds: ['claim:map-wing-east'],
      },
    ])

    expect(findWarning(report, 'node:old-map-briefing', 'stale_official_claim')).toBeUndefined()
  })

  it('does not satisfy required revisions from inactive corrections', () => {
    const report = validateNodes([
      {
        nodeId: 'node:needs-map-revision',
        requires: { requiredRecordRevisionIds: ['revision:map-wing-west'] },
      },
    ])

    expect(findWarning(report, 'node:needs-map-revision', 'missing_record_revision')).toMatchObject({
      severity: 'error',
      relatedIds: ['revision:map-wing-west'],
    })
  })

  it('satisfies required revisions from active corrections on the path', () => {
    const report = validateNodes(
      [
        {
          nodeId: 'node:needs-map-revision',
          requires: { requiredRecordRevisionIds: ['revision:map-wing-west'] },
        },
      ],
      createRavenloftPathFacts({
        priorChoiceIds: ['choice:barricade-door', 'choice:archive-review'],
      })
    )

    expect(findWarning(report, 'node:needs-map-revision', 'missing_record_revision')).toBeUndefined()
    expect(report.warnings).toHaveLength(0)
  })

  it('flags companion status mismatch with a dedicated warning class', () => {
    const report = validateNodes([
      {
        nodeId: 'node:companion-lost',
        requires: { companionStatusById: { 'npc:irena': 'lost' } },
      },
    ])

    const warning = findWarning(report, 'node:companion-lost', 'companion_status_mismatch')
    expect(warning).toMatchObject({
      severity: 'error',
      audience: 'simulation',
      relatedIds: ['npc:irena'],
    })
    expect(findWarning(report, 'node:companion-lost', 'missing_item')).toBeUndefined()
  })

  it('treats omitted companions as absent when absent is required', () => {
    const report = validateNodes(
      [
        {
          nodeId: 'node:companion-absent',
          requires: { companionStatusById: { 'npc:missing': 'absent' } },
        },
      ],
      createRavenloftPathFacts({
        companionStatusById: { 'npc:irena': 'present' },
      })
    )

    expect(findWarning(report, 'node:companion-absent', 'companion_status_mismatch')).toBeUndefined()
    expect(report.warnings).toHaveLength(0)
  })

  it('flags missing prior choices with a dedicated warning class', () => {
    const report = validateNodes([
      {
        nodeId: 'node:needs-archive-choice',
        requires: { priorChoiceIds: ['choice:archive-review'] },
      },
    ])

    const warning = findWarning(report, 'node:needs-archive-choice', 'missing_prior_choice')
    expect(warning).toMatchObject({
      severity: 'error',
      audience: 'simulation',
      relatedIds: ['choice:archive-review'],
    })
    expect(findWarning(report, 'node:needs-archive-choice', 'unwitnessed_event')).toBeUndefined()
  })

  it('flags missing corrected-record revision prerequisites', () => {
    const report = validateNodes([
      {
        nodeId: 'node:needs-archive-correction',
        requires: { requiredRecordRevisionIds: ['revision:ally-status-cleared'] },
      },
    ])

    const warning = findWarning(report, 'node:needs-archive-correction', 'missing_record_revision')
    expect(warning).toMatchObject({
      severity: 'error',
      audience: 'institutional',
      relatedIds: ['revision:ally-status-cleared'],
    })
  })

  it('flags player awareness leak when simulation truth is not player-known', () => {
    const report = validateNodes([
      {
        nodeId: 'node:betrayal-dialogue',
        assumesPlayerKnows: { witnessedEventIds: ['event:strahd-betrayal-reveal'] },
      },
    ])

    const warning = findWarning(report, 'node:betrayal-dialogue', 'player_awareness_leak')
    expect(warning).toMatchObject({
      severity: 'warning',
      audience: 'player',
      relatedIds: ['event:strahd-betrayal-reveal'],
    })
    expect(findWarning(report, 'node:betrayal-dialogue', 'unwitnessed_event')).toBeUndefined()
  })

  it('returns no warnings for a valid node on the fixture path', () => {
    const report = validateNodes([
      {
        nodeId: 'node:valid-continuation',
        requires: {
          allItemIds: ['item:silver-key'],
          roomOfOriginId: 'room:great-hall',
          witnessedEventIds: ['event:hall-ambush'],
          learnedClueIds: ['clue:secret-passage'],
          priorChoiceIds: ['choice:barricade-door'],
        },
        assumesPlayerKnows: {
          witnessedEventIds: ['event:hall-ambush'],
          learnedClueIds: ['clue:secret-passage'],
        },
      },
    ])

    expect(report.warnings).toHaveLength(0)
    expect(report.summary.warningCount).toBe(0)
    expect(report.summary.errorCount).toBe(0)
  })

  it('keeps warning IDs and ordering deterministic across runs', () => {
    const nodes: BranchContinuityNode[] = [
      {
        nodeId: 'node:z-last',
        requires: { allItemIds: ['item:missing-z'] },
      },
      {
        nodeId: 'node:a-first',
        assumesPlayerKnows: { learnedClueIds: ['clue:missing-a'] },
      },
      {
        nodeId: 'node:a-first',
        assumesPlayerKnows: { witnessedEventIds: ['event:missing-b'] },
      },
    ]

    const first = validateNodes(nodes)
    const second = validateNodes(nodes)

    expect(first.warnings.map((warning) => warning.id)).toEqual(
      second.warnings.map((warning) => warning.id)
    )
    expect(first.warnings.map((warning) => warning.nodeId)).toEqual([
      'node:a-first',
      'node:a-first',
      'node:z-last',
    ])
    expect(first.warnings.map((warning) => warning.warningClass)).toEqual([
      'unlearned_clue',
      'unwitnessed_event',
      'missing_item',
    ])
  })

  it('formats compact stable report lines', () => {
    const report = validateNodes([
      {
        nodeId: 'node:needs-holy-symbol',
        requires: { allItemIds: ['item:holy-symbol'] },
      },
    ])
    const lines = formatBranchContinuityReportLines(report)

    expect(lines[0]).toBe('Branch continuity: 1 warnings (1 errors)')
    expect(lines[1]).toContain('error · missing_item · node:needs-holy-symbol ·')
  })

  it('does not mutate input fixtures', () => {
    const pathFacts = createRavenloftPathFacts()
    const nodes: BranchContinuityNode[] = [
      {
        nodeId: 'node:mutate-check',
        requires: { allItemIds: ['item:holy-symbol'] },
      },
    ]
    const correctedRecords = [...createCorrectedRecords()]

    const pathBefore = JSON.stringify(pathFacts)
    const nodesBefore = JSON.stringify(nodes)
    const recordsBefore = JSON.stringify(correctedRecords)

    const report = validateBranchContinuity({
      pathFacts,
      nodes,
      correctedRecords,
    })
    formatBranchContinuityReportLines(report)

    expect(JSON.stringify(pathFacts)).toBe(pathBefore)
    expect(JSON.stringify(nodes)).toBe(nodesBefore)
    expect(JSON.stringify(correctedRecords)).toBe(recordsBefore)
  })
})
