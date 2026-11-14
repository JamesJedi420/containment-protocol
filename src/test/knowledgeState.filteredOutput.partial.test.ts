// Tests for public-facing partial/cryptic knowledge in filtered output
import { describe, it, expect } from 'vitest'
import {
  applyDefeatConditionKnowledge,
  getFilteredKnowledgeView,
  getKnowledgeKey,
  type KnowledgeState,
  type KnowledgeStateMap,
} from '../domain/knowledge'

describe('Filtered Output: Partial/Cryptic Defeat-Condition Knowledge', () => {
  it('should show suspected/family certainty as partial/cryptic in public view', () => {
    const teamId = 'T1'
    const anomalyId = 'A1'
    let state = {}
    // Suspected
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'suspected', 1)
    let publicView = getFilteredKnowledgeView(state, 'public')
    const key = getKnowledgeKey(teamId, anomalyId)
    expect(publicView[key]).toBeDefined()
    expect(publicView[key].notes).toBe('Possible bypass exists.')
    // Family
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'family', 2)
    publicView = getFilteredKnowledgeView(state, 'public')
    expect(publicView[key]).toBeDefined()
    expect(publicView[key].notes).toBe('Bypass method family suspected.')
    // Exact should not redact
    state = applyDefeatConditionKnowledge(state, teamId, anomalyId, 'exact', 3)
    publicView = getFilteredKnowledgeView(state, 'public')
    expect(publicView[key]).not.toBeUndefined()
    // Unknown should not appear
    state = applyDefeatConditionKnowledge({}, teamId, anomalyId, 'unknown', 4)
    publicView = getFilteredKnowledgeView(state, 'public')
    expect(publicView[key]).toBeUndefined()
  })
})

describe('public projection boundaries', () => {
  const key = getKnowledgeKey('team:one', 'case:one')
  const entry: KnowledgeState = {
    entityId: 'team:one',
    entityType: 'team',
    subjectId: 'case:one',
    subjectType: 'hazard',
    tier: 'partial',
    defeatConditionCertainty: 'family',
    trueClassification: 'PRIVATE_CLASS',
    provisionalClassification: 'PRIVATE_GUESS',
    source: 'PRIVATE_SOURCE',
    notes: 'PRIVATE_NOTE',
    relaySource: 'PRIVATE_RELAY',
    fusedFrom: ['PRIVATE_FUSION_A', 'PRIVATE_FUSION_B'],
    lastFusedWeek: 2,
  }
  it.each(['suspected', 'family', 'exact'] as const)(
    'omits masked %s certainty, including confirmed records',
    (certainty) => {
      for (const tier of ['partial', 'confirmed'] as const) {
        expect(
          getFilteredKnowledgeView(
            { [key]: { ...entry, tier, masked: true, defeatConditionCertainty: certainty } },
            'public'
          )
        ).toEqual({})
      }
    }
  )
  it('does not let partial knowledge bypass pending-relay exclusion', () => {
    expect(
      getFilteredKnowledgeView(
        { [key]: { ...entry, tier: 'pending-relay', relayAvailableWeek: 9 } },
        'public'
      )
    ).toEqual({})
  })
  it('retains useful bounded uncertainty without copying internal fields', () => {
    const view = getFilteredKnowledgeView({ [key]: entry }, 'public')
    expect(view[key]).toMatchObject({
      tier: 'unknown',
      defeatConditionCertainty: 'family',
      notes: 'Bypass method family suspected.',
    })
    expect(JSON.stringify(view)).not.toContain('PRIVATE')
    expect(view[key]).not.toHaveProperty('subjectType')
    expect(view[key]).not.toHaveProperty('trueClassification')
  })
  it('keeps confirmed unmasked knowledge and explicit obsolete/fragmented qualifiers', () => {
    const view = getFilteredKnowledgeView(
      {
        [key]: {
          ...entry,
          tier: 'confirmed',
          lastConfirmedWeek: 2,
          obsolete: true,
          fragmented: true,
        },
      },
      'public'
    )
    expect(view[key]).toMatchObject({
      tier: 'confirmed',
      lastConfirmedWeek: 2,
      obsolete: true,
      fragmented: true,
      subjectType: 'hazard',
    })
    expect(JSON.stringify(view)).not.toContain('PRIVATE')
  })
  it('keeps explicitly unknown defeat certainty on an otherwise confirmed subject', () => {
    const view = getFilteredKnowledgeView(
      { [key]: { ...entry, tier: 'confirmed', defeatConditionCertainty: 'unknown' } },
      'public'
    )
    expect(view[key]).toMatchObject({ tier: 'confirmed', defeatConditionCertainty: 'unknown' })
    expect(JSON.stringify(view)).not.toContain('PRIVATE')
  })
  it.each(['relayed', 'operationalized', 'institutionalized'] as const)(
    'preserves the existing exact-certainty tier contract for %s without source metadata',
    (tier) => {
      const view = getFilteredKnowledgeView(
        { [key]: { ...entry, tier, defeatConditionCertainty: 'exact', lastConfirmedWeek: 2 } },
        'public'
      )
      expect(view[key]).toMatchObject({
        tier,
        defeatConditionCertainty: 'exact',
        lastConfirmedWeek: 2,
        notes: 'Exact defeat/neutralization condition known.',
      })
      expect(JSON.stringify(view)).not.toContain('PRIVATE')
    }
  )
  it('preserves input data and detaches mutable internal arrays', () => {
    const state: KnowledgeStateMap = { [key]: entry }
    const before = JSON.stringify(state)
    const view = getFilteredKnowledgeView(state, 'internal')
    view[key].fusedFrom?.push('changed')
    view[key].notes = 'changed'
    expect(JSON.stringify(state)).toBe(before)
  })
  it('orders projections deterministically and safely preserves opaque keys', () => {
    const state = Object.fromEntries([
      ['z', entry],
      ['__proto__', entry],
      ['a', entry],
    ])
    const view = getFilteredKnowledgeView(state, 'public')
    expect(Object.keys(view)).toEqual(['__proto__', 'a', 'z'])
    expect(Object.hasOwn(view, '__proto__')).toBe(true)
    expect(getFilteredKnowledgeView(state, 'public')).toEqual(
      getFilteredKnowledgeView(state, 'public')
    )
  })
})
