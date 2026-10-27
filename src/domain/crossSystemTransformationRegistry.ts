/**
 * SPE-2273 slice 1 — pure cross-system transformation registry.
 *
 * Deterministic object refs, typed morphisms, and append-only composition
 * traces for chained cross-system effects. No GameState persistence, UI,
 * authority graph, relationship emergence, or map-layer ownership.
 */

export interface SimulationObjectRef {
  readonly family: string
  readonly id: string
}

export const TRANSFORMATION_MORPHISM_KINDS = ['identity', 'compose', 'map', 'translate'] as const
export type TransformationMorphismKind = (typeof TRANSFORMATION_MORPHISM_KINDS)[number]

export interface TranslateProvenance {
  /** Owning source family that produced the projected value. */
  readonly sourceFamily: string
  /** Stable source object that justified the translation. */
  readonly sourceRef: SimulationObjectRef
  /** Stable reason code for audit/debug replay. */
  readonly reasonCode: string
}

export interface TransformationMorphism {
  readonly id: string
  readonly kind: TransformationMorphismKind
  readonly input: SimulationObjectRef
  readonly output: SimulationObjectRef
  /** Required for `compose`: left child morphism id in the same chain. */
  readonly leftMorphismId?: string
  /** Required for `compose`: right child morphism id in the same chain. */
  readonly rightMorphismId?: string
  /** Required for `translate`. */
  readonly provenance?: TranslateProvenance
}

export interface CompositionTraceStep {
  readonly morphismId: string
  readonly kind: TransformationMorphismKind
  readonly input: SimulationObjectRef
  readonly output: SimulationObjectRef
}

export interface CompositionTrace {
  readonly steps: readonly CompositionTraceStep[]
}

export const MORPHISM_CHAIN_ERROR_CODES = [
  'dangling_object_ref',
  'dangling_morphism_ref',
  'illegal_compose_arity',
  'illegal_compose_endpoints',
  'translate_missing_provenance',
  'map_family_mismatch',
  'circular_compose_without_identity_escape',
  'malformed_morphism',
] as const
export type MorphismChainErrorCode = (typeof MORPHISM_CHAIN_ERROR_CODES)[number]

export type ValidateMorphismChainResult =
  | { readonly ok: true; readonly chain: readonly TransformationMorphism[] }
  | {
      readonly ok: false
      readonly code: MorphismChainErrorCode
      readonly morphismId?: string
      readonly detail?: string
    }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isValidObjectRef(ref: SimulationObjectRef | null | undefined): ref is SimulationObjectRef {
  return !!ref && isNonEmptyString(ref.family) && isNonEmptyString(ref.id)
}

function refsEqual(a: SimulationObjectRef, b: SimulationObjectRef): boolean {
  return a.family === b.family && a.id === b.id
}

function freezeRef(ref: SimulationObjectRef): SimulationObjectRef {
  return Object.freeze({ family: ref.family, id: ref.id })
}

function freezeProvenance(provenance: TranslateProvenance): TranslateProvenance {
  return Object.freeze({
    sourceFamily: provenance.sourceFamily,
    sourceRef: freezeRef(provenance.sourceRef),
    reasonCode: provenance.reasonCode,
  })
}

function freezeMorphism(morphism: TransformationMorphism): TransformationMorphism {
  return Object.freeze({
    id: morphism.id,
    kind: morphism.kind,
    input: freezeRef(morphism.input),
    output: freezeRef(morphism.output),
    ...(morphism.leftMorphismId !== undefined ? { leftMorphismId: morphism.leftMorphismId } : {}),
    ...(morphism.rightMorphismId !== undefined ? { rightMorphismId: morphism.rightMorphismId } : {}),
    ...(morphism.provenance !== undefined
      ? { provenance: freezeProvenance(morphism.provenance) }
      : {}),
  })
}

function fail(
  code: MorphismChainErrorCode,
  morphismId?: string,
  detail?: string,
): ValidateMorphismChainResult {
  return Object.freeze({
    ok: false as const,
    code,
    ...(morphismId !== undefined ? { morphismId } : {}),
    ...(detail !== undefined ? { detail } : {}),
  })
}

