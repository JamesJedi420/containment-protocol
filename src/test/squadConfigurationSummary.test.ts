import { describe, expect, it } from 'vitest'
import { createSquadMetadata } from '../domain/squadMetadata'
import { assignSquadKit } from '../domain/squadKitAssignment'
import { createSquadKitTemplate } from '../domain/squadKitTemplate'
import {
  buildSquadConfigurationSummary,
  type SquadConfigurationSlotInput,
} from '../domain/squadConfigurationSummary'

function createMetadataFixture() {
  const created = createSquadMetadata({
    squadId: 'squad-alpha',
    name: 'Alpha Squad',
    role: 'rapid_response',
    doctrine: 'containment',
    shift: 'night',
    assignedZone: 'zone-north',
    designatedLeaderId: 'agent-alpha',
  })

  if (!created.ok) {
    throw new Error(`Failed to create squad metadata fixture: ${created.code}`)
  }

  return created.metadata
}

function createTemplateFixture() {
  const created = createSquadKitTemplate({
    id: 'kit-breach',
    label: 'Breach Kit',
    requiredItemTags: ['breach', 'combat', 'protection'],
    minCoveredCount: 2,
  })

  if (!created.ok) {
    throw new Error(`Failed to create kit template fixture: ${created.error}`)
  }

  return created.template
}

function createOrderedSlotsFixture(): readonly SquadConfigurationSlotInput[] {
  return [
    { slotId: 'slot-3', role: 'support', occupantId: null, order: 3 },
    { slotId: 'slot-1', role: 'lead', occupantId: 'agent-alpha', order: 1 },
    { slotId: 'slot-2', role: 'breacher', occupantId: 'agent-bravo', order: 2 },
  ]
}

describe('squadConfigurationSummary', () => {
  it('builds a summary with deterministic vacancy and unassigned kit state', () => {
    const metadata = createMetadataFixture()
    const summary = buildSquadConfigurationSummary({
      metadata,
      slots: createOrderedSlotsFixture(),
      assignment: null,
      kitTemplatesById: {},
      squadItemTags: [],
    })

    expect(summary.ok).toBe(true)
    if (!summary.ok) {
      throw new Error('Expected summary ok=true')
    }

    expect(summary.summary.metadata).toEqual(metadata)
    expect(summary.summary.occupancy.totalSlots).toBe(3)
    expect(summary.summary.occupancy.occupiedSlots).toBe(2)
    expect(summary.summary.occupancy.vacantSlots).toBe(1)
    expect(summary.summary.occupancy.slots.map((slot) => slot.slotId)).toEqual([
      'slot-1',
      'slot-2',
      'slot-3',
    ])
    expect(summary.summary.kit).toEqual({
      state: 'unassigned',
      assignment: null,
      validation: null,
    })
  })

  it('builds a summary for assigned + valid kit state', () => {
    const metadata = createMetadataFixture()
    const template = createTemplateFixture()
    const assignmentResult = assignSquadKit(metadata, template)
    expect(assignmentResult.ok).toBe(true)
    if (!assignmentResult.ok) {
      throw new Error('Expected assignment ok=true')
    }

    const summary = buildSquadConfigurationSummary({
      metadata,
      slots: createOrderedSlotsFixture(),
      assignment: assignmentResult.assignment,
      kitTemplatesById: { [template.id]: template },
      squadItemTags: ['breach', 'combat'],
    })

    expect(summary.ok).toBe(true)
    if (!summary.ok) {
      throw new Error('Expected summary ok=true')
    }

    expect(summary.summary.kit).toEqual({
      state: 'assigned-valid',
      assignment: {
        kitTemplateId: 'kit-breach',
        kitTemplateLabel: 'Breach Kit',
      },
      validation: {
        status: 'valid',
        coveredTags: ['breach', 'combat'],
        coverage: 2,
      },
    })
  })

  it('builds a summary for assigned + mismatch with exact reasons', () => {
    const metadata = createMetadataFixture()
    const template = createTemplateFixture()
    const assignmentResult = assignSquadKit(metadata, template)
    expect(assignmentResult.ok).toBe(true)
    if (!assignmentResult.ok) {
      throw new Error('Expected assignment ok=true')
    }

    const summary = buildSquadConfigurationSummary({
      metadata,
      slots: createOrderedSlotsFixture(),
      assignment: assignmentResult.assignment,
      kitTemplatesById: { [template.id]: template },
      squadItemTags: ['breach'],
    })

    expect(summary.ok).toBe(true)
    if (!summary.ok) {
      throw new Error('Expected summary ok=true')
    }

    expect(summary.summary.kit).toEqual({
      state: 'assigned-mismatch',
      assignment: {
        kitTemplateId: 'kit-breach',
        kitTemplateLabel: 'Breach Kit',
      },
      validation: {
        status: 'mismatch',
        coveredTags: ['breach'],
        missingTags: ['combat', 'protection'],
        shortfall: 1,
      },
    })
  })

  it('returns typed failure when assignment points to a missing template', () => {
    const metadata = createMetadataFixture()

    const summary = buildSquadConfigurationSummary({
      metadata,
      slots: createOrderedSlotsFixture(),
      assignment: {
        squadId: metadata.squadId,
        kitTemplateId: 'missing-template',
      },
      kitTemplatesById: {},
      squadItemTags: ['breach'],
    })

    expect(summary).toEqual({
      ok: false,
      error: 'assigned_kit_template_not_found',
    })
  })
})
