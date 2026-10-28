/**
 * SPE-3180 — contradiction check: subjective/local elapsed time versus
 * authoritative SPE-1071 campaign clock.
 *
 * Pure decision contract and scenario fixtures only. Does not implement
 * time-dilation gameplay, mutate GameState, or advance simulation time.
 */

import { applyElapsedTimeUpdate } from './elapsedTimeInvariantUpdate'

export const SUBJECTIVE_VS_AUTHORITATIVE_TIME_CHECK_ID = 'SPE-3180' as const
export const AUTHORITATIVE_TIME_OWNER_ISSUE_ID = 'SPE-1071' as const

/**
 * Local/subjective elapsed time is stored as caller-owned per-entity (or
 * per-domain) accumulated markers. Rate projections over authoritative
 * elapsed weeks (SPE-3384) update those markers; they are not a second clock.
 */
export type LocalElapsedRepresentation = 'per_entity_accumulated'

export type TimeConsumptionBasis = 'authoritative_global' | 'local_accumulated_marker'

export interface SubsystemConsumptionRule {
  readonly subsystemId: string
  readonly consumptionBasis: TimeConsumptionBasis
  readonly ownerIssueId: string
  readonly notes: string
}

export interface TransferRejoinSemantics {
  readonly ruleId: string
  readonly summary: string
}

export interface TimePersistenceRule {
  readonly ruleId: string
  readonly summary: string
}

export interface TimePresentationRule {
  readonly ruleId: string
  readonly summary: string
}

export interface SubjectiveVsAuthoritativeTimeDecision {
  readonly checkId: typeof SUBJECTIVE_VS_AUTHORITATIVE_TIME_CHECK_ID
  readonly authoritativeOwner: typeof AUTHORITATIVE_TIME_OWNER_ISSUE_ID
  readonly localElapsedRepresentation: LocalElapsedRepresentation
  readonly localRateProjectionOwnerIssueId: 'SPE-3384'
  readonly perceptionDistortionOwners: readonly ['SPE-815', 'SPE-227']
  readonly multiplayerCompatibilityIssueId: 'SPE-3161'
  readonly subsystemConsumptionRules: readonly SubsystemConsumptionRule[]
  readonly transferRejoinSemantics: readonly TransferRejoinSemantics[]
  readonly persistenceRules: readonly TimePersistenceRule[]
  readonly presentationRules: readonly TimePresentationRule[]
  readonly summary: string
  readonly candidateFollowUps: readonly string[]
}

