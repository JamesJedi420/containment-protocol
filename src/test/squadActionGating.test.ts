import { describe, expect, it } from 'vitest'
import { createSquadMetadata } from '../domain/squadMetadata'
import { createSquadKitTemplate } from '../domain/squadKitTemplate'
import { assignSquadKit } from '../domain/squadKitAssignment'
import { buildSquadConfigurationSummary } from '../domain/squadConfigurationSummary'
import {
  evaluateSquadCommandActionGate,
  type SquadCommandBlockerCode,
} from '../domain/squadActionGating'

function makeMetadata(squadId: string, designatedLeaderId = 'agent-alpha') {
  const result = createSquadMetadata({
    squadId,
    name: 'Alpha Squad',
    role: 'rapid_response',
    doctrine: 'containment',
    shift: 'night',
    assignedZone: 'zone-north',
    designatedLeaderId,
  })

  if (!result.ok) {
    throw new Error(`metadata: ${result.code}`)
  }

  return result.metadata
}

function makeTemplate(id: string, minCoveredCount = 1) {
  const result = createSquadKitTemplate({
    id,
    label: 'Breach Kit',
    requiredItemTags: ['breaching', 'comms'],
    minCoveredCount,
  })

  if (!result.ok) {
    throw new Error(`template: ${result.error}`)
  }

  return result.template
}

function makeSummary(input: {
  readonly designatedLeaderMissing?: boolean
  readonly occupantIds: readonly (string | null)[]
  readonly assignment: 'none' | 'valid' | 'mismatch'
}) {
  const metadata = makeMetadata('team-1')

  const slots = input.occupantIds.map((occupantId, index) => ({
    slotId: `slot-${index + 1}`,
    role: index === 0 ? 'investigator' : 'enforcer',
    occupantId,
    order: index,
  }))

  const template = makeTemplate('kit-breach', 1)
  const assignmentResult = assignSquadKit(metadata, template)
  if (!assignmentResult.ok) {
    throw new Error(`assignment: ${assignmentResult.error}`)
  }

  const summaryResult = buildSquadConfigurationSummary({
    metadata,
    slots,
    assignment: input.assignment === 'none' ? null : assignmentResult.assignment,
    kitTemplatesById: { 'kit-breach': template },
    squadItemTags: input.assignment === 'mismatch' ? [] : ['breaching'],
  })

  if (!summaryResult.ok) {
    throw new Error(`summary: ${summaryResult.error}`)
  }

  if (!input.designatedLeaderMissing) {
    return summaryResult.summary
  }

  return {
    ...summaryResult.summary,
    metadata: {
      ...summaryResult.summary.metadata,
      designatedLeaderId: '',
    },
  }
}

function blockerCodes(result: ReturnType<typeof evaluateSquadCommandActionGate>) {
  return result.blockers.map((blocker) => blocker.code)
}

function expectBlockedWith(
  result: ReturnType<typeof evaluateSquadCommandActionGate>,
  expectedCodes: readonly SquadCommandBlockerCode[]
) {
  expect(result.allowed).toBe(false)
  expect(blockerCodes(result)).toEqual(expectedCodes)
}

describe('evaluateSquadCommandActionGate', () => {
  it('allows deploy when metadata, leader, full slots, and valid kit are present', () => {
    const summary = makeSummary({
      occupantIds: ['agent-alpha', 'agent-beta'],
      assignment: 'valid',
    })

    const result = evaluateSquadCommandActionGate('deploy', summary)
    expect(result.allowed).toBe(true)
    expect(result.blockers).toEqual([])
  })

  it('blocks for missing metadata with exact blocker', () => {
    const result = evaluateSquadCommandActionGate('deploy', null)

    expectBlockedWith(result, ['no_metadata'])
    expect(result.blockers[0]?.message).toBe('No squad configuration available.')
  })

  it('blocks deploy for missing kit assignment with exact blocker', () => {
    const summary = makeSummary({
      occupantIds: ['agent-alpha', 'agent-beta'],
      assignment: 'none',
    })

    const result = evaluateSquadCommandActionGate('deploy', summary)
    expectBlockedWith(result, ['no_assigned_kit'])
    expect(result.blockers[0]?.message).toBe('No kit assigned.')
  })

  it('blocks deploy for kit mismatch with exact blocker reason', () => {
    const summary = makeSummary({
      occupantIds: ['agent-alpha', 'agent-beta'],
      assignment: 'mismatch',
    })

    const result = evaluateSquadCommandActionGate('deploy', summary)
    expectBlockedWith(result, ['kit_mismatch'])
    expect(result.blockers[0]?.message).toBe('Assigned kit does not satisfy squad requirements.')
  })

  it('blocks deploy for vacant required slot and missing leader', () => {
    const summary = makeSummary({
      designatedLeaderMissing: true,
      occupantIds: ['agent-alpha', null],
      assignment: 'valid',
    })

    const result = evaluateSquadCommandActionGate('deploy', summary)
    expectBlockedWith(result, ['vacant_required_slot', 'no_designated_leader'])
    expect(result.blockers[0]?.message).toBe('Required squad slot is vacant.')
    expect(result.blockers[1]?.message).toBe('No designated leader.')
  })

  it('blocks reassign_kit when no kit is currently assigned', () => {
    const summary = makeSummary({
      occupantIds: ['agent-alpha', 'agent-beta'],
      assignment: 'none',
    })

    const result = evaluateSquadCommandActionGate('reassign_kit', summary)
    expectBlockedWith(result, ['no_assigned_kit'])
  })

  it('allows view_configuration whenever summary exists', () => {
    const summary = makeSummary({
      occupantIds: [null],
      assignment: 'none',
    })

    const result = evaluateSquadCommandActionGate('view_configuration', summary)
    expect(result.allowed).toBe(true)
    expect(result.blockers).toEqual([])
  })
})
