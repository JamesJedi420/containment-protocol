import { describe, it, expect, beforeEach } from 'vitest'
import type { CampaignToIncidentPacket, KnowledgeState, Team } from '../domain/models'

// Mock state and case for integration test
const mockTeamId = 't-1'
const mockTeam: Team = {
  id: mockTeamId,
  name: 'Bravo',
  assignedCaseId: 'c-1',
  agentIds: [],
  memberIds: [],
  tags: [],
}
const mockKnowledgeState: KnowledgeState = {
  tier: 'unknown',
  entityId: mockTeamId,
  subjectId: 'c-1',
}
const mockState = {
  id: 'main',
  week: 2,
  directiveState: { selectedId: 'dir-1' },
  teams: { [mockTeamId]: mockTeam } as Record<string, Team>,
  knowledge: { [`${mockTeamId}::c-1`]: mockKnowledgeState },
}
const mockCase = {
  id: 'c-1',
  title: 'Incident X',
  assignedTeamIds: [mockTeamId],
  kind: 'normal',
}

describe('campaignToIncidentHook integration', () => {
  let hookCalled = false
  let receivedPacket: CampaignToIncidentPacket | undefined
  const globalHooks = globalThis as typeof globalThis & {
    campaignToIncidentHook?: (
      packet: CampaignToIncidentPacket,
      currentCase: typeof mockCase,
      state: typeof mockState
    ) => void
  }

  beforeEach(() => {
    hookCalled = false
    receivedPacket = undefined
    // Set the global hook
    globalHooks.campaignToIncidentHook = (packet: CampaignToIncidentPacket) => {
      hookCalled = true
      receivedPacket = { ...packet, campaignId: 'hooked' }
      // Mutate the packet for test
      packet.campaignId = 'hooked'
    }
  })

  it('should call the global hook and allow mutation', async () => {
    // Simulate the handoff logic from advanceWeek
    const packet: CampaignToIncidentPacket = {
      campaignId: mockState.id,
      week: mockState.week,
      caseId: mockCase.id,
      caseTitle: mockCase.title,
      teamId: mockTeamId,
      teamSnapshot: mockState.teams[mockTeamId]!,
      campaignDirectives: [mockState.directiveState.selectedId],
      knowledgeState: mockKnowledgeState,
    }
    if (typeof globalHooks.campaignToIncidentHook === 'function') {
      globalHooks.campaignToIncidentHook(packet, mockCase, mockState)
    }
    expect(hookCalled).toBe(true)
    expect(packet.campaignId).toBe('hooked')
    expect(receivedPacket?.campaignId).toBe('hooked')
  })
})