export const SUBSYSTEM_CONSUMPTION_RULES: readonly SubsystemConsumptionRule[] = Object.freeze([
  {
    subsystemId: 'world_ordering_schedules_deadlines',
    consumptionBasis: 'authoritative_global',
    ownerIssueId: 'SPE-1071',
    notes:
      'Campaign week, seasonal gates, recurring deadlines, and time-gated events key only to SPE-1071.',
  },
  {
    subsystemId: 'scheduled_world_events',
    consumptionBasis: 'authoritative_global',
    ownerIssueId: 'SPE-1071',
    notes: 'External/scheduled events fire on authoritative week regardless of local marker divergence.',
  },
  {
    subsystemId: 'global_incident_chronology',
    consumptionBasis: 'authoritative_global',
    ownerIssueId: 'SPE-1071',
    notes: 'Threat countdowns and incident ordering remain on the shared timeline.',
  },
  {
    subsystemId: 'global_procurement_replenishment',
    consumptionBasis: 'authoritative_global',
    ownerIssueId: 'SPE-1071',
    notes: 'Globally scheduled replenishment does not follow local accelerated consumption alone.',
  },
  {
    subsystemId: 'biological_aging_exposure_fatigue',
    consumptionBasis: 'local_accumulated_marker',
    ownerIssueId: 'SPE-3180',
    notes:
      'Biological/exposure/fatigue markers advance via rate projection over authoritative elapsed weeks when domain rules assign a local rate.',
  },
  {
    subsystemId: 'recovery_cooldowns_local_tasks',
    consumptionBasis: 'local_accumulated_marker',
    ownerIssueId: 'SPE-3180',
    notes:
      'Recovery, cooldowns, and off-map task progress consume persisted local markers; rejoin applies markers without rewriting authoritative week.',
  },
  {
    subsystemId: 'anomaly_progression_local_domain',
    consumptionBasis: 'local_accumulated_marker',
    ownerIssueId: 'SPE-3180',
    notes:
      'Domain-local anomaly progression may use local markers; global chronology for the same incident still reports authoritative ordering.',
  },
  {
    subsystemId: 'extranormal_temporal_event_records',
    consumptionBasis: 'authoritative_global',
    ownerIssueId: 'SPE-1757',
    notes: 'SPE-1757 records consume resolved semantics from this check; no competing clock.',
  },
  {
    subsystemId: 'asymmetric_off_map_labor',
    consumptionBasis: 'local_accumulated_marker',
    ownerIssueId: 'SPE-964',
    notes:
      'SPE-964 may consume local accumulated markers after bounded implementation; blocked until this decision, not rejected conceptually.',
  },
  {
    subsystemId: 'timing_confidence_unreliable_clocks',
    consumptionBasis: 'authoritative_global',
    ownerIssueId: 'SPE-227',
    notes: 'Distorted or unreadable clocks affect confidence/perception only unless a domain explicitly assigns a local rate.',
  },
  {
    subsystemId: 'weird_room_local_rule_overrides',
    consumptionBasis: 'authoritative_global',
    ownerIssueId: 'SPE-815',
    notes:
      'Room-local timing behavior may change assigned local rates or presentation; authoritative elapsed week unchanged unless SPE-1071 advances.',
  },
])

export const TRANSFER_REJOIN_SEMANTICS: readonly TransferRejoinSemantics[] = Object.freeze([
  {
    ruleId: 'T1',
    summary:
      'On region/domain transfer, authoritative week is unchanged; local markers travel with the entity/domain packet.',
  },
  {
    ruleId: 'T2',
    summary:
      'When two domains interact, ordering for shared authoritative events uses SPE-1071 week/tick order; local marker totals do not reorder global schedules.',
  },
  {
    ruleId: 'T3',
    summary:
      'Return from off-map or accelerated space applies accumulated local markers to downstream consumers; does not retroactively shift authoritative deadlines.',
  },
  {
    ruleId: 'T4',
    summary:
      'Rejoining ordinary simulation merges local task/effect progress from markers; global calendars already keyed to authoritative time.',
  },
])

export const TIME_PERSISTENCE_RULES: readonly TimePersistenceRule[] = Object.freeze([
  {
    ruleId: 'P1',
    summary:
      'Persist authoritative campaign week (SPE-1071) as the single timeline anchor; never persist a second authoritative clock.',
  },
  {
    ruleId: 'P2',
    summary:
      'Persist local accumulated markers and SPE-3384 remainder fields with their owning entity/domain records; omit when absent.',
  },
  {
    ruleId: 'P3',
    summary:
      'Save/load and replay reapply the same authoritative week and frozen local markers; no duplicate ticks or skipped authoritative consequences.',
  },
  {
    ruleId: 'P4',
    summary:
      'Migration normalizes malformed local markers fail-closed per owner; does not infer subjective divergence from missing perception metadata alone.',
  },
])

export const TIME_PRESENTATION_RULES: readonly TimePresentationRule[] = Object.freeze([
  {
    ruleId: 'U1',
    summary: 'Player-visible clocks and duration labels may show perceived/local estimates; they must not imply perceived time is authoritative world time.',
  },
  {
    ruleId: 'U2',
    summary:
      'SPE-227 timing-confidence and SPE-815 weird-room presentation may distort readability without mutating authoritative elapsed week.',
  },
  {
    ruleId: 'U3',
    summary:
      'UI and projections surface authoritative schedule deadlines separately from local biological/task progress where both apply.',
  },
])

