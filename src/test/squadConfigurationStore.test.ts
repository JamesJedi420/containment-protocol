// Squad configuration store integration seam tests (SPE-1304)
import { describe, expect, it } from 'vitest'
import { selectSquadConfigurationSummary } from '../domain/squadConfigurationSelector'
import { createSquadMetadata } from '../domain/squadMetadata'
import { createSquadKitTemplate } from '../domain/squadKitTemplate'
import { assignSquadKit } from '../domain/squadKitAssignment'
import type { GameState } from '../domain/models'
import { createStartingState } from '../data/startingState'

function makeMetadata(squadId: string) {
  const r = createSquadMetadata({
    squadId,
    name: 'Alpha Squad',
    role: 'rapid_response',
    doctrine: 'containment',
    shift: 'night',
    assignedZone: 'zone-north',
    designatedLeaderId: 'agent-alpha',
  })
  if (!r.ok) throw new Error(`metadata: ${r.code}`)
  return r.metadata
}

function makeTemplate(id: string) {
  const r = createSquadKitTemplate({
    id,
    label: 'Breach Kit',
    requiredItemTags: ['breaching', 'comms'],
    minCoveredCount: 1,
  })
  if (!r.ok) throw new Error(`template: ${r.error}`)
  return r.template
}

function baseGame(): GameState {
  const g = createStartingState()
  // Add a minimal team for slot derivation
  g.teams['team-1'] = {
    id: 'team-1',
    name: 'Alpha',
    agentIds: [],
    tags: [],
  }
  return g
}

describe('selectSquadConfigurationSummary', () => {
  it('returns null when no squad metadata exists for teamId', () => {
    const game = baseGame()
    expect(selectSquadConfigurationSummary(game, 'team-1')).toBeNull()
    expect(selectSquadConfigurationSummary(game, 'nonexistent')).toBeNull()
  })

  it('returns null when teamId is empty string', () => {
    const game = baseGame()
    expect(selectSquadConfigurationSummary(game, '')).toBeNull()
  })

  it('returns unassigned kit summary when metadata present but no kit assignment', () => {
    const game = baseGame()
    const metadata = makeMetadata('team-1')
    game.squadMetadata = { 'team-1': metadata }

    const summary = selectSquadConfigurationSummary(game, 'team-1')
    expect(summary).not.toBeNull()
    expect(summary!.metadata.squadId).toBe('team-1')
    expect(summary!.kit.state).toBe('unassigned')
    expect(summary!.occupancy.totalSlots).toBe(0)
    expect(summary!.occupancy.occupiedSlots).toBe(0)
  })

  it('returns valid kit summary when metadata and matching kit assignment both present', () => {
    const game = baseGame()
    const metadata = makeMetadata('team-1')
    const template = makeTemplate('kit-breach')
    const assignmentResult = assignSquadKit(metadata, template)
    if (!assignmentResult.ok) throw new Error('assignment failed')

    // Team has tags that satisfy the template
    game.teams['team-1'].tags = ['breaching', 'comms']
    game.squadMetadata = { 'team-1': metadata }
    game.squadKitTemplates = { 'kit-breach': template }
    game.squadKitAssignments = { 'team-1': assignmentResult.assignment }

    const summary = selectSquadConfigurationSummary(game, 'team-1')
    expect(summary).not.toBeNull()
    expect(summary!.kit.state).toBe('assigned-valid')
    if (summary!.kit.state === 'assigned-valid') {
      expect(summary!.kit.assignment.kitTemplateId).toBe('kit-breach')
      expect(summary!.kit.assignment.kitTemplateLabel).toBe('Breach Kit')
    }
  })

  it('returns mismatch summary when assigned kit template is not satisfied by team tags', () => {
    const game = baseGame()
    const metadata = makeMetadata('team-1')
    const template = makeTemplate('kit-breach')
    const assignmentResult = assignSquadKit(metadata, template)
    if (!assignmentResult.ok) throw new Error('assignment failed')

    // Team has no matching tags
    game.teams['team-1'].tags = []
    game.squadMetadata = { 'team-1': metadata }
    game.squadKitTemplates = { 'kit-breach': template }
    game.squadKitAssignments = { 'team-1': assignmentResult.assignment }

    const summary = selectSquadConfigurationSummary(game, 'team-1')
    expect(summary).not.toBeNull()
    expect(summary!.kit.state).toBe('assigned-mismatch')
    if (summary!.kit.state === 'assigned-mismatch') {
      expect(summary!.kit.validation.missingTags.length).toBeGreaterThan(0)
      expect(summary!.kit.validation.shortfall).toBeGreaterThan(0)
    }
  })

  it('derives slots from team agentIds with correct occupancy', () => {
    const game = baseGame()
    const metadata = makeMetadata('team-1')
    // Team has two agents
    game.teams['team-1'].agentIds = ['agent-1', 'agent-2']
    game.agents['agent-1'] = { ...game.agents['agent-1'], id: 'agent-1', role: 'investigator' } as never
    game.agents['agent-2'] = { ...game.agents['agent-2'], id: 'agent-2', role: 'enforcer' } as never
    game.squadMetadata = { 'team-1': metadata }

    const summary = selectSquadConfigurationSummary(game, 'team-1')
    expect(summary).not.toBeNull()
    expect(summary!.occupancy.totalSlots).toBe(2)
    expect(summary!.occupancy.occupiedSlots).toBe(2)
    expect(summary!.occupancy.vacantSlots).toBe(0)
  })
})
