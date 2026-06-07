import { describe, expect, it } from 'vitest'
import {
  COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
  VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
  sanitizeMedicationRegimenRecords,
} from '../domain/containedPersonMedicationRegimenRegistry'
import { composeMedicationRegimenIntoIntegratedHealthBundles } from '../domain/containedPersonIntegratedHealthBundleCompose'
import type { ContainedPersonIntegratedHealthBundle } from '../domain/containedPersonIntegratedHealthBundleRegistry'
import {
  MEDICATION_REGIMEN_WIRED_REF_PREFIX,
  deriveMedicationRegimenBundleFragmentsFromRecords,
} from '../domain/containedPersonMedicationRegimenHealthBundleLinks'

describe('containedPersonIntegratedHealthBundleCompose medication (SPE-1889 slice 8)', () => {
  it('is a no-op for an empty bundle map and empty fragments without throw', () => {
    expect(composeMedicationRegimenIntoIntegratedHealthBundles({}, [])).toEqual({})
    expect(composeMedicationRegimenIntoIntegratedHealthBundles(null, [])).toEqual({})
  })

  it('merges derived medication regimen links onto bundles keyed by subjectRef', () => {
    const fragments = deriveMedicationRegimenBundleFragmentsFromRecords({
      [VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.id]: VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
      [COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.id]: COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
    })

    const composed = composeMedicationRegimenIntoIntegratedHealthBundles({}, fragments)

    expect(Object.keys(composed)).toEqual([
      VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.subjectRef,
      COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.subjectRef,
    ])

    const stabilizerBundle = composed[VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.subjectRef]
    const adverseBundle = composed[COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.subjectRef]

    expect(stabilizerBundle?.medicationRegimenLinks).toHaveLength(1)
    expect(stabilizerBundle?.medicationRegimenLinks?.[0]?.consentStatus).toBe('voluntary')
    expect(adverseBundle?.medicationRegimenLinks?.[0]?.adverseReactionFlag).toBe(true)
    expect(adverseBundle?.medicationRegimenLinks?.[0]?.interactionRiskScore).not.toBeNull()
  })

  it('preserves authored bundle fields while replacing prior wired links by ref prefix', () => {
    const subjectRef = VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.subjectRef
    const seeded: ContainedPersonIntegratedHealthBundle = {
      id: subjectRef,
      label: 'Authored bundle label',
      subjectRef,
      confidence: 0.82,
      medicationRegimenLinks: [
        {
          regimenRef: 'medication-regimen:authored-manual-link',
          wiredRef: 'manual:medication-regimen:authored-manual-link',
          consentStatus: 'negotiated',
          deliveryVector: 'oral',
          interactionRiskScore: 0.1,
          adverseReactionFlag: false,
        },
        {
          regimenRef: 'medication-regimen:stale-wired',
          wiredRef: `${MEDICATION_REGIMEN_WIRED_REF_PREFIX}medication-regimen:stale-wired`,
          consentStatus: 'compelled',
          deliveryVector: 'intramuscular',
          interactionRiskScore: 0.4,
          adverseReactionFlag: false,
        },
      ],
    }

    const fragments = deriveMedicationRegimenBundleFragmentsFromRecords({
      [VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.id]: VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
    })

    const composed = composeMedicationRegimenIntoIntegratedHealthBundles(
      { [subjectRef]: seeded },
      fragments
    )
    const bundle = composed[subjectRef]

    expect(bundle?.label).toBe('Authored bundle label')
    expect(bundle?.confidence).toBe(0.82)
    expect(bundle?.medicationRegimenLinks).toHaveLength(2)
    expect(
      bundle?.medicationRegimenLinks?.some(
        (link) => link.wiredRef === 'manual:medication-regimen:authored-manual-link'
      )
    ).toBe(true)
    expect(
      bundle?.medicationRegimenLinks?.some(
        (link) => link.regimenRef === VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.id
      )
    ).toBe(true)
    expect(
      bundle?.medicationRegimenLinks?.some((link) => link.regimenRef === 'medication-regimen:stale-wired')
    ).toBe(false)
  })

  it('strips wired medication links without removing bundles that still have therapeutic-care links', () => {
    const subjectRef = VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.subjectRef
    const fragments = deriveMedicationRegimenBundleFragmentsFromRecords({
      [VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.id]: VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
    })
    const seeded = composeMedicationRegimenIntoIntegratedHealthBundles({}, fragments)
    const withTherapeuticCare: ContainedPersonIntegratedHealthBundle = {
      ...seeded[subjectRef]!,
      therapeuticCareScheduleLinks: [
        {
          scheduleRef: 'care-schedule:retained',
          wiredRef: 'therapeutic-care:care-schedule:retained',
          careMode: 'cooperative_checkin',
          channelState: 'active',
          missedSessionStreak: 0,
          complianceRiskScore: 0.1,
          lockdownEscalationLikely: false,
        },
      ],
      mentalStateBand: 'stable',
    }

    const stripped = composeMedicationRegimenIntoIntegratedHealthBundles(
      { [subjectRef]: withTherapeuticCare },
      []
    )

    expect(stripped[subjectRef]?.medicationRegimenLinks).toBeUndefined()
    expect(stripped[subjectRef]?.therapeuticCareScheduleLinks).toHaveLength(1)
    expect(stripped[subjectRef]?.mentalStateBand).toBe('stable')
  })

  it('is idempotent when re-applied with the same fragments', () => {
    const fragments = deriveMedicationRegimenBundleFragmentsFromRecords({
      [VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.id]: VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
    })

    const first = composeMedicationRegimenIntoIntegratedHealthBundles({}, fragments)
    const second = composeMedicationRegimenIntoIntegratedHealthBundles(first, fragments)

    expect(second).toBe(first)
  })
})

describe('containedPersonMedicationRegimenRegistry persistence (SPE-1886 slice 1)', () => {
  it('defaults starting state to an empty medication regimen map', async () => {
    const { createStartingState } = await import('../data/startingState')
    expect(createStartingState().containedPersonMedicationRegimenRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeMedicationRegimenRecords(
      {
        valid: VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
        adverse: COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
        duplicate: {
          ...VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          subjectRef: 'subject:test',
          consentStatus: 'voluntary',
          deliveryVector: 'oral',
          adverseReactionFlag: false,
        },
      },
      fallback
    )

    expect(sanitized['medication-regimen:stabilizer-alpha']).toEqual(VOLUNTARY_STABILIZER_REGIMEN_FIXTURE)
    expect(sanitized['medication-regimen:coercive-sedative-beta']).toEqual(
      COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE
    )
    expect(sanitized.invalid).toBeUndefined()
    expect(Object.keys(sanitized)).toHaveLength(2)
  })
})