/** Authoritative SPE-3180 closure decision (contract-only). */
export function decideSubjectiveVsAuthoritativeTime(): SubjectiveVsAuthoritativeTimeDecision {
  return Object.freeze({
    checkId: SUBJECTIVE_VS_AUTHORITATIVE_TIME_CHECK_ID,
    authoritativeOwner: AUTHORITATIVE_TIME_OWNER_ISSUE_ID,
    localElapsedRepresentation: 'per_entity_accumulated',
    localRateProjectionOwnerIssueId: 'SPE-3384',
    perceptionDistortionOwners: Object.freeze(['SPE-815', 'SPE-227']),
    multiplayerCompatibilityIssueId: 'SPE-3161',
    subsystemConsumptionRules: SUBSYSTEM_CONSUMPTION_RULES,
    transferRejoinSemantics: TRANSFER_REJOIN_SEMANTICS,
    persistenceRules: TIME_PERSISTENCE_RULES,
    presentationRules: TIME_PRESENTATION_RULES,
    summary:
      'SPE-1071 remains the sole authoritative clock for world ordering, schedules, deadlines, and persistence anchors. Local/subjective elapsed time is represented as caller-owned per-entity accumulated markers updated by rate projections over authoritative elapsed weeks (SPE-3384), not a second simulation clock. SPE-815 and SPE-227 govern perception and confidence without changing authoritative elapsed unless SPE-1071 advances. Scheduled events stay keyed to SPE-1071. SPE-964 asymmetric off-map labor may consume local markers in a future bounded slice. SPE-3161 pause/speed must not reinterpret local markers as an alternate authoritative timeline.',
    candidateFollowUps: Object.freeze([
      'SPE-964: implement asymmetric off-map labor using local accumulated markers under SPE-964 after Phase 4 approval — not SPE-3180 gameplay.',
      'SPE-1757: wire extranormal temporal-event records to consume this decision without introducing a competing clock.',
      'Domain producers: persist local markers + remainders on entity/domain packets when implementing biological/off-map progress.',
    ]),
  })
}

export type SubjectiveTimeScenarioId =
  | 'accelerated_local_exposure_short_global_interval'
  | 'distorted_perception_without_authoritative_change'
  | 'scheduled_event_during_local_divergence'
  | 'save_load_around_local_divergence'
  | 'local_task_rejoins_global_time'
  | 'multiplayer_pause_speed_compat'

export type ScenarioValidationCode =
  | 'authoritative_week_unchanged'
  | 'local_marker_advanced'
  | 'perception_only_distortion'
  | 'scheduled_event_on_authoritative_week'
  | 'persistence_deterministic'
  | 'local_progress_preserved_on_rejoin'
  | 'multiplayer_does_not_reinterpret_local_markers'
  | 'invalid_input'

export interface ScenarioValidationResult {
  readonly scenarioId: SubjectiveTimeScenarioId
  readonly ok: boolean
  readonly codes: readonly ScenarioValidationCode[]
  readonly detail: string
}

export interface AcceleratedLocalExposureInput {
  readonly scenario: 'accelerated_local_exposure_short_global_interval'
  readonly authoritativeWeekBefore: number
  readonly authoritativeWeeksElapsed: number
  readonly localRateMilliPerAuthoritativeWeek: number
  readonly localMarkerBefore: number
  readonly localRemainderMilliBefore: number
}

export interface DistortedPerceptionInput {
  readonly scenario: 'distorted_perception_without_authoritative_change'
  readonly authoritativeWeek: number
  readonly readableClockDistorted: boolean
  readonly timingConfidenceReduced: boolean
  readonly localRateMilliPerAuthoritativeWeek: number
}

export interface ScheduledEventDuringLocalInput {
  readonly scenario: 'scheduled_event_during_local_divergence'
  readonly scheduledEventAuthoritativeWeek: number
  readonly actorAuthoritativeWeek: number
  readonly localRateMilliPerAuthoritativeWeek: number
}

