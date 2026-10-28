import { describe, expect, it } from 'vitest'
import {
  applyStochasticCutover,
  assertScopedIndependentOfLegacyStream,
  continueInFlightLegacySequence,
  hydrateLegacyRngState,
  resolvePostCutoverDecision,
} from '../domain/legacyRngStateCutover'
import {
  createScopedStochasticRng,
  createStochasticDecisionIdentity,
  pickWeightedIndex,
  serializeStochasticDecisionIdentity,
} from '../domain/stochasticIdentity'

describe('SPE-3162 stochastic identity kernel', () => {
  it('derives identical samples for identical identity', () => {
    const identity = createStochasticDecisionIdentity({
      runSeed: 42,
      domain: 'party_cards',
      semanticEntityOrEventId: 'deck:alpha',
      decisionKind: 'draw',
      phaseOrAttemptOrIndex: '0',
      selectorVersion: 'spe-3162.v1',
    })
    const a = createScopedStochasticRng(identity)
    const b = createScopedStochasticRng(identity)
    expect(a.derivedSeed).toBe(b.derivedSeed)
    expect(a.next()).toBe(b.next())
    expect(serializeStochasticDecisionIdentity(identity)).toBe(
      serializeStochasticDecisionIdentity(
        createStochasticDecisionIdentity({ ...identity }),
      ),
    )
  })

  it('isolates unrelated domain decisions from each other', () => {
    const party = createScopedStochasticRng(
      createStochasticDecisionIdentity({
        runSeed: 99,
        domain: 'party_cards',
        semanticEntityOrEventId: 'deck:a',
        decisionKind: 'draw',
        phaseOrAttemptOrIndex: '0',
        selectorVersion: 'v1',
      }),
    )
    const recruit = createScopedStochasticRng(
      createStochasticDecisionIdentity({
        runSeed: 99,
        domain: 'recruitment',
        semanticEntityOrEventId: 'pool:a',
        decisionKind: 'pick',
        phaseOrAttemptOrIndex: '0',
        selectorVersion: 'v1',
      }),
    )
    expect(party.derivedSeed).not.toBe(recruit.derivedSeed)
    const partySample = party.next()
    // Extra draws in recruitment must not change a fresh party sample.
    recruit.next()
    recruit.next()
    const partyAgain = createScopedStochasticRng(
      createStochasticDecisionIdentity({
        runSeed: 99,
        domain: 'party_cards',
        semanticEntityOrEventId: 'deck:a',
        decisionKind: 'draw',
        phaseOrAttemptOrIndex: '0',
        selectorVersion: 'v1',
      }),
    )
    expect(partyAgain.next()).toBe(partySample)
  })

  it('fails closed on empty weights', () => {
    const rng = createScopedStochasticRng(
      createStochasticDecisionIdentity({
        runSeed: 1,
        domain: 'test',
        semanticEntityOrEventId: 'e',
        decisionKind: 'w',
        phaseOrAttemptOrIndex: '0',
        selectorVersion: 'v1',
      }),
    )
    expect(pickWeightedIndex(rng.next, [])).toBeNull()
    expect(pickWeightedIndex(rng.next, [0, 0])).toBeNull()
  })
})

