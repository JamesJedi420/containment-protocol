import { describe, expect, it } from 'vitest'
import {
  AUTHORITATIVE_TIME_OWNER_ISSUE_ID,
  SUBJECTIVE_VS_AUTHORITATIVE_TIME_CHECK_ID,
  SUBSYSTEM_CONSUMPTION_RULES,
  decideSubjectiveVsAuthoritativeTime,
  validateSubjectiveTimeScenario,
} from './subjectiveVsAuthoritativeTimeContradiction'

describe('SPE-3180 subjective vs authoritative time', () => {
  it('freezes authoritative SPE-1071 ownership and per-entity accumulated local markers', () => {
    const decision = decideSubjectiveVsAuthoritativeTime()
    expect(decision.checkId).toBe(SUBJECTIVE_VS_AUTHORITATIVE_TIME_CHECK_ID)
    expect(decision.authoritativeOwner).toBe(AUTHORITATIVE_TIME_OWNER_ISSUE_ID)
    expect(decision.localElapsedRepresentation).toBe('per_entity_accumulated')
    expect(decision.localRateProjectionOwnerIssueId).toBe('SPE-3384')
    expect(decision.subsystemConsumptionRules.length).toBeGreaterThanOrEqual(8)
    expect(decision.candidateFollowUps.some((f) => f.includes('SPE-964'))).toBe(true)
  })

  it('declares global schedules and local biological markers separately', () => {
    const global = SUBSYSTEM_CONSUMPTION_RULES.filter((r) => r.consumptionBasis === 'authoritative_global')
    const local = SUBSYSTEM_CONSUMPTION_RULES.filter((r) => r.consumptionBasis === 'local_accumulated_marker')
    expect(global.some((r) => r.subsystemId === 'scheduled_world_events')).toBe(true)
    expect(local.some((r) => r.subsystemId === 'biological_aging_exposure_fatigue')).toBe(true)
    expect(local.some((r) => r.subsystemId === 'asymmetric_off_map_labor')).toBe(true)
  })

  it('replays the decision identically', () => {
    expect(decideSubjectiveVsAuthoritativeTime()).toEqual(decideSubjectiveVsAuthoritativeTime())
  })

  it('validates accelerated local exposure over a short global interval', () => {
    const result = validateSubjectiveTimeScenario({
      scenario: 'accelerated_local_exposure_short_global_interval',
      authoritativeWeekBefore: 10,
      authoritativeWeeksElapsed: 1,
      localRateMilliPerAuthoritativeWeek: 5000,
      localMarkerBefore: 0,
      localRemainderMilliBefore: 0,
    })
    expect(result.ok).toBe(true)
    expect(result.codes).toContain('local_marker_advanced')
    expect(result.codes).toContain('authoritative_week_unchanged')
  })

  it('validates distorted perception without authoritative elapsed change', () => {
    const result = validateSubjectiveTimeScenario({
      scenario: 'distorted_perception_without_authoritative_change',
      authoritativeWeek: 42,
      readableClockDistorted: true,
      timingConfidenceReduced: true,
      localRateMilliPerAuthoritativeWeek: 0,
    })
    expect(result.ok).toBe(true)
    expect(result.codes).toContain('perception_only_distortion')
  })

  it('validates scheduled external events on authoritative week during local divergence', () => {
    const result = validateSubjectiveTimeScenario({
      scenario: 'scheduled_event_during_local_divergence',
      scheduledEventAuthoritativeWeek: 15,
      actorAuthoritativeWeek: 15,
      localRateMilliPerAuthoritativeWeek: 3000,
    })
    expect(result.ok).toBe(true)
    expect(result.codes).toContain('scheduled_event_on_authoritative_week')
  })

  it('validates save/load before, during, and after local divergence', () => {
    const boundary = {
      authoritativeWeek: 20,
      localMarker: 7,
      localRemainderMilli: 250,
    }
    const result = validateSubjectiveTimeScenario({
      scenario: 'save_load_around_local_divergence',
      boundaries: Object.freeze([
        { phase: 'before', ...boundary },
        { phase: 'during', ...boundary },
        { phase: 'after', ...boundary },
      ]),
    })
    expect(result.ok).toBe(true)
    expect(result.codes).toContain('persistence_deterministic')
  })

  it('validates local task progress on rejoin to global time', () => {
    const result = validateSubjectiveTimeScenario({
      scenario: 'local_task_rejoins_global_time',
      authoritativeWeekAtRejoin: 30,
      localTaskProgressBefore: 2,
      localRateMilliPerAuthoritativeWeek: 2000,
      authoritativeWeeksElapsedWhileOffMap: 2,
      localRemainderMilliBefore: 0,
    })
    expect(result.ok).toBe(true)
    expect(result.codes).toContain('local_progress_preserved_on_rejoin')
  })

  it('validates multiplayer pause/speed does not reinterpret local markers', () => {
    const result = validateSubjectiveTimeScenario({
      scenario: 'multiplayer_pause_speed_compat',
      pauseActive: true,
      simulationSpeedMultiplier: 2,
      localMarker: 12,
      authoritativeWeek: 8,
    })
    expect(result.ok).toBe(true)
    expect(result.codes).toContain('multiplayer_does_not_reinterpret_local_markers')
  })
})