export interface SaveLoadBoundaryPhase {
  readonly phase: 'before' | 'during' | 'after'
  readonly authoritativeWeek: number
  readonly localMarker: number
  readonly localRemainderMilli: number
}

export interface SaveLoadAroundDivergenceInput {
  readonly scenario: 'save_load_around_local_divergence'
  readonly boundaries: readonly [SaveLoadBoundaryPhase, SaveLoadBoundaryPhase, SaveLoadBoundaryPhase]
}

export interface LocalTaskRejoinInput {
  readonly scenario: 'local_task_rejoins_global_time'
  readonly authoritativeWeekAtRejoin: number
  readonly localTaskProgressBefore: number
  readonly localRateMilliPerAuthoritativeWeek: number
  readonly authoritativeWeeksElapsedWhileOffMap: number
  readonly localRemainderMilliBefore: number
}

export interface MultiplayerPauseSpeedInput {
  readonly scenario: 'multiplayer_pause_speed_compat'
  readonly pauseActive: boolean
  readonly simulationSpeedMultiplier: number
  readonly localMarker: number
  readonly authoritativeWeek: number
}

export type SubjectiveTimeScenarioInput =
  | AcceleratedLocalExposureInput
  | DistortedPerceptionInput
  | ScheduledEventDuringLocalInput
  | SaveLoadAroundDivergenceInput
  | LocalTaskRejoinInput
  | MultiplayerPauseSpeedInput

function isNonNegativeInt(n: number): boolean {
  return Number.isFinite(n) && Number.isInteger(n) && n >= 0
}

function validateAcceleratedLocalExposure(
  input: AcceleratedLocalExposureInput,
): ScenarioValidationResult {
  const id = input.scenario
  if (
    !isNonNegativeInt(input.authoritativeWeekBefore) ||
    !isNonNegativeInt(input.authoritativeWeeksElapsed) ||
    !Number.isInteger(input.localRateMilliPerAuthoritativeWeek) ||
    !Number.isInteger(input.localMarkerBefore) ||
    !Number.isInteger(input.localRemainderMilliBefore)
  ) {
    return Object.freeze({
      scenarioId: id,
      ok: false,
      codes: Object.freeze(['invalid_input']),
      detail: 'Malformed accelerated-local exposure fixture.',
    })
  }

  const authoritativeWeekAfter = input.authoritativeWeekBefore + input.authoritativeWeeksElapsed
  const update = applyElapsedTimeUpdate({
    kind: 'rate',
    elapsedUnits: input.authoritativeWeeksElapsed,
    rateMilliPerUnit: input.localRateMilliPerAuthoritativeWeek,
    value: input.localMarkerBefore,
    remainderMilli: input.localRemainderMilliBefore,
  })

  const localAdvancedBeyondGlobal =
    update.value > input.localMarkerBefore ||
    (input.localRateMilliPerAuthoritativeWeek > 0 &&
      input.authoritativeWeeksElapsed > 0 &&
      update.value >= input.localMarkerBefore + 1)

  const ok =
    input.authoritativeWeeksElapsed >= 1 &&
    input.localRateMilliPerAuthoritativeWeek > 1000 &&
    localAdvancedBeyondGlobal

  return Object.freeze({
    scenarioId: id,
    ok,
    codes: Object.freeze(
      ok
        ? (['authoritative_week_unchanged', 'local_marker_advanced'] as const)
        : (['invalid_input'] as const),
    ),
    detail: ok
      ? `Authoritative week advances ${input.authoritativeWeeksElapsed} (${input.authoritativeWeekBefore}→${authoritativeWeekAfter}) while local marker ${input.localMarkerBefore}→${update.value} under rate ${input.localRateMilliPerAuthoritativeWeek} milli/week.`
      : 'Fixture must use short global interval with materially higher local rate to prove divergence.',
  })
}

