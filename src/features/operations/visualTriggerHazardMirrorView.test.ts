import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  ARTISTIC_EXEMPT_DERIVATIVE_FIXTURE,
  BACKGROUND_FRAGMENT_LATENT_FIXTURE,
  COVERED_PURSUIT_RESOLUTION_FIXTURE,
  DISPOSAL_DEADLINE_SWEEP_FIXTURE,
  SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE,
} from '../../domain/visualTriggerHazardRegistry'
import {
  formatVisualTriggerHazardEnumLabel,
  getVisualTriggerHazardMirrorView,
} from './visualTriggerHazardMirrorView'

describe('visualTriggerHazardMirrorView (SPE-2111 slice 4)', () => {
  it('returns empty mirror when visualTriggerHazardRecords map is empty', () => {
    const game = createStartingState()

    expect(game.visualTriggerHazardRecords).toEqual({})

    const view = getVisualTriggerHazardMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors trigger medium, pursuit state, and disposal compliance without re-validating dropped records', () => {
    const game = createStartingState()
    game.week = 32
    game.visualTriggerHazardRecords = {
      [DISPOSAL_DEADLINE_SWEEP_FIXTURE.id]: DISPOSAL_DEADLINE_SWEEP_FIXTURE,
    }

    const view = getVisualTriggerHazardMirrorView(game)
    const record = view.records[0]

    expect(view.isEmpty).toBe(false)
    expect(view.summary.disposalCompliancePendingCount).toBe(1)
    expect(record?.triggerMediumLabel).toBe('Photo')
    expect(record?.pursuitStateLabel).toBe('Dormant')
    expect(record?.disposalCompliantLabel).toBe('No')
    expect(record?.disposalRequiredActionLabels).toEqual(
      expect.arrayContaining(['Sweep', 'Occlusion', 'Redaction'])
    )
    expect(record?.disposalPendingMediaLabels).toContain('media:custody-roll-11')
  })

  it('projects exposure-chain risk and broadcast escalation band for latent background fragment fixture', () => {
    const game = createStartingState()
    game.visualTriggerHazardRecords = {
      [BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
    }

    const view = getVisualTriggerHazardMirrorView(game)
    const record = view.records[0]

    expect(record?.repostChainDepthLabel).toBe('2')
    expect(record?.latentActivationForecastLabel).toBe('Yes')
    expect(record?.escalationBandLabel).not.toBe('—')
    expect(Number(record?.broadcastRiskScoreLabel)).toBeGreaterThan(0)
    expect(record?.requiredCountermeasureLabels.length).toBeGreaterThan(0)
  })

  it('shows zero pursuit pressure for artistic_exempt derivative profile at read time', () => {
    const game = createStartingState()
    game.visualTriggerHazardRecords = {
      'visual-trigger:stylized-artistic-exempt': {
        ...ARTISTIC_EXEMPT_DERIVATIVE_FIXTURE,
        id: 'visual-trigger:stylized-artistic-exempt',
        derivativeHazardProfile: 'artistic_exempt',
        observerAwarenessBand: 'full',
      },
    }

    const view = getVisualTriggerHazardMirrorView(game)
    const record = view.records[0]

    expect(record?.derivativeHazardProfileLabel).toBe('Artistic Exempt')
    expect(record?.pursuitPressureLabel).toBe('0.00')
    expect(record?.manifestationRiskLabel).toBe('0.00')
    expect(record?.projectedPursuitStateLabel).toBe('Dormant')
  })

  it('still mirrors warning-only records with validation warning labels', () => {
    const game = createStartingState()
    game.visualTriggerHazardRecords = {
      [SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE.id]: SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE,
    }

    const view = getVisualTriggerHazardMirrorView(game)
    const record = view.records[0]

    expect(view.summary.totalRecords).toBe(1)
    expect(record?.validationWarningLabels.length).toBe(1)
    expect(record?.filterFailureModeLabel).toBeNull()
    expect(record?.pursuitStateLabel).toBe('Distressed')
  })

  it('counts active pursuit records in summary', () => {
    const game = createStartingState()
    game.visualTriggerHazardRecords = {
      [COVERED_PURSUIT_RESOLUTION_FIXTURE.id]: COVERED_PURSUIT_RESOLUTION_FIXTURE,
      [DISPOSAL_DEADLINE_SWEEP_FIXTURE.id]: DISPOSAL_DEADLINE_SWEEP_FIXTURE,
    }

    const view = getVisualTriggerHazardMirrorView(game)

    expect(view.summary.activePursuitCount).toBe(1)
  })

  it('orders records by id and is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.visualTriggerHazardRecords = {
      [DISPOSAL_DEADLINE_SWEEP_FIXTURE.id]: DISPOSAL_DEADLINE_SWEEP_FIXTURE,
      [BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
    }

    const view = getVisualTriggerHazardMirrorView(game)

    expect(view.records.map((record) => record.id)).toEqual([
      DISPOSAL_DEADLINE_SWEEP_FIXTURE.id,
      BACKGROUND_FRAGMENT_LATENT_FIXTURE.id,
    ])

    const first = JSON.stringify(getVisualTriggerHazardMirrorView(game))
    const second = JSON.stringify(getVisualTriggerHazardMirrorView(game))

    expect(first).toBe(second)
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatVisualTriggerHazardEnumLabel('subconscious_retinal')).toBe('Subconscious Retinal')
    expect(formatVisualTriggerHazardEnumLabel('active_pursuit')).toBe('Active Pursuit')
  })
})