function validateSingleMorphism(
  morphism: TransformationMorphism,
  byId: ReadonlyMap<string, TransformationMorphism>,
): ValidateMorphismChainResult | null {
  if (!isNonEmptyString(morphism.id)) {
    return fail('malformed_morphism', morphism.id, 'morphism.id')
  }
  if (!TRANSFORMATION_MORPHISM_KINDS.includes(morphism.kind)) {
    return fail('malformed_morphism', morphism.id, 'morphism.kind')
  }
  if (!isValidObjectRef(morphism.input) || !isValidObjectRef(morphism.output)) {
    return fail('dangling_object_ref', morphism.id)
  }

  if (morphism.kind === 'identity' && !refsEqual(morphism.input, morphism.output)) {
    return fail('malformed_morphism', morphism.id, 'identity_endpoints')
  }

  if (morphism.kind === 'map' && morphism.input.family !== morphism.output.family) {
    return fail('map_family_mismatch', morphism.id)
  }

  if (morphism.kind === 'translate') {
    const provenance = morphism.provenance
    if (
      !provenance ||
      !isNonEmptyString(provenance.sourceFamily) ||
      !isNonEmptyString(provenance.reasonCode) ||
      !isValidObjectRef(provenance.sourceRef)
    ) {
      return fail('translate_missing_provenance', morphism.id)
    }
  }

  if (morphism.kind === 'compose') {
    const hasLeft = isNonEmptyString(morphism.leftMorphismId)
    const hasRight = isNonEmptyString(morphism.rightMorphismId)
    if (!hasLeft || !hasRight) {
      return fail('illegal_compose_arity', morphism.id)
    }
    if (!byId.has(morphism.leftMorphismId!) || !byId.has(morphism.rightMorphismId!)) {
      return fail(
        'dangling_morphism_ref',
        morphism.id,
        `${morphism.leftMorphismId}->${morphism.rightMorphismId}`,
      )
    }
    const left = byId.get(morphism.leftMorphismId!)!
    const right = byId.get(morphism.rightMorphismId!)!
    if (
      !isValidObjectRef(left.input) ||
      !isValidObjectRef(left.output) ||
      !isValidObjectRef(right.input) ||
      !isValidObjectRef(right.output) ||
      !refsEqual(left.output, right.input) ||
      !refsEqual(morphism.input, left.input) ||
      !refsEqual(morphism.output, right.output)
    ) {
      return fail('illegal_compose_endpoints', morphism.id)
    }
  } else if (morphism.leftMorphismId !== undefined || morphism.rightMorphismId !== undefined) {
    return fail('illegal_compose_arity', morphism.id, 'non_compose_child_ids')
  }

  return null
}

function detectCircularComposeWithoutIdentityEscape(
  chain: readonly TransformationMorphism[],
  byId: ReadonlyMap<string, TransformationMorphism>,
): ValidateMorphismChainResult | null {
  const composeChildren = new Map<string, readonly string[]>()
  for (const morphism of chain) {
    if (morphism.kind !== 'compose') continue
    composeChildren.set(morphism.id, [morphism.leftMorphismId!, morphism.rightMorphismId!])
  }
  if (composeChildren.size === 0) return null

  const visiting = new Set<string>()

  const visit = (id: string, path: string[]): ValidateMorphismChainResult | null => {
    if (visiting.has(id)) {
      const cycle = path.slice(path.indexOf(id)).concat(id)
      const cycleNodes = cycle.slice(0, -1)
      const hasIdentityEscape = cycleNodes.some((cycleId) => {
        if (byId.get(cycleId)?.kind === 'identity') return true
        const children = composeChildren.get(cycleId) ?? []
        return children.some((childId) => byId.get(childId)?.kind === 'identity')
      })
      if (!hasIdentityEscape) {
        return fail('circular_compose_without_identity_escape', id, cycle.join('->'))
      }
      return null
    }
    visiting.add(id)
    const children = composeChildren.get(id)
    if (children) {
      for (const childId of children) {
        const nested = visit(childId, path.concat(id))
        if (nested) {
          visiting.delete(id)
          return nested
        }
      }
    }
    visiting.delete(id)
    return null
  }

  for (const id of composeChildren.keys()) {
    const found = visit(id, [])
    if (found) return found
  }
  return null
}

