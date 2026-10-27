import { describe, expect, it } from 'vitest'
import {
  buildCompositionTrace,
  composeMorphisms,
  EVIDENCE_TO_POLICY_FIXTURE_CHAIN,
  validateMorphismChain,
  type TransformationMorphism,
} from '../domain/crossSystemTransformationRegistry'

function mapMorphism(
  overrides: Partial<TransformationMorphism> & Pick<TransformationMorphism, 'id'>,
): TransformationMorphism {
  return {
    id: overrides.id,
    kind: overrides.kind ?? 'map',
    input: overrides.input ?? { family: 'evidence_record', id: 'evidence:a' },
    output: overrides.output ?? { family: 'evidence_record', id: 'evidence:a-mapped' },
    ...('leftMorphismId' in overrides ? { leftMorphismId: overrides.leftMorphismId } : {}),
    ...('rightMorphismId' in overrides ? { rightMorphismId: overrides.rightMorphismId } : {}),
    ...('provenance' in overrides ? { provenance: overrides.provenance } : {}),
  }
}

describe('validateMorphismChain', () => {
  it('accepts the evidence→interpretation→policy fixture chain', () => {
    const result = validateMorphismChain(EVIDENCE_TO_POLICY_FIXTURE_CHAIN)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.chain).toHaveLength(3)
  })

  it('rejects a dangling SimulationObjectRef', () => {
    const result = validateMorphismChain([
      mapMorphism({
        id: 'morph:dangling',
        input: { family: 'evidence_record', id: '   ' },
      }),
    ])
    expect(result).toEqual({
      ok: false,
      code: 'dangling_object_ref',
      morphismId: 'morph:dangling',
    })
  })

  it('rejects translate without provenance', () => {
    const result = validateMorphismChain([
      {
        id: 'morph:bare-translate',
        kind: 'translate',
        input: { family: 'evidence_record', id: 'evidence:a' },
        output: { family: 'interpretation_summary', id: 'interp:a' },
      },
    ])
    expect(result).toEqual({
      ok: false,
      code: 'translate_missing_provenance',
      morphismId: 'morph:bare-translate',
    })
  })

  it('rejects illegal compose arity', () => {
    const result = validateMorphismChain([
      {
        id: 'morph:compose-incomplete',
        kind: 'compose',
        input: { family: 'evidence_record', id: 'evidence:a' },
        output: { family: 'policy_review_flag', id: 'policy:a' },
        leftMorphismId: 'morph:missing-right-only',
      },
    ])
    expect(result).toEqual({
      ok: false,
      code: 'illegal_compose_arity',
      morphismId: 'morph:compose-incomplete',
    })
  })

  it('rejects identity morphisms whose endpoints differ', () => {
    const result = validateMorphismChain([
      {
        id: 'morph:broken-identity',
        kind: 'identity',
        input: { family: 'evidence_record', id: 'evidence:a' },
        output: { family: 'evidence_record', id: 'evidence:b' },
      },
    ])
    expect(result).toEqual({
      ok: false,
      code: 'malformed_morphism',
      morphismId: 'morph:broken-identity',
      detail: 'identity_endpoints',
    })
  })

  it('fail-closes compose validation when a child endpoint is sparse', () => {
    const sparseChild = {
      id: 'morph:sparse-child',
      kind: 'map' as const,
      input: { family: 'evidence_record', id: 'evidence:a' },
      output: undefined as unknown as { family: string; id: string },
    }
    const result = validateMorphismChain([
      sparseChild,
      {
        id: 'morph:compose-over-sparse',
        kind: 'compose',
        input: { family: 'evidence_record', id: 'evidence:a' },
        output: { family: 'evidence_record', id: 'evidence:b' },
        leftMorphismId: 'morph:sparse-child',
        rightMorphismId: 'morph:sparse-child',
      },
    ])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(['dangling_object_ref', 'illegal_compose_endpoints']).toContain(result.code)
  })

  it('rejects overlapping compose cycles that lack an identity escape', () => {
    const identity: TransformationMorphism = {
      id: 'morph:identity',
      kind: 'identity',
      input: { family: 'evidence_record', id: 'evidence:a' },
      output: { family: 'evidence_record', id: 'evidence:a' },
    }
    const cycleA: TransformationMorphism = {
      id: 'morph:cycle-a',
      kind: 'compose',
      input: { family: 'evidence_record', id: 'evidence:a' },
      output: { family: 'evidence_record', id: 'evidence:a' },
      leftMorphismId: 'morph:identity',
      rightMorphismId: 'morph:cycle-c',
    }
    const cycleB: TransformationMorphism = {
      id: 'morph:cycle-b',
      kind: 'compose',
      input: { family: 'evidence_record', id: 'evidence:a' },
      output: { family: 'evidence_record', id: 'evidence:a' },
      leftMorphismId: 'morph:cycle-a',
      rightMorphismId: 'morph:cycle-c',
    }
    const cycleC: TransformationMorphism = {
      id: 'morph:cycle-c',
      kind: 'compose',
      input: { family: 'evidence_record', id: 'evidence:a' },
      output: { family: 'evidence_record', id: 'evidence:a' },
      leftMorphismId: 'morph:cycle-b',
      rightMorphismId: 'morph:cycle-b',
    }
    const result = validateMorphismChain([cycleB, cycleA, cycleC, identity])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('circular_compose_without_identity_escape')
  })

  it('rejects compose morphisms whose endpoints do not match children', () => {
    const left = mapMorphism({
      id: 'morph:left',
      input: { family: 'evidence_record', id: 'evidence:a' },
      output: { family: 'evidence_record', id: 'evidence:mid' },
    })
    const right = mapMorphism({
      id: 'morph:right',
      input: { family: 'evidence_record', id: 'evidence:other' },
      output: { family: 'evidence_record', id: 'evidence:b' },
    })
    const result = validateMorphismChain([
      left,
      right,
      {
        id: 'morph:bad-compose',
        kind: 'compose',
        input: left.input,
        output: right.output,
        leftMorphismId: left.id,
        rightMorphismId: right.id,
      },
    ])
    expect(result).toEqual({
      ok: false,
      code: 'illegal_compose_endpoints',
      morphismId: 'morph:bad-compose',
    })
  })

  it('rejects circular compose without identity escape', () => {
    const leaf = mapMorphism({
      id: 'morph:cycle-leaf',
      input: { family: 'evidence_record', id: 'evidence:a' },
      output: { family: 'evidence_record', id: 'evidence:a' },
    })
    const cycleA: TransformationMorphism = {
      id: 'morph:cycle-a',
      kind: 'compose',
      input: { family: 'evidence_record', id: 'evidence:a' },
      output: { family: 'evidence_record', id: 'evidence:a' },
      leftMorphismId: 'morph:cycle-leaf',
      rightMorphismId: 'morph:cycle-b',
    }
    const cycleB: TransformationMorphism = {
      id: 'morph:cycle-b',
      kind: 'compose',
      input: { family: 'evidence_record', id: 'evidence:a' },
      output: { family: 'evidence_record', id: 'evidence:a' },
      leftMorphismId: 'morph:cycle-a',
      rightMorphismId: 'morph:cycle-leaf',
    }
    const result = validateMorphismChain([leaf, cycleA, cycleB])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('circular_compose_without_identity_escape')
  })

  it('allows circular compose when an identity morphism provides escape', () => {
    const identity: TransformationMorphism = {
      id: 'morph:id-escape',
      kind: 'identity',
      input: { family: 'evidence_record', id: 'evidence:a' },
      output: { family: 'evidence_record', id: 'evidence:a' },
    }
    const cycleA: TransformationMorphism = {
      id: 'morph:cycle-a',
      kind: 'compose',
      input: { family: 'evidence_record', id: 'evidence:a' },
      output: { family: 'evidence_record', id: 'evidence:a' },
      leftMorphismId: 'morph:id-escape',
      rightMorphismId: 'morph:cycle-b',
    }
    const cycleB: TransformationMorphism = {
      id: 'morph:cycle-b',
      kind: 'compose',
      input: { family: 'evidence_record', id: 'evidence:a' },
      output: { family: 'evidence_record', id: 'evidence:a' },
      leftMorphismId: 'morph:cycle-a',
      rightMorphismId: 'morph:id-escape',
    }
    const result = validateMorphismChain([identity, cycleA, cycleB])
    expect(result.ok).toBe(true)
  })

  it('is byte-stable across repeated validation of identical inputs', () => {
    const first = validateMorphismChain(EVIDENCE_TO_POLICY_FIXTURE_CHAIN)
    const second = validateMorphismChain(EVIDENCE_TO_POLICY_FIXTURE_CHAIN)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))

    const dangling = [
      mapMorphism({
        id: 'morph:dangling',
        input: { family: '', id: 'x' },
      }),
    ]
    const failA = validateMorphismChain(dangling)
    const failB = validateMorphismChain(dangling)
    expect(JSON.stringify(failA)).toBe(JSON.stringify(failB))
  })
})

