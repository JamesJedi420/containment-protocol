import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  evaluateUncertainWorldStateFacts,
  resolveUncertainWorldStateCheck,
  type UncertainWorldStateEvidence,
  type UncertainWorldStateFact,
} from '../domain/uncertainWorldState'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function baseFact(overrides: Partial<UncertainWorldStateFact>): UncertainWorldStateFact {
  return {
    factId: 'fact:room-1',
    subjectId: 'subject:room-1',
    factKind: 'unseen_room_state',
    status: 'unresolved',
    question: 'What is the operational state of the unseen room?',
    possibleStates: ['clear', 'occupied', 'sealed'],
    appliedEvidenceIds: [],
    ...overrides,
  }
}

function ev(
  overrides: Partial<UncertainWorldStateEvidence> & Pick<UncertainWorldStateEvidence, 'evidenceId'>
): UncertainWorldStateEvidence {
  return {
    factId: 'fact:room-1',
    subjectId: 'subject:room-1',
    supportsState: 'clear',
    strength: 'weak',
    source: 'observation',
    ...overrides,
  }
}

describe('uncertainWorldState (SPE-1317)', () => {
  it('empty facts/evidence returns empty report and no throw', () => {
    const report = evaluateUncertainWorldStateFacts({ facts: [], evidence: [] })
    expect(report.facts).toEqual([])
    expect(report.resolutions).toEqual([])
    expect(report.summary).toEqual({ unresolvedCount: 0, resolvedCount: 0, supersededCount: 0 })
  })

  it('unresolved fact remains unresolved with no evidence', () => {
    const fact = baseFact({})
    const report = evaluateUncertainWorldStateFacts({ facts: [fact], evidence: [] })
    expect(report.facts[0]?.status).toBe('unresolved')
    expect(report.resolutions[0]?.note).toContain('No applicable evidence')
  })

  it('ignores evidence with wrong factId', () => {
    const fact = baseFact({})
    const evidence = [ev({ evidenceId: 'ev:1', factId: 'fact:other' })]
    const report = evaluateUncertainWorldStateFacts({ facts: [fact], evidence })
    expect(report.facts[0]?.status).toBe('unresolved')
    expect(report.resolutions[0]?.ignoredEvidenceIds).toEqual([])
  })

  it('ignores evidence with wrong subjectId', () => {
    const fact = baseFact({})
    const evidence = [ev({ evidenceId: 'ev:1', subjectId: 'subject:other', supportsState: 'clear' })]
    const report = evaluateUncertainWorldStateFacts({ facts: [fact], evidence })
    expect(report.facts[0]?.currentBestState).toBeUndefined()
    expect(report.resolutions[0]?.ignoredEvidenceIds).toContain('ev:1')
  })

  it('ignores supportsState outside possibleStates', () => {
    const fact = baseFact({})
    const evidence = [ev({ evidenceId: 'ev:bad', supportsState: 'flooded' })]
    const report = evaluateUncertainWorldStateFacts({ facts: [fact], evidence })
    expect(report.resolutions[0]?.ignoredEvidenceIds).toContain('ev:bad')
    expect(report.facts[0]?.status).toBe('unresolved')
  })

  it('weak evidence updates currentBestState without resolving', () => {
    const fact = baseFact({})
    const evidence = [ev({ evidenceId: 'ev:w', supportsState: 'occupied', strength: 'weak' })]
    const report = evaluateUncertainWorldStateFacts({ facts: [fact], evidence })
    expect(report.facts[0]?.currentBestState).toBe('occupied')
    expect(report.facts[0]?.status).toBe('unresolved')
  })

  it('moderate evidence updates currentBestState without resolving', () => {
    const fact = baseFact({})
    const evidence = [ev({ evidenceId: 'ev:m', supportsState: 'sealed', strength: 'moderate' })]
    const report = evaluateUncertainWorldStateFacts({ facts: [fact], evidence })
    expect(report.facts[0]?.currentBestState).toBe('sealed')
    expect(report.facts[0]?.status).toBe('unresolved')
  })

  it('strong evidence updates currentBestState without resolving', () => {
    const fact = baseFact({})
    const evidence = [ev({ evidenceId: 'ev:s', supportsState: 'clear', strength: 'strong' })]
    const report = evaluateUncertainWorldStateFacts({ facts: [fact], evidence })
    expect(report.facts[0]?.currentBestState).toBe('clear')
    expect(report.facts[0]?.status).toBe('unresolved')
  })

  it('decisive evidence resolves the fact', () => {
    const fact = baseFact({})
    const evidence = [ev({ evidenceId: 'ev:d', supportsState: 'sealed', strength: 'decisive' })]
    const report = evaluateUncertainWorldStateFacts({ facts: [fact], evidence })
    expect(report.facts[0]?.status).toBe('resolved')
    expect(report.facts[0]?.resolvedState).toBe('sealed')
    expect(report.facts[0]?.currentBestState).toBe('sealed')
  })

  it('context.week sets resolvedAtWeek when resolving', () => {
    const fact = baseFact({})
    const evidence = [ev({ evidenceId: 'ev:d', supportsState: 'clear', strength: 'decisive' })]
    const report = evaluateUncertainWorldStateFacts({
      facts: [fact],
      evidence,
      context: { week: 12 },
    })
    expect(report.facts[0]?.resolvedAtWeek).toBe(12)
  })

  it('check minimumStrength filters weaker evidence', () => {
    const fact = baseFact({ factId: 'fact:x' })
    const evidence = [
      {
        evidenceId: 'ev:w',
        factId: 'fact:x',
        subjectId: 'subject:room-1',
        supportsState: 'clear',
        strength: 'weak' as const,
        source: 'report' as const,
      },
    ]
    const report = evaluateUncertainWorldStateFacts({
      facts: [fact],
      evidence,
      checks: [
        {
          checkId: 'check:audit',
          factId: 'fact:x',
          trigger: 'operator_review',
          minimumStrength: 'strong',
        },
      ],
    })
    expect(report.facts[0]?.status).toBe('unresolved')
    expect(report.facts[0]?.currentBestState).toBeUndefined()
    expect(report.resolutions[0]?.ignoredEvidenceIds).toContain('ev:w')
  })

  it('preserves check trigger (and id) in resolution note', () => {
    const fact = baseFact({ factId: 'fact:x' })
    const evidence = [
      {
        evidenceId: 'ev:s',
        factId: 'fact:x',
        subjectId: 'subject:room-1',
        supportsState: 'clear',
        strength: 'strong' as const,
        source: 'report' as const,
      },
    ]
    const report = evaluateUncertainWorldStateFacts({
      facts: [fact],
      evidence,
      checks: [
        {
          checkId: 'check:map',
          factId: 'fact:x',
          trigger: 'map_update',
          minimumStrength: 'moderate',
        },
      ],
    })
    expect(report.resolutions[0]?.note).toContain('check:map')
    expect(report.resolutions[0]?.note).toContain('map_update')
  })

  it('ignores later conflicting decisive evidence when allowSupersession is false', () => {
    const fact = baseFact({
      status: 'resolved',
      resolvedState: 'clear',
      currentBestState: 'clear',
      allowSupersession: false,
    })
    const evidence = [ev({ evidenceId: 'ev:flip', supportsState: 'occupied', strength: 'decisive' })]
    const report = evaluateUncertainWorldStateFacts({ facts: [fact], evidence })
    expect(report.facts[0]?.resolvedState).toBe('clear')
    expect(report.resolutions[0]?.ignoredEvidenceIds).toContain('ev:flip')
  })

  it('supersedes prior resolution when allowSupersession is true', () => {
    const fact = baseFact({
      status: 'resolved',
      resolvedState: 'clear',
      currentBestState: 'clear',
      allowSupersession: true,
    })
    const evidence = [ev({ evidenceId: 'ev:flip', supportsState: 'occupied', strength: 'decisive' })]
    const report = evaluateUncertainWorldStateFacts({ facts: [fact], evidence })
    expect(report.facts[0]?.resolvedState).toBe('occupied')
    expect(report.facts[0]?.status).toBe('resolved')
    expect(report.resolutions[0]?.note.toLowerCase()).toContain('supersed')
    expect(report.resolutions[0]?.appliedEvidenceIds).toContain('ev:flip')
  })

  it('applies evidence in deterministic order (strength then evidenceId)', () => {
    const fact = baseFact({})
    const evidence: UncertainWorldStateEvidence[] = [
      ev({ evidenceId: 'ev:b', supportsState: 'sealed', strength: 'weak' }),
      ev({ evidenceId: 'ev:a', supportsState: 'clear', strength: 'weak' }),
      ev({ evidenceId: 'ev:c', supportsState: 'occupied', strength: 'moderate' }),
    ]
    const report = evaluateUncertainWorldStateFacts({ facts: [fact], evidence })
    expect(report.facts[0]?.currentBestState).toBe('occupied')
  })

  it('outputs facts sorted by factId', () => {
    const f1 = baseFact({ factId: 'fact:z' })
    const f2 = baseFact({ factId: 'fact:a' })
    const report = evaluateUncertainWorldStateFacts({ facts: [f1, f2], evidence: [] })
    expect(report.facts.map((f) => f.factId)).toEqual(['fact:a', 'fact:z'])
  })

  it('deduplicates appliedEvidenceIds', () => {
    const fact = baseFact({ appliedEvidenceIds: ['ev:old'] })
    const evidence = [
      ev({ evidenceId: 'ev:old', supportsState: 'clear', strength: 'weak' }),
      ev({ evidenceId: 'ev:old', supportsState: 'occupied', strength: 'moderate' }),
    ]
    const report = evaluateUncertainWorldStateFacts({ facts: [fact], evidence })
    const applied = report.facts[0]?.appliedEvidenceIds ?? []
    expect(applied.filter((id) => id === 'ev:old').length).toBe(1)
  })

  it('does not mutate input fact, evidence, checks, or nested arrays', () => {
    const fact = baseFact({
      possibleStates: ['a', 'b'],
      appliedEvidenceIds: ['x'],
    })
    const ps = fact.possibleStates
    const applied = fact.appliedEvidenceIds
    const evidence = [ev({ evidenceId: 'e1', supportsState: 'a', strength: 'decisive' })]
    const checks = [
      { checkId: 'c1', factId: 'fact:room-1', trigger: 'new_evidence' as const, minimumStrength: 'weak' as const },
    ]
    evaluateUncertainWorldStateFacts({ facts: [fact], evidence, checks })
    expect(fact.possibleStates).toBe(ps)
    expect(fact.appliedEvidenceIds).toBe(applied)
    expect(fact.possibleStates).toEqual(['a', 'b'])
    expect(evidence[0]?.supportsState).toBe('a')
    expect(checks[0]?.checkId).toBe('c1')
  })

  it('uncertainWorldState stays dependency-free — no imports (no GameState / branch continuity / map awareness wiring)', () => {
    const srcPath = path.join(__dirname, '../domain/uncertainWorldState.ts')
    const src = readFileSync(srcPath, 'utf8')
    expect(/^import\b/m.test(src)).toBe(false)
  })

  it('covers unseen_room_state and unverified_subject_property fact kinds', () => {
    const room = baseFact({ factId: 'f1', factKind: 'unseen_room_state' })
    const prop = baseFact({
      factId: 'f2',
      factKind: 'unverified_subject_property',
      subjectId: 'anomaly:scp-foo',
      question: 'Is the subject regenerating?',
      possibleStates: ['yes', 'no'],
    })
    const evidence: UncertainWorldStateEvidence[] = [
      { ...ev({ evidenceId: 'e1', factId: 'f1' }), supportsState: 'clear', strength: 'strong' },
      {
        evidenceId: 'e2',
        factId: 'f2',
        subjectId: 'anomaly:scp-foo',
        supportsState: 'no',
        strength: 'decisive',
        source: 'system',
      },
    ]
    const report = evaluateUncertainWorldStateFacts({ facts: [room, prop], evidence })
    const byId = Object.fromEntries(report.facts.map((f) => [f.factId, f]))
    expect(byId['f1']?.factKind).toBe('unseen_room_state')
    expect(byId['f1']?.status).toBe('unresolved')
    expect(byId['f2']?.factKind).toBe('unverified_subject_property')
    expect(byId['f2']?.status).toBe('resolved')
  })

  it('resolveUncertainWorldStateCheck mirrors single-fact evaluation', () => {
    const fact = baseFact({})
    const check = { checkId: 'c', factId: 'fact:room-1', trigger: 'observer_access' as const }
    const resolution = resolveUncertainWorldStateCheck({
      fact,
      evidence: [ev({ evidenceId: 'e', supportsState: 'sealed', strength: 'moderate' })],
      check,
    })
    const full = evaluateUncertainWorldStateFacts({
      facts: [fact],
      evidence: [ev({ evidenceId: 'e', supportsState: 'sealed', strength: 'moderate' })],
      checks: [check],
    })
    expect(resolution).toMatchObject(full.resolutions[0] ?? {})
  })

  it('is deterministic across identical runs', () => {
    const fact = baseFact({ factId: 'f-mid' })
    const facts = [
      baseFact({ factId: 'f-z' }),
      fact,
      baseFact({ factId: 'f-a' }),
    ]
    const evidence = [
      ev({ evidenceId: 'e2', factId: 'f-mid', supportsState: 'occupied', strength: 'weak' }),
      ev({ evidenceId: 'e1', factId: 'f-mid', supportsState: 'clear', strength: 'decisive' }),
    ]
    const a = evaluateUncertainWorldStateFacts({ facts, evidence })
    const b = evaluateUncertainWorldStateFacts({ facts, evidence })
    expect(a).toEqual(b)
  })
})