/**
 * Deterministic lint for a morphism chain. Repeated calls over identical inputs
 * return byte-stable result shapes (including frozen nested refs).
 */
export function validateMorphismChain(
  chain: readonly TransformationMorphism[],
): ValidateMorphismChainResult {
  if (!Array.isArray(chain)) {
    return fail('malformed_morphism', undefined, 'chain')
  }

  const byId = new Map<string, TransformationMorphism>()
  for (const morphism of chain) {
    if (!morphism || typeof morphism !== 'object') {
      return fail('malformed_morphism', undefined, 'entry')
    }
    if (!isNonEmptyString(morphism.id)) {
      return fail('malformed_morphism', morphism.id, 'morphism.id')
    }
    if (byId.has(morphism.id)) {
      return fail('malformed_morphism', morphism.id, 'duplicate_id')
    }
    byId.set(morphism.id, morphism)
  }

  for (const morphism of chain) {
    const single = validateSingleMorphism(morphism, byId)
    if (single) return single
  }

  const circular = detectCircularComposeWithoutIdentityEscape(chain, byId)
  if (circular) return circular

  return Object.freeze({
    ok: true as const,
    chain: Object.freeze(chain.map(freezeMorphism)),
  })
}

/**
 * Build a compose morphism whose input is the left input and output is the
 * right output. Callers must place left, right, and the result in one chain
 * before validation.
 */
export function composeMorphisms(
  left: TransformationMorphism,
  right: TransformationMorphism,
  composeId: string,
): TransformationMorphism {
  if (!isNonEmptyString(composeId)) {
    throw new Error('composeMorphisms: composeId required')
  }
  if (!isNonEmptyString(left.id) || !isNonEmptyString(right.id)) {
    throw new Error('composeMorphisms: left and right morphism ids required')
  }
  if (!refsEqual(left.output, right.input)) {
    throw new Error('composeMorphisms: left.output must equal right.input')
  }
  return freezeMorphism({
    id: composeId,
    kind: 'compose',
    input: left.input,
    output: right.output,
    leftMorphismId: left.id,
    rightMorphismId: right.id,
  })
}

/**
 * Append-only composition trace listing each morphism in caller order.
 */
export function buildCompositionTrace(
  chain: readonly TransformationMorphism[],
): CompositionTrace {
  const validated = validateMorphismChain(chain)
  if (!validated.ok) {
    throw new Error(`buildCompositionTrace: invalid chain (${validated.code})`)
  }
  const steps = validated.chain.map((morphism) =>
    Object.freeze({
      morphismId: morphism.id,
      kind: morphism.kind,
      input: morphism.input,
      output: morphism.output,
    }),
  )
  return Object.freeze({ steps: Object.freeze(steps) })
}

/** Fixture: evidence record → interpretation summary → policy review flag. */
export const EVIDENCE_TO_POLICY_FIXTURE_CHAIN: readonly TransformationMorphism[] = Object.freeze([
  freezeMorphism({
    id: 'morph:evidence-to-interpretation',
    kind: 'translate',
    input: { family: 'evidence_record', id: 'evidence:case-alpha' },
    output: { family: 'interpretation_summary', id: 'interp:case-alpha' },
    provenance: {
      sourceFamily: 'evidence_record',
      sourceRef: { family: 'evidence_record', id: 'evidence:case-alpha' },
      reasonCode: 'evidence_interpretation_projection',
    },
  }),
  freezeMorphism({
    id: 'morph:interpretation-to-policy',
    kind: 'translate',
    input: { family: 'interpretation_summary', id: 'interp:case-alpha' },
    output: { family: 'policy_review_flag', id: 'policy:case-alpha-review' },
    provenance: {
      sourceFamily: 'interpretation_summary',
      sourceRef: { family: 'interpretation_summary', id: 'interp:case-alpha' },
      reasonCode: 'interpretation_policy_flag',
    },
  }),
  freezeMorphism({
    id: 'morph:evidence-to-policy-compose',
    kind: 'compose',
    input: { family: 'evidence_record', id: 'evidence:case-alpha' },
    output: { family: 'policy_review_flag', id: 'policy:case-alpha-review' },
    leftMorphismId: 'morph:evidence-to-interpretation',
    rightMorphismId: 'morph:interpretation-to-policy',
  }),
])
