import { describe, expect, it } from 'vitest'
import {
  COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
  MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
} from '../domain/massAnomalousPopulationEmergenceRegistry'
import { deriveNormalizationInputsFromPopulationEmergenceRecords } from '../domain/massAnomalousPopulationEmergenceNormalizationInputs'
import {
  DISCLOSURE_PROGRESSION_FIXTURE,
  NORMALIZATION_INPUT_FIXTURE,
  type PublicDisclosureRecord,
} from '../domain/publicDisclosureStateRegistry'
import { composePopulationEmergenceNormalizationIntoDisclosureRecords } from '../domain/publicDisclosureNormalizationCompose'

describe('publicDisclosureNormalizationCompose (SPE-2122 slice 5)', () => {
  it('is a no-op for an empty disclosure map without throw', () => {
    const derived = deriveNormalizationInputsFromPopulationEmergenceRecords({
      [MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
    })

    expect(composePopulationEmergenceNormalizationIntoDisclosureRecords({}, derived)).toEqual({})
  })

  it('merges derived inputs onto qualifying official_disclosure and normalization records', () => {
    const derived = deriveNormalizationInputsFromPopulationEmergenceRecords(
      {
        [MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
        [COLLAPSED_MASQUERADE_EDUCATION_FIXTURE.id]: COLLAPSED_MASQUERADE_EDUCATION_FIXTURE,
      },
      { week: 10 }
    )

    const composed = composePopulationEmergenceNormalizationIntoDisclosureRecords(
      {
        [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
        [NORMALIZATION_INPUT_FIXTURE.id]: NORMALIZATION_INPUT_FIXTURE,
      },
      derived
    )

    const officialRecord = composed[DISCLOSURE_PROGRESSION_FIXTURE.id]
    const normalizationRecord = composed[NORMALIZATION_INPUT_FIXTURE.id]

    expect(officialRecord?.normalizationInputs?.length).toBeGreaterThan(
      DISCLOSURE_PROGRESSION_FIXTURE.normalizationInputs?.length ?? 0
    )
    expect(normalizationRecord?.normalizationInputs?.length).toBeGreaterThan(
      NORMALIZATION_INPUT_FIXTURE.normalizationInputs?.length ?? 0
    )
    expect(
      officialRecord?.normalizationInputs?.some(
        (input) => input.ref === MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id
      )
    ).toBe(true)
    expect(
      normalizationRecord?.normalizationInputs?.some(
        (input) => input.ref === COLLAPSED_MASQUERADE_EDUCATION_FIXTURE.id
      )
    ).toBe(true)
    expect(
      normalizationRecord?.normalizationInputs?.some(
        (input) => input.kind === 'anomaly_tourism' && input.ref === 'program:public-tour-pilot-7'
      )
    ).toBe(true)
  })

  it('preserves authored normalization inputs while replacing prior wired inputs by ref prefix', () => {
    const derived = deriveNormalizationInputsFromPopulationEmergenceRecords({
      [MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
    })

    const seeded: PublicDisclosureRecord = {
      ...DISCLOSURE_PROGRESSION_FIXTURE,
      normalizationInputs: [
        {
          kind: 'product_line',
          descriptor: 'Authored product normalization line',
          ref: 'program:authored-product-1',
        },
        {
          kind: 'mass_anomalous_population_emergence',
          descriptor: 'Stale wired descriptor',
          ref: MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id,
        },
      ],
    }

    const composed = composePopulationEmergenceNormalizationIntoDisclosureRecords(
      { [seeded.id]: seeded },
      derived
    )
    const record = composed[seeded.id]

    expect(record?.normalizationInputs).toHaveLength(2)
    expect(
      record?.normalizationInputs?.find((input) => input.ref === 'program:authored-product-1')?.kind
    ).toBe('product_line')
    expect(
      record?.normalizationInputs?.find(
        (input) => input.ref === MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id
      )?.descriptor
    ).not.toBe('Stale wired descriptor')
  })

  it('strips wired inputs from pre-disclosure awareness records', () => {
    const preDisclosure: PublicDisclosureRecord = {
      id: 'disclosure:pre-disclosure',
      label: 'Pre-disclosure record',
      awarenessLevel: 'credible_leak',
      falloutPhase: 'leak',
      normalizationInputs: [
        {
          kind: 'mass_anomalous_population_emergence',
          descriptor: 'Stale wired descriptor',
          ref: MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id,
        },
      ],
    }

    const composed = composePopulationEmergenceNormalizationIntoDisclosureRecords(
      { [preDisclosure.id]: preDisclosure },
      deriveNormalizationInputsFromPopulationEmergenceRecords({
        [MANAGED_DISCLOSURE_BACKLOG_FIXTURE.id]: MANAGED_DISCLOSURE_BACKLOG_FIXTURE,
      })
    )

    expect(composed[preDisclosure.id]?.normalizationInputs).toBeUndefined()
  })
})
