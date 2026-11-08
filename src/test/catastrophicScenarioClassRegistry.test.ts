import { describe, expect, it } from 'vitest'
import {
  appendScenarioIncidentBackfill,
  normalizeScenarioLabel,
  suggestRefinement,
  validateScenarioClassEntry,
} from '../domain/catastrophicScenarioClassRegistry'
import type {
  CatastrophicScenarioClassEntry,
  ScenarioIncidentEvidence,
} from '../domain/catastrophicScenarioClassRegistry'

const first: CatastrophicScenarioClassEntry = {
  id: 'scenario-class:containment-cascade',
  label: 'Containment cascade',
  aliases: ['Lanternfall', 'Perimeter failure'],
  affectedDomains: ['habitability', 'civilization'],
  scopeTiers: ['region'],
  recurrenceStrength: 'repeated',
  sourceCounts: { case: 3, design: 1, test: 0, contradiction_check: 0 },
  status: 'operational_shorthand',
  inconsistentUseNotes: [],
  linkedIncidentIds: ['case:alpha'],
  compoundWithClassIds: ['scenario-class:memory-contagion'],
}
const second: CatastrophicScenarioClassEntry = {
  ...first,
  id: 'scenario-class:memory-contagion',
  label: 'Memory contagion',
  aliases: ['Forgotten sky'],
  affectedDomains: ['consciousness', 'public_knowledge'],
  scopeTiers: ['site', 'world'],
  sourceCounts: { case: 2, design: 2, test: 1, contradiction_check: 1 },
  compoundWithClassIds: [],
}

function evidence(id: string, domain: 'ecology' | 'physics'): ScenarioIncidentEvidence {
  return { incidentId: id, affectedDomains: [domain], scopeTier: 'region' }
}

