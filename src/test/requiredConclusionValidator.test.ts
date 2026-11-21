import { describe, expect, it } from 'vitest'
import {
  validateRequiredConclusions,
  type RequiredConclusion,
} from '../domain/requiredConclusionValidator'

const multiPath: RequiredConclusion = {
  id: 'culprit-identity',
  label: 'Culprit identity',
  requiredIndependentPaths: 2,
  paths: [
    { id: 'clue-1', channel: 'scene_search', underlyingSourceId: 'source-a' },
    { id: 'clue-2', channel: 'interview', underlyingSourceId: 'source-b' },
    { id: 'clue-3', channel: 'archive_research', underlyingSourceId: 'source-a' },
  ],
}

describe('SPE-1453 required conclusion validator', () => {
  it('validates multiple conclusions with independent path counts', () => {
    const results = validateRequiredConclusions([
      multiPath,
      {
        id: 'motive',
        label: 'Motive family',
        requiredIndependentPaths: 1,
        paths: [{ id: 'clue-m', channel: 'interview', underlyingSourceId: 'source-c' }],
      },
    ])
    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({
      conclusionId: 'culprit-identity',
      independentPathCount: 2,
      sufficient: true,
      owner: 'SPE-1453',
    })
    expect(results[1]).toMatchObject({
      conclusionId: 'motive',
      independentPathCount: 1,
      sufficient: true,
    })
  })

  it('flags single-clue and insufficient independent path bottlenecks', () => {
    const results = validateRequiredConclusions([
      {
        id: 'route',
        label: 'Escape route',
        requiredIndependentPaths: 2,
        paths: [{ id: 'only', channel: 'tracking', underlyingSourceId: 'source-x' }],
      },
    ])
    expect(results[0].sufficient).toBe(false)
    expect(results[0].independentPathCount).toBe(1)
    expect(results[0].warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/insufficient independent paths/),
        'single-clue bottleneck',
      ])
    )
  })

  it('detects false independence when multiple paths share one underlying source', () => {
    const results = validateRequiredConclusions([
      {
        id: 'contamination',
        label: 'Contamination source',
        requiredIndependentPaths: 2,
        paths: [
          { id: 'p1', channel: 'sensory', underlyingSourceId: 'source-shared' },
          { id: 'p2', channel: 'autopsy', underlyingSourceId: 'source-shared' },
          { id: 'p3', channel: 'rumor', underlyingSourceId: 'source-shared' },
        ],
      },
    ])
    expect(results[0].independentPathCount).toBe(1)
    expect(results[0].sufficient).toBe(false)
    expect(results[0].warnings.some((w) => w.includes('false independence'))).toBe(true)
  })

  it('keeps a conclusion valid when independent paths converge even if none is decisive', () => {
    const results = validateRequiredConclusions([multiPath])
    expect(results[0].sufficient).toBe(true)
    expect(results[0].independentPathCount).toBe(2)
  })

  it('is deterministic, immutable, and fails closed on malformed input', () => {
    const input = [multiPath]
    const before = structuredClone(input)
    const first = validateRequiredConclusions(input)
    const second = validateRequiredConclusions(input)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(input).toEqual(before)
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first[0])).toBe(true)
    expect(Object.isFrozen(first[0].warnings)).toBe(true)

    expect(() =>
      validateRequiredConclusions([
        {
          id: '',
          label: 'bad',
          requiredIndependentPaths: 1,
          paths: [],
        },
      ])
    ).toThrow(/id is required/)
    expect(() =>
      validateRequiredConclusions([
        {
          id: 'ok',
          label: 'ok',
          requiredIndependentPaths: 0,
          paths: [],
        },
      ])
    ).toThrow(/requiredIndependentPaths/)
  })
})