function validateDistortedPerception(input: DistortedPerceptionInput): ScenarioValidationResult {
  const id = input.scenario
  if (!isNonNegativeInt(input.authoritativeWeek) || !Number.isInteger(input.localRateMilliPerAuthoritativeWeek)) {
    return Object.freeze({
      scenarioId: id,
      ok: false,
      codes: Object.freeze(['invalid_input']),
      detail: 'Malformed distorted-perception fixture.',
    })
  }

  const perceptionOnly =
    (input.readableClockDistorted || input.timingConfidenceReduced) &&
    input.localRateMilliPerAuthoritativeWeek === 0

  return Object.freeze({
    scenarioId: id,
    ok: perceptionOnly,
    codes: Object.freeze(
      perceptionOnly
        ? (['authoritative_week_unchanged', 'perception_only_distortion'] as const)
        : (['invalid_input'] as const),
    ),
    detail: perceptionOnly
      ? `Authoritative week ${input.authoritativeWeek} unchanged; SPE-815/SPE-227 distort perception/confidence only (local rate 0).`
      : 'Distorted-perception scenario requires zero local rate assignment.',
  })
}

function validateScheduledEventDuringLocal(
  input: ScheduledEventDuringLocalInput,
): ScenarioValidationResult {
  const id = input.scenario
  if (
    !isNonNegativeInt(input.scheduledEventAuthoritativeWeek) ||
    !isNonNegativeInt(input.actorAuthoritativeWeek) ||
    !Number.isInteger(input.localRateMilliPerAuthoritativeWeek)
  ) {
    return Object.freeze({
      scenarioId: id,
      ok: false,
      codes: Object.freeze(['invalid_input']),
      detail: 'Malformed scheduled-event fixture.',
    })
  }

  const ok =
    input.localRateMilliPerAuthoritativeWeek !== 0 &&
    input.scheduledEventAuthoritativeWeek === input.actorAuthoritativeWeek

  return Object.freeze({
    scenarioId: id,
    ok,
    codes: Object.freeze(
      ok
        ? (['scheduled_event_on_authoritative_week', 'authoritative_week_unchanged'] as const)
        : (['invalid_input'] as const),
    ),
    detail: ok
      ? `Scheduled event fires at authoritative week ${input.scheduledEventAuthoritativeWeek} while actor carries non-zero local rate ${input.localRateMilliPerAuthoritativeWeek}; event key is global, not local.`
      : 'Event week must match actor authoritative week with non-zero local divergence.',
  })
}

function validateSaveLoadAroundDivergence(
  input: SaveLoadAroundDivergenceInput,
): ScenarioValidationResult {
  const id = input.scenario
  if (input.boundaries.length !== 3) {
    return Object.freeze({
      scenarioId: id,
      ok: false,
      codes: Object.freeze(['invalid_input']),
      detail: 'Save/load scenario requires before, during, and after boundaries.',
    })
  }

  const [before, during, after] = input.boundaries
  const phasesOk =
    before.phase === 'before' &&
    during.phase === 'during' &&
    after.phase === 'after' &&
    [before, during, after].every(
      (b) =>
        isNonNegativeInt(b.authoritativeWeek) &&
        Number.isInteger(b.localMarker) &&
        Number.isInteger(b.localRemainderMilli),
    )

  const deterministic =
    phasesOk &&
    before.authoritativeWeek === during.authoritativeWeek &&
    during.authoritativeWeek === after.authoritativeWeek &&
    before.localMarker === during.localMarker &&
    during.localMarker === after.localMarker &&
    before.localRemainderMilli === during.localRemainderMilli &&
    during.localRemainderMilli === after.localRemainderMilli

  return Object.freeze({
    scenarioId: id,
    ok: deterministic,
    codes: Object.freeze(
      deterministic ? (['persistence_deterministic', 'authoritative_week_unchanged'] as const) : (['invalid_input'] as const),
    ),
    detail: deterministic
      ? `Save/load preserves authoritative week ${after.authoritativeWeek} and local marker ${after.localMarker} across before/during/after boundaries.`
      : 'Boundaries must be stable across save/load without authoritative or marker drift.',
  })
}

