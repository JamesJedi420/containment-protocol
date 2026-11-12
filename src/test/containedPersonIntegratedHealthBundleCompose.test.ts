import { describe, expect, it } from 'vitest'
import {
  MISSED_STREAK_ELEVATED_RISK_FIXTURE,
  WEEKLY_PSYCH_SCREENING_FIXTURE,
} from '../domain/containedPersonTherapeuticCareRegistry'
import { composeTherapeuticCareIntoIntegratedHealthBundles } from '../domain/containedPersonIntegratedHealthBundleCompose'
import type { ContainedPersonIntegratedHealthBundle } from '../domain/containedPersonIntegratedHealthBundleRegistry'
import {
  THERAPEUTIC_CARE_WIRED_REF_PREFIX,
  deriveTherapeuticCareBundleFragmentsFromRecords,
} from '../domain/containedPersonTherapeuticCareHealthBundleLinks'

describe('containedPersonIntegratedHealthBundleCompose (SPE-1889 slice 5)', () => {
  it('is a no-op for an empty bundle map and empty fragments without throw', () => {
    expect(composeTherapeuticCareIntoIntegratedHealthBundles({}, [])).toEqual({})
    expect(composeTherapeuticCareIntoIntegratedHealthBundles(null, [])).toEqual({})
  })

  it('merges derived therapeutic care links onto bundles keyed by subjectRef', () => {
    const fragments = deriveTherapeuticCareBundleFragmentsFromRecords({
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
      [MISSED_STREAK_ELEVATED_RISK_FIXTURE.id]: MISSED_STREAK_ELEVATED_RISK_FIXTURE,
    })

    const composed = composeTherapeuticCareIntoIntegratedHealthBundles({}, fragments)

    expect(Object.keys(composed)).toEqual([
      WEEKLY_PSYCH_SCREENING_FIXTURE.subjectRef,
      MISSED_STREAK_ELEVATED_RISK_FIXTURE.subjectRef,
    ])

    const psychBundle = composed[WEEKLY_PSYCH_SCREENING_FIXTURE.subjectRef]
    const driftBundle = composed[MISSED_STREAK_ELEVATED_RISK_FIXTURE.subjectRef]

    expect(psychBundle?.therapeuticCareScheduleLinks).toHaveLength(1)
    expect(psychBundle?.mentalStateBand).toBe('stable')
    expect(driftBundle?.mentalStateBand).toBe('critical')
    expect(driftBundle?.humaneCareRiskScore).not.toBeNull()
  })

  it('preserves authored bundle fields while replacing prior wired links by ref prefix', () => {
    const subjectRef = WEEKLY_PSYCH_SCREENING_FIXTURE.subjectRef
    const seeded: ContainedPersonIntegratedHealthBundle = {
      id: subjectRef,
      label: 'Authored bundle label',
      subjectRef,
      confidence: 0.82,
      therapeuticCareScheduleLinks: [
        {
          scheduleRef: 'care-schedule:authored-manual-link',
          wiredRef: 'manual:care-schedule:authored-manual-link',
          careMode: 'visitation_ban',
          channelState: 'active',
          missedSessionStreak: 0,
          complianceRiskScore: 0.1,
          lockdownEscalationLikely: false,
        },
        {
          scheduleRef: 'care-schedule:stale-wired',
          wiredRef: `${THERAPEUTIC_CARE_WIRED_REF_PREFIX}care-schedule:stale-wired`,
          careMode: 'mediated_audio',
          channelState: 'degraded',
          missedSessionStreak: 2,
          complianceRiskScore: 0.4,
          lockdownEscalationLikely: false,
        },
      ],
    }

    const fragments = deriveTherapeuticCareBundleFragmentsFromRecords({
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
    })

    const composed = composeTherapeuticCareIntoIntegratedHealthBundles(
      { [subjectRef]: seeded },
      fragments
    )
    const bundle = composed[subjectRef]

    expect(bundle?.label).toBe('Authored bundle label')
    expect(bundle?.confidence).toBe(0.82)
    expect(bundle?.therapeuticCareScheduleLinks).toHaveLength(2)
    expect(
      bundle?.therapeuticCareScheduleLinks?.some(
        (link) => link.wiredRef === 'manual:care-schedule:authored-manual-link'
      )
    ).toBe(true)
    expect(
      bundle?.therapeuticCareScheduleLinks?.some(
        (link) => link.scheduleRef === WEEKLY_PSYCH_SCREENING_FIXTURE.id
      )
    ).toBe(true)
    expect(
      bundle?.therapeuticCareScheduleLinks?.some(
        (link) => link.scheduleRef === 'care-schedule:stale-wired'
      )
    ).toBe(false)
  })

  it('strips wired links and markers when care records no longer derive a fragment', () => {
    const subjectRef = WEEKLY_PSYCH_SCREENING_FIXTURE.subjectRef
    const fragments = deriveTherapeuticCareBundleFragmentsFromRecords({
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
    })
    const seeded = composeTherapeuticCareIntoIntegratedHealthBundles({}, fragments)

    const stripped = composeTherapeuticCareIntoIntegratedHealthBundles(seeded, [])

    expect(stripped[subjectRef]).toBeUndefined()
    expect(Object.keys(stripped)).toHaveLength(0)
  })

  it('is idempotent when re-applied with the same fragments', () => {
    const fragments = deriveTherapeuticCareBundleFragmentsFromRecords({
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
    })

    const first = composeTherapeuticCareIntoIntegratedHealthBundles({}, fragments)
    const second = composeTherapeuticCareIntoIntegratedHealthBundles(first, fragments)

    expect(second).toBe(first)
  })
})