describe('SPE-3163 legacy rngState cutover', () => {
  it('hydrates a legacy save without changing resolved history', () => {
    const result = hydrateLegacyRngState({
      rngSeed: 1001,
      rngState: 55555,
      resolvedHistoryFingerprint: 'history:abc',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.resolvedHistoryFingerprint).toBe('history:abc')
    expect(result.rngState).toBe(55555)
    expect(result.cutoverApplied).toBe(false)
  })

  it('applies cutover exactly once', () => {
    const hydrated = hydrateLegacyRngState({
      rngSeed: 7,
      rngState: 9,
      resolvedHistoryFingerprint: 'h1',
    })
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    const first = applyStochasticCutover({
      hydration: hydrated,
      markerId: 'cutover:spe-3163:v1',
      appliedAtWeek: 12,
    })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.disposition).toBe('migrate_once')
    const second = applyStochasticCutover({
      hydration: hydrated,
      markerId: 'cutover:spe-3163:v1',
      appliedAtWeek: 12,
      existingMarker: first.marker,
    })
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.disposition).toBe('already_migrated')
    expect(second.marker).toEqual(first.marker)
  })

  it('treats hydrated matching cutoverMarkerId as already_migrated', () => {
    const hydrated = hydrateLegacyRngState({
      rngSeed: 7,
      rngState: 9,
      resolvedHistoryFingerprint: 'h1',
      cutoverMarkerId: 'cutover:spe-3163:v1',
    })
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    const result = applyStochasticCutover({
      hydration: hydrated,
      markerId: 'cutover:spe-3163:v1',
      appliedAtWeek: 12,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.disposition).toBe('already_migrated')
  })

  it('rejects non-integer rngSeed/rngState', () => {
    const result = hydrateLegacyRngState({
      rngSeed: 1.5,
      rngState: 2,
      resolvedHistoryFingerprint: 'h',
    })
    expect(result.ok).toBe(false)
  })

  it('does not grandfather in-flight under migrate_existing policy', () => {
    const hydrated = hydrateLegacyRngState({
      rngSeed: 3,
      rngState: 11,
      resolvedHistoryFingerprint: 'h',
    })
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    const cutover = applyStochasticCutover({
      hydration: hydrated,
      markerId: 'm-migrate',
      appliedAtWeek: 4,
      policy: 'migrate_existing',
    })
    expect(cutover.ok).toBe(true)
    if (!cutover.ok) return
    const mid = continueInFlightLegacySequence(
      {
        sequenceId: 'raid:2',
        stateFamily: 'raid_resolution',
        originatingSelector: 'legacy_global_stream',
        legacyStreamState: 11,
        declaredBoundary: 'mission_terminal',
        currentBoundary: 'mission_active',
        cutoverMarkerId: 'm-migrate',
      },
      cutover.marker,
    )
    expect(mid.continueLegacy).toBe(false)
    expect(mid.disposition).toBe('migrate_once')
  })

  it('grandfathers in-flight legacy sequences until the declared boundary', () => {
    const hydrated = hydrateLegacyRngState({
      rngSeed: 3,
      rngState: 11,
      resolvedHistoryFingerprint: 'h',
    })
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    const cutover = applyStochasticCutover({
      hydration: hydrated,
      markerId: 'm1',
      appliedAtWeek: 4,
      policy: 'grandfather_existing',
    })
    expect(cutover.ok).toBe(true)
    if (!cutover.ok) return
    const mid = continueInFlightLegacySequence(
      {
        sequenceId: 'raid:1',
        stateFamily: 'raid_resolution',
        originatingSelector: 'legacy_global_stream',
        legacyStreamState: 11,
        declaredBoundary: 'mission_terminal',
        currentBoundary: 'mission_active',
        cutoverMarkerId: 'm1',
      },
      cutover.marker,
    )
    expect(mid.continueLegacy).toBe(true)
    expect(mid.disposition).toBe('unchanged_prior_semantics')
    const done = continueInFlightLegacySequence(
      {
        sequenceId: 'raid:1',
        stateFamily: 'raid_resolution',
        originatingSelector: 'legacy_global_stream',
        legacyStreamState: mid.nextLegacyStreamState!,
        declaredBoundary: 'mission_terminal',
        currentBoundary: 'mission_terminal',
        cutoverMarkerId: 'm1',
      },
      cutover.marker,
    )
    expect(done.continueLegacy).toBe(false)
    expect(done.disposition).toBe('apply_new_rule')
  })

  it('resolves post-cutover decisions via scoped identity, not stream position', () => {
    const hydrated = hydrateLegacyRngState({
      rngSeed: 42,
      rngState: 100,
      resolvedHistoryFingerprint: 'resolved',
    })
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    const cutover = applyStochasticCutover({
      hydration: hydrated,
      markerId: 'm2',
      appliedAtWeek: 8,
    })
    expect(cutover.ok).toBe(true)
    if (!cutover.ok) return
    const decision = {
      domain: 'market',
      semanticEntityOrEventId: 'listing:1',
      decisionKind: 'availability',
      phaseOrAttemptOrIndex: 'week:8',
      selectorVersion: 'spe-3162.v1',
    }
    const a = resolvePostCutoverDecision({ cutover: cutover.marker, identity: decision })
    const b = resolvePostCutoverDecision({ cutover: cutover.marker, identity: decision })
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    expect(a.provenance).toBe('scoped_stochastic_identity')
    expect(a.sample).toBe(b.sample)
    expect(
      assertScopedIndependentOfLegacyStream({
        cutover: cutover.marker,
        identity: decision,
        legacyStreamPerturbation: 999999,
      }),
    ).toBe(true)
  })

  it('fails closed when post-cutover metadata is missing', () => {
    const result = resolvePostCutoverDecision({
      cutover: undefined as never,
      identity: {
        domain: 'x',
        semanticEntityOrEventId: 'y',
        decisionKind: 'z',
        phaseOrAttemptOrIndex: '0',
        selectorVersion: 'v1',
      },
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reasonCode).toBe('missing_transition_metadata')
  })

  it('is byte-stable for repeated cutover serialization', () => {
    const hydrated = hydrateLegacyRngState({
      rngSeed: 1,
      rngState: 2,
      resolvedHistoryFingerprint: 'fp',
    })
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    const a = applyStochasticCutover({
      hydration: hydrated,
      markerId: 'stable',
      appliedAtWeek: 1,
    })
    const b = applyStochasticCutover({
      hydration: hydrated,
      markerId: 'stable',
      appliedAtWeek: 1,
    })
    expect(a).toEqual(b)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
