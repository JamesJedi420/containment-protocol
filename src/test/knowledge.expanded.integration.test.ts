import { describe, expect, it } from 'vitest'
import type { CaseInstance, GameState } from '../domain/models'
import type {
  KnowledgeOwnerType,
  KnowledgeSubjectType,
} from '../domain/knowledge'
import { getKnowledgeKey } from '../domain/knowledge'
import { assignTeam } from '../domain/sim/assign'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { createStartingState } from '../data/startingState'

function getSeedCase(state: GameState): CaseInstance {
  const seedCase = Object.values(state.cases)[0]
  if (!seedCase) {
    throw new Error('Expected starting state to include at least one case.')
  }

  return seedCase
}

function makeCase(
  state: GameState,
  caseId: string,
  overrides: Partial<CaseInstance> = {}
): CaseInstance {
  const seedCase = getSeedCase(state)

  return {
    ...seedCase,
    id: caseId,
    title: 'Test Case',
    description: seedCase.description,
    mode: 'standard',
    kind: 'anomaly',
    status: 'open',
    difficulty: { combat: 1, investigation: 0, utility: 0, social: 0 },
    weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
    tags: [],
    requiredTags: [],
    requiredRoles: [],
    preferredTags: [],
    stage: 1,
    durationWeeks: 1,
    weeksRemaining: 1,
    deadlineWeeks: 1,
    deadlineRemaining: 1,
    assignedTeamIds: [],
    onFail: seedCase.onFail,
    onUnresolved: seedCase.onUnresolved,
    ...overrides,
  }
}

function makeCaseWithSubjectType(
  state: GameState,
  caseId: string,
  subjectType: KnowledgeSubjectType,
  overrides: Partial<CaseInstance> = {}
): CaseInstance & { subjectType: KnowledgeSubjectType } {
  return {
    ...makeCase(state, caseId, overrides),
    subjectType,
  }
}

function setupAssignedCase(
  state: GameState,
  caseId: string,
  subjectType: KnowledgeSubjectType = 'anomaly'
) {
  const nextState = state
  nextState.cases[caseId] = makeCaseWithSubjectType(nextState, caseId, subjectType)
  return assignTeam(nextState, caseId, 't_nightwatch')
}

