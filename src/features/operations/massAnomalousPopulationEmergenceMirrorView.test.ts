import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
  MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
} from '../../domain/massAnomalousPopulationEmergenceRegistry'
import {
  formatPopulationEmergenceEnumLabel,
  getMassAnomalousPopulationEmergenceMirrorView,
} from './massAnomalousPopulationEmergenceMirrorView'

describe('massAnomalousPopulationEmergenceMirrorView (SPE-2122 slice 4)', () => {
  it('returns empty mirror when massAnomalousPopulationEmergenceRecords map is empty', () => {
    const game = createStartingState()

    expect(game.massAnomalousPopulationEmergenceRecords).toEqual({})

    const view = getMassAnomalousPopulationEmergenceMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors magnitude, backlog, governance mode, and triage lanes without re-validating dropped records', () => {
    const game = createStartingState()
    game.massAnomalousPopulationEmergenceRecords = {
      [MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
    }

    const view = getMassAnomalousPopulationEmergenceMirrorView(game)
    const record = view.records[0]

    expect(view.isEmpty).toBe(false)
    expect(view.summary.registrationBacklogActiveCount).toBe(1)
    expect(record?.magnitudeBandLabel).toBe('Regional')
    expect(record?.registrationBacklogWeeksLabel).toBe('6')
    expect(record?.governanceModeLabel).toBe('Managed Disclosure')
    expect(record?.triageLaneLabels).toEqual([
      'lane:registration-intake',
      'lane:medical-screening',
      'lane:rights-review',
    ])
    expect(record?.governanceSurgeBandLabel).not.toBe('—')
    expect(record?.triageLaneSymptoms.length).toBe(3)
    expect(record?.confidenceLabel).toBe('0.79')
  })

  it('projects governance surge band and elevated education burden for collapsed masquerade fixture', () => {
    const game = createStartingState()
    game.week = 8
    game.massAnomalousPopulationEmergenceRecords = {
      [COLLAPSED_MASQUERADE_EDUCATION_FIXTURE.id]: COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
    }

    const view = getMassAnomalousPopulationEmergenceMirrorView(game)
    const record = view.records[0]

    expect(view.summary.collapsedMasqueradeCount).toBe(1)
    expect(record?.governanceModeLabel).toBe('Collapsed Masquerade')
    expect(record?.publicEducationBurdenLabel).toBe('0.55')
    expect(Number(record?.effectivePublicEducationBurdenLabel)).toBeGreaterThan(0.55)
    expect(record?.governanceSurgeBandLabel).not.toBe('—')
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatPopulationEmergenceEnumLabel('managed_disclosure')).toBe('Managed Disclosure')
    expect(formatPopulationEmergenceEnumLabel('collapsed_masquerade')).toBe('Collapsed Masquerade')
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.massAnomalousPopulationEmergenceRecords = {
      [MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
      [COLLAPSED_MASQUERADE_EDUCATION_FIXTURE.id]: COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
    }

    const first = JSON.stringify(getMassAnomalousPopulationEmergenceMirrorView(game))
    const second = JSON.stringify(getMassAnomalousPopulationEmergenceMirrorView(game))

    expect(first).toBe(second)
  })
})
