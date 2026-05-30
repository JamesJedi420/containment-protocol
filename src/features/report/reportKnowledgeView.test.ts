import { describe, expect, it } from 'vitest'
import { getKnowledgeKey } from '../../domain/knowledge'
import { buildReportKnowledgeView } from './reportKnowledgeView'

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
