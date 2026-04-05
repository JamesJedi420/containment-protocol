import { describe, expect, it } from 'vitest'
import {
  buildCaseDomainWeights,
  buildContextualRoleDomainWeights,
  buildWeightedDomainContribution,
  cloneDomainStats,
  createEmptyDomainContribution,
  domainAverage,
  getDomainStatPaths,
  getDomainStatValue,
  getLegacyDomainStatPaths,
  getRoleDomainWeights,
  normalizeRoleDomainWeights,
  sumDomainContribution,
} from '../domain/statDomains'
import type { CaseInstance, DomainStats, RoleDomainWeights } from '../domain/models'
import { createStartingState } from '../data/startingState'

function makeDomainStats(): DomainStats {
  return {
    physical: { strength: 10, endurance: 20 },
    tactical: { awareness: 30, reaction: 40 },
    cognitive: { analysis: 50, investigation: 60 },
    social: { negotiation: 70, influence: 80 },
    stability: { resistance: 90, tolerance: 100 },
    technical: { equipment: 110, anomaly: 120 },
  }
}

function makeCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  const state = createStartingState()

  return {
    ...state.cases['case-001'],
    id: 'case-test',
    templateId: 'case-test',
    title: 'Case Test',
    description: 'Case test description',
    mode: 'threshold',
    kind: 'case',
    status: 'open',
    difficulty: {
      combat: 10,
      investigation: 10,
      utility: 10,
      social: 10,
    },
    weights: {
      combat: 0.25,
      investigation: 0.25,
      utility: 0.25,
      social: 0.25,
    },
    tags: [],
    requiredRoles: [],
    requiredTags: [],
    preferredTags: [],
    stage: 2,
    durationWeeks: 2,
    weeksRemaining: undefined,
    deadlineWeeks: 5,
    deadlineRemaining: 5,
    assignedTeamIds: [],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 0, max: 1 },
      spawnTemplateIds: [],
    },
    onUnresolved: {
      stageDelta: 1,
      spawnCount: { min: 0, max: 1 },
      spawnTemplateIds: [],
    },
    ...overrides,
  }
}

