import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE,
} from '../../domain/containedPersonIntegratedHealthBundleRegistry'
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
    expect(formatIntegratedHealthBundleEnumLabel('compelled')).toBe('Compelled')
    expect(formatIntegratedHealthBundleEnumLabel('contained_person')).toBe('Contained Person')
    expect(formatIntegratedHealthBundleEnumLabel('unresolved')).toBe('Unresolved')
  })

  it('mirrors medication, custody, and welfare-debt link groups from hydrated bundles', () => {
    const game = createStartingState()
    game.containedPersonIntegratedHealthBundles = {
      [INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE.id]:
        INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE,
    }

    const view = getContainedPersonIntegratedHealthBundleMirrorView(game)
    const record = view.records[0]

    expect(record?.medicationRegimenLinks).toHaveLength(1)
    expect(record?.medicationRegimenLinks[0]?.consentStatusLabel).toBe('Compelled')
    expect(record?.custodyStatusLinks).toHaveLength(1)
    expect(record?.custodyStatusLinks[0]?.rightsReviewPendingLabel).toBe('Yes')
    expect(record?.welfareDebtAccountingLinks).toHaveLength(1)
    expect(record?.welfareDebtAccountingLinks[0]?.mitigationStateLabel).toBe('Unresolved')
    expect(view.summary.coercedMedicationLinkCount).toBe(1)
    expect(view.summary.rightsReviewPendingCount).toBe(1)
    expect(view.summary.unresolvedWelfareDebtLinkCount).toBe(1)
  })

  it('shows dashes for missing link groups on partial bundle rows', () => {
    const game = createStartingState()
    game.containedPersonIntegratedHealthBundles = composedBundlesFromFixtures()

    const view = getContainedPersonIntegratedHealthBundleMirrorView(game)
    const record = view.records[0]

    expect(record?.medicationRegimenLinks).toEqual([])
    expect(record?.custodyStatusLinks).toEqual([])
    expect(record?.welfareDebtAccountingLinks).toEqual([])
    expect(view.summary.coercedMedicationLinkCount).toBe(0)
    expect(view.summary.rightsReviewPendingCount).toBe(0)
    expect(view.summary.unresolvedWelfareDebtLinkCount).toBe(0)
  })
})
