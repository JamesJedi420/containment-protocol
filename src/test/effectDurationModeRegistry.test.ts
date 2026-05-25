import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EFFECT_DURATION_MODE_REGISTRY,
  EFFECT_DURATION_MODE_IDS,
  getEffectDurationModeById,
  isEffectDurationModeId,
  projectEffectDurationModeRegistry,
  validateEffectDurationModeRecord,
  validateEffectDurationModeRegistry,
  type EffectDurationModeRecord,
} from '../domain/effectDurationModeRegistry'

function baseRecord(
  overrides: Partial<EffectDurationModeRecord> = {}
): EffectDurationModeRecord {
  return {
    id: 'maintained',
    label: 'Maintained effect',
    focusRequirement: 'focus_required',
    upkeepRequirement: 'periodic_check',
    expiryBasis: 'condition',
    dismissalRule: 'dispel',
    interruptionBehavior: 'end',
    reportingLabel: 'Maintained (active upkeep)',
    ...overrides,
  }
}

describe('effectDurationModeRegistry (SPE-2254 slice 1)', () => {
  it('exposes canonical duration mode identifiers', () => {
    expect(EFFECT_DURATION_MODE_IDS).toEqual([
      'maintained',
      'timed',
      'continual',
      'dismiss_only',
    ])
    expect(isEffectDurationModeId('timed')).toBe(true)
    expect(isEffectDurationModeId('timer_only')).toBe(false)
  })

  it('validates a well-formed maintained record', () => {
    const result = validateEffectDurationModeRecord(baseRecord())

    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('rejects dismiss-only records with timer-only expiry', () => {
    const result = validateEffectDurationModeRecord(
      baseRecord({
        id: 'dismiss_only',
        focusRequirement: 'none',
        upkeepRequirement: 'none',
        expiryBasis: 'timer',
        dismissalRule: 'manual',
        interruptionBehavior: 'suspend',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toContain('dismiss_only_with_timer_expiry')
  })

  it('rejects maintained records with no focus or upkeep rule', () => {
    const result = validateEffectDurationModeRecord(
      baseRecord({
        focusRequirement: 'none',
        upkeepRequirement: 'none',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toContain(
      'maintained_without_upkeep_or_focus'
    )
  })

  it('rejects unknown identifiers and invalid mode fields', () => {
    const result = validateEffectDurationModeRecord(
      baseRecord({
        id: 'not-a-mode' as EffectDurationModeRecord['id'],
        label: '   ',
        focusRequirement: 'bad' as EffectDurationModeRecord['focusRequirement'],
        upkeepRequirement: 'bad' as EffectDurationModeRecord['upkeepRequirement'],
        expiryBasis: 'bad' as EffectDurationModeRecord['expiryBasis'],
        dismissalRule: 'bad' as EffectDurationModeRecord['dismissalRule'],
        interruptionBehavior: 'bad' as EffectDurationModeRecord['interruptionBehavior'],
        reportingLabel: '   ',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code).sort()).toEqual(
      [
        'invalid_dismissal_rule',
        'invalid_expiry_basis',
        'invalid_focus_requirement',
        'invalid_id',
        'invalid_interruption_behavior',
        'invalid_upkeep_requirement',
        'missing_label',
        'missing_reporting_label',
      ].sort()
    )
  })

  it('validates the default registry and projects deterministic comparison rows', () => {
    const validation = validateEffectDurationModeRegistry(DEFAULT_EFFECT_DURATION_MODE_REGISTRY)
    const projection = projectEffectDurationModeRegistry(DEFAULT_EFFECT_DURATION_MODE_REGISTRY)

    expect(validation.valid).toBe(true)
    expect(DEFAULT_EFFECT_DURATION_MODE_REGISTRY.entries).toHaveLength(
      EFFECT_DURATION_MODE_IDS.length
    )
    expect(projection).toEqual([
      {
        id: 'maintained',
        label: 'Maintained effect',
        requiresActiveUpkeep: true,
        hasTimerExpiry: false,
        allowsDismissal: true,
        reportingLabel: 'Maintained (active upkeep)',
      },
      {
        id: 'timed',
        label: 'Timed effect',
        requiresActiveUpkeep: false,
        hasTimerExpiry: true,
        allowsDismissal: true,
        reportingLabel: 'Timed (expires by duration)',
      },
      {
        id: 'continual',
        label: 'Continual effect',
        requiresActiveUpkeep: false,
        hasTimerExpiry: false,
        allowsDismissal: false,
        reportingLabel: 'Continual (passive ongoing)',
      },
      {
        id: 'dismiss_only',
        label: 'Dismiss-only effect',
        requiresActiveUpkeep: true,
        hasTimerExpiry: false,
        allowsDismissal: true,
        reportingLabel: 'Dismiss-only (until dismissed)',
      },
    ])
  })

  it('rejects duplicate ids across registry entries', () => {
    const duplicate = baseRecord({ id: 'timed' })
    const result = validateEffectDurationModeRegistry({
      entries: [duplicate, { ...duplicate, label: 'Timed duplicate' }],
    })

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'duplicate_id')).toBe(true)
  })

  it('looks up entries by id', () => {
    const entry = getEffectDurationModeById(
      DEFAULT_EFFECT_DURATION_MODE_REGISTRY,
      'dismiss_only'
    )

    expect(entry?.dismissalRule).toBe('manual')
    expect(getEffectDurationModeById(DEFAULT_EFFECT_DURATION_MODE_REGISTRY, 'missing')).toBe(
      undefined
    )
  })
})