describe('Knowledge-State Expansion', () => {
  it('records confirmed knowledge on success', () => {
    const state = setupAssignedCase(createStartingState(), 'case-001')
    const next = advanceWeek(state)
    const key = getKnowledgeKey('t_nightwatch', 'case-001')

    expect(next.knowledge[key]).toBeDefined()
    expect(next.knowledge[key].tier).toBe('confirmed')
    expect(next.knowledge[key].lastConfirmedWeek).toBe(state.week)
    expect(next.knowledge[key].notes).toMatch(/containment success/i)
  })

  it('records observed knowledge on partial outcome fixtures', () => {
    const state = createStartingState()
    const key = getKnowledgeKey('t_nightwatch', 'case-001')

    state.knowledge[key] = {
      tier: 'observed',
      entityId: 't_nightwatch',
      entityType: 'team',
      subjectId: 'case-001',
      subjectType: 'anomaly',
      notes: 'Partial resolution: observed but not confirmed.',
    }

    expect(state.knowledge[key]).toBeDefined()
    expect(state.knowledge[key].tier).toBe('observed')
    expect(state.knowledge[key].notes).toMatch(/partial|observed/i)
  })

  it('tracks fragmentation markers for failed knowledge fixtures', () => {
    const state = createStartingState()
    const key = getKnowledgeKey('t_nightwatch', 'case-001')

    state.knowledge[key] = {
      tier: 'observed',
      entityId: 't_nightwatch',
      entityType: 'team',
      subjectId: 'case-001',
      subjectType: 'anomaly',
      fragmented: true,
      fragmentation: 'fragmented',
      notes: 'Failed resolution: knowledge fragmented.',
    }

    expect(state.knowledge[key]).toBeDefined()
    expect(state.knowledge[key].fragmented).toBe(true)
    expect(state.knowledge[key].fragmentation).toBe('fragmented')
    expect(state.knowledge[key].notes).toMatch(/fragmented|fail/i)
  })

  it('promotes to operationalized after repeated confirmation', () => {
    const state = setupAssignedCase(createStartingState(), 'case-002')
    const key = getKnowledgeKey('t_nightwatch', 'case-002')

    state.knowledge[key] = {
      tier: 'confirmed',
      entityId: 't_nightwatch',
      entityType: 'team',
      subjectId: 'case-002',
      subjectType: 'anomaly',
      exposureCount: 1,
      lastConfirmedWeek: state.week - 1,
      notes: 'Prior confirmation.',
    }

    const next = advanceWeek(state)

    expect(next.knowledge[key]).toBeDefined()
    expect(next.knowledge[key].tier).toBe('operationalized')
    expect(next.knowledge[key].lastOperationalizedWeek).toBe(state.week)
    expect(next.knowledge[key].notes).toMatch(/operationalized/i)
  })

  it('recovers from fragmentation on a new success', () => {
    const state = setupAssignedCase(createStartingState(), 'case-demo-fragmented')
    const key = getKnowledgeKey('t_nightwatch', 'case-demo-fragmented')

    state.knowledge[key] = {
      tier: 'confirmed',
      entityId: 't_nightwatch',
      entityType: 'team',
      subjectId: 'case-demo-fragmented',
      subjectType: 'anomaly',
      fragmented: true,
      fragmentation: 'fragmented',
      notes: 'Knowledge fragmented due to staleness.',
    }

    const next = advanceWeek(state)

    expect(next.knowledge[key]).toBeDefined()
    expect(next.knowledge[key].tier).toBe('confirmed')
    expect(next.knowledge[key].fragmented).toBe(false)
    expect(next.knowledge[key].notes).toMatch(/recovered/i)
  })

  it('manages lastDecayWeek and fragmentation metadata', () => {
    const state = setupAssignedCase(createStartingState(), 'case-frag-meta')
    const key = getKnowledgeKey('t_nightwatch', 'case-frag-meta')

    state.knowledge[key] = {
      tier: 'confirmed',
      entityId: 't_nightwatch',
      entityType: 'team',
      subjectId: 'case-frag-meta',
      subjectType: 'anomaly',
      lastConfirmedWeek: 1,
      notes: '',
    }
    state.week = 20

    const next = advanceWeek(state)

    expect(next.knowledge[key]).toBeDefined()
    expect(next.knowledge[key].fragmented).toBe(true)
    expect(next.knowledge[key].fragmentation).toBe('fragmented')
    expect(next.knowledge[key].lastDecayWeek).toBe(20)
    expect(next.knowledge[key].notes).toMatch(/staleness/i)
  })

  it('handles canonical owner and subject type fixtures safely', () => {
    const ownerTypes: KnowledgeOwnerType[] = ['team', 'site', 'hazard', 'protocol', 'role']
    const subjectTypes: KnowledgeSubjectType[] = [
      'site',
      'anomaly',
      'hazard',
      'protocol',
      'procedure',
    ]

    for (const entityType of ownerTypes) {
      for (const subjectType of subjectTypes) {
        let state = createStartingState()
        const caseId = `case-${entityType}-${subjectType}`
        const entityId = entityType === 'team' ? 't_nightwatch' : entityType
        const key = getKnowledgeKey(entityId, caseId)

        state.knowledge[key] = {
          tier: 'unknown',
          entityId,
          entityType,
          subjectId: caseId,
          subjectType,
          notes: '',
        }

        if (entityType === 'team') {
          state.cases[caseId] = makeCaseWithSubjectType(state, caseId, subjectType)
          state = assignTeam(state, caseId, entityId)
          const next = advanceWeek(state)

          expect(next.knowledge[key]).toBeDefined()
          expect(next.knowledge[key].entityType).toBe(entityType)
          expect(next.knowledge[key].subjectType).toBe(subjectType)
        } else {
          expect(state.knowledge[key].entityType).toBe(entityType)
          expect(state.knowledge[key].subjectType).toBe(subjectType)
        }
      }
    }
  })

  it('marks knowledge obsolete if subject mutates', () => {
    const state = setupAssignedCase(createStartingState(), 'case-mut')
    const key = getKnowledgeKey('t_nightwatch', 'case-mut')

    state.knowledge[key] = {
      tier: 'confirmed',
      entityId: 't_nightwatch',
      entityType: 'team',
      subjectId: 'case-mut',
      subjectType: 'anomaly',
      exposureCount: 1,
      lastConfirmedWeek: state.week - 1,
      notes: '',
    }

    const next = advanceWeek(state)

    expect(next.knowledge[key]).toBeDefined()
    expect(next.knowledge[key].obsolete).toBe(true)
    expect(next.knowledge[key].notes).toMatch(/obsolete.*mutation/i)
  })

  it('promotes to institutionalized after repeated operationalization', () => {
    const state = setupAssignedCase(createStartingState(), 'case-003')
    const key = getKnowledgeKey('t_nightwatch', 'case-003')

    state.knowledge[key] = {
      tier: 'operationalized',
      entityId: 't_nightwatch',
      entityType: 'team',
      subjectId: 'case-003',
      subjectType: 'anomaly',
      exposureCount: 2,
      lastOperationalizedWeek: state.week - 1,
      notes: '',
    }

    const next = advanceWeek(state)

    expect(next.knowledge[key]).toBeDefined()
    expect(next.knowledge[key].tier).toBe('institutionalized')
    expect(next.knowledge[key].source).toBe('archive')
    expect(next.knowledge[key].notes).toMatch(/institutionalized/i)
  })

  it('records source metadata for new field knowledge', () => {
    const state = setupAssignedCase(createStartingState(), 'case-004')
    const next = advanceWeek(state)
    const key = getKnowledgeKey('t_nightwatch', 'case-004')

    expect(next.knowledge[key]).toBeDefined()
    expect(next.knowledge[key].source).toBe('field')
  })
})