describe('catastrophicScenarioClassRegistry (SPE-2100 slice 1)', () => {
  it('validates two differently scoped/domain-tagged evidence-backed classes', () => {
    expect(validateScenarioClassEntry(first)).toEqual({ valid: true, issues: [] })
    expect(validateScenarioClassEntry(second)).toEqual({ valid: true, issues: [] })
  })

  it('maps slang, a formal label, and generic event suffixes onto the same class', () => {
    const catalog = [first, second]
    expect(normalizeScenarioLabel(' Lanternfall crisis ', catalog)).toBe(first.id)
    expect(normalizeScenarioLabel('Containment cascade', catalog)).toBe(first.id)
    expect(normalizeScenarioLabel('perimeter failure event', catalog)).toBe(first.id)
    expect(normalizeScenarioLabel('Forgotten sky incident', catalog)).toBe(second.id)
    expect(normalizeScenarioLabel('Nonexistent event', catalog)).toBeNull()
    const malformed = { ...first, label: undefined } as unknown as CatastrophicScenarioClassEntry
    expect(normalizeScenarioLabel('Lanternfall', [malformed, second])).toBe(first.id)
    expect(normalizeScenarioLabel('Nonexistent event', [malformed])).toBeNull()
  })

  it('uses exact matches before stripping generic suffixes and fails on ambiguous aliases', () => {
    const other: CatastrophicScenarioClassEntry = {
      ...second,
      id: 'scenario-class:perimeter',
      label: 'Perimeter',
      aliases: ['Lanternfall'],
    }
    expect(normalizeScenarioLabel('Perimeter', [first, other])).toBe(other.id)
    expect(normalizeScenarioLabel('Lanternfall', [first, other])).toBeNull()
    expect(normalizeScenarioLabel('Lanternfall breach', [first, other])).toBeNull()
  })

  it('preserves a disputed overloaded label with notes but warns when the notes are omitted', () => {
    const disputed = {
      ...first,
      status: 'disputed',
      overloadedLabel: true,
      inconsistentUseNotes: ['Used for two unrelated losses'],
    }
    expect(validateScenarioClassEntry(disputed).valid).toBe(true)
    const missingNotes = validateScenarioClassEntry({ ...disputed, inconsistentUseNotes: [] })
    expect(missingNotes.valid).toBe(true)
    expect(validateScenarioClassEntry({ ...disputed, overloadedLabel: false, inconsistentUseNotes: [] }).issues).toEqual([])
    expect(missingNotes.issues).toContainEqual({
      code: 'overloaded_label_without_notes',
      severity: 'warning',
      field: 'inconsistentUseNotes',
    })
  })

  it('keeps compound-with references separate rather than merging the classes', () => {
    expect(first.compoundWithClassIds).toEqual([second.id])
    expect(validateScenarioClassEntry(first).valid).toBe(true)
    expect(validateScenarioClassEntry({ ...first, compoundWithClassIds: [first.id] }).valid).toBe(false)
  })

  it('rejects imported franchise class codes in labels and aliases', () => {
    const bad = validateScenarioClassEntry({ ...first, label: 'XK-Class end state' })
    expect(bad.valid).toBe(false)
    expect(bad.issues.some((issue) => issue.code === 'imported_franchise_class_code')).toBe(true)
    expect(normalizeScenarioLabel('XK-Class', [first])).toBeNull()
    expect(validateScenarioClassEntry({ ...first, aliases: ['SCP-001'] }).valid).toBe(false)
  })

  it('errors on missing status; warns on truth-collapse and ungrounded confidence', () => {
    const malformed = {
      id: 'scenario-class:incomplete',
      label: 'Declared disaster',
      description: 'This objectively happens',
      confidence: 0.95,
    }
    const result = validateScenarioClassEntry(malformed)
    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'missing_or_invalid_status',
        'missing_or_invalid_recurrence',
        'confidence_without_recurrence',
        'classification_truth_collapse',
      ])
    )
  })

  it('rejects malformed counts, missing metadata, and unapproved cosmological scope', () => {
    expect(validateScenarioClassEntry({ ...first, sourceCounts: { case: -1 } }).valid).toBe(false)
    expect(validateScenarioClassEntry({ ...first, status: undefined }).valid).toBe(false)
    expect(validateScenarioClassEntry({ ...first, scopeTiers: [' region '] }).valid).toBe(true)
    const unsupportedConfidence = validateScenarioClassEntry({
      ...first,
      confidence: 0.8,
      sourceCounts: { case: 0, design: 0, test: 0, contradiction_check: 0 },
    })
    expect(unsupportedConfidence.valid).toBe(true)
    expect(unsupportedConfidence.issues.some((issue) => issue.code === 'confidence_without_recurrence')).toBe(true)
    expect(validateScenarioClassEntry({ ...first, scopeTiers: ['cosmological'] }).valid).toBe(false)
    expect(
      validateScenarioClassEntry({ ...first, scopeTiers: ['cosmological'] }, { allowCosmologicalScope: true }).valid
    ).toBe(true)
    expect(validateScenarioClassEntry(null).valid).toBe(false)
  })

  it('backfills stable unique incident refs without rewriting classification or changing input', () => {
    const original = JSON.stringify(first)
    const next = appendScenarioIncidentBackfill(first, ['case:charlie', 'case:bravo', 'case:bravo', 'case:alpha'])
    expect(next.linkedIncidentIds).toEqual(['case:alpha', 'case:bravo', 'case:charlie'])
    expect(next.affectedDomains).toBe(first.affectedDomains)
    expect(next.compoundWithClassIds).toBe(first.compoundWithClassIds)
    expect(JSON.stringify(first)).toBe(original)
    expect(appendScenarioIncidentBackfill(next, ['case:charlie'])).toBe(next)
    const unsortedHistory = { ...first, linkedIncidentIds: ['case:charlie', 'case:alpha'] }
    expect(appendScenarioIncidentBackfill(unsortedHistory, ['case:bravo']).linkedIncidentIds).toEqual([
      'case:alpha',
      'case:bravo',
      'case:charlie',
    ])
    expect(appendScenarioIncidentBackfill(unsortedHistory, [])).toBe(unsortedHistory)
    expect(appendScenarioIncidentBackfill(unsortedHistory, ['case:alpha'])).toBe(unsortedHistory)
    expect(() => appendScenarioIncidentBackfill(first, [' '])).toThrow()
  })

  it('returns a stable refinement hint only for replicated distinct evidence clusters', () => {
    const repeated: ScenarioIncidentEvidence[] = [
      evidence('incident:4', 'physics'),
      evidence('incident:2', 'ecology'),
      evidence('incident:1', 'ecology'),
      evidence('incident:3', 'physics'),
    ]
    const hint = suggestRefinement(first, repeated)
    expect(hint).toEqual({
      classId: first.id,
      reason: 'repeated_distinct_evidence_clusters',
      clusters: [
        { affectedDomains: ['ecology'], scopeTier: 'region', incidentIds: ['incident:1', 'incident:2'] },
        { affectedDomains: ['physics'], scopeTier: 'region', incidentIds: ['incident:3', 'incident:4'] },
      ],
    })
    expect(JSON.stringify(suggestRefinement(first, [...repeated].reverse()))).toBe(JSON.stringify(hint))
    expect(suggestRefinement({ ...first, recurrenceStrength: 'one_off' }, repeated)).toBeNull()
    expect(suggestRefinement({ ...first, status: 'disputed' }, repeated)).toBeNull()
    expect(suggestRefinement(first, repeated.slice(0, 3))).toBeNull()
    expect(suggestRefinement(first, [...repeated, evidence('incident:1', 'physics')])).toBeNull()
  })

  it('keeps repeated validation byte-stable and input unmodified', () => {
    const original = JSON.stringify(first)
    const a = validateScenarioClassEntry(first)
    const b = validateScenarioClassEntry(first)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    expect(JSON.stringify(first)).toBe(original)
  })
})
