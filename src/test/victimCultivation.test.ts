import { describe, expect, it } from 'vitest'
import {
  INSTITUTION_FUNNEL_PROFILES,
  advanceCultivationStage,
  resolveInstitutionOutput,
} from '../domain/victimCultivation'
import type { InstitutionFunnelState } from '../domain/models'

function makeState(
  overrides: Partial<InstitutionFunnelState> = {}
): InstitutionFunnelState {
  return {
    templateId: 'school',
    stage: 'recruiting',
    victimPoolSize: 0,
    seedKey: 'test-funnel',
    ...overrides,
  }
}

describe('advanceCultivationStage', () => {
  it('stays in recruiting stage when pool size is below threshold', () => {
    const state = makeState({ victimPoolSize: 2 })
    const result = advanceCultivationStage(state)
    expect(result.stage).toBe('recruiting')
  })

  it('advances from recruiting to maturing when pool meets threshold', () => {
    const profile = INSTITUTION_FUNNEL_PROFILES.school
    const threshold = profile.stageThresholds.recruiting!
    const state = makeState({ victimPoolSize: threshold })
    const result = advanceCultivationStage(state)
    expect(result.stage).toBe('maturing')
  })

  it('advances from maturing to sorting for clinic template', () => {
    const profile = INSTITUTION_FUNNEL_PROFILES.clinic
    const threshold = profile.stageThresholds.maturing!
    const state = makeState({
      templateId: 'clinic',
      stage: 'maturing',
      victimPoolSize: threshold,
    })
    const result = advanceCultivationStage(state)
    expect(result.stage).toBe('sorting')
  })

  it('does not advance past harvesting (terminal stage)', () => {
    const state = makeState({ stage: 'harvesting', victimPoolSize: 999 })
    const result = advanceCultivationStage(state)
    expect(result.stage).toBe('harvesting')
  })

  it('returns original state for unknown templateId', () => {
    const state = makeState({ templateId: 'nonexistent_institution' })
    const result = advanceCultivationStage(state)
    expect(result).toBe(state)
  })
})

describe('resolveInstitutionOutput', () => {
  it('returns null when stage is not harvesting', () => {
    const state = makeState({ stage: 'sorting', victimPoolSize: 20 })
    expect(resolveInstitutionOutput(state)).toBeNull()
  })

  it('returns null when stage is recruiting', () => {
    const state = makeState({ stage: 'recruiting' })
    expect(resolveInstitutionOutput(state)).toBeNull()
  })

  it('returns a HarvestSourceId when stage is harvesting', () => {
    const state = makeState({ stage: 'harvesting' })
    const output = resolveInstitutionOutput(state)
    expect(output).not.toBeNull()
    expect(['academic', 'mystic', 'engineer', 'soldier', 'administrator']).toContain(output)
  })

  it('school funnel at harvesting produces academic or engineer', () => {
    const state = makeState({ stage: 'harvesting' })
    const output = resolveInstitutionOutput(state)
    expect(['academic', 'engineer']).toContain(output)
  })

  it('is deterministic — same state always returns same output', () => {
    const state = makeState({ stage: 'harvesting' })
    const a = resolveInstitutionOutput(state)
    const b = resolveInstitutionOutput(state)
    expect(a).toBe(b)
  })

  it('academy funnel at harvesting produces soldier or administrator', () => {
    const state = makeState({ templateId: 'academy', stage: 'harvesting' })
    const output = resolveInstitutionOutput(state)
    expect(['soldier', 'administrator']).toContain(output)
  })
})
