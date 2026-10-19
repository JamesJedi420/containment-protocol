/**
 * SPE-1562 — facility construction complication events.
 *
 * Pure caller-owned packets generate deterministic build-phase complications
 * (labor, cost, discovery, sabotage) instead of frictionless construction timers.
 * Supports delay-type and revelation-type impacts with inspectable cause/impact.
 *
 * This module does not persist GameState, run week-close, or implement a builder
 * minigame.
 */

/** Representative construction project used by acceptance fixtures. */
export const ANNEX_BUILD_PROJECT_ID = 'project:annex-wing-build' as const

export const CONSTRUCTION_PROJECT_TYPES = [
  'annex',
  'lab',
  'safehouse',
  'outpost',
  'infrastructure',
] as const
export type ConstructionProjectType = (typeof CONSTRUCTION_PROJECT_TYPES)[number]

export const CONSTRUCTION_TIMELINE_STAGES = [
  'site_prep',
  'foundation',
  'shell',
  'fit_out',
  'commissioning',
] as const
export type ConstructionTimelineStage = (typeof CONSTRUCTION_TIMELINE_STAGES)[number]

export const CONSTRUCTION_SITE_CONDITIONS = [
  'cleared',
  'contested',
  'contaminated',
  'remote',
  'urban_dense',
] as const
export type ConstructionSiteCondition = (typeof CONSTRUCTION_SITE_CONDITIONS)[number]

export const CONSTRUCTION_STAFFING_BANDS = [
  'understaffed',
  'adequate',
  'overstaffed',
] as const
export type ConstructionStaffingBand = (typeof CONSTRUCTION_STAFFING_BANDS)[number]

export const CONSTRUCTION_COMPLICATION_KINDS = [
  'labor_dispute',
  'price_spike',
  'contractor_fraud',
  'buried_anomaly_exposure',
  'protest',
  'inspection',
  'sabotage',
  'accidental_hazardous_discovery',
] as const
export type ConstructionComplicationKind = (typeof CONSTRUCTION_COMPLICATION_KINDS)[number]

export const CONSTRUCTION_COMPLICATION_EVENT_TYPES = ['delay', 'revelation'] as const
export type ConstructionComplicationEventType =
  (typeof CONSTRUCTION_COMPLICATION_EVENT_TYPES)[number]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.some((item) => item === value)
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

export interface ConstructionComplicationTriggerInput {
  readonly projectId: string
  readonly projectType: ConstructionProjectType
  readonly timelineStage: ConstructionTimelineStage
  readonly siteCondition: ConstructionSiteCondition
  readonly staffingBand: ConstructionStaffingBand
  readonly completed: boolean
  readonly weeksElapsed: number
}

export interface ConstructionComplicationTriggerResult {
  readonly projectId: string
  readonly triggerReady: boolean
  readonly refusalReason:
    | 'already_completed'
    | 'insufficient_elapsed_weeks'
    | 'stable_site_and_staffing'
    | null
  readonly timelineStage: ConstructionTimelineStage
}

/**
 * Deterministic pre-completion trigger: incomplete projects with elapsed weeks and
 * either contested/contaminated/remote site or understaffed crews can fire.
 */
export function evaluateConstructionComplicationTrigger(
  input: unknown
): ConstructionComplicationTriggerResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.projectId)) return undefined
  if (!isMember(input.projectType, CONSTRUCTION_PROJECT_TYPES)) return undefined
  if (!isMember(input.timelineStage, CONSTRUCTION_TIMELINE_STAGES)) return undefined
  if (!isMember(input.siteCondition, CONSTRUCTION_SITE_CONDITIONS)) return undefined
  if (!isMember(input.staffingBand, CONSTRUCTION_STAFFING_BANDS)) return undefined
  if (typeof input.completed !== 'boolean') return undefined
  if (!isNonNegativeInt(input.weeksElapsed)) return undefined

  let refusalReason: ConstructionComplicationTriggerResult['refusalReason'] = null
  if (input.completed) {
    refusalReason = 'already_completed'
  } else if (input.weeksElapsed < 1) {
    refusalReason = 'insufficient_elapsed_weeks'
  } else {
    const stressedSite =
      input.siteCondition === 'contested' ||
      input.siteCondition === 'contaminated' ||
      input.siteCondition === 'remote'
    const stressedStaff = input.staffingBand === 'understaffed'
    if (!stressedSite && !stressedStaff) {
      refusalReason = 'stable_site_and_staffing'
    }
  }

  return Object.freeze({
    projectId: input.projectId,
    triggerReady: refusalReason === null,
    refusalReason,
    timelineStage: input.timelineStage,
  })
}

export interface ConstructionComplicationSelectionInput {
  readonly projectId: string
  readonly triggerReady: boolean
  readonly complicationKind: ConstructionComplicationKind
  readonly projectType: ConstructionProjectType
  readonly siteCondition: ConstructionSiteCondition
}

export interface ConstructionComplicationSelectionResult {
  readonly projectId: string
  readonly complicationKind: ConstructionComplicationKind
  readonly eventType: ConstructionComplicationEventType
  readonly selected: boolean
}

const REVELATION_KINDS: readonly ConstructionComplicationKind[] = [
  'buried_anomaly_exposure',
  'accidental_hazardous_discovery',
  'inspection',
]