describe('composeMorphisms + buildCompositionTrace', () => {
  it('composes the fixture three-step chain deterministically with ordered trace steps', () => {
    const [left, right] = EVIDENCE_TO_POLICY_FIXTURE_CHAIN
    const composed = composeMorphisms(left, right, 'morph:evidence-to-policy-compose')
    expect(composed).toEqual(EVIDENCE_TO_POLICY_FIXTURE_CHAIN[2])

    const trace = buildCompositionTrace(EVIDENCE_TO_POLICY_FIXTURE_CHAIN)
    expect(trace.steps.map((step) => step.morphismId)).toEqual([
      'morph:evidence-to-interpretation',
      'morph:interpretation-to-policy',
      'morph:evidence-to-policy-compose',
    ])
    expect(trace.steps[0]?.input).toEqual({
      family: 'evidence_record',
      id: 'evidence:case-alpha',
    })
    expect(trace.steps[2]?.output).toEqual({
      family: 'policy_review_flag',
      id: 'policy:case-alpha-review',
    })
  })

  it('rejects building a trace from an invalid chain', () => {
    expect(() =>
      buildCompositionTrace([
        {
          id: 'morph:bare-translate',
          kind: 'translate',
          input: { family: 'evidence_record', id: 'evidence:a' },
          output: { family: 'interpretation_summary', id: 'interp:a' },
        },
      ]),
    ).toThrow(/translate_missing_provenance/)
  })
})
