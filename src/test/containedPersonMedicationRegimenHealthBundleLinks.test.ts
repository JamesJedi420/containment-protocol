import { describe, expect, it } from 'vitest'
import {
  COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
  VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
  type MedicationRegimenRecord,
} from '../domain/containedPersonMedicationRegimenRegistry'
import {
  MEDICATION_REGIMEN_WIRED_REF_PREFIX,
  deriveMedicationRegimenBundleFragmentsFromRecords,
} from '../domain/containedPersonMedicationRegimenHealthBundleLinks'

function baseRecord(overrides: Partial<MedicationRegimenRecord> = {}): MedicationRegimenRecord {
  return {
    id: 'medication-regimen:test-base',
    label: 'Test base regimen',
    subjectRef: 'subject:test-base',
    consentStatus: 'voluntary',
    deliveryVector: 'oral',
    adverseReactionFlag: false,
    ...overrides,
  }
}

describe('containedPersonMedicationRegimenHealthBundleLinks (SPE-1889 slice 8)', () => {
  it('returns an empty frozen array for an empty map without throw', () => {
    expect(deriveMedicationRegimenBundleFragmentsFromRecords({})).toEqual([])
    expect(deriveMedicationRegimenBundleFragmentsFromRecords(null)).toEqual([])
    expect(deriveMedicationRegimenBundleFragmentsFromRecords(undefined)).toEqual([])
  })

  it('groups regimen records by subjectRef in deterministic subject order', () => {
    const sharedSubject = 'subject:cooperative-field-asset-17'
    const secondRecord = baseRecord({
      id: 'medication-regimen:second-stabilizer',
      label: 'Second stabilizer regimen',
      subjectRef: sharedSubject,
    })

    const fragments = deriveMedicationRegimenBundleFragmentsFromRecords({
      [VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.id]: VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
      [secondRecord.id]: secondRecord,
      [COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.id]: COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
    })

    expect(fragments).toHaveLength(2)
    expect(fragments.map((fragment) => fragment.subjectRef)).toEqual([
      sharedSubject,
      COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.subjectRef,
    ])
    expect(fragments[0]?.medicationRegimenLinks).toHaveLength(2)
    expect(fragments[0]?.medicationRegimenLinks.map((link) => link.regimenRef)).toEqual([
      secondRecord.id,
      VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.id,
    ])
  })

  it('uses medication-regimen wired ref prefix on derived links', () => {
    const [fragment] = deriveMedicationRegimenBundleFragmentsFromRecords({
      [VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.id]: VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
    })

    expect(fragment?.medicationRegimenLinks[0]?.wiredRef).toBe(
      `${MEDICATION_REGIMEN_WIRED_REF_PREFIX}${VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.id}`
    )
  })

  it('includes warning-only regimen records in derived fragments', () => {
    const warningOnly = baseRecord({
      id: 'medication-regimen:warning-only-covert',
      consentStatus: 'covert',
      monitoringRequired: false,
    })

    const fragments = deriveMedicationRegimenBundleFragmentsFromRecords({
      [warningOnly.id]: warningOnly,
    })

    expect(fragments).toHaveLength(1)
    expect(fragments[0]?.medicationRegimenLinks).toHaveLength(1)
    expect(fragments[0]?.medicationRegimenLinks[0]?.consentStatus).toBe('covert')
  })

  it('does not re-surface invalid regimen records from the persisted map', () => {
    const invalidRecord = {
      ...VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
      id: 'medication-regimen:invalid-empty-label',
      label: '',
    }

    const fragments = deriveMedicationRegimenBundleFragmentsFromRecords({
      [invalidRecord.id]: invalidRecord,
      [VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.id]: VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
    })

    expect(fragments).toHaveLength(1)
    expect(fragments[0]?.subjectRef).toBe(VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.subjectRef)
    expect(fragments[0]?.medicationRegimenLinks).toHaveLength(1)
  })

  it('returns byte-stable results on repeated calls', () => {
    const records = {
      [VOLUNTARY_STABILIZER_REGIMEN_FIXTURE.id]: VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
      [COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.id]: COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
    }
    const first = deriveMedicationRegimenBundleFragmentsFromRecords(records)
    const second = deriveMedicationRegimenBundleFragmentsFromRecords(records)

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