/** Select an authored complication when trigger is ready; classify delay vs revelation. */
export function selectConstructionComplication(
  input: unknown
): ConstructionComplicationSelectionResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.projectId)) return undefined
  if (typeof input.triggerReady !== 'boolean') return undefined
  if (!isMember(input.complicationKind, CONSTRUCTION_COMPLICATION_KINDS)) return undefined
  if (!isMember(input.projectType, CONSTRUCTION_PROJECT_TYPES)) return undefined
  if (!isMember(input.siteCondition, CONSTRUCTION_SITE_CONDITIONS)) return undefined

  if (!input.triggerReady) {
    return Object.freeze({
      projectId: input.projectId,
      complicationKind: input.complicationKind,
      eventType: REVELATION_KINDS.includes(input.complicationKind)
        ? ('revelation' as const)
        : ('delay' as const),
      selected: false,
    })
  }

  const eventType: ConstructionComplicationEventType = REVELATION_KINDS.includes(
    input.complicationKind
  )
    ? 'revelation'
    : 'delay'

  return Object.freeze({
    projectId: input.projectId,
    complicationKind: input.complicationKind,
    eventType,
    selected: true,
  })
}

export interface ConstructionComplicationImpactInput {
  readonly projectId: string
  readonly complicationKind: ConstructionComplicationKind
  readonly eventType: ConstructionComplicationEventType
  readonly selected: boolean
}

export interface ConstructionComplicationImpactResult {
  readonly projectId: string
  readonly complicationKind: ConstructionComplicationKind
  readonly eventType: ConstructionComplicationEventType
  readonly scheduleDeltaWeeks: number
  readonly costDeltaBand: 'none' | 'moderate' | 'severe'
  readonly legitimacyDelta: 'none' | 'reduced' | 'compromised'
  readonly revealsSiteInformationOrHazard: boolean
  readonly impactApplied: boolean
}

/** Bounded cost/schedule/legitimacy impact; revelations expose site information or hazard. */
export function projectConstructionComplicationImpact(
  input: unknown
): ConstructionComplicationImpactResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.projectId)) return undefined
  if (!isMember(input.complicationKind, CONSTRUCTION_COMPLICATION_KINDS)) return undefined
  if (!isMember(input.eventType, CONSTRUCTION_COMPLICATION_EVENT_TYPES)) return undefined
  if (typeof input.selected !== 'boolean') return undefined

  if (!input.selected) {
    return Object.freeze({
      projectId: input.projectId,
      complicationKind: input.complicationKind,
      eventType: input.eventType,
      scheduleDeltaWeeks: 0,
      costDeltaBand: 'none' as const,
      legitimacyDelta: 'none' as const,
      revealsSiteInformationOrHazard: false,
      impactApplied: false,
    })
  }

  const revealsSiteInformationOrHazard = input.eventType === 'revelation'
  let scheduleDeltaWeeks = 1
  let costDeltaBand: ConstructionComplicationImpactResult['costDeltaBand'] = 'moderate'
  let legitimacyDelta: ConstructionComplicationImpactResult['legitimacyDelta'] = 'none'

  switch (input.complicationKind) {
    case 'price_spike':
    case 'contractor_fraud':
      scheduleDeltaWeeks = 1
      costDeltaBand = 'severe'
      legitimacyDelta = input.complicationKind === 'contractor_fraud' ? 'reduced' : 'none'
      break
    case 'labor_dispute':
    case 'protest':
      scheduleDeltaWeeks = 2
      costDeltaBand = 'moderate'
      legitimacyDelta = 'reduced'
      break
    case 'sabotage':
      scheduleDeltaWeeks = 2
      costDeltaBand = 'severe'
      legitimacyDelta = 'compromised'
      break
    case 'inspection':
      scheduleDeltaWeeks = 1
      costDeltaBand = 'moderate'
      legitimacyDelta = 'reduced'
      break
    case 'buried_anomaly_exposure':
    case 'accidental_hazardous_discovery':
      scheduleDeltaWeeks = 1
      costDeltaBand = 'moderate'
      legitimacyDelta = 'reduced'
      break
  }

  return Object.freeze({
    projectId: input.projectId,
    complicationKind: input.complicationKind,
    eventType: input.eventType,
    scheduleDeltaWeeks,
    costDeltaBand,
    legitimacyDelta,
    revealsSiteInformationOrHazard,
    impactApplied: true,
  })
}

/** Authored acceptance fixture: annex build on contaminated site exposes buried anomaly. */
export function authoredAnnexBuildComplicationFixture(): {
  readonly trigger: ConstructionComplicationTriggerResult
  readonly selection: ConstructionComplicationSelectionResult
  readonly impact: ConstructionComplicationImpactResult
} {
  const trigger = evaluateConstructionComplicationTrigger({
    projectId: ANNEX_BUILD_PROJECT_ID,
    projectType: 'annex',
    timelineStage: 'foundation',
    siteCondition: 'contaminated',
    staffingBand: 'adequate',
    completed: false,
    weeksElapsed: 2,
  })!

  const selection = selectConstructionComplication({
    projectId: ANNEX_BUILD_PROJECT_ID,
    triggerReady: trigger.triggerReady,
    complicationKind: 'buried_anomaly_exposure',
    projectType: 'annex',
    siteCondition: 'contaminated',
  })!

  const impact = projectConstructionComplicationImpact({
    projectId: ANNEX_BUILD_PROJECT_ID,
    complicationKind: selection.complicationKind,
    eventType: selection.eventType,
    selected: selection.selected,
  })!

  return Object.freeze({ trigger, selection, impact })
}