function validateLocalTaskRejoin(input: LocalTaskRejoinInput): ScenarioValidationResult {
  const id = input.scenario
  if (
    !isNonNegativeInt(input.authoritativeWeekAtRejoin) ||
    !isNonNegativeInt(input.authoritativeWeeksElapsedWhileOffMap) ||
    !Number.isInteger(input.localTaskProgressBefore) ||
    !Number.isInteger(input.localRateMilliPerAuthoritativeWeek) ||
    !Number.isInteger(input.localRemainderMilliBefore)
  ) {
    return Object.freeze({
      scenarioId: id,
      ok: false,
      codes: Object.freeze(['invalid_input']),
      detail: 'Malformed local-task rejoin fixture.',
    })
  }

  const update = applyElapsedTimeUpdate({
    kind: 'rate',
    elapsedUnits: input.authoritativeWeeksElapsedWhileOffMap,
    rateMilliPerUnit: input.localRateMilliPerAuthoritativeWeek,
    value: input.localTaskProgressBefore,
    remainderMilli: input.localRemainderMilliBefore,
  })

  const ok =
    input.authoritativeWeeksElapsedWhileOffMap > 0 &&
    update.value >= input.localTaskProgressBefore &&
    input.authoritativeWeekAtRejoin >= 0

  return Object.freeze({
    scenarioId: id,
    ok,
    codes: Object.freeze(
      ok
        ? (['local_progress_preserved_on_rejoin', 'authoritative_week_unchanged'] as const)
        : (['invalid_input'] as const),
    ),
    detail: ok
      ? `Rejoin at authoritative week ${input.authoritativeWeekAtRejoin} carries local task progress ${input.localTaskProgressBefore}→${update.value} without inventing a second clock.`
      : 'Rejoin must advance local task marker from authoritative elapsed weeks only.',
  })
}

function validateMultiplayerPauseSpeed(input: MultiplayerPauseSpeedInput): ScenarioValidationResult {
  const id = input.scenario
  if (
    !isNonNegativeInt(input.authoritativeWeek) ||
    !Number.isInteger(input.localMarker) ||
    !Number.isFinite(input.simulationSpeedMultiplier)
  ) {
    return Object.freeze({
      scenarioId: id,
      ok: false,
      codes: Object.freeze(['invalid_input']),
      detail: 'Malformed multiplayer pause/speed fixture.',
    })
  }

  const ok =
    input.localMarker >= 0 &&
    (input.pauseActive || input.simulationSpeedMultiplier !== 1)

  return Object.freeze({
    scenarioId: id,
    ok,
    codes: Object.freeze(
      ok ? (['multiplayer_does_not_reinterpret_local_markers'] as const) : (['invalid_input'] as const),
    ),
    detail: ok
      ? `SPE-3161 pause=${input.pauseActive} speed=${input.simulationSpeedMultiplier} leaves local marker ${input.localMarker} and authoritative week ${input.authoritativeWeek} as distinct persisted facts — no alternate authoritative timeline.`
      : 'Fixture must exercise pause or non-unity speed with valid marker/week.',
  })
}

/** Validate a Linear acceptance scenario against the frozen SPE-3180 decision. */
export function validateSubjectiveTimeScenario(
  input: SubjectiveTimeScenarioInput,
): ScenarioValidationResult {
  switch (input.scenario) {
    case 'accelerated_local_exposure_short_global_interval':
      return validateAcceleratedLocalExposure(input)
    case 'distorted_perception_without_authoritative_change':
      return validateDistortedPerception(input)
    case 'scheduled_event_during_local_divergence':
      return validateScheduledEventDuringLocal(input)
    case 'save_load_around_local_divergence':
      return validateSaveLoadAroundDivergence(input)
    case 'local_task_rejoins_global_time':
      return validateLocalTaskRejoin(input)
    case 'multiplayer_pause_speed_compat':
      return validateMultiplayerPauseSpeed(input)
    default: {
      const _exhaustive: never = input
      throw new Error(`validateSubjectiveTimeScenario: unhandled scenario ${String(_exhaustive)}`)
    }
  }
}
