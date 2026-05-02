import { describe, expect, it } from 'vitest'
import {
  createSquadKitTemplate,
  evaluateSquadKitMatch,
} from '../domain/squadKitTemplate'

describe('squadKitTemplate', () => {
  it('rejects invalid inputs with typed failures', () => {
    expect(createSquadKitTemplate({ id: '', label: 'Breach', requiredItemTags: ['breach'], minCoveredCount: 1 })).toEqual(
      { ok: false, error: 'invalid_id' },
    )
    expect(createSquadKitTemplate({ id: 'tpl-1', label: '', requiredItemTags: ['breach'], minCoveredCount: 1 })).toEqual(
      { ok: false, error: 'empty_label' },
    )
    expect(createSquadKitTemplate({ id: 'tpl-1', label: 'Breach', requiredItemTags: [], minCoveredCount: 1 })).toEqual(
      { ok: false, error: 'empty_required_tags' },
    )
    expect(createSquadKitTemplate({ id: 'tpl-1', label: 'Breach', requiredItemTags: ['breach'], minCoveredCount: 0 })).toEqual(
      { ok: false, error: 'invalid_min_count' },
    )
    expect(createSquadKitTemplate({ id: 'tpl-1', label: 'Breach', requiredItemTags: ['breach'], minCoveredCount: 2 })).toEqual(
      { ok: false, error: 'invalid_min_count' },
    )
  })

  it('returns a valid SquadKitTemplate on well-formed input', () => {
    const result = createSquadKitTemplate({
      id: 'occult-kit',
      label: 'Occult Response Kit',
      requiredItemTags: ['ritual', 'containment', 'occult'],
      minCoveredCount: 2,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.template).toEqual({
      id: 'occult-kit',
      label: 'Occult Response Kit',
      requiredItemTags: ['ritual', 'containment', 'occult'],
      minCoveredCount: 2,
    })
  })

  it('returns match when squad item tags cover the minimum required count', () => {
    const r = createSquadKitTemplate({
      id: 'breach-kit',
      label: 'Breach Kit',
      requiredItemTags: ['breach', 'combat', 'protection'],
      minCoveredCount: 2,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const result = evaluateSquadKitMatch(r.template, ['breach', 'combat', 'medkit'])
    expect(result.status).toBe('match')
    if (result.status !== 'match') return
    expect(result.coveredTags).toEqual(['breach', 'combat'])
    expect(result.coverage).toBe(2)
  })

  it('returns mismatch with missingTags and shortfall when coverage falls below threshold', () => {
    const r = createSquadKitTemplate({
      id: 'breach-kit',
      label: 'Breach Kit',
      requiredItemTags: ['breach', 'combat', 'protection'],
      minCoveredCount: 3,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const result = evaluateSquadKitMatch(r.template, ['breach'])
    expect(result.status).toBe('mismatch')
    if (result.status !== 'mismatch') return
    expect(result.coveredTags).toEqual(['breach'])
    expect(result.missingTags).toEqual(expect.arrayContaining(['combat', 'protection']))
    expect(result.shortfall).toBe(2)
  })

  it('surfaces exact missing tag list and shortfall for partial coverage', () => {
    const r = createSquadKitTemplate({
      id: 'survey-kit',
      label: 'Survey Kit',
      requiredItemTags: ['surveillance', 'evidence', 'signal', 'field'],
      minCoveredCount: 4,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // squad has surveillance and evidence only — missing signal and field
    const result = evaluateSquadKitMatch(r.template, ['surveillance', 'evidence', 'medkit'])
    expect(result.status).toBe('mismatch')
    if (result.status !== 'mismatch') return
    expect(result.coveredTags).toEqual(['surveillance', 'evidence'])
    expect(result.missingTags).toEqual(['signal', 'field'])
    expect(result.shortfall).toBe(2)
  })

  it('is deterministic: same inputs always produce same outputs', () => {
    const r = createSquadKitTemplate({
      id: 'det-kit',
      label: 'Deterministic Kit',
      requiredItemTags: ['alpha', 'beta', 'gamma'],
      minCoveredCount: 2,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const tags = ['alpha', 'delta']
    const first = evaluateSquadKitMatch(r.template, tags)
    const second = evaluateSquadKitMatch(r.template, tags)
    expect(first).toEqual(second)
  })
})
