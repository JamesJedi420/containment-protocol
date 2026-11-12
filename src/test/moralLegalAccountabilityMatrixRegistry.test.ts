import { describe, expect, it } from 'vitest'
import {
  EXTERNAL_OVERSIGHT_ESCALATION_MATRIX_FIXTURE,
  INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
  listHydratedAccountabilityMatrixRecordsForMitigationPathLabel,
  projectMoralLegalAccountabilityMatrixReview,
  validateMoralLegalAccountabilityMatrixRecord,
} from '../domain/moralLegalAccountabilityMatrixRegistry'

describe('moralLegalAccountabilityMatrixRegistry (SPE-1131 slice 1 anchor)', () => {
  it('validates fixtures as hydrated truth', () => {
    expect(
      validateMoralLegalAccountabilityMatrixRecord(INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE).valid
    ).toBe(true)
    expect(
      validateMoralLegalAccountabilityMatrixRecord(EXTERNAL_OVERSIGHT_ESCALATION_MATRIX_FIXTURE).valid
    ).toBe(true)
  })

  it('projects split moral and legal outcomes', () => {
    const projection = projectMoralLegalAccountabilityMatrixReview(
      INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE
    )

    expect(projection.wiredRef).toBe(
      'accountability-matrix:accountability-matrix:independent-welfare-audit'
    )
    expect(projection.moralOutcome).toBe('blamed')
    expect(projection.legalOutcome).toBe('deferred')
    expect(projection.institutionalOutcome).not.toBe(projection.publicOutcome)
  })

  it('lists records by mitigation path label slug', () => {
    const matches = listHydratedAccountabilityMatrixRecordsForMitigationPathLabel(
      {
        [INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE.id]: INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE,
        [EXTERNAL_OVERSIGHT_ESCALATION_MATRIX_FIXTURE.id]:
          EXTERNAL_OVERSIGHT_ESCALATION_MATRIX_FIXTURE,
      },
      'independent welfare audit'
    )

    expect(matches.map((record) => record.id)).toEqual([
      INDEPENDENT_WELFARE_AUDIT_MATRIX_FIXTURE.id,
    ])
  })
})
