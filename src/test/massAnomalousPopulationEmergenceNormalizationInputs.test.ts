import { describe, expect, it } from 'vitest'
import {
  COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
  MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
  type PopulationEmergenceRecord,
} from '../domain/massAnomalousPopulationEmergenceRegistry'
import { deriveNormalizationInputsFromPopulationEmergenceRecords } from '../domain/massAnomalousPopulationEmergenceNormalizationInputs'
import { FRANCHISE_TOKEN_PATTERN } from '../domain/publicDisclosureStateRegistry'

describe('massAnomalousPopulationEmergenceNormalizationInputs (SPE-2122 slice 5)', () => {
  it('returns an empty frozen array for an empty map without throw', () => {
    expect(deriveNormalizationInputsFromPopulationEmergenceRecords({})).toEqual([])
    expect(deriveNormalizationInputsFromPopulationEmergenceRecords(null)).toEqual([])
    expect(deriveNormalizationInputsFromPopulationEmergenceRecords(undefined)).toEqual([])
  })

  it('derives governance-mode-specific normalization input kinds in deterministic record-id order', () => {
    const inputs = deriveNormalizationInputsFromPopulationEmergenceRecords(
      {
        [COLLAPSED_MASQUERADE_EDUCATION_FIXTURE.id]: COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
        [MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
      },
      { week: 12 }
    )

    expect(inputs).toHaveLength(2)
    expect(inputs.map((input) => input.ref)).toEqual([
      COLLAPSED_MASQUERADE_EDUCATION_FIXTURE.id,
      MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id,
    ])
    expect(inputs[0]?.kind).toBe('community_integration_program')
    expect(inputs[1]?.kind).toBe('mass_anomalous_population_emergence')
  })

  it('maps secrecy_restore governance mode to cleanup_front normalization kind', () => {
    const record: PopulationEmergenceRecord = {
      ...MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
      id: 'population-emergence:secrecy-restore-local',
      governanceMode: 'secrecy_restore',
      emergenceMagnitudeBand: 'local',
    }

    const [input] = deriveNormalizationInputsFromPopulationEmergenceRecords(
      { [record.id]: record },
      { week: 3 }
    )

    expect(input?.kind).toBe('cleanup_front')
    expect(input?.ref).toBe(record.id)
  })

  it('includes week-drift governance surge band in descriptor when projection is available', () => {
    const [input] = deriveNormalizationInputsFromPopulationEmergenceRecords(
      {
        [MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
      },
      { week: 20 }
    )

    expect(input?.descriptor).toContain('managed_disclosure')
    expect(input?.descriptor).toContain('backlog 6w')
    expect(input?.descriptor).toMatch(/governance surge (low|elevated|critical)/)
  })

  it('does not re-surface invalid records from the persisted map', () => {
    const invalidRecord = {
      ...MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
      id: 'population-emergence:invalid-empty-triage',
      triageLanes: [],
    }

    const inputs = deriveNormalizationInputsFromPopulationEmergenceRecords({
      [invalidRecord.id]: invalidRecord,
      [MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
    })

    expect(inputs).toHaveLength(1)
    expect(inputs[0]?.ref).toBe(MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id)
  })

  it('skips descriptors that would contain franchise tokens', () => {
    const record: PopulationEmergenceRecord = {
      ...MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
      id: 'population-emergence:token-label',
      label: 'Foundation registration surge',
    }

    expect(FRANCHISE_TOKEN_PATTERN.test(record.label)).toBe(true)
    expect(deriveNormalizationInputsFromPopulationEmergenceRecords({ [record.id]: record })).toEqual(
      []
    )
  })

  it('returns byte-stable results on repeated calls', () => {
    const records = {
      [MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
    }
    const first = deriveNormalizationInputsFromPopulationEmergenceRecords(records, { week: 8 })
    const second = deriveNormalizationInputsFromPopulationEmergenceRecords(records, { week: 8 })

    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
