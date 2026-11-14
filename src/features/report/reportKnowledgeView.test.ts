import { describe, expect, it } from 'vitest'
import { getKnowledgeKey } from '../../domain/knowledge'
import { buildReportKnowledgePreview, buildReportKnowledgeView } from './reportKnowledgeView'

describe('buildReportKnowledgeView', () => {
  it('prefers snapshot knowledge and falls back to live knowledge for missing keys', () => {
    const teamId = 'team-alpha'
    const caseId = 'case-001'
    const liveKey = getKnowledgeKey(teamId, caseId)
    const otherKey = getKnowledgeKey('team-beta', 'case-002')

    const liveKnowledge = {
      [liveKey]: {
        entityId: teamId,
        entityType: 'team' as const,
        subjectId: caseId,
        subjectType: 'anomaly' as const,
        tier: 'observed' as const,
        defeatConditionCertainty: 'suspected' as const,
      },
      [otherKey]: {
        entityId: 'team-beta',
        entityType: 'team' as const,
        subjectId: 'case-002',
        subjectType: 'anomaly' as const,
        tier: 'partial' as const,
      },
    }

    const resolved = buildReportKnowledgeView(liveKnowledge, {
      [caseId]: {
        caseId,
        title: 'Snapshot Case',
        kind: 'case',
        mode: 'threshold',
        status: 'open',
        stage: 1,
        deadlineRemaining: 2,
        durationWeeks: 2,
        assignedTeamIds: [teamId],
        knowledge: {
          [teamId]: {
            entityId: teamId,
            entityType: 'team',
            subjectId: caseId,
            subjectType: 'anomaly',
            tier: 'confirmed',
            defeatConditionCertainty: 'exact',
          },
        },
      },
    })

    expect(resolved[liveKey]?.defeatConditionCertainty).toBe('exact')
    expect(resolved[otherKey]?.tier).toBe('partial')
  })

  it('returns live knowledge when snapshots omit knowledge', () => {
    const liveKnowledge = {
      [getKnowledgeKey('team-alpha', 'case-001')]: {
        entityId: 'team-alpha',
        entityType: 'team' as const,
        subjectId: 'case-001',
        subjectType: 'anomaly' as const,
        tier: 'observed' as const,
      },
    }

    expect(buildReportKnowledgeView(liveKnowledge, undefined)).toBe(liveKnowledge)
    expect(buildReportKnowledgeView(liveKnowledge, {})).toBe(liveKnowledge)
  })
})

it('derives all preview display props from the chosen audience without private metadata', () => {
  const state = {
    'team:one::case:one': {
      entityId: 'team:one',
      subjectId: 'case:one',
      tier: 'partial' as const,
      defeatConditionCertainty: 'family' as const,
      trueClassification: 'SECRET_CLASS',
      relayFailed: true,
      lastRelayFailedWeek: 2,
      fusedFrom: ['SECRET_A', 'SECRET_B'],
      lastFusedWeek: 1,
    },
    'SECRET_TEAM::SECRET_CASE': {
      entityId: 'SECRET_TEAM',
      subjectId: 'SECRET_CASE',
      tier: 'confirmed' as const,
      masked: true,
      defeatConditionCertainty: 'exact' as const,
    },
  }
  const before = JSON.stringify(state)
  const publicPreview = buildReportKnowledgePreview(state, 'public')
  const restrictedPreview = buildReportKnowledgePreview(state, 'internal')
  expect(JSON.stringify(publicPreview)).not.toContain('SECRET')
  expect(JSON.stringify(publicPreview)).not.toContain('Relay failed')
  expect(JSON.stringify(restrictedPreview)).toContain('SECRET_TEAM')
  expect(JSON.stringify(restrictedPreview)).toContain('SECRET_A')
  expect(publicPreview.groups[0].rows[0].explanation).toBe('Bypass method family suspected.')
  expect(JSON.stringify(state)).toBe(before)
})
