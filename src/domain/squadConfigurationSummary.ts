import type { SquadMetadata } from './squadMetadata'
import type { SquadKitAssignment } from './squadKitAssignment'
import type { SquadKitTemplate } from './squadKitTemplate'
import { validateSquadKitAssignment } from './squadKitAssignment'

export interface SquadConfigurationSlotInput {
  readonly slotId: string
  readonly role: string
  readonly occupantId: string | null
  readonly order: number
}

export interface SquadConfigurationSlotSummary {
  readonly slotId: string
  readonly role: string
  readonly occupantId: string | null
  readonly occupied: boolean
  readonly order: number
}

export interface SquadConfigurationOccupancySummary {
  readonly slots: readonly SquadConfigurationSlotSummary[]
  readonly totalSlots: number
  readonly occupiedSlots: number
  readonly vacantSlots: number
}

export type SquadConfigurationKitSummary =
  | {
      readonly state: 'unassigned'
      readonly assignment: null
      readonly validation: null
    }
  | {
      readonly state: 'assigned-valid'
      readonly assignment: {
        readonly kitTemplateId: string
        readonly kitTemplateLabel: string
      }
      readonly validation: {
        readonly status: 'valid'
        readonly coveredTags: readonly string[]
        readonly coverage: number
      }
    }
  | {
      readonly state: 'assigned-mismatch'
      readonly assignment: {
        readonly kitTemplateId: string
        readonly kitTemplateLabel: string
      }
      readonly validation: {
        readonly status: 'mismatch'
        readonly coveredTags: readonly string[]
        readonly missingTags: readonly string[]
        readonly shortfall: number
      }
    }

export interface SquadConfigurationSummary {
  readonly metadata: SquadMetadata
  readonly occupancy: SquadConfigurationOccupancySummary
  readonly kit: SquadConfigurationKitSummary
}

export type SquadConfigurationSummaryFailure = 'invalid_squad_id' | 'assigned_kit_template_not_found'

export type SquadConfigurationSummaryResult =
  | { readonly ok: true; readonly summary: SquadConfigurationSummary }
  | { readonly ok: false; readonly error: SquadConfigurationSummaryFailure }

export interface BuildSquadConfigurationSummaryInput {
  readonly metadata: SquadMetadata
  readonly slots: readonly SquadConfigurationSlotInput[]
  readonly assignment: SquadKitAssignment | null
  readonly kitTemplatesById: Readonly<Record<string, SquadKitTemplate>>
  readonly squadItemTags: readonly string[]
}

function buildOccupancySummary(
  slots: readonly SquadConfigurationSlotInput[]
): SquadConfigurationOccupancySummary {
  const orderedSlots = [...slots]
    .map((slot) => ({
      slotId: slot.slotId,
      role: slot.role,
      occupantId: slot.occupantId,
      occupied: slot.occupantId !== null,
      order: slot.order,
    }))
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order
      }

      if (left.slotId < right.slotId) {
        return -1
      }

      if (left.slotId > right.slotId) {
        return 1
      }

      return 0
    })

  const occupiedSlots = orderedSlots.filter((slot) => slot.occupied).length

  return {
    slots: orderedSlots,
    totalSlots: orderedSlots.length,
    occupiedSlots,
    vacantSlots: orderedSlots.length - occupiedSlots,
  }
}

export function buildSquadConfigurationSummary(
  input: BuildSquadConfigurationSummaryInput
): SquadConfigurationSummaryResult {
  if (!input.metadata?.squadId) {
    return { ok: false, error: 'invalid_squad_id' }
  }

  const occupancy = buildOccupancySummary(input.slots)

  if (!input.assignment?.kitTemplateId) {
    return {
      ok: true,
      summary: {
        metadata: input.metadata,
        occupancy,
        kit: {
          state: 'unassigned',
          assignment: null,
          validation: null,
        },
      },
    }
  }

  const assignedTemplate = input.kitTemplatesById[input.assignment.kitTemplateId]
  if (!assignedTemplate) {
    return { ok: false, error: 'assigned_kit_template_not_found' }
  }

  const validation = validateSquadKitAssignment(assignedTemplate, input.squadItemTags)
  if (validation.status === 'valid') {
    return {
      ok: true,
      summary: {
        metadata: input.metadata,
        occupancy,
        kit: {
          state: 'assigned-valid',
          assignment: {
            kitTemplateId: assignedTemplate.id,
            kitTemplateLabel: assignedTemplate.label,
          },
          validation: {
            status: 'valid',
            coveredTags: validation.result.coveredTags,
            coverage: validation.result.coverage,
          },
        },
      },
    }
  }

  return {
    ok: true,
    summary: {
      metadata: input.metadata,
      occupancy,
      kit: {
        state: 'assigned-mismatch',
        assignment: {
          kitTemplateId: assignedTemplate.id,
          kitTemplateLabel: assignedTemplate.label,
        },
        validation: {
          status: 'mismatch',
          coveredTags: validation.result.coveredTags,
          missingTags: validation.result.missingTags,
          shortfall: validation.result.shortfall,
        },
      },
    },
  }
}
