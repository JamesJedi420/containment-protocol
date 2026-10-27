import type { FacilityEffect, FacilityInstance, FacilityStatus, GameState } from '../../domain/models'

/**
 * SPE-3359 — read-only facility register projection.
 *
 * Builds inspectable rows from canonical facility instances. Does not own
 * lifecycle, production, staffing, storage, layout, or site-map mechanics.
 * Missing owner-supplied fields stay explicit unavailable rather than invented.
 */

export const FACILITY_REGISTER_COPY = {
  heading: 'Facility register',
  empty: 'No facility instances are recorded in the current campaign.',
  unavailable: 'Unavailable',
  baseContextLabel: 'Base / containment site',
  explanation:
    'Read-only inspection of canonical facility instances. Repair, staffing, and production remain with their owning systems.',
} as const

export type FacilityRegisterAttention = 'none' | 'needs_attention'

export type FacilityRegisterUnavailable = 'unavailable'

export interface FacilityRegisterSiteContext {
  readonly kind: 'base'
  readonly label: string
}

export interface FacilityRegisterRow {
  readonly instanceId: string
  readonly facilityId: string
  readonly category: string
  readonly typeReference: string
  readonly level: number
  readonly maxLevel: number | null
  readonly status: FacilityStatus
  readonly conditionLabel: string
  readonly attention: FacilityRegisterAttention
  readonly attentionReason: string | null
  readonly staffing: FacilityRegisterUnavailable
  readonly upkeep: FacilityRegisterUnavailable
  readonly structuralIntegrity: FacilityRegisterUnavailable
  readonly outputSummary: string | null
  readonly siteContext: FacilityRegisterSiteContext
  readonly decommissionPhase: string | null
}

export interface FacilityRegisterView {
  readonly rows: readonly FacilityRegisterRow[]
  readonly unavailable: boolean
}

const NAMED_EFFECT_KEYS = [
  'researchSlots',
  'researchSpeedMultiplier',
  'dataPoolPerWeek',
  'materialsPoolPerWeek',
  'trainingSlots',
  'recoveryThroughput',
] as const satisfies ReadonlyArray<keyof FacilityEffect>

function summarizeEffects(effects: FacilityEffect): string | null {
  const parts: string[] = []
  for (const key of NAMED_EFFECT_KEYS) {
    const value = effects[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      parts.push(`${key}=${value}`)
    }
  }
  const extras = Object.keys(effects)
    .filter((key) => !(NAMED_EFFECT_KEYS as readonly string[]).includes(key))
    .sort()
  for (const key of extras) {
    const value = effects[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      parts.push(`${key}=${value}`)
    }
  }
  return parts.length > 0 ? parts.join(', ') : null
}

function decommissionPhaseOf(facility: FacilityInstance): string | null {
  const state = facility.decommissioning
  if (!state || typeof state !== 'object') return null
  if ('unavailable' in state) return 'unavailable'
  if ('phase' in state && typeof state.phase === 'string' && state.phase.length > 0) {
    return state.phase
  }
  return null
}

function projectCondition(facility: FacilityInstance): {
  conditionLabel: string
  attention: FacilityRegisterAttention
  attentionReason: string | null
} {
  const phase = decommissionPhaseOf(facility)
  if (phase === 'unavailable') {
    return {
      conditionLabel: 'Decommissioning state unavailable',
      attention: 'needs_attention',
      attentionReason: 'Facility decommissioning record is unavailable or malformed.',
    }
  }
  if (phase === 'drawdown' || phase === 'closed' || phase === 'intake_stopped') {
    return {
      conditionLabel: `Decommissioning (${phase})`,
      attention: 'needs_attention',
      attentionReason: 'Facility decommissioning requires operational attention.',
    }
  }
  if (facility.status === 'locked') {
    return {
      conditionLabel: 'Restricted / locked',
      attention: 'needs_attention',
      attentionReason: 'Facility is locked or restricted and needs attention.',
    }
  }
  if (facility.status === 'inactive') {
    return {
      conditionLabel: 'Inactive / degraded',
      attention: 'needs_attention',
      attentionReason: 'Facility is inactive and may need repair, staffing, or reactivation.',
    }
  }
  if (facility.status === 'constructing' || facility.status === 'inspecting') {
    return {
      conditionLabel: `In progress (${facility.status})`,
      attention: 'needs_attention',
      attentionReason: `Facility is ${facility.status} and is not fully operational.`,
    }
  }
  if (facility.upgradeInProgress || facility.status === 'upgrading') {
    return {
      conditionLabel: 'Upgrading',
      attention: 'needs_attention',
      attentionReason: 'Facility upgrade is in progress.',
    }
  }
  return {
    conditionLabel: facility.status === 'active' ? 'Operational' : facility.status,
    attention: 'none',
    attentionReason: null,
  }
}

function projectRow(facility: FacilityInstance): FacilityRegisterRow {
  const condition = projectCondition(facility)
  const category =
    typeof facility.category === 'string' && facility.category.length > 0
      ? facility.category
      : 'unknown'
  return {
    instanceId: facility.facilityId,
    facilityId: facility.facilityId,
    category,
    typeReference: category,
    level: facility.level,
    maxLevel: typeof facility.maxLevel === 'number' ? facility.maxLevel : null,
    status: facility.status,
    conditionLabel: condition.conditionLabel,
    attention: condition.attention,
    attentionReason: condition.attentionReason,
    staffing: 'unavailable',
    upkeep: 'unavailable',
    structuralIntegrity: 'unavailable',
    outputSummary: summarizeEffects(facility.effects ?? {}),
    siteContext: {
      kind: 'base',
      label: FACILITY_REGISTER_COPY.baseContextLabel,
    },
    decommissionPhase: decommissionPhaseOf(facility),
  }
}

/** Read-only facility register rows. Never mutates GameState. */
export function projectFacilityRegisterView(game: GameState): FacilityRegisterView {
  const facilities = game.facilityState?.facilities
  if (!facilities || typeof facilities !== 'object') {
    return { rows: [], unavailable: true }
  }

  const rows = Object.keys(facilities)
    .sort((left, right) => left.localeCompare(right))
    .map((facilityId) => {
      const facility = facilities[facilityId]
      if (!facility || typeof facility !== 'object') {
        const malformed: FacilityRegisterRow = {
          instanceId: facilityId,
          facilityId,
          category: 'unknown',
          typeReference: 'unknown',
          level: 0,
          maxLevel: null,
          status: 'inactive',
          conditionLabel: 'Malformed instance',
          attention: 'needs_attention',
          attentionReason: 'Facility instance record is missing or malformed.',
          staffing: 'unavailable',
          upkeep: 'unavailable',
          structuralIntegrity: 'unavailable',
          outputSummary: null,
          siteContext: {
            kind: 'base',
            label: FACILITY_REGISTER_COPY.baseContextLabel,
          },
          decommissionPhase: null,
        }
        return malformed
      }
      const normalized: FacilityInstance = {
        ...facility,
        facilityId:
          typeof facility.facilityId === 'string' && facility.facilityId.length > 0
            ? facility.facilityId
            : facilityId,
      }
      return projectRow(normalized)
    })

  return { rows, unavailable: false }
}
