import { describe, it, expect } from 'vitest'
import type {
  CampaignToIncidentPacket,
  IncidentToCampaignPacket,
  KnowledgeState,
  Team,
} from '../domain/models'

// Example deterministic test for contract structure
const teamSnapshot: Team = {
  id: 'team-001',
  name: 'Alpha',
  assignedCaseId: 'case-001',
  agentIds: [],
  memberIds: [],
  tags: [],
}
const knowledgeState: KnowledgeState = {
  tier: 'unknown',
  entityId: 'team-001',
  subjectId: 'case-001',
}

describe('Cross-scale handoff contracts', () => {
  it('should construct a valid CampaignToIncidentPacket', () => {
    const packet: CampaignToIncidentPacket = {
      campaignId: 'main',
      week: 1,
      caseId: 'case-001',
      caseTitle: 'Test Case',
      teamId: 'team-001',
      teamSnapshot,
      campaignDirectives: ['directive-1'],
      knowledgeState,
    }
    expect(packet.campaignId).toBe('main')
    expect(packet.week).toBe(1)
    expect(packet.caseId).toBe('case-001')
    expect(packet.teamId).toBe('team-001')
    expect(packet.campaignDirectives).toContain('directive-1')
  })

  it('should construct a valid IncidentToCampaignPacket', () => {
    const packet: IncidentToCampaignPacket = {
      caseId: 'case-001',
      teamId: 'team-001',
      outcome: 'success',
      rewards: { fundingDelta: 10 },
      falloutTags: ['tag-1'],
      performanceSummary: undefined,
      powerImpact: undefined,
      injuries: undefined,
    }
    expect(packet.caseId).toBe('case-001')
    expect(packet.teamId).toBe('team-001')
    expect(packet.outcome).toBe('success')
    expect(packet.rewards).toHaveProperty('fundingDelta')
    expect(packet.falloutTags).toContain('tag-1')
  })
})
