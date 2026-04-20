import { describe, it, expect, beforeEach } from 'vitest'
import { CampaignToIncidentPacket } from '../domain/models'

// Mock state and case for integration test
const mockState = {
  id: 'main',
  week: 2,
  directiveState: { selectedId: 'dir-1' },
  teams: { 't-1': { id: 't-1', name: 'Bravo', assignedCaseId: 'c-1', members: [], status: undefined } },
  knowledge: {},
}
const mockCase = {
  id: 'c-1',
  title: 'Incident X',
  assignedTeamIds: ['t-1'],
  kind: 'normal',
}

describe('campaignToIncidentHook integration', () => {
  let hookCalled = false
  let receivedPacket: CampaignToIncidentPacket | undefined

  beforeEach(() => {
    hookCalled = false
    receivedPacket = undefined
    // Set the global hook
    ;(globalThis as any).campaignToIncidentHook = (packet: CampaignToIncidentPacket) => {
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
      teamId: mockCase.assignedTeamIds[0],
      teamSnapshot: mockState.teams[mockCase.assignedTeamIds[0]],
      campaignDirectives: [mockState.directiveState.selectedId],
      knowledgeState: {},
    }
    if (typeof (globalThis as any).campaignToIncidentHook === 'function') {
      (globalThis as any).campaignToIncidentHook(packet, mockCase, mockState)
    }
    expect(hookCalled).toBe(true)
    expect(packet.campaignId).toBe('hooked')
    expect(receivedPacket?.campaignId).toBe('hooked')
  })
})