describe('statDomains helper contracts', () => {
  it('clones domain stats deeply so clone mutation does not affect source', () => {
    const source = makeDomainStats()
    const cloned = cloneDomainStats(source)

    cloned.physical.strength = 999
    cloned.technical.anomaly = 777

    expect(source.physical.strength).toBe(10)
    expect(source.technical.anomaly).toBe(120)
    expect(cloned.physical.strength).toBe(999)
    expect(cloned.technical.anomaly).toBe(777)
  })

  it('returns expected paths for domain and legacy stat access helpers', () => {
    expect(getDomainStatPaths('field')).toEqual([
      'physical.strength',
      'physical.endurance',
      'tactical.awareness',
      'tactical.reaction',
    ])

    expect(getLegacyDomainStatPaths('technical')).toEqual([
      'technical.equipment',
      'technical.anomaly',
    ])
  })

  it('returns deterministic stat values for known domain stat paths', () => {
    const stats = makeDomainStats()

    expect(getDomainStatValue(stats, 'physical.strength')).toBe(10)
    expect(getDomainStatValue(stats, 'social.influence')).toBe(80)
    expect(getDomainStatValue(stats, 'technical.anomaly')).toBe(120)
  })

  it('creates an all-zero domain contribution scaffold', () => {
    const empty = createEmptyDomainContribution()

    expect(empty).toEqual({
      field: 0,
      resilience: 0,
      control: 0,
      insight: 0,
      presence: 0,
      anomaly: 0,
    })
    expect(sumDomainContribution(empty)).toBe(0)
  })

  it('falls back to equal distribution when normalized weights are non-positive/invalid', () => {
    const normalized = normalizeRoleDomainWeights({
      field: -2,
      resilience: Number.NaN,
      control: Number.NEGATIVE_INFINITY,
      insight: -1,
      presence: -5,
      anomaly: -9,
    })

    expect(Object.values(normalized).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 6)
    expect(normalized.field).toBeCloseTo(1 / 6, 6)
    expect(normalized.resilience).toBeCloseTo(1 / 6, 6)
    expect(normalized.control).toBeCloseTo(1 / 6, 6)
    expect(normalized.insight).toBeCloseTo(1 / 6, 6)
    expect(normalized.presence).toBeCloseTo(1 / 6, 6)
    expect(normalized.anomaly).toBeCloseTo(1 / 6, 6)
  })

  it('normalizes finite positive weights and clamps negatives to zero', () => {
    const normalized = normalizeRoleDomainWeights({
      field: 4,
      resilience: 2,
      control: 0,
      insight: -1,
      presence: 0,
      anomaly: 2,
    })

    expect(normalized.field).toBeCloseTo(0.5, 6)
    expect(normalized.resilience).toBeCloseTo(0.25, 6)
    expect(normalized.control).toBeCloseTo(0, 6)
    expect(normalized.insight).toBeCloseTo(0, 6)
    expect(normalized.presence).toBeCloseTo(0, 6)
    expect(normalized.anomaly).toBeCloseTo(0.25, 6)
    expect(Object.values(normalized).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 6)
  })

  it('returns equal case-domain weights when case context is missing', () => {
    const weights = buildCaseDomainWeights(undefined)

    expect(Object.values(weights).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 6)
    expect(weights).toEqual({
      field: 1 / 6,
      resilience: 1 / 6,
      control: 1 / 6,
      insight: 1 / 6,
      presence: 1 / 6,
      anomaly: 1 / 6,
    })
  })

  it('builds normalized case-domain weights from case stat pressure and tags', () => {
    const caseData = makeCase({
      kind: 'raid',
      durationWeeks: 4,
      weights: {
        combat: 0.1,
        investigation: 0.2,
        utility: 0.6,
        social: 0.1,
      },
      tags: ['containment', 'anomaly'],
      requiredTags: ['ritual'],
      preferredTags: ['ward'],
    })

    const weights = buildCaseDomainWeights(caseData)

    expect(Object.values(weights).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 6)
    expect(weights.control).toBeGreaterThan(weights.field)
    expect(weights.anomaly).toBeGreaterThan(weights.presence)
    expect(weights.resilience).toBeGreaterThan(0)
  })

  it('increases field emphasis for short-duration cases versus neutral duration', () => {
    const neutral = buildCaseDomainWeights(
      makeCase({
        durationWeeks: 2,
        kind: 'case',
        tags: [],
        requiredTags: [],
        preferredTags: [],
      })
    )
    const shortDuration = buildCaseDomainWeights(
      makeCase({
        durationWeeks: 1,
        kind: 'case',
        tags: [],
        requiredTags: [],
        preferredTags: [],
      })
    )

    expect(shortDuration.field).toBeGreaterThan(neutral.field)
  })

  it('increases long-operation domains for long-duration cases versus neutral duration', () => {
    const neutral = buildCaseDomainWeights(
      makeCase({
        durationWeeks: 2,
        kind: 'case',
        tags: [],
        requiredTags: [],
        preferredTags: [],
      })
    )
    const longDuration = buildCaseDomainWeights(
      makeCase({
        durationWeeks: 4,
        kind: 'case',
        tags: [],
        requiredTags: [],
        preferredTags: [],
      })
    )

    expect(longDuration.resilience).toBeGreaterThan(neutral.resilience)
    expect(longDuration.insight).toBeGreaterThan(neutral.insight)
    expect(longDuration.anomaly).toBeGreaterThan(neutral.anomaly)
  })

  it('increases raid-leaning domains for raid cases versus non-raid cases', () => {
    const nonRaid = buildCaseDomainWeights(
      makeCase({
        kind: 'case',
        durationWeeks: 2,
        tags: [],
        requiredTags: [],
        preferredTags: [],
      })
    )
    const raid = buildCaseDomainWeights(
      makeCase({
        kind: 'raid',
        durationWeeks: 2,
        tags: [],
        requiredTags: [],
        preferredTags: [],
      })
    )

    expect(raid.field).toBeGreaterThan(nonRaid.field)
    expect(raid.resilience).toBeGreaterThan(nonRaid.resilience)
    expect(raid.anomaly).toBeGreaterThan(nonRaid.anomaly)
  })

  it('returns pure role-domain weights when no case context is provided', () => {
    const roleWeights = getRoleDomainWeights('investigator')
    const contextualWeights = buildContextualRoleDomainWeights('investigator', undefined)

    expect(contextualWeights).toEqual(roleWeights)
  })

  it('blends role and case weights into normalized contextual weights', () => {
    const roleWeights = getRoleDomainWeights('investigator')
    const caseData = makeCase({
      durationWeeks: 1,
      weights: {
        combat: 0.05,
        investigation: 0.25,
        utility: 0.05,
        social: 0.65,
      },
      tags: ['witness', 'interview'],
    })

    const contextualWeights = buildContextualRoleDomainWeights('investigator', caseData)

    expect(Object.values(contextualWeights).reduce((sum, value) => sum + value, 0)).toBeCloseTo(
      1,
      6
    )
    expect(contextualWeights.presence).toBeGreaterThan(roleWeights.presence)
    expect(contextualWeights.field).toBeLessThan(roleWeights.field)
  })

  it('computes deterministic domain averages from known domain stat paths', () => {
    const stats = makeDomainStats()

    expect(domainAverage(stats, 'field')).toBe((10 + 20 + 30 + 40) / 4)
    expect(domainAverage(stats, 'presence')).toBe((70 + 80) / 2)
    expect(domainAverage(stats, 'anomaly')).toBe((120 + 60 + 90) / 3)
  })

  it('computes weighted contributions and preserves additive total', () => {
    const stats = makeDomainStats()

    const fieldOnly: RoleDomainWeights = {
      field: 1,
      resilience: 0,
      control: 0,
      insight: 0,
      presence: 0,
      anomaly: 0,
    }

    const contribution = buildWeightedDomainContribution(stats, fieldOnly)

    expect(contribution.field).toBe((10 + 20 + 30 + 40) / 4)
    expect(contribution.resilience).toBe(0)
    expect(contribution.control).toBe(0)
    expect(contribution.insight).toBe(0)
    expect(contribution.presence).toBe(0)
    expect(contribution.anomaly).toBe(0)
    expect(sumDomainContribution(contribution)).toBeCloseTo(contribution.field, 6)
  })
})
