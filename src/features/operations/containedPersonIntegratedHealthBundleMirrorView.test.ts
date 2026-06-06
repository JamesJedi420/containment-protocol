import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  MISSED_STREAK_ELEVATED_RISK_FIXTURE,
  WEEKLY_PSYCH_SCREENING_FIXTURE,
} from '../../domain/containedPersonTherapeuticCareRegistry'
import { composeTherapeuticCareIntoIntegratedHealthBundles } from '../../domain/containedPersonIntegratedHealthBundleCompose'
import { deriveTherapeuticCareBundleFragmentsFromRecords } from '../../domain/containedPersonTherapeuticCareHealthBundleLinks'
import {
  formatIntegratedHealthBundleEnumLabel,
  getContainedPersonIntegratedHealthBundleMirrorView,
} from './containedPersonIntegratedHealthBundleMirrorView'

function composedBundlesFromFixtures() {
  const fragments = deriveTherapeuticCareBundleFragmentsFromRecords({
    [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
    [MISSED_STREAK_ELEVATED_RISK_FIXTURE.id]: MISSED_STREAK_ELEVATED_RISK_FIXTURE,
  })

  return composeTherapeuticCareIntoIntegratedHealthBundles({}, fragments)
}

describe('containedPersonIntegratedHealthBundleMirrorView (SPE-1889 slice 6)', () => {
  it('returns empty mirror when containedPersonIntegratedHealthBundles map is empty', () => {
    const game = createStartingState()

    expect(game.containedPersonIntegratedHealthBundles).toEqual({})

    const view = getContainedPersonIntegratedHealthBundleMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalBundles).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors mental-state bands, humane-care risk, and wired schedule links from hydrated bundles', () => {
    const game = createStartingState()
    game.containedPersonIntegratedHealthBundles = composedBundlesFromFixtures()

    const view = getContainedPersonIntegratedHealthBundleMirrorView(game)
    const psychRecord = view.records.find(
      (record) => record.id === WEEKLY_PSYCH_SCREENING_FIXTURE.subjectRef
    )
    const driftRecord = view.records.find(
      (record) => record.id === MISSED_STREAK_ELEVATED_RISK_FIXTURE.subjectRef
    )

    expect(view.isEmpty).toBe(false)
    expect(view.summary.totalBundles).toBe(2)
    expect(psychRecord?.mentalStateBandLabel).toBe('Stable')
    expect(driftRecord?.mentalStateBandLabel).toBe('Critical')
    expect(driftRecord?.humaneCareRiskScoreLabel).not.toBe('—')
    expect(psychRecord?.therapeuticCareScheduleLinks).toHaveLength(1)
    expect(psychRecord?.therapeuticCareScheduleLinks[0]?.careModeLabel).toBe('Psych Screening')
    expect(driftRecord?.therapeuticCareScheduleLinks[0]?.lockdownEscalationLikelyLabel).toBe('Yes')
  })

  it('counts critical and distressed mental states with lockdown escalation links in summary', () => {
    const game = createStartingState()
    game.containedPersonIntegratedHealthBundles = composedBundlesFromFixtures()

    const view = getContainedPersonIntegratedHealthBundleMirrorView(game)

    expect(view.summary.criticalMentalStateCount).toBe(1)
    expect(view.summary.distressedMentalStateCount).toBe(0)
    expect(view.summary.lockdownEscalationLinkCount).toBe(1)
  })

  it('orders bundles by id and is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.containedPersonIntegratedHealthBundles = composedBundlesFromFixtures()

    const view = getContainedPersonIntegratedHealthBundleMirrorView(game)

    expect(view.records.map((record) => record.id)).toEqual([
      WEEKLY_PSYCH_SCREENING_FIXTURE.subjectRef,
      MISSED_STREAK_ELEVATED_RISK_FIXTURE.subjectRef,
    ])

    const first = JSON.stringify(getContainedPersonIntegratedHealthBundleMirrorView(game))
    const second = JSON.stringify(getContainedPersonIntegratedHealthBundleMirrorView(game))

    expect(first).toBe(second)
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatIntegratedHealthBundleEnumLabel('psych_screening')).toBe('Psych Screening')
    expect(formatIntegratedHealthBundleEnumLabel('critical')).toBe('Critical')
  })
})
